use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub bind_addr: String,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        Ok(Self { bind_addr: env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into()) })
    }
}
