// The road network, after Cities: Skylines (Elvis, 12 October 2026, with three screenshots of it: "straight roads
// terminating into roundabouts with clear road markings, road signs, and the joints are meshing seamlessly ... study the
// way Cities: Skylines implements their nodes ... so that there's a clear hierarchy from surface roads to trunk roads to
// arterials").
//
// The map's roads become a graph of NODES (where roads meet, or where one ends) and SEGMENTS (the road between two
// nodes). Every class of road has one fixed PROFILE: its lanes, their width, its pavements and its paint, so a street
// looks like the kind of street it is, all the way along. At each node every segment stops short by exactly the room
// the junction needs, and the junction is drawn as one piece: clean asphalt bounded by curved kerbs that join the
// pavements of neighbouring roads. Paint belongs to segments only: lane lines end at the junction's edge, with a stop
// line and a zebra (or, entering a roundabout, a give-way line). A roundabout is a ring of one-way segments round a
// grass island. Nothing overlaps anything, so nothing flickers and no marking crosses another.
//
// Pure arithmetic, no three.js: the city bake (scripts/city/bake.mjs) runs it offline for a whole city, and the
// districts (world.js) at load for their circle. drawNetwork() turns the result into flat triangle layers.

// ---------- profiles: the hierarchy ----------
// lanes: the default number for a two-way road (a one-way way gets half, at least one); lw: lane width; pave: the
// pavement each side; centre: the paint between the directions; edge: solid lines along the kerbs.
export const PROFILES = {
  motorway: { lanes: 4, lw: 3.6, pave: 0, shoulder: 1.2, centre: 'barrier', edge: true, kind: 'highway', fillet: 9 },
  trunk: { lanes: 4, lw: 3.5, pave: 2.5, centre: 'double', edge: true, kind: 'highway', fillet: 8 },
  primary: { lanes: 4, lw: 3.35, pave: 3, centre: 'double', edge: true, kind: 'arterial', fillet: 7 },
  secondary: { lanes: 2, lw: 3.4, pave: 2.5, centre: 'double', edge: true, kind: 'arterial', fillet: 6 },
  tertiary: { lanes: 2, lw: 3.25, pave: 2.2, centre: 'dashed', edge: false, kind: 'collector', fillet: 5 },
  unclassified: { lanes: 2, lw: 3.0, pave: 1.8, centre: 'dashed', edge: false, kind: 'local', fillet: 4 },
  residential: { lanes: 2, lw: 3.0, pave: 1.8, centre: 'dashed', edge: false, kind: 'local', fillet: 4 },
  living_street: { lanes: 1, lw: 4.2, pave: 1.2, centre: 'none', edge: false, kind: 'estate', fillet: 3 },
  service: { lanes: 1, lw: 3.8, pave: 0.6, centre: 'none', edge: false, kind: 'estate', fillet: 3 },
  link: { lanes: 1, lw: 4.0, pave: 0, shoulder: 0.8, centre: 'none', edge: true, kind: 'highway', fillet: 7 },
};
const LINK = /_link$/;
export const isDriveable = (cls) => !!(PROFILES[cls] || LINK.test(cls));
export function profileOf(r) {
  const P = LINK.test(r.cls) ? PROFILES.link : PROFILES[r.cls] || PROFILES.residential;
  let lanes = r.lanes && r.lanes > 0 && r.lanes < 9 ? r.lanes : r.oneway ? Math.max(1, Math.ceil(P.lanes / 2)) : P.lanes;
  if (r.roundabout) lanes = Math.min(Math.max(lanes, 1), 2);
  const half = (lanes * P.lw) / 2 + 0.25 + (P.shoulder || 0);
  return { ...P, lanes, half, pave: r.roundabout ? 0 : P.pave };
}

// ---------- graph ----------
const keyOf = (p) => `${Math.round(p[0] * 20)},${Math.round(p[1] * 20)}`; // 5 cm: the map's shared nodes land on the same key
/**
 * @param roads [{ id, cls, pts:[[x,z]...], oneway, lanes, roundabout, name, bridge }] (driveable classes only)
 * @returns { nodes: Map(id -> { id, x, z, ends: [{ seg, at: 'a'|'b' }] }), segs: [{ id, road, cls, prof, pts, a, b, ... }] }
 */
