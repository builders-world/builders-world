//! A bearer token: 64 hexadecimal characters made from two random UUIDs (244 bits), shown to the browser once and never stored.
use sha2::{Digest, Sha256};
use uuid::Uuid;

/// Length of a token as the browser holds it.
pub const LENGTH: usize = 64;

pub fn generate() -> String {
    format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}

/// What is stored instead of the token.
pub fn hash(token: &str) -> String {
    hex::encode(Sha256::digest(token.as_bytes()))
}

/// Whether text could be a token, so anything else is refused without touching the database.
pub fn looks_valid(text: &str) -> bool {
    text.len() == LENGTH && text.chars().all(|ch| ch.is_ascii_hexdigit())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_token_is_long_random_hex_and_stored_only_as_a_hash() {
        let (first, second) = (generate(), generate());
        assert!(looks_valid(&first) && looks_valid(&second));
        assert_ne!(first, second);
        assert_ne!(hash(&first), first);
        assert_eq!(hash(&first), hash(&first));
        assert_eq!(hash("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    #[test]
    fn what_is_not_a_token_is_refused_early() {
        for bad in ["", "short", &"g".repeat(64), &"a".repeat(63), &"a".repeat(65)] {
            assert!(!looks_valid(bad), "{bad:?}");
        }
    }
}
