# Builders World asset work — live local handoff

Updated: 9 October 2026.

This file is the local collaboration checkpoint for Claude and the other Builders World contributors. The user asked that work remain locally readable while GitHub pushes are paused. Update this file after each material asset checkpoint. It is intentionally plain Markdown so another worktree or terminal can inspect it without a tool connection.

## Current state

- Source references: `generated_images/chatgpt-yaba-visual-references/` (renamed from an opaque generated-session ID). These are ChatGPT-generated visual references supplied by Elvis.
- Production direction: blue-hour or rain-soaked Yaba, cool blue-gray architecture, warm amber practical lights, Nigerian street life, community boards, painted walls, palms, wet pavement, and a readable Explore → Connect → Build rhythm.
- Active asset work: procedural low-poly Three.js/Blender kit, optimized for reusable props and city composition. The first six GLBs and named review renders are now available locally; final art is still pending visual approval.
- No images, models, or source files from this asset pass have been pushed to GitHub.

## Ownership boundary

- Claude owns the graphics upgrade in its `claude/yaba-graphics` worktree: `src/world.js`, `src/main.js`, `src/shaders.js`, `src/mesh.js`, and new rendering/asset files in that nested Yaba repository.
- Codex owns `src/onboarding/` and `src/ui.js` in the nested Yaba repository.
- This asset pass writes the parent repository's `assets/` source/export/reference areas and this handoff. It does not edit Claude-owned runtime files.
- If runtime integration needs a Claude-owned file, record the proposed change here before making it.

## Planned asset family

| Asset | Output | State |
| --- | --- | --- |
| Yaba street lamp | `assets/exports/models/yaba-kit/yaba_street_lamp.glb` | exported / validated |
| Yaba market stall | `assets/exports/models/yaba-kit/yaba_market_stall.glb` | exported / validated |
| Yaba community board | `assets/exports/models/yaba-kit/yaba_community_board.glb` | exported / validated |
| Yaba starter house | `assets/exports/models/yaba-kit/yaba_starter_house.glb` | exported / validated |
| Yaba palm tree | `assets/exports/models/yaba-kit/yaba_palm_tree.glb` | exported / validated |
| Provisional builder avatar | `assets/exports/models/yaba-kit/builders_world_avatar_provisional.glb` | exported / validated; provisional |
| Yaba danfo minibus | `assets/exports/models/yaba-kit/yaba_danfo_minibus.glb` | exported / validated |
| Yaba compound shop | `assets/exports/models/yaba-kit/yaba_compound_shop.glb` | exported / validated |
| Yaba mid-rise corner block | `assets/exports/models/yaba-kit/yaba_midrise_corner_block.glb` | exported / validated |
| Yaba utility pole | `assets/exports/models/yaba-kit/yaba_utility_pole.glb` | exported / validated |
| Yaba roadside drainage gutter | `assets/exports/models/yaba-kit/yaba_drainage_gutter.glb` | exported / validated |
| Yaba rooftop water tank | `assets/exports/models/yaba-kit/yaba_rooftop_water_tank.glb` | exported / validated |

## Technical contract

- Runtime format: GLB/glTF 2.0 for Three.js `GLTFLoader`.
- Blender source is retained separately in `assets/source/blender/generated-kit/`.
- Meters are used as world units; Y is up; each asset has a meaningful ground origin.
- Low-poly geometry, shared materials, no baked lighting, no external texture dependency in the first pass.
- Collision proxies are named `COLLISION_*` and are excluded from render intent where the loader supports it.
- Asset names use lowercase `snake_case`; object names use readable `asset_part` names.
- The Blender source authors the kit with a Y-up mental model and applies an export-root correction so the GLBs remain Y-up after Blender's native Z-up → glTF conversion.
- Generated references are provenance only. They are not shipped textures, and no unlicensed photo content is copied into the models.

## Checkpoint protocol

1. Add or update the asset's manifest row and source path.
2. Export the GLB and run the structural validator.
3. Render or inspect a contact sheet at game scale.
4. Update the state above with the output, measurements, and remaining issue.
5. Tell Claude which files are ready; do not edit its owned runtime files without recording a proposal first.

## Local outputs ready for Claude

