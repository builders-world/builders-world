// Houses in the arrival scene's style (world bible 7.1), fitted to real map footprints.
// The vocabulary is Codex's starter house: an ivory body, a wood fascia under a dark green flat roof
// with a low parapet, wood-framed windows with pale blue glass and a white cross, and a coloured
// entrance panel with a dark green door, a brass handle, a canopy and two stone steps.

export const HOUSE = {
  wood: '#a87950', roof: '#263832', glass: '#82afbf', cross: '#f7f1df', stone: '#c3bdae', step: '#d6d0c0',
  door: '#263832', handle: '#eeb962', panels: ['#326952', '#4b5878', '#3f6f7a', '#8a5a3a'],
};
const FLOOR = 3.0;

const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length]; a += x1 * z2 - x2 * z1; } return a / 2; };
const scaleAbout = (pts, c, k) => pts.map(([x, z]) => [c[0] + (x - c[0]) * k, c[1] + (z - c[1]) * k]);
// a ring offset outwards by a fixed distance, so fascias overhang evenly on long and short sides
function grow(pts, d) {
  const s = area(pts) > 0 ? 1 : -1, n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const e1 = [p[0] - a[0], p[1] - a[1]], e2 = [b[0] - p[0], b[1] - p[1]];
    const l1 = Math.hypot(...e1) || 1, l2 = Math.hypot(...e2) || 1;
    const n1 = [e1[1] / l1 * s, -e1[0] / l1 * s], n2 = [e2[1] / l2 * s, -e2[0] / l2 * s];
    const m = [n1[0] + n2[0], n1[1] + n2[1]], ml = Math.hypot(...m) || 1;
    const k = d / Math.max(0.35, (m[0] * n1[0] + m[1] * n1[1]) / ml);
    return [p[0] + (m[0] / ml) * k, p[1] + (m[1] / ml) * k];
  });
}

// Outward facades of a footprint: midpoint, direction along, outward normal, length.
function facades(pts) {
  const s = area(pts) > 0 ? 1 : -1, out = [];
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.5) continue;
    const tx = (bx - ax) / len, tz = (bz - az) / len;
    out.push({ ax, az, tx, tz, nx: tz * s, nz: -tx * s, len, mx: (ax + bx) / 2, mz: (az + bz) / 2 });
  }
  return out;
}

/**
 * Dress one building into a MeshBuilder.
 * @param mb      MeshBuilder (box/extrude with vertex colours)
 * @param b       { pts, c } footprint and centre
 * @param h       wall height in metres
 * @param o       { wall, rng, front(x,z) -> distance to the nearest street, detail: 0 cheap | 1 full }
 * Returns the door { x, z, ry } (for a potted plant) or null.
 */
