//! The outside world: clients for other companies' services, each behind a trait so tests use a fake and never leave the machine.
pub mod errors;
pub mod github;
pub mod http_client;
