# Builders World — immersive onboarding visual brief

Updated 9 October 2026. Prepared for Elvis Obi to share directly with ChatGPT for image generation. This document is self-contained; no access to the codebase is needed.

## What to create

Create a coherent set of concept images for the onboarding of **Builders World**, a browser-based social 3D world for developers and designers. The images will become visual references for a working local prototype. They should show believable game views and readable interaction layouts, so an engineer can translate them into scenes and interfaces.

The experience feels like arriving in a country, checking in at an airport, choosing where to live, and flying into a community of fellow builders. It should feel welcoming, immersive, and purposeful. The user's work identity connects to their place in the world.

These are visual references, not functioning account authorization, verified profiles, final game assets, or proof of persistent property ownership. A local prototype is being built in parallel. Elvis will share additional visual samples and the default avatar design later.

## The complete journey

| Stage | What the player experiences | What the image needs to communicate |
| --- | --- | --- |
| 1. Country arrivals lobby | Visitors enter the pregame airport lobby for their country. Nigeria is the initial example. | A first-person approach into a Nigerian arrivals terminal and a clear path to check-in. |
| 2. Meet the attendant | Walk to arrivals and speak to an attendant. Questions appear on screen while the attendant stays visible. | A human encounter inside a 3D space, with restrained dialogue and controls. |
| 3. Connect work identity | Choose developer or designer and connect an appropriate account, such as GitHub or Dribbble. | Connection controls belong to the arrivals conversation; no passwords are entered into the game. |
| 4. Choose a destination | Choose Lagos, Abuja, Uyo, or Port Harcourt, then a community/district where applicable. | An airport destination hall used to choose where to belong. Lagos → Yaba is the initial prototype route. |
| 5. Fly and customize | Sit inside a plane, still in first person. An introductory video or animated presentation explains the world while the player modifies their avatar. | The introduction and avatar editor are visible at the same time, with the cabin still framing the experience. |
| 6. Receive a home | A starter house is automatically generated using the connected work identity and assigned to the selected community. | A welcoming starter house in a lived-in builder neighborhood, with a simple arrival confirmation. |
| 7. Join the community | Enter the district with an avatar and a home. | Belonging, nearby neighbors, and somewhere to begin exploring. |

The journey order is **country lobby → arrivals conversation → role and account → city and district → airplane introduction plus avatar customization → starter home → community**.

The country is the arrival point. The city and district are the player's chosen community. Country inference, country correction, and unsupported-country behavior still need implementation decisions. Treat Nigeria as the example rather than implying every country is already built.

## Confirmed constraints

- The onboarding camera is first person, including inside the plane. An avatar-preview panel can show a full body character while the player's camera remains first person.
- The Nigerian destination list is **Lagos, Abuja, Uyo, Port Harcourt**. These are destination labels, not a finalized administrative hierarchy.
- **Yaba** is the initial Lagos district used by the prototype. Additional district names and availability are pending. Do not invent a confirmed district catalog.
- Everyone starts with a default avatar. **The final avatar appearance has not been supplied.** Use an explicitly provisional neutral mannequin or silhouette for concept composition. Do not establish a final face, body style, costume, species, gender, or mascot.
- Avatar customization happens **while the airplane introduction plays**. Do not turn it into a separate full-screen page after the film.
- A connected identity leads to an automatically generated starter house. The image can explore the house's form, but house-generation rules are not approved yet.
- Career progression, Git activity scoring, house upgrades, and rewards will be discussed later. Do not invent these systems or show numeric scores.
- Do not add NFT ownership, crypto wallets, tokens, game currencies, property prices, combat, or loot.

## Shared art direction for every image

Use one coherent **flat-shaded, low-poly architectural world**. Favor strong readable silhouettes, hard-edged geometry, simple materials, and surfaces that could be implemented in a browser. Use cool dark blue and blue-gray structures, softly separated depth, and warm amber lighting to guide attention. The established accent is approximately `#F2B33D`; the exact palette is a visual proposal until reviewed.

The airport should be spacious and calm. Give it a Nigerian identity through restrained green-white-green wayfinding accents, accurate destination names, and subtle contemporary local architectural cues. Avoid caricature, flag wallpaper, and stereotyped decoration. Maintain the same geometry language across the terminal, airplane, and district.

Keep warm color primarily in light sources and active interface accents. Use controlled glow around fixtures and windows, clean focal lighting, and readable shadows. Avoid photorealism, noisy textures, glossy sci-fi holograms, excessive bloom, or a generic neon metaverse look. This should be an achievable browser world with deliberate architecture.

Distinguish three layers:

