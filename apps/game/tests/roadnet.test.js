// The road network (src/city/roadnet.js), after Cities: Skylines: nodes where roads meet, segments between them, every
// junction shaped so nothing overlaps, roundabouts as rings round an island.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNetwork, shapeJunctions, profileOf, junctionShape } from '../src/city/roadnet.js';

const road = (id, cls, pts, extra = {}) => ({ id, cls, pts, ...extra });

test('a crossroads: one junction, four segments, each stopping short of the crossing road', () => {
  const net = shapeJunctions(buildNetwork([road(1, 'residential', [[-100, 0], [0, 0], [100, 0]]), road(2, 'secondary', [[0, -100], [0, 0], [0, 100]])]));
  assert.equal(net.junctions.length, 1);
  assert.equal(net.segs.length, 4);
  const sec = profileOf({ cls: 'secondary' }).half, res = profileOf({ cls: 'residential' }).half;
  net.segs.forEach((s) => {
    const end = s.a.ends.length > 1 ? s.draw[0] : s.draw[s.draw.length - 1], d = Math.hypot(end[0], end[1]);
    // a residential arm stops outside the secondary road's carriageway, and the other way round
    assert.ok(d >= (s.cls === 'residential' ? sec : res), `${s.cls} stops ${d.toFixed(1)} m out`);
    assert.ok(['stop', 'dead'].includes(s.end_a) && ['stop', 'dead'].includes(s.end_b));
  });
  const j = net.junctions[0];
  assert.ok(j.asphalt.length >= 8, 'the junction has an outline');
  assert.equal(j.corners.filter((c) => c.outer).length, 4, 'four pavement corners');
});

test('a road carrying straight on through a node is one segment, with no junction', () => {
  const net = shapeJunctions(buildNetwork([road(1, 'tertiary', [[-50, 0], [0, 0]]), road(2, 'tertiary', [[0, 0], [60, 0]])]));
  assert.equal(net.segs.length, 1); assert.equal(net.junctions.length, 0);
});

test('profiles make the hierarchy: a trunk road is wider than a primary, a primary than a residential street', () => {
  const w = (cls) => profileOf({ cls }).half;
  assert.ok(w('trunk') > w('primary') && w('primary') > w('secondary') && w('secondary') > w('residential') && w('residential') > w('service'));
  assert.equal(profileOf({ cls: 'primary', oneway: true }).lanes, 2);
  assert.equal(profileOf({ cls: 'motorway_link', oneway: true }).lanes, 1);
});

test('a roundabout: a closed ring of one-way segments gets a grass island, and roads entering it give way', () => {
  const ring = []; for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 2; ring.push([Math.cos(a) * 25, Math.sin(a) * 25]); }
  ring[24] = ring[0];
  const net = shapeJunctions(buildNetwork([road(1, 'primary', ring, { oneway: true, roundabout: true }), road(2, 'primary', [[25, 0], [140, 0]])]));
  assert.equal(net.islands.length, 1);
  assert.ok(Math.abs(net.islands[0].r - (25 - profileOf({ cls: 'primary', oneway: true, roundabout: true }).half - 0.3)) < 1);
  const arm = net.segs.find((s) => !s.roundabout);
  assert.ok(arm.end_a === 'giveway' || arm.end_b === 'giveway');
});

test('a junction can be rebuilt from its few stored numbers', () => {
  const net = shapeJunctions(buildNetwork([road(1, 'residential', [[-100, 0], [0, 0], [100, 0]]), road(2, 'residential', [[0, 0], [0, 100]])]));
  const j = net.junctions[0], again = junctionShape(j.x, j.z, j.spec);
  assert.deepEqual(again.asphalt.map((p) => p.map((v) => Math.round(v * 100))), j.asphalt.map((p) => p.map((v) => Math.round(v * 100))));
});
