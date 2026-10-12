//! Postgres: the pool, migrations, and every SQL statement the services run (see `queries`).
pub mod queries;

use std::time::Duration;

use domain::time::seconds;
use sqlx::postgres::PgPoolOptions;
pub use sqlx::{Error, PgPool};

const MAX_CONNECTIONS: u32 = 10;
const ACQUIRE_TIMEOUT: Duration = seconds(5);

fn options() -> PgPoolOptions {
    PgPoolOptions::new().max_connections(MAX_CONNECTIONS).acquire_timeout(ACQUIRE_TIMEOUT)
}

/// Opens the pool and checks the database is reachable.
pub async fn connect(url: &str) -> Result<PgPool, sqlx::Error> {
    options().connect(url).await
}

/// A pool that connects on first use, so code that builds state (tests, startup) needs no database.
pub fn connect_lazy(url: &str) -> Result<PgPool, sqlx::Error> {
    options().connect_lazy(url)
}

/// Applies the migrations in `migrations/` that have not run yet.
pub async fn migrate(pool: &PgPool) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate!("../../migrations").run(pool).await
}
