// Bake a whole city into 200 m chunks for the open world (src/city/).
//
// Elvis, 12 October 2026: "it should be more of an open world that is that large, but people should only be able to
// access a small area at a time ... the playable area should have the grid, a similar resemblance of the grid for
// Nairobi so that people can relate to that better with similar streets and everything."
//
// The district builder (world.js) does all of this at load for a 230 m circle; for a city it would take minutes, so the
// work that needs the whole city (fitting every street to its building lines, keeping buildings off the roads and
// pavements, junctions, crossings, lamps and trees, heights) is done here, once, and saved per chunk. The game then
// only meshes the chunks round the player (src/city/chunkmesh.js), in a worker, a few a second.
//
//   osmium extract -b W,S,E,N kenya-latest.osm.pbf -o city.osm.pbf
//   osmium tags-filter city.osm.pbf w/building w/highway w/railway w/landuse w/leisure w/natural w/waterway w/amenity \
//     nwr/shop n/amenity n/railway=station,halt n/tourism n/leisure=fitness_centre,sports_centre n/office r/building r/landuse r/leisure r/natural -o f.osm.pbf
//   osmium export f.osm.pbf -f geojsonseq -a type,id -o .cache/city/<city>/osm.geojsonseq
//   python3 scripts/city/heights.py <GHS-BUILT-H tile> S W N E .cache/city/<city>/heights.json
//   node scripts/city/bake.mjs kenya/nairobi
//
// Map data © OpenStreetMap contributors (ODbL); heights partly GHS-BUILT-H 2018, EU JRC (CC BY 4.0).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseOverpass } from '../../src/osm.js';
import { joinStreetEnds, isFootway } from '../../src/look/streets.js';
import { buildNetwork, shapeJunctions, isDriveable } from '../../src/city/roadnet.js';
import { overview } from './overview.mjs';

const GAME = new URL('../../', import.meta.url), REPO = new URL('../../../../', import.meta.url);
const key = process.argv[2] || 'kenya/nairobi';
const city = JSON.parse(readFileSync(new URL(`cities/${key}/city.json`, REPO), 'utf8'));
const country = JSON.parse(readFileSync(new URL(`cities/${key.split('/')[0]}/country.json`, REPO), 'utf8'));
const box = city.open || process.exit(console.error(`cities/${key}/city.json has no "open" box`));
const slug = key.split('/').pop(), CH = box.chunk || 200;
const cache = new URL(`.cache/city/${slug}/`, GAME);
const C0 = { lat: city.lat, lon: city.lon };
const KX = 111320 * Math.cos((C0.lat * Math.PI) / 180), KZ = 110574;
const proj = (lon, lat) => [(lon - C0.lon) * KX, -(lat - C0.lat) * KZ];
const [x0, z1] = proj(box.west, box.south), [x1, z0] = proj(box.east, box.north); // the playable box in metres
const inBox = (x, z, m = 0) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;
const r1 = (v) => Math.round(v * 10) / 10;
const t0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

// ---------- geometry helpers ----------
const pointInPoly = (x, z, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const area = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const [x1_, z1_] = p[i], [x2, z2] = p[(i + 1) % p.length]; a += x1_ * z2 - x2 * z1_; } return a / 2; };
// what kind of place a feature is, for the minimap and the doors you can go through (look/index.js CITY_ROOM)
const poiKind = (t) => (t.shop ? `shop:${t.shop}` : t.amenity || t.tourism || t.office || (t.leisure === 'fitness_centre' || t.leisure === 'sports_centre' ? t.leisure : null));
const centroid = (p) => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];
const bbox = (p) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; p.forEach(([x, z]) => { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); }); return { x0: a, z0: b, x1: c, z1: d }; };
const scaleAbout = (pts, c, k) => pts.map(([x, z]) => [c[0] + (x - c[0]) * k, c[1] + (z - c[1]) * k]);
const segDist = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); return Math.hypot(x - ax - dx * u, z - az - dz * u); };
const hashN = (n) => { let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]]; let i = 0, dmax = -1;
  for (let k = 1; k < pts.length - 1; k++) { const d = segDist(pts[k][0], pts[k][1], a[0], a[1], b[0], b[1]); if (d > dmax) { dmax = d; i = k; } }
  return dmax <= eps ? [a, b] : [...simplify(pts.slice(0, i + 1), eps).slice(0, -1), ...simplify(pts.slice(i), eps)];
}
// a spatial hash of segments [ax, az, bx, bz, h, owner] for "is this point within h of any of them"
function segIndex(cell = 24) {
  const g = new Map(), k = (i, j) => i * 100003 + j;
  return {
    add(s) { const i0 = Math.floor((Math.min(s[0], s[2]) - s[4]) / cell), i1 = Math.floor((Math.max(s[0], s[2]) + s[4]) / cell), j0 = Math.floor((Math.min(s[1], s[3]) - s[4]) / cell), j1 = Math.floor((Math.max(s[1], s[3]) + s[4]) / cell); for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const kk = k(i, j); if (!g.has(kk)) g.set(kk, []); g.get(kk).push(s); } },
    hit(x, z, pad = 0, skip = null) { const l = g.get(k(Math.floor(x / cell), Math.floor(z / cell))); if (!l) return false; for (const s of l) if (s[5] !== skip && segDist(x, z, s[0], s[1], s[2], s[3]) < s[4] + pad) return true; return false; },
    near(x, z) { return g.get(k(Math.floor(x / cell), Math.floor(z / cell))) || []; },
  };
}
function pointIndex(cell = 8) {
  const g = new Map(), k = (i, j) => i * 100003 + j;
  return {
    add(p) { const kk = k(Math.floor(p.x / cell), Math.floor(p.z / cell)); if (!g.has(kk)) g.set(kk, []); g.get(kk).push(p); },
    within(x, z, d) { const r = Math.ceil(d / cell), ci = Math.floor(x / cell), cj = Math.floor(z / cell); for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) for (const p of g.get(k(i, j)) || []) if (Math.hypot(p.x - x, p.z - z) < d) return p; return null; },
  };
}

