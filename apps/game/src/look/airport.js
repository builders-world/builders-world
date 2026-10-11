import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAvatarModel } from '../onboarding/avatar.js';
import { dress, lookFor, prepareLook } from './style.js';
import { rigAvatar } from './anim.js';
import { C, FONT } from './uikit.js';
import { sfx, audioEngine } from './audio.js';
import { walletEngine, effortsMark, fmt } from './wallet.js';
import { AIRPORTS, fare, flightMinutes, km, entryRule } from './travelrules.js';
import { papers, travelStatus } from './travel.js';

// Airports (world bible 6.8), rebuilt at the size real terminals are (Elvis, 10 October 2026: "Airports usually
// have very tall ceilings... let it follow the actual process of airports"). One terminal per city, a departures
// hall with a 20 m roof and an arrivals hall beside it, and the process the real airports run:
//
// Departures, from the kerb: the taxi drops you under the canopy. Inside the doors every bag goes through an X-ray
// and you walk through an arch (the terminal entrance screening that MMIA and JKIA both run). Then the check-in
// islands: show your papers, pay, get a boarding pass, put your bag on the scale and watch it go down the belt.
// Then emigration and central security, in the order each airport does them: passport control first at Lagos and
// Nairobi, security first at Kotoka's Terminal 3. Airside: walk-through duty free, food, the gate lounges and the
// planes at their jet bridges, with more taxiing and taking off beyond. Boarding at your gate.
//
// Arrivals: off the jet bridge, along the corridor, immigration (citizens, regional and other passports in their
// own lanes), baggage reclaim, customs (green and red channels), then the greeters' hall and the taxis.
//
// Announcements play over the PA (a chime, then a voice, with a caption). Airlines are made up; the airports and
// the agencies that staff them are real.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const esc = (t) => String(t ?? '').replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));
function tex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
export const AIRLINES = [{ code: 'BW', name: 'Builders Air', col: '#2a9d94' }, { code: 'SV', name: 'Savannah Wings', col: '#e46f4f' }, { code: 'GC', name: 'Gulf Coast Air', col: '#4a64b0' }];
export const TRIP_KEY = 'bw-trip';
export const SHUTTLE = 1500; // the taxi to the airport

// who staffs each step, by country: the airport authority's aviation security screens, the immigration service
// stamps, the revenue service runs customs (FAAN, NIS and NCS in Nigeria; KAA, the Immigration Department and KRA in
// Kenya; GACL, GIS and the GRA in Ghana). Lanes at immigration follow each country's own split.
export const AGENCIES = {
  Nigeria: { avsec: 'FAAN Aviation Security', imm: 'Nigeria Immigration Service', customs: 'Nigeria Customs Service', lanes: ['Nigerian passports', 'ECOWAS passports', 'All other passports'], hello: 'Welcome to Nigeria', sims: ['MTN', 'Airtel', 'Glo'] },
  Kenya: { avsec: 'KAA Aviation Security', imm: 'Kenya Immigration', customs: 'KRA Customs', lanes: ['Kenyan citizens', 'East African citizens', 'Foreign nationals'], hello: 'Karibu Kenya', sims: ['Safaricom', 'Airtel'] },
  Ghana: { avsec: 'GACL Aviation Security', imm: 'Ghana Immigration Service', customs: 'GRA Customs', lanes: ['Ghanaian passports', 'ECOWAS passports', 'All other passports'], hello: 'Akwaaba, welcome to Ghana', sims: ['MTN', 'Telecel', 'AT'] },
};
// the order after check-in: Kotoka's Terminal 3 screens you before emigration; Lagos and JKIA stamp you out first
export const departureOrder = (city) => (city === 'Accra' ? ['security', 'passport'] : ['passport', 'security']);
const WORDS = { // English, with Swahili under it at JKIA, whose signs carry both
  Kenya: { Departures: 'Kuondoka', Arrivals: 'Kuwasili', 'Check-in': 'Kuingia', Gates: 'Milango', Exit: 'Toka', 'Baggage reclaim': 'Mizigo', Toilets: 'Vyoo' },
};

