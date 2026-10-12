//! Work that runs on a timer. Each pass is safe to repeat and to run in two instances at once, so none needs a lock.
pub mod presence;
pub mod sessions;
