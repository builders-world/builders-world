# Operations documentation

Use this directory for environment setup, local development, deployment, migration, observability, backup, and incident procedures when those systems exist.

The collaborator-facing [agent-skills installation guide](./agent-skills-installation.md) explains how to install the shared Codex, Claude, Three.js, Colyseus, LiveKit, Supabase, and Vercel skills without overwriting existing skills or running plugin installers. The [agent-skills audit](./agent-skills-audit-2026-10-07.md) records the pinned source commits and provenance.

Current verified access and setup history are in the root [project handoff](../../PROJECT_HANDOFF.md). Vercel and Supabase logins have been checked, but this project has no linked deployment or database. The one existing Supabase project in the account belongs to a separate product.

Keep configuration in `infra/` and reviewed schema work in `database/`. Document environment variable names using placeholders; keep secret values in the appropriate credential or platform secret store. The PRD's local, dev, staging, and production environments are planned, not running.

After the project-folder rename, the local root is:

```text
Builders-World/  (the main checkout; worktrees live beside it in Builders-World.worktrees/)
```

Existing terminals, editors, and agent sessions should reopen or select this path. A tool session whose workspace permissions still name the former `Indie World` path may need to be reopened against the new folder.
