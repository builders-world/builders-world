//! HTTP handlers, grouped by who calls them.
//!
//! - [`public`]: the game itself. Nobody signs in yet, so a player is only a name their browser chose for this visit.
pub mod public;
