import test from 'node:test';
import assert from 'node:assert/strict';
import { bayLayout, accessibleCount, BAY_W, ACC_W, TRANSFER_W } from '../src/look/parking.js';

test('every car park of three bays or more keeps accessible bays', () => {
  assert.equal(accessibleCount(2), 0);
  assert.equal(accessibleCount(5), 1);
  assert.equal(accessibleCount(8), 2);
  assert.equal(accessibleCount(30), 3);
});

test('bays fit the car park, never overlap, and accessible ones come first with a transfer zone', () => {
  for (const len of [12.5, 17.5, 20, 25, 30]) {
    const L = bayLayout(len);
    let u = -len / 2, seenPlain = false;
    for (const b of L) {
      const start = b.u - b.w / 2;
      assert.ok(start >= u - 1e-6, `overlap at ${len}`);
      if (b.acc) { assert.ok(!seenPlain, 'accessible bays first'); assert.equal(b.w, ACC_W); assert.equal(b.transfer.w, TRANSFER_W); u = b.transfer.u + b.transfer.w / 2; }
      else { seenPlain = true; assert.equal(b.w, BAY_W); u = b.u + b.w / 2; }
    }
    assert.ok(u <= len / 2 + 1e-6, `runs past the end at ${len}`);
    assert.ok(L.some((b) => b.acc), `no accessible bay at ${len}`);
  }
});
