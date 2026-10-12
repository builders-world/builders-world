---
name: bw-verify
description: Verify Builders World changes in a real browser and against its API before calling them done. Use after any change to the game (apps/game) that shows on screen, changes controls or the HUD, or touches the API; when asked to check, test, screenshot or verify the game; and when reviewing someone else's PR. Opens Playwright at a city and area, plays scripted steps, screenshots, console errors, frame rate; calls the API signed in.
---

# Verify Builders World

The tools live in the repo at `apps/game/scripts/verify/` (`bw.mjs`, `api.mjs`, `plans/`, and a README with every option).
Run them from `apps/game` of the worktree you are testing.

## Every change that shows on screen

1. Look at it, where it happens, before saying it works:
   ```sh
   node scripts/verify/bw.mjs shot --serve --city Lagos --area Yaba               # this checkout, own dev server
   node scripts/verify/bw.mjs shot --serve --city Lagos --area Yaba --device phone --quality low
   ```
   `--base URL` instead of `--serve` for a running server, a Vercel preview or production. `--aerial`, `--hour 21`,
   `--eval "js"` (the game is `window.__bw`: `world`, `look`, `player`, `cam`, `camera`, `scene`).
2. For anything with steps (a menu, an activity, a flow), write a plan in `scripts/verify/plans/` and run it:
   `node scripts/verify/bw.mjs run scripts/verify/plans/<name>.json --serve`. Steps: shot, wait, press, hold, click,
   tap, event, eval, log, waitFor, expect, aerial, fps. `expect` makes the run FAIL when false.
3. Read the printed PASS/FAIL, console errors and failed requests, then **open `sheet.png` with Read** and look at it.
   A PASS with a broken picture is still broken.
4. HUD, controls or layout: check desktop and `--device phone --quality low` both.
5. Prove a new check can fail (break the thing on purpose with `--eval` or an `eval` step) the first time you write it.

## The API

```sh
node scripts/verify/api.mjs GET "/api/bins?district=Yaba" --anon
node scripts/verify/api.mjs GET /api/me                  # signed in
```
Signed-in calls (and `bw.mjs --signed-in --online`) need the session from `node scripts/verify/bw.mjs login`, which a
person must do once (GitHub sign-in in a visible window). If it is missing, ask Elvis to run, in Claude Code:
`! cd "<worktree>/apps/game" && node scripts/verify/bw.mjs login`. The token is in `~/.config/builders-world/session.json`
(mode 600): never read it into the conversation, print it, commit it or pass it anywhere else.

## Reporting

Say what was checked (place, device, quality, the plan's checks) and what was not: a real phone, frame rate on a real
device, signed-in flows without a session, cities not tried. Never present an unchecked thing as passing.

## Known quirks

- Playwright's own `page.screenshot` can hang on "waiting for fonts" headless; the tool captures through CDP instead.
- `--serve` takes about 20 s to start; reuse `--base` with an existing server when running several checks.
- Headless frame rate on this Mac is not a phone's; say so when quoting it.
