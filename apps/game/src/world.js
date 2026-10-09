import * as THREE from 'three';
import { MeshBuilder, mulberry32 } from './mesh.js';
import { BUILDERS, MONUMENTS, FLOOR_H, floorsFor, litProbability } from './builders.js';
import { makeWindowMaterial, makeGlowMaterial, makeBeamMaterial } from './shaders.js';
import { wetGroundMaterial, wallMaterial } from './look/surfaces.js';

const NIGHT = {
  // weathered Lagos plaster: light enough to read in daylight, the lighting makes it night
  walls: ['#a7a9b0', '#b5aa9c', '#8fa9a6', '#c2a487', '#9ea7bd', '#b89a8e', '#c9c0a8'],
  dark: ['#8d8e93', '#9a9285', '#7f8c91', '#a08f80', '#8a929c'],
  teal: '#2a9d94', tealDark: '#1b6e69',
  road: '#4a4e57', kerb: '#9a9ca0', path: '#8a8c90', paint: '#e2e4e8', ground: '#5a5a54',
  foliage: ['#2f5a3a', '#2a5236', '#36633f'], trunk: '#4a3f35', metal: '#5a6070', slate: '#5c6270',
  podium: '#6a6560', capSlab: '#64676c', tank: '#7c8088', ac: '#8a8f96', far: '#6a7280', roofCap: '#6b6a66',
  wire: '#30343c', tower: '#7a8090', kiosk: '#6e6a64', board: '#4a4f5a', monoA: '#7d8696', monoB: '#8a93a2',
  cabin: '#6a7488', wheel: '#15171c',
  env: {
    day: 0, bg: '#1b2748', fog: '#24305a', fogNear: 0.08, fogFar: 1.9, exposure: 1.05, tone: 'aces',
    bloom: { on: true, strength: 0.55, radius: 0.55, threshold: 0.85 },
    hemi: { sky: 0x4a64b8, ground: 0x1a1612, i: 0.75 },
    key: { color: 0x8ea6ff, i: 0.55 }, rim: { color: 0x3a6aa0, i: 0.3 },
    wet: 1, rain: 1, lights: 1,
    pane: '#1c2744', bulb: [1.5, 0.86, 0.22],
    sky: { top: '#03050d', mid: '#0a1226', hor: '#13203e' }, stars: true,
  },
};

