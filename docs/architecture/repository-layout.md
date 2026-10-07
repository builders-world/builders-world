# Repository layout

This is a proposed layout derived from [PRD v1.0](../product/builders-world-prd.md). It organizes the work before implementation. A directory name does not commit the team to a framework, package manager, separate deployment, or cloud provider.

Start with Phase 1. The later world and presence areas are reserved so assets and code have clear homes when those phases begin. `.gitkeep` files preserve otherwise empty directories in Git; remove them as real files are added.

```text
Builders-World/
├── README.md
├── PROJECT_HANDOFF.md
├── apps/
│   ├── web/                  # Phase 1 profiles, settings, leaderboards
│   ├── admin/                # Internal operations and review interface
│   ├── world/                # Later three.js client and HUD
│   └── presence-agent/       # Timing remains an open PRD decision
├── services/
│   ├── api/                  # Application endpoints and auth orchestration
│   ├── ingestion/            # Webhook validation, enqueueing, normalization
│   ├── jobs/                 # Scoring, polling, integrity, retention, world builds
│   └── realtime/             # Later room, presence, and voice coordination
├── packages/
│   ├── contracts/            # Shared API, event, and manifest schemas
│   ├── domain/               # Framework-independent product rules
│   ├── ui/                   # Shared accessible UI and design tokens
│   └── integrations/
│       ├── github/
│       ├── stripe/
│       └── product-hunt/
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── policies/
├── assets/
│   ├── source/blender/building-kit/
│   ├── reference/
│   └── exports/
│       ├── models/
│       └── renders/
├── docs/
│   ├── product/
│   │   ├── builders-world-prd.md
│   │   └── exports/
│   │       ├── builders-world-prd-v1.0.html
│   │       └── builders-world-prd-v1.0.pdf
│   ├── architecture/
│   ├── decisions/
│   ├── design/
│   ├── operations/
│   └── collaboration/
├── infra/
│   ├── local/
│   └── environments/
│       ├── dev/
│       ├── staging/
│       └── production/
├── tests/
│   ├── fixtures/
│   │   ├── github/
│   │   ├── stripe/
│   │   └── product-hunt/
│   ├── integration/
│   ├── replay/
│   ├── load/
│   └── visual/
└── tools/
    ├── blender/access-test/  # Existing local test, ignored by Git
    ├── development/
    └── deployment/
```

## Boundaries

- **Apps** own user interfaces. Keep credentials and provider secrets out of browser code. The exact frontend framework is undecided.
- **Services** own server entry points and workloads. Related areas may share a runtime; these folders are not a requirement to operate four independent services. The PRD's scheduled jobs belong under `services/jobs/` as they are implemented.
- **Shared packages** hold reusable schemas, product rules, UI, and provider adapters. Create package manifests and choose a workspace tool only when the stack is selected.
- **Database** holds reviewed schema changes, synthetic development data, and database access policies. Postgres is in the PRD; a Builders World Supabase project has not been provisioned or linked. Adapt the migration layout to the chosen tool before adding migrations, keeping one authoritative migration history.
- **Assets** separates editable sources from deliberate exports. Keep source `.blend` files under `source/`, and approved browser models or reference renders under `exports/`. The access-test cube is a tooling check and stays under `tools/`. Agree kit versioning and handling of large binaries before the production kit grows.
- **Infrastructure** holds configuration, not secrets. The environment folders are empty reservations, not deployed environments.
- **Tests** separates fixtures and cross-system checks. Put unit tests beside their implementation where the selected toolchain expects them. No test runner or passing test suite exists yet.
- **Docs** records product requirements, decisions, design details, operating instructions, and team context. The root handoff stays easy for Elvis and Claude to find.

The PRD exports and the existing Blender test were moved without changing their contents. Their directory names are organizational; they do not indicate a new PRD revision or a newly generated render.
