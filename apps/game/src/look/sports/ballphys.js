import * as THREE from 'three';

// Ball physics for the racket sports, with no browser in it, so it can be tested on its own: gravity, air
// drag and spin, bounces off the court, the table, the net and padel's walls, a look ahead, and the
// solver that finds the stroke to land the ball where it is aimed.

const G = 9.81;
export const STEP = 1 / 240;
export const SPORTS = {
  tennis: {
    name: 'Tennis', L: 23.77, W: 8.23, Wd: 10.97, netC: 0.914, netP: 1.07, netHalf: 6.4, svc: 6.4,
    ball: { r: 0.034, e: 0.74, fr: 0.7, drag: 0.019, spinK: 4.5, color: 0xd8ef3a }, run: { back: 4.2, side: 2.0 },
    reach: 1.35, reachY: [0.15, 2.7], speed: 6.6, shots: { drive: 23, lob: 13.5, drop: 9.5, serve1: 31, serve2: 23 }, err: 0.35, qErr: 3.2,
    serveHand: 'over', cam: { h: 5.4, back: 8.8, look: 0.18 }, kind: 'tennis',
  },
  padel: {
    name: 'Padel', L: 20, W: 10, Wd: 10, netC: 0.88, netP: 0.92, netHalf: 5.0, svc: 6.95,
    ball: { r: 0.033, e: 0.72, fr: 0.72, drag: 0.021, spinK: 4, color: 0xe7f53c }, walls: { h: 3, mesh: 4, glassFromBack: 2 },
    reach: 1.25, reachY: [0.1, 2.6], speed: 5.8, shots: { drive: 18.5, lob: 12, drop: 8, serve1: 15.5, serve2: 13.5 }, err: 0.3, qErr: 2.4,
    serveHand: 'under', doubles: true, cam: { h: 5.8, back: 5.4, look: 0.12 }, kind: 'padel',
  },
  tt: {
    name: 'Table tennis', L: 2.74, W: 1.525, Wd: 1.525, netC: 0.1525, netP: 0.1525, netHalf: 0.915, table: 0.76,
    ball: { r: 0.02, e: 0.88, fr: 0.86, drag: 0.11, spinK: 3.5, color: 0xfff6e8 }, run: { back: 2.4, side: 1.6 },
    reach: 0.9, reachY: [0.77, 1.75], speed: 3.6, shots: { drive: 8.2, lob: 5.2, drop: 3.6, serve1: 4.4, serve2: 4.0 }, err: 0.05, qErr: 0.55,
    serveHand: 'toss', cam: { h: 2.0, back: 2.3, look: 0.25 }, kind: 'tt',
  },
};

const sgn = (v) => (v >= 0 ? 1 : -1);

