import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Your home (world bible 6.6, after The Sims, GTA's safehouses and LEGO Fortnite's builds): a 20 x 14 m
// house of seven rooms. At the front, the living room (you come in here), the kitchen and dining, and the
// bedroom with its own bathroom; at the back, the workspace, the lab and the studio. Inner walls are solid
// to walk into but drawn only to 1.1 m, the way The Sims cuts walls away, so you see every room from the
// camera behind you. It follows the interior contract (interior.js): group, colliders [[x0, z0, x1, z1]],
// interact, door, window, sun, people, desks, W, D, H, and setHost(host).

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const CUT = 1.1; // how high inner walls are drawn

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildPlayerHome({ ORIGIN, scene, screenTex }) {
  const W = 20, D = 14, H = 3.0, X0 = -W / 2, X1 = W / 2, Z0 = -D / 2, Z1 = D / 2;
  const g = new THREE.Group(); g.position.copy(ORIGIN); g.visible = false;
  const mat = (c, r = 0.7, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const M = {
    wood: mat(0x9c6b45, 0.5), tile: mat(0xd9d2c3, 0.4), studioFloor: mat(0x5a5f6a, 0.6), carpet: mat(0x6f8f9a, 0.95),
    wall: mat(0xf1e6cf, 0.9), wallB: mat(0xe8dcc0, 0.9), trim: mat(0x2a6f6a, 0.8), dark: mat(0x1d2028, 0.5), metal: mat(0xb8bec4, 0.35, 0.5),
    woodD: mat(0x6b4426, 0.6), woodL: mat(0xc9a27a, 0.6), sofa: mat(0xb5523b, 0.95), fabric: mat(0x3f5a6a, 0.95), white: mat(0xf4f1ea, 0.6),
    leaf: mat(0x2f6b2c, 0.8), pot: mat(0xb8b0a0, 0.9), green: new THREE.MeshStandardMaterial({ color: 0x2fae4f, roughness: 0.95 }),
    foam: mat(0x2b3440, 0.98), glass: new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.05, transparent: true, opacity: 0.3 }),
    sky: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.75, 1.0) }), screen: new THREE.MeshBasicMaterial({ map: screenTex || null, color: screenTex ? 0xffffff : 0x3a6ea5 }),
    warm: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.4, 0.7) }), led: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.2, 0.8) }),
    ring: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.3, 2.1) }), amber: mat(0xf2b33d, 0.6), coral: mat(0xe46f4f, 0.7), teal: mat(0x2a9d94, 0.7),
  };
  const parts = new Map(); // material -> geometries, merged at the end
  const add = (geo, m) => { if (!parts.has(m)) parts.set(m, []); parts.get(m).push(geo); };
  const colliders = [], block = (x, z, w, d) => colliders.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  const interact = [];
  const say = (id, label, x, z, r = 1.5, extra = {}) => interact.push({ id, label, x, z, r, ...extra });

  // ---------- floors: wood in the front rooms, tiles in the kitchen and bathroom, carpet in the bedroom ----------
  add(box(8, 0.1, 7, -6, -0.05, 3.5), M.wood);          // living
  add(box(6, 0.1, 7, 1, -0.05, 3.5), M.tile);           // kitchen and dining
  add(box(6, 0.1, 7, 7, -0.05, 3.5), M.carpet);         // bedroom (+ bathroom tiles over it)
  add(box(2.5, 0.12, 3, 8.75, -0.04, 1.5), M.tile);     // bathroom
  add(box(6.7, 0.1, 7, -6.65, -0.05, -3.5), M.wood);    // workspace
  add(box(6.6, 0.1, 7, 0, -0.05, -3.5), M.tile);        // lab
  add(box(6.7, 0.1, 7, 6.65, -0.05, -3.5), M.studioFloor); // studio
  add(box(W, 0.1, D, 0, H + 0.05, 0), M.wallB);         // ceiling

  // ---------- outer walls, full height, with the front door and windows ----------
  const wall = (x, z, w, d, h = H, m = M.wall) => { add(box(w, h, d, x, h / 2, z), m); block(x, z, Math.max(w, 0.4), Math.max(d, 0.4)); };
  wall(0, Z0, W, 0.2); wall(X0, 0, 0.2, D); wall(X1, 0, 0.2, D);
  const door = { x: -6, z: Z1 - 1.0 }; // the front door, in the living room
  wall(-8.35, Z1, 3.3, 0.2); wall(2.35, Z1, 15.3, 0.2); // a 1.4 m opening at x -6
  add(box(1.3, 2.3, 0.08, -6, 1.15, Z1 + 0.02), M.woodD);
  const window = new THREE.Mesh(box(2.6, 1.4, 0.05, 1, 1.6, Z1 - 0.12), M.sky); g.add(window); // over the kitchen sink
  [[-2.8, Z1], [7.2, Z1]].forEach(([x, z]) => g.add(new THREE.Mesh(box(2.0, 1.3, 0.05, x, 1.6, z - 0.12), M.sky)));
  [[-6.65, Z0], [6.65, Z0]].forEach(([x, z]) => g.add(new THREE.Mesh(box(2.4, 1.2, 0.05, x, 1.7, z + 0.12), M.sky)));

  // ---------- inner walls: solid to walk into, drawn to 1.1 m; door gaps of 1.4 m ----------
  const inner = (x0, z0, x1, z1, gaps = []) => {
    // a straight wall from (x0,z0) to (x1,z1), along x or along z, with gaps [center] cut out
    const alongX = z0 === z1, a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1, cuts = gaps.map((c) => [c - 0.7, c + 0.7]).sort((p, q) => p[0] - q[0]);
    let s = a0;
    [...cuts, [a1, a1]].forEach(([c0, c1]) => {
      if (c0 > s + 0.05) { const len = c0 - s, mid = (s + c0) / 2; add(alongX ? box(len, CUT, 0.14, mid, CUT / 2, z0) : box(0.14, CUT, len, x0, CUT / 2, mid), M.wall); add(alongX ? box(len, 0.04, 0.18, mid, CUT + 0.02, z0) : box(0.18, 0.04, len, x0, CUT + 0.02, mid), M.trim); if (alongX) block(mid, z0, len, 0.3); else block(x0, mid, 0.3, len); }
      s = Math.max(s, c1);
    });
  };
  inner(X0, 0, X1, 0, [-6.65, 0, 6.65]);           // front rooms | back rooms
  inner(-2, 0, -2, Z1, [3.6]);                       // living | kitchen
  inner(4, 0, 4, Z1, [3.6]);                         // kitchen | bedroom
  inner(-3.3, Z0, -3.3, 0, [-3.6]);                  // workspace | lab
  inner(3.3, Z0, 3.3, 0, [-3.6]);                    // lab | studio
  inner(7.5, 0, 7.5, 3, []);                         // bathroom side
  inner(7.5, 3, X1, 3, [8.9]);                       // bathroom front, its door

  // ---------- the living room ----------
  add(box(3.4, 0.02, 2.4, -6, 0.01, 3.2), M.amber);
  add(mergeGeometries([box(2.8, 0.45, 0.9, -6, 0.225, 1.0), box(2.8, 0.55, 0.22, -6, 0.72, 0.6), box(0.22, 0.6, 0.9, -7.3, 0.3, 1.0), box(0.22, 0.6, 0.9, -4.7, 0.3, 1.0)]), M.sofa); block(-6, 0.9, 2.8, 1.0);
  add(box(1.2, 0.4, 0.6, -6, 0.2, 2.6), M.woodD); block(-6, 2.6, 1.2, 0.6);
  add(box(1.8, 0.5, 0.45, -6, 0.25, 5.2), M.woodD); add(box(1.5, 0.85, 0.06, -6, 0.95, 5.2), M.dark); add(new THREE.PlaneGeometry(1.4, 0.75).rotateY(Math.PI).translate(-6, 0.95, 5.16), M.screen); block(-6, 5.2, 1.8, 0.5);
  add(box(0.4, 2.0, 1.6, X0 + 0.3, 1.0, 3.5), M.woodL); block(X0 + 0.3, 3.5, 0.4, 1.6); // bookshelf
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) add(box(0.25, 0.32, 0.1, X0 + 0.32, 0.3 + r * 0.45, 2.85 + k * 0.24), [M.coral, M.teal, M.amber, M.fabric][(r + k) % 4]);
  say('in:rest', 'Put your feet up', -6, 1.8);
  say('in:books', 'Pick a book from the shelf', X0 + 1.2, 3.5);

  // ---------- kitchen and dining ----------
  add(box(5.6, 0.95, 0.7, 1, 0.475, Z1 - 0.5), M.woodL); add(box(5.7, 0.05, 0.75, 1, 0.97, Z1 - 0.5), M.metal); block(1, Z1 - 0.5, 5.7, 0.8);
  add(box(0.6, 0.06, 0.6, 2.6, 1.02, Z1 - 0.5), M.dark); add(box(0.75, 1.8, 0.7, -1.4, 0.9, 0.6), M.metal); block(-1.4, 0.6, 0.8, 0.75);
  add(box(1.7, 0.06, 0.95, 1, 0.75, 2.8), M.woodL); add(mergeGeometries([[-0.75, 2.4], [0.75, 2.4], [-0.75, 3.2], [0.75, 3.2]].map(([dx, z]) => box(0.06, 0.75, 0.06, 1 + dx, 0.375, z))), M.woodD); block(1, 2.8, 2.0, 2.0);
  [[0.6, 2.0], [1.4, 2.0], [0.6, 3.6], [1.4, 3.6]].forEach(([x, z]) => add(box(0.45, 0.05, 0.45, x, 0.45, z), M.woodD));
  say('in:cook', 'Cook something (jollof, of course)', 2.6, Z1 - 1.4);

  // ---------- the bedroom and its bathroom ----------
  add(mergeGeometries([box(2.0, 0.5, 2.2, 5.7, 0.25, 1.4), box(2.1, 1.0, 0.12, 5.7, 0.6, 0.25)]), M.woodD); add(box(1.95, 0.18, 2.1, 5.7, 0.58, 1.45), M.white); add(box(1.95, 0.08, 1.2, 5.7, 0.7, 1.95), M.trim); block(5.7, 1.3, 2.2, 2.4);
  [4.45, 6.95].forEach((x) => { add(box(0.45, 0.5, 0.4, x, 0.25, 0.45), M.woodL); block(x, 0.45, 0.45, 0.4); });
  add(new THREE.CylinderGeometry(0.1, 0.14, 0.3, 10).translate(4.45, 0.65, 0.45), M.warm);
  add(box(1.8, 2.2, 0.6, 5.6, 1.1, Z1 - 0.45), M.woodL); add(box(0.04, 2.0, 0.02, 5.6, 1.1, Z1 - 0.76), M.woodD); block(5.6, Z1 - 0.45, 1.8, 0.6); // wardrobe
  say('in:wardrobe', 'Open the wardrobe', 5.6, Z1 - 1.3, 1.4);
  say('in:bed', 'Lie down for a bit', 5.7, 2.8, 1.4);
  // bathroom: toilet, basin, shower with a glass door
  add(mergeGeometries([box(0.4, 0.4, 0.55, 9.6, 0.2, 0.6), box(0.42, 0.45, 0.16, 9.6, 0.6, 0.3)]), M.white); block(9.6, 0.5, 0.5, 0.7);
  add(box(0.5, 0.85, 0.4, 8.0, 0.43, 0.4), M.white); add(box(0.6, 0.7, 0.03, 8.0, 1.5, 0.15), M.sky); block(8.0, 0.4, 0.6, 0.45);
  add(box(1.0, 0.06, 1.0, 9.4, 0.03, 2.3), M.tile); add(box(0.03, 2.0, 1.0, 8.9, 1.0, 2.3), M.glass); block(9.4, 2.3, 1.0, 1.0);
  say('in:shower', 'Take a quick shower', 8.6, 1.9, 1.1);

  // ---------- the workspace: a desk with two monitors you sit at, a whiteboard, a kanban board ----------
  const desks = [];
  const deskAt = { x: -6.65, z: -6.2 };
  add(box(1.8, 0.05, 0.8, deskAt.x, 0.75, deskAt.z), M.woodL); add(mergeGeometries([box(0.05, 0.75, 0.7, deskAt.x - 0.85, 0.375, deskAt.z), box(0.05, 0.75, 0.7, deskAt.x + 0.85, 0.375, deskAt.z)]), M.metal); block(deskAt.x, deskAt.z, 1.8, 0.8);
  [-0.42, 0.42].forEach((dx) => { add(box(0.7, 0.42, 0.03, deskAt.x + dx, 1.12, deskAt.z - 0.28), M.dark); add(new THREE.PlaneGeometry(0.64, 0.36).translate(deskAt.x + dx, 1.12, deskAt.z - 0.262), M.screen); add(box(0.05, 0.2, 0.05, deskAt.x + dx, 0.88, deskAt.z - 0.28), M.dark); });
  add(mergeGeometries([box(0.55, 0.08, 0.55, deskAt.x, 0.48, deskAt.z + 0.6), box(0.55, 0.6, 0.08, deskAt.x, 0.85, deskAt.z + 0.85), box(0.06, 0.45, 0.06, deskAt.x, 0.22, deskAt.z + 0.6)]), M.fabric);
  desks.push(deskAt);
  say('in:desk:0', 'Sit at your desk', deskAt.x, deskAt.z + 1.0, 1.3, { desk: deskAt });
  const kanban = canvasTex(512, 300, (x, w, h) => {
    x.fillStyle = '#fbf7ee'; x.fillRect(0, 0, w, h); x.fillStyle = '#3b2a20'; x.font = '700 22px sans-serif';
    ['To do', 'Doing', 'Done'].forEach((t, i) => { x.fillText(t, 20 + i * 168, 34); });
    const notes = ['#f7e27a', '#a8e0c8', '#f6a8a0', '#b9c8f2'];
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3 - (c === 1 ? 1 : 0); r++) { x.fillStyle = notes[(c + r) % 4]; x.fillRect(20 + c * 168, 52 + r * 78, 140, 64); }
    x.strokeStyle = '#3b2a20'; x.lineWidth = 2; [168, 336].forEach((v) => { x.beginPath(); x.moveTo(v, 10); x.lineTo(v, h - 10); x.stroke(); });
  });
  const board = canvasTex(512, 300, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a6f6a'; x.lineWidth = 4; x.strokeRect(40, 60, 120, 70); x.strokeRect(220, 60, 120, 70); x.strokeRect(130, 190, 140, 70); x.beginPath(); x.moveTo(160, 95); x.lineTo(220, 95); x.moveTo(280, 130); x.lineTo(220, 190); x.stroke(); x.fillStyle = '#b5523b'; x.font = '700 22px sans-serif'; x.fillText('ship it', 360, 260); });
  add(new THREE.PlaneGeometry(2.4, 1.3).rotateY(Math.PI / 2).translate(X0 + 0.12, 1.6, -4.4), new THREE.MeshStandardMaterial({ map: board, roughness: 0.6 }));
  add(new THREE.PlaneGeometry(2.4, 1.4).rotateY(-Math.PI / 2).translate(-3.3 - 0.09, 1.9, -1.6), new THREE.MeshStandardMaterial({ map: kanban, roughness: 0.8 }));
  say('in:kanban', 'Look at the kanban board', -4.2, -1.6, 1.4);

  // ---------- the lab: a workbench, oscilloscope, soldering station, 3D printer, robot arm, homelab rack ----------
  add(box(3.2, 0.06, 0.8, 0, 0.9, Z0 + 0.6), M.woodL); add(mergeGeometries([box(0.06, 0.9, 0.7, -1.55, 0.45, Z0 + 0.6), box(0.06, 0.9, 0.7, 1.55, 0.45, Z0 + 0.6)]), M.metal); block(0, Z0 + 0.6, 3.2, 0.8);
  const scope = canvasTex(256, 160, (x, w, h) => { x.fillStyle = '#05140c'; x.fillRect(0, 0, w, h); x.strokeStyle = '#1f5a3a'; for (let i = 0; i < w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } x.strokeStyle = '#6dff9e'; x.lineWidth = 3; x.beginPath(); for (let i = 0; i < w; i++) x.lineTo(i, h / 2 + Math.sin(i / 14) * 40); x.stroke(); });
  add(box(0.5, 0.32, 0.35, -1.0, 1.09, Z0 + 0.55), M.metal); add(new THREE.PlaneGeometry(0.3, 0.2).translate(-1.05, 1.1, Z0 + 0.73), new THREE.MeshBasicMaterial({ map: scope }));
  add(box(0.3, 0.12, 0.22, -0.2, 0.99, Z0 + 0.55), M.dark); add(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6).rotateZ(0.8).translate(0, 1.1, Z0 + 0.55), M.metal); // soldering iron
  add(mergeGeometries([box(0.05, 0.5, 0.05, 0.6, 1.18, Z0 + 0.35), box(0.05, 0.5, 0.05, 1.2, 1.18, Z0 + 0.35), box(0.05, 0.5, 0.05, 0.6, 1.18, Z0 + 0.8), box(0.05, 0.5, 0.05, 1.2, 1.18, Z0 + 0.8), box(0.65, 0.05, 0.5, 0.9, 1.43, Z0 + 0.58), box(0.65, 0.04, 0.5, 0.9, 0.95, Z0 + 0.58)]), M.dark); // 3D printer frame
  add(box(0.18, 0.12, 0.18, 0.9, 1.03, Z0 + 0.58), M.coral); // the print
  const arm = new THREE.Group(); arm.position.set(-2.4, 0, Z0 + 1.8);
  arm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.2, 14).translate(0, 0.1, 0), M.amber));
  const a1 = new THREE.Group(); a1.position.y = 0.2; a1.rotation.z = 0.3; arm.add(a1); a1.add(new THREE.Mesh(box(0.12, 0.7, 0.12, 0, 0.35, 0), M.amber));
  const a2 = new THREE.Group(); a2.position.y = 0.7; a2.rotation.z = -1.1; a1.add(a2); a2.add(new THREE.Mesh(box(0.1, 0.55, 0.1, 0, 0.27, 0), M.amber)); a2.add(new THREE.Mesh(box(0.16, 0.08, 0.06, 0, 0.58, 0), M.dark));
  g.add(arm); block(-2.4, Z0 + 1.8, 0.6, 0.6);
  add(box(0.7, 2.0, 0.8, 2.7, 1.0, -2.0), M.dark); block(2.7, -2.0, 0.7, 0.8); // homelab rack
  for (let u = 0; u < 7; u++) { add(box(0.62, 0.18, 0.02, 2.7 - 0.0, 0.35 + u * 0.24, -2.0 + 0.41), M.metal); }
  const leds = []; for (let u = 0; u < 7; u++) for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(box(0.03, 0.03, 0.01, 2.45 + k * 0.06, 0.35 + u * 0.24, -1.585), M.led); g.add(l); leds.push(l); }
  say('in:solder', 'Solder a sensor board', -0.4, Z0 + 1.5, 1.3);
  say('in:print', 'Start a 3D print', 0.9, Z0 + 1.5, 1.2);
  say('in:arm', 'Run the robot arm', -2.4, Z0 + 2.7, 1.3);
  say('in:rack', 'Check the homelab', 2.0, -2.0, 1.3);

  // ---------- the studio: a drawing display, moodboard, ring light, camera, microphone, acoustic panels, green screen ----------
  add(box(1.6, 0.05, 0.75, 6.0, 0.75, Z0 + 0.6), M.woodL); add(mergeGeometries([box(0.05, 0.75, 0.65, 5.25, 0.375, Z0 + 0.6), box(0.05, 0.75, 0.65, 6.75, 0.375, Z0 + 0.6)]), M.metal); block(6.0, Z0 + 0.6, 1.6, 0.8);
  const tablet = new THREE.Mesh(box(0.8, 0.5, 0.03, 6.0, 1.0, Z0 + 0.5), M.dark); tablet.rotation.x = -0.6; g.add(tablet);
  const sketch = canvasTex(256, 160, (x, w, h) => { x.fillStyle = '#fbf7ee'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a6f6a'; x.lineWidth = 3; x.beginPath(); x.arc(128, 80, 40, 0, 7); x.stroke(); x.strokeStyle = '#e46f4f'; x.beginPath(); x.moveTo(60, 120); x.quadraticCurveTo(128, 30, 200, 120); x.stroke(); });
  const sk = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.43), new THREE.MeshBasicMaterial({ map: sketch })); sk.position.set(6.0, 1.0, Z0 + 0.52); sk.rotation.x = -0.6; sk.position.z += 0.017; g.add(sk);
  const mood = canvasTex(512, 320, (x, w, h) => { x.fillStyle = '#e9e1d0'; x.fillRect(0, 0, w, h); const cols = ['#2a9d94', '#e46f4f', '#f2b33d', '#3b2a20', '#8fca72', '#b9c8f2', '#f6a8a0', '#5a4632']; for (let i = 0; i < 8; i++) { x.fillStyle = cols[i]; x.fillRect(24 + (i % 4) * 120, 24 + Math.floor(i / 4) * 150, 100, 120); } });
  add(new THREE.PlaneGeometry(2.4, 1.5).rotateY(-Math.PI / 2).translate(X1 - 0.12, 1.6, -4.6), new THREE.MeshStandardMaterial({ map: mood, roughness: 0.8 }));
  add(new THREE.PlaneGeometry(2.6, 2.4).translate(7.4, 1.4, Z0 + 0.13), M.green); // green screen on the back wall
  add(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6).translate(4.6, 0.75, -3.4), M.dark); add(new THREE.TorusGeometry(0.28, 0.04, 8, 28).translate(4.6, 1.6, -3.4), M.ring); block(4.6, -3.4, 0.4, 0.4); // ring light
  add(mergeGeometries([new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6).rotateZ(0.2).translate(5.2, 0.7, -2.6), new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6).rotateZ(-0.2).translate(5.4, 0.7, -2.6), box(0.28, 0.18, 0.16, 5.3, 1.45, -2.6)]), M.dark); block(5.3, -2.6, 0.5, 0.5); // camera on a tripod
  add(mergeGeometries([new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6).rotateZ(1.0).translate(6.7, 1.05, Z0 + 0.7), new THREE.CylinderGeometry(0.05, 0.05, 0.16, 10).translate(6.9, 0.95, Z0 + 0.75)]), M.dark); // mic on its arm
  for (let k = 0; k < 6; k++) add(box(0.06, 0.55, 0.55, X1 - 0.13, 1.3 + (k % 2) * 0.6, -1.3 + Math.floor(k / 2) * 0.65 - 1.4 + 0.0), M.foam); // acoustic panels
  say('in:record', 'Record a video in front of the green screen', 7.4, Z0 + 1.8, 1.6);
  say('in:draw', 'Sketch on the drawing display', 6.0, Z0 + 1.5, 1.2);
  say('in:mood', 'Look at the moodboard', X1 - 1.2, -4.6, 1.4);

  // ---------- plants, lamps and the light ----------
  [[X0 + 0.6, Z1 - 0.6], [-2.6, 0.6], [3.4, Z1 - 1.4], [X0 + 0.6, -0.6], [X1 - 0.6, -0.6]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(0.28, 0.22, 0.45, 10).translate(x, 0.22, z), M.pot); add(new THREE.IcosahedronGeometry(0.5, 0).translate(x, 0.9, z), M.leaf); block(x, z, 0.6, 0.6); });
  parts.forEach((list, m) => { const mesh = new THREE.Mesh(mergeGeometries(list.map((q) => (q.index ? q.toNonIndexed() : q))), m); mesh.receiveShadow = true; g.add(mesh); });
  const ROOMS = [['Living room', -6, 3.5], ['Kitchen', 1, 3.5], ['Bedroom', 6.4, 4.2], ['Workspace', -6.65, -3.5], ['Lab', 0, -3.5], ['Studio', 6.65, -3.5]];
  ROOMS.forEach(([, x, z]) => { const l = new THREE.PointLight(0xffd7a0, 9, 9, 1.6); l.position.set(x, H - 0.4, z); g.add(l); });
  g.add(new THREE.HemisphereLight(0xfff1dc, 0x4a3f35, 0.9));
  const sun = new THREE.DirectionalLight(0xfff1dc, 0); sun.position.set(4, 6, 10); g.add(sun);
  scene.add(g);

  say('in:exit', 'Go out', door.x, door.z + 0.4, 1.8);
  let t = 0;
  const room = {
    key: 'myhome', group: g, colliders, interact, door, window, sun, people: [], desks, W, D, H, host: null, rooms: ROOMS,
    setHost(h) { room.host = h; },
    // the homelab's lights blink, the robot arm works
    tick(dt) { t += dt; leds.forEach((l, i) => { l.visible = Math.sin(t * (3 + (i % 5)) + i * 1.7) > -0.2; }); a1.rotation.z = 0.3 + Math.sin(t * 0.8) * 0.35; a2.rotation.z = -1.1 + Math.sin(t * 1.1 + 1) * 0.45; arm.rotation.y = Math.sin(t * 0.4) * 0.8; },
    // which room a spot is in, for the toasts and the HUD
    roomAt(x, z) { if (x > 7.5 && z < 3 && z > 0) return 'Bathroom'; const r = ROOMS.reduce((b, q) => (Math.hypot(q[1] - x, q[2] - z) < Math.hypot(b[1] - x, b[2] - z) ? q : b)); return r[0]; },
  };
  return room;
}

