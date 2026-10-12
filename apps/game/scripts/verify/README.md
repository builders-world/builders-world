# Verify: check the game in a real browser, and call its API

Before a change is called done, look at it. These two scripts let anyone (a person, Claude, Codex) open the game in
Chromium, play it a little, take screenshots, and call the API as a signed-in player. Run them from `apps/game`.

## A quick look: `shot`

```sh
node scripts/verify/bw.mjs shot --serve --city Lagos --area Yaba
node scripts/verify/bw.mjs shot --serve --city Nairobi --area "City Centre" --device phone --quality low --aerial
node scripts/verify/bw.mjs shot --base https://buildersworld.vercel.app --city Accra --area Osu --hour 21
```

It prints PASS or FAIL, the place, the device, the frame rate, any console errors and failed requests, and the path of
`report.json`. Next to that are the screenshots and `sheet.png`, all of them on one page: open that one image to see
everything. FAIL means a console error, a failed check or a step that broke.

| Option | |
|---|---|
| `--serve` | start this checkout's own dev server on a free port (a clean worktree is tested as it is) |
| `--base URL` | a running server instead: `http://127.0.0.1:5182`, a Vercel preview, production |
| `--city`, `--area` | where to arrive (`--area "City Centre"`; the city's own spelling from `cities/`) |
| `--device` | `desktop` (1440×900, the default), `laptop`, `phone` (390×844 with touch), `tablet` |
| `--quality` | `low`, `medium` (default), `high`, `ultra` |
| `--hour`, `--weather` | `--hour 21` for night; `--weather rain` |
| `--aerial` | also a screenshot from the air |
| `--eval "js"` | run something in the page first (`window.__bw` is the game: `world`, `look`, `player`, `cam`, `camera`, `scene`) |
| `--signed-in` | as you, with the session from `login` |
| `--online` | with the live API (by default the game runs offline, so the check does not depend on it) |
| `--headed` | a window you can watch |
| `--out DIR` | where the screenshots go (default: a new folder in the temp directory) |

## A scripted check: `run plan.json`

A plan is the steps a player takes and what must be true. `plans/` has examples: `smoke.json` (the open city, the
aerial view, the map), `outdoors.json` (the Outdoors app and an arrow at the range), `phone-hud.json` (nothing on the
phone's HUD overlaps).

```sh
node scripts/verify/bw.mjs run scripts/verify/plans/smoke.json --serve
node scripts/verify/bw.mjs run scripts/verify/plans/phone-hud.json --base http://127.0.0.1:5182
```

Steps, in order (a step that fails stops the plan, unless it has `"optional": true`; a screenshot is taken when one fails):

| Step | Does |
|---|---|
| `{ "shot": "name" }` | a screenshot |
| `{ "wait": 1500 }` | wait, in ms |
| `{ "press": "m" }`, `{ "hold": "w", "ms": 800 }`, `{ "type": "hello" }` | the keyboard |
| `{ "click": "#sel" }`, `{ "tap": "#sel" }` | the mouse or a finger |
| `{ "event": "bw:outdoors" }` | dispatch a game event (opening a phone app, for instance) |
| `{ "eval": "js" }`, `{ "log": "js" }` | run JavaScript in the page; the value goes in the report |
| `{ "waitFor": "js", "timeout": 10000 }` | wait until it is true |
| `{ "expect": "js", "name": "what" }` | a check: must be truthy, or the run fails |
| `{ "aerial": true }`, `{ "fps": 3000 }` | the aerial view; the frame rate over 3 s |

A plan can set `base`, `serve`, `device`, `signedIn` and `game: { city, area, quality, hour, weather, q }` itself;
the command line overrides it.

## Signed in: `login`, then `api.mjs`

```sh
node scripts/verify/bw.mjs login                         # once: Chrome opens on GitHub; sign in there (10 minutes)
node scripts/verify/api.mjs GET /api/me                  # as you
node scripts/verify/api.mjs GET "/api/bins?district=Yaba" --anon
node scripts/verify/api.mjs PUT /api/me/profile --data '{"profile":{"name":"Test"}}'
node scripts/verify/bw.mjs shot --serve --signed-in --online --city Lagos --area Yaba
node scripts/verify/bw.mjs logout
```

The session token is kept in `~/.config/builders-world/session.json`, readable only by you, outside every repository.
It is sent and never printed; anything in an answer that looks like a token is masked. Sign-in needs a person: GitHub
asks for your password or a passkey, so an agent asks you to run `login` (in Claude Code: `! node scripts/verify/bw.mjs login`).

## For agents

- Check every change that shows on screen with `shot` or a plan before saying it works, at the sizes it affects
  (desktop and `--device phone --quality low` for anything in the HUD or controls). Look at `sheet.png`.
- Say what was checked and what was not (a real phone, frame rate on a device, signed-in flows).
- Write a plan in `plans/` for anything you will check again; it is how the next person checks it too.
