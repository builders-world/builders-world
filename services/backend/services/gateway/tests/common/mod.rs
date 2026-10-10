//! Shared by the gateway's test files.
#![allow(dead_code)]
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use axum::body::Body;
use axum::http::{header, Method, Request, StatusCode};
use axum::Router;
use domain::errors::DomainError;
use gateway::build_router;
use gateway::config::Config;
use gateway::state::AppState;
use integrations::github::oauth::{GithubUser, SignIn};
use integrations::github::{Contributions, Tally};
use queue::Queue;
use serde_json::Value;
use sqlx::PgPool;
use tower::ServiceExt;

/// A GitHub that answers from a list and never leaves the machine.
pub struct FakeGithub {
    pub answer: Result<Tally, String>,
    pub asked: Mutex<Vec<String>>,
}

impl FakeGithub {
    pub fn saying(tally: Tally) -> Arc<Self> {
        Arc::new(Self { answer: Ok(tally), asked: Mutex::default() })
    }

    pub fn down() -> Arc<Self> {
        Arc::new(Self { answer: Err("github is down".into()), asked: Mutex::default() })
    }
}

#[async_trait]
impl Contributions for FakeGithub {
    async fn tally(&self, user: &str) -> Result<Tally, DomainError> {
        self.asked.lock().unwrap().push(user.to_owned());
        self.answer.clone().map_err(DomainError::Upstream)
    }
}

/// A GitHub sign-in that says who the person is without anyone going to GitHub.
pub struct FakeSignIn {
    pub user: Result<GithubUser, String>,
}

impl FakeSignIn {
    pub fn as_user(id: i64, login: &str) -> Arc<Self> {
        Arc::new(Self { user: Ok(GithubUser { id, login: login.into(), name: Some(format!("{login} Lastname")) }) })
    }
}

#[async_trait]
impl SignIn for FakeSignIn {
    fn authorize_url(&self, state: &str) -> String {
        format!("https://github.test/authorize?state={state}")
    }

    async fn user_for(&self, code: &str) -> Result<GithubUser, DomainError> {
        if code != "good-code" {
            return Err(DomainError::Upstream("bad_verification_code".into()));
        }
        self.user.clone().map_err(DomainError::Upstream)
    }
}

/// Redis for the tests that need it, from `REDIS_URL`; otherwise an address nothing listens on, which the limiter and cache survive.
pub fn redis_url() -> String {
    std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:1".into())
}

pub fn config() -> Config {
    Config {
        bind_addr: "127.0.0.1:0".into(),
        database_url: "postgres://postgres:postgres@127.0.0.1:1/unreachable".into(),
        redis_url: redis_url(),
        github_client_id: Some("client".into()),
        github_client_secret: Some("secret".into()),
        public_url: Some("https://api.example.com".into()),
        github_redirect_url: None,
        github_token: None,
        allowed_origins: vec!["https://play.example.com".into()],
        rate_limit_per_minute: 1_000_000,
        trusted_proxy_hops: 1,
        client_ip_header: None,
    }
}

/// An app whose database and Redis cannot be reached: what the game sees when the world is down.
pub fn app_without_services(github: Arc<FakeGithub>) -> Router {
    let config = config();
    let pool = store::connect_lazy(&config.database_url).unwrap();
    app(config, pool, github, None)
}

/// An app on a real (test) database. Redis is not needed: the limiter and the cache fail open.
pub fn app_on(pool: PgPool, github: Arc<FakeGithub>) -> Router {
    app(config(), pool, github, None)
}

/// An app on a database where people can sign in (as the fake GitHub user), and Redis holds the sign-in state.
pub fn app_with_sign_in(pool: PgPool, user: Arc<FakeSignIn>) -> Router {
    app(config(), pool, FakeGithub::down(), Some(user))
}

fn app(config: Config, pool: PgPool, github: Arc<FakeGithub>, sign_in: Option<Arc<FakeSignIn>>) -> Router {
    let queue = Queue::new(&config.redis_url).unwrap();
    let sign_in = sign_in.map(|fake| fake as Arc<dyn SignIn>);
    build_router(AppState { config: Arc::new(config), pool, queue, contributions: github, sign_in })
}

