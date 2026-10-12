import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { C, FONT } from '../uikit.js';
import { sfx } from '../audio.js';
import { findSite } from '../parks.js';
import { person, box, mat, signBoard, gameKeys } from './common.js';
import { SPORTS, createRacketMatch } from './racket.js';
import { HOOP } from './hoopphys.js';
import { createHoopsMatch } from './hoops.js';
import { POOL, createSwimRace } from './swim.js';
import { createChess } from './chess.js';

// Sport in Yaba (Elvis, 10 October 2026): the Yaba Sports Centre (a tennis court, a padel court and a
// basketball half court under floodlights), the Yaba Aquatic and Indoor Arena (a 25 m pool and table
// tennis), and the Chess Corner. Every game is played for real against people who live here; chess
// also against anyone online. This file builds the places and runs whichever game you are in.

// the people you can play
const LOOKS = {
  seyi: { body: 'm', skin: '#6b4226', hair: 'fade', hairColor: '#1b1714', top: 'tee', topColor: '#f4f1ea', bottom: 'shorts', bottomColor: '#22336a', shoes: 'sneakers', shoeColor: '#f4f1ea', acc: ['watch'] },
  ada: { body: 'f', skin: '#7a4a2e', hair: 'bun', hairColor: '#1b1714', top: 'tee', topColor: '#e46f4f', bottom: 'skirt', bottomColor: '#f4f1ea', shoes: 'sneakers', shoeColor: '#f4f1ea', acc: [] },
  bisi: { body: 'f', skin: '#8a5a3c', hair: 'braids', hairColor: '#2b1d14', top: 'tee', topColor: '#2a9d94', bottom: 'shorts', bottomColor: '#1d2028', shoes: 'sneakers', shoeColor: '#2a9d94', acc: [] },
  kunle: { body: 'm', skin: '#5a3825', hair: 'low', hairColor: '#1b1714', top: 'tee', topColor: '#f2b33d', bottom: 'shorts', bottomColor: '#3b3f45', shoes: 'sneakers', shoeColor: '#1d2028', acc: [] },
  zainab: { body: 'f', skin: '#6b4226', hair: 'cornrows', hairColor: '#1b1714', top: 'tee', topColor: '#7fb35e', bottom: 'shorts', bottomColor: '#22336a', shoes: 'sneakers', shoeColor: '#f4f1ea', acc: [] },
  tolu: { body: 'm', skin: '#4a2e1c', hair: 'afro', hairColor: '#1b1714', top: 'tee', topColor: '#c0392b', bottom: 'shorts', bottomColor: '#1d2028', shoes: 'sneakers', shoeColor: '#c0392b', acc: [] },
  chidi: { body: 'm', skin: '#7a4a2e', hair: 'locs', hairColor: '#1b1714', top: 'tee', topColor: '#22336a', bottom: 'shorts', bottomColor: '#f2b33d', shoes: 'sneakers', shoeColor: '#f4f1ea', acc: [] },
  funmi: { body: 'f', skin: '#8a5a3c', hair: 'afro', hairColor: '#1b1714', top: 'tee', topColor: '#f2b33d', bottom: 'shorts', bottomColor: '#3b3f45', shoes: 'sneakers', shoeColor: '#f4f1ea', acc: [] },
};
const OPP = {
  tennis: [{ name: 'Seyi Adebayo', look: LOOKS.seyi, skill: 0.5, kind: 'club player', reward: 300 }, { name: 'Coach Ada Okafor', look: LOOKS.ada, skill: 0.8, kind: 'coach', reward: 700 }],
  padel: [{ pair: [{ name: 'Kunle', look: LOOKS.kunle, skill: 0.5 }, { name: 'Zainab', look: LOOKS.zainab, skill: 0.55 }], kind: 'Kunle and Zainab, weekend players', reward: 350 }, { pair: [{ name: 'Chidi', look: LOOKS.chidi, skill: 0.78 }, { name: 'Funmi', look: LOOKS.funmi, skill: 0.75 }], kind: 'Chidi and Funmi, league players', reward: 750 }],
  hoops: [{ name: 'Tolu', look: LOOKS.tolu, skill: 0.5, kind: 'plays every evening', reward: 300 }, { name: 'Chidi', look: LOOKS.chidi, skill: 0.8, kind: 'played for UNILAG', reward: 700 }],
  tt: [{ name: 'Funmi', look: LOOKS.funmi, skill: 0.5, kind: 'quick hands', reward: 250 }, { name: 'Mr Okon', look: { body: 'm', skin: '#5a3825', hair: 'bald', top: 'tee', topColor: '#f4f1ea', bottom: 'trousers', bottomColor: '#3b3f45', shoes: 'sneakers', shoeColor: '#1d2028', acc: ['glasses'] }, skill: 0.82, kind: 'veteran, spins everything', reward: 600 }],
};
const SWIM_FIELD = [
  { name: 'Ifeoma', look: { body: 'f', skin: '#7a4a2e', hair: 'bun', top: 'tee', topColor: '#22336a', bottom: 'shorts', bottomColor: '#22336a', acc: [] }, skill: 0.75, pace: 0.4 },
  { name: 'Dapo', look: { body: 'm', skin: '#5a3825', hair: 'low', top: 'tee', topColor: '#1d2028', bottom: 'shorts', bottomColor: '#1d2028', acc: [] }, skill: 0.7, pace: 0.42 },
  { name: 'Temi', look: { body: 'f', skin: '#8a5a3c', hair: 'braids', top: 'tee', topColor: '#c0392b', bottom: 'shorts', bottomColor: '#c0392b', acc: [] }, skill: 0.55, pace: 0.47 },
  { name: 'Uche', look: { body: 'm', skin: '#6b4226', hair: 'fade', top: 'tee', topColor: '#2a9d94', bottom: 'shorts', bottomColor: '#2a9d94', acc: [] }, skill: 0.5, pace: 0.5 },
  { name: 'Halima', look: { body: 'f', skin: '#4a2e1c', hair: 'cornrows', top: 'tee', topColor: '#f2b33d', bottom: 'shorts', bottomColor: '#f2b33d', acc: [] }, skill: 0.42, pace: 0.54 },
];