// ---------- 1. read the map ----------
const els = [], land = [], water = [], rivers = [], pois = [], farWater = [], coast = [], SEA = 2500;
const LAND = { park: 'park', garden: 'park', recreation_ground: 'park', village_green: 'grass', grass: 'grass', meadow: 'grass', golf_course: 'golf',
  pitch: 'pitch', stadium: 'pitch', track: 'pitch', playground: 'park', cemetery: 'cemetery', grave_yard: 'cemetery', forest: 'wood', wood: 'wood',
  nature_reserve: 'wood', scrub: 'scrub', parking: 'paved', commercial: 'commercial', retail: 'commercial', industrial: 'industrial', railway: 'industrial',
  residential: 'residential', construction: 'bare', brownfield: 'bare', farmland: 'grass', allotments: 'grass', school: 'campus', university: 'campus', college: 'campus', hospital: 'campus' };
const rl = createInterface({ input: createReadStream(new URL('osm.geojsonseq', cache)) });
let nIn = 0;
for await (let line of rl) {
  line = line.replace(/^\x1e/, ''); if (!line) continue;
  const f = JSON.parse(line), g = f.geometry, t = f.properties || {}; nIn++;
  const id = t['@id'], type = t['@type'];
  if (g.type === 'Point') {
    const [x, z] = proj(...g.coordinates); if (!inBox(x, z, 60)) continue;
    if (t.railway === 'station' || t.railway === 'halt') els.push({ type: 'node', id, lat: g.coordinates[1], lon: g.coordinates[0], tags: t });
    const kind = poiKind(t); if (kind && t.name) pois.push({ x: r1(x), z: r1(z), k: kind, n: t.name });
    continue;
  }
  const rings = g.type === 'Polygon' ? [g.coordinates[0]] : g.type === 'MultiPolygon' ? g.coordinates.map((p) => p[0]) : g.type === 'LineString' ? [g.coordinates] : [];
  for (const ring of rings) {
    const pz = ring.map(([lon, lat]) => proj(lon, lat)); const b = bbox(pz);
    // the coast (land on its left as it runs): kept further out, to be closed into the sea below
    if (t.natural === 'coastline' && g.type === 'LineString') { if (!(b.x1 < x0 - SEA || b.x0 > x1 + SEA || b.z1 < z0 - SEA || b.z0 > z1 + SEA)) coast.push(pz); continue; }
    if (b.x1 < x0 - 80 || b.x0 > x1 + 80 || b.z1 < z0 - 80 || b.z0 > z1 + 80) continue;
    const isArea = g.type !== 'LineString';
    // a named place drawn as its building (many banks, cafés and gyms are): a place at its middle, and the building too
    if (t.building && isArea && t.name && poiKind(t)) { const [cx, cz] = centroid(pz); if (inBox(cx, cz, 60)) pois.push({ x: r1(cx), z: r1(cz), k: poiKind(t), n: t.name }); }
    if (t.building && isArea) { els.push({ type: 'way', id, tags: t, geometry: ring.map(([lon, lat]) => ({ lon, lat })) }); continue; }
    if ((t.highway || t.railway) && !isArea) { els.push({ type: 'way', id, tags: t, geometry: ring.map(([lon, lat]) => ({ lon, lat })) }); continue; }
    if (t.waterway && !isArea && ['river', 'stream', 'canal'].includes(t.waterway)) { rivers.push({ w: t.waterway === 'river' ? 7 : t.waterway === 'canal' ? 5 : 2.5, p: simplify(pz, 0.8) }); continue; }
    if (isArea && (t.natural === 'water' || t.water || t.waterway === 'riverbank' || t.landuse === 'reservoir' || t.leisure === 'swimming_pool')) {
      water.push({ p: simplify(pz.slice(0, -1), 0.6) });
      // and the big water whole, past the box too (a lagoon, a harbour, a lake), for the far ground (openworld.js)
      if ((b.x1 - b.x0) * (b.z1 - b.z0) > 4e5) { const q = simplify(pz.slice(0, -1), 12); if (q.length >= 3 && Math.abs(area(q)) > 2e5) farWater.push(q.flatMap(([x, z]) => [Math.round(x), Math.round(z)])); }
      continue;
    }
    const k = isArea && (LAND[t.leisure] || LAND[t.landuse] || LAND[t.natural] || LAND[t.amenity]);
    if (k) land.push({ k, p: simplify(pz.slice(0, -1), 0.8), a: Math.abs(area(pz)) });
    // (a shop or office drawn as an area, without a building tag: its name still marks the place)
    if (isArea && t.name && poiKind(t) && !t.building) { const [cx, cz] = centroid(pz); pois.push({ x: r1(cx), z: r1(cz), k: poiKind(t), n: t.name }); }
  }
}
// ---------- the sea: OpenStreetMap draws no ocean, only the coastline, land to its left. Join the coast's pieces, cut
// them to a rectangle a little past the box, and close each one round the rectangle on its water side ----------
{
  const key = ([x, z]) => `${x.toFixed(1)},${z.toFixed(1)}`, byStart = new Map();
  coast.forEach((c) => byStart.set(key(c[0]), c));
  const used = new Set(), chains = [];
  coast.forEach((c) => {
    if (used.has(c)) return; used.add(c);
    let ch = c.slice();
    for (let n = byStart.get(key(ch[ch.length - 1])); n && !used.has(n); n = byStart.get(key(ch[ch.length - 1]))) { used.add(n); ch = ch.concat(n.slice(1)); }
    // and backwards, from whatever ends where this starts
    for (let found = true; found;) { found = false; for (const o of coast) if (!used.has(o) && key(o[o.length - 1]) === key(ch[0])) { used.add(o); ch = o.concat(ch.slice(1)); found = true; break; } }
    chains.push(ch);
  });
  const X0 = x0 - SEA, X1 = x1 + SEA, Z0 = z0 - SEA, Z1 = z1 + SEA, P = 2 * (X1 - X0) + 2 * (Z1 - Z0);
  const inR = ([x, z]) => x >= X0 && x <= X1 && z >= Z0 && z <= Z1;
  // where a segment crosses the rectangle's edge
  const cross = (a, b) => { let t0 = 0, t1 = 1; const dx = b[0] - a[0], dz = b[1] - a[1]; for (const [p, q] of [[-dx, a[0] - X0], [dx, X1 - a[0]], [-dz, a[1] - Z0], [dz, Z1 - a[1]]]) { if (p === 0) { if (q < 0) return null; continue; } const r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r); } return t0 <= t1 ? [t0, t1] : null; };
  const at = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  // distance round the rectangle's edge, clockwise in the picture from its top-left corner
  const per = ([x, z]) => (Math.abs(z - Z0) < 0.5 ? x - X0 : Math.abs(x - X1) < 0.5 ? (X1 - X0) + (z - Z0) : Math.abs(z - Z1) < 0.5 ? (X1 - X0) + (Z1 - Z0) + (X1 - x) : 2 * (X1 - X0) + (Z1 - Z0) + (Z1 - z));
  const corners = [[0, [X0, Z0]], [X1 - X0, [X1, Z0]], [X1 - X0 + Z1 - Z0, [X1, Z1]], [2 * (X1 - X0) + Z1 - Z0, [X0, Z1]]];
  const walk = (from, to, dir) => { const out = []; const d = (t) => (((dir > 0 ? t - from : from - t) % P) + P) % P, span = d(to); corners.map(([t, c]) => [d(t), c]).filter(([u]) => u > 0 && u < span).sort((a, b) => a[0] - b[0]).forEach(([, c]) => out.push(c)); return out; };
  const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > pt[1]) !== (zj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - zi)) / (zj - zi) + xi) c = !c; } return c; };
  let seas = 0;
  chains.forEach((ch) => {
    // the pieces of the coast inside the rectangle, each from one edge to another
    const pieces = []; let cur = null;
    for (let i = 0; i < ch.length - 1; i++) {
      const a = ch[i], b = ch[i + 1], c = cross(a, b); if (!c) { cur = null; continue; }
      const p0 = at(a, b, c[0]), p1 = at(a, b, c[1]);
      if (!cur) { cur = { pts: [p0], open: c[0] > 0 || !inR(a) }; pieces.push(cur); }
      cur.pts.push(p1);
      if (c[1] < 1) { cur.close = true; cur = null; }
    }
    pieces.filter((q) => q.open && q.close && q.pts.length >= 2).forEach(({ pts }) => {
      // the water is on the right of the way the coast runs (land on its left; z is south, so the right is (-dz, dx))
      const m = Math.floor(pts.length / 2), a = pts[Math.max(0, m - 1)], b = pts[m], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const wet = [(a[0] + b[0]) / 2 - ((b[1] - a[1]) / L) * 3, (a[1] + b[1]) / 2 + ((b[0] - a[0]) / L) * 3];
      const s0 = per(pts[0]), s1 = per(pts[pts.length - 1]);
      const sea = [1, -1].map((dir) => pts.concat(walk(s1, s0, dir))).find((poly) => inside(wet, poly));
      if (!sea) return;
      water.push({ p: simplify(sea, 0.6) }); seas++;
      const q = simplify(sea, 12); farWater.push(q.flatMap(([x, z]) => [Math.round(x), Math.round(z)]));
    });
  });
  if (coast.length) log(`the sea: ${coast.length} pieces of coast in ${chains.length} runs, ${seas} stretches of sea`);
}
log(`read ${nIn} features: ${els.length} ways and stations, ${land.length} land areas, ${water.length} water, ${rivers.length} rivers, ${pois.length} places`);

