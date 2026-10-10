//! Signing in with GitHub: send the browser to GitHub, then trade the code it comes back with for who the person is. No scope is
//! asked for, so the app can read only what GitHub shows anyone: the account's id, login and name. It never gets access to code.
use std::time::Duration;

use async_trait::async_trait;
use domain::errors::DomainError;
use domain::time::seconds;
use serde::{Deserialize, Serialize};

use crate::errors::upstream;
use crate::http_client;

const REQUEST_TIMEOUT: Duration = seconds(10);
const AUTHORIZE_URL: &str = "https://github.com/login/oauth/authorize";
const TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const USER_URL: &str = "https://api.github.com/user";
const USER_AGENT: &str = "builders-world";

/// Who GitHub says the person is. The id is what stays; the login can be renamed.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GithubUser {
    pub id: i64,
    pub login: String,
    pub name: Option<String>,
}

#[async_trait]
pub trait SignIn: Send + Sync {
    /// Where to send the browser. `state` comes back unchanged and proves the return is ours.
    fn authorize_url(&self, state: &str) -> String;

    /// Who signed in, given the `code` GitHub sent the browser back with. Fails if the code is wrong, used or old.
    async fn user_for(&self, code: &str) -> Result<GithubUser, DomainError>;
}

#[derive(Debug, Serialize)]
struct TokenRequest<'a> {
    client_id: &'a str,
    client_secret: &'a str,
    code: &'a str,
    redirect_uri: &'a str,
}

#[derive(Debug, Default, Deserialize)]
struct TokenResponse {
    access_token: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
struct UserResponse {
    id: Option<i64>,
    login: Option<String>,
    name: Option<String>,
}

#[derive(Clone)]
pub struct GithubOAuth {
    http: reqwest::Client,
    client_id: String,
    client_secret: String,
    /// Where GitHub sends the browser back: the gateway's own callback, registered with the OAuth app.
    redirect_uri: String,
}

impl GithubOAuth {
    pub fn new(client_id: String, client_secret: String, redirect_uri: String) -> Self {
        Self { http: http_client::client(REQUEST_TIMEOUT), client_id, client_secret, redirect_uri }
    }
}

#[async_trait]
impl SignIn for GithubOAuth {
    fn authorize_url(&self, state: &str) -> String {
        let mut url = reqwest::Url::parse(AUTHORIZE_URL).expect("a fixed address");
        url.query_pairs_mut()
            .append_pair("client_id", &self.client_id)
            .append_pair("redirect_uri", &self.redirect_uri)
            .append_pair("state", state)
            .append_pair("allow_signup", "true");
        url.into()
    }

    async fn user_for(&self, code: &str) -> Result<GithubUser, DomainError> {
        let request = TokenRequest { client_id: &self.client_id, client_secret: &self.client_secret, code, redirect_uri: &self.redirect_uri };
        let token: TokenResponse = self
            .http
            .post(TOKEN_URL)
            .header(reqwest::header::ACCEPT, "application/json")
            .header(reqwest::header::USER_AGENT, USER_AGENT)
            .json(&request)
            .send()
            .await
            .map_err(|error| upstream("github", error))?
            .json()
            .await
            .map_err(|error| upstream("github", error))?;
        let Some(access_token) = token.access_token else {
            return Err(upstream("github", token.error.unwrap_or_else(|| "no token".into())));
        };
        let user: UserResponse = self
            .http
            .get(USER_URL)
            .bearer_auth(access_token)
            .header(reqwest::header::USER_AGENT, USER_AGENT)
            .send()
            .await
            .map_err(|error| upstream("github", error))?
            .json()
            .await
            .map_err(|error| upstream("github", error))?;
        match (user.id, user.login) {
            (Some(id), Some(login)) => Ok(GithubUser { id, login, name: user.name.filter(|name| !name.trim().is_empty()) }),
            _ => Err(upstream("github", "no user in the answer")),
        }
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn the_browser_is_sent_to_github_with_our_state_and_no_scope() {
        let oauth = GithubOAuth::new("client-1".into(), "secret".into(), "https://api.example.com/api/auth/github/callback".into());
        let url = reqwest::Url::parse(&oauth.authorize_url("abc 123")).unwrap();
        assert_eq!(url.host_str(), Some("github.com"));
        let pairs: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();
        assert_eq!(pairs["client_id"], "client-1");
        assert_eq!(pairs["state"], "abc 123");
        assert_eq!(pairs["redirect_uri"], "https://api.example.com/api/auth/github/callback");
        assert!(!pairs.contains_key("scope") && !oauth.authorize_url("x").contains("secret"));
    }

    #[test]
    fn the_code_is_traded_with_exactly_this() {
        let request = TokenRequest { client_id: "id", client_secret: "secret", code: "code", redirect_uri: "https://x/cb" };
        assert_eq!(
            serde_json::to_value(request).unwrap(),
            json!({ "client_id": "id", "client_secret": "secret", "code": "code", "redirect_uri": "https://x/cb" })
        );
    }

    #[test]
    fn answers_missing_fields_are_not_a_crash() {
        let token: TokenResponse = serde_json::from_value(json!({ "error": "bad_verification_code" })).unwrap();
        assert!(token.access_token.is_none() && token.error.is_some());
        let user: UserResponse = serde_json::from_value(json!({ "message": "Bad credentials" })).unwrap();
        assert!(user.id.is_none() && user.login.is_none());
    }
}
