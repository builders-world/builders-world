use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            database_url: env::var("DATABASE_URL").map_err(|_| "DATABASE_URL is not set".to_owned())?,
            redis_url: env::var("REDIS_URL").map_err(|_| "REDIS_URL is not set".to_owned())?,
        })
    }
}
