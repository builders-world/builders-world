import * as THREE from 'three';
import { sfx } from '../audio.js';
import { walletEngine } from '../wallet.js';
import { person, sportsUI, gameKeys } from './common.js';

// Freestyle in the 25 m pool (Elvis, 10 October 2026): 50 m or 100 m against the club's swimmers, by
// the rules of the sport. One start: go before the signal and you are disqualified. A dive, at most
// 15 m under water before you surface, a turn at each wall (touch it, or tumble and push off), and the
// race ends on the touch. Strokes are left and right in turn, and rhythm beats mashing: too fast and
// the hands slip; forget to breathe and you tire.

export const POOL = { L: 25, lanes: 4, laneW: 2.0, water: -0.3 };
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const laneX = (i) => (i - (POOL.lanes - 1) / 2) * POOL.laneW;

export function createSwimRace({ pool, you, field, distance = 50, toast, onEnd }) {
  const g = pool.group, ui = sportsUI(), keys = gameKeys(['a', 'd', 'arrowleft', 'arrowright', 'w', 'arrowup', ' ', 'escape']);
  keys.on = true; ui.show(true);
  const hz = POOL.L / 2, lengths = distance / POOL.L;
  // you in lane 2 (of 1 to 4); the field in the others, the fastest beside you
  const look = you.look || {};
  const me = person(look, 'you');
  const swimmers = [{ you: true, name: 'You', lane: 1, p: me }];
  const order = [2, 0, 3];
  field.slice(0, order.length).forEach((f, k) => swimmers.push({ you: false, name: f.name, lane: order[k], p: person(f.look, f.name), pace: f.pace, skill: f.skill }));
  swimmers.forEach((s) => {
    g.add(s.p.obj);
    Object.assign(s, { z: hz, y: 0.65, dist: 0, len: 0, dir: -1, v: 0, phase: 'block', under: 0, stroke: 0, lastKey: null, lastT: -9, ox: 1, finish: null, dq: false, armT: 0, breath: 1, react: s.you ? null : rnd(0.62, 0.78) - (s.skill || 0.5) * 0.06, glide: 0, turnT: 0, turnQ: 0 });
  });
  const st = { phase: 'marks', t: 0, beepAt: rnd(1.6, 2.6), clock: 0, leaveAsk: 0, done: false, results: [] };
  const splash = [];
  ui.board(swimmers.map((s) => ({ name: s.name, cols: [''] })), ['Time']);
  ui.call('Take your marks', 1800); sfx('whistle');
  ui.keys([['Space', 'dive at the signal (not before)'], ['A D', 'stroke, left and right in turn'], ['W', 'breathe'], ['Space', 'turn at the wall'], ['Esc', 'leave']]);

  function surfaceSplash(x, z, big) {
    for (let i = 0; i < (big ? 10 : 3); i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(rnd(0.04, 0.09), 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
      m.position.set(x + rnd(-0.3, 0.3), POOL.water + 0.05, z + rnd(-0.4, 0.4));
      g.add(m); splash.push({ m, v: new THREE.Vector3(rnd(-0.6, 0.6), rnd(1.2, big ? 3.2 : 2), rnd(-0.6, 0.6)), t: 0.7 });
    }
  }

  // propulsion: each stroke is a push; too soon after the last one and the hand slips
  function stroke(s, side, now) {
    if (s.phase !== 'swim') return;
    if (s.lastKey === side) { s.v *= 0.97; return; }
    const gap = now - s.lastT;
    const rhythm = gap < 0.22 ? 0.35 : gap < 0.38 ? 0.8 : gap < 0.75 ? 1 : 0.85;
    s.v += 0.6 * rhythm * (0.55 + 0.45 * s.breath);
    s.breath = Math.max(0, s.breath - 0.075);
    s.lastKey = side; s.lastT = now; s.armT = 0; s.side = side;
    if (s.you || Math.random() < 0.3) surfaceSplash(laneX(s.lane), s.z, false);
  }

  function finishOf(s) {
    s.finish = st.clock; s.phase = 'done';
    st.results.push(s);
    sfx(s.you ? 'beep' : 'tap', { high: true });
  }

  function update(dt) {
    const pressed = keys.take();
    if (pressed.includes('escape')) { if (st.leaveAsk > 0 || st.done) { end(); return; } st.leaveAsk = 2.2; ui.call('Leave the race? Esc again to leave', 2000); }
    st.leaveAsk = Math.max(0, st.leaveAsk - dt);
    if (st.done && pressed.includes(' ')) { end(); onEnd?.({ again: true }); return; }
    const Y = swimmers[0];
    st.t += dt;

    // the start: marks, then the signal; anyone who moves before it is out (one-start rule)
    if (st.phase === 'marks') {
      if (pressed.includes(' ')) { Y.dq = true; st.phase = 'dq'; ui.call('False start. Disqualified', 3000); sfx('buzzer'); ui.keys([['Space', 'race again'], ['Esc', 'leave']]); st.done = true; return; }
      if (st.t >= st.beepAt) { st.phase = 'race'; st.clock = 0; sfx('beep', { long: true }); ui.call('Go!', 700); }
    }
    if (st.phase === 'race') st.clock += dt;

    swimmers.forEach((s) => {
      const lx = laneX(s.lane);
      if (st.phase !== 'race') return;
      // reacting and diving
      if (s.phase === 'block') {
        const go = s.you ? pressed.includes(' ') : st.clock >= s.react;
        if (go) {
          s.reaction = st.clock; s.phase = 'dive'; s.v = s.you ? clamp(3.1 - Math.max(0, st.clock - 0.6) * 1.5, 2.3, 3.1) : 2.9 + (s.skill || 0.5) * 0.25;
          s.y = 0.65; s.vy = 1.2; sfx('splash', { big: true });
          if (s.you) pressed.splice(pressed.indexOf(' '), 1);
        }
        return;
      }
      if (s.phase === 'dive') {
        s.vy -= 9.81 * dt; s.y += s.vy * dt; s.z += s.dir * s.v * dt; s.dist += s.v * dt;
        if (s.y <= POOL.water - 0.4) { s.phase = 'under'; s.under = 0; surfaceSplash(lx, s.z, true); }
      } else if (s.phase === 'under') {
        // glide and dolphin kick; up before 15 m from the wall
        s.v = Math.max(1.6, s.v - dt * 0.9); s.z += s.dir * s.v * dt; s.dist += s.v * dt; s.under += s.v * dt;
        s.y = POOL.water - 0.5 + Math.min(0.5, s.under / 18);
        if (s.under > (s.you ? 9 : 7 + (s.skill || 0.5) * 4)) { s.phase = 'swim'; s.y = POOL.water; }
      } else if (s.phase === 'swim') {
        if (s.you) {
          for (const k of pressed) { if (k === 'a' || k === 'arrowleft') stroke(s, 'L', st.t); if (k === 'd' || k === 'arrowright') stroke(s, 'R', st.t); if (k === 'w' || k === 'arrowup') { s.breath = Math.min(1, s.breath + 0.45); s.v *= 0.94; } }
        } else {
          // the field swims to its own pace, with a breath every few strokes
          s.next = (s.next ?? rnd(0.3, 0.5)) - dt;
          if (s.next <= 0) { stroke(s, s.lastKey === 'L' ? 'R' : 'L', st.t); s.next = s.pace * rnd(0.92, 1.08); if (s.breath < 0.45) { s.breath = Math.min(1, s.breath + 0.45); s.v *= 0.95; } }
        }
        // water holds you back with the square of your speed
        s.v -= (0.55 * s.v * s.v + 0.15) * dt; s.v = Math.max(0.2, s.v);
        s.z += s.dir * s.v * dt; s.dist += s.v * dt;
        // the wall ahead: the last length finishes on the touch; otherwise a turn
        const toWall = hz - s.z * s.dir;
        if (toWall <= 0.9) {
          if (s.len + 1 >= lengths) { if (toWall <= 0.35) { s.len++; finishOf(s); } }
          else if (s.you) {
            if (pressed.includes(' ')) { s.phase = 'turn'; s.turnT = 0; s.turnQ = clamp(1 - Math.abs(toWall - 0.6) / 0.5, 0.2, 1); }
            else if (toWall <= 0.35) { s.phase = 'turn'; s.turnT = 0; s.turnQ = 0.25; } // an open turn: touch, then push
          } else if (toWall <= 0.6) { s.phase = 'turn'; s.turnT = 0; s.turnQ = clamp((s.skill || 0.5) + rnd(-0.1, 0.1), 0.3, 1); }
        }
      } else if (s.phase === 'turn') {
        s.turnT += dt;
        const dur = 0.55 + (1 - s.turnQ) * 0.6;
        if (s.turnT >= dur) {
          s.dir *= -1; s.len++; s.z = s.dir * -(hz - 0.5);
          s.phase = 'under'; s.under = 0; s.v = 1.9 + s.turnQ * 0.9; surfaceSplash(lx, s.z, true);
        } else s.v *= 0.9;
      }
      // the clock on the touch pads stops for everyone eventually
    });

    // the board and the end
    const racing = swimmers.filter((s) => s.phase !== 'done');
    const sorted = [...swimmers].sort((a, b) => (a.finish ?? 999) - (b.finish ?? 999) || b.dist - a.dist);
    ui.board(sorted.map((s, k) => ({ name: `${k + 1}. ${s.name}`, serving: s.you, cols: [s.finish != null ? s.finish.toFixed(2) : st.phase === 'race' ? `${Math.round(s.dist)} m` : ''] })), ['Time']);
    if (st.phase === 'race' && (Y.phase === 'done' || racing.length === 0) && !st.done) {
      const place = st.results.indexOf(Y) + 1;
      const key = `bw-swim-pb-${distance}`;
      let pb = null; try { pb = +localStorage.getItem(key) || null; } catch { /* */ }
      const isPb = Y.finish != null && (!pb || Y.finish < pb);
      if (isPb) { try { localStorage.setItem(key, String(Y.finish)); } catch { /* */ } }
      ui.call(`${['1st', '2nd', '3rd', '4th'][place - 1]} in ${Y.finish.toFixed(2)}${isPb ? '. Personal best!' : ''}`, 5000);
      if (place === 1) { sfx('cheer'); walletEngine().earn(distance === 100 ? 600 : 300, `Won the ${distance} m freestyle`); setTimeout(() => toast?.(`You won the ${distance} m! +${distance === 100 ? 600 : 300} Efforts.`, 3000), 800); }
      st.done = true; ui.keys([['Space', 'race again'], ['Esc', 'leave']]);
    }

    animate(dt);
  }

  function animate(dt) {
    swimmers.forEach((s) => {
      const o = s.p.obj, rig = s.p.rig, lx = laneX(s.lane);
      o.position.set(lx, s.phase === 'block' ? 0.65 : s.y - 0.15, s.z);
      // on the block: crouched; in the water: lying along the lane, face down
      if (s.phase === 'block') { o.rotation.set(0, s.dir > 0 ? 0 : Math.PI, 0); rig?.update(dt, { speed: 0, t: st.t }); if (rig) { rig.chest.rotation.x = 0.9; rig.L.shoulder.rotation.x = 0.6; rig.R.shoulder.rotation.x = 0.6; } return; }
      const yaw = s.dir > 0 ? 0 : Math.PI;
      o.rotation.set(0, yaw, 0); o.rotateX(s.phase === 'dive' ? 1.1 : Math.PI / 2 - 0.08);
      if (!rig) return;
      rig.update(dt, { speed: 0, t: st.t });
      s.armT += dt;
      // the arms: a windmill, one over the water as the other pulls under
      const cyc = s.phase === 'swim' ? (st.t - s.lastT) / 0.55 : 0;
      const a = (s.side === 'L' ? 0 : Math.PI) + Math.min(1, cyc) * Math.PI;
      if (s.phase === 'swim') { rig.L.shoulder.rotation.x = -Math.PI + a; rig.R.shoulder.rotation.x = -Math.PI + a + Math.PI; }
      else { rig.L.shoulder.rotation.x = -3.0; rig.R.shoulder.rotation.x = -3.0; }
      rig.L.elbow.rotation.x = -0.2; rig.R.elbow.rotation.x = -0.2;
      // the flutter kick
      const k = Math.sin(st.t * 14 + s.lane) * 0.35;
      rig.L.hip.rotation.x = k; rig.R.hip.rotation.x = -k; rig.L.knee.rotation.x = 0.2; rig.R.knee.rotation.x = 0.2;
    });
    for (let i = splash.length - 1; i >= 0; i--) { const s = splash[i]; s.t -= dt; s.v.y -= 9.81 * dt; s.m.position.addScaledVector(s.v, dt); s.m.material.opacity = Math.max(0, s.t / 0.7); if (s.t <= 0 || s.m.position.y < POOL.water - 0.1) { s.m.removeFromParent(); s.m.geometry.dispose(); s.m.material.dispose(); splash.splice(i, 1); } }
  }

  function end() {
    keys.on = false; keys.dispose(); ui.show(false);
    swimmers.forEach((s) => { s.p.obj.removeFromParent(); s.p.dispose?.(); });
    splash.forEach((s) => s.m.removeFromParent());
    st.ended = true; onEnd?.({});
  }
  const tmp = new THREE.Vector3();
  function pose() {
    const Y = swimmers[0], lx = laneX(Y.lane);
    // you stand on the deck behind your block in the world; the camera runs alongside your lane
    const w = g.localToWorld(tmp.set(lx, 0, hz + 1.6)).clone();
    const from = g.localToWorld(new THREE.Vector3(lx - 6.0, 4.0, Y.z + Y.dir * -3.2));
    const at = g.localToWorld(new THREE.Vector3(lx, POOL.water, Y.z + Y.dir * 2.5));
    return { x: w.x, z: w.z, yaw: g.rotation.y, speed: 0, hide: true, cam: { from, at } };
  }
  return { update, pose, end, get ended() { return !!st.ended; }, get state() { return { phase: st.phase, clock: +st.clock.toFixed(2), you: { phase: swimmers[0].phase, dist: +swimmers[0].dist.toFixed(1), len: swimmers[0].len, v: +swimmers[0].v.toFixed(2) }, results: st.results.map((s) => [s.name, +s.finish.toFixed(2)]) }; }, test: { swimmers, st } };
}
