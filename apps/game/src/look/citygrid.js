import * as THREE from 'three';
import { LIVE } from './citydirectory.js';

// The city grid (Elvis, 12 October 2026, with a model of Nairobi's centre: "use this as a guide for the grid ... so
// that it's going to capture a much more accurate view of Nairobi"; and "one continuous city"). The district you play
// in is built in full (world.js); round it, the rest of the city is drawn from the map: every building where it
// really is and about as tall as it really is, the roads, parks, water and railways, in the game's own clay look.
// The city is baked into 500 m tiles (scripts/grid/bake.py -> public/grid/<city>/); only the tiles round the camera
// are loaded and drawn, further out the higher you go. Nothing here is walkable yet: it is the city you see.

const ROOF = ['#efe3c8', '#e2a07c', '#d9c7a4', '#eacb7a', '#d3c3e2', '#f2d6b8', '#cfc8b6'];
const WALL = ['#f2ecd9', '#e6d3b3', '#ded8c8', '#e9c9a8', '#d6cdb8', '#cfd9c8', '#f0e2c6'];
const TOWER = ['#a9c3cc', '#bccbd0', '#9fb3be', '#c7d3d3', '#b7c2bd']; // tall glass: cool, like the CBD from the air
const GREEN = ['#79b055', '#8abb66', '#6fae4c', '#64a64e', '#93a876', '#4f8c3e'];
const ROAD = { major: '#6d6a66', minor: '#8a8680', service: '#a39e95' }; // the streets are what draw the city's grid from the air
// flat layers stand 10 cm or more apart and clear of the district's grass (its top is at -0.3), so none of them shimmer
// even from 2 km up. Inside the district they are cut away (materials), so they never cover its own streets.
const Y = { ground: -0.18, green: -0.06, water: 0.05, river: 0.15, road: 0.26, rail: 0.36 };

const hash = (n) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
const col = new THREE.Color();

/** The materials: plain lit clay, with the district cut out of everything flat (a dithered edge, so it never seams). */
function materials(hole) {
  const cut = (m) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uHole = hole;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vGridXZ;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGridXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vGridXZ;\nuniform vec3 uHole;')
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          { float d = length(vGridXZ - uHole.xy); float n = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
            if (d < uHole.z - 24.0 * (1.0 - n)) discard; }`);
    };
    return m;
  };
  const building = new THREE.MeshLambertMaterial({ vertexColors: true });
  // windows: a band on each floor, darker by day, lit here and there at night (uNight), so a tower reads as a tower
  const uNight = { value: 0 };
  building.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = uNight;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aLit;\nvarying float vLit;\nvarying vec3 vGridP;\nvarying float vWall;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvLit = aLit; vGridP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWall = 1.0 - abs(normal.y);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying float vLit;\nvarying vec3 vGridP;\nvarying float vWall;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float fl = mod(vGridP.y, 3.3), win = vWall * step(1.0, fl) * step(fl, 2.35) * step(2.0, vGridP.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.62, 0.68, 0.76), win * (1.0 - uNight));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float cell = fract(sin(dot(floor(vec2(vGridP.x + vGridP.z, vGridP.y / 3.3)), vec2(7.13, 3.71)) + vLit * 91.7) * 4375.85);
        totalEmissiveRadiance += vec3(1.0, 0.78, 0.45) * 0.9 * win * uNight * step(1.0 - vLit, cell);`);
  };
  const flat = (c) => cut(new THREE.MeshLambertMaterial({ color: c }));
  return {
    uNight, building,
    ground: flat('#a3b47c'), green: cut(new THREE.MeshLambertMaterial({ vertexColors: true })), water: flat('#6fb1c4'),
    road: cut(new THREE.MeshLambertMaterial({ vertexColors: true })), rail: flat('#7b6e62'),
  };
}

// everything flat faces straight up: each triangle is wound so its face points at the sky, whatever way the map drew it
const up = (geo, n) => { const a = new Float32Array(n); for (let q = 1; q < n; q += 3) a[q] = 1; geo.setAttribute('normal', new THREE.BufferAttribute(a, 3)); };
const tri = (P, C, c, y, ax, az, bx, bz, cx, cz) => {
  if ((bz - az) * (cx - ax) - (bx - ax) * (cz - az) < 0) { const tx = bx, tz = bz; bx = cx; bz = cz; cx = tx; cz = tz; }
  P.push(ax, y, az, bx, y, bz, cx, y, cz); if (c) C.push(c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b);
};

