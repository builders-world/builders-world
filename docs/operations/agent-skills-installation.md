# Builders World agent-skills installation guide

This guide installs the shared Builders World agent skills for Codex, Claude, or another agent that supports the `SKILL.md` format. It is written for the four-person team and for Claude running in a separate terminal.

The audited inventory and source commit records are in [agent-skills-audit-2026-10-07.md](./agent-skills-audit-2026-10-07.md). This guide records the installation performed on Elvis Obi's Mac on 2026-10-08.

## Important rules

- Copy skill folders; do not run a repository installer, `install.sh`, `npx plugins add`, or a global package installer.
- Do not overwrite an existing destination folder. A collision is a deliberate skip that should be reported to the team.
- Keep API keys, tokens, and `.env` files out of this repository.
- Read a skill's `SKILL.md` before using it. A skill is guidance, not permission to run commands or install dependencies automatically.
- Restart the agent after installation if it does not discover the new skills immediately.

## Destination paths

Use the destination expected by the agent you are configuring:

| Agent | User skill directory |
|---|---|
| Codex | `~/.agents/skills` |
| Claude Code | `~/.claude/skills` |
| Other `SKILL.md` agents | The user-level skills directory documented by that agent |

On this Mac, Codex's shared user directory is `/Users/elvisobi/.agents/skills`. Claude's local source directory is `/Users/elvisobi/.claude/skills`.

## Install from Claude's local folders

The following commands are for this Mac. They copy only folders that are missing and leave existing folders untouched. Run them in a zsh or bash terminal.

```bash
set -e
DEST="$HOME/.agents/skills"
CLAUDE_SKILLS="$HOME/.claude/skills"
mkdir -p "$DEST"

copy_if_missing() {
  local source="$1"
  local name="$(basename "$source")"
  local destination="$DEST/$name"
  if [ -e "$destination" ] || [ -L "$destination" ]; then
    printf 'SKIP existing: %s\n' "$name"
    return 0
  fi
  if [ ! -d "$source" ]; then
    printf 'MISSING source: %s\n' "$source" >&2
    return 1
  fi
  cp -R "$source" "$destination"
  printf 'INSTALLED: %s\n' "$name"
}

for name in high-end-visual-design minimalist-ui industrial-brutalist-ui redesign-existing-projects shadcn vercel-composition-patterns vercel-react-best-practices text-animations; do
  copy_if_missing "$CLAUDE_SKILLS/$name"
done

copy_if_missing "$HOME/.claude/plugins/cache/claude-plugins-official/frontend-design/d182ca456ca0/skills/frontend-design"
```

`design-taste-frontend` and `web-design-guidelines` are already shared through symlinks on this Mac. `ui-ux-pro-max` is already installed, so none of those three should be copied again.

## Install the Vercel skills from Claude's local plugin cache

This copies every folder in the pinned Vercel skill cache except the two intentionally excluded names. It does not install the Vercel plugin or its hooks.

```bash
set -e
DEST="$HOME/.agents/skills"
VERCEL_SKILLS="$HOME/.claude/plugins/cache/claude-plugins-official/vercel/0.50.0/skills"
mkdir -p "$DEST"

for source in "$VERCEL_SKILLS"/*; do
  [ -d "$source" ] || continue
  name="$(basename "$source")"
  case "$name" in
    shadcn|react-best-practices) printf 'SKIP requested exclusion: %s\n' "$name"; continue ;;
  esac
  destination="$DEST/$name"
  if [ -e "$destination" ] || [ -L "$destination" ]; then
    printf 'SKIP existing: %s\n' "$name"
    continue
  fi
  cp -R "$source" "$destination"
  printf 'INSTALLED: %s\n' "$name"
done
```

The pinned cache used for this installation was Vercel plugin version `0.50.0`. If that cache is absent on another machine, use the Vercel source repository and its documented release rather than copying an arbitrary cache.

## Install from upstream repositories

Claude's local folders are not committed to Builders World. A collaborator on another machine should clone the source repository into a temporary directory, copy only the listed skill folders, and delete the temporary clone afterward. Never run the source repository's installer.

