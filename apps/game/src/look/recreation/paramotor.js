// Paragliding, the way the flat coastal cities do it (Elvis, 13 October 2026: "also paragliding"): Lagos and Accra have
// no hills to launch from, so their flights are tandem paramotor ones, a paraglider wing with an engine on a trike, off
// the beach or a big field. The pilot briefs you, the wing is laid out behind and comes up overhead as the trike rolls
// into the wind, and you are off over the city: you hold the bars (A and D turn, W climbs, S comes down) and the pilot
// keeps you between 60 and 450 m and points out where you are. After about four minutes, or when you press L, the pilot
// takes it back down: a long approach into the wind, a flare, the wheels on the sand.
//
// The flying, in brief: about 11 m/s through the air, more in a climb on full power; turning costs a little height; the
// wind carries the whole thing, so a circle drifts downwind. Height is measured above the city's roofs below you.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { person, playerPerson, gameKeys, sportsUI } from '../sports/common.js';
import { sfx } from '../audio.js';
import { C, FONT } from '../uikit.js';
import { briefCard, recMode } from './brief.js';
import { ramAir, kitUp, altimeter } from './skyart.js';

const AIR = 11, MAXH = 450, MINH = 60, FLIGHT = 240;
const STEPS = [
  { t: 'The trike', b: 'You sit in front, I sit behind with the throttle. Seat belt and the harness to the wing, both clipped. Helmet with the radio: you will hear me over the engine.' },
  { t: 'The take-off', b: 'The wing is laid out behind us. I run the engine up, the wing comes over our heads, we roll into the wind and lift off in about forty metres. Hands on the bars, not on the lines.' },
  { t: 'Flying it', b: 'You have the bars: A and D turn us, W climbs (more power), S brings us down. I keep us between 60 and 450 m. Turning steeply costs height, and the wind carries us whichever way we point.' },
  { t: 'Landing', b: 'About four minutes, then I take us home; L if you want to land sooner. I fly a long approach into the wind and flare at the bottom. Feet up off the ground until we stop.' },
];
const mat = (c, r = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const flat = (g) => (g.index ? g.toNonIndexed() : g);

// the trike: two seats in a tube frame on three wheels, the engine and its prop cage behind; nose along +z, wheels at y = 0
function trike() {
  const g = new THREE.Group(), frame = [], dark = [], col = [];
  const tube = (a, b, r = 0.035) => { const d = new THREE.Vector3().subVectors(b, a), k = new THREE.CylinderGeometry(r, r, d.length(), 8); k.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); k.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); frame.push(k); };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  tube(V(0, 0.35, 1.3), V(0, 0.35, -1.0)); tube(V(-0.7, 0.3, -0.7), V(0.7, 0.3, -0.7)); tube(V(0, 0.35, 1.3), V(0, 0.25, 1.55)); // keel, axle, nose
  [-1, 1].forEach((s) => { tube(V(s * 0.25, 0.35, 0.6), V(s * 0.25, 1.5, -0.6)); tube(V(s * 0.25, 1.5, -0.6), V(s * 0.25, 0.35, -1.0)); }); // the mast to the hang point
  [[0, 0.25, 1.55], [-0.72, 0.28, -0.7], [0.72, 0.28, -0.7]].forEach(([x, y, z]) => dark.push(new THREE.CylinderGeometry(0.25, 0.25, 0.14, 14).rotateZ(Math.PI / 2).translate(x, y, z)));
  col.push(box(0.5, 0.08, 0.5, 0, 0.55, 0.55), box(0.5, 0.55, 0.08, 0, 0.82, 0.3), box(0.5, 0.08, 0.5, 0, 0.75, -0.25), box(0.5, 0.6, 0.08, 0, 1.05, -0.5)); // the two seats, the back one higher
  dark.push(box(0.45, 0.4, 0.4, 0, 0.9, -1.0)); // the engine
  const cage = new THREE.TorusGeometry(0.85, 0.025, 6, 32).translate(0, 1.05, -1.25); frame.push(cage);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; tube(V(0, 1.05, -1.05), V(Math.cos(a) * 0.85, 1.05 + Math.sin(a) * 0.85, -1.25), 0.012); }
  const M = { f: mat('#c7ccd2', 0.4, { metalness: 0.6 }), d: mat('#2a2d33', 0.5), c: mat(C.teal, 0.6) };
  [[frame, M.f], [dark, M.d], [col, M.c]].forEach(([gs, m]) => { const k = new THREE.Mesh(mergeGeometries(gs.map(flat)), m); k.castShadow = true; g.add(k); });
  const prop = new THREE.Group(); prop.position.set(0, 1.05, -1.22); g.add(prop);
  prop.add(new THREE.Mesh(box(1.5, 0.12, 0.03), mat('#6b4a2a', 0.5)));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.78, 28), new THREE.MeshBasicMaterial({ color: '#40444b', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); prop.add(disc);
  g.userData.spin = (dt, rpm) => { prop.rotation.z += dt * 50 * rpm; disc.visible = rpm > 0.3; };
  return g;
}

