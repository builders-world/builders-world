//! Cleaning text that arrives from a browser. Everything a client sends is shown to other players as plain text only.
use serde_json::Value;

/// A value as the text the client meant: strings as they are, numbers and booleans written out, anything else empty.
pub fn loose(value: Option<&Value>) -> String {
    match value {
        Some(Value::String(text)) => text.clone(),
        Some(Value::Number(number)) => number.to_string(),
        Some(Value::Bool(flag)) => flag.to_string(),
        _ => String::new(),
    }
}

/// Plain text of at most `max` characters: control characters and angle brackets removed, edges trimmed.
pub fn clean(value: Option<&Value>, max: usize) -> String {
    let raw = loose(value);
    let kept: String = raw.chars().filter(|ch| !ch.is_control() && *ch != '<' && *ch != '>').collect();
    kept.trim().chars().take(max).collect()
}

/// Like [`clean`], keeping only the characters `allowed` accepts.
pub fn restricted(value: Option<&Value>, max: usize, allowed: impl Fn(char) -> bool) -> String {
    clean(value, max).chars().filter(|ch| allowed(*ch)).collect()
}

/// A number within `-limit..=limit`; anything that is not a finite number is zero.
pub fn number(value: Option<&Value>, limit: f64) -> f64 {
    let parsed = match value {
        Some(Value::Number(number)) => number.as_f64(),
        Some(Value::String(text)) if text.trim().is_empty() => Some(0.0),
        Some(Value::String(text)) => text.trim().parse::<f64>().ok(),
        Some(Value::Bool(flag)) => Some(f64::from(u8::from(*flag))),
        _ => None,
    };
    parsed.filter(|number| number.is_finite()).map_or(0.0, |number| number.clamp(-limit, limit))
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn markup_and_control_characters_never_reach_other_players() {
        assert_eq!(clean(Some(&json!("  <b>hi</b>\u{0007} there ")), 40), "bhi/b there");
    }

    #[test]
    fn text_is_cut_to_length_after_cleaning() {
        assert_eq!(clean(Some(&json!("abcdef")), 3), "abc");
        assert_eq!(clean(Some(&json!("ààààà")), 2), "àà");
    }

    #[test]
    fn what_is_not_text_is_empty() {
        assert_eq!(clean(Some(&json!({ "a": 1 })), 10), "");
        assert_eq!(clean(None, 10), "");
        assert_eq!(clean(Some(&json!(12)), 10), "12");
    }

    #[test]
    fn numbers_are_clamped_and_junk_is_zero() {
        assert_eq!(number(Some(&json!(5000)), 2000.0), 2000.0);
        assert_eq!(number(Some(&json!(-5000.5)), 2000.0), -2000.0);
        assert_eq!(number(Some(&json!("12.5")), 2000.0), 12.5);
        assert_eq!(number(Some(&json!("nope")), 2000.0), 0.0);
        assert_eq!(number(Some(&json!(null)), 2000.0), 0.0);
        assert_eq!(number(None, 2000.0), 0.0);
    }
}
