// The driver's licence (licence.js): the authority per country, a theory test on the city's own rules, the pass mark.
import test from 'node:test';
import assert from 'node:assert/strict';
import { authorityFor, licenceOfficeName, theoryTest, mark, licenceNumber, PASS_MARK } from '../src/look/licencerules.js';

const seeded = (s = 7) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

test('each country has its real licensing authority', () => {
  assert.equal(authorityFor('Nigeria').org, 'FRSC');
  assert.equal(authorityFor('Kenya').org, 'NTSA');
  assert.equal(authorityFor('Ghana').org, 'DVLA');
  assert.equal(licenceOfficeName('Kenya', 'Kilimani'), 'NTSA Kilimani Service Centre');
  assert.equal(licenceOfficeName('Nigeria', 'Yaba'), 'FRSC Yaba Licence Centre');
});

test('the test always asks the side of the road, answered for the city', () => {
  for (let k = 1; k < 30; k++) {
    const ng = theoryTest({ city: 'Lagos', country: 'Nigeria', drive: 'right' }, seeded(k));
    assert.equal(ng.length, 5);
    assert.match(ng[0].q, /which side/);
    assert.equal(ng[0].a[ng[0].ok], 'The right');
    const ke = theoryTest({ city: 'Nairobi', country: 'Kenya', drive: 'left' }, seeded(k));
    assert.equal(ke[0].a[ke[0].ok], 'The left');
    assert.equal(new Set(ng.map((t) => t.q)).size, 5, 'no question twice');
    ng.forEach((t) => { assert.ok(t.ok >= 0 && t.ok < t.a.length); });
  }
});

test('the roundabout answer follows the side you drive on', () => {
  const find = (info) => { for (let k = 1; k < 400; k++) { const r = theoryTest(info, seeded(k * 7919 + 13)).find((t) => /roundabout/.test(t.q)); if (r) return r; } return null; };
  const ng = find({ drive: 'right' }), ke = find({ drive: 'left' });
  assert.ok(ng && ke, 'the roundabout question comes up');
  assert.match(ng.a[ng.ok], /from your left/);
  assert.match(ke.a[ke.ok], /from your right/);
});

test('pass with four of five', () => {
  const t = theoryTest({ drive: 'right' }, seeded(3));
  const all = t.map((q) => q.ok);
  assert.equal(mark(t, all).pass, true);
  const oneWrong = all.map((a, i) => (i === 0 ? (a + 1) % 3 : a));
  assert.equal(mark(t, oneWrong).right, PASS_MARK); assert.equal(mark(t, oneWrong).pass, true);
  const twoWrong = oneWrong.map((a, i) => (i === 1 ? (a + 1) % 3 : a));
  assert.equal(mark(t, twoWrong).pass, false);
});

test('licence numbers look like each country\'s', () => {
  assert.match(licenceNumber('Nigeria', seeded(5)), /^[A-Z]{3}\d{5}[A-Z]{2}\d{2}$/);
  assert.match(licenceNumber('Kenya', seeded(5)), /^DL-\d{7}$/);
  assert.match(licenceNumber('Ghana', seeded(5)), /^[A-Z]{2}-\d{4}-\d{2}$/);
});
