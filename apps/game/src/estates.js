// Estate planning (world bible 7.5b, estate-layout skill): the houses of the district are laid out as
// walled estates on a grid, not one house per map footprint (Elvis, 9 October 2026: "it just looks
// disjointed"). The roads stay real; along every straight stretch of road, on both sides, the planner
// fits the largest estate it can:
//
//   main road
//   ======================================================
//   |  wall   [gate 1]        wall        [gate 2]  wall |
//   |  1A |  close  | 1B  ||  1A |  close  | 1B          |
//   |  2A |         | 2B  ||  2A |         | 2B          |
//   |  3A |         | 3B  ||  3A |         | 3B          |
//   |_____________________________________________________|
//
// Each gate opens onto a close, with identical lots on both sides facing it: 16 m of frontage, 22 m
// deep, a house set back 6 m with a garage and driveway beside it. Numbers count up from the gate:
// 1A, 2A, 3A on the left as you walk in, 1B, 2B, 3B on the right. An address is "3B, Gate 2, Onike Court".

export const LOT_W = 16, LOT_D = 22, CLOSE_W = 7, FRONT_STRIP = 4, BACK_STRIP = 5, WALL_T = 0.25;
export const GATE_W = 2 * LOT_D + CLOSE_W; // one gate's block, measured along the main road
export const SINGLE_W = LOT_D + CLOSE_W; // a single-sided close, for narrower land

let NAMES;
const LAGOS_NAMES = ['Onike Court', 'Alagomeji Gardens', 'Sabo Estate', 'Iwaya Gardens', 'Akoka Residences', 'Jibowu Court', 'Adekunle Mews', 'Abule-Ijesha Close',
  'Makoko View', 'Oyingbo Court', 'Ebute Metta Gardens', 'Herbert Macaulay Mews', 'Tejuosho Court', 'Ojuelegba Gardens', 'Fadeyi Estate', 'Igbobi Close',
  'Unilag Staff Gardens', 'Montgomery Court', 'Hughes Gardens', 'Alhaji Masha Estate', 'Commercial Avenue Court', 'Queen Street Gardens', 'Murtala Mews', 'Sabo Gardens'];

NAMES = LAGOS_NAMES;
/** Estates are named after the city's own streets and places (cityinfo.js); Lagos names stay in Lagos. */
export function setEstateNames(list) { NAMES = list?.length ? list : LAGOS_NAMES; }

const MAJOR = { trunk: 0, primary: 1, secondary: 2, tertiary: 3, residential: 4, unclassified: 5, service: 6, living_street: 6 };

/**
 * roads: [{ cls, name, fit: { pts, half, paveL, paveR } }]
 * free(x, z): true where an estate may stand (not road reserve, not a builder's plot, not the bridge)
 * R: district radius. rng: seeded random.
 * Returns [{ name, corners, u, v, origin, W, D, gates: [{ no, x, z, ry, close }], walls: [{ cx, cz, hx, hz, ry }], lots: [...] }]
 */
