import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// What each city's tile on the city sheet stands on (world bible 5.1): its own ground (Lagos on its
// lagoon, Port Harcourt on its river, Accra on the sea, Abuja and Nairobi in their hills, Uyo rolling
// and green) and its landmark. Tile units: the tile is about 100 across, centred on 0; y is up.

const gauss = (x, z, cx, cz, r) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
// h: ground height (above 0 is land; water where water() says so); tint: grass colour; trees per 100 m²
export const LANDMARK_NAME = { Lagos: 'Lekki-Ikoyi Link Bridge', Abuja: 'Zuma Rock, National Mosque', 'Port Harcourt': 'Pleasure Park wheel', Uyo: 'Ibom Plaza, the stadium', Nairobi: 'KICC', Accra: 'Independence Arch' };
export const TERRAIN = {
  Lagos: { water: (x, z) => z - x * 0.35 < -30, h: () => 0, grass: 0x9fb06f, trees: 0.6, landmark: 'lagos' },
  Abuja: { water: () => false, h: (x, z) => 9 * gauss(x, z, -38, -30, 16) + 6 * gauss(x, z, -42, 14, 14) + 4 * gauss(x, z, 30, -40, 14), grass: 0xa9ad72, rock: true, trees: 0.4, landmark: 'abuja' },
  'Port Harcourt': { water: (x, z) => Math.abs(x * 0.72 - z * 0.69 - 30) < 7, h: () => 0, grass: 0x8fb26a, trees: 1.4, mangrove: true, landmark: 'ph' },
  Uyo: { water: () => false, h: (x, z) => 1.4 * (Math.sin(x * 0.09) + Math.cos(z * 0.08 + 1)) + 1.4, grass: 0x8fbb67, trees: 1.6, landmark: 'uyo' },
  Nairobi: { water: () => false, h: (x, z) => 11 * gauss(x, z, -46, 0, 18) + 7 * gauss(x, z, -30, 34, 14), grass: 0x9fb578, trees: 0.6, acacia: true, landmark: 'nairobi' },
  Accra: { water: (x, z) => z + x * 0.2 > 30, sand: (x, z) => z + x * 0.2 > 23, h: () => 0, grass: 0xa8ad74, trees: 0.5, palms: true, landmark: 'accra' },
};

// the hexagon the tile's cylinder makes (radius R, six sides, turned 30°), and a point pulled onto it
function hexPoints(R) { const g = new THREE.CylinderGeometry(R, R, 1, 6).rotateY(Math.PI / 6), p = g.attributes.position, out = []; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.4 && Math.hypot(p.getX(i), p.getZ(i)) > R * 0.9) out.push([p.getX(i), p.getZ(i)]); g.dispose(); const uniq = []; out.forEach((q) => { if (!uniq.some((u) => Math.hypot(u[0] - q[0], u[1] - q[1]) < 0.01)) uniq.push(q); }); return uniq.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0])); }
function inside(x, z, H) { let c = false; for (let i = 0, j = H.length - 1; i < H.length; j = i++) { const [xi, zi] = H[i], [xj, zj] = H[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; }
function clampTo(x, z, H) { if (inside(x, z, H)) return [x, z]; let best = [x, z], bd = Infinity; for (let i = 0; i < H.length; i++) { const [ax, az] = H[i], [bx, bz] = H[(i + 1) % H.length], dx = bx - ax, dz = bz - az, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))), px = ax + dx * u, pz = az + dz * u, d = Math.hypot(x - px, z - pz); if (d < bd) { bd = d; best = [px, pz]; } } return best; }

