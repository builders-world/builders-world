import * as THREE from 'three';
import { LIVE } from '../look/citydirectory.js';
import { wetGroundMaterial, wallMaterial } from '../look/surfaces.js';
import { MeshBuilder, mulberry32 } from '../mesh.js';
import { plantAll, pickTree } from '../look/flora.js';
import { pushOutBox } from '../look/physics.js';
import { facadeMaterial, facadeUniforms } from './facade.js';

// The open city (Elvis, 12 October 2026: "an open world that is that large, but people should only be able to access
// a small area at a time ... so that way it doesn't break"). The whole city is baked into 200 m chunks
// (scripts/city/bake.mjs -> public/city/<city>/); here the chunks round the camera are built in a worker
// (chunkworker.js), a few a second, and handed to the scene ready to draw. Near the player a chunk has everything
// (lod 0), a little further it drops the fine detail (lod 1), and far away only the streets, ground and building bodies
// are left (lod 2), out to the haze, and further the higher you climb. You can walk and drive anywhere in it: its
// buildings, trees, lamps and medians are solid. The district you arrived in keeps its own streets, estates and life
// inside its circle; the city carries on from its edge.

const HOLE = 1.24, BUILD_HOLE = 1.15; // the district's circle (its own ground ends here: world.js, open mode)

function lampGeometry() {
  const mb = new MeshBuilder(), metal = '#7b867d';
  mb.cyl(0, 0, 0, 0.08, 0.11, 6.2, 8, metal, { grad: 0.2 });
  mb.box(0, 6.05, 0.8, 0.1, 0.1, 1.7, metal, { grad: 0, vary: 0 });
  mb.box(0, 5.88, 1.55, 0.36, 0.16, 0.6, '#5d655f', { grad: 0, vary: 0 });
  return mb.toGeometry();
}

