//! GitHub: how much a person has shipped. Efforts are earned by shipping, so this is where the wallet's income comes from.
pub mod client;
pub mod oauth;
pub mod payloads;

use async_trait::async_trait;
use domain::errors::DomainError;

pub use client::GithubClient;

/// What GitHub says about one person's last year of work.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tally {
    /// Commit contributions, counted exactly (needs a token).
    Commits(u32),
    /// Everything their public contribution calendar shows: commits, pull requests and issues.
    Contributions(u32),
    /// There is no such person.
    NoSuchUser,
}

#[async_trait]
pub trait Contributions: Send + Sync {
    /// How much `user` shipped over the last year. `user` is a GitHub login, already checked by the caller.
    async fn tally(&self, user: &str) -> Result<Tally, DomainError>;
}
