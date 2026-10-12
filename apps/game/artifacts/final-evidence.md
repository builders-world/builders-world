# Builders World onboarding — first local playable pass

Verified 9 October 2026. Local branch: `codex/arrivals-onboarding`. No commit, push, or deployment performed.

## Result

The default page at `http://127.0.0.1:5173/` is now the onboarding experience. It supports Nigeria arrivals, first-person terminal movement, the attendant encounter, name and role, explicit demo identity connection, four destinations, district/community selection, a first-person airplane, an animated introduction with simultaneous avatar editing, and a seeded starter-home reveal.

Lagos → Yaba continues into the existing district with the chosen avatar and name. Its starter plot has no fabricated verification or work metrics. Abuja, Uyo, and Port Harcourt remain clearly labeled community previews. Browser storage preserves the journey; the home is not a server-side or permanent claim.

## Validation performed

| Check | Result |
| --- | --- |
| `npm run build` | Passed; 29 modules transformed |
| `npm test` | 4 state tests passed |
| `npm run test:browser` | 8 checks passed across Chromium desktop 1440×900 and mobile emulation 390×844 |
| Production browser smoke at port 4173 | Passed desktop and mobile; zero captured page/console errors, zero external requests during the tested onboarding/Yaba handoff |
| Introduction end and restart | Waited for completion, pressed Play again, confirmed playback restarted at chapter one |
| Browser Back from Yaba | Returned to onboarding, edited the avatar, and captured the restored rendered scene |
| Final layout review | Reviewed terminal, attendant, flight, home, and phone flight/home captures; corrected portrait framing and compacted phone home actions |
| `git diff --check` | Passed |

The browser suite exercises both roles, all destinations, changed-role connection invalidation, required district selection, pause/play/replay, live outfit changes, refresh/resume, district identity, restart, malformed storage, blocked storage, reduced motion, and country-preview messaging. Phone testing is browser emulation, not physical-device performance certification.

The final production smoke followed a small CSS refinement after the full browser suite: selected-style borders and a compact mobile home layout. It verified those layouts and the full built journey.

## Captures

- [Terminal](final-terminal-desktop.png)
- [Arrivals attendant](final-attendant-desktop.png)
- [Destinations](final-destination-desktop.png)
- [Flight and avatar — desktop](final-flight-desktop.png)
- [Flight and avatar — mobile](final-flight-mobile.png)
- [Home — desktop](final-home-desktop.png)
- [Home — mobile](final-home-mobile.png)
- [After browser Back](final-back-restored.png)
- [Motion recording](onboarding-motion.webm)
- [Timed flight frame 1](flight-motion-01.png) and [frame 2](flight-motion-02.png)
- [Production smoke results](production-smoke.json)
- [Renderer measurements](render-metrics.json)

Motion evidence covers terminal-to-attendant travel, introduction playback, live outfit changes, chapter changes, landing, and navigation back. Visual review used timed screenshots; the video is saved for replay. Avatar body idle animation is intentionally absent. Reduced motion snaps camera transitions and starts the introduction paused.

## Measured rendering

Representative fresh desktop loads recorded 46 draws / 18,570 triangles in the terminal; 31 draws / 28,758 triangles in the flight with jacket preview; 59 draws / 31,318 triangles at the home. Counts depend on visible stage and outfit. No frame-time or physical-device performance claim is made.

Architecture is batched by material. Film texture uploads are throttled and only occur when content changes. Renderer pixel ratio is capped at 2 on desktop and 1.5 on narrow layouts. The generated build's Three.js/shared-avatar chunk is approximately 517 kB minified / 132 kB gzip, triggering Vite's 500 kB warning. The project retains its existing Vite 5 dependency; this pass is not a dependency-upgrade or production-hardening release.

## Fixes from verification and independent review

- Portrait camera previously cut off the seatback avatar; it now shows both the screen and character.
- A negative first animation delta could request an invalid film chapter after refresh and stop rendering; initialization and bounds now prevent that.
- Cached Back navigation no longer disposes a scene that needs to resume.
- A failed storage write blocks district handoff with an explanation instead of replacing the visitor with the illustrative profile.
- Demo-connection completion moves keyboard focus to the next action.
- Play again correctly restarts a completed introduction.
- Selected style/district borders remain visible; the phone home view keeps its entry action in view.

## Files and boundaries

`src/onboarding/state.js` owns validated local state, destination definitions, and the deterministic identity seed. `app.js` owns journey UI and playback. `scenes.js` owns the terminal, cabin, home, camera, and renderer. `avatar.js` is shared with the existing district. `src/entry.js` chooses onboarding or district.

Art is locally authored procedural placeholder work, awaiting Elvis's generated references. No external image/model/audio jobs were submitted. The home reveal and Yaba's original building kit are not the same final asset; that visual continuity still needs a later pass.

No real GitHub/Dribbble connection, automatic country lookup, shared presence, persistent property backend, produced video/audio, additional named districts, or career progression was implemented. The 27-second three-chapter introduction is an animated seatback presentation. These limitations are surfaced in the relevant UI and documentation.

The shareable ChatGPT reference brief is at the parent root: `BUILDERS_WORLD_VISUAL_BRIEF.md`.

## Skills used

Read and applied the installed `threejs-game-director`, `threejs-gameplay-systems` (genre-design reference), `threejs-game-ui-designer` (UI patterns), `threejs-aaa-graphics-builder` (authoring recipes; worker also used technical-art), and `threejs-qa-release` (visual-test-harness). Read the debug-profiler routing guidance. No premium/AAA score is claimed for this first prototype. Pixel-diff baselines are deferred while visual design is exploratory; behavioral browser coverage and reviewed captures are in place.
