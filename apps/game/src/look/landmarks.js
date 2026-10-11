import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { signTexture } from './props.js';
import { cityInfo } from './cityinfo.js';
import { buildKind, buildSkyline } from './landkit.js';

// Yaba's landmarks (world bible 4.7): the places anyone from Yaba knows. The district is a few hundred
// metres across and the real places are spread over kilometres, so each is built inside the district
// on the side it really lies (a compressed map, as open-world games do), facing the nearest road, with
// its name big enough to read from the street. The National Stadium, too far to bring in, stands on
// the skyline at its true bearing. E at each one tells you what it is.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const sign = (text, bg, fg, w, h, sub) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTexture(text, { bg, fg, w: Math.round(w * 140), h: Math.round(h * 140), sub }), color: 0xe8e8e8 }));

// each model faces +z (its front, onto the road); returns { g, W, D, h }
const MODELS = {
  yabatech() { // the college gate: a wide arch over the drive, blue and white, the name across the top
    const g = new THREE.Group(), white = M(0xf2efe6), blue = M(0x1f4f9a), W = 22, D = 20;
    [-6.5, 6.5].forEach((x) => g.add(new THREE.Mesh(box(1.6, 6.5, 1.6, x, 3.25, 3.6), white), new THREE.Mesh(box(1.9, 0.5, 1.9, x, 6.6, 3.6), blue)));
    g.add(new THREE.Mesh(box(15, 1.6, 1.2, 0, 7.4, 3.6), blue));
    const s = sign('YABA COLLEGE OF TECHNOLOGY', '#1f4f9a', '#ffffff', 13.5, 1.2, 'Est. 1947'); s.position.set(0, 7.4, 4.22); g.add(s);
    // a gatehouse, the wall either side, a block of the college behind
    g.add(new THREE.Mesh(box(2.6, 2.6, 2.4, 9, 1.3, 2.6), white), new THREE.Mesh(box(3, 0.2, 2.8, 9, 2.7, 2.6), blue));
    g.add(new THREE.Mesh(box(3.4, 2, 0.4, -9.2, 1, 4), white));
    // the drive in through the gate, and a college block set back behind it
    g.add(new THREE.Mesh(box(6, 0.06, 10, 0, 0.1, -1), M(0xb9b3a6)));
    g.add(new THREE.Mesh(box(18, 8, 5, 0, 4, -8.5), M(0xe9e2d0)), new THREE.Mesh(box(18.4, 0.5, 5.4, 0, 8.25, -8.5), blue));
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) g.add(new THREE.Mesh(box(1.6, 1.2, 0.05, -7 + i * 2.8, 2.2 + j * 3, -5.98), M(0x7fb3d0, { roughness: 0.3 })));
    // the gate stands on the front edge of its land
    return { g, W, D, h: 8.5, cols: [[-6.5, 3.6, 1.6, 1.6], [6.5, 3.6, 1.6, 1.6], [9, 2.6, 2.6, 2.4], [0, -8.5, 18, 5], [-9.2, 4, 3.4, 0.4]] };
  },
  unilag() { // the main gate at Akoka: twin towers joined by a deep lintel, the crest between
    const g = new THREE.Group(), cream = M(0xeee4cc), gold = M(0xc9952a), green = M(0x2f6b4f), W = 24, D = 8;
    [-5, 5].forEach((x) => { g.add(new THREE.Mesh(box(2.2, 9, 2.2, x, 4.5, 2), cream), new THREE.Mesh(box(2.6, 0.6, 2.6, x, 9.2, 2), gold)); });
    g.add(new THREE.Mesh(box(12.2, 2.2, 2, 0, 9.6, 2), cream));
    const s = sign('UNIVERSITY OF LAGOS', '#2f6b4f', '#f2c94c', 11, 1.3, 'Akoka · Founded 1962'); s.position.set(0, 9.6, 3.02); g.add(s);
    const crest = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), gold); crest.position.set(0, 11.6, 2.4); g.add(crest);
    [-9, 9].forEach((x) => g.add(new THREE.Mesh(box(6, 2.2, 0.5, x, 1.1, 2.5), cream), new THREE.Mesh(box(6, 0.2, 0.7, x, 2.3, 2.5), green)));
    g.add(new THREE.Mesh(box(3, 2.6, 2.4, -8.5, 1.3, -0.5), cream));
    return { g, W, D, h: 12.5, cols: [[-5, 2, 2.2, 2.2], [5, 2, 2.2, 2.2], [-9, 2.5, 6, 0.5], [9, 2.5, 6, 0.5], [-8.5, -0.5, 3, 2.4]] };
  },
  tejuosho() { // the rebuilt market: a long three-storey block with an arched roofline, umbrellas in front
    const g = new THREE.Group(), body = M(0xe8d6b0), trim = M(0xc0462f), W = 30, D = 14;
    g.add(new THREE.Mesh(box(28, 10, 10, 0, 5, -2), body));
    for (let k = 0; k < 4; k++) { const arch = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 10.2, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(-10.5 + k * 7, 10, -2), trim); g.add(arch); }
    for (let f = 0; f < 3; f++) g.add(new THREE.Mesh(box(28.1, 0.3, 10.1, 0, 3.3 * (f + 1), -2), trim));
    for (let i = 0; i < 8; i++) for (let f = 0; f < 3; f++) g.add(new THREE.Mesh(box(2.2, 1.6, 0.05, -12 + i * 3.4, 1.6 + f * 3.3, 3.03), M(0x6f8f9a, { roughness: 0.4 })));
    const s = sign('TEJUOSHO MARKET', '#c0462f', '#ffffff', 12, 1.6, 'Yaba'); s.position.set(0, 8.2, 3.08); g.add(s);
    const cols = ['#e46f4f', '#f2b33d', '#2a9d94', '#7d5aa6', '#4f8a4a'];
    for (let i = 0; i < 7; i++) {
      const x = -12 + i * 4, u = new THREE.Group(); u.position.set(x, 0, 5.2);
      u.add(new THREE.Mesh(box(0.06, 2.2, 0.06, 0, 1.1, 0), M(0x3b3f45)), new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.6, 8).translate(0, 2.4, 0), M(cols[i % cols.length])), new THREE.Mesh(box(1.6, 0.8, 0.9, 0, 0.4, 0.5), M(0xa87950)));
      g.add(u);
    }
    return { g, W, D, h: 13, cols: [[0, -2, 28, 10], ...[0, 1, 2, 3, 4, 5, 6].map((i) => [-12 + i * 4, 5.7, 1.6, 0.9])] };
  },
  cchub() { // the hub on Herbert Macaulay Way: a tall block, a glass front, the name down the side
    const g = new THREE.Group(), W = 14, D = 12;
    g.add(new THREE.Mesh(box(11, 20, 9, 0, 10, -1), M(0x2f3a40)));
    for (let f = 0; f < 6; f++) g.add(new THREE.Mesh(box(10.6, 2.4, 0.05, 0, 1.8 + f * 3.2, 3.52), M(0x7fb3d0, { roughness: 0.25, metalness: 0.2 })));
    g.add(new THREE.Mesh(box(11.2, 0.6, 9.2, 0, 20.3, -1), M(0x7cb342)));
    const s = sign('CcHUB', '#7cb342', '#ffffff', 2.4, 9, ''); s.rotation.y = Math.PI / 2; s.position.set(5.53, 12, 1.5); g.add(s);
    const f = sign('CO-CREATION HUB', '#2f3a40', '#7cb342', 9, 1.1, 'Since 2010 · Yaba'); f.position.set(0, 4.2, 3.6); g.add(f);
    return { g, W, D, h: 21, cols: [[0, -1, 11, 9]] };
  },
  ecentre() { // the mall and cinema at Sabo: a broad box, a lit marquee, the cinema drum on the corner
    const g = new THREE.Group(), W = 26, D = 16;
    g.add(new THREE.Mesh(box(24, 9, 12, 0, 4.5, -2), M(0xd9d2c6)));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 12, 20).translate(10, 6, 2), M(0x7a3b5e)));
    const s = sign('E-CENTRE', '#7a3b5e', '#ffffff', 10, 2, 'Shopping · Cinema'); s.position.set(-3, 7, 4.05); g.add(s);
    const m = sign('NOW SHOWING', '#1d1d1d', '#f2c94c', 6, 1, ''); m.position.set(10, 9.8, 6.05); g.add(m);
    g.add(new THREE.Mesh(box(14, 0.3, 3, -3, 3.4, 5.2), M(0x3b3f45)));
    return { g, W, D, h: 12, cols: [[0, -2, 24, 12], [10, 2, 8, 8]] };
  },
  queens() { // the girls' school: a long colonial block with a veranda, the gate, the name on the wall
    const g = new THREE.Group(), W = 26, D = 12;
    g.add(new THREE.Mesh(box(22, 7, 7, 0, 3.5, -2), M(0xf2ead4)), new THREE.Mesh(box(23, 0.4, 8.6, 0, 7.2, -1.4), M(0x9b2f2f)));
    for (let i = 0; i < 10; i++) g.add(new THREE.Mesh(box(0.3, 3.4, 0.3, -9.9 + i * 2.2, 1.7, 2.1), M(0xffffff)));
    g.add(new THREE.Mesh(box(22, 0.3, 2.6, 0, 3.5, 1.2), M(0x9b2f2f)));
    const s = sign("QUEEN'S COLLEGE", '#1f3d7a', '#ffffff', 9, 1.2, 'Lagos · Founded 1927'); s.position.set(0, 5.4, 1.53); g.add(s);
    return { g, W, D, h: 7.5, cols: [[0, -2, 22, 7]] };
  },
  dominic() { // a church on Herbert Macaulay Way: a nave, a tall bell tower with a cross
    const g = new THREE.Group(), W = 14, D = 22, white = M(0xf3efe6), roof = M(0x8a3a2a);
    g.add(new THREE.Mesh(box(9, 7, 16, 0, 3.5, -3), white));
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 6.6, 4, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 2.4).translate(0, 9, -3), roof); g.add(r);
    g.add(new THREE.Mesh(box(3.4, 15, 3.4, 0, 7.5, 6.5), white), new THREE.Mesh(new THREE.ConeGeometry(2.4, 4, 4).rotateY(Math.PI / 4).translate(0, 17, 6.5), roof));
    g.add(new THREE.Mesh(box(0.25, 2, 0.25, 0, 20, 6.5), M(0xd9a83a)), new THREE.Mesh(box(1.2, 0.25, 0.25, 0, 20.3, 6.5), M(0xd9a83a)));
    const s = sign("ST. DOMINIC'S CATHOLIC CHURCH", '#f3efe6', '#3b2a20', 8, 0.9, 'Yaba'); s.position.set(0, 4.4, 8.22); g.add(s);
    g.add(new THREE.Mesh(box(1.8, 3, 0.1, 0, 1.5, 8.22), M(0x6b4a30)));
    return { g, W, D, h: 21, cols: [[0, -3, 9, 16], [0, 6.5, 3.4, 3.4]] };
  },
};

