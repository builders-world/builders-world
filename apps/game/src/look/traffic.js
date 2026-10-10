import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAvatarModel } from '../onboarding/avatar.js';
import { rigAvatar } from './anim.js';
import { trackDetail } from './quality.js';
import { prepareLook, dress } from './style.js';
import { signTexture } from './props.js';
import { sfx } from './audio.js';
import { bikeModel } from './mobility.js';
import { lookFor } from './style.js';

// Traffic (world bible 9.3). Cars drive the real road network in the right-hand lane, junction to
// junction, choosing a way at each one. Saloons, hatchbacks, SUVs, pickups, yellow taxis with a TAXI
// sign on the roof, danfos with their route on a board and the conductor's door, kekes, and the blue
// BRT bus. They keep their distance, stop for red lights at the big junctions, give way to people
// in the road and lean on the horn if you stand there. A LASTMA officer directs the busiest junction.

const DRIVE = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'service', 'living_street', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'];
const MAJOR = ['trunk', 'primary', 'secondary', 'tertiary'];
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const wheel = (x, z, r = 0.32) => new THREE.CylinderGeometry(r, r, 0.22, 12).rotateZ(Math.PI / 2).translate(x, r, z);

// ---------- the vehicles: each a body (painted), glass, dark parts, and its extras ----------
const DESIGNS = {
  saloon: { len: 4.4, w: 1.8, speed: 9, body: () => [box(1.8, 0.55, 4.4, 0, 0.6, 0), box(1.62, 0.5, 2.2, 0, 1.12, -0.15)], glass: () => [box(1.64, 0.38, 2.0, 0, 1.13, -0.15)], dark: (L) => [wheel(-0.85, 1.35), wheel(0.85, 1.35), wheel(-0.85, -1.35), wheel(0.85, -1.35), box(1.7, 0.12, 0.05, 0, 0.55, L / 2)] },
  hatch: { len: 3.8, w: 1.7, speed: 9, body: () => [box(1.7, 0.55, 3.8, 0, 0.6, 0), box(1.56, 0.55, 2.1, 0, 1.15, -0.45)], glass: () => [box(1.58, 0.4, 1.9, 0, 1.16, -0.45)], dark: (L) => [wheel(-0.8, 1.15, 0.3), wheel(0.8, 1.15, 0.3), wheel(-0.8, -1.15, 0.3), wheel(0.8, -1.15, 0.3), box(1.6, 0.12, 0.05, 0, 0.55, L / 2)] },
  suv: { len: 4.7, w: 1.95, speed: 9.5, body: () => [box(1.95, 0.75, 4.7, 0, 0.78, 0), box(1.85, 0.62, 3.2, 0, 1.45, -0.35)], glass: () => [box(1.87, 0.45, 3.0, 0, 1.46, -0.35)], dark: (L) => [wheel(-0.92, 1.5, 0.38), wheel(0.92, 1.5, 0.38), wheel(-0.92, -1.5, 0.38), wheel(0.92, -1.5, 0.38), box(1.2, 0.5, 0.1, 0, 1.0, -L / 2 - 0.05)] },
  pickup: { len: 5.1, w: 1.9, speed: 8.5, body: () => [box(1.9, 0.7, 5.1, 0, 0.72, 0), box(1.82, 0.62, 1.9, 0, 1.38, 0.6), box(0.08, 0.4, 2.2, -0.9, 1.25, -1.4), box(0.08, 0.4, 2.2, 0.9, 1.25, -1.4)], glass: () => [box(1.84, 0.42, 1.7, 0, 1.4, 0.6)], dark: (L) => [wheel(-0.9, 1.6, 0.37), wheel(0.9, 1.6, 0.37), wheel(-0.9, -1.6, 0.37), wheel(0.9, -1.6, 0.37)] },
  taxi: { len: 4.4, w: 1.8, speed: 9.5, paint: 0xf2c418, sign: 'TAXI', body: () => DESIGNS.saloon.body(), glass: () => DESIGNS.saloon.glass(), dark: (L) => [...DESIGNS.saloon.dark(L), box(1.82, 0.12, 4.42, 0, 0.82, 0)] },
  danfo: { len: 5.2, w: 2.0, speed: 8, paint: 0xf2c418, sign: 'route', body: () => [box(2.0, 1.75, 5.2, 0, 1.25, 0), box(1.9, 0.8, 0.7, 0, 0.75, 2.8)], glass: () => [box(2.02, 0.55, 3.8, 0, 1.6, -0.4), box(1.7, 0.6, 0.05, 0, 1.55, 2.62)], dark: (L) => [wheel(-0.95, 1.8, 0.36), wheel(0.95, 1.8, 0.36), wheel(-0.95, -1.7, 0.36), wheel(0.95, -1.7, 0.36), box(2.04, 0.12, 5.22, 0, 0.95, 0), box(2.04, 0.12, 5.22, 0, 1.35, 0), box(1.8, 0.08, 3.6, 0, 2.18, -0.3)] },
  keke: { len: 2.7, w: 1.35, speed: 6.5, paint: 0xf2c418, body: () => [box(1.3, 1.1, 1.7, 0, 1.0, -0.4), box(0.5, 0.6, 0.9, 0, 0.6, 0.85), box(1.4, 0.08, 2.0, 0, 1.6, -0.2)], glass: () => [box(1.1, 0.5, 0.05, 0, 1.2, 0.48)], dark: () => [wheel(-0.6, -0.8, 0.27), wheel(0.6, -0.8, 0.27), wheel(0, 1.1, 0.27), box(0.04, 0.9, 0.04, -0.62, 1.15, 0.45), box(0.04, 0.9, 0.04, 0.62, 1.15, 0.45)] },
  brt: { len: 11, w: 2.5, speed: 8, paint: 0x2f5fb0, sign: 'BRT', body: () => [box(2.5, 2.4, 11, 0, 1.55, 0)], glass: () => [box(2.52, 0.9, 9.5, 0, 2.05, -0.3), box(2.2, 1.1, 0.05, 0, 1.9, 5.51)], dark: () => [wheel(-1.15, 3.8, 0.48), wheel(1.15, 3.8, 0.48), wheel(-1.15, -3.5, 0.48), wheel(1.15, -3.5, 0.48), box(2.54, 0.25, 11.02, 0, 0.9, 0)] },
};
const PAINT = [0xf7f3ea, 0x2b2b2e, 0xb8bec4, 0x9b2f2f, 0x2f4f7f, 0x3f6b4b, 0x6b4a8a, 0xc9702a, 0x8a8f96];
DESIGNS.cycle = { len: 1.8, w: 0.7, speed: 4.6 };
const MIX = ['saloon', 'saloon', 'hatch', 'suv', 'pickup', 'taxi', 'taxi', 'danfo', 'danfo', 'danfo', 'keke', 'keke', 'saloon', 'suv', 'hatch', 'brt'];
const ROUTES = ['YABA - OSHODI', 'CMS - OBALENDE', 'OJUELEGBA', 'IKEJA ALONG', 'MILE 12', 'AJAH', 'UNILAG GATE', 'TBS - CMS'];
const geoCache = {};

