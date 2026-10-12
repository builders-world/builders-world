# Builders World

A living, browser-based world for developers and designers, set in real African cities, where your real work is your currency: every commit you push on GitHub becomes **Efforts** to spend in the world. You get a home, work from hubs and cafés, meet the builders who are online, and improve your neighbourhood together.

**Play it:** [buildersworld.vercel.app](https://buildersworld.vercel.app/) · [straight into the world](https://buildersworld.vercel.app/?world=1)

## Project status

The game is live and growing. As of 11 October 2026 it has:

- **Six cities, 26 areas**, rebuilt from OpenStreetMap: Lagos, Abuja, Port Harcourt, Akwa Ibom, Nairobi and Accra.
- **A living world:** real time of day and live weather, residents with lives, traffic that follows lanes and road rules, railways, airports and landmarks.
- **Your home, wardrobe, bag, phone and wallet.**
- **Ways to get around:** bikes, boards, skates, hired rides (driving needs a licence) and flights. Flying abroad needs a passport.
- **Hubs and cafés with Wi-Fi friction**, community building, and sport played by the real rules.
- **GitHub sign-in with other players live.**

Each feature is listed in the game's [README](apps/game/README.md). Every request and where it stands is in the [tracker](docs/collaboration/tracker.md).

**Where the code lives**

Everything is in this one repository, with the full history of each part (12 October 2026: the game and the backend
were brought in from their own repositories, which are now read-only archives).

| Folder | What it is | Checks |
|---|---|---|
| [`apps/game`](apps/game) | The game (three.js + Vite). Deploys to Vercel. Was `builders-world/yaba-scene`. | `.github/workflows/game.yml`: tests, build, browser tests |
| [`services/backend`](services/backend) | The Rust gateway: GitHub sign-in, presence, street bins, the Efforts count. Deploys to Railway. Was `builders-world/open-world-backend`. Its own rules are in [its CLAUDE.md](services/backend/CLAUDE.md). | `.github/workflows/backend.yml`: fmt, clippy, tests, sqlx |
| [`cities`](cities) | Every country and city, one folder each (`cities/<country>/<city>/`): 84 countries and 135 tech cities, six of them live. The game reads them for the world map, and each has a knowledge base ([KNOWLEDGE.md](cities/KNOWLEDGE.md)): how people there are named, the languages they speak on the street, what they say, eat and talk about, so a Nairobi resident speaks Swahili, English or Sheng and is called Wanjiku or Otieno, not Kemi. | the game's tests check every file |
| `docs/`, `assets/` | The product, the world bible, design and collaboration docs, art. | |

Each check runs only when its folder changes. [CODEOWNERS](.github/CODEOWNERS) says who reviews what: the backend needs
Ayotomide. Each city can have its own maintainers too ([cities/README.md](cities/README.md)).

The PRD's original plan put a flat site first (Phase 1) and the 3D world second. In practice the 3D world came first, and the release plan is still to be agreed (see Decisions in the tracker).

**How it's built:** the [world bible](docs/design/world-bible.md) is the source of truth for building the world (real-world sources, scale, street engineering, level design, art, game logic, UI, performance). The PRD decides what the product is; the bible decides how it is built.

## Product requirements

- [PRD v1.1, Markdown](docs/product/builders-world-prd.md) (the images in `assets/reference/` set the visual direction)
- [PRD v1.1, HTML](docs/product/exports/builders-world-prd-v1.1.html) · [PDF](docs/product/exports/builders-world-prd-v1.1.pdf)
- [PRD v1.0, HTML](docs/product/exports/builders-world-prd-v1.0.html) · [PDF](docs/product/exports/builders-world-prd-v1.0.pdf) (superseded)
- [Immersive onboarding brief](docs/design/immersive-onboarding.md)

## Start here

- [World bible](docs/design/world-bible.md)
- [Request tracker](docs/collaboration/tracker.md)
- [Project handoff for Claude and the team](PROJECT_HANDOFF.md)
- [Directory layout and architecture boundaries](docs/architecture/repository-layout.md)
- [Collaboration workflow](docs/collaboration/README.md)
- [Technical decision records](docs/decisions/README.md)

Repository: [builders-world/builders-world](https://github.com/builders-world/builders-world), private and owned by the `builders-world` organization.

## Folder layout

| Directory | Intended contents |
| --- | --- |
| `apps/` | The game (`apps/game`); later the flat website and the admin |
| `services/` | The backend (`services/backend`: gateway and jobs) |
| `cities/` | One folder per country, one per city inside it |
| `packages/` | Shared contracts, domain rules, UI, and platform integrations |
| `database/` | Versioned migrations, synthetic seeds, and access policies |
| `assets/` | Original art sources, references, and intentional export assets |
| `docs/` | Product brief, architecture, design, operations, and collaboration |
| `infra/` | Local and hosted environment configuration |
| `tests/` | Synthetic fixtures, integration, replay, load, and visual checks |
| `tools/` | Development/deployment utilities and local Blender access test |

Apart from `apps/game` and `services/backend`, these are logical areas reserved for the planned architecture. They do not imply separate deployments, an installed framework, or completed features. See the directory guide for phase boundaries.

## Team

| Name | Role |
| --- | --- |
| Elvis Obi | Design Engineer |
| Samson Goddy | Developer |
| Czar Ayotomide | Software Engineer |
| Joshua Ayokhai | Developer |

## Working together

- Start each task on a dedicated branch and open a pull request into `main`. Nobody pushes code to `main` directly. A change to `services/backend` follows the backend's own rules (one approval from someone who did not write it).
- Agree task ownership before editing shared areas. For simultaneous local work, use separate Git worktrees.
- Include a summary, validation performed, and any remaining work in each pull request or handoff.
- Coordinate deployments and database migrations with the team before running them.
- Keep credentials out of Git. Document required environment variables in an `.env.example` file with placeholder values when application setup begins.

The game deploys to Vercel (project `buildersworld`) and the backend to Railway (project `yaba-scene`: gateway, jobs, Postgres, Redis). Secrets live only in those providers.
