// Archery in the park (Elvis, 12 October 2026: recreation "with guides, tutorials and fees"). A coach from the city
// sets up a range on the grass: a straw boss with a World Archery ten-ring face (40 cm at 18 m, 80 cm at 30 m, the
// centre 1.3 m up), a shooting line, a pennant for the wind. You shoot two ends of six arrows with a recurve.
//
// The physics, in brief: the arrow leaves at about 58 m/s at full draw (less if you let it go early, and then it drops
// low), falls under gravity and drifts with the crosswind. The coach sets your sight for the distance, so a steady,
// full-drawn arrow goes where the pin is. Holding at full draw tires you and the pin wanders more; holding your breath
// (Shift) steadies it for a few seconds. Scoring is World Archery's: 10 in the gold to 1 in the outer white, X for the
// inner ten, M for a miss.
import * as THREE from 'three';
import { person, playerPerson, gameKeys, sportsUI } from '../sports/common.js';
import { sfx } from '../audio.js';
import { C, FONT } from '../uikit.js';
import { briefCard, recMode } from './brief.js';

const G = 9.81, V = 58, ENDS = 2, PER = 6, CENTRE = 1.3;
const STEPS = [
  { t: 'Stance', b: 'Stand side-on to the target, feet either side of the line, shoulder-width apart. Weight even, tall through the spine.' },
  { t: 'Nock and grip', b: 'The arrow clicks onto the string under the nocking point, the odd-coloured feather out. Hold the bow loose in the web of your hand: a tight grip twists it.' },
  { t: 'Draw and anchor', b: 'Hold Space (on a phone, the Draw button) and draw the string back to the same spot under your chin every time. A short draw is a slow arrow, and it lands low.' },
  { t: 'Aim', b: 'Move the pin onto the gold with the mouse, a drag or WASD. The pin always moves a little. Shift holds your breath and steadies it for a few seconds; then you need air again.' },
  { t: 'Release', b: "Let Space go to loose. Watch the pennant on the boss: aim off into the wind. Don't hold at full draw too long: your arm tires and the pin wanders. Six arrows an end, two ends." },
];

/**
 * @param o { scene, world, line: { x, z }, dir: { x, z } (unit, line to target), dist (m), coach: { name, look }, look, toast, onEnd(result) }
 */
