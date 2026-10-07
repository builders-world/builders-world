# Builders World

A 3D world where every building is generated from someone's real work. Product requirements, v1.0.

Working title. Author: Elvis Obi. 5 October 2026. Final draft for build planning.

## What this is

A persistent, browser-based 3D world for indie builders and open source developers. People link the accounts where their work already lives. The world reads that activity and draws them a plot. Ship consistently and your building grows and lights up. Stop and it goes dark.

Nobody lives here. People visit for ten or fifteen minutes to see who is shipping, say hello, leave a note, and go back to work. The world keeps updating while they are gone.

> The 3D is the marketing. The verified identity graph across GitHub, Stripe and Product Hunt is the product.

## Problem

Building in public happens on timelines. Timelines reward posting, not shipping. There is no place where a builder's actual output, verified and current, is the thing on display, and no place where you can bump into other builders with that context already loaded.

## Precedent

Two browser games out of Lagos in the last month prove the audience and the surge both exist.

\- Lagos Run, by Eureka (Opeyemi Adeniran). A browser game about driving a danfo from Ojuelegba to Yaba. It went viral and inspired the next one.  
\- Lagos Life, by Shalom Rayhamen (Eliy). A Sims-style multiplayer life sim set in Lagos, launched around 1 October 2026. Free, browser only, no install. Day one: 1,500 players. Day three: over a million visits and 250,000 active players. Within a week a tracker reported 40,000 concurrent players. Built by one developer on Next.js, client-rendered, shipped as a PWA for full-screen mobile play.

What this sets for us:

\- The audience is real and it is here. Lagos is already the place where browser worlds happen. Yaba is the first district.  
\- The surge plan is not theoretical. 40,000 concurrent in a week from a standing start is the number to design for, not 2,000.  
\- The bar is a 2D game's load time. Lagos Life opens in seconds on a phone. A 3D world that takes 30 seconds to load will lose to it.  
\- Solo-dev speed matters more than polish at launch. Lagos Life shipped in weeks. Phase 1 should too.

Where we differ: Lagos Life is a game about a fictional life. Ours is a world drawn from real work. Nothing in it is decorated by the player. That is the difference and the moat.

## Who it is for

\- v1: developers who ship in public. Solo founders, open source maintainers, indie hackers.  
\- v2: designers with public portfolios, and dev YouTubers.  
\- Paying later: scouts, investors and recruiters who want verified deal flow and hiring signal.

## Product principles

\- The world updates whether you log in or not. Work is tracked at the source. Logging in is never how you get counted.  
\- Verified or it does not count. OAuth with read-only scope, or it is a badge on the profile and nothing more.  
\- Leagues, not one score. Developers against developers. Cities against cities. No universal wealth number.  
\- Consistency over volume, outcomes over activity. 200 days of pushing beats one viral week.  
\- The world is big, the leaderboard is small. Status comes from walking up to a plot and seeing real work.  
\- Store derived numbers, never raw data. Keep the MRR figure, not the customer list.

## Core experience

### Onboarding

Sign in with GitHub. Pick a home city. Connect Stripe and Product Hunt if you have them. Choose what is public. Enter your district. Under two minutes.

*Figure: Account linking. Verified sources get a connect action and a plain statement of what is read. Link-only sources are visually lighter so nobody confuses the two.*

### The world

You spawn at your plot. Neighbours' windows are lit if they pushed in the last 24 hours and pulsing if they are working right now. Library monuments sit on the horizon. A small feed shows what your district did since you last visited.

*Figure: District view. Building height comes from outcomes (stars, forks, MRR). Lit windows come from the last 24 hours. Pulsing windows mean the owner's presence agent says they are working now. The dark building has not pushed in weeks.*

### Plot card

Walk up to a building, or tap it, and you get the owner's card. Only what they have chosen to show. Verified sources are marked. Actions are talk, leave a note, follow.

*Figure: Plot card. MRR shows only because this owner turned it on. Hidden by default.*

### Leaderboards

Small, tabbed, and always inside a league. Developers, designers (v2), cities. Filter by home city or world, and by window. Verified badge on every row that earned it.

*Figure: Leaderboard. Your own row is pinned under the fold so the top five is not the only thing that matters.*

### Notes on the door

