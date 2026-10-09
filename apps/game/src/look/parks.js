import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { signTexture } from './props.js';

// Public space (world bible 4.5, estate-layout skill): benches go where people wait or rest, so a park
// is built around the pond: a paved loop, benches facing the water, shade trees, lamps, a stepped
// waterfall, and the community build area, the place where residents add a bench of their own.
// A roundabout with a landscaped island and a sculpture calms traffic at a residential junction.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const ink = 0x3b2a20;

function benchGeo() {
  return mergeGeometries([box(1.8, 0.08, 0.45, 0, 0.48, 0), box(1.8, 0.4, 0.06, 0, 0.82, -0.2), box(0.08, 0.48, 0.4, -0.8, 0.24, 0), box(0.08, 0.48, 0.4, 0.8, 0.24, 0)]);
}
function treeGeo() {
  const parts = [new THREE.CylinderGeometry(0.12, 0.17, 2.6, 7).translate(0, 1.3, 0)];
  [[0, 3.1, 0, 1.3], [0.7, 2.7, 0.3, 0.9], [-0.6, 2.8, -0.3, 0.95], [0.1, 3.7, -0.2, 0.85]].forEach(([x, y, z, r]) => parts.push(new THREE.IcosahedronGeometry(r, 0).translate(x, y, z)));
  return parts;
}

