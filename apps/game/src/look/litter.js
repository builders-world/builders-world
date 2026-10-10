import * as THREE from 'three';
import { signTexture } from './props.js';
import { findSite } from './parks.js';
import { walletEngine, fmt } from './wallet.js';
import { passesEngine } from './passes.js';
import { sfx } from './audio.js';
import { C, FONT } from './uikit.js';
import { apiUrl } from '../api.js';
import { authHeaders } from '../session.js';

// Keeping the streets clean (world bible 12.3). Litter collects along the kerbs, most of it where people
// eat and wait: pure water sachets, bottles, cans, takeaway packs, black nylon bags. Pick it up (E) into
// your bag, then hand it in at the Recycling Point for Efforts, or drop it in any street bin for less.
// The street is short of bins, so there are marked spots where players chip in Efforts to put one up.
// Bins are shared: one funded by anyone is there for everyone in the district (api/bins.js), and the
// street round a bin stays cleaner, because less litter turns up within reach of one.

const BAG = 8; // pieces you can carry
const PAY = { recycle: 150, bin: 50 }; // Efforts per piece handed in
const STEP = 1000, NEED = 3000; // a bin costs 3,000 Efforts, given 1,000 at a time
const NEAR_BIN = 20; // metres round a bin where little new litter appears
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } } };

// seeded, so every player starts with the same street
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const TYPES = [
  { key: 'sachet', name: 'pure water sachet', geo: () => box(0.2, 0.012, 0.13), color: 0xcfe8f2, w: 4 },
  { key: 'bottle', name: 'plastic bottle', geo: () => new THREE.CylinderGeometry(0.035, 0.035, 0.24, 8).rotateZ(Math.PI / 2).translate(0, 0.035, 0), color: 0x8fd0c4, w: 3 },
  { key: 'can', name: 'drink can', geo: () => new THREE.CylinderGeometry(0.033, 0.033, 0.12, 8).rotateZ(Math.PI / 2).translate(0, 0.033, 0), color: 0xd8473b, w: 2 },
  { key: 'pack', name: 'takeaway pack', geo: () => box(0.2, 0.07, 0.16, 0, 0.035, 0), color: 0xf4f1e8, w: 2 },
  { key: 'nylon', name: 'nylon bag', geo: () => new THREE.IcosahedronGeometry(0.11, 0).scale(1, 0.45, 1.2).translate(0, 0.04, 0), color: 0x2b2b2e, w: 3 },
];
const PER = 48; // instances per kind

const CSS = `
#lk-bag { position: fixed; left: 14px; bottom: 108px; z-index: 15; display: none; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border-radius: 999px;
  background: ${C.paper}; color: ${C.ink}; font: 700 13px/1 ${FONT}; box-shadow: 0 3px 0 rgba(59,42,32,.2); }
#lk-bag.on { display: flex; }
#lk-bag i { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: #5f9a45; color: #fff; font: 800 13px/1 ${FONT}; font-style: normal; }
#lk-bag.full i { background: #e46f4f; }
body.nohud #lk-bag, body.bw-cine #lk-bag { display: none; }
`;

