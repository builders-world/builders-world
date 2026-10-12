#!/usr/bin/env bash
# Get a city ready to bake (bake.mjs): its map data and building heights, cut to the "open" box in its city.json with a
# margin round it, into .cache/city/<slug>/. Run from apps/game:
#
#   scripts/city/prepare.sh nigeria/abuja ~/osm/nigeria-latest.osm.pbf ~/ghs/GHS_BUILT_H_..._R9_C19.tif
#   node scripts/city/bake.mjs nigeria/abuja
#
# The country's map comes from https://download.geofabrik.de (<continent>/<country>-latest.osm.pbf); the heights tile
# from GHS-BUILT-H ANBH 2018 (JRC), tile R{(90-lat)//10+1}_C{(lon+180)//10+1}. Needs osmium, node, and a python with
# rasterio and numpy (PYTHON=..., default python3).
set -euo pipefail
key="$1" pbf="$2" tif="$3" PY="${PYTHON:-python3}"
slug="${key##*/}" out=".cache/city/$slug" M=0.025
read -r S W N E < <(node -e "const o = require('../../cities/$key/city.json').open; if (!o) { console.error('cities/$key/city.json has no open box'); process.exit(1); } console.log(o.south - $M, o.west - $M, o.north + $M, o.east + $M)")
mkdir -p "$out"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
# whole multipolygons (a lagoon, a park) even where they reach past the box
osmium extract -s smart -b "$W,$S,$E,$N" "$pbf" -o "$tmp/city.osm.pbf" --overwrite
osmium tags-filter "$tmp/city.osm.pbf" w/building w/highway w/railway w/landuse w/leisure w/natural w/waterway w/amenity \
  nwr/shop n/amenity n/railway=station,halt n/tourism n/leisure=fitness_centre,sports_centre n/office \
  r/building r/landuse r/leisure r/natural r/water -o "$tmp/f.osm.pbf" --overwrite
osmium export "$tmp/f.osm.pbf" -f geojsonseq -a type,id -o "$out/osm.geojsonseq" --overwrite
"$PY" scripts/city/heights.py "$tif" "$S" "$W" "$N" "$E" "$out/heights.json"
echo "$key ready: $out"
