# Builders World: arrivals onboarding

Recorded 9 October 2026 from Elvis Obi's onboarding direction.

Status: first local playable prototype implemented and browser-checked on 9 October 2026. This brief records the target experience; prototype boundaries are below. Work stays local until Elvis asks to push.

Shareable image-generation brief: [BUILDERS_WORLD_VISUAL_BRIEF.md](../../BUILDERS_WORLD_VISUAL_BRIEF.md). It is self-contained so Elvis can give it to ChatGPT without sharing the repository.

## Experience

Entering Builders World feels like arriving in a country through an airport. Before joining a community, visitors enter a country-specific pregame lobby. A visitor arriving from Nigeria enters the Nigeria lobby.

The visitor walks through a 3D terminal in first person, meets an arrivals attendant, and completes onboarding through an on-screen conversation. Questions and account-connection controls appear while the attendant remains part of the scene. Connecting an account is part of this encounter.

After check-in, the visitor continues to a destination-selection area: the equivalent of baggage claim, but for choosing a place to belong. They choose a city or destination, then a district/community. Next they board a plane, still in first person. An introductory video or animated presentation explains what they can do in Builders World while they customize their avatar. These activities happen together, rather than becoming two consecutive setup screens. An initial house is generated automatically from their connected identity/work and placed in the chosen community. Everyone begins with a default avatar; Elvis will supply its appearance and visual references later.

## Requested journey

1. **Country lobby.** Route the visitor to the lobby for their country. Nigeria is the initial example. The mechanism for detecting or selecting country is not yet specified.
2. **Walk to arrivals.** Use a first-person 3D viewpoint through the terminal to the attendant.
3. **Check in.** Ask whether the visitor is a developer or designer and present relevant connection steps, including GitHub or Dribbble as described by Elvis. Display prompts and connection status during the encounter.
4. **Choose a destination.** Nigeria initially offers Lagos, Abuja, Uyo, and Port Harcourt. These are destination labels; the underlying city/state hierarchy remains to be specified.
5. **Choose a district.** Selecting Lagos leads to a choice of Lagos districts. The chosen district is the visitor's community or village. Yaba is the existing prototype location and the only district currently available for this onboarding prototype. Additional districts remain to be confirmed.
6. **Board the plane and make your avatar.** Following destination selection, use a first-person passenger-seat view. Play a short introduction to the world while avatar customization is available on screen. Everyone starts from the provisional default. The avatar preview may show the whole character without changing the player's first-person camera. The exact presentation and final character design remain open for Elvis's visual examples.
7. **Receive a starter home.** Generate an initial house from the connected identity/work and reveal it for the selected district. Account connection supplies the identity; district choice supplies the destination. Generation rules and persistent ownership require separate implementation. No contribution score or house-upgrade rule is implied.
8. **Enter the community.** Complete onboarding into the selected district with the visitor's avatar and starter home.

## Boundaries set by Elvis

- Career growth, Git activity progression, and how the house evolves will be discussed later. Do not invent their scoring or growth rules in this onboarding work.
- The default avatar's appearance is forthcoming. Existing prototype art is not approval of the final avatar.
- Build locally first; do not push to GitHub yet.
- Build the onboarding now. The pending visual examples will guide iteration; they do not block a local prototype.
- Put Markdown deliverables in the project folder on the computer so Elvis can share them with ChatGPT for image generation.

## Relationship to the existing PRD and prototype

This is newer onboarding direction than PRD v1.0's short GitHub sign-in flow. It introduces country arrivals, a first-person onboarding camera, designer/developer questions, destination selection, and an airplane introduction with concurrent avatar customization. The flight belongs to first-time onboarding; it does not establish a flight system for later district travel.

The PRD's previous flat-site-first release plan and later designer league are not automatically a revised delivery schedule. Record a release-scope decision separately when agreed. First-person onboarding also does not decide the camera used inside a district.

