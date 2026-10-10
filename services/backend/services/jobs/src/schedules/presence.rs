//! Forgets players who have gone. Others stop seeing a player twelve seconds after their last report; the row itself is kept for
//! a minute (a brief stall must not lose someone's last words) and then deleted here.
use std::time::Duration;

use domain::time::seconds;
use domain::world::presence::FORGOTTEN_AFTER;
use store::queries::players;
use store::PgPool;

const EVERY: Duration = seconds(30);

pub async fn run(pool: PgPool) {
    loop {
        match players::forget_gone(&pool, FORGOTTEN_AFTER).await {
            Ok(0) => {}
            Ok(forgotten) => tracing::info!(forgotten, "players forgotten"),
            Err(error) => tracing::error!(%error, "forgetting players failed"),
        }
        tokio::time::sleep(EVERY).await;
    }
}
