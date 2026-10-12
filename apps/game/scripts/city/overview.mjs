// The whole city on one page, for the big map (src/look/menus.js, "city" view): its streets but not the service lanes,
// its parks, woods, campuses and water, simplified to a metre or two and rounded to whole metres, from the baked chunks
// (bake.mjs calls this at its end; it also runs on its own over chunks already baked):
//
//   node scripts/city/overview.mjs nairobi
//
// Writes public/city/<slug>/map.json: { box, classes, names, roads: [[class, name, [x, z, ...]]], land: [[kind, [...]]],
// water: [[...]] } in the city's frame (metres east and south of its centre), the same frame as the chunks. Each list of
// points is stored as its first point and then the step to each next one (decode: add them up), about half the size.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Douglas-Peucker on a flat [x, z, x, z ...] list
function simplify(p, tol) {
  const n = p.length / 2; if (n <= 2) return p.map(Math.round);
  const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(), ax = p[a * 2], az = p[a * 2 + 1], dx = p[b * 2] - ax, dz = p[b * 2 + 1] - az, L = Math.hypot(dx, dz) || 1;
    let best = -1, bd = tol;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((p[i * 2] - ax) * dz - (p[i * 2 + 1] - az) * dx) / L; if (d > bd) { bd = d; best = i; } }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  const out = []; for (let i = 0; i < n; i++) if (keep[i]) out.push(Math.round(p[i * 2]), Math.round(p[i * 2 + 1]));
  return out;
}
const area = (p) => { let a = 0; for (let i = 0, n = p.length / 2; i < n; i++) { const j = (i + 1) % n; a += p[i * 2] * p[j * 2 + 1] - p[j * 2] * p[i * 2 + 1]; } return Math.abs(a / 2); };
// the places a taxi can take you to across the city (look/rides.js): the landmarks, not every shop
const DEST = new Set(['shop:mall', 'marketplace', 'bus_station', 'ferry_terminal', 'hospital', 'university', 'college', 'hotel', 'cinema', 'arts_centre', 'museum', 'sports_centre', 'stadium', 'library', 'townhall', 'courthouse', 'embassy', 'station']);
const LAND = new Set(['park', 'grass', 'golf', 'pitch', 'cemetery', 'wood', 'scrub', 'campus', 'commercial', 'industrial']);

export function overview(dir) {
  const index = JSON.parse(readFileSync(new URL('index.json', dir), 'utf8'));
  const service = index.classes.indexOf('service');
  const roads = [], land = [], water = [], places = [], seen = new Set();
  for (const f of readdirSync(dir)) {
    if (!/^-?\d+_-?\d+\.json$/.test(f)) continue;
    const d = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    (d.segs || []).forEach((q) => { if (q.c === service) return; const p = simplify(q.p, 1.5); if (p.length >= 4) roads.push([q.c, q.n ?? -1, p]); });
    (d.land || []).forEach((l) => { if (!LAND.has(l.k)) return; const p = simplify(l.p, 3); if (p.length >= 6 && area(p) > 600) land.push([l.k, p]); });
    (d.poi || []).forEach((q) => { if (!DEST.has(q.k) || !q.n || seen.has(q.n) || /^(department|faculty|school of|lecture|room|block|wing|ward)\b/i.test(q.n)) return; seen.add(q.n); places.push([q.k, q.n, Math.round(q.x), Math.round(q.z)]); });
    (d.stations || []).forEach((q) => { if (!q.n || seen.has(q.n)) return; seen.add(q.n); places.push(['station', q.n, Math.round(q.x), Math.round(q.z)]); });
    (d.water || []).forEach((w) => { const p = simplify(w.p, 2); if (p.length >= 6 && area(p) > 100) water.push(p); });
  }
  roads.sort((a, b) => b[0] - a[0]); // the small streets first, so the big ones are drawn over them
  const body = { version: 1, city: index.city, box: index.box, chunk: index.chunk, classes: index.classes, names: index.names, roads, land, water, places };
  const delta = (p) => p.map((v, i) => (i < 2 ? v : v - p[i - 2]));
  body.roads = roads.map(([c, n, p]) => [c, n, delta(p)]); body.land = land.map(([k, p]) => [k, delta(p)]); body.water = water.map(delta);
  const s = JSON.stringify(body); writeFileSync(new URL('map.json', dir), s);
  return { bytes: s.length, places: places.length, roads: roads.length, land: land.length, water: water.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const slug = (process.argv[2] || 'nairobi').split('/').pop();
  const r = overview(new URL(`../../public/city/${slug}/`, import.meta.url));
  console.log(`public/city/${slug}/map.json: ${r.roads} streets, ${r.land} parks and woods, ${r.water} water, ${(r.bytes / 1e3).toFixed(0)} kB`);
}
