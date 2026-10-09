# Street look: evidence

Checked 9 October 2026 on the bundled sample layout (the live Overpass service returned 504 during testing, so real Yaba footprints are not yet checked). Apple M4, Chromium with Metal.

| Check | Result |
|---|---|
| High tier, 1440 x 900 | 60 fps. 8 live lamp lights, 9,000 rain streaks, mirror reflections |
| Low tier (`?quality=low`, and automatic on phones) | 60 fps. 3 lights, 2,500 streaks, no mirror |
| Day theme (`?theme=day`) | Renders. No rain, wet ground or lamp lights |
| Phone, 390 x 844 | Renders on the low tier. HUD reflows |
| Reduced motion | Lighter, slower rain. No lightning, no ripples, traffic and walkers stop |
| `npm test` | 4 passed |
| Onboarding browser tests (desktop and mobile) | 8 passed |
| `npm run build` | Passes |

Screenshots are kept locally in this folder and ignored by Git, like the other artifacts:

01-opening-view, 02-community-board, 03-board-panel, 04-bench-built, 05-wet-road-reflections, 06-aerial, 07-low-quality-tier, 08-day-theme, 09-phone.
