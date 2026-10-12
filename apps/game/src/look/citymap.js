// The whole open city on the big map (menus.js, the "city" view between the district and the world), and the colours
// the minimap shares with it (hud.js). Its data is the city's map.json (scripts/city/overview.mjs): every street but the
// service lanes, the parks, woods and water, in the city's frame (metres east and south of its centre).
import { roadClass, ROAD_KINDS } from './roadclass.js';

export const CITY_LAND = { park: '#8cc463', grass: '#8cc463', golf: '#7cbf55', pitch: '#6fb14f', cemetery: '#9db57e', wood: '#5e9a48', scrub: '#8fae62', campus: '#93c66a', paved: '#cfc6b4', commercial: '#d6cbb5', industrial: '#cbbfa8', bare: '#c9a77c' };
// a street's width in metres by its class (index.json's classes: motorway, trunk, primary ... the links)
export const CITY_W = [16, 14, 11, 9, 8, 6, 6, 5, 4, 7, 7, 6, 6, 6];
const WATER = '#8ed3c4';

const cache = new Map();
/** Fetch and unpack a city's map.json once: points come as the first one and then the steps to each next one. */
export function loadCityMap(url) {
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (!d) return null;
    const undelta = (p) => { const o = p.slice(); for (let i = 2; i < o.length; i++) o[i] += o[i - 2]; return o; };
    const roads = d.roads.map(([c, n, p]) => ({ c, n, p: undelta(p), cls: d.classes[c] }));
    // one path per kind of road, built once; drawn under the map's transform, so its width is set per frame
    const kinds = new Map();
    roads.forEach((r) => { const k = roadClass(r.cls).kind; if (!kinds.has(k)) kinds.set(k, { path: new Path2D(), w: CITY_W[r.c] ?? 6 }); const P = kinds.get(k).path; P.moveTo(r.p[0], r.p[1]); for (let i = 2; i < r.p.length; i += 2) P.lineTo(r.p[i], r.p[i + 1]); });
    const land = new Map();
    d.land.forEach(([k, p]) => { const q = undelta(p); if (!land.has(k)) land.set(k, new Path2D()); const P = land.get(k); P.moveTo(q[0], q[1]); for (let i = 2; i < q.length; i += 2) P.lineTo(q[i], q[i + 1]); P.closePath(); });
    const water = new Path2D(); d.water.forEach((p) => { const q = undelta(p); water.moveTo(q[0], q[1]); for (let i = 2; i < q.length; i += 2) water.lineTo(q[i], q[i + 1]); water.closePath(); });
    // each named street's longest stretch, to carry its name
    const named = new Map();
    roads.forEach((r) => { if (r.n < 0 || r.c > 4) return; let L = 0; for (let i = 2; i < r.p.length; i += 2) L += Math.hypot(r.p[i] - r.p[i - 2], r.p[i + 1] - r.p[i - 1]); const name = d.names[r.n]; if (!named.has(name) || named.get(name).L < L) named.set(name, { r, L, name }); });
    return { ...d, roads, kinds, land, water, named: [...named.values()].sort((a, b) => a.r.c - b.r.c || b.L - a.L) };
  }).catch(() => null));
  return cache.get(url);
}

/** The named street nearest (x, z) in the city's frame within r metres: { name, x, z, d, side: its pavement } or null. */
export function streetNear(M, x, z, r = 60) {
  let best = null, bd = r;
  M.roads.forEach((q) => {
    if (q.n < 0) return; const p = q.p;
    if (Math.abs(p[0] - x) > 400 + r || Math.abs(p[1] - z) > 400 + r) return;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const ax = p[i], az = p[i + 1], dx = p[i + 2] - ax, dz = p[i + 3] - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      const qx = ax + dx * t, qz = az + dz * t, d = Math.hypot(x - qx, z - qz);
      // (and the pavement beside it, on the side of the tap, where a quick travel puts you)
      if (d < bd) { const L = Math.hypot(dx, dz) || 1, side = (dx * (z - az) - dz * (x - ax)) > 0 ? 1 : -1, off = (CITY_W[q.c] ?? 6) / 2 + 2; bd = d; best = { name: M.names[q.n], x: qx, z: qz, d, side: { x: qx - (dz / L) * off * side, z: qz + (dx / L) * off * side } }; }
    }
  });
  return best;
}

/**
 * Draw the city. view: { s: map units per metre, x, z: the city point at the middle }. The canvas is laid out as the
 * district map is: a 900 unit square scaled by MK and offset by (OX, OY) to fill the window.
 * opts: { MK, OX, OY, cw, ch, district: { x, z, r, name }, me: { x, z }, ink, paper, font, leaf }
 */
