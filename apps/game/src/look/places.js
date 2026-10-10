import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { signTexture } from './props.js';
import { findSite } from './parks.js';
import { PLACES } from './interior.js';

// The places you can walk into (world bible 6.6) get buildings of their own: two storeys, a glass
// ground floor, a canopy over the door, and the name across the front in big lit letters, so you can
// read them from down the street (Elvis, 9 October 2026). Each faces the nearest road.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;
const W = 12, D = 9, H = 7.6;

function storefront(key) {
  const P = PLACES[key], g = new THREE.Group(), accent = new THREE.Color(P.accent);
  const wall = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xf2e8d4).lerp(accent, 0.12), roughness: 0.9 });
  const trim = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x263832, roughness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x7fb3b0, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.75 });
  const warm = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  // the shell, open at the front of the ground floor for the glass
  g.add(new THREE.Mesh(mergeGeometries([
    box(W, H, 0.3, 0, H / 2, -D / 2 + 0.15), box(0.3, H, D, -W / 2 + 0.15, H / 2, 0), box(0.3, H, D, W / 2 - 0.15, H / 2, 0),
    box(W, H - 3.4, 0.3, 0, 3.4 + (H - 3.4) / 2, D / 2 - 0.15), box(W + 0.2, 0.3, D + 0.2, 0, H, 0),
  ]), wall));
  // parapet and a band of the place's colour between the floors
  g.add(new THREE.Mesh(mergeGeometries([box(W + 0.3, 0.5, 0.35, 0, H + 0.25, D / 2), box(W + 0.3, 0.35, 0.4, 0, 3.55, D / 2)]), trim));
  // glass ground floor with mullions, the warm room behind it, a door in the middle
  g.add(new THREE.Mesh(box(W - 0.6, 3.2, 0.06, 0, 1.7, D / 2 - 0.1), glass));
  g.add(new THREE.Mesh(box(W - 0.8, 3.0, 0.05, 0, 1.6, D / 2 - 1.2), warm));
  const mull = []; for (let x = -W / 2 + 0.3; x <= W / 2 - 0.29; x += 1.6) mull.push(box(0.1, 3.3, 0.12, x, 1.65, D / 2 - 0.05));
  g.add(new THREE.Mesh(mergeGeometries([...mull, box(2.2, 0.12, 0.14, 0, 2.6, D / 2 - 0.03)]), dark));
  g.add(new THREE.Mesh(box(2.0, 2.5, 0.08, 0, 1.25, D / 2 - 0.02), dark));
  // a canopy over the door
  g.add(new THREE.Mesh(box(4.4, 0.16, 1.8, 0, 3.05, D / 2 + 0.85), trim));
  // upper floor windows, lit
  const win = []; for (let i = 0; i < 4; i++) win.push(box(2.0, 1.7, 0.06, -4.2 + i * 2.8, 5.4, D / 2 + 0.01));
  g.add(new THREE.Mesh(mergeGeometries(win), warm));
  // the name, big, across the parapet; lit so it reads at night
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(W - 1.2, 1.5), new THREE.MeshBasicMaterial({ map: signTexture(P.name.toUpperCase(), { bg: css(P.accent), w: 1400, h: 190, sub: P.kind }), color: 0xeeeeee }));
  sign.position.set(0, H + 1.35, D / 2 + 0.25); g.add(sign); // in front of the parapet, clear of it
  g.add(new THREE.Mesh(box(W - 1.0, 1.7, 0.12, 0, H + 1.35, D / 2 + 0.17), dark));
  // and a blade sign on the corner, for anyone coming along the pavement
  const bladeTex = signTexture(P.name.split(' ').slice(-1)[0].toUpperCase(), { bg: '#263832', fg: css(P.accent), w: 512, h: 160 });
  // two faces back to back, each reading the right way round from its side
  [1, -1].forEach((side) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8), new THREE.MeshBasicMaterial({ map: bladeTex, color: 0xeeeeee })); b.rotation.y = side * Math.PI / 2; b.position.set(W / 2 + 0.75 + side * 0.03, 5.0, D / 2 - 0.4); g.add(b); });
  g.add(new THREE.Mesh(box(0.05, 0.86, 2.66, W / 2 + 0.75, 5.0, D / 2 - 0.4), dark));
  g.add(new THREE.Mesh(box(0.1, 0.1, 1.5, W / 2 + 0.75, 5.45, D / 2 - 0.4), dark));
  return g;
}

