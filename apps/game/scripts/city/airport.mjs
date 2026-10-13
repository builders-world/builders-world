// Bake a city's airport for the open world (src/city/airfield.js): its runways, taxiways, aprons, terminals, hangars
// and tower, from OpenStreetMap, in the city's frame (x east, z south, metres from the city's centre, as bake.mjs).
//
// Elvis, 13 October 2026: "where are the airports? I can't visibly see the airport". Most of the cities' airports lie
// outside the baked box (JKIA is 12 km from Nairobi's centre, Victor Attah 27 km from Uyo's), so the airport is baked on
// its own, small, and drawn where it really is: on the country past the box, or over the city where the box takes it
// in (Kotoka, in Accra). The city's own bake already has the buildings inside its box, so those are left to it.
//
//   node scripts/city/airport.mjs nigeria/lagos        (fetches once from Overpass into .cache/city/<slug>/airport-osm.json)
//
// Map data © OpenStreetMap contributors (ODbL).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const GAME = new URL('../../', import.meta.url), REPO = new URL('../../../../', import.meta.url);
const key = process.argv[2] || 'nigeria/lagos';
const city = JSON.parse(readFileSync(new URL(`cities/${key}/city.json`, REPO), 'utf8'));
const slug = key.split('/').pop(), box = city.open || process.exit(console.error(`cities/${key}/city.json has no "open" box`));
// each city's airport (travelrules.js AIRPORTS has the same, by city name)
const AIRPORT = { lagos: ['DNMM', 'LOS', 6.5774, 3.3212], accra: ['DGAA', 'ACC', 5.6052, -0.1668], nairobi: ['HKJK', 'NBO', -1.3192, 36.9278], abuja: ['DNAA', 'ABV', 9.0068, 7.2632], 'port-harcourt': ['DNPO', 'PHC', 5.0155, 6.9496], uyo: ['DNAI', 'QUO', 4.8725, 8.093] };
const [icao, iata, alat, alon] = AIRPORT[slug] || process.exit(console.error(`no airport known for ${slug}`));
const KX = 111320 * Math.cos((city.lat * Math.PI) / 180), KZ = 110574;
const proj = (lon, lat) => [Math.round((lon - city.lon) * KX * 10) / 10, Math.round(-(lat - city.lat) * KZ * 10) / 10];
const [x0, z1] = proj(box.west, box.south), [x1, z0] = proj(box.east, box.north);
const inBox = (x, z) => x > x0 && x < x1 && z > z0 && z < z1;

// ---------- 1. the map, once ----------
const cache = new URL(`.cache/city/${slug}/airport-osm.json`, GAME);
async function overpass(q) {
  // (it turns busy callers away for a while: wait and ask again)
  for (let n = 0; n < 6; n++) for (const host of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    const r = await fetch(host, { method: 'POST', headers: { 'User-Agent': 'BuildersWorld-bake/1.0 (github.com/builders-world)' }, body: new URLSearchParams({ data: q }) }).catch(() => null);
    if (r?.ok) return r.json();
    await new Promise((res) => setTimeout(res, 15000));
  }
  throw new Error('Overpass did not answer');
}
let osm;
if (existsSync(cache)) osm = JSON.parse(readFileSync(cache, 'utf8'));
else {
  // the aerodrome round where the airport is: by its codes (OpenStreetMap has a code or two on the wrong one), else the biggest
  const head = await overpass(`[out:json][timeout:60];(way["aeroway"="aerodrome"](around:6000,${alat},${alon});relation["aeroway"="aerodrome"](around:6000,${alat},${alon}););out geom;`);
  const size = (e) => (e.bounds.maxlat - e.bounds.minlat) * (e.bounds.maxlon - e.bounds.minlon);
  const ad = head.elements.sort((a, b) => (b.tags?.iata === iata) - (a.tags?.iata === iata) || (b.tags?.icao === icao) - (a.tags?.icao === icao) || size(b) - size(a))[0] || process.exit(console.error(`no aerodrome near ${iata} in OpenStreetMap`));
  const b = ad.bounds, m = 0.004, bb = `${b.minlat - m},${b.minlon - m},${b.maxlat + m},${b.maxlon + m}`;
  const body = await overpass(`[out:json][timeout:90];(way["aeroway"](${bb});way["building"](${bb});node["aeroway"~"^(control_tower|tower)$"](${bb});node["man_made"="tower"]["tower:type"="observation"](${bb}););out geom;`);
  osm = { aerodrome: ad, elements: body.elements };
  mkdirSync(new URL('.', cache), { recursive: true }); writeFileSync(cache, JSON.stringify(osm));
}

// ---------- 2. into the city's frame ----------
const ring = (geom) => geom.map((n) => proj(n.lon, n.lat));
const outer = (e) => (e.type === 'way' ? ring(e.geometry) : (e.members || []).filter((m) => m.role === 'outer' && m.geometry).flatMap((m) => ring(m.geometry)));
const segDist = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); return Math.hypot(x - ax - dx * u, z - az - dz * u); };
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]]; let i = 0, dmax = -1;
  for (let k = 1; k < pts.length - 1; k++) { const d = segDist(pts[k][0], pts[k][1], a[0], a[1], b[0], b[1]); if (d > dmax) { dmax = d; i = k; } }
  return dmax <= eps ? [a, b] : [...simplify(pts.slice(0, i + 1), eps).slice(0, -1), ...simplify(pts.slice(i), eps)];
}
const pointInPoly = (x, z, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const centroid = (p) => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];
const flat = (p) => p.flat();
const closed = (p) => (p.length > 2 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1] ? p.slice(0, -1) : p);
const bound = closed(simplify(outer(osm.aerodrome), 4));
const near = (p) => p.some(([x, z]) => pointInPoly(x, z, bound) || bound.some(([bx, bz]) => Math.hypot(bx - x, bz - z) < 300));
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

