// Mountain biking down the city's real hills (Elvis, 13 October 2026: "So go ahead and build hills"; mountain biking had
// been listed as coming). A pickup takes you and a hired bike to the top; the line down is the one worked out over the
// real ground (scripts/city/hills.py), along the mapped tracks and paths where they go the right way, with gates and
// flags to time you and keep you on it. The coach rides it first in their head and tells you how.
//
// The riding, in brief: the slope under your wheels pulls you down it (gravity along the ground), rolling resistance
// is low on the trail and high in the grass, the air holds you back a little, W pedals, S brakes, A and D steer. Turning
// hard at speed puts you on the ground (too much sideways grip asked of the tyres); you get up at the last gate.
import * as THREE from 'three';
import { person, playerPerson, gameKeys, sportsUI } from '../sports/common.js';
import { bikeModel } from '../mobility.js';
import { sfx } from '../audio.js';
import { C, FONT } from '../uikit.js';
import { briefCard, recMode } from './brief.js';

const G = 9.81, GATE = 200, RUN = 2400;
const STEPS = (site, len, drop) => [
  { t: 'The line', b: `${(len / 1000).toFixed(1)} km down from the top of ${site.summit || site.name}, ${Math.round(drop)} m of drop. Ride through every pair of flags; they time you and keep you on the trail.` },
  { t: 'The brakes', b: 'S is both brakes. Brake before a corner, in a straight line, then let go and roll through it. Braking in the turn is how people fall.' },
  { t: 'Your body', b: 'Out of the saddle, weight back on the steep bits, elbows out, look where you want to go, not at the rock. A and D steer, W pedals on the flat.' },
  { t: 'Falling', b: 'Turn too hard too fast and the front wheel goes. You will be fine; you get back on at the last flags. The trail is in the grass when you leave it: slow and bumpy.' },
];

/**
 * @param o { scene, hills (openworld hills api), site, coach: { name, first, look }, avatar, toast, onEnd(result) }
 */