Async messages left on a plot. The owner reads them next visit. No notification pressure, no inbox. This is the main way strangers start talking.

### Chat

\- Proximity voice and text in the world. Fades with distance.  
\- Direct messages, gated. Unverified accounts cannot send. New accounts are rate limited. Users choose: mutuals only, same district, anyone.  
\- Mute, block, report on every surface including voice. Blocked users are not rendered for you.  
\- Moderated spaces and open spaces. Default to moderated.  
\- Recruiter and investor messages are labelled and come from paid seats.

## How the world is generated

Nobody models this by hand. A kit of around 30 parametric building pieces and a rule set turn a builder's numbers into a structure. One city at a time, and only districts with people in them exist.

\- Height from outcomes: stars, forks, verified MRR, merged PRs to others' repos.  
\- Footprint from breadth: number of active repos.  
\- Lit windows from the last 24 hours. Pulsing from live presence.  
\- Decay: no push for 14 days dims the plot, 60 days darkens it. Nothing is ever deleted.  
\- Monuments: popular libraries get a landmark. Contributors cluster around it, so the map is the dependency graph.  
\- Districts: a city under 50 builders is a single crossroads. Over 50, it splits into named districts, 40 to 60 people per instance.

## Art direction

### Illustration

Flat-shaded low poly, at night, with light as the only colour that means anything. The style has three jobs: read at a distance, survive procedural assembly, and carry data. Anything that fights one of those is wrong however good it looks in a screenshot.

\- Flat shading, hard edges, no textures. Vertex colours only. Cheap in the browser, scales to thousands of plots, and a district palette is a colour change, not a new asset set.  
\- Night as the base. Dark blues and greys for the built world, one warm amber for light. Nothing else is allowed to be warm. Fog for depth, bloom on windows and nowhere else.  
\- Strong silhouettes. A plot is recognisable from its outline at 200 metres. Kit pieces are chunky and slightly oversized at the top, closer to a board game tower than a real building.  
\- Minimal avatars. Rounded forms, two dots for a face at most. No one is here to look at avatars.  
\- Each district gets one secondary colour for roofs and ground so Yaba and Lekki are tellable apart on the map and in the street.  
\- References: Townscaper for modular buildings that assemble procedurally and still look placed. Mini Motorways for palette restraint. Kentucky Route Zero for night mood. Monument Valley for silhouette, used lightly.  
\- Not this: voxels, photoreal, cel-shaded anime, isometric pixel art.  
\- The flat site and admin invert it. Daylight, white, the same amber accent, the same chunky silhouettes as 2D icons. Same family, different time of day.

### Animation

Slow, and only when something changed. Motion is a data signal, so if nothing changed, nothing moves.

\- Nothing idles. Buildings do not sway, avatars do not fidget, UI does not float.  
\- Lights behave like bulbs. A push turns one window on in about 400ms with a touch of overshoot. Presence is a slow breath at about 2.5 seconds, never a strobe. Decay goes out one window at a time over days.  
\- Growth happens while you are away. If someone is watching when a floor is added, it rises in about 600ms with a slight squash at the top. One floor, then stop.  
\- Avatars walk, they do not run. Talking shows as a soft ring at the feet. Five emotes: wave, point, nod, clap, sit.  
\- Camera never shakes. Third person, damped follow. District to district is a cut via the map, not a flight.  
\- One orchestrated moment: arrival. Fade from black, your plot first, then the street lights up outward over about 1.5 seconds.  
\- Monuments sweep a slow light, like a lighthouse. No animated geometry.  
\- Fireworks once a month in district colour for ten seconds when a round closes. The only celebration in the world.  
\- HUD eases 150 to 250ms from the edge it belongs to. No bounce. Standings tick, they do not scroll.  
\- Pulses and sweeps live in shaders driven by a uniform, never per-mesh JavaScript. 3,000 windows have to pulse at 60fps on a laptop with no real GPU.  
\- Respect prefers-reduced-motion. Pulses become steady lit, arrival becomes a fade, fireworks become a banner.

## Districts and the map

A district is the unit people belong to. It is a village: a name, a colour, a board at the spawn point, and you can see all of it at once. The map draws districts as patches, sized by builders and brightened by activity. The same view works at every scale. Zoom in on Lagos and you see Yaba, Lekki, Ikeja. Zoom out and Lagos, Nairobi, Accra, Cape Town and Cairo are patches of their own. Zoom out again and continents compare.

