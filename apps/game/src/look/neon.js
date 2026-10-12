import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// City lights for the skyline (world bible 7.1): neon edges on the towers and big animated ad screens,
// like Hong Kong, Shanghai or Times Square, drawn in the game's own illustration style.
// The adverts are for real Nigerian and pan-African companies, each showing what the company actually
// does (researched October 2026); the drawings and taglines are ours, not the companies' artwork.
// Before a public launch, get each company's permission or swap in invented brands.

const INK = '#3b2a20', PAPER = '#f7efdc';
export const ADS = [
  { brand: 'Chowdeck', line: 'Food & groceries, delivered', bg: '#1d6b45', fg: PAPER, art: 'rider' },          // on-demand food and grocery delivery
  { brand: 'Paystack', line: 'Get paid online, fast', bg: '#0f3d6e', fg: PAPER, art: 'checkout' },              // online and in-person payment acceptance
  { brand: 'Moniepoint', line: 'POS & banking for your shop', bg: '#123b8f', fg: PAPER, art: 'pos' },            // business accounts, POS terminals, working capital
  { brand: 'PiggyVest', line: 'Save a little, every day', bg: '#0b5ea8', fg: PAPER, art: 'piggy' },              // automated and locked savings
  { brand: 'Kuda', line: 'Banking with zero fees', bg: '#40196d', fg: PAPER, art: 'phone' },                     // digital bank, no maintenance fees
  { brand: 'Flutterwave', line: 'Payments across borders', bg: '#f5a623', fg: INK, art: 'globe' },               // payment collection, payouts, cross-border rails
  { brand: 'Cowrywise', line: 'Invest from ₦100', bg: '#0a2d5e', fg: PAPER, art: 'plant' },                       // savings and mutual-fund investing from small amounts
  { brand: 'Andela', line: 'Engineers for the world', bg: '#173f3f', fg: PAPER, art: 'laptop' },                 // global marketplace for vetted engineers
];

