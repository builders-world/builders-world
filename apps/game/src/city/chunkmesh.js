import { ShapeUtils, Vector2 } from 'three';
import { drawNetwork, profileOf, junctionShape } from './roadnet.js';

// One chunk of the open city, from its baked data (scripts/city/bake.mjs) to flat arrays of triangles: the ground,
// the streets, the buildings and the solid bits, plus what you collide with. Pure arithmetic and no three.js objects,
// so it runs in a worker (chunkworker.js) and the game never waits for it.
//
// The streets follow the districts' rules exactly (world.js): asphalt at 14 cm, pavements at 11, paving joints,
// kerbstones, lane paint at 17, zebras before junctions, rounded junction corners, medians on wide main roads, and the
// interlocking blocks on estate and service lanes, stopping where they run onto another road. Buildings are the real
// footprints in the clay palette, and their windows are drawn by the facade shader (facade.js), not modelled.
//
// lod 0: everything, near the player; 1: no joints, kerbstones or rooftop clutter; 2: the far city, roads, ground and
// building bodies only.

const PAL = {
  ground: '#79a85a', road: '#8a8781', kerb: '#e2dccb', path: '#d1c7b1', paint: '#f6f1df', edge: '#ece7da', joint: '#b9b19e',
  paver: '#a69d90', paverEdge: '#8e6a5a', paverBand: '#94705f', water: '#5fa8bd', ballast: '#8a7f73', rail: '#5d5a55', sleeper: '#7a6650',
  medianFoot: '#c9c2b2', median: '#d8d1c1', reflector: '#f2b33d', island: '#86c25e',
};
const triangulate = (pts) => { try { return ShapeUtils.triangulateShape(pts.map(([x, z]) => new Vector2(x, z)), []).map((t) => t.map((k) => pts[k])); } catch { return []; } };
const LAND = {
  park: ['#86c25e', -0.24], grass: ['#8cc463', -0.24], golf: ['#7cbf55', -0.24], pitch: ['#6fb14f', -0.24], cemetery: ['#9db57e', -0.24],
  wood: ['#5e9a48', -0.24], scrub: ['#8fae62', -0.24], campus: ['#93c66a', -0.27], paved: ['#aaa395', -0.27], commercial: ['#b3ab9b', -0.27],
  industrial: ['#aba292', -0.27], bare: ['#c9a77c', -0.27], residential: null,
};
// the clay palette (world bible 7.1): ivory, cream, stone, mint and peach plaster; shops add a coloured fascia
const WALLS = ['#f2ecd9', '#e6d3b3', '#ded8c8', '#e9c9a8', '#cfd9c8', '#f0e2c6', '#e8dcc4', '#d9d2c0'];
const KIND = { house: 0, block: 1, shops: 2, tower: 3, works: 4, shed: 5 };
const ROOF = { house: '#263832', block: '#a8a294', shops: '#a8a294', tower: '#9ea7a5', works: '#9aa3a6', shed: '#8f8a7e' };
const ESTATE = new Set(['service', 'living_street']);

const hash = (n) => { let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const rgb = (hex) => { const v = parseInt(hex.slice(1), 16); return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255].map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); };
const C = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, rgb(v)]));

/** A layer of triangles with one normal each and per-vertex colour. */
function layer() { return { p: [], n: [], c: [] }; }
function tri(L, a, b, c, col, up = true) {
  // wound to face the sky (flat layers), as world.js pushTri
  if (up) { const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]); if (ny < 0) { const t = b; b = c; c = t; } }
  L.p.push(...a, ...b, ...c); L.n.push(0, 1, 0, 0, 1, 0, 0, 1, 0); L.c.push(...col, ...col, ...col);
}
function quad(L, a, b, c, d, col) { tri(L, a, b, c, col); tri(L, a, c, d, col); }

