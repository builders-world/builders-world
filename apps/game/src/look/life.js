import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../mesh.js';

// Ambient life (world bible 6.7): birds, cats and planes. None of it has a name tag,
// a presence dot, or can be messaged, so nobody mistakes it for a builder.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

// ---------- birds: small flocks that circle, perch on roofs and wires, scatter, roost at dusk ----------
function birdGeometry() {
  // a body and two wings; the wings flap in the vertex shader by their x distance from the body
  const body = box(0.09, 0.07, 0.24);
  const wingL = new THREE.PlaneGeometry(0.26, 0.11).rotateX(-Math.PI / 2).translate(-0.17, 0.02, 0);
  const wingR = new THREE.PlaneGeometry(0.26, 0.11).rotateX(-Math.PI / 2).translate(0.17, 0.02, 0);
  return mergeGeometries([body.toNonIndexed(), wingL.toNonIndexed(), wingR.toNonIndexed()]);
}

function birdMaterial(uTime, uFlap) {
  const m = new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.9, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = uTime;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aFlap;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
        float w = abs(position.x) > 0.06 ? 1.0 : 0.0;
        transformed.y += w * sin(uTime * 18.0 + ph) * abs(position.x) * 0.9 * aFlap;`);
  };
  m.customProgramCacheKey = () => 'bw-bird';
  return m;
}

export function createLife({ world, scene, camera, getEnv, reduced, lowQuality, uTime }) {
  const rng = mulberry32(77);
  const group = new THREE.Group();
  group.name = 'ambient-life';
  scene.add(group);
  const R = world.radius;

  // perches: rooftops near the centre, and points along lamp arms
  const perches = [];
  (world.footprints || []).forEach((pts) => {
    if (perches.length > 60 || rng() > 0.25) return;
    const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
    if (Math.hypot(c[0], c[1]) < R * 0.9) perches.push({ x: c[0], y: 7 + rng() * 5, z: c[1] });
  });
  world.lamps.filter((l) => l.kind === 'street').forEach((l, i) => { if (i % 3 === 0) perches.push({ x: l.x, y: l.y + 0.35, z: l.z }); });

  const FLOCKS = lowQuality ? 2 : 4, PER = lowQuality ? 8 : 14;
  const birdGeo = birdGeometry();
  const flap = new Float32Array(FLOCKS * PER).fill(1);
  birdGeo.setAttribute('aFlap', new THREE.InstancedBufferAttribute(flap, 1));
  const birds = new THREE.InstancedMesh(birdGeo, birdMaterial(uTime), FLOCKS * PER);
  birds.frustumCulled = false;
  group.add(birds);
  const flocks = [];
  for (let f = 0; f < FLOCKS; f++) {
    const home = perches[Math.floor(rng() * perches.length)] || { x: 0, y: 10, z: 0 };
    flocks.push({
      mode: 'fly', t: rng() * 100, home, perch: null, timer: 10 + rng() * 20,
      cx: home.x, cz: home.z, radius: 18 + rng() * 22, height: 16 + rng() * 14, dir: rng() < 0.5 ? 1 : -1,
      members: Array.from({ length: PER }, () => ({ ox: (rng() - 0.5) * 6, oy: (rng() - 0.5) * 2.5, oz: (rng() - 0.5) * 6, ph: rng() * 6, p: new THREE.Vector3(home.x, 20, home.z) })),
    });
  }

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
    let k = 0;
    flocks.forEach((f) => {
      f.timer -= dt;
      const near = f.perch && Math.hypot(player.x - f.perch.x, player.z - f.perch.z) < 6;
      if (f.mode === 'perch' && (near || (f.timer <= 0 && !dusk && !wet)) && !reduced) {
        f.mode = 'fly'; f.timer = 15 + rng() * 25; f.cx = f.perch.x; f.cz = f.perch.z; f.perch = null;
      } else if (f.mode === 'fly' && (f.timer <= 0 || dusk || wet || reduced)) {
        f.mode = 'perch'; f.perch = perches[Math.floor(rng() * perches.length)] || f.home; f.timer = 12 + rng() * 30;
      }
      if (f.mode === 'fly') {
        f.t += dt * 0.35 * f.dir;
        // the circle centre wanders slowly so flocks drift over the district
        f.cx += Math.sin(t * 0.05 + f.radius) * dt * 1.5; f.cz += Math.cos(t * 0.04 + f.height) * dt * 1.5;
        if (Math.hypot(f.cx, f.cz) > R * 0.8) { f.cx *= 0.99; f.cz *= 0.99; }
      }
      f.members.forEach((b, i) => {
        let tx, ty, tz;
        if (f.mode === 'fly') {
          const a = f.t + i * 0.12;
          tx = f.cx + Math.cos(a) * f.radius + b.ox; tz = f.cz + Math.sin(a) * f.radius + b.oz; ty = f.height + b.oy + Math.sin(t + b.ph) * 0.8;
        } else {
          tx = f.perch.x + (i - PER / 2) * 0.35; ty = f.perch.y; tz = f.perch.z + Math.sin(i) * 0.2;
        }
        const prev = v.copy(b.p);
        b.p.lerp(new THREE.Vector3(tx, ty, tz), 1 - Math.exp(-dt * (f.mode === 'fly' ? 2.2 : 1.4)));
        const vx = b.p.x - prev.x, vz = b.p.z - prev.z;
        const moving = Math.hypot(vx, vz) / Math.max(dt, 1e-3) > 0.6;
        flap[k] = moving ? 1 : 0;
        e.set(0, Math.atan2(vx, vz) || 0, 0);
        m.compose(b.p, q.setFromEuler(e), one);
        birds.setMatrixAt(k++, m);
      });
    });
    birds.instanceMatrix.needsUpdate = true;
    birdGeo.attributes.aFlap.needsUpdate = true;

    // cats
    const hour = env.hour ?? 12;
    cats.forEach((c) => {
      c.timer -= dt;
      const d = Math.hypot(player.x - c.obj.position.x, player.z - c.obj.position.z);
      const nap = (hour > 11 && hour < 15) || wet;
      if (d < 3 && !reduced) { // keep their distance
        const away = freeNear(c.obj.position.x + (c.obj.position.x - player.x), c.obj.position.z + (c.obj.position.z - player.z), 4);
        if (away) { c.goal = away; c.mode = 'walk'; c.speed = 2.2; }
      } else if (c.mode !== 'walk' && c.timer <= 0 && !reduced) {
        if (nap) { c.mode = 'sleep'; c.timer = 20 + rng() * 40; } else {
          c.goal = freeNear(c.obj.position.x, c.obj.position.z, 10); c.mode = c.goal ? 'walk' : 'sit'; c.speed = 0.9 + rng() * 0.4; c.timer = 4 + rng() * 8;
        }
      }
      if (c.mode === 'walk' && c.goal) {
        const dx = c.goal.x - c.obj.position.x, dz = c.goal.z - c.obj.position.z, L = Math.hypot(dx, dz);
        if (L < 0.2) { c.mode = 'sit'; c.timer = 3 + rng() * 6; } else {
          c.obj.position.x += (dx / L) * c.speed * dt; c.obj.position.z += (dz / L) * c.speed * dt;
          c.obj.rotation.y = Math.atan2(dx, dz);
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
  return { update, dispose, counts: () => ({ birds: FLOCKS * PER, cats: cats.length }) };
}
