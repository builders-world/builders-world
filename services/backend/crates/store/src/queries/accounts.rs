use sqlx::PgExecutor;
use uuid::Uuid;

/// A person.
#[derive(Debug, Clone)]
pub struct Account {
    pub id: Uuid,
    pub login: String,
    pub name: Option<String>,
}

/// Finds the person behind a GitHub user id, or makes them. Their login and name are brought up to date either way, because GitHub
/// lets people rename themselves and the id is what stays.
pub async fn sign_in(executor: impl PgExecutor<'_>, github_id: i64, login: &str, name: Option<&str>) -> Result<Account, sqlx::Error> {
    sqlx::query_as!(
        Account,
        r#"
        INSERT INTO accounts (github_id, login, name) VALUES ($1, $2, $3)
        ON CONFLICT (github_id) DO UPDATE SET login = EXCLUDED.login, name = EXCLUDED.name, last_sign_in = now()
        RETURNING id, login, name
        "#,
        github_id,
        login,
        name
    )
    .fetch_one(executor)
    .await
}
