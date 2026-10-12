import * as THREE from 'three';
import { createAvatarModel } from '../onboarding/avatar.js';
import { rigAvatar } from './anim.js';
import { sfx } from './audio.js';

// Building a bench, as a short time-lapse (world bible 6.4): two builders in hard hats walk in with
// their tools, the legs go in, then the seat slats one by one, then the backrest, each knocked home
// with a hammer and a puff of sawdust. You wear a hard hat too while it goes up.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const PARTS = [ // [geometry, when (s)]
  [box(0.08, 0.48, 0.4, -0.8, 0.24, 0), 1.6], [box(0.08, 0.48, 0.4, 0.8, 0.24, 0), 2.1],
  [box(1.8, 0.08, 0.15, 0, 0.48, 0.15), 2.8], [box(1.8, 0.08, 0.15, 0, 0.48, 0), 3.4], [box(1.8, 0.08, 0.15, 0, 0.48, -0.15), 4.0],
  [box(1.8, 0.18, 0.06, 0, 0.72, -0.2), 4.8], [box(1.8, 0.18, 0.06, 0, 0.93, -0.2), 5.5],
];
const DONE = 7.6;

function hardHat() {
  const g = new THREE.Group(), y = new THREE.MeshStandardMaterial({ color: 0xf2c418, roughness: 0.45 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), y); dome.position.y = 1.74;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.025, 20), y); brim.position.set(0, 1.74, 0.03);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.36), y); ridge.position.set(0, 1.93, 0);
  g.add(dome, brim, ridge); return g;
}
function hammer() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.04).translate(0, 0.17, 0), new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.7 })));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.06).translate(0, 0.34, 0), new THREE.MeshStandardMaterial({ color: 0x4a4f57, roughness: 0.4, metalness: 0.6 })));
  return g;
}
function saw() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.45).translate(0, 0, 0.2), new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.3, metalness: 0.7 })));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: 0xe46f4f, roughness: 0.6 })));
  return g;
}

export function buildBench({ scene, at, quat, player, reduced, onDone }) {
  const site = new THREE.Group(); site.position.copy(at); site.quaternion.copy(quat); scene.add(site);
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.7 });
  const parts = PARTS.map(([geo, t]) => { const m = new THREE.Mesh(geo, wood); m.scale.setScalar(0.001); site.add(m); return { m, t, done: false }; });
  // the builders: one each side, walking in from behind the bench
  const crew = [['#f28c28', 'jacket', -1.35, hammer], ['#2d6aa0', 'hoodie', 1.35, saw]].map(([color, style, x, tool]) => {
    const av = createAvatarModel({ color, style }), rig = rigAvatar(av.root);
    rig.attach(hardHat(), 'head');
    const t = tool(); t.position.set(0.32, 0.95, 0.22); const held = rig.attach(t, 'chest');
    av.root.position.set(x * 1.8, 0, -2.6); site.add(av.root);
    return { av, rig, tool: t, held, home: new THREE.Vector3(x, 0, 0.55), x };
  });
  // dust: a few puffs that grow and fade
  const dustMat = new THREE.MeshBasicMaterial({ color: 0xe6d6b8, transparent: true, opacity: 0.7, depthWrite: false });
  const puffs = [];
  const puff = (p) => { for (let k = 0; k < 4; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), dustMat.clone()); d.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.1, (Math.random() - 0.5) * 0.4)); site.add(d); puffs.push({ d, t: 0 }); } };
  // your own hard hat while it is going up
  const myHat = hardHat(); player?.add(myHat);

  let t = 0, finished = false;
  function update(dt) {
    if (finished) return true;
    t += reduced ? dt * 4 : dt;
    // walk in, work, step back, walk off
    crew.forEach((c, i) => {
      const leaving = t > DONE - 0.6, target = leaving ? new THREE.Vector3(c.x * 2.2, 0, -3) : c.home;
      const p = c.av.root.position, dx = target.x - p.x, dz = target.z - p.z, d = Math.hypot(dx, dz);
      const speed = d > 0.08 ? 1.6 : 0;
      if (speed) { p.x += (dx / d) * Math.min(d, speed * dt); p.z += (dz / d) * Math.min(d, speed * dt); c.av.root.rotation.y = Math.atan2(dx, dz); }
      else c.av.root.rotation.y = Math.atan2(-c.x, -0.55) ; // face the bench
      c.rig.update(dt, { speed, t, running: false });
      // the hammer swings, the saw saws, while the bench goes up
      const working = t > 1.2 && t < DONE - 0.8;
      c.tool.rotation.x = working ? (i === 0 ? -Math.abs(Math.sin(t * 9)) * 1.2 : 0) : 0;
      c.tool.position.z = working && i === 1 ? 0.22 + Math.sin(t * 12) * 0.1 : 0.22;
      if (t > 6.2 && t < 6.3 && !c.cheered) { c.cheered = true; c.rig.play?.('cheer'); }
    });
    parts.forEach((pt) => {
      const k = Math.max(0, Math.min(1, (t - pt.t) / 0.35));
      pt.m.scale.setScalar(0.001 + k * 0.999);
      if (k > 0 && !pt.done) { pt.done = true; sfx('knock'); const c = new THREE.Box3().setFromObject(pt.m).getCenter(new THREE.Vector3()); puff(site.worldToLocal(c)); }
    });
    puffs.forEach((q) => { q.t += dt; q.d.scale.setScalar(1 + q.t * 4); q.d.material.opacity = Math.max(0, 0.7 - q.t * 1.2); q.d.position.y += dt * 0.4; });
    for (let i = puffs.length - 1; i >= 0; i--) if (puffs[i].t > 0.7) { puffs[i].d.removeFromParent(); puffs[i].d.material.dispose(); puffs.splice(i, 1); }
    if (t > DONE) {
      finished = true;
      crew.forEach((c) => { c.av.root.removeFromParent(); c.av.dispose?.(); });
      myHat.removeFromParent();
      onDone?.(site);
      return true;
    }
    return false;
  }
  return { update, site };
}