1. **World geometry:** floor, walls, columns, signs, counters, attendant, airplane seats, windows, houses, streets.
2. **Interface:** crisp dialogue, account buttons, destination choices, playback controls, and avatar controls rendered above the scene. Keep text large, short, and high contrast.
3. **Placeholders:** the default-avatar silhouette, unproduced film imagery, and unconfirmed districts. Show these as design placeholders, without presenting them as finalized assets or supported functionality.

Use eye-level first-person compositions and a clear primary action. Avoid external aerial shots for the onboarding views. Request a **16:9 desktop view** first; then a **9:16 mobile adaptation** that rearranges controls while preserving the main scene. Mobile should have large touch targets and readable text, rather than a scaled-down desktop layout. If generated text is unreliable, leave clean text areas for later typesetting instead of dense invented words.

## Copy-and-paste image prompts

Each prompt below is independently usable. Generate the terminal image first, then attach that image as the style reference when generating the others. Match its materials, lighting, geometry, typography, and interface treatment throughout the series.

### Image 1 — Nigeria arrivals terminal

> Create a 16:9 game concept screenshot for Builders World, a browser-based 3D community for developers and designers. Show the player's FIRST-PERSON eye-level arrival inside a spacious Nigerian airport pregame lobby. A clear walkway leads toward an arrivals attendant's counter in the middle distance. Use a coherent flat-shaded low-poly architectural style: strong simple silhouettes, cool blue-gray walls and floors, dark blue structural framing, amber guide lighting and illuminated signs, subtle green-white-green Nigerian wayfinding accents. Include only a few short readable labels: “BUILDERS WORLD”, “NIGERIA ARRIVALS”, and “CHECK IN”. Use contemporary architecture, soft depth and calm atmospheric lighting. Keep the counter as the focal destination and reserve a quiet lower screen area for a small “Continue to arrivals” control. World signage is physical; screen controls are crisp overlay UI. No photorealism, neon sci-fi holograms, currencies, combat, crypto, or invented avatar design. Any background people are small provisional low-poly silhouettes. This is an achievable browser-game view, not an airport advertisement. Then create a matching 9:16 mobile adaptation with a readable walkway, visible counter, and a large bottom action.

### Image 2 — Arrivals attendant and account connection

> Create a 16:9 first-person game concept screenshot for Builders World. The player is standing directly at a Nigerian airport arrivals counter, speaking with a welcoming provisional low-poly attendant. Keep the attendant's face and upper body visible above the counter. Match this visual system: flat-shaded low-poly architecture, cool blue-gray surfaces, strong silhouettes, amber counter lighting and restrained green-white-green signage. Present a crisp, readable conversation overlay below or beside the attendant. Use short copy: “Welcome to Builders World”, “What do you build?”, two choices “Developer” and “Designer”, and a primary button “Connect GitHub”. Include “Dribbble” as the designer's alternative account option without implying both are required. A small interface label may say “Concept preview”. Show the design of a connection encounter; do not show passwords, fake verified statistics, access tokens, or a claim that a real account is already linked. The attendant is an environment character, not the player's final avatar. Preserve the feeling of a conversation in a 3D place, with generous spacing and one prominent next action. No full-screen website form, cyberpunk styling, currency, or NFT elements. Then create a matching 9:16 mobile view with the attendant above a concise dialogue panel and large touch controls.

### Image 3 — Choose a city and district

> Create a 16:9 first-person game concept screenshot of Builders World's destination-selection hall, reached after airport check-in in Nigeria. Match a flat-shaded low-poly world with cool blue-gray architecture, amber wayfinding lights, restrained Nigerian signage and strong clean silhouettes. Adapt the spatial idea of a baggage-claim hall into a place for choosing a community: a destination board and a calm selection kiosk, no focus on luggage. In a readable overlay show “Choose your city” with exactly four options: “Lagos”, “Abuja”, “Uyo”, “Port Harcourt”. Lagos is selected. A secondary detail area says “Choose your district” and shows “Yaba” with “Initial preview”; other districts remain unspecified. Include one primary action, “Continue to boarding”. Keep the destination board and perspective of the hall visible around the interface. The choices represent belonging, not tickets to purchase. Do not invent available districts, city statistics, prices, currencies, real maps with false boundaries, or final avatar designs. Then create a matching 9:16 mobile composition with vertically arranged city choices and the Yaba selection beneath, retaining a visible architectural focal point.

### Image 4 — Airplane introduction and simultaneous avatar customization

