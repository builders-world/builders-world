import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FONT } from '../look/uikit.js';

// The city's real hills (Elvis, 13 October 2026: "So go ahead and build hills"). Baked by scripts/city/hills.py from
// the Terrain Tiles on AWS Open Data and OpenStreetMap into public/city/<city>/hills.json: the Ngong Hills south-west
// of Nairobi (the wind farm on the ridge included), the granite hills north of Abuja, the Akwapim ridge at Aburi above
// Accra. Lagos, Port Harcourt and Uyo are flat, so they have none. Each site is the real ground, relative to the foot of
// the hills and fading out at its edge into the open country round the city; its mapped paths are laid on it, with
// trees where the forests are (and as each place's slopes have them), boulders on Abuja's granite, a gate at the
// trailhead, posts along the hiking route and a cairn on the summit. Hills are what you see first of a city from far
// off, so like the airport (airfield.js) they are drawn through less of the haze than the streets are.
//
// heightAt(x, z) gives the ground's height (scene frame), for the hike and the bike (recreation/hike.js, bike.js).

// hills keep their shape through the haze: it thickens over HAZE times the city's fog distance and never quite
// hides them (a blue ridge on the horizon, as Ngong is from Nairobi on a clear morning)
const HAZE = 8;
function hazed(m) {
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG\n float fogFactor = min( 0.78, smoothstep( fogNear, fogFar * ${HAZE.toFixed(1)}, vFogDepth ) );\n gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );\n#endif`); };
  m.customProgramCacheKey = () => 'bw-hills'; return m;
}
// the far copy of a site, past the camera's reach: drawn nearer and smaller about the camera (the same size to the eye),
// behind everything near, with the haze its real distance would give it
function farHazed(m, u) {
  m.onBeforeCompile = (sh) => { sh.uniforms.uHaze = u; sh.fragmentShader = 'uniform float uHaze;\n' + sh.fragmentShader.replace('#include <fog_fragment>', '#ifdef USE_FOG\n gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, uHaze );\n#endif'); };
  m.customProgramCacheKey = () => 'bw-hills-far'; return m;
}
// smooth value noise, for patches of grass, scrub and groves
const hash = (x, z) => { const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return n - Math.floor(n); };
function noise(x, z) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf); return (hash(xi, zi) * (1 - u) + hash(xi + 1, zi) * u) * (1 - v) + (hash(xi, zi + 1) * (1 - u) + hash(xi + 1, zi + 1) * u) * v; }
const fbm = (x, z) => noise(x, z) * 0.6 + noise(x * 2.3, z * 2.3) * 0.3 + noise(x * 5.1, z * 5.1) * 0.1;
const SINK = -0.85; // the edge of a site sits just over the country round the city (openworld.js: -0.9) and under its streets
const BIOME = {
  grass: { low: '#86a159', high: '#bba86a', alt: '#a7a35c', forest: '#4a7a3a', rock: '#9d927f', trees: 0.16, grove: 0.62, crown: ['#557f38', '#668f40', '#476f33'] }, // Ngong: highland grass, forest on the lower slopes
  forest: { low: '#6f9d4a', high: '#5f8e42', alt: '#86a54e', forest: '#3f6f33', rock: '#8f8574', trees: 0.5, grove: 0.4, crown: ['#3f7a35', '#4e8a3a', '#2f6a30'] }, // Aburi: closed forest and farms
  rock: { low: '#8ea456', high: '#a2a361', alt: '#9caf5b', forest: '#5f8a40', rock: '#a59d92', trees: 0.1, grove: 0.7, crown: ['#7a9448', '#8aa050', '#6b8a45'] }, // Abuja: savanna and bare granite
};
const TRAIL = '#a98457';

function decode(site) {
  const N = site.n, b = atob(site.h), u8 = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i);
  const i16 = new Int16Array(u8.buffer), H = new Float32Array(N * N); for (let i = 0; i < N * N; i++) H[i] = i16[i] / 10;
  const fb = atob(site.forest || ''), F = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) F[i] = fb.length ? (fb.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1 : 0;
  return { H, F };
}

