# Now: where Builders World stands

The one page any agent (Claude, Codex) or teammate reads first to know what is live, what is in flight and who is on
what. **Whoever merges, opens or closes a pull request updates this page in the same change.** Last updated:
12 October 2026 (afternoon), by Claude.

For the full history see [progress.md](progress.md) (everything done, as tables) and [tracker.md](tracker.md) (every
request, its status, files and commits).

## The repository

Everything is in **builders-world/builders-world** (since 12 October 2026). The old repositories (`yaba-scene`,
`open-world-backend`) are frozen copies: do not work in them.

| Folder | What | Checks |
|---|---|---|
| `apps/game` | The game (three.js + Vite). Live at https://buildersworld.vercel.app | `.github/workflows/game.yml` |
| `services/backend` | The Rust gateway (Railway). Its own rules: `services/backend/CLAUDE.md` | `.github/workflows/backend.yml` |
| `cities/<country>/<city>` | Every country and city (after PR #2 merges) | `apps/game/tests/cities.test.js` |
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
airports, licences, road hierarchy and CI. Latest merged: the one-repository merge (#1, 12 October).

## Open pull requests

| PR | What | Status | Who |
|---|---|---|---|
| #2 `feat/cities-by-country` | `cities/<country>/<city>/`: 84 countries, 135 tech cities, on the world map | Ready, waiting for Elvis to merge (first) | Claude |
| #5 `feat/road-network` | Every district's streets as a road network after Cities: Skylines: nodes and segments, a profile per class, clean junctions with curved kerbs, stop lines, zebras, roundabout islands | Ready, checks green, waiting for Elvis to merge | Claude |
| #4 `fix/road-flicker` | Estate paving flicker | **Superseded by #5**: can be closed | Claude |
| #3 `feat/city-grid` | Nairobi backdrop grid | Superseded by the open world; to be closed | Claude |

## In progress (branches not yet in a pull request)

| Branch | What | Who | Files it owns |
|---|---|---|---|
| `feat/open-world` | Nairobi as one open world: the real street grid, built in 200 m squares round the player. Done: the bake (52,000 buildings, 22,158 segments, 12,280 junctions, 68 roundabouts, the elevated expressway), streaming in workers at four levels of detail, walking out of the district into the city, windows by shader, clay clouds from altitude. Next: polish and speed for phones, then traffic and people across the city | Claude | `apps/game/scripts/city/`, `apps/game/src/city/` (roadnet.js shared with #5), `apps/game/public/city/`, `cities/kenya/nairobi/city.json` |

Next for Claude: the open world's stages 2 and 3 (traffic and people everywhere; shops and places, map and satnav
city-wide), then Lagos; then recreation (hiking, mountain biking, climbing, paragliding, wingsuit, skydiving, bungee,
beaches, archery, gun range).

## Waiting on people

- **Elvis:** merge #2 and #5 (close #4); archive or delete `yaba-scene`; decisions in the tracker (default avatar, phase 1
  scope, Red Line overpass, cargo highway, phone apps, laptop browser).
- **Ayotomide:** point Railway at this repository (root `services/backend`); add https://buildersworld.vercel.app
  to the gateway's `ALLOWED_ORIGINS`.

## Before you start a task

1. `git pull` on `main`, then `gh pr list -R builders-world/builders-world` and read this page.
2. If your task touches files listed under "Files it owns" above, write to the owner first (here, or in
   `/Volumes/Elvis Obi - Mac Extended/Builders-World.collab/`).
3. Add your branch to "In progress" above, and your request to the tracker.
