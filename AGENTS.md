# Instructions for every agent working on Builders World

1. **Read [docs/collaboration/NOW.md](docs/collaboration/NOW.md) first.** It says what is live, which pull requests and branches are open, who owns which files, and what to do before starting. Keep it up to date when you open, merge or close a pull request.
2. Read `docs/design/world-bible.md` before any task. It is the single source of truth for how the world is built: real-world sources, scale and street engineering, level design, art, shaders, game logic, UI, writing and performance. The PRD (`docs/product/builders-world-prd.md`) decides what the product is; the bible decides how it is built.
3. Everything is in this one repository: the game in `apps/game`, the backend in `services/backend` (with its own rules in `services/backend/CLAUDE.md`), countries and cities in `cities/`. Branch, pull request, both checks green; never push code to `main`. Vercel puts `main` live by itself.
4. Coordinate through `/Volumes/Elvis Obi - Mac Extended/Builders-World.collab/` and the tracker (`docs/collaboration/tracker.md`). Do not edit another agent's working directory or files it owns without writing the proposal there first.
5. UI text: plain, warm English, no em dashes. Keep credentials out of Git.