function ribbon(L, pts, width, y, col) {
  const n = pts.length; if (n < 2) return;
  const Lp = [], Rp = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    const nx = -tz, nz = tx; let k = 1;
    if (i > 0 && i < n - 1) { const t1x = p[0] - a[0], t1z = p[1] - a[1], l1 = Math.hypot(t1x, t1z) || 1; k = 1 / Math.max(0.55, nx * (-t1z / l1) + nz * (t1x / l1)); }
    const h = (width / 2) * k; Lp.push([p[0] + nx * h, y, p[1] + nz * h]); Rp.push([p[0] - nx * h, y, p[1] - nz * h]);
  }
  for (let i = 0; i < n - 1; i++) { tri(L, Lp[i], Rp[i], Lp[i + 1], col); tri(L, Rp[i], Rp[i + 1], Lp[i + 1], col); }
}
function dashes(L, pts, y, len, gap, w, col, start = 0) {
  let d = start; const period = len + gap;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], sl = Math.hypot(b[0] - a[0], b[1] - a[1]); if (sl < 0.01) continue;
    const tx = (b[0] - a[0]) / sl, tz = (b[1] - a[1]) / sl;
    for (let s = (period - (d % period)) % period; s + len < sl; s += period) ribbon(L, [[a[0] + tx * s, a[1] + tz * s], [a[0] + tx * (s + len), a[1] + tz * (s + len)]], w, y, col);
    d += sl;
  }
}
// a band between two offsets from the centreline (signed, + is the left normal), as streets.js band
function band(L, pts, nrm, from, to, y, col, skip = null) {
  for (let i = 0; i < pts.length - 1; i++) {
    if (skip && (skip[i] || skip[i + 1])) continue;
    if (Math.abs(to[i] - from[i]) < 0.05 && Math.abs(to[i + 1] - from[i + 1]) < 0.05) continue;
    const at = (k, off) => [pts[k][0] + nrm[k][0] * off, y, pts[k][1] + nrm[k][1] * off];
    const a0 = at(i, from[i]), a1 = at(i, to[i]), b0 = at(i + 1, from[i + 1]), b1 = at(i + 1, to[i + 1]);
    tri(L, a0, a1, b0, col); tri(L, a1, b1, b0, col);
  }
}
function normals(pts) {
  return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1; return [-tz / l, tx / l]; });
}
const pairs = (f) => { const o = []; for (let i = 0; i < f.length; i += 2) o.push([f[i], f[i + 1]]); return o; };
function polyFill(L, pts, y, col) {
  const v = pts.map(([x, z]) => new Vector2(x, z)); let t = [];
  try { t = ShapeUtils.triangulateShape(v, []); } catch { return; }
  t.forEach(([a, b, c]) => tri(L, [pts[a][0], y, pts[a][1]], [pts[b][0], y, pts[b][1]], [pts[c][0], y, pts[c][1]], col));
}
// a solid box (for medians and rooftop clutter): six faces with their own normals
function box(L, cx, y0, cz, w, h, d, ry, col) {
  const cs = Math.cos(ry), sn = Math.sin(ry), P = (u, v, yy) => [cx + u * cs + v * sn, yy, cz - u * sn + v * cs];
  const hw = w / 2, hd = d / 2, y1 = y0 + h, top = col.map((c) => c * 1.06), side = col.map((c) => c * 0.92);
  const face = (a, b, c2, d2, nx, ny, nz, cc) => { L.p.push(...a, ...b, ...c2, ...a, ...c2, ...d2); for (let k = 0; k < 6; k++) { L.n.push(nx, ny, nz); L.c.push(...cc); } };
  const n = (u, v) => [u * cs + v * sn, -u * sn + v * cs];
  face(P(-hw, -hd, y1), P(-hw, hd, y1), P(hw, hd, y1), P(hw, -hd, y1), 0, 1, 0, top);
  [[[-hw, hd], [hw, hd], [0, 1]], [[hw, -hd], [-hw, -hd], [0, -1]], [[hw, hd], [hw, -hd], [1, 0]], [[-hw, -hd], [-hw, hd], [-1, 0]]].forEach(([a, b, nn]) => {
    const [nx, nz] = n(nn[0], nn[1]); face(P(a[0], a[1], y0), P(b[0], b[1], y0), P(b[0], b[1], y1), P(a[0], a[1], y1), nx, 0, nz, side);
  });
}

// ---------- buildings ----------
const area = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length]; a += x1 * z2 - x2 * z1; } return a / 2; };
function grow(pts, d) {
  const s = area(pts) > 0 ? 1 : -1, n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n], e1 = [p[0] - a[0], p[1] - a[1]], e2 = [b[0] - p[0], b[1] - p[1]];
    const l1 = Math.hypot(...e1) || 1, l2 = Math.hypot(...e2) || 1, n1 = [(e1[1] / l1) * s, (-e1[0] / l1) * s], n2 = [(e2[1] / l2) * s, (-e2[0] / l2) * s];
    const m = [n1[0] + n2[0], n1[1] + n2[1]], ml = Math.hypot(...m) || 1, k = d / Math.max(0.35, (m[0] * n1[0] + m[1] * n1[1]) / ml);
    return [p[0] + (m[0] / ml) * k, p[1] + (m[1] / ml) * k];
  });
}
/**
 * Walls of a prism, outward, with the facade attributes the shader draws windows from: u (metres along the wall),
 * the wall's length, the building's kind and its seed. lit = 0 for bands and parapets that carry no windows.
 */
