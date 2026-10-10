import * as THREE from 'three';
import { createAvatarModel } from '../onboarding/avatar.js';
import { rigAvatar } from './anim.js';
import { prepareLook, dress, lookFor } from './style.js';
import { signTexture } from './props.js';
import { findSite } from './parks.js';
import { vehicle } from './traffic.js';
import { walletEngine, fmt } from './wallet.js';
import { sfx } from './audio.js';

// Street life (world bible 9.4): the motor park, the police, the hawkers and the little dramas.
// - Yaba Motor Park: danfos leave the road to load here, wait in their bays while the touts call the
//   routes, and pull back out into the traffic when they are full.
// - Yaba Police Division: a station with its sign, a patrol car, and officers at the gate.
// - Hawkers at the traffic lights: when the light goes red they walk between the stopped cars with
//   trays of gala, pure water and plantain chips; buy from them.
// - Something different every day: a danfo broken down by the kerb with the passengers pushing, kids
//   playing football on the lawn in the evening, an owambe party on a Saturday.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const person = (look, seedName) => { const av = createAvatarModel({ color: '#888888', style: 'tee' }); prepareLook(av.root); const rig = rigAvatar(av.root); dress(av.root, look || lookFor(seedName), rig); return { av, rig, obj: av.root }; };
const TOUTS = ['Oshodi! Oshodi! Enter with your change!', 'CMS, Obalende, one chance!', 'Ojuelegba, Stadium, Costain!', 'Ikeja Along! Two more people!', 'Mile 12 Mile 12, we dey go now now!'];
const HAWK = [['Gala! Gala!', 'Gala', 150], ['Pure water! Cold pure water!', 'Pure water', 50], ['Plantain chips, sweet and salty!', 'Plantain chips', 200], ['Charger! Earpiece!', 'Phone charger', 700]];

