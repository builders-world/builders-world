import * as THREE from 'three';
import { shopKind, WINDOW } from './shopfronts.js';

// Signs that say what a place does (Elvis, 10 October 2026: "Let buildings have illustrations of what they do. So if it's
// a repair shop, there should be an illustration indicating that it's a repair shop, maybe spanners ... or screwdrivers.
// Basically, let's have signage for every building that has something, and that way it improves navigation ... let's
// have a way for the buildings to also have entrances or car parks"). Every street shop gets a name board over its
// awning with a picture of its trade, and a round picture sign out at the corner for the pavement; every market stall a
// board hanging from its awning; every place you can go into a fingerpost to the nearest car park. The pictures are drawn
// here in the game's paper-and-ink style, one for each trade.

const INK = '#3b2a20', PAPER = '#f7efdc', FONT = '"Baloo 2", ui-rounded, system-ui, sans-serif';
export const stallKind = (name = '') => (/Suya|Smokie|Grill|Nyama/i.test(name) ? 'grill' : /Corn|Mahindi|Maize/i.test(name) ? 'corn' : /Fruit/i.test(name) ? 'fruit'
  : /POS|Recharge|MoMo|Mobile money|bundles/i.test(name) ? 'money' : /Zobo|Kunu|FanIce|Drinks/i.test(name) ? 'drinks' : /Boli|Bole|Kelewele|Plantain/i.test(name) ? 'plantain' : 'pot');
const TRADE = { provisions: 'Provisions · Drinks · Bread', repairs: 'Phone repairs · Screens · Batteries', print: 'Printing · Binding · Posters', gadget: 'Chargers · Cables · Power banks',
  kitchen: 'Hot food · Eat in', cafe: 'Coffee · Wi-Fi · Pastries', money: 'Mobile money · Airtime · Bills', grill: 'Grilled to order', corn: 'Roasted on the fire', fruit: 'Fresh, peeled for you',
  drinks: 'Ice cold', plantain: 'Fried and roasted', pot: 'Hot from the pot' };
const COLOUR = { provisions: '#2a9d94', repairs: '#3b5ba5', print: '#7d5aa6', gadget: '#2b2f33', kitchen: '#e46f4f', cafe: '#8a5a36', money: '#2f8a4f', grill: '#c0392b', corn: '#d9a21b', fruit: '#e2741d', drinks: '#2a6fb5', plantain: '#b8860b', pot: '#a0522d' };

