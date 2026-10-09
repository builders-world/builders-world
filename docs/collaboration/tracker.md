# Builders World: request tracker

Every request Elvis has made, with where it stands. Updated 9 October 2026, 17:40 WAT, by Claude. Whoever finishes or starts an item updates its row in the same commit.

## Where to see the work

| Copy | Address | What it shows |
|---|---|---|
| Live on Vercel | https://buildersworld.vercel.app/?world=1 (onboarding at https://buildersworld.vercel.app/) | `main` as of `02300c1`, deployed 9 October from the Vercel CLI (project buildersworld, account obileonardo). Redeploy with `vercel deploy --prod` from the game folder. |
| The game, branch `main` (merged) | http://127.0.0.1:5173/?world=1 (onboarding at http://127.0.0.1:5173/) | Everything below marked Done. Claude's worktree on 5181 is the same plus work in progress. |
| GitHub | builders-world/yaba-scene and builders-world/builders-world, branch `main` | Pushed after each item, approved by Elvis on 9 October. |

## Status key

- **Done, pushed**: built, tested, merged into `main` and pushed to GitHub.
- **Done, in chat**: an answer or plan given in conversation, nothing to commit.
- **In progress**: partly built.
- **Pending**: not started.
- **Waiting on Elvis**: needs a decision or something only Elvis can provide.

## Requests

| # | Request | Status | Where | Commit |
|---|---|---|---|---|
| 1 | Install top game-dev skills for Claude | Done, local only: 42 graphics skills linked into Claude; Codex installed 67 | `~/.claude/skills`, `~/.agents/skills` | n/a |
| 2 | A prompt so Codex can find and install skills | Done, in chat | Codex installed them | n/a |
| 3 | Onboarding plan: understanding, open decisions, Phase 1 split | Done, in chat. The D1 to D10 decisions were never opened as GitHub issues | chat | none |
| 4 | List Claude's installed skills so Codex can install them | Done, in chat; Codex installed them | `~/.agents/skills` | n/a |
| 5 | Read the repo and propose the full PRD | Done: superseded by PRD v1.1 (row 8) | | |
| 6 | Upgrade the graphics to the reference images (hybrid look) | Done, pushed | yaba-scene `src/look/*` | `a0684ac` |
| 7 | Explain a SHA | Done, in chat | | |
| 8 | PRD v1.1: images supersede v1.0, community build areas rules | Done, pushed and merged into `main` | `docs/product/builders-world-prd.md` | `4ef55df`, `e461c3b` |
| 8a | Regenerate the PRD HTML and PDF exports for v1.1 | Pending | `docs/product/exports/` | |
| 9 | Characters that look like the images | Waiting on Elvis: Tripo or Meshy API key, and whether the image 3 character is the default avatar | | |
| 10 | Real Yaba map data instead of the sample | Done, pushed (OpenStreetMap baked, credit shown) | yaba-scene `public/data/yaba.json` | `ba16910`, `c805718` |
| 11 | Claude and Codex see each other's work in real time | Done, local (shared status folder and hooks) | `Builders-World.collab/` | n/a |
| 12 | Real-time weather and time of day | Done, pushed | yaba-scene `src/look/weather.js`, `sun.js` | `9550f58` |
| 12a | Each district shows its own real weather | Done, pushed | same | `f946a5e` |
| 13 | Game UI from the references: phone, map, inventory, controls guide | Done, pushed (Tab phone, M map, I bag, first-visit guide, street name on minimap) | yaba-scene `src/look/menus.js` | `4f20f93` |
| 13a | Character creator in the reference style | Pending: specified in the world bible 7.4; lives in Codex's onboarding code | Codex | |
| 13b | Real-world gadgets tied to the bag | Pending: decision open | | |
| 14 | World bible: single source of truth for building the world | Done, pushed on `main` (plus AGENTS.md and CLAUDE.md pointers) | `docs/design/world-bible.md` | `e525724` |
| 15 | Integrate Codex's GLB asset kit | Done, pushed; handoff updated | yaba-scene `src/look/kit.js` | `a7306e2`, `9edca1e` |
| 15a | Re-sync Codex's expanded kit | Done, pushed: all twelve GLBs synced and placed | yaba-scene `src/look/district.js` | `8064c8c`, `8f9e943` |
| 16 | GPS-style route: pick a destination on the map, trail follows the streets | Done, pushed | yaba-scene `src/look/nav.js` | `98ddf5f` |
| 17 | Realistic streets: no buildings on roads, streetlights everywhere, proper planning | Done, pushed; junction corners fixed | yaba-scene `src/look/streets.js` | `98ddf5f`, `f946a5e` |
| 18 | Hire vehicles: danfo, keke, taxi; players choose passenger or drive | Done, pushed: danfo stops, keke parks, taxi from the phone; passenger or drive | yaba-scene `src/look/rides.js` | `5474c5a` |
| 19 | Birds, cats and planes | Done, pushed | yaba-scene `src/look/life.js` | `f946a5e` |
| 20 | More tech places: hubs, shared workspaces, studios | Done, pushed: Yaba Creative Hub, Lagos Builders Loft, Eko Design Studio | yaba-scene `src/look/interior.js` | `4dcba74` |
| 21 | Enterable workspaces: walk around, cafeteria, sit at a desk, use a computer | Done, pushed: walk in, cafeteria, sit at a desk, open the laptop, use the computer | yaba-scene `src/look/interior.js` | `4dcba74` |
| 22 | Isometric city sheets: click a city to enter it | Done, pushed: Lagos, Abuja, Port Harcourt, Uyo, Nairobi, Accra as dioramas with real local time and weather; click to enter at street level. Open with `?world=1&view=cities` or the Cities app on the phone | yaba-scene `src/look/cities.js` | `52ec42b` |
| 23 | This tracker | Done, pushed | `docs/collaboration/tracker.md` | this commit |
| 24 | GTA V style camera views on foot and in vehicles | Done, pushed: V cycles near, mid, far, first person; vehicles add a cinematic camera; on foot and vehicle keep separate choices. Aerial moved to B | yaba-scene `src/main.js` | `c4ff1d9` |
| 25 | Gutters blocking the road | Done, pushed: sunk to kerb height, never across a carriageway | yaba-scene `src/look/district.js` | `f815c93` |
| 26 | UI in the references' style, not generic | Done, pushed: paper and ink kit, illustrated map, wardrobe-ring bag, glyph phone, paper HUD. Codex's top-left card and Street/Aerial buttons still use the old look (its files) | yaba-scene `src/look/uikit.js`, `menus.js`, `hud.js` | `40f8614` |
| 27 | The street in the arrival scene's illustration style | Done, pushed: clay light, palette and planter trees; world bible 7.1 and 11.1 updated | yaba-scene `src/look/*`, `src/world.js` | `2d4907d` |
| 24a | Help panel still says V is street or aerial | Proposed to Codex (its file `index.html`): change to V camera, B aerial | live handoff | |

## Decisions waiting on Elvis

| Decision | Options |
|---|---|
| Default avatar | Elvis's design; then the character pipeline |
| Phase 1 scope | Flat site first (PRD) or 3D first (the POC) |