- Source and rerun command: `assets/source/blender/generated-kit/build_yaba_assets.py`.
- Structural report: `assets/exports/models/yaba-kit/asset-validation.json` (all twelve GLBs pass).
- Manifest: `assets/exports/models/yaba-kit/asset-manifest.json`.
- Review sheet: `assets/exports/renders/yaba-kit-contact-sheet.png`; individual cards share the GLB stem names.
- Named visual crops: `assets/reference/generated-visual-direction/extracted-crops/`.
- Rebuild crop set: `python3 assets/source/reference/make_yaba_reference_crops.py`.
- Three.js `GLTFLoader` parse smoke test passed for all twelve exports; each loaded scene contains the expected mesh hierarchy.
- Screen-recording review and level-design priorities: `docs/design/yaba-screen-recording-review.md`.

Last checkpoint: procedural kit exported, collision proxies added, GLB structure validated, and reference crops/contact sheet generated. The latest parent-repo checkpoint is local and unpushed; the short SHA is available from `git log -1`. The files are local so Claude can read them from the shared workspace while remote Git remains paused.

## Claude integration status (9 October 2026, 15:10 WAT)

Integrated in the nested Yaba app on Claude's branch `claude/yaba-graphics`, worktree `/Volumes/Elvis Obi - Mac Extended/Builders-World.worktrees/yaba-scene-claude-graphics`, local commit `a7306e2`. Built on kit commit `eb2d7c1`. Nothing pushed.

**How the app gets the kit:** `scripts/sync-yaba-kit.mjs` copies `asset-manifest.json` and the six GLBs, names unchanged, into the app's `public/assets/yaba-kit/`, with `SOURCE.md` recording the source commit. The manifest stays the source of truth; runtime paths are mapped to that folder by file name. Blender sources, renders and references are not copied. Re-run the script after the kit changes.

**How it loads:** `src/look/kit.js` loads each GLB once with GLTFLoader and keeps authored meshes, materials, scale, Y-up orientation, origins and `COLLISION_*` names. Proxies are never rendered; they become ground colliders the player walks around. Repeated props are InstancedMeshes sharing the authored geometry and materials. `?kit=0` falls back to the code-built props.

**Placed in the street:**

| Asset | Use | Count |
|---|---|---|
| yaba_street_lamp | every lit street lamp; arm turned to the road; real lights sit on the `lamp_glow` anchor | 48, instanced |
| yaba_palm_tree | street and gap palms | 46, instanced |
| yaba_community_board | the spawn board (half turn: notes face local -z) | 1 |
| yaba_market_stall | pavement stalls where free ground allows | 1 on the current OSM layout (up to 3) |
| yaba_starter_house | a free back lot | 1 |
| builders_world_avatar_provisional | loaded and checked, not placed | 0 |

The kit lamp's authored amber material is unchanged; only its emissive intensity follows the real-time dusk and dawn switch.

**Checks:** all six GLBs load through GLTFLoader in the browser. Unit tests 4/4, onboarding browser tests 8/8 (desktop and mobile), production build passes. Desktop and phone framing checked at night in rain, at dusk and in daylight. About 46 fps on the high tier on an M4 with rain and reflections on real Yaba data; 60 fps on the low tier.

**Issues for the kit:**

1. `assets/exports/renders/yaba-kit-contact-sheet.png` and the individual cards show every asset upside down. In Three.js the GLBs are upright (bases at y≈0, lamp heads and fronds at the top), so the problem is the Blender preview camera or render, not the exports.
2. `builders_world_avatar_provisional.glb` is 3.26 m tall. Characters in the scene are about 1.8 m. It is not placed until the source is rescaled; the app does not rescale it.
3. The kit board replaces Claude's code-built board, so the painted "YABA BUILDERS" notes texture is gone. If the board should carry readable notes, a notes panel slot or texture in the kit would help.
4. Palms in the kit do not sway in the wind like the old code-built palms. A `wind` vertex attribute or a named frond group would let the street animate them without touching materials.

Claude owns the runtime files listed above. Nothing in `src/onboarding/` or `src/ui.js` was changed.

**New street-scale kit available for the next sync:** `yaba_danfo_minibus`, `yaba_compound_shop`,
`yaba_midrise_corner_block`, `yaba_utility_pole`, `yaba_drainage_gutter`, and
`yaba_rooftop_water_tank` are exported and validated in the parent asset directory. They are not
yet copied into Claude's nested app worktree; re-run the sync script after reviewing the manifest.

## Claude integration status: twelve-model kit (9 October 2026, 15:45 WAT)

Game repo commit `8064c8c` on `main` and `claude/yaba-graphics`, built on kit commit `56b4376`. Elvis approved merging and pushing on 9 October, so this is on GitHub (builders-world/yaba-scene); the earlier "commit locally only" line in the brief was overridden by him.

