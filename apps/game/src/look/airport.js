import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAvatarModel } from '../onboarding/avatar.js';
import { dress, lookFor } from './style.js';
import { C, FONT } from './uikit.js';
import { sfx } from './audio.js';
import { walletEngine, effortsMark, fmt } from './wallet.js';
import { AIRPORTS, fare, flightMinutes, km, entryRule } from './travelrules.js';
import { papers, travelStatus } from './travel.js';

// Airports (world bible 6.8): the main airport of each city, as one terminal you walk through the way you
// would a real one. Departures, on the left: the check-in hall (pick a flight, show your papers, pay, get a
// boarding pass), security (bag on the belt, walk through the arch), passport control for international
// flights (an exit stamp), then the airside lounge and your gate. The flight is a cabin you sit in while the
// map moves. Arrivals, on the right: you come off the jet bridge, through immigration (an entry stamp) if
// you crossed a border, collect your bag at the carousel and walk out into the city. Each step opens the
// barrier to the next, so the order is the real one. Airlines are made up; the airports are real.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const esc = (t) => String(t ?? '').replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));
function tex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
export const AIRLINES = [{ code: 'BW', name: 'Builders Air', col: '#2a9d94' }, { code: 'SV', name: 'Savannah Wings', col: '#e46f4f' }, { code: 'GC', name: 'Gulf Coast Air', col: '#4a64b0' }];
export const TRIP_KEY = 'bw-trip';
export const SHUTTLE = 1500; // the taxi to the airport

