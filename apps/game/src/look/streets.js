// Street engineering on top of real footprints (world bible 4.2 and 4.3).
// OSM gives us where buildings really are and where roads run, but not how wide the roads are.
// So every street is measured against its own building lines: the carriageway narrows to fit,
// pavements take what is left on each side, and lamps and trees are placed by the rules.

const FOOT = ['footway', 'path', 'cycleway', 'pedestrian', 'steps'];
const CLASS = {
  motorway: { half: 9, pave: 2, lamp: 26, sides: 2, minHalf: 3.5 },
  trunk: { half: 8, pave: 2.5, lamp: 26, sides: 2, minHalf: 3.5 },
  primary: { half: 7, pave: 3, lamp: 26, sides: 2, minHalf: 3.25 },
  secondary: { half: 5, pave: 2.5, lamp: 24, sides: 2, minHalf: 2.75 },
  tertiary: { half: 5, pave: 2.5, lamp: 24, sides: 2, minHalf: 2.75 },
  unclassified: { half: 3.5, pave: 2, lamp: 25, sides: 1, minHalf: 2.75 },
  residential: { half: 3.5, pave: 2, lamp: 25, sides: 1, minHalf: 2.75 },
  living_street: { half: 3, pave: 1.5, lamp: 25, sides: 1, minHalf: 2.25 },
  service: { half: 2.5, pave: 1.5, lamp: 30, sides: 1, minHalf: 1.75 },
};
const KERB_GAP = 0.8; // building line to carriageway, at least

export const isFootway = (r) => FOOT.includes(r.cls);
export const classOf = (r) => CLASS[r.cls] || CLASS.residential;

// Building edges in a coarse grid, for fast "how far to the nearest wall" questions.
export function makeClearance(buildings, pointInPoly) {
  const CELL = 12, grid = new Map();
  const key = (i, j) => `${i},${j}`;
  buildings.forEach((b) => {
    for (let k = 0; k < b.pts.length; k++) {
      const a = b.pts[k], c = b.pts[(k + 1) % b.pts.length];
      const i0 = Math.floor(Math.min(a[0], c[0]) / CELL), i1 = Math.floor(Math.max(a[0], c[0]) / CELL);
      const j0 = Math.floor(Math.min(a[1], c[1]) / CELL), j1 = Math.floor(Math.max(a[1], c[1]) / CELL);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const kk = key(i, j);
        if (!grid.has(kk)) grid.set(kk, []);
        grid.get(kk).push([a, c, b]);
      }
    }
  });
  // distance from a point to the nearest building wall within `reach`; 0 inside a building
  return function clearance(x, z, reach = 18) {
    let best = reach;
    const r = Math.ceil(reach / CELL);
    const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
    const seen = new Set();
    for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) {
      const list = grid.get(key(i, j));
      if (!list) continue;
      for (const [a, c, b] of list) {
        if (!seen.has(b) && x > b.bb.x0 && x < b.bb.x1 && z > b.bb.z0 && z < b.bb.z1 && pointInPoly(x, z, b.pts)) return 0;
        seen.add(b);
        const dx = c[0] - a[0], dz = c[1] - a[1];
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
        const d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
        if (d < best) best = d;
      }
    }
    return best;
  };
}

// distance from a point to the first wall straight out along a direction
function reachOut(clearance, x, z, nx, nz, max) {
  let s = 0;
  while (s < max) {
    const c = clearance(x + nx * s, z + nz * s, 6);
    if (c === 0) return s;
    s += Math.max(0.25, c * 0.9);
  }
  return max;
}

function densify(pts, step = 3) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

function normals(pts) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
    return [-tz / l, tx / l, tx / l, tz / l]; // normal x, normal z, tangent x, tangent z
  });
}

const smooth = (arr, k = 2) => arr.map((_, i) => {
  let s = 0, n = 0;
  for (let j = Math.max(0, i - k); j <= Math.min(arr.length - 1, i + k); j++) { s += arr[j]; n++; }
  return s / n;
});

