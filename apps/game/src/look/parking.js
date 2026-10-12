import * as THREE from 'three';

// Car parks (Elvis, 10 October 2026: "car parks all around the world... car parks for people with
// accessibility"). Every car park keeps its accessible bays nearest the street: wider than a normal bay,
// painted blue with the wheelchair symbol, a hatched transfer zone beside each for getting a chair in and
// out, and a blue sign on a post at the head of the bay. The layout is plain numbers so it is tested on
// its own (tests/parking.test.js); the drawing needs a page.

export const BAY_W = 2.5, ACC_W = 2.5, TRANSFER_W = 1.2, BAY_D = 5;

/** How many accessible bays a car park of n ordinary bays should have: one in every ten, at least one, two once it has eight. */
export const accessibleCount = (n) => (n < 3 ? 0 : n < 8 ? 1 : Math.max(2, Math.round(n / 10)));

/**
 * Lay out bays along a car park `len` metres long, centred on 0. Accessible bays come first, each with
 * its transfer zone on the far side, then ordinary bays fill the rest.
 * Returns [{ u, w, acc, transfer: { u, w } | null }], u the centre of the bay along the length.
 */
export function bayLayout(len) {
  const plain = Math.floor(len / BAY_W);
  let acc = accessibleCount(plain);
  // shrink until it fits
  while (acc > 0 && acc * (ACC_W + TRANSFER_W) + BAY_W > len) acc--;
  const out = [];
  let u = -len / 2;
  for (let k = 0; k < acc; k++) {
    out.push({ u: u + ACC_W / 2, w: ACC_W, acc: true, transfer: { u: u + ACC_W + TRANSFER_W / 2, w: TRANSFER_W } });
    u += ACC_W + TRANSFER_W;
  }
  while (u + BAY_W <= len / 2 + 1e-6) { out.push({ u: u + BAY_W / 2, w: BAY_W, acc: false, transfer: null }); u += BAY_W; }
  return out;
}

// ---------- drawing ----------
const cache = {};
function tex(key, draw, w = 256, h = 512) {
  if (cache[key]) return cache[key];
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (cache[key] = t);
}
// the International Symbol of Access, white, filling a square of side s at (x, y)
export function drawAccessSymbol(g, x, y, s, color = '#ffffff') {
  g.save(); g.translate(x, y); g.scale(s / 100, s / 100);
  g.fillStyle = color; g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.arc(46, 14, 9, 0, Math.PI * 2); g.fill(); // head
  g.lineWidth = 10;
  g.beginPath(); g.moveTo(44, 28); g.lineTo(42, 58); g.lineTo(70, 58); g.lineTo(80, 84); g.stroke(); // back, seat, leg
  g.beginPath(); g.moveTo(43, 40); g.lineTo(64, 40); g.stroke(); // arm
  g.lineWidth = 8;
  g.beginPath(); g.arc(42, 70, 22, Math.PI * 0.2, Math.PI * 1.55); g.stroke(); // the wheel
  g.restore();
}
// the bay's paint: blue with the symbol near the aisle end
const bayTex = () => tex('bay', (g, w, h) => {
  g.fillStyle = '#1f5fa8'; g.fillRect(0, 0, w, h);
  drawAccessSymbol(g, w * 0.14, h * 0.58, w * 0.72);
});
// the transfer zone: white diagonal hatching on bare concrete
const hatchTex = () => tex('hatch', (g, w, h) => {
  g.clearRect(0, 0, w, h); g.strokeStyle = '#f4f1ea'; g.lineWidth = 12;
  g.strokeRect(6, 6, w - 12, h - 12);
  for (let k = -h; k < w + h; k += 48) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k - h, h); g.stroke(); }
}, 128, 512);
const signTex = () => tex('sign', (g, w, h) => {
  g.fillStyle = '#1f5fa8'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
  drawAccessSymbol(g, w * 0.16, 26, w * 0.68);
  g.fillStyle = '#fff'; g.font = '700 26px Arial, sans-serif'; g.textAlign = 'center';
  g.fillText('BLUE BADGE', w / 2, h - 52); g.fillText('HOLDERS ONLY', w / 2, h - 22);
}, 256, 320);
// the P sign at a car park's entrance
export const parkSignTex = () => tex('P', (g, w, h) => {
  g.fillStyle = '#1f5fa8'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#fff'; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = '#fff'; g.font = '900 190px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', w / 2, h / 2 + 8);
}, 256, 256);

let mats = null;
const materials = () => mats || (mats = {
  bay: new THREE.MeshBasicMaterial({ map: bayTex(), polygonOffset: true, polygonOffsetFactor: -2 }),
  hatch: new THREE.MeshBasicMaterial({ map: hatchTex(), transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }),
  sign: new THREE.MeshBasicMaterial({ map: signTex() }),
  P: new THREE.MeshBasicMaterial({ map: parkSignTex() }),
  pole: new THREE.MeshStandardMaterial({ color: 0x8d9196, roughness: 0.5, metalness: 0.6 }),
});

/**
 * Paint one accessible bay and its transfer zone and stand its sign, in a car park whose local frame is
 * given by at(u, v) -> [x, z] and angle ang; v0 is the centre of the bay row, front (+1/-1) the side the
 * aisle is on. Adds to group g.
 */
export function drawAccessibleBay(g, { at, ang, bay, v0, front }) {
  const M = materials();
  const flat = (w, d, u, m) => { const [x, z] = at(u, v0); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m); p.rotation.y = ang + (front > 0 ? 0 : Math.PI); p.position.set(x, 0.07, z); g.add(p); };
  flat(bay.w - 0.2, BAY_D - 0.2, bay.u, M.bay);
  if (bay.transfer) flat(bay.transfer.w, BAY_D - 0.1, bay.transfer.u, M.hatch);
  // the sign, at the head of the bay (away from the aisle), facing the aisle
  const [sx, sz] = at(bay.u, v0 - front * (BAY_D / 2 - 0.15));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8).translate(0, 1.1, 0), M.pole); pole.position.set(sx, 0, sz); g.add(pole);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), M.sign); face.position.set(sx, 1.9, sz); face.rotation.y = ang + (front > 0 ? 0 : Math.PI); face.translateZ(0.05); g.add(face);
  return { x: sx, z: sz };
}

/** The P sign on a post at a car park's entrance. */
export function drawParkSign(g, x, z, ry) {
  const M = materials();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8).translate(0, 1.3, 0), M.pole); pole.position.set(x, 0, z); g.add(pole);
  [0, Math.PI].forEach((r) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), M.P); f.position.set(x, 2.3, z); f.rotation.y = ry + r; f.translateZ(0.03); g.add(f); });
}
