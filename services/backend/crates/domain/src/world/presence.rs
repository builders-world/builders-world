//! Presence: every player reports where they are about once a second and sees everyone else nearby. A report is read
//! from whatever the browser sent into a [`Report`] that is safe to store and to show to other players. Fields that are
//! missing or wrong are dropped or zeroed, never an error, so one odd client cannot break the street for the rest.
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::district::District;
use super::text;
use crate::time::seconds;

/// Others are shown when they reported within this long.
pub const VISIBLE_FOR: Duration = seconds(12);
/// A player who has not reported for this long is forgotten.
pub const FORGOTTEN_AFTER: Duration = seconds(60);
/// The most players shown to one person.
pub const MOST_SHOWN: i64 = 60;

const MIN_ID: usize = 8;
const MAX_ID: usize = 40;
const DEFAULT_NAME: &str = "Builder";
const DEFAULT_COLOR: &str = "#e2b13c";
const DEFAULT_STYLE: &str = "jacket";
const STYLES: [&str; 4] = ["jacket", "hoodie", "tee", "classic"];
const MOST_MOVES: usize = 1_800;

// The wardrobe (the client's `look/style.js`): known values only, colours as #rrggbb.
const BODIES: [&str; 2] = ["m", "f"];
const HAIR: [&str; 12] = ["low", "fade", "afro", "locs", "braids", "cornrows", "bun", "long", "ponytail", "bald", "gele", "fila"];
const TOPS: [&str; 8] = ["jacket", "hoodie", "tee", "ankara", "adire", "kaftan", "agbada", "dress"];
const BOTTOMS: [&str; 4] = ["trousers", "shorts", "skirt", "wrapper"];
const SHOES: [&str; 5] = ["sneakers", "sandals", "boots", "heels", "loafers"];
const ACCESSORIES: [&str; 5] = ["earrings", "beads", "glasses", "bag", "watch"];
const DOGS: [&str; 5] = ["awuku", "boerboel", "gsd", "lab", "poodle"];
const CATS: [&str; 5] = ["tabby", "black", "calico", "siamese", "persian"];
/// What one player can do in a game with another, in the order of a game's life.
const GAME_ACTS: [&str; 9] = ["invite", "accept", "decline", "move", "resign", "draw", "drawok", "drawno", "leave"];

/// What a browser sends. Every field is optional and loosely typed; [`Report::read`] is what makes sense of it.
#[derive(Debug, Default, Deserialize)]
pub struct Incoming {
    id: Option<Value>,
    district: Option<Value>,
    name: Option<Value>,
    handle: Option<Value>,
    #[serde(rename = "x")]
    position_x: Option<Value>,
    #[serde(rename = "z")]
    position_z: Option<Value>,
    #[serde(rename = "y")]
    height: Option<Value>,
    yaw: Option<Value>,
    speed: Option<Value>,
    look: Option<Value>,
    say: Option<Value>,
    emote: Option<Value>,
    home: Option<Value>,
    np: Option<Value>,
    pet: Option<Value>,
    card: Option<Value>,
    knock: Option<Value>,
    answer: Option<Value>,
    play: Option<Value>,
}

/// The wardrobe look in full. Colours are `#rrggbb`; a field the client did not send or sent wrongly is left out.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FullLook {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hair: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bottom: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shoes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skin: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hair_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bottom_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shoe_color: Option<String>,
    pub acc: Vec<String>,
}

/// How a player looks to others: the simple colour and style, and the wardrobe look when they have chosen one.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Look {
    pub color: String,
    pub style: String,
    pub full: Option<FullLook>,
}

/// The public profile a player chose to share: usernames only, never links.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Card {
    pub role: String,
    #[serde(rename = "x")]
    pub x_handle: String,
    pub linkedin: String,
    pub dribbble: String,
    pub behance: String,
    pub show_socials: bool,
    pub show_commits: bool,
    pub commits: Option<u32>,
}

/// A pet that walks with its person.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Pet {
    pub kind: String,
    pub breed: String,
    pub name: String,
}