export function planEstates({ roads, free: freeExact, R, rng }) {
  const estates = [];
  // free land on a 2 m raster, worked out once, so testing a site is a lookup
  const CELL = 2, N = Math.ceil((2 * R) / CELL) + 1, raw = new Uint8Array(N * N), mask = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = -R + i * CELL, z = -R + j * CELL; raw[j * N + i] = Math.hypot(x, z) < R * 0.96 && freeExact(x, z) ? 1 : 0; }
  mask.set(raw); // the reserve already carries a margin; the estate stands a further 1.6 m back
  const free = (x, z) => { const i = Math.round((x + R) / CELL), j = Math.round((z + R) / CELL); return i >= 0 && j >= 0 && i < N && j < N && mask[j * N + i] === 1; };
  const placed = []; // rectangles already taken: { o, u, v, W, D }
  const overlaps = (a, b) => {
    // separating axis test between two rectangles given as origin + unit axes + extents
    const corners = (r) => [[0, 0], [r.W, 0], [r.W, r.D], [0, r.D]].map(([s, t]) => [r.o[0] + r.u[0] * s + r.v[0] * t, r.o[1] + r.u[1] * s + r.v[1] * t]);
    const A = corners(a), B = corners(b);
    for (const ax of [a.u, a.v, b.u, b.v]) {
      const pa = A.map(([x, z]) => x * ax[0] + z * ax[1]), pb = B.map(([x, z]) => x * ax[0] + z * ax[1]);
      if (Math.max(...pa) + 2 < Math.min(...pb) || Math.max(...pb) + 2 < Math.min(...pa)) return false; // 2 m between estates: a public path
    }
    return true;
  };

  // straight runs of road: consecutive segments turning less than 12 degrees
  const runs = [];
  roads.filter((r) => r.fit && r.fit.pts.length >= 2 && !['footway', 'path', 'cycleway', 'pedestrian', 'steps'].includes(r.cls)).forEach((r) => {
    const { pts, half, paveL, paveR } = r.fit;
    let start = 0;
    for (let i = 1; i <= pts.length - 1; i++) {
      const end = i === pts.length - 1;
      let turn = 0;
      if (!end) {
        const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), b = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
        turn = Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
      }
      if (end || turn > 0.21) {
        const A = pts[start], B = pts[i], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
        if (L > 30) {
          const reach = Math.max(...half.slice(start, i + 1)) + Math.max(...paveL.slice(start, i + 1), ...paveR.slice(start, i + 1));
          runs.push({ A, B, L, reach, rank: MAJOR[r.cls] ?? 6, name: r.name });
        }
        start = i;
      }
    }
  });
  runs.sort((a, b) => a.rank - b.rank || b.L - a.L);

  // does the rectangle fit: every point of it (on a 2 m grid, and its edges) is free land
  const fits = (rect) => {
    for (let s = 0; s <= rect.W + 0.01; s += 2) for (let t = 0; t <= rect.D + 0.01; t += 2) {
      const x = rect.o[0] + rect.u[0] * s + rect.v[0] * t, z = rect.o[1] + rect.u[1] * s + rect.v[1] * t;
      if (!free(x, z)) return false;
    }
    return !placed.some((p) => overlaps(p, rect));
  };

  let nameAt = Math.floor(rng() * NAMES.length);
  for (const run of runs) {
    const tx = (run.B[0] - run.A[0]) / run.L, tz = (run.B[1] - run.A[1]) / run.L;
    for (const side of [1, -1]) {
      const nx = -tz * side, nz = tx * side; // away from the road
      // u runs along the road; keep the estate's u axis and v axis right-handed whichever side it is on
      const u = side > 0 ? [tx, tz] : [-tx, -tz];
      const off = run.reach + 1.6;
      let t = 2;
      while (t < run.L - 20) {
        let done = null;
        for (const [gates, single] of [[2, false], [2, true], [1, false], [1, true]]) {
          for (const n of [6, 5, 4, 3, 2]) {
            const W = gates * (single ? SINGLE_W : GATE_W), D = FRONT_STRIP + n * LOT_W + BACK_STRIP;
            if (t + W > run.L - 1) continue;
            // origin: the corner on the road side; with u flipped on the far side, start from the far end of this stretch
            const s0 = side > 0 ? t : t + W;
            const o = [run.A[0] + tx * s0 + nx * off, run.A[1] + tz * s0 + nz * off];
            const rect = { o, u, v: [nx, nz], W, D };
            if (fits(rect)) { done = { rect, gates, n, single }; break; }
          }
          if (done) break;
        }
        if (!done) { t += 4; continue; }
        placed.push(done.rect);
        estates.push(layOut(done.rect, done.gates, done.n, NAMES[nameAt++ % NAMES.length], done.single));
        t += done.rect.W + 3;
      }
    }
  }
  // second pass: open land the straight roads did not reach. Sweep a grid; at each point line an
  // estate up with the nearest road, gate toward it, and keep it if the gate is within reach of the
  // road (a short access path, drawn by the caller) and the whole estate is free land.
  const segs = [];
  roads.filter((r) => r.fit && !['footway', 'path', 'cycleway', 'pedestrian', 'steps'].includes(r.cls)).forEach((r) => {
    const { pts, half, paveL, paveR } = r.fit;
    for (let i = 0; i < pts.length - 1; i++) segs.push({ a: pts[i], b: pts[i + 1], reach: Math.max(half[i], half[i + 1]) + Math.max(paveL[i], paveR[i], paveL[i + 1], paveR[i + 1]) });
  });
  const nearestSeg = (x, z) => {
    let best = null, bd = Infinity;
    for (const sg of segs) {
      const dx = sg.b[0] - sg.a[0], dz = sg.b[1] - sg.a[1], L2 = dx * dx + dz * dz || 1, k = Math.max(0, Math.min(1, ((x - sg.a[0]) * dx + (z - sg.a[1]) * dz) / L2));
      const px = sg.a[0] + dx * k, pz = sg.a[1] + dz * k, d = Math.hypot(x - px, z - pz);
      if (d < bd) { bd = d; best = { sg, px, pz, d, L: Math.sqrt(L2), dx, dz }; }
    }
    return best;
  };
  const segMemo = new Map();
  for (const [gates, n, single] of [[2, 5, false], [2, 4, false], [2, 4, true], [2, 3, true], [1, 5, false], [1, 4, false], [1, 3, false], [1, 2, false], [1, 4, true], [1, 3, true], [1, 2, true]]) {
    const W = gates * (single ? SINGLE_W : GATE_W), D = FRONT_STRIP + n * LOT_W + BACK_STRIP;
    for (let gx = -R; gx <= R; gx += 8) for (let gz = -R; gz <= R; gz += 8) {
      if (Math.hypot(gx, gz) > R * 0.9 || !free(gx, gz)) continue;
      const kk = `${gx},${gz}`; let ns = segMemo.get(kk); if (ns === undefined) { ns = nearestSeg(gx, gz); segMemo.set(kk, ns); } if (!ns) continue; // the same grid point is asked about for every size
      const tx = ns.dx / ns.L, tz = ns.dz / ns.L;
      // v points away from the road, from the road toward this point
      let vx = gx - ns.px, vz = gz - ns.pz; const vl = Math.hypot(vx, vz) || 1; vx /= vl; vz /= vl;
      // square v up with the road: perpendicular to it, on this point's side
      const side = Math.sign(-tz * vx + tx * vz) || 1, v = [-tz * side, tx * side], u = [v[1], -v[0]];
      // the front edge sits where this point is; the gate must reach the road within 24 m
      const gap = ns.d - ns.sg.reach;
      if (gap < 1 || gap > 40) continue;
      const o = [gx - u[0] * W / 2, gz - u[1] * W / 2];
      const rect = { o, u, v, W, D };
      if (!fits(rect)) continue;
      // the access path from each gate to the road crosses nothing but free land
      let clear = true;
      for (let g = 0; g < gates && clear; g++) { const c = single ? LOT_D + CLOSE_W / 2 : g * GATE_W + GATE_W / 2, sx = o[0] + u[0] * c, sz = o[1] + u[1] * c; for (let k = 0.5; k < gap - 0.5 && clear; k += 1) if (!free(sx - v[0] * k, sz - v[1] * k)) clear = false; }
      if (!clear) continue;
      placed.push(rect);
      const E = layOut(rect, gates, n, NAMES[nameAt++ % NAMES.length], single);
      E.access = E.gates.map((g) => ({ from: [g.x, g.z], to: [g.x - v[0] * gap, g.z - v[1] * gap], len: gap }));
      estates.push(E);
    }
  }
  return estates;
}

