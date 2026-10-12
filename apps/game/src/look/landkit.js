import * as THREE from 'three';
import { signTexture } from './props.js';

// Landmark kits for the cities beyond Yaba (Elvis, 10 October 2026: "it's showing Yaba Fitness inside Nairobi,
// which makes no sense... include the landmarks... so people can relate to them"). Yaba's landmarks are
// modelled one by one (landmarks.js); the other cities' real places are built from these kits by kind
// (a mall, a hospital, a mosque with its dome, a church with its tower, a campus gate, a market, a castle),
// coloured and signed after the real building, so a local knows it at a glance.
// Each builder faces +z (its front, onto the road) and returns { g, W, D, h, cols: [[x, z, w, d]] }.
// The skyline kits are the far, famous shapes (a tower, a rock, a stadium) placed at their true bearing.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const glassM = () => M(0x7fb3d0, { roughness: 0.25, metalness: 0.2 });
const mesh = (g, geo, m) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; g.add(o); return o; };
const css = (c) => (typeof c === 'number' ? `#${c.toString(16).padStart(6, '0')}` : c);
// the name, lit, big enough to read from the street; w x h metres at (x, y, z), facing +z
function sign(g, text, { bg = 0x2f3a40, fg = '#ffffff', sub = '', w = 10, h = 1.3, x = 0, y = 5, z = 0 } = {}) {
  const tex = signTexture(String(text).toUpperCase(), { bg: css(bg), fg: css(fg), w: Math.round(w * 140), h: Math.round(h * 140), sub });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: 0xe8e8e8 }));
  p.position.set(x, y, z); g.add(p);
  mesh(g, box(w + 0.2, h + 0.2, 0.12, x, y, z - 0.08), M(0x2b2f36));
  return p;
}
// rows of windows on a face at depth z (facing +z), for a block w wide and `floors` storeys
function windows(g, w, floors, z, { y0 = 1.2, fh = 3.2, cols, mat = glassM(), skip = () => false } = {}) {
  const n = cols || Math.max(2, Math.floor(w / 2.6)), parts = [];
  for (let f = 0; f < floors; f++) for (let c = 0; c < n; c++) { if (skip(f, c)) continue; parts.push(box(1.5, 1.4, 0.06, -w / 2 + (c + 0.5) * (w / n), y0 + f * fh + 0.9, z)); }
  parts.forEach((p) => mesh(g, p, mat));
}
// a pitched roof: a triangle w wide and h high, run back d along -z from z = 0 (translate it into place)
const gable = (w, h, d) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.closePath(); return new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); };
const tree = (g, x, z, s = 1) => { mesh(g, new THREE.CylinderGeometry(0.18 * s, 0.24 * s, 2.2 * s, 6).translate(x, 1.1 * s, z), M(0x6b4a2f)); mesh(g, new THREE.SphereGeometry(1.6 * s, 7, 5).translate(x, 3.2 * s, z), M(0x4f8a3c)); };