/// What a player is listening to.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NowPlaying {
    #[serde(rename = "t")]
    pub title: String,
    #[serde(rename = "a")]
    pub artist: String,
    pub id: String,
}

/// Something said aloud. `t` is when, in milliseconds, so clients show each line once.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Said {
    pub text: String,
    #[serde(rename = "t")]
    pub at: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Emote {
    #[serde(rename = "e")]
    pub emoji: String,
    #[serde(rename = "t")]
    pub at: i64,
}

/// Which kind of entrance a visit is at.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Entrance {
    Door,
    Gate,
}

/// A knock on another player's door or gate.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Knock {
    pub to: String,
    pub kind: Entrance,
    #[serde(rename = "t")]
    pub at: i64,
}

/// The answer to a knock.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Answer {
    pub to: String,
    pub kind: Entrance,
    pub ok: bool,
    #[serde(rename = "t")]
    pub at: i64,
}

/// A move in a game between two players. Only chess exists; `moves` is the game so far in long algebraic notation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Play {
    pub to: String,
    pub game: String,
    pub gid: String,
    pub act: String,
    pub moves: String,
    #[serde(rename = "t")]
    pub at: i64,
}

/// One player's report, cleaned.
#[derive(Debug, Clone, PartialEq)]
pub struct Report {
    pub id: String,
    pub district: District,
    pub name: String,
    pub handle: String,
    pub position_x: f64,
    pub position_z: f64,
    pub height: f64,
    pub yaw: f64,
    pub speed: f64,
    pub look: Look,
    pub home: String,
    pub np: Option<NowPlaying>,
    pub pet: Option<Pet>,
    pub card: Card,
    pub say: Option<Said>,
    pub emote: Option<Emote>,
    pub knock: Option<Knock>,
    pub answer: Option<Answer>,
    pub play: Option<Play>,
}

impl Report {
    /// Makes the report the signed-in person's: their handle and name come from their account, never from the browser.
    pub fn signed_in_as(mut self, handle: String, name: Option<String>) -> Self {
        self.handle = handle;
        if let Some(name) = name {
            self.name = name;
        }
        self
    }

    /// Reads a report at `now` (milliseconds). `None` when the player has no usable id: they are playing alone.
    pub fn read(incoming: &Incoming, now: i64) -> Option<Self> {
        let id = identifier(incoming.id.as_ref(), MAX_ID);
        if id.len() < MIN_ID {
            return None;
        }
        Some(Self::read_with_id(incoming, id, now))
    }

    /// Reads a report whose id has already been settled (a signed-in person's).
    pub fn read_known(incoming: &Incoming, id: String, now: i64) -> Self {
        Self::read_with_id(incoming, id, now)
    }

    fn read_with_id(incoming: &Incoming, id: String, now: i64) -> Self {
        let name = text::clean(incoming.name.as_ref(), 24);
        let say = text::clean(incoming.say.as_ref(), 140);
        let emote = text::clean(incoming.emote.as_ref(), 8);
        Self {
            id,
            district: District::parse(incoming.district.as_ref()),
            name: if name.is_empty() { DEFAULT_NAME.to_owned() } else { name },
            handle: text::restricted(incoming.handle.as_ref(), 39, |ch| ch.is_ascii_alphanumeric() || ch == '-'),
            position_x: text::number(incoming.position_x.as_ref(), 2_000.0),
            position_z: text::number(incoming.position_z.as_ref(), 2_000.0),
            height: text::number(incoming.height.as_ref(), 50.0),
            yaw: text::number(incoming.yaw.as_ref(), 10.0),
            speed: text::number(incoming.speed.as_ref(), 20.0),
            look: look(incoming.look.as_ref()),
            home: text::clean(incoming.home.as_ref(), 80),
            np: now_playing(incoming.np.as_ref()),
            pet: pet(incoming.pet.as_ref()),
            card: shared(card(incoming.card.as_ref())),
            say: (!say.is_empty()).then_some(Said { text: say, at: now }),
            emote: (!emote.is_empty()).then_some(Emote { emoji: emote, at: now }),
            knock: knock(incoming.knock.as_ref(), now),
            answer: answer(incoming.answer.as_ref(), now),
            play: play(incoming.play.as_ref(), now),
        }
    }
}

