import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../mesh.js';
import { createBirds } from './birds.js';

// Ambient life (world bible 6.7): birds (birds.js), cats and planes. None of it has a name tag,
// a presence dot, or can be messaged, so nobody mistakes it for a builder.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

export function createLife({ world, scene, camera, getEnv, reduced, lowQuality, uTime }) {
  const rng = mulberry32(77);
  const group = new THREE.Group();
  group.name = 'ambient-life';
  scene.add(group);
  const R = world.radius;

  // birds of several kinds, each its own animal, and the pond the egrets and swans live at (birds.js)
  const birdLife = createBirds({ world, scene: group, uTime, rng, reduced, lowQuality });

  // ---------- cats: wander the gaps, nap at midday, shelter from rain, keep their distance ----------
  function catGeometry(color) {
    const fur = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
    const g = new THREE.Group();
    const body = mergeGeometries([box(0.18, 0.16, 0.42, 0, 0.22, 0), box(0.16, 0.14, 0.15, 0, 0.32, 0.26),
      box(0.04, 0.06, 0.03, -0.05, 0.42, 0.27), box(0.04, 0.06, 0.03, 0.05, 0.42, 0.27),
      box(0.05, 0.16, 0.05, -0.06, 0.08, 0.15), box(0.05, 0.16, 0.05, 0.06, 0.08, 0.15),
      box(0.05, 0.16, 0.05, -0.06, 0.08, -0.15), box(0.05, 0.16, 0.05, 0.06, 0.08, -0.15)]);
    const tail = new THREE.Mesh(box(0.035, 0.035, 0.3, 0, 0, -0.15), fur);
    tail.position.set(0, 0.3, -0.2); tail.rotation.x = 0.7;
    g.add(new THREE.Mesh(body, fur), tail);
    g.userData.tail = tail;
    return g;
  }
  const cats = [];
  const catColors = [0xc98a4b, 0x2b2b2e, 0xd8d2c6, 0x8a6f58, 0x5a5048];
  const freeNear = (x, z, r) => {
    for (let k = 0; k < 20; k++) {
      const a = rng() * Math.PI * 2, d = 3 + rng() * r;
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (world.isFree(px, pz, 0.4)) return { x: px, z: pz };
    }
    return null;
  };
  for (let i = 0; i < (lowQuality ? 2 : 4); i++) {
    const p = freeNear(world.spawn.x, world.spawn.z, 40);
    if (!p) continue;
    const obj = catGeometry(catColors[i % catColors.length]);
    obj.position.set(p.x, 0, p.z);
    group.add(obj);
    cats.push({ obj, goal: null, mode: 'sit', timer: 2 + rng() * 5, speed: 0.9 + rng() * 0.5 });
  }

  // ---------- planes: on the approach toward the airport north of Yaba ----------
  const plane = (() => {
    const g = new THREE.Group();
    const skin = new THREE.MeshBasicMaterial({ color: 0x2a3140, fog: false });
    g.add(new THREE.Mesh(mergeGeometries([
      new THREE.CylinderGeometry(1.9, 1.9, 36, 10).rotateX(Math.PI / 2),
      box(34, 0.5, 5, 0, -0.3, 1), box(12, 0.4, 3, 0, 0.5, -15.5), box(0.4, 6, 4, 0, 3.2, -15.5),
    ]), skin));
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.2, 0.15), fog: false }));
    const green = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 3, 0.4), fog: false }));
    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 6), fog: false }));
    red.position.set(-17, -0.3, 1); green.position.set(17, -0.3, 1); strobe.position.set(0, 2.2, -2);
    g.add(red, green, strobe);
    g.userData = { red, green, strobe };
    g.visible = false;
    return g;
  })();
  group.add(plane);
  // the airport sits roughly north-north-west of Yaba; planes cross on that line
  const toAirport = new THREE.Vector3(-0.5, 0, -1).normalize();
  let planeT = -1, nextPlane = 8 + rng() * 20;

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);

  function update(dt, t, player) {
    const env = getEnv() || { day: 1, lamps: 0, rain: 0 };
    const dusk = env.lamps > 0.6; // birds roost once the lamps are on
    const wet = env.rain > 0.5;
    birdLife.update(dt, t, player, env);
    void dusk; void wet;

    // cats
    const hour = env.hour ?? 12;
    cats.forEach((c) => {
      c.timer -= dt;
      const d = Math.hypot(player.x - c.obj.position.x, player.z - c.obj.position.z);
      const nap = (hour > 11 && hour < 15) || wet;
      if (d < 3 && !reduced && !c.fleeing) { // keep their distance: pick one spot away from you and go
        const ax = c.obj.position.x - player.x, az = c.obj.position.z - player.z, al = Math.hypot(ax, az) || 1;
        let away = null;
        for (let k2 = 0; k2 < 12 && !away; k2++) { const a = Math.atan2(ax, az) + (rng() - 0.5) * 1.6, r = 4 + rng() * 3, x = c.obj.position.x + Math.sin(a) * r, z = c.obj.position.z + Math.cos(a) * r; if (world.isFree(x, z, 0.4)) away = { x, z }; }
        void al;
        if (away) { c.goal = away; c.mode = 'walk'; c.speed = 2.2; c.fleeing = true; }
      } else if (c.mode !== 'walk' && c.timer <= 0 && !reduced) {
        if (nap) { c.mode = 'sleep'; c.timer = 20 + rng() * 40; } else {
          c.goal = freeNear(c.obj.position.x, c.obj.position.z, 10); c.mode = c.goal ? 'walk' : 'sit'; c.speed = 0.9 + rng() * 0.4; c.timer = 4 + rng() * 8;
        }
      }
      if (c.mode === 'walk' && c.goal) {
        const dx = c.goal.x - c.obj.position.x, dz = c.goal.z - c.obj.position.z, L = Math.hypot(dx, dz);
        if (L < 0.2) { c.mode = 'sit'; c.timer = 3 + rng() * 6; c.fleeing = false; } else {
          c.obj.position.x += (dx / L) * c.speed * dt; c.obj.position.z += (dz / L) * c.speed * dt;
          // turn smoothly toward where it is going, never snapping
          const want = Math.atan2(dx, dz), dh = Math.atan2(Math.sin(want - c.obj.rotation.y), Math.cos(want - c.obj.rotation.y));
          c.obj.rotation.y += dh * (1 - Math.exp(-dt * 8));
          c.obj.position.y = Math.abs(Math.sin(t * 9)) * 0.02;
        }
      }
      c.obj.scale.y = c.mode === 'sleep' ? 0.55 : 1;
      c.obj.userData.tail.rotation.y = reduced ? 0 : Math.sin(t * (c.mode === 'walk' ? 6 : 1.5)) * 0.4;
    });

    // planes
    nextPlane -= dt;
    if (planeT < 0 && nextPlane <= 0 && !reduced) { planeT = 0; plane.visible = true; plane.userData.side = (rng() - 0.5) * 900; }
    if (planeT >= 0) {
      planeT += dt;
      const s = -1800 + planeT * 75; // about 270 km/h on approach
      const side = new THREE.Vector3(-toAirport.z, 0, toAirport.x).multiplyScalar(plane.userData.side);
      plane.position.copy(toAirport).multiplyScalar(s).add(side);
      plane.position.y = 520 - planeT * 1.2;
      plane.rotation.y = Math.atan2(toAirport.x, toAirport.z);
      const night = 1 - (env.day ?? 1);
      plane.userData.red.visible = plane.userData.green.visible = night > 0.3;
      plane.userData.strobe.visible = night > 0.3 && (t % 1.2) < 0.08; // one short flash a second
      if (s > 1800) { planeT = -1; plane.visible = false; nextPlane = 60 + rng() * 120; }
    }
  }

  function dispose() {
    group.traverse((o) => { o.geometry?.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((x) => x.dispose()); });
    group.removeFromParent();
  }
  return { update, dispose, counts: () => ({ birds: birdLife.count(), cats: cats.length }), birds: birdLife };
}