| Source | Copy these skill folders |
|---|---|
| [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | `skills/*` (10) |
| [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) | `skills/*` (9) |
| [scottstts/Threejs-Awesome-Graphics-Agent-Skills](https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills) | `skills/*` (24); keep the set together because the skills reference each other |
| [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | Only the 16 folders listed below |
| [colyseus/skill](https://github.com/colyseus/skill) | The root `SKILL.md`, `LICENSE`, and `references/` into a destination folder named `colyseus` |
| [livekit/agent-skills](https://github.com/livekit/agent-skills) | `skills/reading-livekit-docs` |
| [supabase/agent-skills](https://github.com/supabase/agent-skills) | `skills/supabase`, `skills/supabase-postgres-best-practices` |
| [dgreenheck/webgpu-claude-skill](https://github.com/dgreenheck/webgpu-claude-skill) | `skills/webgpu-threejs-tsl` |
| [openai/plugins](https://github.com/openai/plugins) | `plugins/game-studio/skills/web-3d-asset-pipeline`, `web-game-foundations`, and `game-playtest` |

The exact audited commit SHAs, dates, licenses, and security notes are recorded in the audit report. Pin those SHAs when reproducibility matters.

For the gamedev pack, copy exactly:

```text
disciplines/performance-optimization
disciplines/game-feel
disciplines/camera-systems
disciplines/game-ui-ux
disciplines/procedural-gen
disciplines/shader-programming
disciplines/input-systems
disciplines/audio-design
disciplines/level-design
disciplines/create-game-assets
disciplines/physics-tuning
disciplines/save-systems
web-engines/threejs-scene-setup
web-engines/threejs-materials-lighting
web-engines/threejs-gltf-loading
workflows/prototype-fast
```

The taste/UI sources are [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill), [shadcn/ui](https://github.com/shadcn/ui), [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills), [vercel/vercel-plugin](https://github.com/vercel/vercel-plugin), Anthropic's `claude-plugins-official` marketplace, and Elvis Obi's local `text-animations` skill.

## Validate every installation

Run this after copying. It checks that every destination folder contains a `SKILL.md` and that its frontmatter name matches the folder name.

```bash
python3 - <<'PY'
from pathlib import Path
root = Path.home() / ".agents" / "skills"
errors = []
for folder in sorted(path for path in root.iterdir() if path.is_dir()):
    skill_file = folder / "SKILL.md"
    if not skill_file.exists():
        errors.append(f"{folder.name}: missing SKILL.md")
        continue
    name = None
    for line in skill_file.read_text(errors="replace").splitlines()[:40]:
        if line.startswith("name:"):
            name = line.split(":", 1)[1].strip().strip("\\\"'")
            break
    if name != folder.name:
        errors.append(f"{folder.name}: name={name!r}")
print(f"skills checked: {len([p for p in root.iterdir() if p.is_dir()])}")
if errors:
    raise SystemExit("\n".join(errors))
print("all SKILL.md names match their folder names")
PY
```

If the check reports an existing folder, do not merge files into it automatically. Compare the two versions, decide which source is authoritative, and record the decision in a pull request.

## Setup needed by some skills

Installing a skill does not install project dependencies or log into external services.

- Vercel skills require the Vercel CLI and an authenticated Vercel account for deployment, environment, logs, or project operations. On Elvis's Mac, the CLI is installed; run `vercel login` if the session is not authenticated.
- `shadcn` requires a project `components.json`, a supported React framework, and the project's package manager.
- React, Next.js, AI SDK, Vercel Storage, Auth, Connect, and Workflow skills require their corresponding packages and environment variables when those features are implemented.
- Three.js skills require a pinned `three` dependency; verify version-sensitive examples against the project's installed version.
- Colyseus requires pinned `colyseus`, `@colyseus/schema`, and `@colyseus/sdk` versions. The installed guidance targets Colyseus 0.18.
- LiveKit code requires the project's LiveKit URL and credentials. Use `reading-livekit-docs` before writing or changing LiveKit code.
- Supabase CLI/MCP work requires a scoped access token; never expose a service-role key in a browser client.
- Optional asset-generation skills may require `TRIPO_API_KEY`, `GEMINI_API_KEY`, or `ELEVENLABS_API_KEY`. Do not add those values to Git.
- Browser playtest skills may require `@playwright/test`; raster asset QA may require Python 3.10+ and Pillow.

## Team workflow

1. Clone or pull `builders-world/builders-world`.
2. Read `PROJECT_HANDOFF.md` and this guide.
3. Install into the correct user skill directory using collision-safe copies.
4. Run the validation script and restart the agent.
5. Work from the repository as the shared source of truth. Put project decisions and skill changes in reviewed commits.
6. If a skill suggests an installer, hook, telemetry, global package install, or external API call, stop and review the instruction before running it.

The intended runtime stack is three.js, Colyseus, LiveKit, Supabase, Vercel, and Blender. Engine-specific Unity, Unreal, Godot, Roblox, and Phaser skill packs are outside the project scope.