export function buildNetwork(roads) {
  const use = new Map();
  roads.forEach((r) => r.pts.forEach((p, i) => { const k = keyOf(p); use.set(k, (use.get(k) || 0) + (i === 0 || i === r.pts.length - 1 ? 2 : 1)); }));
  const nodes = new Map(); let nid = 0;
  const nodeAt = (p) => { const k = keyOf(p); if (!nodes.has(k)) nodes.set(k, { id: nid++, k, x: p[0], z: p[1], ends: [] }); return nodes.get(k); };
  let segs = [];
  roads.forEach((r) => {
    const prof = profileOf(r); let run = [r.pts[0]];
    for (let i = 1; i < r.pts.length; i++) {
      run.push(r.pts[i]);
      const last = i === r.pts.length - 1;
      if (last || use.get(keyOf(r.pts[i])) > 1) { if (run.length > 1) segs.push({ road: r, cls: r.cls, prof, pts: run, oneway: !!r.oneway, roundabout: !!r.roundabout, name: r.name || null, bridge: !!r.bridge, layer: r.bridge ? Math.max(1, r.layer || 1) : 0 }); run = [r.pts[i]]; }
    }
  });
  // where two segments of the same road kind simply carry on through a node, they are one segment
  const attach = () => { nodes.forEach((n) => { n.ends = []; }); segs.forEach((s) => { s.a = nodeAt(s.pts[0]); s.b = nodeAt(s.pts[s.pts.length - 1]); s.a.ends.push({ seg: s, at: 'a' }); s.b.ends.push({ seg: s, at: 'b' }); }); };
  attach();
  const same = (s, t) => s.cls === t.cls && s.prof.lanes === t.prof.lanes && s.oneway === t.oneway && s.roundabout === t.roundabout && s.bridge === t.bridge && s.layer === t.layer && s.name === t.name;
  let merged = true;
  while (merged) {
    merged = false;
    for (const n of nodes.values()) {
      if (n.ends.length !== 2) continue;
      const [e1, e2] = n.ends; const s = e1.seg, t = e2.seg; if (s === t || !same(s, t)) continue;
      // one-way segments only join head to tail
      let pts;
      if (e1.at === 'b' && e2.at === 'a') pts = [...s.pts, ...t.pts.slice(1)];
      else if (e1.at === 'a' && e2.at === 'b') pts = [...t.pts, ...s.pts.slice(1)];
      else if (s.oneway) continue;
      else if (e1.at === 'b' && e2.at === 'b') pts = [...s.pts, ...t.pts.slice(0, -1).reverse()];
      else pts = [...s.pts.slice().reverse(), ...t.pts.slice(1)];
      s.pts = pts; segs = segs.filter((x) => x !== t); merged = true; attach(); break;
    }
  }
  nodes.forEach((n, k) => { if (!n.ends.length) nodes.delete(k); });
  segs.forEach((s, i) => { s.id = i; });
  return { nodes, segs };
}

// ---------- junctions: trim every segment back, and shape the junction ----------
const len = (pts) => pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
// the point at distance s from the start of a polyline, and the direction there
function along(pts, s) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (acc + L >= s || i === pts.length - 1) { const u = L ? Math.min(1, (s - acc) / L) : 0; return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, dx: L ? (b[0] - a[0]) / L : 1, dz: L ? (b[1] - a[1]) / L : 0, i }; } acc += L; }
  return { x: pts[0][0], z: pts[0][1], dx: 1, dz: 0, i: 1 };
}
// a polyline cut to [s0, L - s1]
function cut(pts, s0, s1) {
  const L = len(pts), a = Math.max(0, s0), b = Math.max(a + 0.01, L - Math.max(0, s1)), out = [];
  const A = along(pts, a), B = along(pts, b); out.push([A.x, A.z]);
  let acc = 0;
  for (let i = 1; i < pts.length; i++) { acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc > a + 0.01 && acc < b - 0.01) out.push(pts[i]); }
  out.push([B.x, B.z]); return out;
}
// where two lines meet: p + s*d and q + t*e
function meet(px, pz, dx, dz, qx, qz, ex, ez) {
  const den = dx * ez - dz * ex; if (Math.abs(den) < 1e-6) return null;
  const s = ((qx - px) * ez - (qz - pz) * ex) / den, t = ((qx - px) * dz - (qz - pz) * dx) / den; return { s, t };
}
// a corner: a quadratic curve from A through the control point K to B, in n steps (both ends included)
function curve(A, K, B, n = 6) { const o = []; for (let k = 0; k <= n; k++) { const t = k / n, u = 1 - t; o.push([u * u * A[0] + 2 * u * t * K[0] + t * t * B[0], u * u * A[1] + 2 * u * t * K[1] + t * t * B[1]]); } return o; }


