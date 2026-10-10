use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use domain::time::minutes;

use crate::http::{client_ip, throttle, Reply};
use crate::state::AppState;

/// Fixed-window limit per client address, backed by Redis, on every route but `/health`.
pub async fn rate_limit(State(state): State<AppState>, request: Request, next: Next) -> Result<Response, Reply> {
    let ip = client_ip(request.headers(), state.config.trusted_proxy_hops, state.config.client_ip_header.as_deref());
    throttle(&state, &format!("ratelimit:ip:{ip}"), state.config.rate_limit_per_minute, minutes(1)).await?;
    Ok(next.run(request).await)
}