/// Signs a person up as GitHub user `github_id`, as the callback does, and returns their session token.
pub async fn person(pool: &PgPool, github_id: i64, login: &str) -> String {
    let account = store::queries::accounts::sign_in(pool, github_id, login, None).await.unwrap();
    let token = identity::token::generate();
    store::queries::sessions::open(pool, account.id, &identity::token::hash(&token), std::time::Duration::from_secs(3600)).await.unwrap();
    token
}

pub async fn send(app: &Router, method: Method, uri: &str, body: Option<Value>) -> (StatusCode, Value) {
    send_as(app, None, method, uri, body).await
}

pub async fn send_as(app: &Router, token: Option<&str>, method: Method, uri: &str, body: Option<Value>) -> (StatusCode, Value) {
    // every request comes from an address of its own, so the limits (which live in Redis and outlast a test run) never get in a test's way
    let mut request = Request::builder().method(method).uri(uri).header("x-forwarded-for", next_address());
    if let Some(token) = token {
        request = request.header(header::AUTHORIZATION, format!("Bearer {token}"));
    }
    let body = match body {
        Some(body) => {
            request = request.header(header::CONTENT_TYPE, "application/json");
            Body::from(body.to_string())
        }
        None => Body::empty(),
    };
    let response = app.clone().oneshot(request.body(body).unwrap()).await.unwrap();
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    (status, serde_json::from_slice(&bytes).unwrap_or(Value::Null))
}

pub async fn get_as(app: &Router, token: &str, uri: &str) -> (StatusCode, Value) {
    send_as(app, Some(token), Method::GET, uri, None).await
}

pub async fn post_as(app: &Router, token: &str, uri: &str, body: Value) -> (StatusCode, Value) {
    send_as(app, Some(token), Method::POST, uri, Some(body)).await
}

pub async fn put_as(app: &Router, token: &str, uri: &str, body: Value) -> (StatusCode, Value) {
    send_as(app, Some(token), Method::PUT, uri, Some(body)).await
}

pub async fn get(app: &Router, uri: &str) -> (StatusCode, Value) {
    send(app, Method::GET, uri, None).await
}

pub async fn post(app: &Router, uri: &str, body: Value) -> (StatusCode, Value) {
    send(app, Method::POST, uri, Some(body)).await
}

/// Pins a response the game depends on. Times are masked: they are the clock's, not the contract's.
pub fn pin(name: &str, status: StatusCode, body: &Value) {
    let mut settings = insta::Settings::clone_current();
    settings.set_snapshot_path(concat!(env!("CARGO_MANIFEST_DIR"), "/tests/snapshots"));
    settings.set_prepend_module_to_snapshot(false);
    settings.bind(|| insta::assert_json_snapshot!(name, serde_json::json!({ "status": status.as_u16(), "body": masked(body) })));
}

/// The response with every time (`t`, in milliseconds) and every person's id replaced, wherever they are: they are the clock's and the database's, not the contract's.
fn masked(value: &Value) -> Value {
    match value {
        Value::Object(map) => Value::Object(
            map.iter()
                .map(|(key, value)| {
                    (
                        key.clone(),
                        match (key.as_str(), value) {
                            ("t", Value::Number(_)) => Value::from("[time]"),
                            ("id" | "you", Value::String(id)) if id.len() == 33 && id.starts_with('u') => Value::from("[id]"),
                            _ => masked(value),
                        },
                    )
                })
                .collect(),
        ),
        Value::Array(items) => Value::Array(items.iter().map(masked).collect()),
        other => other.clone(),
    }
}

/// A new client address each time: unique across requests and across test runs.
pub fn next_address() -> String {
    use std::sync::atomic::{AtomicU32, Ordering};
    static COUNT: AtomicU32 = AtomicU32::new(0);
    let count = COUNT.fetch_add(1, Ordering::Relaxed);
    let start = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |elapsed| elapsed.subsec_nanos());
    format!("10.{}.{}.{}", start % 250, (count / 250) % 250, count % 250 + 1)
}

/// A name no earlier test run has used, for the things Redis remembers between runs (a counted login).
pub fn unique(prefix: &str) -> String {
    let nanos = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |elapsed| elapsed.as_nanos());
    format!("{prefix}-{nanos}")
}