export function dressHouse(mb, b, h, o) {
  const { wall, rng, front, detail = 1 } = o;
  const floors = Math.max(1, Math.round(h / FLOOR));
  const H = floors * FLOOR - 0.2;
  const soft = { grad: 0.1, vary: 0.02 };
  // body, fascia, roof slab, parapet
  mb.extrude(b.pts, 0, H, wall, soft);
  mb.extrude(grow(b.pts, 0.28), H, 0.28, HOUSE.wood, { grad: 0, vary: 0.02 });
  mb.extrude(grow(b.pts, 0.16), H + 0.28, 0.16, HOUSE.roof, { grad: 0, vary: 0 });
  mb.extrude(b.pts, H + 0.44, 0.3, wall, { grad: 0, vary: 0.02 });
  mb.extrude(grow(b.pts, -0.22), H + 0.44, 0.16, HOUSE.roof, { grad: 0, vary: 0 }); // 14 cm below the parapet top
  // a stone band at each upper floor line
  for (let f = 1; f < floors; f++) mb.extrude(grow(b.pts, 0.06), f * FLOOR - 0.1, 0.16, HOUSE.stone, { grad: 0, vary: 0 });

  const fs = facades(b.pts);
  // the door goes on the longest facade that faces the nearest street
  let door = null;
  if (front) {
    let best = Infinity;
    fs.forEach((f) => { if (f.len < 3.4) return; const d = front(f.mx + f.nx * 3, f.mz + f.nz * 3) - f.len * 0.08; if (d < best) { best = d; door = f; } });
  }
  let doorAt = null;
  if (door) {
    const ry = Math.atan2(door.nx, door.nz), panel = HOUSE.panels[Math.floor(rng() * HOUSE.panels.length)];
    const u = door.len * (0.3 + rng() * 0.15);
    const px = door.ax + door.tx * u, pz = door.az + door.tz * u;
    const at = (k) => [px + door.nx * k, pz + door.nz * k];
    let [x, z] = at(0.07); mb.box(x, 0, z, 2.5, Math.min(2.75, H - 0.05), 0.15, panel, { grad: 0, vary: 0 }, ry);
    [x, z] = at(0.2); mb.box(x, 0.05, z, 1.0, 2.3, 0.06, HOUSE.door, { grad: 0, vary: 0 }, ry);
    [x, z] = at(0.27); mb.box(x + door.tx * 0.32, 1.1, z + door.tz * 0.32, 0.05, 0.14, 0.05, HOUSE.handle, { grad: 0, vary: 0 }, ry);
    [x, z] = at(0.55); mb.box(x, 2.55, z, 2.3, 0.12, 1.0, panel, { grad: 0, vary: 0 }, ry);
    [x, z] = at(0.55); mb.box(x, 0, z, 2.1, 0.24, 1.0, HOUSE.stone, { grad: 0, vary: 0 }, ry);
    [x, z] = at(1.25); mb.box(x, 0, z, 2.5, 0.12, 0.5, HOUSE.step, { grad: 0, vary: 0 }, ry);
    doorAt = { x: px + door.nx * 1.4 + door.tx * 1.9, z: pz + door.nz * 1.4 + door.tz * 1.9, ry, u, f: door,
      // a wall light beside the door, on the side away from the planter
      lamp: { x: px + door.nx * 0.2 - door.tx * 1.55, y: 2.25, z: pz + door.nz * 0.2 - door.tz * 1.55, ry } };
  }
  // windows: wood frame, pale blue glass, a white cross; skipped where the door stands
  fs.forEach((f) => {
    if (f.len < 3.2) return;
    const ry = Math.atan2(f.nx, f.nz);
    const cols = Math.max(1, Math.floor((f.len - 1.2) / 3.0));
    const sp = (f.len - 1.2) / cols;
    for (let fl = 0; fl < floors; fl++) {
      for (let c = 0; c < cols; c++) {
        const u = 0.6 + sp * (c + 0.5);
        if (fl === 0 && door && f === door && Math.abs(u - doorAt.u) < 2.4) continue;
        const y = fl * FLOOR + 0.85;
        const bx = f.ax + f.tx * u, bz = f.az + f.tz * u;
        // frame, glass and cross each stand 2 cm or more proud of the last, so none of them shimmer
        mb.box(bx + f.nx * 0.05, y, bz + f.nz * 0.05, 1.65, 1.35, 0.08, HOUSE.wood, { grad: 0, vary: 0.03 }, ry);
        mb.box(bx + f.nx * 0.13, y + 0.08, bz + f.nz * 0.13, 1.47, 1.18, 0.04, HOUSE.glass, { grad: 0, vary: 0.02 }, ry);
        if (detail) {
          mb.box(bx + f.nx * 0.18, y + 0.08, bz + f.nz * 0.18, 0.04, 1.18, 0.03, HOUSE.cross, { grad: 0, vary: 0 }, ry);
          mb.box(bx + f.nx * 0.18, y + 0.65, bz + f.nz * 0.18, 1.47, 0.04, 0.03, HOUSE.cross, { grad: 0, vary: 0 }, ry);
        }
      }
    }
  });
  // now and then, a wood slat screen beside the house, as in the arrival scene
  if (detail && door && rng() < 0.35) {
    const side = fs.find((f) => f !== door && f.len > 3.5 && Math.abs(f.nx * door.nx + f.nz * door.nz) < 0.3);
    if (side) {
      const ry = Math.atan2(side.nx, side.nz) + Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        const u = 0.8 + i * 0.75;
        if (u > side.len - 0.5) break;
        mb.box(side.ax + side.tx * u + side.nx * 0.9, 0, side.az + side.tz * u + side.nz * 0.9, 1.1, 1.4, 0.07, HOUSE.wood, { grad: 0, vary: 0.04 }, ry);
      }
    }
  }
  return { top: H + 0.6 + 0.16, door: doorAt };
}