// the inside of one estate: walls with a gap at each gate, a close per gate, lots both sides
function layOut(rect, gates, n, name, single = false) {
  const { o, u, v, W, D } = rect;
  const P = (s, t) => [o[0] + u[0] * s + v[0] * t, o[1] + u[1] * s + v[1] * t];
  const ry = Math.atan2(v[0], v[1]); // a box's local z runs along v, so its local x (hx) runs along u
  const box = (s0, t0, s1, t1, extra = {}) => { const [cx, cz] = P((s0 + s1) / 2, (t0 + t1) / 2); return { cx, cz, hx: Math.abs(s1 - s0) / 2, hz: Math.abs(t1 - t0) / 2, ry, ...extra }; };
  const walls = [], closes = [], lots = [], gatesOut = [];
  // the front wall, broken at each gate; the side and back walls whole
  let s = 0;
  const GW = single ? SINGLE_W : GATE_W;
  for (let g = 0; g < gates; g++) {
    const c = single ? g * GW + LOT_D + CLOSE_W / 2 : g * GW + GW / 2;
    walls.push(box(s, -WALL_T / 2, c - CLOSE_W / 2, WALL_T / 2));
    s = c + CLOSE_W / 2;
    const [gx, gz] = P(c, 0);
    gatesOut.push({ no: g + 1, x: gx, z: gz, ry: Math.atan2(-v[0], -v[1]), // facing out to the road
      post: [P(c - CLOSE_W / 2 - 0.3, 0), P(c + CLOSE_W / 2 + 0.3, 0)], booth: P(c + CLOSE_W / 2 + 1.6, 1.8), inward: [v[0], v[1]] });
    closes.push(box(c - CLOSE_W / 2, 0, c + CLOSE_W / 2, D - BACK_STRIP + 2, { gate: g + 1 }));
    for (let k = 0; k < n; k++) {
      const t0 = FRONT_STRIP + k * LOT_W, t1 = t0 + LOT_W;
      // side A: left of the close as you walk in; its front faces +u, toward the close
      [['A', c - CLOSE_W / 2 - LOT_D, c - CLOSE_W / 2, [u[0], u[1]]], ['B', c + CLOSE_W / 2, c + CLOSE_W / 2 + LOT_D, [-u[0], -u[1]]]].slice(0, single ? 1 : 2).forEach(([sd, s0, s1, f]) => {
        const e = 0.02; // neighbours share a boundary line; 2 cm in, so one lot never counts as inside the next
        const pts = [P(s0 + e, t0 + e), P(s1 - e, t0 + e), P(s1 - e, t1 - e), P(s0 + e, t1 - e)];
        const [cx, cz] = P((s0 + s1) / 2, (t0 + t1) / 2);
        lots.push({ pts, c: [cx, cz], front: f, side: [v[0], v[1]], gate: g + 1, no: `${k + 1}${sd}`, estate: name });
      });
    }
  }
  walls.push(box(s, -WALL_T / 2, W, WALL_T / 2));
  walls.push(box(-WALL_T / 2, 0, WALL_T / 2, D), box(W - WALL_T / 2, 0, W + WALL_T / 2, D), box(0, D - WALL_T / 2, W, D + WALL_T / 2));
  const corners = [P(0, 0), P(W, 0), P(W, D), P(0, D)];
  return { name, corners, rect, ry, walls, closes, lots, gates: gatesOut, n };
}

// is a point on (within d of) an estate's perimeter wall line
export function nearWall(est, x, z, d = 0.8) {
  const { o, u, v, W, D } = est.rect;
  const dx = x - o[0], dz = z - o[1], s = dx * u[0] + dz * u[1], t = dx * v[0] + dz * v[1];
  if (s < -d || s > W + d || t < -d || t > D + d) return false;
  return Math.abs(s) < d || Math.abs(s - W) < d || Math.abs(t) < d || Math.abs(t - D) < d;
}