// ---------- the pictures: each in a 200 x 200 box, ink outlines, flat colour ----------
function picture(g, kind, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s); g.lineWidth = 7; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK;
  const shape = (fill, path) => { g.beginPath(); path(); if (fill) { g.fillStyle = fill; g.fill(); } g.stroke(); };
  const rr = (x0, y0, w, h, r) => g.roundRect(x0, y0, w, h, r);
  if (kind === 'repairs') {
    // a spanner and a screwdriver, crossed
    g.save(); g.translate(100, 100); g.rotate(-Math.PI / 4);
    shape('#b8bec4', () => { rr(-12, -62, 24, 120, 10); }); shape('#b8bec4', () => { g.arc(0, -70, 30, 0.35 * Math.PI, 2.65 * Math.PI); g.lineTo(12, -82); g.lineTo(-12, -82); g.closePath(); });
    g.restore(); g.save(); g.translate(100, 100); g.rotate(Math.PI / 4);
    shape('#9aa3b2', () => { rr(-6, -78, 12, 70, 4); }); shape('#e46f4f', () => { rr(-17, -10, 34, 72, 14); }); g.restore();
  } else if (kind === 'provisions') {
    shape('#e2b13c', () => { g.moveTo(26, 150); g.lineTo(26, 92); g.quadraticCurveTo(26, 62, 70, 62); g.quadraticCurveTo(114, 62, 114, 92); g.lineTo(114, 150); g.closePath(); }); // a loaf
    [50, 70, 90].forEach((sx) => shape(null, () => { g.moveTo(sx, 80); g.lineTo(sx + 10, 96); }));
    shape('#2f7d4f', () => { rr(128, 40, 46, 110, 14); }); shape('#f7efdc', () => { rr(136, 80, 30, 34, 6); }); shape('#2f7d4f', () => { rr(141, 22, 20, 22, 4); }); // a bottle
  } else if (kind === 'print') {
    shape('#ffffff', () => { rr(56, 24, 88, 60, 4); }); shape('#e8e2d0', () => { rr(26, 72, 148, 64, 14); }); shape('#ffffff', () => { rr(56, 120, 88, 56, 4); });
    [138, 150, 162].forEach((ly) => shape(null, () => { g.moveTo(70, ly); g.lineTo(130, ly); })); shape('#2a9d94', () => { g.arc(152, 96, 8, 0, 7); });
  } else if (kind === 'gadget') {
    shape('#2b2f33', () => { rr(40, 22, 70, 136, 14); }); shape('#8fd6ff', () => { rr(50, 38, 50, 98, 6); });
    shape(null, () => { g.moveTo(110, 120); g.bezierCurveTo(150, 120, 120, 170, 160, 170); }); shape('#f2b33d', () => { rr(146, 150, 30, 34, 6); }); shape(null, () => { g.moveTo(154, 184); g.lineTo(154, 196); g.moveTo(168, 184); g.lineTo(168, 196); });
  } else if (kind === 'kitchen' || kind === 'pot') {
    [70, 100, 130].forEach((sx) => shape(null, () => { g.moveTo(sx, 54); g.bezierCurveTo(sx - 14, 40, sx + 14, 30, sx, 16); }));
    shape('#9aa3b2', () => { g.moveTo(30, 80); g.lineTo(170, 80); g.lineTo(158, 160); g.quadraticCurveTo(100, 176, 42, 160); g.closePath(); });
    shape('#e46f4f', () => { g.ellipse(100, 80, 70, 12, 0, 0, 7); }); shape(null, () => { g.moveTo(30, 96); g.lineTo(14, 92); g.moveTo(170, 96); g.lineTo(186, 92); });
  } else if (kind === 'cafe') {
    [80, 110].forEach((sx) => shape(null, () => { g.moveTo(sx, 60); g.bezierCurveTo(sx - 12, 46, sx + 12, 36, sx, 22); }));
    shape('#f7efdc', () => { g.moveTo(40, 74); g.lineTo(150, 74); g.lineTo(140, 156); g.quadraticCurveTo(95, 170, 50, 156); g.closePath(); });
    shape(null, () => { g.moveTo(150, 92); g.bezierCurveTo(186, 92, 186, 136, 144, 134); }); shape('#8a5a36', () => { g.ellipse(95, 80, 50, 8, 0, 0, 7); }); shape(null, () => { g.moveTo(26, 178); g.lineTo(170, 178); });
  } else if (kind === 'money') {
    shape('#2b2f33', () => { rr(26, 30, 64, 124, 12); }); shape('#a9dc8f', () => { rr(35, 44, 46, 90, 6); });
    [0, 1, 2].forEach((k) => shape('#7fc47a', () => { rr(104, 120 - k * 26, 76, 36, 6); })); shape('#f2c418', () => { g.arc(142, 64, 24, 0, 7); });
    g.fillStyle = INK; g.font = `800 30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 142, 66);
  } else if (kind === 'grill') {
    for (let k = 0; k < 3; k++) { shape(null, () => { g.moveTo(30 + k * 20, 60 + k * 20); g.lineTo(170 - (2 - k) * 0 - k * 0, 40 + k * 20); }); for (let j = 0; j < 4; j++) shape('#8a3a1e', () => { rr(52 + j * 26, 46 + k * 20 - j * 3, 18, 14, 4); }); }
    shape('#f2b33d', () => { g.moveTo(50, 180); g.quadraticCurveTo(40, 140, 70, 120); g.quadraticCurveTo(70, 150, 90, 150); g.quadraticCurveTo(84, 120, 110, 106); g.quadraticCurveTo(116, 144, 136, 140); g.quadraticCurveTo(160, 150, 150, 180); g.closePath(); });
    shape('#e46f4f', () => { g.moveTo(80, 180); g.quadraticCurveTo(78, 158, 98, 148); g.quadraticCurveTo(104, 166, 124, 180); g.closePath(); });
  } else if (kind === 'corn') {
    shape('#5f9a45', () => { g.moveTo(100, 186); g.quadraticCurveTo(40, 150, 56, 70); g.quadraticCurveTo(84, 130, 100, 186); }); shape('#5f9a45', () => { g.moveTo(100, 186); g.quadraticCurveTo(160, 150, 144, 70); g.quadraticCurveTo(116, 130, 100, 186); });
    shape('#f2c418', () => { g.ellipse(100, 92, 30, 74, 0, 0, 7); });
    for (let r = 0; r < 6; r++) for (let c = -1; c <= 1; c++) { g.fillStyle = '#d9a21b'; g.beginPath(); g.arc(100 + c * 15, 44 + r * 18, 5, 0, 7); g.fill(); }
  } else if (kind === 'fruit') {
    shape('#f28c28', () => { g.arc(84, 116, 56, 0, 7); }); shape('#5f9a45', () => { g.moveTo(90, 62); g.quadraticCurveTo(120, 30, 150, 50); g.quadraticCurveTo(120, 74, 90, 62); });
    shape('#e2b13c', () => { g.ellipse(150, 140, 30, 38, 0, 0, 7); }); [132, 150, 168].forEach((sx) => shape(null, () => { g.moveTo(sx, 118); g.lineTo(sx + 8, 160); }));
  } else if (kind === 'drinks') {
    shape(null, () => { g.moveTo(112, 24); g.lineTo(96, 70); }); shape('#c0392b', () => { g.moveTo(54, 70); g.lineTo(146, 70); g.lineTo(132, 180); g.lineTo(68, 180); g.closePath(); });
    shape('#f7efdc', () => { rr(64, 104, 72, 34, 6); }); shape('#8fd6ff', () => { g.arc(84, 86, 7, 0, 7); }); shape('#8fd6ff', () => { g.arc(116, 90, 6, 0, 7); });
  } else if (kind === 'plantain') {
    shape('#e2b13c', () => { g.moveTo(40, 80); g.quadraticCurveTo(100, 30, 168, 70); g.quadraticCurveTo(108, 60, 48, 100); g.closePath(); });
    [[60, 140], [100, 150], [140, 140], [80, 172], [120, 172]].forEach(([cx, cy]) => shape('#d9822b', () => { g.ellipse(cx, cy, 20, 12, 0, 0, 7); }));
  }
  g.restore();
}
function tex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function fit(g, text, maxW, size, weight = 800) { let s = size; g.font = `${weight} ${s}px ${FONT}`; while (g.measureText(text).width > maxW && s > 20) { s -= 2; g.font = `${weight} ${s}px ${FONT}`; } return s; }

// the shop's board: the picture on a coloured panel, the name, what it sells
function boardTexture(name, kind) {
  return tex(1024, 210, (g, W, H) => {
    g.fillStyle = PAPER; g.beginPath(); g.roundRect(0, 0, W, H, 26); g.fill();
    g.fillStyle = COLOUR[kind] || INK; g.beginPath(); g.roundRect(10, 10, 190, H - 20, 20); g.fill();
    g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(105, H / 2, 82, 0, 7); g.fill();
    picture(g, kind, 105 - 70, H / 2 - 70, 0.7);
    g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle';
    fit(g, name.toUpperCase(), W - 260, 74); g.fillText(name.toUpperCase(), 228, 80);
    g.fillStyle = COLOUR[kind] || INK; fit(g, TRADE[kind] || '', W - 260, 40, 700); g.fillText(TRADE[kind] || '', 230, 152);
    g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.roundRect(3, 3, W - 6, H - 6, 24); g.stroke();
  });
}
// the round picture sign, the same on both faces
const discTexture = (kind) => tex(256, 256, (g) => { g.fillStyle = PAPER; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.lineWidth = 12; g.strokeStyle = COLOUR[kind] || INK; g.stroke(); picture(g, kind, 128 - 85, 128 - 85, 0.85); });
// the stall's hanging board: the picture and the name
const stallTexture = (name, kind) => tex(512, 180, (g, W, H) => {
  g.fillStyle = COLOUR[kind] || INK; g.beginPath(); g.roundRect(0, 0, W, H, 22); g.fill();
  g.fillStyle = PAPER; g.beginPath(); g.arc(90, H / 2, 70, 0, 7); g.fill(); picture(g, kind, 90 - 60, H / 2 - 60, 0.6);
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; fit(g, name, W - 190, 58); g.fillText(name, 176, H / 2 + 4);
});
// the fingerpost to the car park: the blue P, the words, the distance, an arrow at the pointed end
// (the back of the board is drawn with the arrow on the left, so from behind it still points the same physical way and reads)
const parkTexture = (dist, back = false) => tex(768, 180, (g, W, H) => {
  const X = (x) => (back ? W - x : x);
  g.fillStyle = '#1f5aa6'; g.beginPath(); g.moveTo(X(0), 0); g.lineTo(X(W - 80), 0); g.lineTo(X(W), H / 2); g.lineTo(X(W - 80), H); g.lineTo(X(0), H); g.closePath(); g.fill();
  const px = back ? W - 162 : 18; g.fillStyle = '#fff'; g.beginPath(); g.roundRect(px, 18, 144, 144, 18); g.fill(); g.fillStyle = '#1f5aa6'; g.font = `900 120px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', px + 72, 96);
  const tx = back ? 110 : 190; g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = `800 50px ${FONT}`; g.fillText('Customer parking', tx, 64); g.font = `700 44px ${FONT}`; g.fillText(dist, tx, 128);
});

