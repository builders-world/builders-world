//! What the public endpoints answer. A field name here is the JSON key the game reads, so renaming one is a breaking change; the
//! snapshots in `tests/snapshots` pin them.
use domain::world::presence::{Answer, Card, Emote, Knock, Look, NowPlaying, Pet, Play, Said};
use domain::world::profile::Profile;
use integrations::github::Tally;
use serde::{Deserialize, Serialize};
use store::queries::bins::Bin;
use store::queries::players::Visitor;

fn is_false(flag: &bool) -> bool {
    !flag
}

/// Everyone else nearby. `offline` means the world could not be reached: the game carries on alone, without an error.
#[derive(Debug, Serialize)]
pub struct Presence {
    #[serde(skip_serializing_if = "is_false")]
    pub offline: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub you: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub online: Option<usize>,
    pub players: Vec<PlayerView>,
}

impl Presence {
    pub fn alone() -> Self {
        Self { offline: true, you: None, online: None, players: Vec::new() }
    }

    pub fn nearby(you: String, players: Vec<PlayerView>) -> Self {
        Self { offline: false, you: Some(you), online: Some(players.len() + 1), players }
    }
}

/// One other player.
#[derive(Debug, Serialize)]
pub struct PlayerView {
    pub id: String,
    pub name: String,
    pub handle: String,
    #[serde(rename = "x")]
    pub position_x: f64,
    #[serde(rename = "z")]
    pub position_z: f64,
    #[serde(rename = "y")]
    pub height: f64,
    pub yaw: f64,
    pub speed: f64,
    pub look: Look,
    pub home: String,
    pub np: Option<NowPlaying>,
    pub pet: Option<Pet>,
    pub card: Card,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub say: Option<Said>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emote: Option<Emote>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub knock: Option<Knock>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub answer: Option<Answer>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub play: Option<Play>,
    /// When they last reported, in milliseconds.
    #[serde(rename = "t")]
    pub seen_at: i64,
}

impl From<Visitor> for PlayerView {
    fn from(visitor: Visitor) -> Self {
        Self {
            id: visitor.id,
            name: visitor.name,
            handle: visitor.handle,
            position_x: visitor.position_x,
            position_z: visitor.position_z,
            height: visitor.height,
            yaw: visitor.yaw,
            speed: visitor.speed,
            look: visitor.look,
            home: visitor.home,
            np: visitor.np,
            pet: visitor.pet,
            card: visitor.card,
            say: visitor.say,
            emote: visitor.emote,
            knock: visitor.knock,
            answer: visitor.answer,
            play: visitor.play,
            seen_at: visitor.seen_at,
        }
    }
}

/// The bins of a district.
#[derive(Debug, Serialize)]
pub struct Bins {
    #[serde(skip_serializing_if = "is_false")]
    pub offline: bool,
    pub bins: Vec<BinView>,
}

impl Bins {
    pub fn offline() -> Self {
        Self { offline: true, bins: Vec::new() }
    }

    pub fn standing(bins: Vec<Bin>) -> Self {
        Self { offline: false, bins: bins.into_iter().map(BinView::from).collect() }
    }
}

#[derive(Debug, Serialize)]
pub struct BinView {
    pub spot: String,
    pub funded: i32,
    pub names: Vec<String>,
}

impl From<Bin> for BinView {
    fn from(bin: Bin) -> Self {
        Self { spot: bin.spot, funded: bin.funded, names: bin.names }
    }
}

/// How much a person has shipped. `source` says how it was counted: `commits` exactly, or `contributions` from their public calendar.
#[derive(Debug, Serialize)]
pub struct Efforts {
    pub user: String,
    pub commits: u32,
    pub source: Source,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Source {
    Commits,
    Contributions,
}

/// A count worth keeping for a few minutes: what GitHub said, without whose it was.
#[derive(Debug, Serialize, Deserialize)]
pub struct Count {
    pub commits: u32,
    pub source: Source,
}

impl Count {
    /// `None` when there is no such person, which is not worth keeping.
    pub fn from_tally(tally: Tally) -> Option<Self> {
        match tally {
            Tally::Commits(commits) => Some(Self { commits, source: Source::Commits }),
            Tally::Contributions(commits) => Some(Self { commits, source: Source::Contributions }),
            Tally::NoSuchUser => None,
        }
    }
}

/// Who is signed in and what they chose.
#[derive(Debug, Serialize)]
pub struct Me {
    pub account: AccountView,
    pub profile: Option<Profile>,
}

#[derive(Debug, Serialize)]
pub struct AccountView {
    /// The id this person has in the world: the same one other players see in presence.
    pub id: String,
    pub login: String,
    pub name: Option<String>,
}