*Figure: The map. Patch size is headcount, brightness is activity. The standings score is participation per builder, so a tight 40-person district outranks a loose 112-person one.*

### District competition

Districts compete in monthly rounds. The score is per head, never total. Total output lets the biggest district win every round forever. Per-head scoring lets a small, disciplined district beat a large, loose one, which is the whole point.

\- Round score is the share of verified builders with a qualifying push on each day, averaged over the round, with a small bonus for outcomes per head. It is one number between 0 and 1.  
\- A district needs 10 verified builders to enter a ranked round. Under that, it plays unranked and still shows on the map.  
\- Home district locks for 90 days after joining or moving. Without this everyone migrates to the winner and the competition dies.  
\- A district caught in coordinated gaming (shared machines, timed trivial pushes across many accounts) forfeits the round. Individuals are reviewed separately. This makes neighbours police each other.  
\- The captain rotates monthly to the builder with the highest consistency. No elections. The captain can post to the district board, propose a hackathon, and nudge inactive neighbours. Nothing else.  
\- Winning a round leaves a permanent marker on the district board and on every participating plot. Nothing is taken from the losers.  
\- Rounds roll up. District rounds feed a city table, city tables feed a continent table. Same per-head rule all the way up.

### Hosted hackathons

A district hosts. A venue spawns in it for the length of the event, teams form on the floor, judges walk it, and the result is a permanent marker on every plot that took part. A real hackathon in Yaba gets a mirror venue in the world, so someone in Enugu or Kigali is in the room. The organiser pays for the venue.

\- Any verified organiser can request a venue. Captains can propose one for their district. Admins approve.  
\- Venue has its own board, its own voice rooms, a team formation wall, and a submissions list that links to repos. Submissions must be public repos created during the event window.  
\- Judges are named accounts with a judge badge for the event. Scoring is visible on the venue board when the event ends.  
\- Venues are torn down after the event. The marker on plots, the results board and the recording of the closing stay.  
\- Pricing is per venue per day, with a free tier for student and community events under 50 people. This is the first partner product.

## Data sources and verification

| Source                   | Method                              | Used for                        | Counts in ranking | Phase |
|--------------------------|-------------------------------------|---------------------------------|-------------------|-------|
| GitHub                   | OAuth, public scope only, webhooks  | Pushes, PRs, stars, forks       | Yes               | 1     |
| Stripe                   | Connect, read-only                  | MRR as a single number          | Yes               | 1     |
| Product Hunt             | OAuth                               | Launches, votes                 | Yes               | 1     |
| GitLab                   | OAuth, webhooks                     | Same as GitHub                  | Yes               | 2     |
| Paddle, Lemon Squeezy    | API key, read-only                  | MRR                             | Yes               | 2     |
| YouTube                  | OAuth                               | Uploads, views (creator league) | Separate league   | 2     |
| X, LinkedIn              | Link only                           | Profile link                    | No                | 1     |
| Behance, Dribbble, Figma | Link only until an API is confirmed | Profile link                    | No                | 2     |

Rule: if the user cannot grant read access through the platform itself, the data is a link on the profile and never an input to a score.

## Scoring

Two numbers per league, shown separately, never combined into one.

\- Consistency: days with a qualifying push in the window. A qualifying push changes more than a trivial diff and is not from a bot-pattern account.  
\- Outcomes: stars and forks weighted by recency, merged PRs to repos you do not own weighted highest, launches, verified MRR.  
\- Anti-gaming: commit bursts, timestamp-only diffs and star velocity spikes are flagged, held out of the leaderboard, and reviewed. See the integrity dashboard.

## System architecture

*Figure: Everything the world shows is read from Postgres and the district manifests. Raw platform payloads are discarded after normalisation.*

## Background services

These run without anyone logged in. They are the product more than the 3D client is.

