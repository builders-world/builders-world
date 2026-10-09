# Yaba night scene

A three.js render of a small piece of Yaba, Lagos, built the way the Builders World PRD describes: real place in, numbers drive the structure, flat-shaded night look out.

## Run

    npm install
    npm run dev

Open the printed URL.

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

## Art rules kept

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
