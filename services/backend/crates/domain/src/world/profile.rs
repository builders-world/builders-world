//! A person's profile: what they chose at arrivals and in the wardrobe, kept with their account so it follows them to any device.
//! Read from whatever the browser sends, like a presence report: anything unknown is dropped, never an error.
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::presence::{card, full_look, pet, Card, FullLook, Pet};
use super::text;

const ROLES: [&str; 2] = ["developer", "designer"];
const CITIES: [&str; 4] = ["Lagos", "Abuja", "Uyo", "Port Harcourt"];
const AVATAR_STYLES: [&str; 4] = ["classic", "jacket", "hoodie", "tee"];
const DEFAULT_COLOR: &str = "#e3ad64";

/// The colour and cut chosen at arrivals.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Avatar {
    pub color: String,
    pub style: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Profile {
    pub name: String,
    pub role: String,
    pub city: String,
    pub district: String,
    pub avatar: Avatar,
    pub look: Option<FullLook>,
    pub pet: Option<Pet>,
    pub card: Card,
}

impl Profile {
    pub fn read(value: &Value) -> Self {
        let pick = |name: &str, allowed: &[&str]| value.get(name).and_then(Value::as_str).filter(|text| allowed.contains(text)).map(str::to_owned);
        let avatar = value.get("avatar");
        let color = avatar
            .and_then(|avatar| avatar.get("color"))
            .and_then(Value::as_str)
            .filter(|color| color.len() == 7 && color.starts_with('#') && color[1..].chars().all(|ch| ch.is_ascii_hexdigit()))
            .unwrap_or(DEFAULT_COLOR)
            .to_owned();
        let style =
            avatar.and_then(|avatar| avatar.get("style")).and_then(Value::as_str).filter(|style| AVATAR_STYLES.contains(style)).unwrap_or("classic").to_owned();
        Self {
            name: text::clean(value.get("name"), 32),
            role: pick("role", &ROLES).unwrap_or_default(),
            city: pick("city", &CITIES).unwrap_or_default(),
            district: text::clean(value.get("district"), 40),
            avatar: Avatar { color, style },
            look: full_look(value.get("look")),
            pet: pet(value.get("pet")),
            card: card(value.get("card")),
        }
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn a_profile_keeps_only_what_it_knows() {
        let profile = Profile::read(&json!({
            "name": "  <b>Ada</b> ", "role": "wizard", "city": "Lagos", "district": "Yaba",
            "avatar": { "color": "#577e73", "style": "hoodie" },
            "look": { "hair": "afro", "top": "spaceship" }, "pet": { "kind": "cat", "breed": "tabby", "name": "Mimi" },
            "card": { "role": "Dev", "showCommits": true, "commits": 12 }
        }));
        assert_eq!((profile.name.as_str(), profile.role.as_str(), profile.city.as_str()), ("bAda/b", "", "Lagos"));
        assert_eq!((profile.avatar.color.as_str(), profile.avatar.style.as_str()), ("#577e73", "hoodie"));
        assert_eq!(profile.look.map(|look| (look.hair, look.top)), Some((Some("afro".into()), None)));
        assert_eq!(profile.pet.map(|pet| pet.name), Some("Mimi".into()));
        assert_eq!(profile.card.commits, Some(12));
    }

    #[test]
    fn nothing_at_all_is_a_blank_profile_with_the_default_look() {
        let profile = Profile::read(&json!(null));
        assert_eq!(
            (profile.name.as_str(), profile.city.as_str(), profile.avatar.color.as_str(), profile.avatar.style.as_str()),
            ("", "", "#e3ad64", "classic")
        );
        assert!(profile.look.is_none() && profile.pet.is_none());
    }

    #[test]
    fn a_profile_survives_being_stored() {
        let profile = Profile::read(&json!({ "name": "Ada", "role": "designer", "city": "Abuja", "look": { "acc": ["bag"] } }));
        assert_eq!(serde_json::from_value::<Profile>(serde_json::to_value(&profile).unwrap()).unwrap(), profile);
    }
}
