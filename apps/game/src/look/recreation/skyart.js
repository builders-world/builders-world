// The things a skydive is made of, drawn properly (Elvis, 13 October 2026: "the skydiving looks very tacky"): a jump
// plane after the Cessna Caravans and Twin Otters that drop zones fly (round fuselage, high strutted wing, the roll-up
// door on the right), a ram-air canopy with real cells (an arched wing with an airfoil, open mouths at the front, the
// ribs between, the lines down to the risers), a pilot chute for the tandem drogue, a jumpsuit, helmet and goggles, and
// a landing area like a real drop zone's (pea gravel, a canvas ring, the striped windsock). Clay, as the world bible asks.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { C } from '../uikit.js';

const mat = (c, r = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
const flat = (geos) => mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)));
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const rbox = (w, h, d, r, x = 0, y = 0, z = 0) => { // a box with rounded edges, the clay look
  const s = new THREE.Shape(), hw = w / 2 - r, hh = h / 2 - r;
  s.absarc(hw, hh, r, 0, Math.PI / 2); s.absarc(-hw, hh, r, Math.PI / 2, Math.PI); s.absarc(-hw, -hh, r, Math.PI, Math.PI * 1.5); s.absarc(hw, -hh, r, Math.PI * 1.5, Math.PI * 2);
  return new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelSize: r * 0.6, bevelThickness: r, bevelSegments: 3, curveSegments: 4 }).translate(x, y, z - d / 2 + r);
};
// a tapered wing in plan (root chord at x = 0, tip at x = half), with a rounded leading edge, lying flat
function wing(half, root, tip, th, sweep = 0) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(half, -sweep); s.lineTo(half, -sweep - tip); s.lineTo(0, -root); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelSize: th * 0.45, bevelThickness: th * 0.5, bevelSegments: 2 }).rotateX(Math.PI / 2).translate(0, th / 2, root / 2);
}

