pub mod config;
pub mod error;
pub mod handlers;
pub mod responses;
pub mod shutdown;
pub mod state;

use axum::routing::get;
use axum::Router;
use tower_http::trace::TraceLayer;

use crate::state::AppState;

pub fn build_router(state: AppState) -> Router {
    Router::new().route("/health", get(handlers::public::health::health)).layer(TraceLayer::new_for_http()).with_state(state)
}