// ---------- estates: lawn, picket fence, gate and path around every house ----------
const inPoly = (x, z, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
// room for a person (0.84 m across) to walk between a house and its fence: the body, plus enough that
// the 0.5 m walk map sees the path as unbroken at any angle (0.84 + 0.71 diagonal + fence)
export const WALK = 1.7;
const distToPoly = (x, z, pts) => { let d = Infinity; for (let i = 0; i < pts.length; i++) { const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); d = Math.min(d, Math.hypot(x - ax - dx * u, z - az - dz * u)); } return d; };
export const ESTATE = { lawn: ['#9cc163', '#93bb5c', '#a3c76b'], picket: '#f7f1df', path: '#d6d0c0' };

/**
 * A house on its own lot, California-suburb style: the map footprint is the lot.
 * Returns { pts (the house), top, door, tree } or null when the lot is too small to build on.
 */
export function dressEstate(mb, lot, c0, levels, o) {
  let c = c0;
  const { rng, detail = 1 } = o;
  const side = Math.sqrt(Math.abs(area(lot)));
  if (side < 5) return null;
  let k = Math.max(0.45, Math.min(0.72, 1 - 7.5 / side));
  if (side * k < 4.8) k = Math.min(0.82, 4.8 / side);
  // the house must sit inside its own garden. Between the wall and the fence there is either a real
  // side path (WALK, room for a person with a little to spare) or no gap at all: a strip a person can
  // stand in but not walk out of is how players got stuck (Elvis, 9 October 2026). So: try for the full
  // side path first; on a lot too tight for it, settle for 0.8 m and take the fence off any stretch
  // that runs too close to the wall, so the wall itself is the boundary there.
  // An L-shaped plot scaled toward its centre can push the house through the inner corner, so shrink it,
  // and failing that, place a rectangle at the widest point of the garden.
  const roomy = grow(lot, -(0.25 + WALK)), tight = grow(lot, -0.8);
  const fitsIn = (inner) => (h) => !h.some(([x, z]) => !inPoly(x, z, inner)) && !inner.some(([x, z]) => inPoly(x, z, h));
  const minSide = (h) => Math.min(...h.map(([x, z], i) => { const [x2, z2] = h[(i + 1) % h.length]; return Math.hypot(x2 - x, z2 - z); }));
  let pts = null;
  if (roomy.length >= 3 && Math.abs(area(roomy)) > 20) {
    for (let kk = k; kk > 0.3 && !pts; kk -= 0.04) { const h = scaleAbout(lot, c, kk); if (fitsIn(roomy)(h)) pts = h; }
    if (pts && (minSide(pts) < 3.6 || Math.abs(area(pts)) < 18)) pts = null; // too small to be a house: use the tight fit instead
  }
  const inner = tight, fits = fitsIn(tight);
  if (!pts) pts = scaleAbout(lot, c, k);
  for (let kk = k; !fits(pts) && kk > 0.3; kk -= 0.06) pts = scaleAbout(lot, c, kk);
  if (!fits(pts)) {
    const bb = lot.reduce((a, [x, z]) => [Math.min(a[0], x), Math.min(a[1], z), Math.max(a[2], x), Math.max(a[3], z)], [1e9, 1e9, -1e9, -1e9]);
    let best = null, bd = 0;
    for (let x = bb[0]; x <= bb[2]; x += 0.5) for (let z = bb[1]; z <= bb[3]; z += 0.5) {
      if (!inPoly(x, z, inner)) continue;
      let d = Infinity; for (let i = 0; i < inner.length; i++) { const [ax, az] = inner[i], [bx, bz] = inner[(i + 1) % inner.length], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); d = Math.min(d, Math.hypot(x - ax - dx * u, z - az - dz * u)); }
      if (d > bd) { bd = d; best = [x, z]; }
    }
    if (!best || bd < 2.2) return null; // no room for a house: leave the footprint as open ground
    const e = facades(lot).sort((p, q) => q.len - p.len)[0], hw = Math.min(bd * 0.7, 4), ux = e.tx * hw, uz = e.tz * hw, vx = e.nx * hw, vz = e.nz * hw;
    pts = [[best[0] - ux - vx, best[1] - uz - vz], [best[0] + ux - vx, best[1] + uz - vz], [best[0] + ux + vx, best[1] + uz + vz], [best[0] - ux + vx, best[1] - uz + vz]];
    c = best;
  }
  // lawn over the whole lot
  // one lawn colour with no variation: where map footprints overlap, the lawns are identical and cannot shimmer
  mb.extrude(grow(lot, -0.05), 0, 0.03, ESTATE.lawn[0], { grad: 0, vary: 0 });
  const floors = Math.max(1, Math.min(levels >= 4 ? 3 : 2, Math.round(levels)));
  const house = dressHouse(mb, { pts, c }, floors * FLOOR, o);
  // the gate: on the lot edge the front door faces
  const ring = grow(lot, -0.25), edges = facades(ring);
  let gate = null;
  if (house.door) {
    const d = house.door, dn = [d.f.nx, d.f.nz];
    const ox = d.f.ax + d.f.tx * d.u, oz = d.f.az + d.f.tz * d.u; // the door on the facade
    let best = Infinity;
    edges.forEach((e) => {
      if (e.nx * dn[0] + e.nz * dn[1] < 0.5) return;
      const t = (ox - e.ax) * e.tx + (oz - e.az) * e.tz;
      if (t < 1.1 || t > e.len - 1.1) return;
      const gx = e.ax + e.tx * t, gz = e.az + e.tz * t, dd = Math.hypot(gx - ox, gz - oz);
      if (dd < best) { best = dd; gate = { e, t, x: gx, z: gz }; }
    });
    if (gate) {
      // a stone path from the steps to the gate
      const sx = ox + dn[0] * 1.5, sz = oz + dn[1] * 1.5, L = Math.hypot(gate.x - sx, gate.z - sz);
      if (L > 0.3) mb.box((sx + gate.x) / 2, 0, (sz + gate.z) / 2, 1.2, 0.07, L + 0.3, ESTATE.path, { grad: 0, vary: 0.02 }, Math.atan2(gate.x - sx, gate.z - sz));
    }
  }
  // white picket fence on the lot line, open at the gate; each run is also a collider.
  // Neighbours share one fence: a stretch already fenced by the plot next door is not fenced again.
  // Fences go up once every house is placed (world.js calls lay with all of them), because a fence
  // too close to the house next door makes the same trap as one too close to your own.
  const fences = [], shared = o.fenceIndex;
  const lay = (houses = [{ pts, bb: null }]) => {
  const near = (x, z) => houses.some((h) => (!h.bb || (x > h.bb.x0 - WALK && x < h.bb.x1 + WALK && z > h.bb.z0 - WALK && z < h.bb.z1 + WALK)) && (inPoly(x, z, h.pts) || distToPoly(x, z, h.pts) < WALK));
  const fencedAlready = (x, z, tx, tz) => {
    if (!shared) return false;
    const key = (i, j) => `${i},${j}`, ci = Math.floor(x / 2), cj = Math.floor(z / 2);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const q of shared.get(key(ci + di, cj + dj)) || []) {
      if (Math.abs(tx * q.tz - tz * q.tx) < 0.25 && Math.hypot(x - q.x, z - q.z) < 1.3) return true;
    }
    return false;
  };
  const remember = (x, z, tx, tz) => { if (!shared) return; const k = `${Math.floor(x / 2)},${Math.floor(z / 2)}`; let a = shared.get(k); if (!a) shared.set(k, (a = [])); a.push({ x, z, tx, tz }); };
  edges.forEach((e) => {
    if (e.len < 0.6) return;
    const ry = Math.atan2(e.nx, e.nz);
    const gap = gate && gate.e === e ? [gate.t - 1.0, gate.t + 1.0] : null; // a 2 m gate
    // split the edge into ~1 m pieces, drop the gate and anything the neighbour already fenced, merge the rest
    const n = Math.max(1, Math.round(e.len)), step = e.len / n, keep = [];
    for (let k = 0; k < n; k++) {
      const u0 = k * step, u1 = u0 + step, um = (u0 + u1) / 2;
      const inGate = gap && um > gap[0] && um < gap[1];
      // too close to the wall to walk between: no fence here, the wall is the boundary
      const px = e.ax + e.tx * um, pz = e.az + e.tz * um;
      keep.push(!inGate && !near(px, pz) && !fencedAlready(px, pz, e.tx, e.tz));
    }
    const runs = [];
    for (let k = 0; k < n; k++) if (keep[k]) { if (runs.length && runs[runs.length - 1][1] === k * step) runs[runs.length - 1][1] = (k + 1) * step; else runs.push([k * step, (k + 1) * step]); }
    if (gap) runs.forEach((r) => { if (r[1] > gap[0] && r[0] < gap[0]) r[1] = gap[0]; if (r[0] < gap[1] && r[1] > gap[1]) r[0] = gap[1]; });
    for (let k = 0; k < n; k++) if (keep[k]) remember(e.ax + e.tx * (k + 0.5) * step, e.az + e.tz * (k + 0.5) * step, e.tx, e.tz);
    runs.forEach(([a, b]) => { if (b - a >= 0.3) fences.push({ ax: e.ax, az: e.az, tx: e.tx, tz: e.tz, nx: e.nx, nz: e.nz, a, b, ry, detail }); });
  });
  return fences;
  };
  // a tree in the back garden when there is room, never in the side path
  let tree = null;
  if (house.door) {
    const d = house.door.f, back = Math.abs((c[0] - d.mx) * d.nx + (c[1] - d.mz) * d.nz);
    const tx = c[0] - d.nx * (back + 2.4), tz = c[1] - d.nz * (back + 2.4);
    if (inPoly(tx, tz, grow(lot, -(0.25 + WALK + 0.35))) && !inPoly(tx, tz, grow(pts, WALK + 0.35))) tree = { x: tx, z: tz };
  }
  if (!o.deferFences) { const runs = lay(); runs.forEach((r) => drawFence(mb, r)); return { pts, top: house.top, door: house.door, tree, fences: runs.map(fenceCollider) }; }
  return { pts, top: house.top, door: house.door, tree, lay };
}

