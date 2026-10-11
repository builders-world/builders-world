// Jobs for Efforts (jobdata.js): every task answerable, the marking, the pay, the daily limit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JOBS, REPAIRS, GITS, DESIGNS, TICKETS, SHIFT, DAILY_CAP, markDesign, designPay, shiftPay, gitRight, canWork, tally } from '../src/look/jobdata.js';

test('every job pays, and every question has its right answer among the options', () => {
  Object.values(JOBS).forEach((j) => assert.ok(j.pay >= 1500 && j.pay <= 3500));
  REPAIRS.forEach((r) => r.steps.forEach((s) => assert.ok(s.ok >= 0 && s.ok < s.a.length && s.a.length >= 3)));
  TICKETS.forEach((t) => assert.ok(t.ok >= 0 && t.ok < t.a.length));
  assert.ok(TICKETS.length >= SHIFT, 'enough tickets for a shift');
  DESIGNS.forEach((d) => d.choices.forEach((c) => assert.equal(Math.max(...c.a.map((o) => o[1])), 2, `a best answer for ${d.name} ${c.q}`)));
});

test('git: only the right commands in the right order', () => {
  const G = GITS[0];
  assert.equal(gitRight(G, G.want), true);
  assert.equal(gitRight(G, [...G.want].reverse()), false);
  assert.equal(gitRight(G, G.want.slice(1)), false);
  GITS.forEach((g) => g.extra.forEach((x) => assert.ok(!g.want.includes(x))));
});

test('designs and shifts pay for good work', () => {
  const D = DESIGNS[0], best = D.choices.map((c) => c.a.findIndex((o) => o[1] === 2)), worst = D.choices.map((c) => c.a.findIndex((o) => o[1] === 0));
  assert.equal(markDesign(D, best), 6); assert.equal(designPay(6, 3000), 3000);
  assert.equal(designPay(markDesign(D, worst), 3000), 0); assert.equal(designPay(3, 3000), 1500);
  assert.equal(shiftPay(SHIFT, 3000), 3500); assert.equal(shiftPay(0, 3000), 0); assert.ok(shiftPay(3, 3000) < 3000);
});

test('a daily limit, reset each day', () => {
  let s = { day: '', count: 0 }; const day = Date.parse('2026-10-11T10:00:00');
  for (let i = 0; i < DAILY_CAP; i++) { assert.equal(canWork(s, day).ok, true); s = tally(s, day); }
  assert.equal(canWork(s, day).ok, false);
  assert.equal(canWork(s, day + 86400000).ok, true, 'the next day');
});
