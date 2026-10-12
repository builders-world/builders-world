//! Waiting for the platform to ask a service to stop.

/// Resolves on Ctrl-C or SIGTERM, so a service can finish what it is doing and exit.
pub async fn signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let terminate = async {
        if let Ok(mut sigterm) = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            sigterm.recv().await;
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
    tracing::info!("shutdown signal received");
}
