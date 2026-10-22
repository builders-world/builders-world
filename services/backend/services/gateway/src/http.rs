//! Plumbing shared by every handler: the refusal type, JSON parsing, rate limiting and the CORS and no-cache layers.
use std::future::Future;
use std::time::Duration;

use axum::http::{header, HeaderMap, Method, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use domain::error_code::ErrorCode;
use domain::time::{milliseconds, minutes};
use queue::QueueError;
use tower_http::cors::CorsLayer;

use crate::config::Config;
use crate::responses::Refusal;
use crate::state::AppState;

/// How long a browser may cache the CORS preflight answer.
const CORS_MAX_AGE: Duration = minutes(10);
/// How long the game waits for Redis before going on without it. The limiter and the cache are conveniences: a Redis that is down (or
/// slow to say so) must cost a request a moment, never seconds.
const REDIS_PATIENCE: Duration = milliseconds(250);
/// The longest a request body may be. The largest legitimate one is a presence report, a few hundred bytes of text.
pub const MAX_BODY_BYTES: usize = 16 * 1024;

/// A refusal the game can act on: a status and a stable code.
pub struct Reply(pub(crate) StatusCode, pub(crate) ErrorCode);

impl IntoResponse for Reply {
    fn into_response(self) -> Response {
        (self.0, Json(Refusal { error: self.1 })).into_response()
    }
}

pub(crate) fn bad_request() -> Reply {
    Reply(StatusCode::BAD_REQUEST, ErrorCode::BadRequest)
}

pub(crate) fn rate_limited() -> Reply {
    Reply(StatusCode::TOO_MANY_REQUESTS, ErrorCode::RateLimited)
}

/// How long a session may sit unused before its last-seen time is brought up to date. Every request would otherwise write.
const TOUCH_AFTER: Duration = minutes(10);

/// The id a person has in the world, as other players see it: `u` and their account id without dashes (33 characters).
pub(crate) fn world_id(account: uuid::Uuid) -> String {
    format!("u{}", account.simple())
}

pub(crate) fn unavailable() -> Reply {
    Reply(StatusCode::SERVICE_UNAVAILABLE, ErrorCode::Unavailable)
}

pub(crate) fn not_signed_in() -> Reply {
    Reply(StatusCode::UNAUTHORIZED, ErrorCode::SessionInvalid)
}

/// The bearer token on a request, if it could be one.
pub(crate) fn bearer(headers: &HeaderMap) -> Option<&str> {
    headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .map(str::trim)
        .filter(|token| identity::token::looks_valid(token))
}

/// Who is asking. A token that is missing, malformed, revoked or old is refused the same way, and a malformed one never reaches the database.
pub(crate) async fn authed(state: &AppState, headers: &HeaderMap) -> Result<identity::Signed, Reply> {
    let token = bearer(headers).ok_or_else(not_signed_in)?;
    let hash = identity::token::hash(token);
    let signed = store::queries::sessions::find(&state.pool, &hash).await.map_err(|error| {
        tracing::error!(%error, "session lookup failed");
        unavailable()
    })?;
    let signed = signed.ok_or_else(not_signed_in)?;
    if signed.idle > TOUCH_AFTER {
        // best effort: failing to note that a session was used is not a reason to refuse it
        if let Err(error) = store::queries::sessions::touch(&state.pool, &hash).await {
            tracing::warn!(%error, "could not note that a session was used");
        }
    }
    Ok(signed)
}

/// Reads a JSON request body. An empty body is an empty object, because a client with nothing to say sends nothing.
pub(crate) fn parse_json<T: serde::de::DeserializeOwned>(raw: &[u8]) -> Result<T, Reply> {
    let raw = if raw.iter().all(u8::is_ascii_whitespace) { b"{}".as_slice() } else { raw };
    serde_json::from_slice(raw).map_err(|_| bad_request())
}

/// A Redis call that gives up after [`REDIS_PATIENCE`]. The error says why, for the log.
pub(crate) async fn patiently<T>(call: impl Future<Output = Result<T, QueueError>>) -> Result<T, String> {
    match tokio::time::timeout(REDIS_PATIENCE, call).await {
        Ok(done) => done.map_err(|error| error.to_string()),
        Err(_) => Err("timed out".to_owned()),
    }
}

/// Counts a hit and refuses past `limit`. Fails open: if Redis cannot be reached the request goes through, because the game
/// being up matters more than throttling it.
pub(crate) async fn throttle(state: &AppState, key: &str, limit: u64, window: Duration) -> Result<(), Reply> {
    match patiently(state.queue.hit(key, window)).await {
        Ok(count) if count > limit => Err(rate_limited()),
        Ok(_) => Ok(()),
        Err(error) => {
            tracing::warn!(%error, "rate limiter unavailable; allowing request");
            Ok(())
        }
    }
}

/// CORS for the game's own origins only. `None` when the game is served from the same address and needs none.
pub(crate) fn cors(config: &Config) -> Option<CorsLayer> {
    let origins: Vec<header::HeaderValue> = config.allowed_origins.iter().filter_map(|origin| origin.parse().ok()).collect();
    (!origins.is_empty()).then(|| {
        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::OPTIONS])
            .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
            .max_age(CORS_MAX_AGE)
    })
}