function walls(F, pts, y0, y1, col, kind, seed, windows = 1) {
  const s = area(pts) > 0 ? 1 : -1, n = pts.length, lo = col.map((c) => c * 0.88);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 0.05) continue;
    const nx = ((b[1] - a[1]) / len) * s, nz = (-(b[0] - a[0]) / len) * s;
    // outward when seen from outside: (a, b) along the wall, then up
    const A0 = [a[0], y0, a[1]], B0 = [b[0], y0, b[1]], B1 = [b[0], y1, b[1]], A1 = [a[0], y1, a[1]];
    const ccw = s > 0;
    const v = ccw ? [A0, B1, B0, A0, A1, B1] : [A0, B0, B1, A0, B1, A1];
    const us = ccw ? [0, len, len, 0, 0, len] : [0, len, len, 0, len, 0];
    const ys = v.map((q) => q[1]);
    v.forEach((q, k) => { F.p.push(...q); F.n.push(nx, 0, nz); F.c.push(...(ys[k] === y0 ? lo : col)); F.f.push(us[k], len, kind + (windows ? 0 : 10), seed); });
  }
}
function roof(F, pts, y, col, kind, seed) {
  const v = pts.map(([x, z]) => new Vector2(x, z)); let t = [];
  try { t = ShapeUtils.triangulateShape(v, []); } catch { return; }
  t.forEach(([a, b, c]) => { let A = [pts[a][0], y, pts[a][1]], B = [pts[b][0], y, pts[b][1]], Cc = [pts[c][0], y, pts[c][1]]; const ny = (B[2] - A[2]) * (Cc[0] - A[0]) - (B[0] - A[0]) * (Cc[2] - A[2]); if (ny < 0) [B, Cc] = [Cc, B];
    F.p.push(...A, ...B, ...Cc); for (let k = 0; k < 3; k++) { F.n.push(0, 1, 0); F.c.push(...col); F.f.push(0, 0, kind + 10, seed); } });
}
function building(F, S, b, lod) {
  const pts = pairs(b.p), kind = KIND[b.k] ?? 1, seed = hash(b.id), H = Math.max(3, b.h);
  const wall = rgb(b.k === 'tower' ? ['#cfd6d4', '#d7dad3', '#c6cfcf'][Math.floor(seed * 3)] : WALLS[Math.floor(seed * WALLS.length)]);
  const roofC = rgb(ROOF[b.k] || ROOF.block);
  if (lod >= 3 && b.h < 20 && pts.length > 4) {
    // far away, from the air: a box the size and heading of the building (its longest wall), not its whole outline
    let best = 0, ux = 1, uz = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], c = pts[(i + 1) % pts.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]); if (l > best) { best = l; ux = (c[0] - a[0]) / l; uz = (c[1] - a[1]) / l; } }
    let s0 = Infinity, s1 = -Infinity, t0 = Infinity, t1 = -Infinity; pts.forEach(([x, z]) => { const s2 = x * ux + z * uz, t = -x * uz + z * ux; s0 = Math.min(s0, s2); s1 = Math.max(s1, s2); t0 = Math.min(t0, t); t1 = Math.max(t1, t); });
    const P = (s2, t) => [s2 * ux - t * uz, s2 * uz + t * ux], q = [P(s0, t0), P(s1, t0), P(s1, t1), P(s0, t1)];
    walls(F, q, 0, H, wall, kind, seed); roof(F, q, H, roofC, kind, seed); return;
  }
  if (lod >= 2) { walls(F, pts, 0, H, wall, kind, seed); roof(F, pts, H, roofC, kind, seed); return; }
  if (b.k === 'house') {
    // the arrival scene's house: ivory body, a wood fascia under a dark green roof slab, a low parapet
    walls(F, pts, 0, H, wall, kind, seed);
    walls(F, grow(pts, 0.28), H, H + 0.28, rgb('#a87950'), kind, seed, 0);
    walls(F, grow(pts, 0.16), H + 0.28, H + 0.44, roofC, kind, seed, 0); roof(F, grow(pts, 0.16), H + 0.44, roofC, kind, seed);
    walls(F, pts, H + 0.44, H + 0.74, wall, kind, seed, 0); roof(F, pts, H + 0.74, wall, kind, seed);
    return;
  }
  if (b.k === 'tower') {
    // a podium where the footprint is big, the glass shaft above, a crown band on top
    walls(F, pts, 0, H, wall, kind, seed); roof(F, grow(pts, -0.4), H + 0.9, roofC, kind, seed);
    walls(F, pts, H, H + 0.9, rgb(seed < 0.5 ? '#326952' : '#4b5878'), kind, seed, 0); walls(F, grow(pts, -0.4), H + 0.4, H + 0.9, roofC, kind, seed, 0);
  } else {
    walls(F, pts, 0, H, wall, kind, seed);
    walls(F, pts, H, H + 0.6, wall.map((c) => c * 0.96), kind, seed, 0); // the parapet
    roof(F, pts, H + 0.6, wall.map((c) => c * 0.96), kind, seed); roof(F, grow(pts, -0.3), H + 0.12, roofC, kind, seed);
    walls(F, grow(pts, -0.3), H + 0.12, H + 0.6, wall.map((c) => c * 0.9), kind, seed, 0);
  }
  // rooftop clutter near the player: a water tank on legs and an AC box or two (as the districts' roofs)
  if (lod === 0 && b.k !== 'shed') {
    const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]), A = Math.abs(area(pts));
    if (A > 60 && hash(b.id * 3) < 0.7) { const ry = hash(b.id * 5) * 3.14; box(S, c[0], H + 0.12, c[1], 1.6, 1.4, 1.6, ry, rgb('#e9e3d2')); }
    if (A > 140 && hash(b.id * 7) < 0.6) { const ry = hash(b.id * 11) * 3.14; box(S, c[0] + 2.4 * Math.cos(ry), H + 0.12, c[1] + 2.4 * Math.sin(ry), 1.2, 0.8, 0.9, ry, rgb('#c9c3b4')); }
  }
}

