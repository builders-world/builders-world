import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAvatarModel } from '../onboarding/avatar.js';
import { rigAvatar } from './anim.js';
import { prepareLook, dress, lookFor } from './style.js';
import { workspaceDoor } from './doorway.js';

// More places to walk into (world bible 6.6): Kofo Cafe (sit at a table and work, order at the
// counter), Yaba Fitness (treadmills, weights, a punching bag) and the banking hall of Yaba Builders
// Bank (tellers, a queue, the loans desk). Each is a room like the hub's: same origin, same door,
// same rules for sitting at a table with your laptop, and its own Wi-Fi.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const person = (look, seed) => { const av = createAvatarModel({ color: '#888', style: 'tee' }); prepareLook(av.root); const rig = rigAvatar(av.root); dress(av.root, look || lookFor(seed), rig); return { av, rig, obj: av.root, dispose: av.dispose }; };

// the shell every venue shares: floor, walls, a front with a door and a window on the street
function shell({ ORIGIN, scene, W, D, H, floor, wall, accent }) {
  const g = new THREE.Group(); g.position.copy(ORIGIN); g.visible = false; scene.add(g);
  const M = (c, r = 0.75, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const add = (geo, m) => { const o = new THREE.Mesh(geo, m); g.add(o); return o; };
  const colliders = [], block = (x, z, w, d) => colliders.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  add(box(W, 0.1, D, 0, -0.05, 0), M(floor, 0.4)); add(box(W, 0.1, D, 0, H + 0.05, 0), M(0xf2ede2));
  add(mergeGeometries([box(W, H, 0.2, 0, H / 2, -D / 2), box(0.2, H, D, -W / 2, H / 2, 0), box(0.2, H, D, W / 2, H / 2, 0), box(W / 2 - 3, H, 0.2, -W / 4 - 1.5, H / 2, D / 2), box(W / 2 - 1, H, 0.2, W / 4 + 0.5, H / 2, D / 2)]), M(wall, 0.85));
  add(box(W, 0.3, 0.22, 0, 0.15, -D / 2 + 0.1), M(accent, 0.6));
  const window = add(box(W / 2 - 2, H - 1.2, 0.05, W / 4 + 0.5, H / 2, D / 2 - 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.75, 1.0) }));
  [[0, -D / 2, W, 0.4], [-W / 2, 0, 0.4, D], [W / 2, 0, 0.4, D], [-W / 4 - 1.5, D / 2, W / 2 - 3, 0.4], [W / 4 + 0.5, D / 2, W / 2 - 1, 0.4]].forEach(([x, z, w, d]) => block(x, z, w, d));
  g.add(new THREE.HemisphereLight(0xfff1dc, 0x4a3f35, 0.85));
  const sun = new THREE.DirectionalLight(0xfff1dc, 0); sun.position.set(5, 7, 12); g.add(sun);
  [[-W / 4, 0], [W / 4, 0]].forEach(([x, z]) => { const l = new THREE.PointLight(0xffd7a0, 16, 14, 1.6); l.position.set(x, H - 0.6, z); g.add(l); });
  const door = { x: -1.5, z: D / 2 - 1.2 };
  colliders.push(workspaceDoor(g, { x0: -3, x1: 1, z: D / 2, H, wall: M(wall, 0.85), outside: window.material, exitX: door.x }));
  return { g, M, add, colliders, block, window, sun, door };
}