// ---------- court surfaces, drawn once on canvas: the lines stay crisp with texture filtering ----------
function surface(Wm, Dm, ppm, draw) {
  const c = document.createElement('canvas'); c.width = Math.round(Wm * ppm); c.height = Math.round(Dm * ppm);
  const g = c.getContext('2d'); g.scale(ppm, ppm); g.translate(Wm / 2, Dm / 2);
  draw(g);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const line = (g, x0, z0, x1, z1, w = 0.05) => { g.lineWidth = w; g.beginPath(); g.moveTo(x0, z0); g.lineTo(x1, z1); g.stroke(); };

function tennisCourt() {
  // a club court: the full playing area, with a little less room behind than a stadium court
  const T = SPORTS.tennis, W = 15.6, D = 33;
  const tex = surface(W, D, 56, (g) => {
    g.fillStyle = '#3f8a5a'; g.fillRect(-W / 2, -D / 2, W, D);
    g.fillStyle = '#2f6fa8'; g.fillRect(-T.Wd / 2, -T.L / 2, T.Wd, T.L);
    g.strokeStyle = '#f7f4ec';
    [-T.L / 2, T.L / 2].forEach((z) => { line(g, -T.Wd / 2, z, T.Wd / 2, z, 0.1); line(g, -0.05, z, 0.05, z - Math.sign(z) * 0.1, 0.05); });
    [-T.Wd / 2, T.Wd / 2, -T.W / 2, T.W / 2].forEach((x) => line(g, x, -T.L / 2, x, T.L / 2));
    [-T.svc, T.svc].forEach((z) => line(g, -T.W / 2, z, T.W / 2, z));
    line(g, 0, -T.svc, 0, T.svc);
    line(g, 0, -T.L / 2, 0, -T.L / 2 + 0.1, 0.05); line(g, 0, T.L / 2, 0, T.L / 2 - 0.1, 0.05);
  });
  const grp = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  floor.position.y = 0.02; grp.add(floor);
  addNet(grp, T.netHalf, T.netC, T.netP, 0);
  fenceAround(grp, W, D, 3.2, 'side');
  floodlights(grp, W, D);
  return { group: grp, W, D };
}
function addNet(grp, half, hc, hp, y0) {
  const netMat = new THREE.MeshStandardMaterial({ color: 0x1d2028, transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.9 });
  const shape = new THREE.Shape(); shape.moveTo(-half, y0); shape.lineTo(-half, y0 + hp); shape.lineTo(0, y0 + hc); shape.lineTo(half, y0 + hp); shape.lineTo(half, y0); shape.closePath();
  grp.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), netMat));
  const tape = new THREE.Mesh(mergeGeometries([new THREE.BoxGeometry(half, 0.05, 0.02).translate(0, 0, 0).rotateZ(Math.atan2(hp - hc, half)).translate(half / 2, y0 + (hp + hc) / 2, 0), new THREE.BoxGeometry(half, 0.05, 0.02).rotateZ(-Math.atan2(hp - hc, half)).translate(-half / 2, y0 + (hp + hc) / 2, 0)]), mat(0xf7f4ec, 0.6));
  grp.add(tape);
  grp.add(new THREE.Mesh(mergeGeometries([box(0.08, hp + 0.05, 0.08, -half, y0 + (hp + 0.05) / 2, 0), box(0.08, hp + 0.05, 0.08, half, y0 + (hp + 0.05) / 2, 0)]), mat(0x2a3a33, 0.5)));
}
// chain-link round the court, with a gate on the near side
function fenceAround(grp, W, D, h, gate) {
  const posts = [], panels = [];
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x2a3a33, transparent: true, opacity: 0.32, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false });
  const seg = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0); const m = new THREE.PlaneGeometry(L, h).translate(0, h / 2, 0).rotateY(-Math.atan2(z1 - z0, x1 - x0)).translate((x0 + x1) / 2, 0, (z0 + z1) / 2); panels.push(m); for (let u = 0; u <= L; u += 3) posts.push(box(0.07, h, 0.07, x0 + (x1 - x0) * (u / L), h / 2, z0 + (z1 - z0) * (u / L))); };
  const hw = W / 2, hd = D / 2, gw = 1.4;
  seg(-hw, -hd, hw, -hd); seg(-hw, hd, -gw, hd); seg(gw, hd, hw, hd);
  if (gate === 'side') { seg(-hw, -hd, -hw, -gw); seg(-hw, gw, -hw, hd); seg(hw, -hd, hw, hd); }
  else { seg(-hw, -hd, -hw, hd); seg(hw, -hd, hw, hd); }
  grp.add(new THREE.Mesh(mergeGeometries(panels), fenceMat), new THREE.Mesh(mergeGeometries(posts), mat(0x2a3a33, 0.5)));
  grp.userData.fence = { W, D, gate, gw };
}
function floodlights(grp, W, D) {
  const poles = [], heads = [];
  const at = [[-W / 2 - 0.4, -D / 4], [W / 2 + 0.4, -D / 4], [-W / 2 - 0.4, D / 4], [W / 2 + 0.4, D / 4]];
  at.forEach(([x, z]) => { poles.push(box(0.16, 8, 0.16, x, 4, z)); heads.push(box(0.9, 0.35, 0.5, x - Math.sign(x) * 0.3, 8.05, z)); });
  grp.add(new THREE.Mesh(mergeGeometries(poles), mat(0x8a929a, 0.5, { metalness: 0.4 })));
  const lit = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3) });
  grp.add(new THREE.Mesh(mergeGeometries(heads), lit));
  grp.userData.lights = at.map(([x, z]) => ({ x: x - Math.sign(x) * 0.3, y: 7.8, z }));
  grp.userData.lit = lit;
}

