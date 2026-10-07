use std::sync::Arc;

use gateway::build_router;
use gateway::config::Config;
use gateway::state::AppState;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = dotenvy::dotenv();
    tracing_subscriber::fmt().with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"))).init();

    let config = Config::from_env()?;
    let listener = tokio::net::TcpListener::bind(&config.bind_addr).await?;
    tracing::info!(addr = %config.bind_addr, "gateway listening");
    let state = AppState { config: Arc::new(config) };
    axum::serve(listener, build_router(state)).with_graceful_shutdown(gateway::shutdown::signal()).await?;
    Ok(())
}
