// A surf lesson on the city's beach (Elvis, 12 October 2026: recreation "with guides, tutorials and fees"; Lagos and
// Accra both have surf schools on their Atlantic beaches). An instructor from the city teaches you on the sand, then
// you paddle out through the whitewater, wait for a set, catch a wave, pop up and ride it along its face.
//
// The sea, in brief: swells come in sets of three, about 1.2 m high, travelling at about 6 m/s toward the beach. Each
// steepens over the sandbar and breaks some 45 m out, then runs in as whitewater and washes up the sand. To catch one
// you paddle toward the beach as it reaches you and pop up while you are on its face; too early and it passes under
// you, too late and it breaks on you. Riding, you angle along the face (A, D) and stay near the breaking part, the
// pocket, where it is steepest: go straight in and you outrun it; stay too far up in it and it throws you.
import * as THREE from 'three';
import { person, gameKeys, sportsUI } from '../sports/common.js';
import { sfx } from '../audio.js';
import { C, FONT } from '../uikit.js';
import { briefCard, recMode } from './brief.js';

const SPEED = 6, HEIGHT = 1.2, BREAK = 45, WIDTH = 160, OUT = 150, WAVES = 5;
const STEPS = [
  { t: 'The sea today', b: 'Waves come in sets of three, about chest high, a minute or so apart. They break over the sandbar out past the swimmers, then run in as white water. We stay between the flags.' },
  { t: 'Paddling out', b: 'Lie on the board and paddle with W; A and D steer. When white water comes at you, push the nose under it with Space (a duck dive) or it carries you back in.' },
  { t: 'Catching one', b: 'Out past the break, sit and wait (S). When a wave comes, turn toward the beach and paddle hard. The board tilts as the wave lifts you: that is the moment. Space to pop up.' },
  { t: 'Riding', b: 'Feet on, knees bent. A and D angle you along the face. Stay near the part that is breaking, the pocket: too far ahead and you lose the wave, too deep in it and it throws you.' },
  { t: 'Safety', b: 'Fall flat and away from the board, cover your head as you come up. Six waves today; your best ride counts. I will be in the water with you.' },
];

/**
 * @param o { scene, beach: { x, z, sea: { x, z }, label }, coach: { name, look }, look, toast, onEnd(result) }
 */