export function createOpenWorld({ world, quality = 'high', reduced = false }) {
  const key = world.place?.city, city = LIVE[key];
  const group = new THREE.Group(); group.name = 'open-city';
  const off = { x: 0, z: 0 };
  const api = { group, active: false, ready: false, update() {}, resolve: (p) => p, solidAt: () => false, setNight() {}, stats: () => ({}), dispose() {} };
  if (!city?.open || typeof Worker === 'undefined') return api;
  api.active = true;
  // where the district's centre is in the city's frame (x east, z south, metres from the city's centre)
  const kx = 111320 * Math.cos((city.lat * Math.PI) / 180);
  off.x = (world.center.lon - city.lon) * kx; off.z = -(world.center.lat - city.lat) * 110574;
  group.position.set(-off.x, 0, -off.z);
  const R = world.radius, hole = [off.x, off.z, R * HOLE];
  // where the city's files are: public/city/ in the deployment, or elsewhere through VITE_CITY_BASE (an object store
  // filled by scripts/city/upload.mjs). An uploaded index.json names the version its tiles and map went up under ("v")
  // absolute: the workers fetch the tiles, and a worker resolves a relative address against its own (built, that is
  // /assets/), not the page's, so './city/...' became '/assets/city/...' and every tile 404'd in production
  const home = new URL(`${import.meta.env?.VITE_CITY_BASE || `${import.meta.env?.BASE_URL ?? './'}city/`}${city.slug}/`, document.baseURI).href;
  let base = home;
  let loaded; const whenLoaded = new Promise((res) => { loaded = res; });
  // how far each detail reaches on the ground (lod 0, 1, 2); lod 3 beyond, out to the haze. The higher you climb, the
  // further each reaches (update). Phones get less of everything
  const T = { low: [150, 380, 900], medium: [210, 520, 1300], high: [270, 650, 1700], ultra: [330, 800, 2200] }[quality] || [270, 650, 1700];
  const GROW = { low: 0.3, medium: 0.6, high: 1, ultra: 1.2 }[quality] || 1; // how fast each detail spreads as you climb
  const FAR = { low: 3000, medium: 4500, high: 7000, ultra: 9000 }[quality] || 7000; // how far the city reaches from the air

  // materials: the districts' wet ground and plaster, the facade shader for walls; all cut away inside the district
  const groundMat = () => {
    const m = wetGroundMaterial(), base = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      base(sh, r); sh.uniforms.uHole = facadeUniforms.uHole;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHole;')
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (uHole.z > 0.0 && length(vWPos.xz - uHole.xy) < uHole.z) discard;');
    };
    m.customProgramCacheKey = () => 'bw-city-ground';
    return m;
  };
  // the chunks' grass under everything: drawn first and writing no depth, so whatever lies on it always shows
  const ground = groundMat(), lawn = groundMat(); lawn.depthWrite = false;
  const solid = wallMaterial({ wetBottom: false }), facade = facadeMaterial();
  facadeUniforms.uHole.value.set(-1e6, -1e6, -1); // walls are left out by the bake's circle, not cut (chunkmesh.js)
  const lampGeo = lampGeometry(), lampMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  const bulbGeo = new THREE.SphereGeometry(0.16, 8, 6), bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, 0.6) });
  let groundHole = new THREE.Vector3();
  // past the baked city: plain country out to the horizon, under everything else, so the city never ends in a void
  { const far = new THREE.Mesh(new THREE.CircleGeometry(30000, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#79a85a' }));
    far.position.y = -0.9; far.renderOrder = -2; far.material.depthWrite = false; far.name = 'open-city-country'; group.add(far); }
  // and its big water (a lagoon, a harbour, a lake) whole, so where the chunks stop the water goes on (index.json far):
  // both drawn first and never in front of anything, so the chunks' own ground and water always cover them
  const farWater = (list) => {
    if (!list?.length) return;
    const shapes = list.map((p) => { const s = new THREE.Shape(); s.moveTo(p[0], -p[1]); for (let i = 2; i < p.length; i += 2) s.lineTo(p[i], -p[i + 1]); return s; });
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shapes, 1).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#5fa8bd', depthWrite: false }));
    m.position.y = -0.6; m.renderOrder = -1.5; m.name = 'open-city-water'; group.add(m);
  };

  const chunks = new Map(); // key -> { i, j, lod, want, group, colliders, busy }
  let index = null, jobId = 0;
  const workers = Array.from({ length: Math.min(3, Math.max(1, (navigator.hardwareConcurrency || 4) - 2)) }, () => new Worker(new URL('./chunkworker.js', import.meta.url), { type: 'module' }));
  const busy = new Set(), queue = [], ready = [];
  workers.forEach((w) => { w.onmessage = ({ data }) => { busy.delete(w); if (!data.error) ready.push(data); else console.warn('city chunk', data.key, data.error); pump(); }; });
  // each tile has its worker, so a tile is fetched once, not once by every worker that wants a piece of it
  const owner = (c) => { if (!index.tile) return null; const a = Math.floor(c.i / index.tile), b = Math.floor(c.j / index.tile), n = workers.length; return workers[(((a * 73 + b * 31) % n) + n) % n]; };
  function pump() {
    for (let q = 0; q < queue.length && busy.size < workers.length;) {
      const job = queue[q], c = chunks.get(job.key); if (!c || c.want !== job.lod) { if (c) c.busy = false; queue.splice(q, 1); continue; }
      const w = owner(c) || workers.find((x) => !busy.has(x));
      if (busy.has(w)) { q++; continue; }
      queue.splice(q, 1); busy.add(w);
      w.postMessage({ id: ++jobId, key: job.key, url: `${base}${index.tile ? `t_${Math.floor(c.i / index.tile)}_${Math.floor(c.j / index.tile)}` : job.key}.json`, tile: index.tile || 0, meta: { classes: index.classes, ends: index.ends, drive: index.drive }, lod: job.lod, hole, ci: c.i, cj: c.j, size: index.chunk });
    }
  }
  // the city's airport, where it really is, past the box or in it (airfield.js; scripts/city/airport.mjs)
  let airfield = null, night = 0;
  whenLoaded.then(() => fetch(`${home}airport.json`)).then((r) => (r?.ok ? r.json() : null)).then(async (d) => {
    if (!d?.runways) return;
    const { createAirfield } = await import('./airfield.js');
    if (disposed) return;
    airfield = createAirfield(d, { quality }); airfield.setNight(night); group.add(airfield.group); api.airport = d; api.airfield = airfield;
  }).catch((e) => console.warn('airport', e));
  // the city's real hills, where it has any (hills.js; scripts/city/hills.py): Ngong, north of Abuja, Aburi
  let hills = null;
  whenLoaded.then(() => fetch(`${home}hills.json`)).then((r) => (r?.ok ? r.json() : null)).then(async (d) => {
    if (!d?.sites?.length) return;
    const { createHills } = await import('./hills.js');
    if (disposed) return;
    hills = createHills(d, { quality, off }); hills.group.position.set(off.x, 0, off.z); group.add(hills.group); api.hills = hills; // (its own positions are the scene's)
  }).catch((e) => console.warn('hills', e));
  let disposed = false;
  fetch(`${home}index.json`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((ix) => { if (!ix) { api.active = false; return; } index = ix; if (ix.v) base = `${home}${ix.v}/`; loaded(ix); farWater(ix.far?.water); api.ready = true; }).catch(() => { api.active = false; });

  // ---------- collisions: every collider of the loaded chunks, in a 32 m grid ----------
  const CELL = 32, grid = new Map(), gk = (i, j) => i * 73856093 + j;
  const addCol = (c, list) => list.forEach((o) => {
    const bb = o.t === 'poly' ? o.bb : o.t === 'circ' ? [o.x - o.r, o.z - o.r, o.x + o.r, o.z + o.r] : [o.cx - Math.max(o.hx, o.hz), o.cz - Math.max(o.hx, o.hz), o.cx + Math.max(o.hx, o.hz), o.cz + Math.max(o.hx, o.hz)];
    for (let i = Math.floor(bb[0] / CELL); i <= Math.floor(bb[2] / CELL); i++) for (let j = Math.floor(bb[1] / CELL); j <= Math.floor(bb[3] / CELL); j++) { const k = gk(i, j); if (!grid.has(k)) grid.set(k, new Set()); grid.get(k).add(o); }
    o.cells = true; c.col.push(o);
  });
  const dropCol = (c) => c.col.forEach((o) => grid.forEach((s) => s.delete(o))) || (c.col = []);
  const near = (x, z) => grid.get(gk(Math.floor(x / CELL), Math.floor(z / CELL))) || [];
  function pushOutPoly(p, rad, o) {
    const [x0, z0, x1, z1] = o.bb; if (p.x < x0 - rad || p.x > x1 + rad || p.z < z0 - rad || p.z > z1 + rad) return;
    const pts = o.pts; let inside = false, bd = Infinity, bx = 0, bz = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, zi] = pts[i], [xj, zj] = pts[j];
      if ((zi > p.z) !== (zj > p.z) && p.x < ((xj - xi) * (p.z - zi)) / (zj - zi) + xi) inside = !inside;
      const dx = xi - xj, dz = zi - zj, L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((p.x - xj) * dx + (p.z - zj) * dz) / L2)), qx = xj + dx * u, qz = zj + dz * u, d = Math.hypot(p.x - qx, p.z - qz);
      if (d < bd) { bd = d; bx = qx; bz = qz; }
    }
    if (inside) { const dx = bx - p.x, dz = bz - p.z, l = Math.hypot(dx, dz) || 1; p.x = bx + (dx / l) * rad; p.z = bz + (dz / l) * rad; }
    else if (bd < rad) { const dx = p.x - bx, dz = p.z - bz, l = bd || 1; p.x = bx + (dx / l) * rad; p.z = bz + (dz / l) * rad; }
  }
  const P = new THREE.Vector3();
  api.resolve = (p, rad = 0.3) => {
    if (!api.ready) return p;
    P.set(p.x + off.x, 0, p.z + off.z);
    if (Math.hypot(P.x - hole[0], P.z - hole[1]) < R * BUILD_HOLE - 4) return p; // inside the district: its own world
    for (let pass = 0; pass < 2; pass++) for (const o of near(P.x, P.z)) {
      if (o.t === 'poly') pushOutPoly(P, rad, o);
      else if (o.t === 'circ') { const dx = P.x - o.x, dz = P.z - o.z, d = Math.hypot(dx, dz), m = o.r + rad; if (d < m && d > 1e-6) { P.x = o.x + (dx / d) * m; P.z = o.z + (dz / d) * m; } }
      else pushOutBox(P, rad, o);
    }
    p.x = P.x - off.x; p.z = P.z - off.z; return p;
  };
  /** the top of whatever stands at (x, z), for the camera; false where it is open */
  api.solidAt = (x, z) => { const cx = x + off.x, cz = z + off.z; for (const o of near(cx, cz)) if (o.t === 'poly' && cx > o.bb[0] && cx < o.bb[2] && cz > o.bb[1] && cz < o.bb[3]) { let c = false; const pts = o.pts; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > cz) !== (zj > cz) && cx < ((xj - xi) * (cz - zi)) / (zj - zi) + xi) c = !c; } if (c) return o.h; } return false; };

  // ---------- meshes ----------
  const geo = (L, extra) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(L.p, 3)); g.setAttribute('normal', new THREE.BufferAttribute(L.n, 3)); g.setAttribute('color', new THREE.BufferAttribute(L.c, 3)); if (extra) g.setAttribute('aFac', new THREE.BufferAttribute(L.f, 4)); g.computeBoundingSphere(); return g; };
  function install(res) {
    const c = chunks.get(res.key); if (!c) return;
    c.busy = false;
    if (c.want !== res.lod) return; // the camera moved on while it was being built
    const g = new THREE.Group(); g.name = `chunk_${res.key}_${res.lod}`;
    const o = res.out;
    if (o.base?.p.length) { const m = new THREE.Mesh(geo(o.base), lawn); m.renderOrder = -1; m.receiveShadow = res.lod === 0; g.add(m); }
    if (o.ground.p.length) { const m = new THREE.Mesh(geo(o.ground), ground); m.receiveShadow = res.lod === 0; g.add(m); }
    if (o.solid.p.length) { const m = new THREE.Mesh(geo(o.solid), solid); m.castShadow = res.lod === 0; m.receiveShadow = res.lod === 0; g.add(m); }
    if (o.facade.p.length) { const m = new THREE.Mesh(geo(o.facade, true), facade); m.castShadow = res.lod === 0; m.receiveShadow = res.lod === 0; g.add(m); }
    if (res.lod === 0 && o.trees.length) { // (trees near you; further out the city's green is its parks and lawns)
      const rnd = mulberry32(Math.abs(c.i * 7919 + c.j * 104729) + 1), list = [];
      for (let i = 0; i < o.trees.length; i += 3) list.push({ x: o.trees[i], z: o.trees[i + 1], kind: pickTree(key, 'street', rnd), ry: rnd() * 6.28, s: o.trees[i + 2] > 0.5 ? 0.9 + rnd() * 0.3 : 0.75 + rnd() * 0.2 });
      g.add(plantAll(list, `city_trees_${res.key}`));
    }
    if (o.lamps.length) {
      const n = o.lamps.length / 4, im = new THREE.InstancedMesh(lampGeo, lampMat, n), bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s1 = new THREE.Vector3(1, 1, 1);
      for (let k = 0; k < n; k++) { const x = o.lamps[k * 4], z = o.lamps[k * 4 + 1], nx = o.lamps[k * 4 + 2], nz = o.lamps[k * 4 + 3], ry = Math.atan2(-nx, -nz); q.setFromAxisAngle(up, ry); im.setMatrixAt(k, m4.compose(new THREE.Vector3(x, 0, z), q, s1)); bulbs.setMatrixAt(k, m4.compose(new THREE.Vector3(x - nx * 1.55, 5.78, z - nz * 1.55), q, s1)); }
      im.computeBoundingSphere(); bulbs.computeBoundingSphere(); bulbs.visible = night > 0.05; bulbs.userData.bulbs = true; g.add(im, bulbs);
    }
    if (c.group) { group.remove(c.group); disposeGroup(c.group); }
    c.group = g; c.lod = res.lod; group.add(g); g.updateMatrixWorld(true);
    dropCol(c); if (res.lod < 2) addCol(c, o.colliders);
    // (the district has its own places: the city's inside its circle are left to it)
    c.buildings = o.buildings; c.pois = (o.pois || []).filter((q) => Math.hypot(q.x - hole[0], q.z - hole[1]) > R * BUILD_HOLE); c.map = o.map || null; api.mapVersion++;
  }
  const disposeGroup = (g) => g.traverse((m) => { if (m.isMesh && m.geometry !== lampGeo && m.geometry !== bulbGeo && !m.name.startsWith('city_trees')) m.geometry?.dispose(); });

  // ---------- streaming ----------
  let tick = 0;
  api.update = (camera, dt = 0.016, fogFar = 1500, fog = null) => {
    airfield?.update(dt, camera, fog);
    hills?.update(dt, camera, fog);
    // hand over finished chunks, one or two a frame, so a burst of them never stalls the game
    for (let k = 0; k < 2 && ready.length; k++) install(ready.shift());
    if (!index || (tick -= dt) > 0) return; tick = 0.25;
    // not during quick travel's flight (main.js swoop): high over the city it asked for hundreds of far chunks along the
    // way, and the ones round where you land then waited behind them for 15 seconds or more
    if (typeof document !== 'undefined' && document.body?.classList.contains('bw-swoop')) return;
    const cx = camera.position.x + off.x, cz = camera.position.z + off.z, alt = Math.max(0, camera.position.y - 20);
    // nothing is built past the haze: at street level that is a kilometre or so; from the air, the whole city
    const r0 = T[0] + alt * 0.25 * GROW, r1 = T[1] + alt * 0.45 * GROW, r2 = T[2] + alt * 0.7 * GROW, r3 = Math.min(FAR, Math.max(r2, fogFar * 1.05)), S = index.chunk;
    const want = new Map();
    index.chunks.forEach(([i, j]) => {
      const x = (i + 0.5) * S, z = (j + 0.5) * S, d = Math.max(0, Math.hypot(x - cx, z - cz) - S * 0.5);
      const c = chunks.get(`${i}_${j}`), cur = c?.lod;
      // a little give either way, so a chunk on the boundary does not flip back and forth
      const lod = d < r0 + (cur === 0 ? 30 : 0) ? 0 : d < r1 + (cur === 1 ? 40 : 0) ? 1 : d < r2 + (cur === 2 ? 80 : 0) ? 2 : d < r3 + (cur === 3 ? 120 : 0) ? 3 : -1;
      if (lod >= 0) want.set(`${i}_${j}`, { lod, d, i, j });
    });
    want.forEach((w, k) => {
      let c = chunks.get(k); if (!c) { c = { i: w.i, j: w.j, lod: -1, want: -1, group: null, col: [], busy: false }; chunks.set(k, c); }
      if (c.want !== w.lod) { c.want = w.lod; if (c.lod !== w.lod) { c.busy = true; queue.push({ key: k, lod: w.lod, d: w.d }); } }
    });
    chunks.forEach((c, k) => { if (!want.has(k) && !c.busy) { if (c.group) { group.remove(c.group); disposeGroup(c.group); } dropCol(c); chunks.delete(k); if (c.map) api.mapVersion++; } });
    queue.sort((a, b) => (a.lod - b.lod) * 400 + (a.d - b.d));
    pump();
  };
  api.setNight = (n) => {
    night = n; airfield?.setNight(n); facadeUniforms.uNight.value = n;
    group.traverse((o) => { if (o.userData.bulbs) o.visible = n > 0.05; });
  };
  api.classes = () => index?.classes || null;
  // the city's beaches (bake.mjs): [name or null, x, z, the way to the sea], in the district's frame here
  api.beaches = () => (index?.beaches || []).map(([n, x, z, sx, sz]) => ({ name: n, x: x - off.x, z: z - off.z, sea: { x: sx, z: sz } }));
  api.mapVersion = 0; // goes up whenever a chunk's map arrives or leaves (the city's traffic rebuilds its streets)
  /** Every loaded chunk's map (the streets near you), with its key: fn(map, key). */
  api.eachMap = (fn) => chunks.forEach((c, k) => { if (c.map && c.lod <= 1) fn(c.map, k); });
  api.offset = off; Object.defineProperty(api, 'mapUrl', { get: () => `${base}map.json` }); api.loaded = whenLoaded; // (resolves once index.json is in, so mapUrl is the uploaded one) // the whole city, for the big map (scripts/city/overview.mjs)
  /**
   * The minimap's view of the city round (x, z) in the scene's frame, out to r metres: each loaded chunk's streets (class
   * name, street name, flat points), land and water, and its buildings' footprints; all in the city's frame, so the
   * caller shifts by api.offset. The district's own streets are the world's, so chunks inside it are left out.
   */
  // (returns how many of the city's chunks in reach it had the map of, and how many there are: the minimap fills the
  // rest from the whole city's map when they differ, high up where the far chunks are built without theirs)
  let baked = null;
  api.mapNear = (x, z, r, fn) => {
    if (!index) return { got: 0, want: 0 };
    baked ??= new Set(index.chunks.map(([i, j]) => `${i}_${j}`));
    const cx = x + off.x, cz = z + off.z, S = index.chunk;
    let got = 0, want = 0;
    for (let i = Math.floor((cx - r) / S); i <= Math.floor((cx + r) / S); i++) for (let j = Math.floor((cz - r) / S); j <= Math.floor((cz + r) / S); j++) if (baked.has(`${i}_${j}`)) want++;
    chunks.forEach((c) => {
      if (!c.map || c.lod > 1) return;
      const mx = (c.i + 0.5) * S, mz = (c.j + 0.5) * S;
      if (Math.abs(mx - cx) > r + S / 2 || Math.abs(mz - cz) > r + S / 2) return;
      got++; fn(c.map, c.col, index, c.pois || []);
    });
    return { got, want };
  };
  /**
   * The city's named places within r metres of (x, z) in the scene's frame, each with its door: the place's point
   * pushed out of its building onto the pavement in front (resolve), so you can walk up to it. [{ k, n, x, z }]
   */
  api.placesNear = (x, z, r) => {
    const out = [], cx = x + off.x, cz = z + off.z;
    chunks.forEach((c) => (c.lod <= 1 ? c.pois || [] : []).forEach((q) => {
      if (!q.n || Math.abs(q.x - cx) > r || Math.abs(q.z - cz) > r) return;
      const p = { x: q.x - off.x, z: q.z - off.z }; api.resolve(p, 1.4);
      out.push({ k: q.k, n: q.n, x: p.x, z: p.z });
    }));
    return out;
  };
  /** The name of the street nearest (x, z) in the scene's frame, within reach metres, or null. */
  api.streetAt = (x, z, reach = 18) => {
    if (!index) return null;
    const cx = x + off.x, cz = z + off.z, c = chunks.get(`${Math.floor(cx / index.chunk)}_${Math.floor(cz / index.chunk)}`);
    let best = reach, name = null;
    (c?.map?.roads || []).forEach(([, n, p]) => {
      if (n < 0) return;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const ax = p[i], az = p[i + 1], dx = p[i + 2] - ax, dz = p[i + 3] - az;
        const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / (dx * dx + dz * dz || 1)));
        const d = Math.hypot(cx - ax - dx * t, cz - az - dz * t);
        if (d < best) { best = d; name = index.names[n]; }
      }
    });
    return name;
  };
  api.stats = () => { let tris = 0, byLod = [0, 0, 0, 0]; chunks.forEach((c) => { if (c.lod >= 0) byLod[c.lod]++; c.group?.traverse((m) => { if (m.isMesh && m.geometry?.attributes.position) tris += (m.geometry.attributes.position.count / 3) * (m.isInstancedMesh ? m.count : 1); }); }); return { chunks: chunks.size, byLod, queued: queue.length, busy: busy.size, tris: Math.round(tris) }; };
  api.dispose = () => { disposed = true; airfield?.dispose(); hills?.dispose(); workers.forEach((w) => w.terminate()); chunks.forEach((c) => c.group && disposeGroup(c.group)); };
  void groundHole; void reduced;
  facadeUniforms.uHole.value.set(-1e6, -1e6, -1);
  // the ground's circle: in the scene's frame the district's centre is the origin
  ground.userData.hole = true;
  facadeUniforms.uHole.value.set(-1e6, -1e6, -1);
  api.groundHole = new THREE.Vector3(0, 0, R * HOLE);
  return api;
}