export function vehicle(kind, i) {
  if (kind === 'cycle') { // a bike and its rider, pedalling (the rider is posed each frame)
    const g = new THREE.Group(), bike = bikeModel([0x2a9d94, 0xe46f4f, 0x3a4f7a][i % 3]); g.add(bike);
    const av = createAvatarModel({ color: '#888', style: 'tee' }); prepareLook(av.root); const rig = rigAvatar(av.root); dress(av.root, lookFor(`cyclist-${i}`, { fem: i % 2 === 1, tier: 2 }), rig); av.root.position.y = 0.32; av.root.position.z = -0.08; g.add(av.root);
    g.userData = { kind, D: DESIGNS.cycle, tail: new THREE.MeshBasicMaterial(), bike, rig };
    return g;
  }
  const D = DESIGNS[kind], g = new THREE.Group();
  geoCache[kind] = geoCache[kind] || { body: mergeGeometries(D.body()), glass: mergeGeometries(D.glass()), dark: mergeGeometries(D.dark(D.len)) };
  const G = geoCache[kind];
  g.add(new THREE.Mesh(G.body, new THREE.MeshStandardMaterial({ color: D.paint ?? PAINT[i % PAINT.length], roughness: 0.45, metalness: 0.25 })));
  g.add(new THREE.Mesh(G.glass, new THREE.MeshStandardMaterial({ color: 0x24323b, roughness: 0.15, metalness: 0.4 })));
  g.add(new THREE.Mesh(G.dark, new THREE.MeshStandardMaterial({ color: 0x161618, roughness: 0.8 })));
  // lights: white at the front, red at the back (brighter when braking)
  const tail = new THREE.MeshBasicMaterial({ color: 0x701010 });
  [-1, 1].forEach((s) => {
    const f = new THREE.Mesh(box(0.28, 0.14, 0.04), new THREE.MeshBasicMaterial({ color: 0xfff2c8 })); f.position.set(s * (D.w / 2 - 0.25), kind === 'brt' ? 0.9 : 0.72, D.len / 2 + 0.02); g.add(f);
    const r = new THREE.Mesh(box(0.28, 0.14, 0.04), tail); r.position.set(s * (D.w / 2 - 0.25), kind === 'brt' ? 0.9 : 0.72, -D.len / 2 - 0.02); g.add(r);
  });
  // roof signs: TAXI on its little box, the danfo's route board, the BRT's number
  if (D.sign) {
    const text = D.sign === 'route' ? ROUTES[i % ROUTES.length] : D.sign === 'BRT' ? 'BRT  CMS - IKORODU' : 'TAXI';
    const tex = signTexture(text, { bg: D.sign === 'TAXI' ? '#1d1d1d' : D.sign === 'BRT' ? '#14306b' : '#f7efdc', fg: D.sign === 'TAXI' ? '#f2c418' : D.sign === 'BRT' ? '#ffffff' : '#1d1d1d', w: 512, h: 120 });
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xdddddd });
    const w = D.sign === 'TAXI' ? 0.6 : D.sign === 'BRT' ? 2.0 : 1.7, h = D.sign === 'TAXI' ? 0.2 : 0.38, y = D.sign === 'TAXI' ? 1.52 : D.sign === 'BRT' ? 2.55 : 2.42, z = D.sign === 'TAXI' ? -0.15 : D.sign === 'BRT' ? D.len / 2 + 0.03 : 1.1;
    if (D.sign === 'TAXI') g.add(new THREE.Mesh(box(0.66, 0.24, 0.3, 0, y, z), new THREE.MeshStandardMaterial({ color: 0xf2c418, roughness: 0.5 })));
    [1, -1].forEach((sd) => { if (D.sign === 'BRT' && sd < 0) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(0, y, z + sd * (D.sign === 'TAXI' ? 0.16 : 0.01)); if (sd < 0) m.rotation.y = Math.PI; g.add(m); });
  }
  g.userData = { kind, D, tail };
  return g;
}