// the district manifest parser, so the open world reads the map exactly as the districts do
const man = parseOverpass({ elements: els }, { name: city.name, lat: C0.lat, lon: C0.lon, radius: 1e9 });
const roads = man.roads.filter((r) => r.pts.some(([x, z]) => inBox(x, z, 40)));
const rails = (man.rails || []).filter((r) => r.pts.some(([x, z]) => inBox(x, z, 40)));
const stations = (man.stations || []).filter((s) => inBox(s.x, s.z, 20));
// the building's own tags, for what kind of building it is (parseOverpass keeps only the height)
const btags = new Map(els.filter((e) => e.tags.building).map((e) => [e.id, e.tags]));
let blds = man.buildings.filter((b) => b.pts.length >= 3).map((b) => { const c = centroid(b.pts); return { ...b, c, bb: bbox(b.pts), a: Math.abs(area(b.pts)), t: btags.get(b.id) || {} }; })
  .filter((b) => b.a >= 14 && inBox(b.c[0], b.c[1]));
log(`${roads.length} roads, ${rails.length} rail lines, ${stations.length} stations, ${blds.length} buildings`);

// ---------- 2. the road network (src/city/roadnet.js): nodes where roads meet, segments between them, one profile per
// class of road, and every junction shaped so nothing overlaps (after Cities: Skylines) ----------
// each road's own tags: its level, and whether it runs underground (left out: it would lie over the streets above it)
const rtags = new Map(els.filter((e) => e.tags.highway).map((e) => [e.id, e.tags]));
const drive = roads.filter((r) => { const t = rtags.get(r.id) || {}; r.layer = parseInt(t.layer, 10) || 0; return isDriveable(r.cls) && !(t.tunnel && t.tunnel !== 'no') && r.layer >= 0; });
joinStreetEnds(drive, { reach: 9 });
const net = shapeJunctions(buildNetwork(drive));
log(`network: ${net.nodes.size} nodes, ${net.segs.length} segments, ${net.junctions.length} junctions, ${net.islands.length} roundabouts`);

