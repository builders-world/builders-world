import * as THREE from 'three';
import { TennisScore, TableTennisScore } from './scoring.js';
import { SPORTS, makeWorld, STEP } from './ballphys.js';
export { SPORTS };
import { sfx } from '../audio.js';
import { walletEngine } from '../wallet.js';
import { person, box, mat, sportsUI, gameKeys } from './common.js';

// Tennis, padel and table tennis on one engine (Elvis, 10 October 2026: "actual playable games ... follow
// the rules of the games, the physics of the games, the logic of the games"). The ball flies under
// gravity with air drag and spin, bounces off the court, the table, the net and padel's glass; the
// umpire applies each game's rules to what the ball actually did. Court space: x across, z along the
// length, the net at z = 0, y up. Team 0 is you (and, in padel, your partner).

const rnd = (a, b) => a + Math.random() * (b - a);
const sgn = (v) => (v >= 0 ? 1 : -1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// a racket for a hand: strings and frame, a solid padel bat, or a table tennis bat
function racketMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'tennis') {
    g.add(new THREE.Mesh(box(0.03, 0.26, 0.03, 0, -0.13, 0), mat(0x22252b)));
    const head = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 20).scale(0.78, 1, 1).translate(0, -0.42, 0), mat(0xe46f4f, 0.5));
    const strings = new THREE.Mesh(new THREE.CircleGeometry(0.125, 16).scale(0.78, 1, 1).translate(0, -0.42, 0), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    g.add(head, strings);
  } else if (kind === 'padel') {
    g.add(new THREE.Mesh(box(0.035, 0.2, 0.035, 0, -0.1, 0), mat(0x22252b)));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.035, 18).rotateX(Math.PI / 2).scale(0.85, 1.1, 1).translate(0, -0.33, 0), mat(0x2a9d94, 0.5)));
  } else {
    g.add(new THREE.Mesh(box(0.025, 0.1, 0.025, 0, -0.05, 0), mat(0x8a5a36)));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 16).rotateX(Math.PI / 2).translate(0, -0.15, 0), mat(0xc0392b, 0.6)));
  }
  g.rotation.x = -1.2;
  return g;
}
function attachRacket(rig, kind) {
  if (!rig?.R?.elbow) return null;
  const hand = rig.R.elbow.children.find((o) => o.isMesh && o.position.y < -0.2);
  const r = racketMesh(kind);
  r.position.set(0, hand ? hand.position.y - 0.04 : -0.36, 0.02);
  rig.R.elbow.add(r);
  return r;
}

