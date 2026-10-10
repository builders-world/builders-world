#!/usr/bin/env bash
# Regenerates .sqlx/ (the offline metadata `query!` is checked against). Run after changing any SQL or migration.
#   tools/sqlx-prepare.sh          rewrite .sqlx/
#   tools/sqlx-prepare.sh --check  fail if .sqlx/ is stale (CI)
# Needs a Postgres reachable at DATABASE_URL. The default is a throwaway database beside the one you develop in
# (open_world_prepare, on the Postgres from deploy/docker-compose.yml), so your own data is never touched.
set -euo pipefail
cd "$(dirname "$0")/.."

export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/open_world_prepare}"
export SQLX_OFFLINE=false

sqlx database create
sqlx migrate run --source migrations

if [[ "${1:-}" == "--check" ]]; then
    cargo sqlx prepare --workspace --check -- --all-targets
else
    cargo sqlx prepare --workspace -- --all-targets
fi
