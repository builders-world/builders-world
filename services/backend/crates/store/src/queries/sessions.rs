use std::time::Duration;

use sqlx::PgExecutor;
use uuid::Uuid;

/// The person a bearer token belongs to.
#[derive(Debug, Clone)]
pub struct Signed {
    pub account: Uuid,
    pub login: String,
    pub name: Option<String>,
    /// The name they gave in their profile, if they have one.
    pub profile_name: Option<String>,
    /// How long since the session was last used.
    pub idle: Duration,
}

struct Row {
    account: Uuid,
    login: String,
    name: Option<String>,
    profile_name: Option<String>,
    idle_seconds: f64,
}

pub async fn open(executor: impl PgExecutor<'_>, account: Uuid, token_hash: &str, lifetime: Duration) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "INSERT INTO sessions (account_id, token_hash, expires_at) VALUES ($1, $2, now() + make_interval(secs => $3))",
        account,
        token_hash,
        lifetime.as_secs_f64()
    )
    .execute(executor)
    .await?;
    Ok(())
}

/// Who a token belongs to, if it is live: not revoked and not expired.
pub async fn find(executor: impl PgExecutor<'_>, token_hash: &str) -> Result<Option<Signed>, sqlx::Error> {
    let row = sqlx::query_as!(
        Row,
        r#"
        SELECT a.id AS account, a.login, a.name, p.profile ->> 'name' AS profile_name,
               EXTRACT(EPOCH FROM now() - s.last_seen_at)::DOUBLE PRECISION AS "idle_seconds!"
        FROM sessions s
        JOIN accounts a ON a.id = s.account_id
        LEFT JOIN profiles p ON p.account_id = a.id
        WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
        "#,
        token_hash
    )
    .fetch_optional(executor)
    .await?;
    Ok(row.map(|row| Signed {
        account: row.account,
        login: row.login,
        name: row.name,
        profile_name: row.profile_name.filter(|name| !name.is_empty()),
        idle: Duration::from_secs_f64(row.idle_seconds.max(0.0)),
    }))
}

pub async fn touch(executor: impl PgExecutor<'_>, token_hash: &str) -> Result<(), sqlx::Error> {
    sqlx::query!("UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1", token_hash).execute(executor).await?;
    Ok(())
}

pub async fn revoke(executor: impl PgExecutor<'_>, token_hash: &str) -> Result<(), sqlx::Error> {
    sqlx::query!("UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL", token_hash).execute(executor).await?;
    Ok(())
}

/// Deletes sessions that can no longer be used. Returns how many.
pub async fn forget_dead(executor: impl PgExecutor<'_>) -> Result<u64, sqlx::Error> {
    let done = sqlx::query!("DELETE FROM sessions WHERE expires_at < now() OR revoked_at < now() - interval '1 day'").execute(executor).await?;
    Ok(done.rows_affected())
}