// ---------- 3. the road reserve (each road's full width with its pavements), and buildings kept off it ----------
const RAIL_CLEAR = 5.5;
const reserve = segIndex(24), carriage = segIndex(24);
net.segs.forEach((s) => { const P = s.prof, W = P.half + Math.max(s.paveL ?? P.pave, s.paveR ?? P.pave) + 0.3; for (let k = 0; k < s.pts.length - 1; k++) { reserve.add([s.pts[k][0], s.pts[k][1], s.pts[k + 1][0], s.pts[k + 1][1], W, s.id]); carriage.add([s.pts[k][0], s.pts[k][1], s.pts[k + 1][0], s.pts[k + 1][1], P.half, s.id]); } });
net.junctions.forEach((j) => { const r = Math.max(...j.asphalt.map((p) => Math.hypot(p[0] - j.x, p[1] - j.z))); reserve.add([j.x, j.z, j.x, j.z, Math.min(r, 40), -2]); });
net.islands.forEach((isl) => reserve.add([isl.x, isl.z, isl.x, isl.z, isl.r, -3]));
rails.forEach((r) => { for (let k = 0; k < r.pts.length - 1; k++) reserve.add([r.pts[k][0], r.pts[k][1], r.pts[k + 1][0], r.pts[k + 1][1], RAIL_CLEAR, -1]); });
const onRail = (x, z, pad = 0) => rails.some((r) => { for (let k = 0; k < r.pts.length - 1; k++) if (segDist(x, z, r.pts[k][0], r.pts[k][1], r.pts[k + 1][0], r.pts[k + 1][1]) < RAIL_CLEAR + pad) return true; return false; });
const along = (pts, f) => { for (let i = 0; i < pts.length; i++) { const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az))); for (let k = 0; k < n; k++) if (f(ax + (bx - ax) * k / n, az + (bz - az) * k / n)) return true; } return false; };
const inReserve = (x, z) => reserve.hit(x, z);
const touches = (pts) => along(pts, inReserve) || pts.some(([x, z]) => inReserve(x, z));
let shrunk = 0, dropped = 0;
blds = blds.filter((b) => {
  if (!touches(b.pts)) return true;
  for (const k of [0.92, 0.84, 0.76, 0.68, 0.6, 0.52]) { const q = scaleAbout(b.pts, b.c, k); if (!touches(q)) { b.pts = q; b.bb = bbox(q); b.a = Math.abs(area(q)); shrunk++; return true; } }
  dropped++; return false;
});
log(`buildings kept off the road reserve: ${shrunk} pulled back, ${dropped} left out`);