/**
 * @param data hills.json; off the open city's offset (openworld.js api.offset: bake frame minus scene frame)
 * @returns { group, sites, heightAt(x, z), siteAt(x, z), update(dt), dispose }
 */
export function createHills(data, { quality = 'medium', off = { x: 0, z: 0 } } = {}) {
  const group = new THREE.Group(); group.name = 'hills';
  const low = quality === 'low', mats = [], sites = [];
  const treeN = { low: 700, medium: 2200, high: 4000, ultra: 5500 }[quality] || 2200;
  for (const s of data.sites || []) {
    const first = group.children.length; // everything this site adds goes into its near group at the end
    const { H, F } = decode(s), N = s.n, S = s.size, half = S / 2, step = S / (N - 1), B = BIOME[s.biome] || BIOME.grass;
    const ox = s.x - off.x, oz = s.z - off.z; // the site's centre in the scene
    const hAt = (lx, lz) => { // on the drawn triangles exactly (each cell split from its top right to its bottom left), in the site's frame
      const fc = (lx + half) / step, fr = (lz + half) / step; if (fc < 0 || fr < 0 || fc > N - 1 || fr > N - 1) return null;
      const c = Math.min(N - 2, Math.floor(fc)), r = Math.min(N - 2, Math.floor(fr)), a = fc - c, b = fr - r;
      const h00 = H[r * N + c], h01 = H[r * N + c + 1], h10 = H[(r + 1) * N + c], h11 = H[(r + 1) * N + c + 1];
      return (a + b <= 1 ? h00 + a * (h01 - h00) + b * (h10 - h00) : h11 + (1 - a) * (h10 - h11) + (1 - b) * (h01 - h11)) + SINK;
    };
    const site = { name: s.name, summit: s.summit, biome: s.biome, x: ox, z: oz, half, relief: s.relief, top_m: s.top_m, base: s.base, hAt, features: s.features || [],
      start: { x: ox + s.start[0], z: oz + s.start[1] }, top: { x: ox + s.top[0], z: oz + s.top[1] },
      hike: s.hike.map(([x, z]) => ({ x: ox + x, z: oz + z })), bike: s.bike.map(([x, z]) => ({ x: ox + x, z: oz + z })), trails: s.trails };
    sites.push(site);
    // ---------- the ground: one mesh, coloured by height, slope, forest, and fading to the country at the edge ----------
    const k = 1, M = N, pos = new Float32Array(M * M * 3), col = new Float32Array(M * M * 3), idx = [];
    const cLow = new THREE.Color(B.low), cHigh = new THREE.Color(B.high), cAlt = new THREE.Color(B.alt), cFor = new THREE.Color(B.forest), cRock = new THREE.Color(B.rock), cEdge = new THREE.Color('#79a85a'), c = new THREE.Color();
    const maxH = Math.max(1, s.relief);
    for (let r = 0; r < M; r++) for (let q = 0; q < M; q++) {
      const R = Math.min(N - 1, r * k), Q = Math.min(N - 1, q * k), h = H[R * N + Q], i = r * M + q;
      pos.set([ox - half + Q * step, h + SINK, oz - half + R * step], i * 3);
      const gx = (H[R * N + Math.min(N - 1, Q + 1)] - H[R * N + Math.max(0, Q - 1)]) / (2 * step), gz = (H[Math.min(N - 1, R + 1) * N + Q] - H[Math.max(0, R - 1) * N + Q]) / (2 * step), slope = Math.hypot(gx, gz);
      const wx = (Q * step) / 900, wz = (R * step) / 900, pn = fbm(wx, wz);
      c.copy(cLow).lerp(cHigh, Math.min(1, h / maxH)).lerp(cAlt, Math.max(0, pn - 0.45) * 1.6);
      c.offsetHSL(0, 0, (-gx * 0.6 + gz * 0.35) * 0.18); // the side toward the morning sun a shade lighter
      if (F[R * N + Q] || (h > 3 && h < maxH * 0.55 && fbm(wx * 2.2 + 7, wz * 2.2) > B.grove)) c.lerp(cFor, 0.7);
      c.lerp(cRock, Math.max(0, Math.min(1, (slope - (s.biome === 'rock' ? 0.32 : 0.55)) * 3)));
      const edge = Math.min(R, Q, N - 1 - R, N - 1 - Q) / (N * 0.12); c.lerp(cEdge, Math.max(0, 1 - edge));
      const n = Math.sin(Q * 12.9898 + R * 78.233) * 43758.5453; c.offsetHSL(0, 0, ((n - Math.floor(n)) - 0.5) * 0.03); // a little grain
      col.set([c.r, c.g, c.b], i * 3);
    }
    for (let r = 0; r < M - 1; r++) for (let q = 0; q < M - 1; q++) { const a = r * M + q, b = a + 1, d = a + M, e = d + 1; idx.push(a, d, b, b, d, e); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    const gm = hazed(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: false })); mats.push(gm);
    const ground = new THREE.Mesh(g, gm); ground.receiveShadow = true; ground.name = `hills:${s.name}`; group.add(ground);
    const Y = (x, z) => hAt(x - ox, z - oz) ?? SINK;
    site.near = new THREE.Group(); group.add(site.near); site.near.add(ground);
    { const fk = 4, FM = Math.floor((N - 1) / fk) + 1, fp = new Float32Array(FM * FM * 3), fc = new Float32Array(FM * FM * 3), fi = [];
      for (let r = 0; r < FM; r++) for (let q = 0; q < FM; q++) { const Rr = Math.min(N - 1, r * fk), Qq = Math.min(N - 1, q * fk), src = (Math.min(M - 1, Math.round(Rr / k)) * M + Math.min(M - 1, Math.round(Qq / k))) * 3; fp.set([ox - half + Qq * step, H[Rr * N + Qq] + SINK, oz - half + Rr * step], (r * FM + q) * 3); fc.set([col[src], col[src + 1], col[src + 2]], (r * FM + q) * 3); }
      for (let r = 0; r < FM - 1; r++) for (let q = 0; q < FM - 1; q++) { const a = r * FM + q; fi.push(a, a + FM, a + 1, a + 1, a + FM, a + FM + 1); }
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3)); fg.setAttribute('color', new THREE.BufferAttribute(fc, 3)); fg.setIndex(fi); fg.computeVertexNormals();
      site.uHaze = { value: 0.4 }; const fm = farHazed(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, depthWrite: false }), site.uHaze); mats.push(fm);
      site.far = new THREE.Mesh(fg, fm); site.far.renderOrder = -1.5; site.far.matrixAutoUpdate = false; site.far.frustumCulled = false; site.far.visible = false; group.add(site.far); }

    // ---------- the paths, laid on the ground as ribbons; the hiking route a little wider ----------
    const ribbon = (pts, w, out, lift = 0.25) => {
      for (let i = 0; i + 1 < pts.length; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.5) continue;
        const n = Math.max(1, Math.ceil(L / 12)), nx = -(z1 - z0) / L * w / 2, nz = (x1 - x0) / L * w / 2;
        for (let j = 0; j < n; j++) {
          const t0 = j / n, t1 = (j + 1) / n, ax = x0 + (x1 - x0) * t0, az = z0 + (z1 - z0) * t0, bx = x0 + (x1 - x0) * t1, bz = z0 + (z1 - z0) * t1;
          const p = [[ax - nx, az - nz], [ax + nx, az + nz], [bx - nx, bz - nz], [bx + nx, bz + nz]].map(([x, z]) => [x + ox, Y(x + ox, z + oz) + lift, z + oz]);
          out.push(...p[0], ...p[2], ...p[1], ...p[1], ...p[2], ...p[3]);
        }
      }
    };
    const tp = []; s.trails.forEach(([kind, , pts]) => ribbon(pts, kind === 'track' ? 3.6 : 2.4, tp, 0.35));
    ribbon(s.hike, 3.0, tp, 0.4); ribbon(s.bike, 2.6, tp, 0.38);
    if (tp.length) { const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3)); tg.computeVertexNormals(); const tm = hazed(new THREE.MeshStandardMaterial({ color: TRAIL, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 })); mats.push(tm); group.add(new THREE.Mesh(tg, tm)); }

    // ---------- trees: where the forest is, and as the place's slopes have them; never on a path ----------
    const segs = []; [...s.trails.map((t) => t[2]), s.hike, s.bike].forEach((pts) => { for (let i = 0; i + 1 < pts.length; i++) segs.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]]); });
    const nearPath = (x, z, d) => segs.some(([ax, az, bx, bz]) => { if (Math.min(ax, bx) - d > x || Math.max(ax, bx) + d < x || Math.min(az, bz) - d > z || Math.max(az, bz) + d < z) return false; const vx = bx - ax, vz = bz - az, L = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / L)); return Math.hypot(ax + vx * t - x, az + vz * t - z) < d; });
    let seed = 1 + s.name.length * 7919; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const trees = [];
    for (let tries = 0; tries < treeN * 8 && trees.length < treeN; tries++) {
      // most of them near the trails, where you are; the rest across the hills
      let lx = (rnd() * 2 - 1) * half * 0.88, lz = (rnd() * 2 - 1) * half * 0.88;
      if (rnd() < 0.6) { const rt = rnd() < 0.5 ? s.hike : s.bike, i = Math.floor(rnd() * (rt.length - 1)), u = rnd(), sp = 30 + rnd() * rnd() * 350, a = rnd() * Math.PI * 2; lx = Math.max(-half * 0.88, Math.min(half * 0.88, rt[i][0] + (rt[i + 1][0] - rt[i][0]) * u + Math.cos(a) * sp)); lz = Math.max(-half * 0.88, Math.min(half * 0.88, rt[i][1] + (rt[i + 1][1] - rt[i][1]) * u + Math.sin(a) * sp)); }
      const R = Math.round((lz + half) / step), Q = Math.round((lx + half) / step), fo = F[R * N + Q];
      const h = H[R * N + Q]; if (h < 2) continue;
      const grove = h < maxH * 0.55 && fbm(((lx + half) / 900) * 2.2 + 7, ((lz + half) / 900) * 2.2) > B.grove;
      const p = fo || grove ? 0.9 : B.trees * (s.biome === 'grass' ? Math.max(0.15, 1 - h / maxH) : 1); if (rnd() > p) continue;
      if (nearPath(lx, lz, 4)) continue;
      trees.push([lx, lz, 0.7 + rnd() * 0.8, Math.floor(rnd() * 3)]);
    }
    if (trees.length) {
      const crownG = new THREE.IcosahedronGeometry(1, 1).scale(2.6, 2.2, 2.6).translate(0, 5.2, 0), trunkG = new THREE.CylinderGeometry(0.22, 0.32, 3.6, 6).translate(0, 1.8, 0);
      const cm = hazed(new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true })), km = hazed(new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 0.9 })); mats.push(cm, km);
      const crowns = new THREE.InstancedMesh(crownG, cm, trees.length), trunks = new THREE.InstancedMesh(trunkG, km, trees.length), m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), cc = B.crown.map((x) => new THREE.Color(x));
      trees.forEach(([lx, lz, sc, ci], i) => { m4.compose(new THREE.Vector3(ox + lx, Y(ox + lx, oz + lz) - 0.2, oz + lz), q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), lx * 0.37), new THREE.Vector3(sc, sc * (0.9 + (i % 5) * 0.06), sc)); crowns.setMatrixAt(i, m4); trunks.setMatrixAt(i, m4); crowns.setColorAt(i, cc[ci]); });
      crowns.castShadow = !low; [crowns, trunks].forEach((m) => { m.frustumCulled = false; group.add(m); });
    }
    // boulders on Abuja's granite: the domes and the loose rocks on their slopes
    if (s.biome === 'rock') {
      const rocks = []; for (let tries = 0; tries < 6000 && rocks.length < (low ? 120 : 360); tries++) { const lx = (rnd() * 2 - 1) * half * 0.85, lz = (rnd() * 2 - 1) * half * 0.85, R = Math.round((lz + half) / step), Q = Math.round((lx + half) / step), h = H[R * N + Q]; if (h < maxH * 0.25 || rnd() > 0.5 || nearPath(lx, lz, 3)) continue; rocks.push([lx, lz, 1.5 + rnd() * 5]); }
      const rm = hazed(new THREE.MeshStandardMaterial({ color: '#b3a796', roughness: 0.85, flatShading: true })); mats.push(rm);
      const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), rm, rocks.length), m4 = new THREE.Matrix4();
      rocks.forEach(([lx, lz, sz], i) => { m4.compose(new THREE.Vector3(ox + lx, Y(ox + lx, oz + lz) + sz * 0.25, oz + lz), new THREE.Quaternion().setFromEuler(new THREE.Euler(lx, lz, 0)), new THREE.Vector3(sz, sz * 0.7, sz * 1.1)); im.setMatrixAt(i, m4); });
      im.frustumCulled = false; group.add(im);
    }

    // ---------- the trailhead gate, the route's posts, the summit cairn and its sign ----------
    const wood = hazed(new THREE.MeshStandardMaterial({ color: '#8a5a34', roughness: 0.85 })), paint = hazed(new THREE.MeshStandardMaterial({ color: '#e46f4f', roughness: 0.7 })), stone = hazed(new THREE.MeshStandardMaterial({ color: '#9d9384', roughness: 0.9, flatShading: true })); mats.push(wood, paint, stone);
    const signTex = (top, sub) => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192; const x = cv.getContext('2d'); x.fillStyle = '#2f5a3a'; x.fillRect(0, 0, 512, 192); x.strokeStyle = '#f2e8cf'; x.lineWidth = 8; x.strokeRect(10, 10, 492, 172); x.fillStyle = '#f2e8cf'; x.textAlign = 'center'; x.font = `800 46px ${FONT}`; x.fillText(top, 256, 86); x.font = `600 30px ${FONT}`; x.fillText(sub, 256, 140); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const sign = (top, sub, at, yaw) => { const gg = new THREE.Group(); gg.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14).translate(-1.1, 1.3, 0), wood), new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14).translate(1.1, 1.3, 0), wood)); const tx = signTex(top, sub); [0, Math.PI].forEach((ry) => { const bd = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.98), new THREE.MeshBasicMaterial({ map: tx })); bd.position.y = 2.05; bd.rotation.y = ry; bd.position.z = ry ? -0.01 : 0.01; gg.add(bd); }); /* readable from both sides */ gg.position.set(at.x, Y(at.x, at.z), at.z); gg.rotation.y = yaw; group.add(gg); return gg; };
    const dir = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
    const h1 = site.hike[1] || site.top;
    // the gate: two posts and a beam over the start of the route
    { const gg = new THREE.Group(); [-1.8, 1.8].forEach((x) => gg.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3).translate(x, 2, 0), wood))); gg.add(new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.4, 0.4).translate(0, 4, 0), wood)); gg.add(new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 0.42).translate(0, 4.26, 0), paint)); gg.position.set(site.start.x, Y(site.start.x, site.start.z), site.start.z); gg.rotation.y = dir(site.start, h1); group.add(gg); }
    sign(s.name.replace(/^the /, (m) => m.toUpperCase()), `${(s.top_m || 0).toLocaleString()} m at the top · hiking and bike trails`, { x: site.start.x + Math.cos(dir(site.start, h1)) * 4, z: site.start.z - Math.sin(dir(site.start, h1)) * 4 }, dir(site.start, h1) + Math.PI);
    // posts with a painted band every 120 m along the hiking route, so you can see the way up from below
    { const geos = []; let acc = 0; for (let i = 0; i + 1 < site.hike.length; i++) { const a = site.hike[i], b = site.hike[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z); for (let d = (120 - acc) % 120; d < L; d += 120) { const x = a.x + (b.x - a.x) * d / L + 1.6, z = a.z + (b.z - a.z) * d / L; geos.push(new THREE.BoxGeometry(0.16, 1.3, 0.16).translate(x, Y(x, z) + 0.65, z)); } acc = (acc + L) % 120; } if (geos.length) group.add(new THREE.Mesh(mergeGeometries(geos), paint)); }
    // the cairn on the summit, a flag on it, and the sign with the summit's name and height
    { const T = site.top, ty = Y(T.x, T.z), geos = []; for (let i = 0; i < 9; i++) { const r = 1.3 - i * 0.13; geos.push(new THREE.DodecahedronGeometry(r, 0).translate(T.x + Math.sin(i * 2.1) * 0.15, ty + i * 0.32 + 0.3, T.z + Math.cos(i * 2.1) * 0.15)); } group.add(new THREE.Mesh(mergeGeometries(geos.map((q) => q.toNonIndexed())), stone));
      group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 6).translate(T.x, ty + 4, T.z), wood)); const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), paint); fl.position.set(T.x + 0.6, ty + 5.1, T.z); group.add(fl); site.flag = fl;
      sign(s.summit || s.name, `${(s.top_m || 0).toLocaleString()} m above the sea`, { x: T.x + 3, z: T.z + 2 }, dir(T, site.start)); }
    // the wind farm along the Ngong ridge (KenGen's turbines), turning
    site.blades = [];
    if (site.features.includes('wind farm')) {
      const tw = hazed(new THREE.MeshStandardMaterial({ color: '#eef0f0', roughness: 0.5 })); mats.push(tw);
      const ridge = []; for (let r = Math.floor(N * 0.12); r < N * 0.88; r += 6) { let best = -1, bq = 0; for (let q = Math.floor(N * 0.12); q < N * 0.88; q++) if (H[r * N + q] > best) { best = H[r * N + q]; bq = q; } if (best > maxH * 0.7) ridge.push([-half + bq * step + 60, -half + r * step]); }
      ridge.forEach(([lx, lz]) => { const x = ox + lx, z = oz + lz, y = Y(x, z); const tg = new THREE.Group(); tg.position.set(x, y, z); tg.add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.8, 55, 10).translate(0, 27.5, 0), tw)); tg.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 6).translate(0, 55.5, -0.5), tw)); const hub = new THREE.Group(); hub.position.set(0, 55.5, 2.8); tg.add(hub); for (let b = 0; b < 3; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 26, 0.35).translate(0, 13, 0), tw); bl.rotation.z = (b * Math.PI * 2) / 3; hub.add(bl); } tg.rotation.y = -Math.PI / 2; group.add(tg); site.blades.push(hub); });
    }
    group.children.slice(first).forEach((ch) => { if (ch !== site.far && ch !== site.near) site.near.add(ch); });
  }

  let t = 0;
  return {
    group, sites,
    heightAt(x, z) { for (const s of sites) { const y = s.hAt(x - s.x, z - s.z); if (y != null) return y; } return null; },
    siteAt(x, z) { return sites.find((s) => Math.abs(x - s.x) < s.half && Math.abs(z - s.z) < s.half) || null; },
    update(dt, camera, fog) {
      t += dt;
      // near: the real thing, when all of it is inside the camera's reach; far: the copy, scaled about the camera
      if (camera) sites.forEach((s) => {
        const cp = camera.position, d = Math.hypot(cp.x - s.x, cp.z - s.z), near = d + s.half * 1.2 < camera.far * 0.95;
        s.near.visible = near; s.far.visible = !near;
        if (!near) {
          const k = Math.min(1, (camera.far * 0.6) / (d + s.half * 1.5)), m = s.far.matrix; m.makeTranslation(cp.x * (1 - k), cp.y * (1 - k), cp.z * (1 - k)).multiply(new THREE.Matrix4().makeScale(k, k, k)); s.far.matrixWorldNeedsUpdate = true;
          s.uHaze.value = fog ? Math.min(0.78, THREE.MathUtils.smoothstep(d, fog.near, fog.far * HAZE)) : 0.45;
        }
      });
      sites.forEach((s) => { s.blades.forEach((h, i) => { h.rotation.z = t * 1.6 + i; }); if (s.flag) s.flag.rotation.y = Math.sin(t * 2) * 0.3; }); },
    dispose() { group.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); m.material.map?.dispose?.(); } }); mats.forEach((m) => m.dispose()); group.removeFromParent(); },
  };
}
