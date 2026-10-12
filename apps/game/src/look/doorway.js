import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The way in and out of a workspace, a cafe, the gym or the bank, seen from inside (Elvis, 10 October 2026:
// "a visible door so people know that that's the exit", with Exit and Entry over it). The front wall's
// 4 m opening gets a frame, a pair of glass doors with push bars, the street showing through the glass,
// and a lit sign over each leaf: EXIT over the one you leave by, ENTRY over the other. The storefronts
// say ENTRY over their door from the street (entrySign).

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const texCache = new Map();

// a lit sign face: the word, and an arrow for which way you are going
function signTex(word, bg, arrow) {
  const k = `${word}|${bg}|${arrow}`;
  if (texCache.has(k)) return texCache.get(k);
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 160);
  x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 8; x.strokeRect(10, 10, 492, 140);
  x.fillStyle = '#ffffff'; x.font = '900 92px "Arial Black", Impact, sans-serif'; x.textBaseline = 'middle';
  x.fillText(word, 40, 84);
  // the arrow: up for out through the door, down for coming in
  const ax = 440, ay = 80;
  x.beginPath();
  if (arrow === 'out') { x.moveTo(ax, ay - 46); x.lineTo(ax + 34, ay); x.lineTo(ax + 12, ay); x.lineTo(ax + 12, ay + 44); x.lineTo(ax - 12, ay + 44); x.lineTo(ax - 12, ay); x.lineTo(ax - 34, ay); }
  else { x.moveTo(ax, ay + 46); x.lineTo(ax + 34, ay); x.lineTo(ax + 12, ay); x.lineTo(ax + 12, ay - 44); x.lineTo(ax - 12, ay - 44); x.lineTo(ax - 12, ay); x.lineTo(ax - 34, ay); }
  x.closePath(); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  texCache.set(k, t); return t;
}
const EXIT_BG = '#0f7a3c', ENTRY_BG = '#1f5f8b';
const signMat = (word, bg, arrow) => new THREE.MeshBasicMaterial({ map: signTex(word, bg, arrow), color: new THREE.Color(1.15, 1.15, 1.15) });

/**
 * Fit doors into a front-wall opening that runs from x0 to x1 at z (the wall's centre line), in a room
 * H high. `wall` is the wall material (for the lintel over the doors), `outside` the material of the
 * room's street window, so the glass shows the same daylight. The exit is the leaf at exitX.
 * Returns the collider across the doorway, so nobody walks out through the glass.
 */
export function workspaceDoor(g, { x0, x1, z, H, wall, outside, exitX }) {
  const W = x1 - x0, cx = (x0 + x1) / 2, top = 2.5, leaf = W / 2;
  const frame = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.4, metalness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xa9cfdc, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false });
  const steel = new THREE.MeshStandardMaterial({ color: 0xd6d9dc, roughness: 0.25, metalness: 0.8 });
  const add = (geo, m) => { const o = new THREE.Mesh(geo, m); g.add(o); return o; };
  // the wall closes over the doors
  if (H > top) add(box(W, H - top, 0.2, cx, top + (H - top) / 2, z), wall);
  // the street beyond the glass
  if (outside) add(new THREE.PlaneGeometry(W, top).rotateY(Math.PI).translate(cx, top / 2, z + 0.6), outside);
  // a metal sill under the doors, out to the street beyond them
  add(box(W, 0.04, 0.9, cx, 0.02, z + 0.3), new THREE.MeshStandardMaterial({ color: 0x8d9196, roughness: 0.5, metalness: 0.6 }));
  // the frame: jambs, head and a centre post, then each leaf's own rails
  const parts = [box(0.14, top, 0.24, x0 + 0.07, top / 2, z), box(0.14, top, 0.24, x1 - 0.07, top / 2, z), box(W, 0.14, 0.24, cx, top - 0.07, z), box(0.08, top, 0.2, cx, top / 2, z)];
  [x0, cx].forEach((lx) => {
    const m = lx + leaf / 2;
    parts.push(box(leaf - 0.2, 0.09, 0.06, m, 0.12, z), box(leaf - 0.2, 0.06, 0.06, m, top - 0.2, z), box(0.07, top - 0.2, 0.06, lx + 0.12, top / 2, z), box(0.07, top - 0.2, 0.06, lx + leaf - 0.12, top / 2, z));
  });
  add(mergeGeometries(parts), frame);
  [x0, cx].forEach((lx) => add(box(leaf - 0.3, top - 0.32, 0.02, lx + leaf / 2, top / 2 + 0.02, z), glass));
  // push bars on the inside of both leaves
  const bars = [];
  [x0, cx].forEach((lx) => { const m = lx + leaf / 2; bars.push(box(leaf * 0.62, 0.05, 0.05, m, 1.05, z - 0.13), box(0.04, 0.04, 0.1, m - leaf * 0.28, 1.05, z - 0.08), box(0.04, 0.04, 0.1, m + leaf * 0.28, 1.05, z - 0.08)); });
  add(mergeGeometries(bars), steel);
  // the signs, over each leaf, facing into the room
  const exitLeft = exitX < cx, sw = Math.min(1.5, leaf * 0.8), sh = sw * 0.3125, sy = Math.min(top + 0.12 + sh / 2, H - sh / 2 - 0.05);
  [[exitLeft ? x0 : cx, 'EXIT', EXIT_BG, 'out'], [exitLeft ? cx : x0, 'ENTRY', ENTRY_BG, 'in']].forEach(([lx, word, bg, arrow]) => {
    const m = lx + leaf / 2;
    add(box(sw + 0.1, sh + 0.1, 0.08, m, sy, z - 0.14), frame);
    add(new THREE.PlaneGeometry(sw, sh).rotateY(Math.PI).translate(m, sy, z - 0.185), signMat(word, bg, arrow));
  });
  return [x0, z - 0.2, x1, z + 0.2];
}

/** ENTRY over a street door, facing out: a plane w wide centred at (x, y), just proud of the front at z. */
export function entrySign(g, { x, y, z, w = 1.6 }) {
  const h = w * 0.3125;
  const back = new THREE.Mesh(box(w + 0.1, h + 0.1, 0.06, x, y, z), new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.4, metalness: 0.5 }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h).translate(x, y, z + 0.035), signMat('ENTRY', ENTRY_BG, 'out'));
  g.add(back, face);
}
