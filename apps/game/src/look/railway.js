import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { signTexture } from './props.js';
import { sfx } from './audio.js';
import { cityInfo } from './cityinfo.js';

// The railway (Elvis, 10 October 2026: "a railway with trains and a station"), where a city really has one: the lines,
// the stations and whether a line crosses a road all come from OpenStreetMap (osm.js keeps railway ways and stations),
// so Yaba gets the Lagos–Ibadan standard gauge line and its station, Port Harcourt's Old GRA its line, and a city with
// no railway gets none. Track on ballast and sleepers; barriers and flashing lights where the line crosses a road
// (the cars wait for the train); the station platform at the station's real place on the line, or, when the station
// is just past the edge of the area, at the nearest stretch of line inside it (the compressed map, as with landmarks);
// trains that run the line, stop at the platform, sound the horn, and wait for anyone standing on the track.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const LIVERY = { body: 0xf2f2ec, band: 0x1f7a45, roof: 0x9aa3a8, glass: 0x2b3a46 };

// a polyline's cumulative lengths, and a point and heading at distance s (carried straight on past either end)
function measure(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return cum; }
function at(pts, cum, s, out = {}) {
  const L = cum[cum.length - 1];
  let i = 0; if (s <= 0) i = 0; else if (s >= L) i = pts.length - 2; else while (i < pts.length - 2 && cum[i + 1] < s) i++;
  const a = pts[i], b = pts[i + 1], seg = (cum[i + 1] - cum[i]) || 1e-6, u = (s - cum[i]) / seg;
  out.x = a[0] + (b[0] - a[0]) * u; out.z = a[1] + (b[1] - a[1]) * u; out.dx = (b[0] - a[0]) / seg; out.dz = (b[1] - a[1]) / seg; return out;
}

function trainModel(cars) {
  const g = new THREE.Group(), parts = [];
  const body = M(LIVERY.body, { roughness: 0.5 }), band = M(LIVERY.band, { roughness: 0.5 }), roof = M(LIVERY.roof), glass = M(LIVERY.glass, { roughness: 0.2 }), dark = M(0x2b2f33);
  cars.forEach((c) => {
    const k = new THREE.Group(), L = c.len;
    k.add(new THREE.Mesh(box(2.9, 2.7, L, 0, 2.15, 0), body));
    k.add(new THREE.Mesh(box(2.94, 0.45, L + 0.02, 0, 1.6, 0), band));
    k.add(new THREE.Mesh(box(2.7, 0.3, L - 0.4, 0, 3.6, 0), roof));
    k.add(new THREE.Mesh(box(2.4, 0.6, L - 2, 0, 0.55, 0), dark)); // bogies and skirt
    // windows down both sides
    for (let w = -L / 2 + 2; w < L / 2 - 1.5; w += 2.1) [-1, 1].forEach((sd) => k.add(new THREE.Mesh(box(0.04, 0.8, 1.4, sd * 1.47, 2.55, w), glass)));
    if (c.loco) { // the locomotive's cab: a raked windscreen and headlights at the front (+z)
      k.add(new THREE.Mesh(box(2.6, 1.0, 0.06, 0, 2.7, L / 2 + 0.01), glass));
      [-0.9, 0.9].forEach((x) => k.add(new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.9, 1.5) })).translateX(x).translateY(1.25).translateZ(L / 2 + 0.03)));
    }
    k.userData.len = L; g.add(k); parts.push(k);
  });
  g.userData.cars = parts;
  return g;
}

