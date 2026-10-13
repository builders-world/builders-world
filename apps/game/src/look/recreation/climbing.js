// Bouldering in the park (Elvis, 12 October 2026: recreation "with guides, tutorials and fees"). A coach from the city
// runs a freestanding bouldering wall on the grass: 4.5 m high, a vertical left half and an overhanging right half, thick
// crash mats below. The problems are set in colours and graded V0 to V3 (the V scale; Font 4 to 6A): the harder, the
// further apart the holds, the smaller they are, and the more of it on the overhang.
//
// How it plays: your hands go from hold to hold of the problem's colour. A move costs grip (the pump meter): more for a
// long reach, a small hold (a crimp or a sloper) or the overhang; hanging costs grip too, a jug far less than a crimp.
// Shake out on a jug to recover, chalk up for a few easier moves. If the pump fills, you come off onto the mats. Both
// hands on the top hold is a send; first try is a flash.
import * as THREE from 'three';
import { person, playerPerson, gameKeys, sportsUI } from '../sports/common.js';
import { sfx } from '../audio.js';
import { C, FONT } from '../uikit.js';
import { briefCard, recMode } from './brief.js';

const H = 4.5, W = 8, LEAN = 0.35; // the overhang's lean back from vertical, radians (about 20 degrees)
const PROBLEMS = [
  { name: 'Yellow', grade: 'V0', col: '#f2c230', n: 9, reach: 0.62, small: 0, over: 0 },
  { name: 'Green', grade: 'V1', col: '#3fae5a', n: 9, reach: 0.72, small: 0.25, over: 0.2 },
  { name: 'Blue', grade: 'V2', col: '#2f8fd0', n: 9, reach: 0.8, small: 0.45, over: 0.6 },
  { name: 'Red', grade: 'V3', col: '#d9483b', n: 10, reach: 0.9, small: 0.65, over: 1 },
];
const KIND = { jug: { cost: 0, hang: 0.6, r: 0.11 }, crimp: { cost: 9, hang: 3.6, r: 0.06 }, sloper: { cost: 6, hang: 2.8, r: 0.1 } };
const STEPS = [
  { t: 'The problems', b: 'Each colour is one problem, from the two start holds to the TOP hold. Yellow is V0, the easiest; red V3. Only that colour counts for hands.' },
  { t: 'Moving', b: 'The holds you can reach light up. A and D (or the arrows) pick the hold, W or Space moves to it. Your other hand follows when it should.' },
  { t: 'Grip', b: 'Every move costs grip, more for long reaches, small crimps, round slopers and the overhang. The pump meter shows it. Hanging on a crimp drains you; a jug barely does.' },
  { t: 'Rest and chalk', b: 'On a jug, hold S to shake out and recover. C chalks your hands: the next few moves are easier. If the pump fills, you come off, onto the mats.' },
  { t: 'Topping out', b: 'Both hands on the TOP hold is a send. On your first try it is a flash. Falling is part of it: try again.' },
];

/** a seeded random, so a problem's holds are the same every visit */
const seeded = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

/**
 * @param o { scene, at: { x, z }, dir: { x, z } (unit, from the climber to the wall), coach: { name, look }, look, toast, onEnd(result) }
 */