// ---------- the physics: one step of the ball ----------
// ball: { p, v, spin, gone }, emits events: bounce, net, netcord, wall, gone
export function makeWorld(cfg) {
  const r = cfg.ball.r;
  const netTop = (ax) => cfg.netC + (cfg.netP - cfg.netC) * Math.min(1, ax / cfg.netHalf);
  const groundAt = (x, z) => (cfg.table != null ? (Math.abs(x) <= cfg.W / 2 && Math.abs(z) <= cfg.L / 2 ? cfg.table : 0) : 0);
  function step(b, dt, emit) {
    const sp = b.v.length();
    b.v.y -= (G + b.spin * cfg.ball.spinK) * dt;
    b.v.addScaledVector(b.v, -cfg.ball.drag * sp * dt);
    const pz = b.p.z, py = b.p.y, px = b.p.x;
    b.p.addScaledVector(b.v, dt);
    // the net: a wall at z = 0 between the posts, sagging to the centre
    if ((pz > 0) !== (b.p.z > 0) && !b.netDone) {
      const u = pz / (pz - b.p.z), ax = Math.abs(px + (b.p.x - px) * u), y = py + (b.p.y - py) * u;
      const h = (cfg.table ?? 0) + netTop(ax);
      if (ax <= cfg.netHalf && y < h + r * 0.4 && y > (cfg.table ?? 0) - 0.05) {
        b.p.z = sgn(pz) * r * 1.05; b.v.z *= -0.1; b.v.x *= 0.35; b.v.y *= 0.25; b.netDone = true; emit('net', { p: b.p });
      } else if (ax <= cfg.netHalf && y < h + r) {
        b.v.z *= 0.55; b.v.y = Math.abs(b.v.y) * 0.35 + 0.5; emit('netcord', { p: b.p });
      }
    }
    // the ground, or the table top
    const gy = groundAt(b.p.x, b.p.z);
    if (b.p.y - r <= gy && b.v.y < 0 && py - r >= gy - 0.05) {
      b.p.y = gy + r;
      const onTable = cfg.table != null && gy > 0;
      const e = (onTable || cfg.table == null ? cfg.ball.e : 0.55) * (b.spin < 0 ? 0.85 : 1);
      b.v.y = -b.v.y * e;
      const keep = cfg.ball.fr * (1 + 0.12 * b.spin);
      b.v.x *= keep; b.v.z *= keep; b.spin *= 0.4;
      emit('bounce', { x: b.p.x, z: b.p.z, onTable, floor: cfg.table != null && !onTable });
    } else if (cfg.table != null && b.p.y - r < cfg.table && b.p.y > cfg.table - 0.1 && Math.abs(b.p.x) <= cfg.W / 2 + r && Math.abs(b.p.z) <= cfg.L / 2 + r && py >= cfg.table && b.v.y < 0) {
      // the edge of the table
      b.p.y = cfg.table + r; b.v.y = -b.v.y * cfg.ball.e;
      emit('bounce', { x: b.p.x, z: b.p.z, onTable: true, floor: false });
    }
    // padel's walls: glass at the back and the back of the sides, mesh along the rest
    if (cfg.walls) {
      const w = cfg.walls, hz = cfg.L / 2, hx = cfg.W / 2;
      if (Math.abs(b.p.z) + r > hz) {
        if (b.p.y < w.mesh) { const glass = b.p.y < w.h; b.p.z = sgn(b.p.z) * (hz - r); b.v.z = -b.v.z * (glass ? 0.74 : 0.4); b.v.x *= 0.92; b.v.y *= glass ? 0.95 : 0.6; emit('wall', { side: sgn(b.p.z), back: true, glass }); }
        else if (!b.gone) { b.gone = true; emit('gone', {}); }
      }
      if (Math.abs(b.p.x) + r > hx) {
        const glass = Math.abs(b.p.z) > hz - w.glassFromBack && b.p.y < w.h;
        if (b.p.y < w.h) { b.p.x = sgn(b.p.x) * (hx - r); b.v.x = -b.v.x * (glass ? 0.74 : 0.42); if (!glass) { b.v.z *= 0.7; b.v.y *= 0.7; } emit('wall', { side: sgn(b.p.z), back: false, glass }); }
        else if (!b.gone) { b.gone = true; emit('gone', {}); }
      }
    } else if (!b.gone) {
      const far = cfg.table != null ? Math.abs(b.p.z) > cfg.L / 2 + 6 || Math.abs(b.p.x) > 6 : Math.abs(b.p.z) > cfg.L / 2 + 8.5 || Math.abs(b.p.x) > cfg.Wd / 2 + 5.5;
      if (far) { b.gone = true; emit('gone', {}); }
    }
    if (!b.gone && b.p.y < r + 0.002 && b.v.lengthSq() < 0.05) { b.gone = true; emit('gone', { rest: true }); }
  }
  // fly a copy of the ball forward: where it will be, with its bounces
  function predict(b, secs, every = 1 / 60) {
    const c = { p: b.p.clone(), v: b.v.clone(), spin: b.spin, gone: false, netDone: b.netDone }, out = [];
    let t = 0, acc = 0, bounces = [];
    while (t < secs && !c.gone) {
      step(c, STEP, (ev, d) => { if (ev === 'bounce') bounces.push({ t, x: d.x, z: d.z, onTable: d.onTable, floor: d.floor }); });
      t += STEP; acc += STEP;
      if (acc >= every) { acc = 0; out.push({ t, x: c.p.x, y: c.p.y, z: c.p.z, nb: bounces.length, lastB: bounces[bounces.length - 1] }); }
    }
    return { path: out, bounces };
  }
  // the velocity that sends the ball from p to land at target (x, z) with the given horizontal speed and
  // spin, clearing the net by at least `clear`; corrected for drag by flying it and adjusting the aim
  function solve(p, target, speed, spin, clear = 0.25) {
    const gy = groundAt(target.x, target.z);
    let aimX = target.x, aimZ = target.z, tau = Math.max(0.12, Math.hypot(target.x - p.x, target.z - p.z) / speed);
    let v = new THREE.Vector3();
    for (let pass = 0; pass < 7; pass++) {
      for (let it = 0; it < 4; it++) {
        const ge = G + spin * cfg.ball.spinK;
        v.set((aimX - p.x) / tau, (gy + r - p.y + 0.5 * ge * tau * tau) / tau, (aimZ - p.z) / tau);
        // fly it: first landing, and the height as it crosses the net
        const c = { p: p.clone(), v: v.clone(), spin, gone: false };
        let land = null, netY = null, t = 0;
        while (t < 4 && !land) {
          const z0 = c.p.z, y0 = c.p.y;
          const sp = c.v.length(); c.v.y -= ge * STEP; c.v.addScaledVector(c.v, -cfg.ball.drag * sp * STEP); c.p.addScaledVector(c.v, STEP); t += STEP;
          if (netY == null && (z0 > 0) !== (c.p.z > 0)) netY = y0 + (c.p.y - y0) * (z0 / (z0 - c.p.z));
          if (c.p.y <= gy + r && c.v.y < 0) land = c.p.clone();
        }
        if (!land) break;
        aimX += target.x - land.x; aimZ += target.z - land.z;
        if (Math.abs(target.x - land.x) + Math.abs(target.z - land.z) < 0.03) { v.netY = netY; break; }
        v.netY = netY;
      }
      const need = (cfg.table ?? 0) + cfg.netC + r + clear;
      if (v.netY == null || v.netY >= need || (p.z > 0) === (target.z > 0)) return v;
      tau *= 1.15;
    }
    return v;
  }
  return { step, predict, solve, netTop, groundAt, r };
}

