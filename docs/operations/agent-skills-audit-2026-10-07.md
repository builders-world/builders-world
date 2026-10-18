# Builders World agent-skills audit

Audit date: 2026-10-07  
Project: Builders World (three.js browser world; Colyseus, LiveKit, Supabase, Vercel, Blender)  
Codex version: 0.160.0  
User skill directory: `~/.agents/skills`

## Result

The four packs explicitly approved in the task were audited and copied as 59 skill folders into `~/.agents/skills`. After the follow-up approval, eight additional gap-coverage skills were audited and copied. The directory now contains 70 folders: 67 new skills plus the three existing personal skills (`design-taste-frontend`, `ui-ux-pro-max`, and `web-design-guidelines`). No folder-name collision occurred. No repository installer, `install.sh`, `npx` installer, or global package install was run.

Codex's [documented skill discovery order](https://learn.chatgpt.com/docs/build-skills) includes repository `.agents/skills`, user `~/.agents/skills`, administrator `/etc/codex/skills`, and bundled skills. The personal install location used here is the documented user location, `~/.agents/skills`; restart Codex if a newly installed skill does not appear in a later turn.

## Installed packs

| Repository | Commit SHA | Stars | Last push | License | Installed | Purpose |
|---|---|---:|---|---|---:|---|
| [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | `b1c623076c661fc9b03dac19292e825a5d106823` | 3,484 | 2026-07-09 | README states MIT; GitHub API returned no SPDX license | 10 | Three.js fundamentals, geometry, animation, interaction, lighting, materials, loaders, textures, shaders, and postprocessing |
| [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) | `8286774b22a2566bf894dbc825825c16921866af` | 2,443 | 2026-09-28 | MIT | 9 | Browser-game gameplay systems, AAA graphics, UI, audio, debugging/profiling, QA, and optional asset-generation workflows |
| [scottstts/Threejs-Awesome-Graphics-Agent-Skills](https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills) | `d1cb23dcce6ea8ee4a60f6159daeb79d4b511dba` | 883 | 2026-09-22 | MIT at repository level; one precipitation example contains separately attributed GPL material | 24 | Advanced atmosphere, bloom, camera, color, procedural geometry/materials, shadows, water, VFX, validation, and related graphics techniques |
| [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | `d4b0e35550c55ae70bdfcab4ef5a0e94610438a9` | 1,353 | 2026-09-27 | Apache-2.0 | 16 of 75 | Performance, feel, camera, UI/UX, procedural generation, shaders, input, audio, level design, asset creation, physics, saves, three.js scene/material/glTF setup, and rapid prototyping |

The selected gamedev folders are exactly:

`performance-optimization`, `game-feel`, `camera-systems`, `game-ui-ux`, `procedural-gen`, `shader-programming`, `input-systems`, `audio-design`, `level-design`, `create-game-assets`, `physics-tuning`, `save-systems`, `threejs-scene-setup`, `threejs-materials-lighting`, `threejs-gltf-loading`, and `prototype-fast`.

The graphics pack was kept intact as requested because its skills reference each other. The copied folders preserve their internal references and supporting assets.

## Approved gap coverage

| Repository | Commit SHA | Stars | Last push | License | Installed skills | Purpose |
|---|---|---:|---|---|---|---|
| [colyseus/skill](https://github.com/colyseus/skill) | `9e3ce1326a057f7f1edb71330e1cbb731b9e9536` | 2 | 2026-09-14 | MIT | `colyseus` | Colyseus 0.18 authoritative rooms, schema synchronization, reconnection, callbacks, and client prediction guidance |
| [livekit/agent-skills](https://github.com/livekit/agent-skills) | `5d7488b118c279812b89e73a9bee8474d1fe00a1` | 71 | 2026-10-06 | MIT | `reading-livekit-docs` | Forces current LiveKit facts to come from the Docs MCP, `lk docs`, or verified web documentation before code is written |
| [supabase/agent-skills](https://github.com/supabase/agent-skills) | `c9be0e931b7930f7d02126d04774d904c381e7d7` | 2,708 | 2026-10-02 | MIT | `supabase`, `supabase-postgres-best-practices` | Supabase product, Auth, Realtime, Storage, RLS, CLI, MCP, schema, and Postgres performance/security guidance |
| [dgreenheck/webgpu-claude-skill](https://github.com/dgreenheck/webgpu-claude-skill) | `af2319bd01bb7cc881267a9ef42cafdaf5e9029d` | 1,230 | 2026-04-10 | README states MIT; no SPDX record | `webgpu-threejs-tsl` | Three.js WebGPU renderer, TSL node materials, compute, post-processing, WGSL integration, and device-loss handling |
| [openai/plugins](https://github.com/openai/plugins) | `5fd93af4cd0c623e020d0cc7e9ce178b4ac1f70f` | 7,340 | 2026-09-28 | Per-plugin license metadata varies; no root SPDX record | `web-3d-asset-pipeline`, `web-game-foundations`, `game-playtest` | GLB/glTF and Blender handoff, browser-game architecture boundaries, and browser visual/playtest QA |

Only those three game-studio skill folders were copied from the OpenAI monorepo. The repository's unrelated skills and executable tooling were not copied.

## Security and provenance review

Every `SKILL.md` in the 59 selected folders was read. All four source repositories reported `fork: false`; no obvious mirror or fork was selected. A recursive scan covered source scripts and text files for network access, environment/secret reads, shell execution, encoding/obfuscation, agent configuration or hooks, destructive deletion, and global installs. No symlinks were found.

The scans found no executable scripts in CloudAI's pack. The other packs contain examples, QA helpers, and asset tools, but nothing was executed during this audit. The gamedev repository's `install.sh` can replace directories and was deliberately excluded. Its maintenance scripts can remove their own generated output; they were not copied or run. The graphics repository contains public texture/LUT fetch examples and a compiled ocean WASM asset; no user-data upload or secret access was found in the reviewed material. The majid pack has opt-in calls to named providers only: Tripo (`TRIPO_API_KEY`), Gemini (`GEMINI_API_KEY`), and ElevenLabs (`ELEVENLABS_API_KEY`). Its credential probe is not part of the copied skill folders' activation and was not run.

## Keys and project dependencies

The installed skills do not require keys just to load. Keys are needed only if Builders World elects to use the optional generators or services:

- `TRIPO_API_KEY` for Tripo 3D generation.
- `GEMINI_API_KEY` for Gemini image generation.
- `ELEVENLABS_API_KEY` for ElevenLabs audio generation.
- A scoped `SUPABASE_ACCESS_TOKEN` is required for Supabase CLI or MCP operations that need account/project management; the installed guidance explicitly warns against exposing service-role keys or using an unnecessarily broad classic token.
- LiveKit application code will need the project's own LiveKit URL and credentials when we reach implementation; the installed LiveKit skill itself only requires documentation lookup.
- Colyseus runtime work will need the project's pinned `colyseus`, `@colyseus/schema`, and `@colyseus/sdk` package versions; the installed skill targets 0.18 and tells us to verify the lockfile before writing code.
- A working three.js project and its pinned `three` version for the renderer skills; several examples target r186 and should be checked against the project's actual version.
- `@playwright/test` and the packages in a project's own test setup for the QA/release and browser-inspection examples.
- Pillow and Python 3.10+ for the `create-game-assets` raster reports/contact sheets if those scripts are used.
- DRACO/Meshopt/KTX2 decoder assets when compressed glTF is enabled.

The engine-neutral gamedev skills include illustrative Godot/Unity/GDScript/C# snippets and references. They were installed because they were explicitly approved, but those engine-specific related skills were not installed.

## Candidates held for a later decision

These were researched as possible follow-ups but were not installed because they are either redundant, too broad, or not directly needed yet:

- `livekit/agent-skills` also contains AI-agent building, debugging, testing, simulation, and scenario skills. They are not a direct human-to-human proximity-voice implementation, so only `reading-livekit-docs` was installed.
- The OpenAI plugin's other game-studio skills, including `three-webgl-game`, `react-three-fiber-game`, `phaser-2d-game`, and its router, were left out to avoid duplicate or out-of-scope engine guidance.
- No additional Blender-specific skill passed the same focused review with a clear benefit over the installed GLB/glTF asset-pipeline guidance and the existing Blender application access.

The remaining candidate repositories remain in an audit temp directory and are not active Codex skills. No Unity, Unreal, Godot, Roblox, Phaser, or other engine pack was installed.

## Open uncertainties

CloudAI's README says MIT while GitHub's API has no SPDX license record. The Scott pack's repository-level MIT license does not automatically relicense its separately attributed GPL example; keep that attribution boundary if the precipitation example is used. The installed guidance is advisory and some snippets are version-sensitive; production code must pin and verify the project's three.js, decoder, and browser versions. API keys, generated assets, and provider calls remain opt-in and were not exercised during this audit.