/**
 * A junction's asphalt and pavement corners, from its roads alone: each road's direction away from the node (dx, dz),
 * its carriageway and pavement half-widths (w, W) and how far it stops short (trim), sorted by angle. The bake stores
 * these few numbers; the game rebuilds the curves.
 */
export function junctionShape(nx0, nz0, ends) {
  const n = { x: nx0, z: nz0 };
  ends = ends.map((e) => (Array.isArray(e) ? { dx: e[0], dz: e[1], w: e[2], W: e[3], trim: e[4] } : e)).map((e) => ({ ...e, th: Math.atan2(e.dz, e.dx) })).sort((a, b) => a.th - b.th);
  const mouth = (x, off, side) => [n.x + x.dx * x.trim + side[0] * off, n.z + x.dz * x.trim + side[1] * off];
  const asphalt = [], corners = [];
  ends.forEach((a, k) => {
    const b = ends[(k + 1) % ends.length];
    let ang = b.th - a.th; if (ang <= 0) ang += Math.PI * 2;
    const nA = [-a.dz, a.dx], nB = [b.dz, -b.dx];
    const aR = mouth(a, a.w, [a.dz, -a.dx]), aL = mouth(a, a.w, nA), bR = mouth(b, b.w, nB);
    if (!asphalt.length) asphalt.push(aR);
    asphalt.push(aL);
    if (ang < Math.PI * 0.97) {
      const kk = meet(aL[0], aL[1], -a.dx, -a.dz, bR[0], bR[1], -b.dx, -b.dz), K = kk ? [aL[0] - a.dx * kk.s, aL[1] - a.dz * kk.s] : [(aL[0] + bR[0]) / 2, (aL[1] + bR[1]) / 2];
      const inner = curve(aL, K, bR, 8); asphalt.push(...inner.slice(1, -1));
      if (a.W > a.w + 0.1 || b.W > b.w + 0.1) {
        const oA = mouth(a, a.W, nA), oB = mouth(b, b.W, nB), ko = meet(oA[0], oA[1], -a.dx, -a.dz, oB[0], oB[1], -b.dx, -b.dz);
        const KO = ko ? [oA[0] - a.dx * ko.s, oA[1] - a.dz * ko.s] : [(oA[0] + oB[0]) / 2, (oA[1] + oB[1]) / 2];
        corners.push({ inner, outer: curve(oA, KO, oB, 8) });
      } else corners.push({ inner, outer: null });
    } else {
      // the open side of a T (or wider): the kerb runs straight across from one road to the next
      corners.push({ inner: [aL, bR], outer: a.W > a.w + 0.1 ? [mouth(a, a.W, nA), mouth(b, b.W, nB)] : null, straight: true });
    }
    asphalt.push(bR);
  });
  asphalt.pop(); // the first mouth closes the ring
  return { asphalt, corners };
}

/**
 * Shape every junction: how far each segment stops short (seg.trimA, seg.trimB), and the junction's asphalt, its
 * pavement corners and its kerbs. Roundabout islands too.
 */
