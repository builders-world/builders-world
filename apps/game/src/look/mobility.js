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
  } else if (kind === 'hover') {
    // a self-balancing hoverboard: two wheels in their shells either side, a foot pad each, a light strip that glows
    const shell = new THREE.MeshStandardMaterial({ color: 0x22336a, roughness: 0.35, metalness: 0.2 }), pad = new THREE.MeshStandardMaterial({ color: 0x1d2028, roughness: 0.9 });
    g.add(new THREE.Mesh(box(0.5, 0.08, 0.2, 0, 0.12, 0), shell));
    [-0.13, 0.13].forEach((x) => g.add(new THREE.Mesh(box(0.17, 0.012, 0.15, x, 0.166, 0), pad)));
    g.add(new THREE.Mesh(box(0.42, 0.02, 0.01, 0, 0.11, 0.101), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.6, 1.8) })));
    const wheels = [-0.3, 0.3].map((x) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 14).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.8 })); w.position.set(x, 0.1, 0); g.add(w); g.add(new THREE.Mesh(box(0.09, 0.06, 0.24, x, 0.2, 0), shell)); return w; });
    g.userData.wheels = wheels;
  } else if (kind === 'scooter') {
    // an electric kick scooter: the deck, a small wheel at each end, the stem up to the handlebar with its grips
    const frame = new THREE.MeshStandardMaterial({ color: 0x3b3f45, roughness: 0.4, metalness: 0.5 }), grip = new THREE.MeshStandardMaterial({ color: 0x1d2028, roughness: 0.9 });
    g.add(new THREE.Mesh(box(0.15, 0.04, 0.56, 0, 0.1, -0.02), frame), new THREE.Mesh(box(0.13, 0.01, 0.48, 0, 0.125, -0.04), grip));
    g.add(new THREE.Mesh(box(0.035, 0.95, 0.035, 0, 0.55, 0.3).rotateX(-0.12), frame));
    g.add(new THREE.Mesh(box(0.46, 0.03, 0.03, 0, 1.0, 0.36), frame), ...[-0.2, 0.2].map((x) => new THREE.Mesh(box(0.07, 0.04, 0.04, x, 1.0, 0.36), grip)));
    g.add(new THREE.Mesh(box(0.06, 0.03, 0.02, 0, 0.92, 0.37), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.8, 1.5) }))); // the headlamp
    const wheels = [0.3, -0.3].map((z) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.045, 14).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1d2028, roughness: 0.8 })); w.position.set(0, 0.085, z); g.add(w); return w; });
    g.userData.wheels = wheels;
  } else [-0.135, 0.135].forEach((x) => { g.add(new THREE.Mesh(box(0.13, 0.05, 0.3, x, 0.05, 0.03), new THREE.MeshStandardMaterial({ color: 0x7d5aa6 }))); [-0.1, 0.1].forEach((z) => g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8).rotateZ(Math.PI / 2).translate(x, 0.03, z), new THREE.MeshStandardMaterial({ color: 0xf2b33d })))); });
  return g;
}

// ---------- roller skates: a pair of quad skates on your own feet ----------
// (Elvis, 10 October 2026: "When using the shoe skate, it should replace the existing footwear, so that way the shoe skate
// actually shows".) Each skate rides its ankle, so it moves with the leg: the boot over where the shoe was, the plate,
// four wheels and a toe stop. The shoes underneath are hidden while the skates are on and come back when they are off.
const SKATE_MAT = { boot: new THREE.MeshStandardMaterial({ color: 0xf4ead2, roughness: 0.55 }), trim: new THREE.MeshStandardMaterial({ color: 0x7d5aa6, roughness: 0.5 }),
  plate: new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.35, metalness: 0.6 }), wheel: new THREE.MeshStandardMaterial({ color: 0xf2b33d, roughness: 0.45 }), stop: new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.9 }) };