// ---------- the terminal ----------
// 64 x 28 m. x < 0 is departures, x > 0 arrivals, with a full wall between. z = +14 is the kerb side.
export function buildAirport({ ORIGIN, scene, city }) {
  const A = AIRPORTS[city] || AIRPORTS.Lagos;
  const W = 64, D = 28, H = 6, X0 = -W / 2, X1 = W / 2, Z0 = -D / 2, Z1 = D / 2;
  const g = new THREE.Group(); g.position.copy(ORIGIN); g.visible = false;
  const mat = (c, r = 0.6, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const M = { floor: mat(0xe6e1d6, 0.25), wall: mat(0xf4f1ea, 0.8), steel: mat(0xb8bec4, 0.3, 0.6), dark: mat(0x1d2028, 0.5), wood: mat(0xc9a27a, 0.6), seat: mat(0x2a6f6a, 0.8), belt: mat(0x30343a, 0.9), red: mat(0xc0392b, 0.6), green: mat(0x2f7d4f, 0.6), yellow: mat(0xf2b33d, 0.6),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.05, transparent: true, opacity: 0.28 }), sky: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.62, 0.78, 1.0) }), apron: new THREE.MeshBasicMaterial({ color: 0x7a7f86 }) };
  const parts = new Map(); const add = (geo, m) => { if (!parts.has(m)) parts.set(m, []); parts.get(m).push(geo); };
  const colliders = [], block = (x, z, w, d) => { const c = [x - w / 2, z - d / 2, x + w / 2, z + d / 2]; colliders.push(c); return c; };
  const interact = [], people = [];
  const say = (id, label, x, z, r = 1.8, extra = {}) => { const it = { id, label, x, z, r, ...extra }; interact.push(it); return it; };
  // shell
  add(box(W, 0.1, D, 0, -0.05, 0), M.floor); add(box(W, 0.1, D, 0, H + 0.05, 0), M.wall);
  [[0, Z0, W, 0.3], [X0, 0, 0.3, D], [X1, 0, 0.3, D], [0, 0, 0.3, D]].forEach(([x, z, w, d]) => { add(box(w, H, d, x, H / 2, z), M.wall); block(x, z, Math.max(w, 0.4), Math.max(d, 0.4)); });
  // the kerb side: glass with two doorways (departures in at x -24, arrivals out at x +24)
  [[-28, 6], [-10, 14], [10, 14], [28, 6]].forEach(([x, w]) => { add(box(w, H, 0.2, x, H / 2, Z1), M.glass); block(x, Z1, w, 0.4); });
  // the airside wall at the back: glass onto the apron, a plane at each gate
  add(box(W - 1, 4, 0.1, 0, 2.6, Z0 + 0.2), M.sky);
  const window = new THREE.Mesh(box(1, 1, 0.01, 0, -5, 0), M.sky); g.add(window); // the interior contract's window (tinted by daylight)
  const plane = (x) => {
    const p = new THREE.Group(); p.position.set(x, 0, Z0 - 14);
    const white = mat(0xf7f7f2, 0.4), tail = mat(new THREE.Color(AIRLINES[Math.abs(Math.round(x)) % 3].col).getHex(), 0.5);
    p.add(new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 26, 16).rotateZ(Math.PI / 2).translate(0, 3.2, 0), white));
    p.add(new THREE.Mesh(new THREE.ConeGeometry(1.8, 4, 16).rotateZ(-Math.PI / 2).translate(15, 3.2, 0), white));
    p.add(new THREE.Mesh(box(6, 0.3, 28, 0, 2.6, 0), white));
    p.add(new THREE.Mesh(box(4, 5, 0.3, -11.5, 6, 0), tail));
    p.add(new THREE.Mesh(box(26, 0.5, 0.3, 0, 3.4, 1.79), tail));
    g.add(p);
  };
  plane(-16); plane(16);
  add(box(W + 40, 0.05, 40, 0, -0.08, Z0 - 20), M.apron);

  // ---------- departures (x < 0) ----------
  // the departures board on the end wall
  const flights = Object.keys(AIRPORTS).filter((c) => c !== city).map((c, i) => ({ to: c, code: AIRPORTS[c].code, no: `${AIRLINES[i % 3].code} ${200 + i * 37 + (A.code.charCodeAt(0) % 9)}`, al: AIRLINES[i % 3], time: `${String(8 + i * 2).padStart(2, '0')}:${['05', '20', '40', '55', '10'][i % 5]}`, gate: `A${i + 1}` }));
  const board = tex(1024, 520, (c, w, h) => {
    c.fillStyle = '#0b1622'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2b33d'; c.font = '800 44px monospace'; c.fillText('DEPARTURES', 30, 60);
    c.font = '28px monospace'; c.fillStyle = '#8fa6c9'; c.fillText('TIME  FLIGHT   TO              GATE  STATUS', 30, 110);
    flights.forEach((f, i) => { c.fillStyle = '#e6edf3'; c.fillText(`${f.time} ${f.no.padEnd(8)} ${f.to.padEnd(15)} ${f.gate}`, 30, 160 + i * 64); c.fillStyle = i % 2 ? '#8fd6a0' : '#f2b33d'; c.fillText(i % 2 ? 'BOARDING' : 'ON TIME', 790, 160 + i * 64); });
  });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.25).rotateY(Math.PI / 2).translate(X0 + 0.17, 3.4, 7), new THREE.MeshBasicMaterial({ map: board })));
  // check-in: four airline desks with bag belts, the queue in front
  const desks = [];
  [-26, -20, -14, -8].forEach((x, i) => {
    const al = AIRLINES[i % 3];
    add(box(3.4, 1.05, 0.9, x, 0.52, 4.2), M.wood); add(box(3.5, 0.06, 1.0, x, 1.07, 4.2), M.steel); block(x, 4.2, 3.4, 1.0);
    add(box(1.2, 0.35, 1.0, x + 1.3, 0.18, 5.2), M.belt);
    const lt = tex(512, 128, (c, w, h) => { c.fillStyle = al.col; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 54px sans-serif'; c.textAlign = 'center'; c.fillText(al.name, w / 2, 84); });
    // the airline's wall behind the agent, its name on top
    g.add(new THREE.Mesh(box(3.4, 2.6, 0.12, x, 1.3, 2.6), new THREE.MeshStandardMaterial({ color: new THREE.Color(al.col).lerp(new THREE.Color(0xffffff), 0.35), roughness: 0.7 })));
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75).translate(x, 2.95, 2.67), new THREE.MeshBasicMaterial({ map: lt })));
    const agent = createAvatarModel({ color: al.col, style: 'jacket' }); dress(agent.root, { ...lookFor(`checkin-${city}-${i}`, { fem: i % 2 === 0, tier: 1 }), top: 'jacket', topColor: al.col }); agent.root.position.set(x, 0, 3.4); g.add(agent.root); people.push(agent);
    desks.push(x);
  });
  for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.05, 0.07, 1.0, 8).translate(-24 + k * 5.4, 0.5, 7.4), M.steel);
  add(box(16.2, 0.06, 0.02, -15.9, 0.92, 7.4), M.red);
  say('ap:checkin', 'Check in for a flight', -17, 6.2, 3.2);
  say('ap:board', 'Read the departures board', X0 + 2, 7, 2.6);
  say('ap:out', `Leave ${A.name}`, -24, Z1 - 1.2, 2.2);
  // security: a wall across at z = 1 with two lanes, an arch and a belt in each; closed until you have a boarding pass
  [[-32, -21.5], [-18.5, -10.5], [-7.5, 0]].forEach(([a, b]) => { const w = b - a, x = (a + b) / 2; add(box(w, 2.4, 0.2, x, 1.2, 1), M.wall); block(x, 1, w, 0.4); });
  const secGates = [];
  [-20, -9].forEach((x) => {
    add(mergeGeometries([box(0.18, 2.2, 0.5, x - 0.62, 1.1, 1), box(0.18, 2.2, 0.5, x + 0.62, 1.1, 1), box(1.42, 0.25, 0.5, x, 2.3, 1)]), M.steel);
    add(box(0.8, 0.7, 3.2, x - 1.45, 0.35, 1), M.belt); block(x - 1.45, 1, 0.8, 3.2);
    secGates.push(block(x, 1, 1.3, 0.3)); // the closed lane
    const off = createAvatarModel({ color: '#2b3440', style: 'jacket' }); dress(off.root, { ...lookFor(`security-${x}`, { tier: 1 }), top: 'jacket', topColor: '#2b3440' }); off.root.position.set(x + 1.3, 0, 0.2); off.root.rotation.y = -Math.PI / 2; g.add(off.root); people.push(off);
  });
  const secIt = say('ap:security', 'Security: bag on the belt, walk through the arch', -14.5, 2.4, 6);
  // passport control (international) and the domestic corridor, a wall across at z = -4
  [[-32, -18.5], [-13.5, -6.5], [-3.5, 0]].forEach(([a, b]) => { const w = b - a, x = (a + b) / 2; add(box(w, 2.4, 0.2, x, 1.2, -4), M.wall); block(x, -4, w, 0.4); });
  const pcGate = block(-16, -4, 5, 0.3), domGate = block(-5, -4, 3, 0.3);
  [-17.5, -14.5].forEach((x) => { add(box(1.6, 1.2, 1.4, x, 0.6, -4.9), M.green); add(box(1.6, 1.0, 0.04, x, 1.7, -4.25), M.glass); const o = createAvatarModel({ color: '#2f7d4f', style: 'jacket' }); dress(o.root, { ...lookFor(`pc-${city}-${x}`, { tier: 1 }), top: 'jacket', topColor: '#2f7d4f' }); o.root.position.set(x, 0, -5.4); g.add(o.root); people.push(o); });
  const lane = (txt, x, col) => { const t = tex(512, 110, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 44px sans-serif'; c.textAlign = 'center'; c.fillText(txt, w / 2, 72); }); g.add(new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.72).translate(x, 3.2, -3.85), new THREE.MeshBasicMaterial({ map: t }))); };
  lane('PASSPORT CONTROL', -16, '#2f7d4f'); lane('DOMESTIC', -5, '#4a64b0');
  const pcIt = say('ap:passport', 'Passport control', -16, -2.4, 2.4);
  // airside: a cafe kiosk, duty free, the gates
  add(box(3, 1.1, 1.2, -28, 0.55, -8), M.wood); block(-28, -8, 3, 1.2);
  add(box(4, 2.2, 0.4, -22, 1.1, Z0 + 0.6), M.yellow); block(-22, Z0 + 0.6, 4, 0.5);
  const dft = tex(512, 110, (c, w, h) => { c.fillStyle = '#3b2a20'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2b33d'; c.font = '800 52px sans-serif'; c.textAlign = 'center'; c.fillText('DUTY FREE', w / 2, 74); });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.78).translate(-22, 2.7, Z0 + 0.82), new THREE.MeshBasicMaterial({ map: dft })));
  for (let r = 0; r < 2; r++) for (let k = 0; k < 7; k++) add(mergeGeometries([box(0.55, 0.08, 0.55, -18 + k * 0.62, 0.45, -8 - r * 1.6), box(0.55, 0.5, 0.08, -18 + k * 0.62, 0.7, -8.27 - r * 1.6)]), M.seat);
  block(-16.1, -8.8, 4.6, 2.4);
  add(box(2.2, 1.1, 0.8, -12, 0.55, -11.6), M.dark); block(-12, -11.6, 2.2, 0.8);
  const gt = tex(256, 128, (c, w, h) => { c.fillStyle = '#f2b33d'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d2028'; c.font = '900 64px sans-serif'; c.textAlign = 'center'; c.fillText('A1–A5', w / 2, 86); });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8).translate(-12, 2.6, -12.4), new THREE.MeshBasicMaterial({ map: gt })));
  add(box(2.4, 2.6, 0.3, -9, 1.3, Z0 + 0.35), M.dark); // the jet bridge door
  say('ap:gate', 'Board your flight', -11, -10.4, 2.6);
  say('ap:cafe', 'Buy a coffee before you fly', -28, -6.8, 1.8);
  say('ap:dutyfree', 'Look round duty free', -22, Z0 + 1.6, 2.0);
  // travellers waiting at the gate and in the hall
  for (let k = 0; k < 6; k++) { const p = createAvatarModel({ color: '#888', style: 'tee' }); dress(p.root, lookFor(`pax-${city}-${k}`, { fem: k % 2 === 1, tier: k % 3 })); if (k < 3) { p.root.position.set(-17.4 + k * 1.24, -0.42, -8.3); p.root.rotation.y = Math.PI; } else { p.root.position.set(-22 + k * 2.2, 0, 8.6); p.root.rotation.y = Math.PI; } g.add(p.root); people.push(p); }

  // ---------- arrivals (x > 0) ----------
  const arrive = { x: 9, z: -11.5 };
  add(box(2.4, 2.6, 0.3, 9, 1.3, Z0 + 0.35), M.dark);
  [[0, 11.5], [16.5, 32]].forEach(([a, b]) => { const w = b - a, x = (a + b) / 2; add(box(w, 2.4, 0.2, x, 1.2, -4), M.wall); block(x, -4, w, 0.4); });
  const arrGate = block(14, -4, 5, 0.3);
  [12.5, 15.5].forEach((x) => { add(box(1.6, 1.2, 1.4, x, 0.6, -3.1), M.green); const o = createAvatarModel({ color: '#2f7d4f', style: 'jacket' }); dress(o.root, { ...lookFor(`imm-${city}-${x}`, { fem: x > 14, tier: 1 }), top: 'jacket', topColor: '#2f7d4f' }); o.root.position.set(x, 0, -2.6); o.root.rotation.y = Math.PI; g.add(o.root); people.push(o); });
  const ia = tex(512, 110, (c, w, h) => { c.fillStyle = '#2f7d4f'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 44px sans-serif'; c.textAlign = 'center'; c.fillText('IMMIGRATION · ARRIVALS', w / 2, 72); });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.95).translate(14, 3.2, -4.15).rotateY(0), new THREE.MeshBasicMaterial({ map: ia })));
  const arrIt = say('ap:arrivals', 'Immigration: show your passport', 14, -5.6, 2.6);
  // baggage reclaim: an oval carousel with bags going round
  const loop = new THREE.Group(); loop.position.set(16, 0, 5); g.add(loop);
  loop.add(new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.45, 6, 32).rotateX(Math.PI / 2).scale(1.6, 1, 1).translate(0, 0.45, 0), M.belt));
  loop.add(new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.5, 24).scale(1.6, 1, 0.65).translate(0, 0.25, 0), M.steel));
  block(16, 5, 11.5, 5);
  const bags = []; for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(box(0.6, 0.4, 0.4), mat([0x2a6f6a, 0xe46f4f, 0x3b2a20, 0xf2b33d, 0x4a64b0][k % 5], 0.6)); b.position.y = 0.95; loop.add(b); bags.push(b); }
  const bc = tex(512, 110, (c, w, h) => { c.fillStyle = '#0b1622'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2b33d'; c.font = '800 46px sans-serif'; c.textAlign = 'center'; c.fillText('BAGGAGE  1', w / 2, 72); });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5).translate(16, 3.2, 1.8), new THREE.MeshBasicMaterial({ map: bc })));
  say('ap:bag', 'Collect your bag', 16, 1.4, 2.4);
  const exitIt = say('ap:exit', 'Walk out into the city', 24, Z1 - 1.2, 2.6);
  // the name across the hall, and the city's welcome in arrivals
  const nameT = tex(1600, 160, (c, w, h) => { c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d2028'; c.font = '800 70px sans-serif'; c.textAlign = 'center'; c.fillText(`${A.name.toUpperCase()} · ${A.code}`, w / 2, 106); });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(20, 2).translate(-16, 4.8, Z1 - 0.15).rotateY(0), new THREE.MeshBasicMaterial({ map: nameT, side: THREE.DoubleSide })));
  const welcome = tex(1200, 160, (c, w, h) => { c.fillStyle = '#2a9d94'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 66px sans-serif'; c.textAlign = 'center'; c.fillText(`WELCOME TO ${city.toUpperCase()}`, w / 2, 104); });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(12, 1.6).translate(16, 4.6, -3.85), new THREE.MeshBasicMaterial({ map: welcome })));

  parts.forEach((list, m) => { const mesh = new THREE.Mesh(mergeGeometries(list.map((q) => (q.index ? q.toNonIndexed() : q))), m); mesh.receiveShadow = true; g.add(mesh); });
  for (let x = -28; x <= 28; x += 14) for (const z of [-8, 6]) { const l = new THREE.PointLight(0xfff4e0, 26, 22, 1.4); l.position.set(x, H - 0.6, z); g.add(l); }
  g.add(new THREE.HemisphereLight(0xffffff, 0x50504a, 1.1));
  const sun = new THREE.DirectionalLight(0xfff1dc, 0); sun.position.set(4, 10, -10); g.add(sun);
  scene.add(g);

  // the barriers: shut, or taken out of the colliders when you may pass
  const open = (c) => { const k = colliders.indexOf(c); if (k >= 0) colliders.splice(k, 1); };
  const shut = (c) => { if (!colliders.includes(c)) colliders.push(c); };
  let t = 0;
  const room = {
    key: 'airport', group: g, colliders, interact, door: { x: -24, z: Z1 - 1.6 }, window, sun, people, desks: [], W, D, H, A, flights,
    exitDoor: { x: 24, z: Z1 - 1.6 }, arrive,
    // a new visit: every barrier shut again, then opened for what you already hold
    reset(state) {
      [...secGates, pcGate, domGate, arrGate].forEach(shut);
      if (state?.pass) secGates.forEach(open);
      if (state?.secured) { open(state.pass.intl ? pcGate : domGate); if (!state.pass.intl) open(pcGate); }
      if (state?.arrived && !state.arrived.intl) open(arrGate);
      secIt.label = 'Security: bag on the belt, walk through the arch'; pcIt.label = 'Passport control'; arrIt.label = 'Immigration: show your passport'; exitIt.label = 'Walk out into the city';
    },
    openSecurity: () => secGates.forEach(open),
    openAirside: (intl) => { open(intl ? pcGate : domGate); },
    openPassportControl: () => open(pcGate),
    openArrivals: () => open(arrGate),
    tick(dt) { t += dt; bags.forEach((b, i) => { const a = t * 0.35 + (i / bags.length) * Math.PI * 2; b.position.set(Math.cos(a) * 2.8 * 1.6, 0.95, Math.sin(a) * 2.8); b.rotation.y = -a; }); },
  };
  room.reset(null);
  return room;
}

// ---------- the cabin ----------
export function buildCabin({ ORIGIN, scene }) {
  const W = 4.2, D = 22, H = 2.4;
  const g = new THREE.Group(); g.position.copy(ORIGIN); g.visible = false;
  const mat = (c, r = 0.6) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const parts = []; const shell = mat(0xeef0f2, 0.7), seatM = mat(0x2a6f6a, 0.85), floor = mat(0x5a6170, 0.9);
  parts.push([box(W, 0.1, D, 0, -0.05, 0), floor], [box(W, 0.1, D, 0, H, 0), shell], [box(0.1, H, D, -W / 2, H / 2, 0), shell], [box(0.1, H, D, W / 2, H / 2, 0), shell], [box(W, H, 0.1, 0, H / 2, -D / 2), shell], [box(W, H, 0.1, 0, H / 2, D / 2), shell]);
  const seats = [];
  for (let r = 0; r < 14; r++) for (const x of [-1.5, -0.95, 0.95, 1.5]) seats.push(mergeGeometries([box(0.48, 0.12, 0.5, x, 0.45, -9 + r * 1.3), box(0.48, 0.75, 0.1, x, 0.85, -9 + r * 1.3 + 0.27)]));
  parts.push([mergeGeometries(seats), seatM]);
  parts.forEach(([geo, m]) => g.add(new THREE.Mesh(geo, m)));
  // the windows: the sky going by, the clouds moving
  const sky = tex(1024, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5b8fd6'); gr.addColorStop(1, '#cfe4ff'); c.fillStyle = gr; c.fillRect(0, 0, w, h); for (let k = 0; k < 18; k++) { c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse((k * 137) % w, 150 + (k % 4) * 22, 50 + (k % 3) * 20, 14, 0, 0, 7); c.fill(); } });
  sky.wrapS = THREE.RepeatWrapping;
  const skyM = new THREE.MeshBasicMaterial({ map: sky });
  for (let r = 0; r < 14; r++) [-1, 1].forEach((s) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), skyM); w.position.set(s * (W / 2 - 0.06), 1.3, -9 + r * 1.3); w.rotation.y = -s * Math.PI / 2; g.add(w); });
  g.add(new THREE.HemisphereLight(0xffffff, 0x50504a, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 0); g.add(sun);
  const window = new THREE.Mesh(box(0.01, 0.01, 0.01, 0, -5, 0), new THREE.MeshBasicMaterial()); g.add(window);
  const people = [];
  for (let k = 0; k < 10; k++) { const p = createAvatarModel({ color: '#888', style: 'tee' }); dress(p.root, lookFor(`flyer-${k}`, { fem: k % 2 === 1, tier: k % 3 })); const x = [-1.5, -0.95, 0.95, 1.5][k % 4], z = -9 + (2 + k) * 1.3 + 0.1; p.root.position.set(x, -0.42, z); p.root.rotation.y = Math.PI; g.add(p.root); people.push(p); }
  scene.add(g);
  const seat = { x: 1.5, z: -9 + 12 * 1.3 }; // a window seat near the back, everyone ahead of you
  return { key: 'cabin', group: g, colliders: [], interact: [], door: { x: 0, z: 0 }, window, sun, people, desks: [], W, D, H, seat, tick(dt) { sky.offset.x = (sky.offset.x + dt * 0.25) % 1; } };
}

// ---------- check-in, the boarding pass, and the flight panel ----------
const CSS = `
#lk-air { position: fixed; inset: 0; z-index: 36; display: none; place-items: center; background: rgba(20,16,12,.45); font-family: ${FONT}; color: ${C.ink}; }
#lk-air.on { display: grid; }
#lk-air .box { width: min(640px, calc(100vw - 32px)); max-height: calc(100vh - 40px); overflow-y: auto; box-sizing: border-box; padding: 22px; border-radius: 26px; background: ${C.paper}; box-shadow: 0 6px 0 rgba(59,42,32,.25), 0 30px 70px rgba(10,14,30,.35); }
#lk-air h3 { margin: 0; font: 800 23px/1.1 ${FONT}; } #lk-air .sub { color: ${C.ink2}; margin: 6px 0 12px; font: 600 14px/1.45 ${FONT}; }
#lk-air .sub svg, #lk-air .f svg { display: inline-block; vertical-align: -2px; }
#lk-air .f { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; align-items: center; padding: 12px 14px; margin-top: 8px; border-radius: 16px; background: #fffaf0; border: 2px solid #ecdfc2; }
#lk-air .f b { font: 800 16px/1.2 ${FONT}; } #lk-air .f small { grid-column: 1; color: ${C.ink2}; font: 600 12.5px/1.35 ${FONT}; }
#lk-air .f button { grid-row: 1 / 3; grid-column: 2; border: 0; border-radius: 999px; padding: 10px 16px; background: ${C.teal}; color: #fff; font: 800 14px/1 ${FONT}; cursor: pointer; white-space: nowrap; }
#lk-air .f button[disabled] { background: #d9cbb0; color: ${C.ink2}; cursor: default; }
#lk-air .f .why { grid-column: 1 / -1; color: #b5523b; font: 700 12.5px/1.35 ${FONT}; }
#lk-air .row { display: flex; gap: 8px; margin-top: 12px; } #lk-air .row button { flex: 1 1 0; border: 0; border-radius: 999px; padding: 12px; font: 800 15px/1 ${FONT}; cursor: pointer; background: #eadfc6; color: ${C.ink}; }
#lk-air .bp { display: grid; grid-template-columns: 1fr 120px; border-radius: 18px; overflow: hidden; margin-top: 10px; background: #fff; box-shadow: 0 4px 0 rgba(0,0,0,.12); }
#lk-air .bp > div { padding: 14px 16px; } #lk-air .bp .stub { background: var(--al); color: #fff; border-left: 3px dashed rgba(255,255,255,.6); }
#lk-air .bp .big { font: 900 40px/1 ${FONT}; letter-spacing: .02em; } #lk-air .bp .l { font: 800 10.5px/1 ${FONT}; letter-spacing: .1em; text-transform: uppercase; opacity: .7; margin-top: 8px; } #lk-air .bp .v { font: 800 16px/1.2 ${FONT}; }
#lk-fly { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 34; display: none; width: min(560px, calc(100vw - 32px)); box-sizing: border-box; padding: 14px 18px; border-radius: 20px; background: ${C.paper}; color: ${C.ink}; font-family: ${FONT}; box-shadow: 0 5px 0 rgba(59,42,32,.2), 0 18px 40px rgba(10,14,30,.3); }
#lk-fly.on { display: block; } #lk-fly .top { display: flex; justify-content: space-between; font: 800 16px/1.2 ${FONT}; } #lk-fly small { color: ${C.ink2}; font: 700 12.5px/1.3 ${FONT}; }
#lk-fly .track { position: relative; height: 10px; margin: 12px 0 8px; border-radius: 999px; background: ${C.paper2}; } #lk-fly .track i { position: absolute; inset: 0 auto 0 0; border-radius: 999px; background: ${C.teal}; }
#lk-fly .track b { position: absolute; top: 50%; transform: translate(-50%, -50%); font-size: 22px; }
#lk-fly button { border: 0; border-radius: 999px; padding: 8px 14px; background: ${C.paper2}; color: ${C.ink}; font: 800 13px/1 ${FONT}; cursor: pointer; }
`;
let ui = null;
function dlg() {
  if (ui) return ui;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const air = document.createElement('div'); air.id = 'lk-air'; air.setAttribute('role', 'dialog'); document.body.appendChild(air);
  const fly = document.createElement('div'); fly.id = 'lk-fly'; document.body.appendChild(fly);
  air.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') air.classList.remove('on'); });
  air.addEventListener('click', (e) => { if (e.target === air) air.classList.remove('on'); });
  ui = { air, fly };
  return ui;
}
export const airDialogOpen = () => !!ui?.air.classList.contains('on');
export const closeAirDialog = () => ui?.air.classList.remove('on');

export function boardingPassHTML(bp) {
  return `<div class="bp" style="--al:${bp.col}"><div><div class="l">${esc(bp.airline)}</div><div class="big">${bp.fromCode} → ${bp.toCode}</div><div class="l">Passenger</div><div class="v">${esc(bp.name)}</div>
    <div style="display:flex;gap:18px"><span><span class="l">Flight</span><div class="v">${bp.no}</div></span><span><span class="l">Gate</span><div class="v">${bp.gate}</div></span><span><span class="l">Seat</span><div class="v">${bp.seat}</div></span><span><span class="l">Boards</span><div class="v">${bp.time}</div></span></div></div>
    <div class="stub"><div class="l">Seat</div><div class="big">${bp.seat}</div><div class="l">${bp.intl ? 'International' : 'Domestic'}</div></div></div>`;
}

// the check-in desk: every flight from here, what each needs, and the boarding pass
export function openCheckIn({ room, passes, city, name, onPass, toast }) {
  const { air } = dlg();
  const render = () => {
    const rows = room.flights.map((f) => {
      const s = travelStatus(passes, city, f.to), intl = AIRPORTS[f.to].country !== AIRPORTS[city].country;
      return `<div class="f"><b>${f.time} · ${esc(f.no)} to ${esc(f.to)} (${f.code})</b><button data-to="${esc(f.to)}" ${s.ok ? '' : 'disabled'}>${s.ok ? `Check in · ${fmt(s.fare)}` : 'Not yet'}</button>
        <small>${esc(f.al.name)} · ${flightMinutes(city, f.to)} min · ${intl ? 'International' : 'Domestic'} · ${esc(s.rule.label)}</small>${s.ok ? '' : `<div class="why">${s.needs.map(esc).join(' · ')}</div>`}</div>`;
    }).join('');
    air.innerHTML = `<div class="box"><h3>Check in</h3><div class="sub">Pick your flight. The desk checks your papers and that you can show proof of funds where you are going, then takes the fare. You have ${effortsMark(13)}${fmt(walletEngine().balance())}.</div>${rows}<div class="row"><button class="x">Not now</button></div></div>`;
    air.classList.add('on');
    air.querySelector('.x').onclick = () => air.classList.remove('on');
    air.querySelectorAll('[data-to]').forEach((b) => { b.onclick = () => {
      const f = room.flights.find((q) => q.to === b.dataset.to), s = travelStatus(passes, city, f.to); if (!s.ok) return render();
      if (!walletEngine().spend(s.fare, `${f.no} ${city} to ${f.to}`)) return render();
      const intl = AIRPORTS[f.to].country !== AIRPORTS[city].country;
      const bp = { from: city, to: f.to, fromCode: AIRPORTS[city].code, toCode: f.code, no: f.no, airline: f.al.name, col: f.al.col, gate: f.gate, time: f.time, seat: `${2 + Math.floor(Math.random() * 20)}${'ACDF'[Math.floor(Math.random() * 4)]}`, intl, name: name || 'Builder' };
      sfx('arrive'); onPass(bp);
      air.innerHTML = `<div class="box"><h3>You are checked in</h3><div class="sub">Your bag is on the belt. Go through security, then ${intl ? 'passport control' : 'the domestic corridor'} to gate ${bp.gate}.</div>${boardingPassHTML(bp)}<div class="row"><button class="x">Thanks</button></div></div>`;
      air.querySelector('.x').onclick = () => air.classList.remove('on');
      toast?.(`Boarding pass for ${bp.no} to ${bp.to}. Security is behind the desks.`, 3000);
    }; });
  };
  render();
}

// the flight: a panel with the route and the plane moving along it; time runs fast
export function flyPanel({ bp, onLanded, seconds = 14 }) {
  const { fly } = dlg();
  const mins = flightMinutes(bp.from, bp.to), dist = Math.round(km(bp.from, bp.to));
  let t = 0, done = false, raf = 0, last = performance.now();
  fly.innerHTML = `<div class="top"><span>${esc(bp.no)} · ${bp.fromCode} → ${bp.toCode}</span><span class="left"></span></div><div class="track"><i></i><b>✈</b></div><small>${dist.toLocaleString('en-US')} km · ${mins} min flight · cruising at 11,000 m</small> <button class="skip">Land now</button>`;
  fly.classList.add('on');
  const land = () => { if (done) return; done = true; cancelAnimationFrame(raf); fly.classList.remove('on'); onLanded(); };
  fly.querySelector('.skip').onclick = land;
  const step = () => { const n = performance.now(); t += (n - last) / 1000; last = n; const u = Math.min(1, t / seconds); fly.querySelector('.track i').style.width = `${u * 100}%`; fly.querySelector('.track b').style.left = `${u * 100}%`; fly.querySelector('.left').textContent = `${Math.max(0, Math.round(mins * (1 - u)))} min to go`; if (u >= 1) { land(); return; } raf = requestAnimationFrame(step); };
  step();
  return { land };
}

// the taxi to the airport, from the phone
export function openAirportTaxi({ city, onGo }) {
  const { air } = dlg(), A = AIRPORTS[city];
  air.innerHTML = `<div class="box"><h3>Fly</h3><div class="sub">${esc(A.name)} (${A.code}) is the airport for ${esc(city)}. A taxi takes you to departures for ${effortsMark(13)}${fmt(SHUTTLE)}. Bring your passport if you are leaving the country; see the Immigration Centre for papers.</div>
    <div class="row"><button class="x">Not now</button><button class="go" style="background:${C.teal};color:#fff">Taxi to ${A.code} · ${fmt(SHUTTLE)}</button></div></div>`;
  air.classList.add('on');
  air.querySelector('.x').onclick = () => air.classList.remove('on');
  air.querySelector('.go').onclick = () => { air.classList.remove('on'); onGo(); };
}
export { fare, entryRule, papers };