// ---------- the jump plane: nose along +z, the door on the left (+x), about 12 m long and 16 m across ----------
export function jumpPlane() {
  const g = new THREE.Group();
  const white = [], teal = [], amber = [], dark = [], grey = [];
  // the fuselage, turned on a lathe from its side profile, a little taller than wide
  const prof = [[0.05, -6.6], [0.22, -6.3], [0.42, -4.6], [0.72, -2.6], [0.9, -0.8], [0.93, 1.6], [0.9, 2.9], [0.78, 4.1], [0.62, 4.9], [0.55, 5.2]];
  const lathe = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), 28).rotateX(Math.PI / 2).scale(1, 1.14, 1);
  white.push(lathe);
  // the cowling and spinner
  grey.push(new THREE.CylinderGeometry(0.55, 0.6, 0.5, 24).rotateX(Math.PI / 2).translate(0, 0, 5.4));
  dark.push(new THREE.ConeGeometry(0.2, 0.55, 16).rotateX(Math.PI / 2).translate(0, 0, 5.92));
  // a cheatline down each side and the windows above it; the windscreen
  [-1, 1].forEach((s) => {
    teal.push(box(0.04, 0.2, 9.4, s * 0.905, -0.18, -0.3)); amber.push(box(0.04, 0.07, 9.4, s * 0.9, -0.36, -0.3));
    for (let i = 0; i < 5; i++) if (!(s > 0 && i >= 3)) dark.push(rbox(0.05, 0.36, 0.48, 0.1, s * 0.91, 0.32, 2.2 - i * 0.95));
  });
  dark.push(rbox(1.25, 0.46, 0.06, 0.12).rotateX(-0.85).translate(0, 0.66, 3.45));
  // the open door, on the side the jumpers leave from: a dark opening with the step below it
  dark.push(box(0.06, 1.5, 1.35, 0.92, -0.08, -0.9)); grey.push(box(0.5, 0.05, 0.5, 1.15, -0.85, -0.9));
  // the high wing on the cabin roof, the struts, the tailplane and the fin
  [-1, 1].forEach((s) => {
    const w = wing(8, 2.1, 1.35, 0.22, 0.2); if (s < 0) w.scale(-1, 1, 1); w.translate(0, 1.12, 1.4); white.push(w);
    teal.push(box(0.6, 0.24, 1.3, s * 7.75, 1.12, 0.75)); // the wingtips in colour
    const strut = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8); strut.rotateZ(-s * 0.87).translate(s * 1.85, 0.2, 0.9); grey.push(strut);
    const tp = wing(3.1, 1.3, 0.8, 0.12, 0.3); if (s < 0) tp.scale(-1, 1, 1); tp.translate(0, 0.32, -5.7); white.push(tp);
    // fixed gear: a leg, a wheel and its spat
    grey.push(new THREE.CylinderGeometry(0.05, 0.06, 1.05, 8).rotateZ(s * 0.6).translate(s * 1.05, -1.2, -0.4));
    dark.push(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 16).rotateZ(Math.PI / 2).translate(s * 1.38, -1.62, -0.4));
    white.push(new THREE.SphereGeometry(0.34, 14, 10).scale(0.45, 0.7, 1.45).translate(s * 1.38, -1.52, -0.4));
  });
  grey.push(new THREE.CylinderGeometry(0.05, 0.05, 1, 8).translate(0, -1.1, 3.6)); dark.push(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 14).rotateZ(Math.PI / 2).translate(0, -1.6, 3.6));
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(2.4, 0); fin.lineTo(1.9, 2.0); fin.lineTo(0.9, 2.0); fin.closePath();
  teal.push(new THREE.ExtrudeGeometry(fin, { depth: 0.12, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }).rotateY(Math.PI / 2).translate(-0.06, 0.45, -4.2));
  amber.push(box(0.2, 0.18, 1.0, 0, 1.6, -5.65)); // a band on the fin
  const M = { white: mat('#f5f2ea', 0.55), teal: mat(C.teal, 0.6), amber: mat(C.amber, 0.6), dark: mat('#262a31', 0.3, { metalness: 0.2 }), grey: mat('#a9adb2', 0.45, { metalness: 0.4 }) };
  [[white, M.white], [teal, M.teal], [amber, M.amber], [dark, M.dark], [grey, M.grey]].forEach(([gs, m]) => { const k = new THREE.Mesh(flat(gs), m); k.castShadow = true; g.add(k); });
  // the propeller: three blades, and a soft disc once it is turning
  const prop = new THREE.Group(); prop.position.set(0, 0, 5.75); g.add(prop);
  const blade = new THREE.Mesh(flat([0, 1, 2].map((i) => rbox(0.16, 1.3, 0.05, 0.03, 0, 0.72, 0).rotateZ((i * Math.PI * 2) / 3))), M.dark); prop.add(blade);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.45, 32), new THREE.MeshBasicMaterial({ color: '#40444b', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })); prop.add(disc);
  g.userData.spin = (dt) => { prop.rotation.z += dt * 40; };
  g.userData.door = new THREE.Vector3(0.95, -0.85, -0.9); // the door sill, in the plane's frame
  return g;
}

