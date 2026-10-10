import test from 'node:test';
import assert from 'node:assert/strict';
import { freshProfile, canEnter, normalizeProfile, loadProfile, saveProfile, homeSeed, COLORS } from '../src/onboarding/state.js';

const complete = () => ({ ...freshProfile(), step: 'home', name: 'Ada', role: 'developer', connection: { provider: 'GitHub', mode: 'github' }, city: 'Lagos', district: 'Yaba' });
test('later stages require identity, a GitHub sign-in, and a valid district', () => {
  const p = freshProfile();
  assert.equal(canEnter(p, 'role'), true);
  assert.equal(canEnter(p, 'connect'), false);
  assert.equal(canEnter(p, 'home'), false);
  p.name = 'Ada'; p.role = 'designer';
  assert.equal(canEnter(p, 'connect'), true);
  p.connection = { provider: 'GitHub', mode: 'demo' };
  assert.equal(canEnter(p, 'destination'), false, 'the old demo identity no longer counts');
  p.connection = { provider: 'Dribbble', mode: 'github' };
  assert.equal(canEnter(p, 'destination'), false);
  p.connection = { provider: 'GitHub', mode: 'github' };
  assert.equal(canEnter(p, 'destination'), true);
  p.city = 'Lagos'; p.district = 'Made up';
  assert.equal(canEnter(p, 'flight'), false);
  p.district = 'Yaba';
  assert.equal(canEnter(p, 'flight'), true);
});
test('invalid persisted choices fall back to the last valid stage', () => {
  const p = complete(); p.city = 'Unknown'; p.avatar = { color: '<bad>', style: 'invalid' };
  const result = normalizeProfile(p);
  assert.equal(result.step, 'destination');
  assert.equal(result.city, '');
  assert.equal(result.avatar.color, COLORS[0]);
  assert.equal(result.avatar.style, 'classic');
  assert.equal(normalizeProfile({ ...complete(), connection: { provider: 'GitHub', mode: 'verified' } }).step, 'connect');
});
test('storage corruption and blocked storage do not prevent onboarding', () => {
  assert.equal(loadProfile({ getItem: () => '{broken' }).step, 'lobby');
  assert.equal(loadProfile({ getItem: () => { throw Error('denied'); } }).step, 'lobby');
  assert.equal(saveProfile(complete(), { setItem: () => { throw Error('quota'); } }), false);
});
test('a complete profile round-trips and the home seed remains stable across outfits', () => {
  let saved;
  const storage = { setItem: (_, value) => { saved = value; }, getItem: () => saved };
  const p = complete(); saveProfile(p, storage);
  assert.deepEqual(loadProfile(storage), p);
  const seed = homeSeed(p); p.avatar.style = 'hoodie';
  assert.equal(homeSeed(p), seed);
  assert.notEqual(homeSeed({ ...p, name: 'Femi' }), seed);
  assert.notEqual(homeSeed({ ...p, city: 'Abuja' }), seed);
});
