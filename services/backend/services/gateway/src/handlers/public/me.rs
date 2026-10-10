//! The signed-in person.
//!
//! * `GET /api/me`           who they are, and the profile they saved (if any).
//! * `PUT /api/me/profile`   saves what they chose at arrivals and in the wardrobe, so it follows them to any device.
use axum::body::Bytes;
use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use domain::world::profile::Profile;
use serde_json::Value;
use store::queries::profiles;

use super::responses::{AccountView, Me};
use crate::http::{authed, parse_json, unavailable, world_id, Reply};
use crate::state::AppState;

pub async fn show(State(state): State<AppState>, headers: HeaderMap) -> Result<Json<Me>, Reply> {
    let signed = authed(&state, &headers).await?;
    let profile = profiles::find(&state.pool, signed.account).await.map_err(|error| {
        tracing::error!(%error, "profile lookup failed");
        unavailable()
    })?;
    Ok(Json(Me { account: AccountView { id: world_id(signed.account), login: signed.login, name: signed.name }, profile }))
}

pub async fn save(State(state): State<AppState>, headers: HeaderMap, raw: Bytes) -> Result<Json<Profile>, Reply> {
    let signed = authed(&state, &headers).await?;
    let sent: Value = parse_json(&raw)?;
    let profile = Profile::read(&sent);
    profiles::save(&state.pool, signed.account, &profile).await.map_err(|error| {
        tracing::error!(%error, "profile not saved");
        unavailable()
    })?;
    Ok(Json(profile))
}
