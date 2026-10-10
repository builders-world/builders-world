import * as THREE from 'three';
import { MeshBuilder, mulberry32 } from './mesh.js';
import { BUILDERS, MONUMENTS, FLOOR_H, floorsFor, litProbability } from './builders.js';
import { makeWindowMaterial, makeGlowMaterial, makeBeamMaterial } from './shaders.js';
import { wetGroundMaterial, wallMaterial } from './look/surfaces.js';
import { instanceAsset, collidersFor, anchorAt } from './look/kit.js';
import { makeClearance, fitStreets, band, streetFurniture, isFootway } from './look/streets.js';
import { dressEstate, drawFence, fenceCollider, cutFence, WALK } from './look/houses.js';
import { planEstates, nearWall, LOT_W, LOT_D } from './estates.js';
import { pushOutBox } from './look/physics.js';
import { buildNavGrid } from './look/navgrid.js';

const NIGHT = {
  // the clay palette of the arrival scene (world bible 7.1): ivory, cream, stone, mint and peach
  // plaster with wood and sage trims; the lighting decides whether it is day or night
  walls: ['#ded8c8', '#f2ecd9', '#c9c2b2', '#e6d3b3', '#cfd9c8', '#e9c9a8', '#d6cdb8', '#bcd2d6'],
  dark: ['#b9b09e', '#a9b3a2', '#c4a98c', '#a7b4b6', '#b5ab98'],
  teal: '#326952', tealDark: '#263832',
  road: '#8f8b80', kerb: '#d8d1bf', path: '#c3bdae', paint: '#f2ecd9', ground: '#a4ab7c',
  foliage: ['#45694c', '#7d9263', '#5b7d55'], trunk: '#a87950', metal: '#7b867d', slate: '#8b958c',
  podium: '#b3ab9a', capSlab: '#a9a395', tank: '#e9e3d2', ac: '#c9c3b4', far: '#a9b6ad', roofCap: '#a8a294',
  wire: '#3a3a34', tower: '#b5bfb4', kiosk: '#c9b48e', board: '#5a4632', monoA: '#b8c2b6', monoB: '#c3ccbf',
  cabin: '#82afbf', wheel: '#263832',
  env: {
    day: 0, bg: '#1b2748', fog: '#24305a', fogNear: 0.08, fogFar: 1.9, exposure: 1.05, tone: 'aces',
    bloom: { on: true, strength: 0.55, radius: 0.55, threshold: 0.85 },
    hemi: { sky: 0x4a64b8, ground: 0x1a1612, i: 0.75 },
    key: { color: 0x8ea6ff, i: 0.55 }, rim: { color: 0x3a6aa0, i: 0.3 },
    wet: 1, rain: 1, lights: 1,
    pane: '#5d828a', bulb: [1.5, 0.86, 0.22],
    sky: { top: '#03050d', mid: '#0a1226', hor: '#13203e' }, stars: true,
  },
};

// Daylight: same chunky silhouettes, white and pale blue-grey, the same amber accent.
// the light theme shares the clay palette (world bible 7.1); only its light differs
const DAY = {
  ...Object.fromEntries(Object.entries(NIGHT).filter(([k]) => k !== 'env')),
  env: {
    day: 1, bg: '#c6d5c7', fog: '#c6d5c7', fogNear: 1.1, fogFar: 5.2, exposure: 1.15, tone: 'aces',
    bloom: { on: false, strength: 0, radius: 0.4, threshold: 1 },
    hemi: { sky: 0xd7e6e4, ground: 0x817151, i: 2.5 },
    wet: 0, rain: 0, lights: 0,
    key: { color: 0xffe0ac, i: 3.3 }, rim: { color: 0xb8d9df, i: 0.8 },
    pane: '#a9c2bf', bulb: [0.9, 0.52, 0.1],
    sky: { top: '#9fbfc4', mid: '#c6d5c7', hor: '#d7ded0' }, stars: false,
  },
};

export const THEMES = { night: NIGHT, day: DAY };

// ---------- geometry helpers ----------
const polyArea = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i];
    const [x2, z2] = pts[(i + 1) % pts.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
};
const polyCentroid = (pts) => {
  let x = 0, z = 0;
  for (const p of pts) { x += p[0]; z += p[1]; }
  return [x / pts.length, z / pts.length];
};
const perimeter = (pts) => {
  let l = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    l += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return l;
};
const scaleAbout = (pts, c, s) => pts.map(([x, z]) => [c[0] + (x - c[0]) * s, c[1] + (z - c[1]) * s]);
export function pointInPoly(x, z, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function bbox(pts) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return { x0, z0, x1, z1 };
}
function nearestOnPoly(x, z, pts) {
  let best = { d: Infinity, px: x, pz: z };
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    const px = ax + dx * t, pz = az + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best.d) best = { d, px, pz };
  }
  return best;
}

// ---------- roads ----------
function pushTri(out, a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const ny = uz * vx - ux * vz; // y component of u x v
  if (ny >= 0) out.push(...a, ...b, ...c);
  else out.push(...a, ...c, ...b);
}

function ribbon(out, pts, width, y) {
  const n = pts.length;
  const L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1];
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl; tz /= tl;
    let nx = -tz, nz = tx;
    let k = 1;
    if (i > 0 && i < n - 1) {
      const t1x = p[0] - a[0], t1z = p[1] - a[1];
      const l1 = Math.hypot(t1x, t1z) || 1;
      const n1x = -t1z / l1, n1z = t1x / l1;
      k = 1 / Math.max(0.55, nx * n1x + nz * n1z);
    }
    const h = (width / 2) * k;
    L.push([p[0] + nx * h, y, p[1] + nz * h]);
    Rr.push([p[0] - nx * h, y, p[1] - nz * h]);
  }
  for (let i = 0; i < n - 1; i++) {
    pushTri(out, L[i], Rr[i], L[i + 1]);
    pushTri(out, Rr[i], Rr[i + 1], L[i + 1]);
  }
}

function dashes(out, pts, y, len = 2.4, gap = 5.2, w = 0.26) {
  let d = 0; // distance along the whole polyline
  const period = len + gap;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const sl = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (sl < 0.01) continue;
    const tx = (b[0] - a[0]) / sl, tz = (b[1] - a[1]) / sl;
    let s = (period - (d % period)) % period; // distance into this segment where the next dash starts
    for (; s + len < sl; s += period) {
      const p0 = [a[0] + tx * s, a[1] + tz * s];
      const p1 = [a[0] + tx * (s + len), a[1] + tz * (s + len)];
      ribbon(out, [p0, p1], w, y);
    }
    d += sl;
  }
}

function samplePolyline(pts, step) {
  const out = [];
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const sl = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!sl) continue;
    const tx = (b[0] - a[0]) / sl, tz = (b[1] - a[1]) / sl;
    let s = step - acc;
    while (s < sl) {
      out.push({ x: a[0] + tx * s, z: a[1] + tz * s, tx, tz });
      s += step;
    }
    acc = sl - (s - step);
  }
  return out;
}

