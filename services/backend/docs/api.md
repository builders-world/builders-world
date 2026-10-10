# API

The game (yaba-scene) calls these endpoints. **People sign in with GitHub**; the server gives the browser a session token and
the game sends it as `Authorization: Bearer <token>`. Who a player is (their id, handle and name) always comes from the session, never from
what the browser says, so nobody can appear as someone else. Without a session the game is played solo.

Every refusal is `{ "error": "<code>" }` with a code from `domain::error_code::ErrorCode` (`session_invalid` is `401`). Responses to the game's own
calls are never cached; `/api/efforts` says how long it may be.

When the world cannot be reached (the database is down) bins answer `200` with `"offline": true` and nothing else, so the game drops to
solo play without an error in anyone's console. Presence answers `503 unavailable`.

## Signing in

1. The game sends the browser to `GET /api/auth/github?return=<the game's origin>`. `return` must be one of `ALLOWED_ORIGINS`.
2. The server keeps a random `state` for ten minutes (usable once) and sends the browser to GitHub. No scope is requested: the game can read only what GitHub shows anyone (id, login, name).
3. GitHub sends the browser to `GET /api/auth/github/callback?code&state`. The server checks the state, trades the code for who the person is, finds or makes their account (keyed by GitHub's numeric id, so renaming on GitHub does not make a new person) and opens a session of 30 days.
4. The browser is sent to `<origin>/#bw-session=<token>`, or `<origin>/#bw-error=<denied|github|server>`. A fragment is never sent to any server; the game reads it and removes it from the address bar.

Only a SHA-256 hash of the token is stored. `POST /api/auth/logout` ends the session it is called with. Without `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `PUBLIC_URL` the sign-in routes answer `503`.

## `GET /api/me` · `PUT /api/me/profile`

`GET` answers `{ "account": { "id", "login", "name" }, "profile": {…} | null }`. `account.id` is the id other players see in presence.

`PUT` saves what the person chose at arrivals and in the wardrobe, so it follows them to any device:
`{ name, role, city, district, avatar: { color, style }, look, pet, card }` (read by `domain::world::profile`; anything unknown is dropped). It answers the profile as saved.

## `GET /api/me/efforts`

Like `/api/efforts`, for the GitHub account signed in. The wallet uses this one, so a person cannot be counted for someone else's work.

## `POST /api/presence`

About once a second a player says where they are and gets back everyone else nearby.

```json
{ "district": "yaba", "x": 10.5, "z": -3, "y": 0, "yaw": 1.25, "speed": 2,
  "look": { "color": "#336699", "style": "hoodie", "full": { "hair": "afro", "acc": ["bag"] } },
  "say": "e kaaro", "emote": "wave", "home": "…", "np": { "t": "…", "a": "…", "id": "…" }, "pet": { "kind": "dog", "breed": "awuku", "name": "Rex" },
  "card": { "role": "…", "showCommits": true, "commits": 412 },
  "knock": { "to": "<player id>", "kind": "door" }, "answer": { "to": "<player id>", "kind": "door", "ok": true },
  "play": { "to": "<player id>", "game": "chess", "gid": "abc123", "act": "move", "moves": "e2e4 e7e5" } }
```

Needs a session. Every field is optional, and a report cannot name an id or handle: they are the signed-in person's. Nothing a client sends is trusted: text is stripped of control characters and `<>` and cut to length, numbers are clamped,
colours must be `#rrggbb`, and wardrobe, pet and game values must be known ones (rules and tests in `domain::world::presence`). 

Answer: `{ "you": "<id>", "online": 2, "players": [ … ] }`. Each player carries the same fields as a report, plus `t`, when they last reported (ms). Players are those
in the same district who reported in the last 12 seconds, newest first, at most 60. `say`, `emote`, `knock`, `answer` and `play` stay on a player until replaced,
each with its own `t`, so the game shows each one once.

Limit: 120 reports a minute per person.

## `GET /api/bins?district=yaba` · `POST /api/bins`

Street bins are shared: a bin one player funds is there for everyone. The game takes the Efforts from the player's wallet; the server only records the total.

`POST { "district": "yaba", "spot": "12_-40" }` (needs a session; the name beside the gift is the giver's GitHub login) adds one gift of 1,000 Efforts. A bin costs 3,000, and takes no more once paid for, even when gifts arrive at
the same moment. Both answer `{ "bins": [ { "spot": "12_-40", "funded": 3000, "names": ["Ada", "Bola"] } ] }`. A `spot` that is not two whole numbers joined by `_` is `400 bad_request`.

## `GET /api/efforts?user=<github login>` (public)

How much the person shipped in the last year: `{ "user": "octocat", "commits": 412, "source": "commits" }`. `source` is `commits` (exact, when the server has a `GITHUB_TOKEN`) or
`contributions` (their public calendar, which also counts pull requests and issues). Every commit is worth 1,000 Efforts; that is the game's rule, not the server's.

Counts are kept ten minutes. `400 bad_request` (no usable login), `404 not_found` (no such GitHub user), `502 provider_error` (GitHub did not answer). Limit: 30 fresh lookups a minute per address.

## `GET /health`

`200 OK`. Not rate limited.

## Limits on everything

One client address may send `RATE_LIMIT_PER_MINUTE` requests a minute (default 1,200: a campus or a mobile carrier puts many players behind one address). The limiter fails open: if Redis is
down or slow the request goes through. See [configuration](../.env.example) for `CLIENT_IP_HEADER` and `TRUSTED_PROXY_HOPS`, which decide whose address is counted.
