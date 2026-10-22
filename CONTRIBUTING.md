# Contributing to Builders World

Thanks for wanting to help build the world. You don't need to write code to contribute: people who know a city, play
the game on a cheap phone, or can draw are just as useful as people who write Rust or three.js.

Please read the [code of conduct](CODE_OF_CONDUCT.md) first. It covers this repository and how people treat each other
inside the game.

## Ways to contribute

- **Play it and report what breaks.** [buildersworld.vercel.app](https://buildersworld.vercel.app). Open a
  [bug report](https://github.com/builders-world/builders-world/issues/new/choose) with the city, the area, your device
  and browser, and a screenshot if you can.
- **Tell us about your city.** If you live in one of the live cities and something looks or sounds wrong (a street name,
  a greeting, the food, which side the traffic drives on), open a "City or culture" issue. Local knowledge is what makes
  the world feel real.
- **Add a city to the map.** Every country and city has a folder in [`cities/`](cities). Adding a planned city is a small
  first pull request: [cities/README.md](cities/README.md#adding-a-city) walks through it.
- **Fix a bug or build a feature.** Issues labelled `good first issue` are a good start. For anything bigger, open an
  issue first so we can agree the approach before you spend time on it.
- **Improve the docs.** If something in this guide or the READMEs was unclear when you set up, fix it.
- **Art.** The look is described in the [world bible](docs/design/world-bible.md) (sections 7 and 8). Open an issue
  with a sketch or a render before making assets, so we can agree where they'll be used.

## How the repository is laid out

| Folder | What it is | Stack |
|---|---|---|
| [`apps/game`](apps/game) | The game you play in the browser | three.js, Vite, plain JavaScript |
| [`services/backend`](services/backend) | The gateway (sign-in, presence, bins, Efforts) and scheduled jobs | Rust, PostgreSQL, Redis |
| [`cities`](cities) | One folder per country and per city, with each city's knowledge base | JSON |
| [`docs`](docs) | The product, the world bible, architecture and collaboration notes | Markdown |
| [`assets`](assets) | Blender sources, exported models and reference art | Blender, glTF |

**Read the [world bible](docs/design/world-bible.md) before changing how the world looks or behaves.** It's the source
of truth for scale, streets, level design, art, game logic, UI and writing. If your change disagrees with it, change the
bible in the same pull request and say why.

## Development setup

### The game

You need Node 20 or newer.

```sh
cd apps/game
npm install
npm run dev
```

Open the printed address for the onboarding, or add `?world=1` to go straight into the world. The game plays on its own
without the backend: signed out, or with no server reachable, you get a demo balance and no error. The
[game's README](apps/game/README.md#useful-switches) lists switches for the city, area, time of day, weather and
graphics tier, which make bugs much easier to reproduce.

### The backend (only for online features)

You need Rust (stable) and Docker.

```sh
cd services/backend
cp .env.example .env
docker compose -f deploy/docker-compose.yml up -d postgres redis
cargo run -p gateway      # serves :8080 and applies migrations
```

Then run the game with `npm run dev` as above: Vite proxies `/api` to `:8080`. To try GitHub sign-in locally you need
your own GitHub OAuth app; `.env.example` lists the variables.

## Before you open a pull request

Run the checks for whatever you changed. CI runs the same ones and only for the folders you touched.

**Game or cities** (`apps/game`, `cities`):

```sh
cd apps/game
npm test                          # unit tests, including a check of every file in cities/
npx playwright install chromium   # once per machine
npm run test:browser              # browser tests
npm run build
```

**Backend** (`services/backend`): the full list is in
[services/backend/CLAUDE.md](services/backend/CLAUDE.md#4-pull-requests).

```sh
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace -- --include-ignored    # needs Postgres and Redis up
tools/sqlx-prepare.sh --check                  # after any SQL or migration change
```

## Branches, commits and pull requests

- Branch from an up-to-date `main`. One branch, one purpose: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`,
  `chore/<topic>`, `refactor/<topic>`. Lower case with hyphens.
- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat(game): add rain to Nairobi`,
  `fix(gateway): reject empty chat lines`. Say why in the body, not what.
- Keep pull requests small, ideally under 400 changed lines. Split big work into pieces that each stand alone.
- Fill in the pull request template: what changed, why, how you tested it, and what the reviewer should look at.
- **Anything you can see needs a screenshot or a short clip**, before and after. Say which city, area, time of day and
  graphics tier you used.
- A pull request needs one approval from someone who didn't write it, and green checks. Changes to the backend's
  migrations, sign-in, sessions, rate limits or CORS need a backend maintainer.
- Answer review comments with new commits. Don't force-push over a review in progress.

## Rules that keep the world honest

- **Real places, invented businesses.** Streets, landmarks and buildings come from OpenStreetMap. Hubs, shops, brands
  and people in the world are invented: don't add a real company's name, logo or slogan.
- **Use open data only.** Map data comes from OpenStreetMap and the other sources in [NOTICE](NOTICE). Don't copy from
  Google Maps, Street View or other proprietary maps, even for "just a reference".
- **Respect the place.** Show a city the way people who live there see it. Cultural details (greetings, Pidgin, Sheng,
  names, food) should be checked by someone from that city.
- **Writing.** Plain, warm, short English, no em dashes, no hype. Objectives are verbs and places: "Meet the builders at
  the community board".
- **Performance counts.** Many players are on mid-range Android phones. Say in your pull request if a change adds work
  every frame, and test on the Low graphics tier (`?quality=low`).
- **No secrets in Git.** Ever. If one lands in a commit, tell a maintainer straight away: deleting the commit is not
  enough, the secret has to be rotated.

## Licensing your contribution

By opening a pull request you agree that your contribution is shared under the licence of the folder it changes: Apache
2.0 for code, ODbL 1.0 for the city data in `apps/game/public/city/` and `apps/game/public/data/`, and CC BY 4.0 for the
art in `assets/`. See [Licences](README.md#licences-and-credits).

Only contribute work you have the right to share. If you used an AI tool, say so in the pull request and make sure you
understand and have checked what it wrote.

## Security problems

Don't open a public issue. Follow [SECURITY.md](SECURITY.md).
