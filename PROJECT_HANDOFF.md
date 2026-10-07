# Builders World: project handoff for Claude and the team

Prepared by Codex for Elvis Obi on 7 October 2026. Repository and workspace snapshot checked at approximately 23:27 WAT (Africa/Lagos).

This document gives Claude and the human contributors the context established with Codex so far. It records verified setup separately from product requirements and proposed working practices. It is a starting point for collaboration; keep subsequent decisions and progress in the repository.

**Repository handoff:** Elvis requested this document and the accompanying folder organization be shared through Git. Its shared location is [PROJECT_HANDOFF.md on GitHub](https://github.com/builders-world/builders-world/blob/main/PROJECT_HANDOFF.md). Fetch current repository state before relying on this dated snapshot, and update it when project decisions or access change.

## Read this first

- **Project:** Builders World, a working title. The local folder is now named `Builders-World`; its former name was `Indie World`.
- **Repository:** <https://github.com/builders-world/builders-world> — private, owned by the `builders-world` organization.
- **Stage:** product planning and development setup. The local project has a proposed folder structure but no application implementation yet.
- **First delivery:** a flat website with verified builder profiles, metrics, and league leaderboards. The 3D world is a later phase.
- **People:** Elvis Obi, Samson Goddy, Czar Ayotomide, and Joshua Ayokhai. Codex and Claude are development assistants working with this team.
- **Access:** Codex has verified GitHub access through Elvis's `obileonardo` account, including organization administrator membership and repository `ADMIN` permission. Vercel and Supabase CLI authentication was also verified during setup.
- **Infrastructure:** no Builders World Vercel deployment or Supabase project has been linked to this workspace.
- **Concurrent work:** use separate Git worktrees or clones and separate task branches. At this snapshot, there is only one worktree, on `main`.
- **Synchronization:** GitHub records shared work once it is pushed. Neither agent automatically receives the other's terminal conversation or uncommitted work in another worktree.

## People and working arrangement

| Contributor | Role supplied by Elvis |
| --- | --- |
| Elvis Obi | Design Engineer |
| Samson Goddy | Developer |
| Czar Ayotomide | Software Engineer |
| Joshua Ayokhai | Developer |

Elvis wants Codex and Claude to work concurrently. Claude is running in another terminal on the same computer. Contributors will also add requirements, decisions, and code to the shared repository.

Codex has not inspected Claude's current conversation, task list, configuration, or credentials. No direct agent messaging bridge or automatic synchronization process has been established. This handoff is the first shared project context document prepared for that purpose.

The three other contributors' GitHub usernames, invitation status, organization roles, and task assignments have not been verified. Their names in the README are a team roster, not evidence that access has been granted.

## Repository and local workspace

| Item | Verified value |
| --- | --- |
| GitHub organization | `builders-world` |
| Repository | `builders-world/builders-world` |
| Visibility | Private |
| Default branch | `main` |
| Local folder | `/Volumes/Elvis Obi - Mac Extended/Builders-World` |
| Fetch and push remote | `https://github.com/builders-world/builders-world.git` |
| Initial commit | `c7b224cf74672054550a9b8e360bdfa1bdb7a3ca` |
| Commit subject | `docs: initialize Builders World project and team brief` |
| Git identity configured locally | `Elvis Obi <74096579+obileonardo@users.noreply.github.com>` |
| Local branch at snapshot | `main`, tracking `origin/main` |

Before this handoff was added, the working tree was clean. A live remote branch check showed only `main`, at the same initial commit as the local checkout. GitHub inspection reported zero issues and zero pull requests. These are dated observations, not guarantees about future state; refresh them before starting work.

The repository was originally created as `obileonardo/builders-world` and pushed successfully. Its transfer to the organization was subsequently verified. Codex updated this checkout's `origin` to the organization address and confirmed Git could read the remote commit. Use the organization address going forward.

### Files currently available

| File | Purpose |
| --- | --- |
| [docs/product/builders-world-prd.md](docs/product/builders-world-prd.md) | PRD v1.0, authored by Elvis, dated 5 October 2026. Main editable product brief. |
| [docs/product/exports/builders-world-prd-v1.0.html](docs/product/exports/builders-world-prd-v1.0.html) | Illustrated PRD, including mockups and diagrams with details absent from the Markdown figure captions. |
| [docs/product/exports/builders-world-prd-v1.0.pdf](docs/product/exports/builders-world-prd-v1.0.pdf) | PDF version of the product brief. |
| [README.md](README.md) | Project status, PRD links, team roster, and initial collaboration guidance. |
| [.gitignore](.gitignore) | Excludes credentials, local platform state, dependencies, generated output, macOS metadata, and the Blender access test. |
| [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) | This dated handoff and proposed coordination workflow. |
| [docs/architecture/repository-layout.md](docs/architecture/repository-layout.md) | Complete directory map, intended responsibilities, and phase boundaries. |
| `docs/decisions/`, `docs/design/`, `docs/operations/`, `docs/collaboration/` | Starting guidance and homes for future shared project documentation. |

The local `tools/blender/access-test/` folder contains `blender-access-test.blend`, `blender-access-test.png`, and `verify_blender.py`, moved from the former `Blender Access Test/` folder. It is deliberately ignored by Git and is not available to teammates cloning the repository.

The folder organization reserves `apps/`, `services/`, `packages/`, `database/`, `assets/`, `infra/`, `tests/`, and `tools/` for the PRD's architecture. Empty areas use `.gitkeep` placeholders. No `AGENTS.md`, `CLAUDE.md`, executable application scaffold, dependency manifest, CI workflow, or automated test suite exists yet. No extra agent worktrees have been created. Directory names are proposed logical boundaries, not deployed services or a finalized technology stack.

The Markdown PRD was read in full for this handoff, and the HTML's diagram labels were reviewed. The PDF was inventoried as the companion document; it was not independently compared page by page. Mockup people and metrics are illustrative. Competitor adoption figures are claims in the PRD, not independently verified research from this handoff.

## Product understanding

### Purpose and audience

Builders World is a persistent browser world for indie builders and open source developers. Users connect the services where their work happens, and verified activity shapes their profile and eventually their plot in a shared city. Progress continues to be tracked while the user is away.

The verified identity and activity graph across GitHub, Stripe, and Product Hunt is the underlying product. The 3D world makes that work visible and creates short social visits. The expected experience is a ten- or fifteen-minute visit, rather than living inside a game.

The initial audience is developers who ship publicly: solo founders, maintainers, and indie hackers. Designers and creators come later as separate leagues. Scouts, investors, recruiters, and event organizers are potential paying customers in later phases.

### Delivery phases from the PRD

| Phase | Main scope | Goal or constraint |
| --- | --- | --- |
| 1 | Flat site; GitHub, Stripe, and Product Hunt; profiles, verified metrics, league leaderboards | Ship in weeks. Target 300 verified builders in Lagos, with 20% connecting Stripe. No 3D in this phase. |
| 2 | Lagos in 3D, starting with Yaba; generated plots, presence agent, proximity voice, notes | Target two unprompted visits per week. PRD specifies an under-eight-second load target on a mid-range phone connection. |
| 3 | Second and third cities; district rounds and map; GitLab; digests; stronger integrity dashboard | Expand the community and competition systems. |
| 4 | Designer and creator leagues; YouTube; nomad mode | Keep leagues distinct. |
| 5 | Hosted hackathons; scout and recruiter seats; partner districts | Add the later commercial products. |

The PRD also sketches nine monthly drops for the live world. That sequence is a proposal gated by retention and usage; it is not an implementation schedule already agreed by the team.

### Core behavior and scoring

- Onboard with GitHub, choose a home city, optionally connect Stripe and Product Hunt, and choose which metrics are public. The onboarding target is under two minutes.
- Only platform-verified sources count toward rankings. Link-only sources are profile links.
- Keep consistency and outcomes separate. There is no universal score combining every type of builder.
- Consistency measures days with qualifying work, with trivial changes and bot patterns excluded. Outcomes include stars, forks, contributions merged into other people's repositories, launches, and verified MRR.
- Weight consistency over bursts and outcomes over raw activity volume. Exact production formulas still need implementation decisions.
- Flag suspicious activity and hold affected accounts out of rankings for review. Integrity and moderation are part of the product, not later decoration.
- MRR is hidden by default. Store derived figures rather than customer lists or retained raw platform payloads.
- The social world adds plot cards, follows, notes on doors, proximity voice and text, and gated direct messages. Muting, blocking, and reporting must exist on the relevant surfaces.

### How the world should look and work

The future world uses roughly 30 parametric building pieces, assembled from verified metrics. Height expresses outcomes; footprint expresses breadth of active repositories. Recent activity lights windows, live presence creates a slow pulse, and inactivity dims plots after 14 days and darkens them after 60. Plots are not deleted because someone stops working.

Districts are small communities, generally 40–60 people per instance. Popular libraries can become monuments, with contributors clustered around them. District rounds use participation per builder rather than total output, require ten verified builders for ranked participation, and lock a home district for 90 days after joining or moving. Splits and merges need a deliberate integration process because they change people's neighbors.

The art direction is flat-shaded low poly, with strong silhouettes, vertex colors, and a dark blue/gray night palette. Warm amber light carries activity information. The flat website and admin use a daylight, white treatment with the same amber accent and related shapes.

Motion communicates changes: no decorative idle animation, no camera shake, slow presence pulses, and restrained arrival and growth animations. Reduced-motion behavior is required. Window pulses and sweeps should use shader uniforms rather than individual JavaScript animation loops.

Voxels, photorealism, user-decorated plots, tradable assets, coins, NFTs, and follower-based rankings are outside the stated initial direction.

### Architecture described in the PRD

These are requirements and design proposals, not infrastructure already built:

- Browser rendering with three.js. The HTML diagram identifies Colyseus rooms and LiveKit for the later realtime and voice layer.
- An API/auth gateway, signature-verifying webhook receiver, durable queue, ingest workers, platform pollers, scoring jobs, integrity checks, and a world builder.
- Postgres for users and derived state; Redis for presence, room state, and rate limits; object storage and a CDN for versioned manifests and the asset kit; a separate secrets vault for OAuth tokens.
- Hourly scoring, a six-hour Stripe refresh, daily Product Hunt polling with higher launch-day frequency, world rebuilds batched at 15 minutes, nightly decay, and additional retention, backup, moderation, and token-maintenance jobs.
- Five internal admin areas: ingestion health, moderation, ranking integrity, users/verification, and districts. SSO and audit logs are specified.
- Local, dev, staging, and production environments, with staged promotion, feature flags, canaries, compatible migrations, pinned kit versions, and rollback mechanisms.
- A flat site that stays available when realtime features degrade. Cached profiles, leaderboards, and manifests support this. Voice is shed early during load spikes.

Authentication to Vercel and Supabase does not mean these architecture requirements have been implemented or that those services alone cover the whole proposed system. The Phase 1 stack, service boundaries, hosting allocation, and cost plan still need to be made concrete.

### Privacy requirements to preserve

Use minimum scopes and read-only platform access where the integration supports it. Do not request or ingest builders' private repositories. Store derived metrics and discard raw platform payloads after normalization. Encrypt OAuth credentials in a secrets vault. Give users metric visibility controls, city-level location choices, export, and deletion with the PRD's 30-day grace period. Admin views must respect hidden MRR.

These describe the product's user-data model. Elvis's development account having private-repository and administrator access does not change the product's public-repository-only requirement.

## Completed setup and access

### GitHub

- Codex's own CLI login was verified through ChatGPT during setup. That is separate from GitHub authentication.
- GitHub CLI authentication is through `obileonardo` (Elvis Obi). HTTPS Git credential integration was configured with `gh auth setup-git --hostname github.com`.
- Actual private-repository Git access was tested, not just browser visibility.
- The initial Builders World commit and push succeeded. The repository now belongs to `builders-world`.
- Live checks during this handoff returned active organization membership with role `admin`, and repository permission `ADMIN`.
- Git remote access to `builders-world/builders-world` was verified. Local fetch and push URLs both point there.
- No teammate invitations, branch protections, repository rulesets, CI settings, or organization-wide policies have been configured or audited by Codex as part of this work.

The permissions belong to Elvis's authenticated account. Codex has not been created as a separate GitHub member or bot. Each human contributor should use their own account. Claude should verify its own terminal can use the existing local authentication rather than assuming identical access from this document.

### Vercel

Vercel CLI authentication succeeded as `obileonardo` during setup. The CLI version observed then was `62.1.0`, installed at `/opt/homebrew/bin/vercel`.

No Builders World Vercel project has been linked or deployed here. Team administrator rights, project environment variables, domains, and deployment permissions have not been separately verified. A successful account login should not be read as confirmation of those settings.

### Supabase

The Supabase CLI was installed through Homebrew, and browser-assisted login completed successfully. The version observed during setup was `2.119.0`. The login flow needed `--output-format text` in that terminal session.

Project listing verified an existing project named **Istos Agent**, reference `zvjbibhjhccwecidwzbi`, in `eu-west-3`, under organization `ovdzsrdtekhabissdxkp`. It was healthy when checked. That is an existing separate project, not a Builders World database allocation.

No Builders World Supabase project, local link, schema, migration, authentication configuration, or access policy has been created by Codex. Do not choose the Istos Agent project as the target for Builders World work merely because it is visible in the account.

### Blender

Elvis supplied this installation:

```text
/Volumes/Elvis Obi - Mac Extended/Apps/Blender.app
```

The command-line executable is:

```text
/Volumes/Elvis Obi - Mac Extended/Apps/Blender.app/Contents/MacOS/Blender
```

Version `5.2.2 LTS` was verified. Codex successfully used Blender's Python API in background mode to build a small scene, save a `.blend` file, and render a PNG using Cycles on the CPU. The scene is a blue beveled cube with a ground plane, light, and camera, rendered at 384 × 384 pixels.

The three resulting files are now in `tools/blender/access-test/`, and the PNG was opened in Preview for Elvis during setup. This is an access test, not part of the building kit or an approved product visual. No district scene, procedural kit, or production asset has been created yet.

Background rendering needed execution outside Codex's sandbox; the sandboxed attempt crashed. Use the runtime's approval mechanism when necessary rather than assuming Blender itself is broken.

### Local permissions and skills

The current Codex runtime permits ordinary project-file edits but restricts `.git` writes and network access. Approved commands can run with the necessary access. Earlier apparent GitHub authentication failures were resolved after running outside the restricted sandbox; the same saved GitHub credentials were usable.

No credentials, browser login codes, personal access tokens, or service keys belong in this file or in Git. Local authentication remains in the respective tools' credential storage. A remote clone does not inherit it.

Elvis intends to share Claude's skill and tooling inventory with Codex. That inventory has not been supplied, and no skill-parity installation has been completed. A CLI installed on the computer may be available to both terminals, but agent skills, MCP connections, runtime permissions, and chat context must be checked separately.

## How we coordinate through the repository

The README already establishes task branches, pull requests into `main`, separate worktrees for concurrent local work, and coordinated deployments and migrations. The workflow below makes that practical. It is a proposed operating agreement for Elvis, the other contributors, Claude, and Codex; it has not been installed as automation or enforced by repository rules.

### Where shared truth lives

| Information | Place to record it |
| --- | --- |
| Integrated implementation | Code and migrations merged into `main` |
| Product requirements | PRD, updated when a product decision is accepted |
| Technical decisions | A short versioned decision document, with rationale and any superseded decision identified |
| Who owns a task and what it touches | GitHub issue or equivalent agreed task record |
| Work in progress | Pushed task branch and draft pull request |
| What changed and how it was checked | Commits, PR description, and relevant test results |
| Current handoff context | A dated handoff or task update referencing the branch, PR, and commit |
| Secrets and personal authentication | Local credential storage or the intended platform's secret store, never Git |

The proposed task and decision records do not exist yet. Start with a small number of useful records rather than inventing a large process. This handoff is a historical snapshot, and should be updated or superseded as work progresses.

New instructions from Elvis or another contributor need to be captured in the relevant shared task or decision record so the other people and agents can see them. Direct instructions still guide the current conversation; record resulting decisions promptly and surface conflicts rather than silently overwriting someone else's plan. A chat message or local edit does not automatically update GitHub.

### Separate working directories

Give each active agent a separate Git worktree or clone, and each task its own branch. Suggested branch names are `codex/<task>` and `claude/<task>`; human contributors can use their own task branches.

Creating two branches while both terminals edit this one working directory does not isolate their work. A checkout or branch switch in a shared directory affects both terminals. Worktrees isolate the files and branch checkout while sharing the repository's Git objects and configuration.

Before starting simultaneous edits:

1. Agree the two worktree locations and create them from the current `origin/main`. The existing root can remain the integration/reference checkout.
2. Give each task one owner and define the files or subsystem it covers.
3. Tell each agent its own working directory, branch, and task record.
4. Avoid concurrent changes to shared contracts, lockfiles, generated assets, or migration numbering until ownership is agreed.

No worktrees or task branches were created while writing this handoff. Untracked files, including this handoff until published, do not automatically appear in a new worktree.

The root folder was renamed at Elvis's request. Reopen the project in both agent sessions and any editor using the new path:

```bash
cd '/Volumes/Elvis Obi - Mac Extended/Builders-World'
```

A session whose workspace permissions still name the old folder may need to be reopened against this location. The folder rename does not rename the GitHub repository, change `origin`, or move external applications such as Blender.

### Catch up before work and at handoff boundaries

Run these from the agent's own checkout:

```bash
git status --short --branch
git fetch origin
git log --oneline --decorate -10 origin/main
gh pr list --repo builders-world/builders-world --state open
gh issue list --repo builders-world/builders-world --state open
```

Then read the relevant updated requirements, decisions, task records, and PR diffs. Check local status before integrating anything. Fetching refreshes remote-tracking information; it does not merge changes into the files currently being edited.

For a clean integration checkout on `main`, `git pull --ff-only origin main` can advance it without inventing a merge. On a task branch, bring `origin/main` into that branch deliberately when needed, resolve conflicts, and rerun the checks affected by the integration. Do not pull blindly into another agent's active work, discard their edits, or rewrite a shared branch's history.

Refresh shared state before claiming a task, when dependencies change, before opening or merging a PR, and when handing work off. During a long task, check for relevant upstream updates at agreed intervals. No continuous watcher has been configured, so this is coordination at explicit checkpoints rather than automatic real-time awareness.

### Publish progress that the other agent can use

Push meaningful checkpoints and open a draft PR when a task is underway. Include a short status record such as:

```text
Updated: <date, time, timezone>
Owner: <human contributor and/or agent>
Task: <issue number or agreed scope>
Branch / PR: <branch name and PR link>
Working directory: <local path, when relevant>
Base / latest commit: <commit IDs>
Status: planned | in progress | blocked | ready for review | merged
Files / subsystem owned: <scope>
Completed: <what now works>
Validation: <checks run and results; say if not run>
Decisions / blockers: <what the next person needs to know>
Next action: <specific next step and owner>
```

Uncommitted edits are not a reliable team progress feed. If another agent needs a dependency, provide a pushed commit or PR and a short explanation. Work on that dependency intentionally; do not assume an open PR has already reached `main`.

Keep detailed updates with their task to reduce conflicts in this shared handoff file. Designate one person or agent to refresh the overall project snapshot during integration.

### Review, merge, and deploy

Use a PR into `main` to integrate a task. The author explains behavior changes and validation; another contributor or agent reviews where practical. Before merging, inspect current `main`, resolve conflicts, and run checks appropriate to the change. After merge, other worktrees fetch and integrate the new base as needed.

Git can merge many edits in different files, but it cannot decide whether two conflicting requirements or database changes are compatible. The task owners must resolve those conflicts explicitly and record the decision.

Use one owner at a time for an environment deployment or database migration. PRD staging and promotion requirements still apply when those environments exist. Repository access does not establish that a deployment target is configured, or that a merge should immediately deploy to production.

## Pending decisions and work

### Explicit questions in the PRD

- Final product name.
- Which Lagos district comes after Yaba, and how to recruit the first 100 Yaba builders.
- Whether the presence agent belongs in Phase 1 or Phase 2.

### Details to resolve during build planning

- Choose the Phase 1 frontend/backend stack and turn the PRD into a small, assigned implementation backlog.
- Define exact qualifying-work rules, score weights, verification states, privacy behavior, and acceptance criteria. Numeric examples in illustrative dashboards should not silently become final algorithms.
- Validate the current GitHub, Stripe, and Product Hunt API capabilities, scopes, webhook permissions, and rate limits before implementing connectors. The PRD expresses desired behavior; those integrations have not been tested for this product.
- Identify or provision the actual Builders World hosting and database projects, then configure the intended environments and secrets without repurposing unrelated projects.
- Confirm contributor access and decide the practical review/integration ownership. GitHub roles and repository rules have not been set up for the full team by Codex.
- Reconcile the Phase 2 phone load target with the initial mobile-3D exclusion, and make browser/device acceptance criteria explicit.
- Reconcile vertex-colors-only art direction with the separate suggestion of offline texture variation before creating textured assets.
- Clarify how transient README/commit-message processing and replay fixtures fit the rule against retaining raw source data.
- Align capacity targets: the PRD discusses a 40,000-concurrent surge, while its diagram gives a 5,000-concurrent initial design point with provider limits raised to 50,000. These are planning targets, not tested capacity.
- Decide which admin screens, jobs, and operating controls are needed in Phase 1 versus later phases. The full architecture is larger than the first flat-site delivery.

### What has not been built

There is no application scaffold, product OAuth implementation, database schema, production building kit, presence agent, realtime server, ranking engine, admin app, CI pipeline, deployment, or product test result to inherit yet. No background sync between Codex and Claude is running. Claude's additional skills and tools have not been imported.

The useful next step is to align on Phase 1 scope and split independent tasks after setting up separate worktrees. Keep the PRD and shared task records current as the team makes those decisions. Recheck the repository before starting: this document describes the state observed on 7 October 2026, and subsequent commits or instructions may supersede it.