// ---------- the ram-air canopy: the wing above you, nose along +z, the risers at y = 0 ----------
// span and chord in metres; lines long; cols one colour per cell
export function ramAir({ span = 9, chord = 3.3, lines = 6, cols = [C.coral, C.paper, C.teal, C.amber, C.teal, C.paper, C.coral] } = {}) {
  const g = new THREE.Group();
  const cells = cols.length, NU = cells * 6, NV = 14, A = 0.46, R = span / 2 / Math.sin(A), H = lines;
  const pos = [], col = [], idx = [];
  const tint = (c, k) => { const x = new THREE.Color(c); return x.multiplyScalar(k); };
  // where a point of the skin is: u across the span (-1..1), v along the chord (0 nose, 1 tail), side +1 top, -1 bottom
  const at = (u, v, side) => {
    const a = u * A, th = 0.17 * chord * (2.6 * Math.sqrt(v) - 2.2 * v - 0.4 * v * v) / 1.1; // a thick, blunt airfoil
    const cell = Math.abs(Math.sin(((u + 1) / 2) * cells * Math.PI)); // each cell puffs up between its ribs
    const off = side > 0 ? th * 0.72 + cell * 0.07 * chord * (1 - v) * Math.sqrt(v) : -th * 0.28 + 0.02;
    const r = R + off; return [Math.sin(a) * r, Math.cos(a) * r - R + H, chord * (0.4 - v)];
  };
  const skin = (side, v0, shade) => {
    const base = pos.length / 3;
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
      const u = -1 + (2 * i) / NU, v = v0 + ((1 - v0) * j) / NV; pos.push(...at(u, v, side));
      const c = tint(cols[Math.min(cells - 1, Math.floor(((u + 1) / 2) * cells))], shade); col.push(c.r, c.g, c.b);
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const a = base + i * (NV + 1) + j, b = a + NV + 1;
      if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  };
  skin(1, 0, 1); skin(-1, 0.07, 0.93); // the bottom skin starts behind the nose: the open cell mouths
  // the ribs: the airfoil's outline closed at every cell wall, so the mouths show the cells
  for (let k = 0; k <= cells; k++) {
    const u = -1 + (2 * k) / cells, base = pos.length / 3, c = tint(cols[Math.min(cells - 1, k)], 0.85);
    for (let j = 0; j <= NV; j++) { const v = j / NV; pos.push(...at(u, v, 1), ...at(u, Math.max(v, 0.07), -1)); col.push(c.r, c.g, c.b, c.r, c.g, c.b); }
    for (let j = 0; j < NV; j++) { const a = base + j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const inner = new THREE.Group(); g.add(inner); // the wing and its lines, which grow together as it opens
  // nylon lets the daylight through: the underside glows with its own colour instead of going muddy in the shade
  const cloth = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide });
  cloth.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vColor.rgb * 0.38;'); };
  const wingMesh = new THREE.Mesh(geo, cloth); wingMesh.castShadow = true; inner.add(wingMesh);
  // the lines: four rows under every rib, cascading to a riser on each side
  const L = []; const riser = (x) => [x, 0.25, 0];
  for (let k = 0; k <= cells; k++) {
    const u = -1 + (2 * k) / cells, s = u < 0 ? -1 : 1;
    for (const v of [0.12, 0.35, 0.6, 0.92]) { const p = at(u, v, -1), mid = [p[0] * 0.55 + s * 0.12, H * 0.4, p[2] * 0.4]; L.push(...p, ...mid, ...mid, ...riser(s * 0.22)); }
  }
  // the brake lines from the tail to the toggles, a little apart
  [-1, 1].forEach((s) => { const p = at(s * 0.9, 1, -1); L.push(...p, s * 0.3, 0.1, -0.15); });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
  inner.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#4b4038', transparent: true, opacity: 0.8 })));
  // the slider, down at the risers once the canopy is open
  const slider = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: C.teal, side: THREE.DoubleSide, roughness: 0.8 })); slider.position.y = 0.6; g.add(slider);
  g.userData.wing = wingMesh; g.userData.slider = slider;
  // the opening: the slider rides down the lines as the cells fill from the middle out
  g.userData.setOpen = (f) => {
    const e = 1 - Math.pow(1 - f, 3), wob = f < 1 ? Math.sin(f * 18) * 0.06 * (1 - f) : 0;
    inner.scale.set(0.18 + 0.82 * e + wob, 0.8 + 0.2 * e, 0.45 + 0.55 * e);
    slider.position.y = 0.6 + (1 - e) * H * 0.7;
  };
  return g;
}

