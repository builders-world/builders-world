import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAvatarModel } from '../onboarding/avatar.js';
import { rigAvatar } from './anim.js';
import { trackDetail } from './quality.js';
import { prepareLook, dress } from './style.js';
import { signTexture } from './props.js';
import { sfx } from './audio.js';
import { bikeModel } from './mobility.js';
import { lookFor } from './style.js';
import { cityInfo } from './cityinfo.js';

// Traffic (world bible 9.3). Cars drive the real road network in the right-hand lane, junction to
// junction, choosing a way at each one. Saloons, hatchbacks, SUVs, pickups, yellow taxis with a TAXI
// sign on the roof, danfos with their route on a board and the conductor's door, kekes, and the blue
// BRT bus. They keep their distance, stop for red lights at the big junctions, give way to people
// in the road and lean on the horn if you stand there. A LASTMA officer directs the busiest junction.

const DRIVE = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'service', 'living_street', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'];
const MAJOR = ['trunk', 'primary', 'secondary', 'tertiary'];
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const wheel = (x, z, r = 0.32) => new THREE.CylinderGeometry(r, r, 0.22, 12).rotateZ(Math.PI / 2).translate(x, r, z);

// ---------- the vehicles: each a body (painted), glass, dark parts, and its extras ----------
const DESIGNS = {
  saloon: { len: 4.4, w: 1.8, speed: 9, body: () => [box(1.8, 0.55, 4.4, 0, 0.6, 0), box(1.62, 0.5, 2.2, 0, 1.12, -0.15)], glass: () => [box(1.64, 0.38, 2.0, 0, 1.13, -0.15)], dark: (L) => [wheel(-0.85, 1.35), wheel(0.85, 1.35), wheel(-0.85, -1.35), wheel(0.85, -1.35), box(1.7, 0.12, 0.05, 0, 0.55, L / 2)] },
  hatch: { len: 3.8, w: 1.7, speed: 9, body: () => [box(1.7, 0.55, 3.8, 0, 0.6, 0), box(1.56, 0.55, 2.1, 0, 1.15, -0.45)], glass: () => [box(1.58, 0.4, 1.9, 0, 1.16, -0.45)], dark: (L) => [wheel(-0.8, 1.15, 0.3), wheel(0.8, 1.15, 0.3), wheel(-0.8, -1.15, 0.3), wheel(0.8, -1.15, 0.3), box(1.6, 0.12, 0.05, 0, 0.55, L / 2)] },
  suv: { len: 4.7, w: 1.95, speed: 9.5, body: () => [box(1.95, 0.75, 4.7, 0, 0.78, 0), box(1.85, 0.62, 3.2, 0, 1.45, -0.35)], glass: () => [box(1.87, 0.45, 3.0, 0, 1.46, -0.35)], dark: (L) => [wheel(-0.92, 1.5, 0.38), wheel(0.92, 1.5, 0.38), wheel(-0.92, -1.5, 0.38), wheel(0.92, -1.5, 0.38), box(1.2, 0.5, 0.1, 0, 1.0, -L / 2 - 0.05)] },
  pickup: { len: 5.1, w: 1.9, speed: 8.5, body: () => [box(1.9, 0.7, 5.1, 0, 0.72, 0), box(1.82, 0.62, 1.9, 0, 1.38, 0.6), box(0.08, 0.4, 2.2, -0.9, 1.25, -1.4), box(0.08, 0.4, 2.2, 0.9, 1.25, -1.4)], glass: () => [box(1.84, 0.42, 1.7, 0, 1.4, 0.6)], dark: (L) => [wheel(-0.9, 1.6, 0.37), wheel(0.9, 1.6, 0.37), wheel(-0.9, -1.6, 0.37), wheel(0.9, -1.6, 0.37)] },
  taxi: { len: 4.4, w: 1.8, speed: 9.5, paint: 0xf2c418, sign: 'TAXI', body: () => DESIGNS.saloon.body(), glass: () => DESIGNS.saloon.glass(), dark: (L) => [...DESIGNS.saloon.dark(L), box(1.82, 0.12, 4.42, 0, 0.82, 0)] },
  danfo: { len: 5.2, w: 2.0, speed: 8, paint: 0xf2c418, sign: 'route', body: () => [box(2.0, 1.75, 5.2, 0, 1.25, 0), box(1.9, 0.8, 0.7, 0, 0.75, 2.8)], glass: () => [box(2.02, 0.55, 3.8, 0, 1.6, -0.4), box(1.7, 0.6, 0.05, 0, 1.55, 2.62)], dark: (L) => [wheel(-0.95, 1.8, 0.36), wheel(0.95, 1.8, 0.36), wheel(-0.95, -1.7, 0.36), wheel(0.95, -1.7, 0.36), box(2.04, 0.12, 5.22, 0, 0.95, 0), box(2.04, 0.12, 5.22, 0, 1.35, 0), box(1.8, 0.08, 3.6, 0, 2.18, -0.3)] },
  keke: { len: 2.7, w: 1.35, speed: 6.5, paint: 0xf2c418, body: () => [box(1.3, 1.1, 1.7, 0, 1.0, -0.4), box(0.5, 0.6, 0.9, 0, 0.6, 0.85), box(1.4, 0.08, 2.0, 0, 1.6, -0.2)], glass: () => [box(1.1, 0.5, 0.05, 0, 1.2, 0.48)], dark: () => [wheel(-0.6, -0.8, 0.27), wheel(0.6, -0.8, 0.27), wheel(0, 1.1, 0.27), box(0.04, 0.9, 0.04, -0.62, 1.15, 0.45), box(0.04, 0.9, 0.04, 0.62, 1.15, 0.45)] },
  brt: { len: 11, w: 2.5, speed: 8, paint: 0x2f5fb0, sign: 'BRT', body: () => [box(2.5, 2.4, 11, 0, 1.55, 0)], glass: () => [box(2.52, 0.9, 9.5, 0, 2.05, -0.3), box(2.2, 1.1, 0.05, 0, 1.9, 5.51)], dark: () => [wheel(-1.15, 3.8, 0.48), wheel(1.15, 3.8, 0.48), wheel(-1.15, -3.5, 0.48), wheel(1.15, -3.5, 0.48), box(2.54, 0.25, 11.02, 0, 0.9, 0)] },
};
const PAINT = [0xf7f3ea, 0x2b2b2e, 0xb8bec4, 0x9b2f2f, 0x2f4f7f, 0x3f6b4b, 0x6b4a8a, 0xc9702a, 0x8a8f96];
DESIGNS.cycle = { len: 1.8, w: 0.7, speed: 4.6 };
const MIX = ['saloon', 'saloon', 'hatch', 'suv', 'pickup', 'taxi', 'taxi', 'danfo', 'danfo', 'danfo', 'keke', 'keke', 'saloon', 'suv', 'hatch', 'brt'];
const ROUTES = ['YABA - OSHODI', 'CMS - OBALENDE', 'OJUELEGBA', 'IKEJA ALONG', 'MILE 12', 'AJAH', 'UNILAG GATE', 'TBS - CMS'];
const geoCache = {};