function padelCourt() {
  const P = SPORTS.padel, W = 12, D = 22;
  const tex = surface(W, D, 64, (g) => {
    g.fillStyle = '#3f8a5a'; g.fillRect(-W / 2, -D / 2, W, D);
    g.fillStyle = '#2a6fb0'; g.fillRect(-P.W / 2, -P.L / 2, P.W, P.L);
    g.strokeStyle = '#f7f4ec';
    [-P.svc, P.svc].forEach((z) => line(g, -P.W / 2, z, P.W / 2, z));
    line(g, 0, -P.svc - 0.2, 0, P.svc + 0.2);
  });
  const grp = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  floor.position.y = 0.02; grp.add(floor);
  addNet(grp, P.netHalf, P.netC, P.netP, 0);
  // the cage: glass at the back and the back of each side, mesh above and along the middle, frames black
  const glass = new THREE.MeshStandardMaterial({ color: 0xbfe3f0, transparent: true, opacity: 0.22, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
  const meshM = new THREE.MeshStandardMaterial({ color: 0x1d2028, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const hz = P.L / 2, hx = P.W / 2, gl = [], ms = [], fr = [];
  gl.push(new THREE.PlaneGeometry(P.W, 3).translate(0, 1.5, -hz), new THREE.PlaneGeometry(P.W, 3).translate(0, 1.5, hz));
  ms.push(new THREE.PlaneGeometry(P.W, 1).translate(0, 3.5, -hz), new THREE.PlaneGeometry(P.W, 1).translate(0, 3.5, hz));
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
    gl.push(new THREE.PlaneGeometry(2, 3).rotateY(Math.PI / 2).translate(sx * hx, 1.5, sz * (hz - 1)));
    // the mesh along the side, leaving the openings either side of the net
    ms.push(new THREE.PlaneGeometry(hz - 2 - 1.0, 3).rotateY(Math.PI / 2).translate(sx * hx, 1.5, sz * ((hz - 2 + 1.0) / 2)));
  }));
  for (let x = -hx; x <= hx + 0.01; x += 2) fr.push(box(0.06, 4, 0.06, x, 2, -hz), box(0.06, 4, 0.06, x, 2, hz));
  for (let z = -hz; z <= hz + 0.01; z += 2) if (Math.abs(z) > 1.0) fr.push(box(0.06, 3, 0.06, -hx, 1.5, z), box(0.06, 3, 0.06, hx, 1.5, z));
  grp.add(new THREE.Mesh(mergeGeometries(gl), glass), new THREE.Mesh(mergeGeometries(ms), meshM), new THREE.Mesh(mergeGeometries(fr), mat(0x1d2028, 0.5)));
  floodlights(grp, P.W, P.L);
  grp.userData.cage = { hx, hz };
  return { group: grp, W, D };
}

function hoopsCourt() {
  const H = HOOP, W = 17, D = 16;
  const tex = surface(W, D, 64, (g) => {
    g.translate(0, 0.5);
    g.fillStyle = '#3f8a5a'; g.fillRect(-W / 2, -D / 2 - 0.5, W, D);
    g.fillStyle = '#c4573a'; g.fillRect(-H.halfW, H.baseZ, H.halfW * 2, H.halfZ - H.baseZ);
    g.fillStyle = '#2f6fa8'; g.fillRect(-2.45, H.baseZ, 4.9, 5.8);
    g.strokeStyle = '#f7f4ec';
    g.strokeRect(-H.halfW, H.baseZ, H.halfW * 2, H.halfZ - H.baseZ);
    g.lineWidth = 0.05; g.strokeRect(-2.45, H.baseZ, 4.9, 5.8);
    g.beginPath(); g.arc(0, H.baseZ + 5.8, 1.8, 0, Math.PI); g.stroke();
    // the three-point line: straight in the corners, then the arc round the rim
    const zc = H.rimZ + Math.sqrt(H.arc * H.arc - H.cornerX * H.cornerX);
    line(g, -H.cornerX, H.baseZ, -H.cornerX, zc); line(g, H.cornerX, H.baseZ, H.cornerX, zc);
    g.beginPath(); g.arc(0, H.rimZ, H.arc, Math.atan2(zc - H.rimZ, H.cornerX), Math.atan2(zc - H.rimZ, -H.cornerX)); g.stroke();
    g.beginPath(); g.arc(0, H.halfZ, 1.8, Math.PI, 0); g.stroke();
  });
  const grp = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2).translate(0, 0, -0.5), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
  floor.position.y = 0.02; grp.add(floor);
  // the hoop: pole, arm, glass board with its box, orange rim and a white net
  const steel = mat(0x3b4148, 0.5, { metalness: 0.5 });
  grp.add(new THREE.Mesh(mergeGeometries([box(0.22, 3.5, 0.22, 0, 1.75, H.baseZ - 0.9), box(0.16, 0.16, 1.15, 0, 3.4, H.baseZ - 0.35), box(0.7, 0.3, 0.7, 0, 0.15, H.baseZ - 0.9)]), steel));
  const board = new THREE.Mesh(new THREE.BoxGeometry(H.boardW, H.boardY1 - H.boardY0, 0.04).translate(0, (H.boardY0 + H.boardY1) / 2, H.boardZ - 0.02), new THREE.MeshStandardMaterial({ color: 0xe8f4f8, transparent: true, opacity: 0.45, roughness: 0.1 }));
  const frame = new THREE.Mesh(mergeGeometries([box(H.boardW, 0.05, 0.05, 0, H.boardY1, H.boardZ), box(H.boardW, 0.05, 0.05, 0, H.boardY0, H.boardZ), box(0.05, H.boardY1 - H.boardY0, 0.05, -H.boardW / 2, (H.boardY0 + H.boardY1) / 2, H.boardZ), box(0.05, H.boardY1 - H.boardY0, 0.05, H.boardW / 2, (H.boardY0 + H.boardY1) / 2, H.boardZ),
    box(0.59, 0.04, 0.03, 0, H.rimY + 0.45, H.boardZ + 0.01), box(0.59, 0.04, 0.03, 0, H.rimY + 0.03, H.boardZ + 0.01), box(0.04, 0.45, 0.03, -0.295, H.rimY + 0.24, H.boardZ + 0.01), box(0.04, 0.45, 0.03, 0.295, H.rimY + 0.24, H.boardZ + 0.01)]), mat(0xf7f4ec, 0.5));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(H.rimR, 0.012, 6, 24).rotateX(Math.PI / 2).translate(0, H.rimY, H.rimZ), mat(0xe46f4f, 0.4, { metalness: 0.3 }));
  const net = new THREE.Mesh(new THREE.CylinderGeometry(H.rimR, H.rimR * 0.6, 0.42, 12, 1, true).translate(0, H.rimY - 0.21, H.rimZ), new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: true }));
  grp.add(board, frame, rim, net);
  floodlights(grp, H.halfW * 2, 14);
  return { group: grp, W, D };
}

