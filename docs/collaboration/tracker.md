# Builders World: request tracker

Every request Elvis has made, with where it stands. Updated 10 October 2026, 10:50 WAT, by Claude. Whoever finishes or starts an item updates its row in the same commit.

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
| 71 | NPCs inside their houses; knock, enter only when invited (NPCs and players) | Done for residents: they go in and out by the door; knock (no answer, asleep, invite, not today); invited visits to a living room with the family. Player homes: the same rule applies once players have homes in the shared world (needs login and plot claims) | yaba-scene `src/look/lives.js`, `interior.js` | |
| 72 | Walk marker too bright at night | Done, pushed: dims and goes see-through at night | yaba-scene `src/look/trail.js` | `ba13b17` |
| 73 | Estate planning: grid layout, uniform houses, gates, house numbers (1A, 1B), garages | Done, pushed: walled estates along real roads, gates onto closes, identical lots with garage and driveway, numbering by gate, gate signs, door plaques, close lamps, map addresses | yaba-scene `src/estates.js`, `src/look/houses.js`, `src/look/estatesigns.js` | `141ea7f` |
| 74 | Partly done: player homes private too; hub larger; help panel | Done, pushed: knocks and gate calls between players with a let-them-in prompt; hub up to 45% larger; help lists current controls | yaba-scene `src/look/gates.js`, `props.js`, `index.html` | `7dd8981`, `9ab1b2d` |
| 75 | Load time | Done, pushed: 4.6 s to 1.8 s with identical layouts (road raster, incremental walk map, memoised planner) | yaba-scene `src/world.js`, `look/navgrid.js`, `src/estates.js` | `0290530` |
| 76 | Music: better background music, free to use; StreamBeats, not Epidemic Sound | Done, pushed: three radio stations in vehicles (R), a crossfading playlist player for licensed tracks, creator mode. StreamBeats' free licence excludes games, so it is not used. Waiting on Elvis to pick Pixabay tracks (licence allows games) and drop them in `public/music/` | yaba-scene `src/look/audio.js`, `public/music/` | `3dbf1e4` |
| 77 | Video fixes: green flat grass, gutters like ladders, walking through doorsteps, morning fog, wires and poles, placement, 60 fps | Done, pushed: continuous drains with slabs and crossings, kerbs and paving, doorsteps you stand on, mist that burns off as the sun climbs, poles with crossarms and sagging wires, resolution governor holding 60 fps | yaba-scene `src/look/district.js`, `src/world.js` | `db721f6` |
| 78 | No text selection in the game | Done, pushed: off everywhere except text boxes | yaba-scene `src/look/uikit.js` | `d2fd9df` |
| 79 | Grass too detailed, too many trees; the flat onboarding look; more vibrant colour | Done, pushed: flat ground back, one tree per 22 m on open land, brighter sky, grass and grade | yaba-scene `src/look/surfaces.js`, `district.js`, `main.js` | `50ef444` |
| 80 | Popular Yaba landmarks in the map | Done, pushed: Yaba Tech gate and college, UNILAG gate, CcHub, Tejuosho Market, E-Centre, Queen's College, St. Dominic's, the National Stadium on the skyline; each toward its real bearing, with a fact and a map pin | yaba-scene `src/look/landmarks.js` | `a5780cd` |
| 81 | Better lighting and textures; graphics settings by device; performance | Done, pushed: Auto, Low, Medium, High, Ultra in Settings (Auto reads graphics chip, memory, cores and steps down if it cannot hold the frame rate); High and Ultra: sun shadows, contact shading, sharper textures, more lamps, longer view; Ultra: full Retina sharpness, sky reflections; frame-rate counter. On an M4 at Retina: Low, Medium, High 60 fps, Ultra about 31 | yaba-scene `src/look/quality.js`, `look/ao.js`, `main.js` | `6d3d537` |
| 82 | Sports centre (tennis, basketball, padel), indoor arena (swimming, indoor sports), chess with people; all playable with real rules | Done, pushed: tennis, padel doubles, table tennis on one physics engine (service boxes, faults, lets, deuce, tiebreaks, change of ends); basketball one on one to 11 (real rim and backboard, check, take it back, blocks, steals); 50 and 100 m freestyle (one-start rule, turns); Chess Corner (chess.js rules, three AI regulars, two on one keyboard, online invites); Aquatic and Indoor Arena with a sunken 25 m pool | yaba-scene `src/look/sports/` | `b40a4b2` |
| 83 | Phone: duplicate icons; pages you cannot reach | Done, pushed: unique icons (drone, globe, paw, hanger, ball), a Sports app, pages by dots, swipe, wheel or arrow keys | yaba-scene `src/look/menus.js`, `uikit.js` | `9b42da8` |
| 84 | Ultra at 30 fps or better | Done, pushed: Ultra keeps full sharpness above 30 fps, 2x edge smoothing, shadows at 30 Hz, no glow by day, half-size glow on sharp screens; under load ultra 15 to 33 fps, high 37 to 60 | yaba-scene `src/main.js`, `look/quality.js` | `5835a2f` |
| 85 | Wallet as an illustrated wallet with cards and cash; square overview beside it | Done, pushed: leather bifold, cards rise from slots, Efforts notes and coins; click for the square overview | yaba-scene `src/look/walletui.js`, `menus.js` | `6efcf00` |
| 86 | Start inside your own home; multi-room home (workspace, lab, studio) | Merged and live (#18): everyone gets a house on arrival; a seven-room home with workspace, lab and studio; new players start inside; returning players resume where they were |
| 87 | Different interiors for each building | Merged and live (#19): hub (CI wall, racks, architecture board), loft (brick, long table, phone booths, lockers), studio (moodboards, swatch wall, photo sweep) |
| 88 | A database for the game | Elvis's collaborator, on a branch from `main` (Claude paused) | | |
| 89 | Wardrobe: tops do not change, the skirt cuts through the body, the curvy body does not look feminine, Cancel bigger than Looks good | Done, pushed: each top its own garment, curvy frame after LEGO and Minecraft, skirts and wrappers hang from the hips, long and ponytail hair, equal buttons, full-body mirror | yaba-scene `src/look/style.js`, `wardrobe.js` | `ab98237` |
| 90 | A box on the road with no purpose; scan the world for similar objects | Done, pushed: the box was an unplaced danfo copy at the district centre; also removed parked danfos in traffic lanes and drains running down dual-carriageway lanes, and parks and venues can no longer be placed on a road. The roundabout statue stays on purpose | yaba-scene `src/look/district.js`, `parks.js` | `889691b` |
| 91 | Flyover deck darker than the road; Abuja flyover runs into the footbridge | Merged (yaba-scene #2): deck uses the road's asphalt; the flyover keeps clear of footbridges, landmarks and venues (Wuse and Kilimani have none until flyovers and footbridges are planned together) |
| 92 | Skaters sink into the skate park's ramps and blocks | Merged (#3): funbox, quarter pipes and ledge are rideable surfaces; skaters follow them |
| 93 | Greenrey: too much shiny grass | Merged (#4), one commit with a switch (Settings > Graphics, ?greenrey=0): laterite ground, grass only between buildings and in parks, car parks and building plots on open land, matte grass in rain |
| 94 | Vendors' bodies inside their stalls; extend the shade roof | Merged (#5): traders behind the counter, solid; awnings 1.1 m back and 0.8 m forward; grills beside the stall |
| 95 | Expressions: 45+ emotes, randomised, event driven | Merged (#6): faces on everyone, 61 emotes, a director (no two neighbours alike, no repeats, reactions to rain, horns, goals, music, food); G opens the emote sheet |
| 96 | Zebra crossings in the pathfinder; pedestrian signals | Merged (#7): routes detour to zebras, green man, flashing hand and red hand at signalled junctions, walkers wait at the kerb |
| 97 | Online players slow to appear and lagging | Merged (#8): presence every 0.55 s on its own timer, players drawn where they are now, Online now list with Jump |
| 98 | Road signs: left/right with places, km, slow zones for children and pedestrians | Merged (#9): direction boards, speed limits, school (20) and market (15 km/h) zones cars obey |
| 99 | More footbridges and flyovers | Merged (#10): flyovers planned first (up to 2), then up to 3 footbridges clear of them; Abuja gets its flyover back |
| 100 | Cards page: all said Wuse, all alike; stacked in a holder; Wi-Fi and reputation on the right | Merged (#11): bug fixed, resident vs visitor cards, city colours and landmark art, holder that opens into a carousel, side panel |
| 101 | City sheet: day and night, topography, landmarks, card text outside its frame | Merged (#12): terrain and water per city, landmarks, night lights, framed details panel, keyboard and touch |
| 102 | Clothes break apart when walking; legs out of boots; shorts; see-through green leg | Merged (#13): boot shaft on the shin, shorts seat, street-bin ghost now an outline |
| 103 | Hover lights up both dialog buttons; Register and Not now misaligned | Merged (#14): each button its own frame, same size, one line; kit tick box |
| 104 | Laptop lid closes sideways; use a venue's desk computer for a fee, free for members, with your own password | Merged (#15) |
| 105 | People waddle | Merged (#16): foot placement and leg IK; planted feet slide 5% (was 119%); gait tests |
| 106 | Wallet: cards column on the left, cash column on the right, cleaner shadows | Merged (#17) |
| 107 | CI for the game (GitHub Actions) | Written, not pushed: GitHub refuses workflow files without the gh token's workflow scope (Elvis: gh auth refresh -s workflow) |
| 108 | Make the in-world laptop browse real websites | Options given (embedded browser now; cloud browser later, needs spend); waiting on Elvis's go-ahead |
| 109 | Push merged work live | Live on buildersworld.vercel.app (main at b71114a, 10 Oct 16:05); online play there is solo until the gateway's ALLOWED_ORIGINS includes the Vercel address. Railway (the official game) still needs its GitHub source connected to deploy main |
| 110 | Passports, an Immigration Centre, travel by Efforts and each city's tech scene | Merged and live (#20, #21): passports, travel authorisations, proof of funds per city, the board of what you need |
| 111 | Airports in every city with real processes | Merged and live (#22): LOS, ABV, PHC, QUO, NBO, ACC; check-in, security, passport control, gate, flight, arrivals immigration, baggage; stamps in your passport |
| 112 | Greener Yaba, street trees back, a dog that stays on the ground and plays | Merged and live (#23): bare earth cut by about 80% (110k to 18k m²), 566 trees on green land, 19 concrete and granite yards, street trees 127 to 406; dog idle acts (sit, lie, sniff, zoomies, beg, scratch, bow, hop, pant) |
| 113 | Visible doors with EXIT and ENTRY in workspaces and venues | Merged and live (#24): glass double doors, push bars, lit EXIT and ENTRY signs; ENTRY over the storefront doors outside |
| 114 | Transport and city planning: car parks with accessible bays, hospitals, a railway with trains and a station, cycle and pedestrian lanes on the highway, an elevated cargo highway, Lagos seaports | In progress: car parks with accessible bays live (#25), highway cycle lanes and no-cycling pavements live (#26); railway, cargo highway, hospital, seaports next |
| 115 | Walk without the body coming apart | Merged and live (#27): rounded knees and elbows, a rounded shorts seat, a full arm swing, calmer cadence at the player's walking speed |
| 116 | Radio on the phone with each city's own stations | Merged and live (#28): 5 to 15 real FM stations per city, every stream tested, found through Radio Browser; the game music rests while it plays |
| 117 | Every city is itself | Merged and live (#29): researched places, landmarks, residents, traffic (Nairobi keeps left), estates and signs for Abuja, Port Harcourt, Uyo, Nairobi and Accra; Old GRA re-baked on named streets, Uyo re-centred on Ibom Plaza |
| 118 | Access roads off the main road, and traffic officials | Merged and live (#30): motor park access roads with IN/OUT lanes, minibuses turn in and merge without blocking; every city has its motor park; LASTMA, FRSC, TIMA-RIV, Kenyan traffic police and MTTD officers clear jams and warn you off the road |
| 119 | Home at real scale, clear layout, and things you actually do | Merged and live (#31): house 1.3x wider, 3.8 m ceiling; TV off the door's path, shower you step into; sofa (TV, feet up, read), bed, cook, eat, shower, basin, fridge, bench and camera poses with animations; W A S D hint inside |
| 120 | Map fills its window, distances and quick travel, real resident avatars, compass | Merged and live (#32): no square cut when zoomed; picked markers show metres and minutes with Quick travel; residents as their 3D avatars with count, online and search; a compass across the top |
| 121 | Travel app, cinematic taxi ride, airports at real scale with the real process | Merged and live (#33): Fly renamed Travel; ride there on the cinematic camera or skip the trip; a 136 by 92 m terminal with a 20 m roof you can look up at; entrance screening, check-in islands and bag drop, passport control and security in each airport's own order, duty free, gates and jet bridges; arrivals immigration, belts, customs, greeters; planes parked, taxiing, taking off and landing; live boards, real agencies, Swahili signs at JKIA; PA announcements inside the terminal only |
| 48 | Bench building animation with hard hat and tools | Done, pushed: two builders in hard hats, hammer and saw, legs, slats, backrest with sawdust; you wear a hard hat; sittable | yaba-scene `src/look/build.js` | `4587d73` |
| 57 | Roadside vendors and a little street chaos; random events; police stations; city traffic control | Done, pushed: hawkers at red lights, daily events (breakdown, football, owambe), Yaba Police Division, 7 signal junctions, a LASTMA officer | yaba-scene `src/look/streetlife.js`, `traffic.js` | `724761a`, `91f8fe8` |
| 58 | Passenger cars, several designs; taxi and danfo roof signs | Done, pushed: saloon, hatch, SUV, pickup, taxi (TAXI sign), danfo (route board), keke, BRT, on real routes | yaba-scene `src/look/traffic.js` | `91f8fe8` |
| 59 | Gated estates: residents' passes, invited visitors confirmed by the host, 3 to 4 day visits, reputation | Done, pushed: gatemen, visitor passes (3 days, a day's wait), renting (resident pass, own door and Wi-Fi), reputation; players' homes take knocks and gate calls | yaba-scene `src/look/gates.js` | `9ab1b2d`, `7dd8981` |
| 49 | Watch Dogs-style tags and profiles (career, socials, commits, stars, design work) | Done, pushed: P profiler; residents, builders, players (what they share in Settings) | yaba-scene `src/look/profiler.js` | `3fb14b4` |
| 50 | Women, Afrocentric fashion, hairstyles, accessories, footwear; an outfit editor for you and NPCs | Done, pushed: wardrobe (body, skin, 10 hairstyles incl. gele and fila, Ankara, Adire, kaftan, agbada, dress, wrapper, 5 shoes, accessories); NPCs dress their own way | yaba-scene `src/look/style.js`, `wardrobe.js` | `5c4e9e0` |
| 51 | Pets: dog or cat, breeds, names, petting, ball, laser, whistle | Done, pushed: shelter, 10 breeds, follow, pet, fetch, laser, whistle; seen online | yaba-scene `src/look/pets.js` | `6e249da` |
| 52 | Food stalls with a first-person view of the vendor (suya); Nigerian street elements | Done, pushed: a vendor at every food counter, first person at the counter, real menus in Efforts, made and handed over; charcoal grills, smoke, zobo cooler, lantern | yaba-scene `src/look/food.js` | `26e3ccf` |
| 53 | Populate the city with NPCs; NPC and player activities (cycling, skateboarding, roller skating) | Done, pushed: 10 walkers, 3 cyclists in traffic, skaters at the skate park, a roller skater round the pond; you can bike, skateboard and skate | yaba-scene `src/look/mobility.js`, `streetlife.js` | `3a6b8fd`, `556e11f` |
| 54 | Bus parks (buses route through them), bike-rental docks, cycling | Done, pushed: Yaba Motor Park (danfos leave the traffic to load, touts, back out), four Yaba Bikes docks | yaba-scene `src/look/streetlife.js`, `mobility.js` | `724761a`, `3a6b8fd` |
| 55 | Flyover road bridge for cars | Done, pushed: Murtala Muhammed Way flyover; through traffic drives over, cross traffic under | yaba-scene `src/look/flyover.js` | `b0574e5` |
| 56 | Enterable work places: cafes, gyms, studios, bank | Done, pushed: Kofo Cafe (order, sit and work), Yaba Fitness (new storefront), the bank's banking hall; studios done earlier | yaba-scene `src/look/venues.js` | `0c07e95` |
| 24a | Help panel still says V is street or aerial | Done (Elvis asked to finish partly-done items): help lists the current controls | yaba-scene `index.html` | `9ab1b2d` |

## Decisions waiting on Elvis

| Decision | Options |
|---|---|
| Default avatar | Elvis's design; then the character pipeline |
| Phase 1 scope | Flat site first (PRD) or 3D first (the POC) |