// facing: the nearest road within 30 m, by looking out in sixteen directions
function faceRoad(world, x, z) {
  let best = null;
  for (let r = 4; r < 30 && !best; r += 1) for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
    if (world.onCarriageway?.(px, pz)) { best = a; break; }
  }
  return best ?? 0;
}

// builds the storefronts for the given place keys; returns the doors for the interiors
export function buildPlaceFronts({ world, scene, keys, used, addLamps }) {
  const group = new THREE.Group(); group.name = 'place-fronts'; scene.add(group);
  const doors = [];
  keys.forEach((key) => {
    // a site whose front is open to view: nothing standing in the 12 m in front of the facade (a
    // billboard, a tall building) that would hide the name
    let at = null, ry = 0;
    for (let tries = 0; tries < 8 && !at; tries++) {
      const c = findSite(world, used, W + 4, D + 6);
      if (!c) break;
      const r = faceRoad(world, c.x, c.z), sx = Math.sin(r), sz = Math.cos(r), tx = Math.cos(r), tz = -Math.sin(r);
      let open = true;
      for (let f = D / 2 + 1; f < D / 2 + 12 && open; f += 1.5) for (let u = -W / 2; u <= W / 2 && open; u += 2) for (const y of [2.5, 4.5, 7.5]) if (world.solidAt(c.x + sx * f + tx * u, y, c.z + sz * f + tz * u)) { open = false; break; }
      if (open) { at = c; ry = r; }
    }
    if (!at) return;
    // the building is turned to face the road, so what it covers is wider than the box findSite kept:
    // keep its whole turned footprint (and the canopy) for itself, or a park can land in its corner
    const u = used.find((q) => q.x === at.x && q.z === at.z); if (u) { const cs = Math.abs(Math.cos(ry)), sn = Math.abs(Math.sin(ry)); u.W = W * cs + (D + 4) * sn + 2; u.D = W * sn + (D + 4) * cs + 2; }
    const fx = Math.sin(ry), fz = Math.cos(ry);
    const b = storefront(key); b.position.set(at.x, 0, at.z); b.rotation.y = ry; group.add(b);
    world.addColliders([{ name: `place_${key}`, cx: at.x, cz: at.z, hx: W / 2, hz: D / 2, ry, h: H + 1.8 }]);
    world.claim?.({ kind: 'workplace', cx: at.x, cz: at.z, hx: W / 2 + 1, hz: D / 2 + 2, ry });
    // the door is on the front, under the canopy; you go in from just outside it
    const door = { x: at.x + fx * (D / 2 + 1.4), z: at.z + fz * (D / 2 + 1.4) };
    doors.push({ key, at: door });
    addLamps?.([{ x: at.x + fx * (D / 2 + 1.2), y: 2.9, z: at.z + fz * (D / 2 + 1.2), power: 40, boost: 25, color: 0xffb060 }]);
  });
  return { group, doors };
}

// the hub already has a building; it gets the same big name across its front (props.js builds it)
export function hubSign(hubGroup, scale = 1) {
  const P = PLACES.hub;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 1.1), new THREE.MeshBasicMaterial({ map: signTexture(P.name.toUpperCase(), { bg: css(P.accent), w: 1200, h: 200, sub: P.kind }), color: 0xeeeeee }));
  sign.position.set(0, 6.95, 2.56); hubGroup.add(sign);
  hubGroup.add(new THREE.Mesh(box(6.8, 1.3, 0.12, 0, 6.95, 2.47), new THREE.MeshStandardMaterial({ color: 0x263832, roughness: 0.6 })));
  return sign;
}
