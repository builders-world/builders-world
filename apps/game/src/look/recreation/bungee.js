// Bungee from a crane (Elvis, 13 October 2026: "also paragliding and bungee"). In West and East Africa bungee is mostly
// run off mobile cranes at parks and beach festivals, so that is what comes: a yellow crane with its boom up, a cage on
// the hook, an airbag on the grass under it, a jump master and two crew. The master briefs you on the way up (50 m),
// you shuffle to the edge, the count goes three, two, one, bungee, and you dive. The cord catches you about 8 m above
// the bag and throws you back up three or four times; when you hang still they lower the cage and the crew unclip you.
//
// The physics: you fall under gravity with a little air drag; the cord (18 m long unstretched) pulls only when it is
// longer than that, like a spring (stiff enough that the lowest point is 40 m below the cage), with some damping. The
// cord is tied at your ankles, so you swing head down below the cage.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { person, playerPerson, gameKeys, sportsUI } from '../sports/common.js';
import { sfx } from '../audio.js';
import { C, FONT } from '../uikit.js';
import { briefCard, recMode } from './brief.js';
import { kitUp } from './skyart.js';

const H = 50, L0 = 18, KM = 1.35, DAMP = 0.2, G = 9.81, LIFT = 4;
const STEPS = [
  { t: 'The harness', b: 'Two of them: the ankle harness the cord is tied to, padded and doubled, and a body harness clipped to it as the backup. I check both, then you watch me check them again.' },
  { t: 'The edge', b: 'When the gate opens, shuffle to the edge till your toes are over it. Arms out wide. Look at the horizon, not down. Space when you are ready: I count three, two, one, and on bungee you go.' },
  { t: 'The dive', b: 'Lean out and fall forward, like diving into a pool. Do not jump up or grab the rope. You fall about 20 m before the cord starts to stretch, and it catches you gently about 8 m above the bag.' },
  { t: 'The bounces', b: 'It throws you back up three or four times. Let it: stay loose, arms out. When you hang still, we lower the cage and the crew on the ground take you down onto the airbag.' },
];
const mat = (c, r = 0.75, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const flat = (g) => (g.index ? g.toNonIndexed() : g);

// a beam between two points, for the boom's lattice
function beam(a, b, t) { const d = new THREE.Vector3().subVectors(b, a), g = new THREE.BoxGeometry(t, d.length(), t); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return g; }

// ---------- the crane: the truck along x, the boom reaching up and out along +z to the hook over the bag ----------
function crane(reach) {
  const g = new THREE.Group(), yellow = [], dark = [], grey = [];
  yellow.push(box(3, 1.6, 9, 0, 1.6, -reach - 1)); dark.push(box(2.6, 1.4, 2.2, 0, 2.5, -reach + 2.6)); // the carrier and its cab
  [-1, 1].forEach((s) => [-3.4, -1.4, 0.8, 2.8].forEach((z) => dark.push(new THREE.CylinderGeometry(0.55, 0.55, 0.45, 14).rotateZ(Math.PI / 2).translate(s * 1.45, 0.55, -reach - 1 + z))));
  [-1, 1].forEach((s) => [-3.5, 1.5].forEach((z) => { grey.push(box(2.6, 0.25, 0.3, s * 2.6, 1.1, -reach - 1 + z)); grey.push(box(0.6, 1.1, 0.6, s * 3.7, 0.55, -reach - 1 + z)); })); // outriggers down
  yellow.push(box(2.6, 1.8, 3.4, 0, 3.3, -reach - 1.5)); dark.push(box(1.0, 1.2, 1.4, 1.1, 3.6, -reach - 0.3)); // the slewing deck and the operator's cab
  // the lattice boom from the deck up to the tip over the bag: four chords and zigzag lacing
  const foot = new THREE.Vector3(0, 4.2, -reach - 0.5), tip = new THREE.Vector3(0, H + 6, 0), axis = new THREE.Vector3().subVectors(tip, foot), n = 22;
  const side = new THREE.Vector3(1, 0, 0), up = new THREE.Vector3().crossVectors(axis, side).normalize();
  const corner = (t, i, j) => foot.clone().addScaledVector(axis, t).addScaledVector(side, i * 0.55 * (1 - t * 0.4)).addScaledVector(up, j * 0.55 * (1 - t * 0.4));
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([i, j]) => yellow.push(beam(corner(0, i, j), corner(1, i, j), 0.14)));
  for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n; [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]].forEach(([a, b, c, d], q) => yellow.push(beam(corner(q % 2 ? t0 : t1, a, b), corner(q % 2 ? t1 : t0, c, d), 0.06))); }
  dark.push(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16).rotateZ(Math.PI / 2).translate(0, H + 6, 0)); // the sheave at the tip
  const M = { y: mat('#f2b631', 0.55), d: mat('#2a2d33', 0.5, { metalness: 0.3 }), g: mat('#8d939b', 0.45, { metalness: 0.5 }) };
  [[yellow, M.y], [dark, M.d], [grey, M.g]].forEach(([gs, m]) => { const k = new THREE.Mesh(mergeGeometries(gs.map(flat)), m); k.castShadow = true; g.add(k); });
  return g;
}
// the cage on the hook: a floor, rails on three sides, the gate on the fourth (toward +z), the cables up to the hook
function cage() {
  const g = new THREE.Group(), rail = [], floor = [];
  floor.push(box(2.2, 0.12, 2.0, 0, 0, 0));
  // rails, not walls: a top and a middle rail with posts between, so you see through the sides
  [-1, 1].forEach((s) => { [1.15, 0.6].forEach((y) => rail.push(box(0.05, 0.05, 2.0, s * 1.08, y, 0))); for (let z = -0.5; z <= 0.5; z += 0.5) rail.push(box(0.035, 1.1, 0.035, s * 1.08, 0.6, z)); });
  [1.15, 0.6].forEach((y) => rail.push(box(2.2, 0.05, 0.05, 0, y, -0.98))); for (let x = -0.5; x <= 0.5; x += 0.5) rail.push(box(0.035, 1.1, 0.035, x, 0.6, -0.98));
  [[-1.05, -0.95], [1.05, -0.95], [-1.05, 0.95], [1.05, 0.95]].forEach(([x, z]) => rail.push(box(0.08, 1.2, 0.08, x, 0.6, z)));
  const M = mat('#e04a3a', 0.5, { metalness: 0.2 });
  g.add(new THREE.Mesh(mergeGeometries(floor.map(flat)), mat('#59606a', 0.6)));
  g.add(new THREE.Mesh(mergeGeometries(rail.map(flat)), M));
  const pts = []; [[-1.05, -0.95], [1.05, -0.95], [-1.05, 0.95], [1.05, 0.95]].forEach(([x, z]) => pts.push(x, 1.2, z, 0, 4.5, 0)); pts.push(0, 4.5, 0, 0, 80, 0);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#2a2d33' })));
  const gate = new THREE.Mesh(box(2.0, 0.06, 0.06, 0, 1.15, 0), M); gate.position.z = 0.98; g.add(gate); g.userData.gate = gate;
  g.add(new THREE.Mesh(box(0.5, 0.5, 0.3, 0, 4.4, 0), mat('#e04a3a', 0.5))); // the hook block
  return g;
}
// the airbag: a fat yellow cushion with blue sides and BUNGEE on it
function airbag() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 6.5, 6, 18).rotateZ(Math.PI / 2).scale(1, 0.75, 4).translate(0, 0.9, 0), mat('#f2c230', 0.7)));
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const c = cv.getContext('2d'); c.fillStyle = '#2a64b0'; c.fillRect(0, 0, 512, 96); c.fillStyle = '#fff'; c.font = `900 70px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BUNGEE', 256, 52);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  [-1, 1].forEach((s) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.9), new THREE.MeshBasicMaterial({ map: t })); p.position.set(0, 0.95, s * 4.85); if (s < 0) p.rotation.y = Math.PI; g.add(p); });
  g.traverse((m) => { if (m.isMesh) m.receiveShadow = true; });
  return g;
}

/**
 * @param o { scene, world, at: { x, z } (the bag), dir (the crane stands back along -dir), master: { name, first, look }, avatar, toast, onEnd(result) }
 */
export function createBungee(o) {
  const { toast } = o;
  const group = new THREE.Group(); group.name = 'bungee'; o.scene.add(group);
  const keys = gameKeys(['w', 'a', 's', 'd', ' ', 'c', 'escape', 'enter', 'f']); const ui = sportsUI(); recMode(true);
  const yaw = Math.atan2(o.dir.x, o.dir.z);
  const site = new THREE.Group(); site.position.set(o.at.x, 0, o.at.z); site.rotation.y = yaw; group.add(site);
  const reach = 14; site.add(crane(reach)); site.add(airbag());
  // the cage hangs under the tip, which is over the bag; its gate faces the bag's long side (+z here is away from the crane)
  const cg = cage(); site.add(cg); cg.position.set(0, 0.1, 0);
  const W = (lx, ly, lz) => site.localToWorld(new THREE.Vector3(lx, ly, lz)); site.updateMatrixWorld(true);
  // the people: you, the jump master in the cage, two crew by the bag
  const you = playerPerson(o.avatar, 'you-bungee'), master = person(o.master.look, `bungee-${o.master.name}`);
  const unkit = [kitUp(you, { tandem: true, colour: C.coral }), kitUp(master, { tandem: true, colour: C.teal })];
  const youRoot = new THREE.Group(); group.add(youRoot); youRoot.add(you.obj); // you, turned as the cord swings you
  cg.add(master.obj); master.obj.position.set(-0.6, 0.06, -0.3);
  const crew = [0, 1].map((k) => { const p = person(null, `bungee-crew-${k}`); p.obj.position.set(k ? 2.6 : -2.6, 0, 6.2); p.obj.rotation.y = Math.PI; site.add(p.obj); return p; });
  // the cord: a thick, bright bundle from the cage floor to your ankles
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8).translate(0, -0.5, 0), mat(C.coral, 0.6)); group.add(cord);
  const ankleStrap = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 14).rotateX(Math.PI / 2), mat('#2a2d33')); you.obj.add(ankleStrap); ankleStrap.position.y = 0.16;

  const S = { phase: 'brief', t: 0, cageY: 0.1, pos: new THREE.Vector3(), vel: new THREE.Vector3(), count: 0, edgeT: 0, maxG: 0, low: Infinity, bounces: 0, lastVy: 0, still: 0, view: 0, free: 0, result: null };
  const card = briefCard({ id: 'bw-brief', who: `${o.master.name}, your jump master · crane bungee · ${H} m`, steps: STEPS, last: 'Up we go', onDone: () => { card.remove(); S.phase = 'lift'; S.t = 0; sfx('door'); ui.show(true); ui.keys([['F', 'faster']]); ui.call(`${o.master.first}: "Don't look down yet. Look at the city."`, 3000); } });

  // phone buttons: Jump at the edge, Back to climb down
  const touch = matchMedia('(pointer: coarse)').matches, pad = document.createElement('div'); pad.id = 'bw-bungeepad';
  if (touch) {
    pad.innerHTML = `<style>#bw-bungeepad{position:fixed;inset:auto 0 18px 0;display:none;justify-content:flex-end;gap:10px;padding:0 16px;z-index:35}#bw-bungeepad.on{display:flex}#bw-bungeepad button{width:72px;height:72px;border-radius:50%;border:0;background:${C.paper};color:${C.ink};font:800 13px/1 ${FONT};box-shadow:0 3px 0 rgba(59,42,32,.25)}#bw-bungeepad button.big{background:${C.amber}}</style><button data-k="c">View</button><button data-k="escape">Back</button><button data-k=" " class="big">Jump</button>`;
    document.body.appendChild(pad);
    pad.querySelectorAll('button').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); press(b.dataset.k); }));
  }
  function press(k) {
    if (k === 'c') { S.view = (S.view + 1) % 3; return; }
    if (k === 'escape' && (S.phase === 'brief' || S.phase === 'lift' || S.phase === 'edge')) { finish({ aborted: true, up: S.phase !== 'brief' }); return; }
    if (k === ' ' && S.phase === 'edge' && !S.count) { S.count = 4; S.countT = 0; S.went = Math.round(S.edgeT); }
  }

  // ---------- poses ----------
  const setLimbs = (r, f) => { const { L, R } = r.rig; [[L, -1], [R, 1]].forEach(([j, s]) => f(j, s)); };
  const edgePose = (r) => setLimbs(r, (j, s) => { j.shoulder.rotation.set(-0.1, 0, s * 1.45); j.elbow.rotation.set(0, 0, 0); j.hip.rotation.set(0, 0, 0); j.knee.rotation.set(0, 0, 0); });
  const swanPose = (r) => setLimbs(r, (j, s) => { j.shoulder.rotation.set(-0.3, 0, s * 1.55); j.elbow.rotation.set(-0.1, 0, 0); j.hip.rotation.set(0.1, 0, s * 0.05); j.knee.rotation.set(0.05, 0, 0); });
  const hangPose = (r, k) => setLimbs(r, (j, s) => { j.shoulder.rotation.set(-3.0 + k * 0.4, 0, s * (0.3 + k * 0.6)); j.elbow.rotation.set(-0.2, 0, 0); j.hip.rotation.set(0, 0, 0); j.knee.rotation.set(0.1, 0, 0); });
  const standPose = (r) => setLimbs(r, (j) => { j.shoulder.rotation.set(0, 0, 0); j.elbow.rotation.set(0, 0, 0); j.hip.rotation.set(0, 0, 0); j.knee.rotation.set(0, 0, 0); });

  const anchor = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), tmp = new THREE.Vector3();
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  function update(dt) {
    dt = Math.min(dt, 0.05);
    const tk = keys.take(); if (tk.includes('enter') && S.phase === 'brief') card.next(); tk.forEach((k) => press(k));
    S.t += dt;
    cg.position.y = S.cageY; site.updateMatrixWorld(true);
    anchor.copy(W(0, S.cageY + 0.06, 0.95)); // where the cord is tied off: the cage floor, at the gate
    if (S.phase === 'brief' || S.phase === 'lift' || S.phase === 'edge') {
      // in the cage: you stand by the gate, facing out; the gate bar swings up at the top
      if (S.phase === 'lift') { S.cageY = Math.min(H, S.cageY + LIFT * dt * (keys.has('f') ? 4 : 1)); if (S.cageY >= H) { S.phase = 'edge'; S.t = 0; sfx('door'); ui.keys([['Space', 'jump'], ['Esc', 'climb down'], ['C', 'view']]); pad.classList.add('on'); ui.call(`${o.master.first}: "Toes over the edge. Arms out. Look at the horizon."`, 3200); } }
      if (S.phase === 'edge') { S.edgeT += dt; cg.userData.gate.rotation.x = Math.min(1.4, S.t * 2); if (S.edgeT > 20 && !S.nudged) { S.nudged = true; ui.call(`${o.master.first}: "Take your time. It is only ${H} metres."`, 2600); } }
      const stand = W(0, S.cageY + 0.06, S.phase === 'edge' ? 0.78 : 0.2);
      youRoot.position.copy(stand); youRoot.quaternion.setFromAxisAngle(up, yaw); you.obj.rotation.set(0, 0, 0); if (S.phase === 'edge') edgePose(you); else standPose(you);
      // the count
      if (S.count) {
        S.countT += dt; const n = 4 - Math.floor(S.countT); if (n !== S.count) { S.count = n; if (n > 0) { ui.call(`${o.master.first}: "${['', 'One', 'Two', 'Three'][n]}..."`, 900); sfx('tap'); } }
        if (S.countT >= 3) { S.count = 0; ui.call(`${o.master.first}: "BUNGEE!"`, 1500); jump(); }
      }
    } else if (S.phase === 'fall' || S.phase === 'hang') {
      // the cord: a spring that only pulls when stretched past its length; air drag; a few substeps for a stiff cord
      for (let i = 0; i < 4; i++) {
        const h = dt / 4; tmp.subVectors(S.pos, anchor); const len = tmp.length(), stretch = len - L0;
        const a = new THREE.Vector3(0, -G, 0).addScaledVector(S.vel, -0.004 * S.vel.length());
        if (stretch > 0) { tmp.divideScalar(len); const vr = S.vel.dot(tmp); a.addScaledVector(tmp, -KM * stretch - DAMP * vr); }
        S.vel.addScaledVector(a, h); S.pos.addScaledVector(S.vel, h);
        S.maxG = Math.max(S.maxG, a.length() / G);
      }
      if (S.pos.y < 3.6) { S.pos.y = 3.6; S.vel.y = Math.max(0, S.vel.y); } // your ankles; your head is on the bag here, which is what it is for
      if (S.lastVy < 0 && S.vel.y >= 0) { S.bounces++; if (S.phase === 'fall') S.low = Math.min(S.low, S.pos.y); if (S.bounces === 1) { sfx('whoosh'); ui.call('The cord catches you...', 1600); } }
      if (S.vel.y < -0.5 && S.pos.distanceTo(anchor) < L0) S.free += dt;
      S.lastVy = S.vel.y;
      // head down below the cord: your feet toward the cage
      tmp.subVectors(anchor, S.pos); const len = tmp.length();
      const want = len > 1.5 ? tmp.normalize().negate() : up; // your body's "up" (feet to head) points away from the cage
      const turn = Math.min(1, S.t * 1.6); q.setFromUnitVectors(up, new THREE.Vector3().lerpVectors(up, want, turn).normalize()); youRoot.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(up, yaw));
      youRoot.position.copy(S.pos); you.obj.rotation.set(0, 0, 0);
      if (S.phase === 'fall') { swanPose(you); if (S.bounces >= 1 && S.vel.length() < 4) { S.still += dt; } else S.still = 0; if (S.bounces >= 3 && S.still > 1.2) { S.phase = 'hang'; S.t = 0; ui.call(`${o.master.first}: "You did it! Lowering you now."`, 2800); sfx('cheer'); } }
      else { hangPose(you, Math.min(1, S.t / 2)); S.cageY = Math.max(L0 + 8, S.cageY - 2.2 * dt); if (S.pos.y < 4 && S.t > 3) land(); } // hanging still you are about 24 m under the cage
      // the cord from the gate to your ankles
      tmp.subVectors(S.pos, anchor); cord.position.copy(anchor); cord.scale.set(1, tmp.length(), 1); cord.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), tmp.clone().normalize());
      ui.board([{ name: 'Height', cols: [`${Math.max(0, Math.round(S.pos.y))} m`] }, { name: 'Speed', cols: [`${Math.round(S.vel.length() * 3.6)} km/h`] }], ['', '']);
    } else if (S.phase === 'down') { // on the bag: the crew unclip you, you roll off and stand
      if (S.t > 2.5) finish(S.result);
    }
    cord.visible = S.phase === 'fall' || S.phase === 'hang';
    crew.forEach((c, k) => { c.obj.rotation.y = Math.PI + Math.sin(S.t * 0.7 + k) * 0.3; });
  }
  function jump() {
    S.phase = 'fall'; S.t = 0; sfx('whoosh'); pad.classList.remove('on');
    S.pos.copy(W(0, S.cageY + 0.1, 0.9)); S.vel.copy(fwd).multiplyScalar(1.8); S.vel.y = 0.6;
    ui.keys([['C', 'view']]);
  }
  function land() {
    S.phase = 'down'; S.t = 0; sfx('land');
    const drop = Math.round(H - S.low);
    S.result = { drop, freefall: +S.free.toFixed(1), g: +S.maxG.toFixed(1), bounces: S.bounces, went: S.went ?? 0 };
    const bag = W(0, 2.0, 0); youRoot.position.copy(bag); youRoot.quaternion.setFromAxisAngle(up, yaw); youRoot.rotateX(-Math.PI / 2); standPose(you);
    ui.call(`On the bag. ${crew.length ? 'The crew unclip your ankles.' : ''}`, 2400);
  }

  let ended = false;
  function finish(result) {
    if (ended) return; ended = true;
    keys.on = false; ui.show(false); card.remove(); pad.remove(); recMode(false); unkit.forEach((f) => f());
    you.dispose?.(); master.dispose?.(); crew.forEach((c) => c.dispose?.());
    group.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); [].concat(m.material).forEach((x) => { x.map?.dispose(); x.dispose(); }); } });
    group.removeFromParent();
    o.onEnd?.(result, W(0, 0, 6));
  }
  keys.on = true;

  // ---------- the camera ----------
  const cam = { from: new THREE.Vector3(), at: new THREE.Vector3() };
  function pose() {
    if (ended) return null;
    const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), far = innerWidth < innerHeight ? 1.6 : 1;
    if (S.phase === 'brief') { // from the grass: the crane, the cage on the ground, the bag
      cam.from.copy(W(12 * far, 17, 22 * far)); cam.at.copy(W(0, 10, -4)); // high enough to clear the park's trees
    } else if (S.phase === 'lift') { // alongside the cage as it goes up, the city coming into view
      cam.from.copy(W(6 * far, S.cageY + 2.5, 5 * far)); cam.at.copy(W(0, S.cageY + 0.8, 0));
    } else if (S.phase === 'edge') {
      if (S.view === 1) { cam.from.copy(W(0, S.cageY + 1.65, 1.2)); cam.at.copy(W(0, 0, 7)); } // your eyes: straight down past your toes
      else if (S.view === 2) { cam.from.copy(W(10, 1.6, 12)); cam.at.copy(W(0, S.cageY, 0.8)); } // from the ground
      else { cam.from.copy(W(1.6, S.cageY + 3.2, -2.6)); cam.at.copy(W(-0.2, S.cageY - 6, 6)); } // over your shoulder, the bag far below
    } else if (S.phase === 'down') {
      cam.from.copy(W(6, 4, 8)); cam.at.copy(W(0, 1.2, 0));
    } else if (S.view === 1) { // through your eyes, upside down: the ground rushing up
      cam.from.copy(S.pos).addScaledVector(up, -1.5); cam.at.copy(S.pos).add(new THREE.Vector3(fwd.x * 2, -20, fwd.z * 2));
    } else if (S.view === 2) { cam.from.copy(W(10, 1.6, 12)); cam.at.copy(S.pos); }
    else { // level with you, off to the side, following you down and up
      cam.from.copy(S.pos).addScaledVector(side, 11 * far).addScaledVector(fwd, 3); cam.from.y = Math.max(2, S.pos.y + 1.5); cam.at.copy(S.pos).addScaledVector(up, -0.6);
    }
    you.obj.visible = S.view !== 1 || S.phase === 'brief' || S.phase === 'lift' || S.phase === 'down';
    const P = S.phase === 'brief' ? W(0, 0, 3) : S.pos.lengthSq() ? S.pos : anchor;
    return { x: P.x, z: P.z, yaw, hide: true, cam: { from: cam.from, at: cam.at, lock: S.phase === 'fall' || S.phase === 'hang' }, speed: 0 };
  }
  return { update, pose, get phase() { return S.phase; }, state: () => ({ phase: S.phase, cageY: +S.cageY.toFixed(1), y: +S.pos.y.toFixed(1), vy: +S.vel.y.toFixed(1), bounces: S.bounces, result: S.result }), _press: press, finish };
}
