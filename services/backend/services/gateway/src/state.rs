use std::sync::Arc;

use integrations::github::oauth::SignIn;
use integrations::github::Contributions;
use queue::Queue;
use store::PgPool;

use crate::config::Config;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub pool: PgPool,
    pub queue: Queue,
    /// What a person has shipped, from GitHub. A trait so tests never leave the machine.
    pub contributions: Arc<dyn Contributions>,
    /// Sign in with GitHub. `None` when the OAuth app is not configured: nobody can sign in, and the game is played solo.
    pub sign_in: Option<Arc<dyn SignIn>>,
}
