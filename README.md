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

Each feature is listed in the game's [README](https://github.com/builders-world/yaba-scene#readme). Every request and where it stands is in the [tracker](docs/collaboration/tracker.md).

**Where the code lives**

| Repository | What it is |
|---|---|
| [builders-world/yaba-scene](https://github.com/builders-world/yaba-scene) | The game (three.js + Vite). `main` deploys to Vercel. Nested here at `apps/world/yaba-scene` for local work. |
| [builders-world/open-world-backend](https://github.com/builders-world/open-world-backend) | The Rust gateway: GitHub sign-in, presence, street bins, the Efforts count (Railway). |
| builders-world/builders-world (this repository) | The product, the world bible, design and collaboration docs, assets. |

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
| `apps/` | Flat website, internal admin, later 3D client and presence agent |
| `services/` | API, ingestion, background jobs, later realtime server |
| `packages/` | Shared contracts, domain rules, UI, and platform integrations |
| `database/` | Versioned migrations, synthetic seeds, and access policies |
| `assets/` | Original art sources, references, and intentional export assets |
| `docs/` | Product brief, architecture, design, operations, and collaboration |
| `infra/` | Local and hosted environment configuration |
| `tests/` | Synthetic fixtures, integration, replay, load, and visual checks |
| `tools/` | Development/deployment utilities and local Blender access test |

These are logical areas reserved for the planned architecture. They do not imply separate deployments, an installed framework, or completed features. See the directory guide for phase boundaries.

## Team

| Name | Role |
| --- | --- |
| Elvis Obi | Design Engineer |
| Samson Goddy | Developer |
| Czar Ayotomide | Software Engineer |
| Joshua Ayokhai | Developer |

## Working together

- Start each task on a dedicated branch and open a pull request into `main`.
- Agree task ownership before editing shared areas. For simultaneous local work, use separate Git worktrees.
- Include a summary, validation performed, and any remaining work in each pull request or handoff.
- Coordinate deployments and database migrations with the team before running them.
- Keep credentials out of Git. Document required environment variables in an `.env.example` file with placeholder values when application setup begins.

The game deploys to Vercel (project `buildersworld`) and the backend to Railway (project `yaba-scene`: gateway, jobs, Postgres, Redis). Secrets live only in those providers.
