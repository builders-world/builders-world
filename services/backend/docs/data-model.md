# Data model

## `players`: who is in the world right now

One row per player, replaced on every report. **UNLOGGED**: there is a write per player per second and nothing in it is worth keeping, so it skips the write-ahead log and is
emptied by a crash (the cost is a second of company). The `jobs` service deletes rows not reported for 60 seconds, every 30 seconds; others stop seeing a player after 12.

`id` is the person's world id (`u` + their account id without dashes), set by the server from the session; it is the primary key. Structured columns (`look`, `card`, `np`, `pet`, and the last `say`, `emote`, `knock`, `answer`, `play`) are JSONB written from the typed
structs in `domain::world::presence`, so the stored shape is the one the compiler checks. `say`, `emote`, `knock`, `answer` and `play` are replaced only by a report that has something new
(`COALESCE` on upsert), which keeps the last words visible for the window; each carries its own time.

Indexes: `(district, seen DESC)` for "who is near me", `(seen)` for the sweep.

## `accounts`, `sessions`, `profiles`: who people are

`accounts` has one row per person, unique on GitHub's numeric `github_id` (stable, unlike the login). The login and name are refreshed at every sign-in.
`sessions` holds only `SHA-256(token)`; a session is live while `revoked_at` is null and `expires_at` is in the future, and `jobs` deletes dead ones hourly.
`profiles` is one JSONB document per person, in the shape of `domain::world::profile::Profile`, replaced on every save.

## `bins`: what the street has been given

Primary key `(district, spot)`. `funded` goes up by 1,000 per gift to a ceiling of 3,000; `names` lists each giver once. The ceiling check and the addition are one `INSERT … ON CONFLICT DO UPDATE … WHERE funded < 3000`
statement, so concurrent gifts cannot overfill a bin (tested with eight at once).

## Redis

| Key | Holds | Lifetime |
|---|---|---|
| `ratelimit:ip:<address>` | requests this minute | 1 minute |
| `ratelimit:signin:<address>` | sign-in starts this minute | 1 minute |
| `auth:state:<random>` | where to send the browser after GitHub; used once | 10 minutes |
| `ratelimit:player:<id>` | presence reports this minute | 1 minute |
| `ratelimit:efforts:<address>` | fresh GitHub lookups this minute | 1 minute |
| `efforts:<lower-case login>` | `{ commits, source }` | 10 minutes |

These prefixes are live data: rename the Rust identifier, never the string.
