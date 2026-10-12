//! Signing in with GitHub.
//!
//! * `GET  /api/auth/github?return=<origin>`  sends the browser to GitHub. `return` must be one of the game's own origins.
//! * `GET  /api/auth/github/callback`         GitHub sends the browser back here. If all is well it goes on to the game with a session token
//!   in the address fragment (`<origin>/#bw-session=<token>`), which the browser never sends to any server; if not, with `#bw-error=<why>`.
//! * `POST /api/auth/logout`                  ends the session it is called with.
//!
//! The `state` GitHub returns is a random value we kept for ten minutes and can be used once, which is what proves the person who comes back
//! is the one who left. No scope is asked for, so the game can read only what GitHub shows anyone about the account.
use axum::extract::{Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::Redirect;
use axum::Json;
use domain::time::{days, minutes};
use identity::token;
use serde::Deserialize;
use store::queries::{accounts, sessions};

use crate::http::{bad_request, bearer, patiently, throttle, unavailable, Reply};
use crate::responses::Done;
use crate::state::AppState;

/// How long a browser has to finish signing in at GitHub.
const STATE_KEPT_FOR: std::time::Duration = minutes(10);
/// How long a session lasts.
const SESSION_LASTS: std::time::Duration = days(30);
const STARTS_PER_ADDRESS_PER_MINUTE: u64 = 20;
const STATE_KEY: &str = "auth:state:";

#[derive(Debug, Deserialize)]
pub struct Start {
    r#return: Option<String>,
}

pub async fn start(State(state): State<AppState>, headers: HeaderMap, Query(ask): Query<Start>) -> Result<Redirect, Reply> {
    let sign_in = state.sign_in.as_ref().ok_or_else(unavailable)?;
    let ip = crate::http::client_ip(&headers, state.config.trusted_proxy_hops, state.config.client_ip_header.as_deref());
    throttle(&state, &format!("ratelimit:signin:{ip}"), STARTS_PER_ADDRESS_PER_MINUTE, minutes(1)).await?;
    let origin = return_to(&state, ask.r#return.as_deref()).ok_or_else(bad_request)?;
    let proof = token::generate();
    patiently(state.queue.remember(&format!("{STATE_KEY}{proof}"), &origin, STATE_KEPT_FOR)).await.map_err(|error| {
        tracing::error!(%error, "could not keep the sign-in state");
        unavailable()
    })?;
    Ok(Redirect::to(&sign_in.authorize_url(&proof)))
}

/// Where to send the browser afterwards: the origin it asked for if the game owns it, else the game's first origin.
fn return_to(state: &AppState, asked: Option<&str>) -> Option<String> {
    let allowed = &state.config.allowed_origins;
    match asked.map(|origin| origin.trim_end_matches('/')) {
        Some(origin) if allowed.iter().any(|known| known == origin) => Some(origin.to_owned()),
        Some(_) => None,
        None => allowed.first().cloned(),
    }
}

#[derive(Debug, Deserialize)]
pub struct Back {
    code: Option<String>,
    state: Option<String>,
}

pub async fn finish(State(state): State<AppState>, Query(back): Query<Back>) -> Result<Redirect, Reply> {
    let sign_in = state.sign_in.as_ref().ok_or_else(unavailable)?;
    // The state is taken, not just read: it works once.
    let proof = back.state.as_deref().filter(|proof| token::looks_valid(proof)).ok_or_else(bad_request)?;
    let origin = patiently(state.queue.take(&format!("{STATE_KEY}{proof}"))).await.map_err(|error| {
        tracing::error!(%error, "could not check the sign-in state");
        unavailable()
    })?;
    let Some(origin) = origin else { return Err(bad_request()) };
    let to = |outcome: &str| Redirect::to(&format!("{origin}/#{outcome}"));
    let Some(code) = back.code.filter(|code| !code.is_empty() && code.len() < 200) else { return Ok(to("bw-error=denied")) };
    let user = match sign_in.user_for(&code).await {
        Ok(user) => user,
        Err(error) => {
            tracing::warn!(%error, "GitHub sign-in failed");
            return Ok(to("bw-error=github"));
        }
    };
    let opened = async {
        let account = accounts::sign_in(&state.pool, user.id, &user.login, user.name.as_deref()).await?;
        let secret = token::generate();
        sessions::open(&state.pool, account.id, &token::hash(&secret), SESSION_LASTS).await?;
        Ok::<_, store::Error>(secret)
    }
    .await;
    match opened {
        Ok(secret) => Ok(to(&format!("bw-session={secret}"))),
        Err(error) => {
            tracing::error!(%error, "could not open a session");
            Ok(to("bw-error=server"))
        }
    }
}

pub async fn logout(State(state): State<AppState>, headers: HeaderMap) -> Result<(StatusCode, Json<Done>), Reply> {
    if let Some(secret) = bearer(&headers) {
        sessions::revoke(&state.pool, &token::hash(secret)).await.map_err(|error| {
            tracing::error!(%error, "could not end a session");
            unavailable()
        })?;
    }
    Ok((StatusCode::OK, Json(Done::new())))
}