| Service                | Trigger                               | What it does                                                                                     | Alert if                                      |
|------------------------|---------------------------------------|--------------------------------------------------------------------------------------------------|-----------------------------------------------|
| Webhook receiver       | GitHub, Stripe events                 | Verify signature, dedupe, enqueue                                                                | Lag over 60s or 5xx rate over 1%              |
| Ingest workers         | Queue                                 | Normalise events, write derived metrics, discard payload                                         | Queue depth over 10k                          |
| Stripe poller          | Every 6 hours per user                | Refresh MRR figure                                                                               | Failure rate over 5%                          |
| Product Hunt poller    | Daily, hourly on launch day           | Launches and votes                                                                               | Stale over 48h                                |
| YouTube poller         | Daily                                 | Uploads and views (v2)                                                                           | Quota exhausted                               |
| Scoring job            | Hourly                                | Recompute consistency and outcomes per league, per window                                        | Run time over 20 min                          |
| World builder          | Batched every 15 min on metric change | Rebuild plot params, regenerate district manifest, push to CDN                                   | Manifest older than 1h for an active district |
| Decay job              | Nightly                               | Dim and darken plots by inactivity                                                               | Did not run                                   |
| Integrity detector     | Hourly                                | Flag commit bursts, trivial diffs, star velocity spikes, hold from leaderboard                   | Flag rate over 2% of active users             |
| Presence reaper        | Every minute                          | Expire presence heartbeats older than 5 min                                                      | Never, log only                               |
| Token sweep            | Hourly                                | Refresh expiring OAuth tokens, mark revoked accounts unverified                                  | Refresh failure over 5%                       |
| District round scorer  | Nightly, final at round close         | Compute per-head participation score per district, roll up to city and continent, apply forfeits | Any district score moves over 0.2 in a day    |
| District rebalancer    | Weekly                                | Split districts over 60 average, merge under 15                                                  | Manual review on every split                  |
| Digest notifier        | Daily at 8am user local time          | Notes on your door, district activity, streak at risk                                            | Send failure over 2%                          |
| Moderation processor   | Realtime and queue                    | Route reports, auto-mute on threshold, voice transcript scan in moderated spaces                 | Queue age over 4h                             |
| Retention and deletion | Nightly                               | Execute delete requests after 30-day grace, purge expired exports, enforce region rules          | Any delete older than 31 days                 |
| Backups                | Hourly incremental, daily full        | Postgres and manifests                                                                           | Restore test fails monthly                    |

## Admin dashboards

Internal only. SSO, audit log on every action. Five screens for v1.

### Ingestion health

*Figure: Ingestion health. The four tiles map to the four alert thresholds in the services table.*

### Moderation queue

*Figure: Moderation queue. Reports from verified accounts are weighted higher. Suggested actions are shown, never auto-applied beyond a temporary mute.*

### Ranking integrity

*Figure: Integrity review. A genuine launch spike looks the same as a bought one at first glance. Verified Product Hunt launches auto-clear.*

### Users and verification

Search any user. See linked sources, verification state, token health, privacy settings as they set them, and their delete or export requests. Admins cannot see hidden MRR figures. Only the aggregate that the scoring job uses.

### Districts

*Figure: District management. Split and merge are manual here even though the rebalancer proposes them, because a split changes who someone's neighbours are. Setting a captain by hand is for emergencies only and is logged.*

## Privacy and security

\- Read-only, minimum scopes on every OAuth connection. Tokens encrypted at rest in a secrets vault, never in Postgres.  
\- Private repos are never requested and never ingested, even where a scope would allow it.  
\- Raw payloads are discarded after normalisation. The system stores counts and figures, not content.  
\- Every metric has a visibility toggle. MRR is hidden by default.  
\- Location is city level only. Users can hide city and appear in a global district.  
\- One hosting region at launch. GDPR and NDPR aligned from day one: plain-language policy, one-click export, one-click delete with a 30-day grace.  
\- Admin actions are logged and reversible. Admin app is SSO only.  
\- Impersonation is prevented by verification. An unverified account cannot claim a verified name.

## Environments and staging

Four environments. Nothing reaches production without passing through staging under replayed real traffic.