export function vehicle(kind, i) {
  if (kind === 'cycle') { // a bike and its rider, pedalling (the rider is posed each frame)
    const g = new THREE.Group(), bike = bikeModel([0x2a9d94, 0xe46f4f, 0x3a4f7a][i % 3]); g.add(bike);
    const av = createAvatarModel({ color: '#888', style: 'tee' }); prepareLook(av.root); const rig = rigAvatar(av.root); dress(av.root, lookFor(`cyclist-${i}`, { fem: i % 2 === 1, tier: 2 }), rig); av.root.position.y = 0.32; av.root.position.z = -0.08; g.add(av.root);
    g.userData = { kind, D: DESIGNS.cycle, tail: new THREE.MeshBasicMaterial(), bike, rig };
    return g;
  }
  const D = DESIGNS[kind], g = new THREE.Group();
  geoCache[kind] = geoCache[kind] || { body: mergeGeometries(D.body()), glass: mergeGeometries(D.glass()), dark: mergeGeometries(D.dark(D.len)) };
  const G = geoCache[kind];
  // each city's liveries (cityinfo.js): matatus in Nairobi, trotros in Accra, green and white taxis in Abuja
  const T = cityInfo().traffic, own = T?.paint?.[kind];
  g.add(new THREE.Mesh(G.body, new THREE.MeshStandardMaterial({ color: own ? own[i % own.length] : D.paint ?? PAINT[i % PAINT.length], roughness: 0.45, metalness: 0.25 })));
  g.add(new THREE.Mesh(G.glass, new THREE.MeshStandardMaterial({ color: 0x24323b, roughness: 0.15, metalness: 0.4 })));
  g.add(new THREE.Mesh(G.dark, new THREE.MeshStandardMaterial({ color: 0x161618, roughness: 0.8 })));
  // lights: white at the front, red at the back (brighter when braking)
  const tail = new THREE.MeshBasicMaterial({ color: 0x701010 });
  [-1, 1].forEach((s) => {
    const f = new THREE.Mesh(box(0.28, 0.14, 0.04), new THREE.MeshBasicMaterial({ color: 0xfff2c8 })); f.position.set(s * (D.w / 2 - 0.25), kind === 'brt' ? 0.9 : 0.72, D.len / 2 + 0.02); g.add(f);
    const r = new THREE.Mesh(box(0.28, 0.14, 0.04), tail); r.position.set(s * (D.w / 2 - 0.25), kind === 'brt' ? 0.9 : 0.72, -D.len / 2 - 0.02); g.add(r);
  });
  // roof signs: TAXI on its little box, the danfo's route board, the BRT's number
  if (D.sign) {
    const routes = T?.routes || ROUTES, text = D.sign === 'route' ? routes[i % routes.length] : D.sign === 'BRT' ? (T?.brt || 'BRT  CMS - IKORODU') : 'TAXI';
    const tex = signTexture(text, { bg: D.sign === 'TAXI' ? '#1d1d1d' : D.sign === 'BRT' ? '#14306b' : '#f7efdc', fg: D.sign === 'TAXI' ? '#f2c418' : D.sign === 'BRT' ? '#ffffff' : '#1d1d1d', w: 512, h: 120 });
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xdddddd });
    const w = D.sign === 'TAXI' ? 0.6 : D.sign === 'BRT' ? 2.0 : 1.7, h = D.sign === 'TAXI' ? 0.2 : 0.38, y = D.sign === 'TAXI' ? 1.52 : D.sign === 'BRT' ? 2.55 : 2.42, z = D.sign === 'TAXI' ? -0.15 : D.sign === 'BRT' ? D.len / 2 + 0.03 : 1.1;
    if (D.sign === 'TAXI') g.add(new THREE.Mesh(box(0.66, 0.24, 0.3, 0, y, z), new THREE.MeshStandardMaterial({ color: 0xf2c418, roughness: 0.5 })));
    [1, -1].forEach((sd) => { if (D.sign === 'BRT' && sd < 0) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(0, y, z + sd * (D.sign === 'TAXI' ? 0.16 : 0.01)); if (sd < 0) m.rotation.y = Math.PI; g.add(m); });
  }
  g.userData = { kind, D, tail };
  return g;
}

// the offset of the cycle lane's middle on a road segment, or 0 where there is none
// (only where world.js painted one on that side: the driver's right going from point a to point b)
const bikeLaneAt = (r, a, b) => {
  const C = r.fit.cycle; if (!C) return 0;
  const { pts, nrm, half } = r.fit, dx = pts[b][0] - pts[a][0], dz = pts[b][1] - pts[a][1], i = Math.max(a, b);
  const sg = (-dz * nrm[i][0] + dx * nrm[i][1] > 0 ? 1 : -1) * (cityInfo().drive === 'left' ? -1 : 1);
  return C[sg].has(a) && C[sg].has(b) ? Math.min(half[a], half[b]) - 1.225 : 0;
};

// a traffic official in the city's own uniform (cityinfo.js officials)
export function officialLook(O = {}, i = 0) {
  return { body: i % 3 === 2 ? 'f' : 'm', skin: ['#7a4a2e', '#5c3a24', '#8a5a3a'][i % 3], hair: 'fila', hairColor: O.cap || '#1b1714', top: O.jacket ? 'jacket' : 'tee', topColor: O.top || '#efe3c4',
    bottom: 'trousers', bottomColor: O.bottom || '#6b1d2a', shoes: 'boots', shoeColor: '#1d2028', acc: [] };
}