/** One tile's meshes, in the district's coordinates (the city's minus the district's offset). */
function buildTile(t, i, j, size, off, M, keep, roads) {
  const g = new THREE.Group();
  const B = { p: [], n: [], c: [], l: [] };
  const push = (a, x, y, z) => a.push(x, y, z);
  (t.b || []).forEach((b, k) => {
    const h = b[0], n = (b.length - 1) / 2;
    const pts = []; let cx = 0, cz = 0;
    for (let q = 0; q < n; q++) { const x = b[1 + 2 * q] - off.x, z = b[2 + 2 * q] - off.z; pts.push(new THREE.Vector2(x, z)); cx += x; cz += z; }
    cx /= n; cz /= n;
    if (!keep(cx, cz)) return; // inside the district: it has its own buildings
    if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
    const seed = hash(i * 7919 + j * 104729 + k * 13 + 1), lit = 0.08 + 0.3 * hash(seed * 31);
    const wallC = col.set(h > 30 ? TOWER[Math.floor(seed * TOWER.length)] : WALL[Math.floor(seed * WALL.length)]).clone();
    const roofC = col.set(h > 30 ? '#d9dcd6' : ROOF[Math.floor(hash(seed * 17) * ROOF.length)]).clone();
    // walls: one quad per edge, wound to face outward, a little lighter at the top (the clay look's soft gradient)
    for (let q = 0; q < n; q++) {
      const a = pts[q], c = pts[(q + 1) % n], dx = c.x - a.x, dz = c.y - a.y, L = Math.hypot(dx, dz) || 1, nx = dz / L, nz = -dx / L;
      const lo = wallC.clone().multiplyScalar(0.86), hi = wallC;
      [[a.x, 0, a.y, lo], [c.x, h, c.y, hi], [c.x, 0, c.y, lo], [a.x, 0, a.y, lo], [a.x, h, a.y, hi], [c.x, h, c.y, hi]].forEach(([x, y, z, cc]) => {
        push(B.p, x, y, z); push(B.n, nx, 0, nz); B.c.push(cc.r, cc.g, cc.b); B.l.push(lit);
      });
    }
    // the roof, flat
    let tris = [];
    try { tris = THREE.ShapeUtils.triangulateShape(pts, []); } catch { tris = []; }
    const R0 = []; tris.forEach(([a, b2, d]) => tri(R0, null, null, h, pts[a].x, pts[a].y, pts[b2].x, pts[b2].y, pts[d].x, pts[d].y));
    for (let q = 0; q < R0.length; q += 3) { push(B.p, R0[q], R0[q + 1], R0[q + 2]); push(B.n, 0, 1, 0); B.c.push(roofC.r, roofC.g, roofC.b); B.l.push(0); }
  });
  if (B.p.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
    geo.setAttribute('aLit', new THREE.Float32BufferAttribute(B.l, 1));
    geo.computeBoundingSphere();
    g.add(new THREE.Mesh(geo, M.building));
  }
  // the flat things: ground, parks, water, rivers, roads, rails
  const flat = (polys, y, mat, colourOf) => {
    const P = [], C = [];
    polys.forEach((poly) => {
      const kind = colourOf ? poly[0] : null, o = colourOf ? 1 : 0, n = (poly.length - o) / 2;
      const pts = []; for (let q = 0; q < n; q++) pts.push(new THREE.Vector2(poly[o + 2 * q] - off.x, poly[o + 1 + 2 * q] - off.z));
      let tris = []; try { tris = THREE.ShapeUtils.triangulateShape(pts, []); } catch { return; }
      const c = colourOf ? col.set(colourOf(kind)) : null;
      tris.forEach(([a, b2, d]) => tri(P, C, c, y, pts[a].x, pts[a].y, pts[b2].x, pts[b2].y, pts[d].x, pts[d].y));
    });
    if (!P.length) return;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    if (C.length) geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    up(geo, P.length); geo.computeBoundingSphere(); g.add(new THREE.Mesh(geo, mat));
  };
  const ribbon = (lines, y, mat, widthOf, colourOf) => {
    const P = [], C = [];
    lines.forEach((ln) => {
      const kind = ln[0], w = widthOf(kind), n = (ln.length - 1) / 2, c = colourOf ? col.set(colourOf(kind)) : null;
      for (let q = 0; q < n - 1; q++) {
        const ax = ln[1 + 2 * q] - off.x, az = ln[2 + 2 * q] - off.z, bx = ln[3 + 2 * q] - off.x, bz = ln[4 + 2 * q] - off.z;
        const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, px = (-dz / L) * w / 2, pz = (dx / L) * w / 2;
        // a little past each end, so the joins close
        const ex = (dx / L) * w * 0.35, ez = (dz / L) * w * 0.35;
        const v = [[ax - ex + px, az - ez + pz], [ax - ex - px, az - ez - pz], [bx + ex - px, bz + ez - pz], [bx + ex + px, bz + ez + pz]];
        tri(P, C, c, y, ...v[0], ...v[1], ...v[2]); tri(P, C, c, y, ...v[0], ...v[2], ...v[3]);
      }
    });
    if (!P.length) return;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    if (C.length) geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    up(geo, P.length); geo.computeBoundingSphere(); g.add(new THREE.Mesh(geo, mat));
  };
  const x0 = i * size - off.x, z0 = j * size - off.z;
  flat([[x0, z0, x0 + size, z0, x0 + size, z0 + size, x0, z0 + size].map((v, q) => v + (q % 2 ? off.z : off.x))], Y.ground, M.ground);
  flat(t.g || [], Y.green, M.green, (k) => GREEN[k] || GREEN[0]);
  flat(t.w || [], Y.water, M.water);
  ribbon(t.wl || [], Y.river, M.water, (w) => w * 2);
  ribbon(t.r || [], Y.road, M.road, (k) => ({ motorway: 16, trunk: 15, primary: 13, secondary: 11, tertiary: 9, service: 4.5, pedestrian: 4 }[roads[k]] || 7),
    (k) => (['motorway', 'trunk', 'primary', 'secondary'].includes(roads[k]) ? ROAD.major : roads[k] === 'service' ? ROAD.service : ROAD.minor));
  ribbon((t.rl || []).map((l) => [0, ...l]), Y.rail, M.rail, () => 3.2);
  g.children.forEach((m) => { m.castShadow = false; m.receiveShadow = false; m.matrixAutoUpdate = false; });
  return g;
}

