//! Efforts are the currency of the world and are earned by shipping. This is the part the server knows: whose work to count.
use std::time::Duration;

use serde_json::Value;

use super::text;
use crate::time::minutes;

/// How long a person's count is kept before GitHub is asked again.
pub const COUNT_KEPT_FOR: Duration = minutes(10);
/// The longest GitHub login there is.
const MAX_LOGIN: usize = 39;

/// A GitHub login: letters, digits and hyphens, at most 39. `None` when nothing usable is left.
pub fn login(value: Option<&Value>) -> Option<String> {
    Some(text::restricted(value, MAX_LOGIN, |ch| ch.is_ascii_alphanumeric() || ch == '-')).filter(|login| !login.is_empty())
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn a_login_keeps_letters_digits_and_hyphens() {
        assert_eq!(login(Some(&json!("Octo-Cat_1"))).as_deref(), Some("Octo-Cat1"));
        assert_eq!(login(Some(&json!("../etc/passwd"))).as_deref(), Some("etcpasswd"));
    }

    #[test]
    fn nothing_usable_is_no_login() {
        assert_eq!(login(None), None);
        assert_eq!(login(Some(&json!("!!!"))), None);
        assert_eq!(login(Some(&json!(""))), None);
    }

    #[test]
    fn a_login_is_cut_at_39() {
        assert_eq!(login(Some(&json!("a".repeat(80)))).map(|login| login.len()), Some(39));
    }
}
