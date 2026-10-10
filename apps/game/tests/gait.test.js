// The walk (world bible 7.4): planted feet stay planted, the hips bob a few centimetres and do not
// rock side to side, and the knees bend through the swing. Users said people waddled; this keeps it fixed.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createAvatarModel } from '../src/onboarding/avatar.js';
import { rigAvatar } from '../src/look/anim.js';

function walk(speed, running = false) {
  const m = createAvatarModel({ color: '#888', style: 'tee' }), rig = rigAvatar(m.root), root = m.root, shoe = rig.L.ankle.children[0];
  const dt = 1 / 120, v = new THREE.Vector3(), feet = [], hips = [], knees = [], chest = [];
  let z = 0;
  for (let i = 0; i < 1100; i++) {
    z += speed * dt; root.position.set(0, 0, z); rig.update(dt, { speed, running, t: i * dt }); root.updateMatrixWorld(true);
    if (i < 700) continue;
    shoe.getWorldPosition(v); feet.push([new THREE.Box3().setFromObject(shoe).min.y, v.z]);
    hips.push(rig.pelvis.position.y); knees.push(rig.L.knee.rotation.x); rig.chest.getWorldPosition(v); chest.push(v.x);
  }
  const low = Math.min(...feet.map((f) => f[0]));
  let slip = 0, n = 0; for (let i = 1; i < feet.length; i++) if (feet[i][0] < low + 0.003) { slip += Math.abs(feet[i][1] - feet[i - 1][1]) / dt; n++; }
  const range = (a) => Math.max(...a) - Math.min(...a);
  return { slip: slip / n / speed, bob: range(hips), knee: range(knees), sway: range(chest), lift: Math.max(...feet.map((f) => f[0])) - low };
}

test('a walking foot stays planted while the body passes over it', () => {
  for (const sp of [1.2, 1.8]) { const r = walk(sp); assert.ok(r.slip < 0.15, `at ${sp} m/s the planted foot slides at ${(r.slip * 100).toFixed(0)}% of walking speed`); }
});

test('the walk bobs a few centimetres, lifts the feet and bends the knees, without rocking', () => {
  const r = walk(1.3);
  assert.ok(r.bob > 0.02 && r.bob < 0.07, `hips bob ${(r.bob * 100).toFixed(1)} cm`);
  assert.ok(r.lift > 0.04, `the swinging foot lifts only ${(r.lift * 100).toFixed(1)} cm`);
  assert.ok(r.knee > 0.5, `the knee only moves ${r.knee.toFixed(2)} rad`);
  assert.ok(r.sway < 0.01, `the chest rocks ${(r.sway * 100).toFixed(1)} cm side to side`);
});

test('a run keeps its feet planted too', () => {
  const r = walk(5.5, true);
  assert.ok(r.slip < 0.25, `running, the planted foot slides at ${(r.slip * 100).toFixed(0)}%`);
});
