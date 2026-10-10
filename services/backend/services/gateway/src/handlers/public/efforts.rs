//! `GET /api/efforts?user=<github login>`: how much a person has shipped in the last year (world bible 12.1).
//!
//! Every commit is 1,000 Efforts. With a `GITHUB_TOKEN` commits are counted exactly; without one the public contribution calendar is
//! read, which also counts pull requests and issues. A count is kept for ten minutes, here and by any cache in front, so one popular
//! person does not use up GitHub's allowance.
use axum::extract::{Query, State};
use axum::http::{header, HeaderMap, HeaderValue, StatusCode};
use axum::Json;
use domain::error_code::ErrorCode;
use domain::time::minutes;
use domain::world::efforts::{login, COUNT_KEPT_FOR};
use serde::Deserialize;
use serde_json::Value;

use super::responses::{Count, Efforts};
use crate::http::{bad_request, client_ip, patiently, throttle, Reply};
use crate::state::AppState;

/// Asking GitHub about someone new is the costly part, so one address gets fewer of these than of the game's own calls.
const PER_ADDRESS_PER_MINUTE: u64 = 30;
const CACHE_CONTROL: &str = "public, s-maxage=600, stale-while-revalidate=3600";
const PRIVATE_CACHE_CONTROL: &str = "private, no-store";

#[derive(Debug, Deserialize)]
pub struct Ask {
    user: Option<String>,
}

pub async fn show(State(state): State<AppState>, headers: HeaderMap, Query(ask): Query<Ask>) -> Result<Answer, Reply> {
    let user = login(ask.user.map(Value::String).as_ref()).ok_or_else(bad_request)?;
    answer(&state, &headers, user, CACHE_CONTROL).await
}

/// What the signed-in person has shipped: counted for the GitHub account they signed in with, so nobody can claim another person's work.
pub async fn mine(State(state): State<AppState>, headers: HeaderMap) -> Result<Answer, Reply> {
    let signed = crate::http::authed(&state, &headers).await?;
    answer(&state, &headers, signed.login, PRIVATE_CACHE_CONTROL).await
}

pub type Answer = ([(header::HeaderName, HeaderValue); 1], Json<Efforts>);

async fn answer(state: &AppState, headers: &HeaderMap, user: String, cache: &'static str) -> Result<Answer, Reply> {
    let key = format!("efforts:{}", user.to_lowercase());
    let count = match recall(state, &key).await {
        Some(count) => count,
        None => {
            let ip = client_ip(headers, state.config.trusted_proxy_hops, state.config.client_ip_header.as_deref());
            throttle(state, &format!("ratelimit:efforts:{ip}"), PER_ADDRESS_PER_MINUTE, minutes(1)).await?;
            let tally = state.contributions.tally(&user).await.map_err(|error| {
                tracing::warn!(%error, "GitHub did not answer");
                Reply(StatusCode::BAD_GATEWAY, ErrorCode::ProviderError)
            })?;
            let count = Count::from_tally(tally).ok_or(Reply(StatusCode::NOT_FOUND, ErrorCode::NotFound))?;
            remember(state, &key, &count).await;
            count
        }
    };
    Ok(([(header::CACHE_CONTROL, HeaderValue::from_static(cache))], Json(Efforts { user, commits: count.commits, source: count.source })))
}

/// A kept count. Redis being down only means GitHub is asked again.
async fn recall(state: &AppState, key: &str) -> Option<Count> {
    match patiently(state.queue.recall(key)).await {
        Ok(kept) => kept.and_then(|text| serde_json::from_str(&text).ok()),
        Err(error) => {
            tracing::warn!(%error, "efforts cache unavailable");
            None
        }
    }
}

async fn remember(state: &AppState, key: &str, count: &Count) {
    let Ok(text) = serde_json::to_string(count) else { return };
    if let Err(error) = patiently(state.queue.remember(key, &text, COUNT_KEPT_FOR)).await {
        tracing::warn!(%error, "efforts cache unavailable");
    }
}
