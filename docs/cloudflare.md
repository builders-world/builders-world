# The game on Cloudflare

The game (`apps/game`) is served by Cloudflare Workers on the free plan, at
**https://buildersworld.ledger-trigger.workers.dev**. It moved there from Vercel in November 2026 (#37), when
`buildersworld.vercel.app` stopped serving (every request answers `402`). The backend (the Rust gateway, `services/backend`)
stays on Railway.

It costs nothing: Cloudflare serves the built files for free with no request limit, and runs a few lines of code only for
`/api`, which the free plan allows 100,000 times a day (see [Limits](#limits-measured)).

## What is where

| File | What it does |
|---|---|
| `apps/game/wrangler.jsonc` | The Worker `buildersworld`: serve `dist/` (Vite's build) as static files, run the Worker only for `/api`, a 404 for a path with no file, and the gateway's address (`GATEWAY`) |
| `apps/game/worker/index.js` | The Worker: forwards `/api` to the gateway the way `vercel.json`'s rewrites did |
| `apps/game/public/_headers` | Vite copies it into `dist/`. Browsers keep Vite's content-hashed files in `/assets/` for a year |
| `apps/game/vercel.json`, `.vercelignore` | Unused on Cloudflare. Kept so the game can go back to Vercel (see [Going back](#going-back)) |

### `/api`: the same as on Vercel

| The browser asks | The gateway gets |
|---|---|
| `/api/auth/oauth/github/callback?...` | `/api/auth/github/callback?...` (the gateway's own name; the same rename `vercel.json` made) |
| `/api/<anything>?...` | `/api/<anything>?...` |

Method, query, body and headers go through as they are, and the gateway's answer comes back untouched: its status,
headers (every `Set-Cookie` too), redirects (to GitHub, and back to the game) and a body that streams. Like Vercel, the
Worker tells the gateway who is asking: `X-Forwarded-For` and `X-Real-IP` are set to the player's address as Cloudflare
saw it (never one the browser sent), `X-Forwarded-Host` to the game's host and `X-Forwarded-Proto` to `https`. The
gateway builds no address from these: its redirects come from its own settings (below), and it sets no cookies, since
the session is a bearer token the game keeps. The game opens no WebSockets.

If the gateway cannot be reached, the Worker answers `502`, and the game plays solo, as it does with no server at all.

## Build and deploy

From `apps/game`, signed in to the Cloudflare account that owns the Worker (`npx wrangler@4 login` once):

    npm ci
    npm run build
    npx --yes wrangler@4 deploy

`wrangler deploy` uploads only the files that changed. The build needs no secrets, and nothing in it reads one: no
`VITE_*` variables are set (none were on Vercel either: `VITE_API_URL` empty means `/api` on the game's own address,
`VITE_SPOTIFY_CLIENT_ID` empty means Spotify now-playing stays off, `VITE_CITY_BASE` empty means the cities ship with
the build).

To check a change before it goes live, `npx --yes wrangler@4 versions upload` gives a preview address for that version
without changing the live one.

### Deploying from GitHub by itself (to set up once)

Vercel put `main` live by itself. To do the same on Cloudflare for free, connect the repository in the Cloudflare
dashboard: Workers & Pages, `buildersworld`, Settings, Builds, Connect, then `builders-world/builders-world` with:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Root directory | `apps/game` (the build also reads `../../cities`, which is in the clone) |
| Build command | `npm ci && npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` (a preview address for every pull request) |

The free plan includes 3,000 build minutes a month, one build at a time; `npm run build` itself takes about 5 seconds,
plus installing and uploading. Until this is connected, someone deploys by hand as above after each merge.

## Limits, measured

Measured on 20 November 2026 with the preview (wrangler 4.165.0).

| What | Measured | Free plan limit |
|---|---|---|
| Worker size | 1.20 KiB (0.60 KiB gzipped), from `wrangler deploy --dry-run --outdir` | 64 MiB |
| Worker start-up | 1 ms | 1 s |
| CPU per `/api` request | 0 to 1 ms (median 0 ms over 29 requests, `wrangler tail`); waiting on the gateway is not CPU | 10 ms |
| Static files | 1,963 files, 145 MB in all, the largest 1.93 MB (`assets/main-*.js`) | 20,000 files, 25 MiB each |
| Static file requests | free, no limit | none |
| Worker requests (`/api`, and paths with no file) | see below | 100,000 a day, reset at 00:00 UTC |

**What uses the 100,000.** Signed-in players report where they are to `/api/presence` about every 0.6 seconds
(`src/look/online.js`), so one signed-in player uses about 6,000 Worker requests an hour, plus a few hundred for the
profile, bins and wallet. That is about **16 player-hours of signed-in play a day**. Signed-out players use about 120
an hour (the street bins are read every 30 seconds while the server answers). Past the limit, `/api` answers `429` until midnight
UTC: the game keeps loading and playing (static files are not counted), and treats `429` as "busy, try again", so other
players stop appearing until the reset. Workers Cache must stay off: with it on, static file requests are counted too.

**A $0 option without that ceiling.** Build with `VITE_API_URL=https://gateway-production-6518.up.railway.app` and the
browser calls the gateway directly, so `/api` never reaches Cloudflare and the 100,000 a day no longer applies. It needs
the gateway's `ALLOWED_ORIGINS` to list the game's address (it must anyway, below), which also turns on the gateway's
CORS; the session is a bearer token, so nothing depends on cookies. The cost is a CORS preflight before calls that carry
the session or a JSON body (the browser keeps each answer for 10 minutes, the gateway's `CORS_MAX_AGE`) and the gateway's
address in the built JavaScript (it is already public in `vercel.json`). The Worker would still answer the GitHub callback, one request per sign-in, so the OAuth app's callback
stays on the game's address. The owner decides; this pull request keeps `/api` on the game's address, as on Vercel.

## The gateway (online play)

**State on 20 November 2026:** `https://gateway-production-6518.up.railway.app` answers every path, `/health`
included, with Railway's `404 {"status":"error","code":404,"message":"Application not found"}` and
`x-railway-fallback: true`: no service is bound to that address. The owner's decision the same day: leave the online
parts off for now. The proxy stays in place, with the same mapping as `vercel.json`, so sign-in, other players, street
bins and the commit count work again the day a gateway answers at that address, with no change here.

**What players get meanwhile** (checked against a build of `main` with the same `/api` forwarding, at 1440 and 390,
signed out and with a stored session): the game loads and plays solo with the demo balance (25,000 Efforts) and no
"online" chip, exactly as the reference does. The browser console shows one line, the failed `/api/bins` (and
`/api/me` when a session is stored, which the game keeps for later), the same as the reference. The sign-in link opens
the gateway's "Application not found" answer, as it did on Vercel. If the address stops answering at all, the Worker
answers `502` instead and the game behaves the same (checked locally with `wrangler dev` against a closed port).

**Pointing the proxy at a new gateway:**

1. Put the new gateway's address (`https://...`, no path, no trailing slash) in `vars.GATEWAY` in
   `apps/game/wrangler.jsonc`. Keep the file the source: a value changed in the Cloudflare dashboard is replaced by the
   file's at the next `wrangler deploy`.
2. Deploy from `apps/game`: `npm run build`, then `npx --yes wrangler@4 deploy` (or merge, once Workers Builds is
   connected).
3. On the new gateway, set `PUBLIC_URL` to its own address, `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` from the
   OAuth app, and `GITHUB_REDIRECT_URL` and `ALLOWED_ORIGINS` as in the next section.
4. Check: `curl -s "https://buildersworld.ledger-trigger.workers.dev/api/bins?district=Yaba"` answers JSON from the
   gateway instead of "Application not found". Then a person signs in once (`node scripts/verify/bw.mjs login` in
   `apps/game`) and `node scripts/verify/api.mjs GET /api/me` answers with their account.

For local development, `API_PROXY=<gateway address> npm run dev` points Vite's own `/api` forwarding at it.

## Changes outside this repository

Sign-in and the API need these on the new address. Nothing in the repository can make them.

1. **A gateway that answers** at the address in `GATEWAY` (above): today's is not bound to a service on Railway
   (project `yaba-scene`, service `gateway`). Until one answers, the game plays solo everywhere.
2. **The GitHub OAuth app** whose client ID is the gateway's `GITHUB_CLIENT_ID` on Railway (Elvis's OAuth app, set up
   for #123): set **Authorization callback URL** to
   `https://buildersworld.ledger-trigger.workers.dev/api/auth/oauth/github/callback`
   and **Homepage URL** to `https://buildersworld.ledger-trigger.workers.dev`. An OAuth app has one callback URL, and
   GitHub refuses a sign-in whose `redirect_uri` is on another host, so this must change.
3. **The gateway's settings on Railway** (service `gateway`, Variables; names from `services/backend/services/gateway/src/config.rs`):
   - `GITHUB_REDIRECT_URL` = `https://buildersworld.ledger-trigger.workers.dev/api/auth/oauth/github/callback`
     (the same address as the OAuth app's callback; the gateway sends GitHub this `redirect_uri`).
   - `ALLOWED_ORIGINS`: add `https://buildersworld.ledger-trigger.workers.dev`, first in the list (comma-separated,
     no trailing slash). Sign-in only sends people back to an origin in this list, and the first one is where it sends
     them when none is given. `https://buildersworld.vercel.app` can come out.
   - `PUBLIC_URL` stays the gateway's own address. With `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` it is what turns
     sign-in on.
   - To check once the gateway is back: `CLIENT_IP_HEADER` and `TRUSTED_PROXY_HOPS` decide whose address the rate limit
     counts (1,200 requests a minute, 20 sign-ins a minute). Behind Cloudflare, as behind Vercel, Railway's `x-real-ip`
     may be Cloudflare's address rather than the player's, which would put players behind one Cloudflare address in one
     bucket. The Worker sends the player's address in `X-Forwarded-For` and `X-Real-IP`; whether Railway keeps or
     replaces them could not be checked while the gateway was down.
4. **Spotify:** nothing today (the feature is off). If `VITE_SPOTIFY_CLIENT_ID` is ever set, add
   `https://buildersworld.ledger-trigger.workers.dev/` to the Spotify app's redirect URIs.
5. **Vercel:** nothing is needed for the game. Its GitHub integration still runs on every pull request and fails
   ("Account is blocked"); disconnecting the repository from the Vercel project removes that red check. The project also
   holds `MONGODB_URI` and `MONGODB_DB`, left from the old `yaba-scene` serverless functions; nothing in `apps/game`
   reads them, so the Cloudflare build needs no secrets.

## Differences from Vercel

| | Vercel | Cloudflare |
|---|---|---|
| Address | `buildersworld.vercel.app` | `buildersworld.ledger-trigger.workers.dev` |
| Vite's hashed `/assets/*.js` and `*.css` | `max-age=0, must-revalidate` (the Vite preset sets no headers) | kept a year, `immutable` (`_headers`). Everything else, including `/assets/yaba-kit/`, is checked every time on both |
| `/index.html` | served | a `307` redirect to `/`, query kept (Cloudflare's `html_handling` default). Nothing in the game links to it |
| A path with no file | `404` with Vercel's page | `404` with an empty body |
| `/api` when the gateway is unreachable | Vercel's `502` or `504` page | `502` with one line of text |
| Headers the gateway receives | `x-vercel-*` | `cf-worker` |
| Requests | Vercel's plan | static files free and unlimited; `/api` 100,000 a day |
| Deploys | `main` by itself, previews for pull requests | by hand until Workers Builds is connected (above) |

The built files are the same: a build of this branch differs from a build of `main` only by `_headers`.

## Going back

- **A bad deploy on Cloudflare:** `npx --yes wrangler@4 rollback` puts the previous version back
  (`npx --yes wrangler@4 versions list` shows them all).
- **Back to Vercel:** `vercel.json` and `.vercelignore` are unchanged, so a Vercel deploy of `main` works as before. Then
  put the OAuth app's callback, `GITHUB_REDIRECT_URL` and the first `ALLOWED_ORIGINS` entry back to
  `https://buildersworld.vercel.app`, and the links in the READMEs.
- **Removing the Worker** (only the account's owner): `npx --yes wrangler@4 delete buildersworld`.