export function createClimbing(o) {
  const { scene } = o;
  const group = new THREE.Group(); group.name = 'climbing'; scene.add(group);
  const keys = gameKeys(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'c', 'escape', 'enter', '1', '2', '3', '4']);
  const ui = sportsUI();
  recMode(true);
  const M = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const f = new THREE.Vector3(o.dir.x, 0, o.dir.z).normalize(), heading = Math.atan2(f.x, f.z);
  // the wall's frame: u along it (to the climber's right), up, and its face 2.2 m beyond where you stand
  const base = new THREE.Vector3(o.at.x, 0, o.at.z).addScaledVector(f, 2.2);
  const wall = new THREE.Group(); wall.position.copy(base); wall.rotation.y = heading + Math.PI; group.add(wall); // its +z looks at you
  wall.updateMatrixWorld(true); // world() below reads it before the first frame
  // a point on the face: u across (-W/2..W/2, the climber's right is -x in the wall's frame), y up; the right half leans out
  const overAt = (u) => (u > 0 ? Math.min(1, u / 0.6) : 0);
  const faceZ = (u, y) => Math.tan(LEAN) * y * overAt(u);
  const local = (u, y, out = new THREE.Vector3()) => out.set(-u, y, faceZ(u, y));
  const world = (u, y, out = new THREE.Vector3()) => wall.localToWorld(local(u, y, out));

  // ---------- the wall: plywood panels in two planes, the frame, the mats ----------
  {
    const ply = M('#e9dcc0', 0.95), frame = M('#5b4a3a', 0.8);
    const left = new THREE.Mesh(new THREE.BoxGeometry(W / 2, H, 0.08), ply); left.position.set(W / 4, H / 2, -0.04); wall.add(left);
    const len = H / Math.cos(LEAN), right = new THREE.Mesh(new THREE.BoxGeometry(W / 2 - 0.6, len, 0.08), ply);
    right.position.set(-(W / 4 + 0.3), H / 2, Math.tan(LEAN) * H / 2 - 0.04); right.rotation.x = LEAN; wall.add(right);
    // the hinge between them: a narrow twisted strip
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.6, len, 0.08), ply); strip.position.set(-0.3, H / 2, Math.tan(LEAN) * H / 4 - 0.04); strip.rotation.x = LEAN / 2; wall.add(strip);
    [[W / 2, 0], [-W / 2, Math.tan(LEAN) * H]].forEach(([x, top]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, H + 0.2, 0.16), frame); p.position.set(x, H / 2, -0.3); wall.add(p); void top; });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.2, 0.2), frame); beam.position.set(0, H + 0.05, -0.2); wall.add(beam);
    const mat = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.35, 3.2), M('#2b4f7a', 0.9)); mat.position.set(0, 0.175, 1.75); wall.add(mat);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 3.2), M('#1d3550')); seam.position.set(0, 0.18, 1.75); wall.add(seam);
  }

  // ---------- the problems: their holds, set in colour ----------
  const holdGeo = { jug: new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 0.9), crimp: new THREE.BoxGeometry(2.2, 0.6, 0.9), sloper: new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.3, 0.55, 1) };
  const problems = PROBLEMS.map((P, pi) => {
    const rnd = seeded(1000 + pi * 97), holds = [];
    let u = [-2.9, -1.1, 0.9, 2.4][pi], y = 1.35; // yellow and green on the vertical, blue and red out the overhang
    holds.push({ u: u - 0.28, y, k: 'jug', start: true }, { u: u + 0.28, y, k: 'jug', start: true });
    for (let i = 0; i < P.n; i++) {
      y += P.reach * (0.42 + rnd() * 0.22); if (y > H - 0.35) break;
      u += (rnd() - 0.5) * P.reach * 1.2; u = Math.max(-3.6, Math.min(3.6, u));
      const k = rnd() < P.small ? (rnd() < 0.55 ? 'crimp' : 'sloper') : 'jug';
      holds.push({ u, y, k });
    }
    holds.push({ u, y: H - 0.18, k: 'jug', top: true });
    holds.forEach((h) => {
      const m = new THREE.Mesh(holdGeo[h.k], new THREE.MeshStandardMaterial({ color: P.col, roughness: 0.6, emissive: P.col, emissiveIntensity: 0 }));
      m.scale.setScalar(KIND[h.k].r); local(h.u, h.y, m.position); m.position.z += 0.06; m.rotation.x = Math.PI / 2 + LEAN * overAt(h.u); /* out of the face, a little down on the overhang */ wall.add(m); h.m = m;
    });
    // the start tags and the TOP tag, in the problem's colour
    const tag = (h, text) => { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 48; const g = cv.getContext('2d'); g.fillStyle = P.col; g.fillRect(0, 0, 128, 48); g.fillStyle = '#fff'; g.font = '800 30px sans-serif'; g.textAlign = 'center'; g.fillText(text, 64, 35); const t = new THREE.CanvasTexture(cv); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.11), new THREE.MeshBasicMaterial({ map: t })); local(h.u, h.y - 0.2, s.position); s.position.z += 0.05; s.rotation.x = LEAN * overAt(h.u); wall.add(s); };
    tag(holds[0], `${P.grade}`); tag(holds[holds.length - 1], 'TOP');
    return { ...P, holds, tries: 0, sent: false };
  });

  // ---------- you and the coach (spotting) ----------
  const me = playerPerson(o.avatar, 'you-climbing'); group.add(me.obj);
  const coach = person(o.coach.look, `coach-${o.coach.name}`); world(-W / 2 - 0.9, 0, coach.obj.position).addScaledVector(f, -1.6); coach.obj.position.y = 0; coach.obj.rotation.y = heading - 0.6; group.add(coach.obj);

  // ---------- the state ----------
  const S = { phase: 'brief', t: 0, p: null, hands: [null, null], pump: 0, chalk: 0, chalkT: 0, sel: 0, fall: null, moves: 0, log: [] };
  const standAt = base.clone().addScaledVector(f, -1.4);

  // ---------- the lesson, then the choice of problem ----------
  const card = briefCard({ id: 'bw-climb-brief', who: `${o.coach.name}, your coach · bouldering · V0 to V3`, steps: STEPS, last: 'Choose a problem', onDone: () => { S.phase = 'pick'; ui.show(true); pick(); } });
  const picker = document.createElement('div'); picker.id = 'bw-climb-pick';
  picker.innerHTML = `<style>#bw-climb-pick { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 40; display: none; gap: 8px; padding: 12px; border-radius: 20px; background: ${C.paper}; box-shadow: 0 5px 0 rgba(59,42,32,.2); font: 700 13px/1.2 ${FONT}; color: ${C.ink}; flex-wrap: wrap; justify-content: center; max-width: calc(100vw - 32px); box-sizing: border-box; }
    #bw-climb-pick.on { display: flex; } #bw-climb-pick button { border: 0; border-radius: 14px; padding: 9px 12px; font: 800 13px/1.15 ${FONT}; cursor: pointer; color: #fff; min-width: 74px; }
    #bw-climb-pick button small { display: block; font-weight: 700; font-size: 11px; opacity: .9; } #bw-climb-pick .done { box-shadow: inset 0 0 0 3px #fff; }
    #bw-climb-pad { position: fixed; inset: auto 0 22px 0; display: none; justify-content: space-between; padding: 0 16px; z-index: 35; pointer-events: none; } @media (pointer: coarse) { #bw-climb-pad.on { display: flex; } }
    #bw-climb-pad div { display: flex; gap: 10px; pointer-events: auto; } #bw-climb-pad button { width: 62px; height: 62px; border-radius: 50%; border: 0; background: ${C.paper}; color: ${C.ink}; font: 800 13px/1 ${FONT}; box-shadow: 0 3px 0 rgba(59,42,32,.25); } #bw-climb-pad button.big { background: ${C.amber}; }</style><div class="list" style="display: contents"></div>`;
  document.body.appendChild(picker);
  function pick() {
    picker.querySelector('.list').innerHTML = `${problems.map((P, i) => `<button data-i="${i}" class="${P.sent ? 'done' : ''}" style="background:${P.col}">${P.name} ${P.grade}<small>${P.sent ? (P.tries === 1 ? 'flashed' : `sent in ${P.tries}`) : P.tries ? `${P.tries} ${P.tries === 1 ? 'try' : 'tries'}` : 'not tried'}</small></button>`).join('')}<button data-i="x" style="background:${C.ink}">Done<small>leave the wall</small></button>`;
    picker.querySelectorAll('button[data-i]').forEach((b) => { b.onclick = () => (b.dataset.i === 'x' ? finish(result()) : start(+b.dataset.i)); });
    picker.classList.add('on'); S.phase = 'pick'; S.p = null; highlight();
    ui.keys([['1-4', 'choose a problem'], ['Esc', 'leave']]);
    board();
  }
  const pad = document.createElement('div'); pad.id = 'bw-climb-pad';
  pad.innerHTML = '<div><button data-k="a">◀</button><button data-k="d">▶</button><button data-k="s">Rest</button></div><div><button data-k="c">Chalk</button><button data-k="w" class="big">Move</button></div>';
  document.body.appendChild(pad);
  const held = new Set();
  pad.querySelectorAll('button').forEach((b) => { const k = b.dataset.k; b.addEventListener('pointerdown', (e) => { e.preventDefault(); held.add(k); tapped.push(k); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, () => held.delete(k))); });
  const tapped = [];
  const down = (k) => keys.has(k) || held.has(k);

  function start(i) {
    const P = problems[i]; picker.classList.remove('on'); pad.classList.add('on');
    S.p = P; P.tries++; S.hands = [P.holds[0], P.holds[1]]; S.pump = 0; S.chalk = 0; S.moves = 0; S.phase = 'climb'; S.fall = null; S.t = 0;
    ui.keys([['A D', 'pick a hold'], ['W / Space', 'move'], ['S', 'shake out (on a jug)'], ['C', 'chalk'], ['Esc', 'drop off']]);
    ui.call(`${P.name} ${P.grade}. ${o.coach.name}: ${P.over > 0.5 ? 'it goes out the overhang: keep your hips in.' : 'start with both hands on the start holds. Breathe.'}`, 2600);
    sfx('tap'); options(); board();
  }

  // the holds you can reach next: the problem's, above or beside your lower hand, within reach of your higher one
  let opts = [];
  function options() {
    const P = S.p, [a, b] = S.hands, hi = a.y >= b.y ? a : b, lo = hi === a ? b : a;
    const reach = 0.95 + P.reach * 0.35;
    opts = P.holds.filter((h) => h !== a && h !== b && h.y >= lo.y - 0.05 && Math.hypot(h.u - hi.u, h.y - hi.y) <= reach).sort((x, y) => x.u - y.u);
    if (S.sel >= opts.length) S.sel = Math.max(0, opts.length - 1);
    // the natural next hold: the lowest of those above the higher hand (or the top)
    const up = opts.filter((h) => h.y > hi.y + 0.05).sort((x, y) => x.y - y.y)[0]; if (up) S.sel = opts.indexOf(up);
    highlight();
  }
  function highlight() {
    problems.forEach((P) => P.holds.forEach((h) => { h.m.material.emissiveIntensity = S.p === P ? (opts[S.sel] === h ? 0.9 : opts.includes(h) ? 0.35 : 0.08) : 0; h.m.scale.setScalar(KIND[h.k].r * (opts[S.sel] === h && S.p === P ? 1.35 : 1)); }));
  }
  function move() {
    const P = S.p, h = opts[S.sel]; if (!h) { ui.call('Nothing in reach. Try the other way, or come down.', 1600); return; }
    // the hand that goes: the lower one, unless the hold is on the other side of the higher hand
    const [a, b] = S.hands, lowIdx = a.y <= b.y ? 0 : 1, other = 1 - lowIdx;
    let idx = lowIdx; if (Math.sign(h.u - S.hands[other].u) !== Math.sign(S.hands[lowIdx].u - S.hands[other].u) && Math.abs(h.u - S.hands[other].u) > 0.3) idx = other;
    const from = S.hands[idx], d = Math.hypot(h.u - from.u, h.y - from.y), reach = 0.95 + P.reach * 0.35, over = overAt(h.u);
    let cost = 4 + 14 * (d / reach) ** 2 + KIND[h.k].cost + over * 7;
    if (S.chalk > 0) { cost *= 0.75; S.chalk--; }
    S.pump += cost; S.moves++; S.hands[idx] = h; sfx('tap');
    if (h.top && S.hands[other].top) { send(); return; }
    if (h.top && !S.hands[other].top) { // match on the top hold
      S.hands[other] = h; send(); return;
    }
    if (S.pump >= 100) { fall(); return; }
    options();
  }
  function send() {
    const P = S.p; P.sent = true; S.phase = 'top'; S.t = 0; sfx('cheer');
    S.log.push({ p: P.name, g: P.grade, sent: true, tries: P.tries });
    ui.call(P.tries === 1 ? `Flashed ${P.name} ${P.grade}! ${o.coach.name} cheers.` : `Sent ${P.name} ${P.grade} in ${P.tries} tries!`, 3000); board();
  }
  function fall() {
    S.phase = 'fall'; S.t = 0; sfx('thud');
    const hi = Math.max(S.hands[0].y, S.hands[1].y);
    S.fall = { y: hi - 1.9, v: 0, at: (S.hands[0].u + S.hands[1].u) / 2 };
    S.log.push({ p: S.p.name, g: S.p.grade, sent: false, tries: S.p.tries });
    ui.call(`Pumped off at ${hi.toFixed(1)} m. ${o.coach.name}: ${S.p.over > 0.5 ? 'feet on, hips into the wall.' : 'rest on the jugs before the hard moves.'}`, 2800);
  }
  const result = () => ({ sends: problems.filter((P) => P.sent).map((P) => `${P.name} ${P.grade}`), flashes: problems.filter((P) => P.sent && P.tries === 1).length, tries: problems.reduce((t, P) => t + P.tries, 0), best: problems.filter((P) => P.sent).map((P) => P.grade).sort().pop() || null });
  function board() {
    const rows = [{ name: S.p ? `${S.p.name} ${S.p.grade}` : 'Bouldering', cols: [S.p ? `${Math.round(S.pump)}%` : '', String(problems.filter((P) => P.sent).length)] }];
    ui.board(rows, ['Pump', 'Sent']);
  }

  // ---------- the step ----------
  const v = new THREE.Vector3(), w = new THREE.Vector3(), cam = { from: new THREE.Vector3(), at: new THREE.Vector3() };
  let pumpShown = -1;
  function update(dt) {
    dt = Math.min(dt, 0.05); S.t += dt;
    const tk = [...keys.take(), ...tapped.splice(0)];
    if (tk.includes('escape')) { if (S.phase === 'climb') { fall(); } else if (S.phase === 'brief' || S.phase === 'pick') { finish(S.phase === 'brief' ? { aborted: true } : result()); return; } }
    if (S.phase === 'brief' && tk.includes('enter')) card.next();
    if (S.phase === 'pick') { const n = ['1', '2', '3', '4'].findIndex((k) => tk.includes(k)); if (n >= 0) start(n); }
    if (S.phase === 'climb') {
      if (tk.includes('a') || tk.includes('arrowleft')) { S.sel = Math.max(0, S.sel - 1); highlight(); }
      if (tk.includes('d') || tk.includes('arrowright')) { S.sel = Math.min(opts.length - 1, S.sel + 1); highlight(); }
      if (tk.includes('w') || tk.includes('arrowup') || tk.includes(' ')) move();
      if (tk.includes('c') && S.phase === 'climb') { if (S.t - S.chalkT > 12) { S.chalk = 3; S.chalkT = S.t; sfx('flap'); ui.call('Chalked up: the next three moves are easier.', 1400); } else ui.call('Your hands are still chalky.', 1000); }
    }
    if (S.phase === 'climb') {
      // hanging: the grip drains on small holds and on the overhang; shaking out on a jug brings it back
      const [a, b] = S.hands, drain = (KIND[a.k].hang + KIND[b.k].hang) / 2 * (1 + overAt((a.u + b.u) / 2) * 0.8);
      const shake = down('s') || down('arrowdown');
      if (shake && (a.k === 'jug' || b.k === 'jug')) S.pump = Math.max(0, S.pump - 7 * dt); else S.pump += drain * dt * (shake ? 1.4 : 1);
      if (S.pump >= 100) fall();
    }
    if (S.phase === 'fall') { S.fall.v -= 9.81 * dt; S.fall.y += S.fall.v * dt; if (S.fall.y <= 0.35) { S.fall.y = 0.35; if (S.t > 1.2) { pad.classList.remove('on'); pick(); } } }
    if (S.phase === 'top' && S.t > 2.6) { pad.classList.remove('on'); pick(); }
    if (S.phase === 'climb' && Math.round(S.pump) !== pumpShown) { pumpShown = Math.round(S.pump); board(); }
    ui.meter(S.phase === 'climb' ? Math.min(1, S.pump / 100) : null, 0.8);
    pose3d();
  }

  // the climber on the wall: hips below and out from the hands, arms reaching to the holds, feet on the wall
  function pose3d() {
    const { L, R } = me.rig;
    if (S.phase === 'climb' || S.phase === 'top') {
      const [a, b] = S.hands, mu = (a.u + b.u) / 2, top = Math.max(a.y, b.y), hipY = Math.max(0.35, Math.min(a.y, b.y) - 1.25);
      world(mu, hipY - 0.95, v); v.addScaledVector(f, -0.3 - overAt(mu) * 0.15); me.obj.position.copy(v); me.obj.rotation.y = heading;
      // each arm: up and out toward its hand
      [[L, S.hands[0].u <= S.hands[1].u ? S.hands[0] : S.hands[1], -1], [R, S.hands[0].u <= S.hands[1].u ? S.hands[1] : S.hands[0], 1]].forEach(([j, h, s]) => {
        const dy = h.y - (hipY + 0.55), du = (h.u - mu) * -s; // outward positive
        j.shoulder.rotation.set(-Math.PI / 2 - Math.atan2(dy, 0.35), 0, s * Math.max(0, Math.min(1.2, Math.atan2(du + 0.18, Math.max(0.2, dy))))); j.elbow.rotation.set(-0.25, 0, 0);
        j.hip.rotation.set(-0.7, 0, s * 0.35); j.knee.rotation.set(1.1, 0, 0);
      });
      void top;
    } else if (S.phase === 'fall') {
      world(S.fall.at, 0, v); v.addScaledVector(f, -0.6); v.y = S.fall.y - 0.35; me.obj.position.copy(v); me.obj.rotation.y = heading;
      [L, R].forEach((j, i) => { j.shoulder.rotation.set(-2.2, 0, (i ? 1 : -1) * 0.6); j.elbow.rotation.set(-0.4, 0, 0); j.hip.rotation.set(-0.9, 0, 0); j.knee.rotation.set(1.4, 0, 0); });
    } else {
      me.obj.position.copy(standAt); me.obj.rotation.y = heading;
      [L, R].forEach((j) => { j.shoulder.rotation.set(0, 0, 0); j.elbow.rotation.set(-0.1, 0, 0); j.hip.rotation.set(0, 0, 0); j.knee.rotation.set(0, 0, 0); });
    }
  }

  let ended = false;
  function finish(r) {
    if (ended) return; ended = true;
    keys.on = false; ui.show(false); ui.meter(null); card.remove(); picker.remove(); pad.remove(); recMode(false);
    me.dispose?.(); coach.dispose?.(); group.removeFromParent();
    o.onEnd?.(r);
  }
  keys.on = true;

  // the camera: back from the wall and a little below the climber, rising with them
  function pose() {
    if (ended) return null;
    const y = S.phase === 'climb' || S.phase === 'top' ? Math.max(1.6, Math.min(S.hands[0].y, S.hands[1].y) - 0.3) : S.phase === 'fall' ? Math.max(1.4, S.fall.y + 0.6) : 2.0;
    const mu = S.p && S.phase !== 'pick' ? (S.hands[0].u + S.hands[1].u) / 2 : 0;
    world(mu * 0.7, y, w); cam.at.copy(w); cam.from.copy(w).addScaledVector(f, -(S.phase === 'pick' || S.phase === 'brief' ? 8.5 : 6.2)); cam.from.y = Math.max(1.4, y - 0.6);
    return { x: standAt.x, z: standAt.z, yaw: heading, hide: true, cam: { from: cam.from, at: cam.at }, speed: 0 };
  }
  return { update, pose, get phase() { return S.phase; }, state: () => ({ phase: S.phase, p: S.p?.name, pump: Math.round(S.pump), hands: S.hands.map((h) => h && [+h.u.toFixed(2), +h.y.toFixed(2), h.k]), opts: opts.length, sel: S.sel, moves: S.moves, sent: problems.filter((P) => P.sent).map((P) => P.name), log: S.log }), _keys: keys, finish, start, problems };
}
