// Skydiving over the open city (Elvis, 12 October 2026: recreation "with guides, tutorials and fees", "very
// sophisticated details"). A tandem first, with an instructor strapped to your back who briefs you on the climb and pulls
// if you do not; solo jumps after that, with an automatic opener as the last resort. The plane climbs to 3,000 m above
// the city (the open world streams in below), you jump on the run in, fall at up to 200 km/h, open the canopy, fly it
// down and flare onto a target laid out in your district's park. Wind drifts you; landing softly and close scores.
//
// The physics, in brief: freefall is gravity against drag (belly-to-earth terminal ~55 m/s, a drogue slows a tandem to
// ~50); tracking (W) turns some of the fall into forward speed. The canopy is a ram-air wing: about 10 m/s forward and
// 5 m/s down in full flight, slower on brakes, faster and steeper in a turn; a flare in the last few metres trades the
// forward speed for a soft touchdown. Everything moves relative to the air, and the air moves with the wind.
import * as THREE from 'three';
import { person, gameKeys, sportsUI } from '../sports/common.js';
import { sfx } from '../audio.js';
import { C, FONT } from '../uikit.js';

const EXIT = 3000, PULL = 1500, AAD = 750, G = 9.81;
const STEPS = [
  { t: 'The exit', b: 'At the door, feet on the step, look up at the horizon. Space to go. Out of the plane you arch: hips forward, chin up, arms and legs out, like a banana bent backwards. A good arch keeps you belly to the earth.' },
  { t: 'Freefall', b: 'You fall at up to 200 km/h. A and D turn you, W leans you forward into a track: you move across the sky as well as down. S stops the track. Watch the altimeter at the top of the screen.' },
  { t: 'Pull at 1,500 m', b: 'At 1,500 m you wave off and pull: Space. Lower is not braver. On a tandem I pull if you have not; solo, the automatic opener fires at 750 m, and that is a bad day.' },
  { t: 'Under the canopy', b: 'Look up and check it: a rectangle, cells full, lines straight. A and D are the toggles: pull one to turn that way. S pulls both: brakes, slower and gentler. W lets them up for speed.' },
  { t: 'Landing', b: 'Fly to the target in the park, the windsock shows the wind. Turn into the wind for the last 100 m, and at 3 m above the ground flare: hold S. Feet together, knees bent. F speeds the canopy ride up if you want.' },
];

/**
 * @param o { scene, world, openWorld, target: { x, z, name }, guide: { name, look }, solo: bool, look, toast, start: { x, z }, onEnd(result, landedAt) }
 */