export function buildCafe({ ORIGIN, scene, onOrder }) {
  const W = 18, D = 12, H = 3.4, S = shell({ ORIGIN, scene, W, D, H, floor: 0x8a5a36, wall: 0xe9dcc3, accent: 0xa87950 });
  const { g, M, add, block } = S, wood = M(0xa87950, 0.6), dark = M(0x3b2a20, 0.6), green = M(0x2f6b4f, 0.8);
  // the counter, the coffee machine, the pastry case, the menu board with the Wi-Fi on it
  add(box(6, 1.05, 0.9, 4, 0.52, -3.6), wood); add(box(6.1, 0.06, 1, 4, 1.07, -3.6), dark); block(4, -3.6, 6, 0.9);
  add(box(0.7, 0.55, 0.5, 2.2, 1.37, -3.7), M(0x9aa3b2, 0.35, 0.6)); add(box(1.4, 0.5, 0.7, 5.6, 1.35, -3.6), M(0xf4ede0, 0.2));
  const menu = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#1d2028'; x.fillRect(0, 0, w, h); x.fillStyle = '#f2b33d'; x.font = '900 34px "Arial Black", sans-serif'; x.fillText('KOFO CAFE', 20, 46); x.fillStyle = '#eef2ff'; x.font = '22px Arial'; ['Flat white 500', 'Zobo iced tea 350', 'Meat pie 400', 'Puff-puff 150'].forEach((t, i) => x.fillText(t, 24 + (i % 2) * 250, 96 + Math.floor(i / 2) * 44)); x.fillStyle = '#a8e0d0'; x.font = '20px Arial'; x.fillText('Wi-Fi KofoCafe-Guest   pass: flatwhite', 24, 222); });
  add(new THREE.PlaneGeometry(4, 2).translate(4, 2.5, -D / 2 + 0.12), new THREE.MeshBasicMaterial({ map: menu }));
  // tables by the window, sofa, plants
  const desks = [];
  [[-6, 1], [-3, 1], [0, 1], [-6, 4], [-3, 4], [5, 2.5]].forEach(([x, z]) => {
    add(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 18).translate(x, 0.75, z), wood); add(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8).translate(x, 0.375, z), dark);
    add(mergeGeometries([box(0.45, 0.05, 0.45, x, 0.46, z + 0.7), box(0.45, 0.45, 0.05, x, 0.7, z + 0.92)]), green);
    block(x, z, 1.1, 1.1); desks.push({ x, z });
  });
  add(mergeGeometries([box(2.8, 0.45, 0.9, -6.5, 0.22, -4.5), box(2.8, 0.5, 0.2, -6.5, 0.7, -4.9)]), M(0xb5523b, 0.95)); block(-6.5, -4.6, 2.8, 1);
  [[-8.4, 5.2], [8.4, 5.2], [8.4, -1]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 10).translate(x, 0.25, z), M(0xb8b0a0)); add(new THREE.IcosahedronGeometry(0.55, 0).translate(x, 1.0, z), M(0x2f6b2c)); block(x, z, 0.6, 0.6); });
  // Kofo behind the counter, people working at two of the tables
  const people = [];
  const kofo = person({ body: 'f', skin: '#b07a52', hair: 'braids', hairColor: '#1b1714', top: 'tee', topColor: '#1d2028', bottom: 'trousers', bottomColor: '#2f4f7f', shoes: 'sneakers', shoeColor: '#ddd5be', acc: ['glasses'] }); kofo.obj.position.set(4, 0, -4.4); g.add(kofo.obj); people.push(kofo);
  [1, 4].forEach((k) => { const d = desks[k], p = person(null, `cafe-${k}`); p.obj.position.set(d.x, -0.42, d.z + 0.55); p.obj.rotation.y = Math.PI; g.add(p.obj); people.push(p); });
  const used = new Set([1, 4]);
  const interact = [
    { id: 'in:exit', label: 'Leave Kofo Cafe', x: S.door.x, z: S.door.z + 0.6, r: 2.2 },
    { id: 'in:order', label: 'Order at the counter', x: 4, z: -2.6, r: 2.0, use: () => onOrder?.('cafe') },
    ...desks.map((d, i) => (used.has(i) ? null : { id: `in:desk:${i}`, label: 'Sit and work here', x: d.x, z: d.z + 1.0, r: 1.3, desk: d })).filter(Boolean),
  ];
  return { key: 'cafe', group: g, colliders: S.colliders, interact, door: S.door, window: S.window, sun: S.sun, people, desks, W, D, H };
}

