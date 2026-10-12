use std::sync::Arc;

use gateway::build_router;
use gateway::config::Config;
use gateway::state::AppState;
use integrations::github::oauth::{GithubOAuth, SignIn};
use integrations::github::GithubClient;
use queue::Queue;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = dotenvy::dotenv();
    tracing_subscriber::fmt().with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"))).init();

    let config = Config::from_env()?;
    let listener = tokio::net::TcpListener::bind(&config.bind_addr).await?;
    tracing::info!(addr = %config.bind_addr, "gateway listening");
    let pool = store::connect(&config.database_url).await?;
    store::migrate(&pool).await?;
    let queue = Queue::new(&config.redis_url)?;
    let contributions = Arc::new(GithubClient::new(config.github_token.clone()));
    if config.github_token.is_none() {
        tracing::info!("GITHUB_TOKEN is not set: efforts are counted from the public contribution calendar");
    }
    let sign_in = match (&config.github_client_id, &config.github_client_secret, config.github_callback()) {
        (Some(id), Some(secret), Some(callback)) => {
            tracing::info!(%callback, "sign in with GitHub is on");
            Some(Arc::new(GithubOAuth::new(id.clone(), secret.clone(), callback)) as Arc<dyn SignIn>)
        }
        _ => {
            tracing::warn!("sign in with GitHub is off (set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET and PUBLIC_URL): the game is played solo");
            None
        }
    };
    let state = AppState { config: Arc::new(config), pool, queue, contributions, sign_in };
    axum::serve(listener, build_router(state)).with_graceful_shutdown(gateway::shutdown::signal()).await?;
    Ok(())
}