export function createStreetLife({ world, scene, props, traffic, chat, toast, getEnv, used = [], reduced }) {
  const group = new THREE.Group(); group.name = 'street-life'; scene.add(group);
  const day = new Date().toISOString().slice(0, 10), dow = new Date().getDay();
  const seed = [...day].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 7);
  const roll = (k) => (((Math.imul(seed ^ k, 2654435761) >>> 0) % 1000) / 1000);
  const people = [];
  const talk = (who, text, near = 26, player) => { if (!player || Math.hypot(who.obj.position.x - player.x, who.obj.position.z - player.z) < near) chat?.sayFrom?.(who.obj, text, who.name || ''); };

  // ---------- Yaba Motor Park ----------
  let park = null;
  const pAt = findSite(world, used, 32, 22);
  if (pAt && traffic) {
    const g = new THREE.Group(); g.position.set(pAt.x, 0, pAt.z); group.add(g);
    const tar = new THREE.Mesh(new THREE.PlaneGeometry(32, 22).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 })); tar.position.y = 0.09; g.add(tar);
    const paint = new THREE.MeshBasicMaterial({ color: 0xe8e2d0 });
    for (let k = 0; k < 6; k++) { g.add(new THREE.Mesh(box(0.12, 0.02, 6, -12.5 + k * 3.4, 0.11, -6.5), paint)); g.add(new THREE.Mesh(box(0.12, 0.02, 6, -12.5 + k * 3.4, 0.11, 6.5), paint)); }
    // the shed: a corrugated roof on posts, benches under it, the union office
    const roof = new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.5, metalness: 0.4 }), post = new THREE.MeshStandardMaterial({ color: 0x3b3f45, roughness: 0.6 });
    g.add(new THREE.Mesh(box(10, 0.12, 4.5, 10, 3.2, 0).rotateZ(0.04), roof));
    [[5.5, -2], [14.5, -2], [5.5, 2], [14.5, 2]].forEach(([x, z]) => g.add(new THREE.Mesh(box(0.15, 3.2, 0.15, x, 1.6, z), post)));
    [-1, 1].forEach((s) => g.add(new THREE.Mesh(box(8, 0.1, 0.45, 10, 0.45, s * 1.2), new THREE.MeshStandardMaterial({ color: 0xa87950, roughness: 0.8 }))));
    g.add(new THREE.Mesh(box(3, 2.6, 2.4, 13.5, 1.3, -8.6), new THREE.MeshStandardMaterial({ color: 0x2f6b4f, roughness: 0.8 })));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), new THREE.MeshBasicMaterial({ map: signTexture('YABA MOTOR PARK', { bg: '#2f6b4f', fg: '#f2c94c', w: 1200, h: 190, sub: 'Oshodi · CMS · Ikeja · Ojuelegba · Mile 12' }), color: 0xdddddd }));
    sign.position.set(0, 4.2, 11.05); g.add(sign); g.add(new THREE.Mesh(box(0.2, 4.9, 0.2, -4.4, 2.45, 11), post), new THREE.Mesh(box(0.2, 4.9, 0.2, 4.4, 2.45, 11), post));
    world.addColliders?.([{ name: 'park_shed_office', cx: pAt.x + 13.5, cz: pAt.z - 8.6, hx: 1.5, hz: 1.2, ry: 0 }, { name: 'park_bench', cx: pAt.x + 10, cz: pAt.z - 1.2, hx: 4, hz: 0.25, ry: 0, h: 0.5 }, { name: 'park_bench', cx: pAt.x + 10, cz: pAt.z + 1.2, hx: 4, hz: 0.25, ry: 0, h: 0.5 }]);
    world.claim?.({ kind: 'motor_park', cx: pAt.x, cz: pAt.z, hx: 16, hz: 11, ry: 0 });
    // bays: two rows, nose in
    const bays = [];
    for (let k = 0; k < 5; k++) { bays.push({ x: pAt.x - 10.8 + k * 3.4, z: pAt.z - 6.5, ry: Math.PI, car: null }); bays.push({ x: pAt.x - 10.8 + k * 3.4, z: pAt.z + 6.5, ry: 0, car: null }); }
    const gate = { x: pAt.x, z: pAt.z + 11.5 };
    const entry = traffic.nearestNode(gate.x, gate.z), E = traffic.nodes[entry];
    // the way in from the road: round buildings, not through them
    const road = (world.plan?.({ x: E.x, z: E.z }, gate) || [{ x: E.x, z: E.z }, gate]).map((q) => ({ x: q.x, z: q.z }));
    park = { g, bays, gate, entry, road, at: pAt, moving: [], touts: [], next: 10 };
    // three bays full from the start, with their own danfos
    bays.filter((_, i) => i % 3 === 0).forEach((b, i) => { const m = vehicle('danfo', 30 + i); m.position.set(b.x, 0, b.z); m.rotation.y = b.ry; group.add(m); b.car = { mesh: m, t: 20 + i * 12 }; });
    // touts by the bays
    for (let k = 0; k < 3; k++) { const t = person(null, `tout-${k}`); t.name = ['Agbero', 'Baba Ijebu', 'Conductor'][k]; t.obj.position.set(pAt.x - 9 + k * 7, 0, pAt.z); t.obj.rotation.y = k * 2; group.add(t.obj); park.touts.push(t); people.push(t); }
    // passing danfos turn in to load, now and then
    traffic.onNode((c, at) => {
      if (at !== entry || c.kind !== 'danfo' || park.moving.length > 1 || Math.random() > 0.5) return false;
      const b = bays.find((q) => !q.car && !q.claimed); if (!b) return false;
      b.claimed = true;
      park.moving.push({ mesh: c.mesh, path: [...park.road, { x: b.x, z: pAt.z + (b.z > pAt.z ? 1.5 : -1.5) }, { x: b.x, z: b.z }], i: 1, bay: b, dir: 'in' });
      return true;
    });
  }
  const parkPos = (m, dt) => {
    const aim = m.path[m.i], p = m.mesh.position, dx = aim.x - p.x, dz = aim.z - p.z, d = Math.hypot(dx, dz);
    if (d < 0.4) { m.i++; return m.i >= m.path.length; }
    const v = Math.min(5, d * 1.5 + 1); p.x += (dx / d) * v * dt; p.z += (dz / d) * v * dt;
    const want = Math.atan2(dx, dz) + (m.dir === 'in' && m.i === m.path.length - 1 ? 0 : 0), dy = Math.atan2(Math.sin(want - m.mesh.rotation.y), Math.cos(want - m.mesh.rotation.y)); m.mesh.rotation.y += dy * (1 - Math.exp(-dt * 4));
    return false;
  };

  // ---------- Yaba Police Division ----------
  let police = null;
  const sAt = findSite(world, used, 16, 14);
  if (sAt) {
    const g = new THREE.Group(); g.position.set(sAt.x, 0, sAt.z); group.add(g);
    const wall = new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.85 }), blue = new THREE.MeshStandardMaterial({ color: 0x1f3d7a, roughness: 0.6 });
    g.add(new THREE.Mesh(box(11, 4.2, 7, 0, 2.1, -2.5), wall), new THREE.Mesh(box(11.4, 0.3, 7.4, 0, 4.3, -2.5), blue), new THREE.Mesh(box(11.02, 0.6, 7.02, 0, 0.3, -2.5), blue));
    g.add(new THREE.Mesh(box(1.6, 2.4, 0.08, 0, 1.2, 1.02), new THREE.MeshStandardMaterial({ color: 0x14254a, roughness: 0.5 })));
    for (let k = -2; k <= 2; k++) if (k) g.add(new THREE.Mesh(box(1.2, 1.1, 0.06, k * 2, 2.4, 1.02), new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.2 })));
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.2), new THREE.MeshBasicMaterial({ map: signTexture('NIGERIA POLICE FORCE', { bg: '#1f3d7a', fg: '#ffffff', w: 1200, h: 170, sub: 'Lagos State Command · Yaba Division' }), color: 0xdddddd }));
    s1.position.set(0, 3.55, 1.05); g.add(s1);
    // the flagpole, the patrol car
    g.add(new THREE.Mesh(box(0.08, 6, 0.08, -6.5, 3, 4), post()), new THREE.Mesh(box(0.9, 0.3, 0.02, -6.05, 5.6, 4), new THREE.MeshBasicMaterial({ color: 0x0d8a3d })), new THREE.Mesh(box(0.3, 0.3, 0.03, -6.05, 5.6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })));
    const car = vehicle('saloon', 1); car.children[0].material.color.setHex(0x1f3d7a); car.position.set(sAt.x + 4.2, 0, sAt.z + 4.2); car.rotation.y = Math.PI / 2;
    const bar = new THREE.Group(); bar.add(new THREE.Mesh(box(0.35, 0.12, 0.25, -0.2, 1.45, -0.15), new THREE.MeshBasicMaterial({ color: 0x2a5cff })), new THREE.Mesh(box(0.35, 0.12, 0.25, 0.2, 1.45, -0.15), new THREE.MeshBasicMaterial({ color: 0xff2a2a }))); car.add(bar); group.add(car);
    world.addColliders?.([{ name: 'police_station', cx: sAt.x, cz: sAt.z - 2.5, hx: 5.5, hz: 3.5, ry: 0 }, { name: 'parked_car', cx: sAt.x + 4.2, cz: sAt.z + 4.2, hx: 2.2, hz: 0.95, ry: 0, h: 1.5 }]);
    world.claim?.({ kind: 'police_station', cx: sAt.x, cz: sAt.z, hx: 8, hz: 7, ry: 0 });
    const officers = [0, 1].map((k) => { const o = person({ body: k ? 'f' : 'm', skin: '#5a3825', hair: k ? 'bun' : 'low', hairColor: '#1b1714', top: 'jacket', topColor: '#14161c', bottom: 'trousers', bottomColor: '#14161c', shoes: 'boots', shoeColor: '#14161c', acc: [] }, 'officer'); o.name = k ? 'Inspector Adaeze' : 'Sergeant Musa'; o.obj.position.set(sAt.x + (k ? 1.6 : -1.6), 0, sAt.z + 2.4); group.add(o.obj); people.push(o); return o; });
    police = { at: sAt, officers, lights: bar.children };
    props.interact.push({ id: 'police', label: 'Talk to the police', x: sAt.x, z: sAt.z + 3.4, r: 3, name: 'Yaba Police Division', line: 'Good day. If you see something, tell us. And no climbing estate walls, abeg.' });
    props.pois?.push({ kind: 'police', name: 'Yaba Police Division', x: sAt.x, z: sAt.z + 3 });
  }
  function post() { return new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.4, metalness: 0.5 }); }
  if (pAt) props.pois?.push({ kind: 'bus', name: 'Yaba Motor Park', x: pAt.x, z: pAt.z + 11 });

  // ---------- hawkers at the traffic lights ----------
  const hawkers = [];
  (traffic?.signals || []).slice(0, 3).forEach((sig, si) => {
    for (let k = 0; k < 2; k++) {
      const [call, item, price] = HAWK[(si * 2 + k) % HAWK.length];
      const h = person(lookFor(`hawker-${si}-${k}`, { fem: k === 1, tier: 2 }), `hawker-${si}-${k}`);
      h.name = k ? 'Mama Blessing' : 'Sunday';
      const tray = new THREE.Group(); tray.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.08, 14), new THREE.MeshStandardMaterial({ color: 0xc9a27a, roughness: 0.8 })));
      for (let j = 0; j < 6; j++) tray.add(new THREE.Mesh(box(0.1, 0.12, 0.06, Math.cos(j) * 0.18, 0.1, Math.sin(j) * 0.18), new THREE.MeshStandardMaterial({ color: [0xe46f4f, 0xcfe8f2, 0xf2b33d][j % 3] })));
      tray.position.y = 1.95; h.rig?.attach ? h.rig.attach(tray, 'head') : h.obj.add(tray);
      // home on the kerb by the junction; in the road between the cars when the light is red
      const head = sig.heads[k % Math.max(1, sig.heads.length)];
      const home = head ? new THREE.Vector3().copy(head.lamps[0].parent.position) : new THREE.Vector3(sig.x + 6, 0, sig.z + 6);
      home.y = 0;
      h.obj.position.copy(home); group.add(h.obj);
      hawkers.push({ ...h, sig, head, home, call, item, price, out: 0, said: 0, it: null });
      people.push(h);
      const it = { id: `hawk:${hawkers.length - 1}`, label: `Buy ${item.toLowerCase()} (${price})`, x: home.x, z: home.z, r: 2 };
      props.interact.push(it); hawkers[hawkers.length - 1].it = it;
    }
  });
  function buy(id) {
    const h = hawkers[+id.split(':')[1]]; if (!h) return false;
    if (!walletEngine().spend(h.price, `${h.item} from a hawker`)) { toast(`${h.name}: "Ah, you no get change?"`, 2200); return true; }
    sfx('interact'); chat?.sayFrom?.(h.obj, 'Thank you o! God bless you!', h.name); toast(`${h.item}: ${fmt(h.price)} Efforts.`, 2000); return true;
  }

  // ---------- today's events ----------
  const events = [];
  // a danfo broken down by the kerb, hazards blinking, passengers pushing
  if (roll(1) < 0.75 && traffic?.cars.length) {
    const road = world.roads.filter((r) => r.fit && r.fit.pts.length > 8 && ['primary', 'secondary', 'tertiary'].includes(r.cls))[Math.floor(roll(2) * 5)];
    if (road) {
      const { pts, nrm, half } = road.fit, i = Math.floor(pts.length / 2), off = half[i] + 1.15; // two wheels up on the kerb, clear of the lane
      const x = pts[i][0] - nrm[i][0] * off, z = pts[i][1] - nrm[i][1] * off, ry = Math.atan2(-nrm[i][1], nrm[i][0]) - Math.PI / 2;
      const m = vehicle('danfo', 7); m.position.set(x, 0, z); m.rotation.y = Math.atan2(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); group.add(m);
      const crew = [0, 1, 2].map((k) => { const p = person(null, `push-${k}`); p.name = ['Driver', 'Conductor', 'Passenger'][k]; const fx = Math.sin(m.rotation.y), fz = Math.cos(m.rotation.y); p.obj.position.set(x - fx * (3.3 + k * 0.05) + Math.cos(m.rotation.y) * (k - 1) * 0.7, 0, z - fz * (3.3) - Math.sin(m.rotation.y) * (k - 1) * 0.7); p.obj.rotation.y = m.rotation.y; group.add(p.obj); people.push(p); return p; });
      world.addColliders?.([{ name: 'broken_danfo', cx: x, cz: z, hx: 1.05, hz: 2.7, ry: m.rotation.y, h: 2.2 }]);
      events.push({ kind: 'breakdown', m, crew, lines: ['Make una push! One, two, three!', 'This engine don tire o.', 'Mechanic dey come!'], x, z, said: 0, blink: m.children.filter((c) => c.geometry?.parameters?.width === 0.28) });
    }
  }
  // kids playing football on a lawn in the evening
  const lawn = (props.pois || []).find((q) => /Picnic Lawn/.test(q.name)) || (props.pois || []).find((q) => q.kind === 'park');
  if (lawn && roll(3) < 0.85) {
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, flatShading: true })); group.add(ball);
    const kids = [0, 1, 2, 3].map((k) => { const p = person(lookFor(`kid-${k}`, { fem: k % 2 === 1, tier: 1 }), `kid-${k}`); p.obj.scale.setScalar(0.66); p.name = ['Tobi', 'Adaeze', 'Kunle', 'Bisi'][k]; group.add(p.obj); people.push(p); return p; });
    events.push({ kind: 'football', ball, kids, at: lawn, t: 0, holder: 0, lines: ['Pass am! Pass am!', 'Goal!!!', 'E no be goal, e touch hand!'] , said: 0 });
  }
  // an owambe on a Saturday: a canopy, chairs, a DJ in a house's front garden
  // on open ground everyone can see, the way a Lagos party spills out under its canopies
  const oAt = (dow === 6 || roll(4) < 0.3) ? findSite(world, used, 10, 10) : null;
  if (oAt) {
    const h = { addr: (() => { const n = (props.pois || []).reduce((b, q) => (!b || Math.hypot(q.x - oAt.x, q.z - oAt.z) < Math.hypot(b.x - oAt.x, b.z - oAt.z) ? q : b), null); return n ? `the open plot by ${n.name}` : 'the open plot down the road'; })() };
    {
      const cx = oAt.x, cz = oAt.z;
      const g = new THREE.Group(); g.position.set(cx, 0, cz); group.add(g);
      world.claim?.({ kind: 'owambe', cx, cz, hx: 3, hz: 3, ry: 0 });
      const cloth = new THREE.MeshStandardMaterial({ color: 0xf4ead2, roughness: 0.8, side: THREE.DoubleSide }), gold = new THREE.MeshStandardMaterial({ color: 0xd9a83a, roughness: 0.5 });
      g.add(new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.1, 4, 1, true).rotateY(Math.PI / 4).translate(0, 3.3, 0), cloth));
      [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]].forEach(([x, z]) => g.add(new THREE.Mesh(box(0.08, 2.8, 0.08, x, 1.4, z), gold)));
      for (let k = 0; k < 8; k++) g.add(new THREE.Mesh(box(0.42, 0.45, 0.42, -1.8 + (k % 4) * 1.2, 0.22, k < 4 ? -0.8 : 0.8), gold));
      const guests = [0, 1, 2, 3, 4].map((k) => { const p = person({ ...lookFor(`guest-${k}`, { fem: k % 2 === 0, tier: 0 }), top: k % 2 ? 'agbada' : 'dress', topColor: '#7d5aa6', hair: k % 2 ? 'fila' : 'gele' }, `guest-${k}`); p.name = 'Guest'; p.obj.position.set(cx + Math.cos(k * 1.3) * 1.4, 0, cz + Math.sin(k * 1.3) * 1.4); group.add(p.obj); people.push(p); return p; });
      events.push({ kind: 'owambe', guests, x: cx, z: cz, addr: h.addr, lines: ['Spray money! Spray money!', 'Na my cousin wedding o!', 'DJ, play Burna!'], said: 0 });
    }
  }

  // ---------- each frame ----------
  let t = 0;
  function update(dt, player) {
    t += dt;
    const env = getEnv?.() || {}, hour = env.hour ?? 12;
    // the motor park: danfos in and out, touts calling
    if (park) {
      park.moving = park.moving.filter((m) => {
        if (!parkPos(m, dt)) return true;
        if (m.dir === 'in') { m.bay.car = { mesh: m.mesh, t: 18 + Math.random() * 20 }; m.bay.claimed = false; m.mesh.rotation.y = m.bay.ry; }
        else traffic.release('danfo', m.mesh, park.entry);
        return false;
      });
      park.bays.forEach((b) => { if (!b.car) return; b.car.t -= dt; if (b.car.t <= 0 && park.moving.length < 2) { const E = traffic.nodes[park.entry]; park.moving.push({ mesh: b.car.mesh, path: [{ x: b.x, z: park.at.z + (b.z > park.at.z ? 1.5 : -1.5) }, ...[...park.road].reverse()], i: 0, dir: 'out' }); b.car = null; } });
      park.next -= dt;
      if (park.next <= 0) { park.next = 6 + Math.random() * 6; const tt = park.touts[Math.floor(Math.random() * park.touts.length)]; talk(tt, TOUTS[Math.floor(Math.random() * TOUTS.length)], 30, player); tt.rig?.wave?.(); }
      park.touts.forEach((tt) => tt.rig?.update(dt, { speed: 0, t }));
    }
    if (police) { police.lights.forEach((l, k) => { l.visible = Math.sin(t * 6 + k * Math.PI) > 0; }); police.officers.forEach((o) => o.rig?.update(dt, { speed: 0, t })); }
    // hawkers: out between the cars on red, back to the kerb on green
    hawkers.forEach((h, k) => {
      const red = h.head && traffic.stateOf(h.sig, h.head.phase) === 'red';
      h.out += ((red ? 1 : 0) - h.out) * (1 - Math.exp(-dt * 0.8));
      const tx = h.sig.x + (h.home.x - h.sig.x) * 0.45, tz = h.sig.z + (h.home.z - h.sig.z) * 0.45;
      const px = h.home.x + (tx - h.home.x) * h.out, pz = h.home.z + (tz - h.home.z) * h.out, moving = Math.abs((red ? 1 : 0) - h.out) > 0.05;
      const dx = px - h.obj.position.x, dz = pz - h.obj.position.z; h.obj.position.set(px, 0, pz); if (moving && Math.hypot(dx, dz) > 1e-4) h.obj.rotation.y = Math.atan2(dx, dz);
      h.rig?.update(dt, { speed: moving ? 1.2 : 0, t });
      h.it.x = px; h.it.z = pz;
      h.said -= dt; if (h.out > 0.6 && h.said <= 0) { h.said = 7 + Math.random() * 5; talk(h, h.call, 22, player); }
    });
    // events
    events.forEach((e) => {
      e.said -= dt;
      if (e.kind === 'breakdown') {
        e.blink.forEach((b, k) => { b.material.color.setHex(Math.sin(t * 5) > 0 ? 0xffa21a : 0x553300); });
        e.crew.forEach((c) => c.rig?.update(dt, { speed: 0.25, t }));
        if (e.said <= 0 && Math.hypot(e.x - player.x, e.z - player.z) < 25) { e.said = 6; talk(e.crew[Math.floor(Math.random() * 3)], e.lines[Math.floor(Math.random() * e.lines.length)], 25, player); }
      }
      if (e.kind === 'football') {
        const on = hour > 16 && hour < 19; e.ball.visible = on; e.kids.forEach((k) => { k.obj.visible = on; });
        if (!on) return;
        e.t += dt;
        // pass the ball round a little square, the receiver trotting to meet it
        const spot = (k) => ({ x: e.at.x + Math.cos(k * 1.57 + Math.sin(e.t * 0.2)) * 3, z: e.at.z + Math.sin(k * 1.57 + Math.sin(e.t * 0.2)) * 2.2 });
        const from = spot(e.holder), to = spot((e.holder + 1 + (Math.floor(e.t) % 2)) % 4), u = (e.t % 1.4) / 1.4;
        e.ball.position.set(from.x + (to.x - from.x) * u, 0.12 + Math.sin(u * Math.PI) * 0.6, from.z + (to.z - from.z) * u);
        if (u + dt / 1.4 >= 1) e.holder = (e.holder + 1 + (Math.floor(e.t) % 2)) % 4;
        e.kids.forEach((k, i) => { const s = spot(i), p = k.obj.position, dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz); if (d > 0.05) { p.x += dx * Math.min(1, dt * 2); p.z += dz * Math.min(1, dt * 2); k.obj.rotation.y = Math.atan2(e.ball.position.x - p.x, e.ball.position.z - p.z); } k.rig?.update(dt, { speed: Math.min(3, d * 2), t, running: d > 0.6 }); });
        if (e.said <= 0 && Math.hypot(e.at.x - player.x, e.at.z - player.z) < 22) { e.said = 5; talk(e.kids[Math.floor(Math.random() * 4)], e.lines[Math.floor(Math.random() * e.lines.length)], 22, player); }
      }
      if (e.kind === 'owambe') {
        e.guests.forEach((g, i) => { g.rig?.update(dt, { speed: 0, t }); g.obj.rotation.y = Math.sin(t * 1.5 + i) * 0.6 + i; if (Math.random() < dt * 0.15) g.rig?.play?.('dance'); });
        if (e.said <= 0 && Math.hypot(e.x - player.x, e.z - player.z) < 25) { e.said = 7; talk(e.guests[Math.floor(Math.random() * e.guests.length)], e.lines[Math.floor(Math.random() * e.lines.length)], 25, player); }
      }
    });
  }
  const today = () => events.map((e) => (e.kind === 'breakdown' ? 'A danfo has broken down on the main road' : e.kind === 'football' ? 'Kids play football on the lawn after school (4 to 7pm)' : `An owambe party at ${e.addr}`));
  const bodies = () => [...hawkers.map((h) => ({ x: h.obj.position.x, z: h.obj.position.z, r: 0.33 }))];
  function dispose() { group.removeFromParent(); }
  return { update, buy, today, bodies, park, police, hawkers, events, dispose };
}
