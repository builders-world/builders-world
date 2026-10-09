# Builders World: request tracker

Every request Elvis has made, with where it stands. Updated 9 October 2026, 17:40 WAT, by Claude. Whoever finishes or starts an item updates its row in the same commit.

## Where to see the work

| Copy | Address | What it shows |
|---|---|---|
| Live on Vercel | https://buildersworld.vercel.app/?world=1 (onboarding at https://buildersworld.vercel.app/) | `main` as of the latest push, deployed 9 October from the Vercel CLI (project buildersworld, account obileonardo). Redeploy with `vercel deploy --prod` from the game folder. |
| The game, branch `main` (merged) | http://127.0.0.1:5173/?world=1 (onboarding at http://127.0.0.1:5173/) | Everything below marked Done. Claude's worktree on 5181 is the same plus work in progress. |
| GitHub | builders-world/yaba-scene and builders-world/builders-world, branch `main` | Pushed after each item, approved by Elvis on 9 October. |

## Status key

- **Done, pushed**: built, tested, merged into `main` and pushed to GitHub.
- **Done, in chat**: an answer or plan given in conversation, nothing to commit.
- **In progress**: partly built.
- **Pending**: not started.
- **Waiting on Elvis**: needs a decision or something only Elvis can provide.

## Requests

| # | Request | Status | Where | Commit |
|---|---|---|---|---|
| 1 | Install top game-dev skills for Claude | Done, local only: 42 graphics skills linked into Claude; Codex installed 67 | `~/.claude/skills`, `~/.agents/skills` | n/a |
| 2 | A prompt so Codex can find and install skills | Done, in chat | Codex installed them | n/a |
| 3 | Onboarding plan: understanding, open decisions, Phase 1 split | Done, in chat. The D1 to D10 decisions were never opened as GitHub issues | chat | none |
| 4 | List Claude's installed skills so Codex can install them | Done, in chat; Codex installed them | `~/.agents/skills` | n/a |
| 5 | Read the repo and propose the full PRD | Done: superseded by PRD v1.1 (row 8) | | |
| 6 | Upgrade the graphics to the reference images (hybrid look) | Done, pushed | yaba-scene `src/look/*` | `a0684ac` |
| 7 | Explain a SHA | Done, in chat | | |
| 8 | PRD v1.1: images supersede v1.0, community build areas rules | Done, pushed and merged into `main` | `docs/product/builders-world-prd.md` | `4ef55df`, `e461c3b` |
| 8a | Regenerate the PRD HTML and PDF exports for v1.1 | Pending | `docs/product/exports/` | |
| 9 | Characters that look like the images | Waiting on Elvis: Tripo or Meshy API key, and whether the image 3 character is the default avatar | | |
| 10 | Real Yaba map data instead of the sample | Done, pushed (OpenStreetMap baked, credit shown) | yaba-scene `public/data/yaba.json` | `ba16910`, `c805718` |
| 11 | Claude and Codex see each other's work in real time | Done, local (shared status folder and hooks) | `Builders-World.collab/` | n/a |
| 12 | Real-time weather and time of day | Done, pushed | yaba-scene `src/look/weather.js`, `sun.js` | `9550f58` |
| 12a | Each district shows its own real weather | Done, pushed | same | `f946a5e` |
| 13 | Game UI from the references: phone, map, inventory, controls guide | Done, pushed (Tab phone, M map, I bag, first-visit guide, street name on minimap) | yaba-scene `src/look/menus.js` | `4f20f93` |
| 13a | Character creator in the reference style | Pending: specified in the world bible 7.4; lives in Codex's onboarding code | Codex | |
| 13b | Real-world gadgets tied to the bag | Pending: decision open | | |
| 14 | World bible: single source of truth for building the world | Done, pushed on `main` (plus AGENTS.md and CLAUDE.md pointers) | `docs/design/world-bible.md` | `e525724` |
| 15 | Integrate Codex's GLB asset kit | Done, pushed; handoff updated | yaba-scene `src/look/kit.js` | `a7306e2`, `9edca1e` |
| 15a | Re-sync Codex's expanded kit | Done, pushed: all twelve GLBs synced and placed | yaba-scene `src/look/district.js` | `8064c8c`, `8f9e943` |
| 16 | GPS-style route: pick a destination on the map, trail follows the streets | Done, pushed | yaba-scene `src/look/nav.js` | `98ddf5f` |
| 17 | Realistic streets: no buildings on roads, streetlights everywhere, proper planning | Done, pushed; junction corners fixed | yaba-scene `src/look/streets.js` | `98ddf5f`, `f946a5e` |
| 18 | Hire vehicles: danfo, keke, taxi; players choose passenger or drive | Done, pushed: danfo stops, keke parks, taxi from the phone; passenger or drive | yaba-scene `src/look/rides.js` | `5474c5a` |
| 19 | Birds, cats and planes | Done, pushed | yaba-scene `src/look/life.js` | `f946a5e` |
| 20 | More tech places: hubs, shared workspaces, studios | Done, pushed: Yaba Creative Hub, Lagos Builders Loft, Eko Design Studio | yaba-scene `src/look/interior.js` | `4dcba74` |
| 21 | Enterable workspaces: walk around, cafeteria, sit at a desk, use a computer | Done, pushed: walk in, cafeteria, sit at a desk, open the laptop, use the computer | yaba-scene `src/look/interior.js` | `4dcba74` |
| 22 | Isometric city sheets: click a city to enter it | Done, pushed: Lagos, Abuja, Port Harcourt, Uyo, Nairobi, Accra as dioramas with real local time and weather; click to enter at street level. Open with `?world=1&view=cities` or the Cities app on the phone | yaba-scene `src/look/cities.js` | `52ec42b` |
| 23 | This tracker | Done, pushed | `docs/collaboration/tracker.md` | this commit |
| 24 | GTA V style camera views on foot and in vehicles | Done, pushed: V cycles near, mid, far, first person; vehicles add a cinematic camera; on foot and vehicle keep separate choices. Aerial moved to B | yaba-scene `src/main.js` | `c4ff1d9` |
| 25 | Gutters blocking the road | Done, pushed: sunk to kerb height, never across a carriageway | yaba-scene `src/look/district.js` | `f815c93` |
| 26 | UI in the references' style, not generic | Done, pushed: paper and ink kit, illustrated map, wardrobe-ring bag, glyph phone, paper HUD. Codex's top-left card and Street/Aerial buttons still use the old look (its files) | yaba-scene `src/look/uikit.js`, `menus.js`, `hud.js` | `40f8614` |
| 27 | The street in the arrival scene's illustration style | Done, pushed: clay light, palette and planter trees; world bible 7.1 and 11.1 updated | yaba-scene `src/look/*`, `src/world.js` | `2d4907d` |
| 28 | Trees blocking roads at junctions | Done, pushed: trees and lamps checked against every carriageway | yaba-scene `src/look/streets.js` | `02300c1` |
| 29 | Houses like the arrival scene's house | Done, pushed: every map footprint dressed in the starter house's parts | yaba-scene `src/look/houses.js` | `dc03f4a` |
| 30 | Every house on its own estate: lawn, fence, room (California suburb first) | Done, pushed: lawn, white picket fence, gate, path, back-garden tree, door planter. Next: fill empty ground with new lots | yaba-scene `src/look/houses.js`, `src/world.js` | `dc03f4a` |
| 31 | Flickering buildings and gutters | Done, pushed: coplanar surfaces separated, logarithmic depth buffer | yaba-scene `src/main.js`, `src/shaders.js`, `src/world.js` | `dc03f4a` |
| 32 | Billboard blocking the road | Done, pushed: a framed roadside billboard on two legs, off the road, lit at night | yaba-scene `src/look/props.js` | `7fa64ac` |
| 33 | Walk instead of waddle; run and jump | Done, pushed: jointed rig, walk, Shift run, Space jump, seated pose; iterated with contact sheets | yaba-scene `src/look/anim.js` | `91d670c` |
| 34 | Real physics: nothing passes through anything, cars too | Done, pushed: grid colliders with heights, fences, people, traffic, whole-body vehicle checks; tested | yaba-scene `src/world.js`, `src/look/physics.js` | `84ad44d` |
| 35 | More flicker (towers, skyline) | Done, pushed: found with a frame-difference test; log depth made opt-in | yaba-scene | `1042da7` |
| 36 | Trail points the wrong way and flickers; RDR2/GTA style; auto travel | Done, pushed: ribbon with arrows toward the destination, beacon, no flicker; C for cinematic travel | yaba-scene `src/look/trail.js`, `src/main.js` | `3a87b82` |
| 37 | One cohesive cartoon UI | Done, pushed: skin over Codex's chrome via CSS variables, plus every panel of Claude's | yaba-scene `src/look/uikit.js` | `b906a80` |
| 38 | Sound, music and a music toggle (licence-free) | Done, pushed: all synthesised in the browser; Settings app, music button, N | yaba-scene `src/look/audio.js` | `8984f7a` |
| 39 | Mapping and path management; movement rules | Done, pushed: walkable grid, A*, rules as costs (world bible 7.6) | yaba-scene `src/look/navgrid.js` | latest |
| 41 | Level design skills; fix every overlap and impossible placement (billboard on a house, footbridge with no stairs) | Done, pushed: level-design and procedural-gen linked, estate-layout skill written; audit 159 issues to 0; walkable footbridge | yaba-scene `src/world.js`, `src/look/houses.js` | `db85ba6` |
| 42 | NPC chat bubbles: greetings in English and pidgin by class, reactions to you, moods and emoji | Done, pushed: register by lifestyle, greetings by time and weather, E to say hi, 1-6 emotes, waves | yaba-scene `src/look/chat.js` | `2f930d6` |
| 40 | Live site updates itself on every push | Waiting on Elvis: install the Vercel GitHub app on the builders-world org, then Claude connects the project | Vercel | |
| 43 | Efforts currency (1,000 per commit), wallet, logo, banks, ATMs | Done, pushed: wallet + ATM + fares; live endpoint counts GitHub contributions (set GITHUB_TOKEN in Vercel for exact commit counts) | yaba-scene `src/look/wallet.js`, `api/efforts.js` | `745cc2c` |
| 44 | Lane markings, crossings, bus stops, real Yaba roads and landmarks | Done, pushed: lanes, 32 zebras, street-name plates, landmark fingerposts, bus shelters | yaba-scene `src/look/civic.js` | `d405134` |
| 45 | More street lights; motion-sensor porch lights | Done, pushed | yaba-scene `src/world.js` | `ca22d3e` |
| 46 | ATMs in a proper district; map icons for services | Done, pushed: bank branch ATMs, filling station, Find nearest, icons | yaba-scene `src/look/district.js` | `5956261` |
| 47 | Mobile analog stick; PS4/PS5/Xbox controllers with a mapping screen | Done, pushed; phone HUD cleaned up | yaba-scene `src/look/input.js` | `36b0dab` |
| 47a | Near camera by default; idle cinematic camera | Done, pushed | yaba-scene `src/main.js` | `203426e` |
| 47b | Animated emotes and idle fidgets; fewer chat bubbles | Done, pushed | yaba-scene `src/look/anim.js`, `chat.js` | `83e45fd` |
| 47c | Bird species, a pond, flocking without clumps; cats no longer spin | Done, pushed | yaba-scene `src/look/birds.js`, `life.js` | `04e0b80` |
| 47d | Zoomable map with zones, estates, house numbers and names | Done, pushed | yaba-scene `src/look/menus.js` | `db61ddf` |
| 47e | MongoDB: other players online, typed chat | Done, pushed and live: presence every second, avatars, name tags, chat (Enter), shared emotes | yaba-scene `api/presence.js`, `src/look/online.js` | `aa80c2e`, `95a7106` |
| 60 | Street lights on both sides of every road, always on; only house porch lights use motion sensors | Done, pushed: 205 street lamps, brighter pools | yaba-scene `src/look/streets.js` | `9fd78e7` |
| 61 | At night everyone off work goes to bed; only night workers go to work | Done, pushed: in bed by 22:00, Musa on the night shift at the filling station | yaba-scene `src/look/lives.js` | `9fd78e7` |
| 62 | Recreation: skate park, water park, community garden, picnic lawn | Done, pushed: placed on open ground, on the map as Parks; residents unwind there after work | yaba-scene `src/look/parks.js` | `9fd78e7` |
| 63 | Sit on benches | Done, pushed: park and bus shelter benches, E to sit, E or walk to stand; park benches now face the pond | yaba-scene `src/look/index.js` | `e7d044a` |
| 64 | Clean streets: pick up litter, recycle it for Efforts, fund street bins together | Done, pushed: Recycling Point 150 per piece, bins 50; bins cost 3,000 in 1,000 steps and are shared online (`/api/bins`) | yaba-scene `src/look/litter.js`, `api/bins.js` | `e7d044a` |
| 65 | GitHub login in front of the world | Waiting on Elvis: create a GitHub OAuth App (callback https://buildersworld.vercel.app/api/auth/callback) | Vercel env | |
| 66 | Players stuck between a house wall and its fence after an aerial click | Done, pushed: 1.7 m walkway or no fence, no squeeze alleys, back gates where a garden is cut off; pockets 590 to 10 cells; clicks land on reachable ground; boxed-in rescue | yaba-scene `src/look/houses.js`, `src/world.js`, `src/main.js` | `d9f7178` |
| 67 | Stuck at a desk: no way to close the laptop or leave | Done, pushed: seat bar (E open or use, F close lid, Esc pack up and leave), walking also leaves, buttons on the computer screen | yaba-scene `src/look/interior.js`, `index.js` | `15e46a4` |
| 68 | Names and signage on enterable buildings, a little larger | Done, pushed: the loft and studio get two-storey storefronts with lit names (the loft opened from the bank before); the hub gets the same sign | yaba-scene `src/look/places.js` | `15e46a4` |
| 69 | Sweep for other traps | Done, pushed: 25 scenarios tested; fixed the ride panel off short screens, no ride cancel (now refunded), passengers could not get off early, Esc in the wallet field, board closes on walking, aerial and plot jumps and ride calls refused indoors | yaba-scene `src/main.js`, `src/look/rides.js` | `15e46a4` |
| 70 | Real-life friction: Eko membership, cards in the bag, Wi-Fi passwords, no internet without Wi-Fi, district Wi-Fi for residents | Done, pushed: register at Eko (day 500 or month 3,000 Efforts), membership and resident cards (bag, Cards tab), a network per workplace plus district Wi-Fi, laptop browser and push need a connection | yaba-scene `src/look/passes.js`, `interior.js`, `menus.js` | `a4c7547` |
| 48 | Bench building animation with hard hat and tools | Queued | | |
| 57 | Roadside vendors and a little street chaos; random events; police stations; city traffic control | Queued | | |
| 58 | Passenger cars, several designs; taxi and danfo roof signs | Queued | | |
| 59 | Gated estates: residents' passes, invited visitors confirmed by the host, 3 to 4 day visits, reputation | Queued | | |
| 49 | Watch Dogs-style tags and profiles (career, socials, commits, stars, design work) | Queued | | |
| 50 | Women, Afrocentric fashion, hairstyles, accessories, footwear; an outfit editor for you and NPCs | Queued | | |
| 51 | Pets: dog or cat, breeds, names, petting, ball, laser, whistle | Queued | | |
| 52 | Food stalls with a first-person view of the vendor (suya); Nigerian street elements | Queued | | |
| 53 | Populate the city with NPCs; NPC and player activities (cycling, skateboarding, roller skating) | Queued | | |
| 54 | Bus parks (buses route through them), bike-rental docks, cycling | Queued | | |
| 55 | Flyover road bridge for cars | Queued | | |
| 56 | Enterable work places: cafes, gyms, studios, bank | Queued | | |
| 24a | Help panel still says V is street or aerial | Proposed to Codex (its file `index.html`): change to V camera, B aerial | live handoff | |

## Decisions waiting on Elvis

| Decision | Options |
|---|---|
| Default avatar | Elvis's design; then the character pipeline |
| Phase 1 scope | Flat site first (PRD) or 3D first (the POC) |
