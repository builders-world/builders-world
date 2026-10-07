use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use gateway::build_router;
use gateway::config::Config;
use gateway::state::AppState;
use tower::ServiceExt;

#[tokio::test]
async fn health_answers_ok() {
    let state = AppState { config: Arc::new(Config { bind_addr: "127.0.0.1:0".into() }) };
    let response = build_router(state).oneshot(Request::get("/health").body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}
