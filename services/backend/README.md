# Open World Backend

A Rust workspace shell: the structure, lint rules and CI of the Ares backend, with no product code yet.

## Layout

```
services/   gateway (HTTP API)
crates/     libraries: domain (pure types, error codes, durations)
migrations/ SQL migrations (never renamed: databases record which have run)
deploy/     Dockerfile and docker-compose
docs/       conventions
```

## Quick start

```sh
cp .env.example .env
cargo run -p gateway        # :8080, GET /health
cargo test --workspace
```

Every push is checked with `cargo fmt --check`, `cargo clippy -- -D warnings` and `cargo test`. Read
[docs/conventions.md](docs/conventions.md) before adding code.