export function createArchery(o) {
  const { scene, toast } = o, dist = o.dist, face = dist <= 20 ? 0.4 : 0.8, R = face / 2;
  const group = new THREE.Group(); group.name = 'archery'; scene.add(group);
  const keys = gameKeys(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'escape', 'enter']);
  const ui = sportsUI();
  recMode(true);
  const M = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const f = new THREE.Vector3(o.dir.x, 0, o.dir.z).normalize(), right = new THREE.Vector3(-f.z, 0, f.x), heading = Math.atan2(f.x, f.z);
  const L = new THREE.Vector3(o.line.x, 0, o.line.z), E = L.clone().add(new THREE.Vector3(0, 1.5, 0));
  const Tc = L.clone().addScaledVector(f, dist); Tc.y = CENTRE;

  // ---------- the wind: light, from one side ----------
  const wa = Math.random() * Math.PI * 2, ws = 0.5 + Math.random() * 2.2, wind = new THREE.Vector3(Math.sin(wa) * ws, 0, Math.cos(wa) * ws);

  // ---------- the range: the boss on its stand, the face, the pennant, the line ----------
  const faceTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d'), c = 256;
    const cols = ['#f4f1ea', '#f4f1ea', '#22252b', '#22252b', '#2f8fd0', '#2f8fd0', '#d9483b', '#d9483b', '#f2c230', '#f2c230'];
    for (let k = 0; k < 10; k++) { const r = (c * (10 - k)) / 10; g.beginPath(); g.arc(c, c, r - 1, 0, Math.PI * 2); g.fillStyle = cols[k]; g.fill(); g.lineWidth = 2; g.strokeStyle = k === 2 || k === 3 ? '#f4f1ea' : '#22252b'; g.stroke(); }
    g.beginPath(); g.arc(c, c, c / 20, 0, Math.PI * 2); g.lineWidth = 1.5; g.strokeStyle = '#22252b'; g.stroke();
    g.fillStyle = '#22252b'; g.fillRect(c - 3, c - 0.5, 6, 1); g.fillRect(c - 0.5, c - 3, 1, 6);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const range = new THREE.Group(); range.position.copy(Tc).setY(0); range.rotation.y = heading + Math.PI; group.add(range);
  const boss = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.4), M('#d9c27a', 1)); boss.position.set(0, CENTRE, -0.2); range.add(boss);
  const faceM = new THREE.Mesh(new THREE.CircleGeometry(R, 64), new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.9 })); faceM.position.set(0, CENTRE, 0.005); range.add(faceM); // the range's +z looks back at the line
  [[-0.5, 1], [0.5, 1]].forEach(([x]) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.1, 0.08), M('#8a6a45')); leg.position.set(x, 1.0, 0.25); leg.rotation.x = -0.18; range.add(leg); const back = leg.clone(); back.position.z = -0.7; back.rotation.x = 0.35; range.add(back); });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), M('#d8d2c4')); pole.position.set(0.55, 2.4, -0.2); range.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.22).translate(0.25, 0, 0), new THREE.MeshStandardMaterial({ color: C.coral, side: THREE.DoubleSide })); flag.position.set(0.55, 2.9, -0.2); range.add(flag);
  const lineM = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.06).rotateX(-Math.PI / 2), M('#f4f1ea', 1)); lineM.position.copy(L).setY(0.03); lineM.rotation.y = heading; group.add(lineM);
  const flagYaw = Math.atan2(wind.x, wind.z) - Math.PI / 2;

  // ---------- you with the bow, and the coach ----------
  const me = playerPerson(o.avatar, 'you-archery'); me.obj.position.copy(L); me.obj.rotation.y = heading; group.add(me.obj);
  const coach = person(o.coach.look, `coach-${o.coach.name}`); coach.obj.position.copy(L).addScaledVector(f, -1.4).addScaledVector(right, -1.8); coach.obj.rotation.y = heading + 0.5; group.add(coach.obj);
  const bow = new THREE.Group(); bow.position.set(0.2, 1.4, 0.6); me.obj.add(bow);
  {
    const pts = []; for (let k = -6; k <= 6; k++) { const y = (k / 6) * 0.68, a = Math.abs(k / 6); pts.push(new THREE.Vector3(0, y, 0.06 * a - 0.2 * a * a * a + (a > 0.85 ? (a - 0.85) * 0.6 : 0))); }
    bow.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 6), M('#3b2a20', 0.5)));
    bow.add(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.045), M('#1d2028', 0.6)));
  }
  const strG = new THREE.BufferGeometry(); strG.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
  bow.add(new THREE.Line(strG, new THREE.LineBasicMaterial({ color: '#f4f1ea' })));
  const arrowMesh = () => {
    const a = new THREE.Group();
    a.add(new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.74, 5).rotateX(Math.PI / 2).translate(0, 0, -0.37), M('#2b2f36', 0.4)));
    a.add(new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.03, 6).rotateX(Math.PI / 2).translate(0, 0, 0.012), M('#c9ccd2', 0.3)));
    [0, 2.09, 4.19].forEach((r, i) => { const v = new THREE.Mesh(new THREE.PlaneGeometry(0.018, 0.07).translate(0.012, 0, -0.68), new THREE.MeshStandardMaterial({ color: i ? C.amber : C.coral, side: THREE.DoubleSide })); v.rotation.z = r; a.add(v); });
    return a; // its tip at the origin, pointing along +z
  };
  const nocked = arrowMesh(); bow.add(nocked);

  // ---------- the state ----------
  const S = { phase: 'brief', t: 0, yaw: (Math.random() - 0.5) * 0.03, pitch: Math.atan2(CENTRE - E.y, dist) + (Math.random() - 0.5) * 0.02, draw: 0, hold: 0, breath: 0, air: 1, ends: [[]], arrow: null, last: null, swayX: 0, swayY: 0 };
  const flying = []; let aimDir = new THREE.Vector3(), relDir = new THREE.Vector3();
  const sightUp = Math.tan(0.5 * Math.asin(Math.min(1, (G * dist) / (V * V))));
  const dirOf = (yaw, pitch, out) => out.set(Math.sin(heading + yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(heading + yaw) * Math.cos(pitch));

  // ---------- the lesson ----------
  const card = briefCard({ id: 'bw-arch-brief', who: `${o.coach.name}, your coach · ${dist} m · ${face * 100} cm face · ${ENDS} ends of ${PER}`, steps: STEPS, last: 'To the line', onDone: () => { S.phase = 'ready'; ui.show(true); hints(); ui.call(`${o.coach.name}: wind ${ws < 1.2 ? 'light' : ws < 2 ? 'steady' : 'gusting'}, check the pennant. In your own time.`, 3200); board(); } });
  const hints = () => ui.keys([['Space', 'hold to draw, let go to loose'], ['Mouse / WASD', 'aim'], ['Shift', 'hold breath'], ['Esc', 'leave']]);

  // ---------- the sight pin, and on a phone the buttons ----------
  const hud = document.createElement('div'); hud.id = 'bw-arch';
  hud.innerHTML = `<style>#bw-arch { position: fixed; inset: 0; z-index: 25; touch-action: none; } #bw-arch .pin { position: absolute; left: 50%; top: 50%; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 2px ${C.ink}, inset 0 0 0 2px ${C.ink}; display: none; }
    #bw-arch .pin::before { content: ''; position: absolute; left: 50%; top: -22px; bottom: -22px; width: 2px; margin-left: -1px; background: linear-gradient(${C.ink} 0 18px, transparent 18px calc(100% - 18px), ${C.ink} calc(100% - 18px)); }
    #bw-arch .pin::after { content: ''; position: absolute; left: 50%; top: 50%; width: 5px; height: 5px; margin: -2.5px 0 0 -2.5px; border-radius: 50%; background: ${C.coral}; } #bw-arch.on .pin { display: block; }
    #bw-arch .pad { position: absolute; right: 16px; bottom: 86px; display: none; gap: 10px; } #bw-arch .pad button { width: 72px; height: 72px; border-radius: 50%; border: 0; background: ${C.paper}; color: ${C.ink}; font: 800 13px/1 ${FONT}; box-shadow: 0 3px 0 rgba(59,42,32,.25); }
    #bw-arch .pad button.big { background: ${C.amber}; width: 84px; height: 84px; } @media (pointer: coarse) { #bw-arch .pad { display: flex; align-items: flex-end; } }</style>
    <div class="pin"></div><div class="pad"><button data-k="shift">Breath</button><button data-k=" " class="big">Draw</button></div>`;
  document.body.appendChild(hud);
  const held = new Set();
  hud.querySelectorAll('.pad button').forEach((b) => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); held.add(k); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, () => held.delete(k)));
  });
  let dragId = null, lx = 0, ly = 0;
  hud.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; dragId = e.pointerId; lx = e.clientX; ly = e.clientY; hud.setPointerCapture?.(e.pointerId); });
  hud.addEventListener('pointermove', (e) => { if (e.pointerId !== dragId) return; const k = S.draw > 0.3 ? 0.00035 : 0.0012; S.yaw -= (e.clientX - lx) * k; S.pitch -= (e.clientY - ly) * k; lx = e.clientX; ly = e.clientY; });
  ['pointerup', 'pointercancel'].forEach((ev) => hud.addEventListener(ev, (e) => { if (e.pointerId === dragId) dragId = null; }));
  const down = (k) => keys.has(k) || held.has(k);

  // ---------- the scoreboard: an end a row, its arrows and its sum ----------
  const val = (a) => (a === 'X' ? 10 : a === 'M' ? 0 : a);
  const sum = (end) => end.reduce((t, a) => t + val(a), 0);
  function board() { ui.board(S.ends.map((e, i) => ({ name: `End ${i + 1}`, cols: [e.length ? e.join(' ') : '·', String(sum(e))] })), ['Arrows', 'Sum']); }

  function loose() {
    const d = S.draw; S.draw = 0; S.hold = 0;
    if (d < 0.3) { ui.call(`${o.coach.name}: let down, that's fine. Draw again.`, 1600); return; }
    sfx('whoosh');
    relDir.copy(aimDir); relDir.x += (Math.random() - 0.5) * 0.0012; relDir.y += (Math.random() - 0.5) * 0.0012; relDir.normalize();
    const v = relDir.clone(); v.y += sightUp; v.normalize().multiplyScalar(V * d);
    const m = arrowMesh(); group.add(m);
    S.arrow = { m, pos: E.clone().addScaledVector(relDir, 0.3), vel: v, short: d < 0.95 };
    nocked.visible = false; S.phase = 'flight'; S.t = 0;
  }
  function scoreHit(p) {
    const off = p.clone().sub(Tc), u = off.dot(right), v = off.y, r = Math.hypot(u, v);
    if (Math.abs(u) > 0.6 || Math.abs(v) > 0.6) return null; // past the boss
    if (r > R) return { a: 'M', u, v, r };
    return { a: r <= R / 20 ? 'X' : 10 - Math.floor(r / (R / 10)), u, v, r };
  }
  function tip(h, short) {
    if (short) return 'Low: full draw, to your anchor, every time.';
    if (!h || h.a === 'M') return 'Breathe, settle the pin on the gold, then let it go.';
    if (h.r > R * 0.4) { const side = Math.abs(h.u) > Math.abs(h.v) ? (h.u > 0 ? 'right' : 'left') : h.v > 0 ? 'high' : 'low'; return `A bit ${side}. ${side === 'left' || side === 'right' ? 'Mind the wind.' : 'Same anchor each time.'}`; }
    return ['Good shot.', 'Lovely. Again.', 'That is the one. Same again.'][Math.floor(Math.random() * 3)];
  }
  function landed(h) {
    const end = S.ends[S.ends.length - 1]; end.push(h?.a ?? 'M'); board();
    const a = h?.a ?? 'M';
    if (a !== 'M') sfx('thud'); if (a === 'X' || a === 10) sfx('cheer');
    ui.call(`${a === 'X' ? 'X, the inner ten!' : a === 'M' ? 'Miss.' : `${a}.`} ${o.coach.name}: ${tip(h, S.arrow?.short)}`, 2400);
    S.phase = 'hit'; S.t = 0;
  }
  function next() {
    const end = S.ends[S.ends.length - 1];
    if (end.length >= PER) {
      ui.call(`End ${S.ends.length}: ${sum(end)}. ${o.coach.name} walks you to the boss to score and pull the arrows.`, 2600);
      if (S.ends.length >= ENDS) { setTimeout(() => finish(result()), 2800); S.phase = 'done'; return; }
      flying.forEach((a) => a.removeFromParent()); flying.length = 0; S.ends.push([]); board();
    }
    S.phase = 'ready'; nocked.visible = true;
  }
  const result = () => { const all = S.ends.flat(); return { score: all.reduce((t, a) => t + val(a), 0), max: all.length * 10, xs: all.filter((a) => a === 'X').length, tens: all.filter((a) => a === 'X' || a === 10).length, misses: all.filter((a) => a === 'M').length, arrows: all.length, dist, ends: S.ends.map(sum) }; };

  // ---------- the step ----------
  const tmp = new THREE.Vector3(), prev = new THREE.Vector3(), cam = { from: new THREE.Vector3(), at: new THREE.Vector3() };
  function update(dt) {
    dt = Math.min(dt, 0.05); S.t += dt;
    const tk = keys.take();
    if (tk.includes('escape')) { finish(S.phase === 'brief' ? { aborted: true } : result()); return; }
    if (S.phase === 'brief') { if (tk.includes('enter')) card.next(); }
    flag.rotation.y = flagYaw - (heading + Math.PI) + Math.sin(S.t * 7) * 0.15 * ws;
    // aim: keys move the pin slowly; the mouse or a drag moves it on the overlay
    const rate = S.draw > 0.3 ? 0.03 : 0.12;
    S.yaw += ((down('a') || down('arrowleft') ? 1 : 0) - (down('d') || down('arrowright') ? 1 : 0)) * rate * dt;
    S.pitch += ((down('w') || down('arrowup') ? 1 : 0) - (down('s') || down('arrowdown') ? 1 : 0)) * rate * dt;
    S.yaw = Math.max(-0.4, Math.min(0.4, S.yaw)); S.pitch = Math.max(-0.3, Math.min(0.3, S.pitch));
    if (S.phase === 'ready' || S.phase === 'draw') {
      const drawing = down(' ');
      if (drawing) { S.phase = 'draw'; S.draw = Math.min(1, S.draw + dt / 1.1); if (S.draw >= 1) S.hold += dt; }
      else if (S.phase === 'draw') loose();
      // the breath: Shift steadies the pin for about three seconds, then you need air for a while
      const holding = down('shift') && S.air > 0;
      if (holding) S.air = Math.max(0, S.air - dt / 3); else S.air = Math.min(1, S.air + dt / 4);
      if (S.hold > 9) { ui.call(`${o.coach.name}: too long. Let down and rest your arm.`, 2000); S.draw = 0; S.hold = 0; S.phase = 'ready'; }
      const amp = (0.0012 + Math.max(0, S.hold - 4) * 0.0011) * (holding ? 0.35 : S.air < 0.05 ? 1.8 : 1);
      S.swayX = amp * (Math.sin(S.t * 1.3) + 0.6 * Math.sin(S.t * 2.9 + 1) + 0.3 * Math.sin(S.t * 5.1 + 2)) / 1.9;
      S.swayY = amp * (Math.sin(S.t * 1.1 + 3) + 0.6 * Math.sin(S.t * 3.3 + 2) + 0.3 * Math.sin(S.t * 4.7)) / 1.9;
      dirOf(S.yaw + S.swayX, S.pitch + S.swayY, aimDir);
      ui.meter(S.phase === 'draw' ? S.draw : null, 0.95);
    }
    if (S.phase === 'flight' && S.arrow) {
      const A = S.arrow; prev.copy(A.pos);
      const vh = tmp.set(A.vel.x, 0, A.vel.z).normalize(), cross = wind.clone().addScaledVector(vh, -wind.dot(vh));
      A.vel.y -= G * dt; A.vel.addScaledVector(cross, 0.9 * dt);
      A.pos.addScaledVector(A.vel, dt);
      const s0 = prev.clone().sub(L).dot(f), s1 = A.pos.clone().sub(L).dot(f), plane = dist - 0.005;
      if (s0 < plane && s1 >= plane) { // crossing the face: in the boss, or past it
        const k = (plane - s0) / (s1 - s0), p = prev.clone().lerp(A.pos, k), h = scoreHit(p);
        if (h) { A.pos.copy(p).addScaledVector(f, 0.22); A.m.position.copy(A.pos); A.m.lookAt(A.pos.clone().add(A.vel)); flying.push(A.m); S.arrow = null; landed(h); return; }
      }
      if (A.pos.y <= 0.02 || s1 > dist + 30) { A.pos.y = Math.max(0.02, A.pos.y); A.m.position.copy(A.pos); flying.push(A.m); S.arrow = null; landed(null); return; }
      A.m.position.copy(A.pos); A.m.lookAt(A.pos.clone().add(A.vel));
    }
    if (S.phase === 'hit' && S.t > 1.6) next();
    // you: bow arm out to the target, the string hand drawn back to the anchor
    const { L: Lj, R: Rj } = me.rig, d = S.phase === 'draw' ? S.draw : 0;
    Lj.shoulder.rotation.set(-1.5, 0, 0); Lj.elbow.rotation.set(0, 0, 0);
    Rj.shoulder.rotation.set(-1.5 + d * 0.1, 0, -0.35 * d); Rj.elbow.rotation.set(-2.3 * d, 0, 0);
    me.obj.rotation.y = heading + S.yaw;
    const pos = strG.attributes.position; pos.setXYZ(0, 0, 0.68, -0.07); pos.setXYZ(1, 0, 0, -0.07 - 0.62 * d); pos.setXYZ(2, 0, -0.68, -0.07); pos.needsUpdate = true;
    nocked.position.set(0, 0, 0.67 - 0.62 * d - 0.07 * (1 - d)); nocked.visible = S.phase === 'ready' || S.phase === 'draw';
    hud.classList.toggle('on', S.phase === 'draw' && S.draw > 0.5);
  }

  let ended = false;
  function finish(r) {
    if (ended) return; ended = true;
    keys.on = false; ui.show(false); ui.meter(null); card.remove(); hud.remove(); recMode(false);
    me.dispose?.(); coach.dispose?.(); faceTex.dispose(); group.removeFromParent();
    o.onEnd?.(r);
  }
  keys.on = true;

  // the camera: behind your shoulder until you draw; then through the sight, the target large in it (a camera along
  // the aiming line, so the pin on the screen is exactly where the arrow is pointed)
  function pose() {
    if (ended) return null;
    const zoom = face * 5.5;
    if (S.phase === 'draw' && S.draw > 0.5 || S.phase === 'flight' || S.phase === 'hit') {
      const dir = S.phase === 'draw' ? aimDir : relDir;
      cam.from.copy(E).addScaledVector(dir, dist - zoom); cam.at.copy(E).addScaledVector(dir, dist);
    } else {
      cam.from.copy(L).addScaledVector(f, -3.4).addScaledVector(right, 1.7).setY(2.3); cam.at.copy(L).lerp(Tc, 0.45).setY(1.2);
    }
    return { x: L.x, z: L.z, yaw: heading, hide: true, cam: { from: cam.from, at: cam.at }, speed: 0 };
  }
  return { update, pose, get phase() { return S.phase; }, state: () => ({ phase: S.phase, draw: +S.draw.toFixed(2), hold: +S.hold.toFixed(1), air: +S.air.toFixed(2), yaw: +S.yaw.toFixed(4), pitch: +S.pitch.toFixed(4), ends: S.ends, wind: +ws.toFixed(1) }), aimAt: () => ({ yaw: Math.atan2(Tc.x - E.x, Tc.z - E.z) - heading, pitch: Math.atan2(CENTRE - E.y, dist) }), _keys: keys, finish };
}
