import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { streamMaterial, streamInstances } from './stream.js';

// Trees, shrubs and flowers (Elvis, 10 October 2026: "a variety of trees... 10 different species of trees that are
// used across cities, trees with colors, white, pink... shrubs, flowers, for decorating homes"). Ten species that
// really line the streets and fill the parks of Lagos, Abuja, Port Harcourt, Uyo, Accra and Nairobi, each in the
// clay style, sized as they grow (metres), with the colour each is known for. Every model is one geometry with
// vertex colours, so a whole district of one species is a single instanced draw.

// ---------- building blocks: low-poly blobs, cylinders and cones, coloured per vertex ----------
const paint = (geo, hex) => {
  const g = geo.index ? geo.toNonIndexed() : geo, c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const s = 0.92 + ((i * 7919) % 17) / 100; a[i * 3] = c.r * s; a[i * 3 + 1] = c.g * s; a[i * 3 + 2] = c.b * s; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g;
};
// LITE builds the same model with fewer faces: the light copy drawn past the streaming ring (treeLite)
let LITE = false;
const blob = (x, y, z, rx, ry, rz, hex, detail = 1) => paint(new THREE.IcosahedronGeometry(1, LITE ? 0 : detail).scale(rx, ry, rz).translate(x, y, z), hex);
const cyl = (r0, r1, h, x, y, z, hex, seg = 7) => paint(new THREE.CylinderGeometry(r1, r0, h, LITE ? Math.min(seg, 5) : seg).translate(x, y + h / 2, z), hex);
// a limb from (x0, y0, z0) to (x1, y1, z1)
const limb = (x0, y0, z0, x1, y1, z1, r0, r1, hex) => {
  const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), L = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r1, r0, L, LITE ? 3 : 6).translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())).translate(x0, y0, z0);
  return paint(g, hex);
};
const merge = (parts) => mergeGeometries(parts);
// a seeded scatter, so every tree of a species is the same model
const seeded = (s) => () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 8) / 16777216; };
// a canopy: a cluster of blobs over an ellipsoid, some tinted with the flower colour on the sunny upper side
function canopy(parts, { y, rx, ry, rz = rx, n = 12, leaf, leaf2, bloom = null, share = 0, lump = 0.55, seed = 1 }) {
  const r = seeded(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, u = r() * 2 - 1, k = Math.sqrt(1 - u * u) * (0.55 + r() * 0.45);
    const x = Math.cos(a) * k * rx, z = Math.sin(a) * k * rz, yy = y + u * ry * 0.7, s = lump * (0.8 + r() * 0.5);
    const top = yy > y - ry * 0.1, col = bloom && top && r() < share ? bloom : r() < 0.5 ? leaf : leaf2;
    parts.push(blob(x, yy, z, rx * s * 0.62, ry * s * 0.85, rz * s * 0.62, col));
  }
}
const BARK = '#8a6446', BARK2 = '#6e5440', PALM = '#a89a82';