// Daylight: same chunky silhouettes, white and pale blue-grey, the same amber accent.
const DAY = {
  walls: ['#c3cde3', '#ccd5e8', '#b9c5de', '#d3dbed', '#c0cae1'],
  dark: ['#d9dfeb', '#dfe4ef', '#d1d8e7', '#e4e9f3'],
  teal: '#2a9d94', tealDark: '#1f8077',
  road: '#b9c2d5', kerb: '#f1f4f9', path: '#f4f6fa', paint: '#ffffff', ground: '#e8ecf4',
  foliage: ['#9ccfc4', '#8fc6bb', '#a6d6cb'], trunk: '#aab2c4', metal: '#9aa5bd', slate: '#8d9ab6',
  podium: '#b3bfd8', capSlab: '#cfd7e8', tank: '#b4bfd6', ac: '#b9c3d9', far: '#d6dcea', roofCap: '#cfd6e6',
  wire: '#9aa5bd', tower: '#bcc6dc', kiosk: '#c8d0e3', board: '#cdd5e7', monoA: '#c1cbe0', monoB: '#b6c1d9',
  cabin: '#a2aec8', wheel: '#4a546b',
  env: {
    day: 1, bg: '#eaf0f9', fog: '#eaf0f9', fogNear: 1.1, fogFar: 5.2, exposure: 1.0, tone: 'none',
    bloom: { on: false, strength: 0, radius: 0.4, threshold: 1 },
    hemi: { sky: 0xffffff, ground: 0xdde3f0, i: 0.98 },
    wet: 0, rain: 0, lights: 0,
    key: { color: 0xffffff, i: 1.1 }, rim: { color: 0xdfe8ff, i: 0.25 },
    pane: '#a9b9da', bulb: [0.9, 0.52, 0.1],
    sky: { top: '#c5d5f0', mid: '#dbe5f6', hor: '#f3f6fc' }, stars: false,
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
export function buildWorld(manifest, via, theme = 'night') {
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

  // roads: kerb band, tarmac, paint
  const kerbTris = [], roadTris = [], pathTris = [], paintTris = [];
  roads.forEach((r) => {
    if (['footway', 'path', 'cycleway', 'pedestrian'].includes(r.cls)) ribbon(pathTris, r.pts, r.w, 0.05);
    else {
      ribbon(kerbTris, r.pts, r.w + 4.2, 0.03);
      ribbon(roadTris, r.pts, r.w, 0.07);
      if (['primary', 'secondary', 'trunk'].includes(r.cls)) dashes(paintTris, r.pts, 0.085);
    }
  });
  if (kerbTris.length) gb.raw(kerbTris, PAL.kerb);
  if (pathTris.length) gb.raw(pathTris, PAL.path);
  if (roadTris.length) gb.raw(roadTris, PAL.road);
  if (paintTris.length) gb.raw(paintTris, PAL.paint);

  // unclaimed buildings: low, dark, no lit windows
  blds.forEach((b) => {
    if (plotIds.has(b)) return;
    const lv = b.levels ?? (b.h ? b.h / 3 : 1 + Math.floor(rng() * 3));
    const h = Math.max(3.2, Math.min(15, b.h ?? lv * 3));
    const col = PAL.dark[Math.floor(rng() * PAL.dark.length)];
    mb.extrude(b.pts, 0, h, col, { grad: 0.4, vary: 0.04 });
    mb.extrude(scaleAbout(b.pts, b.c, 1.03), h, 0.45, PAL.roofCap, { grad: 0, vary: 0.02 });
    b.top = h + 0.45;
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
  const trees = [];
  const glows = []; // {x,z,r}
  const inAnyBuilding = (x, z) => blds.some((b) => x > b.bb.x0 - 1 && x < b.bb.x1 + 1 && z > b.bb.z0 - 1 && z < b.bb.z1 + 1 && pointInPoly(x, z, b.pts));

  // street lamps, trees
  mainRoads.forEach((r, ri) => {
    const lit = ['primary', 'secondary', 'tertiary', 'trunk'].includes(r.cls);
    const step = lit ? 26 : 22;
    samplePolyline(r.pts, step).forEach((s, i) => {
      const side = (i + ri) % 2 ? 1 : -1;
      const off = r.w / 2 + 1.5;
      const nx = -s.tz * side, nz = s.tx * side;
      const x = s.x + nx * off, z = s.z + nz * off;
      if (Math.hypot(x, z) > R * 1.08 || inAnyBuilding(x, z)) return;
      if (lit) {
        mb.cyl(x, 0.2, z, 0.1, 0.14, 7.2, 6, PAL.metal, { grad: 0.2 });
        const bx = x - nx * 1.5, bz = z - nz * 1.5;
        mb.box((x + bx) / 2, 7.0, (z + bz) / 2, 0.14, 0.14, 1.6, PAL.metal, { grad: 0 }, Math.atan2(nx, nz));
        bulbs.push({ x: bx, y: 6.95, z: bz, s: 0.3 });
        glows.push({ x: bx - nx * 1.6, z: bz - nz * 1.6, r: 7 });
        lamps.push({ x: bx, y: 6.95, z: bz, delay: delayFor(bx, bz), kind: 'street' });
      } else if (i % 2 === 0) {
        const tx = s.x + (-s.tz * -side) * (r.w / 2 + 3.4), tz = s.z + s.tx * -side * (r.w / 2 + 3.4);
        if (Math.hypot(tx, tz) < R * 1.05 && !inAnyBuilding(tx, tz)) trees.push({ x: tx, z: tz });
      }
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
    pole.forEach((p, i) => {
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
          const x = ax + dx * t + nx * 0.05;
          const z = az + dz * t + nz * 0.05;
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
  const solid = blds.map((b) => ({ pts: b.pts, bb: b.bb, top: b.top ?? 10 }));
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
    const rr = Math.hypot(pos.x, pos.z);
    const maxR = R * 1.05;
    if (rr > maxR) { pos.x *= maxR / rr; pos.z *= maxR / rr; }
  }

  // free for a prop: outside every footprint and off the carriageway
  function isFree(x, z, pad = 0.6) {
    for (const s of solid) {
      if (x < s.bb.x0 - pad || x > s.bb.x1 + pad || z < s.bb.z0 - pad || z > s.bb.z1 + pad) continue;
      if (pointInPoly(x, z, s.pts) || nearestOnPoly(x, z, s.pts).d < pad) return false;
    }
    for (const r of mainRoads) {
      for (let i = 0; i < r.pts.length - 1; i++) {
        const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
        const dx = bx - ax, dz = bz - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
        if (Math.hypot(x - (ax + dx * t), z - (az + dz * t)) < r.w / 2 + 0.4) return false;
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