/**
 * The city round the district, if the city has a grid (cities/<country>/<city>/city.json "grid", baked).
 * update(camera) streams tiles in and out; setNight(0..1) lights windows.
 */
export function createCityGrid({ world, quality = 'high' }) {
  const city = LIVE[world.place?.city];
  const group = new THREE.Group(); group.name = 'city-grid';
  if (!city?.grid || !world.center) return { group, update() {}, setNight() {}, active: false, stats: () => ({}) };
  const kx = 111320 * Math.cos((city.lat * Math.PI) / 180);
  // where the district's centre is in the city's frame (x east, z south), so the two line up
  const off = { x: (world.center.lon - city.lon) * kx, z: -(world.center.lat - city.lat) * 110574 };
  const R = world.radius, hole = { value: new THREE.Vector3(0, 0, R * 1.12) };
  const keep = (x, z) => Math.hypot(x, z) > R * 1.16;
  const M = materials(hole);
  const base = `${import.meta.env?.BASE_URL ?? './'}grid/${city.slug}/`;
  let index = null; const tiles = new Map(), queue = [], loading = new Set();
  const api = { group, active: true, ready: false, index: () => index };
  fetch(`${base}index.json`).then((r) => (r.ok ? r.json() : null)).then((ix) => { index = ix; api.ready = !!ix; }).catch(() => {});
  let tick = 0;
  const near = { low: 900, medium: 1300, high: 1700, ultra: 2200 }[quality] ?? 1500;
  api.update = (camera, dt = 0.016) => {
    // build one waiting tile a frame, so a burst of tiles never stalls the game
    const job = queue.shift(); if (job) { const g = buildTile(job.t, job.i, job.j, index.tile, off, M, keep, index.roads); g.updateMatrixWorld(true); tiles.set(job.k, g); group.add(g); }
    if (!index || (tick -= dt) > 0) return; tick = 0.4;
    // the camera in the city's frame; the higher it is, the further the city reaches
    const cx = camera.position.x + off.x, cz = camera.position.z + off.z, reach = Math.min(9000, near + camera.position.y * 3.2);
    const want = new Set();
    index.tiles.forEach(([i, j, n]) => {
      const tx = (i + 0.5) * index.tile, tz = (j + 0.5) * index.tile, d = Math.hypot(tx - cx, tz - cz);
      if (d > reach + index.tile * 0.7) return;
      const k = `${i}_${j}`; want.add(k);
      if (tiles.has(k) || loading.has(k) || queue.some((q) => q.k === k) || loading.size > 5) return;
      loading.add(k);
      fetch(`${base}${k}.json`).then((r) => r.json()).then((t) => { queue.push({ k, i, j, t }); queue.sort((a, b) => Math.hypot((a.i + 0.5) * index.tile - cx, (a.j + 0.5) * index.tile - cz) - Math.hypot((b.i + 0.5) * index.tile - cx, (b.j + 0.5) * index.tile - cz)); })
        .catch(() => {}).finally(() => loading.delete(k));
      void n;
    });
    // and let go of what is now well out of reach
    tiles.forEach((g, k) => {
      if (want.has(k)) return;
      const [i, j] = k.split('_').map(Number), d = Math.hypot((i + 0.5) * index.tile - cx, (j + 0.5) * index.tile - cz);
      if (d < reach * 1.4 + index.tile) return;
      group.remove(g); g.traverse((o) => o.geometry?.dispose()); tiles.delete(k);
    });
  };
  api.setNight = (n) => { M.uNight.value = n; };
  api.stats = () => ({ tiles: tiles.size, queued: queue.length, loading: loading.size, triangles: [...tiles.values()].reduce((a, g) => a + g.children.reduce((b, m) => b + m.geometry.attributes.position.count / 3, 0), 0) });
  return api;
}