// ---------- the illustrations: chunky shapes with ink outlines, animated by t (seconds) ----------
function art(g, kind, t, w, h, fg) {
  const cx = w / 2, cy = h * 0.47, s = w / 360;
  g.lineWidth = 6 * s; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round';
  const shape = (fill, fn) => { g.beginPath(); fn(); g.fillStyle = fill; g.fill(); g.stroke(); };
  const rect = (x, y, rw, rh, r = 10) => () => g.roundRect(cx + x * s, cy + y * s, rw * s, rh * s, r * s);
  const circ = (x, y, r) => () => g.arc(cx + x * s, cy + y * s, r * s, 0, 7);
  if (kind === 'rider') { // a rider on a bike with a delivery box, the road scrolling under
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 5 * s;
    for (let i = 0; i < 6; i++) { const x = ((i * 70 - t * 160) % 420 + 420) % 420 - 210; g.beginPath(); g.moveTo(cx + x * s, cy + 92 * s); g.lineTo(cx + (x + 36) * s, cy + 92 * s); g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 6 * s;
    const bob = Math.sin(t * 12) * 3;
    [[-62, 62], [62, 62]].forEach(([x, y]) => { shape('#263832', circ(x, y, 26)); shape('#9a9a9a', circ(x, y, 9)); });
    shape('#e46f4f', () => { g.moveTo(cx - 62 * s, cy + 62 * s); g.lineTo(cx - 10 * s, cy + 10 * s); g.lineTo(cx + 40 * s, cy + 10 * s); g.lineTo(cx + 62 * s, cy + 62 * s); g.closePath(); });
    shape('#f2b33d', rect(-78, -62 + bob, 62, 56, 8)); // the box
    shape('#8d5a3b', circ(12, -58 + bob, 18)); // head
    shape('#2a9d94', rect(-8, -40 + bob, 40, 52, 12)); // body
    shape(fg === INK ? PAPER : '#f7efdc', rect(-70, -48 + bob, 46, 12, 4));
  } else if (kind === 'checkout') { // a card tapping a phone, a tick popping up
    shape(PAPER, rect(-60, -110, 120, 210, 20)); shape('#a9d3d4', rect(-46, -86, 92, 120, 8));
    const k = (t % 2) / 2, tap = Math.min(1, k * 3);
    shape('#f2b33d', () => g.roundRect(cx + (70 - tap * 40) * s, cy + (-10 - tap * 30) * s, 100 * s, 64 * s, 10 * s));
    if (k > 0.35) { shape('#3fbf6d', circ(0, -26, 30)); g.strokeStyle = '#fff'; g.lineWidth = 9 * s; g.beginPath(); g.moveTo(cx - 13 * s, cy - 26 * s); g.lineTo(cx - 3 * s, cy - 15 * s); g.lineTo(cx + 15 * s, cy - 38 * s); g.stroke(); }
  } else if (kind === 'pos') { // a shop counter with a POS terminal printing a receipt
    shape('#a87950', rect(-150, 50, 300, 50, 6));
    shape('#263832', rect(-50, -90, 100, 150, 16)); shape('#a9d3d4', rect(-36, -76, 72, 44, 6));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) shape(PAPER, rect(-32 + c * 24, -20 + r * 20, 16, 12, 3));
    const rc = ((t * 30) % 70);
    shape('#fff', rect(-26, -90 - rc, 52, rc + 4, 2));
  } else if (kind === 'piggy') { // coins dropping into a piggy bank with a lock
    shape('#f6a8a0', () => g.ellipse(cx, cy + 30 * s, 110 * s, 80 * s, 0, 0, 7));
    shape('#f6a8a0', circ(96, 10, 26)); shape('#263832', circ(60, 6, 6));
    shape('#263832', rect(-20, -54, 40, 10, 4));
    shape('#f2b33d', rect(-24, 70, 48, 40, 8)); g.beginPath(); g.arc(cx, cy + 70 * s, 16 * s, Math.PI, 0); g.stroke();
    for (let i = 0; i < 3; i++) { const y = ((t * 120 + i * 60) % 180) - 200; if (y < -60) shape('#f2b33d', circ(0, y, 18)); }
  } else if (kind === 'phone') { // a phone with a card and a big zero
    shape(INK, rect(-70, -120, 140, 230, 24)); shape(PAPER, rect(-56, -100, 112, 190, 12));
    g.fillStyle = '#40196d'; g.font = `900 ${78 * s}px "Baloo 2", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₦0', cx, cy - 20 * s);
    g.font = `800 ${20 * s}px "Baloo 2", sans-serif`; g.fillText('fees', cx, cy + 50 * s);
    const sway = Math.sin(t * 2) * 8;
    shape('#2a9d94', () => g.roundRect(cx + (60 + sway) * s, cy + 30 * s, 110 * s, 70 * s, 10 * s));
  } else if (kind === 'globe') { // a globe with money flying between two pins
    shape('#2a9d94', circ(0, 0, 100)); shape('#7fb35e', () => g.ellipse(cx - 20 * s, cy - 20 * s, 40 * s, 55 * s, 0.4, 0, 7)); shape('#7fb35e', () => g.ellipse(cx + 50 * s, cy + 30 * s, 30 * s, 40 * s, -0.3, 0, 7));
    const k = (t % 2.4) / 2.4, ax = -70, ay = -30, bx = 80, by = 40, mx = (ax + bx) / 2, my = -110;
    const px = (1 - k) ** 2 * ax + 2 * (1 - k) * k * mx + k * k * bx, py = (1 - k) ** 2 * ay + 2 * (1 - k) * k * my + k * k * by;
    g.setLineDash([6 * s, 10 * s]); g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(cx + ax * s, cy + ay * s); g.quadraticCurveTo(cx + mx * s, cy + my * s, cx + bx * s, cy + by * s); g.stroke(); g.setLineDash([]); g.strokeStyle = INK;
    shape('#e46f4f', circ(ax, ay, 12)); shape('#e46f4f', circ(bx, by, 12)); shape('#f2b33d', circ(px, py, 18));
  } else if (kind === 'plant') { // a plant growing from a stack of coins
    [0, 1, 2, 3].forEach((i) => shape('#f2b33d', rect(-50, 80 - i * 22, 100, 20, 8)));
    const grow = 0.5 + 0.5 * Math.min(1, (t % 4) / 2.5);
    g.strokeStyle = '#7fb35e'; g.lineWidth = 10 * s; g.beginPath(); g.moveTo(cx, cy + 0); g.lineTo(cx, cy - 120 * grow * s); g.stroke(); g.strokeStyle = INK; g.lineWidth = 6 * s;
    shape('#7fb35e', () => g.ellipse(cx - 36 * s, cy - 70 * grow * s, 34 * s * grow, 16 * s * grow, -0.5, 0, 7));
    shape('#5f9a45', () => g.ellipse(cx + 36 * s, cy - 104 * grow * s, 34 * s * grow, 16 * s * grow, 0.5, 0, 7));
  } else if (kind === 'laptop') { // a laptop with code typing, small flags orbiting
    shape('#263832', rect(-110, -90, 220, 140, 10)); shape('#173f3f', rect(-96, -76, 192, 112, 6));
    const lines = Math.floor((t * 4) % 7);
    for (let i = 0; i < lines; i++) { g.fillStyle = ['#7fd3b0', '#f2b33d', '#a9d3d4'][i % 3]; g.fillRect(cx + (-84 + (i % 2) * 18) * s, cy + (-64 + i * 14) * s, (80 + (i * 37) % 70) * s, 8 * s); }
    shape('#c9ced8', () => { g.moveTo(cx - 140 * s, cy + 56 * s); g.lineTo(cx + 140 * s, cy + 56 * s); g.lineTo(cx + 120 * s, cy + 78 * s); g.lineTo(cx - 120 * s, cy + 78 * s); g.closePath(); });
    ['#e46f4f', '#2a9d94', '#f2b33d'].forEach((c, i) => { const a = t * 1.2 + i * 2.1; shape(c, circ(Math.cos(a) * 150, -100 + Math.sin(a) * 30, 12)); });
  }
}

export function drawAd(canvas, ad, t) {
  const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  g.fillStyle = ad.bg; g.fillRect(0, 0, w, h);
  // a soft paper sun behind the art, like the arrival film
  g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(w / 2, h * 0.45, w * 0.36, 0, 7); g.fill();
  art(g, ad.art, t, w, h, ad.fg);
  g.fillStyle = ad.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${Math.round(w * 0.15)}px "Baloo 2", "Arial Black", sans-serif`; g.fillText(ad.brand, w / 2, h * 0.8);
  g.font = `700 ${Math.round(w * 0.065)}px "Baloo 2", sans-serif`; g.globalAlpha = 0.9; g.fillText(ad.line, w / 2, h * 0.9); g.globalAlpha = 1;
}

// Dress a skyline: neon edges and crowns on every tower, ad screens on the tallest ones facing the district.
export function dressSkyline(towers, { center, reduced }) {
  const group = new THREE.Group(); group.name = 'neon';
  const NEON = [new THREE.Color(1.6, 0.35, 1.2), new THREE.Color(0.3, 1.4, 1.7), new THREE.Color(1.7, 0.95, 0.25), new THREE.Color(0.75, 0.45, 1.8), new THREE.Color(0.4, 1.7, 0.7)];
  const strips = [];
  const neonMats = NEON.map((c) => new THREE.MeshBasicMaterial({ color: c.clone(), fog: false, toneMapped: false }));
  towers.forEach((tw, i) => {
    const mat = neonMats[i % neonMats.length], hw = tw.w / 2, hd = tw.d / 2;
    // four corner strips and a crown band
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { if ((i + a + b) % 3 === 0) return; const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, tw.h, 0.7).translate(0, tw.h / 2, 0), mat); m.position.set(a * hw, 0, b * hd); strips.push({ m, tw }); });
    [0.97, 0.6].forEach((f, k) => { if (k && i % 2) return; const band = new THREE.Mesh(new THREE.BoxGeometry(tw.w + 1.2, 0.9, tw.d + 1.2).translate(0, tw.h * f, 0), neonMats[(i + k + 2) % neonMats.length]); strips.push({ m: band, tw }); });
  });
  // one mesh per colour: the strips never move, and as separate meshes they cost a draw call each
  const byMat = new Map();
  strips.forEach(({ m, tw }) => {
    m.updateMatrix();
    const g = m.geometry.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(tw.ry).setPosition(tw.x, 0, tw.z).multiply(m.matrix));
    m.geometry.dispose();
    if (!byMat.has(m.material)) byMat.set(m.material, []);
    byMat.get(m.material).push(g);
  });
  byMat.forEach((geos, mat) => { group.add(new THREE.Mesh(mergeGeometries(geos), mat)); geos.forEach((g) => g.dispose()); });

  // ad screens on the tallest towers, turned to face the district
  const screens = [];
  const tall = [...towers].sort((a, b) => b.h - a.h).slice(0, ADS.length);
  tall.forEach((tw, i) => {
    const ad = ADS[i % ADS.length];
    const c = document.createElement('canvas'); c.width = 360; c.height = 520;
    drawAd(c, ad, 0);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false });
    const sw = Math.min(Math.max(tw.w, tw.d) * 1.05, tw.h * 0.45), sh = sw * (520 / 360);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), mat);
    // the face nearest the district centre
    const a = Math.atan2(center.x - tw.x, center.z - tw.z);
    const off = Math.hypot(tw.w, tw.d) / 2 + 1.2; // clear of every corner, whatever the tower's turn
    mesh.position.set(tw.x + Math.sin(a) * off, Math.min(tw.h - sh / 2 - 4, tw.h * 0.62), tw.z + Math.cos(a) * off);
    mesh.rotation.y = a;
    // a glowing frame
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(sw + 1.4, sh + 1.4), neonMats[(i + 1) % neonMats.length]);
    frame.position.copy(mesh.position).add(new THREE.Vector3(-Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1)); frame.rotation.y = a;
    group.add(frame, mesh);
    screens.push({ c, tex, ad, mat, phase: i * 0.7 });
  });

  let acc = 0, clock = 0;
  function update(dt, night) {
    clock += dt; acc -= dt;
    // neon only after dusk; screens always on, brighter at night
    neonMats.forEach((m, i) => { m.visible = night > 0.15; m.color.copy(NEON[i]).multiplyScalar(0.25 + 0.85 * night * (reduced ? 1 : 0.85 + 0.15 * Math.sin(clock * 2 + i))); });
    screens.forEach((s) => s.mat.color.setScalar(0.55 + 0.6 * night));
    if (acc <= 0 && !reduced) { acc = 1 / 8; screens.forEach((s) => { drawAd(s.c, s.ad, clock + s.phase); s.tex.needsUpdate = true; }); }
  }
  return { group, update, screens };
}