export function createLitter({ world, scene, props, toast, used = [], reduced, district = 'yaba', getName }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const chip = document.createElement('div'); chip.id = 'lk-bag'; document.body.appendChild(chip);
  const group = new THREE.Group(); group.name = 'litter'; scene.add(group);
  const wallet = walletEngine();
  const R = rng(4721 + Math.round(world.radius));
  const busy = (props.pois || []).filter((q) => ['food', 'bus', 'shop', 'cafe', 'park', 'fuel'].includes(q.kind));
  const inUsed = (x, z, m = 1) => used.some((u) => Math.abs(u.x - x) < u.W / 2 + m && Math.abs(u.z - z) < u.D / 2 + m);

  // the pavement strip beside the carriageway: open ground, not a lawn, not a lot, not inside anything
  const kerbside = (x, z) => world.costAt?.(x, z) === 1 && world.onCarriageway?.(x, z, 1.7) && !world.onCarriageway?.(x, z, 0.45) && !world.inPlot?.(x, z, 0.3) && !inUsed(x, z);
  const spots = [];
  for (let k = 0; k < 9000 && spots.length < 700; k++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * world.radius * 0.92, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (kerbside(x, z)) spots.push({ x, z, heat: busy.reduce((h, q) => h + Math.exp(-Math.hypot(q.x - x, q.z - z) / 14), 0.08) });
  }
  // somewhere near a busy place, more often the busier
  const heatSum = spots.reduce((a, s) => a + s.heat, 0);
  function pickSpot(rand = Math.random) { let u = rand() * heatSum; for (const s of spots) { u -= s.heat; if (u <= 0) return s; } return spots[spots.length - 1]; }

  // ---------- litter, drawn as one instanced mesh per kind ----------
  const meshes = TYPES.map((t) => { const m = new THREE.InstancedMesh(t.geo(), new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.6 }), PER); m.count = PER; m.frustumCulled = false; m.name = `litter_${t.key}`; group.add(m); return m; });
  const free = TYPES.map(() => Array.from({ length: PER }, (_, i) => PER - 1 - i));
  const items = new Map(); // id -> { t, i, x, z }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  meshes.forEach((m) => { for (let i = 0; i < PER; i++) m.setMatrixAt(i, ZERO); m.instanceMatrix.needsUpdate = true; });
  let nextId = 0;
  const totalW = TYPES.reduce((a, t) => a + t.w, 0);
  function drop(x, z, rand = Math.random) {
    let u = rand() * totalW, t = 0; while (u > TYPES[t].w) { u -= TYPES[t].w; t++; }
    if (!free[t].length) return null;
    const i = free[t].pop(), id = `litter:${nextId++}`;
    Q.setFromAxisAngle(Y, rand() * Math.PI * 2); P.set(x, 0.115, z); S.setScalar(0.9 + rand() * 0.3);
    meshes[t].setMatrixAt(i, M.compose(P, Q, S)); meshes[t].instanceMatrix.needsUpdate = true;
    items.set(id, { t, i, x, z });
    props.interact.push({ id, label: `Pick up the ${TYPES[t].name}`, x, z, r: 1.25 });
    return id;
  }
  function lift(id) {
    const it = items.get(id); if (!it) return null;
    meshes[it.t].setMatrixAt(it.i, ZERO); meshes[it.t].instanceMatrix.needsUpdate = true;
    free[it.t].push(it.i); items.delete(id);
    const k = props.interact.findIndex((q) => q.id === id); if (k >= 0) props.interact.splice(k, 1);
    return it;
  }

  // ---------- the Recycling Point: three skips, a weighing kiosk, bales of crushed bottles ----------
  let recycle = null;
  const at = findSite(world, used, 12, 9);
  if (at) {
    const g = new THREE.Group(); g.position.set(at.x, 0, at.z);
    const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(12, 9).rotateX(-Math.PI / 2), mat(0xb9b3a6, { polygonOffset: true, polygonOffsetFactor: -1 })); pad.position.y = 0.08; g.add(pad);
    [['PLASTIC', 0x3f78c2, '#3f78c2'], ['CANS', 0xe2b13c, '#c9952a'], ['NYLON & PAPER', 0x4f8a4a, '#4f8a4a']].forEach(([label, c, css], k) => {
      const x = -4 + k * 3.2, z = -2.6;
      g.add(new THREE.Mesh(box(2.6, 1.3, 1.8, x, 0.65, z), mat(c)), new THREE.Mesh(box(2.7, 0.1, 1.9, x, 1.35, z), mat(0x2b3a34)));
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.45), new THREE.MeshStandardMaterial({ map: signTexture(label, { bg: css, w: 512, h: 104 }), roughness: 0.7 })); plate.position.set(x, 0.8, z + 0.91); g.add(plate);
    });
    // the kiosk where hand-ins are weighed
    g.add(new THREE.Mesh(box(2.6, 2.3, 2.0, 4.2, 1.15, 1.6), mat(0xf2ead8)), new THREE.Mesh(box(3.0, 0.15, 2.4, 4.2, 2.38, 1.6), mat(0x2a9d94)), new THREE.Mesh(box(1.4, 0.9, 0.05, 4.2, 1.35, 0.58), mat(0x29353a)));
    g.add(new THREE.Mesh(box(0.7, 0.12, 0.7, 2.5, 0.75, 0.2), mat(0x8c9599, { metalness: 0.5 })), new THREE.Mesh(box(0.12, 0.7, 0.12, 2.5, 0.35, 0.2), mat(0x55605a)));
    // bales of crushed bottles waiting for the truck
    const bale = mat(0x9fd3cf, { flatShading: true });
    [[-4.8, 2.6], [-3.6, 2.6], [-4.2, 2.6, 1]].forEach(([x, z, up]) => g.add(new THREE.Mesh(box(1.1, 0.9, 0.9, x, up ? 1.35 : 0.45, z), bale)));
    const sign = new THREE.Group(); sign.position.set(0, 0, 4.2);
    sign.add(new THREE.Mesh(box(0.08, 1.6, 0.08, -1.1, 0.8, 0), mat(0x263832)), new THREE.Mesh(box(0.08, 1.6, 0.08, 1.1, 0.8, 0), mat(0x263832)));
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.6), new THREE.MeshStandardMaterial({ map: signTexture(`${world.place?.name ?? 'Yaba'} Recycling Point`, { bg: '#4f8a4a', w: 640, h: 150 }), roughness: 0.7 })); sp.position.set(0, 1.35, 0.05); sign.add(sp); g.add(sign);
    group.add(g);
    world.addColliders([
      ...[-4, -0.8, 2.4].map((x) => ({ name: 'skip', cx: at.x + x, cz: at.z - 2.6, hx: 1.3, hz: 0.9, ry: 0, h: 1.4 })),
      { name: 'kiosk', cx: at.x + 4.2, cz: at.z + 1.6, hx: 1.3, hz: 1.0, ry: 0 },
      { name: 'bales', cx: at.x - 4.2, cz: at.z + 2.6, hx: 1.2, hz: 0.45, ry: 0, h: 1.8 },
    ]);
    world.claim?.({ kind: 'recycling', cx: at.x, cz: at.z, hx: 6, hz: 4.5, ry: 0 });
    recycle = { x: at.x, z: at.z, name: `${world.place?.name ?? 'Yaba'} Recycling Point` };
    props.interact.push({ id: 'recycle', label: 'Hand in your litter at the Recycling Point', x: at.x + 1, z: at.z + 0.2, r: 3.6 });
    props.pois?.push({ kind: 'recycle', name: recycle.name, x: at.x, z: at.z });
  }

  // ---------- bins: spots that need one, funded by players, shared with everyone ----------
  const binGeo = [box(0.62, 0.95, 0.62, 0, 0.475, 0), box(0.68, 0.08, 0.68, 0, 0.99, 0), box(0.2, 0.04, 0.05, 0, 0.9, 0.33)];
  const binMat = new THREE.MeshStandardMaterial({ color: 0x2f7d4f, roughness: 0.6 }), lidMat = new THREE.MeshStandardMaterial({ color: 0x235c3b, roughness: 0.6 });
