# Now: where Builders World stands

The one page any agent (Claude, Codex) or teammate reads first to know what is live, what is in flight and who is on
what. **Whoever merges, opens or closes a pull request updates this page in the same change.** Last updated:
22 October 2026, by Claude.

For the full history see [progress.md](progress.md) (everything done, as tables) and [tracker.md](tracker.md) (every
request, its status, files and commits).

## The repository

Everything is in **builders-world/builders-world** (since 12 October 2026), which is **public and open source since
22 October 2026** (#31): Apache 2.0 code, ODbL city data, CC BY 4.0 art. The old repositories (`yaba-scene`,
`open-world-backend`) are private, frozen copies: do not work in them.

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
airports, licences, road hierarchy and CI. Merged on 12 October: the one-repository merge (#1), countries and cities (#2), the road network (#5), the city
knowledge base (#7) and **open worlds for six cities (#8)**: Lagos, Nairobi, Abuja, Port Harcourt, Accra and Uyo, each
whole city streamed round the player, with traffic, people, places to go into and rides across the city.

## Open pull requests

| PR | What | Status | Who |
|---|---|---|---|
| #6 `chore/codex-visual-qa` | How Codex reviews, tests and finishes alongside Claude | Docs only; Vercel's preview failed to read git (not the code). Waiting for Elvis | Codex |
| `docs/public-readme` | A public README with screenshots of the world, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue and pull request templates | Docs only. Waiting for Elvis | Claude |

## In progress (branches not yet in a pull request)

| Branch | What | Who | Files it owns |
|---|---|---|---|
| `feat/recreation` | Recreation with guides, lessons and fees: skydiving over the open city first, then archery; later hiking, mountain biking, climbing, paragliding, wingsuit, bungee, beaches, gun range, and a photo safari in Kenya instead of hunting | Claude | `apps/game/src/look/recreation/` (new) |

The open world (`apps/game/src/city/`, `scripts/city/`, `public/city/`) is on main. Its city data ships with the
deployment; a city is baked (`scripts/city/prepare.sh`, `bake.mjs`) when it goes live. The other 129 cities are
"planned". No paid storage: Elvis's decision, 12 October.

## Waiting on people

- **Elvis:** archive `yaba-scene` and `open-world-backend`; switch on branch protection for `main` and private vulnerability
  reporting (Settings, Code security); try the open cities on a phone; decisions in the tracker (default avatar, phase 1
  scope, Red Line overpass, cargo highway, phone apps, laptop browser).
- **Ayotomide:** the repository went public under Apache 2.0 on 22 October with his commit email visible (Elvis's
  decision, #31); please confirm you're happy with that. Point Railway at this repository (root `services/backend`); add https://buildersworld.vercel.app
  to the gateway's `ALLOWED_ORIGINS`.

## Before you start a task

1. `git pull` on `main`, then `gh pr list -R builders-world/builders-world` and read this page.
2. If your task touches files listed under "Files it owns" above, write to the owner first (here, or in
   `Builders-World.collab/` (the folder beside the main checkout)).
3. Add your branch to "In progress" above, and your request to the tracker.