export function shapeJunctions(net, { elevate = true } = {}) {
  const { nodes, segs } = net;
  segs.forEach((s) => { s.trimA = 0; s.trimB = 0; s.L = len(s.pts); });
  const junctions = [];
  nodes.forEach((n) => {
    if (n.ends.length < 2) return;
    // each road leaving the node: its direction a few metres out, its carriageway and pavement half-widths
    const ends = n.ends.map((e) => {
      const s = e.seg, pts = e.at === 'a' ? s.pts : s.pts.slice().reverse(), q = along(pts, Math.min(6, s.L * 0.4));
      const dx = q.x - n.x, dz = q.z - n.z, l = Math.hypot(dx, dz) || 1;
      return { e, s, dx: dx / l, dz: dz / l, w: s.prof.half, W: s.prof.half + s.prof.pave, th: Math.atan2(dz / l, dx / l), trim: 0, fillet: s.prof.fillet };
    }).sort((a, b) => a.th - b.th);
    const straight = ends.length === 2 && ends[0].dx * ends[1].dx + ends[0].dz * ends[1].dz < -0.97 && ends[0].w === ends[1].w;
    if (straight) return; // a road simply carrying on (a change of name, a bridge's end): no junction
    // each wedge between neighbouring roads: where the near kerb of one meets the near kerb of the other
    const wedges = ends.map((a, k) => {
      const b = ends[(k + 1) % ends.length];
      let ang = b.th - a.th; if (ang <= 0) ang += Math.PI * 2;
      const nA = [-a.dz, a.dx], nB = [b.dz, -b.dx]; // a's side facing the wedge, and b's
      const m = ang < Math.PI * 0.97 ? meet(n.x + nA[0] * a.w, n.z + nA[1] * a.w, a.dx, a.dz, n.x + nB[0] * b.w, n.z + nB[1] * b.w, b.dx, b.dz) : null;
      const r = Math.min(a.fillet, b.fillet);
      if (m && m.s > -2 && m.t > -2) { a.trim = Math.max(a.trim, m.s + r); b.trim = Math.max(b.trim, m.t + r); }
      return { a, b, ang, nA, nB, m };
    });
    // never stop short by more than the junction needs, nor by most of a short segment; and at least the width of the
    // widest road crossing it, so lanes do not run into the other road
    const wide = Math.max(...ends.map((x) => x.w));
    ends.forEach((x) => { x.trim = Math.min(Math.max(x.trim, ends.length > 2 ? wide * 0.9 : x.trim), x.s.L * 0.45, 45); if (x.e.at === 'a') x.s.trimA = Math.max(x.s.trimA, x.trim); else x.s.trimB = Math.max(x.s.trimB, x.trim); });
    const { asphalt, corners } = junctionShape(n.x, n.z, ends);
    junctions.push({ node: n, x: n.x, z: n.z, asphalt, corners, spec: ends.map((x) => [x.dx, x.dz, x.w, x.W, x.trim]), ends: ends.map((x) => ({ seg: x.s.id, at: x.e.at })), round: ends.some((x) => x.s.roundabout) });
  });
  // roundabout islands: each closed ring of roundabout segments, its middle grassed and kerbed
  const islands = [], ringSegs = segs.filter((s) => s.roundabout), seen = new Set();
  ringSegs.forEach((s0) => {
    if (seen.has(s0)) return;
    const ring = [], q = [s0]; seen.add(s0);
    while (q.length) { const s = q.pop(); ring.push(s); [s.a, s.b].forEach((n) => n.ends.forEach(({ seg }) => { if (seg.roundabout && !seen.has(seg)) { seen.add(seg); q.push(seg); } })); }
    const pts = ring.flatMap((s) => s.pts), cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const rad = pts.reduce((a, p) => a + Math.hypot(p[0] - cx, p[1] - cz), 0) / pts.length, w = ring[0].prof.half;
    if (rad < w + 2 || rad > 120) return;
    // which side of each ring segment faces the island: no pavement there, a wide one outside
    ring.forEach((s) => { const m = along(s.pts, s.L / 2), left = (cx - m.x) * -m.dz + (cz - m.z) * m.dx > 0; s.paveL = left ? 0 : 2.2; s.paveR = left ? 2.2 : 0; s.ring = { x: cx, z: cz }; });
    const isl = []; for (let k = 0; k < 32; k++) { const a = (k / 32) * Math.PI * 2; isl.push([cx + Math.cos(a) * (rad - w - 0.3), cz + Math.sin(a) * (rad - w - 0.3)]); }
    islands.push({ x: cx, z: cz, r: rad - w - 0.3, pts: isl });
  });
  // what each segment's ends meet: a junction (stop or give way), a roundabout, or nothing (a dead end)
  const byNode = new Map(junctions.map((j) => [j.node.id, j]));
  segs.forEach((s) => {
    ['a', 'b'].forEach((at) => {
      const n = s[at], j = byNode.get(n.id);
      s[`end_${at}`] = !j ? (n.ends.length === 1 ? 'dead' : 'through') : s.roundabout ? 'ring' : j.round ? 'giveway' : n.ends.length >= 3 ? 'stop' : 'bend';
    });
    s.draw = cut(s.pts, s.trimA, s.trimB);
  });
  // elevation: a bridge (or the expressway's viaduct) is a deck 6.5 m up, 6 m more per level; a node it touches is up
  // there too, and an ordinary road meeting it ramps up to it over as much as 90 m
  const deckH = (layer) => 6.5 + (Math.max(1, layer) - 1) * 6;
  nodes.forEach((n) => { n.elev = elevate ? Math.max(0, ...n.ends.map((e) => (e.seg.bridge ? deckH(e.seg.layer) : 0))) : 0; });
  const ease = (t) => t * t * (3 - 2 * t);
  segs.forEach((s) => {
    const pts = s.draw, L = len(pts), cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    if (s.bridge && elevate) { s.elev = pts.map(() => deckH(s.layer)); return; }
    const ea = s.a.elev, eb = s.b.elev; if (!ea && !eb) return;
    const R = Math.min(90, Math.max(20, (L + s.trimA + s.trimB) * 0.9));
    s.elev = cum.map((d) => Math.max(ea * (1 - ease(Math.min(1, (d + s.trimA) / R))), eb * (1 - ease(Math.min(1, (L - d + s.trimB) / R)))));
  });
  junctions.forEach((j) => { j.elev = j.node.elev; });
  net.junctions = junctions; net.islands = islands;
  return net;
}