// ---------- 4. heights and kinds ----------
const H = JSON.parse(readFileSync(new URL('heights.json', cache), 'utf8'));
const ghs = (x, z) => { const lon = C0.lon + x / KX, lat = C0.lat - z / KZ, c = Math.floor((lon - H.w) / H.dx), r = Math.floor((H.n - lat) / H.dy); return c >= 0 && r >= 0 && c < H.cols && r < H.rows ? H.h[r * H.cols + c] : 0; };
const HOUSEY = new Set(['house', 'detached', 'semidetached_house', 'bungalow', 'terrace', 'hut', 'shed', 'garage', 'garages', 'cabin', 'roof', 'carport', 'farm_auxiliary', 'kiosk']);
let mapped = 0;
blds.forEach((b) => {
  const t = b.t, u = hashN(b.id), v = hashN(b.id * 7 + 3);
  let h;
  if (b.h > 2 && b.h < 400) { h = b.h; mapped++; } else if (b.levels > 0 && b.levels < 120) { h = b.levels * 3.2 + 0.8; mapped++; } else {
    const base = Math.max(4, ghs(b.c[0], b.c[1]));
    const size = Math.min(1.8, Math.max(0.35, Math.sqrt(b.a) / 13));
    const spread = Math.exp(0.42 * Math.sqrt(-2 * Math.log(Math.max(u, 1e-6))) * Math.cos(2 * Math.PI * v));
    h = base * size * spread; if (b.a < 45) h = Math.min(h, 4.5); if (HOUSEY.has(t.building)) h = Math.min(h, 9.5);
    h = Math.max(3, Math.min(h, Math.max(base * 3.2, 12)));
  }
  // the kind decides how it is dressed (src/city/facade.js): a house, a block of flats or offices, a tower, a shed
  const shopish = t.shop || t.amenity || ['retail', 'commercial', 'supermarket', 'kiosk'].includes(t.building);
  b.k = h >= 26 ? 'tower' : HOUSEY.has(t.building) || (h < 8 && b.a < 260) ? (t.building === 'shed' || t.building === 'garage' || t.building === 'hut' ? 'shed' : 'house') : shopish ? 'shops' : ['industrial', 'warehouse', 'hangar'].includes(t.building) ? 'works' : 'block';
  b.H = r1(h);
});
log(`heights: ${mapped} from the map, ${blds.length - mapped} from GHS-BUILT-H and the footprint`);

