# Builders World: everything so far

Every request since the project started, what was built, and where each one stands. Generated from the
[tracker](tracker.md) on 12 October 2026, and kept up to date with it.

| | Count |
|---|---|
| Done and live (or merged) | 158 |
| Done, waiting for Elvis to merge | 3 pull requests |
| In progress | 2 (the open world; the recreation areas) |
| Needs Elvis's input | 9 |

## 1. Done and live

| # | What was asked | What was built |
|---|---|---|
| 1 | Install top game-dev skills for Claude | Done, local only: 42 graphics skills linked into Claude; Codex installed 67 |
| 2 | A prompt so Codex can find and install skills | Done, in chat |
| 3 | Onboarding plan: understanding, open decisions, Phase 1 split | Done, in chat. The D1 to D10 decisions were never opened as GitHub issues |
| 4 | List Claude's installed skills so Codex can install them | Done, in chat; Codex installed them |
| 5 | Read the repo and propose the full PRD | Done: superseded by PRD v1.1 (row 8) |
| 6 | Upgrade the graphics to the reference images (hybrid look) | Done, pushed |
| 7 | Explain a SHA | Done, in chat |
| 8 | PRD v1.1: images supersede v1.0, community build areas rules | Done, pushed and merged into `main` |
| 8a | Regenerate the PRD HTML and PDF exports for v1.1 | Done, pushed: v1.0's stylesheet and all 12 figures, the v1.1 text; PDF printed from it (A4) |
| 10 | Real Yaba map data instead of the sample | Done, pushed (OpenStreetMap baked, credit shown) |
| 11 | Claude and Codex see each other's work in real time | Done, local (shared status folder and hooks) |
| 12 | Real-time weather and time of day | Done, pushed |
| 12a | Each district shows its own real weather | Done, pushed |
| 13 | Game UI from the references: phone, map, inventory, controls guide | Done, pushed (Tab phone, M map, I bag, first-visit guide, street name on minimap) |
| 13a | Character creator in the reference style | Pending: specified in the world bible 7.4; lives in Codex's onboarding code |
| 14 | World bible: single source of truth for building the world | Done, pushed on `main` (plus AGENTS.md and CLAUDE.md pointers) |
| 15 | Integrate Codex's GLB asset kit | Done, pushed; handoff updated |
| 15a | Re-sync Codex's expanded kit | Done, pushed: all twelve GLBs synced and placed |
| 16 | GPS-style route: pick a destination on the map, trail follows the streets | Done, pushed |
| 17 | Realistic streets: no buildings on roads, streetlights everywhere, proper planning | Done, pushed; junction corners fixed |
| 18 | Hire vehicles: danfo, keke, taxi; players choose passenger or drive | Done, pushed: danfo stops, keke parks, taxi from the phone; passenger or drive |
| 19 | Birds, cats and planes | Done, pushed |
| 20 | More tech places: hubs, shared workspaces, studios | Done, pushed: Yaba Creative Hub, Lagos Builders Loft, Eko Design Studio |
| 21 | Enterable workspaces: walk around, cafeteria, sit at a desk, use a computer | Done, pushed: walk in, cafeteria, sit at a desk, open the laptop, use the computer |
| 22 | Isometric city sheets: click a city to enter it | Done, pushed: Lagos, Abuja, Port Harcourt, Uyo, Nairobi, Accra as dioramas with real local time and weather; click to enter at street level. Open with … |
| 23 | This tracker | Done, pushed |
| 24 | GTA V style camera views on foot and in vehicles | Done, pushed: V cycles near, mid, far, first person; vehicles add a cinematic camera; on foot and vehicle keep separate choices. Aerial moved to B |
| 25 | Gutters blocking the road | Done, pushed: sunk to kerb height, never across a carriageway |
| 26 | UI in the references' style, not generic | Done, pushed: paper and ink kit, illustrated map, wardrobe-ring bag, glyph phone, paper HUD. Codex's top-left card and Street/Aerial buttons still use the old look (its … |
| 27 | The street in the arrival scene's illustration style | Done, pushed: clay light, palette and planter trees; world bible 7.1 and 11.1 updated |
| 28 | Trees blocking roads at junctions | Done, pushed: trees and lamps checked against every carriageway |
| 29 | Houses like the arrival scene's house | Done, pushed: every map footprint dressed in the starter house's parts |
| 30 | Every house on its own estate: lawn, fence, room (California suburb first) | Done, pushed: lawn, white picket fence, gate, path, back-garden tree, door planter. Next: fill empty ground with new lots |
| 31 | Flickering buildings and gutters | Done, pushed: coplanar surfaces separated, logarithmic depth buffer |
| 32 | Billboard blocking the road | Done, pushed: a framed roadside billboard on two legs, off the road, lit at night |
| 33 | Walk instead of waddle; run and jump | Done, pushed: jointed rig, walk, Shift run, Space jump, seated pose; iterated with contact sheets |
| 34 | Real physics: nothing passes through anything, cars too | Done, pushed: grid colliders with heights, fences, people, traffic, whole-body vehicle checks; tested |
| 35 | More flicker (towers, skyline) | Done, pushed: found with a frame-difference test; log depth made opt-in |
| 36 | Trail points the wrong way and flickers; RDR2/GTA style; auto travel | Done, pushed: ribbon with arrows toward the destination, beacon, no flicker; C for cinematic travel |
| 37 | One cohesive cartoon UI | Done, pushed: skin over Codex's chrome via CSS variables, plus every panel of Claude's |
| 38 | Sound, music and a music toggle (licence-free) | Done, pushed: all synthesised in the browser; Settings app, music button, N |
| 39 | Mapping and path management; movement rules | Done, pushed: walkable grid, A*, rules as costs (world bible 7.6) |
| 41 | Level design skills; fix every overlap and impossible placement (billboard on a house, footbridge with no … | Done, pushed: level-design and procedural-gen linked, estate-layout skill written; audit 159 issues to 0; walkable footbridge |
| 42 | NPC chat bubbles: greetings in English and pidgin by class, reactions to you, moods and emoji | Done, pushed: register by lifestyle, greetings by time and weather, E to say hi, 1-6 emotes, waves |
| 43 | Efforts currency (1,000 per commit), wallet, logo, banks, ATMs | Done, pushed: wallet + ATM + fares; live endpoint counts GitHub contributions (set GITHUB_TOKEN in Vercel for exact commit counts) |
| 44 | Lane markings, crossings, bus stops, real Yaba roads and landmarks | Done, pushed: lanes, 32 zebras, street-name plates, landmark fingerposts, bus shelters |
| 45 | More street lights; motion-sensor porch lights | Done, pushed |
| 46 | ATMs in a proper district; map icons for services | Done, pushed: bank branch ATMs, filling station, Find nearest, icons |
| 47 | Mobile analog stick; PS4/PS5/Xbox controllers with a mapping screen | Done, pushed; phone HUD cleaned up |
| 47a | Near camera by default; idle cinematic camera | Done, pushed |
| 47b | Animated emotes and idle fidgets; fewer chat bubbles | Done, pushed |
| 47c | Bird species, a pond, flocking without clumps; cats no longer spin | Done, pushed |
| 47d | Zoomable map with zones, estates, house numbers and names | Done, pushed |
| 47e | MongoDB: other players online, typed chat | Done, pushed and live: presence every second, avatars, name tags, chat (Enter), shared emotes |
| 60 | Street lights on both sides of every road, always on; only house porch lights use motion sensors | Done, pushed: 205 street lamps, brighter pools |
| 61 | At night everyone off work goes to bed; only night workers go to work | Done, pushed: in bed by 22:00, Musa on the night shift at the filling station |
| 62 | Recreation: skate park, water park, community garden, picnic lawn | Done, pushed: placed on open ground, on the map as Parks; residents unwind there after work |
| 63 | Sit on benches | Done, pushed: park and bus shelter benches, E to sit, E or walk to stand; park benches now face the pond |
| 64 | Clean streets: pick up litter, recycle it for Efforts, fund street bins together | Done, pushed: Recycling Point 150 per piece, bins 50; bins cost 3,000 in 1,000 steps and are shared online (`/api/bins`) |
| 66 | Players stuck between a house wall and its fence after an aerial click | Done, pushed: 1.7 m walkway or no fence, no squeeze alleys, back gates where a garden is cut off; pockets 590 to 10 cells; clicks land on reachable ground; boxed-in … |
| 67 | Stuck at a desk: no way to close the laptop or leave | Done, pushed: seat bar (E open or use, F close lid, Esc pack up and leave), walking also leaves, buttons on the computer screen |
| 68 | Names and signage on enterable buildings, a little larger | Done, pushed: the loft and studio get two-storey storefronts with lit names (the loft opened from the bank before); the hub gets the same sign |
| 69 | Sweep for other traps | Done, pushed: 25 scenarios tested; fixed the ride panel off short screens, no ride cancel (now refunded), passengers could not get off early, Esc in the wallet field, … |
| 70 | Real-life friction: Eko membership, cards in the bag, Wi-Fi passwords, no internet without Wi-Fi, district … | Done, pushed: register at Eko (day 500 or month 3,000 Efforts), membership and resident cards (bag, Cards tab), a network per workplace plus district Wi-Fi, laptop … |
| 71 | NPCs inside their houses; knock, enter only when invited (NPCs and players) | Done for residents: they go in and out by the door; knock (no answer, asleep, invite, not today); invited visits to a living room with the family. Player homes: the same … |
| 72 | Walk marker too bright at night | Done, pushed: dims and goes see-through at night |
| 73 | Estate planning: grid layout, uniform houses, gates, house numbers (1A, 1B), garages | Done, pushed: walled estates along real roads, gates onto closes, identical lots with garage and driveway, numbering by gate, gate signs, door plaques, close lamps, map … |
| 74 | Partly done: player homes private too; hub larger; help panel | Done, pushed: knocks and gate calls between players with a let-them-in prompt; hub up to 45% larger; help lists current controls |
| 75 | Load time | Done, pushed: 4.6 s to 1.8 s with identical layouts (road raster, incremental walk map, memoised planner) |
| 76 | Music: better background music, free to use; StreamBeats, not Epidemic Sound | Done, pushed: three radio stations in vehicles (R), a crossfading playlist player for licensed tracks, creator mode. StreamBeats' free licence excludes games, so it is … |
| 77 | Video fixes: green flat grass, gutters like ladders, walking through doorsteps, morning fog, wires and poles, … | Done, pushed: continuous drains with slabs and crossings, kerbs and paving, doorsteps you stand on, mist that burns off as the sun climbs, poles with crossarms and … |
| 78 | No text selection in the game | Done, pushed: off everywhere except text boxes |
| 79 | Grass too detailed, too many trees; the flat onboarding look; more vibrant colour | Done, pushed: flat ground back, one tree per 22 m on open land, brighter sky, grass and grade |
| 80 | Popular Yaba landmarks in the map | Done, pushed: Yaba Tech gate and college, UNILAG gate, CcHub, Tejuosho Market, E-Centre, Queen's College, St. Dominic's, the National Stadium on the skyline; each toward … |
| 81 | Better lighting and textures; graphics settings by device; performance | Done, pushed: Auto, Low, Medium, High, Ultra in Settings (Auto reads graphics chip, memory, cores and steps down if it cannot hold the frame rate); High and Ultra: sun … |
| 82 | Sports centre (tennis, basketball, padel), indoor arena (swimming, indoor sports), chess with people; all … | Done, pushed: tennis, padel doubles, table tennis on one physics engine (service boxes, faults, lets, deuce, tiebreaks, change of ends); basketball one on one to 11 … |
| 83 | Phone: duplicate icons; pages you cannot reach | Done, pushed: unique icons (drone, globe, paw, hanger, ball), a Sports app, pages by dots, swipe, wheel or arrow keys |
| 84 | Ultra at 30 fps or better | Done, pushed: Ultra keeps full sharpness above 30 fps, 2x edge smoothing, shadows at 30 Hz, no glow by day, half-size glow on sharp screens; under load ultra 15 to 33 … |
| 85 | Wallet as an illustrated wallet with cards and cash; square overview beside it | Done, pushed: leather bifold, cards rise from slots, Efforts notes and coins; click for the square overview |
| 86 | Start inside your own home; multi-room home (workspace, lab, studio) | Merged and live (#18): everyone gets a house on arrival; a seven-room home with workspace, lab and studio; new players start inside; returning players resume where they … |
| 87 | Different interiors for each building | Merged and live (#19): hub (CI wall, racks, architecture board), loft (brick, long table, phone booths, lockers), studio (moodboards, swatch wall, photo sweep) |
| 89 | Wardrobe: tops do not change, the skirt cuts through the body, the curvy body does not look feminine, Cancel … | Done, pushed: each top its own garment, curvy frame after LEGO and Minecraft, skirts and wrappers hang from the hips, long and ponytail hair, equal buttons, full-body … |
| 90 | A box on the road with no purpose; scan the world for similar objects | Done, pushed: the box was an unplaced danfo copy at the district centre; also removed parked danfos in traffic lanes and drains running down dual-carriageway lanes, and … |
| 91 | Flyover deck darker than the road; Abuja flyover runs into the footbridge | Merged (yaba-scene #2): deck uses the road's asphalt; the flyover keeps clear of footbridges, landmarks and venues (Wuse and Kilimani have none until flyovers and … |
| 92 | Skaters sink into the skate park's ramps and blocks | Merged (#3): funbox, quarter pipes and ledge are rideable surfaces; skaters follow them |
| 93 | Greenrey: too much shiny grass | Merged (#4), one commit with a switch (Settings > Graphics, ?greenrey=0): laterite ground, grass only between buildings and in parks, car parks and building plots on … |
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
| 109 | Push merged work live | Live on buildersworld.vercel.app (main at b71114a, 10 Oct 16:05); online play there is solo until the gateway's ALLOWED_ORIGINS includes the Vercel address. Railway (the … |
| 110 | Passports, an Immigration Centre, travel by Efforts and each city's tech scene | Merged and live (#20, #21): passports, travel authorisations, proof of funds per city, the board of what you need |
| 111 | Airports in every city with real processes | Merged and live (#22): LOS, ABV, PHC, QUO, NBO, ACC; check-in, security, passport control, gate, flight, arrivals immigration, baggage; stamps in your passport |
| 112 | Greener Yaba, street trees back, a dog that stays on the ground and plays | Merged and live (#23): bare earth cut by about 80% (110k to 18k m²), 566 trees on green land, 19 concrete and granite yards, street trees 127 to 406; dog idle acts (sit, … |
| 113 | Visible doors with EXIT and ENTRY in workspaces and venues | Merged and live (#24): glass double doors, push bars, lit EXIT and ENTRY signs; ENTRY over the storefront doors outside |
| 114 | Transport and city planning: car parks with accessible bays, hospitals, a railway with trains and a station, … | Done except the elevated cargo highway: car parks with accessible bays live (#25), highway cycle lanes and no-cycling pavements live (#26); railway with trains, level … |
| 115 | Walk without the body coming apart | Merged and live (#27): rounded knees and elbows, a rounded shorts seat, a full arm swing, calmer cadence at the player's walking speed |
| 116 | Radio on the phone with each city's own stations | Merged and live (#28): 5 to 15 real FM stations per city, every stream tested, found through Radio Browser; the game music rests while it plays |
| 117 | Every city is itself | Merged and live (#29): researched places, landmarks, residents, traffic (Nairobi keeps left), estates and signs for Abuja, Port Harcourt, Uyo, Nairobi and Accra; Old GRA … |
| 118 | Access roads off the main road, and traffic officials | Merged and live (#30): motor park access roads with IN/OUT lanes, minibuses turn in and merge without blocking; every city has its motor park; LASTMA, FRSC, TIMA-RIV, … |
| 119 | Home at real scale, clear layout, and things you actually do | Merged and live (#31): house 1.3x wider, 3.8 m ceiling; TV off the door's path, shower you step into; sofa (TV, feet up, read), bed, cook, eat, shower, basin, fridge, … |
| 120 | Map fills its window, distances and quick travel, real resident avatars, compass | Merged and live (#32): no square cut when zoomed; picked markers show metres and minutes with Quick travel; residents as their 3D avatars with count, online and search; … |
| 121 | Travel app, cinematic taxi ride, airports at real scale with the real process | Merged and live (#33): Fly renamed Travel; ride there on the cinematic camera or skip the trip; a 136 by 92 m terminal with a 20 m roof you can look up at; entrance … |
| 122 | Ten tree species, parks on the open green land, home gardens | Merged and live (#35): flamboyant, jacaranda, pink trumpet, golden shower, frangipani, mango, neem, royal palm, coconut, acacia, mixed per city; up to nine laid-out … |
| 123 | GitHub sign-in through the game's domain | Vercel forwards /api to the gateway (#34, live); gateway GITHUB_REDIRECT_URL (open-world-backend #2, merged to develop, not yet on Railway). Elvis's new OAuth app is … |
| 124 | Profile portrait, moods and skills; play as your dog; animal friends; GTA-style switch | Merged and live (#36): live face portrait bottom left with mood ring, needs (energy, food, social, fun) and six skills (coding from commits too); Q or the dog portrait … |
| 125 | Character posture: no slant, no tilted neck | Merged and live (#37): standing legs straight (knees were bent 30 degrees by the walk solver), neck and chest tilts from emotes ease back to upright |
| 126 | Procedural rendering: only see things as you approach; keep quality; a horizon in metres | Merged and live (#38): trees, shrubs and flowers stream in round you (full trees to 150 m on High, low-detail copies of each tree beyond, dithered swaps); a horizon of … |
| 127 | Camera follows your movement (GTA V style) as an option | Merged and live (#39): Settings > Controls > Camera follows you; A and D turn you and the view together, pauses after you look around |
| 128 | Path tracing for vehicles: lanes, in every city; cars wait for people on crossings; the hand and walking … | Merged and live (#40): lane graph from re-baked OSM (one-way, lanes), turn lanes, smooth junction paths, keep-left Nairobi; cars give way at zebras; pelican crossings on … |
| 129 | Animals with fear and emotions (birds fly, chickens run, dogs bark or stand their ground, taming, feeding … | Merged and live (#41): fear.js model of your approach and each animal's trust; pigeons take off, chickens and cats run, bold dogs bark and hold ground until you stay … |
| 130 | Cities as whole cities: Lagos (Yaba, Ikeja City Mall, more areas), Akwa Ibom (Uyo capital plus other areas), … | Merged and live (#42): 16 new real OSM areas across six cities, landmarks at Nominatim coordinates (unfound ones left out), taxi travel between areas in the Travel app, … |
| 131 | Global world brief: building boundaries, lanes and junctions, vehicle collisions, duplicate player character, … | Merged and live (#43, #44, #45): buildings off roads and pavements, road ends joined, right of way, 0 overlaps inside the area in six cities, roundabouts, flyover parts … |
| 132 | UI brief: rectangular minimap and expanded map, map sidebar hierarchy and clipping, bottom-left HUD overlaps … | Merged and live (#46): rectangle minimap and map, RAD/GAP tokens, sidebar scrolls clear, bottom-left dock (0 overlaps in every state at 3 sizes), Builders and plot card … |
| 133 | Backlog items: umbrella and raincoat, own bicycle, gadget shop, binoculars, digital billboards, Settings … | Merged and live: gadget shop and items (#50), digital billboards (#51), Settings redesign (#52). Waiting on Elvis: what building signs and which phone apps he wants … |
| 134 | Aerial visual noise: mottled ground that looked like assets not loading (video, 11 Oct) | Merged and live (#53): cause was the Greenrey ground decals, not loading. Rain puddle noise was huge-scale blotches, fine grain shimmered at distance, earth and granite … |
| 135 | Zoning by the railway: train ran through the Yaba Aquatic and Indoor Arena; no buildings, sports or … | Merged and live (#54): 5.5 m rail corridor (world.onRail) kept clear by venues, civic props, street trees and lamps, ground patches and buildings; big venues can turn to … |
| 136 | Level crossings: no wooden sleepers across roads, research how crossings keep cars and trains apart (video, … | Merged and live (#55): flush rails in a rubber panel deck with flangeways, one crossing per road, advance warning sign, stop line, crossbuck, alternating red lamps and … |
| 137 | Bus stop, fingerpost and other objects on the train tracks at the Yaba crossing (video, 11 Oct) | Merged and live (#56): bus stops and their hire vehicles kept about 20 m from any line; utility poles, road signs, bike docks, cycle props, edge signs, officials and … |
| 138 | Bag gadgets: hoverboard and scooter, bought at the gadget shop (queued list) | Merged and live (#57): self-balancing hoverboard and electric scooter, ridable from the bag, sold in every city's gadget shop |
| 139 | Driver's licence card in the card holder; the licence gates driving (10 Oct cards request) | Merged and live (#58): a licensing office in every city run by its real authority (FRSC, NTSA, DVLA); form and fee, eye test, five-question theory test on the city's own … |
| 140 | Bag tabs with more than 4 items scroll as a carousel (10 Oct gadgets request) | Merged and live (#59): tabs with more than four things show four at a time round you; arrows, page dots and count, arrow keys, wheel and swipe; full-size controls on … |
| 141 | Roller skates done properly: they replace your shoes and show on your feet, no skates on a board or … | Merged and live (#60): quad skates on your own feet (shoes hidden, wheels on the drawn surface), no board or hoverboard in skates, momentum (push, glide, curves, … |
| 142 | The phone needs Wi-Fi to work and tells you where to find a network or its password (10 Oct phone video) | Merged and live (#61): apps that need the internet fade and open a Wi-Fi screen offline; free and residents' hotspots round the board, stops, motor park and parks, … |
| 143 | Food trucks and window shops with the attendant visible at the hatch (10 Oct cafe video) | Merged and live (#62): serving windows on every street shop with the attendant in them (lit shelf of what the shop sells, waves you over; the kitchen's cook moved out of … |
| 144 | Road hierarchy: highways, main roads and estate roads with their own speeds and lanes, after Cities: Skylines … | Merged and live (#63): road kinds with their own limits and speeds (highway 80, main 60/50, collector 40, residential 30, estate 20); estate and service lanes and closes … |
| 145 | Illustrated shop signs showing what each business does (spanners for a repair shop), drive-in and parking … | Merged and live (#64): lit name boards with a picture of each trade on every shop (spanner and screwdriver for repairs, loaf, printer, phone and plug, pot, cup, mobile … |
| 146 | Zoom out from a city to see Nigeria, other countries later (10 Oct cities video) | Merged and live (#65): zoom out past the district to Nigeria (with Ghana), then Africa from Senegal to Kenya (Natural Earth boundaries); the six cities as pins, yours … |
| 147 | Batch multi-part props, people and cars to cut draw calls (follow-up to #38) | Merged and live (#66): static scenery merged by material look per 48 m cell (pixel-identical on screen), people beyond 32 m drawn as one baked mesh; draw calls Lagos … |
| 148 | Airport: character invisible (levitating), travellers glitching, airport not on the map; planes on the map, … | Merged and live (#68): the taxi ride now ends properly and you are never culled (you were hidden after the ride); travellers pause and turn smoothly, idle people animate … |
| 149 | 25,000 Efforts to start for everyone; jobs to earn more: report a crime, fix a computer, design a website, … | Merged and live (#70): the welcome grant in every wallet (and spending no longer forgotten after 200 purchases); people with work in every city with a briefcase over … |
| 150 | Map: the green should fill the whole rectangle; pan round the globe and see every region, even the ones not … | Merged and live (#71): the district map fills the window with land and names the city's other areas at the edges with distances; past the district, one Mercator world … |
| 151 | CI on every pull request (tests, build, Playwright) | Merged (#69): GitHub Actions runs npm test, the build and the browser tests; first run green in 12 min |
| 152 | Merge the three repositories into one, with history, ready for per-city ownership (12 Oct) | Merged (#1 in builders-world, by Elvis): the game in `apps/game` and the backend in `services/backend`, each with its full history (git filter-repo, byte-identical to … |
| 48 | Bench building animation with hard hat and tools | Done, pushed: two builders in hard hats, hammer and saw, legs, slats, backrest with sawdust; you wear a hard hat; sittable |
| 57 | Roadside vendors and a little street chaos; random events; police stations; city traffic control | Done, pushed: hawkers at red lights, daily events (breakdown, football, owambe), Yaba Police Division, 7 signal junctions, a LASTMA officer |
| 58 | Passenger cars, several designs; taxi and danfo roof signs | Done, pushed: saloon, hatch, SUV, pickup, taxi (TAXI sign), danfo (route board), keke, BRT, on real routes |
| 59 | Gated estates: residents' passes, invited visitors confirmed by the host, 3 to 4 day visits, reputation | Done, pushed: gatemen, visitor passes (3 days, a day's wait), renting (resident pass, own door and Wi-Fi), reputation; players' homes take knocks and gate calls |
| 49 | Watch Dogs-style tags and profiles (career, socials, commits, stars, design work) | Done, pushed: P profiler; residents, builders, players (what they share in Settings) |
| 50 | Women, Afrocentric fashion, hairstyles, accessories, footwear; an outfit editor for you and NPCs | Done, pushed: wardrobe (body, skin, 10 hairstyles incl. gele and fila, Ankara, Adire, kaftan, agbada, dress, wrapper, 5 shoes, accessories); NPCs dress their own way |
| 51 | Pets: dog or cat, breeds, names, petting, ball, laser, whistle | Done, pushed: shelter, 10 breeds, follow, pet, fetch, laser, whistle; seen online |
| 52 | Food stalls with a first-person view of the vendor (suya); Nigerian street elements | Done, pushed: a vendor at every food counter, first person at the counter, real menus in Efforts, made and handed over; charcoal grills, smoke, zobo cooler, lantern |
| 53 | Populate the city with NPCs; NPC and player activities (cycling, skateboarding, roller skating) | Done, pushed: 10 walkers, 3 cyclists in traffic, skaters at the skate park, a roller skater round the pond; you can bike, skateboard and skate |
| 54 | Bus parks (buses route through them), bike-rental docks, cycling | Done, pushed: Yaba Motor Park (danfos leave the traffic to load, touts, back out), four Yaba Bikes docks |
| 55 | Flyover road bridge for cars | Done, pushed: Murtala Muhammed Way flyover; through traffic drives over, cross traffic under |
| 56 | Enterable work places: cafes, gyms, studios, bank | Done, pushed: Kofo Cafe (order, sit and work), Yaba Fitness (new storefront), the bank's banking hall; studios done earlier |
| 24a | Help panel still says V is street or aerial | Done (Elvis asked to finish partly-done items): help lists the current controls |
| 155 | Vercel deploys from GitHub by itself (12 Oct) | Connected to builders-world/builders-world (root `apps/game`, branch `main`): every merge goes live, every pull request gets a preview link; builds skipped when only the backend or docs change |

## 2. Done, waiting for Elvis to merge

| Pull request | What it does | Note |
|---|---|---|
| [#2](https://github.com/builders-world/builders-world/pull/2) | A folder per country and per city: 84 countries, 135 tech cities, all on the world map | Merge first |
| [#4](https://github.com/builders-world/builders-world/pull/4) | Stops the flicker where estate paving met a road (Elvis's video, 12 Oct) | Independent, safe to merge any time |
| [#3](https://github.com/builders-world/builders-world/pull/3) | The Nairobi backdrop grid | **Superseded** by the open world below: Elvis wanted the real city to be playable, not a backdrop. Will be closed once the open world's pull request is up |

## 3. In progress

| Work | Where it stands |
|---|---|
| **Nairobi as an open world** (12 Oct): the real street grid as the playable world, only the area round the player built and running | Stage 1 under way: the whole of central Nairobi baked into 1,696 squares of 200 m (52,582 buildings, 12,898 streets fitted to their building lines, 9,354 crossings, 70,835 lamps, 101,858 trees; 5.4 MB compressed). Next: the game streams and builds those squares in a background thread, walking and driving across them, distant squares in a simpler form, clouds from altitude. Stage 2: traffic and people everywhere. Stage 3: shops and places everywhere, map and satnav city-wide. Then Lagos |
| **Recreation** (12 Oct): mountain biking, climbing, hiking, paragliding, wingsuit, skydiving, bungee, beaches, archery, gun range, with guides, lessons and fees | Planned after the open world's first stage, which they need for terrain and altitude |

## 4. Needs Elvis's input

| # | What | What is needed |
|---|---|---|
| 9 | Characters that look like the images | Waiting on Elvis: Tripo or Meshy API key, and whether the image 3 character is the default avatar |
| 13b | Real-world gadgets tied to the bag | Pending: decision open |
| 88 | A database for the game | Elvis's collaborator, on a branch from `main` (Claude paused) |
| 108 | Make the in-world laptop browse real websites | Options given (embedded browser now; cloud browser later, needs spend); waiting on Elvis's go-ahead |
| 65 / 123 | GitHub sign-in | The gateway's `ALLOWED_ORIGINS` on Railway must include https://buildersworld.vercel.app (Ayotomide or Elvis) |
| | The backend repo | Ayotomide: point Railway at `builders-world/builders-world`, root `services/backend`; then archive or delete `open-world-backend` |
| | The old game repo | Elvis: archive or delete `yaba-scene` (everything is in `builders-world`, backed up on the drive) |
| | Merging pull requests | Optional: add the `Bash(gh pr merge:*)` rule in Claude Code `/permissions` so Claude can merge after checks pass |
| | Decisions (tracker) | Default avatar; Phase 1 scope (flat site or 3D first); Red Line overpass; cargo highway; phone apps; laptop browser |