// falling water: bright stripes sliding down, foam at the lip
function waterMaterial(uTime) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      void main() {
        float s = fract(vUv.y * 3.0 + uTime * 1.6 + sin(vUv.x * 18.0) * 0.08);
        float streak = smoothstep(0.0, 0.25, s) * (1.0 - smoothstep(0.35, 0.6, s));
        vec3 col = mix(vec3(0.45, 0.75, 0.78), vec3(0.93, 0.98, 1.0), streak * 0.8 + (1.0 - vUv.y) * 0.1);
        float a = 0.78 * smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.92, 1.0, vUv.x));
        gl_FragColor = vec4(col, a);
      }`,
  });
}

export function buildParks({ world, scene, pond, area, uTime, addLamps, reduced }) {
  const group = new THREE.Group(); group.name = 'parks'; scene.add(group);
  const stone = new THREE.MeshStandardMaterial({ color: 0xb5ab98, roughness: 0.95 });
  const paving = new THREE.MeshStandardMaterial({ color: 0xd6cdb8, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0xa87950, roughness: 0.8 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x5b7d55, roughness: 0.85, flatShading: true });
  const trunk = new THREE.MeshStandardMaterial({ color: 0x7d5a3c, roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x263832, roughness: 0.5, metalness: 0.4 });
  const out = { benches: [], park: null, roundabout: null };
  const cols = [];

  // ---------- the park around the pond ----------
  if (pond) {
    const P = pond, onEll = (a, k) => ({ x: P.x + Math.cos(a) * (P.rx + k), z: P.z + Math.sin(a) * (P.rz + k) });
    // a paved loop between 1 m and 2.6 m out from the water's edge
    const ring = new THREE.Shape(), hole = new THREE.Path(), N = 64;
    for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2, o = onEll(a, 2.6), h = onEll(a, 1.0); i ? ring.lineTo(o.x - P.x, -(o.z - P.z)) : ring.moveTo(o.x - P.x, -(o.z - P.z)); i ? hole.lineTo(h.x - P.x, -(h.z - P.z)) : hole.moveTo(h.x - P.x, -(h.z - P.z)); }
    ring.holes.push(hole);
    const path = new THREE.Mesh(new THREE.ShapeGeometry(ring, 2).rotateX(-Math.PI / 2), paving); // facing up
    path.position.set(P.x, 0.09, P.z); group.add(path);

    // the waterfall on the far side: three stone tiers stepping down into the pond, water falling from each lip
    const wa = 0; const w0 = onEll(wa, 0.4), faceIn = Math.atan2(P.x - w0.x, P.z - w0.z);
    const wf = new THREE.Group(); wf.position.set(w0.x, 0, w0.z); wf.rotation.y = faceIn; wf.scale.setScalar(1.35);
    const tiers = [[3.4, 1.0, 0.0], [2.8, 1.9, -0.9], [2.2, 2.8, -1.7]];
    tiers.forEach(([w, h, z]) => wf.add(new THREE.Mesh(box(w, h, 1.1, 0, h / 2, z), stone)));
    wf.add(new THREE.Mesh(box(1.0, 0.6, 0.9, -1.6, 0.3, -0.3), stone), new THREE.Mesh(box(0.8, 0.9, 0.8, 1.7, 0.45, -0.6), stone));
    const water = waterMaterial(uTime);
    tiers.forEach(([w, h, z]) => { const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.55, h), water); sheet.position.set(0, h / 2 + 0.05, z + 0.57); wf.add(sheet); });
    const foam = new THREE.Mesh(new THREE.CircleGeometry(1.3, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf2fbfb, transparent: true, opacity: 0.7, depthWrite: false }));
    foam.position.set(0, 0.23, 1.1); wf.add(foam); wf.userData.foam = foam;
    group.add(wf);
    cols.push({ name: 'waterfall', cx: w0.x, cz: w0.z, hx: 2.3, hz: 1.9, ry: faceIn });

    // benches on the loop, facing the water, and shade trees and lamps between them
    const bg = benchGeo(), tg = treeGeo();
    const benchMesh = new THREE.Mesh(bg, wood);
    [0.85, 2.0, 3.5, 4.6, 5.6].forEach((a, i) => {
      const p = onEll(a, 3.3);
      if (!world.isFree(p.x, p.z, 0.4, { lots: false })) return;
      const b = benchMesh.clone(); b.position.set(p.x, 0, p.z); b.rotation.y = Math.atan2(P.x - p.x, P.z - p.z); group.add(b); // the seat faces the water, the backrest the path
      cols.push({ name: 'bench', cx: p.x, cz: p.z, hx: 0.9, hz: 0.25, ry: b.rotation.y, h: 0.9 });
      out.benches.push({ x: p.x + Math.sin(b.rotation.y) * 0.05, z: p.z + Math.cos(b.rotation.y) * 0.05, yaw: b.rotation.y });
      const t = onEll(a + 0.45, 4.6);
      if (world.isFree(t.x, t.z, 0.6) && i % 2 === 0) {
        const tree = new THREE.Group(); tree.add(new THREE.Mesh(tg[0], trunk)); tg.slice(1).forEach((g) => tree.add(new THREE.Mesh(g, leaf))); tree.position.set(t.x, 0, t.z); group.add(tree);
        cols.push({ name: 'park_tree', cx: t.x, cz: t.z, hx: 0.25, hz: 0.25, ry: 0 });
      } else if (world.isFree(t.x, t.z, 0.4)) {
        const post = new THREE.Mesh(box(0.1, 3.6, 0.1, 0, 1.8, 0), metal); post.position.set(t.x, 0, t.z); group.add(post);
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 1.0) })); globe.position.set(t.x, 3.75, t.z); group.add(globe);
        addLamps?.([{ x: t.x, y: 3.7, z: t.z, power: 26, kind: 'park' }]);
        cols.push({ name: 'park_lamp', cx: t.x, cz: t.z, hx: 0.1, hz: 0.1, ry: 0 });
      }
    });
    // a sign at the entrance
    const sp = onEll(Math.PI * 1.5, 3.4);
    const sg = new THREE.Group(); sg.position.set(sp.x, 0, sp.z); sg.rotation.y = Math.atan2(sp.x - P.x, sp.z - P.z);
    sg.add(new THREE.Mesh(box(0.08, 1.4, 0.08, -0.7, 0.7, 0), wood), new THREE.Mesh(box(0.08, 1.4, 0.08, 0.7, 0.7, 0), wood));
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.5), new THREE.MeshStandardMaterial({ map: signTexture(`${world.place?.name ?? 'Yaba'} Pond Park`, { bg: '#326952', w: 512, h: 150 }), roughness: 0.7 }));
    plate.position.set(0, 1.25, 0.05); sg.add(plate); group.add(sg);

    // the community build area moves into the park: residents add benches where people actually sit
    if (area?.group) {
      let spot = null;
      for (let k = 0; k < 72 && !spot; k++) {
        const a = Math.PI + (k % 2 ? 1 : -1) * Math.floor((k % 24 + 1) / 2) * 0.26, p = onEll(a, [5.2, 6.6, 8.2][Math.floor(k / 24)]);
        let ok = true; for (let u = -2.8; u <= 2.8 && ok; u += 0.7) for (let v = -2; v <= 2 && ok; v += 0.7) { const ry = Math.atan2(P.x - p.x, P.z - p.z), x = p.x + u * Math.cos(ry) + v * Math.sin(ry), z = p.z - u * Math.sin(ry) + v * Math.cos(ry); if (!(world.costAt ? world.costAt(x, z) < 2.6 : world.isFree(x, z, 0.3))) ok = false; }
        if (ok) spot = p;
      }
      if (spot) {
        const ry = Math.atan2(P.x - spot.x, P.z - spot.z);
        area.group.position.set(spot.x, 0, spot.z); area.group.rotation.y = ry + Math.PI;
        area.item.x = spot.x + Math.sin(ry) * 1.8; area.item.z = spot.z + Math.cos(ry) * 1.8;
        area.group.visible = true; area.item.r = 4;
        const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.9, 10).translate(0, 0.45, 0), new THREE.MeshStandardMaterial({ color: 0x2f6b4f, roughness: 0.7 }));
        const bx = spot.x + Math.cos(ry) * 2.9, bz = spot.z - Math.sin(ry) * 2.9; bin.position.set(bx, 0, bz); group.add(bin);
        cols.push({ name: 'bin', cx: bx, cz: bz, hx: 0.32, hz: 0.32, ry: 0, h: 0.9 });
        out.buildArea = spot;
      }
    }
    out.park = { x: P.x, z: P.z, rx: P.rx + 3, rz: P.rz + 3, name: `${world.place?.name ?? 'Yaba'} Pond Park` };
    world.claim?.({ kind: 'park', cx: P.x, cz: P.z, hx: P.rx + 2.6, hz: P.rz + 2.6, ry: 0 });
  }

  // ---------- a roundabout at a quiet residential junction ----------
  const QUIET = ['residential', 'unclassified', 'living_street'];
  const ends = [];
  world.roads.forEach((r) => { if (r.fit && QUIET.includes(r.cls)) [0, r.fit.pts.length - 1].forEach((i) => ends.push({ r, p: r.fit.pts[i], h: r.fit.half[i] })); });
  const MAJOR = world.roads.filter((r) => r.fit && ['primary', 'secondary', 'trunk', 'motorway', 'tertiary'].includes(r.cls));
  const nearMajor = (x, z) => MAJOR.some((r) => r.fit.pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 9));
  let best = null;
  // candidate centres: the ends of quiet streets and the points where another street meets them
  world.roads.forEach((r) => { if (r.fit && QUIET.includes(r.cls)) r.fit.pts.forEach((p, i) => { if (i % 2 === 0) ends.push({ r, p, h: r.fit.half[i] }); }); });
  ends.forEach((e) => {
    const [x, z] = e.p;
    if (Math.hypot(x, z) > world.radius * 0.8 || nearMajor(x, z)) return;
    const arms = new Set(world.roads.filter((o) => o.fit && o.fit.pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 2.5)));
    if (arms.size < 3) return;
    const minHalf = Math.min(...[...arms].map((o) => Math.min(...o.fit.half)));
    if (minHalf < 2.2) return;
    const d = Math.hypot(x - world.spawn.x, z - world.spawn.z);
    if (!best || d < best.d) best = { x, z, d, rad: Math.min(3.2, minHalf * 0.85) };
  });
  if (best) {
    const { x, z, rad } = best;
    const g = new THREE.Group(); g.position.set(x, 0, z);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(rad + 0.2, rad + 0.25, 0.32, 32).translate(0, 0.16, 0), new THREE.MeshStandardMaterial({ color: 0xd8d1bf, roughness: 0.9 })));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.36, 32).translate(0, 0.18, 0), new THREE.MeshStandardMaterial({ color: 0x8cb25e, roughness: 0.9 })));
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0).translate(Math.cos(a) * (rad - 0.5), 0.5, Math.sin(a) * (rad - 0.5)), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe46f4f : 0xf2b33d, roughness: 0.8, flatShading: true }))); }
    // the sculpture: a builder holding up a laptop, in bronze, on a plinth
    const bronze = new THREE.MeshStandardMaterial({ color: 0xa8743c, roughness: 0.35, metalness: 0.7 });
    g.add(new THREE.Mesh(box(1.2, 1.1, 1.2, 0, 0.9, 0), stone));
    const fig = mergeGeometries([box(0.5, 0.75, 0.32, 0, 2.0, 0), box(0.2, 0.75, 0.24, -0.13, 1.08, 0), box(0.2, 0.75, 0.24, 0.13, 1.08, 0), new THREE.SphereGeometry(0.22, 12, 10).translate(0, 2.6, 0),
      box(0.13, 0.7, 0.16, -0.36, 2.6, 0).rotateZ(0.0), box(0.13, 0.7, 0.16, 0.36, 2.6, 0), box(0.9, 0.05, 0.6, 0, 3.0, 0), box(0.9, 0.55, 0.05, 0, 3.25, -0.28)]);
    g.add(new THREE.Mesh(fig, bronze));
    group.add(g);
    // the carriageway paint: a give-way circle around the island
    const ringPaint = new THREE.Mesh(new THREE.RingGeometry(rad + 2.2, rad + 2.4, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf2ecd9, polygonOffset: true, polygonOffsetFactor: -3 }));
    ringPaint.position.set(x, 0.2, z); group.add(ringPaint);
    cols.push({ name: 'roundabout', cx: x, cz: z, hx: rad * 0.75, hz: rad * 0.75, ry: 0 }, { name: 'roundabout', cx: x, cz: z, hx: rad * 0.75, hz: rad * 0.75, ry: Math.PI / 4 });
    out.roundabout = { x, z, rad };
  }

  world.addColliders(cols);
  return { group, ...out, update(t) { const f = group.getObjectByName?.('foam'); void f; void t; void reduced; } };
}

// a W x D rectangle of open public ground, nearest the start, clear of everything in `used` (which it extends)
export function findSite(world, used, W, D) {
  const free = (x, z) => (world.costAt ? world.costAt(x, z) < 2.6 : world.isFree(x, z, 0.5));
  for (let r = 10; r < world.radius * 0.95; r += 5) for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2 + r * 0.37, x = world.spawn.x + Math.cos(a) * r, z = world.spawn.z + Math.sin(a) * r;
    if (Math.hypot(x, z) > world.radius * 0.9 || used.some((u) => Math.abs(u.x - x) < (u.W + W) / 2 + 3 && Math.abs(u.z - z) < (u.D + D) / 2 + 3)) continue;
    let ok = true;
    for (let u = -W / 2; u <= W / 2 && ok; u += 1.5) for (let v = -D / 2; v <= D / 2 && ok; v += 1.5) if (!free(x + u, z + v)) ok = false;
    if (ok) { used.push({ x, z, W, D }); return { x, z }; }
  }
  return null;
}

// ---------- places to play (world bible 4.5): a skate park, a water park, a community garden, a picnic lawn ----------
// Each needs a rectangle of open public ground (the walkable map says: not a building, garden, road or prop),
// kept clear of the pond park and of each other, as near the start as there is room.
export function buildRecreation({ world, scene, uTime, taken = [], reduced }) {
  const group = new THREE.Group(); group.name = 'recreation'; scene.add(group);
  const pois = [], cols = [], anim = [];
  const used = taken;
  const site = (W, D) => findSite(world, used, W, D);
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
  const pad = (W, D, color, y = 0.08) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), mat(color, { polygonOffset: true, polygonOffsetFactor: -1 })); m.position.y = y; return m; };
  const signFor = (text, bg) => { const s = new THREE.Group(); s.add(new THREE.Mesh(box(0.08, 1.5, 0.08, -0.8, 0.75, 0), mat(0x263832)), new THREE.Mesh(box(0.08, 1.5, 0.08, 0.8, 0.75, 0), mat(0x263832))); const p = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.5), new THREE.MeshStandardMaterial({ map: signTexture(text, { bg, w: 512, h: 140 }), roughness: 0.7 })); p.position.set(0, 1.3, 0.05); s.add(p); return s; };
  const add = (g, at, W, D, name, kind) => { g.position.set(at.x, 0, at.z); group.add(g); pois.push({ kind, name, x: at.x, z: at.z }); world.claim?.({ kind: 'recreation', cx: at.x, cz: at.z, hx: W / 2, hz: D / 2, ry: 0 }); };
  const place = (name) => `${world.place?.name ?? 'Yaba'} ${name}`;

  // skate park: a concrete pad, two quarter pipes, a funbox, a grind rail and a ledge, with a bit of paint
  let at = site(20, 14);
  if (at) {
    const g = new THREE.Group(), concrete = mat(0xc9c2b2), paint = [0xe46f4f, 0x2a9d94, 0xf2b33d];
    g.add(pad(20, 14, 0xbfb8a8));
    const qp = new THREE.Shape(); qp.moveTo(0, 0); qp.lineTo(3, 0); qp.lineTo(3, 2.0); qp.quadraticCurveTo(3, 0, 0, 0);
    [-1, 1].forEach((sd) => {
      const ramp = new THREE.Mesh(new THREE.ExtrudeGeometry(qp, { depth: 10, bevelEnabled: false }).translate(0, 0, -5), concrete);
      ramp.rotation.y = sd > 0 ? 0 : Math.PI; ramp.position.set(sd * 7, 0, 0); g.add(ramp);
      g.add(new THREE.Mesh(box(0.12, 0.12, 10, sd * 10, 2.05, 0), mat(0x55605a, { metalness: 0.5 })));
      cols.push({ name: 'skate_ramp', cx: at.x + sd * 8.5, cz: at.z, hx: 1.5, hz: 5, ry: 0, h: 2.0 });
    });
    const fb = new THREE.Shape(); fb.moveTo(-2.5, 0); fb.lineTo(-1.2, 0.8); fb.lineTo(1.2, 0.8); fb.lineTo(2.5, 0); fb.closePath();
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(fb, { depth: 3, bevelEnabled: false }).translate(0, 0, -1.5), concrete));
    cols.push({ name: 'skate_box', cx: at.x, cz: at.z, hx: 1.6, hz: 1.5, ry: 0, h: 0.8 });
    g.add(new THREE.Mesh(box(4, 0.08, 0.08, 0, 0.55, 4.5), mat(0xe46f4f, { metalness: 0.4 })), new THREE.Mesh(box(0.08, 0.55, 0.08, -1.8, 0.27, 4.5), mat(0x263832)), new THREE.Mesh(box(0.08, 0.55, 0.08, 1.8, 0.27, 4.5), mat(0x263832)));
    g.add(new THREE.Mesh(box(4, 0.5, 1, 0, 0.25, -4.8), concrete));
    paint.forEach((c, i) => g.add(new THREE.Mesh(new THREE.CircleGeometry(0.8 + i * 0.3, 16).rotateX(-Math.PI / 2).translate(-3 + i * 3, 0.09, 2.5), mat(c, { polygonOffset: true, polygonOffsetFactor: -2 }))));
    const sg = signFor('SKATE PARK', '#e46f4f'); sg.position.set(0, 0, 7.6); g.add(sg);
    add(g, at, 20, 14, place('Skate Park'), 'park');
  }

  // water park: a blue splash pad with jets that rise and fall, a paddling pool, a small slide, sun umbrellas
  at = site(16, 13);
  if (at) {
    const g = new THREE.Group();
    g.add(pad(16, 13, 0x8fc9d6));
    const pool = new THREE.Mesh(new THREE.CircleGeometry(3, 28).rotateX(-Math.PI / 2), mat(0x5fb4c4, { roughness: 0.15, polygonOffset: true, polygonOffsetFactor: -2 })); pool.position.set(-3.5, 0.1, 0); g.add(pool);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.14, 6, 32).rotateX(Math.PI / 2), mat(0xf7efdc)); rim.position.set(-3.5, 0.12, 0); g.add(rim);
    const jetMat = new THREE.MeshBasicMaterial({ color: 0xdff6fb, transparent: true, opacity: 0.75 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, j = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1, 8).translate(0, 0.5, 0), jetMat); j.position.set(3.5 + Math.cos(a) * 2, 0.1, Math.sin(a) * 2); g.add(j); anim.push({ j, ph: i * 0.9 }); }
    g.add(new THREE.Mesh(box(1.2, 1.6, 1.2, 4.5, 0.8, -4.5), mat(0xf2b33d)));
    // the slide runs from the top of the tower down into the splash pad
    const slide = new THREE.Group(); slide.position.set(4.5, 0.9, -2.4); slide.rotation.x = Math.atan2(1.55, 3.2);
    slide.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 3.6), mat(0xe46f4f)), new THREE.Mesh(box(0.08, 0.25, 3.6, -0.45, 0.12, 0), mat(0xe46f4f)), new THREE.Mesh(box(0.08, 0.25, 3.6, 0.45, 0.12, 0), mat(0xe46f4f)));
    g.add(slide);
    [[-6, 5], [0, 5.2], [6, 5]].forEach(([x, z], i) => { g.add(new THREE.Mesh(box(0.08, 2.2, 0.08, x, 1.1, z), mat(0x263832)), new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.6, 10).translate(x, 2.4, z), mat([0xe46f4f, 0xf2b33d, 0x2a9d94][i], { side: THREE.DoubleSide }))); });
    const sg = signFor('WATER PARK', '#2a9d94'); sg.position.set(0, 0, 6.8); g.add(sg);
    cols.push({ name: 'water_slide', cx: at.x + 4.5, cz: at.z - 4.5, hx: 0.7, hz: 0.7, ry: 0, h: 1.6 });
    add(g, at, 16, 13, place('Water Park'), 'park');
  }

  // community garden: raised beds of vegetables and flowers inside a low fence, a shed, a water tank
  at = site(13, 11);
  if (at) {
    const g = new THREE.Group(), wood = mat(0xa87950), soil = mat(0x6b4a30);
    g.add(pad(13, 11, 0x9cc163, 0.04));
    const crops = [0x5f9a45, 0xe46f4f, 0xf2b33d, 0x7fb35e, 0xc9a7f5, 0x45694c];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const x = -4 + c * 4, z = -2 + r * 4;
      g.add(new THREE.Mesh(box(3, 0.4, 2, x, 0.2, z), wood), new THREE.Mesh(box(2.8, 0.06, 1.8, x, 0.41, z), soil));
      for (let p = 0; p < 8; p++) g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0).translate(x - 1.1 + (p % 4) * 0.72, 0.6, z - 0.45 + Math.floor(p / 4) * 0.9), mat(crops[(r * 3 + c) % crops.length], { flatShading: true })));
      cols.push({ name: 'garden_bed', cx: at.x + x, cz: at.z + z, hx: 1.5, hz: 1, ry: 0, h: 0.4 });
    }
    g.add(new THREE.Mesh(box(2.2, 2.2, 1.8, 5, 1.1, 3.8), mat(0x326952)), new THREE.Mesh(box(2.5, 0.2, 2.1, 5, 2.3, 3.8), wood));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.4, 12).translate(-5.3, 0.7, 4), mat(0x2a9d94)));
    cols.push({ name: 'garden_shed', cx: at.x + 5, cz: at.z + 3.8, hx: 1.1, hz: 0.9, ry: 0 });
    const sg = signFor('COMMUNITY GARDEN', '#326952'); sg.position.set(0, 0, 5.4); g.add(sg);
    add(g, at, 13, 11, place('Community Garden'), 'park');
  }

  // picnic lawn: lush grass, picnic tables, bunting between two posts, shade trees
  at = site(13, 10);
  if (at) {
    const g = new THREE.Group(), wood = mat(0xa87950);
    g.add(pad(13, 10, 0x8fbf5a, 0.04));
    [[-3.5, -1.5], [2, -2], [-1, 2.5], [4, 2.2]].forEach(([x, z]) => {
      g.add(new THREE.Mesh(box(1.8, 0.08, 0.8, x, 0.75, z), wood), new THREE.Mesh(box(1.8, 0.06, 0.3, x, 0.45, z - 0.6), wood), new THREE.Mesh(box(1.8, 0.06, 0.3, x, 0.45, z + 0.6), wood), new THREE.Mesh(box(0.1, 0.75, 0.1, x - 0.7, 0.37, z), wood), new THREE.Mesh(box(0.1, 0.75, 0.1, x + 0.7, 0.37, z), wood));
      cols.push({ name: 'picnic_table', cx: at.x + x, cz: at.z + z, hx: 0.9, hz: 0.75, ry: 0, h: 0.8 });
    });
    const posts = [[-6, -4.5], [6, -4.5]];
    posts.forEach(([x, z]) => g.add(new THREE.Mesh(box(0.1, 3, 0.1, x, 1.5, z), mat(0x263832))));
    for (let i = 0; i < 14; i++) { const u = i / 13, x = -6 + u * 12, y = 2.9 - Math.sin(u * Math.PI) * 0.6; g.add(new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 3).rotateX(Math.PI).translate(x, y - 0.2, -4.5), mat([0xe46f4f, 0xf2b33d, 0x2a9d94, 0xf7efdc][i % 4]))); }
    const tg = treeGeo(), leaf = new THREE.MeshStandardMaterial({ color: 0x5b7d55, roughness: 0.85, flatShading: true }), trunk = mat(0x7d5a3c);
    [[-5.5, 3.5], [5.5, -2]].forEach(([x, z]) => { const t = new THREE.Group(); t.add(new THREE.Mesh(tg[0], trunk)); tg.slice(1).forEach((q) => t.add(new THREE.Mesh(q, leaf))); t.position.set(x, 0, z); g.add(t); cols.push({ name: 'park_tree', cx: at.x + x, cz: at.z + z, hx: 0.25, hz: 0.25, ry: 0 }); });
    const sg = signFor('PICNIC LAWN', '#5f9a45'); sg.position.set(0, 0, 5); g.add(sg);
    add(g, at, 13, 10, place('Picnic Lawn'), 'park');
  }

  world.addColliders(cols);
  return {
    group, pois, used,
    update(t) { if (reduced) return; anim.forEach((a) => { const h = 0.4 + 1.4 * Math.max(0, Math.sin(t * 2.2 + a.ph)); a.j.scale.y = h; }); },
  };
}
