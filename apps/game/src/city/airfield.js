import * as THREE from 'three';
import { MeshBuilder } from '../mesh.js';
import { aircraft, AIRLINES } from '../look/airport.js';
import { FONT } from '../look/uikit.js';

// The city's airport, where it really is (Elvis, 13 October 2026: "where are the airports? I can't visibly see the
// airport"). Baked from OpenStreetMap by scripts/city/airport.mjs into public/city/<city>/airport.json, in the city's
// frame: the airfield's grass, its aprons and taxiways, the runways at their real length and heading with the markings a
// pilot lands on (threshold bars, the runway's numbers, the centreline, aiming point and touchdown zone), the terminals,
// hangars and the tower, airliners at the gates, and the traffic: arrivals on a 3 degree glide path down to the runway
// and departures rolling and climbing out, the way the wind has them all use the same end. Its planes are seen from
// across the city, so they are drawn through the haze a little more than the ground is (a plane on finals is the first
// thing you notice of an airport). The terminal you go into is the airport's interior (look/airport.js).
//
// Everything flat is one mesh per layer, lifted toward the camera by polygon offset (grass, then aprons, taxiways,
// runways and their paint), so the layers never fight even kilometres away; the parked planes are instanced.

const TAN3 = Math.tan((3 * Math.PI) / 180);
const COL = { grass: '#8db35f', apron: '#cbc6ba', taxi: '#6d7073', runway: '#585b5f', paint: '#f4f1e8', yellow: '#e9b632', cream: '#efe8d9', glass: '#5b7c89', roof: '#dcd9d1', hangar: '#c3c8ce', hangarRoof: '#9fb0bb', bld: '#e2d5bd', tower: '#ece6d8', cab: '#2f4752' };

// the haze: an airport out past the city's box is seen further than the city round you is (HAZE times the fog's reach), the
// way a runway and its terminal stand out from a plane window long before the streets do
let HAZE = 1;
function hazed(m, k = HAZE) {
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG\n float fogFactor = smoothstep( fogNear, fogFar, vFogDepth / ${k.toFixed(2)} );\n gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );\n#endif`); };
  m.customProgramCacheKey = () => `bw-airfield-${k}`; return m;
}
const flatMat = (offset) => hazed(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -offset, polygonOffsetUnits: -offset * 4 }));
const pairs = (f) => { const o = []; for (let i = 0; i + 1 < f.length; i += 2) o.push([f[i], f[i + 1]]); return o; };
// a polygon of [x, z] points, flat at y, as triangles
function polyTris(pts, y) {
  const c = pts.map(([x, z]) => new THREE.Vector2(x, z)); if (THREE.ShapeUtils.isClockWise(c)) c.reverse();
  const out = []; THREE.ShapeUtils.triangulateShape(c, []).forEach((t) => t.forEach((i) => out.push(c[i].x, y, c[i].y)));
  // facing up: x, z in the shape's plane wind the other way once z points south
  for (let i = 0; i < out.length; i += 9) for (let k = 0; k < 3; k++) { const a = out[i + 3 + k]; out[i + 3 + k] = out[i + 6 + k]; out[i + 6 + k] = a; }
  return out;
}
// a flat quad: centre (x, z), along (ux, uz) for len, across for wid
function quad(arr, x, z, ux, uz, len, wid, y) {
  const vx = -uz, vz = ux, l = len / 2, w = wid / 2;
  const P = [[x - ux * l - vx * w, z - uz * l - vz * w], [x + ux * l - vx * w, z + uz * l - vz * w], [x + ux * l + vx * w, z + uz * l + vz * w], [x - ux * l + vx * w, z - uz * l + vz * w]];
  const up = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 0; // y up when x east, z south
  const tri = (a, b, c) => (up(a, b, c) ? arr.push(a[0], y, a[1], b[0], y, b[1], c[0], y, c[1]) : arr.push(a[0], y, a[1], c[0], y, c[1], b[0], y, b[1]));
  tri(P[0], P[1], P[2]); tri(P[0], P[2], P[3]);
}
function disc(arr, x, z, r, y, n = 10) { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2; arr.push(x, y, z, x + Math.cos(b) * r, y, z + Math.sin(b) * r, x + Math.cos(a) * r, y, z + Math.sin(a) * r); } }
const segDist = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); return Math.hypot(x - ax - dx * u, z - az - dz * u); };
const inPoly = (x, z, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const centroid = (p) => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];
const grow = (p, k) => { const [cx, cz] = centroid(p); return p.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]); };