// ---------- the pilot chute that slows a tandem (the drogue), with its bridle ----------
export function drogueChute() {
  const g = new THREE.Group();
  const prof = []; for (let i = 0; i <= 10; i++) { const a = (i / 10) * (Math.PI / 2) * 0.92; prof.push(new THREE.Vector2(0.1 + Math.sin(a) * 0.6, Math.cos(a) * 0.45)); }
  const cap = new THREE.LatheGeometry(prof, 20);
  const colours = []; const p = cap.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), c = new THREE.Color(Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8) % 2 ? C.amber : C.paper); colours.push(c.r, c.g, c.b); }
  cap.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  g.add(new THREE.Mesh(cap, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 })));
  const lines = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; lines.push(Math.cos(a) * 0.68, 0.05, Math.sin(a) * 0.68, 0, -0.8, 0); }
  lines.push(0, -0.8, 0, 0, -4.2, 0); // the bridle, down to the container
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#4b4038' })));
  return g;
}

// ---------- the kit: a helmet with goggles, a harness and the container on your back ----------
export function kitUp(p, { colour = C.teal, container = '#2b2f36', tandem = false } = {}) {
  const neck = p.rig?.neck, added = [];
  if (neck) {
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.235, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.45).scale(1, 1.02, 1.08), mat(colour, 0.35));
    helmet.position.set(0, 0.23, -0.015); neck.add(helmet); added.push(helmet);
    const goggles = new THREE.Mesh(rbox(0.36, 0.11, 0.08, 0.04), mat('#1f2a35', 0.15, { metalness: 0.5 })); goggles.position.set(0, 0.255, 0.2); neck.add(goggles); added.push(goggles);
  }
  const web = mat('#2b2f36', 0.7), parts = [];
  [-1, 1].forEach((s) => parts.push(box(0.05, 0.62, 0.3, s * 0.13, 1.08, 0)));
  parts.push(box(0.36, 0.04, 0.31, 0, 1.2, 0)); // the chest strap
  const harness = new THREE.Mesh(flat(parts), web); p.obj.add(harness); added.push(harness);
  if (!tandem) { const pack = new THREE.Mesh(rbox(0.44, 0.6, 0.2, 0.06), mat(container, 0.6)); pack.position.set(0, 1.08, -0.24); p.obj.add(pack); added.push(pack); }
  return () => added.forEach((m) => m.removeFromParent());
}