// the ground: a fine grid pulled to the hexagon, raised into hills, coloured by height; water and sand on top
export function terrainFor(city, R, rng) {
  const T = TERRAIN[city] || TERRAIN.Uyo, H = hexPoints(R);
  const height = (x, z) => (T.water(x, z) ? -0.6 : Math.max(0, T.h(x, z)));
  const N = 56, geo = new THREE.PlaneGeometry(R * 2, R * 2, N, N).rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = [];
  const grass = new THREE.Color(T.grass), high = new THREE.Color(0xc9b48a), sand = new THREE.Color(0xe8d6a8), mud = new THREE.Color(0x6f7f5a);
  for (let i = 0; i < p.count; i++) {
    const [x, z] = clampTo(p.getX(i), p.getZ(i), H), y = height(x, z);
    p.setXYZ(i, x, y + 0.04, z);
    const c = T.sand?.(x, z) || (T.water(x, z) && city !== 'Port Harcourt') ? sand.clone() : grass.clone().lerp(high, Math.min(1, y / 10));
    if (T.water(x, z) && city === 'Port Harcourt') c.copy(mud);
    const n = (rng() - 0.5) * 0.05; c.offsetHSL(0, 0, n);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals(); geo.deleteAttribute('uv');
  // water: a flat sheet where the city meets its lagoon, river or sea
  let water = null;
  const wq = [];
  for (let gx = -R; gx < R; gx += 2) for (let gz = -R; gz < R; gz += 2) { const cx = gx + 1, cz = gz + 1; if (inside(cx, cz, H) && T.water(cx, cz)) wq.push(new THREE.PlaneGeometry(2.05, 2.05).rotateX(-Math.PI / 2).translate(cx, 0.25, cz)); }
  if (wq.length) water = mergeGeometries(wq);
  // trees: round clay trees, palms by the sea, flat-topped acacias in Nairobi, mangroves on the river
  const trees = [], trunks = [];
  const count = Math.round(T.trees * R * R * 0.04);
  for (let k = 0; k < count * 3 && trees.length < count * 2; k++) {
    const x = (rng() * 2 - 1) * R * 0.95, z = (rng() * 2 - 1) * R * 0.95;
    if (!inside(x, z, H) || T.water(x, z) || T.sand?.(x, z)) continue;
    const y = height(x, z), s = 0.8 + rng() * 0.7;
    if (T.acacia) { trunks.push(new THREE.CylinderGeometry(0.15 * s, 0.2 * s, 2.4 * s, 5).translate(x, y + 1.2 * s, z)); trees.push(new THREE.CylinderGeometry(1.9 * s, 1.5 * s, 0.6 * s, 7).translate(x, y + 2.6 * s, z)); }
    else if (T.palms && rng() < 0.6) { trunks.push(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 3 * s, 5).translate(x, y + 1.5 * s, z)); trees.push(new THREE.ConeGeometry(1.3 * s, 0.9 * s, 6).translate(x, y + 3.1 * s, z)); }
    else { trees.push(new THREE.IcosahedronGeometry(1.1 * s, 0).translate(x, y + 1.3 * s, z)); trunks.push(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 0.9 * s, 5).translate(x, y + 0.45 * s, z)); }
  }
  if (T.mangrove) for (let k = 0; k < 90; k++) { const x = (rng() * 2 - 1) * R, z = (rng() * 2 - 1) * R; if (!inside(x, z, H)) continue; const d = Math.abs(x * 0.72 - z * 0.69 - 30); if (d < 7 || d > 10.5) continue; trees.push(new THREE.IcosahedronGeometry(0.9 + rng() * 0.5, 0).translate(x, 0.9, z)); }
  return { geo, water, trees: trees.length ? mergeGeometries(trees.map((g) => g.toNonIndexed())) : null, trunks: trunks.length ? mergeGeometries(trunks.map((g) => g.toNonIndexed())) : null, height, isWater: T.water, H, T };
}