const WHEEL_R = 0.032, WHEEL_GEO = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.034, 12).rotateZ(Math.PI / 2);
const FOOT_Y = 0.15; // the ankle's height over the ground when standing (anim.js: HIP_Y - THIGH - SHIN)
// the shoe's box in the ankle's frame (its own geometry, scaled and placed by the wardrobe), or a sensible default
function shoeBox(ankle) {
  const s = ankle.children.find((c) => c.isMesh && !c.userData.skate && c.scale.z > 0.2);
  if (!s) return { x0: -0.08, x1: 0.08, y0: -0.1, y1: 0.06, z0: -0.125, z1: 0.235 };
  if (!s.geometry.boundingBox) s.geometry.computeBoundingBox();
  const b = s.geometry.boundingBox, S = s.scale, P = s.position;
  return { x0: P.x + b.min.x * S.x, x1: P.x + b.max.x * S.x, y0: P.y + b.min.y * S.y, y1: P.y + b.max.y * S.y, z0: P.z + b.min.z * S.z, z1: P.z + b.max.z * S.z };
}
export function skateBoot(ankle) {
  const q = shoeBox(ankle), g = new THREE.Group(); g.userData.skate = true;
  const w = q.x1 - q.x0 + 0.03, d = q.z1 - q.z0 + 0.02, cz = (q.z0 + q.z1) / 2, bot = q.y0;
  const top = Math.max(q.y1 + 0.09, bot + 0.2); // a high boot: the cuff comes up round the ankle
  g.add(new THREE.Mesh(box(w, q.y1 - bot + 0.01, d, 0, (bot + q.y1) / 2, cz), SKATE_MAT.boot)); // the foot
  g.add(new THREE.Mesh(box(w, top - q.y1, d * 0.55, 0, (q.y1 + top) / 2, q.z0 + d * 0.3), SKATE_MAT.boot)); // the cuff
  g.add(new THREE.Mesh(box(w + 0.006, 0.03, d * 0.56, 0, top - 0.02, q.z0 + d * 0.3), SKATE_MAT.trim)); // its padded rim
  g.add(new THREE.Mesh(box(w + 0.004, 0.022, d + 0.004, 0, bot + 0.011, cz), SKATE_MAT.trim)); // the sole
  g.add(new THREE.Mesh(box(w * 0.8, 0.018, d * 0.92, 0, bot - 0.009, cz), SKATE_MAT.plate)); // the plate
  const wy = bot - 0.018 - WHEEL_R, wheels = [];
  [cz - d * 0.34, cz + d * 0.3].forEach((z) => [-1, 1].forEach((sx) => { const m = new THREE.Mesh(WHEEL_GEO, SKATE_MAT.wheel); m.position.set(sx * (w / 2 - 0.006), wy, z); g.add(m); wheels.push(m); }));
  g.add(new THREE.Mesh(box(0.05, 0.045, 0.05, 0, wy + 0.004, q.z1 + 0.012), SKATE_MAT.stop)); // the toe stop
  g.userData.wheels = wheels;
  // how far the wheels lift you: from the shoe's sole on the ground to the wheels' bottom
  g.userData.lift = Math.max(0, Math.min(0.12, -FOOT_Y - (wy - WHEEL_R)));
  return g;
}
// a skater's body (after how people skate: knees bent, weight forward over the skates, each stride pushed out to the
// side and back, the arms swinging across against the legs; a T-stop with the back skate turned across; arms out and
// circling when the balance goes). The hips drop as the knees bend, so the wheels stay on the ground.
const THIGH = 0.34, SHIN = 0.33, HIP_Y = 0.82;
export function skaterPose(rig, { t = 0, push = false, brake = false, v = 0, wob = 0, down = 0 } = {}) {
  const { L, R } = rig;
  let lh = -0.3, lk = 0.6, rh = -0.3, rk = 0.6, lz = 0, rz = 0, ry = 0, chestX = 0.16, armL = 0.1, armR = 0.1, armZ = 0.14, twist = 0;
  if (down > 0) { lh = -1.15; lk = 1.9; rh = -0.9; rk = 1.6; chestX = 0.55; armL = armR = -1.1; armZ = 0.3; }
  else if (brake) { lh = -0.35; lk = 0.7; rh = 0.35; rk = 0.2; ry = -1.3; chestX = 0.1; armZ = 0.4; }
  else if (push && v > 0.2) {
    const ph = Math.sin(t * (1.2 + v * 0.22) * Math.PI), pl = Math.max(0, ph), pr = Math.max(0, -ph);
    lh = -0.38 + pl * 0.68; lk = 0.75 - pl * 0.58; lz = pl * 0.38;
    rh = -0.38 + pr * 0.68; rk = 0.75 - pr * 0.58; rz = -pr * 0.38;
    armL = ph * 0.6; armR = -ph * 0.6; chestX = 0.22; twist = ph * 0.14;
  }
  rig.chest.rotation.x = chestX; rig.chest.rotation.y = twist; rig.chest.rotation.z = 0;
  if (wob > 0.02 && !down) { const w1 = Math.sin(t * 7.3) * wob, w2 = Math.sin(t * 5.1 + 1) * wob; armZ += 0.95 * wob; armL += w1 * 1.3; armR -= w2 * 1.3; rig.chest.rotation.z = w1 * 0.16; }
  L.hip.rotation.set(lh, 0, lz); R.hip.rotation.set(rh, ry, rz); L.knee.rotation.x = lk; R.knee.rotation.x = rk;
  L.ankle.rotation.set(-(lh + lk), 0, -lz); R.ankle.rotation.set(-(rh + rk), 0, -rz); // soles flat on the ground
  L.shoulder.rotation.x = -armL; R.shoulder.rotation.x = -armR; L.shoulder.rotation.z = armZ; R.shoulder.rotation.z = -armZ;
  L.elbow.rotation.x = -0.35; R.elbow.rotation.x = -0.35;
  const vert = (h, k, z) => (THIGH * Math.cos(h) + SHIN * Math.cos(h + k)) * Math.cos(z);
  rig.pelvis.position.y = HIP_Y - (THIGH + SHIN - Math.max(vert(lh, lk, lz), vert(rh, rk, rz)));
}