/**
 * @param o { scene, world, openWorld, site: { x, z, dir: { x, z } } (where to take off and land, rolling along dir), pilot: { name, first, look }, avatar, toast, areaAt(x, z), onEnd(result) }
 */
export function createParamotor(o) {
  const { toast } = o;
  const group = new THREE.Group(); group.name = 'paramotor'; o.scene.add(group);
  const keys = gameKeys(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'l', 'c', 'escape', 'enter', ' ']); const ui = sportsUI(); recMode(true);
  const windDir = Math.atan2(-o.site.dir.x, -o.site.dir.z), windSpd = 1.5 + Math.random() * 2.5; // from ahead: you take off into it
  const wind = new THREE.Vector3(Math.sin(windDir) * windSpd, 0, Math.cos(windDir) * windSpd);
  const craft = new THREE.Group(); group.add(craft);
  const tr = trike(); craft.add(tr);
  const wing = ramAir({ span: 11, chord: 2.7, lines: 7.2, cols: [C.teal, C.paper, C.amber, C.coral, C.amber, C.paper, C.teal, C.paper, C.amber, C.coral, C.amber].slice(0, 11) });
  const wingPivot = new THREE.Group(); wingPivot.position.set(0, 1.5, -0.6); craft.add(wingPivot); wingPivot.add(wing);
  const you = playerPerson(o.avatar, 'you-paramotor'), pilot = person(o.pilot.look, `pilot-${o.pilot.name}`);
  const unkit = [kitUp(you, { tandem: true, colour: C.amber }), kitUp(pilot, { tandem: true, colour: C.teal })];
  craft.add(you.obj); you.obj.position.set(0, 0.2, 0.45); craft.add(pilot.obj); pilot.obj.position.set(0, 0.38, -0.35);
  const seat = (r, hands) => { const { L, R } = r.rig; [[L, -1], [R, 1]].forEach(([j, s]) => { j.hip.rotation.set(-1.35, 0, s * 0.1); j.knee.rotation.set(1.1, 0, 0); j.shoulder.rotation.set(hands ? -1.1 : -0.4, 0, s * (hands ? 0.35 : 0.15)); j.elbow.rotation.set(hands ? -0.6 : -0.9, 0, 0); }); };
  seat(you, true); seat(pilot, false);

  const start = new THREE.Vector3(o.site.x, 0, o.site.z), dir = new THREE.Vector3(o.site.dir.x, 0, o.site.dir.z).normalize();
  const S = { phase: 'brief', t: 0, pos: start.clone(), vel: new THREE.Vector3(), heading: Math.atan2(dir.x, dir.z), climb: 0, rpm: 0.2, open: 0, fly: 0, view: 0, peak: 0, dist: 0, said: 12, seen: new Set(), bank: 0, result: null };
  craft.position.copy(S.pos); craft.rotation.y = S.heading;
  wing.userData.setOpen(0.25); wingPivot.rotation.x = -1.45; wingPivot.position.set(0, 0.2, -5.5); // laid out behind on the ground
  let alti = null;
  const card = briefCard({ id: 'bw-brief', who: `${o.pilot.name}, your pilot · tandem paramotor · about 4 minutes`, steps: STEPS, last: 'Start the engine', onDone: () => { card.remove(); S.phase = 'inflate'; S.t = 0; sfx('jet'); ui.show(true); ui.keys([['A D', 'turn'], ['W', 'climb'], ['S', 'down'], ['L', 'land'], ['C', 'camera']]); ui.call(`${o.pilot.first}: "Here she comes. Hands on the bars."`, 2600); alti = altimeter(MINH * 4); pad.classList.add('on'); } });

  // phone buttons
  const touch = matchMedia('(pointer: coarse)').matches, pad = document.createElement('div'); pad.id = 'bw-ppgpad';
  if (touch) {
    pad.innerHTML = `<style>#bw-ppgpad{position:fixed;inset:auto 0 18px 0;display:none;justify-content:space-between;padding:0 16px;z-index:35;pointer-events:none}#bw-ppgpad.on{display:flex}#bw-ppgpad div{display:flex;gap:10px;pointer-events:auto}#bw-ppgpad button{width:64px;height:64px;border-radius:50%;border:0;background:${C.paper};color:${C.ink};font:800 13px/1 ${FONT};box-shadow:0 3px 0 rgba(59,42,32,.25)}#bw-ppgpad button.big{background:${C.amber}}</style>
      <div><button data-k="a">◀</button><button data-k="d">▶</button></div><div><button data-k="s">Down</button><button data-k="w" class="big">Climb</button><button data-k="l">Land</button></div>`;
    document.body.appendChild(pad); pad.held = new Set();
    pad.querySelectorAll('button').forEach((b) => { const k = b.dataset.k; b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (k === 'l') land(); else pad.held.add(k); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, () => pad.held.delete(k))); });
  }
  const down = (k) => keys.has(k) || pad.held?.has(k);

  // the ground under you: the roofs of the open city, the street otherwise
  const groundAt = (x, z) => { if (o.openWorld?.active && Math.hypot(x, z) > o.world.radius) { const r = o.openWorld.solidAt?.(x, z); return typeof r === 'number' ? r : 0; } let h = 0; if (o.world.solidAt?.(x, 0.5, z)) { h = 0.5; while (h < 200 && o.world.solidAt(x, h, z)) h += 2; } return h; };
  function land() { if (S.phase === 'fly') { S.phase = 'home'; S.t = 0; ui.call(`${o.pilot.first}: "I have it. Taking us home."`, 2600); ui.keys([['C', 'camera']]); } }

  const fwd = new THREE.Vector3();
  function update(dt) {
    dt = Math.min(dt, 0.05);
    const tk = keys.take();
    if (tk.includes('enter') && S.phase === 'brief') card.next();
    if (tk.includes('escape') && (S.phase === 'brief' || S.phase === 'inflate')) { finish({ aborted: true }); return; }
    if (tk.includes('escape') || tk.includes('l')) land();
    if (tk.includes('c')) S.view = (S.view + 1) % 3;
    S.t += dt; tr.userData.spin(dt, S.rpm);
    if (S.phase === 'brief') return;
    fwd.set(Math.sin(S.heading), 0, Math.cos(S.heading));
    const g = groundAt(S.pos.x, S.pos.z), agl = S.pos.y - g;
    if (S.phase === 'inflate') { // the wing comes up off the ground and over the top as the engine runs up
      const k = Math.min(1, S.t / 3.2); S.rpm = 0.4 + k * 0.6;
      wing.userData.setOpen(0.25 + 0.75 * k); wingPivot.rotation.x = -1.45 * (1 - k) * (1 - k); wingPivot.position.set(0, 0.2 + 1.3 * k, -5.5 * (1 - k) - 0.6 * k);
      S.vel.copy(fwd).multiplyScalar(k * 3); S.pos.addScaledVector(S.vel, dt);
      if (k >= 1) { S.phase = 'roll'; S.t = 0; }
    } else if (S.phase === 'roll') { // the take-off roll, then up
      const sp = Math.min(AIR, 3 + S.t * 2.2); S.vel.copy(fwd).multiplyScalar(sp); S.pos.addScaledVector(S.vel, dt);
      if (sp >= AIR - 0.5) S.pos.y += dt * 2.4 * Math.min(1, (sp - AIR + 0.5) * 2 + S.t * 0.2);
      if (S.pos.y > 1) { S.phase = 'fly'; S.t = 0; sfx('whoosh'); ui.call(`${o.pilot.first}: "And we are flying. She is yours."`, 2800); }
    } else if (S.phase === 'fly' || S.phase === 'home') {
      S.fly += dt;
      let yaw = (down('a') || down('arrowleft') ? 1 : 0) - (down('d') || down('arrowright') ? 1 : 0), want = down('w') || down('arrowup') ? 2.8 : down('s') || down('arrowdown') ? -1.8 : 0.15;
      if (S.phase === 'home') { // fly to a point 400 m downwind of the field, then turn in and come down the line into the wind
        const toSite = new THREE.Vector3().subVectors(start, S.pos); toSite.y = 0; const d = toSite.length();
        const fin = start.clone().addScaledVector(dir, -400), toFin = new THREE.Vector3().subVectors(fin, S.pos); toFin.y = 0;
        const onFinal = S.final || (toFin.length() < 60) || (d < 450 && new THREE.Vector3().subVectors(S.pos, start).dot(dir) < -150 && Math.abs(new THREE.Vector3().subVectors(S.pos, start).cross(dir).y) < 60);
        if (onFinal) S.final = true;
        const aim = S.final ? start.clone().addScaledVector(dir, 40) : fin, want2 = Math.atan2(aim.x - S.pos.x, aim.z - S.pos.z), dh = Math.atan2(Math.sin(want2 - S.heading), Math.cos(want2 - S.heading));
        yaw = Math.max(-1, Math.min(1, dh * 2));
        const tgt = S.final ? Math.max(0, d * 0.09) : 120; want = Math.max(-2.2, Math.min(1.8, (tgt - agl) * 0.25));
        S.rpm = S.final ? 0.35 : 0.7;
        if (S.final && agl < 2.5) { S.phase = 'flare'; S.t = 0; ui.call(`${o.pilot.first}: "Flare... and feet up."`, 2000); }
      } else {
        S.rpm = 0.55 + Math.max(0, want) * 0.2;
        // the pilot keeps you out of trouble
        // and away from anything tall ahead: a look 40 and 80 m out, a climbing turn toward the open side if it is in the way
        const ahead = (d) => groundAt(S.pos.x + fwd.x * d, S.pos.z + fwd.z * d);
        if (Math.max(ahead(40), ahead(80)) > S.pos.y - 25) { want = 2.8; yaw = S.dodge ||= (groundAt(S.pos.x + Math.cos(S.heading) * 60, S.pos.z - Math.sin(S.heading) * 60) > groundAt(S.pos.x - Math.cos(S.heading) * 60, S.pos.z + Math.sin(S.heading) * 60) ? -1 : 1); if (!S.toldTall) { S.toldTall = true; ui.call(`${o.pilot.first}: "Building ahead. I have it."`, 2000); } } else { S.dodge = 0; S.toldTall = false; }
        if (agl < MINH && want < 1 && S.peak > MINH) { want = 1.6; if (!S.toldLow) { S.toldLow = true; ui.call(`${o.pilot.first}: "Too low over the roofs. Climbing."`, 2200); } } else if (agl > MINH + 30) S.toldLow = false;
        if (agl > MAXH && want > 0) { want = 0; if (!S.toldHigh) { S.toldHigh = true; ui.call(`${o.pilot.first}: "That is high enough for the engine."`, 2200); } }
        if (S.fly > FLIGHT) land();
        // what is down there: the area you are over, once each
        if ((S.said -= dt) <= 0) { S.said = 18; const a = o.areaAt?.(S.pos.x, S.pos.z); if (a && !S.seen.has(a)) { S.seen.add(a); ui.call(`${o.pilot.first}: "${a}, under us now."`, 3200); } }
      }
      S.heading += yaw * 0.32 * dt; S.bank += (yaw * 0.35 - S.bank) * (1 - Math.exp(-dt * 2));
      S.climb += (want - Math.abs(yaw) * 0.5 - S.climb) * (1 - Math.exp(-dt * 1.2));
      fwd.set(Math.sin(S.heading), 0, Math.cos(S.heading));
      S.vel.copy(fwd).multiplyScalar(AIR + (want > 1 ? 1 : 0)).add(S.phase === 'home' && S.final ? wind.clone().multiplyScalar(0.5) : wind); S.vel.y = S.climb;
      S.pos.addScaledVector(S.vel, dt); S.pos.y = Math.max(g + 0.3, S.pos.y);
      S.dist += Math.hypot(S.vel.x, S.vel.z) * dt; S.peak = Math.max(S.peak, agl);
    } else if (S.phase === 'flare') { // down onto the wheels, rolling out; the wing drops behind
      const sp = Math.max(0, AIR * (1 - S.t / 4)); S.vel.copy(fwd).multiplyScalar(sp); S.pos.addScaledVector(S.vel, dt); S.pos.y = Math.max(g, S.pos.y - dt * 1.2); S.rpm = Math.max(0, 0.3 - S.t * 0.2);
      if (S.t > 1.5) { const k = Math.min(1, (S.t - 1.5) / 2); wingPivot.rotation.x = -1.3 * k; wingPivot.position.z = -0.6 - 4.5 * k; wingPivot.position.y = 1.5 - 1.3 * k; wing.userData.setOpen(1 - 0.6 * k); }
      if (S.t > 4.5) { S.phase = 'down'; S.t = 0; sfx('cheer'); const off = Math.round(new THREE.Vector3().subVectors(S.pos, start).setY(0).length()); S.result = { minutes: +(S.fly / 60).toFixed(1), peak: Math.round(S.peak), km: +(S.dist / 1000).toFixed(1), areas: [...S.seen], off }; ui.call(`${o.pilot.first}: "Welcome back to earth."`, 2400); }
    } else if (S.phase === 'down') { if (S.t > 2.5) { finish(S.result); return; } }
    craft.position.copy(S.pos); craft.rotation.set(0, S.heading, 0);
    // the trike swings under the wing in a turn, and the wing banks the other way less
    tr.rotation.z = -S.bank * 0.6; wingPivot.rotation.z = S.phase === 'fly' || S.phase === 'home' ? -S.bank * 0.2 : 0;
    if (alti && S.phase !== 'inflate') alti.set(Math.max(0, S.pos.y - g), Math.hypot(S.vel.x, S.vel.z) * 3.6, 'ground speed');
    if ((S.engT = (S.engT || 0) - dt) <= 0 && S.rpm > 0.2) { sfx('jet'); S.engT = 2.4; }
  }

  let ended = false;
  function finish(result) {
    if (ended) return; ended = true;
    keys.on = false; ui.show(false); card.remove(); pad.remove(); recMode(false); alti?.remove(); unkit.forEach((f) => f());
    you.dispose?.(); pilot.dispose?.();
    group.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); [].concat(m.material).forEach((x) => { x.map?.dispose(); x.dispose(); }); } });
    group.removeFromParent();
    o.onEnd?.(result, { x: S.pos.x + Math.cos(S.heading) * 2, z: S.pos.z - Math.sin(S.heading) * 2 });
  }
  keys.on = true;

  const cam = { from: new THREE.Vector3(), at: new THREE.Vector3() };
  function pose() {
    if (ended) return null;
    const P = S.pos, h = S.heading, fx = Math.sin(h), fz = Math.cos(h), far = innerWidth < innerHeight ? 1.6 : 1, sx = Math.cos(h), sz = -Math.sin(h);
    if (S.phase === 'brief') { cam.from.set(P.x + sx * 7 * far + fx * 6, 2.4, P.z + sz * 7 * far + fz * 6); cam.at.set(P.x - fx * 2, 0.8, P.z - fz * 2); }
    else if (S.view === 1) { cam.from.set(P.x + fx * 0.75, P.y + 1.55, P.z + fz * 0.75); cam.at.set(P.x + fx * 30, P.y - 6 + S.climb * 2, P.z + fz * 30); } // from your seat
    else if (S.view === 2) { cam.from.set(P.x + sx * 14, P.y + 9, P.z + sz * 14); cam.at.set(P.x, P.y + 4, P.z); } // alongside, the wing and the city
    else { cam.from.set(P.x - fx * 12 * far + sx * 3, P.y + 5.5, P.z - fz * 12 * far + sz * 3); cam.at.set(P.x + fx * 6, P.y + 2.6, P.z + fz * 6); } // behind and above: the wing, you, the city ahead
    you.obj.visible = S.view !== 1 || S.phase === 'brief';
    return { x: P.x, z: P.z, yaw: h, hide: true, cam: { from: cam.from, at: cam.at, lock: S.phase !== 'brief' }, speed: 0 };
  }
  return { update, pose, get phase() { return S.phase; }, state: () => ({ phase: S.phase, alt: Math.round(S.pos.y), fly: Math.round(S.fly), heading: +S.heading.toFixed(2), final: !!S.final, result: S.result }), land, finish };
}