// ---------- the ten species ----------
export const TREES = {
  // Delonix regia: the flame tree of every West African compound and Nairobi avenue; a flat umbrella, red in the dry season
  flamboyant: { name: 'Flamboyant', sci: 'Delonix regia', colour: 'flame red', fact: 'Flowers scarlet from November to March; the flat crown shades a whole compound.', h: 7, r: 0.45,
    build() { const p = [cyl(0.32, 0.22, 2.6, 0, 0, 0, BARK)]; [[2.2, 0.4], [-1.8, 1.4], [0.4, -2.1], [-0.6, 2]].forEach(([x, z]) => p.push(limb(0, 2.4, 0, x, 4.3, z, 0.16, 0.08, BARK)));
      canopy(p, { y: 4.9, rx: 4.2, ry: 1.0, n: 18, leaf: '#5d8f3e', leaf2: '#6fa047', bloom: '#e5482a', share: 0.75, lump: 0.42, seed: 3 }); return merge(p); } },
  // Jacaranda mimosifolia: Nairobi in October, purple overhead and on the pavement
  jacaranda: { name: 'Jacaranda', sci: 'Jacaranda mimosifolia', colour: 'violet', fact: 'Nairobi turns purple in October and November when the jacarandas flower.', h: 8, r: 0.4,
    build() { const p = [cyl(0.26, 0.18, 3, 0, 0, 0, BARK2)]; [[1.4, 0.6], [-1.2, -0.8], [0.2, 1.5]].forEach(([x, z]) => p.push(limb(0, 2.8, 0, x, 5, z, 0.13, 0.07, BARK2)));
      canopy(p, { y: 5.8, rx: 3.2, ry: 1.7, n: 16, leaf: '#8c6fd0', leaf2: '#9d82dc', bloom: '#6f9a4a', share: 0.18, lump: 0.5, seed: 5 }); return merge(p); } },
  // Tabebuia rosea: pink trumpets on bare branches, planted down central reservations
  pinkTrumpet: { name: 'Pink trumpet tree', sci: 'Tabebuia rosea', colour: 'pink', fact: 'Drops its leaves, then flowers pink all over before the rains.', h: 7, r: 0.38,
    build() { const p = [cyl(0.24, 0.17, 2.8, 0, 0, 0, '#7d6656')]; [[1.1, 0.5], [-1, 0.7], [0.1, -1.2]].forEach(([x, z]) => p.push(limb(0, 2.6, 0, x, 4.4, z, 0.12, 0.06, '#7d6656')));
      canopy(p, { y: 5.2, rx: 2.8, ry: 1.6, n: 15, leaf: '#f08cb8', leaf2: '#f6a8c9', bloom: '#e070a2', share: 0.4, lump: 0.52, seed: 7 }); return merge(p); } },
  // Cassia fistula: the golden shower, yellow chains hanging from the branches
  goldenShower: { name: 'Golden shower', sci: 'Cassia fistula', colour: 'yellow', fact: 'Long hanging chains of yellow flowers; the pods are a market remedy.', h: 7, r: 0.38,
    build() { const p = [cyl(0.25, 0.17, 2.8, 0, 0, 0, BARK)]; canopy(p, { y: 5, rx: 2.9, ry: 1.7, n: 14, leaf: '#6b9a44', leaf2: '#7fae52', lump: 0.5, seed: 9 });
      const r = seeded(11); for (let i = 0; i < 22; i++) { const a = r() * 6.28, k = 1.2 + r() * 1.7, x = Math.cos(a) * k, z = Math.sin(a) * k, L = 0.7 + r() * 0.7; p.push(paint(new THREE.CylinderGeometry(0.12, 0.05, L, 5).translate(x, 4.3 - L / 2 + r() * 0.6, z), '#f5c518')); } return merge(p); } },
  // Plumeria: frangipani, gnarled and low, white flowers with yellow hearts at the tips; the garden tree
  frangipani: { name: 'Frangipani', sci: 'Plumeria alba', colour: 'white', fact: 'Scented white flowers at the tips of thick bare branches; a garden and churchyard favourite.', h: 4.5, r: 0.3,
    build() { const p = [cyl(0.22, 0.17, 1.2, 0, 0, 0, '#9b8a78')]; const r = seeded(13);
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + r() * 0.4, x = Math.cos(a) * (1.1 + r() * 0.5), z = Math.sin(a) * (1.1 + r() * 0.5), y = 2.6 + r() * 0.9; p.push(limb(0, 1.1, 0, x * 0.55, y - 0.8, z * 0.55, 0.12, 0.1, '#9b8a78'), limb(x * 0.55, y - 0.8, z * 0.55, x, y, z, 0.1, 0.08, '#9b8a78'));
        p.push(blob(x, y + 0.2, z, 0.55, 0.32, 0.55, '#5f8f45')); for (let f = 0; f < 4; f++) p.push(blob(x + (r() - 0.5) * 0.6, y + 0.48, z + (r() - 0.5) * 0.6, 0.15, 0.09, 0.15, '#fffaf0', 0)); p.push(blob(x, y + 0.56, z, 0.08, 0.05, 0.08, '#f5c84a', 0)); }
      return merge(p); } },
  // Mangifera indica: the mango, a dark dense dome; every family compound has one
  mango: { name: 'Mango', sci: 'Mangifera indica', colour: 'deep green', fact: 'Dense evergreen shade and fruit from March to June; the meeting tree of the compound.', h: 8, r: 0.5,
    build() { const p = [cyl(0.42, 0.3, 2.2, 0, 0, 0, BARK2)]; canopy(p, { y: 5, rx: 3.6, ry: 2.6, n: 18, leaf: '#2f5a35', leaf2: '#3d6b40', lump: 0.55, seed: 15 });
      const r = seeded(17); for (let i = 0; i < 10; i++) { const a = r() * 6.28; p.push(blob(Math.cos(a) * 3.1, 3.4 + r() * 1.4, Math.sin(a) * 3.1, 0.13, 0.17, 0.13, r() < 0.5 ? '#e9a93a' : '#9cb43a', 0)); } return merge(p); } },
  // Azadirachta indica: neem, the shade tree of Abuja's streets and the north, an oval of small leaves
  neem: { name: 'Neem', sci: 'Azadirachta indica', colour: 'bright green', fact: 'Shade on Abuja streets; "dogoyaro" in Nigeria, its twigs a chewing stick.', h: 9, r: 0.42,
    build() { const p = [cyl(0.3, 0.2, 3.4, 0, 0, 0, '#7a5f4a')]; [[1, 0.5], [-0.9, -0.6], [0.1, 1.1]].forEach(([x, z]) => p.push(limb(0, 3.2, 0, x, 5, z, 0.14, 0.08, '#7a5f4a')));
      canopy(p, { y: 6.2, rx: 2.9, ry: 2.4, n: 20, leaf: '#4f8a3c', leaf2: '#64a04a', lump: 0.45, seed: 19 }); return merge(p); } },
  // Roystonea regia: the royal palm, smooth grey columns along boulevards and estate gates
  royalPalm: { name: 'Royal palm', sci: 'Roystonea regia', colour: 'grey column, green crown', fact: 'Planted in avenues along boulevards and estate entrances; the trunk looks cast in concrete.', h: 13, r: 0.36,
    build() { const p = [cyl(0.36, 0.3, 4, 0, 0, 0, '#c9c4b8', 10), cyl(0.3, 0.26, 6, 0, 4, 0, '#cfcabd', 10), cyl(0.27, 0.22, 1.6, 0, 10, 0, '#6f9a3c', 10)];
      for (let i = 0; i < 12; i++) { const a = i * 0.52, tip = [Math.cos(a) * 3, 10.6 - (i % 3) * 0.6, Math.sin(a) * 3]; p.push(limb(0, 11.6, 0, tip[0] * 0.55, 12.3, tip[2] * 0.55, 0.07, 0.05, '#5d8a35'), limb(tip[0] * 0.55, 12.3, tip[2] * 0.55, tip[0], tip[1], tip[2], 0.05, 0.02, '#5d8a35'));
        p.push(blob(tip[0] * 0.6, 11.8, tip[2] * 0.6, 0.9, 0.12, 0.9, '#6a9a3e', 0)); }
      return merge(p); } },
  // Cocos nucifera: the coconut palm, leaning, of Lagos's beaches and Accra's Osu
  coconut: { name: 'Coconut palm', sci: 'Cocos nucifera', colour: 'green, leaning', fact: 'Leans toward the light and the sea; coconut water sold from barrows below.', h: 10, r: 0.3,
    build() { const p = []; let x = 0, y = 0; for (let i = 0; i < 6; i++) { const nx = x + 0.12 + i * 0.05, ny = y + 1.6; p.push(limb(x, y, 0, nx, ny, 0, 0.26 - i * 0.02, 0.24 - i * 0.02, PALM)); x = nx; y = ny; }
      for (let i = 0; i < 11; i++) { const a = i * 0.57, mid = [x + Math.cos(a) * 1.6, y + 0.6, Math.sin(a) * 1.6], tip = [x + Math.cos(a) * 3.2, y - 0.9, Math.sin(a) * 3.2]; p.push(limb(x, y, 0, mid[0], mid[1], mid[2], 0.07, 0.05, '#4f8a33'), limb(mid[0], mid[1], mid[2], tip[0], tip[1], tip[2], 0.05, 0.02, '#4f8a33'), blob(mid[0], mid[1] - 0.1, mid[2], 0.8, 0.1, 0.8, '#5e9a3c', 0)); }
      for (let i = 0; i < 5; i++) { const a = i * 1.26; p.push(blob(x + Math.cos(a) * 0.35, y - 0.35, Math.sin(a) * 0.35, 0.2, 0.22, 0.2, '#7a8f3a', 0)); }
      return merge(p); } },
  // Vachellia tortilis: the umbrella thorn, flat-topped, of the Nairobi skyline and the savanna
  acacia: { name: 'Umbrella thorn acacia', sci: 'Vachellia tortilis', colour: 'flat green crown', fact: 'The flat-topped tree of the Kenyan savanna, planted along Nairobi\'s roads.', h: 6.5, r: 0.3,
    build() { const p = [cyl(0.22, 0.16, 2.2, 0, 0, 0, '#5a4636')]; [[2.4, 0.8], [-2.1, 1], [0.3, -2.3], [-0.8, -1.6]].forEach(([x, z]) => p.push(limb(0, 2.1, 0, x, 5.4, z, 0.11, 0.05, '#5a4636')));
      canopy(p, { y: 5.8, rx: 4.6, ry: 0.55, n: 20, leaf: '#6d8f3e', leaf2: '#7c9c48', lump: 0.38, seed: 23 }); return merge(p); } },
};
export const SPECIES = Object.keys(TREES);
const treeCache = new Map();
export function treeGeometry(kind) { if (!treeCache.has(kind)) treeCache.set(kind, TREES[kind].build()); return treeCache.get(kind); }