export function buildGym({ ORIGIN, scene, toast }) {
  const W = 20, D = 14, H = 4, S = shell({ ORIGIN, scene, W, D, H, floor: 0x3b3f45, wall: 0xdfe3e6, accent: 0xe46f4f });
  const { g, M, add, block } = S, black = M(0x1d2028, 0.5), red = M(0xe46f4f, 0.6), steel = M(0xb8bec4, 0.3, 0.7);
  // a mirror along the back wall, rubber mats, the name painted big
  add(box(12, 2.4, 0.05, 2, 1.5, -D / 2 + 0.14), new THREE.MeshStandardMaterial({ color: 0xcfe0e8, roughness: 0.05, metalness: 0.9 }));
  const name = canvasTex(512, 128, (x, w, h) => { x.fillStyle = '#e46f4f'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '900 64px "Arial Black", sans-serif'; x.textAlign = 'center'; x.fillText('YABA FITNESS', w / 2, 86); });
  add(new THREE.PlaneGeometry(6, 1.5).rotateY(Math.PI / 2).translate(-W / 2 + 0.12, 2.6, -1), new THREE.MeshBasicMaterial({ map: name }));
  // treadmills in a row, a weights rack and benches, a punching bag on its chain
  const mills = [];
  for (let k = 0; k < 4; k++) { const x = -7 + k * 2.2, z = -4.4; add(box(0.9, 0.2, 2, x, 0.1, z), black); add(box(0.7, 0.03, 1.7, x, 0.21, z), M(0x2b2b2e, 0.9)); add(box(0.08, 1.2, 0.08, x - 0.4, 0.8, z - 0.9), steel); add(box(0.08, 1.2, 0.08, x + 0.4, 0.8, z - 0.9), steel); add(box(0.9, 0.35, 0.15, x, 1.45, z - 0.9), black); block(x, z, 0.9, 2); mills.push({ x, z }); }
  add(box(3.2, 1.6, 0.6, 6, 0.8, -5.6), steel); for (let k = 0; k < 6; k++) add(new THREE.CylinderGeometry(0.12 + k * 0.01, 0.12 + k * 0.01, 0.28, 12).rotateZ(Math.PI / 2).translate(4.8 + k * 0.48, 1.1, -5.4), black); block(6, -5.6, 3.2, 0.6);
  [[3.5, 0.5], [7.5, 0.5]].forEach(([x, z]) => { add(box(0.5, 0.45, 1.6, x, 0.22, z), red); add(box(1.6, 0.05, 0.05, x, 1.1, z - 0.6), steel); add(box(0.08, 1.1, 0.08, x - 0.6, 0.55, z - 0.6), steel); add(box(0.08, 1.1, 0.08, x + 0.6, 0.55, z - 0.6), steel); block(x, z, 1.4, 1.8); });
  const bag = new THREE.Group(); bag.position.set(-6, H - 0.2, 3.5); g.add(bag); bag.add(new THREE.Mesh(box(0.03, 1.2, 0.03, 0, -0.6, 0), steel)); bag.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.2, 14).translate(0, -1.8, 0), red)); block(-6, 3.5, 0.7, 0.7);
  // people working out: two on treadmills, one lifting
  const people = [], runners = [];
  [0, 2].forEach((k) => { const m = mills[k], p = person(lookFor(`gym-${k}`, { fem: k === 2, tier: 1 }), `gym-${k}`); p.obj.position.set(m.x, 0.22, m.z); p.obj.rotation.y = Math.PI; g.add(p.obj); people.push(p); runners.push(p); });
  const lifter = person(lookFor('gym-lift', { tier: 1 }), 'gym-lift'); lifter.obj.position.set(3.5, 0, 1.6); lifter.obj.rotation.y = Math.PI; g.add(lifter.obj); people.push(lifter);
  let swing = 0, workouts = 0;
  try { workouts = +(localStorage.getItem('bw-workouts') || 0); } catch { /* */ }
  const logWorkout = (what) => { workouts++; try { localStorage.setItem('bw-workouts', String(workouts)); } catch { /* */ } toast?.(`${what} Workouts so far: ${workouts}.`, 3000); };
  const interact = [
    { id: 'in:exit', label: 'Leave Yaba Fitness', x: S.door.x, z: S.door.z + 0.6, r: 2.2 },
    { id: 'in:mill', label: 'Run on the treadmill', x: mills[1].x, z: mills[1].z + 1.4, r: 1.4, use: () => logWorkout('Twenty minutes at a steady pace. Your legs know it.') },
    { id: 'in:weights', label: 'Lift at the rack', x: 6, z: -4.6, r: 1.6, use: () => logWorkout('Three sets of eight. Good form.') },
    { id: 'in:bag', label: 'Hit the punching bag', x: -6, z: 4.4, r: 1.5, use: () => { swing = 1.2; logWorkout('Jab, jab, cross. The bag swings.'); } },
  ];
  const room = { key: 'gym', group: g, colliders: S.colliders, interact, door: S.door, window: S.window, sun: S.sun, people, desks: [], W, D, H,
    tick(dt, t) {
      runners.forEach((r, i) => r.rig?.update(dt, { speed: 3.2 + i * 0.6, running: true, t }));
      lifter.rig?.update(dt, { speed: 0, t }); if (lifter.rig) { const a = Math.max(0, Math.sin(t * 1.6)); lifter.rig.L.shoulder.rotation.x = -2.6 * a; lifter.rig.R.shoulder.rotation.x = -2.6 * a; lifter.rig.L.elbow.rotation.x = -0.6 * (1 - a); lifter.rig.R.elbow.rotation.x = -0.6 * (1 - a); }
      swing = Math.max(0, swing - dt * 0.6); bag.rotation.x = Math.sin(t * 6) * 0.25 * swing;
    } };
  return room;
}

