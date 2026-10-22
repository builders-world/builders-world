# Security policy

Builders World signs players in with GitHub, shows who is online, carries chat between players, and counts the Efforts
each player has earned. Reports about any of these are very welcome.

## Supported versions

The game is deployed continuously from `main` to [buildersworld.vercel.app](https://buildersworld.vercel.app), and the
backend from `services/backend`. There are no versioned releases, so only `main` and the live deployment receive fixes.

| Version | Supported |
|---|---|
| `main` and the live game | Yes |
| Anything else, including the archived `yaba-scene` and `open-world-backend` repositories | No |

## Reporting a vulnerability

**Please do not open a public issue, discussion or pull request for a security problem.**

Report privately through GitHub: open this repository's **Security** tab and choose **Report a vulnerability**
(GitHub private vulnerability reporting).

Please include:

- What is affected: the game (`apps/game`), the gateway or jobs (`services/backend`), the deployment configuration, or
  the city data pipeline (`apps/game/scripts`), and the commit you looked at.
- Steps to reproduce, and what an attacker needs (a signed-in player? a second account? a malicious page or link?).
- The impact you see, and any suggested fix.

Test against your own local copy where you can (see [Run it locally](README.md#run-it-locally)). Please don't run load
tests or automated scanners against the live game, and use your own accounts only. Don't include other players' data,
GitHub tokens or session links in a report.

## What to expect

These are targets, not guarantees, for a small volunteer team:

- Acknowledgement within 5 working days.
- An initial assessment within 10 working days.
- A fix or mitigation plan agreed with you before any public disclosure. Once a fix is live we aim to publish an
  advisory, crediting you if you wish.

## Scope

In scope:

- **Sign-in and sessions:** the GitHub OAuth flow, how sessions are issued, stored and checked, and anything that lets
  one player act as another.
- **What players send each other:** chat, names, profiles, emotes and community-board notes. The gateway cleans
  everything a browser sends before storing or showing it (`services/backend/crates/domain`); a way round that is in
  scope.
- **The gateway API:** presence, street bins, Efforts, the player's own profile, rate limits and CORS.
- **Secrets:** a credential committed to this repository or exposed by the deployment.

Known and out of scope until the server keeps a ledger:

- **Efforts and wallet balances are kept in the browser today.** A player can change their own balance. This only
  affects that player's own game and is listed under "Still to come" in the [README](README.md#still-to-come).

Also out of scope: problems in OpenStreetMap or the other data sources (report those upstream), the radio stations'
own streams, and social engineering of the team.

## Security design notes

- Sign-in asks GitHub for no scopes, so the game sees only your public profile (username and name). It can't read
  your code or private repositories.
- Secrets live only in the hosting providers (Vercel and Railway). [`services/backend/.env.example`](services/backend/.env.example)
  lists every variable with no real values.
- GitHub Actions workflows run only on pull requests and pushes to `main`, and use no repository secrets.
