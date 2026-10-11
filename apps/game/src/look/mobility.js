import * as THREE from 'three';
import { createAvatarModel } from '../onboarding/avatar.js';
import { rigAvatar } from './anim.js';
import { prepareLook, dress, lookFor } from './style.js';
import { signTexture } from './props.js';
import { findSite } from './parks.js';
import { walletEngine, fmt } from './wallet.js';
import { sfx } from './audio.js';
import { cityInfo } from './cityinfo.js';

// Getting about on wheels (world bible 9.5). Yaba Bikes docks by the parks, the hub and the motor
// park: rent a bike (E) and ride it, pedalling; E again to hop off and leave it. A skateboard and roller
// skates in your bag (Gadgets): carry one and you roll instead of walk. And people do the same: skaters
// at the skate park, a roller skater round the pond, cyclists in the traffic.

const RENT = 100;
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const metal = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.5 });

export function bikeModel(color = 0x2a9d94) {
  const g = new THREE.Group(), frame = metal(color), dark = new THREE.MeshStandardMaterial({ color: 0x161618, roughness: 0.7 });
  const wheels = [0.55, -0.55].map((z) => { const w = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.035, 6, 20).rotateY(Math.PI / 2), dark); w.position.set(0, 0.34, z); g.add(w); return w; });
  g.add(new THREE.Mesh(box(0.05, 0.05, 0.9, 0, 0.62, 0), frame), new THREE.Mesh(box(0.05, 0.5, 0.05, 0, 0.6, -0.12).rotateX(0.25), frame), new THREE.Mesh(box(0.05, 0.55, 0.05, 0, 0.62, 0.5).rotateX(-0.3), frame));
  g.add(new THREE.Mesh(box(0.2, 0.05, 0.28, 0, 0.92, -0.18), dark), new THREE.Mesh(box(0.5, 0.04, 0.04, 0, 0.98, 0.5), dark));
  const crank = new THREE.Group(); crank.position.set(0, 0.34, 0); crank.add(new THREE.Mesh(box(0.03, 0.34, 0.04), dark)); g.add(crank);
  g.userData = { wheels, crank };
  return g;
}
function boardModel(kind) {
  const g = new THREE.Group();
  if (kind === 'skate') {
    g.add(new THREE.Mesh(box(0.22, 0.03, 0.8, 0, 0.1, 0), new THREE.MeshStandardMaterial({ color: 0xe46f4f, roughness: 0.6 })));
    [[-0.08, 0.27], [0.08, 0.27], [-0.08, -0.27], [0.08, -0.27]].forEach(([x, z]) => g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 10).rotateZ(Math.PI / 2).translate(x, 0.04, z), new THREE.MeshStandardMaterial({ color: 0xf4ead2 }))));
  } else [-0.135, 0.135].forEach((x) => { g.add(new THREE.Mesh(box(0.13, 0.05, 0.3, x, 0.05, 0.03), new THREE.MeshStandardMaterial({ color: 0x7d5aa6 }))); [-0.1, 0.1].forEach((z) => g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8).rotateZ(Math.PI / 2).translate(x, 0.03, z), new THREE.MeshStandardMaterial({ color: 0xf2b33d })))); });
  return g;
}

