//! Street bins (world bible 12.3): a bin one player funds is there for everyone.
//!
//! * `GET  /api/bins?district=yaba`          the district's bins and how much of each has been given.
//! * `POST /api/bins { district, spot }` (signed in) adds one gift of 1,000 Efforts towards the bin at `spot`, and answers as the GET does.
//!
//! The game takes the Efforts from the player's own wallet; the server only records the total, never above the bin's price.
//! If the database cannot be reached the answer is `offline`, and the game keeps its own copy.
use axum::body::Bytes;
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::Json;
use domain::world::bins::{giver, Spot};
use domain::world::district::District;
use serde::Deserialize;
use serde_json::Value;
use store::queries::bins as queries;

use super::responses::Bins;
use crate::http::{authed, bad_request, parse_json, Reply};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct Ask {
    district: Option<String>,
}

pub async fn list(State(state): State<AppState>, Query(ask): Query<Ask>) -> Json<Bins> {
    let district = District::parse(ask.district.map(Value::String).as_ref());
    Json(standing(&state, &district).await)
}

#[derive(Debug, Deserialize)]
pub struct Gift {
    district: Option<Value>,
    spot: Option<Value>,
}

pub async fn fund(State(state): State<AppState>, headers: HeaderMap, raw: Bytes) -> Result<Json<Bins>, Reply> {
    // The name beside a gift is the giver's verified GitHub login, not whatever the browser says.
    let signed = authed(&state, &headers).await?;
    let gift: Gift = parse_json(&raw)?;
    let district = District::parse(gift.district.as_ref());
    let spot = Spot::parse(gift.spot.as_ref()).ok_or_else(bad_request)?;
    if let Err(error) = queries::fund(&state.pool, district.as_str(), spot.as_str(), &giver(Some(&Value::String(signed.login)))).await {
        tracing::error!(%error, "a gift to a bin was not recorded");
        return Ok(Json(Bins::offline()));
    }
    Ok(Json(standing(&state, &district).await))
}

async fn standing(state: &AppState, district: &District) -> Bins {
    match queries::in_district(&state.pool, district.as_str()).await {
        Ok(bins) => Bins::standing(bins),
        Err(error) => {
            tracing::error!(%error, "bins unavailable");
            Bins::offline()
        }
    }
}
