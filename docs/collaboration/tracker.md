# Builders World: request tracker

Every request Elvis has made, with where it stands. Updated 9 October 2026, 15:25 WAT, by Claude. Whoever finishes or starts an item updates its row in the same commit.

## Where to see the work

| Copy | Address | What it shows |
|---|---|---|
| Claude's worktree, branch `claude/yaba-graphics` | http://127.0.0.1:5181/?world=1 (onboarding at http://127.0.0.1:5181/) | Every Claude item marked "Local commit" below |
| Codex's app folder, branch `codex/arrivals-onboarding` | http://127.0.0.1:5173/ | Onboarding and the original POC street only. None of Claude's street work is here until the branches are merged. |
| GitHub | builders-world/yaba-scene, builders-world/builders-world | Only the original POC and early docs. Nothing from 9 October has been pushed, by Elvis's instruction. |

## Status key

- **Done, local commit**: built, tested, committed on this Mac. Not on GitHub.
- **Done, in chat**: an answer or plan given in conversation, nothing to commit.
- **In progress**: partly built.
- **Pending**: not started.
- **Waiting on Elvis**: needs a decision or something only Elvis can provide.

## Requests

| # | Request | Status | Where | Commit |
|---|---|---|---|---|
| 1 | Install top game-dev skills for Claude | Done, local: 42 graphics skills linked into Claude; Codex installed 67 | `~/.claude/skills`, `~/.agents/skills` | n/a |
| 2 | A prompt so Codex can find and install skills | Done, in chat | Codex installed them | n/a |
| 3 | Onboarding plan: understanding, open decisions, Phase 1 split | Done, in chat. The D1 to D10 decisions were never opened as GitHub issues | chat | none |
| 4 | List Claude's installed skills so Codex can install them | Done, in chat; Codex installed them | `~/.agents/skills` | n/a |
| 5 | Read the repo and propose the full PRD | Done: superseded by PRD v1.1 (row 8) | | |
| 6 | Upgrade the graphics to the reference images (hybrid look) | Done, local commit | yaba-scene `src/look/*` | `a0684ac` |
| 7 | Explain a SHA | Done, in chat | | |
| 8 | PRD v1.1: images supersede v1.0, community build areas rules | Done, local commit on Claude's PRD branch, not merged into `main` | `claude/prd-v1.1-visual-direction` | `4ef55df` |
| 8a | Regenerate the PRD HTML and PDF exports for v1.1 | Pending | `docs/product/exports/` | |
| 9 | Characters that look like the images | Waiting on Elvis: Tripo or Meshy API key, and whether the image 3 character is the default avatar | | |
| 10 | Real Yaba map data instead of the sample | Done, local commit (OpenStreetMap baked, credit shown) | yaba-scene `public/data/yaba.json` | `ba16910`, `c805718` |
| 11 | Claude and Codex see each other's work in real time | Done, local (shared status folder and hooks) | `Builders-World.collab/` | n/a |
| 12 | Real-time weather and time of day | Done, local commit | yaba-scene `src/look/weather.js`, `sun.js` | `9550f58` |
| 12a | Each district shows its own real weather | Done, local commit | same | `f946a5e` |
| 13 | Game UI from the references: phone, map, inventory, controls guide | Done, local commit (Tab phone, M map, I bag, first-visit guide, street name on minimap) | yaba-scene `src/look/menus.js` | `4f20f93` |
| 13a | Character creator in the reference style | Pending: specified in the world bible 7.4; lives in Codex's onboarding code | Codex | |
| 13b | Real-world gadgets tied to the bag | Pending: decision open | | |
| 14 | World bible: single source of truth for building the world | Done, local commit on `main` (plus AGENTS.md and CLAUDE.md pointers) | `docs/design/world-bible.md` | `e525724` |
| 15 | Integrate Codex's GLB asset kit | Done, local commit; handoff updated | yaba-scene `src/look/kit.js` | `a7306e2`, `9edca1e` |
| 15a | Re-sync Codex's expanded kit | Pending | Codex commit `56b4376` | |
| 16 | GPS-style route: pick a destination on the map, trail follows the streets | Done, local commit | yaba-scene `src/look/nav.js` | `98ddf5f` |
| 17 | Realistic streets: no buildings on roads, streetlights everywhere, proper planning | Done, local commit; junction corners fixed | yaba-scene `src/look/streets.js` | `98ddf5f`, `f946a5e` |
| 18 | Hire vehicles: danfo, keke, taxi; players choose passenger or drive | In progress: written, not wired into the game yet | yaba-scene `src/look/rides.js` | `f946a5e` (file only) |
| 19 | Birds, cats and planes | Done, local commit | yaba-scene `src/look/life.js` | `f946a5e` |
| 20 | More tech places: hubs, shared workspaces, studios | Pending | | |
| 21 | Enterable workspaces: walk around, cafeteria, sit at a desk, use a computer | Pending | | |
| 22 | Isometric city sheets: click a city to enter it | Pending | | |
| 23 | This tracker | Done, local commit | `docs/collaboration/tracker.md` | this commit |

## Decisions waiting on Elvis

| Decision | Options |
|---|---|
| Push to GitHub | Keep everything local, or push the branches and open draft pull requests |
| One address for the game | Keep two copies (5173 and 5181), or merge `claude/yaba-graphics` into the app so there is one |
| Default avatar | Elvis's design; then the character pipeline |
| Phase 1 scope | Flat site first (PRD) or 3D first (the POC) |
