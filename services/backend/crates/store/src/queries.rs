//! Every SQL statement, one module per area. A module imports its own with `use crate::queries::players as queries;`.
pub mod accounts;
pub mod bins;
pub mod players;
pub mod profiles;
pub mod sessions;