// the light copy drawn past the streaming ring (stream.js): the same model, the same crown lumps, branches and
// flowers in the same places and colours, built with the fewest faces each shape allows, so the outline is the
// tree's own at about a quarter of the triangles
const liteCache = new Map();
export function treeLite(kind) {
  if (!liteCache.has(kind)) { LITE = true; try { liteCache.set(kind, TREES[kind].build()); } finally { LITE = false; } }
  return liteCache.get(kind);
}

// which trees each city plants, and how much of each (street, park); flowering trees where people see them
export const CITY_TREES = {
  Lagos: { street: { royalPalm: 3, flamboyant: 3, pinkTrumpet: 2, neem: 1, coconut: 1 }, park: { flamboyant: 3, mango: 3, frangipani: 2, coconut: 2, pinkTrumpet: 2, goldenShower: 2, royalPalm: 1 } },
  Abuja: { street: { neem: 4, royalPalm: 2, flamboyant: 2, goldenShower: 1 }, park: { neem: 3, mango: 2, flamboyant: 2, goldenShower: 2, frangipani: 2, pinkTrumpet: 1 } },
  'Port Harcourt': { street: { flamboyant: 3, royalPalm: 2, neem: 1, pinkTrumpet: 1, coconut: 1 }, park: { mango: 3, flamboyant: 2, coconut: 2, frangipani: 2, goldenShower: 1 } },
  Uyo: { street: { royalPalm: 3, flamboyant: 2, pinkTrumpet: 2, neem: 1 }, park: { mango: 3, flamboyant: 2, frangipani: 2, royalPalm: 1, coconut: 1, goldenShower: 1 } },
  Accra: { street: { neem: 3, royalPalm: 2, flamboyant: 2, coconut: 2 }, park: { neem: 2, mango: 2, flamboyant: 2, coconut: 2, frangipani: 2, goldenShower: 1 } },
  Nairobi: { street: { jacaranda: 4, acacia: 2, flamboyant: 2, pinkTrumpet: 1 }, park: { jacaranda: 3, acacia: 3, flamboyant: 2, frangipani: 1, goldenShower: 1, pinkTrumpet: 1 } },
};
export function pickTree(city, use, rnd) {
  const w = (CITY_TREES[city] || CITY_TREES.Lagos)[use], tot = Object.values(w).reduce((a, b) => a + b, 0);
  let x = rnd() * tot; for (const [k, v] of Object.entries(w)) { x -= v; if (x <= 0) return k; } return Object.keys(w)[0];
}