> Create a 16:9 game concept screenshot for Builders World showing the player seated INSIDE a passenger airplane in FIRST PERSON, after choosing Lagos and the Yaba district. The player's view contains the seatback ahead, an oval window, part of the neighboring seats and a softly lit cabin aisle. Match the same flat-shaded low-poly world as the Nigerian terminal: cool blue-gray geometry, dark blue seating, warm amber reading lights, clean materials, no photorealism. The seatback screen is visibly playing an introductory film or animated presentation about the world, showing a simple builder neighborhood with the short caption “Find your people. Build your place.” Include small play/pause and replay/skip controls. At the SAME TIME, show a restrained avatar customization overlay on the right, with a full-body neutral mannequin/silhouette labeled “Avatar preview — provisional”. Use only a few example appearance controls such as “Color” and “Style” with simple swatches; these controls are placeholders pending the final avatar design. Do not design a finished avatar, face, mascot or costume. The player remains in first person; the full-body silhouette belongs only in the preview panel. Both the film and editor must be legible and available simultaneously, with the airplane cabin framing them. A small destination label reads “Lagos / Yaba”. Include “Ready to arrive”. No NFTs, upgrades, currencies, combat, flight-simulation cockpit or external airplane shot. Then create a matching 9:16 mobile adaptation: compact introduction visible in the upper seatback area and avatar preview/controls below, without fully hiding either activity or replacing the cabin with a generic form.

### Image 5 — Starter home and community arrival

> Create a 16:9 first-person game concept screenshot for Builders World at the moment the player arrives in Yaba, Lagos and sees their automatically generated starter home. Use a welcoming, modest low-poly building with a clear doorway, simple roof, small frontage and amber window light. Show nearby homes, a shared pedestrian route and a few distant provisional silhouettes to communicate a community of builders. Match the airport and airplane's flat-shaded geometry, strong silhouettes, cool blue-gray night palette, soft depth, and warm amber lighting. The home should feel like a believable starter place, with room for future visual development but no invented progression system. A small readable overlay says “Welcome to Yaba”, “Your starter home”, and “Enter the community”. Treat home form as a concept proposal; do not show prices, verified metrics, Git scores, ranks, property deeds, wallets, NFTs, rewards or upgrade trees. Do not establish a final player avatar design. Frame this as an eye-level street arrival, not an isometric city-management screen. Then create a matching 9:16 mobile adaptation that preserves the home entrance, neighbor context and readable entry action.

### Image 6 — One coherent onboarding storyboard

> Create a clean six-panel storyboard of Builders World's first-time onboarding. Maintain exactly the same flat-shaded low-poly architectural world in every panel: cool blue-gray surfaces, hard-edged readable geometry, amber guide lighting, subtle Nigerian green-white-green wayfinding accents and calm composition. Panels 1–5 must use FIRST-PERSON eye-level views. Panel 1: enter the Nigeria arrivals terminal, following the path to check-in. Panel 2: speak with a visible arrivals attendant while a concise developer/designer and account-connection overlay appears. Panel 3: choose Lagos from Lagos, Abuja, Uyo, Port Harcourt, then select Yaba as the initial district. Panel 4: sit in a passenger airplane watching a seatback introduction while modifying a clearly provisional avatar silhouette in a separate visible overlay; film and customization happen at the same time. Panel 5: arrive at a modest automatically generated starter home in the Yaba community. Panel 6: show how the airplane film and avatar editor reflow into a portrait mobile view while both remain visible. Use short numbered captions outside the panels rather than dense text inside the scenes. Preserve the same colors, materials and UI across the whole sequence. No finalized avatar, invented districts, scores, career growth rules, property prices, currencies, NFT elements or combat. Deliver a 3-by-2 landscape storyboard with generous gutters and readable focal compositions. This storyboard is a visual reference for a browser prototype.

## Introduction content for the airplane

The first prototype can use a short captioned animated sequence while a produced film is being explored. A useful preliminary sequence is:

1. **“Welcome to Builders World.”** Show a small community and its streets.
2. **“Choose where you belong.”** Show Lagos and Yaba as the example route.
3. **“Your work gives you a place here.”** Show a connected identity leading to a starter-home preview, without numerical scoring.
4. **“Meet the people building around you.”** Show neighbors and community spaces as the intended experience.
5. **“Make yourself at home.”** Return attention to the player's avatar preview and arrival action.

These captions are a proposed script for review, not an approved promise that all social features are already implemented. Keep captions readable without sound. Allow pause, replay and skip. Skipping the introduction must preserve avatar choices.

## What to send back with generated references

Save individual images with clear names such as `01-nigeria-arrivals`, `02-arrivals-dialogue`, `03-city-district`, `04-plane-avatar`, `05-starter-home`, and `06-storyboard`. Label desktop and mobile variations separately. Note which details Elvis likes or wants changed, especially the terminal architecture, interface placement, cabin layout, and house silhouette.

The reference set should answer how the experience looks and how attention moves through it. Final avatar design, real account integration, country routing, destination availability, film production, and house-generation logic will be resolved through product decisions and implementation.
