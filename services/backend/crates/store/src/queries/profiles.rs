use domain::world::profile::Profile;
use sqlx::types::Json;
use sqlx::PgExecutor;
use uuid::Uuid;

pub async fn find(executor: impl PgExecutor<'_>, account: Uuid) -> Result<Option<Profile>, sqlx::Error> {
    let row = sqlx::query!(r#"SELECT profile AS "profile!: Json<Profile>" FROM profiles WHERE account_id = $1"#, account).fetch_optional(executor).await?;
    Ok(row.map(|row| row.profile.0))
}

pub async fn save(executor: impl PgExecutor<'_>, account: Uuid, profile: &Profile) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "INSERT INTO profiles (account_id, profile) VALUES ($1, $2) ON CONFLICT (account_id) DO UPDATE SET profile = EXCLUDED.profile, updated_at = now()",
        account,
        Json(profile) as _
    )
    .execute(executor)
    .await?;
    Ok(())
}
