//! Street bins are shared world state: a bin one player funds is there for everyone. The client charges the player's
//! wallet; the server only records how much has been given, capped at the bin's price.
use serde_json::Value;

use super::text;

/// What one contribution adds, in Efforts.
pub const STEP: i32 = 1_000;
/// A bin's price: funding stops here.
pub const PRICE: i32 = 3_000;
/// Who gave, when nobody said.
pub const ANONYMOUS: &str = "A builder";
const MAX_NAME: usize = 24;
const MAX_SPOT: usize = 24;

/// Where a bin stands: two whole grid coordinates joined by an underscore, such as `12_-40`. The text is stored, so the
/// format is live data.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Spot(String);

impl Spot {
    pub fn parse(value: Option<&Value>) -> Option<Self> {
        let text = text::restricted(value, MAX_SPOT, |ch| ch.is_ascii_digit() || ch == '_' || ch == '-');
        let (east, north) = text.split_once('_')?;
        (whole(east) && whole(north)).then_some(Self(text))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// A whole number, possibly negative: digits with at most one minus sign in front.
fn whole(part: &str) -> bool {
    let digits = part.strip_prefix('-').unwrap_or(part);
    !digits.is_empty() && digits.chars().all(|ch| ch.is_ascii_digit())
}

/// The name shown beside a gift.
pub fn giver(value: Option<&Value>) -> String {
    let name = text::clean(value, MAX_NAME);
    if name.is_empty() {
        ANONYMOUS.to_owned()
    } else {
        name
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn spot(text: &str) -> Option<String> {
        Spot::parse(Some(&json!(text))).map(|spot| spot.as_str().to_owned())
    }

    #[test]
    fn a_spot_is_two_whole_numbers() {
        assert_eq!(spot("12_-40").as_deref(), Some("12_-40"));
        assert_eq!(spot("-3_0").as_deref(), Some("-3_0"));
    }

    #[test]
    fn anything_else_is_not_a_spot() {
        for bad in ["", "12", "12_", "_12", "1_2_3", "--1_2", "1-2_3", "a_b", "-_2"] {
            assert_eq!(spot(bad), None, "{bad:?}");
        }
        assert_eq!(Spot::parse(None), None);
    }

    #[test]
    fn characters_that_cannot_be_in_a_spot_are_dropped_before_it_is_checked() {
        assert_eq!(spot("1.5_2").as_deref(), Some("15_2"));
        assert_eq!(spot("<12>_3").as_deref(), Some("12_3"));
    }

    #[test]
    fn a_giver_without_a_name_is_a_builder() {
        assert_eq!(giver(None), "A builder");
        assert_eq!(giver(Some(&json!("  <i>Ada</i> "))), "iAda/i");
    }

    #[test]
    fn a_bin_takes_three_gifts() {
        assert_eq!(PRICE / STEP, 3);
    }
}