// ---------- small things used everywhere ----------
// overhead wayfinding: yellow on charcoal, a pictogram, an arrow, the way airports sign it
function signTex(items, { w = 1024, h = 160, bg = '#23262d', fg = '#f7c843', sub = null } = {}) {
  return tex(w, h, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    const n = items.length, cw = w / n;
    items.forEach(([txt, arrow], i) => {
      const x0 = i * cw + 24;
      c.fillStyle = fg; c.font = `800 ${sub ? 54 : 64}px ${FONT}`; c.textBaseline = 'middle';
      let x = x0;
      if (arrow) { c.font = `900 ${sub ? 70 : 80}px ${FONT}`; c.fillText({ l: '←', r: '→', u: '↑', d: '↓' }[arrow], x, sub ? h * 0.4 : h / 2); x += sub ? 84 : 96; c.font = `800 ${sub ? 54 : 64}px ${FONT}`; }
      c.fillText(txt, x, sub ? h * 0.4 : h / 2);
      if (sub?.[txt]) { c.fillStyle = '#c9ccd2'; c.font = `600 34px ${FONT}`; c.fillText(sub[txt], x, h * 0.8); c.fillStyle = fg; }
      if (i < n - 1) { c.fillStyle = '#4a4e57'; c.fillRect((i + 1) * cw - 3, 18, 6, h - 36); }
    });
  });
}
function plainTex(txt, { w = 1024, h = 180, bg = '#f4f1ea', fg = '#1d2028', size = 84, weight = 800 } = {}) {
  return tex(w, h, (c) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.font = `${weight} ${size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; let s = size; while (c.measureText(txt).width > w - 40 && s > 20) { s -= 4; c.font = `${weight} ${s}px ${FONT}`; } c.fillText(txt, w / 2, h / 2 + 4); });
}
const panel = (t, w, h, x, y, z, ry = 0, two = false) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, side: two ? THREE.DoubleSide : THREE.FrontSide })); m.position.set(x, y, z); m.rotation.y = ry; return m; };

// an airliner, nose along +z, standing on its wheels at y = 0; a regional jet's size (32 m long, 26 m wingspan)
const PLANE_CACHE = new Map();
export function aircraft(al, { L = 32, r = 1.5, span = 26 } = {}) {
  const key = `${al.code}`;
  if (!PLANE_CACHE.has(key)) {
    const cy = r + 1.6, white = [], livery = [], dark = [], grey = [];
    white.push(new THREE.CylinderGeometry(r, r, L * 0.62, 24).rotateX(Math.PI / 2).translate(0, cy, 0.02 * L));
    white.push(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 2.1).translate(0, cy, L * 0.33));
    white.push(new THREE.CylinderGeometry(0.32, r, L * 0.3, 24).rotateX(-Math.PI / 2).translate(0, cy + 0.35, -L * 0.44));
    // the cockpit glass and the row of cabin windows; a cheatline in the airline's colour
    dark.push(box(r * 1.15, 0.32, 0.9, 0, cy + 0.62, L * 0.33 + 1.6));
    [-1, 1].forEach((s) => { dark.push(box(0.06, 0.24, L * 0.56, s * r * 0.985, cy + 0.32, 0.02 * L)); livery.push(box(0.06, 0.22, L * 0.62, s * r * 0.975, cy - 0.28, 0.02 * L)); dark.push(box(0.07, 1.7, 0.8, s * r * 0.99, cy - 0.1, L * 0.24)); });
    // wings, swept, with a little dihedral; engines under them
    const wing = (half, root, tip, sweep, th) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(half, -sweep); sh.lineTo(half, -sweep - tip); sh.lineTo(0, -root); sh.closePath(); return new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false }).rotateX(Math.PI / 2); };
    [-1, 1].forEach((s) => {
      const wg = wing(span / 2, 5.2, 1.4, 5, 0.32); if (s < 0) wg.scale(-1, 1, 1); wg.rotateZ(s * 0.06).translate(0, cy - r * 0.55, 2.4); white.push(wg);
      livery.push(box(0.18, 1.4, 0.7, s * (span / 2 - 0.1), cy - r * 0.55 + span * 0.03 + 0.6, 2.4 - 6.2)); // winglet
      grey.push(new THREE.CylinderGeometry(0.78, 0.7, 3.2, 18).rotateX(Math.PI / 2).translate(s * span * 0.19, cy - r - 0.35, 3.2));
      dark.push(new THREE.CircleGeometry(0.66, 18).translate(s * span * 0.19, cy - r - 0.35, 4.81));
      const tl = wing(5.2, 2.6, 1.0, 2.2, 0.2); if (s < 0) tl.scale(-1, 1, 1); tl.translate(0, cy + 0.65, -L * 0.42); white.push(tl);
      grey.push(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 14).rotateZ(Math.PI / 2).translate(s * 1.6, 0.42, -0.6)); grey.push(box(0.16, cy - r - 0.2, 0.16, s * 1.6, (cy - r) / 2 + 0.3, -0.6));
    });
    grey.push(new THREE.CylinderGeometry(0.32, 0.32, 0.26, 12).rotateZ(Math.PI / 2).translate(0, 0.32, L * 0.36)); grey.push(box(0.12, cy - r - 0.1, 0.12, 0, (cy - r) / 2 + 0.25, L * 0.36));
    // the tail fin, in the airline's colour
    const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(5.8, 0); fin.lineTo(6.6, 5.6); fin.lineTo(4.0, 5.6); fin.closePath();
    livery.push(new THREE.ExtrudeGeometry(fin, { depth: 0.28, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-0.14, cy + r * 0.5, -L * 0.33));
    const M = { white: new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide }), livery: new THREE.MeshStandardMaterial({ color: new THREE.Color(al.col), roughness: 0.45, side: THREE.DoubleSide }), dark: new THREE.MeshStandardMaterial({ color: 0x1b2230, roughness: 0.2, metalness: 0.4 }), grey: new THREE.MeshStandardMaterial({ color: 0x9aa1aa, roughness: 0.4, metalness: 0.5 }) };
    PLANE_CACHE.set(key, [[mergeGeometries(white.map((q) => (q.index ? q.toNonIndexed() : q))), M.white], [mergeGeometries(livery.map((q) => (q.index ? q.toNonIndexed() : q))), M.livery], [mergeGeometries(dark.map((q) => (q.index ? q.toNonIndexed() : q))), M.dark], [mergeGeometries(grey.map((q) => (q.index ? q.toNonIndexed() : q))), M.grey]]);
  }
  const g = new THREE.Group();
  PLANE_CACHE.get(key).forEach(([geo, m]) => g.add(new THREE.Mesh(geo, m)));
  return g;
}

// a wheeled suitcase, handle up, standing on its wheels at y = 0
function suitcase(col, s = 1) {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: col, roughness: 0.55 }), metal = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, metalness: 0.5 });
  g.add(new THREE.Mesh(box(0.42 * s, 0.6 * s, 0.25 * s, 0, 0.36 * s, 0), shell));
  g.add(new THREE.Mesh(mergeGeometries([box(0.025, 0.42 * s, 0.025, -0.12 * s, 0.86 * s, -0.1 * s), box(0.025, 0.42 * s, 0.025, 0.12 * s, 0.86 * s, -0.1 * s), box(0.27 * s, 0.035, 0.04, 0, 1.07 * s, -0.1 * s), box(0.4 * s, 0.05, 0.05, 0, 0.05, -0.1 * s)]), metal));
  return g;
}

// a person in the terminal: dressed, rigged, perhaps with a bag
function person(seed, { fem = false, tier = 1, top = null, topColor = null, bag = null } = {}) {
  const av = createAvatarModel({ color: '#888', style: 'tee' }); prepareLook(av.root); const rig = rigAvatar(av.root);
  const look = lookFor(seed, { fem, tier }); if (top) Object.assign(look, { top, topColor });
  dress(av.root, look, rig);
  const p = { av, rig, root: av.root, bag: bag ? suitcase(bag) : null, dispose: () => av.dispose?.() };
  return p;
}

// ---------- the terminal ----------
// 136 x 92 m. x < 0 is departures (a 20 m roof), x > 0 arrivals (9 m), a service core between. z = +46 is the road,
// the glass front at z = +34, the airside glass and the planes at z = -46. North of the plan is the apron.
export function buildAirport({ ORIGIN, scene, city }) {
  const A = AIRPORTS[city] || AIRPORTS.Lagos, AG = AGENCIES[A.country] || AGENCIES.Nigeria, SW = WORDS[A.country] || null;
  const W = 136, D = 92, HD = 20, HA = 9, X0 = -W / 2, X1 = W / 2, Z0 = -D / 2, Z1 = D / 2, FRONT = 34;
  const g = new THREE.Group(); g.position.copy(ORIGIN); g.visible = false;
  const mat = (c, r = 0.6, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const floorT = tex(512, 512, (c, w, h) => { c.fillStyle = '#e9e4da'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${90 + Math.random() * 60},${80 + Math.random() * 50},70,${Math.random() * 0.08})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } c.strokeStyle = 'rgba(120,110,95,.35)'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.lineWidth = 1.5; c.stroke(); });
  floorT.wrapS = floorT.wrapT = THREE.RepeatWrapping; floorT.repeat.set(W / 3, D / 3);
  const M = {
    floor: new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.42, metalness: 0.02 }), wall: mat(0xf4f1ea, 0.85), core: mat(0xd9d2c3, 0.8), steel: mat(0xb8bec4, 0.3, 0.6), white: mat(0xfbfaf6, 0.5), dark: mat(0x1d2028, 0.5), wood: mat(0xc9a27a, 0.6), slat: mat(0xd8b58a, 0.7),
    seat: mat(0x2a6f6a, 0.8), belt: mat(0x30343a, 0.9), red: mat(0xc0392b, 0.6), green: mat(0x2f7d4f, 0.6), yellow: mat(0xf2b33d, 0.6), road: mat(0x4a4d52, 0.95), kerb: mat(0xbdb6a6, 0.9), grass: mat(0x86a85a, 1), concrete: mat(0xb9b6ad, 0.95), tray: mat(0x6b717b, 0.6),
    glass: new THREE.MeshStandardMaterial({ color: 0xbfe0ee, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
    light: new THREE.MeshBasicMaterial({ color: 0xfff6e2 }), sky: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.62, 0.78, 1.0) }),
  };
  const parts = new Map(); const add = (geo, m) => { if (!parts.has(m)) parts.set(m, []); parts.get(m).push(geo); };
  const colliders = [], block = (x, z, w, d) => { const c = [x - w / 2, z - d / 2, x + w / 2, z + d / 2]; colliders.push(c); return c; };
  const interact = [], people = [], movers = [];
  const say = (id, label, x, z, r = 1.8, extra = {}) => { const it = { id, label, x, z, r, ...extra }; interact.push(it); return it; };
  const flat = (x, z, w, d, m, y = 0) => add(box(w, 0.02, d, x, y + 0.01, z), m);
  const walls = [], wall = (x, z, w, d, h) => walls.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2, h]); // solid to the camera too
  const gates = {}; // barriers: lists of colliders, opened as you clear each step
  const gateOf = (name, list) => { gates[name] = list; return list; };

  // ---------- floors, roofs, the shell ----------
  add(box(W, 0.1, FRONT - Z0, 0, -0.05, (FRONT + Z0) / 2), M.floor);
  // departures: a timber-slat roof on steel, three skylights the length of the hall, tree columns holding it up
  add(box(66, 0.3, FRONT - Z0, -35, HD + 0.15, (FRONT + Z0) / 2), M.wall);
  for (let z = Z0 + 1; z < FRONT; z += 1.4) add(box(66, 0.5, 0.28, -35, HD - 0.5, z), M.slat);
  for (const z of [22, 0, -24]) { add(box(64, 0.05, 4.2, -35, HD - 0.04, z), M.light); for (const s of [-1, 1]) add(box(64, 0.9, 0.2, -35, HD - 0.75, z + s * 2.2), M.steel); }
  for (let x = -66; x <= -4; x += 8) add(box(0.5, 1.2, FRONT - Z0, x, HD - 1.4, (FRONT + Z0) / 2), M.steel);
  const tree = (x, z) => {
    add(new THREE.CylinderGeometry(0.55, 0.7, 10, 16).translate(x, 5, z), M.white); block(x, z, 1.5, 1.5);
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; const br = new THREE.CylinderGeometry(0.25, 0.4, 11.5, 10); br.translate(0, 5.75, 0); br.rotateZ(0.62); br.rotateY(a); br.translate(x, 9.6, z); add(br, M.white); }
  };
  [[-56, 30], [-12, 30], [-56, -3], [-12, -3], [-34, -27], [-56, -27], [-12, -27]].forEach(([x, z]) => tree(x, z));
  // arrivals: a lower, flat ceiling with light panels
  add(box(66, 0.3, FRONT - Z0, 35, HA + 0.15, (FRONT + Z0) / 2), M.wall);
  for (let x = 8; x <= 64; x += 8) for (let z = Z0 + 4; z < FRONT; z += 8) add(box(3.2, 0.05, 1.2, x, HA - 0.03, z), M.light);
  // the service core between the halls (lifts, toilets, the prayer rooms)
  add(box(4, HD, FRONT - Z0, 0, HD / 2, (FRONT + Z0) / 2), M.core); block(0, (FRONT + Z0) / 2, 4, FRONT - Z0); wall(0, (FRONT + Z0) / 2, 4, FRONT - Z0, HD);
  // the end walls
  add(box(0.4, HD, FRONT - Z0, X0 + 0.2, HD / 2, (FRONT + Z0) / 2), M.wall); add(box(0.4, HA, FRONT - Z0, X1 - 0.2, HA / 2, (FRONT + Z0) / 2), M.wall);
  // glass fronts with steel mullions: the landside front (z = 34) and the airside wall (z = -46)
  const glassWall = (x0, x1, z, H, gaps = []) => {
    const segs = []; let a = x0; gaps.slice().sort((p, q) => p[0] - q[0]).forEach(([g0, g1]) => { if (g0 > a) segs.push([a, g0]); a = g1; }); if (a < x1) segs.push([a, x1]);
    segs.forEach(([s0, s1]) => { add(box(s1 - s0, H, 0.06, (s0 + s1) / 2, H / 2, z), M.glass); block((s0 + s1) / 2, z, s1 - s0, 0.5); });
    for (let x = x0; x <= x1 + 0.01; x += 3) add(box(0.14, H, 0.24, x, H / 2, z), M.steel);
    for (let y = 4; y < H; y += 4) add(box(x1 - x0, 0.12, 0.24, (x0 + x1) / 2, y, z), M.steel);
    gaps.forEach(([g0, g1]) => add(box(g1 - g0, H - 3.2, 0.06, (g0 + g1) / 2, 3.2 + (H - 3.2) / 2, z), M.glass));
  };
  glassWall(X0, -2, FRONT, HD, [[-40, -28]]); glassWall(2, X1, FRONT, HA, [[30, 40]]);
  glassWall(X0, -2, Z0 + 0.3, HD, []); glassWall(2, X1, Z0 + 0.3, HA, []);
  const window = new THREE.Mesh(box(1, 1, 0.01, 0, -5, 0), M.sky); g.add(window); // the interior contract's window (tinted by daylight)

  // ---------- outside: the kerb, the road, the city side ----------
  add(box(W + 60, 0.16, 7, 0, 0.08, 37.5), M.kerb); // the pavement under the canopy
  add(box(W + 400, 0.04, 9, 0, 0.02, 45.5), M.road);
  for (let x = -200; x < 200; x += 6) add(box(3, 0.01, 0.15, x, 0.05, 45.5), M.white);
  add(box(W + 400, 0.04, 200, 0, -0.03, 150), M.grass);
  add(box(W + 6, 0.5, 8, 0, 9.4, 38), M.white); for (let x = -64; x <= 64; x += 16) add(new THREE.CylinderGeometry(0.22, 0.22, 9.2, 10).translate(x, 4.6, 41.4), M.steel);
  // a multi-storey car park and palms across the road
  add(box(110, 14, 30, -10, 7, 82), M.concrete); for (let y = 3.5; y < 14; y += 3.5) add(box(110.4, 0.3, 30.4, -10, y, 82), M.white);
  const palm = (x, z) => { add(new THREE.CylinderGeometry(0.18, 0.28, 8, 7).translate(x, 4, z), M.wood); for (let k = 0; k < 7; k++) { const f = box(0.5, 0.06, 3.6, 0, 0, 1.6); f.rotateX(0.5); f.rotateY((k / 7) * Math.PI * 2); f.translate(x, 8, z); add(f, mat(0x4f8a3c, 0.8)); } };
  for (let x = -90; x <= 90; x += 15) palm(x, 52);
  // the taxis waiting at departures and arrivals, in the city's colours
  const taxiCol = { Lagos: 0xf2c230, Nairobi: 0xf4f1ea, Accra: 0xf28c28, Abuja: 0x2f7d4f, 'Port Harcourt': 0x3b6fb6, Uyo: 0xd9d2c3 }[city] ?? 0xf2c230;
  const taxiM = mat(taxiCol, 0.5);
  [[-34, 1], [-46, 0], [-20, 0], [30, 1], [38, 1], [46, 1], [54, 0]].forEach(([x]) => { add(box(1.8, 0.8, 4.4, x, 0.65, 43.6), taxiM); add(box(1.6, 0.6, 2.4, x, 1.35, 43.4), M.glass); add(box(1.62, 0.5, 2.3, x, 1.3, 43.4), M.dark); for (const s of [-1, 1]) for (const f of [-1, 1]) add(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12).rotateZ(Math.PI / 2).translate(x + s * 0.85, 0.34, 43.6 + f * 1.4), M.belt); });
  // the names on the canopy
  g.add(panel(plainTex(`${A.name.toUpperCase()} · ${A.code}`, { w: 2048, h: 180, bg: '#f4f1ea', size: 92 }), 44, 3.6, -20, 12.2, 34.3));
  g.add(panel(signTex([['Departures', null]], { w: 1024, h: 160, sub: SW }), 12, 1.9, -34, 8, 42.05));
  g.add(panel(signTex([['Arrivals', null]], { w: 1024, h: 160, sub: SW }), 12, 1.9, 35, 8, 42.05));
  g.add(panel(plainTex(`${A.name.toUpperCase()} · ${A.code}`, { w: 2048, h: 180, size: 92 }), 30, 2.5, -34, 13, 33.7, Math.PI));
  say('ap:out', 'Leave: the taxi back to the city', -34, 43.2, 2.2);

  // ---------- departures 1: entrance screening, inside the doors ----------
  // two lanes, an X-ray and a walk-through arch in each; nobody goes further without it
  const arch = (x, z) => add(mergeGeometries([box(0.16, 2.2, 0.5, x - 0.68, 1.1, z), box(0.16, 2.2, 0.5, x + 0.68, 1.1, z), box(1.52, 0.24, 0.5, x, 2.32, z)]), M.steel);
  const xray = (x, z, len = 4.6) => { add(box(0.95, 0.72, len, x, 0.36, z), M.belt); add(box(1.25, 1.35, 1.9, x, 0.95, z), M.white); add(box(1.0, 0.75, 0.05, x, 0.95, z + 0.97), M.dark); add(box(1.0, 0.75, 0.05, x, 0.95, z - 0.97), M.dark); };
  arch(-37, 30.5); arch(-31, 30.5); xray(-38.9, 30.5); xray(-33.0, 30.5);
  add(box(1.4, 1.0, 0.7, -34.8, 0.5, 29.4), M.wood); add(box(0.5, 0.4, 0.06, -34.8, 1.25, 29.4), M.dark);
  block(-38.85, 30.5, 2.3, 4.6); block(-34, 30.5, 4.6, 4.6); block(-29.15, 30.5, 2.3, 4.6);
  gateOf('entry', [block(-37, 30.5, 1.36, 0.3), block(-31, 30.5, 1.36, 0.3)]);
  g.add(panel(signTex([[AG.avsec, null]], { w: 1400, h: 150, bg: '#1d2028', fg: '#ffffff' }), 9, 0.96, -34, 4.4, 33.1));
  const entryIt = say('ap:entry', 'Entrance screening: your bag through the X-ray', -34, 35.2, 4.2);

  // ---------- departures 2: the check-in hall ----------
  // four islands, counters down both sides and the bag belt along the spine; queue lines on the hall side
  const ISLANDS = [{ x: -58, L: 'A', side: 1 }, { x: -46, L: 'B', side: 1 }, { x: -22, L: 'C', side: -1 }, { x: -10, L: 'D', side: -1 }];
  ISLANDS.forEach((is, i) => {
    const al = AIRLINES[i] || null, z0 = 10, z1 = 24, zc = (z0 + z1) / 2;
    add(box(1.4, 0.55, z1 - z0, is.x, 0.28, zc), M.belt); add(box(2.4, 2.6, z1 - z0 + 0.6, is.x, 1.3 + 0.0, zc), mat(al ? new THREE.Color(al.col).lerp(new THREE.Color(0xffffff), 0.55).getHex() : 0xd9d2c3, 0.7));
    block(is.x, zc, 6.2, z1 - z0 + 0.6);
    for (const s of [-1, 1]) for (let z = z0 + 1; z < z1; z += 2.4) {
      add(box(0.9, 1.05, 1.5, is.x + s * 2.65, 0.52, z), M.wood); add(box(1.0, 0.05, 1.6, is.x + s * 2.65, 1.06, z), M.steel);
      add(box(0.75, 0.32, 0.9, is.x + s * 2.65, 0.16, z + 1.15), M.belt); // the scale and the feed belt
      add(box(0.36, 0.26, 0.04, is.x + s * 2.4, 1.6, z), M.dark);
    }
    // the island's lightbox, both faces
    const t = al ? signTex([[`${is.L}  ${al.name}`, null]], { w: 1400, h: 160, bg: al.col, fg: '#ffffff' }) : signTex([[`${is.L}  Assistance · Oversize bags`, null]], { w: 1400, h: 160, bg: '#4a4e57', fg: '#ffffff' });
    add(box(0.3, 1.6, 12, is.x, 5.6, zc), M.dark); g.add(panel(t, 12, 1.4, is.x + 0.17, 5.6, zc, Math.PI / 2)); g.add(panel(t, 12, 1.4, is.x - 0.17, 5.6, zc, -Math.PI / 2));
    for (const s of [-1, 1]) add(box(0.08, 4.2, 0.08, is.x, 8.4, zc + s * 5), M.steel);
    // queue posts and belts on the hall side
    const qx = is.x + is.side * 5.2;
    for (let z = z0 + 1; z <= z1 - 1; z += 2) add(new THREE.CylinderGeometry(0.05, 0.08, 1.0, 8).translate(qx, 0.5, z), M.steel);
    add(box(0.03, 0.06, z1 - z0 - 2, qx, 0.92, zc), M.red);
    block(qx, zc, 0.3, z1 - z0 - 2);
    // agents behind the counters on the queue side
    for (const z of [zc - 2.4, zc + 2.4]) { const ag = person(`checkin-${city}-${i}-${z}`, { fem: (i + z) % 2 === 0, top: 'jacket', topColor: al?.col || '#4a4e57' }); ag.root.position.set(is.x + is.side * 1.85, 0, z); ag.root.rotation.y = is.side * Math.PI / 2; g.add(ag.root); people.push(ag); }
    if (al) say('ap:checkin', `Check in at ${al.name} (${is.L})`, is.x + is.side * 4.1, zc, 4.6, { island: i });
    else say('ap:assist', 'Special assistance and oversize bags', is.x + is.side * 4.1, zc, 4.0);
  });
  // self-service kiosks along the front, a bureau de change, the landside cafe
  for (const x0 of [-62, -24]) for (let k = 0; k < 6; k++) { const x = x0 + k * 1.6; add(box(0.6, 1.5, 0.5, x, 0.75, 31.6), M.white); add(box(0.5, 0.4, 0.05, x, 1.3, 31.33), M.dark); block(x, 31.6, 0.6, 0.5); }
  add(box(5, 1.1, 1.6, -64.5, 0.55, 8), M.wood); block(-64.5, 8, 5, 1.6); g.add(panel(plainTex('BUREAU DE CHANGE', { bg: '#22336a', fg: '#fff' }), 4.6, 0.8, -64.5, 3, 8.82));
  add(box(1.6, 1.1, 6, -66, 0.55, 20), M.wood); block(-66, 20, 1.6, 6); g.add(panel(plainTex('CAFE', { bg: '#3b2a20', fg: '#f2b33d' }), 3.6, 0.8, -67.6, 3, 20, Math.PI / 2));
  say('ap:cafe', 'Buy a coffee', -64, 20, 2.4);
  // the departures boards, hanging in the middle of the hall, both faces
  const fids = tex(1600, 900, () => {}); const fidsC = fids.image.getContext('2d');
  [1, -1].forEach((s) => g.add(panel(fids, 12, 6.75, -34, 8.2, 12 + s * 0.12, s > 0 ? 0 : Math.PI)));
  add(box(12.4, 7.1, 0.2, -34, 8.2, 12), M.dark); for (const s of [-1, 1]) add(box(0.1, 8, 0.1, -34 + s * 5, 15.7, 12), M.steel);
  say('ap:board', 'Read the departures board', -34, 14.5, 3.6);
  // overhead signs: which way is which
  g.add(panel(signTex([['Check-in A B', 'l'], ['Check-in C D', 'r']], { w: 1600, h: 160, sub: SW }), 14, 1.4, -34, 6.4, 27, Math.PI));
  g.add(panel(signTex([['Check-in A B', 'l'], ['Check-in C D', 'r']], { w: 1600, h: 160, sub: SW }), 14, 1.4, -34, 6.4, 27.02));

  // ---------- departures 3 and 4: passport control and central security, in this airport's order ----------
  const order = departureOrder(city), bandZ = [4, -6];
  // a wall across the hall with its opening, glass above head height
  const crossWall = (z, o0, o1) => { [[X0, o0], [o1, -2]].forEach(([a, b]) => { add(box(b - a, 6, 0.3, (a + b) / 2, 3, z), M.wall); block((a + b) / 2, z, b - a, 0.4); wall((a + b) / 2, z, b - a, 0.4, 6); add(box(b - a, HD - 6, 0.06, (a + b) / 2, 6 + (HD - 6) / 2, z), M.glass); }); add(box(o1 - o0, HD - 6, 0.06, (o0 + o1) / 2, 6 + (HD - 6) / 2, z), M.glass); add(box(o1 - o0, 0.3, 0.4, (o0 + o1) / 2, 6, z), M.wall); };
  // a row across the opening, solid parts and lanes; each lane has a gate (a collider) until you are cleared
  const laneRow = (z, x0, items, depth = 0.4) => { const gs = []; let x = x0; items.forEach(([w, kind]) => { if (kind === 'gap') gs.push(block(x + w / 2, z, w, 0.3)); else if (kind !== 'open') block(x + w / 2, z, w, depth); x += w; }); return gs; };
  let passIt = null, secIt = null; const secLanes = [];
  order.forEach((step, k) => {
    const zt = bandZ[k], o0 = -50, o1 = -18;
    crossWall(zt, o0, o1);
    const zr0 = zt - (step === 'passport' ? 3.6 : 4.6); for (const x of [o0, o1]) { add(box(0.3, 2.4, zt - zr0, x, 1.2, (zt + zr0) / 2), M.wall); block(x, (zt + zr0) / 2, 0.4, zt - zr0); } // a funnel, so the only way on is through a lane
    if (step === 'passport') {
      // emigration booths, then two boarding-pass gates for domestic passengers at the east end
      const zr = zt - 3.6, items = [];
      for (let b = 0; b < 6; b++) items.push([2.6, 'booth'], [1.4, 'gap']);
      items.push([2, 'solid'], [1.3, 'gap'], [1.4, 'solid'], [1.3, 'gap'], [2, 'solid']);
      const gs = laneRow(zr, o0, items, 1.6);
      let x = o0;
      items.forEach(([w, kind], j) => { if (kind === 'booth') { add(box(w - 0.2, 1.2, 1.6, x + w / 2, 0.6, zr), M.green); add(box(w - 0.2, 1.0, 0.04, x + w / 2, 1.7, zr + 0.78), M.glass); add(box(w - 0.2, 0.25, 1.7, x + w / 2, 2.4, zr), M.white); if (j % 4 === 0) { const o = person(`emig-${city}-${j}`, { fem: j % 8 === 0, top: 'jacket', topColor: '#2f7d4f' }); o.root.position.set(x + w / 2, 0, zr - 1.15); o.root.rotation.y = 0; g.add(o.root); people.push(o); } } else if (kind === 'solid') add(box(w, 1.1, 1.6, x + w / 2, 0.55, zr), M.white); else add(box(0.1, 1.0, 0.8, x + w / 2, 0.5, zr), M.glass); x += w; });
      gateOf('passport', gs);
      g.add(panel(signTex([['Passport control', 'd']], { w: 1100, h: 160, bg: '#2f7d4f', fg: '#ffffff' }), 10, 1.45, -38, 7.6, zt + 0.25));
      g.add(panel(signTex([['Domestic', 'd']], { w: 700, h: 160, bg: '#4a64b0', fg: '#ffffff' }), 5, 1.15, -22, 7.6, zt + 0.25));
      g.add(panel(plainTex(AG.imm, { w: 1200, h: 120, bg: '#f4f1ea', size: 56 }), 8, 0.8, -38, 6.6, zt + 0.25));
      passIt = say('ap:passport', 'Passport control', -36, zt + 2, 5);
      say('ap:passport', 'Domestic: show your boarding pass', -22, zt + 2, 3);
    } else {
      // central security: six lanes, each a divest table, an X-ray tunnel and an arch, trays going round
      const zr = zt - 4.6, items = [];
      for (let l = 0; l < 6; l++) items.push([3.4, 'solid'], [1.3, 'gap'], [0.63, 'solid']);
      items[items.length - 1][0] = o1 - o0 - 6 * 4.7 - 5 * 0.63;
      const gs = laneRow(zr, o0, items, 0.5);
      for (let l = 0; l < 6; l++) {
        const x = o0 + l * 5.33, bx = x + 1.6, ax = x + 4.05;
        add(box(1.0, 0.78, 7.6, bx, 0.39, zr), M.belt); block(bx, zr, 1.0, 7.6);
        add(box(1.4, 1.5, 2.2, bx, 1.05, zr), M.white); add(box(1.0, 0.8, 0.05, bx, 1.0, zr + 1.12), M.dark); add(box(1.0, 0.8, 0.05, bx, 1.0, zr - 1.12), M.dark);
        add(box(0.6, 0.5, 0.5, bx - 1.0, 1.15, zr + 1.6), M.dark); // the screener's monitor
        arch(ax, zr);
        for (let k2 = 0; k2 < 4; k2++) add(box(0.6, 0.04, 0.45, bx + 0.9, 0.82 + k2 * 0.06, zr + 3.4), M.tray);
        const trays = []; for (let k2 = 0; k2 < 3; k2++) { const tr = new THREE.Mesh(box(0.6, 0.12, 0.45), M.tray); tr.position.set(bx, 0.86, zr + 3 - k2 * 2.4); g.add(tr); trays.push(tr); }
        secLanes.push({ bx, ax, zr, trays, light: null });
        const lt = new THREE.Mesh(box(0.2, 0.08, 0.2, ax, 2.5, zr), new THREE.MeshBasicMaterial({ color: 0x8fd6a0 })); g.add(lt); secLanes[l].light = lt;
        if (l % 2 === 0) { const o = person(`sec-${city}-${l}`, { fem: l === 2, top: 'jacket', topColor: '#2b3440' }); o.root.position.set(ax + 0.9, 0, zr - 0.9); o.root.rotation.y = -Math.PI / 2; g.add(o.root); people.push(o); }
      }
      gateOf('security', gs);
      g.add(panel(signTex([['Security', 'd'], ['Liquids 100 ml', null]], { w: 1400, h: 160 }), 13, 1.5, -34, 7.6, zt + 0.25));
      g.add(panel(plainTex(AG.avsec, { w: 1200, h: 120, bg: '#f4f1ea', size: 56 }), 8, 0.8, -34, 6.6, zt + 0.25));
      secIt = say('ap:security', 'Security: tray, X-ray, walk through the arch', -34, zt + 2, 6.5);
    }
  });

  // ---------- departures 5: airside ----------
  // walk-through duty free straight after the last checkpoint: perfume and chocolate on low shelves
  const dfz = -20;
  for (let k = 0; k < 6; k++) { const x = -48 + k * 5.4; add(box(3.4, 1.3, 1.2, x, 0.65, dfz), M.white); add(box(3.2, 0.3, 1.0, x, 1.45, dfz), mat([0xe46f4f, 0xf2b33d, 0x8a5aa0, 0x2a9d94][k % 4], 0.5)); block(x, dfz, 3.4, 1.2); }
  add(box(1.2, 3, 10, -3.2, 1.5, dfz - 2), M.wood); block(-3.2, dfz - 2, 1.2, 10);
  g.add(panel(signTex([['Duty free', null]], { w: 900, h: 160, bg: '#3b2a20', fg: '#f2b33d' }), 8, 1.4, -34, 6.2, dfz + 2.5, Math.PI)); g.add(panel(signTex([['Duty free', null]], { w: 900, h: 160, bg: '#3b2a20', fg: '#f2b33d' }), 8, 1.4, -34, 6.2, dfz + 2.52));
  say('ap:dutyfree', 'Look round duty free', -34, dfz - 1.6, 4.6);
  // food: a counter and tables on the west side; a bookshop on the east
  add(box(1.4, 1.1, 8, -66.4, 0.55, -24), M.wood); block(-66.4, -24, 1.4, 8);
  for (let k = 0; k < 4; k++) { const x = -62 + (k % 2) * 3.2, z = -21 - Math.floor(k / 2) * 3.4; add(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 16).translate(x, 0.74, z), M.white); add(new THREE.CylinderGeometry(0.06, 0.06, 0.72, 8).translate(x, 0.36, z), M.steel); block(x, z, 1.1, 1.1); }
  g.add(panel(plainTex('JOLLOF & COFFEE', { bg: '#3b2a20', fg: '#f2b33d' }), 5, 0.8, -67.6, 3.2, -24, Math.PI / 2));
  say('ap:food', 'Eat before you fly', -63.6, -24, 3);
  add(box(10, 2.2, 0.6, -9, 1.1, -16.6), M.wood); block(-9, -16.6, 10, 0.6); g.add(panel(plainTex('BOOKS · TRAVEL', { bg: '#22336a', fg: '#fff' }), 5, 0.8, -9, 2.8, -16.95, Math.PI));
  say('ap:books', 'Browse the bookshop', -9, -18.4, 2.6);
  // the gates: three, each a podium, rows of seats facing the apron, a jet bridge door, a plane outside
  const GATES = [{ n: 1, x: -60 }, { n: 2, x: -34 }, { n: 3, x: -8 }];
  const gateScreens = [];
  GATES.forEach((gt) => {
    add(box(2.2, 1.1, 0.9, gt.x + 4, 0.55, -39), M.dark); block(gt.x + 4, -39, 2.2, 0.9);
    add(box(2.6, 3, 0.4, gt.x, 1.5, Z0 + 0.6), M.dark); // the jet bridge door
    add(box(0.12, 3.5, 0.12, gt.x + 4, 1.75, -38.4), M.steel);
    const scr = tex(512, 256, () => {}); gateScreens.push({ gt, scr }); g.add(panel(scr, 1.8, 0.9, gt.x + 4, 3.8, -38.33, Math.PI));
    const num = signTex([[`Gate ${gt.n}`, null]], { w: 560, h: 160 }); add(box(3.2, 1.0, 0.16, gt.x + 4, 7, -38.4), M.dark); g.add(panel(num, 3.0, 0.86, gt.x + 4, 7, -38.3)); g.add(panel(num, 3.0, 0.86, gt.x + 4, 7, -38.5, Math.PI));
    for (let r = 0; r < 3; r++) { const z = -31 - r * 1.9, segs = []; for (let k = 0; k < 9; k++) segs.push(box(0.56, 0.08, 0.56, gt.x - 4 + k * 0.64, 0.46, z), box(0.56, 0.52, 0.08, gt.x - 4 + k * 0.64, 0.72, z + 0.28)); add(mergeGeometries(segs), M.seat); add(box(5.8, 0.06, 0.12, gt.x - 1.44, 0.24, z), M.steel); block(gt.x - 1.44, z, 5.9, 0.7); }
    say('ap:gate', `Gate ${gt.n}: show your boarding pass`, gt.x + 4, -37.2, 2.8, { gate: gt.n });
  });
  g.add(panel(signTex([['Gates 1 2 3', 'u'], ['Toilets', 'r']], { w: 1500, h: 160, sub: SW }), 13, 1.4, -34, 6.4, -12.5, Math.PI));
  g.add(panel(signTex([['Gates 1 2 3', 'd']], { w: 900, h: 160, sub: SW }), 8, 1.4, -34, 6.4, -26.8, Math.PI));

  // ---------- arrivals ----------
  // the jet bridge brings you into a glass corridor along the apron; immigration is round the corner
  const arrive = { x: 20, z: -43.4 };
  add(box(2.6, 3, 0.4, 20, 1.5, Z0 + 0.6), M.dark); add(box(2.6, 3, 0.4, 46, 1.5, Z0 + 0.6), M.dark);
  [[2, 44], [56, X1]].forEach(([a, b]) => { add(box(b - a, HA, 0.3, (a + b) / 2, HA / 2, -38), M.wall); block((a + b) / 2, -38, b - a, 0.4); wall((a + b) / 2, -38, b - a, 0.4, HA); });
  add(box(12, HA - 3.2, 0.3, 50, 3.2 + (HA - 3.2) / 2, -38), M.wall);
  g.add(panel(signTex([['Immigration', 'r'], ['Baggage reclaim', 'r']], { w: 1500, h: 160, sub: SW }), 11, 1.2, 26, 4.2, -38.2, Math.PI));
  g.add(panel(plainTex(AG.hello.toUpperCase(), { w: 1600, h: 180, bg: '#2a9d94', fg: '#fff' }), 16, 1.8, 30, 6.4, -37.8));
  // immigration: queue lanes, then the booths; domestic arrivals walk straight past at the east end
  const zi = -27, iItems = [[12, 'solid']];
  for (let b = 0; b < 7; b++) iItems.push([2.6, 'booth'], [1.4, 'gap']);
  iItems.push([4, 'solid'], [1.6, 'gap'], [1.6, 'solid'], [1.6, 'gap'], [X1 - 2 - 12 - 28 - 4 - 4.8, 'solid']);
  const igs = laneRow(zi, 2, iItems, 1.6); gateOf('imm', igs.slice(0, 7)); gateOf('domArr', igs.slice(7));
  { let x = 2; iItems.forEach(([w, kind], j) => { if (kind === 'booth') { add(box(w - 0.2, 1.2, 1.6, x + w / 2, 0.6, zi), M.green); add(box(w - 0.2, 0.25, 1.7, x + w / 2, 2.4, zi), M.white); if (j % 4 === 1) { const o = person(`imm-${city}-${j}`, { fem: j % 8 === 1, top: 'jacket', topColor: '#2f7d4f' }); o.root.position.set(x + w / 2, 0, zi + 1.15); o.root.rotation.y = Math.PI; g.add(o.root); people.push(o); } } else if (kind === 'solid') add(box(w, 2.4, 0.3, x + w / 2, 1.2, zi), M.wall); else add(box(0.1, 1.0, 0.8, x + w / 2, 0.5, zi), M.glass); x += w; }); }
  add(box(X1 - 2, HA - 2.4, 0.3, 35, 2.4 + (HA - 2.4) / 2, zi), M.glass);
  const laneCols = ['#2f7d4f', '#4a64b0', '#3b2a20'];
  AG.lanes.forEach((ln, k) => { g.add(panel(signTex([[ln, 'u']], { w: 1100, h: 160, bg: laneCols[k], fg: '#fff' }), 8.4, 1.2, 18 + k * 9.4, 3.9, zi - 0.2, Math.PI)); });
  g.add(panel(signTex([['Domestic', 'u']], { w: 700, h: 160, bg: '#4a64b0', fg: '#fff' }), 4.6, 1.2, 47.6, 3.9, zi - 0.2, Math.PI));
  for (let k = 0; k < 4; k++) { const x = 14 + k * 7.2; for (let z = -36; z <= -30; z += 2) add(new THREE.CylinderGeometry(0.05, 0.08, 1.0, 8).translate(x, 0.5, z), M.steel); add(box(0.03, 0.06, 6, x, 0.92, -33), M.red); block(x, -33, 0.3, 6); }
  g.add(panel(plainTex(AG.imm, { w: 1200, h: 120, bg: '#f4f1ea', size: 56 }), 8, 0.8, 30, 5.2, zi - 0.2, Math.PI));
  const arrIt = say('ap:arrivals', 'Immigration: show your passport', 28, zi - 2.4, 6);
  say('ap:arrivals', 'Domestic arrivals: straight through', 47.6, zi - 2.2, 2.6);
  // baggage reclaim: three carousels, bags going round, a screen over each
  const belts = [];
  [16, 34, 52].forEach((bx, k) => {
    const loop = new THREE.Group(); loop.position.set(bx, 0, -9); g.add(loop);
    loop.add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.5, 28).scale(2.6, 1, 7).translate(0, 0.25, 0), M.core));
    loop.add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.18, 6, 40).rotateX(Math.PI / 2).scale(3.1, 1, 7.5).translate(0, 0.52, 0), M.belt));
    block(bx, -9, 7, 16);
    const bags = []; for (let i = 0; i < 12; i++) { const b = suitcase([0x2a6f6a, 0xe46f4f, 0x3b2a20, 0xf2b33d, 0x4a64b0, 0x8a5aa0][(i + k) % 6], 0.9); b.rotation.x = -Math.PI / 2 + 0.25; loop.add(b); bags.push(b); }
    const scr = tex(512, 160, () => {}); belts.push({ bx, bags, scr, n: k + 1 });
    add(box(3.4, 1.1, 0.14, bx, 4.4, -18.2), M.dark); g.add(panel(scr, 3.2, 1.0, bx, 4.4, -18.28, Math.PI));
    for (let t2 = 0; t2 < 3; t2++) add(box(0.6, 0.9, 1.0, 4 + t2 * 0.7, 0.45, 6 - k * 4), M.steel);
  });
  const bagIt = say('ap:bag', 'Collect your bag', 34, 0, 4);
  // customs: the green and red channels in the wall at z = 12
  [[2, 18], [28, 38], [50, X1]].forEach(([a, b]) => { add(box(b - a, HA, 0.3, (a + b) / 2, HA / 2, 12), M.wall); block((a + b) / 2, 12, b - a, 0.4); wall((a + b) / 2, 12, b - a, 0.4, HA); });
  add(box(10, HA - 3, 0.3, 23, 3 + (HA - 3) / 2, 12), M.wall); add(box(12, HA - 3, 0.3, 44, 3 + (HA - 3) / 2, 12), M.wall);
  gateOf('customs', [block(23, 12, 10, 0.3), block(44, 12, 12, 0.3)]);
  g.add(panel(signTex([['Nothing to declare', 'u']], { w: 1100, h: 160, bg: '#2f7d4f', fg: '#fff' }), 9, 1.3, 23, 4, 11.8, Math.PI));
  g.add(panel(signTex([['Goods to declare', 'u']], { w: 1100, h: 160, bg: '#c0392b', fg: '#fff' }), 9, 1.3, 44, 4, 11.8, Math.PI));
  g.add(panel(plainTex(AG.customs, { w: 1200, h: 120, bg: '#f4f1ea', size: 56 }), 8, 0.8, 33, 5.6, 11.8, Math.PI));
  xray(44, 15.4, 4.2); block(44, 15.4, 1.3, 4.2); add(box(2, 1, 0.8, 47, 0.5, 15), M.wood); block(47, 15, 2, 0.8);
  { const o = person(`customs-${city}`, { top: 'jacket', topColor: '#22336a' }); o.root.position.set(27.6, 0, 13.4); o.root.rotation.y = -Math.PI / 2; g.add(o.root); people.push(o); }
  const cusIt = say('ap:customs', 'Customs: nothing to declare', 23, 10, 3.6);
  say('ap:declare', 'Customs: goods to declare', 44, 10, 3.4);
  // the greeters' hall: a rail, people waiting with names, SIM cards, money, taxis, the way out
  [[13, 31], [39, 59]].forEach(([a, b]) => { add(box(b - a, 1.0, 0.1, (a + b) / 2, 0.5, 22), M.steel); block((a + b) / 2, 22, b - a, 0.3); });
  const kiosk = (x, z, word, col) => { add(box(4, 1.1, 1.6, x, 0.55, z), M.wood); block(x, z, 4, 1.6); g.add(panel(plainTex(word, { bg: col, fg: '#fff' }), 3.8, 0.7, x, 2.9, z - 0.82, Math.PI)); };
  kiosk(6.5, 30, `${AG.sims[0]} SIM`, '#c9a227'); kiosk(6.5, 18, 'BUREAU DE CHANGE', '#22336a'); kiosk(64, 18, 'TAXI DESK', '#3b2a20'); kiosk(64, 30, 'CAR HIRE', '#4a64b0');
  say('ap:sim', `Buy a local SIM (${AG.sims.join(', ')})`, 6.5, 28, 2.4); say('ap:taxi', 'Book a taxi at the desk', 64, 16.4, 2.4);
  g.add(panel(signTex([['Exit', 'u'], ['Taxis', 'u']], { w: 1100, h: 160, sub: SW }), 8.6, 1.3, 35, 4.2, 30, Math.PI));
  const exitIt = say('ap:exit', 'Walk out into the city', 35, 37, 3.6);
  const greeterSign = tex(512, 200, () => {}); let greeterBoard = null;

  // ---------- the apron: parked planes at the jet bridges, ground crew, the taxiway and the runway ----------
  add(box(1600, 0.04, 140, 0, -0.04, Z0 - 70), M.concrete);
  add(box(4000, 0.02, 1400, 0, -0.08, Z0 - 760), M.grass);
  add(box(1600, 0.03, 24, 0, -0.03, Z0 - 160), M.road); for (let x = -790; x < 790; x += 8) add(box(4, 0.01, 0.3, x, 0, Z0 - 160), M.yellow);
  add(box(3200, 0.03, 46, 0, -0.03, Z0 - 300), M.road);
  for (let x = -1580; x < 1580; x += 40) add(box(24, 0.01, 0.9, x, -0.005, Z0 - 300), M.white);
  for (const s of [-1, 1]) add(box(3200, 0.01, 0.9, 0, -0.005, Z0 - 300 + s * 21.5), M.white);
  for (let k = 0; k < 8; k++) for (const e of [-1, 1]) add(box(36, 0.01, 1.8, e * (1540 - 0), -0.004, Z0 - 300 - 17 + k * 4.8), M.white);
  for (let x = -60; x <= 60; x += 4) add(box(0.3, 0.01, 6, x, 0, Z0 - 10), M.yellow); // stand lines along the terminal
  // the control tower and hangars
  add(new THREE.CylinderGeometry(3, 4, 46, 16).translate(170, 23, Z0 - 120), M.concrete); add(new THREE.CylinderGeometry(8, 6, 6, 16).translate(170, 49, Z0 - 120), M.dark); add(new THREE.CylinderGeometry(8.6, 8.6, 1, 16).translate(170, 52.5, Z0 - 120), M.white);
  for (let k = 0; k < 3; k++) { add(box(60, 22, 50, -260 - k * 70, 11, Z0 - 120), M.white); add(new THREE.CylinderGeometry(30, 30, 50, 24, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).scale(1, 0.25, 1).translate(-260 - k * 70, 22, Z0 - 120), M.steel); }
  // a plane at each stand, nose to the glass; its jet bridge sloping up from the door to the plane's door
  const stands = [-60, -34, -8, 20, 46];
  stands.forEach((sx, i) => {
    const p = aircraft(AIRLINES[i % 3]); p.position.set(sx - 2.7, 0, Z0 - 20); g.add(p);
    const br = new THREE.Group(); br.position.set(sx, 0, Z0 - 0.3); g.add(br);
    const len = 12, rise = 2.0; const tube = new THREE.Mesh(box(2.4, 2.8, len, 0, 1.4, -len / 2), M.white); tube.rotation.x = -Math.atan2(rise, len); br.add(tube);
    br.add(new THREE.Mesh(box(1.0, rise + 1.0, 1.0, 0, (rise + 1.0) / 2, -len + 0.6), M.steel));
    // ground support: a belt loader, a baggage tug with carts, a catering truck
    add(box(1.6, 1.2, 4, sx - 0.3, 0.6, Z0 - 36), M.yellow); add(box(1.4, 0.2, 5, sx + 0.2, 1.6, Z0 - 35).rotateX(0.35), M.belt);
    for (let k = 0; k < 3; k++) add(box(1.4, 0.9, 2.2, sx + 8 + k * 2.6, 0.55, Z0 - 31), mat(0x9aa1aa, 0.6));
    add(box(2.2, 3.2, 5, sx - 6, 1.6, Z0 - 9), M.white);
  });
  // ground crew in hi-vis
  [[-58, -62], [-30, -64], [22, -60]].forEach(([x, z], k) => { const o = person(`ramp-${k}`, { top: 'jacket', topColor: '#d8f23a' }); o.root.position.set(x, 0, z); o.root.rotation.y = k; g.add(o.root); people.push(o); });
  // moving aircraft: one taxiing along the taxiway, one taking off and one landing on the runway, in turn
  const taxiing = aircraft(AIRLINES[1]); taxiing.rotation.y = Math.PI / 2; g.add(taxiing);
  const flying = aircraft(AIRLINES[0]); g.add(flying);
  const tug = new THREE.Group(); tug.add(new THREE.Mesh(box(1.6, 1.1, 2.6, 0, 0.55, 0), M.yellow)); for (let k = 1; k <= 3; k++) tug.add(new THREE.Mesh(box(1.4, 0.9, 2.2, 0, 0.55, -k * 2.7), mat(0x9aa1aa, 0.6))); g.add(tug);
  // the sky beyond the glass: a gradient dome and a low sun
  const skyT = tex(64, 512, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4f86cf'); gr.addColorStop(0.45, '#9cc5ee'); gr.addColorStop(0.52, '#e7eef2'); gr.addColorStop(1, '#c9d4cf'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const skyM = new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, depthWrite: false, fog: false });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3500, 24, 16), skyM); g.add(dome);

  parts.forEach((list, m) => { const mesh = new THREE.Mesh(mergeGeometries(list.map((q) => (q.index ? q.toNonIndexed() : q))), m); mesh.receiveShadow = true; if (m === M.glass) mesh.renderOrder = 2; g.add(mesh); });
  for (const [x, z, y] of [[-50, 18, 14], [-18, 18, 14], [-34, -12, 14], [-34, -34, 14], [35, -20, 7.5], [35, 20, 7.5]]) { const l = new THREE.PointLight(0xfff4e0, y > 10 ? 60 : 22, 46, 1.2); l.position.set(x, y, z); g.add(l); }
  g.add(new THREE.HemisphereLight(0xffffff, 0x8a8576, 1.25));
  const sun = new THREE.DirectionalLight(0xfff1dc, 0); sun.position.set(40, 80, -60); g.add(sun);

  // ---------- people: travellers in every hall ----------
  const BAGS = [0x2a6f6a, 0xe46f4f, 0x3b2a20, 0xf2b33d, 0x4a64b0, 0x8a5aa0, 0x1d2028];
  const walker = (seed, path, speed = 1.25, k = 0) => {
    const p = person(`${city}-${seed}`, { fem: k % 2 === 1, tier: k % 3, bag: k % 3 === 2 ? null : BAGS[k % BAGS.length] });
    g.add(p.root); if (p.bag) g.add(p.bag);
    const m = { p, path, s: (k * 7.3) % 1, dir: 1, speed: speed * (0.85 + ((k * 37) % 30) / 100), L: 0, seg: [] };
    for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); m.seg.push(d); m.L += d; }
    m.s *= m.L; movers.push(m); people.push(p); return m;
  };
  const stander = (seed, x, z, ry, k = 0, seat = false, bag = !seat && k % 4 !== 3) => {
    const p = person(`${city}-${seed}`, { fem: k % 2 === 0, tier: (k + 1) % 3, bag: bag ? BAGS[(k + 2) % BAGS.length] : null });
    p.root.position.set(x, 0, z); p.root.rotation.y = ry; g.add(p.root);
    if (p.bag) { p.bag.position.set(x + Math.cos(ry) * 0.55, 0, z - Math.sin(ry) * 0.55); p.bag.rotation.y = ry; g.add(p.bag); }
    p.seat = seat; people.push(p); movers.push({ p, still: true, seat }); return p;
  };
  // landside: from the taxis into the hall and along the islands
  walker('l1', [[-46, 39], [-37, 36], [-37, 27], [-40, 22], [-40, 9]], 1.2, 0); walker('l2', [[-20, 39], [-31, 36], [-31, 27], [-28, 20], [-28, 8]], 1.3, 1);
  walker('l3', [[-52, 27], [-52, 8], [-64, 6]], 1.1, 2); walker('l4', [[-16, 27], [-16, 8], [-6, 6]], 1.2, 3); walker('l5', [[-60, 38], [-6, 38]], 1.4, 4);
  for (let k = 0; k < 4; k++) { const is = ISLANDS[k]; for (let q = 0; q < 3; q++) stander(`q${k}${q}`, is.x + is.side * 4.1, 11.6 + q * 4.6 + (k % 2) * 0.8, -is.side * Math.PI / 2, k + q); }
  stander('kiosk1', -60.4, 30.6, Math.PI, 1); stander('kiosk2', -21, 30.6, Math.PI, 2);
  // airside: browsing, walking to gates, waiting at gates (seated)
  walker('a1', [[-50, -14], [-50, -25], [-60, -28], [-60, -35]], 1.2, 5); walker('a2', [[-20, -14], [-22, -25], [-8, -28], [-6, -35]], 1.3, 6);
  walker('a3', [[-64, -28.8], [-4, -28.8]], 1.4, 7); walker('a4', [[-44, -23.5], [-24, -23.5]], 0.9, 8);
  GATES.forEach((gt, gi) => { for (let k = 0; k < 6; k++) { const r = k % 3, c = (k * 3 + gi * 2) % 9; stander(`s${gi}${k}`, gt.x - 4 + c * 0.64, -31 - r * 1.9 - 0.15, Math.PI, k + gi, true); } stander(`ga${gi}`, gt.x + 4, -39.8, 0, gi + 1); });
  // arrivals: queueing, waiting at the belts, walking out with bags, greeters at the rail
  for (let k = 0; k < 5; k++) stander(`iq${k}`, 17.6 + (k % 3) * 7.2, -34 + Math.floor(k / 3) * 2.4, Math.PI, k);
  for (let k = 0; k < 6; k++) { const b = [16, 34, 52][k % 3]; stander(`bb${k}`, b + (k % 2 ? 4.4 : -4.4), -12 + k * 1.3, k % 2 ? -Math.PI / 2 : Math.PI / 2, k + 3); }
  walker('r1', [[23, 8], [23, 16], [30, 20], [35, 30]], 1.2, 9); walker('r2', [[10, 2], [10, -16], [24, -20]], 1.1, 10); walker('r3', [[30, 24], [42, 24], [42, 31], [30, 31]], 0.9, 11);
  [16, 21, 26, 43, 48, 53, 57].forEach((x, k) => { const p = stander(`gr${k}`, x, 22.8, Math.PI, k, false, false); if (k === 3) greeterBoard = p; });
  if (greeterBoard) { const bd = panel(greeterSign, 0.9, 0.36, 0, 1.25, 0.36); greeterBoard.root.add(bd); }

  // ---------- your own bag, which follows you from the taxi to the belt ----------
  const myBag = suitcase(0x2a9d94); myBag.visible = false; g.add(myBag);
  const drop = { t: -1, island: 0 };
  const lastP = { x: 0, z: 0, h: 0 };
  scene.add(g);

  // ---------- live boards: the departures board, the gate screens, the belt screens ----------
  const now = new Date(), base = now.getHours() * 60 + now.getMinutes();
  const flights = Object.keys(AIRPORTS).filter((c) => c !== city).map((c, i) => {
    const al = AIRLINES[i % 3], dep = Math.ceil((base + 35 + i * 22) / 5) * 5;
    return { to: c, code: AIRPORTS[c].code, no: `${al.code} ${200 + i * 37 + (A.code.charCodeAt(0) % 9)}`, al, dep, time: `${String(Math.floor(dep / 60) % 24).padStart(2, '0')}:${String(dep % 60).padStart(2, '0')}`, gate: String(GATES[i % 3].n), island: ISLANDS[i % 3].L };
  });
  const status = (f, m) => { const left = f.dep - m; return left > 60 ? ['CHECK-IN OPEN', '#e6edf3'] : left > 35 ? ['GO TO GATE', '#f2b33d'] : left > 12 ? ['BOARDING', '#8fd6a0'] : left > 0 ? ['FINAL CALL', '#ff8a6a'] : ['CLOSED', '#8fa6c9']; };
  let myFlight = null, arrived = null;
  function drawBoards() {
    const m = (() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; })();
    const c = fidsC, w = 1600, h = 900;
    c.fillStyle = '#0b1622'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2b33d'; c.font = `800 64px ${FONT}`; c.fillText(SW ? `DEPARTURES · ${SW.Departures.toUpperCase()}` : 'DEPARTURES', 40, 82);
    c.fillStyle = '#8fa6c9'; c.font = '600 30px monospace'; c.fillText(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), w - 140, 78);
    c.font = '700 32px monospace'; c.fillText('TIME   FLIGHT    TO               CHECK-IN  GATE  REMARKS', 40, 150);
    flights.forEach((f, i) => { const y = 225 + i * 120; c.fillStyle = myFlight?.no === f.no ? 'rgba(42,157,148,.35)' : i % 2 ? 'rgba(255,255,255,.04)' : 'transparent'; c.fillRect(20, y - 62, w - 40, 104); c.fillStyle = '#e6edf3'; c.font = '700 44px monospace'; c.fillText(`${f.time}  ${f.no.padEnd(8)}  ${f.to.padEnd(15)}  ${f.island.padEnd(8)}  ${f.gate.padEnd(4)}`, 40, y); const [s, col] = status(f, m); c.fillStyle = col; c.fillText(s, 1210, y); });
    fids.needsUpdate = true;
    gateScreens.forEach(({ gt, scr }) => { const f = flights.find((q) => q.gate === String(gt.n) && q.dep - m > 0) || flights.find((q) => q.gate === String(gt.n)); const c2 = scr.image.getContext('2d'); c2.fillStyle = f?.al.col || '#23262d'; c2.fillRect(0, 0, 512, 256); c2.fillStyle = '#fff'; c2.font = `800 54px ${FONT}`; c2.fillText(f ? `${f.no} ${f.to}` : `Gate ${gt.n}`, 24, 78); c2.font = `700 40px ${FONT}`; c2.fillText(f ? `${f.time} · ${status(f, m)[0]}` : 'Closed', 24, 150); c2.font = `600 30px ${FONT}`; c2.fillText(f ? f.al.name : '', 24, 214); scr.needsUpdate = true; });
    belts.forEach((b, k) => { const c3 = b.scr.image.getContext('2d'); c3.fillStyle = '#0b1622'; c3.fillRect(0, 0, 512, 160); c3.fillStyle = '#f2b33d'; c3.font = `800 50px ${FONT}`; c3.fillText(`BELT ${b.n}`, 24, 64); c3.fillStyle = '#e6edf3'; c3.font = `700 40px ${FONT}`; const from = arrived && k === 1 ? `${arrived.no} ${arrived.from}` : `${AIRLINES[k].code} ${300 + k * 41} ${Object.keys(AIRPORTS).filter((q) => q !== city)[k] || ''}`; c3.fillText(from, 24, 128); b.scr.needsUpdate = true; });
    const c4 = greeterSign.image.getContext('2d'); c4.fillStyle = '#fff'; c4.fillRect(0, 0, 512, 200); c4.fillStyle = '#1d2028'; c4.font = `800 60px ${FONT}`; c4.textAlign = 'center'; c4.fillText(arrived?.name ? `WELCOME ${String(arrived.name).toUpperCase().slice(0, 12)}` : 'MR ADEYEMI', 256, 120); c4.textAlign = 'left'; greeterSign.needsUpdate = true;
  }
  drawBoards();

  // the barriers: shut, or taken out of the colliders when you may pass
  const open = (name) => (gates[name] || []).forEach((c) => { const k = colliders.indexOf(c); if (k >= 0) colliders.splice(k, 1); });
  const shut = (name) => (gates[name] || []).forEach((c) => { if (!colliders.includes(c)) colliders.push(c); });
  let t = 0, boardT = 0, cycle = 0, scan = null;
  const room = {
    key: 'airport', group: g, colliders, walls, interact, door: { x: -34, z: 39.5 }, window, sun, people, desks: [], W, D, H: HD, A, AG, flights, order, gates: GATES,
    exitDoor: { x: 35, z: 38 }, arrive, belts, origin: ORIGIN,
    // the airport on the map (airportmap.js): its plan, and what moves on it
    mapData: { name: A.name, code: A.code, Z0, FRONT, islands: ISLANDS.map(({ x, L }) => ({ x, L })), bands: order.map((step, k) => ({ step, z: bandZ[k] })), gates: GATES.map(({ n, x }) => ({ n, x })), stands, belts: belts.map((b) => b.bx), dfz, zi },
    live: () => ({
      parked: stands.map((sx) => ({ x: sx - 2.7, z: Z0 - 20, yaw: 0 })),
      moving: [taxiing, flying].map((p) => ({ x: p.position.x, z: p.position.z, y: p.position.y, yaw: p.rotation.y })),
      tug: { x: tug.position.x, z: tug.position.z },
      people: movers.map((m) => [m.p.root.position.x, m.p.root.position.z]),
    }),
    // a new visit: every barrier shut again, then opened for what you already hold
    reset(state) {
      Object.keys(gates).forEach(shut);
      if (state?.screened) open('entry');
      if (state?.secured) open('security');
      if (state?.cleared) open('passport');
      if (state?.arrived) { if (!state.arrived.intl || state.immigrated) { open('imm'); open('domArr'); } if (state.bag) open('customs'); }
      arrived = state?.arrived || null; myFlight = state?.pass || null;
      myBag.visible = !!state?.carrying; drawBoards();
      entryIt.label = 'Entrance screening: your bag through the X-ray'; void passIt; void secIt; void arrIt; void exitIt; void bagIt; void cusIt;
    },
    open, shut,
    setFlight(bp) { myFlight = bp; drawBoards(); },
    // your bag: on and off, and where it is (it trails behind you, rolling)
    carry(on) { myBag.visible = !!on; },
    follow(wx, wz) {
      const x = wx - ORIGIN.x, z = wz - ORIGIN.z, dx = x - lastP.x, dz = z - lastP.z, d = Math.hypot(dx, dz);
      if (d > 0.02 && d < 3) lastP.h = Math.atan2(dx, dz);
      lastP.x = x; lastP.z = z;
      if (!myBag.visible || drop.t >= 0) return;
      myBag.position.set(x - Math.sin(lastP.h) * 0.75 + Math.cos(lastP.h) * 0.28, 0, z - Math.cos(lastP.h) * 0.75 - Math.sin(lastP.h) * 0.28);
      myBag.rotation.set(d > 0.02 ? -0.32 : 0, lastP.h, 0, 'YXZ');
    },
    // the bag drop: onto the scale beside the counter, then down the belt into the island
    dropBag(island = 0) { const is = ISLANDS[island] || ISLANDS[0]; drop.t = 0; drop.island = island; myBag.visible = true; myBag.rotation.set(-Math.PI / 2, 0, 0); myBag.position.set(is.x + is.side * 2.65, 0.45, 16.95); drop.is = is; },
    // the X-ray: your tray goes through the nearest lane's tunnel and the arch light blinks
    scanAt(wx) { const x = wx - ORIGIN.x; const lane = secLanes.reduce((b, l) => (Math.abs(l.ax - x) < Math.abs(b.ax - x) ? l : b), secLanes[0]); if (lane) scan = { lane, t: 0 }; },
    // the board's state for announcements
    status: (f) => status(f, (() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); })())[0],
    tick(dt) {
      t += dt; boardT += dt;
      if (boardT > 20) { boardT = 0; drawBoards(); }
      belts.forEach((b) => b.bags.forEach((bag, i) => { const a = t * 0.12 + (i / b.bags.length) * Math.PI * 2, s = Math.sin(a), c = Math.cos(a); bag.position.set(s * 2.9, 0.62, c * 7.1); bag.rotation.z = -a; }));
      secLanes.forEach((l) => l.trays.forEach((tr, i) => { const u = ((t * 0.35 + i / 3) % 1); tr.position.z = l.zr + 3.6 - u * 7.2; }));
      if (scan) { scan.t += dt; const l = scan.lane; l.light.material.color.setHex(scan.t > 1.6 && scan.t < 2.6 ? 0x8fd6a0 : scan.t < 1.6 ? 0xf2b33d : 0x8fd6a0); if (scan.t > 3) scan = null; }
      if (drop.t >= 0) { drop.t += dt; const is = drop.is; if (drop.t > 1.2) { const u = Math.min(1, (drop.t - 1.2) / 2.2); myBag.position.x = is.x + is.side * (2.65 - u * 2.0); myBag.position.y = 0.45 - u * 0.1; } if (drop.t > 3.6) { drop.t = -1; myBag.visible = false; } }
      // travellers on their rounds, bags rolling behind
      movers.forEach((m, mi) => {
        // (the ones standing or sitting breathe and fidget smoothly: every other frame, with the time that passed)
        if (m.still) { m.acc = (m.acc || 0) + dt; if ((mi + Math.floor(t * 30)) % 2 === 0) { m.p.rig?.update(m.acc, { speed: 0, t, seated: m.seat }); m.acc = 0; } return; }
        // (at each end of their way a traveller stops a moment, then turns round; never a flip on the spot)
        if (m.wait > 0) { m.wait -= dt; m.p.rig?.update(dt, { speed: 0, t }); if (m.wait > 0) return; }
        m.s += m.dir * m.speed * dt;
        if (m.s >= m.L) { m.s = m.L; m.dir = -1; m.wait = 1.5 + (mi % 4) * 0.6; } else if (m.s <= 0) { m.s = 0; m.dir = 1; m.wait = 1.5 + (mi % 3) * 0.7; }
        let s = m.s, i = 0; while (i < m.seg.length - 1 && s > m.seg[i]) { s -= m.seg[i]; i++; }
        const a = m.path[i], b = m.path[i + 1], u = m.seg[i] ? s / m.seg[i] : 0, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u;
        const hd = Math.atan2((b[0] - a[0]) * m.dir, (b[1] - a[1]) * m.dir);
        // turn toward the way ahead at a walker's pace, round corners too
        if (m.hd === undefined) m.hd = hd; let dh = hd - m.hd; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); m.hd += dh * Math.min(1, dt * 6);
        m.p.root.position.set(x, 0, z); m.p.root.rotation.y = m.hd; m.p.rig?.update(dt, { speed: m.speed, t });
        if (m.p.bag) { m.p.bag.position.set(x - Math.sin(m.hd) * 0.7 + Math.cos(m.hd) * 0.26, 0, z - Math.cos(m.hd) * 0.7 - Math.sin(m.hd) * 0.26); m.p.bag.rotation.set(-0.3, m.hd, 0, 'YXZ'); }
      });
      // the apron: a plane taxiing, a tug and carts, and on the runway a take-off then a landing, in turn
      const tx = ((t * 7) % 1400) - 700; taxiing.position.set(tx, 0, Z0 - 160); taxiing.rotation.y = Math.PI / 2;
      const ux = ((t * 4) % 260) - 130; tug.position.set(ux, 0, Z0 - 6); tug.rotation.y = Math.PI / 2;
      const T = 70, ct = t % T, take = Math.floor(t / T) % 2 === 0;
      if (Math.floor(t / T) !== cycle) { cycle = Math.floor(t / T); if (take) sfx('jet'); }
      if (take) {
        // roll from the threshold, 2.2 m/s² to rotation at 70 m/s, then climb at 7 degrees
        const v = Math.min(70, ct * 2.2), roll = ct < 32 ? 1.1 * ct * ct : 1126 + 70 * (ct - 32), x = -1400 + roll, air = Math.max(0, ct - 32);
        flying.position.set(x, air * 70 * Math.tan(0.12), Z0 - 300); flying.rotation.set(0, Math.PI / 2, 0); flying.rotateX(air > 0 ? -0.12 : 0); void v;
      } else {
        // a 3-degree approach from the east, touchdown, then braking along the runway
        const td = 34, s2 = ct - td, d = s2 < 19.4 ? 70 * s2 - 1.6 * s2 * s2 : 756 + 8 * (s2 - 19.4);
        const x = ct < td ? 300 + (td - ct) * 70 : 300 - d, y = ct < td ? (td - ct) * 70 * Math.tan(0.052) : 0;
        flying.position.set(x, y, Z0 - 300); flying.rotation.set(0, -Math.PI / 2, 0); flying.rotateX(ct < td ? -0.04 : 0);
      }
    },
  };
  room.reset(null);
  return room;
}

// ---------- the PA: a chime, then a voice, with a caption ----------
// Boarding calls for the flights on the board, your own flight and its last call, belts in arrivals, and the
// standing reminders (unattended bags, smoking, touts in Nigeria). Spoken with the browser's own voice; the caption
// shows even when sound is off.
let annCss = null;
export function createAnnouncer({ room, city, getState }) {
  if (!annCss) { annCss = document.createElement('style'); annCss.textContent = `#lk-pa { position: fixed; left: 50%; top: 106px; transform: translateX(-50%); z-index: 33; width: min(620px, calc(100vw - 32px)); box-sizing: border-box; padding: 12px 16px 12px 52px; border-radius: 18px; background: ${C.paper}; color: ${C.ink}; font: 700 14px/1.4 ${FONT}; box-shadow: 0 4px 0 rgba(59,42,32,.2), 0 16px 34px rgba(10,14,30,.22); display: none; }
    #lk-pa.on { display: block; } #lk-pa b { display: block; font: 800 12px/1 ${FONT}; letter-spacing: .1em; text-transform: uppercase; color: ${C.teal}; margin-bottom: 4px; }
    #lk-pa i { position: absolute; left: 16px; top: 14px; width: 24px; height: 24px; border-radius: 50%; background: ${C.teal}; } #lk-pa i::after { content: ''; position: absolute; left: 7px; top: 6px; border: 6px solid transparent; border-left: 9px solid #fff; }
    body.nohud #lk-pa { display: none; }`; document.head.appendChild(annCss); }
  const el = document.createElement('div'); el.id = 'lk-pa'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el);
  const A = room.A, AG = room.AG, nigeria = A.country === 'Nigeria';
  let timer = 0, nextIn = 6, k = 0, hide = 0, on = false;
  const voice = () => { const vs = window.speechSynthesis?.getVoices?.() || []; const want = { Nigeria: 'en-NG', Kenya: 'en-KE', Ghana: 'en-GH' }[A.country]; return vs.find((v) => v.lang === want) || vs.find((v) => v.lang === 'en-GB') || vs.find((v) => /^en/.test(v.lang)) || null; };
  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
  function speak(text) {
    if (!on) return; // only inside the terminal: never on the street, in the cabin or anywhere else
    el.innerHTML = `<i></i><b>${esc(A.name)} · announcement</b>${esc(text)}`; el.classList.add('on'); hide = 4 + text.length / 14;
    sfx('chime');
    const au = audioEngine(); if (!au.settings.sfx || !window.speechSynthesis) return;
    setTimeout(() => { if (!on) return; try { const u = new SpeechSynthesisUtterance(text); const v = voice(); if (v) u.voice = v; u.lang = v?.lang || 'en-GB'; u.rate = 0.94; u.pitch = 1; u.volume = Math.min(1, (au.settings.volume ?? 0.7) * 1.1); speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* no voice */ } }, 1500);
  }
  function pick() {
    const st = getState(), fl = room.flights, me = st.pass, list = [];
    if (st.arrived && !st.leftArrivals) {
      list.push(`${greet()}, ladies and gentlemen, and welcome to ${A.name}. Baggage from flight ${st.arrived.no} from ${st.arrived.from} is arriving on belt 2.`);
      list.push(`${AG.hello}. Passengers are reminded to have their passports and arrival forms ready for ${AG.imm}.`);
    }
    if (me) {
      const s = room.status(me);
      if (s === 'BOARDING' || s === 'GO TO GATE') list.push(`This is a boarding call for ${me.airline} flight ${me.no.replace(' ', ' ')} to ${me.to}. Passengers are requested to proceed to gate ${me.gate}.`);
      if (s === 'FINAL CALL' || st.atGate) list.push(`This is the final call for passenger ${st.name || 'travelling'} on ${me.airline} flight ${me.no} to ${me.to}. Please proceed immediately to gate ${me.gate}, where the flight is closing.`);
      else list.push(`${me.airline} flight ${me.no} to ${me.to} will be boarding from gate ${me.gate}. Please have your boarding pass and passport ready.`);
    }
    const f = fl[k % fl.length]; k += 1;
    const s = room.status(f);
    if (s === 'BOARDING') list.push(`${f.al.name} announces the departure of flight ${f.no} to ${f.to}. Passengers are requested to proceed to gate ${f.gate} for boarding.`);
    else if (s === 'CHECK-IN OPEN') list.push(`Check-in for ${f.al.name} flight ${f.no} to ${f.to} is now open at island ${f.island}.`);
    else if (s === 'FINAL CALL') list.push(`Final call for ${f.al.name} flight ${f.no} to ${f.to}. This flight is now closing at gate ${f.gate}.`);
    list.push('For security reasons, please do not leave your baggage unattended at any time. Unattended baggage will be removed and may be destroyed.');
    list.push('Smoking is not permitted anywhere inside the terminal building.');
    if (nigeria) list.push('Passengers are advised not to patronise touts. Please deal only with accredited airline and airport staff.');
    return list[Math.floor(Math.random() * Math.min(list.length, me || st.arrived ? 2 : list.length))] || list[0];
  }
  return {
    start() { on = true; nextIn = 5; },
    stop() { if (!on) return; on = false; hide = 0; el.classList.remove('on'); try { speechSynthesis.cancel(); } catch { /* */ } },
    get on() { return on; },
    now(text) { speak(text); nextIn = Math.max(nextIn, 25); },
    update(dt) {
      if (hide > 0) { hide -= dt; if (hide <= 0) el.classList.remove('on'); }
      if (!on) return; timer += dt; nextIn -= dt;
      if (nextIn <= 0) { nextIn = 38 + Math.random() * 20; speak(pick()); }
      void city;
    },
    dispose() { this.stop(); el.remove(); },
  };
}
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
#lk-air .town { margin: 6px 0 12px; } #lk-air .town > b { display: block; font: 800 15px/1.2 ${FONT}; } #lk-air .town > small { display: block; margin: 2px 0 8px; color: ${C.ink2}; font: 600 12.5px/1.3 ${FONT}; }
#lk-air .area { display: flex; justify-content: space-between; align-items: center; gap: 10px; width: 100%; margin-bottom: 6px; border: 2px solid #e3d4b4; border-radius: 14px; padding: 9px 12px; background: #fffaf0; color: ${C.ink}; font: 700 14.5px/1.2 ${FONT}; cursor: pointer; text-align: left; }
#lk-air .area small { display: block; color: ${C.ink2}; font-weight: 600; font-size: 12px; margin-top: 2px; } #lk-air .area .km { flex: none; font-size: 12.5px; white-space: nowrap; }
#lk-air .area:hover { background: #fff3d6; } #lk-air .air-h { margin: 6px 0 2px; font: 800 15px/1.2 ${FONT}; }

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
export function openCheckIn({ room, passes, city, name, onPass, onBag, toast, island = 0 }) {
  const here = AIRLINES[island] || AIRLINES[0], L = 'ABCD'[island] || 'A';
  const { air } = dlg();
  const render = () => {
    const rows = room.flights.map((f) => {
      const s = travelStatus(passes, city, f.to), intl = AIRPORTS[f.to].country !== AIRPORTS[city].country;
      const mine = f.al.code === here.code;
      return `<div class="f"><b>${f.time} · ${esc(f.no)} to ${esc(f.to)} (${f.code})</b><button data-to="${esc(f.to)}" ${s.ok && mine ? '' : 'disabled'}>${!mine ? `At island ${f.island}` : s.ok ? `Check in · ${fmt(s.fare)}` : 'Not yet'}</button>
        <small>${esc(f.al.name)} · ${flightMinutes(city, f.to)} min · ${intl ? 'International' : 'Domestic'} · ${esc(s.rule.label)}</small>${s.ok ? '' : `<div class="why">${s.needs.map(esc).join(' · ')}</div>`}</div>`;
    }).join('');
    air.innerHTML = `<div class="box"><h3>${esc(here.name)} · island ${L}</h3><div class="sub">This desk checks in ${esc(here.name)} flights; the others are at their own islands. The agent checks your papers and that you can show proof of funds where you are going, then takes the fare. You have ${effortsMark(13)}${fmt(walletEngine().balance())}.</div>${rows}<div class="row"><button class="x">Not now</button></div></div>`;
    air.classList.add('on');
    air.querySelector('.x').onclick = () => air.classList.remove('on');
    air.querySelectorAll('[data-to]').forEach((b) => { b.onclick = () => {
      const f = room.flights.find((q) => q.to === b.dataset.to), s = travelStatus(passes, city, f.to); if (!s.ok) return render();
      if (!walletEngine().spend(s.fare, `${f.no} ${city} to ${f.to}`)) return render();
      const intl = AIRPORTS[f.to].country !== AIRPORTS[city].country;
      const bp = { from: city, to: f.to, fromCode: AIRPORTS[city].code, toCode: f.code, no: f.no, airline: f.al.name, col: f.al.col, gate: f.gate, time: f.time, seat: `${2 + Math.floor(Math.random() * 20)}${'ACDF'[Math.floor(Math.random() * 4)]}`, intl, name: name || 'Builder' };
      sfx('arrive'); onPass(bp);
      const steps = room.order.map((q) => (q === 'security' ? 'security' : intl ? 'passport control' : 'the domestic lane')).join(', then ');
      air.innerHTML = `<div class="box"><h3>You are checked in</h3><div class="sub">Now your bag: on the scale beside the counter. After that, ${steps}, and gate ${bp.gate}.</div>${boardingPassHTML(bp)}<div class="row"><button class="bag" style="background:${C.teal};color:#fff">Put your bag on the scale</button></div></div>`;
      air.querySelector('.bag').onclick = () => {
        const kg = (14 + Math.random() * 8.5).toFixed(1), tag = `${f.al.code} ${100000 + Math.floor(Math.random() * 899999)}`;
        onBag?.(); sfx('beep');
        air.innerHTML = `<div class="box"><h3>Bag dropped</h3><div class="sub">${kg} kg, inside the 23 kg allowance. The agent tags it ${bp.fromCode} → ${bp.toCode}, ${tag}, hands you the stub, and it rides the belt away. See you at ${bp.toCode}.</div>${boardingPassHTML(bp)}<div class="row"><button class="x">Thanks</button></div></div>`;
        air.querySelector('.x').onclick = () => air.classList.remove('on');
        toast?.(`Bag tagged to ${bp.toCode}. Next: ${steps}.`, 3400);
      };
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

// the taxi to the airport, from the phone's Travel app: ride there and watch the city, or skip straight to the kerb
export function openAirportTaxi({ city, onGo, around = null }) {
  const { air } = dlg(), A = AIRPORTS[city];
  // round town first (areas.js): the other areas of this city, each a taxi ride away; pick one, then ride or skip
  const town = around && around.areas.length ? `<div class="town"><b>Around ${esc(around.label)}</b><small>Other areas of ${esc(around.label)}, by taxi.</small>
      ${around.areas.map((a, i) => `<button class="area" data-a="${i}"><span>${esc(a.name)}<small>${esc(a.about || '')}</small></span><span class="km">${a.km.toFixed(1)} km · ${effortsMark(12)}${fmt(a.fare)}</span></button>`).join('')}</div>` : '';
  air.innerHTML = `<div class="box"><h3>Travel</h3>${town}<h4 class="air-h">To the airport</h4><div class="sub">${esc(A.name)} (${A.code}) is the airport for ${esc(city)}. A taxi takes you to departures for ${effortsMark(13)}${fmt(SHUTTLE)}. Bring your passport if you are leaving the country; see the Immigration Centre for papers.</div>
    <div class="f"><b>Ride there</b><button class="ride">Call the taxi</button><small>Get in and watch the city go by on the way to ${A.code}, camera on cinematic. Skip the trip any time.</small></div>
    <div class="f"><b>Skip the trip</b><button class="skip">Straight to ${A.code}</button><small>The taxi drops you at the departures kerb right away.</small></div>
    <div class="row"><button class="x">Not now</button></div></div>`;
  air.classList.add('on');
  air.querySelector('.x').onclick = () => air.classList.remove('on');
  air.querySelector('.ride').onclick = () => { air.classList.remove('on'); onGo('ride'); };
  air.querySelector('.skip').onclick = () => { air.classList.remove('on'); onGo('skip'); };
  air.querySelectorAll('.area').forEach((b) => { b.onclick = () => {
    const a = around.areas[+b.dataset.a];
    air.innerHTML = `<div class="box"><h3>${esc(a.name)}</h3><div class="sub">${esc(a.about || '')} ${a.km.toFixed(1)} km across ${esc(around.label)}; the taxi is ${effortsMark(13)}${fmt(a.fare)}.</div>
      <div class="f"><b>Ride there</b><button class="ride">Call the taxi</button><small>Get in and watch ${esc(around.label)} go by, camera on cinematic. Skip the trip any time.</small></div>
      <div class="f"><b>Skip the trip</b><button class="skip">Straight to ${esc(a.name)}</button><small>You get out in ${esc(a.name)} right away.</small></div>
      <div class="row"><button class="x">Back</button></div></div>`;
    air.querySelector('.x').onclick = () => openAirportTaxi({ city, onGo, around });
    air.querySelector('.ride').onclick = () => { air.classList.remove('on'); around.onArea(a, 'ride'); };
    air.querySelector('.skip').onclick = () => { air.classList.remove('on'); around.onArea(a, 'skip'); };
  }; });
}
export { fare, entryRule, papers };
