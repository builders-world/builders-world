# Yaba screen-recording review

Reviewed from the user-provided screen recording on 9 October 2026. The recording shows
the current world from a high aerial camera and a closer street camera during light rain.

## What is already working

- Rain streaks, wet reflections, cool overcast light, and warm window lights give the scene a
  clear time-of-day identity.
- The road network reads quickly from the aerial camera. The minimap, district objective,
  route chevrons, and yellow transit vehicles already create a usable navigation loop.
- The teal roof trims and amber windows create a simple color language that can survive a
  low-poly budget.
- The aerial overview establishes a large district and gives the player a useful sense of
  where the major destinations sit.

## What is limiting the current feel

- At street scale, the player is too small relative to the large empty road surfaces and
  anonymous gray blocks. The world needs more near-field silhouettes and fewer unbroken voids.
- Low-rise buildings currently read as placeholder boxes. Their rooflines, shopfronts, shutters,
  balconies, drainage edges, and utility attachments need authored variation.
- The scene has roads and lamps, but not enough of the edge conditions that make a Lagos street
  feel lived in: open drains, concrete shoulders, compound walls, market awnings, overhead wires,
  rooftop tanks, planters, signs, and informal gathering points.
- The existing tall buildings are readable landmarks but repeat the same window-grid language.
  A small set of stepped corner blocks and distinct roof caps will produce better district rhythm.
- The fog is useful for scale, but the far skyline is mostly pale placeholder massing. Reserve
  the strongest silhouettes for the player route and soften the rest through distance variation.

## Level-design implications

- Place a recognizable interaction anchor roughly every 100–150 metres on the main route: a
  community board, danfo stop, market canopy, painted compound, or lit corner shop.
- Compose every block in three layers: a readable street-edge kit, a mid-distance building
  rhythm, and a cheap far skyline. Do not spend hero geometry on every building.
- Let the route chevrons lead through authored spaces rather than across empty asphalt. Use
  drainage, curb breaks, planters, and awnings to make the route feel like a place the player
  is walking through.
- Keep aerial mode for district orientation. Street mode should reveal the authored details and
  make the player avatar feel human-scale.

## Asset pass created from this review

The procedural kit now includes the original six props plus six street-scale additions:

- `yaba_danfo_minibus.glb` — yellow transit silhouette with dark belt, windows, bumpers, and wheels.
- `yaba_compound_shop.glb` — low-rise street-facing shop/compound mass with awning and frontage.
- `yaba_midrise_corner_block.glb` — stepped-window landmark block with teal roofline and warm windows.
- `yaba_utility_pole.glb` — pole, crossarm, insulators, and cheap wire silhouette.
- `yaba_drainage_gutter.glb` — open drain segment with concrete walls and covers.
- `yaba_rooftop_water_tank.glb` — elevated tank silhouette for roof dressing.

All twelve exports are in `assets/exports/models/yaba-kit/`. They use shared procedural PBR
materials, Y-up GLB output, metre-scale origins, and named collision proxies. They are intended
to be instanced and composed by the graphics agent rather than dropped into the scene as one
large combined mesh.

## Open-source references worth evaluating

These sources are useful as licensed reference or supplemental background material, but they
should be adapted into the Builders World visual language instead of inserted unchanged:

- [Kenney City Kit (Suburban)](https://kenney.nl/assets/city-kit-suburban) — CC0 modular city
  pieces for generic background massing.
- [OpenGameArt Mali buildings](https://opengameart.org/content/mali-buildings) — CC0 West African
  low-poly silhouettes that can inform roof, courtyard, and wall proportions; they are not Lagos
  assets and need material and cultural adaptation.
- [Poly Haven Street Lamp 02](https://polyhaven.com/a/street_lamp_02) — CC0 reference/source for
  a more detailed lamp, but its listed 20K-triangle model is too expensive for repeated use
  without decimation or a fresh low-poly reauthoring.

## Review contract for Claude

Use the GLB manifest and the contact sheet before integrating. Prefer repeated authored kits,
instancing, and silhouette variation over denser meshes. Preserve the blue-gray / teal / amber
palette, and keep the player route readable in both the close street camera and the aerial view.
