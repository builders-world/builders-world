//! The one place outbound HTTP clients are built, so a timeout, retries or metrics are added once for every provider.
use std::time::Duration;

/// A client that gives up on a request after `timeout`.
pub fn client(timeout: Duration) -> reqwest::Client {
    reqwest::Client::builder().timeout(timeout).build().expect("reqwest client builds")
}