export function buildShopSigns({ world, scene, props, doors = [], places = {} }) {
  const group = new THREE.Group(); group.name = 'shop-signs'; scene.add(group);
  const dark = new THREE.MeshStandardMaterial({ color: 0x263832, roughness: 0.6 }), post = new THREE.MeshStandardMaterial({ color: 0x55605a, roughness: 0.55, metalness: 0.3 });
  const discs = {}, cols = [], posts = [];
  const lit = (map) => new THREE.MeshBasicMaterial({ map, color: 0xeeeeee }); // lit from within, so they read after dark too
  let boards = 0, blades = 0, stalls = 0, parking = 0;
  // ---------- the street's shops: a board over the awning, a picture out at the corner ----------
  (props.interact || []).filter((it) => it.id?.startsWith('shop:') && it.at).forEach((it) => {
    const { x, z, ry } = it.at, kind = shopKind(it.name);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; group.add(g);
    // over the old blank panel (the kit's sign, x -0.8, 4.48 m up, z 3.2): wider, with a frame behind it
    const bw = 4.9, bh = bw * 210 / 1024;
    g.add(new THREE.Mesh(new THREE.BoxGeometry(bw + 0.12, bh + 0.12, 0.08).translate(-0.4, 4.47, 3.3), dark));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), lit(boardTexture(it.name, kind))); face.position.set(-0.4, 4.47, 3.35); g.add(face);
    boards++;
    // the blade: a round picture on a bracket off the corner, for people walking along the pavement
    discs[kind] ||= lit(discTexture(kind));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.06).translate(4.45, 3.82, 3.1), dark));
    [1, -1].forEach((sd) => { const d = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), discs[kind]); d.position.set(4.62 + sd * 0.02, 3.32, 3.1); d.rotation.y = sd * Math.PI / 2; g.add(d); });
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.03, 32).rotateZ(Math.PI / 2).translate(4.62, 3.32, 3.1), dark));
    blades++;
    void WINDOW;
  });
  // ---------- market stalls: a board hanging from the front of the awning ----------
  (props.interact || []).filter((it) => it.id?.startsWith('stall:') && it.at).forEach((it) => {
    const { x, z, ry } = it.at, kind = stallKind(it.name);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; group.add(g);
    const bw = 1.7, bh = bw * 180 / 512;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), lit(stallTexture(it.name, kind))); face.position.set(0, 2.42, 2.18); g.add(face);
    const back = face.clone(); back.rotation.y = Math.PI; back.position.z = 2.16; g.add(back);
    [-0.7, 0.7].forEach((sx) => g.add(new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.36, 0.015).translate(sx, 2.42 + bh / 2 + 0.18, 2.17), dark)));
    stalls++;
  });
  // ---------- the places you go into: a fingerpost to the nearest car park ----------
  const carParks = (world.claims || []).filter((c) => c.kind === 'car_park');
  const free = (px, pz) => !world.onCarriageway?.(px, pz, 0.6) && !world.onRail?.(px, pz, 0.5) && !world.inPlot?.(px, pz, 0.3) && !world.solidAt?.(px, 1, pz) && !world.kitColliders?.some((k) => Math.hypot(k.cx - px, k.cz - pz) < Math.max(k.hx || 0, k.hz || 0) + 0.6);
  doors.forEach((d) => {
    if (!carParks.length) return;
    const P = carParks.map((c) => ({ c, dist: Math.hypot(c.cx - d.at.x, c.cz - d.at.z) })).sort((a, b) => a.dist - b.dist)[0];
    if (!P || P.dist > 170 || P.dist < 12) return;
    // a spot on the pavement a little way along from the door
    let at = null;
    // (and its arm, 1.7 m long at head height toward the car park, must not reach into a wall or a tree)
    const armClear = (px, pz) => { const a = Math.atan2(P.c.cx - px, P.c.cz - pz), sx = Math.sin(a), sz = Math.cos(a); for (let k = 0.3; k <= 1.8; k += 0.3) if (world.solidAt?.(px + sx * k, 2.25, pz + sz * k) || world.onCarriageway?.(px + sx * k, pz + sz * k, 0.1)) return false; return true; };
    for (let r = 2.2; r < 7 && !at; r += 0.6) for (let k = 0; k < 16 && !at; k++) { const a = (k / 16) * Math.PI * 2, px = d.at.x + Math.cos(a) * r, pz = d.at.z + Math.sin(a) * r; if (free(px, pz) && armClear(px, pz)) at = { x: px, z: pz }; }
    if (!at) return;
    const ang = Math.atan2(P.c.cx - at.x, P.c.cz - at.z); // the way to the car park
    const g = new THREE.Group(); g.position.set(at.x, 0, at.z); group.add(g);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.6, 0.09).translate(0, 1.3, 0), post));
    // the board points along its own length: its arrow end toward the car park, readable from both sides
    const arm = new THREE.Group(); arm.position.y = 2.25; arm.rotation.y = ang - Math.PI / 2; g.add(arm);
    const label = `${Math.round(P.dist / 10) * 10} m this way`, w = 1.6, h = w * 180 / 768;
    const f1 = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit(parkTexture(label))); f1.position.set(w / 2 + 0.05, 0, 0.03); arm.add(f1);
    const f2 = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit(parkTexture(label, true))); f2.position.set(w / 2 + 0.05, 0, -0.03); f2.rotation.y = Math.PI; arm.add(f2);
    cols.push({ name: 'sign_post', cx: at.x, cz: at.z, hx: 0.08, hz: 0.08, ry: 0 }); posts.push({ x: at.x, z: at.z, ang, to: d.key });
    d.parking = { x: P.c.cx, z: P.c.cz, d: P.dist }; parking++;
    void places;
  });
  if (cols.length) world.addColliders?.(cols);
  world.shopSigns = { boards, blades, stalls, parking, posts };
  return { group, counts: world.shopSigns, dispose() { group.removeFromParent(); } };
}
