//! Forgets sessions that can no longer be used: expired, or ended a day ago.
use std::time::Duration;

use domain::time::hours;
use store::queries::sessions;
use store::PgPool;

const EVERY: Duration = hours(1);

pub async fn run(pool: PgPool) {
    loop {
        match sessions::forget_dead(&pool).await {
            Ok(0) => {}
            Ok(forgotten) => tracing::info!(forgotten, "sessions forgotten"),
            Err(error) => tracing::error!(%error, "forgetting sessions failed"),
        }
        tokio::time::sleep(EVERY).await;
    }
}