// ---------- 5. lamps and street trees, by the districts' rules, along every segment ----------
const bIndex = new Map(), BC = 20, bk = (i, j) => i * 100003 + j;
blds.forEach((b) => { for (let i = Math.floor(b.bb.x0 / BC); i <= Math.floor(b.bb.x1 / BC); i++) for (let j = Math.floor(b.bb.z0 / BC); j <= Math.floor(b.bb.z1 / BC); j++) { const k = bk(i, j); if (!bIndex.has(k)) bIndex.set(k, []); bIndex.get(k).push(b); } });
const inBuilding = (x, z, pad) => { for (const b of bIndex.get(bk(Math.floor(x / BC), Math.floor(z / BC))) || []) { if (x > b.bb.x0 - pad && x < b.bb.x1 + pad && z > b.bb.z0 - pad && z < b.bb.z1 + pad && (pointInPoly(x, z, b.pts) || b.pts.some((p, i) => segDist(x, z, p[0], p[1], b.pts[(i + 1) % b.pts.length][0], b.pts[(i + 1) % b.pts.length][1]) < pad))) return true; } return false; };
const lamps = [], trees = [], lampIdx = pointIndex(10), treeIdx = pointIndex(10);
const LAMP = { highway: 30, arterial: 26, collector: 24, local: 25, estate: 30 };
net.segs.forEach((s) => {
  const P = s.prof, pts = s.draw, pl = s.paveL ?? P.pave, pr = s.paveR ?? P.pave; if (pts.length < 2) return;
  const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = len[len.length - 1];
  const at = (d) => { let i = 1; while (i < len.length - 1 && len[i] < d) i++; const a = pts[i - 1], b = pts[i], L = len[i] - len[i - 1] || 1, u = Math.min(1, Math.max(0, (d - len[i - 1]) / L)), tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L; return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, nx: -tz, nz: tx }; };
  const inRoad = (x, z, clear) => carriage.hit(x, z, clear, s.id) || reserve.near(x, z).some((q) => q[5] === -2 && Math.hypot(x - q[0], z - q[1]) < q[4] * 0.85);
  const step = LAMP[P.kind] || 25, both = ['highway', 'arterial'].includes(P.kind);
  for (let d = 6; d < total - 6; d += step) for (const side of [1, -1]) {
    const pave = side > 0 ? pl : pr; if (pave < 0.9 && !P.shoulder) continue;
    const dd = both ? d : d + (side < 0 ? step / 2 : 0); if (dd >= total - 4) continue;
    const q = at(dd), off = P.half + (pave >= 0.9 ? Math.min(0.6, pave - 0.3) : 0.7), x = q.x + q.nx * off * side, z = q.z + q.nz * off * side;
    if (!inBox(x, z) || onRail(x, z, 0.5) || inBuilding(x, z, 0.8) || inRoad(x, z, 0.5) || lampIdx.within(x, z, step * 0.55)) continue;
    const l = { x: r1(x), z: r1(z), nx: r1(q.nx * side * 100) / 100, nz: r1(q.nz * side * 100) / 100 }; lamps.push(l); lampIdx.add(l);
  }
  if (P.kind === 'highway') return;
  for (let d = 7; d < total - 7; d += 13) for (const side of [1, -1]) {
    const pave = side > 0 ? pl : pr; if (pave < 1.5) continue;
    const q = at(d), wide = pave >= 2.5, off = wide ? P.half + Math.max(1.0, pave * 0.6) : P.half + pave - 0.35, x = q.x + q.nx * off * side, z = q.z + q.nz * off * side;
    if (!inBox(x, z) || onRail(x, z, 0.5) || inBuilding(x, z, wide ? 1.6 : 1.1) || inRoad(x, z, wide ? 1.6 : 1.2) || lampIdx.within(x, z, 3) || treeIdx.within(x, z, 6)) continue;
    const t = { x: r1(x), z: r1(z), r: wide ? 0.75 : 0.28 }; trees.push(t); treeIdx.add(t);
  }
});
log(`${lamps.length} street lamps, ${trees.length} street trees`);

// thin each segment's drawn line: keep only the points its shape (and its height, on a ramp) needs, within 15 cm
net.segs.forEach((s) => {
  const pts = s.draw, ev = s.elev, n = pts.length; if (n < 3) return;
  const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
  const err = (a, b, k) => Math.max(segDist(pts[k][0], pts[k][1], pts[a][0], pts[a][1], pts[b][0], pts[b][1]), ev ? Math.abs(ev[k] - (ev[a] + (ev[b] - ev[a]) * ((k - a) / (b - a)))) : 0);
  const dp = (a, b) => { if (b - a < 2) return; let m = -1, mi = -1; for (let k = a + 1; k < b; k++) { const e = err(a, b, k); if (e > m) { m = e; mi = k; } } if (m > 0.15) { keep[mi] = 1; dp(a, mi); dp(mi, b); } };
  dp(0, n - 1);
  const K = [...keep.keys()].filter((i) => keep[i]); s.draw = K.map((i) => pts[i]); if (ev) s.elev = K.map((i) => ev[i]);
});

