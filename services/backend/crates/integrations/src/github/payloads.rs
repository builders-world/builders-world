//! What GitHub is sent and what it answers. Requests are structs with a test pinning their JSON; answers are read with
//! structs whose fields are all optional, so a missing field means "not that kind of answer", never a crash.
use serde::{Deserialize, Serialize};

const COMMITS_QUERY: &str = "query($login:String!){ user(login:$login){ contributionsCollection { totalCommitContributions } } }";

#[derive(Debug, Serialize)]
pub struct GraphqlRequest<'a> {
    pub query: &'static str,
    pub variables: Variables<'a>,
}

#[derive(Debug, Serialize)]
pub struct Variables<'a> {
    pub login: &'a str,
}

impl<'a> GraphqlRequest<'a> {
    pub fn commits(login: &'a str) -> Self {
        Self { query: COMMITS_QUERY, variables: Variables { login } }
    }
}

#[derive(Debug, Default, Deserialize)]
pub struct GraphqlResponse {
    pub data: Option<Data>,
}

#[derive(Debug, Default, Deserialize)]
pub struct Data {
    /// `Some(None)` is GitHub saying the login does not exist; `None` is the answer not having the field at all.
    #[serde(default, deserialize_with = "present")]
    pub user: Option<Option<Person>>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Person {
    pub contributions_collection: Option<Collection>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
    pub total_commit_contributions: Option<u32>,
}

fn present<'de, D: serde::Deserializer<'de>, T: Deserialize<'de>>(deserializer: D) -> Result<Option<Option<T>>, D::Error> {
    Option::<T>::deserialize(deserializer).map(Some)
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn the_commit_query_is_what_github_receives() {
        assert_eq!(
            serde_json::to_value(GraphqlRequest::commits("octocat")).unwrap(),
            json!({
                "query": "query($login:String!){ user(login:$login){ contributionsCollection { totalCommitContributions } } }",
                "variables": { "login": "octocat" }
            })
        );
    }

    #[test]
    fn a_count_a_missing_user_and_no_answer_are_told_apart() {
        let read = |body: serde_json::Value| serde_json::from_value::<GraphqlResponse>(body).unwrap().data.and_then(|data| data.user);
        let counted = read(json!({ "data": { "user": { "contributionsCollection": { "totalCommitContributions": 412 } } } }));
        assert_eq!(counted.unwrap().unwrap().contributions_collection.unwrap().total_commit_contributions, Some(412));
        assert!(read(json!({ "data": { "user": null } })).unwrap().is_none());
        assert!(read(json!({ "data": {} })).is_none());
        assert!(read(json!({ "errors": [{ "message": "Bad credentials" }] })).is_none());
    }
}
