// The emote sheet's rules (world bible 7.4): enough emotes, every face unique, ids that fit presence,
// and a director that never has two people near each other doing the same thing.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { EMOTES, REST, BODIES, BY_ID, REACT, QUICK, createEmotes } from '../src/look/expressions.js';

const key = (f) => [f.eyes, f.brows, f.mouth, f.extra.join(',')].join('|');

test('there are at least 45 emotes, each with a body move and a short id', () => {
  assert.ok(EMOTES.length >= 45, `only ${EMOTES.length}`);
  const ids = new Set();
  for (const e of EMOTES) {
    assert.ok(e.id.length <= 8, `${e.id} is longer than presence carries (8)`);
    assert.ok(!ids.has(e.id), `${e.id} twice`); ids.add(e.id);
    assert.equal(typeof BODIES[e.body], 'function', `${e.id} has no body move ${e.body}`);
  }
});

test('every face is unique: no two emotes, and no emote and a resting face, look the same', () => {
  const seen = new Map(Object.entries(REST).map(([k, f]) => [key(f), `rest ${k}`]));
  for (const e of EMOTES) for (const f of [e.face, e.face2].filter(Boolean)) {
    assert.ok(!seen.has(key(f)), `${e.id} has the same face as ${seen.get(key(f))}`);
    seen.set(key(f), e.id);
  }
});

test('every emote has its own body move', () => {
  const used = new Map();
  for (const e of EMOTES) { assert.ok(!used.has(e.body), `${e.id} and ${used.get(e.body)} share ${e.body}`); used.set(e.body, e.id); }
});

test('reaction pools and quick keys name real emotes', () => {
  for (const [k, pool] of Object.entries(REACT)) for (const id of pool) assert.ok(BY_ID[id], `${k} names ${id}`);
  for (const id of QUICK) assert.ok(BY_ID[id]);
});

// people as the director sees them: a position and a rig that records what it was asked to play
function crowd(n, spacing) {
  const scene = new THREE.Scene(), people = [];
  for (let i = 0; i < n; i++) {
    const root = new THREE.Object3D(); root.position.set((i % 6) * spacing, 0, Math.floor(i / 6) * spacing);
    let playing = null;
    root.userData.rig = { emote: (spec) => { playing = spec; }, emoting: () => !!playing, moving: () => false, R: null };
    root.userData.played = [];
    scene.add(root); people.push(root);
  }
  scene.updateMatrixWorld(true);
  return people;
}

test('the director never gives two people within 14 m the same emote at once', () => {
  const people = crowd(24, 3);
  const em = createEmotes({ people: () => people, getPlayer: () => ({ x: 6, z: 6 }), getEnv: () => ({ hour: 15, rain: 0 }) });
  const log = [];
  for (const root of people) { const id = em.choose(root); if (id) { em.start(root, id); log.push([root, id]); } }
  for (let i = 0; i < log.length; i++) for (let j = i + 1; j < log.length; j++) {
    const [a, ia] = log[i], [b, ib] = log[j];
    if (a.position.distanceTo(b.position) < 14) assert.notEqual(ia, ib, `two neighbours both got ${ia}`);
  }
  assert.ok(log.length >= 20, `only ${log.length} of 24 got an emote`);
});

test('one person works through many different emotes before repeating', () => {
  const [root] = crowd(1, 0);
  const em = createEmotes({ people: () => [root], getPlayer: () => ({ x: 0, z: 0 }), getEnv: () => ({ hour: 15, rain: 0 }) });
  const got = [];
  for (let k = 0; k < 30; k++) { const id = em.choose(root); got.push(id); em.live.length = 0; em.who(root).recent.length = 0; }
  assert.equal(new Set(got).size, got.length, `repeated within 30: ${got.join(' ')}`);
});

test('an event gives the people around it different reactions', () => {
  const people = crowd(6, 2);
  const em = createEmotes({ people: () => people, getPlayer: () => ({ x: 0, z: 0 }), getEnv: () => ({ hour: 15, rain: 0 }) });
  const played = new Map();
  people.forEach((r) => { const rig = r.userData.rig, orig = rig.emote; rig.emote = (spec) => { played.set(r, spec); orig(spec); }; });
  people.forEach((r) => { r.visible = true; });
  assert.ok(em.event('goal', 4, 2, 20, { chance: 1 }) >= 5);
  for (let t = 0; t < 40; t++) em.update(0.1);
  assert.ok(played.size >= 5, `only ${played.size} reacted`);
});
