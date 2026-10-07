use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use domain::errors::DomainError;

use crate::responses::ErrorBody;

/// Maps domain errors to HTTP responses. Internal details are logged, not leaked.
pub struct ApiError(pub DomainError);

impl From<DomainError> for ApiError {
    fn from(err: DomainError) -> Self {
        Self(err)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match &self.0 {
            DomainError::NotFound(_) => (StatusCode::NOT_FOUND, self.0.to_string()),
            DomainError::Unauthorized(_) => (StatusCode::UNAUTHORIZED, self.0.to_string()),
            DomainError::Database(_) | DomainError::Upstream(_) => {
                tracing::error!(error = %self.0, "request failed");
                let status = if matches!(self.0, DomainError::Upstream(_)) { StatusCode::BAD_GATEWAY } else { StatusCode::INTERNAL_SERVER_ERROR };
                (status, "internal error".to_owned())
            }
        };
        (status, Json(ErrorBody { error: &message })).into_response()
    }
}