export function buildBank({ ORIGIN, scene, toast, onTeller }) {
  const W = 20, D = 14, H = 4.2, S = shell({ ORIGIN, scene, W, D, H, floor: 0xd9d2c3, wall: 0xf2ede2, accent: 0x2a9d94 });
  const { g, M, add, block } = S, teal = M(0x2a9d94, 0.6), glass = new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.05, transparent: true, opacity: 0.3 }), wood = M(0x8a5a36, 0.6);
  // the counter with glass screens and three windows, the queue line, the loans desk, a vault door
  add(box(12, 1.15, 0.9, 1, 0.58, -3.8), teal); add(box(12, 1.0, 0.05, 1, 1.65, -3.4), glass); block(1, -3.8, 12, 0.9);
  const sign = canvasTex(512, 128, (x, w, h) => { x.fillStyle = '#2a9d94'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '900 52px "Arial Black", sans-serif'; x.textAlign = 'center'; x.fillText('YABA BUILDERS BANK', w / 2, 70); x.font = '24px Arial'; x.fillText('Efforts accounts · Builder loans · Wi-Fi YBB-Customer', w / 2, 108); });
  add(new THREE.PlaneGeometry(8, 2).translate(1, 3.1, -D / 2 + 0.12), new THREE.MeshBasicMaterial({ map: sign }));
  for (let k = 0; k < 6; k++) add(new THREE.CylinderGeometry(0.05, 0.08, 1, 8).translate(-2 + k * 1.2, 0.5, -1.2), M(0xd9a83a, 0.3, 0.7));
  add(box(6, 0.04, 0.04, 1, 0.92, -1.2), M(0x7a1d2a, 0.8));
  add(box(2.2, 0.8, 1.1, -7, 0.4, 1), wood); block(-7, 1, 2.2, 1.1);
  add(new THREE.CylinderGeometry(1.1, 1.1, 0.2, 24).rotateX(Math.PI / 2).translate(8.5, 1.4, -D / 2 + 0.2), M(0x8c9599, 0.25, 0.85));
  // tellers at the windows (Grace among them), people in the queue
  const people = [];
  [[-2.5, 'Grace', { body: 'f', skin: '#7a4a2e', hair: 'bun', top: 'jacket', topColor: '#2a9d94', bottom: 'skirt', bottomColor: '#1d2028', shoes: 'heels', shoeColor: '#1d2028', acc: ['earrings'] }], [1, 'Chukwudi', null], [4.5, 'Aisha', null]].forEach(([x, nm, look]) => { const p = person(look || lookFor(`teller-${nm}`, { fem: nm === 'Aisha', tier: 0 }), `teller-${nm}`); p.obj.position.set(x, 0, -4.6); g.add(p.obj); people.push(p); });
  [0, 1, 2].forEach((k) => { const p = person(null, `queue-${k}`); p.obj.position.set(-1 + k * 1.1, 0, -0.6); p.obj.rotation.y = Math.PI; g.add(p.obj); people.push(p); });
  const manager = person(lookFor('bank-manager', { tier: 0 }), 'bank-manager'); manager.obj.position.set(-7, 0, 0.1); g.add(manager.obj); people.push(manager);
  const interact = [
    { id: 'in:exit', label: 'Leave the bank', x: S.door.x, z: S.door.z + 0.6, r: 2.2 },
    { id: 'in:teller', label: 'See a teller', x: -2.5, z: -2.7, r: 1.6, use: () => onTeller?.() },
    { id: 'in:loans', label: 'Ask about a builder loan', x: -7, z: 2.2, r: 1.8, use: () => toast?.('Mr. Adeleke: "Builder loans open once your revenue is verified. Link Stripe or Paystack and come and see me."', 5200) },
    { id: 'in:vault', label: 'Look at the vault', x: 8.5, z: -5.4, r: 1.6, use: () => toast?.('The vault door is shut tight. Your Efforts live on the network, not in here.', 3200) },
  ];
  return { key: 'bank', group: g, colliders: S.colliders, interact, door: S.door, window: S.window, sun: S.sun, people, desks: [], W, D, H };
}