// ---------- drawing ----------
// heights: every surface 3 cm or more from the next, as the districts (world.js)
export const Y = { pave: 0.11, apron: 0.11, road: 0.14, junction: 0.14, island: 0.12, kerb: 0.2, paint: 0.17, joint: 0.125 };
function normals(pts) { return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1; return [-tz / l, tx / l]; }); }
function strip(out, pts, nrm, o0, o1, y, ev = null) {
  for (let i = 0; i < pts.length - 1; i++) {
    const P = (k, o) => [pts[k][0] + nrm[k][0] * o, y + (ev ? ev[k] : 0), pts[k][1] + nrm[k][1] * o];
    out(P(i, o0), P(i, o1), P(i + 1, o0)); out(P(i, o1), P(i + 1, o1), P(i + 1, o0));
  }
}
function line(out, pts, w, y, ev = null) { const n = normals(pts); strip(out, pts, n, -w / 2, w / 2, y, ev); }
function dashed(out, pts, w, y, on, off, phase = 0, ev = null) {
  let d = phase; const period = on + off;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.01) continue;
    const tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L, ea = ev ? ev[i] : 0, eb = ev ? ev[i + 1] : 0;
    for (let s = (period - (d % period)) % period; s < L; s += period) { const e = Math.min(L, s + on); if (e - s > 0.2) line(out, [[a[0] + tx * s, a[1] + tz * s], [a[0] + tx * e, a[1] + tz * e]], w, y, ev ? [ea + (eb - ea) * (s / L), ea + (eb - ea) * (e / L)] : null); }
    d += L;
  }
}
const shift = (pts, nrm, o) => pts.map((p, i) => [p[0] + nrm[i][0] * o, p[1] + nrm[i][1] * o]);

/**
 * Draw the network into triangle layers. `tri(layer, a, b, c)` receives [x,y,z] corners; layers: road, pave, kerb,
 * paint, island, paver, paverEdge. `side(a, b, y0, y1)` draws a vertical concrete face (a deck's edge) and
 * `pillar(x, z, y, w, ry)` a pillar under a deck. opts: { drive: 'left'|'right', detail: 0..2, keepSeg, keepJunction }.
 */
