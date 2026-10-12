//! Redis: work queues (streams), duplicate suppression, and the shared connection. The webhook receiver only enqueues;
//! workers read here, so a backlog is a longer queue and never an outage.
use std::time::Duration;

use redis::aio::ConnectionManager;
use redis::streams::{StreamReadOptions, StreamReadReply};
use redis::AsyncCommands;
use tokio::sync::OnceCell;

/// A named stream. The text is live data: renaming it strands whatever is queued, so rename the identifier, never the
/// string.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Stream {
    Ingest,
}

impl Stream {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Ingest => "ingest",
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum QueueError {
    #[error("redis: {0}")]
    Redis(#[from] redis::RedisError),
}

/// One queued item, handed to a worker until it acknowledges it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Entry {
    pub id: String,
    pub payload: String,
}

/// The connection to Redis. It connects on first use, so building one never needs a running Redis.
#[derive(Clone)]
pub struct Queue {
    client: redis::Client,
    connection: std::sync::Arc<OnceCell<ConnectionManager>>,
}

impl Queue {
    pub fn new(url: &str) -> Result<Self, QueueError> {
        Ok(Self { client: redis::Client::open(url)?, connection: std::sync::Arc::new(OnceCell::new()) })
    }

    async fn connection(&self) -> Result<ConnectionManager, QueueError> {
        let connection = self.connection.get_or_try_init(|| ConnectionManager::new(self.client.clone())).await?;
        Ok(connection.clone())
    }

    /// Adds an item and returns its id.
    pub async fn enqueue(&self, stream: Stream, payload: &str) -> Result<String, QueueError> {
        let mut connection = self.connection().await?;
        Ok(connection.xadd(stream.as_str(), "*", &[("payload", payload)]).await?)
    }

    /// Creates the consumer group if it does not exist yet. Safe to call on every start.
    pub async fn join(&self, stream: Stream, group: &str) -> Result<(), QueueError> {
        let mut connection = self.connection().await?;
        let created: Result<(), redis::RedisError> = connection.xgroup_create_mkstream(stream.as_str(), group, "0").await;
        match created {
            Err(error) if error.code() != Some("BUSYGROUP") => Err(error.into()),
            _ => Ok(()),
        }
    }

    /// Waits up to `wait` for new items for this consumer.
    pub async fn read(&self, stream: Stream, group: &str, consumer: &str, count: usize, wait: Duration) -> Result<Vec<Entry>, QueueError> {
        let mut connection = self.connection().await?;
        let options = StreamReadOptions::default().group(group, consumer).count(count).block(wait.as_millis() as usize);
        let reply: StreamReadReply = connection.xread_options(&[stream.as_str()], &[">"], &options).await?;
        let mut entries = Vec::new();
        for key in reply.keys {
            for item in key.ids {
                if let Some(payload) = item.get::<String>("payload") {
                    entries.push(Entry { id: item.id, payload });
                }
            }
        }
        Ok(entries)
    }

    /// Marks an item done so it is not delivered again.
    pub async fn ack(&self, stream: Stream, group: &str, id: &str) -> Result<(), QueueError> {
        let mut connection = self.connection().await?;
        let _: i64 = connection.xack(stream.as_str(), group, &[id]).await?;
        Ok(())
    }

    /// How many items are in the stream: the number the ingestion alert watches.
    pub async fn depth(&self, stream: Stream) -> Result<u64, QueueError> {
        let mut connection = self.connection().await?;
        Ok(connection.xlen(stream.as_str()).await?)
    }

    /// Counts a hit on `key` within a fixed window that starts at the first hit, and returns how many there have been. Used to rate limit.
    pub async fn hit(&self, key: &str, window: Duration) -> Result<u64, QueueError> {
        let mut connection = self.connection().await?;
        let count: u64 = connection.incr(key, 1).await?;
        if count == 1 {
            let _: bool = connection.expire(key, window.as_secs() as i64).await?;
        }
        Ok(count)
    }

    /// What was kept under `key` by [`Queue::remember`], if it has not expired.
    pub async fn recall(&self, key: &str) -> Result<Option<String>, QueueError> {
        let mut connection = self.connection().await?;
        Ok(connection.get(key).await?)
    }

    /// What was kept under `key`, removed in the same step: it can be taken only once.
    pub async fn take(&self, key: &str) -> Result<Option<String>, QueueError> {
        let mut connection = self.connection().await?;
        Ok(redis::cmd("GETDEL").arg(key).query_async(&mut connection).await?)
    }

    /// Keeps `value` under `key` for `lifetime`.
    pub async fn remember(&self, key: &str, value: &str, lifetime: Duration) -> Result<(), QueueError> {
        let mut connection = self.connection().await?;
        let _: () = connection.set_ex(key, value, lifetime.as_secs()).await?;
        Ok(())
    }

    /// True the first time `key` is seen within `window`, false after that. Used to drop duplicate webhook deliveries.
    pub async fn first_seen(&self, key: &str, window: Duration) -> Result<bool, QueueError> {
        let mut connection = self.connection().await?;
        let set: Option<String> = redis::cmd("SET").arg(key).arg(1).arg("NX").arg("EX").arg(window.as_secs()).query_async(&mut connection).await?;
        Ok(set.is_some())
    }
}

#[cfg(test)]
mod tests {
    use domain::time::seconds;

    use super::*;

    fn queue() -> Queue {
        Queue::new(&std::env::var("REDIS_URL").expect("REDIS_URL")).unwrap()
    }

    #[tokio::test]
    #[ignore = "needs REDIS_URL"]
    async fn an_item_is_read_once_and_gone_after_ack() {
        let queue = queue();
        queue.join(Stream::Ingest, "test-group").await.unwrap();
        let payload = format!("payload-{}", std::process::id());
        queue.enqueue(Stream::Ingest, &payload).await.unwrap();

        let entries = queue.read(Stream::Ingest, "test-group", "test-consumer", 100, seconds(1)).await.unwrap();
        let entry = entries.iter().find(|entry| entry.payload == payload).expect("the item we added");
        queue.ack(Stream::Ingest, "test-group", &entry.id).await.unwrap();
    }

    #[tokio::test]
    #[ignore = "needs REDIS_URL"]
    async fn hits_are_counted_and_a_kept_value_comes_back() {
        let queue = queue();
        let key = format!("test:hits:{}", std::process::id());
        assert_eq!(queue.hit(&key, seconds(30)).await.unwrap(), 1);
        assert_eq!(queue.hit(&key, seconds(30)).await.unwrap(), 2);
        let kept = format!("test:kept:{}", std::process::id());
        queue.remember(&kept, "kept", seconds(30)).await.unwrap();
        assert_eq!(queue.recall(&kept).await.unwrap().as_deref(), Some("kept"));
        assert_eq!(queue.recall("test:nothing-here").await.unwrap(), None);
        assert_eq!(queue.take(&kept).await.unwrap().as_deref(), Some("kept"));
        assert_eq!(queue.take(&kept).await.unwrap(), None);
    }

    #[tokio::test]
    #[ignore = "needs REDIS_URL"]
    async fn a_key_is_first_seen_once() {
        let queue = queue();
        let key = format!("test:first-seen:{}", std::process::id());
        assert!(queue.first_seen(&key, seconds(30)).await.unwrap());
        assert!(!queue.first_seen(&key, seconds(30)).await.unwrap());
    }
}
