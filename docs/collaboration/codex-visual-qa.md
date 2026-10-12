# Codex: visual art, QA and finishing

Updated: 12 October 2026. Assigned by Elvis. This is a working agreement, not a claim that the game passed QA.

## Role

Claude continues feature development. Codex reviews the player experience, reports reproducible bugs and supplies small, tested finishing patches. Art, UI and QA remain shared disciplines: this role does not prevent Claude from improving them. Only explicitly claimed paths for an active patch are reserved temporarily.

The world bible determines the art and engineering contracts; the PRD determines the product. Current direction: soft clay forms, a warm palette, real time/weather and paper-and-ink UI. The earlier blue-hour references are atmospheric references, not the default grade. User-visible text has no em dashes. Default avatar approval remains with Elvis.

## Isolation and discovery

| Item | Location or rule |
|---|---|
| Worktree | `/Volumes/Elvis Obi - Mac Extended/Builders-World.worktrees/codex-visual-qa` |
| Setup branch | `chore/codex-visual-qa` |
| Starting commit | `5534872`, main after PR #2 merged |
| Current scope | This document, the Codex entry in NOW.md and tracker row QA-1; no runtime claims |
| Immediate local status | `/Volumes/Elvis Obi - Mac Extended/Builders-World.collab/codex-status.md` |
| Shared published status | `docs/collaboration/NOW.md` and `docs/collaboration/tracker.md` |
| Runtime | `apps/game`; never the frozen `apps/world/yaba-scene` copy |
| Local preview | Reserve port 5191 with strict-port mode after checking availability; use another free port if occupied. No server started by this setup. |
| Evidence | Store captures locally, outside Git by default, under `Builders-World.collab/codex-evidence/<sha>/<case>/`; do not publish images or recordings without Elvis's approval. |

Dependencies, build output and Playwright artifacts stay in this worktree. Never reuse Claude's mutable node_modules, stop Claude's server, change its port or browser session, or edit its working directory. Use a separate browser profile/context so onboarding saves and logins do not contaminate one another. Avoid production writes while testing.

## Working while Claude pushes

1. At task start, fetch origin, read NOW.md and both agents' local status, list open PRs and inspect branch diffs. Treat missing or contradictory status as unknown ownership, not an invitation to edit.
2. Choose the exact revision to test. Normally use current main; for a Claude feature, use its published head SHA in a dedicated review worktree. Record the SHA and do not update the checkout mid-test.
3. Record the task, exact paths, branch, baseline and intended evidence in the local note before making a patch. Add the task to NOW.md and the tracker on the patch branch.
4. If Claude is changing the same files, post the proposal in the shared folder first. Agree whether Claude applies the fix or Codex waits and follows with a patch. Continue independent QA while waiting. Separate worktrees prevent working-copy interference; they do not prevent merge conflicts.
5. Create each fix on a small `fix/codex-*` or `chore/codex-*` branch from refreshed main. For a deliberately dependent change, name the dependency explicitly and wait or stack only with coordination.
6. Before submission, fetch again and compare both main changes and active branch paths. Bring current main into Codex's clean branch, resolve conflicts only there and rerun checks affected by the update. On a published review branch, prefer merging main rather than rewriting shared history.
7. Open a PR with the user-visible problem, before/after evidence, tested SHA, validation and remaining limitations. Update NOW.md and the tracker with its link in that same PR. A green result applies to its tested revision, not to a later push.
8. Refresh status at task start, findings, proposed fix, review-ready and completion. Close the loop after a merge by recording what revision was verified. Do not merge or deploy without Elvis's authorization; Vercel deploys main automatically.

These are checkpoints during active work, not an always-running monitor. Claude must read the shared file at its own checkpoints. Neither agent can infer the other's conversation from Git.

## Known active work to avoid

NOW.md reserves the open-world bake, streaming and Nairobi data for Claude: `apps/game/scripts/city/`, `apps/game/src/city/`, `apps/game/public/city/`, `cities/kenya/nairobi/city.json`.

Read-only inspection on 12 October also found Claude on `feat/road-network`, with work in `apps/game/src/main.js`, `apps/game/src/osm.js`, `apps/game/src/world.js`, `apps/game/src/city/roadnet.js` and `apps/game/tests/roadnet.test.js`. Avoid these until the current handoff says otherwise. This observation supplements NOW.md; it does not reassign Claude's work.

## Installed Game Studio workflows

Plugin: `game-studio@openai-curated-remote`, local version 0.1.2.

| Skill | Application here |
|---|---|
| `game-playtest` | Playwright/browser checks, first playable screen, controls, transitions, resize, screenshots, console/load errors and findings in severity order |
| `game-ui-frontend` | Paper-and-ink readability, HUD obstruction, menu/camera input boundaries, keyboard/touch controls and reduced motion |
| `web-3d-asset-pipeline` | GLB/glTF export hygiene, scale, pivots, materials, textures, collision proxies, LODs and measured delivery cost |
| `three-webgl-game` | Specialist runtime guidance for a scoped Three.js fix when needed; retain the existing Three.js/Vite stack |

The plugin supplies workflows, not a guarantee of AAA art or exact image-to-model reconstruction. An asset passing structural validation does not mean it matches the art direction. Use the other installed lighting, camera, animation and performance skills only when a concrete finding requires them.

## First QA pass

Start with one reproducible end-to-end route, then expand based on risk:

| Area | Review |
|---|---|
| Onboarding | First visit, country/city/district choice, avatar preview, cancel/back, saved state, arrival into the correct world; label mocks or unavailable integrations honestly |
| Street and home | Spawn readability, scale, doors, camera clipping, collision, navigation, menu interactions and return from interiors |
| Visual art | Silhouettes, consistent clay palette/materials, grounded props, readable signs, seams, flicker, wet surfaces, loading pop-in and distance detail |
| HUD and input | Phone, map, bag and wardrobe; overlapping panels, Escape, keyboard focus, touch, camera input under menus |
| Conditions | Desktop 1440x900 and phone 390x844; 10:00, 18:15, 19:00 and 22:00; clear/rain; low/high tier and reduced motion where relevant |
| Assets | GLTFLoader load, named parts, metres/Y-up, ground contact, collision/sockets, triangle/material/texture budget and a 1.8 m scale reference |
| Performance | Record device/browser, quality and resolution, frame time, draw calls, visible triangles and load stalls. Emulated mobile layout is not evidence of real Android performance. |

Use the repository's tests and build for relevant code changes. WebGL visual claims require screenshots; DOM-only tests cannot prove lighting or model quality. Prefer profiling to speculative optimization. UI and runtime fixes need the affected interaction retested. New art needs Elvis's preview approval before integration; existing user authorization covers routine bug fixes within the agreed scope.

## Finding format and completion

Every issue records: ID, severity, observed versus expected behavior, reproduction steps, branch/SHA, URL, viewport/device, graphics/weather/time, evidence path, suspected owner, proposed fix and retest result. Distinguish observed facts from suspected causes. Mark tests as passed, failed, blocked or not run.

Fix blockers and crashes first, then broken interactions or severe visual regressions, then polish. A finishing patch is complete only when its acceptance case is verified, relevant checks pass and the owner can find the handoff. Never claim a screenshot review proves full-game stability.

## Current checkpoint

Documentation review: [PR #6](https://github.com/builders-world/builders-world/pull/6). The setup branch incorporates main at `c4c2366`, preserving Claude's latest road-network and open-world updates.

Setup only. No game code, model or image has changed. No browser test, performance measurement or new asset approval has been completed in this task. First deliverable after this setup: an evidence-backed baseline report from an explicitly recorded revision, with a short ranked fix list.