// skates off: the sideways turns only the skater's pose uses go back to straight (the walk drives only the forward ones)
export function unskatePose(rig) { if (!rig) return; [rig.L, rig.R].forEach((sd) => { sd.hip.rotation.y = 0; sd.hip.rotation.z = 0; sd.ankle.rotation.z = 0; }); rig.chest.rotation.y = 0; }

/** Put skates on a rigged avatar's feet (hiding its shoes), or take them off. Returns the lift in metres. */
export function wearSkates(rig, on) {
  let lift = 0;
  [rig?.L, rig?.R].forEach((side) => {
    if (!side?.ankle) return;
    const old = side.ankle.children.find((c) => c.userData.skate);
    if (old && !on) old.removeFromParent();
    // the shoes and any heel on the ankle, and a boot's shaft on the shin (style.js), go while the skates are on
    side.ankle.children.forEach((c) => { if (c.isMesh) c.visible = !on; });
    side.knee?.children.forEach((c) => { if (c.isMesh && c.scale.x < 0.5) c.visible = !on; });
    if (on) { const b = old || skateBoot(side.ankle); if (!old) side.ankle.add(b); lift = b.userData.lift; }
  });
  return lift;
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
  let mode = null, ride = null; // mode: 'bike' | 'skate' | 'skates' | 'hover' | 'scooter'
  const carry = { skate: false, skates: false, hover: false, scooter: false };
  // the bag's things you roll on, and the ride each one is; the one put on last is the one you ride
  const ROLL = { skateboard: 'skate', skates: 'skates', hoverboard: 'hover', scooter: 'scooter' };
  let order = [];
  // skates on your feet win: you cannot stand on a board in them (Elvis, 10 October 2026), so a board you carry waits
  const next = () => { const k = carry.skates ? 'skates' : [...order].reverse().find((m) => carry[m]); if (k) mount(k); };
  const RIDE_NAME = { skate: 'skateboard', hover: 'hoverboard', scooter: 'scooter' };
  function mount(kind) {
    unmount(true);
    mode = kind;
    // skates go on your feet (wearSkates, in pose, once the rig is known); everything else is a thing under you
    ride = kind === 'bike' ? bikeModel(0x2a9d94) : kind === 'skates' ? new THREE.Group() : boardModel(kind);
    avatar.add(ride);
    if (kind === 'skates') { sk.v = 0; sk.on = true; tutorial(); }
    if (kind === 'bike') ride.position.z = 0.08;
    return true;
  }
  function unmount(quiet) {
    if (ride) { ride.removeFromParent(); ride = null; }
    avatar.position.y = 0;
    const was = mode; mode = null;
    if (was === 'skates') { sk.on = false; sk.v = 0; if (sk.rig) { wearSkates(sk.rig, false); unskatePose(sk.rig); sk.rig = null; } tut.el?.classList.remove('on'); }
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
    if (id === 'bicycle') { carry.bike = on; if (on) { mount('bike'); ride.userData.own = true; } else if (mode === 'bike' && ride?.userData.own) { unmount(true); next(); } return; }
    const m = ROLL[id]; if (!m) return;
    carry[m] = on; order = order.filter((q) => q !== m); if (on) order.push(m);
    if (mode === 'bike') return;
    // in roller skates you carry a board, you do not ride it; skates on, you step off whatever you were on
    if (on && m !== 'skates' && carry.skates) { toast(`Not in roller skates. Your ${RIDE_NAME[m]} is in your hand: take the skates off (bag, Gadgets) to ride it.`, 3600); return; }
    if (on && m === 'skates' && mode && mode !== 'skates') toast(`You step off the ${RIDE_NAME[mode]} and lace up your skates. Your shoes go in the bag.`, 3200);
    if (on) mount(m); else if (mode === m) { unmount(true); next(); }
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
  const pace = (running) => (mode === 'bike' && walking() ? 1.9 : mode === 'bike' ? (running ? 9 : 6.5) : mode === 'skate' ? (running ? 7 : 5) : mode === 'skates' ? sk.v : mode === 'hover' ? (running ? 6 : 4.4) : mode === 'scooter' ? (running ? 8 : 5.8) : null);
  // ---------- skating: momentum, balance, a first lesson ----------
  // (Elvis, 10 October 2026: "improve the physics of how the skating works. And also, it's a short tutorial on how people
  // can learn and also balance for the skates".) You build speed stride by stride, roll on when you let go, steer in
  // curves, and stop with a T-stop (press back). New skaters are slower and wobble; going flat out too soon puts you on
  // the ground. Balance grows with every metre skated and is kept on this device.
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } } };
  const sk = { v: 0, on: false, rig: null, lift: 0, skill: +store.get('bw-skate-skill', 0) || 0, saved: 0, push: false, brake: false, glide: 0, wob: 0, stumble: 0, lastFall: -99, clock: 0 };
  function skate(dt, { push = false, brake = false, running = false, turn = 0 } = {}) {
    sk.clock += dt;
    const top = (running ? 6.6 : 4.6) * (0.62 + 0.38 * sk.skill);
    if (sk.stumble > 0) { sk.stumble -= dt; sk.v = Math.max(0, sk.v - 9 * dt); sk.push = sk.brake = false; return sk.v; }
    const was = sk.v;
    if (brake) sk.v = Math.max(0, sk.v - 5.5 * dt); // a T-stop: the back skate dragged across
    else if (push) sk.v = sk.v < top ? Math.min(top, sk.v + (1.6 + 1.6 * sk.skill) * dt) : Math.max(top, sk.v - 1.5 * dt); // stride by stride
    else sk.v = Math.max(0, sk.v - 0.85 * dt); // rolling on
    sk.push = push && sk.v > 0.2; sk.brake = brake && sk.v > 0.1;
    sk.glide = !push && !brake && sk.v > 1 ? sk.glide + dt : 0;
    // balance: the less practised you are and the faster you go, the more you wobble; flat out too soon, you fall
    const edge = sk.v / (4.6 * (0.62 + 0.38 * sk.skill));
    sk.wob = (1 - sk.skill) * Math.max(0, Math.min(1, (edge - 0.45) * 1.6 + (running ? 0.3 : 0)));
    if (running && sk.skill < 0.3 && sk.v > 3.6 && sk.clock - sk.lastFall > 18 && Math.random() < dt * 0.5) {
      sk.stumble = 1.1; sk.lastFall = sk.clock;
      toast('Whoa, down you go! Bend your knees and keep your weight forward. Practise at a walking pace first.', 4200);
    }
    sk.skill = Math.min(1, sk.skill + (sk.v * dt) / 600); // about 600 m of skating to be steady
    if (sk.clock - sk.saved > 3) { sk.saved = sk.clock; store.set('bw-skate-skill', +sk.skill.toFixed(3)); }
    lesson(dt, { was, turn });
    return sk.v;
  }
  // the wheels stand on what is drawn under you: pavements, roads and park paths are drawn a little above the ground
  // people walk on (shoes hide the difference; a skate's wheels would not). The flat surfaces are found once, then a ray
  // straight down a few times a second; the height eases, so a kerb is a step, not a jolt.
  const surf = { list: null, t: 0, off: 0, rc: new THREE.Raycaster(), o: new THREE.Vector3(), d: new THREE.Vector3(0, -1, 0), box: new THREE.Box3() };
  function surfaceUnder(dt) {
    if (!surf.list) {
      let top = avatar; while (top.parent) top = top.parent;
      surf.list = []; top.updateMatrixWorld(true);
      top.traverse((o) => { if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.geometry || !o.visible) return; for (let a = o; a; a = a.parent) if (a === avatar) return; surf.box.setFromObject(o); if (surf.box.max.y < 0.7 && surf.box.min.y > -1.5 && surf.box.max.x - surf.box.min.x > 3) surf.list.push(o); });
    }
    surf.t -= dt;
    if (surf.t <= 0) {
      surf.t = 0.12;
      avatar.parent?.getWorldPosition(surf.o); const gy = surf.o.y; surf.o.y += 0.5; surf.rc.set(surf.o, surf.d); surf.rc.far = 0.9;
      let best = 0; for (const h of surf.rc.intersectObjects(surf.list, false)) if (h.point.y - gy < 0.3 && (!h.face || h.face.normal.y > 0.5)) best = Math.max(best, h.point.y - gy);
      surf.want = best;
    }
    surf.off += ((surf.want ?? 0) - surf.off) * Math.min(1, dt * 14);
    return surf.off;
  }

  // knocked into something: you stop
  const bump = () => { if (sk.v > 2.5) toast('Oof. Skates do not stop for walls: press back for a T-stop.', 2600); sk.v *= 0.2; };

  // the first time you put skates on, a short lesson in four steps that tick as you do them
  const tut = { el: null, done: !!store.get('bw-skate-tut', false), steps: [false, false, false, false], turned: 0, braked: 0 };
  const STEPS = [['Push', 'Hold W: each stride adds speed'], ['Glide', 'Let go: you keep rolling'], ['Turn', 'Steer in wide curves while you roll'], ['Stop', 'Press back (S) for a T-stop']];
  function tutorial() {
    if (tut.done) return;
    if (!tut.el) {
      const st = document.createElement('style');
      st.textContent = `#lk-skate { position: fixed; left: 50%; top: 92px; z-index: 17; transform: translate(-50%, -8px); opacity: 0; pointer-events: none; transition: opacity .25s, transform .25s; width: min(420px, calc(100vw - 32px)); box-sizing: border-box; padding: 12px 14px; border-radius: 18px; background: #f7efdc; color: #3b2a20; font-family: "Baloo 2", system-ui, sans-serif; box-shadow: 0 2px 0 rgba(59,42,32,.14), 0 14px 30px rgba(10,14,30,.22); }
        #lk-skate.on { opacity: 1; transform: translate(-50%, 0); }
        #lk-skate h4 { margin: 0 0 8px; font: 800 15px/1.1 inherit; } #lk-skate h4 small { font: 700 12px/1 inherit; color: #7a6552; margin-left: 6px; }
        #lk-skate ol { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 0; padding: 0; list-style: none; }
        #lk-skate li { padding: 7px 8px; border-radius: 12px; background: #efe4c9; font: 800 13px/1.1 inherit; } #lk-skate li small { display: block; margin-top: 3px; font: 600 11px/1.25 inherit; color: #7a6552; }
        #lk-skate li.d { background: #d9efe9; } #lk-skate li.d b::after { content: ' ✓'; color: #2a9d94; }
        #lk-skate .bal { display: flex; align-items: center; gap: 8px; margin-top: 8px; font: 700 12px/1 inherit; color: #7a6552; } #lk-skate .bal i { flex: 1; height: 6px; border-radius: 3px; background: #e3d4b4; overflow: hidden; } #lk-skate .bal i b { display: block; height: 100%; background: #2a9d94; }`;
      document.head.appendChild(st);
      tut.el = document.createElement('div'); tut.el.id = 'lk-skate'; tut.el.setAttribute('role', 'status'); document.body.appendChild(tut.el);
    }
    renderLesson(); tut.el.classList.add('on');
  }
  function renderLesson() {
    if (!tut.el) return;
    tut.el.innerHTML = `<h4>Roller skates<small>${tut.steps.every(Boolean) ? 'You have got it' : 'a first lesson'}</small></h4><ol>${STEPS.map(([b, s], i) => `<li class="${tut.steps[i] ? 'd' : ''}"><b>${b}</b><small>${s}</small></li>`).join('')}</ol><div class="bal">Balance<i><b style="width:${Math.round(sk.skill * 100)}%"></b></i>${Math.round(sk.skill * 100)}%</div>`;
  }
  let lessonDraw = 0;
  function lesson(dt, { was, turn }) {
    if (tut.done || !tut.el) return;
    const before = tut.steps.join();
    if (sk.push && sk.v > 1.5) tut.steps[0] = true;
    if (sk.glide > 0.8) tut.steps[1] = true;
    if (sk.v > 1) { tut.turned += Math.abs(turn); if (tut.turned > 1.2) tut.steps[2] = true; }
    if (sk.brake) tut.braked = Math.max(tut.braked, was); if (tut.braked > 1.5 && sk.v < 0.3) tut.steps[3] = true;
    lessonDraw -= dt;
    if (tut.steps.join() !== before || lessonDraw <= 0) { lessonDraw = 1; renderLesson(); }
    if (tut.steps.every(Boolean)) {
      tut.done = true; store.set('bw-skate-tut', true); renderLesson();
      toast('Lesson done. Shift skates faster once your balance is up; until then you may wobble.', 3800);
      setTimeout(() => tut.el?.classList.remove('on'), 3500);
    }
  }

  // the pose over the rig: pedalling, or one foot pushing
  let t = 0;
  function pose(rig, dt, speed, indoors) {
    if (!ride) return;
    ride.visible = !indoors;
    // skates live on the feet: put on with this rig (and again if the wardrobe redressed you), off indoors
    if (mode === 'skates') {
      if (indoors) { if (sk.rig) { wearSkates(sk.rig, false); unskatePose(sk.rig); sk.rig = null; } tut.el?.classList.remove('on'); avatar.position.y = 0; surf.off = 0; return; }
      if (rig && (sk.rig !== rig || !rig.L.ankle.children.some((c) => c.userData.skate) || rig.L.ankle.children.some((c) => c.isMesh && c.visible))) { sk.rig = rig; sk.lift = wearSkates(rig, true); if (!tut.done) tutorial(); }
    }
    if (indoors) { avatar.position.y = 0; return; }
    t += dt * (reduced ? 0.5 : 1);
    // every ride lifts you off the ground by its own height (this is the body inside the player: main.js keeps the player on the ground)
    if (mode === 'bike') {
      avatar.position.y = 0.32; // up on the saddle
      const a = t * (2 + speed * 1.4);
      ride.position.y = -0.32;
      ride.userData.crank.rotation.x = a; ride.userData.wheels.forEach((w) => { w.rotation.x -= dt * speed * 3.2; });
      if (rig) { rig.L.hip.rotation.x = -0.9 + Math.sin(a) * 0.45; rig.R.hip.rotation.x = -0.9 - Math.sin(a) * 0.45; rig.L.knee.rotation.x = 1.0 - Math.cos(a) * 0.45; rig.R.knee.rotation.x = 1.0 + Math.cos(a) * 0.45; rig.L.shoulder.rotation.x = -0.7; rig.R.shoulder.rotation.x = -0.7; rig.chest.rotation.x = 0.25; }
    } else if (mode === 'hover' || mode === 'scooter') {
      // standing, both feet on: a hoverboard goes where you lean, a scooter where the handlebar points
      const lift = mode === 'hover' ? 0.17 : 0.13;
      avatar.position.y = lift;
      ride.position.y = -lift;
      ride.userData.wheels.forEach((w) => { if (mode === 'hover') w.rotation.x -= dt * speed * 10; else w.rotation.x -= dt * speed * 11.8; });
      const lean = Math.min(1, speed / 5);
      if (mode === 'hover') ride.rotation.x = -lean * 0.08; // the deck tips forward as you lean
      if (rig) {
        const sway = Math.sin(t * 1.6) * 0.04;
        rig.L.hip.rotation.x = -0.05; rig.R.hip.rotation.x = mode === 'scooter' ? 0.25 : -0.05; rig.L.knee.rotation.x = 0.12; rig.R.knee.rotation.x = mode === 'scooter' ? 0.2 : 0.12;
        rig.chest.rotation.x = lean * (mode === 'hover' ? 0.18 : 0.12) + sway; rig.chest.rotation.y = 0;
        if (mode === 'scooter') { rig.L.shoulder.rotation.x = -0.75; rig.R.shoulder.rotation.x = -0.75; } // hands on the grips
        else { rig.L.shoulder.rotation.z = 0.25; rig.R.shoulder.rotation.z = -0.25; } // arms a little out, for balance
      }
    } else if (mode === 'skates') {
      avatar.position.y = sk.lift + surfaceUnder(dt);
      if (sk.rig) [sk.rig.L, sk.rig.R].forEach((sd) => sd.ankle.children.forEach((c) => c.userData.wheels?.forEach((w) => { w.rotation.x -= dt * speed / WHEEL_R; })));
      if (rig) skaterPose(rig, { t, push: sk.push, brake: sk.brake, v: speed, wob: sk.wob, down: sk.stumble });
    } else {
      avatar.position.y = 0.13;
      ride.position.y = -0.13;
      ride.rotation.y = Math.PI / 2 * 0.6;
      if (rig) {
        const push = speed > 0.3 ? Math.max(0, Math.sin(t * 3)) : 0;
        rig.L.hip.rotation.x = 0.1; rig.L.knee.rotation.x = 0.25; rig.R.hip.rotation.x = -push * 0.6 + 0.1; rig.R.knee.rotation.x = 0.2 + push * 0.4; rig.chest.rotation.y = 0.5;
      }
    }
  }

  // ---------- people on wheels ----------
  const riders = [];
  const pathLoop = (pts, speed, kind, look, name) => {
    const av = createAvatarModel({ color: '#888', style: 'tee' }); prepareLook(av.root); const rig = rigAvatar(av.root); dress(av.root, look, rig);
    const holder = new THREE.Group(); holder.add(av.root);
    // a board under a skater; skates on a roller skater's own feet
    if (kind === 'skates') av.root.position.y = (rig ? wearSkates(rig, true) : 0) + (kind === 'skates' ? 0.09 : 0); // on the pond's paved loop (parks.js draws it 9 cm up) else { const board = boardModel(kind); holder.add(board); av.root.position.y = 0.13; board.position.y = 0; board.rotation.y = Math.PI / 2 * 0.6; }
    group.add(holder);
    const lens = [0]; for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
    riders.push({ holder, av, rig, pts, lens, total: lens[lens.length - 1], s: Math.random() * lens[lens.length - 1], speed, kind, name, hop: 0 });
  };
  const skPark = (props.pois || []).find((q) => /Skate Park/.test(q.name));
  if (skPark) {
    // round the pad, over the funbox in the middle
    // a figure of eight on the flat between the quarter pipes, clear of the funbox in the middle
    const loop = []; for (let i = 0; i <= 32; i++) { const a = (i / 32) * Math.PI * 2; loop.push({ x: skPark.x + Math.sin(a) * 4.6, z: skPark.z + Math.sin(a * 2) * 2.4 + (Math.cos(a) > 0 ? 3.6 : -3.6) * 0 + Math.cos(a) * 0.0 + (Math.sin(a * 2) >= 0 ? 0 : 0) }); }
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
      if (r.rig) { if (r.kind === 'skate') { r.rig.R.hip.rotation.x = -push * 0.5; r.rig.R.knee.rotation.x = 0.2 + push * 0.3; r.rig.chest.rotation.y = 0.5; } else { skaterPose(r.rig, { t: tt + r.speed, push: true, v: r.speed, wob: 0 }); r.rig.L.ankle.children.forEach((c) => c.userData.wheels?.forEach((w) => { w.rotation.x -= dt * r.speed / WHEEL_R; })); r.rig.R.ankle.children.forEach((c) => c.userData.wheels?.forEach((w) => { w.rotation.x -= dt * r.speed / WHEEL_R; })); } }
    });
  }
  const bodies = () => riders.map((r) => ({ x: r.holder.position.x, z: r.holder.position.z, r: 0.35 }));
  function dispose() { group.removeFromParent(); }
  return { use, equip, pace, pose, update, bodies, unmount, skate, bump, get mode() { return mode; }, get skating() { return mode === 'skates' ? { v: sk.v, push: sk.push, brake: sk.brake, surf: { n: surf.list?.length, want: surf.want, off: surf.off }, skill: sk.skill, wob: sk.wob, down: sk.stumble > 0, lesson: tut.done ? null : tut.steps.slice() } : null; }, docks, riders, dispose };
}
