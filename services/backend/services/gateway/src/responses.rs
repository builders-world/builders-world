//! Shapes shared by more than one handler group: how every refusal looks and the acknowledgements. Each handler group
//! keeps its own in `responses.rs` beside it; together they are the contract with clients, pinned by the snapshots in
//! `tests/snapshots`.
use domain::error_code::ErrorCode;
use serde::Serialize;

/// `{ "error": code }`: what a refusal looks like on the wire.
#[derive(Debug, Serialize)]
pub struct Refusal {
    pub error: ErrorCode,
}

/// `{ "error": message }`: an error from an internal service, with its message.
#[derive(Debug, Serialize)]
pub struct ErrorBody<'a> {
    pub error: &'a str,
}

/// `{ "ok": true }`: done, with nothing more to say.
#[derive(Debug, Serialize)]
pub struct Done {
    ok: bool,
}

impl Done {
    pub const fn new() -> Self {
        Self { ok: true }
    }
}

impl Default for Done {
    fn default() -> Self {
        Self::new()
    }
}