// the runways' numbers, all in one canvas: "18" over "R", white paint
function numbersTexture(list) {
  const cw = 256, ch = 320, cv = document.createElement('canvas'); cv.width = cw * Math.max(1, list.length); cv.height = ch;
  const c = cv.getContext('2d'); c.fillStyle = COL.paint; c.textAlign = 'center'; c.textBaseline = 'middle';
  list.forEach((d, i) => {
    const n = d.replace(/[LRC]$/, ''), side = d.slice(n.length);
    // (the letter nearer the threshold, the number beyond it, as a pilot on finals reads them)
    c.font = `800 ${side ? 150 : 190}px ${FONT}`; c.fillText(n, cw * i + cw / 2, side ? ch * 0.32 : ch / 2);
    if (side) { c.font = `800 120px ${FONT}`; c.fillText(side, cw * i + cw / 2, ch * 0.78); }
  });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

/**
 * @param data airport.json (scripts/city/airport.mjs)
 * @param o { quality: 'low' | 'medium' | 'high' | 'ultra' }
 * @returns { group, update(dt, camera, fog), setNight(n), dispose }
 */
export function createAirfield(data, { quality = 'high' } = {}) {
  const group = new THREE.Group(); group.name = 'airfield';
  const low = quality === 'low', mats = [], geos = [];
  HAZE = data.inBox ? 1 : 2.4; // (its grass keeps the city's haze: the runways and terminal show through it, as they do)
  const mesh = (g, m, name) => { const k = new THREE.Mesh(g, m); k.name = name; k.receiveShadow = false; k.castShadow = false; group.add(k); geos.push(g); mats.push(m); return k; };
  const bound = pairs(data.bound);
  const rws = data.runways.map((r) => { const [ax, az, bx, bz] = r.p, L = Math.hypot(bx - ax, bz - az); return { ...r, ax, az, bx, bz, L, ux: (bx - ax) / L, uz: (bz - az) / L }; });

  // ---------- the ground: grass inside the fence (out past the city's box only; inside it the city's own ground shows) ----------
  if (!data.inBox) { const mb = new MeshBuilder(); mb.raw(polyTris(bound, -0.45), COL.grass, { vary: 0.04 }); const m = flatMat(0); hazed(m, 1); mesh(mb.toGeometry(), m, 'airfield-grass'); }
  // aprons
  { const mb = new MeshBuilder(); data.aprons.forEach((f) => { const p = pairs(f); if (p.length >= 3) mb.raw(polyTris(p, 0.1), COL.apron, { vary: 0.02 }); }); if (mb.pos.length) mesh(mb.toGeometry(), flatMat(1), 'airfield-aprons'); }
  // taxiways, with their yellow centrelines
  {
    const tw = [], line = [];
    data.taxiways.forEach(({ w, p: f }) => {
      const p = pairs(f);
      for (let i = 0; i + 1 < p.length; i++) {
        const [ax, az] = p[i], [bx, bz] = p[i + 1], L = Math.hypot(bx - ax, bz - az); if (L < 0.5) continue;
        const ux = (bx - ax) / L, uz = (bz - az) / L;
        quad(tw, (ax + bx) / 2, (az + bz) / 2, ux, uz, L, w, 0.14);
        if (!low) quad(line, (ax + bx) / 2, (az + bz) / 2, ux, uz, L, 0.6, 0.16);
      }
      p.forEach(([x, z]) => disc(tw, x, z, w / 2, 0.14));
    });
    if (tw.length) { const mb = new MeshBuilder(); mb.raw(tw, COL.taxi, { vary: 0.02 }); mesh(mb.toGeometry(), flatMat(2), 'airfield-taxiways'); }
    if (line.length) { const mb = new MeshBuilder(); mb.raw(line, COL.yellow); mesh(mb.toGeometry(), flatMat(4), 'airfield-taxilines'); }
  }
  // runways, and the paint on them
  const ends = [];
  {
    const shoulders = [], surf = [], marks = [];
    rws.forEach((r) => {
      const { L, w, ux, uz } = r, cx = (r.ax + r.bx) / 2, cz = (r.az + r.bz) / 2;
      quad(shoulders, cx, cz, ux, uz, L + 8, w + 6, 0.18);
      quad(surf, cx, cz, ux, uz, L - 2, w, 0.19);
      // across the runway: v = (-uz, ux), to the right of a plane rolling along u
      [-1, 1].forEach((s) => quad(marks, cx - uz * s * (w / 2 - 1.2), cz + ux * s * (w / 2 - 1.2), ux, uz, L - 12, 0.9, 0.2)); // edge lines
      // the centreline: 30 m of paint, 20 m gap, between the numbers
      for (let d = 120; d < L - 150; d += 50) quad(marks, r.ax + ux * (d + 15), r.az + uz * (d + 15), ux, uz, 30, 0.9, 0.2);
      // at each end: threshold bars, the number, the aiming point and the touchdown zone
      [[r.ax, r.az, ux, uz, r.ref[0]], [r.bx, r.bz, -ux, -uz, r.ref[1]]].forEach(([x, z, dx, dz, ref]) => {
        const at = (d, lat) => [x + dx * d - dz * lat, z + dz * d + dx * lat];
        const n = w >= 55 ? 8 : 6, gap = (w / 2 - 3) / n;
        for (let s = -1; s <= 1; s += 2) for (let k = 0; k < n; k++) { const [px, pz] = at(21, s * (3 + gap * (k + 0.5))); quad(marks, px, pz, dx, dz, 30, gap * 0.55, 0.2); }
        [-1, 1].forEach((s) => { const [px, pz] = at(400, s * w * 0.3); quad(marks, px, pz, dx, dz, 45, w * 0.18, 0.2); });
        [[150, 3], [300, 3], [550, 2], [700, 2], [850, 1]].forEach(([d, bars]) => [-1, 1].forEach((s) => { for (let b = 0; b < bars; b++) { const [px, pz] = at(d, s * (w * 0.22 + b * 3.2)); quad(marks, px, pz, dx, dz, 22.5, 1.8, 0.2); } }));
        const [nx, nz] = at(72, 0); ends.push({ x: nx, z: nz, dx, dz, ref, w });
      });
    });
    const put = (arr, col, off, name, vary = 0) => { const mb = new MeshBuilder(); mb.raw(arr, col, { vary }); mesh(mb.toGeometry(), flatMat(off), name); };
    if (shoulders.length) { put(shoulders, COL.taxi, 3, 'airfield-runway-shoulders'); put(surf, COL.runway, 5, 'airfield-runways', 0.015); put(marks, COL.paint, 7, 'airfield-paint'); }
  }
  // the numbers, one plane each, read from the approach
  {
    const list = ends.map((e) => e.ref), tex = numbersTexture(list), pos = [], uv = [], N = list.length;
    ends.forEach((e, i) => {
      const len = 30, wid = Math.min(18, e.w * 0.4), vx = -e.dz, vz = e.dx; // (the bottom of the number toward the threshold)
      const c = (a, b) => [e.x + e.dx * a + vx * b, e.z + e.dz * a + vz * b];
      const p0 = c(-len / 2, -wid / 2), p1 = c(-len / 2, wid / 2), p2 = c(len / 2, wid / 2), p3 = c(len / 2, -wid / 2), u0 = i / N, u1 = (i + 1) / N;
      // text's left on the pilot's left: across the runway's left side (v points to the pilot's right, x east z south)
      const V = [[p0, [u0, 0]], [p1, [u1, 0]], [p2, [u1, 1]], [p3, [u0, 1]]];
      [[0, 2, 1], [0, 3, 2]].forEach((t) => t.forEach((k) => { pos.push(V[k][0][0], 0.21, V[k][0][1]); uv.push(...V[k][1]); }));
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const m = hazed(new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -32 }));
    mesh(g, m, 'airfield-numbers'); mats.push({ dispose: () => tex.dispose() });
  }

  // ---------- buildings: terminals in glass and cream, hangars, the rest plain; and the tower ----------
  {
    const mb = new MeshBuilder();
    data.buildings.forEach(({ k, h, p: f }) => {
      const p = pairs(f); if (p.length < 3) return;
      try {
        if (k === 'terminal') { mb.extrude(p, 0, h * 0.25, COL.cream); mb.extrude(p, h * 0.25, h * 0.6, COL.glass, { grad: 0.15 }); mb.extrude(grow(p, 1.03), h * 0.85, h * 0.15, COL.roof); }
        else if (k === 'hangar') { mb.extrude(p, 0, h * 0.72, COL.hangar); mb.extrude(grow(p, 0.97), h * 0.72, h * 0.28, COL.hangarRoof); }
        else mb.extrude(p, 0, Math.max(4, h), COL.bld);
      } catch { /* a footprint too tangled to triangulate: left out */ }
    });
    data.towers.forEach(([x, z, H = 40]) => {
      mb.cyl(x, 0, z, 2.2, 3, H - 7, 10, COL.tower);
      mb.cyl(x, H - 7.5, z, 5.4, 3.4, 1.6, 8, COL.tower);
      mb.cyl(x, H - 6, z, 5.6, 5, 4, 8, COL.cab, { grad: 0.1 });
      mb.cyl(x, H - 2, z, 6.2, 6.2, 0.8, 8, COL.roof);
      mb.cyl(x, H - 1.2, z, 0.15, 0.15, 6, 4, '#8a8f96');
    });
    if (mb.pos.length) { const g = mb.toGeometry(), m = hazed(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })); const k = mesh(g, m, 'airfield-buildings'); k.castShadow = false; }
  }

  // ---------- airliners at the gates: on the aprons, clear of their edges and each other, nose to the terminal ----------
  const proto = aircraft(AIRLINES[0]);
  {
    const want = { low: 4, medium: 8, high: 12, ultra: 16 }[quality] ?? 10, spots = [];
    const terms = data.terminals?.length ? data.terminals : data.buildings.filter((b) => b.k === 'terminal').map((b) => centroid(pairs(b.p)));
    const aprons = data.aprons.map(pairs).filter((p) => p.length >= 3).sort((a, b) => Math.abs(THREE.ShapeUtils.area(b.map(([x, z]) => new THREE.Vector2(x, z)))) - Math.abs(THREE.ShapeUtils.area(a.map(([x, z]) => new THREE.Vector2(x, z)))));
    const edge = (x, z, p) => { let d = Infinity; for (let i = 0, j = p.length - 1; i < p.length; j = i++) d = Math.min(d, segDist(x, z, p[j][0], p[j][1], p[i][0], p[i][1])); return d; };
    for (const p of aprons) {
      const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]);
      for (let x = Math.min(...xs) + 20; x < Math.max(...xs) - 20 && spots.length < want; x += 48) for (let z = Math.min(...zs) + 20; z < Math.max(...zs) - 20 && spots.length < want; z += 48) {
        if (!inPoly(x, z, p) || edge(x, z, p) < 19 || spots.some((s) => Math.hypot(s.x - x, s.z - z) < 44)) continue;
        if (rws.some((r) => segDist(x, z, r.ax, r.az, r.bx, r.bz) < r.w / 2 + 40)) continue;
        const t = terms.slice().sort((a, b) => Math.hypot(a[0] - x, a[1] - z) - Math.hypot(b[0] - x, b[1] - z))[0];
        spots.push({ x, z, yaw: t ? Math.atan2(t[0] - x, t[1] - z) : 0 });
      }
    }
    if (spots.length) {
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
      proto.children.forEach((part, pi) => {
        const isLivery = pi === 1, mat = hazed(part.material.clone()); mats.push(mat); // (its own: the terminal's planes are not hazed)
        if (isLivery) mat.color.set('#ffffff');
        const im = new THREE.InstancedMesh(part.geometry, mat, spots.length); im.name = 'airfield-parked';
        spots.forEach((s, i) => { q.setFromAxisAngle(up, s.yaw); im.setMatrixAt(i, m4.compose(new THREE.Vector3(s.x, 0.1, s.z), q, one)); if (isLivery) im.setColorAt(i, col.set(AIRLINES[i % AIRLINES.length].col)); });
        im.computeBoundingSphere(); group.add(im);
      });
    }
  }

  // ---------- the traffic: arrivals down the glide path and departures climbing out, on the longest runway ----------
  const R = rws[0], fly = [];
  const P = low ? 160 : 100, D0 = 14000, VAPP = 72, TD = 350; // a plane every P seconds each way; 14 km finals at 72 m/s
  const tApp = (D0 + TD) / VAPP, arrDur = tApp + 33, depDur = 8 + 30 + 170;
  const depOffset = ((tApp % P) + P / 2) % P; // departures roll while the runway is clear of arrivals
  const own = (al) => { const g = aircraft(al); g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.fog = false; o.material.userData.base = o.material.color.clone(); mats.push(o.material); } }); g.visible = false; group.add(g); return g; };
  if (R) {
    const n = Math.ceil(arrDur / P) + Math.ceil(depDur / P);
    for (let i = 0; i < n; i++) fly.push(own(AIRLINES[i % AIRLINES.length]));
  }
  // where a plane is at time s of its trip (along the runway from the threshold, height, pitch), or null when it is gone
  const TB = (VAPP - 14) / 2.2; // touchdown to taxi speed, braking at 2.2 m/s2
  function arrival(t) {
    if (t < tApp) { const s = -D0 + VAPP * t; return { s, h: Math.max(0, (TD - s) * TAN3), pitch: 0.04 }; }
    const k = t - tApp; if (k > 32) return null;
    const s = k < TB ? TD + VAPP * k - 1.1 * k * k : TD + VAPP * TB - 1.1 * TB * TB + 14 * (k - TB);
    return { s, h: 0, pitch: k < 2 ? 0.04 * (1 - k / 2) : 0 };
  }
  function departure(t) {
    if (t < 8) return { s: 0, h: 0, pitch: 0 };
    const k = t - 8, ROLL = 30;
    if (k < ROLL) return { s: 1.3 * k * k, h: 0, pitch: k > ROLL - 3 ? 0.17 * (1 - (ROLL - k) / 3) : 0 };
    const c = k - ROLL; return { s: 1.3 * ROLL * ROLL + (78 + c * 0.25) * c, h: 9 * c, pitch: 0.17 };
  }
  let clock = Math.random() * P;
  const tmp = new THREE.Color();
  function update(dt, camera, fog) {
    if (!R || !fly.length) return;
    if (!self.frozen) clock += dt;
    const nA = Math.ceil(arrDur / P), trips = [];
    for (let i = 0; i < nA; i++) { const t = ((clock % P) + i * P); trips.push(t < arrDur ? arrival(t) : null); }
    for (let i = 0; i < fly.length - nA; i++) { const t = (((clock - depOffset) % P + P) % P) + i * P; trips.push(t < depDur ? departure(t) : null); }
    trips.forEach((tr, i) => {
      const g = fly[i]; if (!tr) { g.visible = false; return; }
      g.visible = true;
      g.position.set(R.ax + R.ux * tr.s, 0.18 + tr.h, R.az + R.uz * tr.s);
      g.rotation.set(0, Math.atan2(R.ux, R.uz), 0); g.rotateX(-tr.pitch);
      // the haze: further planes fade toward the sky's colour, but still show past the city's fog
      if (fog && camera) {
        const d = camera.position.distanceTo(g.getWorldPosition(tmpV)), k = Math.min(0.8, Math.max(0, (d - 800) / 14000));
        g.traverse((o) => { if (o.isMesh) o.material.color.copy(o.material.userData.base).lerp(tmp.copy(fog.color), k); });
      }
    });
  }
  const tmpV = new THREE.Vector3();

  // ---------- at night: the runway's edge lights, a few pixels each however far (seen from the city, a dotted outline) ----------
  let lights = null;
  {
    const pts = [];
    rws.forEach((r) => { for (let d = 0; d <= r.L; d += 60) [-1, 1].forEach((s) => pts.push(r.ax + r.ux * d - r.uz * s * (r.w / 2 + 1), 0.8, r.az + r.uz * d + r.ux * s * (r.w / 2 + 1))); });
    if (pts.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const dpr = typeof devicePixelRatio === 'number' ? Math.min(2, devicePixelRatio) : 1;
      lights = new THREE.Points(g, new THREE.PointsMaterial({ color: new THREE.Color(1.7, 1.45, 1.0), size: 3 * dpr, sizeAttenuation: false, fog: false }));
      lights.visible = false; lights.name = 'airfield-lights'; group.add(lights); geos.push(g); mats.push(lights.material);
    }
  }
  const setNight = (n) => { if (lights) lights.visible = n > 0.15; };
  const dispose = () => { group.removeFromParent(); geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose?.()); };
  // (frozen: the traffic holds still, for a screenshot; planes: where each one flying or rolling is, in the scene)
  const self = { group, update, setNight, dispose, data, frozen: false, planes: () => fly.filter((g) => g.visible).map((g) => g.getWorldPosition(new THREE.Vector3())) };
  return self;
}