| Environment | Data                                                                                 | Deploys                             | Purpose                                                              |
|-------------|--------------------------------------------------------------------------------------|-------------------------------------|----------------------------------------------------------------------|
| Local       | Docker Compose, fake GitHub and Stripe event generators                              | Developer machine                   | Build a feature end to end without touching a real platform          |
| Dev         | Shared, wiped weekly                                                                 | Every merge to main                 | Integration between services                                         |
| Staging     | Synthetic city of 5,000 builders built from public GitHub Archive events, anonymised | Tagged release candidates           | Replay 24h of recorded webhook traffic at 10x. Load test. Soak test. |
| Production  | Real                                                                                 | Promoted from staging, canary first | Serve people                                                         |

### How a change gets out

i. Every user-facing change ships behind a feature flag, off by default.  
ii. Backend deploys daily. The 3D client ships weekly, because clients are cached and people notice.  
iii. World builder changes run on one district first as a canary. If the regenerated district passes visual checks and nobody reports breakage for 48 hours, it rolls to all districts overnight.  
iv. Database migrations are expand then contract. Add the column, backfill, switch readers, drop the old column a release later. No migration ever blocks a deploy.  
v. The asset kit is versioned. Every district manifest pins a kit version, so an old manifest always renders even after the kit moves on.  
vi. Rollback is a flag flip or a manifest version pin. Both take under a minute and need no deploy.

### Testing that matters here

\- Replay harness: record a day of real webhooks with user ids hashed, replay into staging before any ingest change.  
\- Bot swarm: headless three.js clients that walk districts, open plot cards and talk. 2,000 of them against staging before each phase.  
\- Visual regression on district renders: screenshot every district type at kit build time, diff against the last approved set.  
\- Chaos: kill one realtime node in staging every week and confirm rooms migrate. Run the same drill in production once a month during low traffic.

## Surge and resilience

Surges will come from predictable places: the product's own Product Hunt launch, a viral post, a well-known builder joining, a city onboarding night. The rule is that the world degrades gracefully. It never falls over, and the flat profile site never goes down at all.

*Figure: The CDN holds the client, the asset kit and every district's last known manifest, so a visitor can always load a district even when nothing behind the gateway is healthy.*

### Infrastructure decisions

\- One cloud region with three availability zones at launch. CDN is global. A second region only when a city on another continent has over 2,000 builders.  
\- Realtime rooms run on an autoscaling node pool. Scale on room count, not CPU, and keep 20% warm headroom. A room that loses its node migrates its players to a spare within 10 seconds.  
\- The webhook receiver only acknowledges and enqueues. It never does work in the request. GitHub and Stripe therefore never retry into a struggling system.  
\- Workers scale on queue depth. A backlog is a queue, which is fine, not an outage.  
\- Leaderboards and profiles are precomputed and served from cache. Nothing is calculated when a page loads.  
\- Postgres has one primary and two read replicas. All world and profile reads go to replicas.  
\- Voice is a managed service. It scales on its side, and it is the first thing switched off under load because it is the most expensive per user and the least essential.  
\- A signup waitlist flag sits at the gateway. It is the single most useful surge control: new accounts queue, existing accounts carry on.  
\- Backups hourly, restore tested monthly. Recovery target four hours, data loss target one hour.  
\- Public status page from day one. Say what is degraded before people ask.

## AI models by job

No single model builds this. Each job has a different right tool, and most of the system has no model in it at all.

| Job                                             | Model or tool                                                  | Notes                                                                                   |
|-------------------------------------------------|----------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| Writing the codebase, procedural rules, shaders | Claude, GPT-6 Astra, Codex-class agents                        | Astra is a language model. It writes three.js, it does not render anything.             |
| Rendering the world                             | three.js in the browser                                        | No AI at runtime. Procedural generation from stored numbers.                            |
| The 30-piece building kit                       | Meshy, Tripo, Hunyuan3D, Rodin, with manual cleanup in Blender | Generate props and variants, then a human fixes topology. Not districts, single pieces. |
| Texture variation                               | Flux or Stable Diffusion, offline                              | Baked into the asset kit, never generated live.                                         |
| Repo summaries on plot cards                    | A small, cheap model such as Haiku-class                       | Runs in the ingest worker on README and recent commit messages. Cached.                 |
| Builder matching, "people like you nearby"      | Embeddings model                                               | Embed repo topics and languages. v2.                                                    |
| Voice moderation in moderated spaces            | Streaming speech-to-text, then a safety classifier             | Transcripts kept only for reported segments.                                            |
| Text and note moderation                        | Safety classifier, Llama Guard class or vendor API             | Flags to the queue, never auto-bans.                                                    |
| Anomaly detection                               | No model. Rules and statistics.                                | Thresholds are easier to explain to a flagged user than a classifier is.                |