export const YABA_LANDMARKS = [
  { key: 'yabatech', name: 'Yaba College of Technology', lat: 6.5185, lon: 3.3730, fact: "Yaba Tech, founded in 1947: Nigeria's first institution of higher education." },
  { key: 'unilag', name: 'University of Lagos', lat: 6.5158, lon: 3.3897, fact: 'UNILAG, founded in 1962, out at Akoka. Half of Yaba\'s builders went through this gate.' },
  { key: 'cchub', name: 'Co-Creation Hub', lat: 6.5163, lon: 3.3787, fact: 'CcHub opened on Herbert Macaulay Way in 2010 and helped make Yaba the home of Nigerian tech: "Yabacon Valley".' },
  { key: 'tejuosho', name: 'Tejuosho Market', lat: 6.5050, lon: 3.3700, fact: 'One of the biggest markets on the mainland, rebuilt as a modern complex. Fabric, shoes, phones, everything.' },
  { key: 'ecentre', name: 'E-Centre', lat: 6.5058, lon: 3.3778, fact: 'E-Centre at Sabo: shopping, food and the cinema everyone in Yaba has queued at.' },
  { key: 'queens', name: "Queen's College", lat: 6.5005, lon: 3.3768, fact: "Queen's College, the girls' school founded in 1927." },
  { key: 'dominic', name: "St. Dominic's Catholic Church", lat: 6.5128, lon: 3.3760, fact: "St. Dominic's, a Yaba parish on Herbert Macaulay Way." },
];

