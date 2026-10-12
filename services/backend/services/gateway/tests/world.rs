//! The game's three calls. The first group needs no services; the second needs Postgres:
//! `DATABASE_URL=... cargo test -p gateway --test world -- --ignored`
use axum::http::StatusCode;
use integrations::github::Tally;
use serde_json::{json, Value};
use sqlx::PgPool;

mod common;
use common::{app_on, app_without_services, get, person, pin, post, post_as, FakeGithub};

const ADA: i64 = 1001;
const BOLA: i64 = 1002;

// ---- with the world unreachable --------------------------------------------------------------------------------------------

#[tokio::test]
async fn nobody_is_in_the_world_without_signing_in() {
    let app = app_without_services(FakeGithub::down());
    let unauthorised = (StatusCode::UNAUTHORIZED, json!({ "error": "session_invalid" }));
    assert_eq!(post(&app, "/api/presence", json!({ "id": ADA, "name": "Ada" })).await, unauthorised);
    assert_eq!(post(&app, "/api/bins", json!({ "spot": "1_1" })).await, unauthorised);
    assert_eq!(get(&app, "/api/me").await, unauthorised);
    // a token that cannot be one is refused without a database to ask
    assert_eq!(post_as(&app, "not-a-token", "/api/presence", json!({})).await, unauthorised);
}

#[tokio::test]
async fn when_the_database_is_down_bins_are_told_offline_and_a_person_cannot_be_checked() {
    let app = app_without_services(FakeGithub::down());
    let (status, body) = get(&app, "/api/bins?district=yaba").await;
    assert_eq!((status, body), (StatusCode::OK, json!({ "offline": true, "bins": [] })));
    let token = "a".repeat(64);
    let (status, body) = post_as(&app, &token, "/api/presence", json!({})).await;
    assert_eq!((status, body), (StatusCode::SERVICE_UNAVAILABLE, json!({ "error": "unavailable" })));
}

#[tokio::test]
async fn what_cannot_be_read_is_refused_with_a_code() {
    let app = app_without_services(FakeGithub::down());
    let (status, body) = get(&app, "/api/efforts?user=").await;
    assert_eq!((status, body), (StatusCode::BAD_REQUEST, json!({ "error": "bad_request" })));
}

#[tokio::test]
async fn the_game_is_served_cross_origin_only_to_its_own_origin() {
    let app = app_without_services(FakeGithub::down());
    let ask = |origin: &str| {
        axum::http::Request::options("/api/presence")
            .header("origin", origin)
            .header("access-control-request-method", "POST")
            .header("access-control-request-headers", "content-type")
            .body(axum::body::Body::empty())
            .unwrap()
    };
    let allowed = tower::ServiceExt::oneshot(app.clone(), ask("https://play.example.com")).await.unwrap();
    // the game signs in with a bearer token and saves its profile with PUT: a browser asks first, and both must be allowed
    let permitted = |name: &str| allowed.headers().get(name).and_then(|value| value.to_str().ok()).unwrap_or_default().to_ascii_lowercase();
    assert!(permitted("access-control-allow-headers").contains("authorization"), "Authorization must be allowed cross-origin");
    assert!(permitted("access-control-allow-methods").contains("put"), "PUT must be allowed cross-origin");
    assert_eq!(allowed.headers().get("access-control-allow-origin").and_then(|value| value.to_str().ok()), Some("https://play.example.com"));
    let stranger = tower::ServiceExt::oneshot(app, ask("https://evil.example.com")).await.unwrap();
    assert!(stranger.headers().get("access-control-allow-origin").is_none());
}

#[tokio::test]
async fn efforts_count_what_github_says_and_say_where_it_came_from() {
    // names no earlier run has used: Redis keeps a count for ten minutes, across test runs
    let (octocat, other) = (common::unique("Octo-Cat"), common::unique("octocat"));
    let github = FakeGithub::saying(Tally::Commits(412));
    let app = app_without_services(github.clone());
    let (status, body) = get(&app, &format!("/api/efforts?user={octocat}")).await;
    assert_eq!(body["user"], json!(octocat));
    let mut shown = body.clone();
    shown["user"] = json!("[login]");
    pin("efforts_counted_exactly", status, &shown);
    assert_eq!(github.asked.lock().unwrap().as_slice(), [octocat.as_str()]);

    let (_, body) = get(&app_without_services(FakeGithub::saying(Tally::Contributions(97))), &format!("/api/efforts?user={other}")).await;
    assert_eq!(body, json!({ "user": other, "commits": 97, "source": "contributions" }));
}