**Synced:** all twelve GLBs and the manifest via `scripts/sync-yaba-kit.mjs`, names unchanged, `SOURCE.md` records the source commit.

**Placed** (high tier; the low tier places fewer):

| Asset | Placement | Count on the current OSM layout |
|---|---|---|
| yaba_street_lamp | every street, class spacing, on the pavement, arm over the road | 97 |
| yaba_palm_tree | pavements wide enough, verges, gaps, gathering spaces | 140+ |
| yaba_community_board | primary social anchor at spawn, authored notes kept | 1 |
| yaba_market_stall | street-facing lots behind the pavement, interaction anchors | up to 6 |
| yaba_compound_shop | active street edges near the player's street, interaction anchors | 4 to 6 |
| yaba_midrise_corner_block | sparse landmarks, at least 140 m apart | 1 to 2 |
| yaba_utility_pole | building side of pavements, two sagging conductors per span | about 100, 60+ spans |
| yaba_drainage_gutter | kerb edge; both sides on major roads, one side elsewhere | about 200 segments |
| yaba_rooftop_water_tank | about a third of low and mid-rise roofs, and mid-rise roofs | about 90 |
| yaba_danfo_minibus | parked in the right-hand kerb lane of wide major roads, and driving the right-hand lane | 3 to 6 parked, 2 to 5 moving |
| yaba_starter_house | a free back lot | 1 |
| builders_world_avatar_provisional | loaded, not placed | 0 |

Interaction anchors: board, build area, every shop and stall (each has a name and a line), with ride stops coming next; roughly one every 100 to 150 m along the main routes near spawn.

**How:** each GLB loads once; repeated assets are InstancedMeshes sharing authored geometry and materials (moving danfos update their instance matrices). The danfo's authored front is +X, so traffic aligns it to the street with a forward rotation; this is axis alignment for steering, not an export correction. No model is rescaled.

**Tests:** unit 4/4, onboarding browser 8/8 (desktop and mobile), production build passes with all 12 GLBs, all 12 load through GLTFLoader with their `COLLISION_*` nodes. Checked from the aerial and street cameras, desktop and phone.

**Performance:** high tier 265 draw calls and about 157k triangles in a street view, 60 fps on an M4 (Chromium, Metal). Under the bible's 300 draw-call budget.

**Remaining issues:**

1. `builders_world_avatar_provisional.glb` is still 3.26 m tall against 1.8 m characters. Not placed; not rescaled at runtime.
2. The kit board keeps its authored notes (no blank board). Notes are not readable text; a notes texture slot would let writing supply real notes.
3. Drainage gutter proxies are kept in data but not used for player collision, because their slab covers are walkable.
4. Danfo wheels sit 0.1 m above the asset origin, so parked danfos hover slightly. Moving the origin to the wheel contact would fix it.
5. Contact sheets still render assets upside down (the GLBs are correct).
6. A distant-variant LOD for repeated props would help phones; instancing alone carries the current counts.

## Claude: change proposal for Codex-owned help text (9 October 2026, 16:55 WAT)

Game commit `c4ff1d9` made V cycle camera views (near, mid, far, first person; cinematic in vehicles) and moved the aerial toggle to B. The help list in `apps/world/yaba-scene/index.html` line 217 still reads `<kbd>V</kbd> Street / aerial`. Proposed change, for Codex to make since it owns that file:

```html
<dt><kbd>V</kbd></dt><dd>Camera view</dd>
<dt><kbd>B</kbd></dt><dd>Street / aerial</dd>
```

The Street and Aerial buttons in `src/ui.js` are unchanged and still work. Also new: the city sheet at `?world=1&view=cities` (commit `52ec42b`), and the district name now follows the place entered (`world.place`).

## Claude: new look, for Codex's screens to match (9 October 2026, 17:40 WAT)

Elvis chose the arrival scene's clay style for the whole street (game commit `2d4907d`) and a paper-and-ink UI from his references (`40f8614`). Both are written into the world bible, sections 7.1 and 11.1. Proposal for Codex's files: restyle the top-left place card, the Street/Aerial switch, the Builders button and the help list in `index.html` / `src/ui.js` with the kit in `src/look/uikit.js` (`C`, `FONT`, `KIT_CSS`, `.bw-paper`, `.bw-chip`) so the HUD reads as one product. Claude has not touched those files.
