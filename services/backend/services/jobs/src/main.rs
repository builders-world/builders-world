//! The background half of the product: queue consumers and scheduled jobs. They run without anyone logged in. For now the
//! two jobs keep the list of players and of sessions tidy; the service stops cleanly when asked.
mod config;
mod schedules;
mod shutdown;

use config::Config;
use queue::Queue;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = dotenvy::dotenv();
    tracing_subscriber::fmt().with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"))).init();

    let config = Config::from_env()?;
    let pool = store::connect(&config.database_url).await?;
    let _queue = Queue::new(&config.redis_url)?;
    tracing::info!("jobs running");
    tokio::select! {
        () = schedules::presence::run(pool.clone()) => {}
        () = schedules::sessions::run(pool) => {}
        () = shutdown::signal() => {}
    }
    Ok(())
}
