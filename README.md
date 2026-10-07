# Builders World

Working title for a browser-based world where builders' verified work shapes their profiles and, in a later phase, their buildings and districts.

## Project status

Planning and repository setup. This repository contains the product brief and team information; application implementation has not started here yet.

Phase 1 focuses on the flat site: GitHub, Stripe, and Product Hunt connections, profiles, verified metrics, and league leaderboards. The 3D world follows in Phase 2. See the PRD for the full scope and open decisions.

## Product requirements

- [PRD v1.0 — Markdown](builders-world-prd.md)
- [PRD v1.0 — HTML](<Builders World PRD v1.0.html>)
- [PRD v1.0 — PDF](builders-world-prd.pdf)

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