// ---------- the landing area: pea gravel, a canvas ring and a cross, a striped windsock on its mast ----------
export function landingArea(windDir, windSpd) {
  const g = new THREE.Group();
  const gravel = new THREE.Mesh(new THREE.CircleGeometry(16, 56).rotateX(-Math.PI / 2), mat('#d9c7a2', 1)); g.add(gravel);
  const rim = new THREE.Mesh(new THREE.RingGeometry(16, 16.6, 56).rotateX(-Math.PI / 2), mat('#b9a27c', 1)); rim.position.y = 0.004; g.add(rim);
  [[11, 12.2, C.paper], [6, 7, C.coral]].forEach(([a, b, c]) => { const m = new THREE.Mesh(new THREE.RingGeometry(a, b, 56).rotateX(-Math.PI / 2), mat(c, 0.9)); m.position.y = 0.008; g.add(m); });
  const cross = new THREE.Mesh(flat([box(4.6, 0.02, 0.8), box(0.8, 0.02, 4.6)]), mat(C.coral, 0.85)); cross.position.y = 0.012; cross.rotation.y = Math.PI / 4; g.add(cross);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24).rotateX(-Math.PI / 2), mat(C.amber, 0.8)); disc.position.y = 0.016; g.add(disc);
  // the windsock: a mast with a ring, the sock in orange and white bands; it fills and lifts with the wind
  const mast = new THREE.Group(); mast.position.set(19, 0, 0); g.add(mast);
  mast.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 6.5, 10).translate(0, 3.25, 0), mat('#d8d2c4', 0.5, { metalness: 0.3 })));
  const sock = new THREE.Group(); sock.position.y = 6.2; mast.add(sock);
  sock.add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 20).rotateY(Math.PI / 2), mat('#d8d2c4', 0.5)));
  for (let i = 0; i < 5; i++) {
    const r0 = 0.42 - i * 0.05, r1 = r0 - 0.05, seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 0.5, 14, 1, true).rotateZ(Math.PI / 2).translate(0.25 + i * 0.5, 0, 0), new THREE.MeshStandardMaterial({ color: i % 2 ? '#f6f1e6' : '#ef7d32', roughness: 0.8, side: THREE.DoubleSide }));
    sock.add(seg);
  }
  sock.rotation.y = -windDir + Math.PI / 2; sock.rotation.z = -Math.max(0, 0.9 - windSpd * 0.15); // a light wind lets it droop
  // two feather flags by the ring, in the drop zone's colours
  [[-14, 9], [-9, -14]].forEach(([x, z], i) => {
    const f = new THREE.Group(); f.position.set(x, 0, z); g.add(f);
    f.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.4, 6).translate(0, 1.7, 0), mat('#54575c', 0.5)));
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0, 2.9); s.quadraticCurveTo(0.9, 3.1, 0.8, 2.2); s.lineTo(0.7, 0.3); s.closePath();
    f.add(new THREE.Mesh(new THREE.ShapeGeometry(s).translate(0, 0.4, 0), new THREE.MeshStandardMaterial({ color: i ? C.teal : C.amber, side: THREE.DoubleSide, roughness: 0.85 })));
    f.rotation.y = -windDir;
  });
  g.traverse((m) => { if (m.isMesh) m.receiveShadow = true; });
  return g;
}

// ---------- clouds on the way down, and the air rushing past ----------
const puffMat = () => new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#c9d3df', emissiveIntensity: 0.35, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
export function cloudBank(around, seed = 3) {
  const g = new THREE.Group(), geo = new THREE.IcosahedronGeometry(1, 2), m = puffMat();
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const N = 9, mesh = new THREE.InstancedMesh(geo, m, N * 7), M4 = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < N; i++) {
    // one right in your path at about 2,200 m, the rest round it, so you fall past them and through one
    const a = rnd() * Math.PI * 2, d = i === 0 ? 0 : 120 + rnd() * 500, y = i === 0 ? 2200 : 1700 + rnd() * 1000, sz = 40 + rnd() * 70;
    const cx = around.x + Math.cos(a) * d, cz = around.z + Math.sin(a) * d;
    for (let b = 0; b < 7; b++) {
      const ba = rnd() * Math.PI * 2, br = b ? (0.3 + rnd() * 0.7) * sz : 0, r = sz * (b ? 0.35 + rnd() * 0.35 : 0.7);
      M4.makeScale(r, r * 0.62, r).setPosition(cx + Math.cos(ba) * br, y + rnd() * sz * 0.2, cz + Math.sin(ba) * br * 0.7); mesh.setMatrixAt(k++, M4);
    }
  }
  mesh.count = k; mesh.frustumCulled = false; g.add(mesh);
  return g;
}
// streaks of air going past you in freefall: thin white dashes that rush upward round the camera
export function airRush(n = 36) {
  const geo = new THREE.BoxGeometry(0.02, 2.4, 0.02), m = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.32, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geo, m, n); mesh.frustumCulled = false;
  const pts = Array.from({ length: n }, () => ({ a: Math.random() * Math.PI * 2, r: 2 + Math.random() * 7, y: Math.random() * 30 - 15 }));
  const M4 = new THREE.Matrix4();
  mesh.userData.update = (P, speed, dt) => {
    pts.forEach((p, i) => { p.y += speed * dt; if (p.y > 15) { p.y -= 30; p.a = Math.random() * Math.PI * 2; p.r = 2 + Math.random() * 7; } M4.makeScale(1, 0.4 + speed / 40, 1).setPosition(P.x + Math.cos(p.a) * p.r, P.y + p.y, P.z + Math.sin(p.a) * p.r); mesh.setMatrixAt(i, M4); });
    mesh.instanceMatrix.needsUpdate = true; m.opacity = Math.min(0.32, speed / 160);
  };
  return mesh;
}

