//! How a failed call to a provider becomes a [`DomainError`].
use domain::errors::DomainError;

/// The provider could not be reached or answered with something we cannot use.
pub fn upstream(provider: &str, error: impl std::fmt::Display) -> DomainError {
    DomainError::Upstream(format!("{provider}: {error}"))
}
