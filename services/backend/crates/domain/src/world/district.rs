//! A district is a named part of the world; players and street bins belong to one.
use std::fmt;

use serde_json::Value;

use super::text;

/// The district a request means when it names none.
pub const DEFAULT: &str = "yaba";
const MAX_LENGTH: usize = 40;

/// A district's name: lower-case letters, digits and hyphens, at most 40 characters. The text is stored with every
/// player and bin, so the same input must always give the same name.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct District(String);

impl District {
    pub fn parse(value: Option<&Value>) -> Self {
        let name = text::restricted(value, MAX_LENGTH, |ch| ch.is_ascii_alphanumeric() || ch == '-').to_ascii_lowercase();
        Self(if name.is_empty() { DEFAULT.to_owned() } else { name })
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for District {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn a_district_is_lower_case_and_plain() {
        assert_eq!(District::parse(Some(&json!("Yaba"))).as_str(), "yaba");
        assert_eq!(District::parse(Some(&json!("Lekki Phase-1!"))).as_str(), "lekkiphase-1");
    }

    #[test]
    fn no_district_means_yaba() {
        assert_eq!(District::parse(None).as_str(), "yaba");
        assert_eq!(District::parse(Some(&json!("  "))).as_str(), "yaba");
        assert_eq!(District::parse(Some(&json!("!!!"))).as_str(), "yaba");
    }

    #[test]
    fn a_long_district_is_cut() {
        assert_eq!(District::parse(Some(&json!("a".repeat(100)))).as_str().len(), 40);
    }
}
