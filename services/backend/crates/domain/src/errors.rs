use thiserror::Error;

#[derive(Error, Debug)]
pub enum DomainError {
    #[error("not found: {0}")]
    NotFound(String),
    #[error("unauthorized: {0}")]
    Unauthorized(String),
    #[error("database error: {0}")]
    Database(String),
    #[error("upstream service error: {0}")]
    Upstream(String),
}