function ttTable() {
  const T = SPORTS.tt, grp = new THREE.Group();
  const tex = surface(T.W + 0.04, T.L + 0.04, 220, (g) => {
    g.fillStyle = '#1f4e8c'; g.fillRect(-T.W / 2 - 0.02, -T.L / 2 - 0.02, T.W + 0.04, T.L + 0.04);
    g.strokeStyle = '#f7f4ec'; g.lineWidth = 0.02; g.strokeRect(-T.W / 2 + 0.01, -T.L / 2 + 0.01, T.W - 0.02, T.L - 0.02);
    line(g, 0, -T.L / 2, 0, T.L / 2, 0.003);
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(T.W, 0.03, T.L), [mat(0x1f4e8c, 0.4), mat(0x1f4e8c, 0.4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }), mat(0x1f4e8c, 0.4), mat(0x1f4e8c, 0.4), mat(0x1f4e8c, 0.4)]);
  top.position.y = T.table - 0.015; grp.add(top);
  grp.add(new THREE.Mesh(mergeGeometries([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => box(0.05, T.table - 0.03, 0.05, a * (T.W / 2 - 0.15), (T.table - 0.03) / 2, b * (T.L / 2 - 0.3)))), mat(0x2b2f36, 0.5)));
  addNet(grp, T.netHalf, T.netC, T.netP, T.table);
  return { group: grp };
}

function poolBasin() {
  const grp = new THREE.Group(), L = POOL.L, W = POOL.lanes * POOL.laneW, depth = 2;
  const bottom = surface(W, L, 40, (g) => {
    g.fillStyle = '#9fd6e6'; g.fillRect(-W / 2, -L / 2, W, L);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 0.02;
    for (let x = -W / 2; x <= W / 2; x += 0.5) line(g, x, -L / 2, x, L / 2, 0.01);
    for (let z = -L / 2; z <= L / 2; z += 0.5) line(g, -W / 2, z, W / 2, z, 0.01);
    g.strokeStyle = '#1d2a3a';
    for (let i = 0; i < POOL.lanes; i++) { const x = (i - (POOL.lanes - 1) / 2) * POOL.laneW; line(g, x, -L / 2 + 2, x, L / 2 - 2, 0.25); line(g, x - 0.5, -L / 2 + 2, x + 0.5, -L / 2 + 2, 0.25); line(g, x - 0.5, L / 2 - 2, x + 0.5, L / 2 - 2, 0.25); }
  });
  const tile = mat(0xd8eef4, 0.4);
  // the pool is sunk below the ground: a plane drawn just after the ground resets the depth over the
  // pool, so the basin shows through the ground instead of being hidden under it
  const punch = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.4, L + 0.4).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'void main() { gl_FragColor = vec4(0.0); gl_FragDepth = 1.0; }',
    depthFunc: THREE.AlwaysDepth, depthWrite: true, colorWrite: false,
  }));
  punch.position.y = 0.03; punch.renderOrder = -2; punch.userData.noShadow = true; grp.add(punch);
  const floorB = new THREE.Mesh(new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2).translate(0, -depth, 0), new THREE.MeshStandardMaterial({ map: bottom, roughness: 0.5 }));
  const sides = new THREE.Mesh(mergeGeometries([box(W + 0.4, depth, 0.2, 0, -depth / 2, -L / 2 - 0.1), box(W + 0.4, depth, 0.2, 0, -depth / 2, L / 2 + 0.1), box(0.2, depth, L, -W / 2 - 0.1, -depth / 2, 0), box(0.2, depth, L, W / 2 + 0.1, -depth / 2, 0)]), tile);
  floorB.renderOrder = -1; sides.renderOrder = -1;
  grp.add(floorB, sides);
  // the coping round the edge
  grp.add(new THREE.Mesh(mergeGeometries([box(W + 0.8, 0.08, 0.3, 0, 0.04, -L / 2 - 0.15), box(W + 0.8, 0.08, 0.3, 0, 0.04, L / 2 + 0.15), box(0.3, 0.08, L, -W / 2 - 0.15, 0.04, 0), box(0.3, 0.08, L, W / 2 + 0.15, 0.04, 0)]), mat(0xf4f1ea, 0.5)));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3fb6d8, transparent: true, opacity: 0.6, roughness: 0.08, metalness: 0.1, depthWrite: false }));
  water.position.y = POOL.water; water.userData.noShadow = true; grp.add(water);
  // lane ropes: red at the ends, blue and white along the middle
  const ropes = [];
  for (let i = 1; i < POOL.lanes; i++) { const x = (i - POOL.lanes / 2) * POOL.laneW; for (let z = -L / 2 + 0.2; z < L / 2; z += 0.25) { const g = new THREE.SphereGeometry(0.06, 6, 4).translate(x, POOL.water + 0.02, z); const end = Math.abs(z) > L / 2 - 5; const col = end ? [0.8, 0.15, 0.12] : Math.floor(z * 4) % 2 ? [0.95, 0.95, 0.95] : [0.12, 0.3, 0.75]; const n = g.attributes.position.count; g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n }, () => col).flat(), 3)); ropes.push(g); } }
  grp.add(new THREE.Mesh(mergeGeometries(ropes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })));
  // starting blocks at the +z end, and the backstroke flags 5 m from each wall
  const blocks = [];
  for (let i = 0; i < POOL.lanes; i++) { const x = (i - (POOL.lanes - 1) / 2) * POOL.laneW; blocks.push(box(0.5, 0.65, 0.6, x, 0.325, L / 2 + 0.45)); }
  grp.add(new THREE.Mesh(mergeGeometries(blocks), mat(0xf7f4ec, 0.5)));
  const flags = [];
  [-L / 2 + 5, L / 2 - 5].forEach((z) => { for (let x = -W / 2; x < W / 2; x += 0.4) flags.push(new THREE.ConeGeometry(0.08, 0.18, 3).rotateX(Math.PI).translate(x + 0.2, 1.7, z)); });
  grp.add(new THREE.Mesh(mergeGeometries(flags), mat(0xf2b33d, 0.7)));
  grp.add(new THREE.Mesh(mergeGeometries([box(0.05, 1.9, 0.05, -W / 2 - 0.6, 0.95, -L / 2 + 5), box(0.05, 1.9, 0.05, W / 2 + 0.6, 0.95, -L / 2 + 5), box(0.05, 1.9, 0.05, -W / 2 - 0.6, 0.95, L / 2 - 5), box(0.05, 1.9, 0.05, W / 2 + 0.6, 0.95, L / 2 - 5)]), mat(0x8a929a, 0.5)));
  return { group: grp, W, L };
}