// where a bin will go: its outline, not a see-through box (walking through a box tinted your legs green)
  const ghostMat = new THREE.LineDashedMaterial({ color: 0x2f9a55, dashSize: 0.09, gapSize: 0.06 });
  const ghostGeo = new THREE.EdgesGeometry(binGeo[0]);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf2b33d, transparent: true, opacity: 0.85, depthWrite: false });
  const bins = [], bag = [];
  const binSpots = [];
  const anchors = [...busy].sort((a, b) => (a.kind === 'food' ? -1 : 0) - (b.kind === 'food' ? -1 : 0));
  for (const q of anchors) {
    if (binSpots.length >= 12) break;
    let best = null;
    for (let k = 0; k < 40 && !best; k++) {
      const a = (k / 40) * Math.PI * 2 * 3, r = 2 + (k % 5), x = q.x + Math.cos(a) * r, z = q.z + Math.sin(a) * r;
      if (!kerbside(x, z) || world.costAt(x + 0.5, z) !== 1 || world.costAt(x - 0.5, z) !== 1 || world.costAt(x, z + 0.5) !== 1 || world.costAt(x, z - 0.5) !== 1) continue;
      if (binSpots.some((b) => Math.hypot(b.x - x, b.z - z) < 22)) continue;
      best = { x, z };
    }
    if (best) binSpots.push({ id: `${Math.round(best.x)}_${Math.round(best.z)}`, x: best.x, z: best.z, near: q.name, funded: 0, names: [], built: false });
  }
  binSpots.forEach((b) => {
    const g = new THREE.Group(); g.position.set(b.x, 0, b.z);
    const ghost = new THREE.LineSegments(ghostGeo, ghostMat); ghost.computeLineDistances();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 24, 1).rotateX(-Math.PI / 2), ringMat); ring.position.y = 0.13;
    const real = new THREE.Group(); real.visible = false;
    real.add(new THREE.Mesh(binGeo[0], binMat), new THREE.Mesh(binGeo[1], lidMat), new THREE.Mesh(binGeo[2], lidMat));
    g.add(ghost, ring, real); group.add(g);
    Object.assign(b, { g, ghost, ring, real });
    b.it = { id: `bin:${b.id}`, label: '', x: b.x, z: b.z, r: 1.6 };
    props.interact.push(b.it);
    label(b);
  });
  function label(b) {
    b.it.label = b.built ? (bag.length ? `Drop your litter in the bin (+${PAY.bin} each)` : `A bin funded by ${who(b)}`) : `Chip in ${fmt(STEP)} Efforts for a bin here (${fmt(NEED - b.funded)} to go)`;
  }
  const who = (b) => (b.names.length ? b.names.slice(0, 2).join(' and ') + (b.names.length > 2 ? ` and ${b.names.length - 2} more` : '') : 'the street');
  function build(b, fresh) {
    if (b.built) return;
    b.built = true; b.ghost.visible = false; b.ring.visible = false; b.real.visible = true;
    world.addColliders([{ name: 'street_bin', cx: b.x, cz: b.z, hx: 0.34, hz: 0.34, ry: 0, h: 1.0 }]);
    bins.push(b);
    if (fresh) { // the street round a new bin tidies itself a little
      [...items].filter(([, it]) => Math.hypot(it.x - b.x, it.z - b.z) < 8).slice(0, 4).forEach(([id]) => lift(id));
    }
  }
  function apply(list) {
    (list || []).forEach((s) => { const b = binSpots.find((q) => q.id === s.spot); if (!b) return; b.funded = Math.max(b.funded, Math.min(NEED, s.funded || 0)); b.names = s.names || b.names; if (b.funded >= NEED) build(b, false); label(b); });
  }
  // shared bins from the server; this device's own record when offline
  const local = store.get(`bw-bins-${district}`, []);
  apply(local);
  let online = false;
  const solo = new URLSearchParams(location.search).get('offline') === '1'; // tests and solo play never touch the shared world
  if (!solo) fetch(apiUrl(`/api/bins?district=${encodeURIComponent(district)}`)).then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null)).then((j) => { if (j && !j.offline) { online = true; apply(j.bins); } }).catch(() => {});

  // ---------- the street fills up slowly; bins keep it down ----------
  const initial = Math.min(spots.length, Math.round(20 + world.radius * 0.22));
  for (let k = 0; k < initial; k++) { const s = pickSpot(R); drop(s.x + (R() - 0.5) * 0.6, s.z + (R() - 0.5) * 0.6, R); }
  const cap = Math.min(PER * 2, initial + 25);

  let cleaned = store.get('bw-cleaned', 0);
  function showBag() {
    chip.classList.toggle('on', bag.length > 0); chip.classList.toggle('full', bag.length >= BAG);
    chip.innerHTML = `<i>${bag.length}</i><span>${bag.length >= BAG ? 'Bag full: find a bin' : `of ${BAG} in your bag`}</span>`;
    binSpots.forEach(label);
  }
  function handIn(where, per) {
    const n = bag.length; if (!n) return false;
    bag.length = 0; showBag();
    wallet.earn(n * per, where === 'recycle' ? `Recycled ${n} piece${n > 1 ? 's' : ''} of litter` : `${n} piece${n > 1 ? 's' : ''} in a street bin`);
    sfx('arrive');
    toast(`${where === 'recycle' ? 'Weighed and recycled' : 'In the bin'}: ${n} piece${n > 1 ? 's' : ''}. +${fmt(n * per)} Efforts`, 3600);
    if (n >= 3) setTimeout(() => passesEngine().addRep?.(Math.min(5, Math.floor(n / 3)), 'kept the streets clean'), 1800);
    return true;
  }

  function use(id, player) {
    if (id.startsWith('litter:')) {
      if (bag.length >= BAG) { toast('Your bag is full. Hand it in at a bin or the Recycling Point.', 3200); return true; }
      const it = lift(id); if (!it) return true;
      bag.push(TYPES[it.t].key); cleaned++; store.set('bw-cleaned', cleaned);
      sfx('pick'); showBag();
      if (cleaned === 1) toast(`Picked up a ${TYPES[it.t].name}. Take litter to the Recycling Point (+${PAY.recycle} each) or a street bin (+${PAY.bin}).`, 5200);
      else if (cleaned % 25 === 0) toast(`That is ${cleaned} pieces off the street. Yaba thanks you.`, 3200);
      return true;
    }
    if (id === 'recycle') {
      if (!bag.length) toast(`Bring litter here: ${fmt(PAY.recycle)} Efforts a piece.`, 2800);
      else handIn('recycle', PAY.recycle);
      return true;
    }
    if (id.startsWith('bin:')) {
      const b = binSpots.find((q) => `bin:${q.id}` === id); if (!b) return false;
      if (b.built) { if (bag.length) handIn('bin', PAY.bin); else toast(`A bin funded by ${who(b)}. Fewer sachets on this stretch now.`, 3000); return true; }
      if (!wallet.spend(STEP, `Towards a bin near ${b.near || 'the road'}`)) { toast(`A bin here needs ${fmt(NEED - b.funded)} more Efforts. You have ${fmt(wallet.balance())}.`, 3200); return true; }
      const name = (getName?.() || 'A builder').slice(0, 24);
      b.funded = Math.min(NEED, b.funded + STEP); if (!b.names.includes(name)) b.names.push(name);
      sfx('interact');
      if (b.funded >= NEED) { build(b, true); toast(`The bin is up! Funded by ${who(b)}.`, 3600); setTimeout(() => passesEngine().addRep?.(5, 'put up a street bin'), 2000); } else toast(`Thank you. ${fmt(NEED - b.funded)} Efforts to go for this bin.`, 3000);
      label(b);
      store.set(`bw-bins-${district}`, binSpots.filter((q) => q.funded).map((q) => ({ spot: q.id, funded: q.funded, names: q.names })));
      if (!solo) fetch(apiUrl('/api/bins'), { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ district, spot: b.id, name }) })
        .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null)).then((j) => { if (j && !j.offline) apply(j.bins); }).catch(() => {});
      return true;
    }
    return false;
  }

  let grow = 18, poll = 30;
  function update(dt, player) {
    grow -= dt; poll -= dt;
    // the outline steps aside while you stand where the bin will go
    if (player) binSpots.forEach((b) => { if (!b.built) b.ghost.visible = Math.hypot(player.x - b.x, player.z - b.z) > 0.9; });
    if (grow <= 0) {
      grow = 14 + Math.random() * 12;
      if (items.size < cap && spots.length) {
        const s = pickSpot();
        const nearBin = bins.some((b) => Math.hypot(b.x - s.x, b.z - s.z) < NEAR_BIN);
        if (!nearBin || Math.random() < 0.25) drop(s.x + (Math.random() - 0.5) * 0.6, s.z + (Math.random() - 0.5) * 0.6);
      }
    }
    // bins other players fund appear without a reload
    if (poll <= 0 && online) { poll = 30; fetch(apiUrl(`/api/bins?district=${encodeURIComponent(district)}`)).then((r) => r.json()).then((j) => { if (j && !j.offline) apply(j.bins); }).catch(() => {}); }
    if (!reduced) { const k = 1 + Math.sin(performance.now() / 380) * 0.08; binSpots.forEach((b) => { if (!b.built) b.ring.scale.set(k, 1, k); }); }
  }
  function dispose() { group.removeFromParent(); chip.remove(); style.remove(); }
  return { update, use, dispose, group, get count() { return items.size; }, get bag() { return bag.length; }, recycle, binSpots, items, get cleaned() { return cleaned; } };
}
