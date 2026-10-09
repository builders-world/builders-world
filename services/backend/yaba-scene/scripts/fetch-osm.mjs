// Bake a district manifest from OpenStreetMap so the client can load it from
// static hosting / a CDN with no live API call.
//
//   npm run fetch:osm                      -> Yaba default
//   node scripts/fetch-osm.mjs "Yaba" 6.5095 3.3715 230
import { writeFile, mkdir } from 'node:fs/promises';
import { fetchOverpass, DEFAULT_PLACE, slug } from '../src/osm.js';

const [name = DEFAULT_PLACE.name, lat = DEFAULT_PLACE.lat, lon = DEFAULT_PLACE.lon, radius = DEFAULT_PLACE.radius] =
  process.argv.slice(2);
const place = { name, lat: +lat, lon: +lon, radius: +radius };

console.log(`Fetching OSM for ${name} (${lat}, ${lon}) r=${radius}m ...`);
const m = await fetchOverpass(place, 60000);
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
const out = new URL(`../public/data/${slug(name)}.json`, import.meta.url);
await writeFile(out, JSON.stringify(m));
console.log(`${m.buildings.length} buildings, ${m.roads.length} roads -> ${out.pathname}`);
