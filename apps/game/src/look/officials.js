import * as THREE from 'three';
import { createAvatarModel } from '../onboarding/avatar.js';
import { prepareLook, dress } from './style.js';
import { rigAvatar } from './anim.js';
import { officialLook } from './traffic.js';
import { cityInfo } from './cityinfo.js';
import { sfx } from './audio.js';

// Traffic officials on the street (Elvis, 10 October 2026: "officials who... monitor things like this", after a
// minibus turning into the motor park held up the road). Each city has its own agency in its own uniform
// (cityinfo.js): LASTMA in Lagos, the FRSC in Abuja and Uyo, TIMA-RIV in Port Harcourt, the traffic police in
// Nairobi, the MTTD in Accra.
// - A marshal at the motor park's access road waves the minibuses in and out.
// - A patrol officer answers any jam: when traffic.js reports a car stuck behind something that will not move,
//   the officer walks over, blows the whistle and waves the cars round.
// - Stand in the road holding up the cars and the nearest officer whistles at you.

export function createOfficials({ world, scene, traffic, park, chat, toast, getPlayer }) {
  const O = cityInfo().officials || {};
  const group = new THREE.Group(); group.name = 'officials'; scene.add(group);
  const crew = [];
  const make = (i, x, z, role) => {
    const av = createAvatarModel({ color: '#888', style: 'tee' }); prepareLook(av.root); const rig = rigAvatar(av.root);
    dress(av.root, officialLook(O, i), rig);
    av.root.position.set(x, 0, z); group.add(av.root);
    const o = { av, rig, obj: av.root, role, post: { x, z }, goal: null, wait: 0, next: 1 + i, name: O.title || 'Traffic officer' };
    chat?.add?.({ id: `official-${i}`, name: o.name, obj: o.obj, rig, tier: 1 });
    crew.push(o); return o;
  };
  // a spot near (x, z) that is off every carriageway and free to stand on
  // (never on the motor park's access road: that is for the minibuses)
  const onAccess = (px, pz) => (park?.access || []).some((a, i, A) => { const b = A[i + 1]; if (!b) return false; const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / L2)); return Math.hypot(px - a.x - dx * u, pz - a.z - dz * u) < 3.8; });
  const standNear = (x, z, r0 = 2) => {
    for (let r = r0; r < 14; r += 0.7) for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
      if (!world.onCarriageway?.(px, pz, 0.6) && !world.onRail?.(px, pz, 0.5) && !onAccess(px, pz) && !world.inAnyBuilding?.(px, pz, 0.5) && !world.solidAt?.(px, 1, pz) && (world.costAt?.(px, pz) ?? 1) < 5) return { x: px, z: pz };
    }
    return null;
  };
  // the marshal, beside the mouth of the motor park's access road
  let marshal = null;
  if (park?.kerb && park.access?.length > 1) {
    const a = park.access[0], b = park.access[1], L = Math.hypot(b.x - a.x, b.z - a.z) || 1, nx = -(b.z - a.z) / L, nz = (b.x - a.x) / L;
    const s = standNear(a.x + nx * 4.6 + (b.x - a.x) / L * 1.5, a.z + nz * 4.6 + (b.z - a.z) / L * 1.5, 0.5);
    if (s) { marshal = make(0, s.x, s.z, 'marshal'); marshal.obj.rotation.y = Math.atan2(a.x - s.x, a.z - s.z); }
  }
  // patrol officers at the junctions with lights, spread over the district (one near the middle if none)
  // (spread out: each next post is the junction farthest from the posts already taken)
  const R = world.radius, cands = (traffic?.nodes || []).filter((n) => n.out.length >= 3 && Math.hypot(n.x, n.z) < R * 0.95);
  const posts = [];
  let seed = cands.slice().sort((a, b) => Math.hypot(a.x - world.spawn.x, a.z - world.spawn.z) - Math.hypot(b.x - world.spawn.x, b.z - world.spawn.z))[0];
  while (seed && posts.length < 5) {
    const st = standNear(seed.x + 5, seed.z + 5, 3); if (st) posts.push({ ...st, j: seed });
    let far = null, fd = 70; cands.forEach((n) => { const d = Math.min(...posts.map((q) => Math.hypot(q.j.x - n.x, q.j.z - n.z)), posts.length ? Infinity : 0); if (d > fd) { fd = d; far = n; } });
    if (far === seed) break; seed = far;
  }
  if (!posts.length) { const st = standNear(world.spawn.x + 14, world.spawn.z + 6, 3); if (st) posts.push(st); }
  const patrols = posts.map((q, i) => make(i + 1, q.x, q.z, 'patrol'));
  const patrol = patrols[0] || null;
  const say = (o, line) => { chat?.sayFrom?.(o.obj, line, o.name); };
  const near = (o, max = 40) => { const p = getPlayer?.(); return p && Math.hypot(p.x - o.obj.position.x, p.z - o.obj.position.z) < max; };
  // a jam: the patrol goes to it
  addEventListener('bw:obstruction', (e) => {
    const d = e.detail; if (!d) return;
    // the nearest free officer within reach takes it; the stuck car waits for the wave
    const free = patrols.filter((o) => !o.goal && Math.hypot(o.post.x - d.x, o.post.z - d.z) < 220).sort((a, b) => Math.hypot(a.post.x - d.x, a.post.z - d.z) - Math.hypot(b.post.x - d.x, b.post.z - d.z))[0];
    if (!free) return; const s = standNear(d.x, d.z, 2.5); if (!s) return;
    free.goal = s; free.jam = d; free.done = false; if (d.car) d.car.helped = true;
  });
  let playerWarned = -99, t = 0;
  function update(dt) {
    t += dt;
    crew.forEach((o) => o.rig?.update(dt, { speed: o.moving ? 1.6 : 0, t }));
    // the marshal waves while a minibus is on the access road
    if (marshal) { marshal.next -= dt; if (park.moving?.length && marshal.next <= 0) { marshal.rig?.wave?.(); marshal.next = 1.8; } }
    patrols.forEach((o) => {
      const g = o.goal || o.post, p = o.obj.position, dx = g.x - p.x, dz = g.z - p.z, d = Math.hypot(dx, dz);
      o.moving = d > 0.5;
      if (o.moving) { const v = o.goal ? 3.4 : 1.4; p.x += (dx / d) * Math.min(v * dt, d); p.z += (dz / d) * Math.min(v * dt, d); o.obj.rotation.y = Math.atan2(dx, dz); }
      else if (o.goal && !o.done) {
        // there: face the jam, whistle, wave the cars round (traffic.js turns them back the way they came)
        o.done = true; o.wait = 7; o.obj.rotation.y = Math.atan2(o.jam.x - p.x, o.jam.z - p.z);
        if (near(o, 45)) sfx('whistle');
        say(o, (O.lines || ['Keep moving!'])[Math.floor(Math.random() * (O.lines || [1]).length)]); o.rig?.wave?.();
        traffic?.cars.forEach((c) => { if ((c.stuck || 0) > 3 && Math.hypot(c.mesh.position.x - o.jam.x, c.mesh.position.z - o.jam.z) < 30) c.waved = true; });
      } else if (o.goal) { o.wait -= dt; if (o.wait <= 0) o.goal = null; }
    });
    // you, standing in the road and holding up the cars
    if ((traffic?.playerHold || 0) > 2.5 && t - playerWarned > 20) {
      playerWarned = t;
      const p = getPlayer?.(), who = crew.slice().sort((a, b) => Math.hypot(a.obj.position.x - p.x, a.obj.position.z - p.z) - Math.hypot(b.obj.position.x - p.x, b.obj.position.z - p.z))[0];
      sfx('whistle');
      const title = O.title || 'traffic officer';
      toast?.(`${title[0].toUpperCase()}${title.slice(1)}: ${O.player || 'Clear the road!'}`, 3200);
      if (who) { who.obj.rotation.y = Math.atan2(p.x - who.obj.position.x, p.z - who.obj.position.z); who.rig?.wave?.(); }
    }
  }
  function dispose() { group.removeFromParent(); }
  return { update, crew, marshal, patrol, patrols, dispose, bodies: () => crew.map((o) => ({ cx: o.obj.position.x, cz: o.obj.position.z, hx: 0.3, hz: 0.3, ry: 0 })) };
}