pub(crate) async fn never_cache(mut response: Response) -> Response {
    let headers = response.headers_mut();
    headers.insert(header::CACHE_CONTROL, header::HeaderValue::from_static("no-store"));
    headers.insert(header::X_CONTENT_TYPE_OPTIONS, header::HeaderValue::from_static("nosniff"));
    response
}

/// The client's address, for rate limiting.
///
/// With `header` set (the platform's trusted header, e.g. `x-real-ip` on Railway) that is the only source used: a missing or
/// malformed value falls into one shared bucket, which is stricter, rather than into something a client could choose. Without
/// it, the address is the entry `hops` from the *end* of `x-forwarded-for`, since the left-most entries are whatever the client
/// sent. Behind some proxies the last entries are the proxy's own, which change from request to request: check what your
/// platform sends before relying on this.
pub fn client_ip(headers: &HeaderMap, hops: usize, header: Option<&str>) -> String {
    const SHARED: &str = "unknown";
    if let Some(name) = header {
        return headers
            .get(name)
            .and_then(|value| value.to_str().ok())
            .map(str::trim)
            .filter(|value| value.parse::<std::net::IpAddr>().is_ok())
            .map(str::to_owned)
            .unwrap_or_else(|| SHARED.to_owned());
    }
    let forwarded = headers.get("x-forwarded-for").and_then(|value| value.to_str().ok()).unwrap_or_default();
    let parts: Vec<&str> = forwarded.split(',').map(str::trim).filter(|hop| !hop.is_empty()).collect();
    parts.len().checked_sub(hops).and_then(|index| parts.get(index)).map(|hop| (*hop).to_owned()).unwrap_or_else(|| SHARED.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn headers_from(values: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", values.parse().unwrap());
        headers
    }

    #[test]
    fn the_client_address_is_counted_from_the_trusted_end() {
        // The client sent "1.1.1.1"; the proxy appended the real address.
        assert_eq!(client_ip(&headers_from("1.1.1.1, 203.0.113.9"), 1, None), "203.0.113.9");
        assert_eq!(client_ip(&headers_from("203.0.113.9"), 1, None), "203.0.113.9");
        assert_eq!(client_ip(&headers_from("1.1.1.1, 203.0.113.9, 10.0.0.1"), 2, None), "203.0.113.9");
        // Fewer entries than hops, or no header at all: one shared bucket.
        assert_eq!(client_ip(&headers_from("203.0.113.9"), 2, None), "unknown");
        assert_eq!(client_ip(&HeaderMap::new(), 1, None), "unknown");
    }

    #[test]
    fn a_trusted_header_is_the_only_source_when_configured() {
        let mut headers = headers_from("1.1.1.1, 198.51.100.7");
        headers.insert("x-real-ip", "192.0.2.44".parse().unwrap());
        assert_eq!(client_ip(&headers, 1, Some("x-real-ip")), "192.0.2.44");
        // Missing or not an address: one shared bucket, never the spoofable list.
        assert_eq!(client_ip(&headers_from("1.1.1.1"), 1, Some("x-real-ip")), "unknown");
        let mut bad = HeaderMap::new();
        bad.insert("x-real-ip", "not-an-ip".parse().unwrap());
        assert_eq!(client_ip(&bad, 1, Some("x-real-ip")), "unknown");
    }

    #[test]
    fn a_body_that_is_not_json_is_a_bad_request_and_an_empty_one_is_nothing() {
        assert!(parse_json::<serde_json::Value>(b"{nope").is_err());
        assert_eq!(parse_json::<serde_json::Value>(b"  ").ok(), Some(serde_json::json!({})));
    }
}
