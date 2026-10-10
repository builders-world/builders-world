use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub bind_addr: String,
    pub database_url: String,
    pub redis_url: String,
    /// A read-only GitHub token (no scopes needed). With it commits are counted exactly; without it the public contribution
    /// calendar is read, which also counts pull requests and issues.
    pub github_token: Option<String>,
    /// Sign in with GitHub: the OAuth app's id and secret, and the gateway's own public address (GitHub sends the browser back to
    /// `<public_url>/api/auth/github/callback`, which must be registered with the app). Sign-in is off unless all three are set.
    pub github_client_id: Option<String>,
    pub github_client_secret: Option<String>,
    pub public_url: Option<String>,
    /// Origins allowed to call the API from a browser (the game's address). Empty when the game is served from the same address.
    pub allowed_origins: Vec<String>,
    /// What one client address may send per minute. Presence alone is one request a second per player, and many players
    /// share an address (a campus, an office, a mobile carrier), so this is generous: it only stops a flood.
    pub rate_limit_per_minute: u64,
    /// How many proxies sit in front of the gateway. The client address is the entry this far from the *end* of
    /// `x-forwarded-for`, because the left-most entries are whatever the client chose to send.
    pub trusted_proxy_hops: usize,
    /// A header the platform's edge *overwrites* with the true client address (`x-real-ip` on Railway). When set it is the only
    /// source used for the client address. Never set it to a header a client can supply itself.
    pub client_ip_header: Option<String>,
}

/// A variable that is set and not blank.
fn optional(name: &str) -> Option<String> {
    env::var(name).ok().map(|value| value.trim().to_owned()).filter(|value| !value.is_empty())
}

fn required(name: &str) -> Result<String, String> {
    optional(name).ok_or_else(|| format!("{name} is not set"))
}

impl Config {
    /// The address GitHub sends the browser back to, when sign-in is set up.
    pub fn github_callback(&self) -> Option<String> {
        self.public_url.as_ref().map(|url| format!("{url}/api/auth/github/callback"))
    }

    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            bind_addr: optional("BIND_ADDR").or_else(|| optional("PORT").map(|port| format!("0.0.0.0:{port}"))).unwrap_or_else(|| "0.0.0.0:8080".into()),
            database_url: required("DATABASE_URL")?,
            redis_url: required("REDIS_URL")?,
            github_token: optional("GITHUB_TOKEN"),
            github_client_id: optional("GITHUB_CLIENT_ID"),
            github_client_secret: optional("GITHUB_CLIENT_SECRET"),
            public_url: optional("PUBLIC_URL").map(|url| url.trim_end_matches('/').to_owned()),
            allowed_origins: env::var("ALLOWED_ORIGINS")
                .unwrap_or_default()
                .split(',')
                .map(|origin| origin.trim().trim_end_matches('/').to_owned())
                .filter(|origin| !origin.is_empty())
                .collect(),
            rate_limit_per_minute: optional("RATE_LIMIT_PER_MINUTE").and_then(|value| value.parse().ok()).unwrap_or(1_200),
            trusted_proxy_hops: optional("TRUSTED_PROXY_HOPS").and_then(|value| value.parse().ok()).filter(|hops| *hops > 0).unwrap_or(1),
            client_ip_header: optional("CLIENT_IP_HEADER").map(|value| value.to_lowercase()),
        })
    }
}