/**
 * @param d     the chunk's baked data
 * @param meta  { classes } from the city's index.json
 * @param o     { lod, hole: [x, z, r] the district's circle, where the chunk draws nothing of its own }
 */
export function meshChunk(d, meta, { lod = 0, hole = null, ci = 0, cj = 0, size = 200 } = {}) {
  const G = layer(), S = layer(), F = { p: [], n: [], c: [], f: [] };
  const inHole = (x, z, pad = 0) => hole && Math.hypot(x - hole[0], z - hole[1]) < hole[2] + pad;
  const colliders = [];
  const x0 = ci * size, z0 = cj * size;
  // the ground: grass, then land use on top (parks, paving, campuses), water, rivers
  quad(G, [x0, -0.3, z0], [x0 + size, -0.3, z0], [x0 + size, -0.3, z0 + size], [x0, -0.3, z0 + size], rgb(PAL.ground));
  (d.land || []).forEach((l) => { const s = LAND[l.k]; if (s) polyFill(G, pairs(l.p), s[1], rgb(s[0])); });
  (d.water || []).forEach((w) => polyFill(G, pairs(w.p), -0.21, C.water));
  (d.rivers || []).forEach((r) => ribbon(G, pairs(r.p), r.w, -0.18, C.water));
  // footpaths, the railway's ballast and rails
  if (lod < 2) (d.foot || []).forEach((f) => ribbon(G, pairs(f.p), f.w, 0.06, C.path));
  (d.rail || []).forEach((r) => { const p = pairs(r.p); ribbon(G, p, 3.4, 0.03, C.ballast); if (lod < 2) [-0.72, 0.72].forEach((o) => { const nn = normals(p); ribbon(S, p.map((q, i) => [q[0] + nn[i][0] * o, q[1] + nn[i][1] * o]), 0.08, 0.16, C.rail); }); });

  // the streets: the road network's pieces in this chunk (roadnet.js): trimmed segments with their paint, junctions as
  // one piece of asphalt with curved kerbs, roundabout islands
  const net = {
    segs: (d.segs || []).filter((q) => { const p = q.p; if (lod >= 3 && q.c > 5 && q.c < 9) return false; return !inHole((p[0] + p[p.length - 2]) / 2, (p[1] + p[p.length - 1]) / 2); }).map((q) => ({
      cls: meta.classes[q.c], prof: profileOf({ cls: meta.classes[q.c], lanes: q.l, oneway: !!q.o, roundabout: !!q.rb }), draw: pairs(q.p), oneway: !!q.o, roundabout: !!q.rb,
      paveL: q.pl, paveR: q.pr, phase: q.ph || 0, bridge: !!q.b, elev: q.e || null, end_a: q.ea >= 0 ? meta.ends[q.ea] : 'cut', end_b: q.eb >= 0 ? meta.ends[q.eb] : 'cut', cut_a: q.ea < 0, cut_b: q.eb < 0 })),
    junctions: (d.junctions || []).filter((j) => !inHole(j.x, j.z)).map((j) => ({ elev: j.y || 0, ...junctionShape(j.x, j.z, j.e) })),
    islands: (d.islands || []).filter((i) => !inHole(i.x, i.z)).map((i) => { const pts = []; for (let k = 0; k < 32; k++) { const a = (k / 32) * Math.PI * 2; pts.push([i.x + Math.cos(a) * i.r, i.z + Math.sin(a) * i.r]); } return { pts }; }),
  };
  const ROADC = { road: C.road, pave: C.kerb, kerb: C.edge, paint: C.paint, island: C.island, paver: C.paver, paverEdge: C.paverEdge };
  const concrete = rgb('#c4beb2');
  // a deck's edge: a vertical concrete face from under the deck to the top of its parapet, facing outward (sg)
  const side = (a, b, y0a, y0b, y1a, y1b, sg) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = (dz / l) * -sg, nz = (-dx / l) * -sg;
    const A0 = [a[0], y0a, a[1]], B0 = [b[0], y0b, b[1]], A1 = [a[0], y1a, a[1]], B1 = [b[0], y1b, b[1]];
    const v = sg > 0 ? [A0, A1, B1, A0, B1, B0] : [A0, B1, A1, A0, B0, B1];
    v.forEach((q) => { S.p.push(...q); S.n.push(nx, 0, nz); S.c.push(...concrete); });
  };
  const pillar = (x, z, y, w, ry) => { if (y > 0.5) box(S, x, -0.3, z, w, y + 0.3, 1.1, ry, concrete); if (y > 0.5) colliders.push({ t: 'box', cx: x, cz: z, hx: w / 2 + 0.05, hz: 0.6, ry }); };
  // a deck's underside: wound to face the ground below, a lighter concrete (only the light bouncing off the street reaches it)
  const soffit = concrete.map((c) => Math.min(1, c * 1.6));
  const under = (a, b, c) => { const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]); if (ny > 0) { const t = b; b = c; c = t; } S.p.push(...a, ...b, ...c); S.n.push(0, -1, 0, 0, -1, 0, 0, -1, 0); S.c.push(...soffit, ...soffit, ...soffit); };
  drawNetwork(net, (L, a, b, c) => tri(G, a, b, c, ROADC[L]), { drive: meta.drive || 'right', detail: lod, triangulate, side, pillar, under });

  // buildings (the district keeps its own, inside its circle)
  const blds = [];
  (d.bld || []).forEach((b) => {
    if (lod >= 3 && b.h < 9 && b.p.length < 14) return; // far away, from the air: the small houses melt into the ground
    const pts = pairs(b.p), cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    if (inHole(cx, cz, 0)) return;
    building(F, S, b, lod);
    let bx0 = Infinity, bz0 = Infinity, bx1 = -Infinity, bz1 = -Infinity; pts.forEach(([x, z]) => { bx0 = Math.min(bx0, x); bz0 = Math.min(bz0, z); bx1 = Math.max(bx1, x); bz1 = Math.max(bz1, z); });
    colliders.push({ t: 'poly', pts, bb: [bx0, bz0, bx1, bz1], h: b.h });
    blds.push({ id: b.id, x: cx, z: cz, h: b.h, k: b.k, n: b.n || null });
  });
  const keep = (arr, stride) => { const o = []; for (let i = 0; i < arr.length; i += stride) if (!inHole(arr[i], arr[i + 1], 2)) o.push(...arr.slice(i, i + stride)); return o; };
  const trees = keep(d.trees || [], 3), lamps = lod < 2 ? keep(d.lamps || [], 4) : [];
  for (let i = 0; i < trees.length; i += 3) colliders.push({ t: 'circ', x: trees[i], z: trees[i + 1], r: 0.28 });
  for (let i = 0; i < lamps.length; i += 4) colliders.push({ t: 'circ', x: lamps[i], z: lamps[i + 1], r: 0.14 });
  const pack = (L) => ({ p: new Float32Array(L.p), n: new Float32Array(L.n), c: new Float32Array(L.c) });
  return { ground: pack(G), solid: pack(S), facade: { ...pack(F), f: new Float32Array(F.f) }, colliders, trees, lamps, buildings: blds, pois: d.poi || [], stations: d.stations || [] };
}
