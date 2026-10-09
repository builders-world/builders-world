# Builders World: world bible

How the world is built, by everyone who builds it. Level design, environment art, shaders and textures, game logic, writing and tech art all work from this file. When this file and a habit disagree, this file wins. When this file and the PRD disagree on *what* the product is, the PRD wins; this file decides *how* it is built.

Version 1.0, 9 October 2026. Owner: Elvis Obi. Maintained by whoever changes the rules, in the same commit as the change.

## 0. How to use this file

- Read sections 1 to 3 before your first task. Read the section for your discipline before every task.
- Every rule here has a reason. If a rule blocks good work, change the rule in a commit that explains why. Do not quietly work around it.
- Numbers in this file are our standards, chosen for this project. Some match industry practice and some do not. Treat them as contracts between disciplines, not as physics.
- Things marked **Open** are not decided. Do not build on them without a decision record.
- Related files:
  - Product: `docs/product/builders-world-prd.md` (v1.1 on Claude's PRD branch until merged)
  - Asset contract: `assets/art-direction-brief.md` and `assets/exports/models/yaba-kit/asset-manifest.json`
  - Live coordination: `/Volumes/Elvis Obi - Mac Extended/Builders-World.collab/` and `docs/collaboration/asset-work-live-handoff.md`
  - Reference images: `assets/reference/generated-visual-direction/`

## 1. Pillars

Every decision is checked against these five. If a feature fails two of them, it does not ship.

1. **Real place, real work.** The streets are the real streets. The buildings grow from real, verified work. The sky is the real sky over the city right now. We invent people and businesses for samples, never facts.
2. **Explore, connect, build.** Every space supports at least one of the three, and the busiest spaces support all three. A street with nothing to discover, nobody to meet and nothing to improve is unfinished.
3. **A short, good visit.** People come for ten or fifteen minutes and go back to work. The world must be readable in seconds, never demand grinding, and leave them with one thing they did or learned.
4. **Alive, not busy.** Rain, birds, danfos and people make the street feel lived in. Motion that carries data (lit windows, the presence pulse) stays slow and only changes when work changes.
5. **Runs where builders are.** A mid-range laptop at 60 fps and a mid-range Android phone at 30 fps, on Nigerian mobile data. Beauty that only runs on an M4 is a screenshot, not a world.

## 2. Team and ownership

| Discipline | Owns | Hands to |
|---|---|---|
| Level design | City hierarchy, street layouts on top of OSM, golden paths, landmark and POI placement, build areas, interiors' layouts, encounter spaces, metrics | Environment art (blockouts), game logic (triggers, volumes) |
| Environment art | Modular kits, props, buildings, dressing, materials as authored, LODs, collision proxies | Tech art (export and validation), level design (kit pieces) |
| Shaders and textures | Material library, wet and weather surfaces, sky, water, glow, post-processing, texture budgets and compression | Environment art (material slots), game logic (uniforms it drives) |
| Game logic | World builder, interactions, objectives, routes, build system, persistence, multiplayer rooms, ambient AI, time and weather feeds | Level design (data-driven placement), UI (state) |
| UI and UX | HUD, menus (phone, map, bag), controls guide, accessibility, input mapping | Writing (all copy), game logic (events) |
| Writing | Every word a player reads: signs, notes, objectives, NPC lines, item text, empty states | Everyone |
| Tech art | Export pipeline, validators, contact sheets, performance captures, the asset sync | Everyone |

**Current file ownership in the Yaba app** (`apps/world/yaba-scene`):

- Claude: `src/look/*`, `src/main.js`, `src/world.js`, `src/shaders.js`, `src/mesh.js`, scripts for map and kit sync.
- Codex: `src/onboarding/*`, `src/ui.js`, the Blender kit in the parent `assets/`.
- Before editing a file you do not own, write the proposed change in the live handoff and wait.

## 3. The real world, and how we use it

### 3.1 Sources

| What | Source | Licence and duty | How it is used |
|---|---|---|---|
| Streets, footprints, names | OpenStreetMap, baked with `scripts/fetch-osm-api.mjs` (main API, one bounding box) or Overpass when it is up | ODbL. Show "© OpenStreetMap contributors" whenever real map data is on screen | Roads, building footprints, street names, the minimap and the big map |
| Building heights | **Open:** OSM has almost none in Yaba (1 of 381). Candidates: Google Open Buildings 2.5D, Microsoft footprints, Overture Maps | Check each licence before use | Until then heights come from verified work (plots) or seeded estimates (everything else) |
| Weather | Open-Meteo, every 10 minutes | CC BY 4.0, credit shown; free tier is non-commercial. Launch needs the paid plan or another provider | Rain, cloud, wind, fog, storms, wet streets |
| Sun and time | Calculated from the real clock and location (NOAA formula) | None | Sunrise, golden hour, blue hour, night, lamp switching |
| Verified work | GitHub, Stripe, Product Hunt per the PRD | Read-only, minimum scope | Plot size, height, lit windows |

### 3.2 Rules

- **Bake, do not query live.** Visitors load a baked district file from our CDN, never a third-party map API. Bakes are re-run deliberately and committed.
- **City-level location only.** We never need a player's precise position. Opt-in device location is rounded to about 10 km and kept on the device.
- **Public landmarks yes, private replicas no.** Bridges, flyovers, markets and skylines are part of the city. Real companies, hubs and offices are not reproduced by name or likeness. Our hubs are inspired by Yaba's tech scene and are fictional.
- **Invented means labelled.** Sample builders, notes and businesses say they are samples wherever a player could mistake them for real.
- **Respect the place.** Lagos is not a backdrop of poverty or chaos. Show it as people who live and work there see it: busy, warm, inventive, wet in the rainy season, bright at night.

### 3.3 Yaba and Lagos texture (for every discipline)

Use these to make streets feel like Lagos. Writers and a Lagos-based reviewer sign off on anything cultural before it ships.

- **Street:** yellow danfos with black stripes, BRT buses on main corridors, keke (tricycles) where they still run, roadside parking, black and yellow painted kerbs, open drainage gutters with slab covers, speed bumps, potholes after rain.
- **Power and signal:** overhead wires and transformer poles, a generator hum behind shops, solar panels on newer roofs, telecom masts.
- **Commerce:** kiosks, umbrella stalls, POS agents under branded umbrellas, phone accessory shops, food sellers at junctions, printing and photocopy shops near schools.
- **Buildings:** two to four storey plaster blocks, painted in faded teal, ochre, cream and rose; balconies with laundry; burglar-proof window bars; shop signs hand painted or printed vinyl; murals on long walls.
- **Nature:** coconut and royal palms, banana plants, almond trees giving shade, potted plants on steps, red earth in unpaved lots.
- **Yaba specifically:** a student and tech district, close to universities and markets, dense with small offices, co-working spaces, cafes, printers and gadget repair shops. Fictional hubs here should feel like that ecosystem.
- **Weather:** rainy season roughly April to October with heavy bursts; Harmattan haze roughly December to February; hot and humid most of the year. The live weather feed handles timing; art must look right in all of these.

## 4. Scale and units

| Rule | Value |
|---|---|
| Units | 1 unit = 1 metre |
| Up | +Y |
| North | −Z; east is +X |
| Origin of the world | The district centre from the baked map file |
| Origin of an asset | Ground contact at y = 0, centred on its footprint unless noted |
| Grid | 0.5 m for blockouts and kit snapping; 0.25 m for interior dressing |

### 4.1 Player and space metrics

These keep spaces consistent. Level design checks every blockout against them before art starts.

| Metric | Standard | Why |
|---|---|---|
| Character height | 1.75 to 1.85 m (provisional avatar target 1.8 m) | Everything else is judged against people |
| Eye height (camera focus) | 1.75 m | Matches the street camera |
| Walk speed | 5.2 m/s in game (real walking is about 1.4 m/s) | A short visit has to cover a district; never add running |
| Street camera | 7 m behind, pitch 0.2 rad, field of view 55° | Shoulder view like the reference shot |
| Interior camera | 3.5 to 5 m, pitch 0.25 rad, collision always on | Rooms are tight |
| Collision radius | 0.8 m for the player | Smooth movement past furniture |
| Interact radius | 4 m outdoors, 2.5 m indoors | Prompts must not fight each other |
| Pavement width | 2 m minimum walkable, 3 to 4 m on main streets | Two people pass a standing group |
| Door width | 1.2 m minimum for any door a player uses; 2 m for main entrances | The 0.8 m radius must pass cleanly |
| Ceiling height | 3.0 m rooms, 3.5 to 4.5 m halls and cafeterias | Camera clearance |
| Desk height and depth | 0.75 m high, 0.7 m deep, 1.4 m wide per seat | Readable at game scale |
| Aisles indoors | 1.2 m minimum, 1.8 m main circulation | Camera and avatars pass |
| Stair rise | 0.17 m per step, shown as geometry, walked as a ramp | Simple collision |
| Conversation distance | 1.2 to 3.5 m (social), voice fades to silence by 15 m | Proximity voice in the PRD |
| Name tags visible | Under 45 m | Avoids clutter |

### 4.2 Road widths from OSM class

| OSM class | Carriageway | Pavement each side |
|---|---|---|
| motorway, trunk | 14 to 20 m | 2 m or none |
| primary | 14 m | 3 m |
| secondary, tertiary | 10 m | 2.5 m |
| residential, unclassified | 7 m | 2 m |
| service, living_street | 5 m | 1.5 m |
| footway, path, pedestrian | 2 to 4 m | none |

### 4.3 Street engineering

Real streets follow engineering rules, and so do ours. The world builder enforces these; a district that breaks them fails review.

- **Buildings never overlap the carriageway.** OSM footprints are real; our assumed road widths are not. Where the class width (4.2) does not fit between building lines, the carriageway narrows to fit, keeping at least 0.8 m of kerb or verge between the carriageway and any building. Minimum carriageway: 5.5 m for two-way streets, 3.5 m for lanes.
- **Pavements fill what is left** between carriageway and building line, up to the class width. If there is no room, the street is a shared surface and gets no kerb.
- **Kerbs** are 0.15 m high, painted black and yellow on main roads.
- **Streetlights on every street**, not only main roads:

| Street class | Spacing | Arrangement | Mounting height |
|---|---|---|---|
| Primary, trunk | 24 to 30 m | both sides, staggered | 8 to 10 m (kit lamp 5.2 m until a tall variant exists) |
| Secondary, tertiary | 25 to 30 m | staggered | 6 to 8 m |
| Residential, unclassified | 30 to 35 m | one side | 5 to 6 m |
| Service | 35 to 40 m | one side, at entrances | 4 to 5 m |
| Footway, path | 20 m | bollards or wall lights | 1 to 4 m |

  Poles stand on the pavement 0.6 m from the kerb, never in the carriageway, never in a doorway, at least 1.5 m from a tree trunk, with the arm over the road.
- **Trees and palms** grow only on pavements wider than 2.5 m, in verges, gaps and lots. Never in the carriageway, never within 1 m of the kerb edge, never within 3 m of a junction (sight lines).
- **Junctions** keep corners clear for 5 m in each direction: no kiosks, trees or parked danfos.
- **Parked vehicles** only on the kerb lane of roads wider than 9 m, never on corners or crossings.
- **Drainage:** open gutters run between pavement and building line on Lagos streets; they are part of the street section, not decoration.
- **Physics:** vehicles accelerate, brake and turn within believable limits (city speed 30 to 50 km/h, braking about 6 m/s²), stay on the road graph, and give way to people. People stay on pavements except at crossings and shared surfaces.

## 5. The city hierarchy and its views

```
World  →  Country  →  City  →  District  →  Street and block  →  Plot  →  Interior
```

| Level | View | What the player does |
|---|---|---|
| World | Globe or continent map (later) | Compare cities, travel |
| Country | Arrivals lobby (onboarding) | Choose a city |
| City | **Isometric city sheet**: each city as a small 3D isometric diorama on one sheet, districts as coloured patches, lit by real local time and weather | Hover a city to see its live state; click to fly into it |
| District | Aerial view, then street view | Explore, connect, build |
| Street and block | Third-person street camera | The core experience |
| Plot | The building grown from a builder's work | Visit, read the plot card, leave a note |
| Interior | Enterable hubs, workspaces, studios, cafes | Sit, work, meet, use a desk |

### 5.1 Isometric city sheets

- Orthographic camera at the classic 35.264° pitch and 45° yaw, so every city reads at the same scale and angle.
- Each city is a simplified diorama: its baked footprints extruded at low detail, main roads, one or two public landmarks, and its districts as coloured patches (PRD: patch size is headcount, brightness is activity).
- Each city uses its own real time and weather: Lagos can be raining at dusk while Nairobi is clear at night.
- Selecting a city drops the camera from the isometric sheet into the district's aerial view, then down to the street, as one continuous move. Reduced motion uses a cut and a fade.
- Budgets: under 30k triangles and 40 draw calls per city diorama, loaded as one baked file per city.

### 5.2 Streaming

- A district is one baked map file plus kit instances. Load the district the player enters; keep neighbouring districts as dioramas only.
- Interiors load when the player is within 25 m of an entrance, and unload 60 s after they leave.

## 6. Level design

### 6.1 Pipeline from map to playable

1. **Bake** the real area (section 3).
2. **Blockout (greybox)** on top of the real footprints. Use the colour code below. No art, no lighting beyond a flat key.
3. **Gameplay pass:** golden path, landmarks, POIs, gather spaces, build areas, interactables, collisions, camera checks.
4. **Playtest** the blockout with the metrics in section 4. Fix flow before any art.
5. **Art pass:** kit pieces replace greybox, dressing, materials.
6. **Lighting and weather pass:** practicals, lamp pools, wet-surface behaviour, every time of day and every weather preset (`?wx=` and `?hour=`).
7. **Performance pass** against section 10.
8. **Polish:** small story details, signage, writing.

### 6.2 Greybox colour code

| Colour | Meaning |
|---|---|
| Light grey | Walkable ground |
| Dark grey | Blocking geometry |
| Amber | Interactable (board, door, desk, stall) |
| Teal | Community build area |
| Blue | Entrance or transition (doors, stairs between levels) |
| Red | Problem: camera trap, stuck spot, unreadable area |

### 6.3 Reading a district: wayfinding

We use Kevin Lynch's five elements (paths, edges, districts, nodes, landmarks) as the vocabulary.

- **Paths:** the real streets. The golden path from spawn should pass the community board, at least one hub entrance and one build area within the first 60 seconds of walking.
- **Edges:** main roads and long walls. Paint the long walls (murals) so edges are memorable.
- **Nodes:** junctions and gaps between buildings become small plazas with a reason to stop: a board, a stall, shade, a bench.
- **Landmarks:** one tall visible landmark per district (a monument, a mast, the bridge on the skyline), plus small local landmarks every block (a painted kiosk, a big tree, a hub sign).
- **Breadcrumbs:** warm light pulls people forward (string lights, lit doorways, stalls). The route chevrons on the ground are for set routes only, never permanent.
- **Three-second rule:** from any spawn or arrival point, a new player can name where to go next within three seconds.
- **Encounter spacing:** along the golden path, something worth noticing every 20 to 30 m (about 4 to 6 seconds of walking).

### 6.4 Social spaces

- Gather spaces need shade or shelter, somewhere to sit, light at night, and a clear edge so groups do not block the pavement.
- Put the community board where people arrive. Leave 3 to 4 m of clear ground in front of it for a small crowd.
- Proximity voice spaces should not overlap: keep separate gather spaces at least 20 m apart, or separate them with a wall.

### 6.5 Community build areas

Rules come from the PRD (v1.1, Build together). For level design:

- Each area has a type (street corner, playground, garden, waterfront) and a slot grid with snap points at 0.5 m.
- Mark every area the same way: painted outline, a signpost, an entry on the minimap and the big map.
- Keep 1.2 m clear around doors, paths and plot entrances. A placed piece can never block a route.
- Piece limits per area are set by type; the area should look finished, not full.

### 6.6 Interiors: hubs, shared workspaces, studios

Interiors are where builders spend real time, so they are designed like places to work, not set dressing.

- **Types:** shared workspace (hot desks and focus pods), hub (events space, meeting rooms, cafeteria), studio (design and media, with a small stage or recording booth), cafe (a few tables and good wifi), repair and gadget shop (flavour, no gameplay at first).
- **Entering:** walking through the door is seamless where possible (the interior is already streamed in); otherwise a short fade, never a loading screen longer than one second.
- **Zones in a shared workspace:** reception and noticeboard, hot desks, focus pods, meeting rooms, cafeteria, balcony or rooftop. The player must see at least three zones from the entrance.
- **Interactions:** sit at a desk; open your laptop (from the bag) to show you are working; the presence agent, when linked, does this for real; order at the cafeteria counter (a small queue of animated NPCs is flavour); book a meeting room for a voice room; leave a note on the hub board.
- **Capacity:** each interior is its own room instance with a cap (start at 40). Overflow opens a second instance of the same interior.
- **Light:** warm practicals inside, real daylight through windows that follows the real sun, lit screens on occupied desks.

### 6.7 Ambient life

Life makes the street believable. It must never be mistaken for real players.

| Life | Behaviour | Budget |
|---|---|---|
| Birds | Small flocks (boids) that circle, perch on wires and rooftops, scatter when the player comes within 6 m, roost at dusk | 2 to 4 flocks of 8 to 20, instanced |
| Cats | Wander between gaps and walls, sit on warm ledges, avoid the player, sleep at midday, sheltered when it rains | 2 to 5 per district |
| Planes | Cross the sky on the approach toward the airport north of Yaba, at a believable altitude; red and green navigation lights and a white strobe at night | 1 every 1 to 3 minutes |
| Danfos and cars | Drive the real road graph, give way to the player | 4 to 8 visible |
| Pedestrians | Walk the pavements, unnamed, no name tags | 4 to 12 visible |
| Weather life | Rain, wind in palms, puddle ripples, steam from food stalls, generator smoke | From the live feed |

Ambient creatures and NPCs have no name tags, no presence dots and cannot be messaged. Reduced motion stops flocks and traffic and keeps them parked or perched.

## 7. Environment art

### 7.1 Look

**Decided by Elvis, 9 October 2026: the world uses the clay style of the arrival scene.** Chunky, soft, matte forms in a warm palette, lit like a model under a bright sky. Real sun, weather and night still drive the light; the clay style is what that light falls on. This replaces the earlier blue-hour-after-rain grade as the base look; rain and night are now conditions, not the default. The flat site and admin keep the daylight look.

- **Light.** A strong hemisphere light (sky `#d7e6e4`, ground `#817151`, about 2.5 at noon), a warm sun (`#ffe0ac`), a cool fill (`#b8d9df`), sage fog and sky (`#c6d5c7`), ACES at about 1.15. At night the same rig turns cool blue and the warm windows and lamps carry the scene.
- **Palette.** Plaster in ivory `#ded8c8`, cream `#f2ecd9`, stone `#c9c2b2`, sand `#e6d3b3`, mint `#cfd9c8`, peach `#e9c9a8` and pale blue `#bcd2d6`. Trims in wood `#a87950`, deep green `#263832` and green `#326952`. Leaves `#45694c` and `#7d9263`. Verges `#a4ab7c`. Nothing is pure black; the darkest tone is deep green.
- **Materials.** Flat colour, roughness about 0.75, no grime maps. Texture only where it carries meaning (signs, the board, the mural).
- **Plants.** Fat ellipsoid leaves on a wood trunk in a round stone planter, from a pot by a door up to a street tree. Kit palms are accents.
- **Wet is a condition.** Puddles and sheen appear only when it has really rained.

- **Amber is data on plots.** A plot's windows are the only amber that encodes activity. Street lamps, stalls, string lights and signs use warm light too, but never in a pattern that could read as a plot's windows.
- **Silhouette first.** Every prop must read from its outline at 30 m, every building at 200 m.
- **Detail where people stand.** Spend triangles and material variety around entrances, boards, stalls, desks and benches. Background buildings stay cheap.

### 7.2 Budgets

| Asset class | Triangles (LOD0) | LODs | Materials | Notes |
|---|---|---|---|---|
| Hero prop (board, stall, desk cluster) | 1,000 to 5,000 | LOD1 at 30 m, impostor or removed past 120 m | up to 6 | Collision proxy required |
| Repeated prop (lamp, palm, bin, bench) | 200 to 1,500 | LOD1 at 40 m | up to 4 | Must be instancable |
| Building (kit assembled) | 2,000 to 10,000 per building | LOD1 at 80 m, block at 200 m | shared kit set | Windows as instances or a shader, never one mesh each |
| Interior room | 20,000 to 60,000 total | streamed with the room | shared kit set | Furniture instanced |
| Character | 8,000 to 15,000 | LOD1 4,000 at 15 m, LOD2 1,500 at 40 m | up to 4 | Rig standard below |
| Ambient creature | 300 to 1,500 | single | 1 to 2 | Instanced, vertex animation where possible |

### 7.3 Asset rules

- GLB / glTF 2.0, metres, Y-up, ground origin at y = 0, transforms applied.
- Names in lowercase `snake_case`. Prefixes: `COLLISION_` for proxies, `SOCKET_` for attach points (lamp glow, seat, screen, hand), `LOD1_`, `LOD2_` for levels.
- Every blocking prop has a simple collision proxy. Render meshes are never collision.
- Sockets replace guesswork: a seat has `SOCKET_seat` with its forward on +Z; a lamp has `SOCKET_light`; a desk has `SOCKET_seat`, `SOCKET_laptop` and `SOCKET_screen`.
- Check scale against a 1.8 m reference figure in every contact sheet.
- Contact sheets must render with the same up axis the engine uses. A sheet that shows an asset upside down is a failed check, even if the GLB is right.
- The manifest is the source of truth for IDs and paths. Runtime copies keep their names (`scripts/sync-yaba-kit.mjs`).

### 7.4 Characters

- The default avatar is not approved yet (Elvis supplies the design). Everything in game is provisional until then.
- Rig standard: one humanoid skeleton shared by every character (so animations are shared), root at the feet, facing +Z.
- Animation set for the first release: idle, walk, sit down, sit idle, type on laptop, stand up, wave, point, nod, clap, high five (two-person), talk loop.
- Customisation follows the reference patterns: category tabs with round part pickers and a live preview (Toca Boca), a radial quick-swap for saved outfits (Animal Crossing), and a calmer, framed editor for faces and skin tone (Hogwarts Legacy). Dev streetwear first: hoodies, tees, cargo trousers, sneakers, caps, glasses, headphones, laptop backpacks.
- **Movement (Elvis, 9 October 2026: walk, not waddle).** Until the final avatar ships, `src/look/anim.js` rigs the shared avatar with hip, knee, ankle, shoulder and elbow joints. Walk 2.8 m/s by default, run 6.4 m/s on Shift, jump on Space with real gravity (peak about 0.96 m). The cycle advances by distance travelled so feet never slide; the hips ride the stance leg (high as the legs pass, low at heel strike); a run leans in, lifts the knees, bends and pumps the arms and has a flight phase; a jump tucks one knee and lands with a small squash. No side-to-side body rocking: that reads as a penguin. Any new avatar must keep these joints so the cycle carries over.

### 7.5 Physics and collision

- Nothing passes through anything. People are circles (0.8 m for the player against the world, 0.33 m for others), things on the ground are turned boxes, buildings are their real footprints. All of it sits in one 8 m grid.
- Every collider has a height. A running jump clears low things (picket fences, 1 m); walls, cars and people stop you.
- Moving bodies collide: pavement walkers, builders, traffic and the hired vehicle. Walkers give way and turn back at obstacles; traffic gives way to people.
- A driven vehicle is tested nose to tail every frame and bounces back on contact.
- Anything placed in the world checks the same colliders first (and stays off lawns, pavements and carriageways), so nothing is ever placed inside anything else.
- Test with the walk-and-run sweep (24 directions, zero overlaps) before shipping any change to placement or movement.

## 8. Shaders, textures and lighting

### 8.1 Textures

- Prefer procedural and canvas-painted textures and small shared atlases. No unique 2K maps.
- Texel density: 256 to 512 px per metre on hero props near the player; 128 px per metre on buildings; 64 px per metre on distant blocks.
- Ship compressed: KTX2 (Basis) for textures, Meshopt or Draco for geometry, once the pipeline supports it.
- Colour textures in sRGB; data textures (noise, masks, roughness) linear.

### 8.2 Materials

- One material library shared by the whole district: wet asphalt, kerb, plaster (with grime and rain streaks), painted wall, brushed metal, glass, wood, foliage, fabric, emissive amber.
- Wetness, rain and wind are uniforms driven by the live weather feed, so every surface gets wet together.
- Emissive values stay under 24 in linear HDR. Half-float buffers overflow above 65,504 and bloom spreads infinity across the whole screen. We hit this once; do not hit it again.

### 8.3 Shader safety rules (learned on this project)

- `smoothstep(a, b, x)` needs `a < b`. Reversed edges are undefined in GLSL and return NaN on Apple Metal. Write `1.0 - smoothstep(b, a, x)`.
- Never `pow()` a value that can go negative. With multisampling, varyings are evaluated slightly outside triangles; clamp first: `pow(max(x, 0.0), k)`.
- Clamp outgoing light where reflections and point lights stack on smooth surfaces.
- After any shader change, check the frame for NaN and infinity with a float render target, not by eye.
- Time-driven motion lives in shaders through shared uniforms, never per-mesh JavaScript.

### 8.4 Light and time

- The sun follows the real clock and location. Lamps switch on below about 2° of sun elevation, or in heavy overcast and storms.
- Night is still readable: never let the frame fall below a level where the street and characters can be read.
- Bloom is for emissive light only: lamps, windows, signs, screens. Daylight raises the bloom threshold.
- Fog colour and distance follow time and weather; thin it when the camera is high.
- Lightning never flashes more than three times a second, and is off with reduced motion.

## 9. Game logic

### 9.1 Data flow

```
verified platforms → ingestion → derived metrics (Postgres) → world builder → district manifest (CDN)
                                                                                  ↓
real map bake ─────────────────────────────────────────────→ client: world.js + kit + look layer
live weather + sun ─────────────────────────────────────────→ client: environment each frame
```

- The client never calculates scores. It renders what the manifest says.
- Anything a player can change (notes, community builds) goes through the server and moderation before other players see it. Until that exists, it stays on the device and says so.

### 9.2 Systems and their contracts

| System | Contract |
|---|---|
| Interactables | Each has an id, a label, a position and a radius. The nearest one in range owns the E prompt. Indoors the radius is 2.5 m. |
| Objectives | A short list per area. Each has a target, a completion rule (reach, interact, place) and copy from writing. Player-set routes replace objectives until reached. |
| Routes | A target and a label. Chevrons on the ground, a line on the minimap, distance in the objective panel. |
| Build system | Areas, slots, kit pieces, limits, preview, confirm, cancel (PRD v1.1). |
| Interiors | A room scene, entrance volumes, seats with sockets, capacity, its own voice room. |
| Ambient life | Flocks, cats, planes, traffic, pedestrians: each a system with a budget, reduced-motion state and a weather state. |
| Time and weather | One feed per session; everything reads from it. Preview with `?wx=` and `?hour=`. |
| Navigation | Destinations are set on purpose: from the map (a place, a resident's plot, or any point on a street) or from an app. The route is computed on the real road graph (A*) and shown as a trail along the streets and a line on the minimap and map, like a satnav. It re-routes when the player leaves it by more than 8 m. Objectives show distance but no trail unless the player asks for a route. Never draw a straight line through buildings. |
| Vehicles | Players hire rides at stops: danfo along main roads, keke and okada on smaller streets (where the real city allows them), taxi anywhere. Rides follow the road graph to the chosen destination; the player rides as a passenger and can get off at any stop. Rides are free: the PRD forbids in-world currency. Self-driving is **Open**. |
| Inventory (bag) | Gadgets, wearables, badges. Wearables attach to avatar sockets. Badges only from verified work. Nothing is tradable or sold (PRD: no tokens, coins or tradable assets). Linking real gadgets is **Open**. |

### 9.3 Multiplayer (planned)

- One Colyseus room per district instance, 40 to 60 people (PRD). Interiors are their own rooms.
- Server is authoritative for positions, builds and notes. The client predicts its own movement only.
- Voice (LiveKit) is per room with distance falloff; moderated by default.

## 10. Performance and quality

### 10.1 Targets

| Target | High tier | Low tier (phones, weak laptops) |
|---|---|---|
| Frame rate | 60 fps | 30 fps |
| Draw calls | under 300 | under 150 |
| Triangles on screen | under 1.5 million | under 400,000 |
| Real lights | 8 | 3 |
| Rain particles | 9,000 | 2,500 |
| Mirror reflections | on when streets are wet | off |
| First scene download | under 5 MB compressed | under 3 MB |
| Time to playable | under 8 s on a mid-range phone connection (PRD) | same |

### 10.2 Definition of done

**An asset is done when:** it meets its budget, has collision and sockets, passes the validator, has a correct contact sheet with a 1.8 m reference, loads through GLTFLoader, and looks right at night in rain and in daylight.

**A level space is done when:** it passes the metrics, the three-second rule from every entrance, a walk with the camera into every corner without clipping, every time and weather preset, both quality tiers, and phone framing.

**A feature is done when:** tests pass, onboarding tests still pass, the build passes, reduced motion is handled, copy is from writing, and the live handoff records it.

### 10.3 Visual checks we run

- Fixed-camera screenshots at 10:00, 18:15, 19:00 and 22:00, clear and in rain.
- A float render-target probe for NaN and infinity after shader changes.
- Desktop 1440 × 900 and phone 390 × 844.
- With and without the asset kit (`?kit=0`).

## 11. UI and UX

- HUD zones: top left for place and objective; top right for minimap and weather; bottom centre for prompts; bottom right for controls and camera. Nothing covers the centre of the screen except the prompt.
- Menus are things a builder owns: the **phone** (Tab) opens apps (map, bag, board, builders, camera, build, weather, settings, help); the **map** (M) shows residents, places and routes; the **bag** (I) holds gadgets, wearables and badges.
- The first visit shows a full-screen controls guide in white line art over the darkened street, keyboard and touch versions, dismissed by any input.
- Minimap shows the current street name, like a callout on a competitive map.
- Accessibility: reduced motion everywhere, text at least 12 px on phones, contrast checked, every control reachable by keyboard and touch, captions for any voice or video.

### 11.1 Visual language

Decided by Elvis, 9 October 2026, from the references he shared (the island map, the phone, the wardrobe ring, the face pickers, the line-art controls guide). The kit lives in `apps/world/yaba-scene/src/look/uikit.js`.

- **Paper and ink, not glass.** Surfaces are warm paper (`#f7efdc`) with a soft drop under them; text is brown ink (`#3b2a20`). No dark translucent panels.
- **One rounded display face.** Baloo 2, from Google Fonts, with the system rounded face as the fallback.
- **Adire for pattern.** Full-screen menus sit on indigo Adire cloth or a patterned lagoon, Lagos's answer to the patterned backdrops in the references.
- **Drawn art, not line icons.** Apps are chunky two-tone glyphs on coloured tiles; items, places and people are small filled drawings with ink outlines. Residents appear as drawn portraits in house-shaped frames.
- **Menus are places.** The map is an illustrated island with a folded banner, a grid, black badges for facilities and little houses for plots. The bag puts you in the middle, wearing what you equip, with items in a ring of scalloped tiles.
- **Controls as chips.** Key prompts are cream pills with an ink key cap, bottom right.

## 12. Writing

- Plain, warm, short. Write like a person from the city talking to another builder. No hype.
- Nigerian English is the default register. Pidgin only where a native speaker would use it and a native speaker has reviewed it.
- Never invent a fact that could be read as real: invented builders, notes and businesses are labelled as samples.
- Names for NPCs and samples reflect Lagos: Yoruba, Igbo, Hausa, Edo and other names, mixed naturally.
- Signs for fictional businesses should sound real and local without copying a real brand.
- Objectives are verbs and places: "Meet the builders at the community board", not "Social objective 1".
- House style for Elvis's copy: no em dashes, no tidy punchline endings, contractions are fine.

## 13. Audio (planned)

- Layers per district: rain and wind from the weather feed; traffic and danfo horns near main roads; generator hum near shops; voices and music at stalls and hubs; birds by day; insects at night.
- Spatial falloff matches voice: loud within 5 m, gone by 30 m for small sources.
- Religious sounds (calls to prayer, church music) are part of real Lagos soundscapes; any use needs review by people from those communities.

## 14. Collaboration workflow

- Work in your own worktree and branch (`claude/*`, `codex/*`, or a person's name). Never edit another agent's working directory.
- Commit small and often, locally, until Elvis approves pushing to GitHub.
- Update your status in `Builders-World.collab/` at every checkpoint. Asset work also updates `docs/collaboration/asset-work-live-handoff.md`.
- Shared contracts (this file, the manifest, the PRD, the map format) change in their own commits with the reason in the message.

## 15. Open decisions

| Decision | Options | Owner |
|---|---|---|
| Building heights | Verified work only; Open Buildings 2.5D; Overture Maps | Level design and game logic |
| Weather follows the player or the district | Player's city (current) or each district's own | Elvis |
| Default avatar | Elvis's design, then the character pipeline | Elvis, environment art |
| Real gadget linking | Self-declared, device APIs, or not at all | Elvis, game logic |
| Interior entry | Seamless or short fade per interior | Level design |
| Driving yourself | Passenger rides only, or player-driven vehicles | Elvis, game logic |
| Phase 1 scope | Flat site first, or 3D first as the POC suggests | Elvis |

## 16. Glossary

- **Blockout / greybox:** a playable layout made of plain shapes, before art.
- **Golden path:** the route a first-time player is meant to take.
- **POI:** point of interest.
- **Kit:** a set of modular pieces that snap together.
- **Socket:** a named point on an asset where something attaches.
- **Instance:** one copy of an asset drawn with shared geometry and materials.
- **LOD:** level of detail, a simpler version for distance.
- **Practical light:** a light with a visible source in the world (lamp, sign, screen).
- **Diorama:** the simplified isometric model of a city used on the city sheet.