export function drawCityMap(g, M, view, o) {
  const { MK, OX, OY, cw, ch } = o, s = view.s, px = MK * s; // canvas pixels per metre
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = o.leaf; g.fillRect(0, 0, cw, ch);
  g.setTransform(px, 0, 0, px, OX + MK * (450 - view.x * s), OY + MK * (450 - view.z * s));
  // past the baked city: the land goes on, a little faded
  const b = M.box;
  g.fillStyle = 'rgba(247,239,220,.38)'; g.beginPath(); g.rect(b.x0 - 2e4, b.z0 - 2e4, b.x1 - b.x0 + 4e4, b.z1 - b.z0 + 4e4); g.rect(b.x1, b.z0, b.x0 - b.x1, b.z1 - b.z0); g.fill('evenodd');
  M.land.forEach((P, k) => { const c = CITY_LAND[k]; if (!c) return; g.fillStyle = c; g.fill(P); });
  g.fillStyle = WATER; g.fill(M.water);
  g.lineCap = 'round'; g.lineJoin = 'round';
  // small streets first; each at its true width once zoomed in, never thinner than a readable line
  const order = [...M.kinds.entries()].sort((a, b) => ROAD_KINDS.findIndex(([k]) => k === a[0]) - ROAD_KINDS.findIndex(([k]) => k === b[0]));
  const big = (k) => ROAD_KINDS.findIndex(([q]) => q === k) / Math.max(1, ROAD_KINDS.length - 1); // 0 small .. 1 big
  const width = (k, w) => Math.max(w, ((1.5 + 4 * big(k)) * MK) / px);
  order.forEach(([k, { path, w }]) => { if (s < 0.12 && big(k) < 0.3) return; g.strokeStyle = '#c4a46c'; g.lineWidth = width(k, w) + (2.4 * MK) / px; g.stroke(path); });
  order.forEach(([k, { path, w }]) => { if (s < 0.12 && big(k) < 0.3) return; g.strokeStyle = ROAD_KINDS.find(([q]) => q === k)?.[2] || '#f0deb0'; g.lineWidth = width(k, w); g.stroke(path); });
  // the district you are in: the part of the city that is built in full
  const D = o.district;
  if (D) { g.fillStyle = 'rgba(242,179,61,.22)'; g.strokeStyle = '#e09a2a'; g.lineWidth = 3 / px; g.setLineDash([10 / px, 8 / px]); g.beginPath(); g.arc(D.x, D.z, D.r, 0, 7); g.fill(); g.stroke(); g.setLineDash([]); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  const toScreen = (x, z) => [OX + MK * ((x - view.x) * s + 450), OY + MK * ((z - view.z) * s + 450)];
  // street names: the big streets first, once each, never on top of another
  g.font = `800 ${Math.round(13 * Math.max(1, MK))}px ${o.font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const taken = [], maxClass = s < 0.18 ? 2 : s < 0.4 ? 3 : 4;
  M.named.forEach(({ r, name }) => {
    if (r.c > maxClass) return;
    const n = r.p.length / 2, i = Math.max(1, Math.floor(n / 2)), [ax, ay] = toScreen(r.p[i * 2 - 2], r.p[i * 2 - 1]), [bx, by] = toScreen(r.p[i * 2], r.p[i * 2 + 1]);
    const x = (ax + bx) / 2, y = (ay + by) / 2; if (x < 40 || x > cw - 40 || y < 40 || y > ch - 40) return;
    const w = g.measureText(name).width; if (taken.some((t) => Math.abs(t.x - x) < (t.w + w) / 2 + 8 && Math.abs(t.y - y) < 26 * MK)) return;
    taken.push({ x, y, w });
    let a = Math.atan2(by - ay, bx - ax); if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
    g.save(); g.translate(x, y); g.rotate(a); g.lineWidth = 5; g.strokeStyle = '#f7efdc'; g.strokeText(name, 0, 1); g.fillStyle = o.ink; g.fillText(name, 0, 1); g.restore();
  });
  if (D) {
    const [x, y] = toScreen(D.x, D.z - D.r); g.font = `800 ${Math.round(15 * Math.max(1, MK))}px ${o.font}`; const w = g.measureText(D.name).width + 20;
    g.fillStyle = o.paper; g.beginPath(); g.roundRect(x - w / 2, y - 34 * MK, w, 26 * MK, 13 * MK); g.fill(); g.fillStyle = o.ink; g.fillText(D.name, x, y - 21 * MK);
  }
  // you are here
  if (o.me) {
    const [x, y] = toScreen(o.me.x, o.me.z), k = MK;
    g.fillStyle = '#e46f4f'; g.strokeStyle = '#fff'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x - 22 * k, y - 26 * k, x - 18 * k, y - 52 * k, x, y - 52 * k); g.bezierCurveTo(x + 18 * k, y - 52 * k, x + 22 * k, y - 26 * k, x, y); g.closePath(); g.stroke(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y - 34 * k, 8 * k, 0, 7); g.fill();
  }
  // the pick, if any
  if (o.pick) { const [x, y] = toScreen(o.pick.x, o.pick.z); g.fillStyle = '#e46f4f'; g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); }
}
