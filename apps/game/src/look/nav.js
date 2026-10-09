// Satnav for the district (world bible 9.2): a graph of the real streets and footways,
// A* between the nearest street points, and a route polyline that follows the roads.

export function createNav(roads) {
  const nodes = []; // {x, z, edges: [{to, w}]}
  const index = new Map();
  const keyOf = (x, z) => `${Math.round(x * 2)},${Math.round(z * 2)}`; // OSM junctions share coordinates
  function node(x, z) {
    const k = keyOf(x, z);
    if (index.has(k)) return index.get(k);
    const id = nodes.length;
    nodes.push({ x, z, edges: [] });
    index.set(k, id);
    return id;
  }
  const link = (a, b) => {
    if (a === b) return;
    const w = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z);
    nodes[a].edges.push({ to: b, w });
    nodes[b].edges.push({ to: a, w });
  };
  const segs = [];
  roads.forEach((r) => {
    let prev = null;
    r.pts.forEach(([x, z]) => {
      const id = node(x, z);
      if (prev !== null && prev !== id) { link(prev, id); segs.push([prev, id]); }
      prev = id;
    });
  });
  // close small gaps where a way ends near another street without sharing a node
  const ends = nodes.map((n, i) => i).filter((i) => nodes[i].edges.length === 1);
  ends.forEach((i) => {
    let best = -1, bd = 4;
    nodes.forEach((n, j) => {
      if (j === i || nodes[i].edges.some((e) => e.to === j)) return;
      const d = Math.hypot(n.x - nodes[i].x, n.z - nodes[i].z);
      if (d < bd) { bd = d; best = j; }
    });
    if (best >= 0) { link(i, best); segs.push([i, best]); }
  });

  // nearest point on any street segment
  function snap(x, z) {
    let best = null, bd = Infinity;
    for (const [a, b] of segs) {
      const A = nodes[a], B = nodes[b], dx = B.x - A.x, dz = B.z - A.z;
      const t = Math.max(0, Math.min(1, ((x - A.x) * dx + (z - A.z) * dz) / (dx * dx + dz * dz || 1)));
      const px = A.x + dx * t, pz = A.z + dz * t, d = Math.hypot(x - px, z - pz);
      if (d < bd) { bd = d; best = { a, b, t, x: px, z: pz, d }; }
    }
    return best;
  }

  function astar(startEdges, goal, goalEdges) {
    // startEdges / goalEdges: [{id, w}] links from the temporary snapped points
    const g = new Map(), came = new Map(), open = new Set();
    const h = (i) => Math.hypot(nodes[i].x - goal.x, nodes[i].z - goal.z);
    const goalCost = new Map(goalEdges.map((e) => [e.id, e.w]));
    startEdges.forEach((e) => { g.set(e.id, e.w); came.set(e.id, -1); open.add(e.id); });
    let bestEnd = null, bestTotal = Infinity;
    while (open.size) {
      let cur = -1, cf = Infinity;
      open.forEach((i) => { const f = g.get(i) + h(i); if (f < cf) { cf = f; cur = i; } });
      if (cf >= bestTotal) break;
      open.delete(cur);
      if (goalCost.has(cur)) {
        const total = g.get(cur) + goalCost.get(cur);
        if (total < bestTotal) { bestTotal = total; bestEnd = cur; }
      }
      for (const e of nodes[cur].edges) {
        const ng = g.get(cur) + e.w;
        if (ng < (g.get(e.to) ?? Infinity)) { g.set(e.to, ng); came.set(e.to, cur); open.add(e.to); }
      }
    }
    if (bestEnd === null) return null;
    const path = [];
    for (let i = bestEnd; i !== -1 && i !== undefined; i = came.get(i)) path.unshift(i);
    return path;
  }

  // a route from one point to another along the streets, as [{x, z}, ...]
  function route(from, to) {
    const s = snap(from.x, from.z), t = snap(to.x, to.z);
    if (!s || !t) return null;
    const pts = [{ x: from.x, z: from.z }, { x: s.x, z: s.z }];
    if (s.a === t.a && s.b === t.b) {
      pts.push({ x: t.x, z: t.z }, { x: to.x, z: to.z });
      return pts;
    }
    const len = (p, i) => Math.hypot(p.x - nodes[i].x, p.z - nodes[i].z);
    const path = astar([{ id: s.a, w: len(s, s.a) }, { id: s.b, w: len(s, s.b) }], t, [{ id: t.a, w: len(t, t.a) }, { id: t.b, w: len(t, t.b) }]);
    if (!path) return null;
    path.forEach((i) => pts.push({ x: nodes[i].x, z: nodes[i].z }));
    pts.push({ x: t.x, z: t.z }, { x: to.x, z: to.z });
    return pts;
  }

  return { route, snap, nodes: () => nodes.length };
}

// distance from a point to a polyline, and how far along it that point is
export function nearestOn(pts, x, z) {
  let best = { d: Infinity, along: 0, i: 0 };
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i], B = pts[i + 1], dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz) || 1e-6;
    const t = Math.max(0, Math.min(1, ((x - A.x) * dx + (z - A.z) * dz) / (L * L)));
    const d = Math.hypot(x - A.x - dx * t, z - A.z - dz * t);
    if (d < best.d) best = { d, along: acc + L * t, i };
    acc += L;
  }
  return best;
}

export function pathLength(pts) {
  let L = 0;
  for (let i = 0; i < pts.length - 1; i++) L += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
  return L;
}

// point and heading at a distance along a polyline
export function pointAlong(pts, s) {
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i], B = pts[i + 1], L = Math.hypot(B.x - A.x, B.z - A.z);
    if (s <= L || i === pts.length - 2) {
      const t = L ? Math.min(1, s / L) : 0;
      return { x: A.x + (B.x - A.x) * t, z: A.z + (B.z - A.z) * t, yaw: Math.atan2(B.x - A.x, B.z - A.z) };
    }
    s -= L;
  }
  return null;
}