export function createTraffic({ world, scene, reduced, lowQuality, getPeople, flyover }) {
  const group = new THREE.Group(); group.name = 'traffic'; scene.add(group);
  // ---------- the lane graph (Elvis, 11 October 2026: "path tracing for vehicles so vehicles know what lane to drive on") ----------
  // Every road is split at its junctions into links; each link gives one directed way per direction of travel (one
  // for a one-way street). A way has lanes: from OSM's lanes tags where mapped, else from its width; on a two-way
  // street they fill the driver's half, on a one-way street the whole carriageway, and a painted cycle lane stays
  // the cyclists'. Lane centres follow the road's own curve (mitred at every bend), stop short of each junction
  // at the edge of the crossing road, and smooth turning paths join them across it: near-side turns from the kerb
  // lane, far-side turns from the inner lane, straight on lane to lane. Cars change lane ahead of their turn. All
  // of it mirrors for the cities that keep left (Nairobi).
  const HAND = cityInfo().drive === 'left' ? -1 : 1;
  const nodes = [], cell = new Map(), NG = 2;
  const nodeAt = (x, z) => {
    const gx = Math.round(x / NG), gz = Math.round(z / NG);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const id of cell.get(`${gx + a},${gz + b}`) || []) if (Math.hypot(nodes[id].x - x, nodes[id].z - z) < 1.6) return id;
    nodes.push({ x, z, out: [], in: [], links: [], deg: 0 });
    const k = `${gx},${gz}`; if (!cell.has(k)) cell.set(k, []); cell.get(k).push(nodes.length - 1);
    return nodes.length - 1;
  };
  const droads = world.roads.filter((r) => r.fit && DRIVE.includes(r.cls) && r.fit.pts.length > 1);
  const vids = droads.map((r) => r.fit.pts.map((p) => nodeAt(p[0], p[1])));
  const roadsAt = new Map(); vids.forEach((L, ri) => L.forEach((id) => { if (!roadsAt.has(id)) roadsAt.set(id, new Set()); roadsAt.get(id).add(ri); }));
  const links = [];
  droads.forEach((r, ri) => {
    const L = vids[ri]; let j0 = 0;
    for (let i = 1; i < L.length; i++) {
      if (i < L.length - 1 && roadsAt.get(L[i]).size < 2) continue;
      if (L[i] !== L[j0]) links.push({ r, i0: j0, i1: i, a: L[j0], b: L[i] });
      j0 = i;
    }
  });
  const ways = [];
  const lanesFor = (r, perDir, oneway, dir) => (r.lanesF && r.lanesB ? (dir > 0 ? r.lanesF : r.lanesB) : r.lanes ? (oneway ? r.lanes : Math.max(1, Math.floor(r.lanes / 2))) : Math.max(1, Math.min(3, Math.floor(perDir / 3.2 + 0.2))));
  function makeWay(lk, dir) {
    const { r } = lk, idx = []; for (let i = lk.i0; i <= lk.i1; i++) idx.push(i); if (dir < 0) idx.reverse();
    const P = idx.map((i) => r.fit.pts[i]), H = idx.map((i) => r.fit.half[i]), n = P.length, cum = [0], dirs = [];
    for (let i = 1; i < n; i++) { const dx = P[i][0] - P[i - 1][0], dz = P[i][1] - P[i - 1][1], L = Math.hypot(dx, dz) || 1e-6; cum.push(cum[i - 1] + L); dirs.push([dx / L, dz / L]); }
    // the kerb-side normal at each point, mitred so a lane keeps its distance from the middle round a bend
    const M = P.map((_, i) => { const a = dirs[Math.max(0, i - 1)], b = dirs[Math.min(dirs.length - 1, i)]; let nx = -(a[1] + b[1]), nz = a[0] + b[0]; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; const k = Math.max(0.5, -nx * a[1] + nz * a[0]); return [(nx / k) * HAND, (nz / k) * HAND]; });
    const oneway = !!r.oneway, avgH = H.reduce((t, h) => t + h, 0) / n, bike = bikeLaneAt(r, idx[0], idx[1]);
    // (no lane narrower than 2.9 m, so a bus fits beside a car: a road mapped with more lanes than fit gets fewer)
    const roomy = Math.max(1, Math.floor(((oneway ? 2 * avgH : avgH) - 0.55 - (bike ? 2.45 : 0)) / 2.9));
    const lanes = Math.min(lanesFor(r, oneway ? 2 * avgH : avgH, oneway, dir), roomy);
    const inner = H.map((h) => (oneway ? -h + 0.35 : 0.2)), outer = H.map((h, i) => Math.max(inner[i] + 2.2 * lanes, h - 0.35 - (bike ? 2.45 : 0)));
    const w = { id: ways.length, road: r, link: lk, dir, from: dir > 0 ? lk.a : lk.b, to: dir > 0 ? lk.b : lk.a, P, H, M, cum, dirs, L: cum[n - 1], n: lanes, inner, outer, bike, major: MAJOR.includes(r.cls), lane: Math.max(1.5, Math.min(3.4, avgH / 2)), next: [], xs: [], s0: 0, s1: cum[n - 1] };
    ways.push(w); return w;
  }
  links.forEach((lk) => {
    lk.f = makeWay(lk, 1); if (!lk.r.oneway) lk.b2 = makeWay(lk, -1);
    nodes[lk.a].deg++; nodes[lk.b].deg++;
    const lane = lk.f.lane, major = MAJOR.includes(lk.r.cls);
    nodes[lk.a].links.push({ to: lk.b, lane, major, road: lk.r, L: lk.f.L }); nodes[lk.b].links.push({ to: lk.a, lane, major, road: lk.r, L: lk.f.L });
  });
  ways.forEach((w) => { nodes[w.from].out.push(w); nodes[w.to].in.push(w); });
  const R0 = world.radius;
  nodes.forEach((N) => { N.edge = N.deg <= 1 && Math.hypot(N.x - world.spawn.x, N.z - world.spawn.z) > R0 * 0.9; });
  // where along a way, and how far to the kerb side of its middle
  const segAt = (w, s) => { const c = w.cum; let i = 0; while (i < c.length - 2 && c[i + 1] < s) i++; return i; };
  const laneOff = (w, k, s) => { const i = segAt(w, s), u = Math.max(0, Math.min(1, (s - w.cum[i]) / ((w.cum[i + 1] - w.cum[i]) || 1e-6))), f = (k + 0.5) / w.n; const a = w.inner[i] + (w.outer[i] - w.inner[i]) * f, b = w.inner[i + 1] + (w.outer[i + 1] - w.inner[i + 1]) * f; return a + (b - a) * u; };
  const wayPos = (w, s, off, out = {}) => {
    const i = segAt(w, s), u = Math.max(0, Math.min(1, (s - w.cum[i]) / ((w.cum[i + 1] - w.cum[i]) || 1e-6))), A = w.P[i], B = w.P[i + 1], MA = w.M[i], MB = w.M[i + 1];
    out.x = A[0] + (B[0] - A[0]) * u + (MA[0] + (MB[0] - MA[0]) * u) * off; out.z = A[1] + (B[1] - A[1]) * u + (MA[1] + (MB[1] - MA[1]) * u) * off;
    out.dx = w.dirs[i][0]; out.dz = w.dirs[i][1]; return out;
  };
  // lanes stop at the edge of the road they meet (just short of a bend where a road simply carries on)
  ways.forEach((w) => {
    const back = (nid) => { const N = nodes[nid]; if (N.deg <= 1) return N.edge ? 1.5 : 5; /* a dead end: room to turn round on the road */ if (N.deg === 2) return 0.6; let m = 0; [...N.in, ...N.out].forEach((o) => { if (o.link !== w.link) m = Math.max(m, o.to === nid ? o.H[o.H.length - 1] : o.H[0]); }); return m + 1.2; };
    let a = back(w.from), b = back(w.to); const room = Math.max(0.2, w.L - 0.4);
    if (a + b > room) { const k = room / (a + b); a *= k; b *= k; }
    w.s0 = a; w.s1 = Math.max(a, w.L - b);
  });
  // the paths across each junction: a smooth curve from the end of a lane in to the start of a lane out
  const curve = (p0, t0, p3, t3, c) => {
    const p1 = [p0[0] + t0[0] * c, p0[1] + t0[1] * c], p2 = [p3[0] - t3[0] * c, p3[1] - t3[1] * c], pts = [], cum = [0], N = 10;
    for (let j = 0; j <= N; j++) { const t = j / N, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, d = 3 * (1 - t) * t * t, e = t ** 3; pts.push([a * p0[0] + b * p1[0] + d * p2[0] + e * p3[0], a * p0[1] + b * p1[1] + d * p2[1] + e * p3[1]]); if (j) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1])); }
    return { pts, cum, L: cum[N] };
  };
  const CONNS = [];
  nodes.forEach((N, v) => {
    N.in.forEach((a) => {
      const onward = N.out.filter((b) => b.link !== a.link), opts = onward.length ? onward : N.out; // turning back only where the road ends
      opts.forEach((b) => {
        const ta = a.dirs[a.dirs.length - 1], tb = b.dirs[0], cross = ta[0] * tb[1] - ta[1] * tb[0], ang = Math.atan2(cross, ta[0] * tb[0] + ta[1] * tb[1]);
        let pairs;
        if (Math.abs(ang) > 2.6) pairs = [[0, 0]];
        else if (Math.abs(ang) < 0.6) { pairs = []; for (let k = 0; k < a.n; k++) pairs.push([k, Math.min(k, b.n - 1)]); for (let m = a.n; m < b.n; m++) pairs.push([a.n - 1, m]); }
        else pairs = cross * HAND > 0 ? [[a.n - 1, b.n - 1]] : [[0, 0]]; // near side from the kerb lane, far side from the inner lane
        const turn = { b, ang, conns: [], speed: Math.abs(ang) < 0.35 ? 99 : Math.abs(ang) > 2.6 ? 2.5 : 4 + 4 * (1 - Math.min(1, Math.abs(ang) / 1.6)) };
        pairs.forEach(([k, m]) => {
          const pa = wayPos(a, a.s1, laneOff(a, k, a.s1)), pb = wayPos(b, b.s0, laneOff(b, m, b.s0)), d = Math.hypot(pb.x - pa.x, pb.z - pa.z);
          const cn = curve([pa.x, pa.z], [pa.dx, pa.dz], [pb.x, pb.z], [pb.dx, pb.dz], Math.abs(ang) > 2.6 ? Math.max(2.4, d * 0.7) : Math.max(0.3, d * 0.42));
          Object.assign(cn, { id: CONNS.length, from: a, k, to: b, m, node: v, ang }); CONNS.push(cn);
          turn.conns.push(cn);
        });
        a.next.push(turn);
      });
    });
  });
  // right of way at a junction without lights: two paths across it conflict where they cross or come within a car's
  // width of each other, unless they leave from the same lane (the car ahead is simply followed)
  const conflictMemo = new Map();
  function conflicts(p, q) {
    if (!p || !q || p === q || (p.from === q.from && p.k === q.k)) return false;
    const key = p.id < q.id ? `${p.id}:${q.id}` : `${q.id}:${p.id}`;
    if (conflictMemo.has(key)) return conflictMemo.get(key);
    let hit = false;
    for (let i = 0; i < p.pts.length && !hit; i++) for (let j = 0; j < q.pts.length; j++) if (Math.hypot(p.pts[i][0] - q.pts[j][0], p.pts[i][1] - q.pts[j][1]) < 2.1) { hit = true; break; }
    conflictMemo.set(key, hit); return hit;
  }
  const planned = (c) => (c.turn ? c.turn.conns.find((q) => q.k === c.kT) || c.turn.conns[0] : null);
  // which lane a car is in by where it is across its way (a lane change part done counts as the lane it is nearest)
  const laneNow = (c) => { let best = 0, bd = Infinity; for (let k = 0; k < c.w.n; k++) { const d = Math.abs(laneOff(c.w, k, c.s) - c.off); if (d < bd) { bd = d; best = k; } } return best; };
  // the zebras on each way, by distance along it (cars give way to anyone on one)
  const XINGS = world.crossings || [];
  XINGS.forEach((xg) => {
    const rd = [xg.nz, -xg.nx];
    ways.forEach((w) => {
      for (let i = 0; i < w.dirs.length; i++) {
        const A = w.P[i], d = w.dirs[i], ax = xg.x - A[0], az = xg.z - A[1], u = ax * d[0] + az * d[1], seg = w.cum[i + 1] - w.cum[i];
        if (u < -0.5 || u > seg + 0.5) continue;
        if (Math.abs(-ax * d[1] + az * d[0]) < 2 && Math.abs(d[0] * rd[0] + d[1] * rd[1]) > 0.6) { w.xs.push({ s: w.cum[i] + u, x: xg }); break; }
      }
    });
  });
  const usable = nodes.map((n, i) => i).filter((i) => nodes[i].out.length);
  // ---------- traffic lights at the big junctions ----------
  const junctions = nodes.map((n, i) => ({ n, i })).filter(({ n }) => n.links.length >= 3 && n.links.filter((e) => e.major).length >= 2 && Math.hypot(n.x - world.spawn.x, n.z - world.spawn.z) < world.radius * 0.9);
  const signals = [], poles = [];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.6 }), off = new THREE.MeshStandardMaterial({ color: 0x1b1d1f, roughness: 0.5 });
  const lit = { red: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.25, 0.2) }), amber: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.4, 0.2) }), green: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.2, 0.6) }) };
  junctions.slice(0, lowQuality ? 4 : 8).forEach(({ n, i }, k) => {
    // two phases by the direction of approach: the main axis, then the cross street
    const axis = Math.atan2(nodes[n.links[0].to].x - n.x, nodes[n.links[0].to].z - n.z);
    const sig = { i, x: n.x, z: n.z, axis, t: k * 3.3, heads: [] };
    n.links.forEach((e) => {
      const o = nodes[e.to], dx = o.x - n.x, dz = o.z - n.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
      // on the approach's kerb, a few metres back from the middle of the junction
      // the approaching driver's right is (uz, -ux): step out that way until clear of the carriageway
      const back = Math.min(L * 0.5, 7);
      let off = e.lane + 1.5, px = 0, pz = 0;
      const hs = cityInfo().drive === 'left' ? -1 : 1;
      for (; off < e.lane * 3 + 6; off += 0.5) { px = n.x + ux * back + uz * off * hs; pz = n.z + uz * back - ux * off * hs; if (!world.onCarriageway?.(px, pz, 0.6)) break; }
      if (world.onCarriageway?.(px, pz, 0.4) || world.inAnyBuilding?.(px, pz, 0.4)) return;
      if (poles.some((q) => Math.hypot(q.x - px, q.z - pz) < 3)) return; // one pole per corner
      poles.push({ x: px, z: pz });
      const g = new THREE.Group(); g.position.set(px, 0, pz); g.rotation.y = Math.atan2(ux, uz); group.add(g);
      g.add(new THREE.Mesh(box(0.12, 3.2, 0.12, 0, 1.6, 0), poleMat), new THREE.Mesh(box(0.36, 0.95, 0.28, 0, 3.4, 0), poleMat));
      const lamps = ['red', 'amber', 'green'].map((c, j) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), off); m.position.set(0, 3.72 - j * 0.31, 0.15); g.add(m); return m; });
      const phase = Math.abs(Math.sin(Math.atan2(ux, uz) - axis)) < 0.5 ? 0 : 1;
      sig.heads.push({ lamps, phase });
      world.addColliders?.([{ name: 'signal_pole', cx: px, cz: pz, hx: 0.1, hz: 0.1, ry: 0 }]);
    });
    signals.push(sig);
  });
  const CYCLE = 22; // 9 s green, 2 amber each way, 0.5 all red
  const stateOf = (sig, phase) => { const t = (sig.t % CYCLE) - (phase ? CYCLE / 2 : 0), u = ((t % CYCLE) + CYCLE) % CYCLE; return u < 8.5 ? 'green' : u < 10.5 ? 'amber' : 'red'; };
  const sigAt = new Map(signals.map((s) => [s.i, s]));

  // ---------- pedestrian signals on the zebras at those junctions ----------
  // Each zebra near a signalled junction gets a head on both kerbs, facing the people about to cross. A
  // zebra crosses one road; you may walk while that road's cars are held at red: the walking figure
  // from a second after their red, the flashing hand for the last three seconds of it, the red hand
  // otherwise. People wait at the kerb unless the figure is lit (world.pedWait).
  const pedFace = (kind) => {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 96; const g = cv.getContext('2d');
    g.fillStyle = '#141516'; g.fillRect(0, 0, 64, 96);
    g.fillStyle = kind === 'walk' ? '#4dff9a' : kind === 'dark' ? '#2a1a14' : '#ff4a36';
    if (kind === 'walk') { // the walking figure
      g.beginPath(); g.arc(34, 22, 7, 0, 7); g.fill(); g.lineWidth = 7; g.lineCap = 'round'; g.strokeStyle = g.fillStyle;
      g.beginPath(); g.moveTo(32, 32); g.lineTo(29, 56); g.lineTo(18, 78); g.moveTo(29, 56); g.lineTo(42, 78); g.moveTo(31, 38); g.lineTo(20, 52); g.moveTo(31, 38); g.lineTo(44, 50); g.stroke();
    } else { // the raised hand
      g.beginPath(); g.roundRect(20, 40, 26, 34, 8); g.fill();
      [22, 29, 36, 43].forEach((x, k) => { g.beginPath(); g.roundRect(x - 2.5, 16 + (k === 0 || k === 3 ? 8 : 0), 6, 30, 3); g.fill(); });
      g.beginPath(); g.roundRect(8, 46, 16, 7, 3); g.fill();
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: tex, color: kind === 'dark' ? 0xffffff : new THREE.Color(1.6, 1.6, 1.6) });
  };
  const PEDM = { walk: pedFace('walk'), stop: pedFace('stop'), dark: pedFace('dark') };
  const peds = [], pelicans = [];
  // a pelican crossing: car lights on the near-side kerb before the zebra for each way of travel; green for the cars
  // until someone waits, then amber, red, the walking figure for 7 s and the flashing hand for 3, and at least 12 s
  // of green before the next turn
  function pelican(k) {
    const P = { k, x: k.x, z: k.z, st: 'green', t: 12 * Math.random(), ped: 'stop', carRed: false, heads: [] };
    const rd = [k.nz, -k.nx];
    [1, -1].forEach((sd) => {
      const dx = rd[0] * sd, dz = rd[1] * sd, rx = -dz * HAND, rz = dx * HAND; // the driver's heading, and their kerb side
      let px = 0, pz = 0;
      for (let o = k.hw + 0.9; o < k.hw + 5; o += 0.3) { px = k.x - dx * 3.2 + rx * o; pz = k.z - dz * 3.2 + rz * o; if (!world.onCarriageway?.(px, pz, 0.4)) break; }
      if (world.onCarriageway?.(px, pz, 0.3) || world.inAnyBuilding?.(px, pz, 0.3) || poles.some((q) => Math.hypot(q.x - px, q.z - pz) < 1.2)) return;
      poles.push({ x: px, z: pz });
      const g = new THREE.Group(); g.position.set(px, 0, pz); g.rotation.y = Math.atan2(-dx, -dz); group.add(g); // facing the cars coming
      g.add(new THREE.Mesh(box(0.11, 2.9, 0.11, 0, 1.45, 0), poleMat), new THREE.Mesh(box(0.34, 0.92, 0.26, 0, 3.1, 0), poleMat));
      const lamps = ['red', 'amber', 'green'].map((c, j) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), off); m.position.set(0, 3.42 - j * 0.3, 0.14); g.add(m); return m; });
      P.heads.push(lamps);
      world.addColliders?.([{ name: 'signal_pole', cx: px, cz: pz, hx: 0.1, hz: 0.1, ry: 0 }]);
    });
    pelicans.push(P);
    return P;
  }
  const PEL = { amber: 2.5, allred: 1, walk: 7, flash: 3 };
  function pelicanTick(P, dt, humans) {
    P.t += dt;
    const go = (st) => { P.st = st; P.t = 0; };
    if (P.st === 'green') { if (P.t > 12 && humans.some((h) => Math.hypot(h.x - P.x, h.z - P.z) < P.k.hw + 3.5)) go('amber'); }
    else if (P.t > PEL[P.st]) go({ amber: 'allred', allred: 'walk', walk: 'flash', flash: 'green' }[P.st]);
    P.carRed = P.st !== 'green';
    P.ped = P.st === 'walk' ? 'walk' : P.st === 'flash' ? 'flash' : 'stop';
    const lit3 = P.st === 'green' ? 'green' : P.st === 'amber' ? 'amber' : 'red';
    P.heads.forEach((lamps) => lamps.forEach((m, j) => { m.material = ['red', 'amber', 'green'][j] === lit3 ? lit[lit3] : off; }));
  }
  (world.crossings || []).forEach((k) => {
    // a zebra belongs to the nearest signalled junction within 26 m (two junctions close together must
    // not both claim it, each with its own idea of when you may cross)
    let sig = null, best = 26;
    signals.forEach((g) => { const d = Math.hypot(k.x - g.x, k.z - g.z); if (d < best) { best = d; sig = g; } });
    // every other zebra on a major road gets its own lights, the hand and the walking figure (Elvis, 11 October
    // 2026: "introduce it for every pedestrian walk path on major roads", in every city): a pelican crossing that
    // holds the cars when someone is waiting to cross
    const solo = !sig && MAJOR.includes(k.cls) ? pelican(k) : null;
    if (!sig && !solo) return;
    const phase = sig ? (Math.abs(Math.sin(Math.atan2(k.nz, -k.nx) - sig.axis)) < 0.5 ? 0 : 1) : 0; // the cars this zebra crosses
    const ped = { sig, solo, phase, x: k.x, z: k.z, nx: k.nx, nz: k.nz, hw: k.hw, faces: [], state: 'stop' };
    k.ped = ped;
    [-1, 1].forEach((s) => {
      let off = k.hw + 1.2, px = 0, pz = 0;
      for (; off < k.hw + 5; off += 0.3) { px = k.x + k.nx * s * off - k.nz * 2.1; pz = k.z + k.nz * s * off + k.nx * 2.1; if (!world.onCarriageway?.(px, pz, 0.35)) break; }
      if (world.onCarriageway?.(px, pz, 0.3) || world.inAnyBuilding?.(px, pz, 0.3) || poles.some((q) => Math.hypot(q.x - px, q.z - pz) < 1)) return;
      const g = new THREE.Group(); g.position.set(px, 0, pz); g.rotation.y = Math.atan2(-k.nx * s, -k.nz * s); group.add(g); // facing across the road
      g.add(new THREE.Mesh(box(0.1, 2.5, 0.1, 0, 1.25, 0), poleMat), new THREE.Mesh(box(0.34, 0.5, 0.2, 0, 2.45, 0), poleMat));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.39), PEDM.stop); face.position.set(0, 2.45, 0.105); g.add(face); ped.faces.push(face);
      world.addColliders?.([{ name: 'ped_signal', cx: px, cz: pz, hx: 0.08, hz: 0.08, ry: 0 }]);
    });
    if (ped.faces.length) peds.push(ped);
  });
  const pedState = (ped) => { if (ped.solo) return ped.solo.ped; const u = (((ped.sig.t % CYCLE) - (ped.phase ? CYCLE / 2 : 0)) % CYCLE + CYCLE) % CYCLE; return u >= 11 && u < 18.5 ? 'walk' : u >= 18.5 && u < 21.5 ? 'flash' : 'stop'; };
  const tx = (k) => k.nz, tz = (k) => -k.nx;
  // about to step off the kerb onto a signalled zebra whose figure is not lit: wait
  world.pedWait = (pos, dx, dz) => {
    const ax = pos.x + dx * 0.9, az = pos.z + dz * 0.9;
    // the few signalled zebras first; only near one is the road itself looked up
    // a zebra you are walking across (heading along its stripes), out to 9 m past them: on a dual
    // carriageway the other half is crossed on the same signal
    const ped = peds.find((k) => { const ox = ax - k.x, oz = az - k.z; return Math.abs(dx * k.nx + dz * k.nz) > 0.6 && Math.abs(ox * k.nx + oz * k.nz) < k.hw + 9 && Math.abs(ox * tx(k) + oz * tz(k)) < 2.4; });
    if (!ped || ped.state === 'walk') return false;
    return !!world.onCarriageway?.(ax, az, 0) && !world.onCarriageway?.(pos.x, pos.z, -0.2);
  };

  // ---------- the traffic officer at the busiest junction (LASTMA in Lagos, the traffic police in Nairobi...) ----------
  let warden = null;
  const busiest = junctions.sort((a, b) => b.n.links.length - a.n.links.length)[0];
  if (busiest) {
    const av = createAvatarModel({ color: '#f2c418', style: 'tee' }); prepareLook(av.root); const rig = rigAvatar(av.root);
    dress(av.root, officialLook(cityInfo().officials, 0), rig); // the city's own traffic agency (cityinfo.js)
    // on a little island at the corner, out of the cars' way: try each road out of the junction, both sides, until the island is clear of every carriageway
    let px = busiest.n.x, pz = busiest.n.z, found = false;
    for (const ed of busiest.n.links) {
      const q = nodes[ed.to], Lq = Math.hypot(q.x - busiest.n.x, q.z - busiest.n.z) || 1;
      for (const sd of [1, -1]) {
        for (let off = ed.lane + 3; off < ed.lane * 3 + 9 && !found; off += 0.5) {
          const tx = busiest.n.x + ((q.z - busiest.n.z) / Lq) * off * sd, tz = busiest.n.z - ((q.x - busiest.n.x) / Lq) * off * sd;
          if (!world.onCarriageway?.(tx, tz, 1.4)) { px = tx; pz = tz; found = true; }
        }
        if (found) break;
      }
      if (found) break;
    }
    if (found) {
      av.root.position.set(px, 0.15, pz); av.root.rotation.y = Math.atan2(busiest.n.x - px, busiest.n.z - pz); group.add(av.root);
      const isle = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.15, 14).translate(0, 0.075, 0), new THREE.MeshStandardMaterial({ color: 0xd9d2c3, roughness: 0.8 })); isle.position.set(px, 0, pz); group.add(isle);
      warden = { av, rig, x: px, z: pz, next: 2 };
      world.addColliders?.([{ name: 'warden_island', cx: px, cz: pz, hx: 0.6, hz: 0.6, ry: 0 }]);
    }
  }

  // ---------- the cars ----------
  const N = Math.min(usable.length, reduced ? 8 : lowQuality ? 12 : 22);
  const rng = (() => { let a = 1234567; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const cars = [];
  // kekes keep off the big roads (banned from them in Lagos, Port Harcourt and Uyo); cyclists keep to the cycle lanes
  const BIG = ['motorway', 'trunk', 'primary'];
  // (the BRT keeps to its corridors, the main roads; a 12 m bus has no business down a service lane)
  const suits = (kind, w) => (kind === 'keke' ? !BIG.includes(w.road.cls) : kind === 'cycle' ? !!w.bike : kind === 'brt' ? ['motorway', 'trunk', 'primary', 'secondary'].includes(w.road.cls) : true);
  // which way to go at the end of this way; null at the edge of the map (the car drives off it and another comes on)
  const choose = (c) => {
    const w = c.w; if (nodes[w.to].edge) return null;
    let list = w.next.filter((t) => Math.abs(t.ang) <= 2.6); if (!list.length) list = w.next; if (!list.length) return null;
    const pref = list.filter((t) => suits(c.kind, t.b)); if (pref.length) list = pref;
    return list[Math.floor(rng() * list.length)];
  };
  // the lane this car should be in for its next turn: the nearest lane a path through the junction starts from
  const laneFor = (turn, k) => turn.conns.reduce((best, cn) => (Math.abs(cn.k - k) < Math.abs(best - k) ? cn.k : best), turn.conns[0].k);
  // where across the way the car drives: its lane's middle; a cyclist in the cycle lane, or else close to the kerb
  const offFor = (c, s) => (c.kind === 'cycle' ? (c.w.bike ? c.w.bike : Math.min(laneOff(c.w, c.w.n - 1, s) + 0.9, c.w.outer[0] + 0.25)) : laneOff(c.w, c.kT, s));
  // (place: put down fresh, a cyclist straight into the cycle lane; otherwise everyone arrives in the lane the path
  // across the junction ends in, and eases over from there)
  function enterWay(c, w, k, s, place = false) {
    c.w = w; c.s = s; c.cn = null; c.k = Math.min(k, w.n - 1);
    c.turn = choose(c); c.kT = c.turn ? laneFor(c.turn, c.k) : c.k;
    c.off = place && c.kind === 'cycle' ? offFor(c, s) : laneOff(w, c.k, s);
  }
  // cars come on at the map's edge, on a way in
  const entries = ways.filter((w) => nodes[w.from].edge);
  function respawn(c) {
    // (onto a way in whose start is clear: nobody comes on on top of another car)
    const clear = (w) => { const q = wayPos(w, w.s0, laneOff(w, 0, w.s0)); return !cars.some((o) => o !== c && !o.offmap && o.body && Math.hypot(o.body.cx - q.x, o.body.cz - q.z) < 20); };
    const pool = entries.filter((w) => suits(c.kind, w) && clear(w)), any = entries.filter(clear), list = pool.length ? pool : any.length ? any : null;
    if (!list) { c.offmap = true; c.v = 0; c.body = null; return; } // nowhere clear yet: off the map until there is (update tries again)
    c.offmap = false;
    const w = list[Math.floor(rng() * list.length)]; enterWay(c, w, Math.floor(rng() * w.n), w.s0, true); c.bx = c.bz = 0; c.v = Math.min(c.v, 6); c.jumped = true;
  }
  const CYCLISTS = reduced ? 1 : 3;
  for (let k = 0; k < N + CYCLISTS; k++) {
    const mix = cityInfo().traffic?.mix || MIX, kind = k >= N ? 'cycle' : mix[k % mix.length];
    const pool = ways.filter((w) => w.s1 - w.s0 > 6 && suits(kind, w)), list = pool.length ? pool : ways.filter((w) => w.s1 - w.s0 > 6);
    if (!list.length) break;
    const w = list[Math.floor(rng() * list.length)], mesh = vehicle(kind, k); group.add(trackDetail(mesh));
    const c = { kind, mesh, v: 0, max: DESIGNS[kind].speed * (0.85 + rng() * 0.3), wait: 0, horn: 0, bx: 0, bz: 0 };
    let s0 = w.s0 + rng() * (w.s1 - w.s0);
    for (let tries = 0; tries < 6 && cars.some((o) => o.w === w && Math.abs(o.s - s0) < 12); tries++) s0 = w.s0 + rng() * (w.s1 - w.s0);
    enterWay(c, w, Math.floor(rng() * w.n), s0, true);
    cars.push(c);
  }

  // where a car is now: along its lane, or along the path across a junction; plus what is left of a smoothed jump
  const posOf = (c, out = {}) => {
    if (c.cn) {
      const cn = c.cn, s = Math.max(0, Math.min(cn.L, c.cs)); let j = 0; while (j < cn.cum.length - 2 && cn.cum[j + 1] < s) j++;
      const A = cn.pts[j], B = cn.pts[j + 1], L = (cn.cum[j + 1] - cn.cum[j]) || 1e-6, u = (s - cn.cum[j]) / L;
      out.x = A[0] + (B[0] - A[0]) * u; out.z = A[1] + (B[1] - A[1]) * u; out.dx = (B[0] - A[0]) / L; out.dz = (B[1] - A[1]) / L;
    } else wayPos(c.w, c.s, c.off, out);
    out.x += c.bx; out.z += c.bz; return out;
  };
  const roadOf = (c) => (c.cn ? (c.cs < c.cn.L / 2 ? c.cn.from.road : c.cn.to.road) : c.w.road);
  // the nearest zebra ahead (on this way, or past the junction on the next) that is held for walkers or has someone on it
  const xBusy = new Map();
  function crossingAhead(c) {
    let best = Infinity;
    const scan = (w, base, from) => { for (const X of w.xs) { const d = base + X.s - from; if (d > -0.5 && d < 20 && xBusy.get(X.x)) best = Math.min(best, d); } };
    if (c.cn) scan(c.cn.to, c.cn.L - c.cs, c.cn.to.s0);
    else { scan(c.w, 0, c.s); if (c.turn) { const cn = c.turn.conns[0]; scan(cn.to, c.w.s1 - c.s + cn.L, cn.to.s0); } }
    return best;
  }
  let t = 0;
  function update(dt, player) {
    t += dt;
    const people = getPeople?.() || [], humans = player ? [player, ...people] : people;
    pelicans.forEach((P) => pelicanTick(P, dt, humans));
    peds.forEach((k) => { k.state = pedState(k); const m = k.state === 'walk' ? PEDM.walk : k.state === 'flash' ? (Math.floor(t * 2.5) % 2 ? PEDM.stop : PEDM.dark) : PEDM.stop; k.faces.forEach((f) => { f.material = m; }); });
    signals.forEach((sig) => { sig.t += dt; sig.heads.forEach((h) => { const st = stateOf(sig, h.phase); h.lamps.forEach((m, j) => { m.material = ['red', 'amber', 'green'][j] === st ? lit[st] : off; }); }); });
    // a zebra is busy while its pelican holds the cars, or anyone is on it or at its very edge
    XINGS.forEach((xg) => { const P = xg.ped?.solo; xBusy.set(xg, (P && P.carRed) || humans.some((h) => { const ax = h.x - xg.x, az = h.z - xg.z; return Math.abs(ax * xg.nz - az * xg.nx) < 2.6 && Math.abs(ax * xg.nx + az * xg.nz) < xg.hw + 0.8; })); });
    const P = cars.map((c) => posOf(c));
    playerHold = 0;
    // (a car held by a red light is not about to come into the junction)
    const greenFor = (o) => { const g = sigAt.get(o.w.to); if (!g) return true; const q = P[cars.indexOf(o)]; const ph = Math.abs(Math.sin(Math.atan2(-q.dx, -q.dz) - g.axis)) < 0.5 ? 0 : 1; return stateOf(g, ph) === 'green'; };
    // who is in each junction now, and who is about to come into it along a main road
    const inside = new Map(), coming = new Map();
    cars.forEach((c) => { if (c.offmap) return; if (c.cn) { const L = inside.get(c.cn.node) || []; L.push(c); inside.set(c.cn.node, L); } else if (c.turn && c.w.s1 - c.s < 9 + c.v) { const L = coming.get(c.w.to) || []; L.push(c); coming.set(c.w.to, L); } });
    cars.forEach((c, k) => {
      if (c.offmap) { if ((c.retry = (c.retry || 0) - dt) <= 0) { c.retry = 1; respawn(c); } if (c.offmap) { c.mesh.position.y = -60; return; } }
      const p = P[k], len = DESIGNS[c.kind].len;
      let want = c.max;
      // school and pedestrian zones (roadsigns.js): their limit, whatever the road allows
      for (const Z of world.slowZones || []) if ((p.x - Z.x) ** 2 + (p.z - Z.z) ** 2 < Z.r * Z.r) want = Math.min(want, Z.limit);
      const toEnd = c.cn ? Infinity : c.w.s1 - c.s;
      // red or amber at the junction ahead: stop at the line, the end of the lane
      const sig = c.cn ? null : sigAt.get(c.w.to);
      const flying = flyover && flyover.over(p.x, p.z, roadOf(c)); // over the junction, no light
      if (sig && !flying) { const ph = Math.abs(Math.sin(Math.atan2(-p.dx, -p.dz) - sig.axis)) < 0.5 ? 0 : 1; const st = stateOf(sig, ph); if (st !== 'green' && toEnd > 0.8 && toEnd < 9 + c.v) want = Math.min(want, Math.max(0, (toEnd - 2.2) * 1.2)); }
      // a junction without lights: wait at the line while a crossing path is taken, and on a side road for traffic
      // coming along the main road; after seven seconds of waiting, creep on (nobody is stuck for ever)
      // (at lights too, a car on green still waits while a crossing path is taken: the turn across oncoming traffic)
      if (!c.cn && c.turn && toEnd < 7 + c.v * 0.8 && nodes[c.w.to].deg >= 3 && !flying) {
        const mine = planned(c), N = c.w.to;
        // (first come, first through; the main road before a side road; a dead heat goes to the car listed first)
        const ahead = (o) => (o.w.major && !c.w.major) || (o.w.major === c.w.major && (o.w.s1 - o.s < toEnd - 0.4 || (Math.abs(o.w.s1 - o.s - toEnd) <= 0.4 && cars.indexOf(o) < k)));
        const blockedBy = (inside.get(N) || []).some((o) => o !== c && conflicts(mine, o.cn))
          || (coming.get(N) || []).some((o) => o !== c && o.w !== c.w && greenFor(o) && ahead(o) && conflicts(mine, planned(o)));
        if (blockedBy && (c.yieldT = (c.yieldT || 0) + dt) < 7) want = Math.min(want, Math.max(0, (toEnd - 2.2) * 1.2));
        else if (!blockedBy) c.yieldT = 0;
      }
      // slow for the turn ahead, and round it
      if (c.turn && toEnd < 12) want = Math.min(want, c.turn.speed + toEnd * 0.7);
      if (c.cn) want = Math.min(want, (c.turnSpeed ?? 99) + 1.5);
      // a zebra ahead with someone on it, or held by its lights: stop short of it and wait
      if (!flying) { const d = crossingAhead(c); if (d < Infinity && d > len * 0.25) want = Math.min(want, Math.max(0, (d - len / 2 - 2.2) * 1.2)); }
      // keep a distance from the car ahead in the same lane
      for (let j = 0; j < cars.length; j++) {
        // (one up on the flyover and one under it are not in each other's way)
        if (j === k || cars[j].offmap || Math.abs(cars[j].mesh.position.y - c.mesh.position.y) > 2.5) continue; const q = P[j], ax = q.x - p.x, az = q.z - p.z, along = ax * p.dx + az * p.dz, across = Math.abs(-ax * p.dz + az * p.dx);
        // (the car ahead going our way; or anything right in front, whichever way it faces, at a junction or a merge)
        if (along > 0 && ((along < 14 && across < 1.6 && p.dx * q.dx + p.dz * q.dz > 0.3) || (along < 6 && across < (DESIGNS[c.kind].w + DESIGNS[cars[j].kind].w) / 2 + 0.3))) want = Math.min(want, Math.max(0, (along - len / 2 - DESIGNS[cars[j].kind].len / 2 - 1.5) * 1.1));
      }
      const byCar = want < 0.3;
      // anything else on the road ahead (a minibus turning into the motor park, a ride waiting at the kerb): wait for it
      let byThing = false;
      for (const b of blockers) { if (!b.on) continue; const ax = b.x - p.x, az = b.z - p.z, along = ax * p.dx + az * p.dz, across = Math.abs(-ax * p.dz + az * p.dx); if (along > 0 && along < 16 && across < b.r + 1.1) { want = Math.min(want, Math.max(0, (along - len / 2 - b.r - 1.5) * 1.1)); byThing = byThing || want < 0.3; } }
      // people in the road ahead: stop, and after a moment, the horn
      let blocked = false;
      humans.forEach((h, hi) => { if (!h || c.mesh.position.y > 2.5) return; const ax = h.x - p.x, az = h.z - p.z, along = ax * p.dx + az * p.dz, across = Math.abs(-ax * p.dz + az * p.dx); if (along > 0 && along < 7 && across < 1.5) { want = Math.min(want, Math.max(0, (along - 3.5) * 1.5)); if (hi === 0 && h === player && along < 6) blocked = true; } });
      if (blocked && c.v < 0.3) playerHold = Math.max(playerHold, (c.hold = (c.hold || 0) + dt)); else c.hold = 0;
      if (blocked && c.v < 0.3) { c.horn += dt; if (c.horn > 1.6 && Math.hypot(player.x - p.x, player.z - p.z) < 25) { sfx('horn', { kind: c.kind }); c.horn = -3; dispatchEvent(new CustomEvent('bw:react', { detail: { kind: 'horn', x: p.x, z: p.z, r: 14, max: 3, chance: 0.7 } })); } } else c.horn = Math.min(c.horn, 0);
      if (reduced) want = Math.min(want, c.max * 0.6);
      // stuck behind something that is not going to move (not a light, not a person crossing): after a while a
      // traffic official sees it (officials.js) and waves the car round: it turns back the way it came
      const sigRed = sig && !flying && toEnd < 9 + c.v;
      if (c.v < 0.25 && (byCar || byThing) && !blocked && !sigRed) c.stuck = (c.stuck || 0) + dt; else c.stuck = 0;
      if (c.stuck > 9 && !c.reported) { c.reported = true; dispatchEvent(new CustomEvent('bw:obstruction', { detail: { x: p.x, z: p.z, car: c } })); }
      // (an officer on the way: wait for the wave, up to half a minute; nobody coming: the driver turns round alone)
      if (c.stuck > 13 && (c.waved || !c.helped || c.stuck > 30) && !c.cn) {
        const back = c.w.link.f === c.w ? c.w.link.b2 : c.w.link.f;
        if (back) { const s0 = c.s; enterWay(c, back, 0, Math.max(back.s0, Math.min(back.s1, back.L - s0))); const q = posOf(c); c.bx += p.x - q.x; c.bz += p.z - q.z; c.stuck = 0; c.reported = false; c.waved = false; c.helped = false; c.v = 0; }
      }
      c.v += Math.max(-7 * dt, Math.min(2.4 * dt, want - c.v));
      // along: a lane change eases across as the car goes (about a metre sideways per five forward)
      if (c.cn) {
        c.cs += c.v * dt;
        if (c.cs >= c.cn.L) { const cn = c.cn, rest = c.cs - cn.L; enterWay(c, cn.to, cn.m, Math.min(cn.to.s1, cn.to.s0 + rest)); }
      } else {
        c.s += c.v * dt;
        // a lane change only into a gap: nobody alongside in the lane it is moving into
        const target = offFor(c, c.s), len2 = DESIGNS[c.kind].len;
        const gapFree = Math.abs(target - c.off) < 0.05 || !cars.some((o) => o !== c && !o.cn && o.w === c.w && Math.abs(o.s - c.s) < (len2 + DESIGNS[o.kind].len) / 2 + 2.5 && Math.abs(o.off - target) < 1.6 && Math.abs(o.off - c.off) > 0.3);
        if (gapFree) c.off += Math.max(-(0.3 + c.v * 0.2) * dt, Math.min((0.3 + c.v * 0.2) * dt, target - c.off));
        if (c.s >= c.w.s1) {
          const at = c.w.to;
          if (watchers.some((fn) => fn(c, at))) { c.gone = true; return; }
          if (!c.turn) { respawn(c); }
          else {
            // onto the path across the junction from the lane the car is in (the nearest, if a lane change ran short)
            const kIn = laneNow(c), kNow = c.turn.conns.some((cn) => cn.k === kIn) ? kIn : laneFor(c.turn, kIn);
            const cn = c.turn.conns.find((q) => q.k === kNow) || c.turn.conns[0];
            { const L = inside.get(cn.node) || []; L.push(c); inside.set(cn.node, L); } // in the junction from this moment
            const before = posOf(c); c.cn = cn; c.cs = Math.max(0, c.s - c.w.s1); c.turnSpeed = c.turn.speed; c.bx = c.bz = 0;
            const after = posOf(c); c.bx = before.x - after.x; c.bz = before.z - after.z; // whatever is left of the lane change, smoothed away
          }
        }
      }
      c.bx *= Math.exp(-dt * 2.5); c.bz *= Math.exp(-dt * 2.5);
      const q = posOf(c), yaw = Math.atan2(q.dx, q.dz);
      c.mesh.position.set(q.x, flyover ? flyover.heightFor(q.x, q.z, roadOf(c)) : 0, q.z);
      const dy = Math.atan2(Math.sin(yaw - c.mesh.rotation.y), Math.cos(yaw - c.mesh.rotation.y)); c.mesh.rotation.y += dy * (1 - Math.exp(-dt * 6));
      c.mesh.userData.tail.color.setHex(want < c.v - 0.5 ? 0xff2a2a : 0x701010);
      if (c.kind === 'cycle') { const u = c.mesh.userData, a = t * (2 + c.v * 1.4); u.bike.userData.crank.rotation.x = a; u.bike.userData.wheels.forEach((w) => { w.rotation.x -= dt * c.v * 3.2; }); const r = u.rig; if (r) { r.update(dt, { speed: 0, t }); r.L.hip.rotation.x = -0.9 + Math.sin(a) * 0.45; r.R.hip.rotation.x = -0.9 - Math.sin(a) * 0.45; r.L.knee.rotation.x = 1.0 - Math.cos(a) * 0.45; r.R.knee.rotation.x = 1.0 + Math.cos(a) * 0.45; r.L.shoulder.rotation.x = -0.7; r.R.shoulder.rotation.x = -0.7; r.chest.rotation.x = 0.25; } }
      c.body = { cx: q.x, cz: q.z, hx: DESIGNS[c.kind].w / 2 + 0.05, hz: DESIGNS[c.kind].len / 2, ry: c.mesh.rotation.y };
    });
    // the safety net: two vehicles that ever end up overlapping in one lane (however they got there) come apart, the
    // one behind easing back a little each frame; no jump, no bounce
    for (let i = 0; i < cars.length; i++) {
      const a = cars[i]; if (a.cn || a.offmap || a.gone) continue;
      for (let j = i + 1; j < cars.length; j++) {
        const b2 = cars[j]; if (b2.cn || b2.offmap || b2.gone || b2.w !== a.w || Math.abs(a.off - b2.off) > 1.6) continue;
        const need = (DESIGNS[a.kind].len + DESIGNS[b2.kind].len) / 2 + 0.6, gap = Math.abs(a.s - b2.s);
        if (gap >= need) continue;
        const back = a.s < b2.s ? a : b2, front = back === a ? b2 : a, step = Math.min(need - gap, dt * 2.5 + 0.02);
        if (back.s - step >= back.w.s0 - 0.5) { back.s -= step; back.v = Math.min(back.v, 0.5); } else front.s = Math.min(front.w.s1, front.s + step); // (no room behind: the one in front moves up)
      }
    }
    for (let k = cars.length - 1; k >= 0; k--) if (cars[k].gone) cars.splice(k, 1);
    // the officer waves the traffic on now and then
    if (warden) { warden.next -= dt; warden.rig?.update(dt, { speed: 0, t }); if (warden.next <= 0) { warden.rig?.wave?.(); warden.next = 2.5 + rng() * 2; } }
  }
  // for the motor park (streetlife.js): take a passing car off the road at a node, put one back on
  const watchers = [];
  // things on the road that are not in the traffic (a vehicle turning into the motor park, a ride at the kerb): cars wait for them
  const blockers = [];
  let playerHold = 0; // how long a car has been held up by you standing in the road, this frame
  const addBlocker = (b) => { const h = { x: 0, z: 0, r: 1.2, on: false, ...b }; blockers.push(h); return h; };
  const removeBlocker = (h) => { const i = blockers.indexOf(h); if (i >= 0) blockers.splice(i, 1); };
  function onNode(fn) { watchers.push(fn); }
  function nearestNode(x, z) { let best = -1, bd = Infinity; usable.forEach((i) => { const d = Math.hypot(nodes[i].x - x, nodes[i].z - z); if (d < bd) { bd = d; best = i; } }); return best; }
  function release(kind, mesh, at) {
    // onto the lane out of that junction whose start is nearest the vehicle, and eased into it from where it stands
    const outs = nodes[at].out.length ? nodes[at].out : ways, m = mesh.position;
    const near = (w) => { const q = wayPos(w, w.s0, laneOff(w, w.n - 1, w.s0)); return Math.hypot(q.x - m.x, q.z - m.z); };
    const w = outs.reduce((a, b) => (near(b) < near(a) ? b : a));
    const c = { kind, mesh, v: 2, max: DESIGNS[kind].speed, wait: 0, horn: 0, bx: 0, bz: 0 }; enterWay(c, w, w.n - 1, Math.min(w.s1, w.s0 + 0.5));
    if (mesh.parent) { const q = posOf(c); c.bx = m.x - q.x; c.bz = m.z - q.z; } else group.add(mesh);
    cars.push(c); return c;
  }
  const bodies = () => cars.map((c) => c.body).filter(Boolean);
  // a roundabout island (parks.js) at a junction: every path through it goes round the island, keeping it on the
  // driver's left where traffic keeps right (anticlockwise) and on the right where it keeps left; the lanes stop
  // outside the circle, and whoever is already going round has the right of way (the junction rule above)
  function addRoundabout({ x, z, rad }) {
    let v = -1, bd = 4; nodes.forEach((N, i) => { const d = Math.hypot(N.x - x, N.z - z); if (d < bd && N.deg >= 3) { bd = d; v = i; } });
    if (v < 0) return false;
    const N = nodes[v], rc = rad + 1.25, dir = HAND > 0 ? -1 : 1; // (a compact circle: round the island, inside the corners)
    N.in.forEach((a) => { a.s1 = Math.max(a.s0, Math.min(a.s1, a.L - (rc + 1.6))); });
    N.out.forEach((b) => { b.s0 = Math.min(b.s1, Math.max(b.s0, rc + 1.6)); });
    N.in.forEach((a) => a.next.forEach((turn) => { turn.speed = Math.min(turn.speed, 4.5); turn.conns.forEach((cn) => {
      const pa = wayPos(a, a.s1, laneOff(a, cn.k, a.s1)), pb = wayPos(turn.b, turn.b.s0, laneOff(turn.b, cn.m, turn.b.s0));
      const ra = Math.hypot(pa.x - x, pa.z - z), rb = Math.hypot(pb.x - x, pb.z - z), t0 = Math.atan2(pa.z - z, pa.x - x), t1 = Math.atan2(pb.z - z, pb.x - x);
      let sweep = (((t1 - t0) * dir) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); if (sweep < 0.35) sweep += Math.PI * 2; // straight on is half way round, a U-turn nearly all
      const M = Math.max(10, Math.ceil(sweep * rc / 1.2)), pts = [], cum = [0];
      for (let j = 0; j <= M; j++) { const u = j / M, r = u < 0.2 ? ra + (rc - ra) * (u / 0.2) : u > 0.8 ? rc + (rb - rc) * ((u - 0.8) / 0.2) : rc, th = t0 + dir * sweep * u; pts.push([x + Math.cos(th) * r, z + Math.sin(th) * r]); if (j) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1])); }
      cn.pts = pts; cn.cum = cum; cn.L = cum[M];
    }); }));
    conflictMemo.clear(); N.roundabout = { x, z, rad: rc };
    return true;
  }
  // for tests: every lane (blue, one-way orange) and every path across a junction (green), as lines a little above the road
  function debugLanes() {
    const g = new THREE.Group(), add = (pts, color) => g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(([x, z]) => new THREE.Vector3(x, 0.4, z))), new THREE.LineBasicMaterial({ color, depthTest: false })));
    ways.forEach((w) => { for (let k = 0; k < w.n; k++) { const pts = []; for (let s = w.s0; s <= w.s1 + 1e-3; s += Math.max(0.5, (w.s1 - w.s0) / 30)) { const q = wayPos(w, s, laneOff(w, k, s)); pts.push([q.x, q.z]); } if (pts.length > 1) add(pts, w.road.oneway ? 0xff8a00 : 0x2a6cff); } w.next.forEach((t) => t.conns.forEach((cn) => add(cn.pts, 0x18b848))); });
    g.renderOrder = 10; scene.add(g); return g;
  }
  function dispose() { group.removeFromParent(); }
  return { peds, pelicans, ways, debugLanes, addRoundabout, update, bodies, cars, signals, warden, nodes, onNode, nearestNode, release, stateOf, dispose, addBlocker, removeBlocker, get playerHold() { return playerHold; }, get count() { return cars.length; } };
}
