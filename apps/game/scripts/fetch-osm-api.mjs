// Bake a district from the main OpenStreetMap API when the Overpass servers are down.
// One small bounding-box request, converted with the same parser the client uses.
// Keep it occasional: the main API is for light use, not for every visitor.
//
//   node scripts/fetch-osm-api.mjs                      -> Yaba default
//   node scripts/fetch-osm-api.mjs "Yaba" 6.5095 3.3715 230
import { writeFile, mkdir } from 'node:fs/promises';
import { parseOverpass, DEFAULT_PLACE, slug } from '../src/osm.js';

const [name = DEFAULT_PLACE.name, lat = DEFAULT_PLACE.lat, lon = DEFAULT_PLACE.lon, radius = DEFAULT_PLACE.radius] =
  process.argv.slice(2);
const place = { name, lat: +lat, lon: +lon, radius: +radius };

// a square a little larger than the district, so roads keep running past the edge
const r = place.radius * 1.3;
const dLat = r / 110574;
const dLon = r / (111320 * Math.cos((place.lat * Math.PI) / 180));
const bbox = [place.lon - dLon, place.lat - dLat, place.lon + dLon, place.lat + dLat].map((v) => v.toFixed(5)).join(',');

console.log(`Fetching OSM map data for ${name}, bbox ${bbox} ...`);
const res = await fetch(`https://api.openstreetmap.org/api/0.6/map?bbox=${bbox}`, {
  headers: { 'User-Agent': 'BuildersWorld/0.1 (district baking script)' },
});
if (!res.ok) throw new Error(`OSM API -> ${res.status}`);
const xml = await res.text();

const attr = (s, k) => (s.match(new RegExp(`\\b${k}="([^"]*)"`)) || [])[1];
const unescape = (s) => s?.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const nodes = new Map();
for (const m of xml.matchAll(/<node\b[^>]*>/g)) nodes.set(attr(m[0], 'id'), { lat: +attr(m[0], 'lat'), lon: +attr(m[0], 'lon') });

const elements = [];
for (const m of xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)) {
  const tags = {};
  for (const t of m[2].matchAll(/<tag\b[^>]*\/>/g)) tags[unescape(attr(t[0], 'k'))] = unescape(attr(t[0], 'v'));
  if (!tags.building && !tags.highway) continue;
  const geometry = [...m[2].matchAll(/<nd ref="(\d+)"/g)].map((n) => nodes.get(n[1])).filter(Boolean);
  elements.push({ type: 'way', id: +attr(m[1], 'id'), tags, geometry });
}

const manifest = parseOverpass({ elements }, place);
manifest.attribution = '© OpenStreetMap contributors (ODbL)';
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
const out = new URL(`../public/data/${slug(name)}.json`, import.meta.url);
await writeFile(out, JSON.stringify(manifest));
console.log(`${manifest.buildings.length} buildings, ${manifest.roads.length} roads -> ${out.pathname}`);