// ---------- shrubs, flowers, hedges and pots, for gardens and parks ----------
export const PLANTS = {
  bougainvillea: { name: 'Bougainvillea', build() { const p = [], r = seeded(31); for (let i = 0; i < 9; i++) { const a = r() * 6.28, k = r() * 0.6; p.push(blob(Math.cos(a) * k, 0.55 + r() * 0.7, Math.sin(a) * k, 0.45, 0.4, 0.45, r() < 0.65 ? '#d6338a' : '#5f8f45')); } return merge(p); } },
  hibiscus: { name: 'Hibiscus', build() { const p = [blob(0, 0.7, 0, 0.7, 0.65, 0.7, '#4f8a3c')], r = seeded(37); for (let i = 0; i < 10; i++) { const a = r() * 6.28, u = r(); p.push(blob(Math.cos(a) * 0.62, 0.45 + u * 0.7, Math.sin(a) * 0.62, 0.12, 0.08, 0.12, '#d7263d', 0)); } return merge(p); } },
  ixora: { name: 'Ixora', build() { const p = [blob(0, 0.4, 0, 0.55, 0.4, 0.55, '#3f7a3a')], r = seeded(41); for (let i = 0; i < 9; i++) { const a = r() * 6.28; p.push(blob(Math.cos(a) * 0.42, 0.62 + r() * 0.15, Math.sin(a) * 0.42, 0.12, 0.1, 0.12, '#f05a28', 0)); } return merge(p); } },
  croton: { name: 'Croton', build() { const p = [], r = seeded(43), cols = ['#e2b23a', '#c8462e', '#5d8a3a', '#d98c2f']; for (let i = 0; i < 8; i++) { const a = r() * 6.28, k = r() * 0.3; p.push(blob(Math.cos(a) * k, 0.4 + r() * 0.4, Math.sin(a) * k, 0.26, 0.2, 0.18, cols[i % 4], 0)); } return merge(p); } },
  rose: { name: 'Rose bush', build() { const p = [blob(0, 0.45, 0, 0.45, 0.42, 0.45, '#3f6e37')], r = seeded(47); for (let i = 0; i < 8; i++) { const a = r() * 6.28; p.push(blob(Math.cos(a) * 0.38, 0.55 + r() * 0.3, Math.sin(a) * 0.38, 0.1, 0.09, 0.1, r() < 0.5 ? '#e0456b' : '#f6a3b8', 0)); } return merge(p); } },
  canna: { name: 'Canna lily', build() { const p = [], r = seeded(53); for (let i = 0; i < 7; i++) { const a = i * 0.9; p.push(blob(Math.cos(a) * 0.18, 0.6, Math.sin(a) * 0.18, 0.1, 0.55, 0.22, '#4f8a3c', 0)); } for (let i = 0; i < 3; i++) p.push(blob((r() - 0.5) * 0.3, 1.25 + r() * 0.2, (r() - 0.5) * 0.3, 0.12, 0.14, 0.12, i % 2 ? '#e8402d' : '#f2b33d', 0)); return merge(p); } },
  hedge: { name: 'Hedge', build() { return merge([paint(new THREE.BoxGeometry(1, 0.9, 0.7, 2, 1, 1).translate(0, 0.45, 0), '#3f7a3a'), paint(new THREE.BoxGeometry(1.02, 0.12, 0.72).translate(0, 0.86, 0), '#4f8a42')]); } },
  // a flowerbed: dark soil, a kerb, rows of marigolds, white periwinkle and red salvia
  bed: { name: 'Flowerbed', build() { const p = [paint(new THREE.BoxGeometry(2, 0.18, 1).translate(0, 0.09, 0), '#c9c2b3'), paint(new THREE.BoxGeometry(1.84, 0.2, 0.84).translate(0, 0.1, 0), '#5a4032')]; const cols = ['#f2a020', '#fff7ea', '#d7263d']; for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) p.push(blob(-0.78 + i * 0.26, 0.28, -0.26 + j * 0.26, 0.1, 0.09, 0.1, cols[j], 0)); return merge(p); } },
  pot: { name: 'Potted plant', build() { const p = [paint(new THREE.CylinderGeometry(0.26, 0.19, 0.42, 9).translate(0, 0.21, 0), '#b8643c'), paint(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 9).translate(0, 0.42, 0), '#a5552f')]; const r = seeded(59); for (let i = 0; i < 6; i++) { const a = i * 1.05; p.push(blob(Math.cos(a) * 0.14, 0.75 + r() * 0.2, Math.sin(a) * 0.14, 0.12, 0.34, 0.2, i % 2 ? '#4f8a3c' : '#6aa04c', 0)); } return merge(p); } },
  palmPot: { name: 'Areca palm in a pot', build() { const p = [paint(new THREE.CylinderGeometry(0.3, 0.24, 0.5, 9).translate(0, 0.25, 0), '#e8e0cf')]; for (let i = 0; i < 7; i++) { const a = i * 0.9; p.push(limb(0, 0.45, 0, Math.cos(a) * 0.6, 1.5, Math.sin(a) * 0.6, 0.03, 0.02, '#5d8a35'), blob(Math.cos(a) * 0.45, 1.25, Math.sin(a) * 0.45, 0.32, 0.08, 0.12, '#6a9a3e', 0)); } return merge(p); } },
};
const plantCache = new Map();
export function plantGeometry(kind) { if (!plantCache.has(kind)) plantCache.set(kind, PLANTS[kind].build()); return plantCache.get(kind); }