const KITS = {
  // a shopping centre: two or three storeys, a glass band, an entrance canopy, the name on the parapet
  mall(L) {
    const g = new THREE.Group(), W = L.w || 30, D = L.d || 18, F = L.storeys || 3, H = F * 3.6, body = M(L.color ?? 0xe9e1cf), acc = M(L.accent ?? 0x2a9d94);
    mesh(g, box(W, H, D, 0, H / 2, -D / 2 + 1), body);
    mesh(g, box(W - 2, 3, 0.1, 0, 2, 1.06), glassM());
    for (let f = 1; f < F; f++) mesh(g, box(W - 2, 1.6, 0.08, 0, f * 3.6 + 1.6, 1.06), glassM());
    mesh(g, box(W + 0.4, 0.8, D + 0.4, 0, H + 0.4, -D / 2 + 1), acc);
    mesh(g, box(8, 0.3, 3.5, 0, 3.6, 2.6), acc); [-3.6, 3.6].forEach((x) => mesh(g, box(0.25, 3.6, 0.25, x, 1.8, 4.1), M(0x8d9196)));
    sign(g, L.sign || L.name, { bg: L.accent ?? 0x2a9d94, sub: L.sub, w: Math.min(W - 4, 16), h: 1.8, y: H - 1.4, z: 1.12 });
    const cols = [[0, -D / 2 + 1, W, D], [-3.6, 4.1, 0.3, 0.3], [3.6, 4.1, 0.3, 0.3]];
    let Wt = W, front = 2;
    // optional parts, set per landmark in its city's data (areas.js, cityinfo.js), never assumed for every mall:
    // a cinema wing with a lit marquee (only where the real mall has a cinema)
    if (L.cinema) {
      const cw = 12, ch = H + 3, cx = W / 2 + cw / 2 - 0.5;
      mesh(g, box(cw, ch, D - 2, cx, ch / 2, -D / 2 + 1), M(0x2b2f36));
      mesh(g, box(cw + 0.4, 0.7, D - 1.6, cx, ch + 0.35, -D / 2 + 1), M(L.accent ?? 0x9b2f2f));
      sign(g, L.cinemaName || 'CINEMA', { bg: 0x9b2f2f, fg: '#ffe9a8', sub: 'Now showing', w: cw - 2, h: 1.6, x: cx, y: ch - 1.6, z: 1.08 });
      for (let k = 0; k < 3; k++) mesh(g, box(1.6, 2.3, 0.08, cx - 3.6 + k * 3.6, 2.4, 1.06), M([0xe46f4f, 0x2a9d94, 0xf2b33d][k], { emissive: [0xe46f4f, 0x2a9d94, 0xf2b33d][k], emissiveIntensity: 0.35 }));
      for (let k = 0; k < 14; k++) mesh(g, new THREE.SphereGeometry(0.09, 6, 4).translate(cx - cw / 2 + 0.6 + k * ((cw - 1.2) / 13), ch - 0.55, 1.15), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.8) }));
      cols.push([cx, -D / 2 + 1, cw, D - 2]); Wt = W + cw * 2 - 1;
    }
    // a car park in front: bays painted on asphalt, cars in some, a paved walk from the road to the doors
    if (L.parking) {
      const pd = 13, pz = 4.6 + pd / 2, pw = Math.min(Wt, W + 10);
      mesh(g, box(pw, 0.05, pd, 0, 0.03, pz), M(0x5f5b55, { roughness: 0.95 })).castShadow = false;
      mesh(g, box(3.2, 0.07, pd + 0.4, 0, 0.05, pz), M(0xd8d1bf)).castShadow = false; // the walk to the doors
      const bays = Math.floor((pw / 2 - 2.6) / 2.6), paint = M(0xf2ecd9);
      [-1, 1].forEach((sd) => { for (let k = 0; k <= bays; k++) { const x = sd * (2.4 + k * 2.6); mesh(g, box(0.1, 0.02, 4.8, x, 0.07, pz - pd / 2 + 2.6), paint).castShadow = false; mesh(g, box(0.1, 0.02, 4.8, x, 0.07, pz + pd / 2 - 2.6), paint).castShadow = false; } });
      const cars = [0xc8102e, 0xf2f2f2, 0x1f3d7a, 0x2b2f36, 0x9fb3c4, 0xe2b13c];
      for (let k = 0, n = 0; k < bays * 4 && n < (L.parking === true ? 7 : L.parking); k++) {
        if ((k * 7919) % 3 === 0) continue; const sd = k % 2 ? 1 : -1, row = (k >> 1) % 2, slot = (k >> 2) % bays;
        const x = sd * (3.7 + slot * 2.6), z = row ? pz + pd / 2 - 2.6 : pz - pd / 2 + 2.6, c = M(cars[k % cars.length], { roughness: 0.4 });
        mesh(g, box(1.8, 0.7, 4.2, x, 0.55, z), c); mesh(g, box(1.6, 0.55, 2.2, x, 1.15, z - 0.2), M(0x8fb7c9, { roughness: 0.2 }));
        cols.push([x, z, 1.9, 4.3]); n++;
      }
      front = 4.6 + pd;
    }
    return { g, W: Wt, D: D + front, h: H + 1 + (L.cinema ? 3 : 0), cols };
  },
  // a hospital: a tall white block, the cross, a canopy over the drop-off
  hospital(L) {
    const g = new THREE.Group(), W = L.w || 26, D = L.d || 14, F = L.storeys || 5, H = F * 3.4, body = M(L.color ?? 0xf1efe8), acc = M(L.accent ?? 0x2f6fae);
    mesh(g, box(W, H, D, 0, H / 2, -D / 2), body);
    windows(g, W, F, 0.04, { fh: 3.4 });
    mesh(g, box(W + 0.3, 0.6, D + 0.3, 0, H + 0.3, -D / 2), acc);
    mesh(g, box(9, 0.3, 4, 0, 3.5, 2), acc); [-4, 4].forEach((x) => mesh(g, box(0.25, 3.5, 0.25, x, 1.75, 3.8), M(0x8d9196)));
    // the cross, red on white, up on the corner
    const cr = new THREE.Group(); mesh(cr, box(2.4, 0.7, 0.2), M(0xd03a2f, { emissive: 0x501010 })); mesh(cr, box(0.7, 2.4, 0.2), M(0xd03a2f, { emissive: 0x501010 })); cr.position.set(W / 2 - 2.2, H - 2, 0.2); g.add(cr);
    sign(g, L.sign || L.name, { bg: L.accent ?? 0x2f6fae, sub: L.sub, w: Math.min(W - 6, 15), h: 1.5, y: 5.4, z: 0.12 });
    return { g, W, D: D + 4, h: H + 2, cols: [[0, -D / 2, W, D], [-4, 3.8, 0.3, 0.3], [4, 3.8, 0.3, 0.3]] };
  },
  // a mosque: a square prayer hall under a great dome, minarets at the corners
  mosque(L) {
    const g = new THREE.Group(), W = L.w || 22, D = L.d || 22, wall = M(L.color ?? 0xf3efe4), dome = M(L.dome ?? 0xd4a52a, { roughness: 0.35, metalness: 0.4 });
    mesh(g, box(W, 9, D, 0, 4.5, -D / 2), wall);
    mesh(g, new THREE.CylinderGeometry(W * 0.32, W * 0.32, 3, 24).translate(0, 10.5, -D / 2), wall);
    mesh(g, new THREE.SphereGeometry(W * 0.32, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.15, 1).translate(0, 12, -D / 2), dome);
    mesh(g, new THREE.ConeGeometry(0.4, 2.4, 8).translate(0, 12 + W * 0.37 + 1.2, -D / 2), dome);
    const mins = L.minarets ?? 4, spots = mins === 4 ? [[-1, 1], [1, 1], [-1, -1], [1, -1]] : [[-1, 1], [1, 1]];
    spots.forEach(([sx, sz]) => { const x = sx * (W / 2 + 1.5), z = -D / 2 + sz * (D / 2 + 1.5), h = L.minaretH || 24;
      mesh(g, new THREE.CylinderGeometry(0.9, 1.1, h, 10).translate(x, h / 2, z), wall); mesh(g, new THREE.CylinderGeometry(1.4, 1.4, 0.6, 12).translate(x, h * 0.78, z), wall);
      mesh(g, new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, h, z), dome); });
    // arched doors along the front
    for (let k = -2; k <= 2; k++) mesh(g, box(1.8, 3.6, 0.1, k * 3.6, 1.8, 0.06), M(0x6b4a2f));
    sign(g, L.sign || L.name, { bg: 0x1f5e3a, sub: L.sub, w: Math.min(W - 2, 14), h: 1.3, y: 7, z: 0.12 });
    const r = W / 2 + 1.5;
    return { g, W: W + 5, D: D + 5, h: 30, cols: [[0, -D / 2, W, D], ...spots.map(([sx, sz]) => [sx * r, -D / 2 + sz * (D / 2 + 1.5), 2.2, 2.2])] };
  },
  // a church: the nave under a pitched roof, a tower at the front with a spire or a cross
  church(L) {
    const g = new THREE.Group(), W = L.w || 14, D = L.d || 26, wall = M(L.color ?? 0xf2ede2), roof = M(L.accent ?? 0x9a3b2c);
    mesh(g, box(W, 8, D, 0, 4, -D / 2 - 2), wall);
    mesh(g, gable(W + 0.8, W * 0.42, D).translate(0, 8, -D - 2), roof); // a long pitched roof down the nave
    const th = L.towerH || 18;
    mesh(g, box(5, th, 5, 0, th / 2, 0), wall);
    if (L.spire !== false) mesh(g, new THREE.ConeGeometry(3.4, 7, 4).rotateY(Math.PI / 4).translate(0, th + 3.5, 0), roof);
    const cx = new THREE.Group(); mesh(cx, box(0.3, 2.2, 0.3), M(0xd4a52a)); mesh(cx, box(1.3, 0.3, 0.3, 0, 0.35), M(0xd4a52a)); cx.position.set(0, th + (L.spire !== false ? 8.2 : 1.6), 0); g.add(cx);
    mesh(g, box(2, 3.4, 0.1, 0, 1.7, 2.56), M(0x6b4a2f));
    mesh(g, new THREE.CircleGeometry(1.1, 20).translate(0, th - 4, 2.56), M(0x8fb8d8, { roughness: 0.3, emissive: 0x223344 }));
    sign(g, L.sign || L.name, { bg: L.signBg ?? 0xf3efe6, fg: '#3b2a20', sub: L.sub, w: 10, h: 1.1, y: 4.6, z: 2.64 });
    return { g, W, D: D + 5, h: th + 10, cols: [[0, -D / 2 - 2, W, D], [0, 0, 5, 5]] };
  },
  // a campus gate: two piers, a lintel with the name, a gatehouse; a block of the campus behind
  campus(L) {
    const g = new THREE.Group(), pier = M(L.color ?? 0xf2efe6), acc = M(L.accent ?? 0x1f4f9a), W = 24, D = 18;
    [-6.5, 6.5].forEach((x) => { mesh(g, box(1.6, 6.5, 1.6, x, 3.25, 3), pier); mesh(g, box(1.9, 0.5, 1.9, x, 6.6, 3), acc); });
    mesh(g, box(15, 1.6, 1.2, 0, 7.4, 3), acc);
    sign(g, L.sign || L.name, { bg: L.accent ?? 0x1f4f9a, sub: L.sub, w: 13.5, h: 1.2, y: 7.4, z: 3.62 });
    mesh(g, box(2.6, 2.6, 2.4, 9.5, 1.3, 2), pier); mesh(g, box(6, 0.06, 10, 0, 0.1, -1.5), M(0xb9b3a6));
    mesh(g, box(18, 8, 5, 0, 4, -9), M(0xe9e2d0)); mesh(g, box(18.4, 0.5, 5.4, 0, 8.25, -9), acc);
    windows(g, 18, 2, -6.48, { fh: 3.2 });
    return { g, W, D, h: 9, cols: [[-6.5, 3, 1.6, 1.6], [6.5, 3, 1.6, 1.6], [9.5, 2, 2.6, 2.4], [0, -9, 18, 5]] };
  },
  // a school: a long two-storey block behind a wall, a flag on its pole, the gate with the name
  school(L) {
    const g = new THREE.Group(), W = L.w || 26, wall = M(L.color ?? 0xf0e6cf), acc = M(L.accent ?? 0x2f6b4f);
    mesh(g, box(W, 7, 7, 0, 3.5, -9), wall); mesh(g, box(W + 1, 0.4, 8.5, 0, 7.2, -8.6), acc);
    windows(g, W, 2, -5.47, { fh: 3.2 });
    [-1, 1].forEach((s) => mesh(g, box(W / 2 - 3, 2, 0.4, s * (W / 4 + 1.5), 1, 1.5), wall));
    [-3, 3].forEach((x) => mesh(g, box(0.8, 3, 0.8, x, 1.5, 1.5), acc));
    sign(g, L.sign || L.name, { bg: L.accent ?? 0x2f6b4f, sub: L.sub, w: 9, h: 1.1, y: 3.6, z: 1.95 });
    mesh(g, new THREE.CylinderGeometry(0.06, 0.06, 8, 6).translate(W / 2 - 3, 4, -2), M(0x8d9196));
    mesh(g, box(1.6, 1, 0.05, W / 2 - 2.2, 7.3, -2), M(L.flag ?? 0x2f7d4f));
    return { g, W, D: 13, h: 8, cols: [[0, -9, W, 7], [-(W / 4 + 1.5), 1.5, W / 2 - 3, 0.4], [W / 4 + 1.5, 1.5, W / 2 - 3, 0.4]] };
  },
  // a police station: a blue and white block, its sign, the flag
  police(L) {
    const g = new THREE.Group(), W = 16, D = 10, wall = M(L.color ?? 0xf2f2ee), acc = M(L.accent ?? 0x1f3d7a);
    mesh(g, box(W, 7, D, 0, 3.5, -D / 2), wall); mesh(g, box(W + 0.3, 0.8, D + 0.3, 0, 7.4, -D / 2), acc); mesh(g, box(W, 1, 0.1, 0, 0.5, 0.06), acc);
    windows(g, W, 2, 0.04, { fh: 3.2 });
    sign(g, L.sign || L.name, { bg: L.accent ?? 0x1f3d7a, sub: L.sub, w: 12, h: 1.3, y: 5.2, z: 0.14 });
    mesh(g, new THREE.CylinderGeometry(0.06, 0.06, 8, 6).translate(W / 2 + 1.5, 4, 1), M(0x8d9196));
    mesh(g, box(1.6, 1, 0.05, W / 2 + 2.3, 7.3, 1), M(L.flag ?? 0x2f7d4f));
    return { g, W: W + 4, D, h: 8, cols: [[0, -D / 2, W, D]] };
  },
  // a market: rows of sheds under pitched tin roofs, the name on an arch, umbrellas in front
  market(L) {
    const g = new THREE.Group(), W = L.w || 30, D = L.d || 18, roof = M(L.accent ?? 0x9fa7ad, { metalness: 0.4, roughness: 0.5 }), wall = M(L.color ?? 0xe3d3b0);
    for (let k = 0; k < 3; k++) {
      const z = -3 - k * (D / 3);
      mesh(g, box(W, 3.2, D / 3 - 1.2, 0, 1.6, z), wall);
      mesh(g, gable(D / 3 - 0.4, 1.6, W).rotateY(Math.PI / 2).translate(-W / 2, 3.2, z), roof); // a tin roof along each row
    }
    [-W / 2 + 1, W / 2 - 1].forEach((x) => mesh(g, box(1, 6, 1, x, 3, 2), wall)); mesh(g, box(W - 1, 1.4, 0.8, 0, 6.3, 2), M(L.accent2 ?? 0xc0462f));
    sign(g, L.sign || L.name, { bg: L.accent2 ?? 0xc0462f, sub: L.sub, w: Math.min(W - 4, 14), h: 1.2, y: 6.3, z: 2.45 });
    [-8, -3, 2, 7].forEach((x, i) => { mesh(g, new THREE.ConeGeometry(1.4, 0.6, 8).translate(x, 2.6, 4.2), M([0xe46f4f, 0xf2b33d, 0x2a9d94, 0x7fb35e][i])); mesh(g, new THREE.CylinderGeometry(0.04, 0.04, 2.4, 5).translate(x, 1.2, 4.2), M(0x8d9196)); });
    return { g, W, D: D + 6, h: 7, cols: [[0, -3 - D / 3, W, D], [-W / 2 + 1, 2, 1, 1], [W / 2 - 1, 2, 1, 1]] };
  },
  // a park: railings, a gate with the name, trees and a fountain or a statue in the middle
  park(L) {
    const g = new THREE.Group(), W = L.w || 26, D = L.d || 20, rail = M(0x2b2f36);
    mesh(g, box(W, 0.06, D, 0, 0.05, -D / 2), M(0x6fa25a));
    [[0, -D, W, 0.1], [-W / 2, -D / 2, 0.1, D], [W / 2, -D / 2, 0.1, D], [-W / 4 - 2, 0, W / 2 - 4, 0.1], [W / 4 + 2, 0, W / 2 - 4, 0.1]].forEach(([x, z, w, d]) => mesh(g, box(w, 1.2, d, x, 0.6, z), rail));
    [-3, 3].forEach((x) => mesh(g, box(0.8, 3.4, 0.8, x, 1.7, 0), M(L.color ?? 0xe8dfc8)));
    mesh(g, box(7.2, 1, 0.5, 0, 3.6, 0), M(L.accent ?? 0x2f6b4f));
    sign(g, L.sign || L.name, { bg: L.accent ?? 0x2f6b4f, sub: L.sub, w: 7, h: 0.9, y: 3.6, z: 0.3 });
    if (L.feature === 'statue') { mesh(g, box(2.4, 2, 2.4, 0, 1, -D / 2), M(0xcfc8b6)); mesh(g, new THREE.CylinderGeometry(0.5, 0.7, 3.2, 8).translate(0, 3.6, -D / 2), M(0x6b5a48)); }
    else { mesh(g, new THREE.CylinderGeometry(3, 3.2, 0.7, 20).translate(0, 0.35, -D / 2), M(0xcfc8b6)); mesh(g, new THREE.CylinderGeometry(2.6, 2.6, 0.1, 20).translate(0, 0.72, -D / 2), M(0x5aa6c8, { roughness: 0.2 })); mesh(g, new THREE.CylinderGeometry(0.3, 0.5, 2, 8).translate(0, 1.4, -D / 2), M(0xcfc8b6)); }
    for (const [x, z] of [[-W / 2 + 3, -4], [W / 2 - 3, -4], [-W / 2 + 4, -D + 3], [W / 2 - 4, -D + 3], [-W / 4, -D / 2 - 5], [W / 4, -D / 2 + 4]]) tree(g, x, z, 1.1);
    return { g, W, D, h: 5, cols: [[0, -D, W, 0.3], [-W / 2, -D / 2, 0.3, D], [W / 2, -D / 2, 0.3, D], [-W / 4 - 2, 0, W / 2 - 4, 0.3], [W / 4 + 2, 0, W / 2 - 4, 0.3], [0, -D / 2, 6.4, 6.4]] };
  },
  // a hotel or office tower: a slab with its name at the top and a canopy at the door
  tower(L) {
    const g = new THREE.Group(), W = L.w || 18, D = L.d || 14, F = L.storeys || 12, H = F * 3.3, body = M(L.color ?? 0xe8e4da), acc = M(L.accent ?? 0x2a4a6a);
    mesh(g, box(W, H, D, 0, H / 2, -D / 2), body);
    windows(g, W, F, 0.04, { fh: 3.3, mat: L.glass ? M(L.glass, { roughness: 0.25, metalness: 0.3 }) : glassM() });
    mesh(g, box(W + 0.4, 1, D + 0.4, 0, H + 0.5, -D / 2), acc);
    mesh(g, box(10, 0.4, 5, 0, 4, 2.5), acc); [-4.5, 4.5].forEach((x) => mesh(g, box(0.3, 4, 0.3, x, 2, 4.6), M(0x8d9196)));
    sign(g, L.sign || L.name, { bg: L.accent ?? 0x2a4a6a, fg: L.signFg || '#f2d27a', sub: L.sub, w: Math.min(W - 2, 14), h: 1.6, y: H - 1.6, z: 0.14 });
    return { g, W, D: D + 5, h: H + 1, cols: [[0, -D / 2, W, D], [-4.5, 4.6, 0.3, 0.3], [4.5, 4.6, 0.3, 0.3]] };
  },
  // a tech hub or coworking building: three or four storeys, coloured fins, the logo sign
  hub(L) {
    const g = new THREE.Group(), W = L.w || 18, D = L.d || 12, F = L.storeys || 4, H = F * 3.4, body = M(L.color ?? 0xf1ece2), acc = M(L.accent ?? 0x2a9d94);
    mesh(g, box(W, H, D, 0, H / 2, -D / 2), body);
    windows(g, W, F, 0.04, { fh: 3.4 });
    for (let k = 0; k < 7; k++) mesh(g, box(0.3, H - 1, 0.6, -W / 2 + 1 + k * ((W - 2) / 6), H / 2, 0.3), acc);
    sign(g, L.sign || L.name, { bg: L.accent ?? 0x2a9d94, sub: L.sub, w: Math.min(W - 2, 12), h: 1.3, y: H + 0.9, z: 0.1 });
    return { g, W, D, h: H + 2, cols: [[0, -D / 2, W, D]] };
  },
  // an embassy or government house: a walled compound, a gate, the flag, the house behind
  compound(L) {
    const g = new THREE.Group(), W = L.w || 28, D = L.d || 20, wall = M(L.color ?? 0xf0ead8), acc = M(L.accent ?? 0x2f6b4f);
    [[0, -D, W, 0.4], [-W / 2, -D / 2, 0.4, D], [W / 2, -D / 2, 0.4, D], [-W / 4 - 2.5, 0, W / 2 - 5, 0.4], [W / 4 + 2.5, 0, W / 2 - 5, 0.4]].forEach(([x, z, w, d]) => mesh(g, box(w, 2.6, d, x, 1.3, z), wall));
    [-2.5, 2.5].forEach((x) => mesh(g, box(1, 3.4, 1, x, 1.7, 0), acc));
    mesh(g, box(W * 0.6, 8, D * 0.45, 0, 4, -D * 0.6), wall); mesh(g, box(W * 0.6 + 0.6, 0.6, D * 0.45 + 0.6, 0, 8.3, -D * 0.6), acc);
    windows(g, W * 0.6, 2, -D * 0.6 + D * 0.225 + 0.04, { fh: 3.2 });
    mesh(g, new THREE.CylinderGeometry(0.06, 0.06, 9, 6).translate(0, 4.5, -4), M(0x8d9196)); mesh(g, box(1.8, 1.1, 0.05, 0.9, 8.4, -4), M(L.flag ?? 0x2f7d4f));
    sign(g, L.sign || L.name, { bg: L.accent ?? 0x2f6b4f, sub: L.sub, w: 8, h: 1, y: 3.9, z: 0.55 });
    return { g, W, D, h: 9, cols: [[0, -D, W, 0.6], [-W / 2, -D / 2, 0.6, D], [W / 2, -D / 2, 0.6, D], [-W / 4 - 2.5, 0, W / 2 - 5, 0.6], [W / 4 + 2.5, 0, W / 2 - 5, 0.6], [0, -D * 0.6, W * 0.6, D * 0.45]] };
  },
  // an arch or gate monument (Black Star Gate, Independence Arch)
  arch(L) {
    const g = new THREE.Group(), W = L.w || 20, h = L.h || 14, m = M(L.color ?? 0xf3efe6), acc = M(L.accent ?? 0x1b1b1b);
    [-W / 2 + 2, W / 2 - 2].forEach((x) => mesh(g, box(4, h, 3, x, h / 2, 0), m));
    mesh(g, box(W, 3, 3, 0, h + 1.5, 0), m);
    if (L.star) { const s = new THREE.Shape(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.9 : 2.2, a = (k / 10) * Math.PI * 2 + Math.PI / 2; s[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } mesh(g, new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false }).translate(0, h + 5.5, -0.2), acc); }
    sign(g, L.sign || L.name, { bg: L.accent ?? 0x1b1b1b, fg: '#f2d27a', sub: L.sub, w: W - 6, h: 1.4, y: h + 1.5, z: 1.58 });
    return { g, W, D: 4, h: h + 8, cols: [[-W / 2 + 2, 0, 4, 3], [W / 2 - 2, 0, 4, 3]] };
  },
  // an old fort or castle: whitewashed walls with battlements, a square tower
  castle(L) {
    const g = new THREE.Group(), W = L.w || 30, D = L.d || 22, m = M(L.color ?? 0xf4f1ea), acc = M(L.accent ?? 0x8a6b4a);
    mesh(g, box(W, 7, D, 0, 3.5, -D / 2), m);
    for (let k = 0; k < Math.floor(W / 2); k++) mesh(g, box(1, 1, 1, -W / 2 + 0.5 + k * 2, 7.5, 0), m);
    mesh(g, box(7, 14, 7, W / 2 - 4, 7, -4), m);
    for (let k = 0; k < 4; k++) mesh(g, box(1, 1, 1, W / 2 - 7 + k * 2, 14.5, -0.5), m);
    for (let k = 0; k < 6; k++) mesh(g, box(1.2, 1.8, 0.1, -W / 2 + 3 + k * 3.6, 4, 0.06), acc);
    mesh(g, box(3, 4.2, 0.12, -2, 2.1, 0.07), M(0x5a3d2a));
    sign(g, L.sign || L.name, { bg: 0x2b241d, fg: '#f2e2b8', sub: L.sub, w: 11, h: 1.1, y: 6, z: 0.16 });
    return { g, W, D, h: 15, cols: [[0, -D / 2, W, D]] };
  },
  // a plaza: a paved square with a fountain and a sculpture at its heart (Ibom Plaza)
  plaza(L) {
    const g = new THREE.Group(), W = L.w || 26, D = L.d || 22, pave = M(L.color ?? 0xd8cfbc), acc = M(L.accent ?? 0x2a7f9e);
    mesh(g, box(W, 0.08, D, 0, 0.06, -D / 2), pave);
    mesh(g, new THREE.CylinderGeometry(6, 6.3, 0.9, 28).translate(0, 0.45, -D / 2), M(0xcfc6b2));
    mesh(g, new THREE.CylinderGeometry(5.5, 5.5, 0.1, 28).translate(0, 0.92, -D / 2), M(0x5aa6c8, { roughness: 0.15 }));
    mesh(g, new THREE.CylinderGeometry(0.8, 1.4, 6, 10).translate(0, 3.5, -D / 2), acc);
    mesh(g, new THREE.SphereGeometry(1.4, 12, 8).translate(0, 7, -D / 2), M(0xd4a52a, { metalness: 0.4, roughness: 0.35 }));
    for (const [x, z] of [[-W / 2 + 2.5, -2.5], [W / 2 - 2.5, -2.5], [-W / 2 + 2.5, -D + 2.5], [W / 2 - 2.5, -D + 2.5]]) tree(g, x, z, 1);
    sign(g, L.sign || L.name, { bg: L.accent ?? 0x2a7f9e, sub: L.sub, w: 8, h: 1, y: 1.1, z: 0.5 });
    return { g, W, D, h: 8, cols: [[0, -D / 2, 12, 12]] };
  },
  // a sports ground close enough to stand in the district: stands round a pitch
  stadium(L) {
    const g = new THREE.Group(), W = L.w || 34, D = L.d || 26, m = M(L.color ?? 0xe6e1d4), acc = M(L.accent ?? 0x2f6b4f);
    mesh(g, box(W - 8, 0.06, D - 8, 0, 0.05, -D / 2), M(0x5f9a45));
    [[0, -D + 2, W, 4], [0, -2, W, 4], [-W / 2 + 2, -D / 2, 4, D], [W / 2 - 2, -D / 2, 4, D]].forEach(([x, z, w, d]) => mesh(g, box(w, 6, d, x, 3, z), m));
    mesh(g, box(W + 1, 0.6, 5, 0, 8.5, -D + 2), acc);
    for (const [x, z] of [[-W / 2, 0], [W / 2, 0], [-W / 2, -D], [W / 2, -D]]) { mesh(g, box(0.5, 18, 0.5, x, 9, z), M(0x9aa0a6)); mesh(g, box(3, 1.6, 0.6, x, 18, z), M(0xf4f1e2, { emissive: 0x333322 })); }
    sign(g, L.sign || L.name, { bg: L.accent ?? 0x2f6b4f, sub: L.sub, w: 14, h: 1.4, y: 4.4, z: 0.08 });
    return { g, W, D, h: 18, cols: [[0, -D + 2, W, 4], [0, -2, W, 4], [-W / 2 + 2, -D / 2, 4, D], [W / 2 - 2, -D / 2, 4, D]] };
  },
  // a theatre of sweeping white shells over a glazed base (the National Theatre of Ghana)
  // a container port (Apapa): the gate onto the road, the yard of stacked containers, ship-to-shore cranes on the quay
  // and a container ship alongside, with the harbour water behind (the model's back, -z)
  port(L) {
    const g = new THREE.Group(), W = L.w || 64, yard = 30, water = 22, D = yard + water;
    mesh(g, box(W, 0.12, yard, 0, 0.06, -yard / 2 + 1), M(0xb8b2a6)).castShadow = false; // the concrete apron
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(W + 20, water).rotateX(-Math.PI / 2), M(0x3f7f9a, { roughness: 0.25, metalness: 0.1 })); sea.position.set(0, 0.03, -yard + 1 - water / 2); g.add(sea);
    mesh(g, box(W, 0.6, 0.6, 0, 0.3, -yard + 1), M(0x8f8a80)); // the quay edge
    // the gate: two pillars and the name across
    [-7, 7].forEach((x) => mesh(g, box(1.4, 6, 1.4, x, 3, 0.4), M(0xe9e2d0)));
    mesh(g, box(15.4, 1.6, 1.2, 0, 6.4, 0.4), M(L.accent ?? 0x1f3d7a));
    sign(g, L.sign || L.name, { bg: L.accent ?? 0x1f3d7a, sub: L.sub, w: 14, h: 1.4, y: 6.4, z: 1.05 });
    // the yard: rows of containers, two and three high
    const cols = ['#c8102e', '#1f6fae', '#e2b13c', '#2f8a4f', '#e46f4f', '#6b4aa0', '#f2f2ec', '#2b2f33'];
    for (let r = 0; r < 3; r++) for (let c = 0; c < Math.floor((W - 12) / 7); c++) {
      const x = -W / 2 + 6 + c * 7 + 3, z = -5 - r * 4.2, n = 2 + ((r * 5 + c * 3) % 2);
      for (let k = 0; k < n; k++) mesh(g, box(6.1, 2.55, 2.45, x, 1.3 + k * 2.6, z), M(cols[(r * 7 + c * 3 + k) % cols.length], { roughness: 0.6 }));
    }
    // the cranes on the quay, booms out over the water
    [-W / 4, W / 4].forEach((x) => {
      const red = M(0xc8102e), white = M(0xf2f2ec);
      [[-4, -2], [4, -2], [-4, -10], [4, -10]].forEach(([dx, dz]) => mesh(g, box(0.8, 18, 0.8, x + dx, 9, -yard + 1 + 6 + dz + 4), white));
      mesh(g, box(9, 1.4, 1.2, x, 18, -yard + 1 + 6), red); mesh(g, box(9, 1.4, 1.2, x, 18, -yard + 1 - 2), red);
      mesh(g, box(1.6, 1.6, 34, x, 22, -yard + 1 - 6), red); // the boom
      mesh(g, box(3, 2.6, 3, x, 20, -yard + 1 + 2), white); // the machinery house
    });
    // a container ship alongside
    const sz = -yard + 1 - 8.5, hullL = Math.min(W + 8, 72);
    mesh(g, box(hullL, 4.5, 12, 0, 1.6, sz), M(0x1f3d5a)); mesh(g, box(hullL + 0.2, 1.4, 12.2, 0, 0.2, sz), M(0x9b2f2f));
    mesh(g, box(9, 9, 10, hullL / 2 - 7, 8.3, sz), M(0xf2f2ec)); // the bridge
    for (let c = 0; c < Math.floor((hullL - 18) / 6.5); c++) for (let k = 0; k < 2; k++) mesh(g, box(6.1, 2.55, 9, -hullL / 2 + 5 + c * 6.5, 5.2 + k * 2.6, sz), M(cols[(c + k * 3) % cols.length], { roughness: 0.6 }));
    return { g, W: W + 20, D: D + 2, h: 24, cols: [[-7, 0.4, 1.4, 1.4], [7, 0.4, 1.4, 1.4], [0, -yard / 2 - 3, W - 10, 14], [0, -yard + 1 - water / 2, W + 20, water]] };
  },
  theatre(L) {
    const g = new THREE.Group(), W = L.w || 30, D = L.d || 22, white = M(L.color ?? 0xf5f3ee), acc = M(L.accent ?? 0x3a6ea5, { roughness: 0.3 });
    mesh(g, box(W * 0.8, 4, D * 0.7, 0, 2, -D / 2), acc);
    [[-W * 0.28, 0.5], [0, 0], [W * 0.28, -0.5]].forEach(([x, tilt], i) => {
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(D * 0.42, D * 0.42, W * 0.34, 20, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.9 + i * 0.1, 1), white);
      shell.material.side = THREE.DoubleSide; shell.position.set(x, 4, -D / 2); shell.rotation.z = tilt * 0.3; shell.castShadow = true; g.add(shell);
    });
    sign(g, L.sign || L.name, { bg: 0x2b241d, fg: '#f2e2b8', sub: L.sub, w: 12, h: 1.2, y: 2.6, z: -D / 2 + D * 0.35 + 0.1 });
    return { g, W, D, h: 14, cols: [[0, -D / 2, W * 0.8, D * 0.7]] };
  },
  // an elevated monorail station on pillars, its single beam running off along the road (Port Harcourt's, never opened)
  monorail(L) {
    const g = new THREE.Group(), con = M(L.color ?? 0xcfccc4), acc = M(L.accent ?? 0x2f6b9a);
    [-7, 7].forEach((x) => [-2, 2].forEach((z) => mesh(g, box(1, 7, 1, x, 3.5, z - 3), con)));
    mesh(g, box(18, 4, 7, 0, 9, -3), con); mesh(g, box(18.4, 0.5, 7.4, 0, 11.2, -3), acc); mesh(g, box(16, 1.6, 0.1, 0, 9.4, 0.52), M(0x7fb3d0, { roughness: 0.25 }));
    mesh(g, box(1.4, 1.2, 40, 0, 7.4, -3), con);
    [-16, 12].forEach((z) => mesh(g, box(1.2, 7, 1.2, 0, 3.5, z), con));
    mesh(g, box(3, 7, 2, 10.5, 3.5, -1), con); // the stairs tower
    sign(g, L.sign || L.name, { bg: L.accent ?? 0x2f6b9a, sub: L.sub, w: 10, h: 1.1, y: 12.2, z: 0.6 });
    return { g, W: 22, D: 40, h: 12, cols: [[-7, -5, 1, 1], [-7, -1, 1, 1], [7, -5, 1, 1], [7, -1, 1, 1], [0, -16, 1.2, 1.2], [0, 12, 1.2, 1.2], [10.5, -1, 3, 2]] };
  },
};
KITS.hotel = KITS.tower; KITS.office = KITS.tower; KITS.embassy = KITS.compound; KITS.monument = KITS.arch; KITS.station = KITS.hub;