const out = { v: 1, icao, iata: osm.aerodrome.tags.iata, name: osm.aerodrome.tags.name.replace(/\s+/g, ' ').trim(), bound: flat(bound), runways: [], taxiways: [], aprons: [], buildings: [], towers: [], terminals: [] };
for (const e of osm.elements) {
  const t = e.tags || {};
  if (e.type === 'node') { const [x, z] = proj(e.lon, e.lat); if (pointInPoly(x, z, bound)) out.towers.push([x, z, num(t.height) || 38]); continue; }
  const p = outer(e); if (p.length < 2 || !near(p)) continue;
  const isArea = p.length > 3 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1];
  if (t.aeroway === 'runway') {
    // a runway as its centreline, end to end (drawn as an area too sometimes: its long axis then)
    let a = p[0], b = p[p.length - 1], w = num(t.width) || 45;
    if (isArea) { const q = closed(p); let best = 0; for (const u of q) for (const v of q) { const d = Math.hypot(u[0] - v[0], u[1] - v[1]); if (d > best) { best = d; a = u; b = v; } } }
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 800 || out.runways.some((r) => segDist(...centroid([a, b]), ...r.p) < 30)) continue;
    // its two ends' numbers: the ref ("03/21"), or the heading to the nearest ten degrees
    let ref = (t.ref || '').replace(/\s/g, '').split('/');
    const hdg = ((Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI + 360) % 360, two = (h) => String(Math.round(h / 10) % 36 || 36).padStart(2, '0');
    if (ref.length !== 2 || !ref[0]) ref = [two(hdg), two((hdg + 180) % 360)];
    // OpenStreetMap does not say which end is which: the lower number is the end you take off from heading its way
    const n0 = parseInt(ref[0], 10), want = Math.round(hdg / 10) % 36 || 36, flip = Math.abs(((n0 - want + 54) % 36) - 18) > 9;
    out.runways.push({ ref: flip ? [ref[1], ref[0]] : ref, w, p: [...a, ...b] });
  } else if (t.aeroway === 'taxiway' && !isArea) out.taxiways.push({ w: Math.min(30, num(t.width) || 18), p: flat(simplify(p, 1)) });
  else if (t.aeroway === 'apron' && isArea) out.aprons.push(flat(closed(simplify(p, 1.5))));
  else if ((t.building || t.aeroway === 'terminal' || t.aeroway === 'hangar') && isArea) {
    const q = closed(simplify(p, 0.8)), [cx, cz] = centroid(q);
    if ((t.aeroway === 'terminal' || t.building === 'terminal') && pointInPoly(cx, cz, bound)) out.terminals.push([Math.round(cx), Math.round(cz)]); // (where the gates face: airfield.js)
    if (inBox(cx, cz)) continue; // the city's bake has it already (bake.mjs)
    if (!pointInPoly(cx, cz, bound)) continue;
    const k = t.aeroway === 'terminal' || t.building === 'terminal' ? 'terminal' : t.aeroway === 'hangar' || t.building === 'hangar' ? 'hangar' : t.aeroway === 'control_tower' || t['tower:type'] === 'air_traffic_control' ? 'tower' : 'building';
    const lv = num(t['building:levels']), h = num(t.height) || (lv ? lv * 3.6 : k === 'terminal' ? 20 : k === 'hangar' ? 17 : k === 'tower' ? 38 : 7);
    out.buildings.push({ k, h: Math.round(h), p: flat(q) });
  }
}
// the longest runway first: the one the planes use (airfield.js)
out.runways.sort((a, b) => Math.hypot(b.p[2] - b.p[0], b.p[3] - b.p[1]) - Math.hypot(a.p[2] - a.p[0], a.p[3] - a.p[1]));
// a tower: the one OpenStreetMap has, else by the biggest terminal
if (!out.towers.length && !out.buildings.some((b) => b.k === 'tower')) {
  const T = out.buildings.filter((b) => b.k === 'terminal').sort((a, b) => b.p.length - a.p.length)[0];
  if (T) { const xs = T.p.filter((_, i) => i % 2 === 0), zs = T.p.filter((_, i) => i % 2); out.towers.push([Math.round(Math.max(...xs) + 40), Math.round(zs.reduce((a, b) => a + b, 0) / zs.length), 40]); }
}
const [bx, bz] = centroid(bound); out.center = [Math.round(bx), Math.round(bz)]; out.inBox = inBox(bx, bz);
const dest = new URL(`public/city/${slug}/airport.json`, GAME);
writeFileSync(dest, JSON.stringify(out));
console.log(`${slug}: ${out.name} (${out.iata}), ${out.runways.length} runways (${out.runways.map((r) => `${r.ref.join('/')} ${Math.round(Math.hypot(r.p[2] - r.p[0], r.p[3] - r.p[1]))} m`).join(', ')}), ${out.taxiways.length} taxiways, ${out.aprons.length} aprons, ${out.buildings.length} buildings, ${out.towers.length} towers, ${Math.round(Math.hypot(bx, bz) / 100) / 10} km from the centre${out.inBox ? ', inside the box' : ''}; ${(JSON.stringify(out).length / 1024).toFixed(0)} kB`);