// what each of your home's things does when you press E
export const HOME_LINES = {
  'in:books': ['A well-thumbed copy of "Things Fall Apart".', 'Design of Everyday Things, with your notes in the margins.', 'The Rust book. You are on chapter 9.'],
  'in:cook': ['Party jollof, smoky at the bottom. Perfect.', 'Plantain fried just right.', 'Egusi on the boil. The whole house smells of it.'],
  'in:bed': ['Five minutes. Just five.', 'You stare at the ceiling fan and plan the next feature.'],
  'in:shower': ['Fresh. Ready to ship.', 'NEPA took the light halfway, but you made it.'],
  'in:kanban': ['To do: onboarding flow. Doing: wallet. Done: walk cycle.', 'Three cards in Doing. Finish one before starting another.'],
  'in:solder': ['A neat joint, shiny and smooth.', 'The temperature sensor works on the first try.'],
  'in:print': ['Printing a phone stand. 42 minutes left.', 'The first layer sticks. Good sign.'],
  'in:arm': ['The arm stacks three blocks and waves.', 'Recalibrating... done.'],
  'in:rack': ['All twelve containers healthy. Uptime 63 days.', 'The backup ran at 3am. Green across the board.'],
  'in:record': ['Rolling. "Hi everyone, today we are building..."', 'The ring light makes you look like a pro.'],
  'in:draw': ['A quick sketch of the new app icon.', 'Wireframes for the onboarding screens.'],
  'in:mood': ['Teal, coral, amber: the Builders World palette.', 'Ankara patterns next to clean type. It works.'],
};