fn field<'a>(value: Option<&'a Value>, name: &str) -> Option<&'a Value> {
    value.and_then(|value| value.get(name))
}

/// Letters, digits, underscores and hyphens: what a player or game id is made of.
fn identifier(value: Option<&Value>, max: usize) -> String {
    text::restricted(value, max, |ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
}

/// A username on another site: letters, digits, dots, underscores and hyphens.
fn username(value: Option<&Value>) -> String {
    text::restricted(value, 40, |ch| ch.is_ascii_alphanumeric() || matches!(ch, '_' | '.' | '-'))
}

fn colour(value: Option<&Value>) -> Option<String> {
    let text = match value {
        Some(Value::String(text)) => text,
        _ => return None,
    };
    let digits = text.strip_prefix('#')?;
    (digits.len() == 6 && digits.chars().all(|ch| ch.is_ascii_hexdigit())).then(|| text.clone())
}

fn one_of(value: Option<&Value>, allowed: &[&str]) -> Option<String> {
    match value {
        Some(Value::String(text)) if allowed.contains(&text.as_str()) => Some(text.clone()),
        _ => None,
    }
}

pub(super) fn full_look(value: Option<&Value>) -> Option<FullLook> {
    let source = value.filter(|value| value.is_object())?;
    let mut acc: Vec<String> = Vec::new();
    for item in source.get("acc").and_then(Value::as_array).into_iter().flatten() {
        if let Some(accessory) = one_of(Some(item), &ACCESSORIES) {
            if !acc.contains(&accessory) {
                acc.push(accessory);
            }
        }
    }
    acc.truncate(ACCESSORIES.len());
    Some(FullLook {
        body: one_of(source.get("body"), &BODIES),
        hair: one_of(source.get("hair"), &HAIR),
        top: one_of(source.get("top"), &TOPS),
        bottom: one_of(source.get("bottom"), &BOTTOMS),
        shoes: one_of(source.get("shoes"), &SHOES),
        skin: colour(source.get("skin")),
        hair_color: colour(source.get("hairColor")),
        top_color: colour(source.get("topColor")),
        bottom_color: colour(source.get("bottomColor")),
        shoe_color: colour(source.get("shoeColor")),
        acc,
    })
}

fn look(value: Option<&Value>) -> Look {
    Look {
        color: colour(field(value, "color")).unwrap_or_else(|| DEFAULT_COLOR.to_owned()),
        style: one_of(field(value, "style"), &STYLES).unwrap_or_else(|| DEFAULT_STYLE.to_owned()),
        full: full_look(field(value, "full")),
    }
}

pub(super) fn card(value: Option<&Value>) -> Card {
    let shows = |name: &str| field(value, name) == Some(&Value::Bool(true));
    let show_commits = shows("showCommits");
    let commits = show_commits.then(|| text::number(field(value, "commits"), 100_000.0).round().max(0.0) as u32);
    Card {
        role: text::clean(field(value, "role"), 40),
        x_handle: username(field(value, "x")),
        linkedin: username(field(value, "linkedin")),
        dribbble: username(field(value, "dribbble")),
        behance: username(field(value, "behance")),
        show_socials: shows("showSocials"),
        show_commits,
        commits,
    }
}

/// What other players see of a card. The usernames go out only when the player switched their socials on, whatever the browser
/// sent. Only presence blanks them: the saved profile is private to its owner and keeps them for the next time the switch is on.
fn shared(card: Card) -> Card {
    if card.show_socials {
        return card;
    }
    Card { x_handle: String::new(), linkedin: String::new(), dribbble: String::new(), behance: String::new(), ..card }
}

pub(super) fn pet(value: Option<&Value>) -> Option<Pet> {
    let kind = one_of(field(value, "kind"), &["dog", "cat"])?;
    let breeds = if kind == "dog" { &DOGS } else { &CATS };
    let breed = one_of(field(value, "breed"), breeds)?;
    Some(Pet { kind, breed, name: text::clean(field(value, "name"), 16) })
}

fn now_playing(value: Option<&Value>) -> Option<NowPlaying> {
    value.filter(|value| value.is_object())?;
    let id = text::clean(field(value, "id"), usize::MAX);
    let track = if id.len() == 22 && id.chars().all(|ch| ch.is_ascii_alphanumeric()) { id } else { String::new() };
    Some(NowPlaying { title: text::clean(field(value, "t"), 80), artist: text::clean(field(value, "a"), 60), id: track })
}

/// Who a knock, answer or move is for: a player id, so at least as long as one.
fn recipient(value: Option<&Value>) -> Option<String> {
    Some(identifier(value, MAX_ID)).filter(|id| id.len() >= MIN_ID)
}

fn entrance(value: Option<&Value>) -> Entrance {
    if field(value, "kind").and_then(Value::as_str) == Some("gate") {
        Entrance::Gate
    } else {
        Entrance::Door
    }
}

fn knock(value: Option<&Value>, now: i64) -> Option<Knock> {
    Some(Knock { to: recipient(field(value, "to"))?, kind: entrance(value), at: now })
}

fn answer(value: Option<&Value>, now: i64) -> Option<Answer> {
    Some(Answer { to: recipient(field(value, "to"))?, kind: entrance(value), ok: field(value, "ok") == Some(&Value::Bool(true)), at: now })
}

/// A game so far: chess moves such as `e2e4 e7e5 g1f3`, each a square, a square and perhaps a promotion piece.
fn moves_are_valid(moves: &str) -> bool {
    let mut parts = moves.split(' ').peekable();
    if moves.is_empty() {
        return true;
    }
    while let Some(part) = parts.next() {
        let last = parts.peek().is_none();
        if part.is_empty() {
            // Only one trailing space is allowed, after at least one move.
            if !(last && moves.len() > 1) {
                return false;
            }
            continue;
        }
        let bytes = part.as_bytes();
        let square = |file: u8, rank: u8| (b'a'..=b'h').contains(&file) && (b'1'..=b'8').contains(&rank);
        let shaped = match bytes {
            [from_file, from_rank, to_file, to_rank] => square(*from_file, *from_rank) && square(*to_file, *to_rank),
            [from_file, from_rank, to_file, to_rank, piece] => square(*from_file, *from_rank) && square(*to_file, *to_rank) && b"qrbn".contains(piece),
            _ => false,
        };
        if !shaped {
            return false;
        }
    }
    true
}

fn play(value: Option<&Value>, now: i64) -> Option<Play> {
    let to = recipient(field(value, "to"))?;
    if field(value, "game").and_then(Value::as_str) != Some("chess") {
        return None;
    }
    let act = one_of(field(value, "act"), &GAME_ACTS)?;
    let gid = field(value, "gid")
        .and_then(Value::as_str)
        .filter(|gid| (6..=16).contains(&gid.len()) && gid.chars().all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit()))?;
    let moves = field(value, "moves")
        .and_then(Value::as_str)
        .filter(|moves| moves_are_valid(moves))
        .map(|moves| moves.chars().take(MOST_MOVES).collect::<String>())
        .unwrap_or_default();
    Some(Play { to, game: "chess".to_owned(), gid: gid.to_owned(), act, moves, at: now })
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    const NOW: i64 = 1_760_000_000_000;

    fn read(body: Value) -> Option<Report> {
        Report::read(&serde_json::from_value(body).unwrap(), NOW)
    }

    fn report(body: Value) -> Report {
        read(body).expect("a usable id")
    }

    #[test]
    fn a_player_without_a_usable_id_plays_alone() {
        assert!(read(json!({})).is_none());
        assert!(read(json!({ "id": "short" })).is_none());
        assert!(read(json!({ "id": "<<<>>>!!!" })).is_none());
    }

    #[test]
    fn the_smallest_report_gets_the_defaults() {
        let report = report(json!({ "id": "player-0001" }));
        assert_eq!(report.name, "Builder");
        assert_eq!(report.district.as_str(), "yaba");
        assert_eq!((report.look.color.as_str(), report.look.style.as_str()), ("#e2b13c", "jacket"));
        assert_eq!(report.look.full, None);
        assert_eq!((report.say, report.emote, report.knock, report.answer, report.play, report.np, report.pet), (None, None, None, None, None, None, None));
        assert!(!report.card.show_commits && report.card.commits.is_none());
    }

    #[test]
    fn positions_are_kept_inside_the_world() {
        let report = report(json!({ "id": "player-0001", "x": 99999, "z": "-5000", "y": 7, "yaw": "x", "speed": 100 }));
        assert_eq!((report.position_x, report.position_z, report.height, report.yaw, report.speed), (2_000.0, -2_000.0, 7.0, 0.0, 20.0));
    }

    #[test]
    fn what_is_said_is_plain_text_with_the_time_it_was_said() {
        let report = report(json!({ "id": "player-0001", "say": " <script>hi</script> ", "emote": "wave" }));
        assert_eq!(report.say, Some(Said { text: "scripthi/script".into(), at: NOW }));
        assert_eq!(report.emote, Some(Emote { emoji: "wave".into(), at: NOW }));
    }

    #[test]
    fn the_wardrobe_keeps_only_what_it_knows() {
        let report = report(json!({ "id": "player-0001", "look": {
            "color": "#12ab34", "style": "hoodie",
            "full": { "body": "f", "hair": "afro", "top": "spaceship", "skin": "#FFFFFF", "hairColor": "red", "acc": ["glasses", "glasses", "crown", "bag"] }
        } }));
        assert_eq!((report.look.color.as_str(), report.look.style.as_str()), ("#12ab34", "hoodie"));
        let full = report.look.full.expect("a full look");
        assert_eq!((full.body.as_deref(), full.hair.as_deref(), full.top.as_deref()), (Some("f"), Some("afro"), None));
        assert_eq!((full.skin.as_deref(), full.hair_color.as_deref()), (Some("#FFFFFF"), None));
        assert_eq!(full.acc, ["glasses", "bag"]);
    }

    #[test]
    fn a_bad_colour_or_style_falls_back() {
        let report = report(json!({ "id": "player-0001", "look": { "color": "gold", "style": "tuxedo", "full": "no" } }));
        assert_eq!((report.look.color.as_str(), report.look.style.as_str(), report.look.full), ("#e2b13c", "jacket", None));
    }

    #[test]
    fn the_shared_card_shows_commits_only_when_asked() {
        let hidden = report(json!({ "id": "player-0001", "card": { "role": "Dev", "commits": 50, "showCommits": false } }));
        assert_eq!(hidden.card.commits, None);
        let shown = report(json!({ "id": "player-0001", "card": { "showCommits": true, "commits": 9_999_999, "showSocials": true, "x": "a b/c" } }));
        assert_eq!((shown.card.commits, shown.card.show_socials, shown.card.x_handle.as_str()), (Some(100_000), true, "abc"));
    }

    #[test]
    fn the_shared_card_shows_socials_only_when_asked() {
        let socials = json!({ "role": "Dev", "x": "ada", "linkedin": "ada-l", "dribbble": "ada_d", "behance": "ada.b" });
        let handles = |card: &Card| [card.x_handle.clone(), card.linkedin.clone(), card.dribbble.clone(), card.behance.clone()];
        for switch in [Some(json!(false)), Some(json!("true")), Some(json!(1)), Some(Value::Null), None] {
            let mut sent = socials.clone();
            if let Some(switch) = switch {
                sent["showSocials"] = switch;
            }
            let hidden = report(json!({ "id": "player-0001", "card": sent }));
            assert_eq!(handles(&hidden.card), ["", "", "", ""]);
            assert_eq!((hidden.card.show_socials, hidden.card.role.as_str()), (false, "Dev"));
        }
        let mut sent = socials;
        sent["showSocials"] = json!(true);
        let shown = report(json!({ "id": "player-0001", "card": sent }));
        assert_eq!(handles(&shown.card), ["ada", "ada-l", "ada_d", "ada.b"]);
    }

    #[test]
    fn a_pet_must_be_a_known_breed() {
        assert_eq!(
            report(json!({ "id": "player-0001", "pet": { "kind": "dog", "breed": "awuku", "name": "Rex" } })).pet.map(|pet| pet.breed),
            Some("awuku".into())
        );
        assert_eq!(report(json!({ "id": "player-0001", "pet": { "kind": "dog", "breed": "tabby" } })).pet, None);
        assert_eq!(report(json!({ "id": "player-0001", "pet": { "kind": "dragon", "breed": "x" } })).pet, None);
    }

    #[test]
    fn a_track_id_is_kept_only_when_it_looks_like_one() {
        let good = report(json!({ "id": "player-0001", "np": { "t": "Song", "a": "Artist", "id": "4uLU6hMCjMI75M1A2tKUQC" } }));
        assert_eq!(good.np.map(|np| np.id), Some("4uLU6hMCjMI75M1A2tKUQC".into()));
        let odd = report(json!({ "id": "player-0001", "np": { "t": "Song", "id": "nope" } }));
        assert_eq!(odd.np.map(|np| np.id), Some(String::new()));
    }

    #[test]
    fn a_knock_needs_someone_to_knock_on() {
        let report = report(json!({ "id": "player-0001", "knock": { "to": "player-0002", "kind": "gate" }, "answer": { "to": "player-0002", "ok": true } }));
        assert_eq!(report.knock, Some(Knock { to: "player-0002".into(), kind: Entrance::Gate, at: NOW }));
        assert_eq!(report.answer, Some(Answer { to: "player-0002".into(), kind: Entrance::Door, ok: true, at: NOW }));
        assert!(self::report(json!({ "id": "player-0001", "knock": { "to": "short" } })).knock.is_none());
    }

    #[test]
    fn a_chess_move_must_be_a_list_of_moves() {
        let play = |moves: &str| {
            report(json!({ "id": "player-0001", "play": { "to": "player-0002", "game": "chess", "gid": "abc123", "act": "move", "moves": moves } })).play
        };
        assert_eq!(play("e2e4 e7e5 g1f3").map(|play| play.moves), Some("e2e4 e7e5 g1f3".into()));
        assert_eq!(play("e7e8q ").map(|play| play.moves), Some("e7e8q ".into()));
        assert_eq!(play("").map(|play| play.moves), Some(String::new()));
        // A list with anything else in it is dropped, but the action still goes through.
        for bad in ["e2e4  e7e5", " ", "e2e9", "e2e4 hello", "i2e4", "e7e8k"] {
            assert_eq!(play(bad).map(|play| play.moves), Some(String::new()), "{bad:?}");
        }
    }

    #[test]
    fn only_chess_with_a_real_game_id_and_action_is_passed_on() {
        let with = |game: Value| report(json!({ "id": "player-0001", "play": game })).play;
        let base = json!({ "to": "player-0002", "game": "chess", "gid": "abc123", "act": "invite" });
        assert!(with(base.clone()).is_some());
        for (key, value) in [("game", json!("checkers")), ("gid", json!("ABC")), ("gid", json!("ab")), ("act", json!("cheat")), ("to", json!("x"))] {
            let mut game = base.clone();
            game[key] = value;
            assert!(with(game).is_none(), "{key}");
        }
    }

    #[test]
    fn a_report_survives_being_stored() {
        let report = report(json!({ "id": "player-0001", "look": { "full": { "hair": "afro", "acc": ["bag"] } } }));
        let stored = serde_json::to_value(&report.look).unwrap();
        assert_eq!(stored, json!({ "color": "#e2b13c", "style": "jacket", "full": { "hair": "afro", "acc": ["bag"] } }));
        assert_eq!(serde_json::from_value::<Look>(stored).unwrap(), report.look);
    }
}