// Streets that stop just short of the road they meet (the map's two lines a few metres apart, or one cut at the edge
// of the data): the end is carried on to that road and both share the meeting point, so the junction is a real one
// for the paving, the kerbs and the traffic. Every city, before the streets are measured.
export function joinStreetEnds(roads, { reach = 9, keepOut = () => false } = {}) {
  const drive = roads.filter((r) => !isFootway(r) && r.pts.length > 1);
  let joined = 0;
  drive.forEach((r) => {
    [0, r.pts.length - 1].forEach((end) => {
      const [x, z] = r.pts[end];
      if (keepOut(x, z)) return;
      // already meets another road here?
      if (drive.some((o) => o !== r && o.pts.some((q) => Math.hypot(q[0] - x, q[1] - z) < 1.5))) return;
      let best = null;
      drive.forEach((o) => {
        if (o === r) return;
        for (let i = 0; i < o.pts.length - 1; i++) {
          const a = o.pts[i], b = o.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
          const px = a[0] + dx * u, pz = a[1] + dz * u, d = Math.hypot(px - x, pz - z);
          if (d > 0.3 && d < Math.max(reach, (o.w || 8) / 2 + 6) && (!best || d < best.d)) best = { o, i, u, p: [+px.toFixed(2), +pz.toFixed(2)], d };
        }
      });
      if (!best) return;
      // only carry it on roughly the way it was going (never fold it back on itself)
      const nb = r.pts[end === 0 ? 1 : r.pts.length - 2], hx = x - nb[0], hz = z - nb[1], hl = Math.hypot(hx, hz) || 1;
      if (((best.p[0] - x) * hx + (best.p[1] - z) * hz) / (hl * best.d) < -0.2) return;
      if (end === 0) r.pts.unshift(best.p); else r.pts.push(best.p);
      if (best.u > 0.01 && best.u < 0.99) best.o.pts.splice(best.i + 1, 0, best.p.slice());
      joined++;
    });
  });
  return joined;
}

// Measure every street. Writes r.fit and replaces r.w with the width that really fits.
export function fitStreets(roads, clearance) {
  roads.forEach((r) => {
    r.wClass = r.w;
    if (isFootway(r)) { r.fit = null; return; }
    const C = classOf(r);
    const pts = densify(r.pts);
    const nrm = normals(pts);
    const left = [], right = [];
    pts.forEach((p, i) => {
      const [nx, nz] = nrm[i];
      left.push(reachOut(clearance, p[0], p[1], nx, nz, C.half + C.pave + 4));
      right.push(reachOut(clearance, p[0], p[1], -nx, -nz, C.half + C.pave + 4));
    });
    const halfRaw = pts.map((_, i) => Math.min(C.half, Math.max(C.minHalf, Math.min(left[i], right[i]) - KERB_GAP)));
    const half = smooth(halfRaw).map((h, i) => Math.min(h, halfRaw[i] + 0.4));
    const paveL = pts.map((_, i) => Math.max(0, Math.min(C.pave, left[i] - half[i] - 0.05)));
    const paveR = pts.map((_, i) => Math.max(0, Math.min(C.pave, right[i] - half[i] - 0.05)));
    const sorted = [...half].sort((a, b) => a - b);
    r.fit = { pts, nrm, half, paveL: smooth(paveL, 1), paveR: smooth(paveR, 1) };
    r.w = 2 * sorted[Math.floor(sorted.length / 2)];
  });
}

// A band between two offsets from the centreline (signed, + is the left normal).
export function band(out, pts, nrm, from, to, y, push) {
  for (let i = 0; i < pts.length - 1; i++) {
    const at = (k, off) => [pts[k][0] + nrm[k][0] * off, y, pts[k][1] + nrm[k][1] * off];
    const a0 = at(i, from[i]), a1 = at(i, to[i]), b0 = at(i + 1, from[i + 1]), b1 = at(i + 1, to[i + 1]);
    if (Math.abs(to[i] - from[i]) < 0.05 && Math.abs(to[i + 1] - from[i + 1]) < 0.05) continue;
    push(out, a0, a1, b0);
    push(out, a1, b1, b0);
  }
}

