import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { wetGroundMaterial } from './surfaces.js';
import { signTexture } from './props.js';
import { vehicle } from './traffic.js';
import { mulberry32 } from '../mesh.js';

// Greenrey (Elvis's name for this change, 10 October 2026, so it can be tracked and switched off as one):
// grass only where it belongs. The narrow gaps between buildings stay grass; every large piece of open
// land becomes what it would be in Lagos: red laterite earth, a paved yard or car park where it fronts a
// road, and fenced plots with a building going up. Grass never shines, wet or dry (surfaces.js).
// Switch: ?greenrey=0, or localStorage bw-greenrey = '0'.

export function greenreyOn() {
  try {
    const q = new URLSearchParams(location.search).get('greenrey');
    if (q != null) return q !== '0';
    return localStorage.getItem('bw-greenrey') !== '0';
  } catch { return true; }
}

// with Greenrey on, the bare ground is laterite (world.js); grass is painted only where it belongs
export const EARTH = '#a8715a';
const GRASS = '#86bf5a', PAVING = '#c9c2b3', BAY = '#f3eee2';
const DEEP = 9; // metres from anything built before land counts as "large open land"
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

export function buildGreenrey({ renderer, scene, world, group, park = null }) {
  if (!greenreyOn() || !renderer) return null;
  const R = world.radius, E = Math.min(R * 1.06, 320), N = 384, cell = (2 * E) / N;
  const rnd = mulberry32(7331);

  // ---------- 1. what is built: draw the finished district once from straight above ----------
  // Everything that is not the bare base ground (roads, lots, lawns, pads, venues, water) counts as built.
  // The road colour is read separately so yards and car parks can face a road.
  const ground = new THREE.Color(world.groundColor || '#79a85a'), road = new THREE.Color(world.roadColor || '#8a8781');
  const mask = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide });
  mask.onBeforeCompile = (sh) => {
    sh.uniforms.uG = { value: ground }; sh.uniforms.uR = { value: road };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uG; uniform vec3 uR;')
      .replace('#include <opaque_fragment>', `
        #ifdef USE_COLOR
          vec3 vc = vColor.rgb;
        #else
          vec3 vc = vec3(-1.0);
        #endif
        float isGround = step(distance(vc, uG), 0.012);
        float isRoad = step(distance(vc, uR), 0.012);
        gl_FragColor = vec4(1.0 - isGround, isRoad, 0.0, 1.0);`);
  };
  mask.customProgramCacheKey = () => 'bw-greenrey-mask';
  const cam = new THREE.OrthographicCamera(-E, E, E, -E, 0.5, 60);
  cam.position.set(0, 55, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
  const rt = new THREE.WebGLRenderTarget(N, N, { depthBuffer: true });
  const hidden = [];
  scene.traverse((o) => { if (o.visible && (o.isPoints || o.isLine || o.isSprite)) { o.visible = false; hidden.push(o); } });
  const prev = { bg: scene.background, ov: scene.overrideMaterial, fog: scene.fog, target: renderer.getRenderTarget(), clear: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha() };
  scene.background = null; scene.fog = null; scene.overrideMaterial = mask;
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, cam);
  const px = new Uint8Array(N * N * 4); renderer.readRenderTargetPixels(rt, 0, 0, N, N, px);
  renderer.setRenderTarget(prev.target); renderer.setClearColor(prev.clear, prev.alpha);
  scene.background = prev.bg; scene.fog = prev.fog; scene.overrideMaterial = prev.ov;
  hidden.forEach((o) => { o.visible = true; }); rt.dispose(); mask.dispose();

  // cell (i, j): i along x, j along z; the read-back's row 0 is the bottom of the picture, which is +z
  const X = (i) => -E + (i + 0.5) * cell, Z = (j) => -E + (j + 0.5) * cell;
  const built = new Uint8Array(N * N), isRoad = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = ((N - 1 - j) * N + i) * 4, c = j * N + i;
    built[c] = px[k] > 127 ? 1 : 0; isRoad[c] = px[k + 1] > 127 ? 1 : 0;
  }
  // small built specks in the open (a tree, a lamp, a passer-by) do not break up the land around them
  const lab = new Int32Array(N * N).fill(-1), q = new Int32Array(N * N);
  for (let s = 0; s < N * N; s++) {
    if (!built[s] || lab[s] >= 0) continue;
    let h = 0, t = 0; q[t++] = s; lab[s] = s;
    while (h < t) { const c = q[h++], i = c % N, j = (c - i) / N; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; const n = jj * N + ii; if (built[n] && lab[n] < 0) { lab[n] = s; q[t++] = n; } } }
    if (t * cell * cell < 14) for (let k = 0; k < t; k++) built[q[k]] = 0;
  }

  // ---------- 2. how far each spot is from anything built (chamfer distance, metres) ----------
  const dist = (seed) => {
    const d = new Float32Array(N * N);
    for (let c = 0; c < N * N; c++) d[c] = seed[c] ? 0 : 1e9;
    const a = cell, b = cell * Math.SQRT2;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const c = j * N + i; let v = d[c]; if (i > 0) v = Math.min(v, d[c - 1] + a); if (j > 0) { v = Math.min(v, d[c - N] + a); if (i > 0) v = Math.min(v, d[c - N - 1] + b); if (i < N - 1) v = Math.min(v, d[c - N + 1] + b); } d[c] = v; }
    for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) { const c = j * N + i; let v = d[c]; if (i < N - 1) v = Math.min(v, d[c + 1] + a); if (j < N - 1) { v = Math.min(v, d[c + N] + a); if (i < N - 1) v = Math.min(v, d[c + N + 1] + b); if (i > 0) v = Math.min(v, d[c + N - 1] + b); } d[c] = v; }
    return d;
  };
  const dBuilt = dist(built), dRoad = dist(isRoad);
  // large open land: everything within DEEP of a spot that is itself DEEP from anything built
  const deep = new Uint8Array(N * N); for (let c = 0; c < N * N; c++) deep[c] = dBuilt[c] >= DEEP ? 1 : 0;
  const dDeep = dist(deep);
  const open = new Uint8Array(N * N); for (let c = 0; c < N * N; c++) open[c] = !built[c] && dDeep[c] <= DEEP + cell ? 1 : 0;

  // ---------- 3. each piece of open land, and what it becomes ----------
  const zone = new Int32Array(N * N).fill(-1), zones = [];
  for (let s = 0; s < N * N; s++) {
    if (!open[s] || zone[s] >= 0) continue;
    const id = zones.length, cells = []; let h = 0; const qq = [s]; zone[s] = id;
    while (h < qq.length) { const c = qq[h++]; cells.push(c); const i = c % N, j = (c - i) / N; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; const n = jj * N + ii; if (open[n] && zone[n] < 0) { zone[n] = id; qq.push(n); } } }
    const area = cells.length * cell * cell, nearRoad = cells.filter((c) => dRoad[c] < 3).length;
    let cx = 0, cz = 0; cells.forEach((c) => { cx += X(c % N); cz += Z((c - (c % N)) / N); }); cx /= cells.length; cz /= cells.length;
    // a small piece facing a road is a paved yard; anything bigger is laterite with plots and car parks cut into it
    const use = area < 260 ? 'grass' : nearRoad > 6 && area < 2200 ? 'paving' : 'laterite';
    zones.push({ id, cells, area, use, cx, cz });
  }

  // grow each piece out to the plots and roads around it (up to 7 m), so its edges run along them instead of
  // stopping short in a rounded blob; the narrow gaps it does not reach stay grass
  {
    const reach = new Float32Array(N * N).fill(1e9), qg = [];
    for (let c = 0; c < N * N; c++) if (zone[c] >= 0) { reach[c] = 0; qg.push(c); }
    for (let h = 0; h < qg.length; h++) {
      const c = qg[h], i = c % N, j = (c - i) / N;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
        const n = jj * N + ii, r = reach[c] + cell;
        if (built[n] || zone[n] >= 0 || r > 7) continue;
        reach[n] = r; zone[n] = zone[c]; zones[zone[c]].cells.push(n); qg.push(n);
      }
    }
  }
  const useAt = (c) => zones[zone[c]]?.use ?? null;

  // the direction of the road nearest a spot, so plots and parking line up with the street
  const segs = []; (world.roads || []).forEach((r) => { if (!r.fit) return; const { pts, half } = r.fit; for (let k = 0; k < pts.length - 1; k++) segs.push([pts[k], pts[k + 1], half[k]]); });
  const nearestRoad = (x, z) => { let best = null, bd = 1e9; for (const [a, b] of segs) { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); const d = Math.hypot(x - a[0] - dx * u, z - a[1] - dz * u); if (d < bd) { bd = d; best = { ang: Math.atan2(dx, dz), px: a[0] + dx * u, pz: a[1] + dz * u, d }; } } return best; };
  const cellOf = (x, z) => { const i = Math.floor((x + E) / cell), j = Math.floor((z + E) / cell); return i < 0 || j < 0 || i >= N || j >= N ? -1 : j * N + i; };
  const taken = new Uint8Array(N * N);
  // does a w x d rectangle at (x, z), turned ang, sit wholly on this zone's open land with a margin?
  const fits = (zid, x, z, ang, w, d, margin) => { const cs = Math.cos(ang), sn = Math.sin(ang); for (let u = -w / 2 - margin; u <= w / 2 + margin; u += cell) for (let v = -d / 2 - margin; v <= d / 2 + margin; v += cell) { const c = cellOf(x + u * cs + v * sn, z - u * sn + v * cs); if (c < 0 || zone[c] !== zid || taken[c]) return false; } return true; };
  const take = (x, z, ang, w, d, margin) => { const cs = Math.cos(ang), sn = Math.sin(ang); for (let u = -w / 2 - margin; u <= w / 2 + margin; u += cell * 0.7) for (let v = -d / 2 - margin; v <= d / 2 + margin; v += cell * 0.7) { const c = cellOf(x + u * cs + v * sn, z - u * sn + v * cs); if (c >= 0) taken[c] = 1; } };
  // candidate spots in a zone: nearest the road first (a plot or a car park fronts the street)
  const spots = (z) => z.cells.filter((c, k) => k % 3 === 0).sort((a, b) => dRoad[a] - dRoad[b]);
  const placeRect = (z, w, d, margin, minRoad) => {
    for (const c of spots(z)) {
      if (dRoad[c] < minRoad) continue;
      const x = X(c % N), zz = Z((c - (c % N)) / N), nr = nearestRoad(x, zz); if (!nr) continue;
      const ang = nr.ang - Math.PI / 2; // the rectangle's long side (u) along the road, its depth (v) away from it
      if (fits(z.id, x, zz, ang, w, d, margin)) { take(x, zz, ang, w, d, margin); return { x, z: zz, ang, face: Math.atan2(nr.px - x, nr.pz - zz) }; }
    }
    return null;
  };

  const out = new THREE.Group(); out.name = 'greenrey'; group.add(out);
  const cols = [], claims = [], plots = [], parks = [];
  // car parks first (they want the road frontage), then plots behind them
  zones.filter((z) => z.use !== 'grass').sort((a, b) => b.area - a.area).forEach((z) => {
    if (z.cells.some((c) => dRoad[c] < 3)) for (const len of [30, 20, 12.5]) { const p = placeRect(z, len, 11, 1.5, 0.5); if (p) { parks.push({ ...p, len }); break; } }
    if (z.use !== 'laterite') return;
    const n = Math.min(4, Math.floor(z.area / 900));
    for (let k = 0; k < n && plots.length < 22; k++) { const w = 16 + Math.floor(rnd() * 3) * 2, d = 14 + Math.floor(rnd() * 2) * 2; const p = placeRect(z, w, d, 2.5, 2); if (p) plots.push({ ...p, w, d, kind: plots.length }); }
  });

  // ---------- 4. the ground: each surface traced smooth from the cells (marching squares) ----------
  const surface = (pick, color, y, vary = 0) => {
    // soften the cell edges: a 5 x 5 average, then trace the 0.5 line
    const f = new Float32Array(N * N); for (let c = 0; c < N * N; c++) f[c] = pick(c) ? 1 : 0;
    const g = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let s = 0, n = 0; for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; s += f[jj * N + ii]; n++; } g[j * N + i] = f[j * N + i] && s / n > 0.25 ? Math.max(0.5, s / n) : Math.min(0.49, s / n); }
    const P = []; const col = new THREE.Color(color);
    const v = (i, j) => g[Math.max(0, Math.min(N - 1, j)) * N + Math.max(0, Math.min(N - 1, i))];
    const tri = (a, b, c) => P.push(a[0], y, a[1], b[0], y, b[1], c[0], y, c[1]);
    for (let j = 0; j < N - 1; j++) {
      let run = -1;
      for (let i = 0; i <= N - 1; i++) {
        const full = i < N - 1 && v(i, j) >= 0.5 && v(i + 1, j) >= 0.5 && v(i, j + 1) >= 0.5 && v(i + 1, j + 1) >= 0.5;
        if (full) { if (run < 0) run = i; continue; }
        if (run >= 0) { const x0 = X(run), x1 = X(i), z0 = Z(j), z1 = Z(j + 1); tri([x0, z0], [x0, z1], [x1, z1]); tri([x0, z0], [x1, z1], [x1, z0]); run = -1; }
        if (i >= N - 1) continue;
        // a partial cell: walk its corners in order, keeping inside corners and edge crossings, then fan
        const C = [[i, j], [i, j + 1], [i + 1, j + 1], [i + 1, j]], poly = [];
        for (let k = 0; k < 4; k++) {
          const [ai, aj] = C[k], [bi, bj] = C[(k + 1) % 4], va = v(ai, aj), vb = v(bi, bj);
          if (va >= 0.5) poly.push([X(ai), Z(aj)]);
          if ((va >= 0.5) !== (vb >= 0.5)) { const t = (0.5 - va) / (vb - va); poly.push([X(ai) + (X(bi) - X(ai)) * t, Z(aj) + (Z(bj) - Z(aj)) * t]); }
        }
        for (let k = 1; k + 1 < poly.length; k++) tri(poly[0], poly[k], poly[k + 1]);
      }
    }
    if (!P.length) return null;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    const C2 = []; for (let k = 0; k < P.length / 3; k++) { const s = 1 + (vary ? (Math.sin(P[k * 3] * 0.07) * Math.cos(P[k * 3 + 2] * 0.05)) * vary : 0); C2.push(col.r * s, col.g * s, col.b * s); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(C2, 3)); geo.computeVertexNormals();
    return geo;
  };
  // a decal on the ground's own plane, pulled forward so it always beats the base ground; lawns (3 cm up) and paths still win
  const mat = wetGroundMaterial(); mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -4;
  // grass in the narrow gaps between buildings inside the district, paving on yards and forecourts; the rest is the earth itself
  // parks keep their grass: the park round the pond, the picnic lawn and the community garden
  const greens = (world.claims || []).filter((c) => c.kind === 'recreation');
  const inPark = (x, z) => (park && ((x - park.x) / (park.rx + 7)) ** 2 + ((z - park.z) / (park.rz + 7)) ** 2 < 1) || greens.some((c) => Math.abs(x - c.cx) < c.hx + 1.5 && Math.abs(z - c.cz) < c.hz + 1.5);
  const grass = surface((c) => { if (built[c]) return false; const x = X(c % N), z = Z((c - (c % N)) / N); return (zone[c] < 0 && Math.hypot(x, z) < R) || inPark(x, z); }, GRASS, 0);
  const pav = surface((c) => zone[c] >= 0 && useAt(c) === 'paving' && !inPark(X(c % N), Z((c - (c % N)) / N)), PAVING, 0);
  // grass and paving are separate decals, paving pulled further forward so their soft edges never fight
  [[grass, -4], [pav, -8]].forEach(([geo, units], k) => {
    if (!geo) return;
    const m = new THREE.Mesh(geo, k ? (() => { const p2 = wetGroundMaterial(); p2.polygonOffset = true; p2.polygonOffsetFactor = -1; p2.polygonOffsetUnits = units; return p2; })() : mat);
    m.receiveShadow = true; m.name = k ? 'greenrey_paving' : 'greenrey_grass'; out.add(m);
  });

  // ---------- 5. car parks: a concrete apron, painted bays, a few cars ----------
  const paint = [], apron = [];
  parks.forEach((p, n) => {
    const cs = Math.cos(p.ang), sn = Math.sin(p.ang), at = (u, v) => [p.x + u * cs + v * sn, p.z - u * sn + v * cs];
    const front = Math.cos(p.face - p.ang) > 0 ? 1 : -1; // the road is on this side of v
    const a = box(p.len, 0.04, 11, 0, 0.03, 0); a.rotateY(p.ang); a.translate(p.x, 0, p.z); apron.push(a);
    // bays at the back, 5 m deep; the aisle between them and the road
    const bays = Math.floor(p.len / 2.5);
    for (let b = 0; b <= bays; b++) { const [x, z] = at(-p.len / 2 + b * 2.5, -front * 3); const l = box(0.1, 0.02, 5, 0, 0.06, 0); l.rotateY(p.ang); l.translate(x, 0, z); paint.push(l); }
    { const [x, z] = at(0, -front * 0.5); const l = box(p.len, 0.02, 0.1, 0, 0.06, 0); l.rotateY(p.ang); l.translate(x, 0, z); paint.push(l); }
    // cars in about half the bays, nosed in
    for (let b = 0; b < bays; b++) {
      if (rnd() > 0.55) continue;
      const kind = ['saloon', 'hatch', 'suv', 'taxi', 'saloon', 'pickup'][Math.floor(rnd() * 6)], car = vehicle(kind, n * 7 + b);
      const [x, z] = at(-p.len / 2 + b * 2.5 + 1.25, -front * 3); car.position.set(x, 0, z); car.rotation.y = p.ang + (front > 0 ? Math.PI : 0);
      out.add(car); cols.push({ name: 'parked_car', cx: x, cz: z, hx: 1.0, hz: 2.3, ry: car.rotation.y, h: 1.5 });
    }
    claims.push({ kind: 'car_park', cx: p.x, cz: p.z, hx: p.len / 2, hz: 5.5, ry: p.ang });
  });
  if (apron.length) out.add(new THREE.Mesh(mergeGeometries(apron), new THREE.MeshStandardMaterial({ color: 0xbdb6a7, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 })));
  if (paint.length) out.add(new THREE.Mesh(mergeGeometries(paint), new THREE.MeshBasicMaterial({ color: BAY })));

  // ---------- 6. plots: a block wall with a gate, a frame going up, sand and blocks, the sign ----------
  const SIGNS = [['THIS LAND IS NOT FOR SALE', 'Beware of 419'], ['BUILDING IN PROGRESS', 'Approved by LASPPPA'], ['PLOT FOR SALE', 'Enquire within'], ['COMING SOON', 'Builders Hub annex']];
  const wallG = [], frameG = [], slabG = [], blockG = [], sandG = [];
  plots.forEach((p) => {
    const cs = Math.cos(p.ang), sn = Math.sin(p.ang), at = (u, v) => [p.x + u * cs + v * sn, p.z - u * sn + v * cs];
    const put = (arr, g, u, v) => { g.rotateY(p.ang); const [x, z] = at(u, v); g.translate(x, 0, z); arr.push(g); };
    // the side facing the road keeps a 4 m gate gap in the middle
    const front = Math.cos(p.face - p.ang) > 0 ? 1 : -1, W2 = p.w / 2, D2 = p.d / 2, H = 1.9;
    [[0, -front * D2, p.w, 0.2, false], [-W2, 0, 0.2, p.d, true], [W2, 0, 0.2, p.d, true]].forEach(([u, v, w, d]) => { put(wallG, box(w, H, d, 0, H / 2, 0), u, v); const [x, z] = at(u, v); cols.push({ name: 'plot_wall', cx: x, cz: z, hx: w / 2, hz: d / 2, ry: p.ang }); });
    [-1, 1].forEach((s) => { const w = W2 - 2; const u = s * (2 + w / 2); put(wallG, box(w, H, 0.2, 0, H / 2, 0), u, front * D2); const [x, z] = at(u, front * D2); cols.push({ name: 'plot_wall', cx: x, cz: z, hx: w / 2, hz: 0.1, ry: p.ang }); });
    // the frame: columns on a 4 m grid, a ground slab, a first-floor slab, columns starting up the second
    const fw = Math.min(p.w - 6, 11), fd = Math.min(p.d - 6, 8), fv = -front * 1.2;
    put(slabG, box(fw + 0.6, 0.25, fd + 0.6, 0, 0.12, 0), 0, fv);
    put(slabG, box(fw + 0.6, 0.25, fd + 0.6, 0, 3.2, 0), 0, fv);
    for (let u = -fw / 2; u <= fw / 2 + 0.01; u += fw / Math.round(fw / 4)) for (let v = -fd / 2; v <= fd / 2 + 0.01; v += fd / Math.round(fd / 4)) {
      put(frameG, box(0.35, 3.0, 0.35, 0, 1.6, 0), u, fv + v);
      if (rnd() < 0.6) put(frameG, box(0.35, 1.4, 0.35, 0, 4.0, 0), u, fv + v); // half-built upstairs, rebar to come
    }
    { const [x, z] = at(0, fv); cols.push({ name: 'plot_frame', cx: x, cz: z, hx: fw / 2 + 0.3, hz: fd / 2 + 0.3, ry: p.ang }); }
    // sand heap and stacked blocks by the gate
    const sand = new THREE.ConeGeometry(1.6, 1.1, 10).translate(0, 0.55, 0); put(sandG, sand, W2 - 3, front * (D2 - 2.5));
    for (let b = 0; b < 3; b++) put(blockG, box(1.2, 0.6, 0.9, 0, 0.3, 0), -W2 + 2.5 + b * 1.4, front * (D2 - 2));
    { const [x, z] = at(W2 - 3, front * (D2 - 2.5)); cols.push({ name: 'plot_sand', cx: x, cz: z, hx: 1.3, hz: 1.3, ry: 0, h: 1.1 }); }
    // the sign on the road side of the wall
    const [t, sub] = SIGNS[p.kind % SIGNS.length];
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.9), new THREE.MeshStandardMaterial({ map: signTexture(t, { bg: '#f7efdc', fg: '#9b2f2f', w: 900, h: 250, sub }), roughness: 0.7 }));
    const [sx, sz] = at(-W2 / 2, front * (D2 + 0.12)); sign.position.set(sx, 1.25, sz); sign.rotation.y = p.ang + (front > 0 ? 0 : Math.PI); out.add(sign);
    claims.push({ kind: 'construction_plot', cx: p.x, cz: p.z, hx: W2, hz: D2, ry: p.ang });
  });
  const add = (arr, color, r = 0.9) => { if (arr.length) { const m = new THREE.Mesh(mergeGeometries(arr), new THREE.MeshStandardMaterial({ color, roughness: r })); m.castShadow = true; m.receiveShadow = true; out.add(m); } };
  add(wallG, 0xd9d2c1); add(frameG, 0xb9b3a6); add(slabG, 0xc4beb1); add(blockG, 0x9d978c); add(sandG, 0xe0b98a, 1);

  // the minimap draws the same land (hud.js): earth, grass, yards; anything built shows as the lawns it mostly is
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N);
    const MAPC = { earth: [210, 160, 128], grass: [127, 179, 94], paving: [216, 208, 192] };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const c = j * N + i, x = X(i), z = Z(j);
      const k = built[c] ? 'grass' : zone[c] >= 0 ? (useAt(c) === 'paving' ? 'paving' : inPark(x, z) ? 'grass' : 'earth') : Math.hypot(x, z) < R ? 'grass' : 'earth';
      const [r, g, b] = MAPC[k]; img.data.set([r, g, b, 255], c * 4);
    }
    ctx.putImageData(img, 0, 0);
    world.landMap = { canvas: cv, E, outside: 'rgb(210,160,128)' };
  } catch { /* the minimap keeps its plain green */ }

  world.addColliders?.(cols);
  claims.forEach((c) => world.claim?.(c));
  const sum = { open: zones.filter((z) => z.use !== 'grass').reduce((a, z) => a + z.area, 0), laterite: zones.filter((z) => z.use === 'laterite').length, paving: zones.filter((z) => z.use === 'paving').length, plots: plots.length, carParks: parks.length };
  return { group: out, summary: sum };
}