export function createRailway({ world, scene, traffic, props, toast, cityName = '' }) {
  const rails = (world.rails || []).filter((r) => r.pts.length > 1);
  if (!rails.length) return null;
  const group = new THREE.Group(); group.name = 'railway'; scene.add(group);
  const R = world.radius;
  // ---------- where a line crosses a road (not on a bridge): found first, so the track can be built for it ----------
  // (Elvis, 11 October 2026: "in real life the wooden aspect of the tracks are not included when it goes through a
  // road, only the metal"). Across a road a crossing has no ballast and no sleepers to see: the rails are set flush in
  // a deck of rubber panels, a gauge panel between the rails and a field panel either side, with a flangeway groove
  // along the inside of each rail for the wheel flanges, and the deck runs the width of the road and its pavements.
  const segX = (a, b, c, d) => { const r1x = b[0] - a[0], r1z = b[1] - a[1], r2x = d[0] - c[0], r2z = d[1] - c[1], den = r1x * r2z - r1z * r2x; if (Math.abs(den) < 1e-6) return null; const t = ((c[0] - a[0]) * r2z - (c[1] - a[1]) * r2x) / den, u = ((c[0] - a[0]) * r1z - (c[1] - a[1]) * r1x) / den; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { t, u } : null; };
  const gaugeOf = (r) => (r.gauge ? r.gauge / 1000 : r.kind === 'narrow_gauge' ? 1.067 : 1.435);
  const lines0 = rails.map((rl) => ({ rl, cum: measure(rl.pts) }));
  const hits = [], zones = rails.map(() => []);
  rails.forEach((rl, ri) => {
    if (rl.bridge) return;
    const { cum } = lines0[ri];
    for (let i = 0; i < rl.pts.length - 1; i++) (world.roads || []).forEach((rd, rdi) => {
      if (!rd.fit || ['footway', 'path', 'cycleway', 'pedestrian', 'steps'].includes(rd.cls)) return;
      const P = rd.fit.pts;
      for (let j = 0; j < P.length - 1; j++) {
        const hit = segX(rl.pts[i], rl.pts[i + 1], P[j], P[j + 1]); if (!hit) continue;
        const x = rl.pts[i][0] + (rl.pts[i + 1][0] - rl.pts[i][0]) * hit.t, z = rl.pts[i][1] + (rl.pts[i + 1][1] - rl.pts[i][1]) * hit.t;
        if (Math.hypot(x, z) > R * 1.05) continue;
        const half = Math.max(rd.fit.half[j], rd.fit.half[j + 1]), pave = Math.max(rd.fit.paveL[j], rd.fit.paveR[j], rd.fit.paveL[j + 1], rd.fit.paveR[j + 1]);
        const rdx = P[j + 1][0] - P[j][0], rdz = P[j + 1][1] - P[j][1], rl2 = Math.hypot(rdx, rdz) || 1, ux = rdx / rl2, uz = rdz / rl2;
        const tdx = rl.pts[i + 1][0] - rl.pts[i][0], tdz = rl.pts[i + 1][1] - rl.pts[i][1], tl = Math.hypot(tdx, tdz) || 1;
        const sin = Math.max(0.3, Math.abs(ux * tdz / tl - uz * tdx / tl)), s = cum[i] + (cum[i + 1] - cum[i]) * hit.t;
        if (hits.some((h) => h.ri === ri && Math.abs(h.s - s) < 6)) continue; // the same crossing seen from two segments of the road
        const w = (half + pave + 0.4) / sin; // how far along the line the road and its pavements reach
        zones[ri].push([s - w, s + w]);
        hits.push({ x, z, ri, s, rdi, half, pave, ux, uz, sin, G: gaugeOf(rl) });
      }
    });
  });
  const inZone = (ri, s) => zones[ri].some(([a, b]) => s > a && s < b);
  // the parts of [0, L] in and out of the road, in order
  const spans = (ri, L) => { const cuts = zones[ri].map(([a, b]) => [Math.max(0, a), Math.min(L, b)]).filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]), out = []; let s = 0; cuts.forEach(([a, b]) => { if (a > s) out.push([s, a, false]); out.push([Math.max(s, a), b, true]); s = Math.max(s, b); }); if (s < L) out.push([s, L, false]); return out; };
  // a box along the line from s0 to s1, at offset o across it (one box per straight piece)
  const along = (rl, cum, s0, s1, fn) => { for (let i = 0; i < rl.pts.length - 1; i++) { const a = Math.max(s0, cum[i]), b = Math.min(s1, cum[i + 1]); if (b - a < 0.02) continue; const p = at(rl.pts, cum, (a + b) / 2); fn(p.x, p.z, b - a, Math.atan2(p.dx, p.dz)); } };

  // ---------- the track: ballast, sleepers, two rails; across a road, the crossing deck ----------
  const ballast = [], steel = [], sleepers = [], deck = [], groove = [];
  const put = (list, w, h, len, y, o) => (mx, mz, l, ry) => { const g = box(w, h, l + len, o, y, 0); g.rotateY(ry); g.translate(mx, 0, mz); list.push(g); };
  rails.forEach((r, ri) => {
    const G = gaugeOf(r), { cum } = lines0[ri], L = cum[cum.length - 1];
    spans(ri, L).forEach(([s0, s1, road]) => {
      if (!road) {
        along(r, cum, s0, s1, put(ballast, 3.4, 0.16, 0.02, 0.08, 0));
        [-G / 2, G / 2].forEach((o) => along(r, cum, s0, s1, put(steel, 0.08, 0.14, 0.02, 0.23, o)));
      } else {
        // the deck, just proud of the road (0.14) and its paint: a dark groove the full width, the panels on it with the
        // flangeways left open, the rails flush with the panels
        along(r, cum, s0, s1, put(groove, G + 2.0, 0.1, 0, 0.105, 0));
        along(r, cum, s0, s1, put(deck, G - 0.24, 0.04, 0, 0.152, 0));
        [-1, 1].forEach((sd) => along(r, cum, s0, s1, put(deck, 0.86, 0.04, 0, 0.152, sd * (G / 2 + 0.53))));
        [-G / 2, G / 2].forEach((o) => along(r, cum, s0, s1, put(steel, 0.08, 0.1, 0, 0.127, o)));
      }
    });
    for (let s = 0.3; s < L; s += 0.7) { if (inZone(ri, s)) continue; const p = at(r.pts, cum, s); sleepers.push({ x: p.x, z: p.z, ry: Math.atan2(p.dx, p.dz) }); }
  });
  const ballastMesh = new THREE.Mesh(mergeGeometries(ballast), M(0x9b938a, { roughness: 1 })); ballastMesh.receiveShadow = true; ballastMesh.name = 'rail_ballast'; group.add(ballastMesh);
  group.add(new THREE.Mesh(mergeGeometries(steel), M(0x8a8f94, { roughness: 0.35, metalness: 0.7 })));
  if (deck.length) {
    const g1 = new THREE.Mesh(mergeGeometries(groove), M(0x1c1d1f, { roughness: 1 })), d1 = new THREE.Mesh(mergeGeometries(deck), M(0x45484b, { roughness: 0.95 }));
    g1.name = d1.name = 'rail_crossing_deck'; g1.receiveShadow = d1.receiveShadow = true; group.add(g1, d1);
  }
  const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.12, 0.22).translate(0, 0.18, 0), M(0x6d6258), sleepers.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  sleepers.forEach((p, i) => sl.setMatrixAt(i, m4.compose(new THREE.Vector3(p.x, 0, p.z), q.setFromAxisAngle(up, p.ry), one))); sl.receiveShadow = true; group.add(sl);

  // ---------- level crossings: how road traffic is kept off the line when a train comes ----------
  // One crossing for all the tracks that cross a road together (Yaba's three lines are one crossing, not three), and
  // on each approach, on the driver's kerb (the right, the left where traffic keeps left):
  //   - an advance warning sign 45 m out: the red triangle with a gate, "level crossing with barrier";
  //   - a white stop line across the approach lanes, 3 m short of the deck;
  //   - the post at the barrier: the crossbuck (the St Andrew's cross), two red lamps that flash in turn, and the bell;
  //   - a half barrier over the approach lanes only, so a car caught on the crossing can always drive off it.
  // The sequence (as on automatic crossings): a train about 22 s out starts the lamps and the bell; 4 s later the
  // barriers come down; they rise once the last train is clear. The cars stop at the stop line, never on the tracks,
  // and they do not drive onto the crossing unless there is room for them on the far side (traffic.js).
  const crossings = [];
  const hand = cityInfo().drive === 'left' ? -1 : 1;
  const pole = M(0x2b2f33), red = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.2, 0.15) }), dim = M(0x3a1a18), white = new THREE.MeshBasicMaterial({ color: 0xf4f2ea });
  const crossbuck = new THREE.MeshBasicMaterial({ map: signTexture('✕', { bg: '#ffffff', fg: '#c8102e', w: 160, h: 160 }), side: THREE.DoubleSide });
  const warnTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
    g.fillStyle = '#ffffff'; g.strokeStyle = '#c8102e'; g.lineWidth = 26; g.lineJoin = 'round'; g.beginPath(); g.moveTo(128, 24); g.lineTo(236, 222); g.lineTo(20, 222); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#1d1f22'; g.fillRect(70, 150, 116, 12); g.fillRect(70, 182, 116, 12); for (let x = 74; x <= 176; x += 25) g.fillRect(x, 136, 10, 70); // the gate
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const warnMat = new THREE.MeshBasicMaterial({ map: warnTex, transparent: true, side: THREE.DoubleSide });
  const used = new Set();
  hits.forEach((h0, k0) => {
    if (used.has(k0)) return;
    // the tracks crossing this road within 30 m of each other are one crossing
    const grp = hits.map((h, k) => ({ h, k })).filter(({ h, k }) => !used.has(k) && h.rdi === h0.rdi && Math.abs((h.x - h0.x) * h0.ux + (h.z - h0.z) * h0.uz) < 30 && Math.abs(-(h.x - h0.x) * h0.uz + (h.z - h0.z) * h0.ux) < 4);
    grp.forEach(({ k }) => used.add(k));
    const ux = h0.ux, uz = h0.uz, half = Math.max(...grp.map(({ h }) => h.half)), pave = h0.pave;
    // the deck's extent along the road, measured from the first track
    const reach = grp.map(({ h }) => { const a = (h.x - h0.x) * ux + (h.z - h0.z) * uz, w = (h.G / 2 + 1.0) / h.sin; return [a - w, a + w]; });
    const lo = Math.min(...reach.map((r) => r[0])), hi = Math.max(...reach.map((r) => r[1])), mid = (lo + hi) / 2;
    const cx = h0.x + ux * mid, cz = h0.z + uz * mid, hl = (hi - lo) / 2;
    const C = { x: cx, z: cz, rail: h0.ri, s: h0.s, tracks: grp.map(({ h }) => ({ rail: h.ri, s: h.s })), arms: [], lights: [], active: false, warn: 0, armT: 0, bell: 0,
      blocker: traffic?.addBlocker?.({ x: cx, z: cz, r: half + 0.5, band: { ux, uz, hl, stop: 3 }, wait: true }) };
    [1, -1].forEach((d) => {
      const hx = ux * d, hz = uz * d, rx = -hz * hand, rz = hx * hand; // heading of the traffic on this approach, and its kerb side
      const edge = -hl; // the near edge of the deck, measured along the heading from the middle
      const A = (a, o) => ({ x: cx + hx * a + rx * o, z: cz + hz * a + rz * o }); // a along the heading, o across toward the kerb
      const face = Math.atan2(-hx, -hz); // turned to face the traffic coming
      // the barrier post on the kerb, 1.6 m short of the deck
      const pp = A(edge - 1.6, half + 0.6);
      const g = new THREE.Group(); g.position.set(pp.x, 0, pp.z); g.rotation.y = face; group.add(g);
      g.add(new THREE.Mesh(box(0.5, 1.1, 0.5, 0, 0.55, 0), M(0xe9e4d8)), new THREE.Mesh(box(0.14, 3.3, 0.14, 0, 1.65, 0), pole));
      // the lamp head: a black backboard with two red lamps under hoods, the crossbuck above
      g.add(new THREE.Mesh(box(1.0, 0.5, 0.06, 0, 2.3, 0.08), pole));
      const lamps = [-0.28, 0.28].map((dx) => { g.add(new THREE.Mesh(box(0.34, 0.06, 0.18, dx, 2.52, 0.2), pole)); const l = new THREE.Mesh(new THREE.CircleGeometry(0.14, 14), dim); l.position.set(dx, 2.3, 0.12); g.add(l); return l; });
      [Math.PI / 4, -Math.PI / 4].forEach((rot) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.22), crossbuck); b.position.set(0, 3.05, 0.1); b.rotation.z = rot; g.add(b); });
      // the half barrier: pivots on the post, swings down over the approach lanes to the middle of the road
      const arm = new THREE.Group(); arm.position.set(pp.x, 1.0, pp.z); arm.rotation.order = 'YXZ'; arm.rotation.y = Math.atan2(-rx, -rz); group.add(arm);
      const n6 = 7, seg = (half + 0.3) / n6;
      for (let k = 0; k < n6; k++) arm.add(new THREE.Mesh(box(0.1, 0.12, seg, 0, 0, (k + 0.5) * seg + 0.3), k % 2 ? M(0xc8102e) : M(0xf4f2ea)));
      arm.add(new THREE.Mesh(box(0.3, 0.3, 0.6, 0, 0, -0.35), pole)); // the counterweight
      arm.rotation.x = -Math.PI / 2 * 0.95; // raised
      C.arms.push(arm); C.lights.push(...lamps);
      world.addColliders?.([{ name: 'rail_barrier_post', cx: pp.x, cz: pp.z, hx: 0.25, hz: 0.25, ry: face }]);
      // the stop line across the approach lanes
      const sl0 = A(edge - 3, half / 2), stop = new THREE.Mesh(new THREE.PlaneGeometry(half, 0.4).rotateX(-Math.PI / 2), white);
      stop.position.set(sl0.x, 0.168, sl0.z); stop.rotation.y = Math.atan2(rx, rz) + Math.PI / 2; group.add(stop);
      // the advance warning sign, 45 m out, on the kerb (left out if that is off the end of the road or in another one)
      const ws = A(edge - 45, half + pave * 0.5 + 0.4);
      if (Math.hypot(ws.x, ws.z) < R * 1.02 && !world.onCarriageway?.(ws.x, ws.z, 0.4) && !world.inAnyBuilding?.(ws.x, ws.z, 0.4)) {
        const s = new THREE.Group(); s.position.set(ws.x, 0, ws.z); s.rotation.y = face; group.add(s);
        s.add(new THREE.Mesh(box(0.08, 2.2, 0.08, 0, 1.1, 0), pole));
        const tri = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), warnMat); tri.position.set(0, 2.55, 0.05); s.add(tri);
        world.addColliders?.([{ name: 'road_sign', cx: ws.x, cz: ws.z, hx: 0.1, hz: 0.1, ry: face }]);
      }
    });
    crossings.push(C);
  });

  // ---------- the station ----------
  let station = null;
  const st0 = (world.stations || []).filter((s) => s.kind !== 'subway').sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0];
  if (st0) {
    // the nearest point on any line to the real station, kept inside the area (toward the station's side of it)
    let best = null;
    rails.forEach((rl, ri) => { const cum = measure(rl.pts), L = cum[cum.length - 1]; for (let s = 0; s <= L; s += 2) { const p = at(rl.pts, cum, s), r = Math.hypot(p.x, p.z); if (r > R * 0.8) continue; const d = Math.hypot(p.x - st0.x, p.z - st0.z); if (!best || d < best.d) best = { d, ri, s, p: { ...p } }; } });
    if (best) {
      const { p } = best, ry = Math.atan2(p.dx, p.dz), nx = -p.dz, nz = p.dx, PL = 56, PW = 4.2;
      // the side of the line that is free (no road, no building)
      const sideOk = (sd) => { for (let u = -PL / 2; u <= PL / 2; u += 4) { const x = p.x + p.dx * u + nx * sd * (2.2 + PW / 2), z = p.z + p.dz * u + nz * sd * (2.2 + PW / 2); if (world.onCarriageway?.(x, z, 0.3) || world.inAnyBuilding?.(x, z, 0.3)) return false; } return true; };
      const sd = sideOk(1) ? 1 : sideOk(-1) ? -1 : 1;
      const cx = p.x + nx * sd * (2.2 + PW / 2), cz = p.z + nz * sd * (2.2 + PW / 2);
      const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry; group.add(g);
      g.add(new THREE.Mesh(box(PW, 0.45, PL, 0, 0.225, 0), M(0xd8d1c2)));
      g.add(new THREE.Mesh(box(0.35, 0.02, PL, -sd * (PW / 2 - 0.3), 0.46, 0), M(0xf2c418))); // the yellow line at the edge
      // the canopy on posts, the name boards at both ends
      for (let u = -PL / 2 + 6; u <= PL / 2 - 6; u += 8) g.add(new THREE.Mesh(box(0.14, 3.2, 0.14, sd * 0.6, 2.05, u), M(0x55605a)));
      g.add(new THREE.Mesh(box(PW + 0.6, 0.18, PL - 8, sd * 0.3, 3.7, 0), M(0x1f7a45)));
      const name = (st0.name || cityName || 'Station').toUpperCase();
      const nameMat = new THREE.MeshBasicMaterial({ map: signTexture(name, { bg: '#1f7a45', fg: '#ffffff', w: 900, h: 220, sub: rails[best.ri].name || 'Railway station' }), color: 0xeeeeee });
      [-PL / 2 + 3, PL / 2 - 3].forEach((u) => { const s2 = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.83), nameMat); s2.position.set(sd * 0.6, 3.05, u); s2.rotation.y = -sd * Math.PI / 2; g.add(s2); const b2 = s2.clone(); b2.rotation.y = sd * Math.PI / 2; g.add(b2); });
      for (let u = -PL / 2 + 10; u <= PL / 2 - 10; u += 12) g.add(new THREE.Mesh(box(0.5, 0.45, 1.8, sd * (PW / 2 - 0.9), 0.675, u), M(0x8a6446))); // benches
      world.addWalkables?.([{ cx, cz, hx: PW / 2, hz: PL / 2, ry, top: 0.45 }]);
      world.claim?.({ kind: 'station', cx, cz, hx: PW / 2 + 0.5, hz: PL / 2 + 1, ry });
      station = { x: cx, z: cz, px: p.x, pz: p.z, rail: best.ri, s: best.s, name: st0.name || 'the station', real: best.d < 30 };
      const front = { x: cx + nx * sd * (PW / 2 + 1.2), z: cz + nz * sd * (PW / 2 + 1.2) };
      const lineName = rails[best.ri].name || 'the railway';
      props?.interact?.push({ id: 'railway:station', label: `${station.name} station`, x: front.x, z: front.z, r: 6, name: `${station.name} station`,
        get line() { return `On ${lineName}. ${nextTrain()} Mind the yellow line.`; } });
      props?.pois?.push({ kind: 'bus', name: `${station.name} station`, x: front.x, z: front.z });
    }
  }

  // ---------- the trains ----------
  // one on each long line; on a double track the second line runs the other way
  const lines = rails.map((rl, ri) => ({ rl, ri, cum: measure(rl.pts) })).filter((l) => l.cum[l.cum.length - 1] > 150);
  const trains = lines.slice(0, 3).map((l, k) => {
    const cars = [{ len: 16, loco: true }, { len: 18 }, { len: 18 }, { len: 18 }];
    const mesh = trainModel(cars); group.add(mesh);
    const total = cars.reduce((a, c) => a + c.len + 1, 0), L = l.cum[l.cum.length - 1];
    // where this line passes the platform (both tracks of a double line stop there), in this train's own distance
    let stopS = null;
    if (station) { let bd = 14; for (let ss = 0; ss <= L; ss += 1) { const pq = at(l.rl.pts, l.cum, ss), d = Math.hypot(pq.x - station.px, pq.z - station.pz); if (d < bd) { bd = d; stopS = ss; } } }
    const dir = k % 2 ? -1 : 1, stopHead = stopS === null ? null : (dir > 0 ? stopS + 30 : (L - stopS) + 30); // the head stops 30 m past the middle of the platform
    return { ...l, mesh, cars, total, L, dir, stopHead, s: -total - k * 120, v: 0, wait: k * 25, stopped: 0, horn: 0, bodies: [] };
  });
  // when the next train stops here, as the board would say it
  function nextTrain() {
    const here = trains.filter((T) => T.stopHead !== null);
    if (!here.length) return 'No trains are due.';
    const eta = Math.min(...here.map((T) => { if (T.stopped > 0) return 0; const to = T.stopHead - T.s; return (T.wait > 0 ? T.wait : 0) + (to > 0 && !T.done ? to / 13 : T.L / 13 + 50); }));
    return eta < 5 ? 'A train is at the platform.' : eta < 60 ? `The next train is due in ${Math.round(eta / 5) * 5} seconds.` : `The next train is due in about ${Math.round(eta / 60)} minute${Math.round(eta / 60) === 1 ? '' : 's'}.`;
  }
  const tmp = {};
  let t = 0;
  function update(dt, player) {
    t += dt;
    const humans = player ? [player] : [];
    trains.forEach((T) => {
      if (T.wait > 0) { T.wait -= dt; T.mesh.visible = false; T.bodies = []; return; }
      T.mesh.visible = true;
      // where the head is along the line, in the direction of travel
      const head = T.dir > 0 ? T.s : T.L - T.s;
      let want = 15;
      // the station: slow, stop at the platform for twenty seconds, then away with a horn
      if (T.stopHead !== null) {
        const toStop = T.stopHead - T.s;
        if (T.stopped > 0) { want = 0; T.stopped -= dt; if (T.stopped <= 0) { T.done = true; if (Math.hypot(T.mesh.position.x - player.x, T.mesh.position.z - player.z) < 160) sfx('trainhorn'); } }
        else if (!T.done && toStop > -3) { want = Math.min(want, Math.sqrt(Math.max(0, 2 * 1.2 * toStop))); if (toStop < 1.5 && T.v < 0.6) { T.stopped = 20; T.v = 0; } } // a braking curve to the stop
      }
      // anyone standing on the track ahead: brake and sound the horn
      at(T.rl.pts, T.cum, head, tmp); const hx = tmp.x, hz = tmp.z, fx = tmp.dx * T.dir, fz = tmp.dz * T.dir;
      for (const h of humans) { const ax = h.x - hx, az = h.z - hz, along = ax * fx + az * fz, across = Math.abs(-ax * fz + az * fx); if (along > 0 && along < 45 && across < 2.2) { want = Math.min(want, Math.max(0, (along - 12) * 0.5)); if ((T.horn -= dt) <= 0) { T.horn = 3; sfx('trainhorn'); } } }
      T.v += Math.max(-2.2 * dt, Math.min(0.8 * dt, want - T.v));
      T.s += T.v * dt;
      // place each car, head first, back along the line
      let back = 0; T.bodies = [];
      T.cars.forEach((c, i) => {
        const mid = T.s - back - c.len / 2, sAlong = T.dir > 0 ? mid : T.L - mid;
        at(T.rl.pts, T.cum, sAlong, tmp);
        const k = T.mesh.userData.cars[i]; k.position.set(tmp.x, 0, tmp.z); k.rotation.y = Math.atan2(tmp.dx * T.dir, tmp.dz * T.dir);
        T.bodies.push({ cx: tmp.x, cz: tmp.z, hx: 1.5, hz: c.len / 2, ry: k.rotation.y });
        back += c.len + 1;
      });
      // gone off the end of the line: wait, then come back the other way
      if (T.s - T.total > T.L + 20) { T.s = -T.total; T.wait = 40 + Math.random() * 30; T.done = false; }
    });
    // the crossings: lamps and bell when a train is about 22 s out (330 m at line speed), barriers down 4 s later, all
    // up again once the last train is 5 m past
    crossings.forEach((C) => {
      const warn = trains.some((T) => T.wait <= 0 && C.tracks.some((tk) => { if (T.ri !== tk.rail) return false; const c = T.dir > 0 ? tk.s : T.L - tk.s; return c > T.s - T.total - 5 && c < T.s + 330; }));
      C.warn = warn ? C.warn + dt : 0;
      const down = warn && C.warn > 4;
      C.arms.forEach((a) => { const target = down ? 0 : -Math.PI / 2 * 0.95; a.rotation.x += Math.max(-dt * 0.3, Math.min(dt * 0.3, target - a.rotation.x)); }); // about 5 s to come down or go up
      const armsUp = C.arms.every((a) => a.rotation.x < -Math.PI / 2 * 0.9);
      C.active = warn || !armsUp;
      const on = C.active && Math.floor(t * 2.4) % 2;
      C.lights.forEach((l, i) => { l.material = C.active && (i % 2 ? on : !on) ? red : dim; });
      // the cars stop at the line from the moment the lamps start until the barriers are up again
      if (C.blocker) C.blocker.on = C.active;
      // the bell, while the lamps flash, to anyone near
      if (C.active && player) { const d = Math.hypot(player.x - C.x, player.z - C.z); if (d < 90 && (C.bell -= dt) <= 0) { C.bell = 0.55; sfx('xbell', { vol: Math.max(0.15, 1 - d / 90) }); } }
    });
  }
  return { group, update, trains, crossings, station, bodies: () => trains.flatMap((T) => T.bodies) };
}