/** A landmark from its kind and its look ({ name, sign, sub, color, accent, ... }); unknown kinds get an office block. */
export const buildKind = (L) => (KITS[L.kind] || KITS.tower)(L);
export const KINDS = Object.keys(KITS);

// ---------- far away, at the true bearing, on the skyline ----------
const far = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, fog: true });
const SKY = {
  // a tall tower; `crown` adds a saucer on top (KICC), `glass` makes it a glass slab
  tower(S) {
    const g = new THREE.Group(), h = S.h || 90, w = S.w || 18;
    if (S.round) mesh(g, new THREE.CylinderGeometry(w / 2, w / 2, h, 24).translate(0, h / 2, 0), far(S.color ?? 0xb98a62));
    else mesh(g, box(w, h, w * 0.8, 0, h / 2, 0), far(S.color ?? 0x9fb3c4));
    if (S.crown) mesh(g, new THREE.CylinderGeometry(w * 0.9, w * 0.6, 4, 24).translate(0, h + 2, 0), far(S.accent ?? 0xa47a55));
    if (S.cone) mesh(g, new THREE.ConeGeometry(w * 1.6, h * 0.3, 24).translate(w * 2.4, h * 0.15, 0), far(S.accent ?? 0xa47a55));
    return g;
  },
  // a great bare rock (Aso Rock)
  rock(S) { const g = new THREE.Group(); mesh(g, new THREE.SphereGeometry(S.r || 160, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.6, (S.h || 140) / (S.r || 160), 1), far(S.color ?? 0x6e6a62)); return g; },
  stadium(S) {
    const g = new THREE.Group(), r = S.r || 40;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, 18, 32, 1, true), new THREE.MeshStandardMaterial({ color: S.color ?? 0xe9e4d6, roughness: 0.9, side: THREE.DoubleSide, fog: true })); bowl.position.y = 9; g.add(bowl);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; mesh(g, box(1.4, 34, 1.4, Math.cos(a) * (r + 4), 17, Math.sin(a) * (r + 4)), far(0xb8bec4)); }
    return g;
  },
  // flare stacks with a flame (an oil town on the horizon)
  flare(S) { const g = new THREE.Group(); [0, 14, 30].forEach((x, i) => { mesh(g, new THREE.CylinderGeometry(1.4, 1.8, 50 + i * 10, 10).translate(x, (50 + i * 10) / 2, 0), far(0x8a8d90)); const f = new THREE.Mesh(new THREE.ConeGeometry(3, 9, 8).translate(x, 55 + i * 10, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.0, 0.3) })); g.add(f); }); return g; },
  // a far container port: gantry cranes against the sky (Tin Can Island from Apapa)
  cranes(S) { const g = new THREE.Group(); for (let i = 0; i < (S.n || 4); i++) { const x = i * 26; [[-5, 0], [5, 0]].forEach(([dx]) => mesh(g, box(1.2, 30, 1.2, x + dx, 15, 0), far(0xd9d6cf))); mesh(g, box(12, 2, 2, x, 30, 0), far(0xb4372f)); mesh(g, box(2.4, 2.4, 52, x, 36, -8), far(0xb4372f)); } return g; },
  twin(S) { const g = new THREE.Group(), h = S.h || 80; [-10, 10].forEach((x) => mesh(g, box(14, h, 14, x, h / 2, 0), far(S.color ?? 0x8fa6b8))); return g; },
};
/** A far landmark for the skyline. */
export const buildSkyline = (S) => (SKY[S.kind] || SKY.tower)(S);