export function createMobility({ world, scene, props, avatar, toast, used = [], reduced, park }) {
  const group = new THREE.Group(); group.name = 'mobility'; scene.add(group);
  // ---------- docks ----------
  const docks = [];
  const anchors = (props.pois || []).filter((q) => /Pond Park|Skate|Creative Hub|Motor Park|Water Park/.test(q.name)).slice(0, 4);
  anchors.forEach((a, k) => {
    const at = findSite(world, used, 7, 3) && null; void at;
    // a spot near the place, on open ground
    let spot = null;
    for (let r = 4; r < 22 && !spot; r += 1.5) for (let i = 0; i < 12 && !spot; i++) { const ang = (i / 12) * Math.PI * 2, x = a.x + Math.cos(ang) * r, z = a.z + Math.sin(ang) * r; let ok = true; for (let u = -3; u <= 3 && ok; u += 1) for (let v = -1; v <= 1 && ok; v += 1) if (!(world.costAt?.(x + u, z + v) < 2.6) || world.onCarriageway?.(x + u, z + v, 0.3) || world.onRail?.(x + u, z + v, 0.3)) ok = false; if (ok && !used.some((q) => Math.abs(q.x - x) < q.W / 2 + 3.5 && Math.abs(q.z - z) < q.D / 2 + 1.5)) spot = { x, z }; }
    if (!spot) return;
    used.push({ x: spot.x, z: spot.z, W: 7, D: 3 });
    const g = new THREE.Group(); g.position.set(spot.x, 0, spot.z); group.add(g);
    g.add(new THREE.Mesh(box(6.2, 0.05, 0.12, 0, 0.55, -0.45), metal(0x2b2f33)), new THREE.Mesh(box(0.25, 1.4, 0.25, -3.4, 0.7, 0), metal(0x2a9d94)));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.45), new THREE.MeshBasicMaterial({ map: signTexture('YABA BIKES', { bg: '#2a9d94', w: 400, h: 180, sub: `${RENT} per ride` }), color: 0xdddddd })); sign.position.set(-3.4, 1.6, 0.13); g.add(sign);
    const bikes = [];
    for (let i = 0; i < 5; i++) { if ((k + i) % 4 === 3) continue; const b = bikeModel([0x2a9d94, 0xe46f4f, 0xf2b33d][i % 3]); b.position.set(-2.2 + i * 1.1, 0, 0); b.rotation.y = 0; b.scale.setScalar(0.95); g.add(b); bikes.push(b); }
    world.addColliders?.([{ name: 'bike_dock', cx: spot.x, cz: spot.z - 0.2, hx: 3.2, hz: 0.6, ry: 0, h: 1.0 }]);
    const it = { id: `dock:${docks.length}`, label: `Rent a bike (${cityInfo().bikes || 'Yaba Bikes'})`, x: spot.x, z: spot.z + 1.6, r: 2.4 };
    props.interact.push(it);
    props.pois?.push({ kind: 'bus', name: `${cityInfo().bikes || 'Yaba Bikes'} dock`, x: spot.x, z: spot.z });
    docks.push({ g, bikes, it, x: spot.x, z: spot.z });
  });

  // ---------- you, on wheels ----------
  let mode = null, ride = null; // mode: 'bike' | 'skate' | 'skates'
  const carry = { skate: false, skates: false };
  function mount(kind) {
    unmount(true);
    mode = kind;
    ride = kind === 'bike' ? bikeModel(0x2a9d94) : boardModel(kind);
    avatar.add(ride);
    if (kind === 'bike') ride.position.z = 0.08;
    return true;
  }
  function unmount(quiet) {
    if (ride) { ride.removeFromParent(); ride = null; }
    avatar.position.y = 0;
    const was = mode; mode = null;
    if (!quiet && was === 'bike') toast('You hop off. The bike rolls itself back to the nearest dock.', 2600);
    return true;
  }
  function use(id, player) {
    if (id.startsWith('dock:')) {
      if (mode === 'bike') { unmount(); sfx('interact'); toast(`Bike docked. Thanks for riding ${cityInfo().bikes || 'Yaba Bikes'}!`, 2400); return true; }
      if (!walletEngine().spend(RENT, `${cityInfo().bikes || 'Yaba Bikes'} ride`)) { toast(`A ride is ${fmt(RENT)} Efforts.`, 2200); return true; }
      mount('bike'); sfx('arrive'); toast('Off you go! Ride with W, E to hop off anywhere.', 3200);
      return true;
    }
    return false;
  }
  // the bag's gadgets: carrying a board or skates means you roll
  function equip(id, on) {
    // your own bicycle (shop.js): carried, you ride it, no dock and no fare; put back in the bag, you walk
    if (id === 'bicycle') { carry.bike = on; if (on) { mount('bike'); ride.userData.own = true; } else if (mode === 'bike' && ride?.userData.own) { unmount(true); if (carry.skate) mount('skate'); else if (carry.skates) mount('skates'); } return; }
    if (id !== 'skateboard' && id !== 'skates') return;
    carry[id === 'skateboard' ? 'skate' : 'skates'] = on;
    if (mode === 'bike') return;
    if (on) mount(id === 'skateboard' ? 'skate' : 'skates'); else if (mode === (id === 'skateboard' ? 'skate' : 'skates')) { unmount(true); if (carry.skate) mount('skate'); else if (carry.skates) mount('skates'); }
  }
  // speed: a bike is quick, a board quicker than walking, skates in between
  // on a pavement beside a cycle lane, or up on a footbridge, you get off and walk the bike (cycling.js)
  let walkedAt = -99; const here = new THREE.Vector3();
  const walking = () => {
    if (mode !== 'bike' || !world.noCycling) return false;
    avatar.getWorldPosition(here); if (!world.noCycling(here.x, here.z, here.y - 0.32)) return false;
    const now = performance.now() / 1000; if (now - walkedAt > 12) toast('No cycling here: you walk the bike. Ride in the green cycle lane or on the road.', 3200); walkedAt = now;
    return true;
  };
  const pace = (running) => (mode === 'bike' && walking() ? 1.9 : mode === 'bike' ? (running ? 9 : 6.5) : mode === 'skate' ? (running ? 7 : 5) : mode === 'skates' ? (running ? 6.5 : 4.5) : null);
  // the pose over the rig: pedalling, or one foot pushing
  let t = 0;
  function pose(rig, dt, speed, indoors) {
    if (!ride) return;
    ride.visible = !indoors;
    if (indoors) { avatar.position.y = 0; return; }
    t += dt * (reduced ? 0.5 : 1);
    if (mode === 'bike') {
      avatar.position.y = 0.32; // up on the saddle
      const a = t * (2 + speed * 1.4);
      ride.position.y = -0.32;
      ride.userData.crank.rotation.x = a; ride.userData.wheels.forEach((w) => { w.rotation.x -= dt * speed * 3.2; });
      if (rig) { rig.L.hip.rotation.x = -0.9 + Math.sin(a) * 0.45; rig.R.hip.rotation.x = -0.9 - Math.sin(a) * 0.45; rig.L.knee.rotation.x = 1.0 - Math.cos(a) * 0.45; rig.R.knee.rotation.x = 1.0 + Math.cos(a) * 0.45; rig.L.shoulder.rotation.x = -0.7; rig.R.shoulder.rotation.x = -0.7; rig.chest.rotation.x = 0.25; }
    } else {
      avatar.position.y = mode === 'skate' ? 0.13 : 0.06;
      ride.position.y = -avatar.position.y;
      if (mode === 'skate') { ride.rotation.y = Math.PI / 2 * 0.6; }
      if (rig) {
        const push = speed > 0.3 ? Math.max(0, Math.sin(t * 3)) : 0;
        if (mode === 'skate') { rig.L.hip.rotation.x = 0.1; rig.L.knee.rotation.x = 0.25; rig.R.hip.rotation.x = -push * 0.6 + 0.1; rig.R.knee.rotation.x = 0.2 + push * 0.4; rig.chest.rotation.y = 0.5; }
        else { const s = Math.sin(t * 4) * Math.min(1, speed / 3); rig.L.hip.rotation.x = s * 0.5; rig.R.hip.rotation.x = -s * 0.5; rig.L.knee.rotation.x = 0.25; rig.R.knee.rotation.x = 0.25; rig.chest.rotation.x = 0.2; }
      }
    }
  }

  // ---------- people on wheels ----------
  const riders = [];
  const pathLoop = (pts, speed, kind, look, name) => {
    const av = createAvatarModel({ color: '#888', style: 'tee' }); prepareLook(av.root); const rig = rigAvatar(av.root); dress(av.root, look, rig);
    const holder = new THREE.Group(); holder.add(av.root); const board = boardModel(kind); holder.add(board); av.root.position.y = kind === 'skate' ? 0.13 : 0.06; board.position.y = 0; if (kind === 'skate') board.rotation.y = Math.PI / 2 * 0.6;
    group.add(holder);
    const lens = [0]; for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
    riders.push({ holder, av, rig, pts, lens, total: lens[lens.length - 1], s: Math.random() * lens[lens.length - 1], speed, kind, name, hop: 0 });
  };
  const sk = (props.pois || []).find((q) => /Skate Park/.test(q.name));
  if (sk) {
    // round the pad, over the funbox in the middle
    // a figure of eight on the flat between the quarter pipes, clear of the funbox in the middle
    const loop = []; for (let i = 0; i <= 32; i++) { const a = (i / 32) * Math.PI * 2; loop.push({ x: sk.x + Math.sin(a) * 4.6, z: sk.z + Math.sin(a * 2) * 2.4 + (Math.cos(a) > 0 ? 3.6 : -3.6) * 0 + Math.cos(a) * 0.0 + (Math.sin(a * 2) >= 0 ? 0 : 0) }); }
    pathLoop(loop, 4.2, 'skate', lookFor('skater-1', { tier: 2 }), 'Dayo');
    pathLoop([...loop].reverse(), 3.8, 'skate', lookFor('skater-2', { fem: true, tier: 1 }), 'Temi');
  }
  // round the pond on its paved loop (1.8 m out from the water, parks.js)
  if (park) { const loop = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; loop.push({ x: park.x + Math.cos(a) * (park.rx - 1.2), z: park.z + Math.sin(a) * (park.rz - 1.2) }); } pathLoop(loop, 3.2, 'skates', lookFor('rollergirl', { fem: true, tier: 0 }), 'Ify'); }

  function update(dt, tt) {
    riders.forEach((r) => {
      r.s = (r.s + r.speed * dt * (reduced ? 0.5 : 1)) % r.total;
      let i = 1; while (i < r.lens.length - 1 && r.lens[i] < r.s) i++;
      const a = r.pts[i - 1], b = r.pts[i], u = (r.s - r.lens[i - 1]) / ((r.lens[i] - r.lens[i - 1]) || 1);
      const x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u, yaw = Math.atan2(b.x - a.x, b.z - a.z);
      // ride on whatever is under the wheels (the funbox, a ramp), tipped with its slope
      const fx = Math.sin(yaw) * 0.4, fz = Math.cos(yaw) * 0.4, feet = (r.gy || 0) + 0.3;
      const gy = world.groundAt?.(x, z, feet) ?? 0, ahead = world.groundAt?.(x + fx, z + fz, feet + 0.3) ?? 0, back = world.groundAt?.(x - fx, z - fz, feet + 0.3) ?? 0;
      r.gy = gy;
      r.holder.position.set(x, gy, z);
      r.holder.rotation.set(-Math.atan2(ahead - back, 0.8), yaw, 0, 'YXZ');
      // a little ollie now and then, out on the flat
      if (r.kind === 'skate' && gy < 0.02) { const ph = (r.s / r.total * 6) % 1; r.holder.position.y = ph < 0.08 ? Math.sin((ph / 0.08) * Math.PI) * 0.45 : 0; }
      r.rig?.update(dt, { speed: 0, t: tt });
      const push = Math.max(0, Math.sin(tt * 3 + r.speed));
      if (r.rig) { if (r.kind === 'skate') { r.rig.R.hip.rotation.x = -push * 0.5; r.rig.R.knee.rotation.x = 0.2 + push * 0.3; r.rig.chest.rotation.y = 0.5; } else { const s = Math.sin(tt * 4); r.rig.L.hip.rotation.x = s * 0.5; r.rig.R.hip.rotation.x = -s * 0.5; r.rig.chest.rotation.x = 0.2; } }
    });
  }
  const bodies = () => riders.map((r) => ({ x: r.holder.position.x, z: r.holder.position.z, r: 0.35 }));
  function dispose() { group.removeFromParent(); }
  return { use, equip, pace, pose, update, bodies, unmount, get mode() { return mode; }, docks, riders, dispose };
}
