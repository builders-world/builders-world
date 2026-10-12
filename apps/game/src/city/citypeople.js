// People on the open city's pavements (with citytraffic.js, so the city past the district is not empty): a pool of
// the game's own rigged people, dressed by lookFor as the district's walkers are, walking the pavements of the streets
// near you, crossing at the junctions to the next street, turning back where the loaded streets end. When you leave
// someone behind they come back somewhere ahead of you, out of sight. Far off they are a single mesh and further off
// nothing at all (anim.js cullPeople), so the pool costs little beyond a few dozen metres.
import * as THREE from 'three';
import { createAvatarModel } from '../onboarding/avatar.js';
import { rigAvatar } from '../look/anim.js';
import { prepareLook, dress, lookFor } from '../look/style.js';
import { profileOf, Y } from './roadnet.js';

const CELL = 32;

export function createCityPeople({ openWorld, quality = 'high', reduced = false, seeDist = 60 }) {
  const N = Math.round(({ low: 8, medium: 16, high: 28, ultra: 40 }[quality] ?? 24) * (reduced ? 0.6 : 1));
  // they come back just past where people stop being drawn (seeDist, quality.js), and walk into view from there
  const REACH = seeDist * 1.6;
  const group = new THREE.Group(); group.name = 'city-people'; openWorld.group.add(group);
  const people = [];
  let built = 0;
  // a few people a frame, so the city does not stall while it dresses them
  function build() {
    for (let k = 0; k < 2 && built < N; k++, built++) {
      const fem = built % 2 === 1, tier = built % 3;
      const av = createAvatarModel({ color: '#888888', style: 'tee' }); prepareLook(av.root);
      const rig = rigAvatar(av.root); dress(av.root, lookFor(`city-walker-${built}`, { fem, elder: built % 7 === 6, tier }), rig);
      av.root.visible = false; group.add(av.root);
      people.push({ obj: av.root, rig, live: false, pace: 1.05 + (built % 5) * 0.09 - (built % 7 === 6 ? 0.3 : 0) });
    }
  }

  // ---------- the pavements near you ----------
  let walks = [], entries = new Map(), version = -1;
  function rebuild() {
    version = openWorld.mapVersion; walks = []; entries = new Map();
    const classes = openWorld.classes?.(); if (!classes) return;
    openWorld.eachMap((m) => m.roads.forEach(([c, , p, o, l, rb, e]) => {
      const cls = classes[c]; if (!cls || rb || p.length < 4 || (e && e.some((h) => h > 0.5))) return; // no pavements on decks or roundabouts
      const prof = profileOf({ cls, lanes: l, oneway: !!o }); if (!prof.pave || prof.pave < 1) return;
      const pts = []; for (let i = 0; i < p.length; i += 2) pts.push([p[i], p[i + 1]]);
      const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const L = cum[cum.length - 1]; if (L < 4) return;
      const W = { src: p, pts, cum, L, off: prof.half + prof.pave * 0.5 };
      walks.push(W);
      [0, 1].forEach((end) => { const [x, z] = end ? pts[pts.length - 1] : pts[0], key = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`; if (!entries.has(key)) entries.set(key, []); entries.get(key).push({ W, end, x, z }); });
    }));
    const same = (W) => walks.find((w) => w.src === W.src);
    people.forEach((q) => {
      if (!q.live) return;
      const r = same(q.W); if (r) q.W = r; else q.live = false;
      if (q.cross) { const t = same(q.cross.W); if (t) q.cross.W = t; else q.live = false; }
    });
  }
  // a point on a pavement: distance d from the walk's start, on side sd (+1 the right of a to b, -1 the left)
  function at(W, d, sd, out) {
    const u = Math.max(0, Math.min(W.L, d));
    let i = 1; while (i < W.cum.length - 1 && W.cum[i] < u) i++;
    const a = W.pts[i - 1], b = W.pts[i], seg = W.cum[i] - W.cum[i - 1] || 1, t = (u - W.cum[i - 1]) / seg, tx = (b[0] - a[0]) / seg, tz = (b[1] - a[1]) / seg;
    out[0] = a[0] + (b[0] - a[0]) * t - tz * W.off * sd; out[1] = a[1] + (b[1] - a[1]) * t + tx * W.off * sd;
    return out;
  }
  // at the end of a pavement: across to the next one that carries on (the same side of the street), or back again
  function onward(q) {
    const W = q.W, end = q.dir > 0 ? W.pts[W.pts.length - 1] : W.pts[0], here = at(W, q.dir > 0 ? W.L : 0, q.sd, []);
    const hx = (q.dir > 0 ? 1 : -1), i = Math.floor(end[0] / CELL), j = Math.floor(end[1] / CELL), opts = [];
    for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) (entries.get(`${a},${b}`) || []).forEach((en) => {
      if (en.W === W || Math.hypot(en.x - end[0], en.z - end[1]) > 28) return;
      // start on the side of the new street nearest where you stand
      const dir = en.end ? -1 : 1, d0 = en.end ? en.W.L : 0, A = at(en.W, d0, 1, []), B = at(en.W, d0, -1, []);
      const sd = Math.hypot(A[0] - here[0], A[1] - here[1]) < Math.hypot(B[0] - here[0], B[1] - here[1]) ? 1 : -1, P = sd > 0 ? A : B;
      opts.push({ W: en.W, dir, sd, d: d0, x: P[0], z: P[1], cost: Math.hypot(P[0] - here[0], P[1] - here[1]) });
    });
    void hx;
    if (!opts.length) return null;
    opts.sort((a, b) => a.cost - b.cost);
    return opts[Math.floor(Math.random() * Math.min(3, opts.length))];
  }

  const cam = { x: 0, z: 0 }, tmp = [0, 0];
  function spawn(q, first) {
    for (let tries = 0; tries < 16 && walks.length; tries++) {
      const W = walks[Math.floor(Math.random() * walks.length)], d = Math.random() * W.L, sd = Math.random() < 0.5 ? 1 : -1, P = at(W, d, sd, []);
      const dd = Math.hypot(P[0] - cam.x, P[1] - cam.z); if (dd > REACH || dd < (first ? 6 : seeDist)) continue;
      Object.assign(q, { W, d, sd, dir: Math.random() < 0.5 ? 1 : -1, cross: null, live: true });
      q.obj.position.set(P[0], Y.pave, P[1]); q.obj.visible = true;
      return true;
    }
    return false;
  }

  let rebuildIn = 0, first = true, t = 0;
  function update(camera, dt, player) {
    if (!openWorld.ready) return;
    dt = Math.min(dt, 0.1); t += dt;
    if (built < N) build();
    const off = openWorld.offset; cam.x = camera.position.x + off.x; cam.z = camera.position.z + off.z;
    const me = player ? { x: player.x + off.x, z: player.z + off.z } : cam;
    if ((rebuildIn -= dt) <= 0 && version !== openWorld.mapVersion) { rebuild(); rebuildIn = 0.5; }
    if (!walks.length) return;
    people.forEach((q) => {
      if (!q.live && !spawn(q, first)) { q.obj.visible = false; return; }
      const p = q.obj.position;
      if (Math.hypot(p.x - cam.x, p.z - cam.z) > REACH * 1.25) { q.live = false; q.obj.visible = false; return; }
      // step aside for you, as people do
      const slow = Math.hypot(me.x - p.x, me.z - p.z) < 1.3 ? 0.25 : 1, v = q.pace * slow;
      let tx, tz;
      if (q.cross) { // over the road to the next pavement
        const dx = q.cross.x - p.x, dz = q.cross.z - p.z, d = Math.hypot(dx, dz);
        if (d < 0.4) { Object.assign(q, { W: q.cross.W, dir: q.cross.dir, sd: q.cross.sd, d: q.cross.d, cross: null }); return; }
        tx = dx / d; tz = dz / d; p.x += tx * v * dt; p.z += tz * v * dt;
      } else {
        q.d += q.dir * v * dt;
        if (q.d > q.W.L || q.d < 0) {
          const n = onward(q);
          if (n) q.cross = n; else { q.dir = -q.dir; q.d = Math.max(0, Math.min(q.W.L, q.d)); }
          return;
        }
        at(q.W, q.d, q.sd, tmp); const dx = tmp[0] - p.x, dz = tmp[1] - p.z, d = Math.hypot(dx, dz) || 1; tx = dx / d; tz = dz / d;
        p.x = tmp[0]; p.z = tmp[1];
      }
      const want = Math.atan2(tx, tz), dh = Math.atan2(Math.sin(want - q.obj.rotation.y), Math.cos(want - q.obj.rotation.y));
      q.obj.rotation.y += dh * (1 - Math.exp(-dt * 8));
      if (!q.obj.userData.far) q.rig?.update(dt, { speed: v, t }); // (out of sight they walk on, unposed: anim.js draws nothing of them)
    });
    first = false;
  }
  return { group, update, stats: () => ({ people: people.filter((q) => q.live).length, built, walks: walks.length }), dispose: () => group.removeFromParent() };
}