PRD v1.0 classifies Dribbble as a profile link until an API is confirmed. Elvis's requested connection experience is the target; authenticated integration and available verification capabilities still need to be established. A local prototype must distinguish a simulated connection from a real linked account and must not invent verified metrics.

The application lives in `apps/world/yaba-scene`, a nested repository cloned from `builders-world/yaba-scene`. Its default entry now supplies this arrivals flow; `?world=1` retains direct district exploration. Real authentication and persistent shared home ownership are not implemented.

## Local prototype checkpoint

- Implemented: first-person Nigeria terminal and attendant; name and role; explicit demo GitHub/Dribbble connection; all four destinations; Yaba district or clearly labeled community previews; first-person flight; three-chapter animated introduction; simultaneous outfit/style preview; seed-derived starter-home reveal; local save/resume and restart; selected avatar/name carried into Yaba.
- Nigeria is a fixed prototype lobby, not an inferred country. No location or OAuth requests are made by onboarding.
- The starter-house reveal explores a provisional asset style. The explorable Yaba district still uses its original building kit for the resident's starter plot; the two house meshes are not an exact match.
- Checked with four state tests, eight desktop/mobile browser checks, and a production browser smoke pass. Detailed results, images, and motion evidence are in `apps/world/yaba-scene/artifacts/final-evidence.md`.
- The root visual brief remains the handoff for image generation. All avatar art and environment styling can change when Elvis supplies references.

## Proposed interaction details to refine

These are implementation suggestions, not additional confirmed requirements:

- Allow country correction if inferred location is wrong, without requiring precise location access.
- Keep the terminal visible behind dialogue and connection UI so onboarding feels like a conversation in the world.
- Preserve progress during external sign-in; show cancellation, failure, and retry in the arrivals conversation.
- Keep text dialogue usable without voice. Decide later whether the attendant has voice or AI behavior.
- Provide keyboard/touch navigation and reduced-motion transitions; avoid requiring a long walk to complete each step.
- Let the visitor review their destination before entering. Any existing district-move restriction should be explained before the choice becomes permanent.
- Separate the starter home's identity-derived appearance from physical plot assignment, so reconnecting or retrying cannot create duplicate homes.
- For the first prototype, a timed animated explainer can stand in for a produced video. Use captions and pause/replay/skip controls; avatar edits should remain available while it plays. A finished film is not required before testing this interaction.
- Keep the airplane environment visible around both the introduction and avatar preview. On small screens, retain the introduction in a compact area above accessible customization controls.
- Treat Nigeria as the initial local-preview country if country detection is not implemented, and state that clearly. Show unsupported destinations honestly instead of renaming the Yaba world.

## Open choices

- Initial Lagos districts and the district structure for Abuja, Uyo, and Port Harcourt.
- Country-routing behavior and handling countries whose worlds are not yet available.
- Default avatar design and available avatar choices.
- Introductory film references, final script, duration, sound, and transition into the district.
- Supported identity connections per role and the eventual real authentication/backend setup.
- Whether visitors can explore the lobby without signing in, and the return journey for existing residents.

## Implementation acceptance criteria when building

- The Nigeria arrivals journey is first person and contains a visible attendant encounter.
- Dialogue presents role and connection steps inside that encounter.
- Real and simulated connection states are clearly distinguished.
- Nigeria's four requested destinations appear; a destination cannot silently enter the Yaba scene under another city's name.
- A valid district is selected before home placement and entry.
- The default avatar is explicitly provisional until Elvis supplies the design.
- The airplane step comes after city/district selection, retains a first-person cabin view, and allows avatar editing while an introductory sequence runs.
- Introductory captions remain readable, playback can be skipped or replayed, and skipping does not lose avatar choices.
- Completion yields a starter-home preview/placement appropriate to the prototype's stated capabilities, without claiming persistent ownership unless implemented.
- Career progression remains outside this pass.
