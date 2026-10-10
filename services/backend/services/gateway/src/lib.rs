pub mod config;
pub mod error;
pub mod handlers;
pub mod http;
pub mod middleware;
pub mod responses;
pub mod shutdown;
pub mod state;

use axum::extract::DefaultBodyLimit;
use axum::middleware::{from_fn_with_state, map_response};
use axum::routing::{get, post, put};
use axum::Router;
use tower_http::trace::TraceLayer;

use crate::state::AppState;

pub fn build_router(state: AppState) -> Router {
    // What changes with every request is never cached; a person's count is, and says for how long itself.
    let world = Router::new()
        .route("/api/presence", post(handlers::public::presence::report))
        .route("/api/bins", get(handlers::public::bins::list).post(handlers::public::bins::fund))
        .layer(DefaultBodyLimit::max(http::MAX_BODY_BYTES))
        .layer(map_response(http::never_cache));
    let efforts = Router::new().route("/api/efforts", get(handlers::public::efforts::show));
    // Who people are. The sign-in routes exist only when the GitHub OAuth app is set up; the rest answer "not signed in" without it.
    let people = Router::new()
        .route("/api/me", get(handlers::public::me::show))
        .route("/api/me/profile", put(handlers::public::me::save))
        .route("/api/me/efforts", get(handlers::public::efforts::mine))
        .route("/api/auth/github", get(handlers::public::auth::start))
        .route("/api/auth/github/callback", get(handlers::public::auth::finish))
        .route("/api/auth/logout", post(handlers::public::auth::logout))
        .layer(DefaultBodyLimit::max(http::MAX_BODY_BYTES))
        .layer(map_response(http::never_cache));

    let router = Router::new()
        .merge(world)
        .merge(efforts)
        .merge(people)
        .layer(from_fn_with_state(state.clone(), middleware::rate_limit::rate_limit))
        // Added after the limiter on purpose: the platform's health check is never counted.
        .route("/health", get(handlers::public::health::health));
    // The game's own origins only; none when it is served from the same address.
    let router = match http::cors(&state.config) {
        Some(cors) => router.layer(cors),
        None => router,
    };
    router.layer(TraceLayer::new_for_http()).with_state(state)
}