// ---------- the chooser: who to play, and how long ----------
const CSS = `
#lk-pick { position: fixed; inset: 0; z-index: 40; display: none; align-items: center; justify-content: center; background: rgba(20,24,40,.25); }
#lk-pick.on { display: flex; }
#lk-pick .pane { width: min(460px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto; padding: 18px 20px; border-radius: 22px; background: ${C.paper}; color: ${C.ink}; font: 600 14px/1.4 ${FONT}; box-shadow: 0 6px 0 rgba(59,42,32,.22), 0 24px 60px rgba(10,14,30,.35); }
#lk-pick h3 { margin: 0 0 4px; font: 800 24px/1.1 ${FONT}; } #lk-pick p { margin: 0 0 12px; color: ${C.ink2}; }
#lk-pick h4 { margin: 10px 0 6px; font: 800 15px/1 ${FONT}; color: ${C.teal}; }
#lk-pick .opts { display: flex; flex-direction: column; gap: 6px; }
#lk-pick label { display: flex; gap: 10px; align-items: center; padding: 8px 12px; border-radius: 14px; background: ${C.paper2}; cursor: pointer; }
#lk-pick label small { display: block; color: ${C.ink2}; font-weight: 600; }
#lk-pick input { accent-color: ${C.teal}; width: 18px; height: 18px; }
#lk-pick .row { display: flex; gap: 8px; margin-top: 14px; }
#lk-pick button { border: 0; border-radius: 999px; padding: 9px 16px; background: ${C.ink}; color: ${C.paper}; font: 800 14px/1 ${FONT}; cursor: pointer; }
#lk-pick button.soft { background: ${C.paper2}; color: ${C.ink}; }
`;

