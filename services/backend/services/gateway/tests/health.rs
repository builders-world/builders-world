use axum::http::StatusCode;

mod common;

#[tokio::test]
async fn health_answers_ok_without_any_service() {
    let app = common::app_without_services(common::FakeGithub::down());
    let (status, _) = common::get(&app, "/health").await;
    assert_eq!(status, StatusCode::OK);
}
