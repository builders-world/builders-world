use std::time::Duration;

use domain::world::presence::{Answer, Card, Emote, Knock, Look, NowPlaying, Pet, Play, Report, Said};
use sqlx::types::Json;
use sqlx::PgExecutor;

/// A player as another player sees them.
#[derive(Debug)]
pub struct Visitor {
    pub id: String,
    pub name: String,
    pub handle: String,
    pub position_x: f64,
    pub position_z: f64,
    pub height: f64,
    pub yaw: f64,
    pub speed: f64,
    pub look: Look,
    pub home: String,
    pub np: Option<NowPlaying>,
    pub pet: Option<Pet>,
    pub card: Card,
    pub say: Option<Said>,
    pub emote: Option<Emote>,
    pub knock: Option<Knock>,
    pub answer: Option<Answer>,
    pub play: Option<Play>,
    /// When they last reported, in milliseconds.
    pub seen_at: i64,
}

/// Records where a player is and how they look, creating them if they are new. What they said, emoted, knocked, answered or
/// played is replaced only when this report has something new; otherwise the last one stays, with its own time.
pub async fn record(executor: impl PgExecutor<'_>, report: &Report) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO players (id, district, name, handle, x, y, z, yaw, speed, look, home, np, pet, card, say, emote, knock, answer, play, seen)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, now())
        ON CONFLICT (id) DO UPDATE SET
            district = EXCLUDED.district, name = EXCLUDED.name, handle = EXCLUDED.handle,
            x = EXCLUDED.x, y = EXCLUDED.y, z = EXCLUDED.z, yaw = EXCLUDED.yaw, speed = EXCLUDED.speed,
            look = EXCLUDED.look, home = EXCLUDED.home, np = EXCLUDED.np, pet = EXCLUDED.pet, card = EXCLUDED.card,
            say = COALESCE(EXCLUDED.say, players.say),
            emote = COALESCE(EXCLUDED.emote, players.emote),
            knock = COALESCE(EXCLUDED.knock, players.knock),
            answer = COALESCE(EXCLUDED.answer, players.answer),
            play = COALESCE(EXCLUDED.play, players.play),
            seen = now()
        "#,
        report.id,
        report.district.as_str(),
        report.name,
        report.handle,
        report.position_x,
        report.height,
        report.position_z,
        report.yaw,
        report.speed,
        Json(&report.look) as _,
        report.home,
        report.np.as_ref().map(Json) as _,
        report.pet.as_ref().map(Json) as _,
        Json(&report.card) as _,
        report.say.as_ref().map(Json) as _,
        report.emote.as_ref().map(Json) as _,
        report.knock.as_ref().map(Json) as _,
        report.answer.as_ref().map(Json) as _,
        report.play.as_ref().map(Json) as _,
    )
    .execute(executor)
    .await?;
    Ok(())
}

/// `Visitor` as the database hands it over: the structured columns are still JSON.
struct Row {
    id: String,
    name: String,
    handle: String,
    position_x: f64,
    position_z: f64,
    height: f64,
    yaw: f64,
    speed: f64,
    look: Json<Look>,
    home: String,
    np: Option<Json<NowPlaying>>,
    pet: Option<Json<Pet>>,
    card: Json<Card>,
    say: Option<Json<Said>>,
    emote: Option<Json<Emote>>,
    knock: Option<Json<Knock>>,
    answer: Option<Json<Answer>>,
    play: Option<Json<Play>>,
    seen_at: i64,
}

impl From<Row> for Visitor {
    fn from(row: Row) -> Self {
        Self {
            id: row.id,
            name: row.name,
            handle: row.handle,
            position_x: row.position_x,
            position_z: row.position_z,
            height: row.height,
            yaw: row.yaw,
            speed: row.speed,
            look: row.look.0,
            home: row.home,
            np: row.np.map(|json| json.0),
            pet: row.pet.map(|json| json.0),
            card: row.card.0,
            say: row.say.map(|json| json.0),
            emote: row.emote.map(|json| json.0),
            knock: row.knock.map(|json| json.0),
            answer: row.answer.map(|json| json.0),
            play: row.play.map(|json| json.0),
            seen_at: row.seen_at,
        }
    }
}

/// The other players in a district who reported within `within`, newest first, at most `limit`.
pub async fn others(executor: impl PgExecutor<'_>, district: &str, except: &str, within: Duration, limit: i64) -> Result<Vec<Visitor>, sqlx::Error> {
    let rows = sqlx::query_as!(
        Row,
        r#"
        SELECT id, name, handle,
               x AS position_x, z AS position_z, y AS height, yaw, speed,
               look AS "look!: Json<Look>",
               home,
               np AS "np?: Json<NowPlaying>",
               pet AS "pet?: Json<Pet>",
               card AS "card!: Json<Card>",
               say AS "say?: Json<Said>",
               emote AS "emote?: Json<Emote>",
               knock AS "knock?: Json<Knock>",
               answer AS "answer?: Json<Answer>",
               play AS "play?: Json<Play>",
               (EXTRACT(EPOCH FROM seen) * 1000)::BIGINT AS "seen_at!"
        FROM players
        WHERE district = $1 AND id <> $2 AND seen >= now() - make_interval(secs => $3)
        ORDER BY seen DESC
        LIMIT $4
        "#,
        district,
        except,
        within.as_secs_f64(),
        limit
    )
    .fetch_all(executor)
    .await?;
    Ok(rows.into_iter().map(Visitor::from).collect())
}

/// Forgets everyone who has not reported for `after`. Returns how many were forgotten.
pub async fn forget_gone(executor: impl PgExecutor<'_>, after: Duration) -> Result<u64, sqlx::Error> {
    let done = sqlx::query!("DELETE FROM players WHERE seen < now() - make_interval(secs => $1)", after.as_secs_f64()).execute(executor).await?;
    Ok(done.rows_affected())
}