export function createSports({ world, scene, props, used, toast, avatar, getOnline, getMyName }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const pick = document.createElement('div'); pick.id = 'lk-pick'; document.body.appendChild(pick);
  const group = new THREE.Group(); group.name = 'sports'; scene.add(group);
  // the ground is drawn before everything, so the pool's depth punch (poolBasin) only clears the ground
  if (world.ground) world.ground.renderOrder = -3;
  const place = (n) => `${world.place?.name ?? 'Yaba'} ${n}`;
  const venues = {}, lamps = [];
  const cols = [], idle = [];

  // place a court at a site, turned by ry: its fence and lights, all from court space into the world
  function put(court, at, key, ry = 0) {
    court.group.position.set(at.x, 0, at.z); court.group.rotation.y = ry;
    group.add(court.group);
    court.group.updateMatrixWorld(true);
    const f = court.group.userData.fence, cage = court.group.userData.cage;
    const wv = new THREE.Vector3();
    const W = (lx, lz) => court.group.localToWorld(wv.set(lx, 0, lz)).clone();
    const col = (lx, lz, hx, hz, h) => { const c = W(lx, lz); cols.push({ name: `${key}_fence`, cx: c.x, cz: c.z, hx, hz, ry, h }); };
    if (f) {
      const hw = f.W / 2, hd = f.D / 2, gw = f.gw;
      col(0, -hd, hw, 0.06, 3); col(-(hw + gw) / 2, hd, (hw - gw) / 2, 0.06, 3); col((hw + gw) / 2, hd, (hw - gw) / 2, 0.06, 3);
      if (f.gate === 'side') { col(-hw, -(hd + gw) / 2, 0.06, (hd - gw) / 2, 3); col(-hw, (hd + gw) / 2, 0.06, (hd - gw) / 2, 3); col(hw, 0, 0.06, hd, 3); }
      else { col(-hw, 0, 0.06, hd, 3); col(hw, 0, 0.06, hd, 3); }
    }
    if (cage) {
      // the glass and mesh, with the openings beside the net
      const { hx, hz } = cage;
      col(0, -hz, hx, 0.06, 4); col(0, hz, hx, 0.06, 4);
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => col(sx * hx, sz * (hz + 1.0) / 2, 0.06, (hz - 1.0) / 2, 3)));
    }
    (court.group.userData.lights || []).forEach((l) => { const c = court.group.localToWorld(wv.set(l.x, l.y, l.z)); lamps.push({ x: c.x, y: c.y, z: c.z, color: 0xfff1d6, power: 150, boost: 8, kind: 'flood' }); });
    world.claim?.({ kind: 'recreation', cx: at.x, cz: at.z, hx: court.W / 2, hz: court.D / 2, ry });
    venues[key] = { ...court, at, toWorld: W };
  }
  // the people you play, standing by the court until you ask
  function waiting(key, list, v, lx, lz) {
    list.forEach((o, k) => {
      const p = person(o.look, o.name);
      const w = v.toWorld ? v.toWorld(lx + (k - (list.length - 1) / 2) * 0.9, lz) : new THREE.Vector3(lx, 0, lz);
      p.obj.position.set(w.x, 0, w.z); p.obj.rotation.y = (v.group?.rotation.y || 0) + Math.PI;
      group.add(p.obj); idle.push({ key, p });
    });
  }

  // ---------- the Aquatic and Indoor Arena: a hall you walk into ----------
  // sized to the land Yaba has free: a 25 m pool of four lanes along the back, table tennis at the front
  const AW = 31, AD = 19, AH = 6.5;
  const arenaAt = findSite(world, used, AW + 1, AD + 1, { turn: true });
  const tables = [];
  if (arenaAt) {
    const hall = new THREE.Group(); hall.position.set(arenaAt.x, 0, arenaAt.z); hall.rotation.y = arenaAt.ry; group.add(hall); hall.updateMatrixWorld(true);
    // the hall may stand at an angle to fit its land: A(lx, lz) is a point of the hall in the world, ARY its turn
    const ARY = arenaAt.ry, acs = Math.cos(ARY), asn = Math.sin(ARY), A = (lx, lz) => ({ x: arenaAt.x + lx * acs + lz * asn, z: arenaAt.z - lx * asn + lz * acs });
    const wallM = mat(0xe8e2d0, 0.85), trim = mat(0x2a9d94, 0.6), glassM = new THREE.MeshStandardMaterial({ color: 0xbfe3f0, transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const hw = AW / 2, hd = AD / 2, door = 3.2, doorX = -9;
    // the deck: tiles round the pool, which is cut out of it (pool 25 by 8, centred at x -2, z -3.5)
    const px0 = -2 - 12.5 - 0.4, px1 = -2 + 12.5 + 0.4, pz0 = -3.5 - 4 - 0.4, pz1 = -3.5 + 4 + 0.4;
    hall.add(new THREE.Mesh(mergeGeometries([box(AW, 0.06, pz0 + hd, 0, 0.03, (-hd + pz0) / 2), box(AW, 0.06, hd - pz1, 0, 0.03, (pz1 + hd) / 2), box(px0 + hw, 0.06, pz1 - pz0, (-hw + px0) / 2, 0.03, (pz0 + pz1) / 2), box(hw - px1, 0.06, pz1 - pz0, (px1 + hw) / 2, 0.03, (pz0 + pz1) / 2)]), mat(0xe9e4d8, 0.45)));
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(AW, AD).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.9, emissive: 0x3a362e }));
    ceil.position.y = AH + 0.02; ceil.userData.noShadow = true; hall.add(ceil);
    // walls: solid to 1.2 m and above 4.6 m, glass between; the door at the front, into the lobby on the left
    const walls = [box(AW, AH, 0.3, 0, AH / 2, -hd), box(0.3, AH, AD, -hw, AH / 2, 0), box(0.3, AH, AD, hw, AH / 2, 0)];
    const leftFront = hw + doorX - door / 2, rightFront = hw - doorX - door / 2;
    walls.push(box(leftFront, 1.2, 0.3, -hw + leftFront / 2, 0.6, hd), box(rightFront, 1.2, 0.3, hw - rightFront / 2, 0.6, hd), box(AW, AH - 4.6, 0.3, 0, (AH + 4.6) / 2, hd), box(door, 4.6 - 2.6, 0.3, doorX, 3.6, hd));
    walls.push(box(leftFront, 3.4, 0.08, -hw + leftFront / 2, 2.9, hd), box(rightFront, 3.4, 0.08, hw - rightFront / 2, 2.9, hd));
    const glassPanes = [box(AW - 1, 3.2, 0.06, 0, 2.9, -hd + 0.05)];
    hall.add(new THREE.Mesh(mergeGeometries(walls.slice(0, 7)), wallM), new THREE.Mesh(mergeGeometries([...walls.slice(7), ...glassPanes]), glassM));
    hall.add(new THREE.Mesh(mergeGeometries([box(AW + 0.6, 0.5, 0.5, 0, AH + 0.1, hd), box(AW + 0.6, 0.5, 0.5, 0, AH + 0.1, -hd), box(0.5, 0.5, AD, -hw, AH + 0.1, 0), box(0.5, 0.5, AD, hw, AH + 0.1, 0)]), trim));
    // the roof, with skylights: shade is light, so it does not cast a hard shadow over the pool
    const roof = new THREE.Mesh(box(AW + 0.4, 0.3, AD + 0.4, 0, AH + 0.2, 0), mat(0xcfc6b4, 0.9)); roof.userData.noShadow = true; hall.add(roof);
    const sky = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 1.3, 1.35) });
    const panels = []; for (let x = -hw + 4; x < hw - 2; x += 6) for (let z = -hd + 4; z < hd - 2; z += 6) panels.push(new THREE.PlaneGeometry(2.2, 2.2).rotateX(Math.PI / 2).translate(x, AH + 0.04, z));
    hall.add(new THREE.Mesh(mergeGeometries(panels), sky));
    const sign = signBoard(place('Aquatic and Indoor Arena').toUpperCase(), '25 m pool · table tennis · open daily', '#2a9d94', 6.5);
    sign.position.set(-4, AH - 0.6, hd + 0.2); hall.add(sign);
    // colliders: the walls, leaving the door; the camera stays under the roof
    const wall = (lx, lz, hx, hz) => { const p = A(lx, lz); return { name: 'arena_wall', cx: p.x, cz: p.z, hx, hz, ry: ARY, h: AH }; };
    cols.push(wall(0, -hd, hw, 0.2), wall(-hw, 0, 0.2, hd), wall(hw, 0, 0.2, hd), wall(-hw + leftFront / 2, hd, leftFront / 2, 0.2), wall(hw - rightFront / 2, hd, rightFront / 2, 0.2));
    world.claim?.({ kind: 'arena_roof', cx: arenaAt.x, cz: arenaAt.z, hx: hw, hz: hd, ry: ARY, y0: AH - 0.15, y1: AH + 0.6 });
    world.claim?.({ kind: 'recreation', cx: arenaAt.x, cz: arenaAt.z, hx: hw + 0.3, hz: hd + 0.3, ry: ARY });
    // the pool along the hall, its blocks toward the door side
    const pool = poolBasin();
    pool.group.position.set(-2, 0, -3.5); pool.group.rotation.y = Math.PI / 2; hall.add(pool.group);
    pool.group.updateMatrixWorld(true);
    // the water is out of bounds on foot; the deck at the left end is closed off so nobody squeezes in there
    const x0 = -hw + 0.2, x1 = -2 + pool.L / 2 + 0.3;
    { const p = A((x0 + x1) / 2, -3.5); cols.push({ name: 'pool', cx: p.x, cz: p.z, hx: (x1 - x0) / 2, hz: pool.W / 2 + 0.3, ry: ARY, h: 0.4 }); }
    venues.swim = { group: pool.group, at: A(-2, -3.5), start: A(-2 + 9, -3.5 + 5.2) };
    // table tennis, two tables along the front of the hall
    [5.0, 10.8].forEach((x, i) => {
      const t = ttTable(); t.group.position.set(x, 0, 5.3); hall.add(t.group); t.group.updateMatrixWorld(true);
      const p = A(x, 5.3); cols.push({ name: 'tt_table', cx: p.x, cz: p.z, hx: SPORTS.tt.W / 2, hz: SPORTS.tt.L / 2, ry: ARY, h: SPORTS.tt.table });
      tables.push(t);
    });
    venues.tt = tables;
    { const p = A(7.9, 1.6); waiting('tt', [OPP.tt[0]], {}, p.x, p.z); }
    // two swimmers doing lengths when nobody is racing
    [0, 3].forEach((lane, k) => { const p = person(SWIM_FIELD[k].look, SWIM_FIELD[k].name); pool.group.add(p.obj); idle.push({ key: 'laps', p, lane, z: k * 6 - 6, dir: k ? 1 : -1, sp: 1.1 + k * 0.15 }); });
    props.pois?.push({ kind: 'recreation', name: place('Aquatic and Indoor Arena'), x: arenaAt.x, z: arenaAt.z });
    lamps.push(...[-9, 0, 9].map((x) => ({ ...A(x, 0), y: AH - 0.5, color: 0xf4f8ff, power: 90, boost: 4, kind: 'hall' })));
  }
  // ---------- the Sports Centre ----------
  const tennis = tennisCourt(), padel = padelCourt(), hoops = hoopsCourt();
  const big = findSite(world, used, 42, 38);
  if (big) {
    // tennis lengthwise across the back, padel and the basketball half court in front
    put(tennis, { x: big.x, z: big.z - 9.5 }, 'tennis', Math.PI / 2);
    put(padel, { x: big.x - 9.5, z: big.z + 9.5 }, 'padel', Math.PI / 2);
    put(hoops, { x: big.x + 11.5, z: big.z + 9.0 }, 'hoops');
    const sign = signBoard(place('Sports Centre').toUpperCase(), 'Tennis · Padel · Basketball · open till 10pm', '#22336a', 5.2);
    sign.position.set(big.x - 1, 2.6, big.z + 18.6); group.add(sign);
    props.pois?.push({ kind: 'recreation', name: place('Sports Centre'), x: big.x, z: big.z });
  } else {
    // no single block of land big enough: each court where it fits
    let a = findSite(world, used, 17, 34), ary = 0; if (!a) { a = findSite(world, used, 34, 17); ary = Math.PI / 2; } if (a) put(tennis, a, 'tennis', ary);
    const b = findSite(world, used, 13, 23); if (b) put(padel, b, 'padel');
    const c = findSite(world, used, 18, 17); if (c) put(hoops, { x: c.x, z: c.z + 0.5 }, 'hoops');
    ['tennis', 'padel', 'hoops'].forEach((k) => { const v = venues[k]; if (!v) return; const nm = SPORTS[k]?.name || 'Basketball'; props.pois?.push({ kind: 'recreation', name: `${place('Sports Centre')}: ${nm}`, x: v.at.x, z: v.at.z });
      const sg = signBoard(`${place('Sports Centre').toUpperCase()}`, `${nm} · open till 10pm`, '#22336a', 4.4); const c = v.toWorld(0, (k === 'hoops' ? 8.4 : v.D / 2 + 0.9)); sg.position.set(c.x, 2.4, c.z); sg.rotation.y = v.group.rotation.y; group.add(sg); });
  }
  // the opponents wait outside each court's gate (court space: the gate is on the +z end, or the side)
  if (venues.tennis) waiting('tennis', [OPP.tennis[0]], venues.tennis, -venues.tennis.W / 2 - 1.2, -2.2);
  if (venues.padel) waiting('padel', [OPP.padel[0].pair[0], OPP.padel[0].pair[1]], venues.padel, -SPORTS.padel.W / 2 - 1.3, 2.4);
  if (venues.hoops) waiting('hoops', [OPP.hoops[0]], venues.hoops, 2.5, 7.4);
  if (venues.hoops) { const c = venues.hoops.toWorld(0, HOOP.baseZ - 0.9); cols.push({ name: 'hoop_pole', cx: c.x, cz: c.z, hx: 0.35, hz: 0.35, ry: 0, h: 3.5 }); }

  world.addColliders?.(cols);
  props.lamps.push(...lamps);

  // what you can press E on
  const add = (id, label, x, z, r = 2.2) => props.interact.push({ id, label, x, z, r });
  const at = (v, lx, lz) => v.toWorld(lx, lz);
  if (venues.tennis) { const c = at(venues.tennis, -venues.tennis.W / 2 - 0.6, 0); add('sport:tennis', 'Tennis: play Seyi or Coach Ada', c.x, c.z); }
  if (venues.padel) { const c = at(venues.padel, -SPORTS.padel.W / 2 - 0.7, 0); add('sport:padel', 'Padel: play doubles with Bisi', c.x, c.z); }
  if (venues.hoops) { const c = at(venues.hoops, 2.5, 7.0); add('sport:hoops', 'Basketball: one on one', c.x, c.z); }
  if (venues.swim) add('sport:swim', 'The pool: race 50 m or 100 m freestyle', venues.swim.start.x, venues.swim.start.z, 2.6);
  tables.forEach((t, i) => { const w = new THREE.Vector3(); t.group.getWorldPosition(w); add(`sport:tt:${i}`, 'Table tennis: play a match', w.x - 1.6, w.z - 2.4, 1.8); });

  // ---------- chess ----------
  const chess = createChess({ world, scene: group, props, used, findSite, toast, avatar, online: { get id() { return getOnline?.()?.id; }, play: (m) => getOnline?.()?.play(m), players: () => getOnline?.()?.players() || [], get online() { return getOnline?.()?.online; } }, getMyName });

  // ---------- running a game ----------
  let match = null, chooser = null;
  const pickKeys = gameKeys(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'e', 'f', 'escape', 'enter']);
  function choose(title, intro, groups, onStart) {
    chooser = { onStart };
    pick.innerHTML = `<div class="pane" role="dialog" aria-label="${title}"><h3>${title}</h3><p>${intro}</p>
      ${groups.map((gr) => `<h4>${gr.label}</h4><div class="opts">${gr.options.map((o, k) => `<label><input type="radio" name="${gr.key}" value="${k}" ${k === (gr.def || 0) ? 'checked' : ''}><span><b>${o.label}</b>${o.sub ? `<small>${o.sub}</small>` : ''}</span></label>`).join('')}</div>`).join('')}
      <div class="row"><button data-go>Play</button><button class="soft" data-no>Not now · Esc</button></div></div>`;
    pick.classList.add('on'); pickKeys.on = true; sfx('open');
    pick.querySelector('[data-go]').onclick = () => { const vals = Object.fromEntries(groups.map((gr) => [gr.key, +pick.querySelector(`input[name="${gr.key}"]:checked`).value])); closeChooser(); onStart(vals); };
    pick.querySelector('[data-no]').onclick = closeChooser;
  }
  function closeChooser() { pick.classList.remove('on'); chooser = null; pickKeys.on = false; }
  const youRig = () => ({ rig: avatar.userData.rig, look: avatar.userData.look });
  const hideIdle = (key, on) => idle.filter((i) => i.key === key).forEach((i) => { i.p.obj.visible = !on; });
  function begin(kind, m) { match = { kind, m }; sfx('whistle'); }

  function use(id) {
    if (chess.isOpen || chooser) return true;
    if (id.startsWith('chess:')) return chess.use(id);
    if (!id.startsWith('sport:') || match) return false;
    const [, kind, n] = id.split(':');
    if (kind === 'tennis' && venues.tennis) {
      choose('Tennis', 'Singles on the hard court. Serve from behind the baseline into the box across from you; first to the games below wins. Change ends on the odd games.', [
        { key: 'opp', label: 'Opponent', options: OPP.tennis.map((o) => ({ label: o.name, sub: `${o.kind} · win ${o.reward} Efforts` })) },
        { key: 'fmt', label: 'Match', def: 1, options: [{ label: 'Tiebreak', sub: 'first to 7 points, two clear' }, { label: 'Short set', sub: 'first to 4 games, tiebreak at 4 all' }, { label: 'Full set', sub: 'first to 6 games, tiebreak at 6 all' }] },
      ], (v) => {
        const o = OPP.tennis[v.opp], fmt = [{ tiebreakOnly: true, sets: 1 }, { games: 4, sets: 1 }, { games: 6, sets: 1 }][v.fmt];
        hideIdle('tennis', true);
        begin('tennis', createRacketMatch({ kind: 'tennis', court: venues.tennis, you: youRig(), them: [o], fmt, toast, reward: o.reward, onEnd: () => { hideIdle('tennis', false); match = null; } }));
      });
      return true;
    }
    if (kind === 'padel' && venues.padel) {
      choose('Padel', 'Doubles in the glass court, with Bisi as your partner. Serve underarm, below the waist, after one bounce. The ball may come off the glass after it bounces: play it before it bounces twice.', [
        { key: 'opp', label: 'Opponents', options: OPP.padel.map((o) => ({ label: o.pair.map((p) => p.name).join(' and '), sub: `${o.kind} · win ${o.reward} Efforts` })) },
        { key: 'fmt', label: 'Match', def: 0, options: [{ label: 'Short set', sub: 'first to 4 games' }, { label: 'Full set', sub: 'first to 6 games' }] },
      ], (v) => {
        const o = OPP.padel[v.opp], fmt = [{ games: 4, sets: 1 }, { games: 6, sets: 1 }][v.fmt];
        hideIdle('padel', true);
        begin('padel', createRacketMatch({ kind: 'padel', court: venues.padel, you: youRig(), them: o.pair, mate: { name: 'Bisi', look: LOOKS.bisi, skill: 0.62 }, fmt, toast, reward: o.reward, onEnd: () => { hideIdle('padel', false); match = null; } }));
      });
      return true;
    }
    if (kind === 'hoops' && venues.hoops) {
      choose('Basketball', 'One on one, half court, to 11 by ones and twos: 2 from behind the arc. Win by two. Check at the top; take it back behind the arc after a rebound or a steal.', [
        { key: 'opp', label: 'Opponent', options: OPP.hoops.map((o) => ({ label: o.name, sub: `${o.kind} · win ${o.reward} Efforts` })) },
        { key: 'to', label: 'Game to', def: 1, options: [{ label: '7', sub: 'quick game' }, { label: '11', sub: 'the usual' }, { label: '15', sub: 'long game' }] },
      ], (v) => {
        const o = OPP.hoops[v.opp];
        hideIdle('hoops', true);
        begin('hoops', createHoopsMatch({ court: venues.hoops, you: youRig(), them: o, to: [7, 11, 15][v.to], toast, reward: o.reward, onEnd: () => { hideIdle('hoops', false); match = null; } }));
      });
      return true;
    }
    if (kind === 'swim' && venues.swim) {
      choose('Freestyle race', 'Four lanes, a dive start, one false start and you are out. Stroke left and right in rhythm, breathe, and turn at the wall. Win and earn Efforts.', [
        { key: 'dist', label: 'Distance', options: [{ label: '50 m', sub: 'two lengths, one turn · win 300 Efforts' }, { label: '100 m', sub: 'four lengths, three turns · win 600 Efforts' }] },
      ], (v) => {
        hideIdle('laps', true);
        const race = () => begin('swim', createSwimRace({ pool: venues.swim, you: youRig(), field: SWIM_FIELD, distance: [50, 100][v.dist], toast, onEnd: (r) => { match = null; if (r?.again) race(); else hideIdle('laps', false); } }));
        race();
      });
      return true;
    }
    if (kind === 'tt' && tables[+n]) {
      choose('Table tennis', 'Singles to 11, two clear; the serve changes every two points. Toss it up at least 16 cm, let it bounce on your side, then theirs.', [
        { key: 'opp', label: 'Opponent', options: OPP.tt.map((o) => ({ label: o.name, sub: `${o.kind} · win ${o.reward} Efforts` })) },
        { key: 'fmt', label: 'Match', options: [{ label: 'Best of three games' }, { label: 'Best of five games' }, { label: 'One game' }] },
      ], (v) => {
        const o = OPP.tt[v.opp], t = tables[+n];
        hideIdle('tt', true);
        begin('tt', createRacketMatch({ kind: 'tt', court: { group: t.group }, you: youRig(), them: [o], fmt: { games: [2, 3, 1][v.fmt] }, toast, reward: o.reward, onEnd: () => { hideIdle('tt', false); match = null; } }));
      });
      return true;
    }
    return false;
  }

  let clock = 0;
  function update(dt) {
    clock += dt;
    if (chooser && pickKeys.take().includes('escape')) closeChooser();
    chess.update(dt);
    if (match) { match.m.update(dt); if (match.m.ended) match = null; }
    // the people waiting by the courts, and the swimmers doing lengths
    idle.forEach((i) => {
      if (!i.p.obj.visible) return;
      if (i.key === 'laps') {
        i.z += i.dir * i.sp * dt; if (Math.abs(i.z) > POOL.L / 2 - 0.8) i.dir *= -1;
        const x = (i.lane - (POOL.lanes - 1) / 2) * POOL.laneW;
        i.p.obj.position.set(x, POOL.water - 0.15, i.z); i.p.obj.rotation.set(0, i.dir > 0 ? 0 : Math.PI, 0); i.p.obj.rotateX(Math.PI / 2 - 0.08);
        if (i.p.rig) { i.p.rig.update(dt, { speed: 0, t: clock }); const a = clock * 3.4 + i.lane; i.p.rig.L.shoulder.rotation.x = -Math.PI + (a % (Math.PI * 2)); i.p.rig.R.shoulder.rotation.x = -Math.PI + ((a + Math.PI) % (Math.PI * 2)); }
        return;
      }
      i.p.rig?.update(dt, { speed: 0, t: clock + i.p.obj.position.x });
    });
    // floodlights glow after dusk
  }

  // for main.js: while a game is on, where you stand and where the camera looks
  function pose() {
    if (match && !match.m.ended) return match.m.pose();
    const s = chess.seatPose();
    if (s) return { ...s, speed: 0 };
    return null;
  }

  return {
    use, update, pose, chess, _used: used,
    get playing() { return !!match || !!chess.seatPose(); },
    get isOpen() { return !!chooser || chess.isOpen; },
    close: () => { if (chooser) closeChooser(); else if (chess.isOpen) chess.close(); },
    get match() { return match; }, venues, tables,
    state: () => ({ match: match?.kind || null, venues: Object.keys(venues), m: match?.m.state, chess: chess.state }),
  };
}
