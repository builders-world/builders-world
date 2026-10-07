# Operations documentation

Use this directory for environment setup, local development, deployment, migration, observability, backup, and incident procedures when those systems exist.

Current verified access and setup history are in the root [project handoff](../../PROJECT_HANDOFF.md). Vercel and Supabase logins have been checked, but this project has no linked deployment or database. The existing Supabase project named Istos Agent is a separate project.

Keep configuration in `infra/` and reviewed schema work in `database/`. Document environment variable names using placeholders; keep secret values in the appropriate credential or platform secret store. The PRD's local, dev, staging, and production environments are planned, not running.

After the project-folder rename, the local root is:

```text
/Volumes/Elvis Obi - Mac Extended/Builders-World
```

Existing terminals, editors, and agent sessions should reopen or select this path. A tool session whose workspace permissions still name the former `Indie World` path may need to be reopened against the new folder.
