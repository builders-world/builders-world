# Now: where Builders World stands

The one page any agent (Claude, Codex) or teammate reads first to know what is live, what is in flight and who is on
what. **Whoever merges, opens or closes a pull request updates this page in the same change.** Last updated:
12 October 2026, by Claude.

For the full history see [progress.md](progress.md) (everything done, as tables) and [tracker.md](tracker.md) (every
request, its status, files and commits).

## The repository

Everything is in **builders-world/builders-world** (since 12 October 2026). The old repositories (`yaba-scene`,
`open-world-backend`) are frozen copies: do not work in them.

| Folder | What | Checks |
|---|---|---|
| `apps/game` | The game (three.js + Vite). Live at https://buildersworld.vercel.app | `.github/workflows/game.yml` |
| `services/backend` | The Rust gateway (Railway). Its own rules: `services/backend/CLAUDE.md` | `.github/workflows/backend.yml` |
| `cities/<country>/<city>` | Country/city directory (PR #2 merged) | `apps/game/tests/cities.test.js` |
| `docs/` | PRD, world bible, tracker, this page | |

**Deploys:** Vercel builds `main` by itself (root `apps/game`): merging is going live. Every pull request gets a
preview link (behind the Vercel login). Nobody runs `vercel deploy` by hand.

**How to work:** branch from an up-to-date `main` (`feat/`, `fix/`, `chore/`, `docs/`), conventional commits, open a
pull request, let both checks pass. Elvis merges (or Claude, if Elvis has allowed it). Never push code to `main`.
Small docs updates (this page, the tracker) go straight to `main`.

**Local checkouts:** the game is now in `apps/game` of this repository. `apps/world/yaba-scene` in an old local
checkout is the previous repository: do not build on it. Claude works in
`Builders-World.worktrees/game-claude` (a worktree of this repository).

## Live on main

Everything in [progress.md](progress.md), section 1: 157 requests, from the first Yaba scene to the world map, jobs,
airports, licences, road hierarchy and CI. Latest merged: country/city directory (#2, 12 October, `5534872`); the one-repository merge (#1) preceded it.

## Open pull requests

| PR | What | Status | Who |
|---|---|---|---|
| #4 `fix/road-flicker` | Estate paving no longer flickers where it meets a road | Ready, waiting for Elvis to merge | Claude |
| #3 `feat/city-grid` | Nairobi backdrop grid | Superseded by the open world; to be closed | Claude |

## In progress

| Branch | What | Who | Files it owns |
|---|---|---|---|
| `feat/open-world` | Nairobi as one open world: the real street grid, built in 200 m squares round the player (stage 1: bake, streaming, walking, distance detail, clouds) | Claude | `apps/game/scripts/city/`, `apps/game/src/city/`, `apps/game/public/city/`, `cities/kenya/nairobi/city.json` |

Codex is assigned visual art review, QA and finishing. Setup branch: `chore/codex-visual-qa` (documentation PR pending). Its current file scope is `docs/collaboration/codex-visual-qa.md` plus its own entries in this page and the tracker. See [the working agreement](codex-visual-qa.md) and `Builders-World.collab/codex-status.md`. This does not reserve all visual or UI work from Claude. Exact runtime paths are claimed per fix; none are claimed yet.

Read-only coordination check, 12 October: Claude's worktree is also using `feat/road-network`, touching `apps/game/src/main.js`, `apps/game/src/osm.js`, `apps/game/src/world.js`, `apps/game/src/city/roadnet.js` and `apps/game/tests/roadnet.test.js`. Treat those as active Claude paths until its handoff updates them.

Next for Claude: the open world's stages 2 and 3 (traffic and people everywhere; shops and places, map and satnav
city-wide), then Lagos; then recreation (hiking, mountain biking, climbing, paragliding, wingsuit, skydiving, bungee,
beaches, archery, gun range).

## Waiting on people

- **Elvis:** merge #4; archive or delete `yaba-scene`; decisions in the tracker (default avatar, phase 1
  scope, Red Line overpass, cargo highway, phone apps, laptop browser).
- **Ayotomide:** point Railway at this repository (root `services/backend`); add https://buildersworld.vercel.app
  to the gateway's `ALLOWED_ORIGINS`.

## Before you start a task

1. `git pull` on `main`, then `gh pr list -R builders-world/builders-world` and read this page.
2. If your task touches files listed under "Files it owns" above, write to the owner first (here, or in
   `/Volumes/Elvis Obi - Mac Extended/Builders-World.collab/`).
3. Add your branch to "In progress" above, and your request to the tracker.
