//! Signing in with GitHub, and the person behind a session. Needs Postgres, and Redis for the sign-in state:
//! `DATABASE_URL=... REDIS_URL=... cargo test -p gateway --test people -- --ignored`
use axum::http::{header, Method, Request, StatusCode};
use integrations::github::Tally;
use serde_json::{json, Value};
use sqlx::PgPool;
use tower::ServiceExt;

mod common;
use common::{app_on, app_with_sign_in, get, get_as, person, pin, post, post_as, put_as, FakeGithub, FakeSignIn};

const GAME: &str = "https://play.example.com";

async fn redirect(app: &axum::Router, uri: &str) -> (StatusCode, String) {
    let response = app
        .clone()
        .oneshot(Request::builder().method(Method::GET).uri(uri).header("x-forwarded-for", common::next_address()).body(axum::body::Body::empty()).unwrap())
        .await
        .unwrap();
    (response.status(), response.headers().get(header::LOCATION).and_then(|value| value.to_str().ok()).unwrap_or_default().to_owned())
}

/// The whole round trip: out to GitHub with a state, back with a code, on to the game with a session.
async fn sign_in(app: &axum::Router) -> String {
    let (status, to_github) = redirect(app, &format!("/api/auth/github?return={GAME}")).await;
    assert_eq!(status, StatusCode::SEE_OTHER);
    let state = to_github.strip_prefix("https://github.test/authorize?state=").expect("sent to GitHub with a state").to_owned();
    let (status, to_game) = redirect(app, &format!("/api/auth/github/callback?code=good-code&state={state}")).await;
    assert_eq!(status, StatusCode::SEE_OTHER);
    to_game.strip_prefix(&format!("{GAME}/#bw-session=")).expect("sent to the game with a session").to_owned()
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL and REDIS_URL"]
async fn signing_in_gives_a_session_for_the_person_github_says_it_is(pool: PgPool) {
    let app = app_with_sign_in(pool.clone(), FakeSignIn::as_user(4242, "ada-dev"));
    let token = sign_in(&app).await;
    assert!(identity::token::looks_valid(&token));
    let (status, me) = get_as(&app, &token, "/api/me").await;
    let mut shown = me.clone();
    shown["account"]["id"] = json!("[id]");
    pin("me_after_signing_in", status, &shown);
    assert_eq!(me["account"]["login"], "ada-dev");

    // the token is stored only as a hash
    let stored: String = sqlx::query_scalar("SELECT token_hash FROM sessions").fetch_one(&pool).await.unwrap();
    assert_ne!(stored, token);

    // signing in again is the same person, not a second account
    sign_in(&app).await;
    let accounts: i64 = sqlx::query_scalar("SELECT count(*) FROM accounts").fetch_one(&pool).await.unwrap();
    assert_eq!(accounts, 1);
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL and REDIS_URL"]
async fn a_return_from_github_works_once_and_only_with_the_state_we_gave(pool: PgPool) {
    let app = app_with_sign_in(pool, FakeSignIn::as_user(1, "ada-dev"));
    let (_, to_github) = redirect(&app, &format!("/api/auth/github?return={GAME}")).await;
    let state = to_github.strip_prefix("https://github.test/authorize?state=").unwrap().to_owned();
    let uri = format!("/api/auth/github/callback?code=good-code&state={state}");
    assert_eq!(redirect(&app, &uri).await.0, StatusCode::SEE_OTHER);
    // the same state again: used up
    assert_eq!(redirect(&app, &uri).await.0, StatusCode::BAD_REQUEST);
    // a state we never gave
    assert_eq!(redirect(&app, &format!("/api/auth/github/callback?code=good-code&state={}", "b".repeat(64))).await.0, StatusCode::BAD_REQUEST);
    assert_eq!(redirect(&app, "/api/auth/github/callback?code=good-code").await.0, StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL and REDIS_URL"]
async fn a_code_github_refuses_sends_the_person_back_to_the_game_with_no_session(pool: PgPool) {
    let app = app_with_sign_in(pool.clone(), FakeSignIn::as_user(1, "ada-dev"));
    let (_, to_github) = redirect(&app, &format!("/api/auth/github?return={GAME}")).await;
    let state = to_github.strip_prefix("https://github.test/authorize?state=").unwrap().to_owned();
    let (status, to_game) = redirect(&app, &format!("/api/auth/github/callback?code=stolen&state={state}")).await;
    assert_eq!((status, to_game.as_str()), (StatusCode::SEE_OTHER, "https://play.example.com/#bw-error=github"));
    let sessions: i64 = sqlx::query_scalar("SELECT count(*) FROM sessions").fetch_one(&pool).await.unwrap();
    assert_eq!(sessions, 0);
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL and REDIS_URL"]
async fn the_game_can_only_send_people_back_to_its_own_address(pool: PgPool) {
    let app = app_with_sign_in(pool, FakeSignIn::as_user(1, "ada-dev"));
    assert_eq!(redirect(&app, "/api/auth/github?return=https://evil.example.com").await.0, StatusCode::BAD_REQUEST);
    // no `return` means the game's first origin
    assert_eq!(redirect(&app, "/api/auth/github").await.0, StatusCode::SEE_OTHER);
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL"]
async fn the_profile_saved_on_one_device_comes_back_on_another_with_only_what_is_known(pool: PgPool) {
    let token = person(&pool, 7, "ada-dev").await;
    let app = app_on(pool.clone(), FakeGithub::down());
    assert_eq!(get_as(&app, &token, "/api/me").await.1["profile"], Value::Null);
    let sent = json!({
        "name": "Ada", "role": "developer", "city": "Lagos", "district": "Yaba", "avatar": { "color": "#577e73", "style": "hoodie" },
        "look": { "hair": "afro", "top": "spaceship", "acc": ["bag"] }, "pet": { "kind": "dog", "breed": "awuku", "name": "Rex" },
        "card": { "role": "Dev", "showCommits": true, "commits": 12 }, "isAdmin": true
    });
    let (status, saved) = put_as(&app, &token, "/api/me/profile", sent).await;
    pin("profile_saved", status, &saved);
    let (_, me) = get_as(&app, &token, "/api/me").await;
    assert_eq!(me["profile"], saved);
    assert!(me["profile"].get("isAdmin").is_none());
    // saving again replaces it
    put_as(&app, &token, "/api/me/profile", json!({ "name": "Ada B" })).await;
    assert_eq!(get_as(&app, &token, "/api/me").await.1["profile"]["name"], "Ada B");
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL"]
async fn a_person_only_ever_has_their_own_profile(pool: PgPool) {
    let (ada, bola) = (person(&pool, 1, "ada-dev").await, person(&pool, 2, "bola-designs").await);
    let app = app_on(pool, FakeGithub::down());
    put_as(&app, &ada, "/api/me/profile", json!({ "name": "Ada" })).await;
    assert_eq!(get_as(&app, &bola, "/api/me").await.1["profile"], Value::Null);
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL"]
async fn logging_out_ends_the_session_and_a_revoked_or_expired_one_is_refused(pool: PgPool) {
    let token = person(&pool, 1, "ada-dev").await;
    let app = app_on(pool.clone(), FakeGithub::down());
    assert_eq!(get_as(&app, &token, "/api/me").await.0, StatusCode::OK);
    assert_eq!(post_as(&app, &token, "/api/auth/logout", json!({})).await, (StatusCode::OK, json!({ "ok": true })));
    assert_eq!(get_as(&app, &token, "/api/me").await, (StatusCode::UNAUTHORIZED, json!({ "error": "session_invalid" })));

    let old = person(&pool, 2, "bola-designs").await;
    sqlx::query("UPDATE sessions SET expires_at = now() - interval '1 second' WHERE token_hash = $1")
        .bind(identity::token::hash(&old))
        .execute(&pool)
        .await
        .unwrap();
    assert_eq!(get_as(&app, &old, "/api/me").await.0, StatusCode::UNAUTHORIZED);
    assert_eq!(post(&app, "/api/auth/logout", json!({})).await.0, StatusCode::OK, "logging out with nothing to end is fine");
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL"]
async fn a_person_is_counted_for_their_own_github_account_and_nobody_elses(pool: PgPool) {
    let login = common::unique("Ada-Dev");
    let token = person(&pool, 1, &login).await;
    let github = FakeGithub::saying(Tally::Commits(412));
    let app = app_on(pool, github.clone());
    let (status, body) = get_as(&app, &token, "/api/me/efforts?user=torvalds").await;
    assert_eq!((status, body), (StatusCode::OK, json!({ "user": login, "commits": 412, "source": "commits" })));
    assert_eq!(github.asked.lock().unwrap().as_slice(), [login.as_str()]);
    assert_eq!(get(&app, "/api/me/efforts").await.0, StatusCode::UNAUTHORIZED);
}