// ---------- the altimeter on your wrist: one turn is 4,000 m, red below 1,000, yellow to the pull height ----------
export function altimeter(pull = 1500) {
  const el = document.createElement('div'); el.id = 'bw-alti';
  const arc = (a0, a1, c) => { const p = (v) => { const a = (v / 4000) * Math.PI * 2 - Math.PI / 2; return `${50 + Math.cos(a) * 40} ${50 + Math.sin(a) * 40}`; }; return `<path d="M${p(a0)} A40 40 0 0 1 ${p(a1)}" stroke="${c}" stroke-width="7" fill="none"/>`; };
  const ticks = Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * Math.PI * 2 - Math.PI / 2, r0 = i % 10 ? 42 : 37; return `<line x1="${50 + Math.cos(a) * r0}" y1="${50 + Math.sin(a) * r0}" x2="${50 + Math.cos(a) * 45}" y2="${50 + Math.sin(a) * 45}" stroke="#3b2a20" stroke-width="${i % 10 ? 0.8 : 1.6}"/>`; }).join('');
  const nums = [0, 1, 2, 3].map((n) => { const a = (n / 4) * Math.PI * 2 - Math.PI / 2; return `<text x="${50 + Math.cos(a) * 29}" y="${53.5 + Math.sin(a) * 29}" text-anchor="middle">${n}</text>`; }).join('');
  el.innerHTML = `<style>#bw-alti{position:fixed;left:16px;bottom:84px;z-index:36;display:flex;align-items:center;gap:10px;background:${C.paper};border-radius:60px;padding:6px 16px 6px 6px;box-shadow:0 3px 0 rgba(59,42,32,.22);font:800 13px/1.15 system-ui,sans-serif;color:${C.ink};pointer-events:none}
    #bw-alti svg{width:74px;height:74px} #bw-alti text{font:800 10px system-ui,sans-serif;fill:#3b2a20} #bw-alti .n{font-size:20px} #bw-alti .s{opacity:.7;font-weight:700}
    body.bw-sky #lk-score .card{display:none}
    @media (pointer:coarse){#bw-alti{bottom:104px}} @media (max-width:600px){#bw-alti svg{width:58px;height:58px}#bw-alti .n{font-size:16px}}</style>
    <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#fbf6ec" stroke="#3b2a20" stroke-width="2"/>${arc(0, 1000, '#e0573e')}${arc(1000, pull, '#f2b631')}${ticks}${nums}
    <text x="50" y="68" text-anchor="middle" style="font-size:6px;font-weight:700">× 1000 m</text><g class="nd"><line x1="50" y1="56" x2="50" y2="14" stroke="#3b2a20" stroke-width="2.6" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="${C.coral}"/></g></svg>
    <div><div class="n">0 m</div><div class="s">0 km/h</div></div>`;
  document.body.appendChild(el); document.body.classList.add('bw-sky');
  const nd = el.querySelector('.nd'), n = el.querySelector('.n'), s = el.querySelector('.s');
  return {
    set(alt, kmh, label = 'down') { nd.setAttribute('transform', `rotate(${((Math.max(0, alt) % 4000) / 4000) * 360} 50 50)`); n.textContent = `${Math.round(Math.max(0, alt)).toLocaleString()} m`; s.textContent = `${Math.round(kmh)} km/h ${label}`; },
    remove() { el.remove(); document.body.classList.remove('bw-sky'); },
  };
}
