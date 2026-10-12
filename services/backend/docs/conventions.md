# Conventions

How the code is named and laid out, so a path tells you what is in it. These are the same rules as Ares; follow them
as the project grows.

## Layout

- **`services/`** holds programs that run in production; **`crates/`** holds libraries they share; **`tools/`** holds
  programs people run by hand (add it when the first one exists).
- **Folders for audiences or roles, not name prefixes.** `handlers/customer/actions.rs`, not `me_actions.rs`.
- **No `mod.rs`.** A module `foo` is `foo.rs`, with its children in `foo/`. The one exception is
  `tests/common/mod.rs`, which Cargo needs so the file is not built as a test of its own.
- **`migrations/` stays at the root with its file names.** Databases record which migrations have run, so a rename
  breaks upgrades.
- **`domain` sits at the bottom and does no I/O.** Libraries build on it, services sit on top and wire everything together.

## Names

- **Plain nouns.** `balances`, `contacts`, `aliases`. No `-er`, `-manager`, `-engine` or `-aggregator`.
- **A name says what a thing is.** One meaning per name across the workspace.
- **Variables are words.** The `min_ident_chars` lint rejects single-character names; `i`, `j` and `f` (for a
  formatter) are the only exceptions, set in `clippy.toml`.
- **Durations are `Duration`s, built with `seconds`, `minutes`, `hours` and `days`** (`domain::time`), never a bare
  `30 * 60`. The type carries the unit, so names have no `_SECS` suffix. Every timeout, delay and window is a named
  constant that says what it is for.
- **Binaries are named for their role**: `gateway`.

## What the product says

Everything a person reads is in a `copy` module next to the flow that sends it, as `pub(super)` constants and
functions. Logic calls `copy::something(&name)` and never holds the wording, so the text can be reviewed, reworded or
translated in one place.

## JSON on the wire

- **Shapes are structs, not `json!`.** Every response is a `#[derive(Serialize)]` type, so renaming a field is a
  visible, compiler-checked change. Handler-group shapes live in `responses.rs` beside the handlers; shapes shared by
  several groups are in `gateway/src/responses.rs`.
- **Refusals use `domain::error_code::ErrorCode`.** It is the one list of the codes the API can answer with. Add a
  variant there; never pass a string.
- **Provider requests are structs too** (`<provider>/payloads.rs`), each with a test pinning the exact JSON the
  provider receives. Inbound provider payloads are read with `Deserialize` structs whose fields are all optional.
- **Where `json!` is still right:** free-form audit-log detail, JSON Schemas, and test inputs.
- **The web API is pinned by snapshots** (`insta`) in `services/gateway/tests/snapshots`, with ids, timestamps and
  secrets masked. A change to a response fails the test and shows the diff; review the `.snap` diff in the commit.

## SQL

Every statement is written once, as a function with typed parameters and a typed result, in the crate's `queries/`
folder: `src/queries.rs` lists the files and `src/queries/<module>.rs` holds the SQL for that module. A module imports
its own with `use crate::queries::audit as queries;`. Functions are `pub(crate)` and take `impl PgExecutor`, so they
work on a pool or inside a transaction. Use the `sqlx::query!` family so SQL is checked at compile time, commit
`.sqlx/` (build offline by default, see `.cargo/config.toml`), and add a `tools/sqlx-prepare.sh` plus the CI step that
fails when `.sqlx/` is stale. Plain-string SQL is only for statements the macros cannot check, and says why.

## Tests

- **Unit tests** sit next to the code in a `#[cfg(test)] mod tests`.
- **Integration tests** are in the crate's `tests/` directory and are named for what they cover (`tests/health.rs`),
  not for the tool they use.
- **Database-backed tests** use `#[sqlx::test(migrations = "../../migrations")]` and are `#[ignore]`d, so
  `cargo test` needs no services.

## Style

`cargo fmt` (see `rustfmt.toml`: 160 columns, `use_small_heuristics = "Max"`) and `cargo clippy -- -D warnings` must
pass; CI runs both.

## Things that must not change casually

Queue names, lock keys and state key prefixes are live data: renaming one strands whatever is stored under the old
name. Rename the Rust identifier, never the string.
