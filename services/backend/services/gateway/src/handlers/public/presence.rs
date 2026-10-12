//! `POST /api/presence`: about once a second a signed-in player says where they are and gets back everyone else nearby.
//!
//! Records the report, then answers with the other players in the same district seen in the last twelve seconds. Positions are
//! clamped and text is trimmed; whatever a client sends is shown to others as plain text only. If the database cannot be
//! reached the answer is `offline`, not an error, so the game drops to solo play without a red line in anyone's console.
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use domain::time::minutes;
use domain::world::presence::{Incoming, Report, MOST_SHOWN, VISIBLE_FOR};
use store::queries::players;

use super::responses::{PlayerView, Presence};
use crate::http::{authed, parse_json, throttle, world_id, Reply};
use crate::state::AppState;

/// What one player may send per minute: once a second, with room for a client that catches up after a stall.
const PER_PLAYER_PER_MINUTE: u64 = 120;

pub async fn report(State(state): State<AppState>, headers: HeaderMap, raw: Bytes) -> Result<Json<Presence>, Reply> {
    // Who a player is comes from their session. Nothing in the report can name another person's id or handle.
    let signed = authed(&state, &headers).await?;
    let incoming: Incoming = parse_json(&raw)?;
    let report = Report::read_known(&incoming, world_id(signed.account), now_ms())
        .signed_in_as(signed.login.clone(), Some(signed.profile_name.clone().unwrap_or_else(|| signed.name.clone().unwrap_or(signed.login))));
    throttle(&state, &format!("ratelimit:player:{}", report.id), PER_PLAYER_PER_MINUTE, minutes(1)).await?;
    match nearby(&state, &report).await {
        Ok(players) => Ok(Json(Presence::nearby(report.id, players))),
        Err(error) => {
            tracing::error!(%error, "presence unavailable");
            Ok(Json(Presence::alone()))
        }
    }
}

async fn nearby(state: &AppState, report: &Report) -> Result<Vec<PlayerView>, store::Error> {
    players::record(&state.pool, report).await?;
    let others = players::others(&state.pool, report.district.as_str(), &report.id, VISIBLE_FOR, MOST_SHOWN).await?;
    Ok(others.into_iter().map(PlayerView::from).collect())
}

fn now_ms() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |elapsed| i64::try_from(elapsed.as_millis()).unwrap_or(i64::MAX))
}