export function createSurf(o) {
  const { scene } = o;
  const group = new THREE.Group(); group.name = 'surf'; scene.add(group);
  const keys = gameKeys(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'escape', 'enter', 'c']);
  const ui = sportsUI();
  recMode(true);
  // the beach's frame: v out to sea (0 at the water's edge), u along the shore
  const sv = new THREE.Vector3(o.beach.sea.x, 0, o.beach.sea.z).normalize(), su = new THREE.Vector3(-sv.z, 0, sv.x);
  const O = new THREE.Vector3(o.beach.x, 0, o.beach.z);
  const P = (u, v, y = 0, out = new THREE.Vector3()) => out.copy(O).addScaledVector(su, u).addScaledVector(sv, v).setY(y);
  const seaYaw = Math.atan2(sv.x, sv.z);

  // ---------- the waves: a set of swells, each a crest at v, unbroken until BREAK, whitewater after ----------
  const W = []; let setT = 4, nextIn = 0;
  function spawn(k) { W.push({ v: OUT + 10 + k * 22, h: HEIGHT * (0.85 + Math.random() * 0.35), broke: false, foam: 0, peak: (Math.random() - 0.5) * 50 }); }
  // the sea's height at (u, v): each wave a smooth hump with a steeper face toward the beach; whitewater a low ridge
  function height(u, v, t) {
    let y = 0.06 * Math.sin(v * 0.5 - t * 1.7) + 0.04 * Math.sin(u * 0.3 + t * 1.1);
    for (const w of W) {
      const d = v - w.v, side = Math.exp(-(((u - w.peak) / 70) ** 2)) * 0.5 + 0.5; // a little bigger at its peak
      if (!w.broke) { const shoal = 1 + Math.max(0, (90 - w.v) / 90) * 0.8; y += w.h * shoal * side * (d < 0 ? Math.exp(-((d / 2.6) ** 2)) : Math.exp(-((d / 7) ** 2))); }
      else y += w.h * 0.35 * w.foam * side * Math.exp(-(((d) / 3) ** 2));
    }
    return y;
  }
  const foamAt = (u, v) => { let f = 0; for (const w of W) { const d = v - w.v; if (w.broke) f = Math.max(f, w.foam * Math.exp(-(((d - 2) / 6) ** 2))); else if (w.v < BREAK + 12) f = Math.max(f, Math.max(0, 1 - (w.v - BREAK) / 12) * Math.exp(-((d / 1.5) ** 2)) * 0.7); } return Math.min(1, f + (v < 6 ? (6 - v) / 6 * 0.8 : 0)); };

  // the sea patch: a grid over the surf zone, lifted and coloured every frame (the city's flat sea is under it)
  const NU = 80, NV = 70, geo = new THREE.PlaneGeometry(WIDTH, OUT + 6, NU, NV).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const MID = (OUT + 6) / 2 - 4; // the patch's middle, this far out
  const uv0 = []; for (let i = 0; i < pos.count; i++) uv0.push([-pos.getX(i), pos.getZ(i) + MID]); // local u, v (v from -4 out to OUT+2)
  const sea = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.05, transparent: true }));
  P(0, MID, 0, sea.position); sea.renderOrder = 2; group.add(sea);
  // its orientation: local x is -u (so the frame stays right-handed), y up, local z is v
  { const m = new THREE.Matrix4().makeBasis(su.clone().negate(), new THREE.Vector3(0, 1, 0), sv); sea.rotation.setFromRotationMatrix(m); }
  const deep = new THREE.Color('#3f9fb0'), shallow = new THREE.Color('#79cfc6'), white = new THREE.Color('#f4f8f6'), tmpC = new THREE.Color();
  // the edges of the patch fade into the city's sea (alpha through the colour's lightness is not possible: fade the height)
  function paintSea(t) {
    for (let i = 0; i < pos.count; i++) {
      const [u, v] = uv0[i], edge = Math.min(1, (WIDTH / 2 - Math.abs(u)) / 20, (OUT - v) / 25);
      const y = v < -1 ? -0.3 : height(u, v, t) * Math.max(0, edge) - 0.05;
      pos.setY(i, y + 0.1);
      const f = foamAt(u, v) * Math.max(0, edge);
      tmpC.copy(deep).lerp(shallow, Math.max(0, Math.min(1, 1 - v / 60))).lerp(white, f);
      cols[i * 3] = tmpC.r; cols[i * 3 + 1] = tmpC.g; cols[i * 3 + 2] = tmpC.b;
    }
    pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
  }
  // the flags (swim between them) and the surf school's tent and boards on the sand
  {
    const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
    [-30, 30].forEach((u) => { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3, 6), M('#d8d2c4')); P(u, -6, 1.5, pole.position); group.add(pole); const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshStandardMaterial({ color: '#e04a3a', side: THREE.DoubleSide })); P(u, -6, 2.75, fl.position); fl.position.addScaledVector(su, 0.35); fl.rotation.y = seaYaw; group.add(fl); const y2 = fl.clone(); y2.material = new THREE.MeshStandardMaterial({ color: '#f2c230', side: THREE.DoubleSide }); y2.position.y -= 0.45; group.add(y2); });
    const tent = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.6, 4).translate(0, 2.6, 0), M(C.coral)); P(-12, -16, 0, tent.position); tent.rotation.y = seaYaw + Math.PI / 4; group.add(tent);
    [-1.8, 1.8].forEach((x) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 6).translate(0, 0.95, 0), M('#5b4a3a')); P(-12 + x, -16 + 1.2, 0, leg.position); group.add(leg); });
    ['#f2c230', '#2a9d94', '#e04a3a'].forEach((c, k) => { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.9, 4, 8).rotateX(Math.PI / 2).scale(1, 0.18, 1), M(c)); P(-7 + k * 0.9, -14, 1.1, b.position); b.rotation.set(0.2, seaYaw, 0.15); group.add(b); });
  }

  // ---------- you, your board, the instructor ----------
  const rider = new THREE.Group(); group.add(rider);
  const me = person(o.look, 'you-surf'); rider.add(me.obj);
  const board = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 2.0, 4, 10).rotateX(Math.PI / 2).scale(1, 0.15, 1), new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: 0.5 })); rider.add(board);
  const coach = person(o.coach.look, `coach-${o.coach.name}`); group.add(coach.obj);

  // ---------- the state ----------
  const S = { phase: 'brief', t: 0, u: 0, v: -4, heading: seaYaw, spd: 0, rideT: 0, ride: null, rides: [], waves: 0, tilt: 0, msg: 0, along: 0, turns: 0, lastSide: 0, wiped: 0, sit: false };
  const card = briefCard({ id: 'bw-surf-brief', who: `${o.coach.name}, your instructor · ${o.beach.label} · six waves`, steps: STEPS, last: 'Into the water', onDone: () => { S.phase = 'paddle'; S.t = 0; ui.show(true); hints(); ui.call(`${o.coach.name}: paddle out past where they break. I'm right behind you.`, 3000); board2(); } });
  const hints = () => ui.keys(S.phase === 'ride' ? [['A D', 'along the face'], ['S', 'slow / sit back'], ['Esc', 'leave']] : [['W', 'paddle'], ['A D', 'steer'], ['Space', S.v > BREAK + 5 ? 'pop up' : 'duck dive'], ['S', 'sit and wait'], ['Esc', 'leave']]);
  function board2() { ui.board([{ name: S.phase === 'ride' ? 'Riding' : S.v > BREAK + 5 ? 'Out the back' : S.v > 3 ? 'Paddling' : 'On the sand', cols: [`${S.waves}/6`, S.rides.length ? `${Math.max(...S.rides.map((r) => r.score))}` : '-'] }], ['Waves', 'Best']); }

  // ---------- on a phone: the buttons ----------
  const pad = document.createElement('div'); pad.id = 'bw-surf-pad';
  pad.innerHTML = `<style>#bw-surf-pad { position: fixed; inset: auto 0 22px 0; display: none; justify-content: space-between; padding: 0 16px; z-index: 35; pointer-events: none; } @media (pointer: coarse) { #bw-surf-pad.on { display: flex; } }
    #bw-surf-pad div { display: flex; gap: 10px; pointer-events: auto; } #bw-surf-pad button { width: 62px; height: 62px; border-radius: 50%; border: 0; background: ${C.paper}; color: ${C.ink}; font: 800 13px/1 ${FONT}; box-shadow: 0 3px 0 rgba(59,42,32,.25); } #bw-surf-pad button.big { background: ${C.amber}; }</style>
    <div><button data-k="a">◀</button><button data-k="d">▶</button><button data-k="s">Sit</button></div><div><button data-k="w">Paddle</button><button data-k=" " class="big">Pop up</button></div>`;
  document.body.appendChild(pad);
  const held = new Set(), tapped = [];
  pad.querySelectorAll('button').forEach((b) => { const k = b.dataset.k; b.addEventListener('pointerdown', (e) => { e.preventDefault(); held.add(k); tapped.push(k); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, () => held.delete(k))); });
  const down = (k) => keys.has(k) || held.has(k);

  // the wave you are on (or the one under you): the nearest crest within a few metres
  const waveAt = (v) => W.find((w) => !w.broke && Math.abs(v - w.v) < 4) || null;
  const slope = (u, v, t) => (height(u, v + 0.5, t) - height(u, v - 0.5, t)); // >0: the sea rises seaward of you (you are on a face)

  function popUp() {
    const w = waveAt(S.v), sl = slope(S.u, S.v, S.t), toward = Math.cos(S.heading - (seaYaw + Math.PI)) > 0.6;
    S.waves++;
    if (w && sl > 0.12 && toward && S.spd > 1.1) { S.phase = 'ride'; S.ride = { w, t: 0, along: 0, turns: 0, top: 0 }; S.spd = SPEED * 1.15; sfx('whoosh'); ui.call('Up! Angle along the face.', 1600); hints(); pad.classList.add('on'); return; }
    const why = !w ? 'No wave under you: wait for it to reach you.' : !toward ? 'Point the board at the beach first.' : S.spd <= 1.1 ? 'Paddle harder as it comes: you need speed.' : 'Too early: it was not steep enough yet.';
    wipe(why);
  }
  function wipe(why) {
    S.phase = 'wipe'; S.t2 = 0; S.wiped++; sfx('thud'); ui.call(`${why} ${o.coach.name}: again.`, 2600);
    if (S.ride) { S.rides.push(score(S.ride, true)); S.ride = null; }
    if (S.waves >= 6) end();
  }
  function score(r, fell) { const s = Math.round(r.t * 12 + Math.abs(r.along) * 1.2 + r.turns * 6 + (fell ? 0 : 15)); return { secs: +r.t.toFixed(1), along: Math.round(Math.abs(r.along)), turns: r.turns, score: s, fell }; }
  function endRide(why) {
    const r = score(S.ride, false); S.rides.push(r); S.ride = null; S.phase = 'paddle'; S.spd = 0; sfx('cheer');
    ui.call(`${why} ${r.secs} s, ${r.along} m along, ${r.turns} turns: ${r.score} points.`, 3200); hints(); board2();
    if (S.waves >= 6) end();
  }
  function end() {
    setTimeout(() => finish({ rides: S.rides, best: S.rides.length ? Math.max(...S.rides.map((r) => r.score)) : 0, waves: S.waves, stood: S.rides.filter((r) => r.secs > 1 && !r.fell).length }), 3200);
    S.phase = 'done';
  }

  // ---------- the step ----------
  const v3 = new THREE.Vector3(), cam = { from: new THREE.Vector3(), at: new THREE.Vector3() };
  function update(dt) {
    dt = Math.min(dt, 0.05); S.t += dt;
    const tk = [...keys.take(), ...tapped.splice(0)];
    if (tk.includes('escape')) { finish(S.phase === 'brief' ? { aborted: true } : { rides: S.rides, best: S.rides.length ? Math.max(...S.rides.map((r) => r.score)) : 0, waves: S.waves, stood: S.rides.filter((r) => !r.fell).length }); return; }
    if (S.phase === 'brief' && tk.includes('enter')) card.next();
    // the sea: sets of three, the waves running in, breaking, washing out
    if (S.phase !== 'brief') { if ((setT -= dt) <= 0 && W.length < WAVES) { for (let k = 0; k < 3; k++) spawn(k); setT = 26 + Math.random() * 10; } }
    for (let i = W.length - 1; i >= 0; i--) { const w = W[i]; w.v -= (w.broke ? SPEED * 0.75 : SPEED) * dt; if (!w.broke && w.v < BREAK + (w.peak > 0 ? 3 : 0)) { w.broke = true; w.foam = 1; if (Math.abs(w.v - S.v) < 30) sfx('whoosh'); } if (w.broke) w.foam = Math.max(0, w.foam - dt * 0.09); if (w.v < -2) W.splice(i, 1); }
    if (S.phase === 'brief') { /* on the sand, listening */ }
    else if (S.phase === 'paddle' || S.phase === 'wipe') {
      if (S.phase === 'wipe') { S.t2 += dt; if (S.t2 > 2.2) { S.phase = 'paddle'; hints(); } }
      const turn = (down('a') || down('arrowleft') ? 1 : 0) - (down('d') || down('arrowright') ? 1 : 0);
      S.heading += turn * 1.6 * dt;
      S.sit = down('s') || down('arrowdown');
      const paddling = (down('w') || down('arrowup')) && S.phase === 'paddle' && !S.sit;
      S.spd += ((paddling ? 1.9 : 0) - S.spd) * (1 - Math.exp(-dt * (paddling ? 1.5 : 1.2)));
      // whitewater pushes you back in unless you duck dive (Space, inside the break)
      const ww = W.find((w) => w.broke && w.foam > 0.25 && Math.abs(S.v - w.v) < 2.5);
      if (tk.includes(' ')) { if (S.v > BREAK + 5 || waveAt(S.v)) popUp(); else S.duck = 0.8; }
      S.duck = Math.max(0, (S.duck || 0) - dt);
      if (ww && !S.duck) { S.v -= SPEED * 0.6 * ww.foam * dt; if (!S.washed) { S.washed = 1; ui.call('White water! Space to duck dive under it.', 1600); } } else S.washed = 0;
      const fx = Math.sin(S.heading) * S.spd, fz = Math.cos(S.heading) * S.spd;
      S.u += (fx * su.x + fz * su.z) * dt; S.v += (fx * sv.x + fz * sv.z) * dt;
      S.v = Math.max(-1, Math.min(OUT - 10, S.v)); S.u = Math.max(-WIDTH / 2 + 8, Math.min(WIDTH / 2 - 8, S.u));
      if (S.phase === 'paddle' && S.v > BREAK + 6 && !S.toldOut) { S.toldOut = true; ui.call(`${o.coach.name}: good, you're out the back. Sit (S), face the sea, and watch for the set.`, 3400); hints(); }
      const w = waveAt(S.v); S.tilt = w ? Math.max(0, slope(S.u, S.v, S.t)) : 0;
      if (w && S.tilt > 0.12 && S.v > BREAK && !S.toldNow) { S.toldNow = true; setTimeout(() => { S.toldNow = false; }, 3000); ui.call(Math.cos(S.heading - (seaYaw + Math.PI)) > 0.6 ? 'Now! Space!' : 'Turn and paddle!', 900); }
      if (S.v < 1 && S.phase === 'paddle' && S.waves >= 6) end();
    } else if (S.phase === 'ride') {
      const r = S.ride, w = r.w; r.t += dt;
      const turn = (down('a') || down('arrowleft') ? 1 : 0) - (down('d') || down('arrowright') ? 1 : 0);
      if (turn && turn !== S.lastSide) { r.turns++; S.lastSide = turn; }
      // along the face: the angle you hold sends you along it; the wave carries you in
      r.ang = Math.max(-1.2, Math.min(1.2, (r.ang || 0) + turn * 1.8 * dt - (down('s') || down('arrowdown') ? 0 : 0)));
      const along = Math.sin(r.ang) * S.spd; r.along += along * dt; S.u += along * dt;
      // where you sit on the face (metres in front of the crest, negative down it): it drifts toward a spot your angle
      // sets. Straight in, you run off the front of the wave; well angled (about 15 to 35 degrees) you hold the pocket;
      // side on, you climb into the lip and it throws you. There is time to correct either way.
      const c = Math.cos(r.ang), offT = Math.max(-8, Math.min(2, -1.2 + (0.9 - c) * 40));
      r.off = (r.off ?? -1.2) + (offT - (r.off ?? -1.2)) * (1 - Math.exp(-dt * 1.1));
      if (r.off < -3.2 && !r.told) { r.told = 1; ui.call(`${o.coach.name}: angle it! Along the wave, not at the beach.`, 1400); }
      if (r.off > -0.2 && !r.toldUp) { r.toldUp = 1; ui.call(`${o.coach.name}: too high, drop down the face!`, 1400); }
      S.v = w.v + r.off;
      S.spd += ((w.broke ? SPEED * 0.8 : SPEED * 1.15) - S.spd) * (1 - Math.exp(-dt * 2));
      if (r.off < -6) { endRide('You ran out of wave.'); }
      else if (r.off > 0.6) { wipe('Too deep: the lip threw you.'); }
      else if (w.broke && w.foam < 0.45) { endRide('It closed out.'); }
      else if (S.v < 3) { endRide('Right up to the beach!'); }
      else if (Math.abs(S.u) > WIDTH / 2 - 10) { endRide('To the end of the break.'); }
      S.heading = seaYaw + Math.PI + r.ang;
    }
    paintSea(S.t);
    // you and the board on the water, and the instructor
    const y = S.v > 0 ? height(S.u, S.v, S.t) + 0.08 : 0.05;
    P(S.u, S.v, y, rider.position); rider.rotation.set(0, S.heading, 0);
    const lie = S.phase === 'paddle' && !S.sit && S.v > 0, ride = S.phase === 'ride';
    me.obj.position.set(0, lie ? 0.25 : S.sit ? -0.55 : 0.1, lie ? -0.6 : 0);
    me.obj.rotation.set(lie ? Math.PI / 2 - 0.15 : 0, ride ? Math.PI / 2 : 0, 0);
    const { L, R } = me.rig, stroke = Math.sin(S.t * 6);
    if (lie) [[L, 1], [R, -1]].forEach(([j, s]) => { j.shoulder.rotation.set(-2.4 + s * stroke * 0.8, 0, 0); j.elbow.rotation.set(-0.3, 0, 0); j.hip.rotation.set(0, 0, 0); j.knee.rotation.set(0.2, 0, 0); });
    else if (ride) [[L, -1], [R, 1]].forEach(([j, s]) => { j.shoulder.rotation.set(-0.3, 0, s * 1.2); j.elbow.rotation.set(-0.4, 0, 0); j.hip.rotation.set(-0.5, 0, s * 0.35); j.knee.rotation.set(0.9, 0, 0); });
    else [[L, -1], [R, 1]].forEach(([j, s]) => { j.shoulder.rotation.set(0, 0, s * 0.15); j.elbow.rotation.set(-0.2, 0, 0); j.hip.rotation.set(S.sit ? -1.4 : 0, 0, s * 0.5); j.knee.rotation.set(S.sit ? 1.3 : 0, 0, 0); });
    board.rotation.set(-(S.tilt || 0) * 0.6, 0, 0);
    if (S.phase === 'wipe') { rider.rotation.z = Math.sin(S.t2 * 9) * 0.6; me.obj.position.y = -0.6; }
    const cv = Math.max(-5, Math.min(S.v - 6, 30)); P(S.u + 3, cv, 0, coach.obj.position); coach.obj.position.y = cv > 0 ? height(S.u + 3, cv, S.t) - 0.7 : 0; coach.obj.rotation.y = seaYaw + Math.PI;
    if (S.phase === 'brief') { P(-2, -12, 0, rider.position); rider.rotation.set(0, seaYaw, 0); me.obj.position.set(0, 0, 0); me.obj.rotation.set(0, 0, 0); P(1, -10, 0, coach.obj.position); coach.obj.rotation.y = seaYaw + Math.PI; }
    if ((S.msg -= dt) <= 0) { S.msg = 0.5; board2(); }
  }

  let ended = false;
  function finish(r) {
    if (ended) return; ended = true;
    keys.on = false; ui.show(false); ui.meter(null); card.remove(); pad.remove(); recMode(false);
    me.dispose?.(); coach.dispose?.(); geo.dispose(); group.removeFromParent();
    o.onEnd?.(r);
  }
  keys.on = true; pad.classList.add('on');

  // the camera: behind you looking out to sea while you paddle and wait; on a ride, from the beach side of the face
  function pose() {
    if (ended) return null;
    const at = P(S.u, Math.max(S.v, -6), 0.8, v3);
    if (S.phase === 'brief') { P(0, -22, 4, cam.from); P(0, 10, 0.5, cam.at); }
    else if (S.phase === 'ride') { const side = S.ride?.ang >= 0 ? 1 : -1; P(S.u - side * 9, S.v - 10, 3.4, cam.from); cam.at.copy(at); }
    else { P(S.u, S.v - 9, 3.2, cam.from); P(S.u, S.v + 25, 0.6, cam.at); }
    return { x: at.x, z: at.z, yaw: S.heading, hide: true, cam: { from: cam.from, at: cam.at }, speed: 0 };
  }
  return { update, pose, get phase() { return S.phase; }, state: () => ({ phase: S.phase, u: +S.u.toFixed(1), v: +S.v.toFixed(1), spd: +S.spd.toFixed(2), heading: +S.heading.toFixed(2), seaYaw: +seaYaw.toFixed(2), tilt: +(S.tilt || 0).toFixed(2), ang: +(S.ride?.ang || 0).toFixed(2), off: +(S.ride?.off ?? 0).toFixed(2), waves: S.waves, rides: S.rides, W: W.map((w) => [+w.v.toFixed(1), w.broke ? 1 : 0]) }), finish };
}