## Phases

i. Flat site. GitHub plus Stripe plus Product Hunt. Profile, verified metrics, one leaderboard per league. No 3D. Ship it in weeks, not months. Goal: 300 verified builders in Lagos, 20% connect Stripe.  
ii. Lagos in 3D, starting with Yaba. Generated plots, presence agent, proximity voice, notes on the door. Loads in under 8 seconds on a mid-range phone connection. Goal: builders return at least twice a week unprompted.  
iii. Second and third cities. District rounds and the map. GitLab. Digest notifier. Integrity dashboard hardened.  
iv. Designers and creators as separate leagues. YouTube. Nomad mode.  
v. Hosted hackathon venues. Scout and recruiter seats. Partner districts.

## How the world improves month to month

A world that never changes is a screenshot. Treat this like a live game: one visible drop a month, announced in advance, and every district regenerates overnight so people wake up to a changed skyline. Scores and history are never reset. Changes are additive.

*Figure: Nine months, nine visible changes. The order is a proposal. The gating rule is not.*

### Rules for changing a live world

\- One drop a month, same day each month, announced two weeks ahead on the changelog board and by digest.  
\- Additive only. New pieces, new districts, new mechanics. Nothing a builder earned is removed or re-scored. Scoring rule changes apply from the change date forward.  
\- Kit versions are permanent. A plot built with kit v1 can always be rendered with kit v1. Regeneration to a new kit is a choice made per district, canaried first.  
\- Monuments are earned, not placed. A library gets a monument when 25 verified builders in the world contribute to it. The threshold is public.  
\- Seasons are time-boxed. Ship Week runs seven days, has its own board, and leaves a permanent marker on every plot that took part. The main leaderboards are untouched.  
\- Small improvements ship continuously behind flags. The monthly drop is what gets announced, not the only thing that changes.

### Telemetry that decides what to improve

You cannot improve a world you cannot see people using. From the first week the client reports, anonymised and aggregated:

\- Where people stand. A heatmap per district. Empty streets get merged, crowded corners get space.  
\- Which plot cards get opened, and whether a note or a talk follows.  
\- Session length and return interval. The target is two visits a week unprompted.  
\- Where sessions end. If people leave from the leaderboard, the leaderboard is the problem.  
\- Join queue waits and degradation flags triggered, per district, per hour.

The monthly drop decision is made from these numbers and a short written review, not from the roadmap above. The roadmap is the plan until the data says otherwise.

## Risks

\- Retention. A 3D client competes with the IDE for attention. Mitigated by making the data layer the product and the world a short visit.  
\- Stripe trust. People may refuse to connect revenue. Mitigated by hidden-by-default and storing one number only. If connect rate stays under 10% in phase 1, rethink MRR entirely.  
\- Gaming. Every metric will be attacked. Mitigated by consistency weighting, verified-only inputs, and a hold-and-review queue.  
\- Cost. Realtime servers and voice scale with concurrency. Districts are capped so the ceiling is known.  
\- Platform dependence. GitHub or Stripe changing API terms would hurt. No mitigation beyond diversifying sources in phase 3.  
\- Safety. Open voice with strangers goes bad fast. Moderated default and verified-only speaking in moderated spaces.

## Out of scope for v1

\- Influencer and follower-based rankings.  
\- LinkedIn, Behance, Dribbble, Figma as data sources.  
\- Replicas of real offices or hubs.  
\- User-built or user-decorated plots.  
\- District prizes with cash value. Markers and standing only.  
\- Mobile 3D client. Mobile gets the flat profile and leaderboard.  
\- Any token, coin, NFT or tradable asset.

## Open questions

\- Which Lagos district seeds first after Yaba, and how the first 100 Yaba builders are recruited.  
\- Whether the presence agent ships in phase 1 or 2. It is cheap to build and it is the hook, but it is one more thing to install.  
\- Name.

------------------------------------------------------------------------

Mockups are illustrative. Builder names and figures are invented. Lagos Life and Lagos Run figures are from public reports in the first week of October 2026.

