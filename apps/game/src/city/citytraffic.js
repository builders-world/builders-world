// Traffic in the open city (Elvis, 12 October 2026: past the district "it just looks like blocks of buildings, abandoned
// buildings"). The district has its own traffic (look/traffic.js), car by car, with lights and horns; out here the
// city's streets near you (the chunks loaded at lod 0 and 1, city/openworld.js) get a lighter crowd of the same
// vehicles: drawn instanced, a few draw calls for all of them, driving on the city's side of the road, lane by lane,
// keeping their distance, up and over the expressway's ramps, and through each junction on a curve to the next street.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { vehicleParts, trafficMix } from '../look/traffic.js';
import { roadSpeed } from '../look/roadclass.js';
import { profileOf, Y } from './roadnet.js';

const CELL = 32;
const MAJOR = new Set(['motorway', 'trunk', 'primary', 'secondary', 'motorway_link', 'trunk_link', 'primary_link']);

export function createCityTraffic({ openWorld, quality = 'high', drive = 'right', reduced = false }) {
  const N = Math.round(({ low: 40, medium: 90, high: 160, ultra: 220 }[quality] ?? 120) * (reduced ? 0.6 : 1));
  const REACH = { low: 200, medium: 250, high: 300, ultra: 360 }[quality] ?? 300; // the crowd stays round you
  const SIDE = drive === 'left' ? -1 : 1; // which side of the centre line traffic keeps to (the right normal is +1)
  const group = new THREE.Group(); group.name = 'city-traffic'; openWorld.group.add(group);

  // ---------- the vehicles: the city's own mix, each kind a set of instanced parts ----------
  const mix = trafficMix().filter((k) => vehicleParts(k));
  const cars = Array.from({ length: N }, (_, i) => ({ kind: mix[i % mix.length], i, live: false }));
  const glass = new THREE.MeshStandardMaterial({ color: 0x24323b, roughness: 0.15, metalness: 0.4 }), dark = new THREE.MeshStandardMaterial({ color: 0x161618, roughness: 0.8 });
  const sets = new Map(), lightMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  function lightsFor(D, kind) {
    const y = kind === 'brt' ? 0.9 : 0.72, g = [];
    [-1, 1].forEach((sd) => [[D.len / 2 + 0.03, [2.4, 2.2, 1.7]], [-D.len / 2 - 0.03, [1.6, 0.12, 0.08]]].forEach(([z, c]) => {
      const b = new THREE.BoxGeometry(0.3, 0.15, 0.04).translate(sd * (D.w / 2 - 0.25), y, z), n = b.getAttribute('position').count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.set(c, i * 3); b.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.push(b);
    }));
    return mergeGeometries(g);
  }
  [...new Set(cars.map((c) => c.kind))].forEach((kind) => {
    const P = vehicleParts(kind), list = cars.filter((c) => c.kind === kind), n = list.length;
    const body = new THREE.InstancedMesh(P.body, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.25 }), n);
    const gl = new THREE.InstancedMesh(P.glass, glass, n), dk = new THREE.InstancedMesh(P.dark, dark, n);
    // head and tail lights, on after dark: white at the front, red at the back, bright enough to bloom
    const lt = new THREE.InstancedMesh(lightsFor(P.D, kind), lightMat, n); lt.visible = false;
    const col = new THREE.Color();
    list.forEach((c, j) => { c.slot = j; c.D = P.D; body.setColorAt(j, col.setHex(P.paints[(c.i * 7 + j) % P.paints.length])); });
    [body, gl, dk].forEach((m) => { m.frustumCulled = false; m.count = n; m.castShadow = quality !== 'low'; group.add(m); });
    lt.frustumCulled = false; group.add(lt);
    sets.set(kind, { body, gl, dk, lt, n });
  });
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  cars.forEach((c) => place(c, hidden));
  function place(c, m) { const S = sets.get(c.kind); S.body.setMatrixAt(c.slot, m); S.gl.setMatrixAt(c.slot, m); S.dk.setMatrixAt(c.slot, m); S.lt.setMatrixAt(c.slot, m); }

  // ---------- the streets near you, from the loaded chunks ----------
  let streets = [], entries = new Map(), version = -1, classes = null;
  const ck = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  function rebuild() {
    version = openWorld.mapVersion; streets = []; entries = new Map();
    classes = classes || openWorld.classes?.();
    if (!classes) return;
    openWorld.eachMap((m) => m.roads.forEach(([c, , p, o, l, rb, e]) => {
      const cls = classes[c]; if (!cls || cls === 'service' || p.length < 4) return;
      const pts = []; for (let i = 0; i < p.length; i += 2) pts.push([p[i], p[i + 1]]);
      const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const L = cum[cum.length - 1]; if (L < 2) return;
      const oneway = !!o || !!rb, prof = profileOf({ cls, lanes: l, oneway, roundabout: !!rb });
      const S = { k: streets.length, src: p, cls, pts, cum, L, e, oneway, lanes: oneway ? prof.lanes : Math.max(1, Math.floor(prof.lanes / 2)), lw: prof.lw, oneHalf: (prof.lanes * prof.lw) / 2, v: roadSpeed(cls) * 1.25, major: MAJOR.has(cls) };
      streets.push(S);
      // where a car can join it: at its start going forward, and at its end going back on a two-way street
      const add = (dir) => { const [x, z] = dir > 0 ? pts[0] : pts[pts.length - 1], key = ck(x, z); if (!entries.has(key)) entries.set(key, []); entries.get(key).push({ S, dir, x, z }); };
      add(1); if (!oneway) add(-1);
    }));
    // cars whose street went away with its chunk come back somewhere near you
    const same = (S) => streets.find((s) => s.src === S.src);
    cars.forEach((c) => {
      if (!c.live) return;
      const r = same(c.S); if (r) c.S = r; else c.live = false;
      if (c.turn) { const t = same(c.turn.to.S); if (t) c.turn.to.S = t; else c.live = false; }
      if (!c.live) place(c, hidden);
    });
  }

  // a point along a street at distance d travelling dir, in lane k: [x, y, z, tx, tz]
  function at(S, d, dir, k, out) {
    const u = Math.max(0, Math.min(S.L, dir > 0 ? d : S.L - d));
    let i = 1; while (i < S.cum.length - 1 && S.cum[i] < u) i++;
    const a = S.pts[i - 1], b = S.pts[i], seg = S.cum[i] - S.cum[i - 1] || 1, t = (u - S.cum[i - 1]) / seg;
    let tx = (b[0] - a[0]) / seg, tz = (b[1] - a[1]) / seg; if (dir < 0) { tx = -tx; tz = -tz; }
    // the lane's middle: on two-way streets from the centre line out on the city's side; on one-way ones across the width
    const off = S.oneway ? (k + 0.5) * S.lw - S.oneHalf : SIDE * (k + 0.5) * S.lw;
    const nx = -tz, nz = tx; // the right of the way it is going
    const y = S.e ? S.e[i - 1] + (S.e[i] - S.e[i - 1]) * t : 0;
    out[0] = a[0] + (b[0] - a[0]) * t + nx * off; out[1] = y + Y.road; out[2] = a[1] + (b[1] - a[1]) * t + nz * off; out[3] = tx; out[4] = tz;
    return out;
  }

  // the next street at the end of this one: straight on where a street carries on (a chunk's edge, or a plain bend),
  // otherwise any way out of the junction but back the way it came, the bigger streets a little more likely
  function next(c) {
    const S = c.S, end = c.dir > 0 ? S.pts[S.pts.length - 1] : S.pts[0], P = at(S, S.L, c.dir, c.lane, []);
    const hx = P[3], hz = P[4], i = Math.floor(end[0] / CELL), j = Math.floor(end[1] / CELL), opts = [];
    for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) (entries.get(`${a},${b}`) || []).forEach((en) => {
      if (en.S === S) return;
      const d = Math.hypot(en.x - end[0], en.z - end[1]); if (d > 30) return;
      const Q = at(en.S, 0, en.dir, 0, []), turn = hx * Q[3] + hz * Q[4]; // cos of the turn
      if (turn < -0.35) return; // no U-turns at a junction
      if (d < 0.6) { opts.length = 0; opts.push({ en, w: 1e6, d }); return; }
      if (opts[0]?.w === 1e6) return;
      opts.push({ en, w: (en.S.major ? 2 : 1) * (0.4 + Math.max(0, turn)), d });
    });
    if (!opts.length) return null;
    let x = Math.random() * opts.reduce((s, o) => s + o.w, 0);
    for (const o of opts) { x -= o.w; if (x <= 0) return o; }
    return opts[opts.length - 1];
  }

  const camC = new THREE.Vector3(), tmp = [0, 0, 0, 0, 0];
  function spawn(c, near) {
    // a street near you (but not on top of you), the main roads busier
    for (let tries = 0; tries < 24 && streets.length; tries++) {
      const S = streets[Math.floor(Math.random() * streets.length)];
      if (!S.major && Math.random() < 0.45) continue;
      const mid = S.pts[Math.floor(S.pts.length / 2)], dd = Math.hypot(mid[0] - camC.x, mid[1] - camC.z);
      if (dd > REACH || dd < (near ? 0 : 50)) continue;
      c.S = S; c.dir = S.oneway || Math.random() < 0.5 ? 1 : -1; c.lane = Math.floor(Math.random() * S.lanes); c.d = Math.random() * S.L;
      c.v = S.v * (0.8 + Math.random() * 0.3); c.turn = null; c.live = true;
      return true;
    }
    return false;
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  let rebuildIn = 0, first = true;
  function update(camera, dt) {
    if (!openWorld.ready) return;
    dt = Math.min(dt, 0.1);
    const off = openWorld.offset; camC.set(camera.position.x + off.x, 0, camera.position.z + off.z);
    if ((rebuildIn -= dt) <= 0 && version !== openWorld.mapVersion) { rebuild(); rebuildIn = 0.5; }
    if (!streets.length) return;
    // who is ahead of whom, lane by lane
    const lanes = new Map();
    cars.forEach((c) => { if (!c.live || c.turn) return; const k = `${c.S.k}:${c.dir}:${c.lane}`; if (!lanes.has(k)) lanes.set(k, []); lanes.get(k).push(c); });
    lanes.forEach((l) => l.sort((a, b) => a.d - b.d));
    cars.forEach((c) => {
      if (!c.live) { if (spawn(c, first) === false) { place(c, hidden); return; } }
      if (c.turn) { // through the junction on a curve
        const T = c.turn; T.s += c.v * dt;
        if (T.s >= T.len) { c.S = T.to.S; c.dir = T.to.dir; c.d = 0; c.lane = Math.min(c.lane, c.S.lanes - 1); c.v = Math.min(c.v, c.S.v); c.turn = null; }
        else {
          const u = T.s / T.len, v = 1 - u, P0 = T.p0, P1 = T.c0, P2 = T.c1, P3 = T.p1;
          tmp[0] = v * v * v * P0[0] + 3 * v * v * u * P1[0] + 3 * v * u * u * P2[0] + u * u * u * P3[0];
          tmp[2] = v * v * v * P0[1] + 3 * v * v * u * P1[1] + 3 * v * u * u * P2[1] + u * u * u * P3[1];
          tmp[1] = T.y0 + (T.y1 - T.y0) * u;
          tmp[3] = 3 * v * v * (P1[0] - P0[0]) + 6 * v * u * (P2[0] - P1[0]) + 3 * u * u * (P3[0] - P2[0]);
          tmp[4] = 3 * v * v * (P1[1] - P0[1]) + 6 * v * u * (P2[1] - P1[1]) + 3 * u * u * (P3[1] - P2[1]);
          draw(c, tmp, 0); return;
        }
      }
      // keep a distance behind the car ahead, and the street's speed
      const lane = lanes.get(`${c.S.k}:${c.dir}:${c.lane}`), ix = lane ? lane.indexOf(c) : -1, ahead = ix >= 0 ? lane[ix + 1] : null;
      const gap = ahead ? ahead.d - c.d - (ahead.D.len + c.D.len) / 2 : Infinity;
      const want = gap < 3 ? 0 : gap < 14 ? c.S.v * ((gap - 3) / 11) : c.S.v;
      c.v += (want - c.v) * Math.min(1, dt * (want < c.v ? 4 : 1.2));
      c.d += c.v * dt;
      if (c.d >= c.S.L) {
        const n = next(c);
        if (!n) { // the end of the streets loaded here: round again the other way if it is two-way, or start somewhere else
          if (!c.S.oneway) { const A = at(c.S, c.S.L, c.dir, c.lane, []); c.dir = -c.dir; c.d = 0; const B = at(c.S, 0, c.dir, c.lane, []); startTurn(c, A, B, { S: c.S, dir: c.dir }, true); }
          else { c.live = false; place(c, hidden); }
          return;
        }
        const A = at(c.S, c.S.L, c.dir, c.lane, []), lane2 = Math.min(c.lane, n.en.S.lanes - 1), B = at(n.en.S, 0, n.en.dir, lane2, []);
        if (n.d < 0.6) { c.S = n.en.S; c.dir = n.en.dir; c.d = 0; c.lane = lane2; } // the same street, on into the next chunk
        else startTurn(c, A, B, n.en, false);
        if (c.turn) return;
      }
      at(c.S, c.d, c.dir, c.lane, tmp);
      // gone too far from you: back near you, somewhere out of sight
      if (Math.hypot(tmp[0] - camC.x, tmp[2] - camC.z) > REACH * 1.2) { c.live = false; place(c, hidden); return; }
      draw(c, tmp, slope(c));
    });
    first = false;
    sets.forEach((S) => { S.body.instanceMatrix.needsUpdate = true; S.gl.instanceMatrix.needsUpdate = true; S.dk.instanceMatrix.needsUpdate = true; if (S.lt.visible) S.lt.instanceMatrix.needsUpdate = true; });
  }
  function startTurn(c, A, B, to, uturn) {
    const L = Math.hypot(B[0] - A[0], B[2] - A[2]), h = uturn ? 4 : L / 3;
    c.turn = { s: 0, len: Math.max(1, L * (uturn ? 1.6 : 1.15)), to, p0: [A[0], A[2]], c0: [A[0] + A[3] * h, A[2] + A[4] * h], c1: [B[0] - B[3] * h, B[2] - B[4] * h], p1: [B[0], B[2]], y0: A[1], y1: B[1] };
  }
  const slope = (c) => { if (!c.S.e) return 0; const a = at(c.S, c.d - 2, c.dir, c.lane, []), b = at(c.S, c.d + 2, c.dir, c.lane, []); return Math.atan2(b[1] - a[1], 4); };
  function draw(c, P, pitch) {
    pos.set(P[0], P[1], P[2]); e.set(-pitch, Math.atan2(P[3], P[4]), 0, 'YXZ'); q.setFromEuler(e);
    place(c, m4.compose(pos, q, one));
  }

  const near = (r) => cars.filter((c) => { if (!c.live || c.turn) return false; at(c.S, c.d, c.dir, c.lane, tmp); return Math.hypot(tmp[0] - camC.x, tmp[2] - camC.z) < r; }).length;
  /** For the tests: the live car nearest you, in the scene's frame, with its heading and street. */
  const nearest = () => { let best = null, bd = Infinity; cars.forEach((c) => { if (!c.live || c.turn) return; at(c.S, c.d, c.dir, c.lane, tmp); const d = Math.hypot(tmp[0] - camC.x, tmp[2] - camC.z); if (d < bd) { bd = d; best = { x: tmp[0] - openWorld.offset.x, z: tmp[2] - openWorld.offset.z, tx: tmp[3], tz: tmp[4], cls: c.S.cls, oneway: c.S.oneway, lane: c.lane, kind: c.kind }; } }); return best; };
  /** Dusk to dawn: the lights on. */
  const setNight = (n) => sets.forEach((S) => { const on = n > 0.35; if (on && !S.lt.visible) S.lt.instanceMatrix.needsUpdate = true; S.lt.visible = on; });
  return { group, update, nearest, setNight, stats: () => ({ cars: cars.filter((c) => c.live).length, turning: cars.filter((c) => c.turn).length, near100: near(100), near200: near(200), streets: streets.length }), dispose: () => { group.removeFromParent(); sets.forEach((S) => [S.body, S.gl, S.dk, S.lt].forEach((m) => m.dispose())); } };
}