export { scaleAbout };

// a fence run is a stretch [a, b] along a lot edge; these turn one into its collider and its pickets,
// and cut a gate into it
export const fenceCollider = (r) => { const L = r.b - r.a, m = r.a + L / 2; return { cx: r.ax + r.tx * m, cz: r.az + r.tz * m, hx: L / 2, hz: 0.07, ry: r.ry }; };
export function drawFence(mb, r) {
  const { a, b, ry, detail } = r, L = b - a, m = a + L / 2, mx = r.ax + r.tx * m, mz = r.az + r.tz * m;
  mb.box(mx, 0.32, mz, L, 0.07, 0.05, ESTATE.picket, { grad: 0, vary: 0 }, ry);
  mb.box(mx, 0.72, mz, L, 0.07, 0.05, ESTATE.picket, { grad: 0, vary: 0 }, ry);
  const st = detail ? 0.45 : 1.8;
  for (let u = a + 0.1; u <= b - 0.05; u += st) {
    const big = !detail || Math.abs((u - a) % 1.8) < st * 0.5;
    mb.box(r.ax + r.tx * u, 0, r.az + r.tz * u, big ? 0.1 : 0.08, big ? 1.0 : 0.92, big ? 0.1 : 0.03, ESTATE.picket, { grad: 0, vary: 0 }, ry);
  }
}
export function cutFence(r, u0, u1) {
  return [[r.a, Math.min(r.b, u0)], [Math.max(r.a, u1), r.b]].filter(([a, b]) => b - a >= 0.3).map(([a, b]) => ({ ...r, a, b }));
}
