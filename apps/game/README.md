# Builders World arrivals + Yaba scene

The default page now opens the local onboarding prototype: Nigeria arrivals, an attendant conversation, developer/designer identity, city and district selection, a first-person airplane introduction with simultaneous avatar editing, and a generated starter-home preview.

Open `/?world=1` to visit the original Yaba scene directly. Completing the Lagos → Yaba journey enters the district with your selected name and avatar. The district uses its existing building kit for your starter plot; the home reveal is a concept preview, not an exact asset match. This handoff uses the bundled sample map so it works without an external map service.

## Onboarding preview

- Walk in the lobby using WASD, arrow keys, or on-screen movement buttons; drag to look. **Walk to arrivals** goes directly to the attendant.
- Choose a name and role. GitHub and Dribbble connections are explicitly simulated: no OAuth request or real account access occurs.
- Choose Lagos, Abuja, Uyo, or Port Harcourt. Yaba is the only named district implemented. The other cities use a labeled founding-community preview and do not silently enter Yaba.
- During the flight, watch the three-part animated seatback introduction and change outfit style/colour. Pause, replay, next chapter, and immediate landing work independently of avatar editing.
- Your name, choices, avatar, and progress are stored in localStorage. Reload resumes the current step. **Restart journey** clears the onboarding choices after a confirmation. The introduction restarts when reloading the flight.
- The final avatar design, art direction references, produced video, real country routing, authentication, shared home ownership, and career progression are future work. Nigeria is a fixed preview lobby, not detected location.
- All work remains local on `codex/arrivals-onboarding`; nothing has been pushed.

The shareable image brief is `BUILDERS_WORLD_VISUAL_BRIEF.md` at the parent Builders-World folder root. The detailed experience brief is `docs/design/immersive-onboarding.md` in that parent folder.

## Checks

    npm test
    npx playwright install chromium  # once per machine
    npm run test:browser
    npm run build

Browser checks cover desktop and phone-size viewports, both identity routes, all four destinations, local persistence, failed storage, reduced motion, avatar changes, intro controls, and the Yaba handoff. Evidence and limitations are recorded in `artifacts/final-evidence.md`.

## Street look (PRD v1.1 visual direction)

The night theme now follows the reference images in the parent repository (`assets/reference/generated-visual-direction/`). Everything lives in `src/look/`:

- `surfaces.js`: wet street material with puddles, ripples and a planar mirror; plaster walls with rain streaks and grime.
- `atmosphere.js`: blue-hour sky with drifting cloud and rare lightning, rain, light cones under lamps, a pool of real lamp lights that follows the player, the lit skyline and the Lekki-Ikoyi Link Bridge.
- `props.js`: danfos (parked and driving), palms and banana plants, the community board, the mural, a community build area, string lights, two named builders and a few unnamed walkers. Props look for open ground between real footprints, so they adapt to whatever map loads.
- `hud.js`: district and objective, minimap, route on the ground, the E prompt, name tags, and the community board panel.
- `textures.js`: every texture is painted on a canvas at load. Nothing is downloaded.

The loop from the PRD works end to end: walk to the board, press E, read notes or pin one, find the build area, press E to add a bench. Notes and the bench stay on this device; nothing is shared yet.

`?quality=low|high` picks a tier (phones get low automatically). Debug switches: `?post=0` skips post-processing, `?look=0` skips the street layer, `?no=rain,cones,lights,skyline,reflect` turns parts off.

Plot windows are still the only amber that carries data. Street lamps, string lights, car lights and the skyline use other light so they never read as activity. Evidence is in `artifacts/street-look/README.md`.

## Original district prototype

A three.js render of a small piece of Yaba, Lagos, built the way the Builders World PRD describes: real place in, numbers drive the structure, flat-shaded night look out.

## Run

    npm install
    npm run dev

Open the printed URL for onboarding, or append `?world=1` for direct district exploration.

- Walk with WASD, or click the street to walk there. Drag or Q/E to look, scroll or +/- to zoom (or use the buttons bottom right).
- Click a building for its plot card. The Builders list (bottom left) jumps you to any plot.
- Street / Aerial switch top right (V). In the aerial view, click the ground to drop down at that spot.
- Sun/moon button (T) switches day and night. The choice is remembered. `?theme=day` or `?theme=night` forces one.
- H hides the interface, ? shows the controls.

## Where the place comes from

On load the app tries, in order:

1. `public/data/yaba.json`, a baked manifest (what a CDN would serve)
2. a cached copy in localStorage
3. live OpenStreetMap footprints and roads via the Overpass API
4. `public/data/sample.json`, a synthetic street grid, so it always renders

The top-left badge says which one you got. To bake real data once:

    npm run fetch:osm
    node scripts/fetch-osm.mjs "Yaba" 6.5095 3.3715 230   # name lat lon radius(m)

URL params also work: `?lat=6.51&lon=3.37&r=250&name=Yaba`, `?view=aerial`, `?hud=0`, `?still=1` (skip the arrival).

## How the numbers become a building

All in `src/builders.js` and `src/world.js`.

- Height from outcomes: stars, forks, public MRR, merged PRs, launch votes.
- Footprint from breadth: the builder with the most active repos gets the biggest real footprint nearby.
- Windows from recency: lit share drops after 14 days, zero after 60. Live builders get the slow 2.5s breath.
- Everything else in the district is an unclaimed lot: low and dark.

## Art rules kept (PRD v1.0)

These were the original prototype rules. PRD v1.1 replaces them for the night theme; see Street look above. Amber still only carries data on plots.

Vertex colours only, flat shading, no textures. Amber is the only warm colour. Day mode is the same world in daylight: pale blue-grey, white, the same amber accent, lamps and bloom off. Window lighting, the arrival and the monument sweep are shader uniforms, not per-mesh JS. Bloom threshold sits above anything an unlit surface reaches. Respects prefers-reduced-motion.

Builder names and figures are invented, as in the PRD.

## Deploy to Railway

Bake the Yaba data first, so visitors load a static file instead of each one hitting the Overpass API:

    npm run fetch:osm

Then, with the Railway CLI logged in:

    railway init        # first time only: create the project
    railway up          # builds with `npm run build`, serves dist with server.mjs
    railway domain      # generate a public URL

`railway.json` sets the build and start commands. `server.mjs` is a dependency-free static server that reads `$PORT`.
