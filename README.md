# Builders World

Working title for a browser-based world where builders' verified work shapes their profiles and, in a later phase, their buildings and districts.

## Project status

The shared repository contains the product brief, team information, and proposed directory layout. A newer local prototype lives in `apps/world/yaba-scene`, cloned as a separate nested repository. It now includes the immersive arrivals onboarding and an explorable Yaba district. The prototype and onboarding changes have not been pushed or integrated into this parent repository.

The current local journey is Nigeria arrivals → attendant/role/demo connection → city/district → airplane introduction with avatar editing → starter home. See the [experience brief](docs/design/immersive-onboarding.md) and [standalone visual brief for ChatGPT](BUILDERS_WORLD_VISUAL_BRIEF.md). Real identity connections, country routing, and persistent shared ownership remain unimplemented.

Phase 1 focuses on the flat site: GitHub, Stripe, and Product Hunt connections, profiles, verified metrics, and league leaderboards. The 3D world follows in Phase 2. See the PRD for the full scope and open decisions.

That is the PRD's original phase plan. The 9 October local onboarding prototype is an experience exploration; a revised production release plan has not yet been agreed.

## Product requirements

- [PRD v1.0 — Markdown](docs/product/builders-world-prd.md)
- [PRD v1.0 — HTML](docs/product/exports/builders-world-prd-v1.0.html)
- [PRD v1.0 — PDF](docs/product/exports/builders-world-prd-v1.0.pdf)

## Start here

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

GitHub, Vercel, and Supabase accounts have been checked on Elvis's development machine. This repository is not yet linked to a Builders World deployment or database project.
