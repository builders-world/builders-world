import * as THREE from 'three';
import { HOOP, G, STEP, shotVelocity, stepBall, inside3, outOfBounds } from './hoopphys.js';
import { sfx } from '../audio.js';
import { walletEngine } from '../wallet.js';
import { person, sportsUI, gameKeys } from './common.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// One on one, half court (Elvis, 10 October 2026): pickup rules. Game to 11 by ones and twos (2 from
// behind the arc), win by two. Check the ball at the top to start every possession; after a defensive
// rebound or a steal, take it back behind the arc before you can score; loser's ball after a basket.
// The ball is a real ball: shots fly under gravity and drag, kiss the glass, rattle round the rim, and
// drop through the net only when they actually go in.

export function createHoopsMatch({ court, you, them, toast, onEnd, reward = 0, to = 11 }) {
  const g = court.group, ui = sportsUI(), keys = gameKeys(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'e', 'escape']);
  keys.on = true; ui.show(true);
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(HOOP.ballR, 18, 12), new THREE.MeshStandardMaterial({ color: 0xd9692c, roughness: 0.7 }));
  const seams = new THREE.Mesh(new THREE.TorusGeometry(HOOP.ballR * 1.002, 0.004, 4, 24), new THREE.MeshBasicMaterial({ color: 0x1d1410 }));
  ballMesh.add(seams, seams.clone().rotateY(Math.PI / 2));
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.3, depthWrite: false }));
  g.add(ballMesh, shadow);
  const opp = person(them.look, them.name); g.add(opp.obj);
  const P = [
    { you: true, x: 0, z: 2.5, vx: 0, vz: 0, y: 0, vy: 0, yaw: Math.PI, rig: you.rig, name: 'You', score: 0 },
    { you: false, x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0, yaw: 0, rig: opp.rig, obj: opp.obj, name: them.name.split(' ')[0], score: 0, skill: them.skill ?? 0.6 },
  ];
  const ball = { p: new THREE.Vector3(0, 1, 2), v: new THREE.Vector3(), scored: false, holder: null, shooter: null, shotFrom: null, lastTouch: null, mustClear: false, cleared: true };
  const st = { phase: 'check', t: 1.2, poss: Math.random() < 0.5 ? 0 : 1, charge: -1, leaveAsk: 0, done: false, dribble: 0, aiPlan: 0, aiT: 0, stealCd: 0, t0: 0 };

  function board() {
    ui.board(P.map((p, i) => ({ name: p.name, serving: st.poss === i, cols: [p.score] })), ['Points']);
  }
  function setCheck(team, why) {
    st.phase = 'check'; st.t = 1.4; st.poss = team; ball.holder = P[team]; ball.v.set(0, 0, 0); ball.scored = false; ball.shooter = null;
    ball.mustClear = false; ball.cleared = true;
    const o = P[team], d = P[1 - team];
    o.x = 0; o.z = HOOP.rimZ + HOOP.arc + 1.3; d.x = 0; d.z = o.z - 1.4; o.vx = o.vz = d.vx = d.vz = 0;
    if (why) ui.call(why, 1500);
    ui.keys(team === 0 ? [['WASD', 'dribble'], ['Shift', 'drive'], ['Space', 'hold to shoot, let go at the top'], ['Esc', 'leave']] : [['WASD', 'defend'], ['Space', 'jump to block'], ['E', 'steal'], ['Esc', 'leave']]);
    board();
  }
  function give(team, needClear, why) {
    ball.holder = P[team]; st.poss = team; ball.shooter = null; ball.v.set(0, 0, 0);
    ball.mustClear = needClear; ball.cleared = !needClear;
    st.phase = 'live';
    if (why) ui.call(why, 1300);
    ui.keys(team === 0 ? [['WASD', 'dribble'], ['Shift', 'drive'], ['Space', 'hold to shoot'], ['Esc', 'leave']] : [['WASD', 'defend'], ['Space', 'block'], ['E', 'steal'], ['Esc', 'leave']]);
    board();
  }
  function scored(team, pts) {
    const counted = !ball.mustClear || ball.cleared;
    if (!counted) { sfx('whistle'); setCheck(1 - team, 'Take it back! No basket'); return; }
    P[team].score += pts;
    sfx('swish'); if (team === 0) sfx('cheer');
    const a = P[0].score, b = P[1].score;
    if ((a >= to || b >= to) && Math.abs(a - b) >= 2) {
      st.done = true; st.phase = 'over';
      const won = a > b;
      ui.call(`${won ? 'You win' : `${P[1].name} wins`} ${Math.max(a, b)}–${Math.min(a, b)}`, 4000);
      if (won && reward) { walletEngine().earn(reward, `Beat ${them.name} one on one`); setTimeout(() => toast?.(`+${reward} Efforts.`, 2500), 800); }
      ui.keys([['Space', 'play again'], ['Esc', 'leave']]);
      board(); return;
    }
    // loser's ball: the side that was scored on checks it up top
    st.phase = 'made'; st.t = 1.3; st.nextPoss = 1 - team;
    ui.call(`${pts === 2 ? 'Two!' : 'Bucket!'} ${a}–${b}`, 1300);
    board();
  }

  // shooting: release point above the head; quality from the timing of the release, and a hand in your face
  function shoot(p, quality) {
    const shooter = P.indexOf(p), d = P[1 - shooter];
    const from = new THREE.Vector3(p.x + Math.sin(p.yaw) * 0.25, 2.25 + p.y * 0.9, p.z + Math.cos(p.yaw) * 0.25);
    const dist = Math.hypot(p.x, p.z - HOOP.rimZ);
    const layup = dist < 1.8;
    const contest = clamp(1.6 - Math.hypot(d.x - p.x, d.z - p.z), 0, 1) * (d.y > 0.2 ? 1.4 : 0.8);
    if (layup) { from.y = 2.8 + p.y * 0.4; from.x += (0 - from.x) * 0.35; from.z += (HOOP.rimZ + 0.5 - from.z) * 0.35; }
    const v = shotVelocity(from, layup ? 72 : dist < 2.6 ? 66 : 52 + Math.min(2.5, dist * 0.3));
    // the error, sideways and in length: calibrated so a clean, open shot drops about as often as a good
    // pickup player's (layups 85%, free throws 75%, mid-range 55%, threes 40%); rushed or contested, less
    const L = v.length(), across = new THREE.Vector3(-v.z, 0, v.x).normalize();
    const err = (layup ? 0.035 : 0.008 + 0.0013 * dist) + (1 - quality) * 0.03 + contest * 0.02;
    v.addScaledVector(across, (Math.random() - 0.5) * 2 * err * L);
    v.multiplyScalar(1 + (Math.random() - 0.5) * 2 * err * 0.7);
    ball.p.copy(from); ball.v.copy(v); ball.holder = null; ball.shooter = shooter; ball.shotFrom = { x: p.x, z: p.z }; ball.scored = false; ball.lastTouch = shooter;
    ball.points = inside3(p.x, p.z) ? 1 : 2;
    st.phase = 'shot'; st.blockWindow = 0.3;
    sfx('hit', { power: 0.3 });
  }

  function update(dt) {
    st.t0 += dt;
    const pressed = keys.take();
    if (pressed.includes('escape')) { if (st.leaveAsk > 0 || st.done) { end(); return; } st.leaveAsk = 2.2; ui.call('Leave the game? Esc again to leave', 2000); }
    st.leaveAsk = Math.max(0, st.leaveAsk - dt);
    if (st.done) { if (pressed.includes(' ')) restart(); animate(dt); return; }
    const ax = keys.axis(), sprint = keys.has('shift');
    const me = P[0], ai = P[1];

    if (st.phase === 'check') { st.t -= dt; if (st.t <= 0) { give(st.poss, false, 'Check. Ball in'); } }
    if (st.phase === 'made') { st.t -= dt; if (st.t <= 0) setCheck(st.nextPoss); }

    // you: move relative to the camera, which looks at the hoop
    const live = st.phase === 'live' || st.phase === 'shot' || st.phase === 'loose';
    if (live) {
      const sp = ball.holder === me ? (sprint ? 5.6 : 4.0) : sprint ? 6.2 : 4.8;
      const k = 1 - Math.exp(-dt * 10);
      me.vx += (ax.x * sp - me.vx) * k; me.vz += (-ax.y * sp - me.vz) * k;
      if (me.y <= 0) { me.x += me.vx * dt; me.z += me.vz * dt; }
    } else { me.vx = me.vz = 0; }
    // jumping: to shoot, or to block
    if (pressed.includes(' ') && me.y <= 0 && live) {
      if (ball.holder === me) { st.charge = 0; me.vy = 3.6; }
      else me.vy = 4.0;
    }
    if (st.charge >= 0) {
      st.charge += dt;
      ui.meter(clamp(st.charge / 0.55, 0, 1), 0.82);
      // let go of Space at the top of the jump for the cleanest release
      if (!keys.has(' ') || st.charge > 0.75) {
        const u = st.charge / 0.55, q = clamp(1 - Math.abs(u - 0.82) * 2.4, 0.05, 1);
        st.charge = -1; ui.meter(null);
        if (ball.holder === me) shoot(me, q);
      }
    }
    // stealing
    st.stealCd -= dt;
    if (pressed.includes('e') && ball.holder === ai && st.stealCd <= 0) {
      st.stealCd = 1.1;
      const d = Math.hypot(ai.x - me.x, ai.z - me.z);
      if (d < 1.15) {
        const r = Math.random();
        if (r < 0.28 * (1.2 - ai.skill)) { ball.lastTouch = 0; give(0, true, 'Steal! Take it back'); sfx('pick'); }
        else if (r > 0.82) { sfx('whistle'); setCheck(1, 'Reach-in foul'); }
      }
    }

    // the other player
    aiThink(dt);

    // jumps and bounds
    P.forEach((p) => {
      if (p.y > 0 || p.vy > 0) { p.vy -= G * dt; p.y = Math.max(0, p.y + p.vy * dt); if (p.y === 0) p.vy = 0; }
      // players may not walk through each other
      p.x = clamp(p.x, -HOOP.halfW + 0.3, HOOP.halfW - 0.3); p.z = clamp(p.z, HOOP.baseZ + 0.3, HOOP.halfZ);
    });
    const dx = ai.x - me.x, dz = ai.z - me.z, dd = Math.hypot(dx, dz);
    if (dd < 0.62 && dd > 1e-3) { const push = (0.62 - dd) / 2; me.x -= (dx / dd) * push; me.z -= (dz / dd) * push; ai.x += (dx / dd) * push; ai.z += (dz / dd) * push; }

    // the ball
    if (ball.holder) {
      const h = ball.holder;
      st.dribble += dt * (Math.hypot(h.vx, h.vz) > 2 ? 9 : 6.5);
      const bounce = Math.abs(Math.sin(st.dribble));
      const side = 0.32;
      ball.p.set(h.x + Math.cos(h.yaw) * side + Math.sin(h.yaw) * 0.25, st.charge >= 0 && h === me ? 2.1 + h.y : 0.14 + bounce * 0.82, h.z - Math.sin(h.yaw) * side + Math.cos(h.yaw) * 0.25);
      if (bounce < 0.08 && !h.dribbled) { h.dribbled = true; const near = true; if (near) sfx('bounce', { kind: 'bball' }); } else if (bounce > 0.5) h.dribbled = false;
      // taking it back: once you are behind the arc with it, you may score
      if (ball.mustClear && !inside3(h.x, h.z)) { ball.cleared = true; ball.mustClear = false; if (h === me) ui.call('Cleared', 900); }
      // stepping out with the ball
      if (outOfBounds(h.x, h.z)) { sfx('whistle'); setCheck(1 - P.indexOf(h), 'Out of bounds'); }
    } else if (st.phase === 'shot' || st.phase === 'loose' || st.phase === 'made' || st.phase === 'over') {
      let acc = Math.min(dt, 0.05);
      while (acc > 1e-6) {
        const hh = Math.min(STEP, acc); acc -= hh;
        stepBall(ball, hh, (ev) => {
          if (ev === 'rim') { sfx('rim'); }
          if (ev === 'board') sfx('wall');
          if (ev === 'floor') { sfx('bounce', { kind: 'bball' }); if (st.phase === 'shot') st.phase = 'loose'; }
          if (ev === 'score' && ball.shooter != null) { scored(ball.shooter, ball.points); }
        });
      }
      // a block: a hand up near the shooter in the first moment of the shot
      if (st.phase === 'shot' && st.blockWindow > 0) {
        st.blockWindow -= dt;
        const d = P[1 - ball.shooter];
        const hand = new THREE.Vector3(d.x, 2.35 + d.y, d.z);
        if (d.y > 0.25 && hand.distanceTo(ball.p) < 0.55 && Math.random() < 0.6) {
          ball.v.set((ball.p.x - d.x) * 3, -1.5, (ball.p.z - d.z) * 3 + 2); ball.shooter = null; st.phase = 'loose'; ui.call('Blocked!', 1200); sfx('net');
        }
      }
      // after the rim or the floor, the ball is anyone's: whoever gets to it first has it
      if (st.phase === 'loose' || (st.phase === 'shot' && ball.p.y < 2.2 && ball.v.y < 0)) {
        if (st.phase === 'shot' && ball.p.y < 2.0) st.phase = 'loose';
        if (st.phase === 'loose' && !ball.scored) {
          for (const p of P) {
            const reachY = 2.3 + p.y;
            if (Math.hypot(ball.p.x - p.x, ball.p.z - p.z) < 0.7 && ball.p.y < reachY) {
              const team = P.indexOf(p), defensive = ball.shooter != null ? team !== ball.shooter : team !== ball.lastTouch;
              give(team, defensive, team === 0 ? (defensive ? 'Rebound. Take it back' : 'Offensive rebound') : null);
              sfx('pick'); break;
            }
          }
        }
        if (st.phase === 'loose' && outOfBounds(ball.p.x, ball.p.z) && ball.p.y < 1.5) { sfx('whistle'); setCheck(ball.lastTouch === 0 ? 1 : 0, 'Out of bounds'); }
      }
      if (ball.scored && ball.p.y < 0.5) { /* the made basket is handled by scored(); the ball rolls away */ }
    }
    animate(dt);
  }

  // the other player: defends between you and the basket; on the ball, drives, pulls up or finishes
  function aiThink(dt) {
    const me = P[0], ai = P[1], sk = ai.skill;
    const live = st.phase === 'live' || st.phase === 'shot' || st.phase === 'loose';
    if (!live) return;
    let tx = ai.x, tz = ai.z, sp = 4.6 + sk * 1.4;
    if (ball.holder === me) {
      // stay between you and the rim, closer the better they are
      const hx = 0 - me.x, hz = HOOP.rimZ - me.z, hd = Math.hypot(hx, hz) || 1, gap = 1.35 - sk * 0.45;
      tx = me.x + (hx / hd) * gap; tz = me.z + (hz / hd) * gap;
      // contest a shot: jump when you jump
      if (st.charge >= 0 && ai.y <= 0 && Math.hypot(ai.x - me.x, ai.z - me.z) < 1.8 && Math.random() < 0.06 + sk * 0.08) ai.vy = 3.9;
      // reach for the ball now and then
      st.aiT -= dt;
      if (st.aiT <= 0 && Math.hypot(ai.x - me.x, ai.z - me.z) < 1.1) {
        st.aiT = rnd(1.2, 2.6);
        const r = Math.random();
        if (r < 0.1 * sk) { ball.lastTouch = 1; give(1, true, 'Stolen!'); sfx('pick'); return; }
        if (r > 0.93) { sfx('whistle'); setCheck(0, 'Foul on ' + ai.name); return; }
      }
    } else if (ball.holder === ai) {
      if (ball.mustClear) { tx = ai.x * 0.6; tz = HOOP.rimZ + HOOP.arc + 1.0; sp = 4.6; }
      else {
        // a plan: drive to a spot, then shoot when open, or attack the rim
        st.aiPlan -= dt;
        if (st.aiPlan <= 0 || !ai.spot) {
          st.aiPlan = rnd(1.3, 2.6);
          const drive = Math.random() < 0.45 + 0.2 * sk;
          ai.spot = drive ? { x: rnd(-1.2, 1.2), z: HOOP.rimZ + rnd(0.7, 1.4), drive: true } : (() => { const a = rnd(-1.2, 1.2), rr = Math.random() < 0.35 * sk ? HOOP.arc + 0.5 : rnd(3.2, 5.5); return { x: Math.sin(a) * rr, z: HOOP.rimZ + Math.cos(a) * rr, drive: false }; })();
        }
        tx = ai.spot.x; tz = ai.spot.z; sp = 4.2 + sk * 1.2;
        const open = Math.hypot(me.x - ai.x, me.z - ai.z), atSpot = Math.hypot(ai.x - tx, ai.z - tz) < 0.6, close = Math.hypot(ai.x, ai.z - HOOP.rimZ) < 1.7;
        if ((close && ai.spot.drive) || (atSpot && open > 1.3) || st.aiShotClock > 7) {
          ai.vy = 3.6; st.aiShotClock = 0;
          setTimeout(() => { if (ball.holder === ai && !st.done) shoot(ai, clamp(sk + rnd(-0.2, 0.15), 0.1, 1)); }, 280);
          ai.spot = null;
        }
        st.aiShotClock = (st.aiShotClock || 0) + dt;
      }
    } else if (st.phase === 'loose' || st.phase === 'shot') {
      // crash the boards: where the ball will come down
      tx = ball.p.x + ball.v.x * 0.35; tz = ball.p.z + ball.v.z * 0.35; sp = 5.4 + sk;
      if (ball.p.y < 2.8 && ball.p.y > 2.0 && Math.hypot(ai.x - ball.p.x, ai.z - ball.p.z) < 0.9 && ai.y <= 0) ai.vy = 3.4;
    }
    const dx = tx - ai.x, dz = tz - ai.z, d = Math.hypot(dx, dz), k = 1 - Math.exp(-dt * 8);
    const want = d > 0.05 ? Math.min(sp, d * 3) : 0;
    ai.vx += ((d ? dx / d : 0) * want - ai.vx) * k; ai.vz += ((d ? dz / d : 0) * want - ai.vz) * k;
    if (ai.y <= 0) { ai.x += ai.vx * dt; ai.z += ai.vz * dt; }
    if (ball.holder !== ai) st.aiShotClock = 0;
  }

  function animate(dt) {
    const me = P[0], ai = P[1];
    // facing: the ball handler faces the basket, the defender faces the ball
    P.forEach((p, i) => {
      const o = P[1 - i];
      const face = ball.holder === p ? Math.atan2(0 - p.x, HOOP.rimZ - p.z) : Math.atan2(o.x - p.x, o.z - p.z);
      const dh = Math.atan2(Math.sin(face - p.yaw), Math.cos(face - p.yaw)); p.yaw += dh * (1 - Math.exp(-dt * 10));
    });
    ai.obj.position.set(ai.x, ai.y, ai.z); ai.obj.rotation.y = ai.yaw;
    const sp = Math.hypot(ai.vx, ai.vz);
    ai.rig?.update(dt, { speed: Math.min(sp, 7), running: sp > 3, t: st.t0, air: ai.y > 0.05 });
    [me, ai].forEach((p) => {
      const rig = p.rig; if (!rig) return;
      if (p.y > 0.05 || (p === me && st.charge >= 0)) { rig.R.shoulder.rotation.x = -2.7; rig.L.shoulder.rotation.x = -2.5; rig.R.elbow.rotation.x = -0.6; rig.L.elbow.rotation.x = -0.6; }
      else if (ball.holder === p) { rig.R.shoulder.rotation.x = -0.5 - Math.abs(Math.sin(st.dribble)) * 0.4; rig.R.elbow.rotation.x = -0.6; }
      else { rig.R.shoulder.rotation.z = 0.5; rig.L.shoulder.rotation.z = -0.5; rig.R.shoulder.rotation.x = -0.4; rig.L.shoulder.rotation.x = -0.4; }
    });
    ballMesh.position.copy(ball.p); ballMesh.rotation.x += dt * 6;
    shadow.position.set(ball.p.x, 0.012, ball.p.z); shadow.material.opacity = 0.3 * clamp(1 - ball.p.y / 6, 0.2, 1);
  }

  function restart() { P[0].score = 0; P[1].score = 0; st.done = false; setCheck(Math.random() < 0.5 ? 0 : 1, 'New game'); }
  function end() {
    keys.on = false; keys.dispose(); ui.show(false); ui.meter(null);
    ballMesh.removeFromParent(); shadow.removeFromParent(); opp.obj.removeFromParent(); opp.dispose?.();
    st.ended = true; onEnd?.();
  }
  const tmp = new THREE.Vector3();
  function pose() {
    const me = P[0];
    const w = g.localToWorld(tmp.set(me.x, 0, me.z)).clone();
    const from = g.localToWorld(new THREE.Vector3(me.x * 0.45, 5.0, Math.max(me.z, -3) + 7.2));
    const at = g.localToWorld(new THREE.Vector3(me.x * 0.3, 2.0, HOOP.rimZ + 1.2));
    return { x: w.x, z: w.z, y: me.y, yaw: me.yaw + g.rotation.y, speed: Math.hypot(me.vx, me.vz), running: Math.hypot(me.vx, me.vz) > 3, cam: { from, at } };
  }
  setCheck(st.poss, `${st.poss === 0 ? 'Your' : `${P[1].name}'s`} ball. Check`);
  return { update, pose, end, get ended() { return !!st.ended; }, get state() { return { phase: st.phase, poss: st.poss, score: [P[0].score, P[1].score], ball: ball.p.toArray().map((v) => +v.toFixed(2)), holder: ball.holder ? P.indexOf(ball.holder) : null }; }, test: { P, ball, st, shoot, give } };
}
