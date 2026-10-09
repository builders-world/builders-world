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
- Structural report: `assets/exports/models/yaba-kit/asset-validation.json` (all six GLBs pass).
- Manifest: `assets/exports/models/yaba-kit/asset-manifest.json`.
- Review sheet: `assets/exports/renders/yaba-kit-contact-sheet.png`; individual cards share the GLB stem names.
- Named visual crops: `assets/reference/generated-visual-direction/extracted-crops/`.
- Rebuild crop set: `python3 assets/source/reference/make_yaba_reference_crops.py`.
- Three.js `GLTFLoader` parse smoke test passed for all six exports; each loaded scene contains the expected mesh hierarchy.

Last checkpoint: procedural kit exported, collision proxies added, GLB structure validated, and reference crops/contact sheet generated. The latest parent-repo checkpoint is local and unpushed; the short SHA is available from `git log -1`. The files are local so Claude can read them from the shared workspace while remote Git remains paused.
