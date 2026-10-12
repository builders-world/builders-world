use std::time::Duration;

use async_trait::async_trait;
use domain::errors::DomainError;
use domain::time::seconds;
use regex::Regex;

use super::payloads::{GraphqlRequest, GraphqlResponse};
use super::{Contributions, Tally};
use crate::errors::upstream;
use crate::http_client;

/// How long to wait for GitHub before giving up.
const REQUEST_TIMEOUT: Duration = seconds(10);
const API_URL: &str = "https://api.github.com/graphql";
const USER_AGENT: &str = "builders-world";

/// With a token (read-only, no scopes needed) commits are counted exactly. Without one, the public contribution calendar is read, which
/// also counts pull requests and issues.
#[derive(Clone)]
pub struct GithubClient {
    http: reqwest::Client,
    token: Option<String>,
}

impl GithubClient {
    pub fn new(token: Option<String>) -> Self {
        Self { http: http_client::client(REQUEST_TIMEOUT), token }
    }

    async fn commits(&self, token: &str, user: &str) -> Result<Option<Tally>, DomainError> {
        let response = self
            .http
            .post(API_URL)
            .bearer_auth(token)
            .header(reqwest::header::USER_AGENT, USER_AGENT)
            .json(&GraphqlRequest::commits(user))
            .send()
            .await
            .map_err(|error| upstream("github", error))?;
        // A rejected token or a rate limit is not an answer about this person; the calendar still can be.
        let Ok(body) = response.json::<GraphqlResponse>().await else { return Ok(None) };
        Ok(match body.data.and_then(|data| data.user) {
            Some(None) => Some(Tally::NoSuchUser),
            Some(Some(person)) => person.contributions_collection.and_then(|collection| collection.total_commit_contributions).map(Tally::Commits),
            None => None,
        })
    }

    async fn calendar(&self, user: &str) -> Result<Tally, DomainError> {
        let response = self
            .http
            .get(format!("https://github.com/users/{user}/contributions"))
            .header(reqwest::header::USER_AGENT, USER_AGENT)
            .send()
            .await
            .map_err(|error| upstream("github", error))?;
        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(Tally::NoSuchUser);
        }
        let page = response.text().await.map_err(|error| upstream("github", error))?;
        Ok(Tally::Contributions(calendar_total(&page)))
    }
}

#[async_trait]
impl Contributions for GithubClient {
    async fn tally(&self, user: &str) -> Result<Tally, DomainError> {
        if let Some(token) = &self.token {
            if let Some(tally) = self.commits(token, user).await? {
                return Ok(tally);
            }
        }
        self.calendar(user).await
    }
}

/// Adds up the days on a contribution calendar page: each day's tooltip reads "3 contributions on June 4th." (a day with none says
/// "No contributions on ...", which adds nothing).
pub fn calendar_total(page: &str) -> u32 {
    let day = Regex::new(r">(\d+) contributions? on ").expect("the pattern is valid");
    day.captures_iter(page).filter_map(|found| found[1].parse::<u32>().ok()).fold(0, u32::saturating_add)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_calendar_page_adds_up_its_days() {
        let page = r#"<tool-tip>3 contributions on June 4th.</tool-tip><tool-tip>No contributions on June 5th.</tool-tip>
            <tool-tip>1 contribution on June 6th.</tool-tip><tool-tip>12 contributions on June 7th.</tool-tip>"#;
        assert_eq!(calendar_total(&page.replace("<tool-tip>", ">")), 16);
    }

    #[test]
    fn a_page_without_days_is_zero() {
        assert_eq!(calendar_total(""), 0);
        assert_eq!(calendar_total("<html>nothing</html>"), 0);
    }
}