#[tokio::test]
async fn efforts_refuse_a_missing_login_an_unknown_person_and_a_github_outage() {
    let nobody = app_without_services(FakeGithub::saying(Tally::NoSuchUser));
    assert_eq!(get(&nobody, "/api/efforts").await, (StatusCode::BAD_REQUEST, json!({ "error": "bad_request" })));
    assert_eq!(get(&nobody, "/api/efforts?user=%21%21%21").await, (StatusCode::BAD_REQUEST, json!({ "error": "bad_request" })));
    assert_eq!(get(&nobody, &format!("/api/efforts?user={}", common::unique("ghost"))).await, (StatusCode::NOT_FOUND, json!({ "error": "not_found" })));
    let down = app_without_services(FakeGithub::down());
    assert_eq!(get(&down, &format!("/api/efforts?user={}", common::unique("octocat"))).await, (StatusCode::BAD_GATEWAY, json!({ "error": "provider_error" })));
}

// ---- on a database -----------------------------------------------------------------------------------------------------------

fn report(name: &str) -> Value {
    json!({ "name": name, "district": "yaba", "x": 10.5, "z": -3, "y": 0, "yaw": 1.25, "speed": 2, "look": { "color": "#336699", "style": "hoodie" } })
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL"]
async fn two_signed_in_players_see_each_other_by_their_github_names_and_not_themselves(pool: PgPool) {
    let (ada, bola) = (person(&pool, ADA, "ada-dev").await, person(&pool, BOLA, "bola-designs").await);
    let app = app_on(pool, FakeGithub::down());
    let (_, alone) = post_as(&app, &ada, "/api/presence", report("Ada")).await;
    assert_eq!((alone["online"].as_u64(), alone["players"].as_array().map(Vec::len)), (Some(1), Some(0)));

    let (status, body) = post_as(&app, &bola, "/api/presence", report("Bola")).await;
    pin("presence_sees_another_player", status, &body);

    // what Ada sees of Bola is who GitHub says she is, whatever the browser claimed
    let (_, body) = post_as(&app, &ada, "/api/presence", report("Ada")).await;
    assert_eq!((body["players"][0]["handle"].as_str(), body["players"][0]["name"].as_str()), (Some("bola-designs"), Some("bola-designs")));
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL"]
async fn a_report_cannot_name_another_persons_id_or_handle(pool: PgPool) {
    let (ada, bola) = (person(&pool, ADA, "ada-dev").await, person(&pool, BOLA, "bola-designs").await);
    let app = app_on(pool, FakeGithub::down());
    let (_, me) = common::get_as(&app, &bola, "/api/me").await;
    let bola_id = me["account"]["id"].as_str().unwrap().to_owned();
    // Ada reports as Bola: it lands on Ada, and Bola's own row is untouched
    post_as(&app, &ada, "/api/presence", json!({ "id": bola_id, "handle": "bola-designs", "name": "Not Ada", "x": 999 })).await;
    let (_, seen_by_bola) = post_as(&app, &bola, "/api/presence", report("Bola")).await;
    assert_eq!(seen_by_bola["players"].as_array().map(Vec::len), Some(1));
    assert_eq!((seen_by_bola["players"][0]["handle"].as_str(), seen_by_bola["players"][0]["x"].as_f64()), (Some("ada-dev"), Some(999.0)));
    assert_ne!(seen_by_bola["players"][0]["id"], json!(bola_id));
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL"]
async fn players_in_other_districts_are_not_shown(pool: PgPool) {
    let (ada, bola) = (person(&pool, ADA, "ada-dev").await, person(&pool, BOLA, "bola-designs").await);
    let app = app_on(pool, FakeGithub::down());
    post_as(&app, &ada, "/api/presence", json!({ "district": "yaba" })).await;
    let (_, body) = post_as(&app, &bola, "/api/presence", json!({ "district": "lekki" })).await;
    assert_eq!(body["players"], json!([]));
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL"]
async fn what_was_said_stays_until_something_new_is_said_and_a_stale_player_is_gone(pool: PgPool) {
    let (ada, bola) = (person(&pool, ADA, "ada-dev").await, person(&pool, BOLA, "bola-designs").await);
    let app = app_on(pool.clone(), FakeGithub::down());
    let (_, me) = common::get_as(&app, &bola, "/api/me").await;
    let bola_id = me["account"]["id"].as_str().unwrap().to_owned();
    post_as(&app, &ada, "/api/presence", json!({ "say": "e kaaro", "knock": { "to": bola_id, "kind": "gate" } })).await;
    // a later report that says nothing keeps the last words
    post_as(&app, &ada, "/api/presence", json!({ "x": 4 })).await;
    let (_, body) = post_as(&app, &bola, "/api/presence", json!({})).await;
    assert_eq!(body["players"][0]["say"]["text"], "e kaaro");
    assert_eq!((body["players"][0]["knock"]["to"].as_str(), body["players"][0]["knock"]["kind"].as_str()), (Some(bola_id.as_str()), Some("gate")));
    post_as(&app, &ada, "/api/presence", json!({ "say": "how far" })).await;
    let (_, body) = post_as(&app, &bola, "/api/presence", json!({})).await;
    assert_eq!(body["players"][0]["say"]["text"], "how far");

    // thirteen seconds of silence and Ada is out of sight
    sqlx::query("UPDATE players SET seen = now() - interval '13 seconds' WHERE handle = 'ada-dev'").execute(&pool).await.unwrap();
    let (_, body) = post_as(&app, &bola, "/api/presence", json!({})).await;
    assert_eq!(body["players"], json!([]));
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL"]
async fn the_jobs_service_forgets_players_not_heard_from_for_a_minute(pool: PgPool) {
    let (ada, bola) = (person(&pool, ADA, "ada-dev").await, person(&pool, BOLA, "bola-designs").await);
    let app = app_on(pool.clone(), FakeGithub::down());
    post_as(&app, &ada, "/api/presence", json!({})).await;
    post_as(&app, &bola, "/api/presence", json!({})).await;
    sqlx::query("UPDATE players SET seen = now() - interval '61 seconds' WHERE handle = 'ada-dev'").execute(&pool).await.unwrap();
    let forgotten = store::queries::players::forget_gone(&pool, domain::world::presence::FORGOTTEN_AFTER).await.unwrap();
    assert_eq!(forgotten, 1);
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL"]
async fn a_bin_takes_three_gifts_and_no_more_and_names_each_giver_once_by_their_login(pool: PgPool) {
    let tokens = [person(&pool, 1, "ada-dev").await, person(&pool, 2, "bola-designs").await, person(&pool, 3, "chidi-codes").await];
    let app = app_on(pool, FakeGithub::down());
    let gift = json!({ "district": "yaba", "spot": "12_-40", "name": "Someone Else" });
    let (_, first) = post_as(&app, &tokens[0], "/api/bins", gift.clone()).await;
    assert_eq!(first["bins"][0]["funded"], 1000);
    post_as(&app, &tokens[0], "/api/bins", gift.clone()).await;
    let (status, third) = post_as(&app, &tokens[1], "/api/bins", gift.clone()).await;
    pin("bin_paid_for", status, &third);
    let (_, fourth) = post_as(&app, &tokens[2], "/api/bins", gift).await;
    assert_eq!(fourth["bins"][0]["funded"], 3000);
    assert_eq!(fourth["bins"][0]["names"], json!(["ada-dev", "bola-designs"]));
    let (_, elsewhere) = get(&app, "/api/bins?district=lekki").await;
    assert_eq!(elsewhere, json!({ "bins": [] }));
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL"]
async fn gifts_made_at_the_same_moment_never_overfill_a_bin(pool: PgPool) {
    let mut tokens = Vec::new();
    for number in 0..8 {
        tokens.push(person(&pool, 100 + number, &format!("giver-{number}")).await);
    }
    let app = app_on(pool, FakeGithub::down());
    let gifts = tokens.into_iter().map(|token| {
        let app = app.clone();
        tokio::spawn(async move { post_as(&app, &token, "/api/bins", json!({ "spot": "1_1" })).await })
    });
    for gift in gifts {
        gift.await.unwrap();
    }
    let (_, body) = get(&app, "/api/bins").await;
    assert_eq!(body["bins"][0]["funded"], 3000);
    assert_eq!(body["bins"][0]["names"].as_array().map(Vec::len), Some(3));
}

#[sqlx::test(migrations = "../../migrations")]
#[ignore = "needs DATABASE_URL"]
async fn a_bad_spot_is_refused_for_a_signed_in_person(pool: PgPool) {
    let token = person(&pool, ADA, "ada-dev").await;
    let app = app_on(pool, FakeGithub::down());
    let (status, body) = post_as(&app, &token, "/api/bins", json!({ "spot": "somewhere" })).await;
    assert_eq!((status, body), (StatusCode::BAD_REQUEST, json!({ "error": "bad_request" })));
}