// ---------- a match ----------
// court: { group (court space as an Object3D), cfg }, you: the player's avatar and rig;
// them: [{ name, look, skill }] (one, or two in padel), mate: your padel partner
export function createRacketMatch({ kind, court, you, them, mate, fmt, toast, onEnd, reward = 0 }) {
  const cfg = SPORTS[kind], phys = makeWorld(cfg), ui = sportsUI(), keys = gameKeys();
  const g = court.group, hz = cfg.L / 2, tt = cfg.table != null;
  const tmp = new THREE.Vector3();
  keys.on = true; ui.show(true);

  // the ball, its shadow on the ground, and the marks it leaves where it lands
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(cfg.ball.r * (tt ? 1.6 : 1.5), 12, 8), new THREE.MeshStandardMaterial({ color: cfg.ball.color, roughness: 0.6, emissive: cfg.ball.color, emissiveIntensity: 0.18 }));
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(cfg.ball.r * 2.2, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
  const marks = [];
  g.add(ballMesh, shadow);
  const ball = { p: new THREE.Vector3(0, 1, hz), v: new THREE.Vector3(), spin: 0, gone: false, netDone: false, held: true };

  // the people: you and your partner (team 0), them (team 1)
  const players = [];
  const mk = (team, slot, npc, skill) => ({ team, slot, npc, skill: skill ?? 0.6, x: 0, z: 0, vx: 0, vz: 0, yaw: 0, swingT: 9, swingSide: 1, racket: null, react: 0, target: null, armed: -9 });
  const P0 = mk(0, 0, null, 1); P0.isYou = true; players.push(P0);
  P0.racket = attachRacket(you.rig, kind);
  if (cfg.doubles && mate) { const p = person(mate.look, mate.name); g.add(p.obj); const M = mk(0, 1, p, mate.skill); M.name = mate.name; M.racket = attachRacket(p.rig, kind); players.push(M); }
  them.forEach((o, k) => { const p = person(o.look, o.name); g.add(p.obj); const T = mk(1, k, p, o.skill); T.name = o.name; T.racket = attachRacket(p.rig, kind); players.push(T); });
  const team = (t) => players.filter((p) => p.team === t);
  const names = [cfg.doubles && mate ? `You & ${mate.name.split(' ')[0]}` : 'You', them.map((o) => o.name.split(' ')[0]).join(' & ')];
  const score = tt ? new TableTennisScore(fmt, names, Math.random() < 0.5 ? 0 : 1) : new TennisScore(fmt, names, Math.random() < 0.5 ? 0 : 1);
  // which end each team is at: +1 the near half (z > 0), -1 the far half
  const sideOf = [1, -1];
  // in doubles, which player of each team serves next time that team serves
  const serveIx = [0, 0];

  const st = { phase: 'ready', serveNo: 1, lastHit: null, hitSide: 0, bounces: 0, lastBounceSide: 0, serveFlight: false, serveBounces: 0, net: false, touched: false, deadT: 0, server: null, receiver: null, leaveAsk: 0, done: false };

  // doubles: the first player of a team covers its right half (as they face the net), the second its left
  const lane = (p) => (p.slot === 0 ? 1 : -1) * sideOf[p.team];
  function serverPlayer() {
    const t = score.server, list = team(t);
    return list[Math.min(serveIx[t], list.length - 1)];
  }
  // tennis and padel: the server stands right of centre on the deuce court, left on the ad court
  function setupPoint() {
    ball.gone = false; ball.netDone = false; ball.spin = 0; ball.v.set(0, 0, 0); ball.held = true;
    st.phase = 'ready'; st.lastHit = null; st.bounces = 0; st.serveFlight = false; st.serveBounces = 0; st.net = false; st.touched = false; st.hitSide = 0;
    const S = sideOf[score.server], R = -S, deuce = score.deuceCourt;
    const srv = serverPlayer(); st.server = srv;
    const sx = (deuce ? 1 : -1) * S; // +x is your right when you face the net from the near end
    // receivers: in doubles, the player whose half the serve goes to takes it
    const recv = team(1 - score.server);
    const rx = -sx;
    st.receiver = recv.length > 1 ? recv.find((p) => lane(p) === sgn(rx)) || recv[0] : recv[0];
    players.forEach((p) => {
      const side = sideOf[p.team];
      if (p === srv) { p.x = tt ? sx * 0.25 : sx * (cfg.doubles ? cfg.W / 4 : 0.9); p.z = side * (tt ? hz + 0.45 : cfg.walls ? hz - 0.6 : hz + 0.35); }
      else if (p === st.receiver) { p.x = tt ? rx * 0.2 : rx * (cfg.doubles ? cfg.W / 4 : cfg.W / 4 + 0.4); p.z = side * (tt ? hz + 0.6 : cfg.walls ? hz - 1.2 : hz + 0.9); }
      else if (p.team === srv.team) { p.x = -sx * cfg.W / 4; p.z = side * 2.6; }
      else { p.x = -rx * cfg.W / 4; p.z = side * (hz - 1.6); }
      p.homeX = cfg.doubles ? lane(p) * cfg.W / 4 : 0;
      p.vx = 0; p.vz = 0; p.swingT = 9; p.target = null; p.react = 0;
    });
    ball.p.set(srv.x + 0.35 * -sideOf[srv.team], tt ? 0.98 : 1.05, srv.z);
    srv.tossT = srv.npc ? rnd(1.0, 1.8) : 0;
    updateBoard();
    ui.keys(srv.isYou ? (kind === 'padel' ? [['Space', 'bounce the ball'], ['Space', 'serve, below the waist'], ['A D', 'aim'], ['Esc', 'leave']] : [['Space', 'toss'], ['Space', 'hit'], ['A D', 'aim wide or down the middle'], ['Esc', 'leave']])
      : [['WASD', 'move'], ['Space', 'swing'], ['A D / W S', 'aim while you swing'], ['Shift', 'lob'], ['Esc', 'leave']]);
  }

  function updateBoard() {
    const rows = [0, 1].map((t) => ({ name: names[t], serving: score.server === t, cols: tt ? [score.games[t], score.pointLabel(t)] : [...(score.fmt.sets > 1 ? [score.sets[t]] : []), score.games[t], score.pointLabel(t)] }));
    ui.board(rows, tt ? ['Games', 'Points'] : [...(score.fmt.sets > 1 ? ['Sets'] : []), 'Games', score.tiebreak ? 'Tiebreak' : 'Points']);
  }

  function point(winner, why) {
    if (st.phase === 'dead' || st.done) return;
    st.phase = 'dead'; st.deadT = 2.0;
    const r = score.pointTo(winner);
    sfx(why === 'Fault' || why === 'Out' || why === 'Let' ? 'whistle' : winner === 0 ? 'cheer' : 'net');
    ui.call(`${why ? `${why}. ` : ''}${r.call}`, 1900);
    if (r.ends) { st.swapEnds = true; }
    // doubles: the team that just served has the other partner serve its next service game
    if (cfg.doubles && r.game) { const justServed = 1 - score.server; serveIx[justServed] = (serveIx[justServed] + 1) % 2; }
    updateBoard();
    if (r.match) {
      st.done = true; st.deadT = 3.5;
      const won = score.over && score.over.includes(names[0]);
      if (won && reward) { walletEngine().earn(reward, `Won at ${cfg.name.toLowerCase()} against ${names[1]}`); setTimeout(() => toast?.(`You won! +${reward} Efforts.`, 3000), 600); }
      ui.keys([['Space', 'play again'], ['Esc', 'leave']]);
    }
  }
  // a fault on serve: the second serve, or a double fault
  function fault(why = 'Fault') {
    if (st.phase === 'dead') return;
    if (st.serveNo === 1 && !tt) { st.serveNo = 2; ui.call(`${why}. Second serve`, 1500); sfx('whistle'); st.phase = 'dead'; st.deadT = 1.4; st.again = true; return; }
    st.serveNo = 1; point(1 - score.server, tt ? why : 'Double fault');
  }

  // ---------- the umpire: what the ball did, against the rules ----------
  const sideTeam = (side) => (sideOf[0] === side ? 0 : 1);
  function onEvent(ev, d) {
    if (st.phase !== 'rally' && st.phase !== 'toss') return;
    if (st.phase === 'toss') {
      // a padel serve bounces once before it is struck; a toss that drops is tossed again
      if (ev === 'bounce') { if (kind === 'padel' && !st.dropBounced) { st.dropBounced = true; sfx('bounce', { kind }); return; } st.phase = 'ready'; ball.held = true; const s = st.server; ball.p.set(s.x + 0.35 * -sideOf[s.team], tt ? 0.98 : 1.05, s.z); ball.v.set(0, 0, 0); s.tossT = s.npc ? 0.8 : 0; }
      return;
    }
    const hitter = st.lastHit?.team ?? score.server;
    if (ev === 'net') { st.net = true; sfx('net'); return; }
    if (ev === 'netcord') { st.net = true; return; }
    if (ev === 'bounce') {
      mark(d.x, d.z, d.onTable);
      sfx('bounce', { kind: tt ? 'tt' : kind });
      const side = sgn(d.z);
      if (tt) {
        if (d.floor) {
          // off the table: if it already bounced on their side, they failed to return it
          if (st.serveFlight) { st.serveBounces >= 2 ? point(score.server, '') : fault('Fault'); return; }
          if (st.bounces >= 1) point(hitter, ''); else point(1 - hitter, 'Out');
          return;
        }
        if (st.serveFlight) {
          if (st.serveBounces === 0) { if (side !== sideOf[score.server]) { fault('Fault: it must bounce on your side first'); return; } st.serveBounces = 1; return; }
          if (st.serveBounces === 1) {
            if (side === sideOf[score.server]) { fault('Fault'); return; }
            if (st.net) { ui.call('Let', 1200); sfx('whistle'); st.phase = 'dead'; st.deadT = 1.2; st.again = true; return; }
            st.serveBounces = 2; st.bounces = 1; st.lastBounceSide = side; return;
          }
          point(score.server, ''); return;
        }
        if (st.bounces === 0) { if (side === st.hitSide) { point(1 - hitter, 'Own side'); return; } st.bounces = 1; st.lastBounceSide = side; return; }
        point(hitter, ''); return;
      }
      // tennis and padel
      const inCourt = Math.abs(d.x) <= cfg.W / 2 + cfg.ball.r && Math.abs(d.z) <= hz + cfg.ball.r;
      if (st.serveFlight) {
        const S = sideOf[score.server], sx = (score.deuceCourt ? 1 : -1) * S;
        const inBox = side === -S && Math.abs(d.z) <= cfg.svc + cfg.ball.r && sgn(d.x) === -sgn(sx) && Math.abs(d.x) <= cfg.W / 2 + cfg.ball.r;
        if (!inBox) { fault(st.net ? 'Net' : 'Fault'); return; }
        if (st.net) { ui.call('Let. Serve again', 1400); sfx('whistle'); st.phase = 'dead'; st.deadT = 1.3; st.again = true; return; }
        st.serveFlight = false; st.bounces = 1; st.lastBounceSide = side; return;
      }
      if (st.bounces === 0) {
        if (side === st.hitSide) { point(1 - hitter, st.net ? 'Net' : 'Into the net'); return; }
        if (!cfg.walls && !inCourt) { point(1 - hitter, 'Out'); return; }
        st.bounces = 1; st.lastBounceSide = side; return;
      }
      point(hitter, st.touched ? '' : 'Ace');
      return;
    }
    if (ev === 'wall') {
      sfx('wall');
      // before it bounces, the ball may hit only the hitter's own glass; the opponents' wall is out
      if (st.bounces === 0 && !st.serveFlight && d.side !== st.hitSide) { point(1 - hitter, 'Into the glass'); return; }
      if (st.serveFlight && st.serveBounces === 0 && st.bounces === 0) { fault('Fault'); }
      return;
    }
    if (ev === 'gone') {
      if (st.serveFlight) { st.bounces === 0 ? fault('Out') : point(score.server, ''); return; }
      if (st.bounces === 0) point(1 - hitter, 'Out'); else point(hitter, '');
    }
  }

  function mark(x, z, onTable) {
    const m = new THREE.Mesh(new THREE.RingGeometry(cfg.ball.r * 1.5, cfg.ball.r * 2.6, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }));
    m.position.set(x, (onTable ? cfg.table : 0) + 0.012, z); g.add(m); marks.push({ m, t: 1.6 });
  }

  // ---------- striking the ball ----------
  // the rules on who may hit: never twice in a row; the serve must bounce before it is returned; in table
  // tennis only after one bounce on your own side
  function canHit(p) {
    if (st.phase !== 'rally' || ball.gone) return false;
    const side = sideOf[p.team];
    if (sgn(ball.p.z) !== side) return false;
    if (st.lastHit && st.lastHit.team === p.team) return false;
    if (st.serveFlight) return false;
    if (tt) return st.bounces === 1 && st.lastBounceSide === side;
    return st.bounces === 0 || st.lastBounceSide === side;
  }
  // you can stretch and lunge a little further than the computer bothers to
  function inReach(p) {
    const dx = ball.p.x - p.x, dz = ball.p.z - p.z;
    return Math.hypot(dx, dz) < cfg.reach * (p.isYou ? 1.25 : 1) && ball.p.y > cfg.reachY[0] && ball.p.y < cfg.reachY[1];
  }
  // shot: 'drive' | 'lob' | 'drop'; aim: { x: -1..1 left to right as you face the net, y: 1 deep, -1 short }
  function strike(p, shot, aim, q) {
    const side = sideOf[p.team], o = -side;
    let tx, tz;
    const depth = shot === 'drop' ? rnd(0.18, 0.32) : shot === 'lob' ? rnd(0.72, 0.86) : aim.y > 0 ? rnd(0.78, 0.9) : aim.y < 0 ? rnd(0.42, 0.55) : rnd(0.62, 0.8);
    tz = o * hz * depth;
    const wide = (cfg.W / 2) * 0.78;
    tx = aim.x ? side * aim.x * wide * rnd(0.75, 1) : rnd(-0.3, 0.3) * cfg.W / 2;
    // the less clean the contact, the further from the aim it goes
    const err = cfg.err + (1 - q) * cfg.qErr;
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * err;
    tx += Math.cos(a) * d; tz += Math.sin(a) * d * 1.2;
    const spin = shot === 'drop' ? -0.6 : shot === 'lob' ? 0.1 : 0.55 * q;
    const speed = cfg.shots[shot] * (0.78 + 0.3 * q) * (p.npc ? 0.85 + 0.25 * p.skill : 1);
    const clear = shot === 'lob' ? 2.2 * (tt ? 0.12 : 1) : shot === 'drop' ? 0.12 * (tt ? 0.2 : 1) : (tt ? 0.04 : 0.3) + (1 - q) * (tt ? 0.04 : 0.4);
    const v = phys.solve(ball.p, { x: tx, z: tz }, speed, spin, clear);
    ball.v.copy(v); ball.spin = spin; ball.netDone = false;
    st.lastHit = p; st.hitSide = side; st.bounces = 0; st.net = false;
    st.touched = true;
    // where this shot will first come down, so the other side can let an out ball go
    { const b0 = phys.predict(ball, 3, 1 / 30).bounces[0]; st.landing = b0 ? { x: b0.x, z: b0.z, out: !cfg.walls && !tt && (Math.abs(b0.x) > cfg.W / 2 + cfg.ball.r || Math.abs(b0.z) > hz + cfg.ball.r) } : null; }
    // the other side reads the shot after a moment
    team(1 - p.team).forEach((o) => { o.react = o.npc ? rnd(0.1, 0.28) * (1.4 - o.skill) : 0; });
    p.swingT = 0; p.swingSide = sgn((ball.p.x - p.x) * side) || 1;
    sfx('hit', { kind: tt ? 'tt' : kind, power: q });
  }

  // the serve: tennis over the head into the diagonal box; padel bounced and struck below the waist;
  // table tennis tossed at least 16 cm, struck as it falls, bouncing on your side first
  function serveHit(p, q, aimX) {
    const S = sideOf[p.team], R = -S, sx = (score.deuceCourt ? 1 : -1) * S;
    st.serveFlight = true; st.serveBounces = 0; st.lastHit = p; st.hitSide = S; st.bounces = 0; st.net = false; st.phase = 'rally'; ball.held = false; ball.netDone = false;
    const first = st.serveNo === 1;
    const err = cfg.err * 0.8 + (1 - q) * cfg.qErr * (first ? 0.55 : 0.32);
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * err;
    if (tt) {
      // find a serve that bounces on your half, clears the net and lands on theirs; a poor contact then
      // spoils it a little, which can make it a fault, as it would
      let best = null;
      for (let k = 0; k < 80 && !best; k++) {
        const bx = (aimX || 0) * 0.35 + rnd(-0.12, 0.12), bz = S * rnd(0.45, 0.8) * hz, vh = rnd(3.4, 5.6);
        const v = phys.solve(ball.p, { x: bx, z: bz }, vh, 0.1, -9);
        const c = { p: ball.p.clone(), v: v.clone(), spin: 0.1, gone: false };
        const pr = phys.predict(c, 1.2, 1 / 120), b = pr.bounces;
        if (b.length >= 2 && b[0].onTable && sgn(b[0].z) === S && b[1].onTable && sgn(b[1].z) === R && Math.abs(b[1].x) < cfg.W / 2 - 0.05 && Math.abs(b[1].z) < hz - 0.05) best = v;
      }
      const v = best || phys.solve(ball.p, { x: 0, z: S * 0.6 * hz }, 4.4, 0.1, -9);
      v.x += Math.cos(a) * d * 0.35; v.z *= 1 + Math.sin(a) * d * 0.08; v.y += (Math.random() - 0.5) * d * 0.3;
      ball.v.copy(v); ball.spin = 0.1;
    } else {
      const boxX = -sgn(sx), wide = aimX ? (aimX * S * boxX > 0 ? 0.85 : 0.2) : 0.55;
      const tx = boxX * (cfg.W / 2) * wide + Math.cos(a) * d, tz = R * (cfg.svc - rnd(0.5, 1.3)) + Math.sin(a) * d;
      const sp = (first ? cfg.shots.serve1 : cfg.shots.serve2) * (0.82 + 0.25 * q) * (p.npc ? 0.85 + 0.2 * p.skill : 1);
      const v = phys.solve(ball.p, { x: tx, z: tz }, sp, first ? 0.15 : 0.6, first ? 0.12 : 0.35);
      ball.v.copy(v); ball.spin = first ? 0.15 : 0.6;
    }
    p.swingT = 0; p.swingSide = 0;
    sfx('hit', { kind: tt ? 'tt' : kind, power: q });
  }

  // ---------- thinking ahead: where can I meet the ball ----------
  function intercept(p) {
    const side = sideOf[p.team];
    const { path, bounces } = phys.predict(ball, tt ? 1.6 : 3.2);
    let best = null;
    // a ball going out is left alone: tennis lines, or straight into the glass in padel
    if (!tt && !st.serveFlight && st.bounces === 0 && st.lastHit && st.lastHit.team !== p.team) {
      const b0 = bounces[0];
      if (b0 && sgn(b0.z) === side && !cfg.walls && (Math.abs(b0.x) > cfg.W / 2 + cfg.ball.r || Math.abs(b0.z) > hz + cfg.ball.r)) return null;
    }
    // volley only from near the net; from the back, let it bounce first
    const volleyZone = cfg.walls ? 4.5 : 5.5;
    const firstOwnBounce = (pt) => pt.lastB && sgn(pt.lastB.z) === side;
    for (const pt of path) {
      if (sgn(pt.z) !== side || pt.y < cfg.reachY[0] || pt.y > cfg.reachY[1]) continue;
      if (tt && !(pt.nb >= 1 && firstOwnBounce(pt))) continue;
      if (!tt && st.serveFlight && pt.nb < 1) continue;
      if (!tt && pt.nb === 0 && st.bounces === 0 && Math.abs(p.z) > volleyZone && Math.abs(pt.z) > volleyZone - 1) continue;
      if (!tt && pt.nb >= 2) break;
      if (tt && pt.nb >= 2) break;
      // a comfortable height: after the bounce at hip height, or a volley near the net
      const comfy = tt ? pt.y > cfg.table + 0.08 : pt.y > 0.45 && pt.y < 1.6;
      const need = Math.max(0, Math.hypot(pt.x - p.x, pt.z - p.z) - cfg.reach * 0.7) / (cfg.speed * (p.npc ? 0.75 + 0.3 * p.skill : 1));
      if (need <= pt.t - (p.react || 0)) { if (comfy || !best) { best = pt; if (comfy) break; } }
      else if (!best || need - pt.t < best.miss) { best = { ...pt, miss: need - pt.t }; }
    }
    return best;
  }

  // ---------- moving ----------
  function bounds(p) {
    const side = sideOf[p.team];
    if (tt) { p.z = side * clamp(p.z * side, hz + 0.2, hz + cfg.run.back); p.x = clamp(p.x, -cfg.W / 2 - cfg.run.side, cfg.W / 2 + cfg.run.side); return; }
    if (cfg.walls) { p.z = side * clamp(p.z * side, 0.6, hz - 0.3); p.x = clamp(p.x, -cfg.W / 2 + 0.3, cfg.W / 2 - 0.3); return; }
    p.z = side * clamp(p.z * side, 0.8, hz + cfg.run.back); p.x = clamp(p.x, -cfg.Wd / 2 - cfg.run.side, cfg.Wd / 2 + cfg.run.side);
  }
  function moveToward(p, tx, tz, maxSp, dt) {
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    const want = d > 0.05 ? Math.min(maxSp, d * 4) : 0;
    const vx = d > 0.05 ? (dx / d) * want : 0, vz = d > 0.05 ? (dz / d) * want : 0;
    const k = 1 - Math.exp(-dt * 9);
    p.vx += (vx - p.vx) * k; p.vz += (vz - p.vz) * k;
    p.x += p.vx * dt; p.z += p.vz * dt;
  }
  // the player whose half the ball is coming to (doubles), or the only one
  function chaser(t) {
    const list = team(t); if (list.length === 1) return list[0];
    const ip = list.map((p) => ({ p, i: intercept(p) }));
    ip.sort((a, b) => (a.i ? (a.i.miss ?? -1) : 9) - (b.i ? (b.i.miss ?? -1) : 9) || Math.hypot(ball.p.x - a.p.x, ball.p.z - a.p.z) - Math.hypot(ball.p.x - b.p.x, ball.p.z - b.p.z));
    return ip[0].p;
  }

  // ---------- each frame ----------
  let planT = 0, tPrev = 0;
  function update(dt) {
    tPrev += dt;
    // keys
    const pressed = keys.take();
    if (pressed.includes('escape')) {
      if (st.leaveAsk > 0 || st.done) { end(); return; }
      st.leaveAsk = 2.2; ui.call('Leave the match? Esc again to leave', 2000);
    }
    st.leaveAsk = Math.max(0, st.leaveAsk - dt);
    if (st.done && pressed.includes(' ')) { restart(); return; }
    const axis = keys.axis();
    const lob = keys.has('shift');

    // the point is over: a moment, then the next serve (changing ends when the rules say)
    if (st.phase === 'dead') {
      st.deadT -= dt;
      if (st.deadT <= 0 && !st.done) {
        if (st.swapEnds) { st.swapEnds = false; sideOf[0] *= -1; sideOf[1] *= -1; ui.call('Change ends', 1200); }
        if (!st.again) st.serveNo = 1;
        st.again = false; st.dropBounced = false;
        setupPoint();
      }
    }

    // the serve
    const srv = st.server;
    if (st.phase === 'ready' && srv) {
      ball.p.set(srv.x + 0.35 * -sideOf[srv.team], tt ? 0.98 : 1.05, srv.z);
      const go = srv.isYou ? pressed.includes(' ') : (srv.tossT -= dt) <= 0;
      if (go) {
        st.phase = 'toss'; ball.held = false; st.dropBounced = false;
        if (kind === 'tennis') ball.v.set(0, 6.4, -sideOf[srv.team] * 0.25);
        else if (kind === 'padel') { ball.p.y = 1.0; ball.v.set(0, -0.5, 0); }
        else ball.v.set(0, 2.3, 0);
        srv.aimX = srv.npc ? rnd(-1, 1) : 0;
        srv.hitAt = srv.npc ? (kind === 'tennis' ? rnd(2.55, 2.9) : kind === 'padel' ? rnd(0.55, 0.8) : rnd(0.95, 1.05)) : null;
        pressed.splice(pressed.indexOf(' '), 1);
      }
    }
    if (st.phase === 'toss' && srv) {
      const valid = kind === 'tennis' ? ball.p.y > 2.0 : kind === 'padel' ? st.dropBounced : ball.v.y < 0 && ball.p.y > 0.9;
      const hitNow = srv.isYou ? pressed.includes(' ') : valid && (kind === 'tennis' ? ball.v.y < 0.6 && ball.p.y <= srv.hitAt + 0.3 : kind === 'padel' ? ball.v.y < 0 && ball.p.y <= srv.hitAt : ball.p.y <= srv.hitAt);
      if (hitNow) {
        if (kind === 'padel' && ball.p.y > 0.95) fault('Fault: above the waist');
        else if (kind === 'tt' && ball.v.y > 0) fault('Fault: struck rising');
        else if (!valid) { /* too early: the swing misses, toss again */ }
        else {
          const q = srv.isYou ? clamp(kind === 'tennis' ? 1 - Math.abs(ball.v.y) / 4.5 : kind === 'padel' ? 1 - Math.abs(ball.p.y - 0.7) / 0.6 : 1 - Math.abs(ball.p.y - 0.98) / 0.25, 0.15, 1) : clamp(srv.skill + rnd(-0.15, 0.12), 0.2, 1);
          serveHit(srv, q, srv.isYou ? axis.x : srv.aimX);
        }
      }
    }

    // the ball
    if (!ball.held && st.phase !== 'ready') {
      let acc = Math.min(dt, 0.05);
      while (acc > 1e-6) { const h = Math.min(STEP, acc); phys.step(ball, h, onEvent); acc -= h; }
    }

    // the players
    planT -= dt;
    if (planT <= 0) {
      planT = 0.08;
      if (st.phase === 'rally') {
        [0, 1].forEach((t) => {
          const c = chaser(t);
          team(t).forEach((p) => {
            const coming = sgn(ball.v.z) === sideOf[t] || sgn(ball.p.z) === sideOf[t];
            if (p === c && coming && canHitSoon(p)) { const i = intercept(p); p.target = i ? standFor(p, i) : null; }
            else p.target = home(p);
          });
        });
      } else players.forEach((p) => { p.target = null; });
    }
    players.forEach((p) => {
      const side = sideOf[p.team];
      const ready = st.phase === 'ready' || st.phase === 'toss';
      if (p.isYou) {
        if (!ready && (axis.x || axis.y)) {
          // forward is toward the net; right is your right as you face it
          const fx = side * axis.x, fz = -side * axis.y, l = Math.hypot(fx, fz) || 1;
          const sp = cfg.speed * (lob ? 1 : 1);
          const k = 1 - Math.exp(-dt * 12);
          p.vx += ((fx / l) * sp - p.vx) * k; p.vz += ((fz / l) * sp - p.vz) * k;
          p.x += p.vx * dt; p.z += p.vz * dt;
        } else if (!ready && p.target) moveToward(p, p.target.x, p.target.z, cfg.speed * 0.85, dt);
        else { p.vx *= 0.8; p.vz *= 0.8; }
      } else if (!ready && p.target) {
        if (p.react > 0) p.react -= dt; else moveToward(p, p.target.x, p.target.z, cfg.speed * (0.72 + 0.32 * p.skill), dt);
      } else { p.vx *= 0.85; p.vz *= 0.85; }
      bounds(p);
      // facing: toward the far end, turning a little to the ball
      const toBall = Math.atan2(ball.p.x - p.x, ball.p.z - p.z), base = side > 0 ? Math.PI : 0;
      p.yaw = base + clamp(Math.atan2(Math.sin(toBall - base), Math.cos(toBall - base)), -0.7, 0.7) * 0.6;
    });

    // swinging: you press Space and the swing is live for a moment; the computer swings when the ball arrives
    if (pressed.includes(' ')) P0.armed = tPrev;
    players.forEach((p) => {
      if (!canHit(p) || !inReach(p)) return;
      // the computer lets an out ball go, and from the back of the court waits for the bounce
      if (p.npc && !tt && st.bounces === 0 && (st.landing?.out || Math.abs(p.z) > (cfg.walls ? 4.5 : 5.5))) return;
      if (p.isYou) {
        const since = tPrev - P0.armed;
        if (since > 0.42) return;
        const dx = ball.p.x - p.x, dz = ball.p.z - p.z, dist = Math.hypot(dx, dz);
        const sweet = tt ? 0.45 : 0.8, h = tt ? cfg.table + 0.25 : 1.0;
        const q = clamp(1 - Math.abs(dist - sweet) / cfg.reach * 0.9 - Math.abs(ball.p.y - h) / (tt ? 0.8 : 2.2) - Math.max(0, since - 0.18) * 1.2, 0.08, 1);
        strike(p, lob ? 'lob' : axis.y < 0 ? 'drop' : 'drive', { x: axis.x, y: axis.y }, q);
        P0.armed = -9;
      } else {
        // the computer's choice of shot: away from you, deep; a lob if you are at the net, a drop if you are far back
        const opp = team(1 - p.team), near = opp.some((o) => Math.abs(o.z) < hz * 0.4), deep = opp.every((o) => Math.abs(o.z) > hz * 0.95);
        const shot = near && Math.random() < 0.35 ? 'lob' : deep && Math.random() < 0.15 * p.skill ? 'drop' : 'drive';
        const ox = opp.reduce((s, o) => s + o.x, 0) / opp.length;
        const aimX = clamp(-sgn(ox * sideOf[p.team]) * rnd(0.4, 1), -1, 1);
        const stretch = Math.max(0, Math.hypot(ball.p.x - p.x, ball.p.z - p.z) - cfg.reach * 0.6) / cfg.reach;
        // and now and then a plain mis-hit, more often for the weaker players
        const mishit = Math.random() < 0.05 + 0.12 * (1 - p.skill);
        const q = mishit ? rnd(0.02, 0.2) : clamp(p.skill + rnd(-0.25, 0.15) - stretch * 0.6, 0.05, 1);
        strike(p, shot, { x: aimX, y: Math.random() < 0.6 ? 1 : 0 }, q);
      }
    });

    // the look of it
    ballMesh.position.copy(ball.p);
    const gy = phys.groundAt(ball.p.x, ball.p.z);
    shadow.position.set(ball.p.x, gy + 0.008, ball.p.z);
    shadow.material.opacity = 0.32 * clamp(1 - (ball.p.y - gy) / 6, 0.2, 1);
    for (let i = marks.length - 1; i >= 0; i--) { const m = marks[i]; m.t -= dt; m.m.material.opacity = 0.7 * clamp(m.t / 1.6, 0, 1); if (m.t <= 0) { m.m.removeFromParent(); m.m.geometry.dispose(); m.m.material.dispose(); marks.splice(i, 1); } }
    players.forEach((p) => {
      if (p.npc) {
        p.npc.obj.position.set(p.x, 0, p.z); p.npc.obj.rotation.y = p.yaw;
        const sp = Math.hypot(p.vx, p.vz);
        p.npc.rig?.update(dt, { speed: Math.min(sp, 7), running: sp > 3.4, t: tPrev });
        swingPose(p.npc.rig, p, dt);
      }
    });
    swingPose(you.rig, P0, dt, true);
  }
  // the swing: forehand, backhand, or over the head for a tennis serve
  function swingPose(rig, p, dt) {
    if (!rig) return;
    const isServe = st.phase === 'toss' && p === st.server;
    if (isServe && kind === 'tennis') { rig.L.shoulder.rotation.x = -2.6; rig.R.shoulder.rotation.x = -2.4; rig.R.elbow.rotation.x = -1.6; return; }
    p.swingT += dt;
    const u = p.swingT / 0.36;
    if (u > 1) { rig.R.shoulder.rotation.x = Math.min(rig.R.shoulder.rotation.x, -0.35); rig.R.elbow.rotation.x = -0.9; return; }
    const s = p.swingSide || 1, e = Math.sin(u * Math.PI);
    if (p.swingSide === 0) { rig.R.shoulder.rotation.x = -2.8 + u * 2.6; rig.R.elbow.rotation.x = -0.4; return; }
    rig.chest.rotation.y = s * (0.7 - 1.4 * u) * e;
    rig.R.shoulder.rotation.x = -0.6 - 0.9 * e;
    rig.R.shoulder.rotation.z = s > 0 ? 0.9 * e : -1.0 * e;
    rig.R.elbow.rotation.x = -0.35;
  }
  function canHitSoon(p) { return st.phase === 'rally' && !(st.lastHit && st.lastHit.team === p.team); }
  // stand so the ball passes on your racket side, a comfortable arm's length away
  function standFor(p, i) { const side = sideOf[p.team]; return { x: i.x - side * (tt ? 0.25 : 0.45), z: i.z + side * (tt ? 0.1 : 0.2) }; }
  function home(p) {
    const side = sideOf[p.team];
    if (tt) return { x: 0, z: side * (hz + 0.7) };
    if (cfg.doubles) { const atNet = st.lastHit && st.lastHit.team === p.team; return { x: lane(p) * cfg.W / 4 * 0.8, z: side * (atNet ? 3.2 : hz - 2.2) }; }
    return { x: 0, z: side * (hz + 0.8) };
  }

  function restart() {
    const s = tt ? new TableTennisScore(fmt, names, Math.random() < 0.5 ? 0 : 1) : new TennisScore(fmt, names, Math.random() < 0.5 ? 0 : 1);
    Object.assign(score, s); Object.setPrototypeOf(score, Object.getPrototypeOf(s));
    st.done = false; st.serveNo = 1; sideOf[0] = 1; sideOf[1] = -1; serveIx[0] = 0; serveIx[1] = 0;
    setupPoint();
  }
  function end() {
    keys.on = false; keys.dispose(); ui.show(false);
    ballMesh.removeFromParent(); shadow.removeFromParent(); marks.forEach((m) => m.m.removeFromParent());
    players.forEach((p) => { p.racket?.removeFromParent(); if (p.npc) { p.npc.obj.removeFromParent(); p.npc.dispose?.(); } });
    if (you.rig) { you.rig.chest.rotation.y = 0; }
    st.ended = true; onEnd?.();
  }

  // where you are and where the camera looks, in the world
  function pose() {
    const side = sideOf[0];
    const sp = Math.hypot(P0.vx, P0.vz);
    const w = g.localToWorld(tmp.set(P0.x, 0, P0.z)).clone();
    const yaw = P0.yaw + g.rotation.y;
    const c = cfg.cam;
    const from = g.localToWorld(new THREE.Vector3(P0.x * 0.35, (tt ? cfg.table : 0) + c.h, side * (hz + c.back)));
    const at = g.localToWorld(new THREE.Vector3(P0.x * 0.2, tt ? cfg.table : 0.5, -side * hz * c.look));
    return { x: w.x, z: w.z, yaw, speed: sp, running: sp > 3.4, cam: { from, at } };
  }

  setupPoint();
  return { update, pose, end, get ended() { return !!st.ended; }, get score() { return score; }, get state() { return { phase: st.phase, serveNo: st.serveNo, bounces: st.bounces, done: st.done, server: st.server?.isYou ? 'you' : st.server?.name, lastHit: st.lastHit?.isYou ? 'you' : st.lastHit?.name || null, ball: ball.p.toArray().map((v) => +v.toFixed(2)), sideOf: [...sideOf], score: { points: [...score.points], games: [...score.games], sets: [...(score.sets || [])], over: score.over } }; }, test: { players, ball, phys, strike, serveHit, st, cfg, sideOf } };
}
