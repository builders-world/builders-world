// Street engineering on top of real footprints (world bible 4.2 and 4.3).
// OSM gives us where buildings really are and where roads run, but not how wide the roads are.
// So every street is measured against its own building lines: the carriageway narrows to fit,
// pavements take what is left on each side, and lamps and trees are placed by the rules.

const FOOT = ['footway', 'path', 'cycleway', 'pedestrian', 'steps'];
const CLASS = {
  motorway: { half: 9, pave: 2, lamp: 26, sides: 2, minHalf: 3.5 },
  trunk: { half: 8, pave: 2.5, lamp: 26, sides: 2, minHalf: 3.5 },
  primary: { half: 7, pave: 3, lamp: 26, sides: 2, minHalf: 3.25 },
  secondary: { half: 5, pave: 2.5, lamp: 28, sides: 2, minHalf: 2.75 },
  tertiary: { half: 5, pave: 2.5, lamp: 28, sides: 2, minHalf: 2.75 },
  unclassified: { half: 3.5, pave: 2, lamp: 32, sides: 1, minHalf: 2.75 },
  residential: { half: 3.5, pave: 2, lamp: 32, sides: 1, minHalf: 2.75 },
  living_street: { half: 3, pave: 1.5, lamp: 32, sides: 1, minHalf: 2.25 },
  service: { half: 2.5, pave: 1.5, lamp: 38, sides: 1, minHalf: 1.75 },
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
  roads.forEach((r, ri) => {
    if (!r.fit) return;
    const C = classOf(r), { pts, nrm, half, paveL, paveR } = r.fit;
    // cumulative length, to step along the street
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = len[len.length - 1];
    const at = (s) => { let i = 1; while (i < len.length - 1 && len[i] < s) i++; return i; };
    let n = 0;
    for (let s = 6; s < total - 6; s += C.lamp, n++) {
      const i = at(s);
      const prefer = C.sides === 2 ? (n + ri) % 2 : ri % 2; // staggered on main roads, one side elsewhere
      for (const side of [prefer, 1 - prefer]) {
        const pave = side === 0 ? paveL[i] : paveR[i];
        if (pave < 0.9) continue;
        const sg = side === 0 ? 1 : -1;
        const off = half[i] + Math.min(0.6, pave - 0.3);
        const x = pts[i][0] + nrm[i][0] * off * sg, z = pts[i][1] + nrm[i][1] * off * sg;
        if (!inside(x, z) || inBuilding(x, z) || tooClose(lamps, x, z, C.lamp * 0.6)) continue;
        lamps.push({ x, z, nx: nrm[i][0] * sg, nz: nrm[i][1] * sg, cls: r.cls });
        break;
      }
    }
    // trees: only where the pavement is wide enough, away from kerb, lamps and junction ends
    for (let s = 9; s < total - 9; s += 16) {
      const i = at(s);
      [[paveL[i], 1], [paveR[i], -1]].forEach(([pave, sg]) => {
        if (pave < 2.5) return;
        const off = half[i] + Math.max(1.0, pave * 0.6);
        const x = pts[i][0] + nrm[i][0] * off * sg, z = pts[i][1] + nrm[i][1] * off * sg;
        if (!inside(x, z) || inBuilding(x, z) || tooClose(lamps, x, z, 3) || tooClose(trees, x, z, 6)) return;
        trees.push({ x, z });
      });
    }
  });
  return { lamps, trees };
}
