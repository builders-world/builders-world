// Navigation (world bible 7.6): a map of where people can walk, and paths across it.
// Mapping: every collider in the district (building footprints, fences, trees, poles, stalls) is
// rasterised into a 0.5 m occupancy grid, grown by a walker's radius so a path never brushes a wall.
// Localisation: anyone's position is a cell in that grid. Planning: A* over the grid with costs that
// encode the movement rules, then the path is pulled tight with line-of-sight checks.
//
// Movement rules, as costs:
//   pavement and open ground   1    where people walk
//   carriageway                6    crossing is fine, walking down the middle of the road is not
//   a private lawn             4    only to reach that house (fences funnel you through the gate)
//   next to a wall or fence   +1.5  keep a little clearance, as people do
//   building, fence, prop      ∞    never

const CELL = 0.5, AGENT = 0.42;

export function buildNavGrid({ R, solids, boxes, roads, lots, pointInPoly, nearestOnPoly }) {
  const half = R * 1.08, N = Math.ceil((half * 2) / CELL);
  const cost = new Float32Array(N * N).fill(1);
  const BLOCK = Infinity;
  const toCell = (x, z) => [Math.floor((x + half) / CELL), Math.floor((z + half) / CELL)];
  const center = (i, j) => [-half + (i + 0.5) * CELL, -half + (j + 0.5) * CELL];
  const each = (x0, z0, x1, z1, fn) => {
    const [i0, j0] = toCell(x0, z0), [i1, j1] = toCell(x1, z1);
    for (let j = Math.max(0, j0); j <= Math.min(N - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(N - 1, i1); i++) fn(i, j, j * N + i);
  };
  // outside the district
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const [x, z] = center(i, j); if (Math.hypot(x, z) > R * 1.03) cost[j * N + i] = BLOCK; }
  // carriageways
  roads.forEach((r) => {
    if (!r.fit) return;
    const { pts, half: hw } = r.fit;
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], h = Math.max(hw[k], hw[k + 1]);
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      each(Math.min(ax, bx) - h, Math.min(az, bz) - h, Math.max(ax, bx) + h, Math.max(az, bz) + h, (i, j, c) => {
        if (cost[c] !== 1) return;
        const [x, z] = center(i, j), u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
        if (Math.hypot(x - ax - dx * u, z - az - dz * u) < h) cost[c] = 6;
      });
    }
  });
  // private lots
  lots.forEach((l) => each(l.bb.x0, l.bb.z0, l.bb.x1, l.bb.z1, (i, j, c) => { if (cost[c] === 1) { const [x, z] = center(i, j); if (pointInPoly(x, z, l.pts)) cost[c] = 4; } }));
  // solid things, grown by the walker's radius
  solids.forEach((s) => each(s.bb.x0 - AGENT, s.bb.z0 - AGENT, s.bb.x1 + AGENT, s.bb.z1 + AGENT, (i, j, c) => {
    const [x, z] = center(i, j);
    if (pointInPoly(x, z, s.pts) || nearestOnPoly(x, z, s.pts).d < AGENT) cost[c] = BLOCK;
  }));
  boxes.forEach((b) => {
    const r = Math.hypot(b.hx, b.hz) + AGENT, cs = Math.cos(b.ry || 0), sn = Math.sin(b.ry || 0);
    each(b.cx - r, b.cz - r, b.cx + r, b.cz + r, (i, j, c) => {
      const [x, z] = center(i, j), dx = x - b.cx, dz = z - b.cz;
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      const qx = Math.max(-b.hx, Math.min(b.hx, lx)), qz = Math.max(-b.hz, Math.min(b.hz, lz));
      if (Math.hypot(lx - qx, lz - qz) < AGENT) cost[c] = BLOCK;
    });
  });
  // soft clearance beside anything solid
  const soft = new Float32Array(N * N);
  for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
    const c = j * N + i;
    if (cost[c] === BLOCK) continue;
    if (cost[c - 1] === BLOCK || cost[c + 1] === BLOCK || cost[c - N] === BLOCK || cost[c + N] === BLOCK) soft[c] = 1.5;
  }
  for (let c = 0; c < N * N; c++) if (cost[c] !== BLOCK) cost[c] += soft[c];

  const blocked = (i, j) => i < 0 || j < 0 || i >= N || j >= N || cost[j * N + i] === BLOCK;

  // connected areas: a fully fenced garden is its own little island, so a goal must be snapped onto
  // the island the walker is on, or the search would hunt the whole map for a way in
  const island = new Int32Array(N * N).fill(-1);
  {
    let id = 0; const q = [];
    for (let c0 = 0; c0 < N * N; c0++) {
      if (cost[c0] === BLOCK || island[c0] >= 0) continue;
      island[c0] = id; q.push(c0);
      while (q.length) { const c = q.pop(), i = c % N, j = (c - i) / N; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj, nc = jj * N + ii; if (!blocked(ii, jj) && island[nc] < 0) { island[nc] = id; q.push(nc); } } }
      id++;
    }
  }
  // nearest walkable cell to a point (a click on a wall, someone pushed into a corner), on a given island
  function free(i, j, on = -1) {
    const ok = (a, b) => !blocked(a, b) && (on < 0 || island[b * N + a] === on);
    if (ok(i, j)) return [i, j];
    for (let r = 1; r < 60; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      if (ok(i + di, j + dj)) return [i + di, j + dj];
    }
    return null;
  }

  // straight line between two cells that never touches a blocked cell, nor a dearer cell than either end
  function sight(a, b) {
    let [i0, j0] = a; const [i1, j1] = b;
    const limit = Math.max(cost[j0 * N + i0], cost[j1 * N + i1]) + 0.01;
    const di = Math.abs(i1 - i0), dj = Math.abs(j1 - j0), si = i0 < i1 ? 1 : -1, sj = j0 < j1 ? 1 : -1;
    let err = di - dj;
    for (;;) {
      const c = cost[j0 * N + i0];
      if (c === BLOCK || c > limit) return false;
      if (i0 === i1 && j0 === j1) return true;
      const e2 = 2 * err;
      // moving diagonally: both side cells must be open, or the line squeezes past a corner
      if (e2 > -dj && e2 < di && (blocked(i0 + si, j0) || blocked(i0, j0 + sj))) return false;
      if (e2 > -dj) { err -= dj; i0 += si; }
      if (e2 < di) { err += di; j0 += sj; }
    }
  }

  const g = new Float32Array(N * N), came = new Int32Array(N * N), seen = new Uint32Array(N * N), closed = new Uint32Array(N * N);
  let hf = new Float64Array(1 << 16), hc = new Int32Array(1 << 16);
  const DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1], DW = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];
  let stamp = 0;

  /** A walkable path from a to b as [{x, z}], or null. maxNodes bounds the search on a huge map. */
  function plan(a, b, { maxNodes = 400000 } = {}) {
    const s = free(...toCell(a.x, a.z)); if (!s) return null;
    const t = free(...toCell(b.x, b.z), island[s[1] * N + s[0]]); if (!t) return null;
    stamp++;
    const S = s[1] * N + s[0], T = t[1] * N + t[0];
    // weighted A*: the estimate counts each step as pavement and leans on it 1.6x, which finds a good
    // path in a fraction of the time on a big map; the line-of-sight pass below tidies what is left
    const h = (c) => { const di = Math.abs((c % N) - t[0]), dj = Math.abs(Math.floor(c / N) - t[1]); return 1.6 * (Math.max(di, dj) + (Math.SQRT2 - 1) * Math.min(di, dj)); };
    let size = 0;
    const push = (f, c) => {
      if (size >= hf.length) { const nf = new Float64Array(hf.length * 2), nc = new Int32Array(hf.length * 2); nf.set(hf); nc.set(hc); hf = nf; hc = nc; }
      let k = size++;
      while (k) { const p = (k - 1) >> 1; if (hf[p] <= f) break; hf[k] = hf[p]; hc[k] = hc[p]; k = p; }
      hf[k] = f; hc[k] = c;
    };
    const pop = () => {
      const c = hc[0], lf = hf[--size], lc = hc[size];
      let k = 0;
      for (;;) { const l = 2 * k + 1, r = l + 1; let m = -1, mf = lf; if (l < size && hf[l] < mf) { m = l; mf = hf[l]; } if (r < size && hf[r] < mf) { m = r; } if (m < 0) break; hf[k] = hf[m]; hc[k] = hc[m]; k = m; }
      hf[k] = lf; hc[k] = lc;
      return c;
    };
    g[S] = 0; came[S] = -1; seen[S] = stamp; closed[S] = 0; push(h(S), S);
    let n = 0, found = false;
    while (size && n++ < maxNodes) {
      const c = pop();
      if (c === T) { found = true; break; }
      if (closed[c] === stamp) continue;
      closed[c] = stamp;
      const ci = c % N, cj = (c - ci) / N;
      for (let d = 0; d < 8; d++) {
        const di = DX[d], dj = DZ[d], i = ci + di, j = cj + dj;
        if (blocked(i, j)) continue;
        if (di && dj && (blocked(ci + di, cj) || blocked(ci, cj + dj))) continue; // no cutting corners
        const nc = j * N + i;
        if (closed[nc] === stamp) continue;
        const ng = g[c] + DW[d] * (cost[nc] + cost[c]) * 0.5;
        if (seen[nc] === stamp && ng >= g[nc]) continue;
        seen[nc] = stamp; g[nc] = ng; came[nc] = c; push(ng + h(nc), nc);
      }
    }
    if (!found) return null;
    const cells = [];
    for (let c = T; c !== -1; c = came[c]) cells.push([c % N, Math.floor(c / N)]);
    cells.reverse();
    // pull the path tight: keep a corner only where the line of sight breaks
    const out = [cells[0]];
    let anchor = 0;
    for (let k = 2; k < cells.length; k++) if (!sight(cells[anchor], cells[k])) { out.push(cells[k - 1]); anchor = k - 1; }
    out.push(cells[cells.length - 1]);
    const pts = out.map(([i, j]) => { const [x, z] = center(i, j); return { x, z }; });
    pts[0] = { x: a.x, z: a.z };
    { const [bi, bj] = toCell(b.x, b.z); if (!blocked(bi, bj) && island[bj * N + bi] === island[s[1] * N + s[0]]) pts[pts.length - 1] = { x: b.x, z: b.z }; }
    return pts;
  }

  // debug: how many cells can be reached from a point, and how many are walkable at all
  function reach(a) {
    const s = free(...toCell(a.x, a.z)); if (!s) return { reach: 0 };
    const vis = new Uint8Array(N * N), q = [s[1] * N + s[0]]; vis[q[0]] = 1; let n = 0;
    while (q.length) { const c = q.pop(); n++; const i = c % N, j = (c - i) / N; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (!blocked(ii, jj) && !vis[jj * N + ii]) { vis[jj * N + ii] = 1; q.push(jj * N + ii); } } }
    let walk = 0; for (let c = 0; c < N * N; c++) if (cost[c] !== BLOCK) walk++;
    return { reach: n, walk, N };
  }
  const costAt = (x, z) => { const [i, j] = toCell(x, z); return blocked(i, j) ? Infinity : cost[j * N + i]; };
  return { plan, costAt, reach, cell: CELL, size: N };
}
