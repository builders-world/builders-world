import * as THREE from 'three';
import { MeshBuilder, mulberry32 } from './mesh.js';
import { BUILDERS, MONUMENTS, FLOOR_H, floorsFor, litProbability } from './builders.js';
import { makeWindowMaterial, makeGlowMaterial, makeBeamMaterial } from './shaders.js';
import { wetGroundMaterial, wallMaterial } from './look/surfaces.js';
import { instanceAsset, collidersFor, anchorAt } from './look/kit.js';
import { makeClearance, fitStreets, band, streetFurniture, isFootway } from './look/streets.js';
import { dressEstate } from './look/houses.js';

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
  roads.forEach((r) => {
    // ground layers sit at least 3 cm apart, or the depth buffer cannot tell them apart at distance
    if (isFootway(r) || !r.fit) { ribbon(pathTris, r.pts, Math.min(r.w, 3), 0.06); return; }
    const { pts, nrm, half, paveL, paveR } = r.fit;
    const neg = half.map((h) => -h);
    band(roadTris, pts, nrm, neg, half, 0.14, pushTri);
    band(kerbTris, pts, nrm, half, half.map((h, i) => h + paveL[i]), 0.11, pushTri);
    band(kerbTris, pts, nrm, half.map((h, i) => -h - paveR[i]), neg, 0.11, pushTri);
    if (['primary', 'secondary', 'trunk', 'motorway'].includes(r.cls)) dashes(paintTris, pts, 0.17);
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
  const lotTrees = [], doorPlants = [];
  blds.forEach((b) => {
    if (plotIds.has(b)) return;
    const lv = b.levels ?? (b.h ? b.h / 3 : 1 + Math.floor(rng() * 2));
    const wall = PAL.walls[Math.floor(rng() * PAL.walls.length)];
    const est = dressEstate(mb, b.pts, b.c, lv, { wall, rng, front: toStreet, detail: Math.hypot(b.c[0], b.c[1]) < R * 0.6 ? 1 : 0 });
    b.lot = b.pts;
    if (!est) { b.pts = []; b.top = 0; return; }
    b.pts = est.pts; b.bb = bbox(est.pts); b.top = est.top;
    if (est.tree) lotTrees.push(est.tree);
    if (est.door) doorPlants.push({ x: est.door.x, z: est.door.z });
  });

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
  const kitColliders = [];
  const trees = [];
  const glows = []; // {x,z,r}
  // lots count as built: nothing from the street is planted on someone's lawn
  const inAnyBuilding = (x, z) => blds.some((b) => { const P = b.lot || b.pts; const bb = b.lot ? b.lotBB || (b.lotBB = bbox(b.lot)) : b.bb; return P.length >= 3 && x > bb.x0 - 1 && x < bb.x1 + 1 && z > bb.z0 - 1 && z < bb.z1 + 1 && pointInPoly(x, z, P); });

  // street lamps on every street, trees only where pavements allow (world bible 4.3)
  const furniture = streetFurniture(roads, { inBuilding: inAnyBuilding, inside: (x, z) => Math.hypot(x, z) < R * 1.08 });
  furniture.lamps.forEach((l) => {
    const { x, z, nx, nz } = l;
    if (lampT) {
      // the kit's street lamp on the pavement, arm over the road
      const spot = { x, z, ry: Math.atan2(nz, -nx) };
      lampSpots.push(spot);
      const g = anchorAt(lampT, 'lamp_glow', spot);
      bulbs.push({ x: g.x, y: g.y - 0.06, z: g.z, s: 0.14 });
      glows.push({ x: g.x - nx * 1.0, z: g.z - nz * 1.0, r: 6.5 });
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


    // pedestrian footbridge over the main road
    const mids = samplePolyline(longest.pts, 1);
    const m = mids[Math.floor(mids.length * 0.45)] || mids[0];
    if (m) {
      const nxv = -m.tz, nzv = m.tx;
      const half = longest.w / 2 + 5.2;
      const ry = Math.atan2(nxv, nzv);
      mb.box(m.x, 5.2, m.z, 2.6, 0.35, half * 2, PAL.wire, { grad: 0.1 }, ry);
      mb.box(m.x, 5.55, m.z, 0.14, 1.0, half * 2, PAL.teal, { grad: 0 }, ry + 0);
      [-1, 1].forEach((sgn) => {
        const ex = m.x + nxv * half * sgn, ez = m.z + nzv * half * sgn;
        mb.box(ex, 0, ez, 3.4, 5.2, 3.4, PAL.tower, { grad: 0.3 }, ry);
        mb.box(ex, 5.2, ez, 3.8, 0.5, 3.8, PAL.tealDark, { grad: 0 }, ry);
      });
      for (let q = -half + 2; q < half - 1.5; q += 2.6) {
        bulbs.push({ x: m.x + nxv * q, y: 6.35, z: m.z + nzv * q, s: 0.17 });
      }
    }
  }

  // market kiosks along the roads (amber lamps)
  for (let i = 0, placed = 0; i < 80 && placed < 8; i++) {
    const r = mainRoads[Math.floor(rng() * mainRoads.length)];
    const s = samplePolyline(r.pts, 15)[Math.floor(rng() * 12)];
    if (!s) continue;
    const sd = rng() < 0.5 ? 1 : -1;
    const off = r.w / 2 + 2.6;
    const x = s.x + -s.tz * sd * off, z = s.z + s.tx * sd * off;
    if (Math.hypot(x, z) > R || inAnyBuilding(x, z) || inAnyBuilding(x + 2, z) || inAnyBuilding(x - 2, z)) continue;
    const ry = Math.atan2(s.tx, s.tz);
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
    pb.extrude(scaleAbout(src.pts, c, 1.04), pod - 0.35, 0.35, PAL.tealDark, { grad: 0, vary: 0 }); // awning ledge

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
  function resolve(pos, rad = 0.8) {
    for (const s of solid) {
      if (pos.x < s.bb.x0 - rad || pos.x > s.bb.x1 + rad || pos.z < s.bb.z0 - rad || pos.z > s.bb.z1 + rad) continue;
      const inside = pointInPoly(pos.x, pos.z, s.pts);
      const n = nearestOnPoly(pos.x, pos.z, s.pts);
      if (inside) {
        const dx = n.px - pos.x, dz = n.pz - pos.z;
        const l = Math.hypot(dx, dz) || 1;
        pos.x = n.px + (dx / l) * rad;
        pos.z = n.pz + (dz / l) * rad;
      } else if (n.d < rad) {
        const dx = pos.x - n.px, dz = pos.z - n.pz;
        const l = Math.hypot(dx, dz) || 1;
        pos.x = n.px + (dx / l) * rad;
        pos.z = n.pz + (dz / l) * rad;
      }
    }
    // kit collision proxies: boxes on the ground, turned
    for (const c of kitColliders) {
      const dx = pos.x - c.cx, dz = pos.z - c.cz;
      const cs = Math.cos(c.ry), sn = Math.sin(c.ry);
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      const ex = c.hx + rad, ez = c.hz + rad;
      if (Math.abs(lx) >= ex || Math.abs(lz) >= ez) continue;
      let nx2 = lx, nz2 = lz;
      if (ex - Math.abs(lx) < ez - Math.abs(lz)) nx2 = Math.sign(lx || 1) * ex; else nz2 = Math.sign(lz || 1) * ez;
      pos.x = c.cx + nx2 * cs + nz2 * sn;
      pos.z = c.cz - nx2 * sn + nz2 * cs;
    }
    const rr = Math.hypot(pos.x, pos.z);
    const maxR = R * 1.05;
    if (rr > maxR) { pos.x *= maxR / rr; pos.z *= maxR / rr; }
  }

  // free for a prop: outside every footprint and off the carriageway
  function isFree(x, z, pad = 0.6) {
    for (const c of kitColliders) if (Math.hypot(x - c.cx, z - c.cz) < Math.max(c.hx, c.hz) + pad) return false;
    for (const s of solid) {
      if (x < s.bb.x0 - pad || x > s.bb.x1 + pad || z < s.bb.z0 - pad || z > s.bb.z1 + pad) continue;
      if (pointInPoly(x, z, s.pts) || nearestOnPoly(x, z, s.pts).d < pad) return false;
    }
    for (const l of lots) if (x > l.bb.x0 - pad && x < l.bb.x1 + pad && z > l.bb.z0 - pad && z < l.bb.z1 + pad && (pointInPoly(x, z, l.pts) || nearestOnPoly(x, z, l.pts).d < pad)) return false;
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
  function solidAt(x, y, z) {
    for (const s of solid) {
      if (y > s.top || y < 0 || x < s.bb.x0 || x > s.bb.x1 || z < s.bb.z0 || z > s.bb.z1) continue;
      if (pointInPoly(x, z, s.pts)) return true;
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
    // flat roofs of unclaimed buildings, for rooftop water tanks
    roofs: blds.filter((b) => !plotIds.has(b) && b.top && b.pts.length >= 3).map((b) => ({ x: b.c[0], z: b.c[1], y: b.top, area: b.area, pts: b.pts })),
    kit, kitColliders, addColliders: (list) => kitColliders.push(...list),
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
