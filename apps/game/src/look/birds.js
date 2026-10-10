import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Birds of Lagos, each one its own animal (world bible 6.7): pigeons on the pavements, white cattle
// egrets at the pond, black kites soaring alone, swans gliding on the water. Flying birds steer like
// boids (keep apart, match neighbours, stay loosely together, head for a goal); every bird lands on a
// spot of its own, so they never stack, never stream in a chain, never sit inside one another.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z).toNonIndexed();

function flyerGeometry() {
  const body = box(0.09, 0.07, 0.24), head = box(0.06, 0.06, 0.07, 0, 0.04, 0.14);
  const wingL = new THREE.PlaneGeometry(0.26, 0.11).rotateX(-Math.PI / 2).translate(-0.17, 0.02, 0).toNonIndexed();
  const wingR = new THREE.PlaneGeometry(0.26, 0.11).rotateX(-Math.PI / 2).translate(0.17, 0.02, 0).toNonIndexed();
  return mergeGeometries([body, head, wingL, wingR]);
}
function swanGeometry() {
  return mergeGeometries([box(0.34, 0.2, 0.6, 0, 0.1, 0), box(0.07, 0.42, 0.07, 0, 0.36, 0.22), box(0.08, 0.07, 0.16, 0, 0.56, 0.28), box(0.03, 0.03, 0.06, 0, 0.55, 0.38)]);
}
function flapMaterial(uTime) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = uTime;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aFlap;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
        float w = abs(position.x) > 0.06 ? 1.0 : 0.0;
        transformed.y += w * sin(uTime * 16.0 + ph) * abs(position.x) * 0.9 * aFlap;
        // on the ground (not flapping) the wings fold along the body instead of lying spread like a cross
        float fold = 1.0 - clamp(aFlap * 4.0, 0.0, 1.0);
        transformed.x = mix(transformed.x, sign(position.x) * 0.05, w * fold);
        transformed.y += w * fold * 0.025;
        transformed.z = mix(transformed.z, transformed.z * 0.8 - 0.03, w * fold);`);
  };
  m.customProgramCacheKey = () => 'bw-bird3';
  return m;
}

const SPECIES = {
  pigeon: { color: 0x8a93a3, scale: 1.1, speed: 6, cruise: 7 },
  egret: { color: 0xf4f3ec, scale: 1.9, speed: 7, cruise: 18 },
  kite: { color: 0x4a3a2c, scale: 3.2, speed: 6, cruise: 48 },
};

export function createBirds({ world, scene, uTime, rng, reduced, lowQuality }) {
  const group = new THREE.Group(); group.name = 'birds'; scene.add(group);
  const R = world.radius, spawn = world.spawn;
  const isFree = (x, z) => world.isFree(x, z, 0.3, { lots: true });

  // ---------- a pond on open public ground near the start: water, a stone rim, reeds, lily pads ----------
  // room for the water and a paved loop round it (parks.js): 22 m by 17 m of open public ground
  let pond = null;
  for (const [U, V] of [[11, 8.5], [7.5, 5]]) for (let r = 12; r < 200 && !pond; r += 6) for (let k = 0; k < 16 && !pond; k++) {
    const a = (k / 16) * Math.PI * 2 + r, x = spawn.x + Math.cos(a) * r, z = spawn.z + Math.sin(a) * r;
    if (Math.hypot(x, z) > R * 0.85) continue;
    let ok = true;
    // open public ground in the walkable map: not a building, a garden, a road or a prop (one lookup each)
    for (let u = -U; u <= U && ok; u += 1.5) for (let v = -V; v <= V && ok; v += 1.25) if (!(world.costAt ? world.costAt(x + u, z + v) < 2.6 : world.isFree(x + u, z + v, 0.6))) ok = false;
    if (ok) pond = { x, z, rx: 6, rz: 3.8 };
  }
  if (pond) {
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5fa8a8, roughness: 0.15, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 }));
    water.scale.set(pond.rx, 1, pond.rz); water.position.set(pond.x, 0.2, pond.z);
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.94, 1.12, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc3bdae, roughness: 0.9 }));
    rim.scale.set(pond.rx, 1, pond.rz); rim.position.set(pond.x, 0.24, pond.z);
    group.add(water, rim);
    const reed = new THREE.MeshStandardMaterial({ color: 0x5b7d55, roughness: 0.9 }), pad = new THREE.MeshStandardMaterial({ color: 0x45694c, roughness: 0.8, side: THREE.DoubleSide });
    const reeds = [], pads = [];
    for (let i = 0; i < 26; i++) { const a = rng() * Math.PI * 2, f = 0.85 + rng() * 0.1; reeds.push(box(0.04, 0.6 + rng() * 0.5, 0.04, pond.x + Math.cos(a) * pond.rx * f, 0.5, pond.z + Math.sin(a) * pond.rz * f)); }
    for (let i = 0; i < 9; i++) { const a = rng() * Math.PI * 2, f = rng() * 0.7; pads.push(new THREE.CircleGeometry(0.22, 10).rotateX(-Math.PI / 2).translate(pond.x + Math.cos(a) * pond.rx * f, 0.215, pond.z + Math.sin(a) * pond.rz * f)); }
    group.add(new THREE.Mesh(mergeGeometries(reeds), reed), new THREE.Mesh(mergeGeometries(pads), pad));
    // you walk round a pond, not across it
    world.addColliders([{ name: 'pond', cx: pond.x, cz: pond.z, hx: pond.rx * 0.88, hz: pond.rz * 0.88, ry: 0, h: 0.3 }]);
    world.claim?.({ kind: 'pond', cx: pond.x, cz: pond.z, hx: pond.rx + 0.3, hz: pond.rz + 0.3, ry: 0 });
  }

  // ---------- the birds ----------
  const birds = [];
  const add = (species, x, y, z, extra = {}) => birds.push({ species, p: new THREE.Vector3(x, y, z), v: new THREE.Vector3(), state: 'ground', yaw: rng() * 6.28, t: rng() * 10, ...extra });
  // pigeons: a few groups on pavements near the start, each with its own patch
  const anchors = [];
  for (let k = 0; k < 400 && anchors.length < (lowQuality ? 2 : 4); k++) {
    const a = rng() * Math.PI * 2, d = 8 + rng() * 70, x = spawn.x + Math.cos(a) * d, z = spawn.z + Math.sin(a) * d;
    if (isFree(x, z) && !world.onCarriageway?.(x, z, 0.5) && !world.inPlot?.(x, z) && anchors.every((q) => Math.hypot(q.x - x, q.z - z) > 18)) anchors.push({ x, z });
  }
  anchors.forEach((an, gi) => { for (let i = 0; i < 5 + (gi % 3); i++) add('pigeon', an.x + (rng() - 0.5) * 3, 0, an.z + (rng() - 0.5) * 3, { group: gi, anchor: an }); });
  // egrets at the pond edge; kites in the sky
  if (pond) for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; add('egret', pond.x + Math.cos(a) * (pond.rx + 0.7), 0, pond.z + Math.sin(a) * (pond.rz + 0.7), { group: 'egret', home: pond }); }
  for (let i = 0; i < 2; i++) add('kite', spawn.x, 45 + i * 8, spawn.z, { state: 'soar', ang: rng() * 6.28, rad: 40 + rng() * 40, cx: spawn.x + (rng() - 0.5) * 80, cz: spawn.z + (rng() - 0.5) * 80 });

  const fly = birds.filter((b) => b.species !== 'swan');
  const geo = flyerGeometry();
  const flap = new Float32Array(fly.length).fill(0);
  geo.setAttribute('aFlap', new THREE.InstancedBufferAttribute(flap, 1));
  const mesh = new THREE.InstancedMesh(geo, flapMaterial(uTime), Math.max(1, fly.length));
  mesh.frustumCulled = false;
  fly.forEach((b, i) => mesh.setColorAt(i, new THREE.Color(SPECIES[b.species].color)));
  group.add(mesh);

  // swans: two on the pond, each on its own slow loop
  const swans = [];
  if (pond) {
    const sm = new THREE.InstancedMesh(swanGeometry(), new THREE.MeshStandardMaterial({ color: 0xf7f5ee, roughness: 0.7 }), 2);
    sm.frustumCulled = false; group.add(sm);
    for (let i = 0; i < 2; i++) swans.push({ ang: i * Math.PI, sp: 0.06 + i * 0.02, f: 0.45 + i * 0.2 });
    swans.mesh = sm;
  }

  // a spot of its own to land on: near the goal, at least 0.6 m from every other grounded bird
  function landingSpot(b, gx, gz, spread) {
    for (let k = 0; k < 20; k++) {
      const x = gx + (rng() - 0.5) * spread, z = gz + (rng() - 0.5) * spread;
      if (!isFree(x, z) || world.onCarriageway?.(x, z, 0.3)) continue;
      if (birds.some((o) => o !== b && (o.state === 'ground' || o.land) && Math.hypot((o.land?.x ?? o.p.x) - x, (o.land?.z ?? o.p.z) - z) < 0.6)) continue;
      return { x, z };
    }
    return { x: gx, z: gz };
  }
  function takeOff(b, from) {
    b.state = 'fly'; b.land = null; b.air = 6 + rng() * 6;
    const dx = b.p.x - from.x, dz = b.p.z - from.z, l = Math.hypot(dx, dz) || 1;
    b.v.set((dx / l) * 4 + (rng() - 0.5) * 3, 3 + rng() * 2, (dz / l) * 4 + (rng() - 0.5) * 3);
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), steer = new THREE.Vector3(), tmp = new THREE.Vector3();
  function update(dt, t, player, env) {
    const dusk = (env.day ?? 1) < 0.2;
    fly.forEach((b) => {
      const S = SPECIES[b.species];
      b.t += dt;
      if (b.species === 'kite') {
        // a lone soaring circle, very slowly drifting, hardly a wingbeat
        b.ang += dt * 0.12; b.cx += Math.sin(t * 0.02 + b.rad) * dt; b.cz += Math.cos(t * 0.017) * dt;
        tmp.set(b.cx + Math.cos(b.ang) * b.rad, b.p.y, b.cz + Math.sin(b.ang) * b.rad);
        b.v.subVectors(tmp, b.p).divideScalar(Math.max(dt, 1e-3)).clampLength(0, 8);
        b.p.copy(tmp); b.flap = (b.t % 9) < 0.8 ? 0.6 : 0.05;
        return;
      }
      const near = Math.hypot(player.x - b.p.x, player.z - b.p.z);
      if (b.state === 'ground') {
        b.flap = 0;
        // peck about, a step at a time; scatter when someone comes close
        if (!reduced && near < (b.species === 'egret' ? 5 : 3.2)) { birds.filter((o) => o.group === b.group && o.state === 'ground').forEach((o) => takeOff(o, player)); return; }
        b.walk = (b.walk ?? 0) - dt;
        if (b.walk <= 0) { b.walk = 1 + rng() * 3; const a = rng() * Math.PI * 2; b.step = { x: b.p.x + Math.cos(a) * 0.5, z: b.p.z + Math.sin(a) * 0.5 }; if (!isFree(b.step.x, b.step.z) || birds.some((o) => o !== b && o.state === 'ground' && Math.hypot(o.p.x - b.step.x, o.p.z - b.step.z) < 0.45)) b.step = null; }
        if (b.step) { const dx = b.step.x - b.p.x, dz = b.step.z - b.p.z, l = Math.hypot(dx, dz); if (l < 0.05) b.step = null; else { const s = Math.min(l, dt * 0.6); b.p.x += (dx / l) * s; b.p.z += (dz / l) * s; b.yaw = Math.atan2(dx, dz); } }
        b.p.y = 0.25; b.peck = Math.max(0, Math.sin(b.t * 5 + b.p.x)) * 0.25;
        return;
      }
      // flying: boids, then a goal, then land on a spot of its own
      b.air -= dt;
      steer.set(0, 0, 0);
      let n = 0; const ali = new THREE.Vector3(), coh = new THREE.Vector3();
      fly.forEach((o) => {
        if (o === b || o.state !== 'fly') return;
        const d = o.p.distanceTo(b.p);
        if (d < 1.4 && d > 0) steer.add(tmp.subVectors(b.p, o.p).multiplyScalar((1.4 - d) * 6 / d)); // keep apart
        if (d < 6 && o.group === b.group) { ali.add(o.v); coh.add(o.p); n++; }
      });
      if (n) { steer.add(ali.divideScalar(n).sub(b.v).multiplyScalar(0.6)); steer.add(coh.divideScalar(n).sub(b.p).multiplyScalar(0.15)); }
      const home = b.anchor || b.home;
      if (b.air > 0 && !dusk) {
        // circle loosely over home at cruise height
        tmp.set(home.x + Math.cos(b.t * 0.4) * 10 - b.p.x, S.cruise + Math.sin(b.t) - b.p.y, home.z + Math.sin(b.t * 0.4) * 10 - b.p.z);
        steer.add(tmp.multiplyScalar(0.35));
      } else {
        // come down: each to its own spot near home (pigeons pick a fresh patch nearby)
        if (!b.land) {
          if (b.species === 'pigeon' && rng() < 0.5) { b.anchor = { x: home.x + (rng() - 0.5) * 16, z: home.z + (rng() - 0.5) * 16 }; }
          const h2 = b.anchor || b.home;
          b.land = b.species === 'egret' ? (() => { const a = rng() * Math.PI * 2; return { x: h2.x + Math.cos(a) * (h2.rx + 0.8), z: h2.z + Math.sin(a) * (h2.rz + 0.8) }; })() : landingSpot(b, h2.x, h2.z, 4);
        }
        tmp.set(b.land.x - b.p.x, 0.25 - b.p.y, b.land.z - b.p.z);
        const d = tmp.length();
        steer.add(tmp.multiplyScalar(d < 6 ? 1.2 : 0.5));
        if (d < 0.25) { b.state = 'ground'; b.p.set(b.land.x, 0.25, b.land.z); b.v.set(0, 0, 0); b.land = null; return; }
      }
      b.v.addScaledVector(steer, dt).clampLength(0.5, S.speed);
      b.p.addScaledVector(b.v, dt);
      if (b.p.y < 0.25) { b.p.y = 0.25; b.v.y = Math.abs(b.v.y); }
      b.yaw = Math.atan2(b.v.x, b.v.z); b.flap = 1; b.peck = 0;
    });
    fly.forEach((b, i) => {
      const s = SPECIES[b.species].scale;
      e.set(b.state === 'ground' ? (b.peck || 0) : -b.v.y * 0.05, b.yaw, 0);
      m4.compose(b.p, q.setFromEuler(e), sc.set(b.state === 'ground' ? s * 0.38 : s, s, s)); // wings folded on the ground
      mesh.setMatrixAt(i, m4);
      flap[i] = b.flap ?? 0;
    });
    mesh.instanceMatrix.needsUpdate = true; geo.attributes.aFlap.needsUpdate = true;
    if (swans.mesh) swans.forEach((s, i) => {
      s.ang += dt * s.sp;
      const x = pond.x + Math.cos(s.ang) * pond.rx * s.f, z = pond.z + Math.sin(s.ang) * pond.rz * s.f;
      e.set(0, Math.atan2(-Math.sin(s.ang) * pond.rx, Math.cos(s.ang) * pond.rz), 0);
      m4.compose(tmp.set(x, 0.2 + Math.sin(t * 1.3 + i) * 0.01, z), q.setFromEuler(e), sc.set(1, 1, 1));
      swans.mesh.setMatrixAt(i, m4);
    });
    if (swans.mesh) swans.mesh.instanceMatrix.needsUpdate = true;
  }
  return { update, pond, count: () => birds.length + swans.length, birds };
}