export function createTraffic({ world, scene, reduced, lowQuality, getPeople, flyover }) {
  const group = new THREE.Group(); group.name = 'traffic'; scene.add(group);
  // ---------- the drivable graph: nodes at shared road points, edges along the roads ----------
  const nodes = [], index = new Map(), key = (x, z) => `${Math.round(x * 2)},${Math.round(z * 2)}`;
  const node = (x, z) => { const k = key(x, z); if (index.has(k)) return index.get(k); nodes.push({ x, z, out: [] }); index.set(k, nodes.length - 1); return nodes.length - 1; };
  world.roads.filter((r) => r.fit && DRIVE.includes(r.cls)).forEach((r) => {
    const pts = r.fit.pts, lane = Math.max(1.5, Math.min(3.4, (r.w || 7) / 4));
    let prev = node(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) { const id = node(pts[i][0], pts[i][1]); if (id === prev) continue; const L = Math.hypot(nodes[id].x - nodes[prev].x, nodes[id].z - nodes[prev].z); nodes[prev].out.push({ to: id, L, lane, major: MAJOR.includes(r.cls), road: r }); nodes[id].out.push({ to: prev, L, lane, major: MAJOR.includes(r.cls), road: r }); prev = id; }
  });
  const usable = nodes.map((n, i) => i).filter((i) => nodes[i].out.length);
  // ---------- traffic lights at the big junctions ----------
  const junctions = nodes.map((n, i) => ({ n, i })).filter(({ n }) => n.out.length >= 3 && n.out.filter((e) => e.major).length >= 2 && Math.hypot(n.x - world.spawn.x, n.z - world.spawn.z) < world.radius * 0.9);
  const signals = [], poles = [];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.6 }), off = new THREE.MeshStandardMaterial({ color: 0x1b1d1f, roughness: 0.5 });
  const lit = { red: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.25, 0.2) }), amber: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.4, 0.2) }), green: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.2, 0.6) }) };
  junctions.slice(0, lowQuality ? 4 : 8).forEach(({ n, i }, k) => {
    // two phases by the direction of approach: the main axis, then the cross street
    const axis = Math.atan2(nodes[n.out[0].to].x - n.x, nodes[n.out[0].to].z - n.z);
    const sig = { i, x: n.x, z: n.z, axis, t: k * 3.3, heads: [] };
    n.out.forEach((e) => {
      const o = nodes[e.to], dx = o.x - n.x, dz = o.z - n.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
      // on the approach's kerb, a few metres back from the middle of the junction
      // the approaching driver's right is (uz, -ux): step out that way until clear of the carriageway
      const back = Math.min(L * 0.5, 7);
      let off = e.lane + 1.5, px = 0, pz = 0;
      for (; off < e.lane * 3 + 6; off += 0.5) { px = n.x + ux * back + uz * off; pz = n.z + uz * back - ux * off; if (!world.onCarriageway?.(px, pz, 0.6)) break; }
      if (world.onCarriageway?.(px, pz, 0.4) || world.inAnyBuilding?.(px, pz, 0.4)) return;
      if (poles.some((q) => Math.hypot(q.x - px, q.z - pz) < 3)) return; // one pole per corner
      poles.push({ x: px, z: pz });
      const g = new THREE.Group(); g.position.set(px, 0, pz); g.rotation.y = Math.atan2(ux, uz); group.add(g);
      g.add(new THREE.Mesh(box(0.12, 3.2, 0.12, 0, 1.6, 0), poleMat), new THREE.Mesh(box(0.36, 0.95, 0.28, 0, 3.4, 0), poleMat));
      const lamps = ['red', 'amber', 'green'].map((c, j) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), off); m.position.set(0, 3.72 - j * 0.31, 0.15); g.add(m); return m; });
      const phase = Math.abs(Math.sin(Math.atan2(ux, uz) - axis)) < 0.5 ? 0 : 1;
      sig.heads.push({ lamps, phase });
      world.addColliders?.([{ name: 'signal_pole', cx: px, cz: pz, hx: 0.1, hz: 0.1, ry: 0 }]);
    });
    signals.push(sig);
  });
  const CYCLE = 22; // 9 s green, 2 amber each way, 0.5 all red
  const stateOf = (sig, phase) => { const t = (sig.t % CYCLE) - (phase ? CYCLE / 2 : 0), u = ((t % CYCLE) + CYCLE) % CYCLE; return u < 8.5 ? 'green' : u < 10.5 ? 'amber' : 'red'; };
  const sigAt = new Map(signals.map((s) => [s.i, s]));

  // ---------- pedestrian signals on the zebras at those junctions ----------
  // Each zebra near a signalled junction gets a head on both kerbs, facing the people about to cross. A
  // zebra crosses one road; you may walk while that road's cars are held at red: the walking figure
  // from a second after their red, the flashing hand for the last three seconds of it, the red hand
  // otherwise. People wait at the kerb unless the figure is lit (world.pedWait).
  const pedFace = (kind) => {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 96; const g = cv.getContext('2d');
    g.fillStyle = '#141516'; g.fillRect(0, 0, 64, 96);
    g.fillStyle = kind === 'walk' ? '#4dff9a' : kind === 'dark' ? '#2a1a14' : '#ff4a36';
    if (kind === 'walk') { // the walking figure
      g.beginPath(); g.arc(34, 22, 7, 0, 7); g.fill(); g.lineWidth = 7; g.lineCap = 'round'; g.strokeStyle = g.fillStyle;
      g.beginPath(); g.moveTo(32, 32); g.lineTo(29, 56); g.lineTo(18, 78); g.moveTo(29, 56); g.lineTo(42, 78); g.moveTo(31, 38); g.lineTo(20, 52); g.moveTo(31, 38); g.lineTo(44, 50); g.stroke();
    } else { // the raised hand
      g.beginPath(); g.roundRect(20, 40, 26, 34, 8); g.fill();
      [22, 29, 36, 43].forEach((x, k) => { g.beginPath(); g.roundRect(x - 2.5, 16 + (k === 0 || k === 3 ? 8 : 0), 6, 30, 3); g.fill(); });
      g.beginPath(); g.roundRect(8, 46, 16, 7, 3); g.fill();
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: tex, color: kind === 'dark' ? 0xffffff : new THREE.Color(1.6, 1.6, 1.6) });
  };
  const PEDM = { walk: pedFace('walk'), stop: pedFace('stop'), dark: pedFace('dark') };
  const peds = [];
  (world.crossings || []).forEach((k) => {
    // a zebra belongs to the nearest signalled junction within 26 m (two junctions close together must
    // not both claim it, each with its own idea of when you may cross)
    let sig = null, best = 26;
    signals.forEach((g) => { const d = Math.hypot(k.x - g.x, k.z - g.z); if (d < best) { best = d; sig = g; } });
    if (!sig) return;
    const phase = Math.abs(Math.sin(Math.atan2(k.nz, -k.nx) - sig.axis)) < 0.5 ? 0 : 1; // the cars this zebra crosses
    const ped = { sig, phase, x: k.x, z: k.z, nx: k.nx, nz: k.nz, hw: k.hw, faces: [], state: 'stop' };
    [-1, 1].forEach((s) => {
      let off = k.hw + 1.2, px = 0, pz = 0;
      for (; off < k.hw + 5; off += 0.3) { px = k.x + k.nx * s * off - k.nz * 2.1; pz = k.z + k.nz * s * off + k.nx * 2.1; if (!world.onCarriageway?.(px, pz, 0.35)) break; }
      if (world.onCarriageway?.(px, pz, 0.3) || world.inAnyBuilding?.(px, pz, 0.3) || poles.some((q) => Math.hypot(q.x - px, q.z - pz) < 1)) return;
      const g = new THREE.Group(); g.position.set(px, 0, pz); g.rotation.y = Math.atan2(-k.nx * s, -k.nz * s); group.add(g); // facing across the road
      g.add(new THREE.Mesh(box(0.1, 2.5, 0.1, 0, 1.25, 0), poleMat), new THREE.Mesh(box(0.34, 0.5, 0.2, 0, 2.45, 0), poleMat));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.39), PEDM.stop); face.position.set(0, 2.45, 0.105); g.add(face); ped.faces.push(face);
      world.addColliders?.([{ name: 'ped_signal', cx: px, cz: pz, hx: 0.08, hz: 0.08, ry: 0 }]);
    });
    if (ped.faces.length) peds.push(ped);
  });
  const pedState = (ped) => { const u = (((ped.sig.t % CYCLE) - (ped.phase ? CYCLE / 2 : 0)) % CYCLE + CYCLE) % CYCLE; return u >= 11 && u < 18.5 ? 'walk' : u >= 18.5 && u < 21.5 ? 'flash' : 'stop'; };
  const tx = (k) => k.nz, tz = (k) => -k.nx;
  // about to step off the kerb onto a signalled zebra whose figure is not lit: wait
  world.pedWait = (pos, dx, dz) => {
    const ax = pos.x + dx * 0.9, az = pos.z + dz * 0.9;
    // the few signalled zebras first; only near one is the road itself looked up
    // a zebra you are walking across (heading along its stripes), out to 9 m past them: on a dual
    // carriageway the other half is crossed on the same signal
    const ped = peds.find((k) => { const ox = ax - k.x, oz = az - k.z; return Math.abs(dx * k.nx + dz * k.nz) > 0.6 && Math.abs(ox * k.nx + oz * k.nz) < k.hw + 9 && Math.abs(ox * tx(k) + oz * tz(k)) < 2.4; });
    if (!ped || ped.state === 'walk') return false;
    return !!world.onCarriageway?.(ax, az, 0) && !world.onCarriageway?.(pos.x, pos.z, -0.2);
  };

  // ---------- the LASTMA officer at the busiest junction ----------
  let warden = null;
  const busiest = junctions.sort((a, b) => b.n.out.length - a.n.out.length)[0];
  if (busiest) {
    const av = createAvatarModel({ color: '#f2c418', style: 'tee' }); prepareLook(av.root); const rig = rigAvatar(av.root);
    dress(av.root, { body: 'm', skin: '#7a4a2e', hair: 'fila', hairColor: '#1b1714', top: 'tee', topColor: '#f2c418', bottom: 'trousers', bottomColor: '#6b1d2a', shoes: 'boots', shoeColor: '#1d2028', acc: [] }, rig);
    // on a little island at the corner, out of the cars' way: try each road out of the junction, both sides, until the island is clear of every carriageway
    let px = busiest.n.x, pz = busiest.n.z, found = false;
    for (const ed of busiest.n.out) {
      const q = nodes[ed.to], Lq = Math.hypot(q.x - busiest.n.x, q.z - busiest.n.z) || 1;
      for (const sd of [1, -1]) {
        for (let off = ed.lane + 3; off < ed.lane * 3 + 9 && !found; off += 0.5) {
          const tx = busiest.n.x + ((q.z - busiest.n.z) / Lq) * off * sd, tz = busiest.n.z - ((q.x - busiest.n.x) / Lq) * off * sd;
          if (!world.onCarriageway?.(tx, tz, 1.4)) { px = tx; pz = tz; found = true; }
        }
        if (found) break;
      }
      if (found) break;
    }
    if (found) {
      av.root.position.set(px, 0.15, pz); av.root.rotation.y = Math.atan2(busiest.n.x - px, busiest.n.z - pz); group.add(av.root);
      const isle = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.15, 14).translate(0, 0.075, 0), new THREE.MeshStandardMaterial({ color: 0xd9d2c3, roughness: 0.8 })); isle.position.set(px, 0, pz); group.add(isle);
      warden = { av, rig, x: px, z: pz, next: 2 };
      world.addColliders?.([{ name: 'warden_island', cx: px, cz: pz, hx: 0.6, hz: 0.6, ry: 0 }]);
    }
  }

  // ---------- the cars ----------
  const N = Math.min(usable.length, reduced ? 8 : lowQuality ? 12 : 22);
  const rng = (() => { let a = 1234567; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const cars = [];
  const pickNext = (from, to) => { const n = nodes[to], opts = n.out.filter((e) => e.to !== from); const list = opts.length ? opts : n.out; return list[Math.floor(rng() * list.length)]; };
  const CYCLISTS = reduced ? 1 : 3;
  for (let k = 0; k < N + CYCLISTS; k++) {
    const kind = k >= N ? 'cycle' : MIX[k % MIX.length], start = usable[Math.floor(rng() * usable.length)], e = nodes[start].out[Math.floor(rng() * nodes[start].out.length)];
    const mesh = vehicle(kind, k); group.add(trackDetail(mesh));
    cars.push({ kind, mesh, from: start, e, s: rng() * e.L, v: 0, max: DESIGNS[kind].speed * (0.85 + rng() * 0.3), wait: 0, horn: 0 });
  }

  const tmp = new THREE.Vector3();
  const posOf = (c) => { const a = nodes[c.from], b = nodes[c.e.to], u = c.s / (c.e.L || 1), dx = (b.x - a.x) / (c.e.L || 1), dz = (b.z - a.z) / (c.e.L || 1); return { x: a.x + (b.x - a.x) * u - dz * c.e.lane, z: a.z + (b.z - a.z) * u + dx * c.e.lane, dx, dz }; };
  let t = 0;
  function update(dt, player) {
    t += dt;
    peds.forEach((k) => { k.state = pedState(k); const m = k.state === 'walk' ? PEDM.walk : k.state === 'flash' ? (Math.floor(t * 2.5) % 2 ? PEDM.stop : PEDM.dark) : PEDM.stop; k.faces.forEach((f) => { f.material = m; }); });
    signals.forEach((sig) => { sig.t += dt; sig.heads.forEach((h) => { const st = stateOf(sig, h.phase); h.lamps.forEach((m, j) => { m.material = ['red', 'amber', 'green'][j] === st ? lit[st] : off; }); }); });
    const people = getPeople?.() || [];
    const P = cars.map(posOf);
    cars.forEach((c, k) => {
      const p = P[k];
      let want = c.max;
      // school and pedestrian zones (roadsigns.js): their limit, whatever the road allows
      for (const Z of world.slowZones || []) if ((p.x - Z.x) ** 2 + (p.z - Z.z) ** 2 < Z.r * Z.r) want = Math.min(want, Z.limit);
      const toEnd = c.e.L - c.s;
      // red or amber at the junction ahead: stop at the line
      const sig = sigAt.get(c.e.to);
      const flying = flyover && c.e.road === flyover.road && flyover.over(p.x, p.z); // over the junction, no light
      if (sig && !flying) { const ph = Math.abs(Math.sin(Math.atan2(-p.dx, -p.dz) - sig.axis)) < 0.5 ? 0 : 1; const st = stateOf(sig, ph); if (st !== 'green' && toEnd > 4 && toEnd < 9 + c.v) want = Math.min(want, Math.max(0, (toEnd - 7) * 1.2)); }
      // slow for the bend at the end of the segment
      if (toEnd < 8) want = Math.min(want, 5 + toEnd * 0.4);
      // keep a distance from the car ahead in the same lane
      for (let j = 0; j < cars.length; j++) {
        // (one up on the flyover and one under it are not in each other's way)
        if (j === k || Math.abs(cars[j].mesh.position.y - c.mesh.position.y) > 2.5) continue; const q = P[j], ax = q.x - p.x, az = q.z - p.z, along = ax * p.dx + az * p.dz, across = Math.abs(-ax * p.dz + az * p.dx);
        if (along > 0 && along < 14 && across < 1.6 && p.dx * q.dx + p.dz * q.dz > 0.3) want = Math.min(want, Math.max(0, (along - DESIGNS[c.kind].len / 2 - DESIGNS[cars[j].kind].len / 2 - 1.5) * 1.1));
      }
      // people in the road ahead: stop, and after a moment, the horn
      let blocked = false;
      [player, ...people].forEach((h, hi) => { if (!h || c.mesh.position.y > 2.5) return; const ax = h.x - p.x, az = h.z - p.z, along = ax * p.dx + az * p.dz, across = Math.abs(-ax * p.dz + az * p.dx); if (along > 0 && along < 7 && across < 1.5) { want = Math.min(want, Math.max(0, (along - 3.5) * 1.5)); if (hi === 0 && along < 6) blocked = true; } });
      if (blocked && c.v < 0.3) { c.horn += dt; if (c.horn > 1.6 && Math.hypot(player.x - p.x, player.z - p.z) < 25) { sfx('horn', { kind: c.kind }); c.horn = -3; dispatchEvent(new CustomEvent('bw:react', { detail: { kind: 'horn', x: p.x, z: p.z, r: 14, max: 3, chance: 0.7 } })); } } else c.horn = Math.min(c.horn, 0) + dt * 0;
      if (reduced) want = Math.min(want, c.max * 0.6);
      c.v += Math.max(-7 * dt, Math.min(2.4 * dt, want - c.v));
      c.s += c.v * dt;
      if (c.s >= c.e.L) { const at = c.e.to; if (watchers.some((fn) => fn(c, at))) { c.gone = true; return; } const nx = pickNext(c.from, at); c.s -= c.e.L; c.from = at; c.e = nx; if (c.s > c.e.L) c.s = 0; }
      const q = posOf(c), yaw = Math.atan2(q.dx, q.dz);
      c.mesh.position.set(q.x, flyover ? flyover.heightFor(q.x, q.z, c.e.road) : 0, q.z);
      const dy = Math.atan2(Math.sin(yaw - c.mesh.rotation.y), Math.cos(yaw - c.mesh.rotation.y)); c.mesh.rotation.y += dy * (1 - Math.exp(-dt * 6));
      c.mesh.userData.tail.color.setHex(want < c.v - 0.5 ? 0xff2a2a : 0x701010);
      if (c.kind === 'cycle') { const u = c.mesh.userData, a = t * (2 + c.v * 1.4); u.bike.userData.crank.rotation.x = a; u.bike.userData.wheels.forEach((w) => { w.rotation.x -= dt * c.v * 3.2; }); const r = u.rig; if (r) { r.update(dt, { speed: 0, t }); r.L.hip.rotation.x = -0.9 + Math.sin(a) * 0.45; r.R.hip.rotation.x = -0.9 - Math.sin(a) * 0.45; r.L.knee.rotation.x = 1.0 - Math.cos(a) * 0.45; r.R.knee.rotation.x = 1.0 + Math.cos(a) * 0.45; r.L.shoulder.rotation.x = -0.7; r.R.shoulder.rotation.x = -0.7; r.chest.rotation.x = 0.25; } }
      c.body = { cx: q.x, cz: q.z, hx: DESIGNS[c.kind].w / 2 + 0.05, hz: DESIGNS[c.kind].len / 2, ry: c.mesh.rotation.y };
    });
    for (let k = cars.length - 1; k >= 0; k--) if (cars[k].gone) cars.splice(k, 1);
    // the officer waves the traffic on now and then
    if (warden) { warden.next -= dt; warden.rig?.update(dt, { speed: 0, t }); if (warden.next <= 0) { warden.rig?.wave?.(); warden.next = 2.5 + rng() * 2; } }
  }
  // for the motor park (streetlife.js): take a passing car off the road at a node, put one back on
  const watchers = [];
  function onNode(fn) { watchers.push(fn); }
  function nearestNode(x, z) { let best = -1, bd = Infinity; usable.forEach((i) => { const d = Math.hypot(nodes[i].x - x, nodes[i].z - z); if (d < bd) { bd = d; best = i; } }); return best; }
  function release(kind, mesh, at) { const e = nodes[at].out[Math.floor(rng() * nodes[at].out.length)]; const c = { kind, mesh, from: at, e, s: 0.5, v: 2, max: DESIGNS[kind].speed, wait: 0, horn: 0 }; if (!mesh.parent) group.add(mesh); cars.push(c); return c; }
  const bodies = () => cars.map((c) => c.body).filter(Boolean);
  function dispose() { group.removeFromParent(); }
  return { peds, update, bodies, cars, signals, warden, nodes, onNode, nearestNode, release, stateOf, dispose, get count() { return cars.length; } };
}