export function createBike(o) {
  const { toast, hills, site } = o;
  const group = new THREE.Group(); group.name = 'mtb'; o.scene.add(group);
  const keys = gameKeys(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'c', 'escape', 'enter', ' ']); const ui = sportsUI(); recMode(true);
  const Y = (x, z) => hills.heightAt(x, z) ?? 0;
  // the line, with its length along it, and the gates every GATE metres
  const L = []; let len = 0;
  // the timed run is the first 2.4 km of the line down (four minutes or so); the pickup waits at the finish
  for (let i = 0; i < site.bike.length; i++) {
    const p = site.bike[i], step = i ? Math.hypot(p.x - site.bike[i - 1].x, p.z - site.bike[i - 1].z) : 0;
    if (len + step > RUN) { const q = site.bike[i - 1], t = (RUN - len) / step; L.push({ x: q.x + (p.x - q.x) * t, z: q.z + (p.z - q.z) * t, d: RUN }); len = RUN; break; }
    len += step; L.push({ x: p.x, z: p.z, d: len });
  }
  const drop = Y(L[0].x, L[0].z) - Y(L[L.length - 1].x, L[L.length - 1].z);
  const onLine = (d) => { d = Math.max(0, Math.min(len, d)); let i = 1; while (i < L.length - 1 && L[i].d < d) i++; const a = L[i - 1], b = L[i], t = b.d > a.d ? (d - a.d) / (b.d - a.d) : 0; return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, yaw: Math.atan2(b.x - a.x, b.z - a.z) }; };
  const nearest = (x, z, lo = -1e9, hi = 1e9) => { let best = { dist: 1e9, d: 0 }; for (let i = 1; i < L.length; i++) { const a = L[i - 1], b = L[i]; if (b.d < lo || a.d > hi) continue; const vx = b.x - a.x, vz = b.z - a.z, l2 = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / l2)), px = a.x + vx * t, pz = a.z + vz * t, dist = Math.hypot(x - px, z - pz); if (dist < best.dist) best = { dist, d: a.d + Math.sqrt(l2) * t }; } return best; };
  // the gates: two flags either side of the line
  const gates = []; const flagM = [new THREE.MeshStandardMaterial({ color: C.coral, side: THREE.DoubleSide }), new THREE.MeshStandardMaterial({ color: C.teal, side: THREE.DoubleSide })], poleM = new THREE.MeshStandardMaterial({ color: '#f4f1ea' });
  for (let d = GATE; d < len - 20; d += GATE) gates.push(d); gates.push(len);
  gates.forEach((d, i) => { const p = onLine(d), sx = Math.cos(p.yaw), sz = -Math.sin(p.yaw); [-1, 1].forEach((s, k) => { const x = p.x + sx * s * 3.2, z = p.z + sz * s * 3.2, gg = new THREE.Group(); gg.position.set(x, Y(x, z), z); gg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6).translate(0, 1.2, 0), poleM)); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), flagM[i === gates.length - 1 ? 1 : k]); f.position.set(0.4, 2.1, 0); gg.add(f); gg.rotation.y = p.yaw; group.add(gg); }); });

  // the bike and you on it; the coach and the pickup at the top
  const bike = bikeModel(0xf2b631); bike.scale.setScalar(1.12); group.add(bike);
  const you = playerPerson(o.avatar, 'you-mtb'), coach = person(o.coach.look, `mtb-${o.coach.name}`); bike.add(you.obj); you.obj.position.set(0, 0.29, -0.05); you.obj.scale.setScalar(1 / 1.12);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(1, 0.9, 1.15), new THREE.MeshStandardMaterial({ color: C.teal, roughness: 0.4 })); helmet.position.set(0, 0.25, -0.02); you.rig?.neck?.add(helmet);
  const start = onLine(10), cs = { x: start.x + Math.cos(start.yaw) * 4, z: start.z - Math.sin(start.yaw) * 4 }; group.add(coach.obj); coach.obj.position.set(cs.x, Y(cs.x, cs.z), cs.z); coach.obj.rotation.y = start.yaw - Math.PI / 2; // a few metres below the cairn, the coach beside you
  const S = { phase: 'brief', t: 0, x: start.x, z: start.z, yaw: start.yaw, v: 0, lean: 0, gate: 0, splits: [], crashes: 0, top: 0, crashT: 0, view: 0, off: 0, run: 0, prog: 10, steer: 0 };
  const card = briefCard({ id: 'bw-brief', who: `${o.coach.name}, your coach · a bike from the hire hut · ${site.name}`, steps: STEPS(site, len, drop), last: 'Drop in', onDone: () => { card.remove(); S.phase = 'ride'; S.t = 0; ui.show(true); ui.keys([['A D', 'steer'], ['W', 'pedal'], ['S', 'brake'], ['C', 'camera'], ['Esc', 'stop']]); ui.call(`${o.coach.first}: "Three, two, one, go. Look ahead!"`, 2400); pad.classList.add('on'); sfx('whoosh'); } });

  const touch = matchMedia('(pointer: coarse)').matches, pad = document.createElement('div'); pad.id = 'bw-bikepad';
  if (touch) {
    pad.innerHTML = `<style>#bw-bikepad{position:fixed;inset:auto 0 18px 0;display:none;justify-content:space-between;padding:0 16px;z-index:35;pointer-events:none}#bw-bikepad.on{display:flex}#bw-bikepad div{display:flex;gap:10px;pointer-events:auto}#bw-bikepad button{width:64px;height:64px;border-radius:50%;border:0;background:${C.paper};color:${C.ink};font:800 13px/1 ${FONT};box-shadow:0 3px 0 rgba(59,42,32,.25)}#bw-bikepad button.big{background:${C.amber}}</style><div><button data-k="a">◀</button><button data-k="d">▶</button></div><div><button data-k="s">Brake</button><button data-k="w" class="big">Pedal</button></div>`;
    document.body.appendChild(pad); pad.held = new Set();
    pad.querySelectorAll('button').forEach((b) => { const k = b.dataset.k; b.addEventListener('pointerdown', (e) => { e.preventDefault(); pad.held.add(k); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, () => pad.held.delete(k))); });
  }
  const down = (k) => keys.has(k) || pad.held?.has(k);

  function crash(why) {
    S.crashes++; S.phase = 'down'; S.crashT = 0; sfx('thud'); ui.call(why, 2200);
  }
  function update(dt) {
    dt = Math.min(dt, 0.05);
    const tk = keys.take();
    if (tk.includes('enter') && S.phase === 'brief') card.next();
    if (tk.includes('escape')) { finish(S.phase === 'brief' ? { aborted: true } : { done: false, gates: S.gate, crashes: S.crashes, top: Math.round(S.top * 3.6) }); return; }
    if (tk.includes('c')) S.view = (S.view + 1) % 3;
    S.t += dt;
    if (S.phase === 'ride') {
      S.run += dt;
      const steer = (down('a') || down('arrowleft') ? 1 : 0) - (down('d') || down('arrowright') ? 1 : 0), pedal = down('w') || down('arrowup'), brake = down('s') || down('arrowdown');
      const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw), h0 = Y(S.x, S.z), h1 = Y(S.x + fx * 2, S.z + fz * 2), grade = (h1 - h0) / 2; // down the hill is negative
      const nl = nearest(S.x, S.z, S.prog - 80, S.prog + 160), onTrail = nl.dist < 4.5 /* the track and its edges: 3 or 4 m off the line is still on the dirt */; S.off = nl.dist; if (nl.dist < 12) S.prog = Math.max(S.prog, nl.d); // where you are on the line: only near where you were
      // forces along the ground: gravity down the slope, rolling (trail or grass), air, pedals, brakes
      let a = -G * grade / Math.sqrt(1 + grade * grade) - G * (onTrail ? 0.025 : 0.11) * Math.sign(S.v) - 0.0045 * S.v * Math.abs(S.v);
      if (pedal && S.v < 9) a += 3.6 * (1 - S.v / 9.5); // a low gear: up the short climbs out of the saddle
      if (brake) a -= Math.min(9, S.v / dt); // good disc brakes on dry ground: nearly a g
      S.v = Math.max(0, S.v + a * dt); S.top = Math.max(S.top, S.v);
      // steering: tighter when slow; the tyres hold about 0.75 g sideways (less in the grass) before the front goes
      S.steer += (steer - S.steer) * (1 - Math.exp(-dt * 5)); // the bars come round over a moment, not at once
      const rate = S.steer * Math.min(2, 7 / Math.max(1.5, S.v)), side = Math.abs(rate * S.v); // up to about 0.7 g of cornering
      if (side > G * (onTrail ? 0.78 : 0.55) && S.v > 6) { crash(`${o.coach.first}: "Too fast into that one! Up you get."`); return; }
      if (brake && Math.abs(steer) && S.v > 10 && nl.dist > 5) { crash('The front wheel washes out in the grass.'); return; }
      S.yaw += rate * dt; S.lean += (-rate * S.v * 0.06 - S.lean) * (1 - Math.exp(-dt * 6));
      S.x += Math.sin(S.yaw) * S.v * dt; S.z += Math.cos(S.yaw) * S.v * dt;
      if (hills.heightAt(S.x, S.z) == null) { S.x -= Math.sin(S.yaw) * S.v * dt * 2; S.z -= Math.cos(S.yaw) * S.v * dt * 2; S.v *= 0.3; }
      if (nl.dist > 30 && !S.toldOff) { S.toldOff = true; ui.call(`${o.coach.first}: "You are off the trail. Back to the flags!"`, 2400); } if (nl.dist < 10) S.toldOff = false;
      // the gates, in order: through each one within its flags
      const gd = gates[S.gate], gp = gd != null && onLine(gd);
      if (gp && Math.hypot(S.x - gp.x, S.z - gp.z) < 4.5) { S.splits.push(+S.run.toFixed(1)); S.gate++; sfx('tap'); if (S.gate >= gates.length) { finishRun(); return; } ui.call(`Gate ${S.gate} of ${gates.length}: ${S.run.toFixed(1)} s`, 1200); }
      else if (gp && nl.d > gd + 12 && !S.missWarn) { S.missWarn = gd; ui.call('Missed the flags: go back through them.', 1800); } if (S.missWarn && S.missWarn !== gd) S.missWarn = 0;
      ui.board([{ name: 'Time', cols: [`${S.run.toFixed(1)}\u00a0s`] }, { name: 'Speed', cols: [`${Math.round(S.v * 3.6)}\u00a0km/h`] }], ['', '']); // (the gates: the bar)
      ui.meter(nl.d / len, (gates[S.gate] ?? len) / len);
      bike.userData.crank.rotation.x += dt * (pedal ? 9 : 0); bike.userData.wheels.forEach((w) => { w.rotation.x -= dt * S.v * 3; });
      const r = you.rig; if (r) { const p = bike.userData.crank.rotation.x; r.L.hip.rotation.x = -0.9 + Math.sin(p) * 0.4; r.R.hip.rotation.x = -0.9 - Math.sin(p) * 0.4; r.L.knee.rotation.x = 1.0 - Math.cos(p) * 0.4; r.R.knee.rotation.x = 1.0 + Math.cos(p) * 0.4; r.L.shoulder.rotation.x = r.R.shoulder.rotation.x = -0.9; r.L.elbow.rotation.x = r.R.elbow.rotation.x = -0.5; }
    } else if (S.phase === 'down') { // on the ground for a moment, then back on at the last gate
      S.crashT += dt; S.v = 0; S.lean = Math.min(1.3, S.lean + dt * 3);
      if (S.crashT > 2) { const back = onLine(S.gate ? gates[S.gate - 1] : 10); S.prog = S.gate ? gates[S.gate - 1] : 10; S.x = back.x; S.z = back.z; S.yaw = back.yaw; S.lean = 0; S.steer = 0; S.phase = 'ride'; }
    } else if (S.phase === 'done') { if (tk.includes(' ') || S.t > 6) { finish(S.result); return; } }
    // on the ground, following its slope
    const y = Y(S.x, S.z), fx = Math.sin(S.yaw), fz = Math.cos(S.yaw), pitch = Math.atan2(Y(S.x + fx * 0.6, S.z + fz * 0.6) - Y(S.x - fx * 0.6, S.z - fz * 0.6), 1.2);
    bike.position.set(S.x, y, S.z); bike.rotation.set(-pitch, S.yaw, S.lean, 'YXZ');
  }
  function finishRun() {
    const par = Math.round(len / 8); // the coach's time: about 29 km/h average down the line
    S.result = { done: true, time: +S.run.toFixed(1), par, splits: S.splits, crashes: S.crashes, top: Math.round(S.top * 3.6), km: +(len / 1000).toFixed(1), drop: Math.round(drop) };
    S.phase = 'done'; S.t = 0; sfx('cheer'); pad.classList.remove('on');
    ui.call(`Down in ${S.run.toFixed(1)} s${S.run < par ? `, faster than ${o.coach.first}!` : `. ${o.coach.first} does it in ${par} s.`}`, 4000);
  }

  let ended = false;
  function finish(result) {
    if (ended) return; ended = true;
    keys.on = false; ui.show(false); ui.meter(null); card.remove(); pad.remove(); recMode(false);
    helmet.removeFromParent(); you.dispose?.(); coach.dispose?.(); group.removeFromParent();
    o.onEnd?.(result);
  }
  keys.on = true;

  const cam = { from: new THREE.Vector3(), at: new THREE.Vector3() };
  function pose() {
    if (ended) return null;
    const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw), y = Y(S.x, S.z), far = innerWidth < innerHeight ? 1.5 : 1;
    if (S.phase === 'brief') { cam.from.set(S.x - fx * 7 + fz * 3, y + 3.5, S.z - fz * 7 - fx * 3); cam.at.set(S.x + fx * 30, y - 8, S.z + fz * 30); }
    else if (S.view === 1) { cam.from.set(S.x + fx * 0.2, y + 1.75, S.z + fz * 0.2); cam.at.set(S.x + fx * 20, Y(S.x + fx * 20, S.z + fz * 20) + 1, S.z + fz * 20); }
    else if (S.view === 2) { cam.from.set(S.x + fz * 8, y + 2.5, S.z - fx * 8); cam.at.set(S.x, y + 1, S.z); }
    else { const bx = S.x - fx * 5.5 * far, bz = S.z - fz * 5.5 * far; cam.from.set(bx, Math.max(y, Y(bx, bz)) + 2.4, bz); cam.at.set(S.x + fx * 8, y + 0.6, S.z + fz * 8); }
    const gy = hills.heightAt(cam.from.x, cam.from.z); if (gy != null && cam.from.y < gy + 1.2) cam.from.y = gy + 1.2;
    you.obj.visible = S.view !== 1;
    return { x: S.x, z: S.z, yaw: S.yaw, hide: true, cam: { from: cam.from, at: cam.at, lock: S.phase === 'ride' }, speed: 0 };
  }
  return { update, pose, get phase() { return S.phase; }, state: () => ({ phase: S.phase, v: +S.v.toFixed(1), gate: S.gate, gates: gates.length, off: Math.round(S.off), run: +S.run.toFixed(1), crashes: S.crashes, yaw: +S.yaw.toFixed(2), x: S.x, z: S.z, result: S.result }), line: { onLine, nearest: (x, z) => nearest(x, z, S.prog - 80, S.prog + 160), len, gates }, finish };
}