// ---------- landmarks, drawn like the rest of the sheet: chunky clay shapes ----------
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
export function landmarkFor(city, terrain) {
  const T = TERRAIN[city] || {}, g = new THREE.Group(), add = (geo, color, opts = {}) => { const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, ...opts })); g.add(m); return m; };
  const light = 0xf3ead6, concrete = 0xe1d7c2;
  if (T.landmark === 'lagos') {
    // the Lekki-Ikoyi Link Bridge: one tall pylon, a fan of cables, the curving deck over the lagoon
    const deck = []; for (let k = -10; k <= 10; k++) { const t = k / 10; deck.push(box(3.2, 0.5, 2.4, t * 22, 1.6 - t * t * 0.9, 0)); }
    add(mergeGeometries(deck), concrete);
    add(box(1.2, 18, 1.2, 0, 9, 0), light);
    const cables = []; [-1, 1].forEach((s) => { for (let k = 2; k <= 10; k += 2) { const L = Math.hypot(k * 2.1, 16 - 1.6); cables.push(new THREE.CylinderGeometry(0.08, 0.08, L, 4).rotateZ(-s * Math.atan2(k * 2.1, 14.4)).translate(s * k * 1.05, 9.6, 0)); } });
    add(mergeGeometries(cables), 0xffffff);
    g.position.set(18, 0, -40); g.rotation.y = -0.35;
  } else if (T.landmark === 'abuja') {
    // Zuma Rock, the dome on the road in, and the National Mosque's gold dome between its minarets
    const rock = new THREE.SphereGeometry(13, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.05, 0.8);
    add(rock, 0xc2ad92).position.set(-38, 0, -30);
    const streaks = []; for (let k = -2; k <= 2; k++) streaks.push(box(0.5, 9, 0.5, -38 + k * 4, 6, -30 + 10));
    add(mergeGeometries(streaks), 0x8d7a64);
    add(new THREE.SphereGeometry(4.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0xd9b04a).position.set(30, 4.5, 36);
    add(box(9, 4.5, 9, 30, 2.25, 36), light);
    [-6.5, 6.5].forEach((dx) => { add(new THREE.CylinderGeometry(0.6, 0.7, 14, 8).translate(30 + dx, 7, 36), light); add(new THREE.ConeGeometry(0.8, 2, 8).translate(30 + dx, 15, 36), 0x2f8a5a); });
  } else if (T.landmark === 'ph') {
    // the Garden City's Pleasure Park wheel
    const ring = new THREE.TorusGeometry(8, 0.35, 6, 32); add(ring, 0xe46f4f).position.set(-30, 10, 30);
    const spokes = []; for (let k = 0; k < 8; k++) spokes.push(box(0.2, 16, 0.2).rotateZ((k / 8) * Math.PI)); const sp = add(mergeGeometries(spokes), 0xffffff); sp.position.set(-30, 10, 30);
    add(box(0.6, 10, 0.6, -33, 5, 30).rotateZ(0), concrete); add(box(0.6, 10, 0.6, -27, 5, 30), concrete);
    const cars = []; for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; cars.push(box(1.2, 1.2, 1.2, -30 + Math.cos(a) * 8, 10 + Math.sin(a) * 8, 30)); } add(mergeGeometries(cars), 0xf2b33d);
  } else if (T.landmark === 'uyo') {
    // Ibom Plaza: the tiered fountain at the heart of town, and the stadium's arches behind
    add(new THREE.CylinderGeometry(7, 7.5, 1.2, 24).translate(0, 0.6 + 2.2, 0), concrete); add(new THREE.CylinderGeometry(6.2, 6.2, 0.2, 24).translate(0, 1.3 + 2.2, 0), 0x6fc3d9);
    add(new THREE.CylinderGeometry(3, 3.4, 1.4, 20).translate(0, 2.4 + 2.2, 0), light); add(new THREE.CylinderGeometry(0.6, 0.8, 4, 10).translate(0, 4.6 + 2.2, 0), light);
    const st = new THREE.TorusGeometry(14, 1, 6, 28, Math.PI).rotateX(-Math.PI / 2); add(st, 0xd65a8f).position.set(30, 2.6, -30);
    add(new THREE.TorusGeometry(10, 0.8, 6, 24, Math.PI).rotateX(-Math.PI / 2), 0xe8e0d0).position.set(30, 5, -30);
  } else if (T.landmark === 'nairobi') {
    // KICC: the round tower with its crown, and the conference hall's cone beside it
    add(new THREE.CylinderGeometry(2.6, 2.6, 24, 16).translate(18, 12, 26), 0xc87a4a);
    add(new THREE.CylinderGeometry(4.6, 3.4, 1.6, 20).translate(18, 24.8, 26), 0xc87a4a);
    add(new THREE.CylinderGeometry(0.4, 0.4, 4, 6).translate(18, 27.5, 26), light);
    add(new THREE.ConeGeometry(4.5, 6, 12).translate(25, 3, 26), 0xb06a3e);
  } else if (T.landmark === 'accra') {
    // the Independence Arch (Black Star Gate) facing the sea, with its star on top
    add(box(18, 3, 4, 0, 13.5, 22), light); [-7.5, 7.5].forEach((dx) => add(box(3, 12, 4, dx, 6, 22), light));
    const star = new THREE.Shape(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 1.2 : 3, a = -Math.PI / 2 + (k * Math.PI) / 5; (k ? star.lineTo.bind(star) : star.moveTo.bind(star))(Math.cos(a) * r, -Math.sin(a) * r); }
    add(new THREE.ExtrudeGeometry(star, { depth: 0.8, bevelEnabled: false }).translate(0, 18, 21.6), 0x1b1b1b);
    add(box(1.4, 9, 1.4, -36, 4.5, 30), 0xffffff); add(box(2, 2, 2, -36, 10, 30), 0xe46f4f); // the lighthouse on the shore
  }
  // stand it on the ground
  if (terrain && T.landmark !== 'lagos') g.children.forEach((m) => { m.geometry.computeBoundingBox(); const c = m.geometry.boundingBox.getCenter(new THREE.Vector3()).add(m.position); m.position.y += Math.max(0, terrain.height(c.x, c.z)); });
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  return g;
}