// ---------- 6. cut into chunks ----------
const chunks = new Map(), ck = (x, z) => `${Math.floor(x / CH)}_${Math.floor(z / CH)}`;
const chunk = (k) => { if (!chunks.has(k)) chunks.set(k, { segs: [], junctions: [], islands: [], foot: [], bld: [], land: [], water: [], rivers: [], rail: [], stations: [], trees: [], lamps: [], poi: [] }); return chunks.get(k); };
const names = [], nameIx = new Map(), nameOf = (n) => { if (!n) return -1; if (!nameIx.has(n)) { nameIx.set(n, names.length); names.push(n); } return nameIx.get(n); };
const CLASSES = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'];
const ENDS = ['dead', 'through', 'stop', 'giveway', 'ring', 'bend'];
const flat = (pts) => pts.flatMap(([x, z]) => [r1(x), r1(z)]);
// a segment, cut into pieces: each stretch belongs to the chunk its middle is in, and pieces share their end points
// so they meet exactly; each piece knows how far along the segment it starts (the paint's dashes run on) and whether
// it holds the segment's real ends (where the stop line goes)
net.segs.forEach((s) => {
  const pts = s.draw, n = pts.length; if (n < 2) return;
  let acc = 0, i = 0;
  while (i < n - 1) {
    const mid = (k) => [(pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2], k0 = ck(...mid(i));
    let e = i, L = 0; while (e < n - 1 && ck(...mid(e)) === k0) { L += Math.hypot(pts[e + 1][0] - pts[e][0], pts[e + 1][1] - pts[e][1]); e++; }
    if (inBox(...mid(i), 40)) chunk(k0).segs.push({ id: s.id, c: CLASSES.indexOf(s.cls), n: nameOf(s.name), l: s.prof.lanes, ...(s.oneway ? { o: 1 } : {}), ...(s.roundabout ? { rb: 1 } : {}), ...(s.bridge ? { b: 1 } : {}),
      ...(s.paveL != null ? { pl: s.paveL, pr: s.paveR } : {}), ph: r1(acc), ea: i === 0 ? ENDS.indexOf(s.end_a) : -1, eb: e === n - 1 ? ENDS.indexOf(s.end_b) : -1, p: flat(pts.slice(i, e + 1)),
      ...(s.elev ? { e: s.elev.slice(i, e + 1).map(r1) } : {}) });
    acc += L; i = e;
  }
});
net.junctions.forEach((j) => chunk(ck(j.x, j.z)).junctions.push({ x: r1(j.x), z: r1(j.z), ...(j.elev ? { y: r1(j.elev) } : {}), e: j.spec.map(([dx, dz, w, W, t]) => [Math.round(dx * 1000) / 1000, Math.round(dz * 1000) / 1000, r1(w), r1(W), r1(t)]) }));
net.islands.forEach((isl) => chunk(ck(isl.x, isl.z)).islands.push({ x: r1(isl.x), z: r1(isl.z), r: r1(isl.r) }));
roads.forEach((r) => {
  if (!isFootway(r)) return;
  let run = [], k0 = null; const flush = () => { if (run.length > 1) chunk(k0).foot.push({ w: Math.min(r.w, 3), p: flat(run) }); run = []; };
  for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, k = ck(mx, mz); if (!inBox(mx, mz, 30) || reserve.near(mx, mz).some((q) => q[5] >= 0 && segDist(mx, mz, q[0], q[1], q[2], q[3]) < q[4] - 0.5)) { flush(); k0 = null; continue; } if (k !== k0) { flush(); k0 = k; run = [a]; } run.push(b); }
  flush();
});
blds.forEach((b) => { const k = ck(...b.c); chunk(k).bld.push({ id: b.id, h: b.H, k: b.k, p: flat(b.pts), ...(b.t.name ? { n: b.t.name } : {}) }); });
// land and water areas: clipped to each chunk they overlap, so a chunk carries only its own ground
function clipSquare(poly, X0, Z0, X1, Z1) {
  let out = poly; const edges = [[(p) => p[0] >= X0, (a, b) => { const t = (X0 - a[0]) / (b[0] - a[0]); return [X0, a[1] + t * (b[1] - a[1])]; }], [(p) => p[0] <= X1, (a, b) => { const t = (X1 - a[0]) / (b[0] - a[0]); return [X1, a[1] + t * (b[1] - a[1])]; }],
    [(p) => p[1] >= Z0, (a, b) => { const t = (Z0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), Z0]; }], [(p) => p[1] <= Z1, (a, b) => { const t = (Z1 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), Z1]; }]];
  for (const [inside, cut] of edges) { const src = out; out = []; for (let i = 0; i < src.length; i++) { const a = src[i], b = src[(i + 1) % src.length]; if (inside(a)) { out.push(a); if (!inside(b)) out.push(cut(a, b)); } else if (inside(b)) out.push(cut(a, b)); } if (!out.length) break; }
  return out;
}
const spread = (poly, f) => { const b = bbox(poly); for (let i = Math.floor(Math.max(b.x0, x0) / CH); i <= Math.floor(Math.min(b.x1, x1) / CH); i++) for (let j = Math.floor(Math.max(b.z0, z0) / CH); j <= Math.floor(Math.min(b.z1, z1) / CH); j++) { const q = clipSquare(poly, i * CH, j * CH, (i + 1) * CH, (j + 1) * CH); if (q.length >= 3 && Math.abs(area(q)) > 4) f(`${i}_${j}`, q); } };
land.sort((a, b) => b.a - a.a).forEach((l) => spread(l.p, (k, q) => chunk(k).land.push({ k: l.k, p: flat(q) })));
water.forEach((w) => spread(w.p, (k, q) => chunk(k).water.push({ p: flat(q) })));
rivers.forEach((rv) => { for (let i = 0; i < rv.p.length - 1; i++) { const a = rv.p[i], b = rv.p[i + 1], k = ck((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); if (inBox((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) chunk(k).rivers.push({ w: rv.w, p: flat([a, b]) }); } });
rails.forEach((r) => { for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1], k = ck((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); if (inBox((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) chunk(k).rail.push({ ...(r.bridge ? { b: 1 } : {}), p: flat([a, b]) }); } });
stations.forEach((s) => chunk(ck(s.x, s.z)).stations.push({ x: r1(s.x), z: r1(s.z), n: s.name || '' }));
lamps.forEach((l) => chunk(ck(l.x, l.z)).lamps.push(l.x, l.z, l.nx, l.nz));
trees.forEach((t) => chunk(ck(t.x, t.z)).trees.push(t.x, t.z, t.r));
pois.forEach((p) => { if (inBox(p.x, p.z)) chunk(ck(p.x, p.z)).poi.push(p); });

// ---------- 7. write ----------
const out = new URL(`public/city/${slug}/`, GAME);
mkdirSync(out, { recursive: true }); for (const f of readdirSync(out)) rmSync(new URL(f, out));
// the chunks go out TILE x TILE to a file (t_<a>_<b>.json, { "<i>_<j>": chunk }): a city is a few hundred files, not
// thousands, and each is still small enough to fetch whole as you walk (src/city/chunkworker.js)
const TILE = 4, index = [], tiles = new Map();
let bytes = 0;
for (const [k, c] of [...chunks].sort()) {
  const [i, j] = k.split('_').map(Number), t = `t_${Math.floor(i / TILE)}_${Math.floor(j / TILE)}`;
  if (!tiles.has(t)) tiles.set(t, {});
  tiles.get(t)[k] = Object.fromEntries(Object.entries(c).filter(([, v]) => v.length));
  index.push([i, j, c.bld.length, Math.round(Math.max(0, ...c.bld.map((b) => b.h)))]);
}
for (const [t, body] of tiles) { const s = JSON.stringify(body); writeFileSync(new URL(`${t}.json`, out), s); bytes += s.length; }
const meta = { version: 3, city: city.name, key, center: C0, chunk: CH, tile: TILE, drive: country.drive || 'right', box: { x0: r1(x0), z0: r1(z0), x1: r1(x1), z1: r1(z1) }, classes: CLASSES, ends: ENDS, names, chunks: index, far: { water: farWater },
  counts: { buildings: blds.length, segments: net.segs.length, junctions: net.junctions.length, roundabouts: net.islands.length, lamps: lamps.length, trees: trees.length, places: pois.length },
  sources: 'Map data © OpenStreetMap contributors (ODbL); building heights partly GHS-BUILT-H 2018, European Commission JRC (CC BY 4.0)' };
writeFileSync(new URL('index.json', out), JSON.stringify(meta)); bytes += JSON.stringify(meta).length;
log(`${index.length} chunks in ${tiles.size} files, ${(bytes / 1e6).toFixed(1)} MB -> public/city/${slug}/`);
{ const o = overview(out); log(`map.json: ${o.roads} streets, ${(o.bytes / 1e3).toFixed(0)} kB`); } // the whole city for the big map