// ---------- the world ----------
export function buildWorld(manifest, via, theme = 'night', kit = null) {
  const PAL = THEMES[theme] || THEMES.night;
  const T = PAL;
  const rng = mulberry32(1337);
  const R = manifest.radius;
  const scene = new THREE.Group();

  const sun = { x: -0.4, y: 0.8, z: 0.45 };

  // --- fog / sky handled by caller; lights here ---
  const hemi = new THREE.HemisphereLight(T.env.hemi.sky, T.env.hemi.ground, T.env.hemi.i);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(T.env.key.color, T.env.key.i);
  moon.position.set(sun.x * 300, sun.y * 300, sun.z * 300);
  scene.add(moon);
  const rim = new THREE.DirectionalLight(T.env.rim.color, T.env.rim.i);
  rim.position.set(260, 120, -200);
  scene.add(rim);

  const roads = manifest.roads;
  // spellings in the map data that Lagos would not recognise
  const NAME_FIX = { 'Murtula Muhammed Way': 'Murtala Muhammed Way' };
  roads.forEach((r) => { if (r.name && NAME_FIX[r.name]) r.name = NAME_FIX[r.name]; });
  const mainRoads = roads.filter((r) => ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service'].includes(r.cls));

  // --- choose plots ---
  const blds = manifest.buildings.map((b) => {
    const pts = b.pts;
    const area = Math.abs(polyArea(pts));
    const c = polyCentroid(pts);
    const per = perimeter(pts);
    return { ...b, area, c, compact: (4 * Math.PI * area) / (per * per || 1), bb: bbox(pts) };
  }).filter((b) => b.area > 14 && b.pts.length >= 3);

  // measure every street against its real building lines (world bible 4.3)
  const clearance = makeClearance(blds, pointInPoly);
  fitStreets(roads, clearance);

  const cand = blds
    .filter((b) => b.area >= 70 && b.area <= 1500 && b.compact >= 0.42 && Math.hypot(b.c[0], b.c[1]) < R * 0.7)
    .sort((a, b) => b.area - a.area);
  const picked = [];
  for (const spacing of [38, 28, 18, 8]) {
    for (const b of cand) {
      if (picked.length >= BUILDERS.length) break;
      if (picked.includes(b)) continue;
      if (picked.every((p) => Math.hypot(p.c[0] - b.c[0], p.c[1] - b.c[1]) >= spacing)) picked.push(b);
    }
    if (picked.length >= BUILDERS.length) break;
  }
  // biggest footprint to the builder with the most repos (breadth)
  const byBreadth = [...BUILDERS].sort((a, b) => b.repos - a.repos || b.stars - a.stars);
  picked.sort((a, b) => b.area - a.area);
  const assign = new Map();
  byBreadth.forEach((bd, i) => picked[i] && assign.set(bd.id, picked[i]));
  // "you" gets the footprint closest to the middle
  const mid = [...picked].sort((a, b) => Math.hypot(a.c[0], a.c[1]) - Math.hypot(b.c[0], b.c[1]))[0];
  if (mid) {
    const cur = assign.get('you');
    if (cur !== mid) {
      const other = [...assign.entries()].find(([, v]) => v === mid);
      if (other) assign.set(other[0], cur);
      assign.set('you', mid);
    }
  }
  const plotIds = new Set(picked);

  // --- spawn: nearest road point to the player's plot, stepped toward it ---
  const you = assign.get('you') || blds[0];
  // nearest road point to a footprint, stepped toward it; used for spawn and "go to plot"
  function roadFront(c) {
    let best = Infinity;
    let out = { x: c[0], z: c[1], tan: [0, 1] };
    for (const r of mainRoads) {
      for (let i = 0; i < r.pts.length - 1; i++) {
        const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
        const dx = bx - ax, dz = bz - az;
        const t = Math.max(0, Math.min(1, ((c[0] - ax) * dx + (c[1] - az) * dz) / (dx * dx + dz * dz || 1)));
        const px = ax + dx * t, pz = az + dz * t;
        const d = Math.hypot(c[0] - px, c[1] - pz);
        if (d < best) {
          best = d;
          const k = Math.min(r.w / 2 + 1.6, d);
          const tl = Math.hypot(dx, dz) || 1;
          out = { x: px + ((c[0] - px) / (d || 1)) * k, z: pz + ((c[1] - pz) / (d || 1)) * k, tan: [dx / tl, dz / tl] };
        }
      }
    }
    return out;
  }
  function frontOf(c) {
    const f = roadFront(c);
    const sgn = f.tan[0] * -f.x + f.tan[1] * -f.z >= 0 ? 1 : -1;
    return { x: f.x, z: f.z, yaw: Math.atan2(f.tan[0] * sgn, f.tan[1] * sgn) };
  }
  const front0 = frontOf(you.c);
  const spawn = { x: front0.x, z: front0.z };
  const delayFor = (x, z) => 0.25 + 1.5 * Math.min(1, Math.hypot(x - spawn.x, z - spawn.z) / (R * 0.95));

  // --- static scene geometry ---
  const mb = new MeshBuilder();
  const gb = new MeshBuilder(); // ground surfaces get the wet street material
  gb.box(0, -0.6, 0, R * 14, 0.6, R * 14, PAL.ground, { grad: 0, vary: 0 });

  // roads: carriageways fitted between building lines, pavements on what is left, paint on main roads
  const kerbTris = [], roadTris = [], pathTris = [], paintTris = [];
  const crossings = [];
  // where streets meet: a point another fitted road also passes through (within 1.5 m)
  const nodeUse = new Map();
  roads.forEach((r) => { if (!r.fit) return; r.fit.pts.forEach((p) => { const k = `${Math.round(p[0] / 1.5)},${Math.round(p[1] / 1.5)}`; const set = nodeUse.get(k) || new Set(); set.add(r); nodeUse.set(k, set); }); });
  const junctionAt = (p, own) => { for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const set = nodeUse.get(`${Math.round(p[0] / 1.5) + dx},${Math.round(p[1] / 1.5) + dz}`); if (set && [...set].some((o) => o !== own)) return true; } return false; };
  roads.forEach((r) => {
    // ground layers sit at least 3 cm apart, or the depth buffer cannot tell them apart at distance
    if (isFootway(r) || !r.fit) { ribbon(pathTris, r.pts, Math.min(r.w, 3), 0.06); return; }
    const { pts, nrm, half, paveL, paveR } = r.fit;
    const neg = half.map((h) => -h);
    band(roadTris, pts, nrm, neg, half, 0.14, pushTri);
    band(kerbTris, pts, nrm, half, half.map((h, i) => h + paveL[i]), 0.11, pushTri);
    band(kerbTris, pts, nrm, half.map((h, i) => -h - paveR[i]), neg, 0.11, pushTri);
    // lane markings (world bible 4.3): a dashed centre line on any two-lane street, lane dividers on wide
    // roads, solid edge lines on main roads; all paint sits at 17 cm, above every other ground layer
    const minHalf = Math.min(...half);
    if (minHalf >= 2.8) dashes(paintTris, pts, 0.17, 2.4, 4.2, 0.16);
    if (minHalf >= 5.6) [-1, 1].forEach((sg) => dashes(paintTris, pts.map((p, i) => [p[0] + nrm[i][0] * half[i] * 0.5 * sg, p[1] + nrm[i][1] * half[i] * 0.5 * sg]), 0.17, 1.6, 4.6, 0.13));
    if (['primary', 'secondary', 'trunk', 'motorway', 'tertiary'].includes(r.cls)) [-1, 1].forEach((sg) => ribbon(paintTris, pts.map((p, i) => [p[0] + nrm[i][0] * (half[i] - 0.35) * sg, p[1] + nrm[i][1] * (half[i] - 0.35) * sg]), 0.12, 0.17));
    // zebra crossings just before each junction, so people cross where drivers expect them
    if (minHalf >= 2.8) [0, pts.length - 1].forEach((end) => {
      if (!junctionAt(pts[end], r)) return;
      const rad = half[end] + Math.max(paveL[end], paveR[end]);
      const s = rad + 1.2; // metres back from the junction
      const dir = end === 0 ? 1 : -1;
      let acc = 0, k = end;
      while (k + dir >= 0 && k + dir < pts.length) { const L = Math.hypot(pts[k + dir][0] - pts[k][0], pts[k + dir][1] - pts[k][1]); if (acc + L >= s + 3.2) break; acc += L; k += dir; }
      if (k + dir < 0 || k + dir >= pts.length) return;
      const A = pts[k], B = pts[k + dir], L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, tx = (B[0] - A[0]) / L, tz = (B[1] - A[1]) / L;
      const u0 = Math.max(0, s - acc), c0 = [A[0] + tx * u0, A[1] + tz * u0], c1 = [A[0] + tx * (u0 + 3), A[1] + tz * (u0 + 3)];
      const nx = -tz, nz = tx, hw = half[k] - 0.4;
      for (let q = -hw + 0.25; q <= hw - 0.25; q += 1.0) ribbon(paintTris, [[c0[0] + nx * q, c0[1] + nz * q], [c1[0] + nx * q, c1[1] + nz * q]], 0.5, 0.17);
      crossings.push({ x: (c0[0] + c1[0]) / 2, z: (c0[1] + c1[1]) / 2, nx, nz, hw });
    });
    // junction aprons: rounded pavement corners where streets end or meet, so no bare ground shows
    [0, pts.length - 1].forEach((i) => {
      const rad = half[i] + Math.max(paveL[i], paveR[i]);
      if (rad < 1) return;
      const [cx, cz] = pts[i], seg = 18;
      for (let k = 0; k < seg; k++) {
        const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
        pushTri(kerbTris, [cx, 0.09, cz], [cx + Math.cos(a0) * rad, 0.09, cz + Math.sin(a0) * rad], [cx + Math.cos(a1) * rad, 0.09, cz + Math.sin(a1) * rad]);
      }
    });
  });
  if (kerbTris.length) gb.raw(kerbTris, PAL.kerb);
  if (pathTris.length) gb.raw(pathTris, PAL.path);
  if (roadTris.length) gb.raw(roadTris, PAL.road);
  if (paintTris.length) gb.raw(paintTris, PAL.paint);

  // unclaimed buildings: each map footprint is a lot with a house set back on a lawn, behind a
  // picket fence, door to the street (Elvis, 9 October 2026: a clean, established suburb first)
  const toStreet = (x, z) => {
    let d = Infinity;
    mainRoads.forEach((r) => { const P = r.fit ? r.fit.pts : r.pts; for (let i = 0; i < P.length - 1; i += 1) { const [ax, az] = P[i], [bx, bz] = P[i + 1]; const dx = bx - ax, dz = bz - az; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } });
    return d;
  };
  const lotTrees = [], doorPlants = [], lotFences = [], porchLamps = [];
  // A plot may not reach the pavement or the carriageway, nor overlap a plot already laid out:
  // map footprints often do both, so each plot is pulled back toward its centre until it is clear.
  const reserve = [];
  roads.forEach((r) => { if (!r.fit) return; const { pts, half, paveL, paveR } = r.fit; for (let k = 0; k < pts.length - 1; k++) reserve.push([pts[k], pts[k + 1], Math.max(half[k], half[k + 1]) + Math.max(paveL[k], paveR[k], paveL[k + 1], paveR[k + 1]) + 0.3]); });
  const inReserve = (x, z) => reserve.some(([a, c, h]) => { const dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - a[0] - dx * u, z - a[1] - dz * u) < h; });
  const laid = []; // accepted plots: { pts, bb }
  const carriage = []; roads.forEach((r) => { if (!r.fit) return; const { pts, half } = r.fit; for (let k = 0; k < pts.length - 1; k++) carriage.push([pts[k], pts[k + 1], Math.max(half[k], half[k + 1])]); });
  const along = (pts, f) => { for (let i = 0; i < pts.length; i++) { const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az))); for (let k = 0; k < n; k++) if (f(ax + (bx - ax) * k / n, az + (bz - az) * k / n)) return true; } return false; };
  const clashes = (pts) => {
    const bb = bbox(pts);
    if (along(pts, inReserve) || along(pts, inReserveBox) || reserveCorners().some(([x, z]) => pointInPoly(x, z, pts))) return true;
    return laid.some((l) => !(bb.x1 < l.bb.x0 || bb.x0 > l.bb.x1 || bb.z1 < l.bb.z0 || bb.z0 > l.bb.z1) && (along(pts, (x, z) => pointInPoly(x, z, l.pts)) || l.pts.some(([x, z]) => pointInPoly(x, z, pts))));
  };
  // plots of the builders' towers are laid first, so gardens give way to them
  blds.forEach((b) => { if (plotIds.has(b)) laid.push({ pts: b.pts, bb: b.bb }); });
  // ---------- footbridge site, chosen before any garden is laid out (infrastructure reserves land first) ----------
  const BRIDGE = { H: 5.2, RISE: 0.18, RUN: 0.3, FW: 0.9, LAND: 1.25 }; BRIDGE.nSteps = Math.round(BRIDGE.H / BRIDGE.RISE); BRIDGE.FLIGHT = BRIDGE.nSteps * BRIDGE.RUN;
  const cores = blds.filter((b) => !plotIds.has(b)).map((b) => scaleAbout(b.pts, b.c, 0.55));
  let bridgeSite = null;
  const bridgeReserve = []; // boxes no garden may take
  {
    const { H, nSteps, RUN, FLIGHT, FW, LAND } = BRIDGE;
    const main = [...roads].filter((r) => r.fit && ['primary', 'secondary', 'trunk', 'tertiary'].includes(r.cls)).sort((a, b) => perimeter(b.pts) - perimeter(a.pts))[0];
    const okBox = (cx, cz, hx, hz, ry) => {
      const cs = Math.cos(ry), sn = Math.sin(ry);
      for (let u = -1; u <= 1.001; u += 0.25) for (let v = -1; v <= 1.001; v += 0.5) {
        const lx = u * hx, lz = v * hz, x = cx + lx * cs + lz * sn, z = cz - lx * sn + lz * cs;
        if (Math.hypot(x, z) > R * 0.9) return false;
        if (carriage.some(([a, c, h]) => { const dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1, w = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - a[0] - dx * w, z - a[1] - dz * w) < h + 0.3; })) return false;
        if (laid.some((l) => pointInPoly(x, z, l.pts) || nearestOnPoly(x, z, l.pts).d < 1.2)) return false; // the builders' towers
        if (cores.some((c) => pointInPoly(x, z, c))) return false; // the middle of any map building
      }
      return true;
    };
    let site = null;
    if (main) {
      const S = samplePolyline(main.fit.pts, 4), n0 = Math.floor(S.length * 0.2), n1 = Math.ceil(S.length * 0.8);
      const order = []; for (let k = n0; k < n1; k++) order.push(k); order.sort((p, q) => Math.abs(p - S.length / 2) - Math.abs(q - S.length / 2));
      for (const k of order) {
        const m = S[k], nx = -m.tz, nz = m.tx;
        // carriageway half and pavement width here
        let hw = 4, pv = 2; { let bd = Infinity; main.fit.pts.forEach((p, i) => { const d = Math.hypot(p[0] - m.x, p[1] - m.z); if (d < bd) { bd = d; hw = main.fit.half[i]; pv = Math.max(main.fit.paveL[i], main.fit.paveR[i]); } }); }
        const D = hw + pv + LAND + 0.4, ry = Math.atan2(nx, nz);
        // each end: the landing, and a flight running one way or the other along the road
        // a dual carriageway is two roads side by side: walk out from the centre line until clear of all of them
        const onAny = (x, z) => carriage.some(([a, c, h]) => { const dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1, w = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - a[0] - dx * w, z - a[1] - dz * w) < h + 0.3; });
        const reach = (sg) => { let last = 0; for (let q = 0; q < 45; q += 0.5) if (onAny(m.x + nx * q * sg, m.z + nz * q * sg)) last = q; return last; };
        const ends = [-1, 1].map((sg) => {
          const Ds = reach(sg) + pv + LAND + 0.2;
          if (Ds > 40) return null;
          const lx = m.x + nx * Ds * sg, lz = m.z + nz * Ds * sg;
          for (const dir of [1, -1]) {
            const fc = LAND + FLIGHT / 2, fx = lx + m.tx * fc * dir, fz = lz + m.tz * fc * dir;
            if (okBox(lx, lz, LAND, LAND, ry) && okBox(fx, fz, FLIGHT / 2 + 0.3, FW + 0.2, ry)) return { lx, lz, dir, sg, D: Ds };
          }
          return null;
        });
        if (ends[0] && ends[1]) { site = { m, nx, nz, D, ry, ends }; break; }
      }
    }
    bridgeSite = site;
    if (site) site.ends.forEach(({ lx, lz, dir }) => {
      const { LAND: L2, FLIGHT: F2, FW: W2 } = BRIDGE, fc = L2 + F2 / 2;
      bridgeReserve.push({ cx: lx, cz: lz, hx: L2 + 0.8, hz: L2 + 0.8, ry: site.ry });
      bridgeReserve.push({ cx: lx + site.m.tx * fc * dir, cz: lz + site.m.tz * fc * dir, hx: F2 / 2 + 0.8, hz: W2 + 0.8, ry: site.ry });
    });
  }
  const inReserveBox = (x, z) => bridgeReserve.some((c) => { const dx = x - c.cx, dz = z - c.cz, cs = Math.cos(c.ry), sn = Math.sin(c.ry), lx = dx * cs - dz * sn, lz = dx * sn + dz * cs; return Math.abs(lx) < c.hx && Math.abs(lz) < c.hz; });
  const reserveCorners = () => bridgeReserve.flatMap((c) => { const cs = Math.cos(c.ry), sn = Math.sin(c.ry); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [c.cx + u * c.hx * cs + v * c.hz * sn, c.cz - u * c.hx * sn + v * c.hz * cs]); });

  const fenceIndex = new Map(), estates = [];
  // ---------- planned estates (src/estates.js): the district's houses on a grid, behind walls and gates ----------
  // The map's own house footprints point every which way; the roads, the builders' plots and the bridge
  // stay, and the houses are laid out as estates along the roads instead (Elvis, 9 October 2026).
  blds.forEach((b) => { if (!plotIds.has(b)) { b.pts = []; b.top = 0; } });
  const plotFree = (x, z) => !laid.some((l) => x > l.bb.x0 - 1 && x < l.bb.x1 + 1 && z > l.bb.z0 - 1 && z < l.bb.z1 + 1 && (pointInPoly(x, z, l.pts) || nearestOnPoly(x, z, l.pts).d < 1));
  // the road reserve on a 1 m raster, marked segment by segment: far quicker than asking every
  // segment about every point the planner tests
  const RC = 1, RN = Math.ceil((2 * R) / RC) + 3, resv = new Uint8Array(RN * RN);
  reserve.forEach(([a, c, h]) => {
    const dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1;
    const i0 = Math.max(0, Math.floor((Math.min(a[0], c[0]) - h + R) / RC)), i1 = Math.min(RN - 1, Math.ceil((Math.max(a[0], c[0]) + h + R) / RC));
    const j0 = Math.max(0, Math.floor((Math.min(a[1], c[1]) - h + R) / RC)), j1 = Math.min(RN - 1, Math.ceil((Math.max(a[1], c[1]) + h + R) / RC));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = -R + i * RC, z = -R + j * RC, w = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
      if (Math.hypot(x - a[0] - dx * w, z - a[1] - dz * w) < h + 0.35) resv[j * RN + i] = 1; // the reserve already has a margin; 0.35 more covers the 1 m raster's rounding
    }
  });
  const inResv = (x, z) => { const i = Math.round((x + R) / RC), j = Math.round((z + R) / RC); return i < 0 || j < 0 || i >= RN || j >= RN || resv[j * RN + i] === 1; };
  const estatePlan = planEstates({ roads, R, rng, free: (x, z) => Math.hypot(x - spawn.x, z - spawn.z) > 50 && !inResv(x, z) && !inReserveBox(x, z) && plotFree(x, z) }); // the start street stays open for the board, the hub and the stalls
  const estateWalls = [], estateGarages = [], carSpots = [], addresses = [];
  const WALLC = '#e6dcc8', COPE = '#b9ab92', CLOSE = '#9a9a92';
  estatePlan.forEach((E, ei) => {
    // the walls, with a coping, and pillars and a guard booth at every gate
    E.walls.forEach((w) => {
      mb.box(w.cx, 0, w.cz, w.hx * 2, 2.0, w.hz * 2, WALLC, { grad: 0.06, vary: 0.02 }, w.ry);
      mb.box(w.cx, 2.0, w.cz, w.hx * 2 + 0.05, 0.12, w.hz * 2 + 0.12, COPE, { grad: 0, vary: 0 }, w.ry);
      estateWalls.push({ name: 'estate_wall', ...w, h: 2.12 });
    });
    E.gates.forEach((g) => {
      g.post.forEach(([x, z]) => { mb.box(x, 0, z, 0.6, 2.7, 0.6, COPE, { grad: 0.05, vary: 0 }, E.ry); estateWalls.push({ name: 'gate_pillar', cx: x, cz: z, hx: 0.3, hz: 0.3, ry: E.ry, h: 2.7 }); });
      const [bx, bz] = g.booth;
      mb.box(bx, 0, bz, 2.2, 2.5, 2.2, WALLC, { grad: 0.06, vary: 0.02 }, E.ry); mb.box(bx, 2.5, bz, 2.6, 0.16, 2.6, '#5a5048', { grad: 0, vary: 0 }, E.ry);
      estateWalls.push({ name: 'gate_booth', cx: bx, cz: bz, hx: 1.1, hz: 1.1, ry: E.ry, h: 2.7 });
    });
    // estates back from the road reach it by a short access lane
    (E.access || []).forEach((a) => { const mx = (a.from[0] + a.to[0]) / 2, mz = (a.from[1] + a.to[1]) / 2; mb.box(mx, 0, mz, 4.0, 0.08, a.len + 0.6, CLOSE, { grad: 0, vary: 0.015 }, Math.atan2(a.to[0] - a.from[0], a.to[1] - a.from[1])); });
    // each close: a paved lane from the gate to the back of the estate
    E.closes.forEach((c) => mb.box(c.cx, 0, c.cz, c.hx * 2, 0.08, c.hz * 2, CLOSE, { grad: 0, vary: 0.015 }, c.ry));
    // the lots, numbered from the gate: 1A, 2A... on the left as you walk in, 1B, 2B... on the right
    E.lots.forEach((L, li) => {
      laid.push({ pts: L.pts, bb: bbox(L.pts) });
      const lv = rng() < 0.55 ? 2 : 1;
      const wall = PAL.walls[Math.floor(rng() * PAL.walls.length)];
      const est = dressEstate(mb, L.pts, L.c, lv, { wall, rng, fenceIndex, deferFences: true, detail: Math.hypot(L.c[0], L.c[1]) < R * 0.6 ? 1 : 0,
        plan: { front: L.front, side: L.side, depth: LOT_D, width: LOT_W, flip: (parseInt(L.no, 10) % 2) === 0 }, noFence: (x, z) => nearWall(E, x, z, 0.9) });
      if (!est) return;
      const addr = `${L.no}, Gate ${L.gate}, ${E.name}`;
      const b = { pts: est.pts, lot: L.pts, c: L.c, bb: bbox(est.pts), top: est.top, area: Math.abs(polyArea(est.pts)), planned: true, addr, no: L.no, gate: L.gate, estate: E.name };
      blds.push(b);
      if (est.tree) lotTrees.push(est.tree);
      if (est.garage) estateGarages.push(est.garage);
      if (est.car && rng() < 0.6) carSpots.push({ ...est.car, addr });
      if (est.door) doorPlants.push({ x: est.door.x, z: est.door.z, step: est.door.step, addr, no: L.no });
      addresses.push({ x: L.c[0], z: L.c[1], no: L.no, gate: L.gate, estate: E.name, addr, door: est.door?.step || null, lamp: est.door?.lamp || null, pts: L.pts });
      // porch lights: two in three on a motion sensor (on only when someone comes near), the rest on all night
      if (est.door?.lamp) { const Lp = est.door.lamp; porchLamps.push({ mx: Lp.x, mz: Lp.z, x: Lp.x + Math.sin(Lp.ry) * 0.9, y: 2.4, z: Lp.z + Math.cos(Lp.ry) * 0.9, ry: Lp.ry, my: Lp.y, sensor: rng() < 0.67, power: 0, color: 0xffc27a, kind: 'porch' }); }
      estates.push(est);
    });
  });
  // fences last, once every house is down, so none runs too close to any wall (houses.js)
  const houses = blds.filter((b) => b.pts.length >= 3).map((b) => ({ pts: b.pts, bb: b.bb || bbox(b.pts) }));
  let fenceRuns = estates.flatMap((est) => est.lay(houses));
  // and no squeeze alleys: where two fences run side by side closer than the walkway, one stretch goes
  {
    const hash = new Map(), key = (x, z) => `${Math.floor(x / 2)},${Math.floor(z / 2)}`, next = [];
    for (const r of fenceRuns) {
      const drop = [];
      for (let u = r.a + 0.25; u < r.b; u += 0.5) {
        const x = r.ax + r.tx * u, z = r.az + r.tz * u, ci = Math.floor(x / 2), cj = Math.floor(z / 2);
        let close = false;
        for (let di = -1; di <= 1 && !close; di++) for (let dj = -1; dj <= 1 && !close; dj++) for (const q of hash.get(`${ci + di},${cj + dj}`) || []) {
          const d = Math.hypot(q.x - x, q.z - z);
          if (d > 0.3 && d < WALK && Math.abs(r.tx * q.tz - r.tz * q.tx) < 0.3) { close = true; break; }
        }
        if (close) drop.push([u - 0.3, u + 0.3]);
      }
      let parts = [r];
      drop.forEach(([u0, u1]) => { parts = parts.flatMap((p) => (u1 > p.a && u0 < p.b ? cutFence(p, u0, u1) : [p])); });
      parts.forEach((p) => { next.push(p); for (let u = p.a + 0.25; u < p.b; u += 0.5) { const x = p.ax + p.tx * u, z = p.az + p.tz * u, k = key(x, z); let a = hash.get(k); if (!a) hash.set(k, (a = [])); a.push({ x, z, tx: p.tx, tz: p.tz }); } });
    }
    fenceRuns = next;
  }
  // then gates: a back garden the house cuts off from its front gate is a trap (Elvis, 9 October 2026),
  // so wherever a patch of garden cannot be walked to from the street, a gate is cut into the fence
  // between it and ground that can. Opening one garden can connect the next, so it runs a few rounds.
  {
    const solidsNow = blds.filter((b) => b.pts.length >= 3).map((b) => ({ pts: b.pts, bb: b.bb || bbox(b.pts), top: 10 }));
    const treeBoxes = [...lotTrees.map((t) => ({ cx: t.x, cz: t.z, hx: 0.3, hz: 0.3, ry: 0 })), ...estateWalls, ...estateGarages];
    const GATE = 1.8;
    for (let round = 0; round < 5; round++) {
      const g = buildNavGrid({ R, solids: solidsNow, boxes: [...fenceRuns.map(fenceCollider), ...treeBoxes], roads, lots: [], pointInPoly, nearestOnPoly });
      g.setMainLargest();
      const pockets = g.pocketSizes(6);
      if (!pockets.size) break;
      const opened = new Set(), next = [];
      let cuts = 0;
      for (const r of fenceRuns) {
        let cut = null;
        for (let u = r.a + 0.5; u <= r.b - 0.5 && !cut; u += 0.5) {
          const x = r.ax + r.tx * u, z = r.az + r.tz * u;
          const A = g.islandNear(x + r.nx * 0.85, z + r.nz * 0.85, 1), B = g.islandNear(x - r.nx * 0.85, z - r.nz * 0.85, 1);
          const [inner, outer] = pockets.has(A) && !opened.has(A) ? [A, B] : [B, A];
          if (pockets.has(inner) && !opened.has(inner) && outer === g.main) { opened.add(inner); cut = u; }
        }
        if (cut === null) next.push(r);
        else { cuts++; const u0 = Math.max(r.a, Math.min(cut - GATE / 2, r.b - GATE)), u1 = u0 + GATE; next.push(...cutFence(r, u0, u1)); }
      }
      fenceRuns = next;
      if (!cuts) break;
    }
  }
  // a stub left at a corner reads as a broken fence; taking it away only ever opens ground up
  fenceRuns.filter((r) => r.b - r.a >= 1.5).forEach((r) => { drawFence(mb, r); lotFences.push({ name: 'fence', ...fenceCollider(r), h: 1.0 }); });

  // far lots beyond the data: unclaimed, dark
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2;
    const d = R * (1.35 + rng() * 1.0);
    const w = 10 + rng() * 22, dd = 10 + rng() * 22, h = 5 + rng() * 22;
    mb.box(Math.cos(a) * d, 0, Math.sin(a) * d, w, h, dd, PAL.far, { grad: 0.5, vary: 0.02 }, rng() * 3);
  }

  const bulbs = []; // {x,y,z,s}
  const lamps = []; // street lamps that light the ground for real
  const lampT = kit?.get('yaba_street_lamp');
  const lampSpots = [];
  const kitColliders = [...lotFences, ...estateWalls, ...estateGarages];
  const claims = []; // { kind, cx, cz, hx, hz, ry }
  let world_bridge = null; // picket fences first: low (1 m), so a jump clears them
  const trees = [];
  const glows = []; // {x,z,r}
  // lots count as built: nothing from the street is planted on someone's lawn
  const inAnyBuilding = (x, z, pad = 0) => blds.some((b) => { const P = b.lot || b.pts; const bb = b.lot ? b.lotBB || (b.lotBB = bbox(b.lot)) : b.bb; return P.length >= 3 && x > bb.x0 - 1 - pad && x < bb.x1 + 1 + pad && z > bb.z0 - 1 - pad && z < bb.z1 + 1 + pad && (pointInPoly(x, z, P) || (pad > 0 && nearestOnPoly(x, z, P).d < pad)); });

  // street lamps on every street, trees only where pavements allow (world bible 4.3)
  const furniture = streetFurniture(roads, { inBuilding: inAnyBuilding, inside: (x, z) => Math.hypot(x, z) < R * 1.08 });
  // ---------- footbridge (estate-layout skill): only where both stairs land on public ground ----------
  // A deck 5.2 m up across the main road, a landing at each end, and a stair flight down each side
  // running alongside the road. Steps, landings and deck are walkable (groundAt); railings stop you
  // stepping off; anything standing where the stairs go (a lamp, a tree) gives way.
  const walkables = []; // flat surfaces: { cx, cz, hx, hz, ry, top }
  const bridgeBoxes = []; // footprints, to clear lamps and trees
  {
    const { H, RISE, nSteps, RUN, FLIGHT, FW, LAND } = BRIDGE;
    const site = bridgeSite;
    if (site) {
      const { m, nx, nz, ry, ends } = site, tx = m.tx, tz = m.tz;
      // the deck runs from one landing to the other, wherever each one had to go
      const D1 = ends[0].D, D2 = ends[1].D, D = (D1 + D2) / 2, off = (D2 - D1) / 2, mx0 = m.x + nx * off, mz0 = m.z + nz * off;
      const deck = '#c9c2b2', rail = PAL.tealDark, step = '#d6d0c0', pier = '#b5ab98';
      // deck and its rails
      mb.box(mx0, H - 0.35, mz0, LAND * 2, 0.35, D * 2, deck, { grad: 0.1, vary: 0 }, ry);
      walkables.push({ cx: mx0, cz: mz0, hx: LAND, hz: D, ry, top: H });
      [-1, 1].forEach((s2) => {
        const rx = mx0 + tx * (LAND - 0.05) * s2, rz = mz0 + tz * (LAND - 0.05) * s2;
        // deck rails run between the landings only, so the stairs can join the landings
        const DL = D - LAND;
        mb.box(rx, H, rz, 0.08, 1.05, DL * 2, rail, { grad: 0, vary: 0 }, ry);
        mb.box(rx, H + 1.0, rz, 0.14, 0.08, DL * 2, rail, { grad: 0, vary: 0 }, ry);
        kitColliders.push({ name: 'bridge_rail', cx: rx, cz: rz, hx: 0.06, hz: DL, ry, y0: H, y1: H + 1.1 });
      });
      for (let q = -D + 1.5; q < D - 1; q += 2.6) bulbs.push({ x: mx0 + nx * q, y: H + 1.15, z: mz0 + nz * q, s: 0.12 });
      ends.forEach(({ lx, lz, dir, sg }) => {
        // landing on four piers
        mb.box(lx, H - 0.35, lz, LAND * 2, 0.35, LAND * 2, deck, { grad: 0.1, vary: 0 }, ry);
        walkables.push({ cx: lx, cz: lz, hx: LAND, hz: LAND, ry, top: H });
        bridgeBoxes.push({ cx: lx, cz: lz, hx: LAND + 0.5, hz: LAND + 0.5, ry });
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c]) => {
          const px = lx + tx * (LAND - 0.2) * a + nx * (LAND - 0.2) * c, pz = lz + tz * (LAND - 0.2) * a + nz * (LAND - 0.2) * c;
          mb.box(px, 0, pz, 0.32, H - 0.35, 0.32, pier, { grad: 0.2, vary: 0 }, ry);
          kitColliders.push({ name: 'bridge_pier', cx: px, cz: pz, hx: 0.2, hz: 0.2, ry, y0: 0, y1: H - 0.35 });
        });
        // railings on the landing's outer side and its far side (the flight leaves from the near side)
        const ox = lx + nx * (LAND - 0.05) * sg, oz = lz + nz * (LAND - 0.05) * sg;
        mb.box(ox, H, oz, LAND * 2, 1.05, 0.08, rail, { grad: 0, vary: 0 }, ry);
        kitColliders.push({ name: 'bridge_rail', cx: ox, cz: oz, hx: LAND, hz: 0.06, ry, y0: H, y1: H + 1.1 });
        // the stair side of the landing: short rails either side of the stair opening
        [-1, 1].forEach((s2) => {
          const w = LAND - FW, o = FW + w / 2;
          const px = lx + tx * (LAND - 0.05) * dir + nx * o * s2, pz = lz + tz * (LAND - 0.05) * dir + nz * o * s2;
          mb.box(px, H, pz, 0.08, 1.05, w, rail, { grad: 0, vary: 0 }, ry);
          kitColliders.push({ name: 'bridge_rail', cx: px, cz: pz, hx: 0.06, hz: w / 2, ry, y0: H, y1: H + 1.1 });
        });
        const fx0 = lx - tx * (LAND - 0.05) * dir, fz0 = lz - tz * (LAND - 0.05) * dir;
        mb.box(fx0, H, fz0, 0.08, 1.05, LAND * 2, rail, { grad: 0, vary: 0 }, ry);
        kitColliders.push({ name: 'bridge_rail', cx: fx0, cz: fz0, hx: 0.06, hz: LAND, ry, y0: H, y1: H + 1.1 });
        // the flight: solid steps from the landing down to the pavement, a rail each side
        const fry = Math.atan2(tx * dir, tz * dir);
        for (let k = 0; k < nSteps; k++) {
          const top = H - (k + 1) * RISE, a = LAND + (k + 0.5) * RUN;
          if (top <= 0.001) continue;
          const sx = lx + tx * a * dir, sz = lz + tz * a * dir;
          mb.box(sx, 0, sz, FW * 2, top, RUN + 0.01, step, { grad: 0.15, vary: 0.02 }, fry);
          walkables.push({ cx: sx, cz: sz, hx: FW, hz: RUN / 2 + 0.005, ry: fry, top });
          kitColliders.push({ name: 'bridge_step', cx: sx, cz: sz, hx: FW, hz: RUN / 2, ry: fry, y0: 0, y1: top, step: true });
          [-1, 1].forEach((s2) => {
            const rx = sx + nx * (FW + 0.04) * s2 * sg, rz = sz + nz * (FW + 0.04) * s2 * sg;
            // a slim post every third step and a thin handrail along the top: light, not a wall
            if (k % 3 === 0) mb.box(rx, top, rz, 0.05, 0.98, 0.05, rail, { grad: 0, vary: 0 }, fry);
            mb.box(rx, top + 0.95, rz, 0.06, 0.06, RUN + 0.02, rail, { grad: 0, vary: 0 }, fry);
            kitColliders.push({ name: 'bridge_rail', cx: rx, cz: rz, hx: 0.05, hz: RUN / 2, ry: fry, y0: top, y1: top + 1.1 });
          });
        }
        // the flight's sides: the steps stand on a sloped concrete stringer, painted like the piers
        for (let k = 0; k < nSteps; k++) { const top = H - (k + 1) * RISE, a = LAND + (k + 0.5) * RUN; if (top <= 0.001) continue; [-1, 1].forEach((s2) => mb.box(lx + tx * a * dir + nx * (FW + 0.01) * s2 * sg, 0, lz + tz * a * dir + nz * (FW + 0.01) * s2 * sg, 0.06, top, RUN + 0.01, pier, { grad: 0.2, vary: 0 }, fry)); }
        const fc = LAND + FLIGHT / 2;
        bridgeBoxes.push({ cx: lx + tx * fc * dir, cz: lz + tz * fc * dir, hx: FW + 0.6, hz: FLIGHT / 2 + 0.8, ry: fry });
        claims.push({ kind: 'bridge_stairs', cx: lx + tx * fc * dir, cz: lz + tz * fc * dir, hx: FW, hz: FLIGHT / 2, ry: fry });
      });
      claims.push({ kind: 'bridge_landing', cx: ends[0].lx, cz: ends[0].lz, hx: LAND, hz: LAND, ry }, { kind: 'bridge_landing', cx: ends[1].lx, cz: ends[1].lz, hx: LAND, hz: LAND, ry });
      // lamps and trees in the way give way to the bridge
      const inB = (x, z, pad) => bridgeBoxes.some((c) => { const dx = x - c.cx, dz = z - c.cz, cs = Math.cos(c.ry), sn = Math.sin(c.ry), lxx = dx * cs - dz * sn, lzz = dx * sn + dz * cs; return Math.abs(lxx) < c.hx + pad && Math.abs(lzz) < c.hz + pad; });
      for (let k = furniture.lamps.length - 1; k >= 0; k--) if (inB(furniture.lamps[k].x, furniture.lamps[k].z, 0.6)) furniture.lamps.splice(k, 1);
      for (let k = furniture.trees.length - 1; k >= 0; k--) if (inB(furniture.trees[k].x, furniture.trees[k].z, 1.2)) furniture.trees.splice(k, 1);
      world_bridge = { x: mx0, z: mz0, span: D * 2, height: H, ends: ends.map((e) => ({ x: e.lx, z: e.lz, foot: { x: e.lx + tx * (LAND + FLIGHT + 0.8) * e.dir, z: e.lz + tz * (LAND + FLIGHT + 0.8) * e.dir }, up: Math.atan2(-tx * e.dir, -tz * e.dir) })) };
    }
  }

  furniture.lamps.forEach((l) => {
    const { x, z, nx, nz } = l;
    if (lampT) {
      // the kit's street lamp on the pavement, arm over the road
      const spot = { x, z, ry: Math.atan2(nz, -nx) };
      lampSpots.push(spot);
      const g = anchorAt(lampT, 'lamp_glow', spot);
      bulbs.push({ x: g.x, y: g.y - 0.06, z: g.z, s: 0.14 });
      glows.push({ x: g.x - nx * 1.0, z: g.z - nz * 1.0, r: 8 });
      lamps.push({ x: g.x, y: g.y, z: g.z, delay: delayFor(g.x, g.z), kind: 'street' });
    } else {
      mb.cyl(x, 0.2, z, 0.1, 0.14, 6.2, 6, PAL.metal, { grad: 0.2 });
      const bx = x - nx * 1.2, bz = z - nz * 1.2;
      mb.box((x + bx) / 2, 6.0, (z + bz) / 2, 0.14, 0.14, 1.3, PAL.metal, { grad: 0 }, Math.atan2(nx, nz));
      bulbs.push({ x: bx, y: 5.95, z: bz, s: 0.26 });
      glows.push({ x: bx - nx * 1.0, z: bz - nz * 1.0, r: 6.5 });
      lamps.push({ x: bx, y: 5.95, z: bz, delay: delayFor(bx, bz), kind: 'street' });
    }
  });
  trees.push(...furniture.trees, ...lotTrees);

  // lamps along every estate close, alternating sides every 16 m, arms over the lane
  estatePlan.forEach((E) => E.closes.forEach((c) => {
    const [ux, uz] = E.rect.u, [vx, vz] = E.rect.v;
    for (let t = 6, k = 0; t < c.hz * 2 - 3; t += 16, k++) {
      const side = k % 2 ? 1 : -1, off = c.hx - 0.35;
      const bx = c.cx + vx * (t - c.hz), bz = c.cz + vz * (t - c.hz), x = bx + ux * off * side, z = bz + uz * off * side;
      mb.cyl(x, 0.08, z, 0.08, 0.11, 4.4, 6, PAL.metal, { grad: 0.2 });
      const hx = x - ux * 0.9 * side, hz = z - uz * 0.9 * side;
      mb.box((x + hx) / 2, 4.35, (z + hz) / 2, 0.1, 0.1, 1.0, PAL.metal, { grad: 0 }, Math.atan2(ux * side, uz * side));
      bulbs.push({ x: hx, y: 4.3, z: hz, s: 0.2 });
      glows.push({ x: hx, z: hz, r: 6 });
      lamps.push({ x: hx, y: 4.3, z: hz, delay: delayFor(hx, hz), kind: 'street' });
      kitColliders.push({ name: 'lamp_post', cx: x, cz: z, hx: 0.12, hz: 0.12, ry: 0 });
    }
  }));

  // footpath bollards: footways and paths get low lights every 14 m, so no walkway is dark (world bible 4.3)
  roads.filter((r) => isFootway(r)).forEach((r) => {
    samplePolyline(r.pts, 14).forEach((s, k) => {
      const side = k % 2 ? 1 : -1, x = s.x - s.tz * 1.3 * side, z = s.z + s.tx * 1.3 * side;
      if (Math.hypot(x, z) > R * 1.02 || inAnyBuilding(x, z, 0.5) || laid.some((l) => pointInPoly(x, z, l.pts))) return;
      if (carriage.some(([a, c, h]) => { const dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1, w = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - a[0] - dx * w, z - a[1] - dz * w) < h + 0.4; })) return;
      if (lamps.some((l) => Math.hypot(l.x - x, l.z - z) < 8)) return;
      mb.cyl(x, 0, z, 0.09, 0.11, 0.85, 8, PAL.metal, { grad: 0.2 });
      bulbs.push({ x, y: 0.92, z, s: 0.12 });
      glows.push({ x, z, r: 3.2 });
      lamps.push({ x, y: 0.95, z, delay: delayFor(x, z), kind: 'path', power: 16 });
      kitColliders.push({ name: 'bollard', cx: x, cz: z, hx: 0.12, hz: 0.12, ry: 0 });
    });
  });

  // electric poles with wires along the longest main road (a Lagos detail)
  const longest = [...roads].filter((r) => ['primary', 'secondary', 'trunk'].includes(r.cls))
    .sort((a, b) => perimeter(b.pts) - perimeter(a.pts))[0] || roads[0];
  if (longest) {
    const side = 1;
    const pole = samplePolyline(longest.pts, 38).map((s) => ({
      x: s.x + -s.tz * side * (longest.w / 2 + 2.6),
      z: s.z + s.tx * side * (longest.w / 2 + 2.6),
      tx: s.tx, tz: s.tz,
    })).filter((p) => Math.hypot(p.x, p.z) < R * 1.05 && !inAnyBuilding(p.x, p.z));
    // the kit's utility poles replace these along neighbourhood streets (props.js)
    if (!kit?.get('yaba_utility_pole')) pole.forEach((p, i) => {
      mb.cyl(p.x, 0, p.z, 0.13, 0.19, 9.4, 6, PAL.trunk);
      mb.box(p.x, 8.6, p.z, 0.16, 0.16, 2.6, PAL.metal, { grad: 0 }, Math.atan2(-p.tz, p.tx) + Math.PI / 2 - Math.PI / 2);
      const nxt = pole[i + 1];
      if (nxt && Math.hypot(nxt.x - p.x, nxt.z - p.z) < 60) {
        const mx = (p.x + nxt.x) / 2, mz = (p.z + nxt.z) / 2;
        const len = Math.hypot(nxt.x - p.x, nxt.z - p.z);
        mb.box(mx, 8.55, mz, 0.05, 0.05, len, PAL.wire, { grad: 0, vary: 0 }, Math.atan2(nxt.x - p.x, nxt.z - p.z));
      }
    });
  }

  // market kiosks along the roads (amber lamps)
  for (let i = 0, placed = 0; i < 80 && placed < 8; i++) {
    const r = mainRoads[Math.floor(rng() * mainRoads.length)];
    const s = samplePolyline(r.pts, 15)[Math.floor(rng() * 12)];
    if (!s) continue;
    const sd = rng() < 0.5 ? 1 : -1;
    const off = r.w / 2 + 2.6;
    const x = s.x + -s.tz * sd * off, z = s.z + s.tx * sd * off;
    const ry = Math.atan2(s.tx, s.tz);
    // a kiosk stands on public ground beside the pavement: off every carriageway, out of plots, clear of buildings and the bridge
    const kb = { cx: x, cz: z, hx: 1.45, hz: 1.3, ry };
    const cornersOk = [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]].every(([u, v]) => { const px = x + u * 1.45 * Math.cos(ry) + v * 1.3 * Math.sin(ry), pz = z - u * 1.45 * Math.sin(ry) + v * 1.3 * Math.cos(ry); return !inAnyBuilding(px, pz, 0.6) && !laid.some((l) => pointInPoly(px, pz, l.pts)) && !carriage.some(([a, c, h]) => { const dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1, w = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L2)); return Math.hypot(px - a[0] - dx * w, pz - a[1] - dz * w) < h + 0.3; }); });
    if (Math.hypot(x, z) > R || !cornersOk || kitColliders.some((c) => Math.hypot(c.cx - x, c.cz - z) < Math.max(c.hx, c.hz) + 2)) continue;
    kitColliders.push({ name: 'kiosk', ...kb });
    mb.box(x, 0, z, 2.2, 2.0, 1.9, PAL.kiosk, { grad: 0.3 }, ry);
    mb.box(x, 2.0, z, 2.9, 0.18, 2.6, PAL.teal, { grad: 0, vary: 0 }, ry);
    bulbs.push({ x, y: 1.65, z, s: 0.22 });
    glows.push({ x, z, r: 5 });
    lamps.push({ x, y: 1.9, z, delay: delayFor(x, z), kind: 'kiosk', power: 25 });
    placed++;
  }


  // monuments on the horizon: libraries, earned at 25+ contributors
  const monuments = [];
  MONUMENTS.forEach((mn, i) => {
    const a = (mn.angle * Math.PI) / 180;
    const d = R * 1.95;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const H = mn.height;
    const tiers = [[9, 0.55], [7, 0.3], [5.2, 0.14], [3.6, 0.08]];
    let y = 0;
    tiers.forEach(([w, frac], ti) => {
      const h = H * frac;
      mb.box(x, y, z, w, h, w, ti % 2 ? PAL.monoB : PAL.monoA, { grad: 0.5 });
      mb.box(x, y + h, z, w + 1.2, 1.1, w + 1.2, PAL.tealDark, { grad: 0, vary: 0 });
      y += h + 1.1;
    });
    mb.box(x, y, z, 3.0, 4.0, 3.0, PAL.teal, { grad: 0.2 });
    const topY = y + 4.4;
    bulbs.push({ x, y: y + 2.0, z, s: 1.1 });
    monuments.push({ ...mn, x, z, topY });
  });

  if (lampT && lampSpots.length) {
    scene.add(instanceAsset(lampT, lampSpots));
    kitColliders.push(...collidersFor(lampT, lampSpots));
  }

  const staticMesh = new THREE.Mesh(mb.toGeometry(), wallMaterial());
  scene.add(staticMesh);
  const groundMesh = new THREE.Mesh(gb.toGeometry(), wetGroundMaterial());
  scene.add(groundMesh);

  // --- builder plots ---
  const winMat = makeWindowMaterial(T.env.pane);
  const wins = [];
  const plots = [];
  const plotMat = wallMaterial();

  function addWindowsForPoly(pts, baseY, floors, b, kind) {
    const area = polyArea(pts);
    const P = litProbability(b);
    for (let i = 0; i < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
      const dx = bx - ax, dz = bz - az;
      const len = Math.hypot(dx, dz);
      if (len < 3.2) continue;
      let nx = area > 0 ? dz : -dz, nz = area > 0 ? -dx : dx;
      const nl = Math.hypot(nx, nz) || 1;
      nx /= nl; nz /= nl;
      const ry = Math.atan2(nx, nz);
      const cell = kind === 'shop' ? 3.4 : 2.5;
      const cols = Math.max(1, Math.floor((len - 1.4) / cell));
      const sp = (len - 1.4) / cols;
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
          const t = (0.7 + sp * (c + 0.5)) / len;
          const x = ax + dx * t + nx * 0.08;
          const z = az + dz * t + nz * 0.08;
          const lit = kind === 'shop'
            ? rng() < Math.min(0.92, P * 1.35 + (P > 0 ? 0.1 : 0)) ? 1 : 0
            : rng() < P ? 1 : 0;
          wins.push({
            x, y: baseY + f * FLOOR_H + (kind === 'shop' ? 1.7 : FLOOR_H * 0.52), z, ry,
            w: kind === 'shop' ? 2.3 : 1.25, h: kind === 'shop' ? 1.7 : 1.35,
            lit, pulse: b.live && lit && rng() < 0.4 ? 1 : 0, seed: rng(), delay: delayFor(x, z),
          });
        }
      }
    }
  }

  BUILDERS.forEach((b) => {
    const src = assign.get(b.id);
    if (!src) return;
    const pb = new MeshBuilder();
    const wall = PAL.walls[Math.floor(rng() * PAL.walls.length)];
    const floors = floorsFor(b);
    const c = src.c;
    const pod = 3.2;

    pb.extrude(src.pts, 0, pod, PAL.podium, { grad: 0.5, vary: 0.03 });
    addWindowsForPoly(src.pts, 0, 1, b, 'shop');
    // awning ledge: its top stands 6 cm above the podium roof, or the two shimmer from above
    pb.extrude(scaleAbout(src.pts, c, 1.04), pod - 0.35, 0.41, PAL.tealDark, { grad: 0, vary: 0 });

    const tall = floors >= 9;
    const lowFloors = tall ? Math.ceil(floors * 0.62) : floors;
    const sLow = 0.9;
    const lowPts = scaleAbout(src.pts, c, sLow);
    pb.extrude(lowPts, pod, lowFloors * FLOOR_H, wall, { grad: 0.45, vary: 0.03 });
    addWindowsForPoly(lowPts, pod, lowFloors, b, 'shaft');
    let topY = pod + lowFloors * FLOOR_H;
    let topPts = lowPts;

    if (tall) {
      const upFloors = floors - lowFloors;
      const upPts = scaleAbout(src.pts, c, 0.64);
      pb.extrude(scaleAbout(src.pts, c, 0.96), topY, 0.5, PAL.tealDark, { grad: 0, vary: 0 }); // setback ledge
      pb.extrude(upPts, topY + 0.5, upFloors * FLOOR_H, wall, { grad: 0.4, vary: 0.03 });
      addWindowsForPoly(upPts, topY + 0.5, upFloors, b, 'shaft');
      topY += 0.5 + upFloors * FLOOR_H;
      topPts = upPts;
    }
    // chunky, slightly oversized crown in the district colour
    const crownPts = scaleAbout(topPts, c, 1.09);
    pb.extrude(crownPts, topY, 1.2, PAL.teal, { grad: 0.2, vary: 0.02 });
    pb.extrude(scaleAbout(topPts, c, 0.92), topY + 1.2, 0.5, PAL.capSlab, { grad: 0, vary: 0 });
    topY += 1.7;

    // rooftop: tank on legs, AC boxes, antenna on the tall ones
    const bbx = bbox(topPts);
    const tx = c[0], tz = c[1];
    pb.cyl(tx, topY + 1.0, tz, 1.15, 1.15, 1.7, 8, PAL.tank, { grad: 0.3 });
    [[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]].forEach(([ox, oz]) => pb.box(tx + ox, topY, tz + oz, 0.18, 1.0, 0.18, PAL.metal, { grad: 0 }));
    pb.box(tx + (bbx.x1 - bbx.x0) * 0.22, topY, tz - (bbx.z1 - bbx.z0) * 0.18, 1.8, 1.0, 1.4, PAL.ac, { grad: 0.2 });
    if (floors >= 10) {
      pb.cyl(tx, topY, tz + 0.1, 0.06, 0.1, 7.5, 5, PAL.metal);
      bulbs.push({ x: tx, y: topY + 7.6, z: tz + 0.1, s: 0.26 });
    }

    const mesh = new THREE.Mesh(pb.toGeometry(), plotMat);
    scene.add(mesh);

    mesh.userData.builder = b;
    plots.push({ b, floors, topY, center: new THREE.Vector3(c[0], 0, c[1]), pts: src.pts, bb: src.bb, mesh,
      dist: (x, z) => (pointInPoly(x, z, src.pts) ? 0 : nearestOnPoly(x, z, src.pts).d) });
  });

  // windows: one instanced mesh, one draw call
  {
    const g = new THREE.PlaneGeometry(1, 1);
    const n = wins.length;
    const lit = new Float32Array(n), pulse = new Float32Array(n), seed = new Float32Array(n), delay = new Float32Array(n);
    const mesh = new THREE.InstancedMesh(g, winMat, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    wins.forEach((w, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), w.ry);
      p.set(w.x, w.y, w.z);
      s.set(w.w, w.h, 1);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      lit[i] = w.lit; pulse[i] = w.pulse; seed[i] = w.seed; delay[i] = w.delay;
    });
    g.setAttribute('aLit', new THREE.InstancedBufferAttribute(lit, 1));
    g.setAttribute('aPulse', new THREE.InstancedBufferAttribute(pulse, 1));
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
    g.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delay, 1));
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  // bulbs: HDR amber, the only things besides windows that bloom
  let bulbMat;
  {
    const g = new THREE.IcosahedronGeometry(1, 0);
    const mat = bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(...T.env.bulb) });
    const mesh = new THREE.InstancedMesh(g, mat, bulbs.length);
    const m = new THREE.Matrix4();
    bulbs.forEach((b, i) => { m.makeScale(b.s, b.s, b.s).setPosition(b.x, b.y, b.z); mesh.setMatrixAt(i, m); });
    mesh.frustumCulled = false;
    scene.add(mesh);
  }
  // pools of lamp light on the ground
  {
    const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const mesh = new THREE.InstancedMesh(g, makeGlowMaterial(), glows.length);
    const m = new THREE.Matrix4();
    const delay = new Float32Array(glows.length);
    glows.forEach((gl, i) => {
      m.makeScale(gl.r * 2, 1, gl.r * 2).setPosition(gl.x, 0.11, gl.z);
      mesh.setMatrixAt(i, m);
      delay[i] = delayFor(gl.x, gl.z);
    });
    g.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delay, 1));
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    scene.add(mesh);
  }
  // monument beams (angle vs time lives in the shader)
  monuments.forEach((mn, i) => {
    const radius = R * 2.6;
    const g = new THREE.ConeGeometry(radius, 6, 64, 1, true);
    const mesh = new THREE.Mesh(g, makeBeamMaterial(radius));
    mesh.material.uniforms.uPhase.value = i * 2.4;
    mesh.position.set(mn.x, mn.topY - 1.0, mn.z);
    mesh.renderOrder = 3;
    scene.add(mesh);
  });

  // --- collision: circle vs real footprints ---
  const solid = blds.filter((b) => b.pts.length >= 3).map((b) => ({ pts: b.pts, bb: b.bb, top: b.top ?? 10 }));
  const lots = blds.filter((b) => b.lot && b.lot.length >= 3).map((b) => ({ pts: b.lot, bb: b.lotBB || (b.lotBB = bbox(b.lot)) }));
  // a uniform grid over every collider, so a fence on every estate costs nothing per frame (world bible 7.5)
  const CELL = 8;
  const grid = new Map();
  const cellsOf = (x0, z0, x1, z1, fn) => { for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) fn(`${i},${j}`); };
  const index = (item, x0, z0, x1, z1) => cellsOf(x0, z0, x1, z1, (k) => { let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(item); });
  solid.forEach((sd) => { sd.kind = 'poly'; index(sd, sd.bb.x0, sd.bb.z0, sd.bb.x1, sd.bb.z1); });
  const indexBox = (c) => { c.kind = 'box'; const r = Math.hypot(c.hx, c.hz); index(c, c.cx - r, c.cz - r, c.cx + r, c.cz + r); };
  kitColliders.forEach(indexBox);
  let stamp = 0;
  const near = (x, z, r, fn) => {
    stamp++;
    cellsOf(x - r, z - r, x + r, z + r, (k) => { const a = grid.get(k); if (a) for (const it of a) if (it._s !== stamp) { it._s = stamp; fn(it); } });
  };
  // push a circle (radius rad, feet at height y) out of everything it overlaps; colliders lower than the
  // feet are cleared, so a jump carries you over a picket fence but never through a wall
  function resolve(pos, rad = 0.8, y = 0) {
    near(pos.x, pos.z, rad + 1, (s) => {
      if (s.kind === 'poly') {
        if (pos.x < s.bb.x0 - rad || pos.x > s.bb.x1 + rad || pos.z < s.bb.z0 - rad || pos.z > s.bb.z1 + rad) return;
        const inside = pointInPoly(pos.x, pos.z, s.pts);
        const n = nearestOnPoly(pos.x, pos.z, s.pts);
        if (inside) {
          const dx = n.px - pos.x, dz = n.pz - pos.z, l = Math.hypot(dx, dz) || 1;
          pos.x = n.px + (dx / l) * rad; pos.z = n.pz + (dz / l) * rad;
        } else if (n.d < rad) {
          const dx = pos.x - n.px, dz = pos.z - n.pz, l = Math.hypot(dx, dz) || 1;
          pos.x = n.px + (dx / l) * rad; pos.z = n.pz + (dz / l) * rad;
        }
        return;
      }
      if (s.h !== undefined && y + 0.25 > s.h) return; // tucked knees lift the feet about 25 cm
      if (s.y1 !== undefined && (y > s.y1 - 0.3 || y + 1.7 < s.y0)) return; // above it, or walking underneath
      if (s.step && s.y1 <= y + 0.55) return; // a step you can step up onto
      pushOutBox(pos, rad, s);
    });
    const rr = Math.hypot(pos.x, pos.z);
    const maxR = R * 1.05;
    if (rr > maxR) { pos.x *= maxR / rr; pos.z *= maxR / rr; }
  }

  let nav = null;
  const navGrid = () => (nav ??= buildNavGrid({ R, solids: solid, boxes: kitColliders, roads, lots, pointInPoly, nearestOnPoly, private: estatePlan.flatMap((E) => E.closes) }));

  // free for a prop: outside every footprint and off the carriageway
  function isFree(x, z, pad = 0.6, { lots: onLots = false } = {}) {
    let hit = false;
    near(x, z, pad + 1, (s) => {
      if (hit) return;
      if (s.kind === 'box') { if (Math.hypot(x - s.cx, z - s.cz) < Math.max(s.hx, s.hz) + pad) hit = true; return; }
      if (x < s.bb.x0 - pad || x > s.bb.x1 + pad || z < s.bb.z0 - pad || z > s.bb.z1 + pad) return;
      if (pointInPoly(x, z, s.pts) || nearestOnPoly(x, z, s.pts).d < pad) hit = true;
    });
    if (hit) return false;
    if (!onLots) for (const l of lots) if (x > l.bb.x0 - pad && x < l.bb.x1 + pad && z > l.bb.z0 - pad && z < l.bb.z1 + pad && (pointInPoly(x, z, l.pts) || nearestOnPoly(x, z, l.pts).d < pad)) return false;
    // keep carriageways and pavements clear: pavements are for walking (world bible 4.3)
    for (const r of mainRoads) {
      const P = r.fit ? r.fit.pts : r.pts;
      for (let i = 0; i < P.length - 1; i++) {
        const [ax, az] = P[i], [bx, bz] = P[i + 1];
        const dx = bx - ax, dz = bz - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
        const k = t < 0.5 ? i : i + 1;
        const clear = r.fit ? r.fit.half[k] + Math.max(r.fit.paveL[k], r.fit.paveR[k]) + 0.3 : r.w / 2 + 0.4;
        if (Math.hypot(x - (ax + dx * t), z - (az + dz * t)) < clear) return false;
      }
    }
    return Math.hypot(x, z) < R * 1.05;
  }

  // is a world-space point inside a building volume? (camera collision)
  // what the camera must not pass through: big props and overhead things (not fences, poles or steps)
  const camBoxes = [];
  const camRefresh = () => { camBoxes.length = 0; [...kitColliders, ...claims.filter((c) => c.y1 !== undefined)].forEach((c) => { // a claim is land set aside, not a wall: only one with a height band (a billboard face) blocks the camera
    if (/fence|pole|lamp|bollard|rail|step|sign|post|tree|palm|drain/i.test(c.name || c.kind || '') || Math.max(c.hx, c.hz) < 0.6) return; camBoxes.push(c); }); };
  function solidAt(x, y, z) {
    if (camBoxes.dirty !== false) { camRefresh(); camBoxes.dirty = false; }
    for (const s of solid) {
      if (y > s.top || y < 0 || x < s.bb.x0 || x > s.bb.x1 || z < s.bb.z0 || z > s.bb.z1) continue;
      if (pointInPoly(x, z, s.pts)) return true;
    }
    // props and things overhead (a billboard face, the bridge deck) block the camera too
    for (const c of camBoxes) {
      if (y < (c.y0 ?? 0) || y > (c.y1 ?? (c.h ?? 2.5))) continue;
      const dx = x - c.cx, dz = z - c.cz, cs = Math.cos(c.ry || 0), sn = Math.sin(c.ry || 0), lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      if (Math.abs(lx) < c.hx + 0.15 && Math.abs(lz) < c.hz + 0.15) return true;
    }
    return false;
  }

  return {
    scene, plots, monuments, spawn, resolve, solidAt, radius: R, via,
    counts: { buildings: manifest.buildings.length, roads: manifest.roads.length, windows: wins.length },
    spawnYaw: front0.yaw,
    frontOf, env: T.env, theme, pick: groundMesh, solids: staticMesh, ground: groundMesh,
    lamps, trees, isFree, youCenter: you.c, mainRoad: longest, roads,
    rig: { hemi, moon, rim, bulbMat, bulb: T.env.bulb },
    center: manifest.center,
    footprints: blds.filter((b) => b.pts.length >= 3).map((b) => b.pts), lots: blds.filter((b) => b.lot).map((b) => b.lot), doorPlants,
    estates: estatePlan.map((E) => ({ name: E.name, corners: E.corners, ry: E.ry, gates: E.gates, closes: E.closes, n: E.n })), addresses, carSpots,
    // flat roofs of unclaimed buildings, for rooftop water tanks
    roofs: blds.filter((b) => !plotIds.has(b) && b.top && b.pts.length >= 3).map((b) => ({ x: b.c[0], z: b.c[1], y: b.top, area: b.area, pts: b.pts })),
    blockedAt: (x, z, r = 0.35) => { const v = { x, z }; resolve(v, r); return Math.hypot(v.x - x, v.z - z) > 0.01; },
    // footprints of things that have no collider (a billboard face, a bridge deck, drains), for the layout audit
    claims, claim: (c) => { claims.push(c); camBoxes.dirty = true; }, bridge: world_bridge, crossings, junctionAt, porchLamps,
    // the ground under someone's feet: steps, landings and decks they can reach (a 0.55 m step up at most)
    groundAt: (x, z, feet = 0) => {
      let g = 0;
      for (const w of walkables) {
        if (w.top > feet + 0.55 || w.top <= g) continue;
        const dx = x - w.cx, dz = z - w.cz, cs = Math.cos(w.ry), sn = Math.sin(w.ry), lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
        if (Math.abs(lx) <= w.hx + 0.05 && Math.abs(lz) <= w.hz + 0.05) g = w.top;
      }
      return g;
    },
    // land use, for anything placed after the world is built (estate-layout skill)
    onCarriageway: (x, z, pad = 0) => carriage.some(([a, c, h]) => { const dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - a[0] - dx * u, z - a[1] - dz * u) < h + pad; }),
    inPlot: (x, z, pad = 0) => laid.some((l) => x > l.bb.x0 - pad && x < l.bb.x1 + pad && z > l.bb.z0 - pad && z < l.bb.z1 + pad && (pointInPoly(x, z, l.pts) || (pad > 0 && nearestOnPoly(x, z, l.pts).d < pad))),
    kit, kitColliders, addColliders: (list) => { list.forEach((c) => { kitColliders.push(c); indexBox(c); }); nav = null; camBoxes.dirty = true; },
    // walkable paths around everything solid, by the movement rules (navgrid.js); built on first use
    plan: (a, b, opt) => navGrid().plan(a, b, opt),
    costAt: (x, z) => navGrid().costAt(x, z),
    navReach: (a) => navGrid().reach(a),
    // is this spot connected to the streets, and where is the nearest spot that is (navgrid.js)
    reachable: (x, z) => { const g = navGrid(); g.setMain(spawn); return g.reachable(x, z); },
    nearestReachable: (x, z) => { const g = navGrid(); g.setMain(spawn); return g.nearestReachable(x, z); },
    // once everything is built: how much ground nobody can walk to from the streets (the layout audit reads this)
    pocketReport: () => {
      const g = navGrid(); g.setMain(spawn);
      const boxes = g.pockets(); // reported, not walled off: at this size most are walk-map rounding, not traps
      return { islands: boxes.islands || 0, cells: boxes.cells || 0, big: boxes.big || 0, largest: boxes.largest || 0, at: boxes.at || [] };
    },
    source: manifest.source,
  };
}

// ---------- sky ----------
export function buildSky(theme = 'night') {
  const E = (THEMES[theme] || THEMES.night).env;
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(900, 32, 16);
  const pos = geo.attributes.position;
  const cols = [];
  const top = new THREE.Color(E.sky.top), mid = new THREE.Color(E.sky.mid), hor = new THREE.Color(E.sky.hor);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, pos.getY(i) / 900);
    const c = hor.clone().lerp(mid, Math.min(1, t * 2.2)).lerp(top, Math.max(0, t * 1.6 - 0.35));
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));

  if (E.stars) {
    const r = mulberry32(99);
    const sp = [];
    for (let i = 0; i < 420; i++) {
      const a = r() * Math.PI * 2, e = 0.12 + r() * 1.3;
      const d = 850;
      sp.push(Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d, Math.sin(a) * Math.cos(e) * d);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    g.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x6f86bd, size: 1.6, sizeAttenuation: false, fog: false, depthWrite: false })));
  }
  return g;
}
