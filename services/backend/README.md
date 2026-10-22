# Open World Backend

The server side of [Builders World](../../README.md): who is in the world right now, what the
street has been given, and what a person has shipped. A Rust workspace in the shape of the Ares backend, on PostgreSQL and Redis.

## Layout

```
services/   gateway (the game's HTTP API), jobs (scheduled work)
crates/     libraries: domain (pure types and the rules for reading what a browser sends), store (Postgres), queue (Redis), integrations (GitHub)
tools/      programs run by hand (sqlx-prepare.sh)
migrations/ SQL migrations (never renamed: databases record which have run)
deploy/     Dockerfiles and docker-compose
docs/       conventions, the API and the data
```

## Where to look

| I want to... | Read |
|---|---|
| Call the API from the game | [docs/api.md](docs/api.md) |
| Know the tables and why they are shaped so | [docs/data-model.md](docs/data-model.md) |
| Follow the naming and layout conventions | [docs/conventions.md](docs/conventions.md) |

## Quick start

```sh
cp .env.example .env
docker compose -f deploy/docker-compose.yml up -d postgres redis
cargo run -p gateway        # :8080 (applies migrations)
cargo run -p jobs
cargo test --workspace      # no services needed
DATABASE_URL=postgres://... REDIS_URL=redis://... cargo test --workspace -- --include-ignored   # the Postgres and Redis tests
```

To run the game against it, run `npm run dev` in [`apps/game`](../../apps/game): Vite proxies `/api` to `:8080`.

Every push is checked with `cargo fmt --check`, `cargo clippy -- -D warnings` and `cargo test`. After changing SQL run
`tools/sqlx-prepare.sh` and commit `.sqlx/`. Read [docs/conventions.md](docs/conventions.md) before adding code.