export function drawNetwork(net, tri, { drive = 'right', detail = 0, keepSeg = () => true, keepJunction = () => true, triangulate, side = null, pillar = null } = {}) {
  const T = (L) => (a, b, c) => tri(L, a, b, c);
  net.segs.forEach((s) => {
    if (!keepSeg(s)) return;
    const pts = s.draw; if (pts.length < 2) return;
    const nrm = normals(pts), P = s.prof, w = P.half, pl = s.paveL ?? P.pave, pr = s.paveR ?? P.pave, estate = P.kind === 'estate', ev = s.elev || null;
    const sh = (o) => shift(pts, nrm, o);
    // the carriageway (interlocking blocks on estate and service lanes), and a pavement each side
    if (estate && detail < 2) { strip(T('paver'), pts, nrm, -w + 0.38, w - 0.38, Y.road, ev); strip(T('paverEdge'), pts, nrm, w - 0.38, w, Y.road, ev); strip(T('paverEdge'), pts, nrm, -w, -w + 0.38, Y.road, ev); }
    else strip(T('road'), pts, nrm, -w, w, Y.road, ev);
    if (pl > 0.05) strip(T('pave'), pts, nrm, w, w + pl, Y.pave, ev);
    if (pr > 0.05) strip(T('pave'), pts, nrm, -w - pr, -w, Y.pave, ev);
    // a raised deck: concrete edges down its sides, a parapet along them, and pillars under it
    if (ev && side) {
      const oL = w + pl, oR = -w - pr, L = sh(oL), R = sh(oR);
      for (let i = 0; i < pts.length - 1; i++) {
        if (ev[i] < 1.2 && ev[i + 1] < 1.2) continue;
        side(L[i], L[i + 1], ev[i] - 1.1, ev[i + 1] - 1.1, ev[i] + 0.9, ev[i + 1] + 0.9, 1);
        side(R[i], R[i + 1], ev[i] - 1.1, ev[i + 1] - 1.1, ev[i] + 0.9, ev[i + 1] + 0.9, -1);
      }
      if (pillar && s.bridge) { let acc = (s.phase || 0) % 28; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], Lg = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let d = 28 - acc; d < Lg; d += 28) { const u = d / Lg; pillar(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, ev[i] + (ev[i + 1] - ev[i]) * u - 1.1, Math.min(2.4, w * 0.5), Math.atan2(b[0] - a[0], b[1] - a[1])); } acc = (acc + Lg) % 28; } }
    }
    if (detail >= 2) return;
    // kerbstones along both edges
    if (pl > 0.05) line(T('kerb'), sh(w + 0.09), 0.18, Y.kerb, ev);
    if (pr > 0.05) line(T('kerb'), sh(-w - 0.09), 0.18, Y.kerb, ev);
    if (estate) return;
    // paint (segments only: it stops where the junction begins)
    const paint = T('paint'), lanes = P.lanes, lw = P.lw, ph = s.phase || 0;
    if (P.edge) [-1, 1].forEach((sg) => line(paint, sh(sg * (w - 0.35 - (P.shoulder || 0))), 0.15, Y.paint, ev));
    if (s.oneway || s.roundabout) {
      for (let k = 1; k < lanes; k++) dashed(paint, sh(-w + 0.25 + (P.shoulder || 0) + k * lw), 0.13, Y.paint, 3, 6, ph, ev);
    } else {
      const per = Math.max(1, Math.floor(lanes / 2));
      if (P.centre === 'double' || P.centre === 'barrier') [-0.12, 0.12].forEach((o) => line(paint, sh(o), 0.1, Y.paint, ev));
      else if (P.centre === 'dashed' && lanes >= 2) dashed(paint, pts, 0.14, Y.paint, 3, 4.5, ph, ev);
      for (let k = 1; k < per; k++) [-1, 1].forEach((sg) => dashed(paint, sh(sg * k * lw), 0.13, Y.paint, 3, 6, ph, ev));
    }
    // at each end that meets a junction: the stop line across the lanes coming in, and a zebra just before it;
    // entering a roundabout, a give-way line instead
    ['a', 'b'].forEach((at) => {
      const kind = s[`end_${at}`]; if (!['stop', 'giveway'].includes(kind) || s[`cut_${at}`]) return;
      const end = at === 'a' ? pts[0] : pts[pts.length - 1], nb = at === 'a' ? pts[1] : pts[pts.length - 2], L = Math.hypot(nb[0] - end[0], nb[1] - end[1]) || 1;
      const ix = (nb[0] - end[0]) / L, iz = (nb[1] - end[1]) / L, nx = -iz, nz = ix, e0 = ev ? (at === 'a' ? ev[0] : ev[ev.length - 1]) : 0;
      // which half of the road carries traffic towards this junction: traffic coming in travels against (ix, iz), so it
      // keeps to the -n side where people drive on the right and the +n side where they drive on the left (Kenya)
      let o0 = -w + 0.3, o1 = w - 0.3;
      if (!s.oneway) { const pos = drive === 'left'; o0 = pos ? 0.2 : -w + 0.3; o1 = pos ? w - 0.3 : -0.2; }
      else if (at !== 'b') return; // a one-way road only arrives at its far end
      const sq = (u, a, b, ww) => line(paint, [[end[0] + ix * u + nx * a, end[1] + iz * u + nz * a], [end[0] + ix * u + nx * b, end[1] + iz * u + nz * b]], ww, Y.paint + e0);
      if (kind === 'stop') {
        if (pl > 0.5 || pr > 0.5) for (let q = -w + 0.5; q <= w - 0.5; q += 1.0) line(paint, [[end[0] + ix * 0.6 + nx * q, end[1] + iz * 0.6 + nz * q], [end[0] + ix * 3.4 + nx * q, end[1] + iz * 3.4 + nz * q]], 0.5, Y.paint + e0);
        sq(4.2, o0, o1, 0.4);
      } else {
        for (let q = o0; q < o1 - 0.4; q += 1.1) sq(1.2, q, q + 0.6, 0.3); // the dashed give-way line
      }
    });
  });
  // junctions: one piece of asphalt; the pavement corners and their kerbs
  net.junctions.forEach((j) => {
    if (!keepJunction(j)) return;
    const e = j.elev || 0;
    triangulate(j.asphalt).forEach(([a, b, c]) => tri('road', [a[0], Y.junction + e, a[1]], [b[0], Y.junction + e, b[1]], [c[0], Y.junction + e, c[1]]));
    j.corners.forEach((c) => {
      if (c.outer) for (let k = 0; k < c.inner.length - 1; k++) {
        const ka = Math.round((k / (c.inner.length - 1)) * (c.outer.length - 1)), kb = Math.round(((k + 1) / (c.inner.length - 1)) * (c.outer.length - 1));
        const A = c.inner[k], B = c.inner[k + 1], Ao = c.outer[ka], Bo = c.outer[kb];
        tri('pave', [A[0], Y.apron + e, A[1]], [Ao[0], Y.apron + e, Ao[1]], [B[0], Y.apron + e, B[1]]); tri('pave', [Ao[0], Y.apron + e, Ao[1]], [Bo[0], Y.apron + e, Bo[1]], [B[0], Y.apron + e, B[1]]);
      }
      if (detail < 2 && c.outer) line(T('kerb'), c.inner, 0.18, Y.kerb + e);
    });
  });
  // roundabout islands: grass, kerbed
  net.islands.forEach((isl) => {
    if (!keepJunction(isl)) return;
    triangulate(isl.pts).forEach(([a, b, c]) => tri('island', [a[0], Y.island, a[1]], [b[0], Y.island, b[1]], [c[0], Y.island, c[1]]));
    if (detail < 2) line(T('kerb'), [...isl.pts, isl.pts[0]], 0.25, Y.kerb);
  });
}

/**
 * Give every road its profile as the districts' `r.fit` (world.js, traffic.js, the lamps, the estates): its line every
 * 3 m with normals, and the profile's carriageway and pavements, the same all the way along (a roundabout's ring has
 * its pavement on the outside only).
 */
export function fitProfiles(roads, net) {
  const ring = new Map(); net.segs.forEach((s) => { if (s.ring && !ring.has(s.road)) ring.set(s.road, s); });
  roads.forEach((r) => {
    r.wClass = r.w;
    if (!isDriveable(r.cls) || r.pts.length < 2) { r.fit = null; return; }
    const P = profileOf(r), out = [r.pts[0]];
    for (let i = 1; i < r.pts.length; i++) { const a = r.pts[i - 1], b = r.pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3)); for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); }
    const nrm = out.map((p, i) => { const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1; return [-tz / l, tx / l, tx / l, tz / l]; });
    const rs = ring.get(r), pl = rs ? rs.paveL : P.pave, pr = rs ? rs.paveR : P.pave;
    r.fit = { pts: out, nrm, half: out.map(() => P.half), paveL: out.map(() => pl), paveR: out.map(() => pr), profile: P };
    r.w = 2 * P.half;
  });
}