// ---------- placing them: one instanced mesh per kind ----------
let floraMat = null;
export const floraMaterial = () => (floraMat ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
// streamed copies: full trees inside the ring, light trees outside it, plants inside their own shorter ring
const MATS = {};
const streamed = (k) => (MATS[k] ||= k === 'lite' ? streamMaterial(floraMaterial(), 'tree', { invert: true }) : streamMaterial(floraMaterial(), k));
/**
 * Draw many trees and plants: list of { kind, x, z, s?, ry?, y? }, kind a TREES or PLANTS key.
 * Returns a group with one InstancedMesh per kind (trees cast shadows), streamed by distance (stream.js):
 * each tree species also gets a light stand-in for the instances past the ring.
 */
export function plantAll(list, name = 'flora') {
  const g = new THREE.Group(); g.name = name;
  const by = new Map(); list.forEach((t) => { if (!by.has(t.kind)) by.set(t.kind, []); by.get(t.kind).push(t); });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  by.forEach((items, kind) => {
    const isTree = !!TREES[kind], geo = isTree ? treeGeometry(kind) : plantGeometry(kind);
    const im = new THREE.InstancedMesh(geo, streamed(isTree ? 'tree' : 'plant'), items.length);
    items.forEach((t, i) => { const s = t.s ?? 1; im.setMatrixAt(i, m.compose(new THREE.Vector3(t.x, t.y ?? 0, t.z), q.setFromAxisAngle(up, t.ry ?? 0), new THREE.Vector3(s, t.sy ?? s, s))); });
    im.castShadow = isTree; im.receiveShadow = !isTree; im.name = `${name}_${kind}`; im.computeBoundingSphere();
    if (isTree) {
      const lite = new THREE.InstancedMesh(treeLite(kind), streamed('lite'), items.length);
      lite.instanceMatrix.array.set(im.instanceMatrix.array); lite.name = `${name}_${kind}_lite`;
      lite.userData.noShadow = true; lite.castShadow = false; lite.computeBoundingSphere();
      g.add(streamInstances(lite, 'tree', { outside: true }));
    }
    g.add(streamInstances(im, isTree ? 'tree' : 'plant'));
  });
  return g;
}
/** the trunk's collider for a tree, so people and cars go round it */
export const trunkCollider = (t) => { const r = (TREES[t.kind]?.r ?? 0.4) * (t.s ?? 1); return { name: `tree_${t.kind}`, cx: t.x, cz: t.z, hx: r, hz: r, ry: 0 }; };
