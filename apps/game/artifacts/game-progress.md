# Arrivals onboarding — local build

Updated: 9 October 2026.

## Intent and constraints

Playable local onboarding: Nigeria terminal -> attendant and role -> demo account connection -> city/district -> first-person flight with introduction and avatar customization -> starter home -> existing Yaba scene.

Elvis will supply image references and the final default avatar. Art in this build is a procedural prototype. No external asset generation, real OAuth, location lookup, shared backend, career scoring, deployment, or Git push in this pass.

## Design brief

Player promise: arrive somewhere you belong. Feeling: welcoming, curious, unhurried. Primary action: choose an identity and community. Secondary actions: look/walk, customize, watch or skip the introduction. Each encounter resolves one decision and visibly moves the visitor to the next space. No artificial gameplay pressure or failure condition applies to onboarding; invalid input keeps the visitor at the current step with a correction. Local progress survives refresh, and restarting is available.

## Journey contract

The visitor checks in, selects a destination and appearance, and receives a local starter-home preview. Each decision updates one profile; entering a later stage requires the preceding choices. OAuth is explicitly simulated. Returning to an earlier step preserves valid choices; changing role invalidates the former connection, changing city resets the district. No permanent account or land claim is implied.

## Level plan

Terminal: first-person arrival corridor with Nigeria identity, visible attendant desk, movement bounds and direct continue action. Check-in: face the attendant, keep conversation on-screen. Destination: departure board and city/district choices. Flight: seated POV, screen introduction with three chapters, editable avatar preview, skip/pause/replay. Home: generated house reveal and confirmation; Yaba can enter the existing district demo, other cities retain a labeled community preview.

## Ownership

- Lead: state, UI, routing, existing district handoff, QA.
- Scene worker: `src/onboarding/scenes.js` only.
- Brief worker: root `BUILDERS_WORLD_VISUAL_BRIEF.md` and `docs/design/immersive-onboarding.md`.

## Validation planned

Production build; state validation tests; browser journeys for both roles, city changes, refresh/resume, customization, film controls, restart, and Yaba handoff; desktop/mobile screenshots; browser errors and canvas diagnostics. Use journey checks and review captures, defer pixel-diff baselines while visual direction is still exploratory.

## Completed

All journey stages implemented. Three styles/five outfit colors update a shared avatar model in flight, at the starter home, and inside Yaba. Account connections remain explicitly demo-only. Other cities retain distinct, clearly labeled community previews. Seeded home variations and local profile persistence work.

Production build, four state tests, and eight browser tests pass. Production desktop/mobile smoke passes without page/console errors or external requests; full introduction completion/replay and browser Back restoration were exercised. Motion video and screenshots saved. Fixed portrait camera clipping, a negative first-frame delta that could stop resumed flight rendering, keyboard-focus loss, completed-film replay, blocked-storage handoff, and back-forward-cache lifecycle.

No commits, pushes, or deployment. Remaining product work: actual account integrations/country routing, shared backend, final avatar and image references, produced film/audio, more named districts, and matching the reveal house to the district asset kit. Career progression stays outside this pass.