// Lamp and tree positions by the bible's spacing rules.
export function streetFurniture(roads, { inBuilding, inside }) {
  const lamps = [], trees = [];
  const tooClose = (list, x, z, d) => list.some((p) => Math.hypot(p.x - x, p.z - z) < d);
  // every carriageway as segments, so nothing on one street's pavement stands in a crossing road
  const carriage = [];
  roads.forEach((r, ri) => {
    if (!r.fit) return;
    const { pts, half } = r.fit;
    for (let k = 0; k < pts.length - 1; k++) carriage.push({ ri, k, ax: pts[k][0], az: pts[k][1], bx: pts[k + 1][0], bz: pts[k + 1][1], h: Math.max(half[k], half[k + 1]) });
  });
  // any carriageway but the stretch the thing belongs to (a winding street can pass itself further along)
  const inRoad = (x, z, own, clear, at = -1, ownClear = -0.05) => carriage.some((c) => {
    // the thing's own stretch of street: only the carriageway itself is off limits (it stands at the kerb)
    const nearOwn = c.ri === own && (at < 0 || Math.abs(c.k - at) <= 3);
    const dx = c.bx - c.ax, dz = c.bz - c.az, L2 = dx * dx + dz * dz || 1;
    const u = Math.max(0, Math.min(1, ((x - c.ax) * dx + (z - c.az) * dz) / L2));
    return Math.hypot(x - c.ax - dx * u, z - c.az - dz * u) < c.h + (nearOwn ? ownClear : clear);
  });
  roads.forEach((r, ri) => {
    if (!r.fit) return;
    const C = classOf(r), { pts, nrm, half, paveL, paveR } = r.fit;
    // cumulative length, to step along the street
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = len[len.length - 1];
    const at = (s) => { let i = 1; while (i < len.length - 1 && len[i] < s) i++; return i; };
    let n = 0;
    // lamps on both sides of every street (Elvis, 9 October): opposite pairs on main roads, staggered
    // on smaller streets so the pools of light overlap down the whole length of the pavement
    for (let s = 6; s < total - 6; s += C.lamp, n++) {
      for (const side of [0, 1]) {
        const ss = C.sides === 2 ? s : s + (side ? C.lamp / 2 : 0);
        if (ss >= total - 4) continue;
        const i = at(ss);
        const pave = side === 0 ? paveL[i] : paveR[i];
        if (pave < 0.9) continue;
        const sg = side === 0 ? 1 : -1;
        const off = half[i] + Math.min(0.6, pave - 0.3);
        const x = pts[i][0] + nrm[i][0] * off * sg, z = pts[i][1] + nrm[i][1] * off * sg;
        // spacing is checked along the same side of the street only
        const sameSide = lamps.filter((l) => (l.nx * nrm[i][0] + l.nz * nrm[i][1]) * sg > 0.5);
        if (!inside(x, z) || inBuilding(x, z, 0.8) || inRoad(x, z, ri, 0.5, i) || tooClose(sameSide, x, z, C.lamp * 0.6) || tooClose(lamps, x, z, 3)) continue;
        lamps.push({ x, z, nx: nrm[i][0] * sg, nz: nrm[i][1] * sg, cls: r.cls });
      }
    }
    // trees: only where the pavement is wide enough, away from kerb, lamps and junction ends
    // (Elvis, 10 October 2026: the roads had lost their trees; most Yaba pavements are under 2.5 m, so narrower
    // ones get a tree too, at the back edge of the pavement with only its trunk in the way)
    for (let s = 7; s < total - 7; s += 13) {
      const i = at(s);
      [[paveL[i], 1], [paveR[i], -1]].forEach(([pave, sg]) => {
        if (pave < 1.5) return;
        const wide = pave >= 2.5, off = wide ? half[i] + Math.max(1.0, pave * 0.6) : half[i] + pave - 0.35;
        const x = pts[i][0] + nrm[i][0] * off * sg, z = pts[i][1] + nrm[i][1] * off * sg;
        // the planter is about 0.8 m across the street; keep it and its canopy clear of every other road
        if (!inside(x, z) || inBuilding(x, z, wide ? 1.6 : 1.1) || inRoad(x, z, ri, wide ? 1.6 : 1.2, i, wide ? 0.8 : 0.35) || tooClose(lamps, x, z, 3) || tooClose(trees, x, z, 6)) return;
        trees.push({ x, z, r: wide ? 0.75 : 0.28 });
      });
    }
  });
  return { lamps, trees };
}
