//! Readable durations: `minutes(30)` instead of `30 * 60`.
use std::time::Duration;

pub const fn milliseconds(count: u64) -> Duration {
    Duration::from_millis(count)
}

pub const fn seconds(count: u64) -> Duration {
    Duration::from_secs(count)
}

pub const fn minutes(count: u64) -> Duration {
    Duration::from_secs(count * 60)
}

pub const fn hours(count: u64) -> Duration {
    Duration::from_secs(count * 60 * 60)
}

pub const fn days(count: u64) -> Duration {
    Duration::from_secs(count * 24 * 60 * 60)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn units_add_up() {
        assert_eq!(minutes(30), Duration::from_secs(1_800));
        assert_eq!(hours(1), minutes(60));
        assert_eq!(days(1), hours(24));
        assert_eq!(seconds(90), Duration::from_secs(90));
        assert_eq!(milliseconds(1_500), Duration::from_millis(1_500));
    }
}