export function buildLandmarks({ world, scene, props, used = [] }) {
  const group = new THREE.Group(); group.name = 'landmarks'; scene.add(group);
  const c = world.center?.lat != null ? world.center : { lat: 6.5095, lon: 3.3715 };
  const toXZ = (lat, lon) => [(lon - c.lon) * 111320 * Math.cos((c.lat * Math.PI) / 180), -(lat - c.lat) * 110574];
  const R = world.radius, out = [];
  const freeAt = (x, z) => world.costAt?.(x, z) < 2.6 && !world.inPlot?.(x, z, 0.5) && !world.onCarriageway?.(x, z, 0.3) && !world.inReserve?.(x, z); // (off the pavement too) // (a zebra is cheap to walk, but it is road)
  // the nearest road direction from a spot: the landmark faces it
  const faceRoad = (x, z) => { for (let r = 3; r < 40; r += 1) for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; if (world.onCarriageway?.(x + Math.sin(a) * r, z + Math.cos(a) * r)) return a; } return 0; };
  const fits = (x, z, ry, W, D) => {
    const cs = Math.cos(ry), sn = Math.sin(ry);
    for (let u = -W / 2; u <= W / 2; u += 2) for (let v = -D / 2; v <= D / 2; v += 2) { const px = x + u * cs + v * sn, pz = z - u * sn + v * cs; if (!freeAt(px, pz)) return false; }
    return !used.some((q) => Math.abs(q.x - x) < (q.W + Math.max(W, D)) / 2 + 2 && Math.abs(q.z - z) < (q.D + Math.max(W, D)) / 2 + 2);
  };
  // Yaba's are modelled one by one; every other city's real places come from the kits (cityinfo.js, landkit.js)
  const info = cityInfo(), list = info.landmarks ? info.landmarks.map((L) => ({ ...L, build: () => buildKind(L) })) : YABA_LANDMARKS.map((L) => ({ ...L, build: MODELS[L.key] }));
  // a kit model is built from its front edge back; centre it on its real footprint so the fit test sees all of it
  const centred = (mdl) => {
    const bb = new THREE.Box3().setFromObject(mdl.g), cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
    mdl.g.children.forEach((o) => { o.position.x -= cx; o.position.z -= cz; });
    mdl.cols = mdl.cols.map(([x, z, w, d]) => [x - cx, z - cz, w, d]);
    mdl.W = bb.max.x - bb.min.x + 1; mdl.D = bb.max.z - bb.min.z + 1; mdl.front = bb.max.z - cz;
    return mdl;
  };
  list.forEach((L) => {
    let mdl = L.build(); if (info.landmarks) mdl = centred(mdl);
    const [tx, tz] = toXZ(L.lat, L.lon), dist = Math.hypot(tx, tz) || 1, ux = tx / dist, uz = tz / dist;
    // the spot: as far out toward the real place as there is room, searching inward and to the sides; a real place
    // too big for the room there is built a little smaller rather than left out (never below two thirds)
    let spot = null, k = 1;
    // (a big one, a stadium or a mall, may come down to just under half size in a crowded area rather than be left out)
    for (const sc of info.landmarks ? [1, 0.82, 0.66, 0.55, 0.46] : [1]) {
      const W = mdl.W * sc, D = mdl.D * sc;
      // a place out toward the edge: from as far out as it really is, inward; one at the very middle of the area
      // (the area is centred on it): from the middle outward, all the way round
      const central = dist < R * 0.2, radii = [];
      if (central) for (let r = 0; r <= R * 0.85; r += 5) radii.push(r); else for (let r = Math.min(dist, R * 0.85); r > R * 0.08; r -= 5) radii.push(r);
      const sides = central ? [...Array(16).keys()].map((k) => (k * Math.PI * 2) / 16 / 0.18) : [0, 1, -1, 2, -2, 3, -3, 4, -4, 6, -6];
      for (const r of radii) { if (spot) break; for (const side of sides) {
        const a = Math.atan2(ux, uz) + side * 0.18, x = Math.sin(a) * r, z = Math.cos(a) * r, ry = faceRoad(x, z);
        if (fits(x, z, ry, W, D)) { spot = { x, z, ry }; break; }
      } }
      if (spot) { k = sc; break; }
    }
    if (!spot) return;
    if (k !== 1) { mdl.g.scale.setScalar(k); mdl.cols = mdl.cols.map(([x, z, w, d]) => [x * k, z * k, w * k, d * k]); mdl.h *= k; }
    const W = mdl.W * k, D = mdl.D * k;
    used.push({ x: spot.x, z: spot.z, W: Math.max(W, D), D: Math.max(W, D) });
    mdl.g.position.set(spot.x, 0, spot.z); mdl.g.rotation.y = spot.ry; group.add(mdl.g);
    const cs = Math.cos(spot.ry), sn = Math.sin(spot.ry);
    world.addColliders?.(mdl.cols.map(([lx, lz, w, d], k) => ({ name: `landmark_${L.key}_${k}`, cx: spot.x + lx * cs + lz * sn, cz: spot.z - lx * sn + lz * cs, hx: w / 2, hz: d / 2, ry: spot.ry, h: mdl.h })));
    world.claim?.({ kind: 'landmark', cx: spot.x, cz: spot.z, hx: W / 2, hz: D / 2, ry: spot.ry });
    const front = { x: spot.x + sn * (D / 2 + 2), z: spot.z + cs * (D / 2 + 2) };
    props.interact.push({ id: `landmark:${L.key}`, label: `About ${L.name}`, x: front.x, z: front.z, r: 5, name: L.name, line: L.fact });
    props.pois?.push({ kind: 'landmark', name: L.name, x: front.x, z: front.z });
    out.push({ ...L, ...spot });
  });

  // the far famous shapes, on the skyline at their real bearing and at the size they really look from here
  (info.skyline || []).forEach((S) => {
    const [tx, tz] = toXZ(S.lat, S.lon), d = Math.hypot(tx, tz) || 1, far = Math.max(R * 2.6, Math.min(d, R * 4));
    const g = buildSkyline(S); g.position.set((tx / d) * far, 0, (tz / d) * far); g.scale.setScalar(Math.min(1, far / d)); g.rotation.y = Math.atan2(-tx, -tz);
    group.add(g); out.push({ key: S.key, name: S.name, far: true });
  });
  // the National Stadium, Surulere: too far to bring in, so it stands on the skyline at its real bearing
  if (!info.landmarks) {
    const [tx, tz] = toXZ(6.4987, 3.3652), d = Math.hypot(tx, tz), far = Math.max(R * 2.6, Math.min(d, R * 4));
    const g = new THREE.Group(); g.position.set((tx / d) * far, 0, (tz / d) * far);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(40, 34, 18, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xe9e4d6, roughness: 0.9, side: THREE.DoubleSide, fog: true }));
    bowl.position.y = 9; g.add(bowl);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4, m = new THREE.Mesh(box(1.4, 34, 1.4, Math.cos(a) * 44, 17, Math.sin(a) * 44), M(0xb8bec4)); g.add(m); g.add(new THREE.Mesh(box(6, 3, 1, Math.cos(a) * 44, 34, Math.sin(a) * 44), M(0xf2f2e8, { emissive: 0x666655 }))); }
    group.add(g);
    out.push({ key: 'stadium', name: 'National Stadium, Surulere', far: true });
  }
  return { group, placed: out };
}