export function createSkydive(o) {
  const { scene, world, openWorld, toast } = o;
  const group = new THREE.Group(); group.name = 'skydive'; scene.add(group);
  const keys = gameKeys(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'f', 'c', 'escape', 'enter']);
  const ui = sportsUI();
  // while you jump, the street's own touch controls, your badge and the key hints make way for the jump's buttons
  const css = document.createElement('style');
  css.textContent = 'body.bw-sky #lk-touch, body.bw-sky #lk-me, body.bw-sky #lk-prompt { display: none !important; } @media (pointer: coarse) { body.bw-sky #lk-skeys { display: none !important; } }';
  document.head.appendChild(css); document.body.classList.add('bw-sky');
  const M = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });

  // ---------- the wind: a steady breeze from one side, for the whole jump ----------
  const windDir = Math.random() * Math.PI * 2, windSpd = 2.5 + Math.random() * 3;
  const wind = new THREE.Vector3(Math.sin(windDir) * windSpd, 0, Math.cos(windDir) * windSpd);

  // ---------- the target in the park: rings, a big DZ and a windsock ----------
  const T = o.target;
  const tgt = new THREE.Group(); tgt.position.set(T.x, 0.07, T.z); group.add(tgt);
  [[14, C.paper], [11, C.coral], [8, C.paper], [5, C.coral], [2.2, C.amber]].forEach(([r, c], i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2), M(c, 1)); m.position.y = i * 0.004; tgt.add(m); });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 6, 8).translate(0, 3, 0), M('#d8d2c4')); pole.position.set(18, 0, 0); tgt.add(pole);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.2, 10, 1, true).rotateZ(-Math.PI / 2).translate(1.1, 0, 0), new THREE.MeshStandardMaterial({ color: C.coral, side: THREE.DoubleSide }));
  sock.position.set(18, 5.6, 0); sock.rotation.y = -windDir + Math.PI / 2; tgt.add(sock);

  // ---------- the plane: a high-wing jump plane, clay ----------
  const plane = new THREE.Group(); group.add(plane);
  {
    const body = M('#f4f1ea'), stripe = M(C.teal), dark = M('#2b2f36', 0.5);
    const add = (g, m, x = 0, y = 0, z = 0) => { const k = new THREE.Mesh(g, m); k.position.set(x, y, z); plane.add(k); return k; };
    add(new THREE.BoxGeometry(1.7, 1.8, 11), body, 0, 0, 0);
    add(new THREE.BoxGeometry(1.72, 0.3, 11.02), stripe, 0, -0.2, 0);
    add(new THREE.CylinderGeometry(0.85, 0.7, 1.6, 12).rotateX(Math.PI / 2), body, 0, 0, 6.2);
    add(new THREE.BoxGeometry(16, 0.25, 2), body, 0, 1.05, 1.5);
    add(new THREE.BoxGeometry(5, 0.2, 1.3), body, 0, 0.4, -5.2);
    add(new THREE.BoxGeometry(0.2, 2.2, 1.6), stripe, 0, 1.4, -5.1);
    add(new THREE.BoxGeometry(1.75, 0.7, 2.2), dark, 0, 0.45, 3.3); // the windows
    add(new THREE.BoxGeometry(0.05, 1.5, 1.2), dark, 0.86, -0.05, -1.4); // the open door, on the right
    [-1, 1].forEach((s) => add(new THREE.BoxGeometry(0.12, 1.1, 0.12).rotateZ(s * 0.5), dark, s * 0.9, -1.1, 1.8));
    const prop = add(new THREE.BoxGeometry(3, 0.25, 0.08), dark, 0, 0, 7.05); plane.userData.prop = prop;
  }
  plane.visible = false;

  // ---------- the jumpers: you (and on a tandem, the instructor on your back), the canopy, a drogue ----------
  const rig = new THREE.Group(); group.add(rig);
  const you = person(o.look, 'you-skydive'), inst = o.solo ? null : person(o.guide.look, `guide-${o.guide.name}`);
  const body = new THREE.Group(); rig.add(body); body.add(you.obj);
  if (inst) { inst.obj.position.set(0, 0.12, -0.32); body.add(inst.obj); }
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.2), M('#2b2f36', 0.6)); pack.position.set(0, 1.12, inst ? -0.5 : -0.2); body.add(pack);
  // the canopy: nine cells in a shallow arc, in stripes, with its lines
  const canopy = new THREE.Group(); rig.add(canopy);
  {
    const cols = [C.coral, C.paper, C.teal, C.amber, C.coral, C.amber, C.teal, C.paper, C.coral], span = inst ? 10 : 8, cell = span / 9, chord = inst ? 3.6 : 3, R = span * 0.9;
    cols.forEach((c, i) => {
      const a = ((i - 4) * cell) / R, m = new THREE.Mesh(new THREE.BoxGeometry(cell * 0.98, 0.42, chord), M(c, 0.7));
      m.position.set(Math.sin(a) * R, Math.cos(a) * R - R, 0); m.rotation.z = -a; canopy.add(m);
    });
    const pts = []; for (let i = 0; i <= 8; i++) { const a = ((i - 4) * cell) / R; for (const z of [-chord * 0.4, chord * 0.4]) pts.push(Math.sin(a) * R, Math.cos(a) * R - R - 0.2, z, 0, -5.8, 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    canopy.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#5a4a3a' })));
    canopy.position.y = 7.4;
  }
  canopy.visible = false;
  const drogue = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.8, 12, 1, true).translate(0, -0.4, 0), new THREE.MeshStandardMaterial({ color: C.amber, side: THREE.DoubleSide })); drogue.visible = false; group.add(drogue);

  // ---------- the state ----------
  const S = { phase: 'brief', step: 0, t: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), heading: 0, open: 0, pulled: false, ff: 1, view: 0, peak: 0, freefall: 0, flare: 0, result: null };
  // the jump run: into the wind, starting far enough upwind that you can fly back to the target
  const runDir = windDir + Math.PI, startOff = 800;
  const run0 = new THREE.Vector3(T.x - Math.sin(runDir) * startOff, EXIT, T.z - Math.cos(runDir) * startOff);
  const planePos = new THREE.Vector3(), planeHead = { a: 0 };
  function placePlane(t) {
    if (S.phase === 'brief') { // circling over the jump run while you are briefed
      const a = t * 0.05; planePos.set(run0.x + Math.cos(a) * 900, EXIT - 60, run0.z + Math.sin(a) * 900); planeHead.a = Math.atan2(-Math.sin(a), Math.cos(a));
    } else { // the run in, at 35 m/s
      planePos.set(run0.x + Math.sin(runDir) * S.t * 35, EXIT, run0.z + Math.cos(runDir) * S.t * 35); planeHead.a = runDir;
    }
    plane.position.copy(planePos); plane.rotation.set(0, planeHead.a, S.phase === 'brief' ? -0.18 : 0);
    plane.userData.prop.rotation.z += 1.8;
  }

  // ---------- the briefing card ----------
  const card = document.createElement('div');
  card.id = 'bw-brief';
  card.innerHTML = `<style>
    #bw-brief { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 40; width: min(460px, calc(100vw - 32px)); padding: 16px 18px; border-radius: 20px;
      background: ${C.paper}; color: ${C.ink}; font: 600 14px/1.45 ${FONT}; box-shadow: 0 5px 0 rgba(59,42,32,.2), 0 18px 40px rgba(10,14,30,.3); }
    #bw-brief h4 { margin: 0 0 2px; font: 800 18px/1.2 ${FONT}; } #bw-brief .who { color: ${C.teal}; font-weight: 800; font-size: 12px; margin-bottom: 6px; }
    #bw-brief .dots { display: flex; gap: 5px; margin: 10px 0 0; } #bw-brief .dots i { width: 8px; height: 8px; border-radius: 50%; background: #e3d4b4; } #bw-brief .dots i.on { background: ${C.coral}; }
    #bw-brief .row { display: flex; gap: 8px; margin-top: 12px; } #bw-brief button { flex: 1; border: 0; border-radius: 999px; padding: 10px; font: 800 14px/1 ${FONT}; cursor: pointer; background: #efe2c4; color: ${C.ink}; }
    #bw-brief button.go { background: ${C.amber}; box-shadow: 0 3px 0 #c98f1f; }
  </style><div class="who"></div><h4></h4><div class="b"></div><div class="dots"></div><div class="row"><button class="back">Back</button><button class="go">Next</button></div>`;
  document.body.appendChild(card);
  const renderCard = () => {
    const st = STEPS[S.step];
    card.querySelector('.who').textContent = `${o.guide.name}, your instructor · ${o.solo ? 'solo jump' : 'tandem'} · climbing to ${EXIT.toLocaleString()} m`;
    card.querySelector('h4').textContent = `${S.step + 1}. ${st.t}`; card.querySelector('.b').textContent = st.b;
    card.querySelector('.dots').innerHTML = STEPS.map((_, i) => `<i class="${i <= S.step ? 'on' : ''}"></i>`).join('');
    card.querySelector('.back').style.visibility = S.step ? 'visible' : 'hidden';
    card.querySelector('.go').textContent = S.step === STEPS.length - 1 ? 'Ready: to the door' : 'Next';
  };
  card.querySelector('.back').onclick = () => { S.step = Math.max(0, S.step - 1); renderCard(); sfx('tap'); };
  card.querySelector('.go').onclick = () => { if (S.step < STEPS.length - 1) { S.step++; renderCard(); sfx('tap'); } else toDoor(); };
  renderCard();

  // ---------- on a phone: the buttons ----------
  const touch = matchMedia('(pointer: coarse)').matches;
  const pad = document.createElement('div');
  if (touch) {
    pad.innerHTML = `<style>#bw-skypad{position:fixed;inset:auto 0 18px 0;display:none;justify-content:space-between;padding:0 16px;z-index:35;pointer-events:none}
      #bw-skypad.on{display:flex} #bw-skypad div{display:flex;gap:10px;pointer-events:auto} #bw-skypad button{width:64px;height:64px;border-radius:50%;border:0;background:${C.paper};color:${C.ink};font:800 13px/1 ${FONT};box-shadow:0 3px 0 rgba(59,42,32,.25)}
      #bw-skypad button.big{background:${C.amber}}</style>
      <div><button data-k="a">◀</button><button data-k="d">▶</button></div><div><button data-k="s">Brake</button><button data-k="w">Track</button><button data-k=" " class="big">Pull</button></div>`;
    pad.id = 'bw-skypad'; document.body.appendChild(pad);
    const held = new Set();
    pad.querySelectorAll('button').forEach((b) => {
      const k = b.dataset.k;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); held.add(k); if (k === ' ') pressSpace(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, () => held.delete(k)));
    });
    pad.held = held;
  }
  const down = (k) => keys.has(k) || pad.held?.has(k);

  function toDoor() {
    card.remove(); S.phase = 'door'; S.t = 0; sfx('door');
    ui.show(true); ui.keys([['Space', 'jump'], ['Esc', 'stay in the plane']]);
    pad.classList?.add('on');
    ui.call(`${o.guide.name}: door's open. Look at the horizon. Space when you're ready.`, 4000);
  }
  function pressSpace() {
    if (S.phase === 'door') exit();
    else if (S.phase === 'freefall' && !S.pulled) pull(false);
  }
  function exit() {
    S.phase = 'freefall'; S.t = 0; sfx('whoosh');
    // out of the door on the right of the plane, with the plane's speed
    const sideX = Math.cos(runDir), sideZ = -Math.sin(runDir);
    S.pos.set(planePos.x + sideX * 1.4, EXIT - 1.5, planePos.z + sideZ * 1.4);
    S.vel.set(Math.sin(runDir) * 35, -2, Math.cos(runDir) * 35);
    S.heading = runDir; drogue.visible = !!inst;
    ui.keys([['A D', 'turn'], ['W', 'track'], ['S', 'stop'], ['Space', 'pull'], ['C', 'camera']]);
    ui.call(inst ? `${o.guide.name}: Arch! Arch! Drogue's out.` : 'Arch! Check your altitude.', 2600);
  }
  function pull(auto) {
    S.pulled = true; S.phase = 'opening'; S.t = 0; drogue.visible = false; canopy.visible = true; sfx('flap');
    const alt = Math.round(S.pos.y);
    S.pullAlt = alt; S.autoPull = auto;
    ui.call(auto ? (inst ? `${o.guide.name} pulls at ${alt.toLocaleString()} m.` : `The automatic opener fires at ${alt.toLocaleString()} m.`) : `You pull at ${alt.toLocaleString()} m.`, 2600);
    ui.keys([['A D', 'toggles'], ['S', 'brakes / flare'], ['W', 'speed'], ['F', 'faster'], ['C', 'camera']]);
  }

  // ---------- the ground under you: the city's roofs out in the open city, the street otherwise ----------
  const groundAt = (x, z, y = Infinity) => {
    if (openWorld?.active && Math.hypot(x, z) > world.radius) { const r = openWorld.solidAt?.(x, z); return typeof r === 'number' ? r : 0; }
    // in the district: the top of whatever building is under you (world.solidAt), once you are low enough to meet one
    if (y > 320 || !world.solidAt?.(x, 0.5, z)) return 0;
    let h = 0.5; while (h < 320 && world.solidAt(x, h, z)) h += 1; return h;
  };

  // ---------- poses ----------
  function boxPose(r) {
    const { L, R } = r.rig;
    [[L, -1], [R, 1]].forEach(([j, s]) => { j.shoulder.rotation.set(-0.2, 0, s * 1.35); j.elbow.rotation.set(-1.2, 0, 0); j.hip.rotation.set(-0.25, 0, s * 0.25); j.knee.rotation.set(1.35, 0, 0); });
    r.rig.neck.rotation.set(-0.5, 0, 0);
  }
  function hangPose(r, brake) {
    const { L, R } = r.rig;
    [[L, -1], [R, 1]].forEach(([j, s]) => { j.shoulder.rotation.set(-2.7 + brake * 1.6, 0, s * 0.25); j.elbow.rotation.set(-0.2 - brake * 0.6, 0, 0); j.hip.rotation.set(-0.15, 0, 0); j.knee.rotation.set(0.25, 0, 0); });
    r.rig.neck.rotation.set(0.15, 0, 0);
  }

  // ---------- the step ----------
  const fwd = new THREE.Vector3(), cam = { from: new THREE.Vector3(), at: new THREE.Vector3() };
  let windT = 0, engineT = 0;
  function update(dt) {
    dt = Math.min(dt, 0.05);
    const tk = keys.take(); if (tk.includes(' ')) pressSpace();
    if (tk.includes('c')) S.view = (S.view + 1) % 3;
    if (tk.includes('escape')) { if (S.phase === 'brief' || S.phase === 'door') { finish({ aborted: true }); return; } }
    if (tk.includes('enter') && S.phase === 'brief') card.querySelector('.go').click();
    if (tk.includes('f') && (S.phase === 'canopy')) { S.ff = S.ff === 1 ? 4 : 1; toast(S.ff > 1 ? 'Canopy ride sped up (F again for real time).' : 'Real time.', 1600); }
    const step = dt * (S.phase === 'canopy' && S.pos.y - groundAt(S.pos.x, S.pos.z, S.pos.y) > 120 ? S.ff : 1);
    S.t += step;
    if (S.phase === 'brief' || S.phase === 'door') {
      placePlane(S.t); plane.visible = true; rig.visible = false;
      if ((engineT -= dt) <= 0) { sfx('jet'); engineT = 2.4; }
      if (S.phase === 'door' && S.t > 40) { ui.call(`${o.guide.name}: we're past the spot. Going round.`, 2600); S.t = 0; }
      // on the door, you (and your instructor behind you) stand in the doorway, facing out
      if (S.phase === 'door') {
        const sx = Math.cos(runDir), sz = -Math.sin(runDir);
        rig.visible = true; const fx = Math.sin(runDir), fz = Math.cos(runDir); rig.position.set(planePos.x + sx * 0.7 - fx * 1.4, planePos.y - 0.9, planePos.z + sz * 0.7 - fz * 1.4); rig.rotation.set(0, runDir + Math.PI / 2, 0);
        body.rotation.set(0, 0, 0); hangPose(you, 0.6); if (inst) hangPose(inst, 0.6);
      }
      return;
    }
    // the plane flies on and away
    placePlane(S.t + 999); plane.position.addScaledVector(new THREE.Vector3(Math.sin(runDir), 0, Math.cos(runDir)), 35 * S.t); if (S.t > 20) plane.visible = false;
    rig.visible = true;
    const air = S.vel.clone().sub(wind); // the air you move through
    const yaw = (down('d') || down('arrowright') ? 1 : 0) - (down('a') || down('arrowleft') ? 1 : 0);
    if (S.phase === 'freefall') {
      S.freefall += step;
      const track = down('w') || down('arrowup'), stop = down('s') || down('arrowdown');
      S.heading -= yaw * 1.3 * step;
      fwd.set(Math.sin(S.heading), 0, Math.cos(S.heading));
      const vt = inst ? 50 : track ? 60 : 55, k = G / (vt * vt), sp = air.length();
      S.vel.addScaledVector(air, -k * sp * step); S.vel.y -= G * step;
      if (track) { const along = air.dot(fwd); if (along < 16) S.vel.addScaledVector(fwd, 7 * step); }
      if (stop) { S.vel.x -= air.x * 0.6 * step; S.vel.z -= air.z * 0.6 * step; }
      S.pos.addScaledVector(S.vel, step);
      body.rotation.set(Math.PI / 2 - (track ? 0.25 : 0), 0, 0); boxPose(you); if (inst) boxPose(inst);
      rig.rotation.set(0, S.heading, -yaw * 0.35);
      if ((windT -= dt) <= 0) { sfx('whoosh'); windT = 0.9; }
      const alt = S.pos.y - groundAt(S.pos.x, S.pos.z, S.pos.y);
      if (inst && alt < PULL && !S.pulled) pull(true);
      if (!inst && alt < AAD && !S.pulled) pull(true);
      if (inst && alt < 1700 && !S.waved) { S.waved = true; ui.call(`${o.guide.name}: Wave off... and pull!`, 2000); }
      drogue.position.copy(S.pos).add(new THREE.Vector3(0, 4, 0));
    } else {
      // opening: three seconds from freefall to flying
      if (S.phase === 'opening') { S.open = Math.min(1, S.t / 3); if (S.open >= 1) { S.phase = 'canopy'; S.t = 0; ui.call(`${o.guide.name}: Good canopy! Find the windsock, find the target.`, 3000); } }
      canopy.scale.set(0.2 + 0.8 * S.open, 0.4 + 0.6 * S.open, 0.2 + 0.8 * S.open);
      const brake = down('s') || down('arrowdown') ? 1 : 0, speed = down('w') || down('arrowup') ? 1 : 0;
      S.heading -= yaw * (0.5 + 0.2 * speed) * step;
      fwd.set(Math.sin(S.heading), 0, Math.cos(S.heading));
      const alt = S.pos.y - groundAt(S.pos.x, S.pos.z, S.pos.y);
      // a flare: the brakes held in the last few metres trade the forward speed for a soft touchdown, for a moment
      if (brake && alt < 6) S.flare = Math.min(1, S.flare + step * 1.6); else S.flare = Math.max(0, S.flare - step * 0.6);
      const fs = (brake ? 5 : speed ? 12.5 : 10) * (1 - S.flare * 0.7), sink = (brake ? 3.2 : speed ? 7 : 5) + Math.abs(yaw) * 1.6 * (1 - brake * 0.5) - S.flare * 3.4;
      const tv = new THREE.Vector3(fwd.x * fs, -Math.max(0.6, sink), fwd.z * fs).add(wind), kk = S.phase === 'opening' ? 1.2 : 2.5;
      S.vel.lerp(tv, 1 - Math.exp(-kk * step));
      S.pos.addScaledVector(S.vel, step);
      body.rotation.set(0, 0, 0); hangPose(you, brake); if (inst) hangPose(inst, brake);
      rig.rotation.set(0, S.heading, -yaw * 0.25 * (S.phase === 'canopy' ? 1 : 0));
      canopy.rotation.set(-0.08 + brake * 0.12, 0, yaw * 0.15);
      if (S.phase === 'canopy' && alt <= 0.05) { land(Math.max(0, -S.vel.y)); return; }
      if (S.phase === 'canopy' && alt < 30 && !S.toldFlare) { S.toldFlare = true; ui.call(o.solo ? 'Flare at 3 m: hold S.' : `${o.guide.name}: Legs up for the slide... flare at 3 m, hold S!`, 2600); }
    }
    rig.position.copy(S.pos);
    S.peak = Math.max(S.peak, Math.hypot(S.vel.x, S.vel.y, S.vel.z));
    const alt = Math.max(0, S.pos.y - groundAt(S.pos.x, S.pos.z, S.pos.y));
    ui.board([{ name: 'Altitude', cols: [`${Math.round(alt).toLocaleString()} m`] }, { name: S.phase === 'freefall' ? 'Fall' : 'Down', cols: [`${Math.round(-S.vel.y * 3.6)} km/h`] }], ['', '']);
    ui.meter(Math.min(1, alt / EXIT), PULL / EXIT);
  }

  function land(vy) {
    const d = Math.hypot(S.pos.x - T.x, S.pos.z - T.z), soft = vy < 2 ? 'soft' : vy < 3.5 ? 'firm' : 'hard';
    const g = groundAt(S.pos.x, S.pos.z, S.pos.y), roof = g > 1, wall = g > S.pos.y + 0.6; // flown into the side of one, not onto it
    if (wall) vy = Math.max(vy, 4);
    sfx(soft === 'hard' ? 'thud' : 'land'); if (d < 15 && soft !== 'hard') sfx('cheer');
    const pts = Math.max(0, Math.round(100 - d * 1.2 - (soft === 'hard' ? 40 : soft === 'firm' ? 15 : 0) - (roof ? 50 : 0)));
    S.result = { distance: Math.round(d), landing: wall ? 'wall' : roof ? 'roof' : soft, pullAlt: S.pullAlt, autoPull: !!S.autoPull, freefall: Math.round(S.freefall), peak: Math.round(S.peak * 3.6), points: pts, solo: !!o.solo };
    S.phase = 'landed'; S.t = 0;
    canopy.visible = false;
    ui.call(wall ? `Into the side of a building. ${o.guide.name} radios for help.` : roof ? `On a roof, ${d < 999 ? Math.round(d) : 'far'} m from the target. ${o.guide.name} sighs.` : d < 15 ? `In the target! ${Math.round(d)} m, a ${soft} landing.` : `${Math.round(d)} m from the target, a ${soft} landing.`, 4000);
    setTimeout(() => finish(S.result), 3500);
  }

  let ended = false;
  function finish(result) {
    if (ended) return; ended = true;
    keys.on = false; ui.show(false); ui.meter(null); card.remove(); pad.remove?.(); document.body.classList.remove('bw-sky'); css.remove();
    you.dispose?.(); inst?.dispose?.();
    group.removeFromParent();
    o.onEnd?.(result, { x: S.phase === 'landed' ? S.pos.x : T.x, z: S.phase === 'landed' ? S.pos.z : T.z });
  }

  keys.on = true;
  // the camera, and where the player stands meanwhile (main.js puts you there while a game is on)
  function pose() {
    if (ended) return null;
    const P = S.phase === 'brief' || S.phase === 'door' ? planePos : S.pos;
    const h = S.phase === 'brief' ? planeHead.a : S.phase === 'door' ? runDir : S.heading;
    const fx = Math.sin(h), fz = Math.cos(h);
    if (S.phase === 'brief') { // a slow orbit round the plane, the city far below
      const a = S.t * 0.12; cam.from.set(P.x + Math.sin(a) * 28, P.y + 7, P.z + Math.cos(a) * 28); cam.at.copy(P);
    } else if (S.phase === 'door') { // in the door, looking out and down
      const sx = Math.cos(runDir), sz = -Math.sin(runDir);
      cam.from.set(P.x + sx * 5 - fx * 8, P.y + 1.2, P.z + sz * 5 - fz * 8); cam.at.set(P.x + sx * 1.2 - fx * 1.4, P.y - 1.6, P.z + sz * 1.2 - fz * 1.4);
    } else if (S.view === 1) { // through your eyes
      const up = S.phase === 'freefall' ? 0 : 1.6;
      cam.from.set(P.x + fx * 0.4, P.y + up, P.z + fz * 0.4); cam.at.set(P.x + fx * 30, P.y + up - (S.phase === 'freefall' ? 60 : 12), P.z + fz * 30);
    } else if (S.view === 2) { // from the target, looking up
      cam.from.set(T.x + 10, 2, T.z + 10); cam.at.set(P.x, P.y + 3, P.z);
    } else if (S.phase === 'freefall') {
      cam.from.set(P.x - fx * 6, P.y + 3.2, P.z - fz * 6); cam.at.set(P.x + fx * 2, P.y - 1, P.z + fz * 2);
    } else if (S.phase === 'landed') {
      const a = S.t * 0.3; cam.from.set(P.x + Math.sin(a) * 8, P.y + 3, P.z + Math.cos(a) * 8); cam.at.set(P.x, P.y + 1, P.z);
    } else { // behind and a little below the canopy: you, the wing above, the city ahead
      cam.from.set(P.x - fx * 11, P.y + 2.5, P.z - fz * 11); cam.at.set(P.x + fx * 4, P.y + 1.5, P.z + fz * 4);
    }
    // in the plane you are not over the street yet: where you stand stays where you booked (o.start)
    const at = (S.phase === 'brief' || S.phase === 'door') && o.start ? o.start : P;
    return { x: at.x, z: at.z, yaw: h, hide: true, cam: { from: cam.from, at: cam.at }, speed: 0 };
  }
  return { update, pose, get phase() { return S.phase; }, state: () => ({ phase: S.phase, alt: Math.round(S.pos.y), vel: S.vel.toArray().map((v) => +v.toFixed(1)), heading: +S.heading.toFixed(2), open: S.open, result: S.result }), _press: pressSpace, _keys: keys, finish };
}
