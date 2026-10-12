// The travel rules (world bible 6.8): who can fly where, for how much, with what papers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AIRPORTS, fare, km, entryRule, canTravel, proofOfFunds, passportNumber } from '../src/look/travelrules.js';

test('every city has its real main airport', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(AIRPORTS).map(([c, a]) => [c, a.code])), { Lagos: 'LOS', Abuja: 'ABV', 'Port Harcourt': 'PHC', Uyo: 'QUO', Nairobi: 'NBO', Accra: 'ACC' });
});

test('distances and fares are sensible', () => {
  const la = km('Lagos', 'Abuja'); assert.ok(la > 450 && la < 600, `Lagos to Abuja ${la} km`);
  const ln = km('Lagos', 'Nairobi'); assert.ok(ln > 3600 && ln < 4000, `Lagos to Nairobi ${ln} km`);
  assert.ok(fare('Lagos', 'Nairobi') > fare('Lagos', 'Accra'));
  assert.ok(fare('Lagos', 'Accra') > fare('Lagos', 'Abuja'), 'crossing a border costs more');
  assert.equal(fare('Lagos', 'Lagos'), 0);
});

test('entry: domestic needs an ID, ECOWAS a passport, elsewhere a passport and an authorisation', () => {
  assert.equal(entryRule('Nigeria', 'Abuja').kind, 'domestic');
  assert.equal(entryRule('Nigeria', 'Accra').kind, 'ecowas');
  assert.equal(entryRule('Ghana', 'Lagos').kind, 'ecowas');
  assert.equal(entryRule('Nigeria', 'Nairobi').kind, 'eta');
  assert.equal(entryRule('Kenya', 'Lagos').kind, 'eta');
});

test('the richer the tech scene, the more proof of funds', () => {
  assert.ok(proofOfFunds('Lagos') > proofOfFunds('Abuja'));
  assert.ok(proofOfFunds('Abuja') > proofOfFunds('Uyo'));
  assert.equal(proofOfFunds('Nairobi'), proofOfFunds('Lagos'));
});

test('canTravel lists exactly what is missing', () => {
  const poor = canTravel('Lagos', 'Nairobi', { nationality: 'Nigeria', balance: 1000, passport: null, etas: [] });
  assert.equal(poor.ok, false);
  assert.ok(poor.needs.some((n) => /passport/i.test(n)) && poor.needs.some((n) => /authorisation/i.test(n)) && poor.needs.some((n) => /fare/i.test(n)));
  const ready = canTravel('Lagos', 'Nairobi', { nationality: 'Nigeria', balance: 200000, passport: 'A1', etas: ['Kenya'] });
  assert.equal(ready.ok, true, ready.needs.join('; '));
  const proof = canTravel('Lagos', 'Accra', { nationality: 'Nigeria', balance: fare('Lagos', 'Accra') + 100, passport: 'A1' });
  assert.ok(proof.needs.some((n) => /Proof of funds/.test(n)), 'enough for the fare is not enough to enter');
  assert.equal(canTravel('Yaba' && 'Lagos', 'Abuja', { nationality: 'Nigeria', balance: 50000, id: true }).ok, true, 'a resident card is enough at home');
});

test('passport numbers look like passport numbers and are stable for a seed', () => {
  assert.match(passportNumber('Nigeria', 0.123), /^A\d{8}$/);
  assert.equal(passportNumber('Kenya', 0.5), passportNumber('Kenya', 0.5));
});
