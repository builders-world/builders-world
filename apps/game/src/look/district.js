import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { instanceAsset, collidersFor, movingInstances, footprint } from './kit.js';
import { mulberry32 } from '../mesh.js';
import { signTexture } from './props.js';

// District dressing with the expanded Yaba kit (world bible 6.3, 6.7, 7.2):
// active street edges (compound shops, stalls), sparse landmarks (mid-rise corner blocks),
// neighbourhood infrastructure (utility poles and wires, drainage gutters, rooftop tanks),
// and danfos on the major roads. Near, mid and far layers: detail concentrates near the
// player's street; repeated pieces are instanced; collision proxies stay out of the render.

const MAJOR = ['primary', 'secondary', 'trunk', 'motorway', 'tertiary'];
const NEIGHBOURHOOD = ['residential', 'unclassified', 'living_street', 'service', 'tertiary'];
const SHOP_NAMES = [
  ['Iya Bose Provisions', 'Iya Bose waves you in. Bread, Milo, sachet water, everything for a long night of shipping.'],
  ['Femi Phone Repairs', 'Screens, batteries, charging ports. A cracked phone is fixed while you wait.'],
  ['Yaba Print and Bind', 'Pitch decks, CVs and hackathon posters, printed before the generator goes off.'],
  ['Mama Nkechi Kitchen', 'Jollof, plantain and a long bench where builders argue about frameworks.'],
  ['Gadget Corner', 'Chargers, cables, adapters and a power bank for every budget.'],
  ['Kofo Cafe', 'Good coffee, slow wifi, and the best people-watching on the street.'],
];
const STALL_NAMES = [
  ['Suya spot', 'The grill is on. Suya is better after a deploy.'],
  ['Fruit stall', 'Oranges, pineapple and garden eggs, peeled while you wait.'],
  ['Recharge and POS', 'Airtime, data and a POS for when the bank app is down.'],
  ['Corn and coconut', 'Roasted corn and fresh coconut by the roadside.'],
];

export function dressDistrict(world, scene, { kit, lowQuality, reduced, spawn }) {
  const group = new THREE.Group();
  group.name = 'district-dressing';
  scene.add(group);
  const rng = mulberry32(909);
  const interact = [], lamps = [], counts = {};
  const R = world.radius;
  const get = (id) => kit?.get(id);
  const near = (p) => Math.hypot(p.x - spawn.x, p.z - spawn.z);

  // ---------- street-facing lots across the district ----------
  // A lot sits behind the pavement, faces the road, and every sample of its footprint is free ground.
  function lots(template, { step = 10, maxR = R * 0.9 } = {}) {
    // a kit template, or a plain { w, d } footprint whose origin is the back edge and front faces +z
    const fp = template.bounds ? footprint(template) : template;
    const front = template.bounds ? template.bounds.max.z : template.d; // the kit's fronts face local +z
    const out = [];
    world.roads.forEach((r) => {
      if (!r.fit) return;
      const { pts, nrm, half, paveL, paveR } = r.fit;
      let acc = 0;
      for (let i = 1; i < pts.length - 1; i++) {
        acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (acc < step) continue;
        acc = 0;
        const tx = -nrm[i][1], tz = nrm[i][0]; // tangent
        [[1, paveL[i]], [-1, paveR[i]]].forEach(([side, pave]) => {
          const nx = nrm[i][0] * side, nz = nrm[i][1] * side;
          const start = half[i] + pave + 0.3;
          let ok = true;
          for (let u = -fp.w / 2; u <= fp.w / 2 && ok; u += 1) {
            for (let v = 0; v <= fp.d && ok; v += 1) {
              const x = pts[i][0] + tx * u + nx * (start + v), z = pts[i][1] + tz * u + nz * (start + v);
              if (!world.isFree(x, z, 0.25)) ok = false;
            }
          }
          if (!ok) return;
          const x = pts[i][0] + nx * (start + front), z = pts[i][1] + nz * (start + front);
          if (Math.hypot(x, z) > maxR) return;
          out.push({ x, z, ry: Math.atan2(-nx, -nz), road: r });
        });
      }
    });
    return out;
  }
  const spaced = (cands, n, minGap, taken = []) => {
    const pick = [];
    cands.sort((a, b) => near(a) - near(b));
    for (const c of cands) {
      if (pick.length >= n) break;
      if ([...pick, ...taken].every((p) => Math.hypot(p.x - c.x, p.z - c.z) >= minGap)) pick.push(c);
    }
    return pick;
  };
  const placed = [];
  function put(id, spots, { collide = true } = {}) {
    const T = get(id);
    if (!T || !spots.length) return;
    group.add(instanceAsset(T, spots));
    if (collide) world.addColliders(collidersFor(T, spots));
    counts[id] = (counts[id] || 0) + spots.length;
  }

  // ---------- sparse landmarks first: mid-rise corner blocks claim the big lots ----------
  const midT = get('yaba_midrise_corner_block');
  const mids = midT ? spaced(lots(midT, { step: 12 }), 2, 140, placed) : [];
  put('yaba_midrise_corner_block', mids);
  mids.forEach((s) => placed.push(s));

  // ---------- services on the commercial frontage (estate-layout skill: banks, fuel, food on main roads) ----------
  const pois = []; // { kind, name, x, z } for the map
  const poi = (kind, name, x, z) => pois.push({ kind, name, x, z });
  const fwd = (s, d) => ({ x: s.x + Math.sin(s.ry) * d, z: s.z + Math.cos(s.ry) * d });

  // the bank: a branch in the first mid-rise block, ATMs set into its front wall, its name above
  const bankAt = mids[0];
  let bankDoor = null;
  if (bankAt) {
    const fz = midT.bounds.max.z, g = new THREE.Group();
    const shell = new THREE.MeshStandardMaterial({ color: 0x2a9d94, roughness: 0.6 });
    const screen = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.95, 0.85) });
    const dark = new THREE.MeshStandardMaterial({ color: 0x263832, roughness: 0.6 });
    g.add(new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.5, 0.3).translate(0, 1.25, -0.1), dark)); // the recess
    [-0.8, 0.8].forEach((x) => {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.85, 0.32).translate(x, 0.925, 0.12), shell));
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.03).translate(x, 1.42, 0.3), screen));
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.75), new THREE.MeshStandardMaterial({ map: signTexture('YABA BUILDERS BANK', { sub: 'ATM · Efforts' }), roughness: 0.6 }));
    sign.position.set(0, 3.05, 0.08); g.add(sign);
    const lx = 2.2; // to one side of the entrance
    const p0 = fwd(bankAt, fz + 0.02), c = Math.cos(bankAt.ry), sn = Math.sin(bankAt.ry);
    g.position.set(p0.x + lx * c, 0, p0.z - lx * sn); g.rotation.y = bankAt.ry;
    group.add(g);
    const front = fwd({ x: g.position.x, z: g.position.z, ry: bankAt.ry }, 1.3);
    interact.push({ id: 'atm', label: 'Use the ATM', x: front.x, z: front.z, r: 2.4 });
    lamps.push({ x: front.x, y: 2.8, z: front.z, power: 10, boost: 10, color: 0xbff5e6 });
    poi('atm', 'Yaba Builders Bank ATM', front.x, front.z);
    bankDoor = fwd({ x: p0.x, z: p0.z, ry: bankAt.ry }, 1.4); // the entrance between the ATMs
  }

  // the filling station: a forecourt on a main road, a canopy over two pump islands, a kiosk at the back
  {
    const FP = { w: 18, d: 15 };
    const cands = lots(FP, { step: 8 }).filter((c) => MAJOR.includes(c.road.cls));
    const at = spaced(cands, 1, 60, [...placed, ...mids])[0];
    if (at) {
      const g = new THREE.Group(), cream = new THREE.MeshStandardMaterial({ color: 0xf2ecd9, roughness: 0.7 });
      const red = new THREE.MeshStandardMaterial({ color: 0xe46f4f, roughness: 0.6 }), grey = new THREE.MeshStandardMaterial({ color: 0x8f8b80, roughness: 0.9 });
      const B = (w, h, d, x, y, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(x, y, z), m); g.add(o); return o; };
      B(18, 0.12, 15, 0, 0.06, 7.5, grey);                       // forecourt, origin at the back edge
      B(14, 0.5, 7, 0, 5.2, 9.5, cream); B(14.2, 0.35, 7.2, 0, 4.85, 9.5, red); // canopy
      [[-6, 6.5], [6, 6.5], [-6, 12.5], [6, 12.5]].forEach(([x, z]) => B(0.35, 4.7, 0.35, x, 2.35, z, cream));
      [-3, 3].forEach((x) => { B(0.9, 0.25, 4.5, x, 0.12, 9.5, cream); [8.2, 10.8].forEach((z) => { B(0.6, 1.5, 0.45, x, 0.9, z, red); B(0.4, 0.3, 0.05, x, 1.25, z + 0.25, new THREE.MeshBasicMaterial({ color: 0xbff5e6 })); }); });
      B(8, 3.2, 4, 0, 1.6, 2.5, cream); B(8.4, 0.35, 4.4, 0, 3.35, 2.5, red);    // kiosk
      const kiosk = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.8), new THREE.MeshStandardMaterial({ map: signTexture('FUEL · KIOSK', { bg: '#e46f4f' }), roughness: 0.6 })); kiosk.position.set(0, 2.7, 4.52); g.add(kiosk);
      B(0.3, 4.5, 0.3, 7.6, 2.25, 14.2, cream);
      const pole = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), new THREE.MeshStandardMaterial({ map: signTexture('PMS', { bg: '#263832', fg: '#f2b33d', w: 256, h: 200, sub: 'Petrol · Diesel' }), roughness: 0.6 }));
      pole.position.set(7.6, 4.9, 14.37); g.add(pole);
      g.position.set(at.x, 0, at.z); g.rotation.y = at.ry; group.add(g);
      placed.push(at);
      const W = (lx, lz) => ({ x: at.x + lx * Math.cos(at.ry) + lz * Math.sin(at.ry), z: at.z - lx * Math.sin(at.ry) + lz * Math.cos(at.ry) });
      const col = (lx, lz, hx, hz) => { const p = W(lx, lz); return { name: 'fuel', cx: p.x, cz: p.z, hx, hz, ry: at.ry }; };
      world.addColliders([col(0, 2.5, 4.1, 2.1), col(-3, 9.5, 0.5, 2.3), col(3, 9.5, 0.5, 2.3), col(-6, 6.5, 0.2, 0.2), col(6, 6.5, 0.2, 0.2), col(-6, 12.5, 0.2, 0.2), col(6, 12.5, 0.2, 0.2), col(7.6, 14.2, 0.2, 0.2)]);
      world.claim?.({ kind: 'filling_station', ...(() => { const p = W(0, 7.5); return { cx: p.x, cz: p.z }; })(), hx: 9, hz: 7.5, ry: at.ry, y0: 4.7, y1: 5.5 });
      const k = W(0, 5.4);
      interact.push({ id: 'fuel', label: 'Buy a drink at the fuel station kiosk', x: k.x, z: k.z, r: 3, name: 'Fuel station kiosk', line: 'Cold zobo, malt and a top-up for the generator.' });
      [W(0, 9.5), W(0, 2.5)].forEach((p, i) => lamps.push({ x: p.x, y: i ? 3 : 4.6, z: p.z, power: 30, boost: 10, color: 0xf4f1ff }));
      const sp = W(0, 9.5); poi('fuel', 'Filling station', sp.x, sp.z);
      counts.filling_station = 1;
    }
  }

  // ---------- active street edges: compound shops ----------
  const shopT = get('yaba_compound_shop');
  if (shopT) {
    const spots = spaced(lots(shopT), lowQuality ? 4 : 6, 28, placed);
    put('yaba_compound_shop', spots);
    spots.forEach((s, i) => {
      placed.push(s);
      const [name, line] = SHOP_NAMES[i % SHOP_NAMES.length];
      const fx = -Math.sin(s.ry + Math.PI), fz = -Math.cos(s.ry + Math.PI);
      interact.push({ id: `shop:${i}`, label: `Visit ${name}`, x: s.x + Math.sin(s.ry) * 4.8, z: s.z + Math.cos(s.ry) * 4.8, r: 3.5, line, name, at: { x: s.x, z: s.z, ry: s.ry, depth: 4.8 } });
      poi(/Kitchen|Cafe/.test(name) ? (/Cafe/.test(name) ? 'cafe' : 'food') : 'shop', name, s.x + Math.sin(s.ry) * 4.8, s.z + Math.cos(s.ry) * 4.8);
      lamps.push({ x: s.x + Math.sin(s.ry) * 3.6, y: 3.4, z: s.z + Math.cos(s.ry) * 3.6, power: 20, boost: 8, color: 0xffb35c });
      void fx; void fz;
    });
  }

  // ---------- more stalls, spread along the routes ----------
  const stallT = get('yaba_market_stall');
  if (stallT) {
    const spots = spaced(lots(stallT, { step: 8 }), lowQuality ? 3 : 5, 45, placed);
    put('yaba_market_stall', spots);
    spots.forEach((s, i) => {
      placed.push(s);
      const [name, line] = STALL_NAMES[i % STALL_NAMES.length];
      interact.push({ id: `stall:${i}`, label: `Stop at the ${name.toLowerCase()}`, x: s.x + Math.sin(s.ry) * 2.4, z: s.z + Math.cos(s.ry) * 2.4, r: 3.2, line, name, at: { x: s.x, z: s.z, ry: s.ry, depth: 2.4 } });
      poi(/POS/.test(name) ? 'shop' : 'food', name, s.x + Math.sin(s.ry) * 2.4, s.z + Math.cos(s.ry) * 2.4);
      lamps.push({ x: s.x, y: 2.6, z: s.z, power: 16, boost: 6, color: 0xffb35c });
    });
  }

  // ---------- electricity: timber poles, crossarms, insulators, transformers and sagging lines ----------
  // (world bible 4.3). One run of poles down every street, on the pavement's inner edge (clear of the
  // drain behind it and the lamps at the kerb), a crossarm across the street carrying three conductors
  // on porcelain insulators, a telecom cable lower down, a transformer on every fourth pole.
  {
    const poles = [], spans = [];
    const lampsAt = [...(world.lamps || [])];
    world.roads.forEach((r) => {
      if (!r.fit || !NEIGHBOURHOOD.concat(MAJOR).includes(r.cls)) return;
      const { pts, nrm, half, paveL, paveR } = r.fit;
      const side = paveR.reduce((a, b) => a + b, 0) >= paveL.reduce((a, b) => a + b, 0) ? -1 : 1; // the wider pavement, the whole street long
      let acc = 17, prev = null;
      for (let i = 1; i < pts.length - 1; i++) {
        acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (acc < 32) continue;
        const pave = side < 0 ? paveR[i] : paveL[i];
        if (pave < 0.9) { prev = null; continue; }
        const off = half[i] + (pave >= 1.4 ? pave - 0.85 : pave - 0.35);
        const x = pts[i][0] + nrm[i][0] * off * side, z = pts[i][1] + nrm[i][1] * off * side;
        if (Math.hypot(x, z) > R * 0.95 || world.onCarriageway?.(x, z, 0.5) || world.inPlot?.(x, z, 0.4) || world.kitColliders.some((c) => Math.hypot(c.cx - x, c.cz - z) < 1.4) || lampsAt.some((l) => Math.hypot(l.x - x, l.z - z) < 2.2)) { prev = null; continue; }
        acc = 0;
        const tx = -nrm[i][1], tz = nrm[i][0];
        const pole = { x, z, ry: Math.atan2(tx, tz), nx: nrm[i][0] * side, nz: nrm[i][1] * side, trafo: poles.length % 4 === 1 };
        poles.push(pole);
        if (prev && Math.hypot(prev.x - x, prev.z - z) < 46) spans.push([prev, pole]);
        prev = pole;
      }
    });
    if (poles.length) {
      const wood = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.95 }), steel = new THREE.MeshStandardMaterial({ color: 0x6f767c, roughness: 0.5, metalness: 0.6 });
      const porcelain = new THREE.MeshStandardMaterial({ color: 0xe9e4d6, roughness: 0.35 }), trafoMat = new THREE.MeshStandardMaterial({ color: 0x8c949a, roughness: 0.55, metalness: 0.4 });
      const H = 9.2, ARM = 7.9;
      const poleGeo = new THREE.CylinderGeometry(0.11, 0.16, H, 8).translate(0, H / 2, 0);
      const armGeo = new THREE.BoxGeometry(2.6, 0.12, 0.12).translate(0, ARM, 0); // across the street (local x)
      const braceGeo = mergeGeometries([new THREE.BoxGeometry(0.05, 0.9, 0.05).rotateZ(0.75).translate(-0.4, ARM - 0.38, 0), new THREE.BoxGeometry(0.05, 0.9, 0.05).rotateZ(-0.75).translate(0.4, ARM - 0.38, 0)]);
      const insGeo = mergeGeometries([-1.1, 0, 1.1].map((x) => new THREE.CylinderGeometry(0.05, 0.07, 0.22, 8).translate(x, ARM + 0.17, 0)));
      const trafoGeo = mergeGeometries([new THREE.CylinderGeometry(0.34, 0.34, 0.9, 12).translate(0, 6.2, 0.38), new THREE.BoxGeometry(0.8, 0.08, 0.2).translate(0, 6.0, 0.18), new THREE.CylinderGeometry(0.05, 0.05, 0.25, 6).translate(-0.15, 6.78, 0.38), new THREE.CylinderGeometry(0.05, 0.05, 0.25, 6).translate(0.15, 6.78, 0.38)]);
      const inst = (geo, mat, list) => { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0); list.forEach((p, k) => im.setMatrixAt(k, m.compose(new THREE.Vector3(p.x, 0, p.z), q.setFromAxisAngle(Y, p.ry + Math.PI / 2), sc))); im.count = list.length; group.add(im); return im; };
      inst(poleGeo, wood, poles); inst(armGeo, wood, poles); inst(braceGeo, steel, poles); inst(insGeo, porcelain, poles);
      inst(trafoGeo, trafoMat, poles.filter((p) => p.trafo));
      world.addColliders?.(poles.map((p) => ({ name: 'utility_pole', cx: p.x, cz: p.z, hx: 0.17, hz: 0.17, ry: 0 })));
      // the lines: three conductors from insulator to insulator and a telecom cable, each sagging
      const tubes = [], cable = [];
      const across = (p, d) => [p.x + p.nx * d, p.z + p.nz * d];
      const sagLine = (out, a, b, y, r, sag) => {
        const N = 10, SIDES = 4;
        for (let k = 0; k < N; k++) {
          const t0 = k / N, t1 = (k + 1) / N, P0 = [a[0] + (b[0] - a[0]) * t0, y - sag * 4 * t0 * (1 - t0), a[1] + (b[1] - a[1]) * t0], P1 = [a[0] + (b[0] - a[0]) * t1, y - sag * 4 * t1 * (1 - t1), a[1] + (b[1] - a[1]) * t1];
          const g = new THREE.CylinderGeometry(r, r, 1, SIDES, 1, true), d = new THREE.Vector3(P1[0] - P0[0], P1[1] - P0[1], P1[2] - P0[2]), L = d.length();
          g.scale(1, L, 1); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate((P0[0] + P1[0]) / 2, (P0[1] + P1[1]) / 2, (P0[2] + P1[2]) / 2);
          out.push(g);
        }
      };
      spans.forEach(([a, b]) => {
        const span = Math.hypot(b.x - a.x, b.z - a.z), sag = 0.25 + span * 0.011;
        [-1.1, 0, 1.1].forEach((d) => sagLine(tubes, across(a, d), across(b, d), ARM + 0.28, 0.018, sag));
        sagLine(cable, across(a, 0.2), across(b, 0.2), 5.6, 0.028, sag * 1.4);
      });
      const wireMat = new THREE.MeshBasicMaterial({ color: 0x1b1d22 });
      if (tubes.length) group.add(new THREE.Mesh(mergeGeometries(tubes), wireMat));
      if (cable.length) group.add(new THREE.Mesh(mergeGeometries(cable), wireMat));
      counts.wire_spans = spans.length; counts.poles = poles.length;
    }
  }

  // ---------- drainage gutters at the kerb ----------
  // ---------- open drains (world bible 4.3): a continuous concrete channel along the back of every
  // pavement, both sides of the street, broken only at junctions where the water goes under the road.
  // A dark water line between two concrete lips, a crossing slab in front of every gate and shop, and
  // a grating at each end. (The kit's gutter piece, stamped every 8 m, read as a ladder: Elvis, 10 Oct 2026.)
  {
    const water = [], lips = [], slabs = [];
    // where people cross: estate gates (and their access lanes), plus shop and stall fronts once placed
    const crossings = [];
    (world.estates || []).forEach((E) => E.gates.forEach((g) => crossings.push({ x: g.x - g.inward[0] * 1.5, z: g.z - g.inward[1] * 1.5, r: 4.5 })));
    interact.filter((i) => /^(shop|stall|enter):/.test(i.id)).forEach((i) => crossings.push({ x: i.x, z: i.z, r: 3 }));
    const crossingAt = (x, z) => crossings.find((c) => Math.hypot(c.x - x, c.z - z) < c.r);
    const quad = (out, a, b, c, d) => out.push(...a, ...b, ...c, ...a, ...c, ...d);
    world.roads.forEach((r) => {
      if (!r.fit) return;
      const { pts, nrm, half, paveL, paveR } = r.fit;
      const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const jn = pts.map((p, i) => i).filter((i) => world.junctionAt?.(pts[i], r)).map((i) => cum[i]);
      const nearJ = (i) => jn.some((c) => Math.abs(c - cum[i]) < half[i] + 7);
      [1, -1].forEach((sg) => {
        const pv = sg > 0 ? paveL : paveR;
        // the line along the back of the pavement, and the channel built on it in short straight pieces
        const off = (i) => half[i] + pv[i] - 0.32;
        const P = (i, d) => [pts[i][0] + nrm[i][0] * (off(i) + d) * sg, pts[i][1] + nrm[i][1] * (off(i) + d) * sg];
        let lastSlab = -1e9, runStart = -1;
        for (let i = 0; i < pts.length - 1; i++) {
          // never in a carriageway: where two one-way roads run side by side, one's pavement line is the other's lane
          const inRoad = (a) => world.onCarriageway?.(a[0], a[1], 0.45);
          const ok = pv[i] >= 1.4 && pv[i + 1] >= 1.4 && !nearJ(i) && !nearJ(i + 1) && Math.hypot(...P(i, 0)) < R * (lowQuality ? 0.55 : 0.8)
            && !inRoad(P(i, 0)) && !inRoad(P(i + 1, 0)) && !inRoad([(P(i, 0)[0] + P(i + 1, 0)[0]) / 2, (P(i, 0)[1] + P(i + 1, 0)[1]) / 2]);
          if (!ok) { if (runStart >= 0 && i - runStart >= 1) { const [ex, ez] = P(i, 0); slabs.push({ x: ex, z: ez, i, grate: true }); } runStart = -1; continue; }
          if (runStart < 0) { runStart = i; const [sx, sz] = P(i, 0); slabs.push({ x: sx, z: sz, i, grate: true }); }
          const y = (h) => h;
          const strip = (out, d0, d1, h) => { const a = P(i, d0), b = P(i + 1, d0), c = P(i + 1, d1), d = P(i, d1); quad(out, [a[0], y(h), a[1]], [b[0], y(h), b[1]], [c[0], y(h), c[1]], [d[0], y(h), d[1]]); };
          // at a gate or a shop front the drain is covered: a run of slabs instead of open water
          const [mx, mz] = P(i, 0), mx2 = P(i + 1, 0);
          if (crossingAt((mx + mx2[0]) / 2, (mz + mx2[1]) / 2)) { const L = Math.hypot(mx2[0] - mx, mx2[1] - mz); for (let u = 0.5; u < L; u += 1.0) slabs.push({ x: mx + (mx2[0] - mx) * (u / L), z: mz + (mx2[1] - mz) * (u / L), i }); continue; }
          strip(water, -0.17, 0.17, 0.118);
          strip(lips, -0.27, -0.17, 0.16); strip(lips, 0.17, 0.27, 0.16);
          // a crossing slab every 12 m or so, the way people bridge a drain to their door
          if (cum[i] - lastSlab > 12 && i > runStart + 1) { lastSlab = cum[i]; const [sx, sz] = P(i, 0); slabs.push({ x: sx, z: sz, i }); }
        }
        // slab and grating orientation follows the road
        slabs.forEach((sl) => { if (sl.ry === undefined) { sl.ry = Math.atan2(-nrm[sl.i][1], nrm[sl.i][0]); } });
      });
    });
    const geo = (arr) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals(); return g; };
    if (water.length) {
      // the wet channel: dark, a little glossy, never flickering against the pavement (3 cm layers, bible 7.1)
      group.add(new THREE.Mesh(geo(water), new THREE.MeshStandardMaterial({ color: 0x2f3b36, roughness: 0.25, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 })));
      group.add(new THREE.Mesh(geo(lips), new THREE.MeshStandardMaterial({ color: 0xbdb6a6, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3 })));
      const slabGeo = new THREE.BoxGeometry(1.0, 0.05, 0.62), grateGeo = new THREE.BoxGeometry(0.5, 0.03, 0.42);
      const S = slabs.filter((q) => !q.grate), Gr = slabs.filter((q) => q.grate);
      const slabMesh = new THREE.InstancedMesh(slabGeo, new THREE.MeshStandardMaterial({ color: 0xcfc8b8, roughness: 0.9 }), Math.max(1, S.length));
      const grateMesh = new THREE.InstancedMesh(grateGeo, new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.5, metalness: 0.6 }), Math.max(1, Gr.length));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0);
      S.forEach((sl, k) => slabMesh.setMatrixAt(k, m.compose(new THREE.Vector3(sl.x, 0.165, sl.z), q.setFromAxisAngle(Y, sl.ry + Math.PI / 2), sc)));
      Gr.forEach((sl, k) => grateMesh.setMatrixAt(k, m.compose(new THREE.Vector3(sl.x, 0.135, sl.z), q.setFromAxisAngle(Y, sl.ry + Math.PI / 2), sc)));
      slabMesh.count = S.length; grateMesh.count = Gr.length;
      group.add(slabMesh, grateMesh);
      counts.drain_slabs = S.length;
    }
  }

  // ---------- vacant land: bush, scrub trees and the famous painted warnings (world bible 4.6) ----------
  // Open ground deep in a block, away from roads and plots, grows over the way Lagos land does while it
  // waits for a developer: shrub clumps, a few trees, and a painted sign on a block post.
  {
    const clumps = [], trees = [], signs = [];
    const deep = (x, z) => world.costAt?.(x, z) === 1 && !world.inPlot?.(x, z, 3) && !world.onCarriageway?.(x, z, 9) && world.isFree(x, z, 2.5, { lots: false });
    // seeds, each growing a thicket: a tree or two and a spread of shrubs round it
    for (let k = 0; k < (lowQuality ? 140 : 320); k++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * R * 0.85, x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
      if (!deep(x0, z0)) continue;
      // sparse (Elvis, 10 October 2026: too many trees): the odd tree with a shrub or two at its foot
      if (trees.some((t) => Math.hypot(t.x - x0, t.z - z0) < 22)) continue;
      trees.push({ x: x0, z: z0, s: 0.8 + rng() * 0.6 });
      const n = rng() < 0.5 ? 0 : 1 + Math.floor(rng() * 2);
      for (let j = 0; j < n; j++) { const x = x0 + (rng() - 0.5) * 3, z = z0 + (rng() - 0.5) * 3; if (deep(x, z)) clumps.push({ x, z, s: 0.5 + rng() * 0.9, ry: rng() * 6.28 }); }
      if (rng() < 0.03 && signs.length < 6) signs.push({ x: x0 + 2.5, z: z0, ry: rng() * 6.28 });
    }
    const leaf = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
    const shrub = mergeGeometries([new THREE.IcosahedronGeometry(0.55, 0).scale(1, 0.7, 1).translate(0, 0.35, 0), new THREE.IcosahedronGeometry(0.4, 0).scale(1, 0.7, 1).translate(0.45, 0.25, 0.2), new THREE.IcosahedronGeometry(0.35, 0).translate(-0.35, 0.22, -0.25)]);
    const sm = new THREE.InstancedMesh(shrub, leaf, Math.max(1, clumps.length)), m = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    clumps.forEach((c, k) => { sm.setMatrixAt(k, m.compose(new THREE.Vector3(c.x, 0, c.z), q.setFromAxisAngle(Y, c.ry), new THREE.Vector3(c.s, c.s, c.s))); sm.setColorAt(k, col.setHSL(0.22 + rng() * 0.06, 0.3 + rng() * 0.15, 0.3 + rng() * 0.12)); });
    sm.count = clumps.length; group.add(sm);
    const trunkG = new THREE.CylinderGeometry(0.1, 0.15, 2.6, 6).translate(0, 1.3, 0), crownG = mergeGeometries([new THREE.IcosahedronGeometry(1.3, 0).translate(0, 3.1, 0), new THREE.IcosahedronGeometry(0.9, 0).translate(0.7, 2.7, 0.3)]);
    const tm = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.9 }), Math.max(1, trees.length)), cm = new THREE.InstancedMesh(crownG, leaf, Math.max(1, trees.length));
    trees.forEach((t, k) => { const M = m.compose(new THREE.Vector3(t.x, 0, t.z), q.setFromAxisAngle(Y, rng() * 6), new THREE.Vector3(t.s, t.s, t.s)); tm.setMatrixAt(k, M); cm.setMatrixAt(k, M); cm.setColorAt(k, col.setHSL(0.27 + rng() * 0.05, 0.35, 0.28 + rng() * 0.08)); });
    tm.count = cm.count = trees.length; group.add(tm, cm);
    world.addColliders?.(trees.map((t) => ({ name: 'scrub_tree', cx: t.x, cz: t.z, hx: 0.2, hz: 0.2, ry: 0 })));
    const LINES = ['THIS LAND IS NOT FOR SALE', 'NOT FOR SALE · BEWARE OF 419', 'THIS PROPERTY BELONGS TO THE FAMILY', 'NO DUMPING · NOT FOR SALE'];
    signs.forEach((sg, k) => {
      const g = new THREE.Group(); g.position.set(sg.x, 0, sg.z); g.rotation.y = sg.ry; group.add(g);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 0.25).translate(0, 0.65, 0), new THREE.MeshStandardMaterial({ color: 0xc9c2b2, roughness: 0.95 })));
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), new THREE.MeshStandardMaterial({ map: signTexture(LINES[k % LINES.length], { bg: '#e8e2d2', fg: '#9b2f2f', w: 512, h: 300 }), roughness: 0.9 }));
      p.position.set(0, 0.75, 0.13); g.add(p);
      world.addColliders?.([{ name: 'land_sign', cx: sg.x, cz: sg.z, hx: 0.8, hz: 0.13, ry: sg.ry, h: 1.3 }]);
    });
    counts.bush = clumps.length; counts.scrub_trees = trees.length; counts.land_signs = signs.length;
  }

  // ---------- rooftop water tanks on some low and mid-rise roofs ----------
  const tankT = get('yaba_rooftop_water_tank');
  if (tankT) {
    const spots = (world.roofs || []).filter((r) => r.area > 45 && r.y < 16 && rng() < 0.35).map((r) => ({ x: r.x + (rng() - 0.5) * 2, y: r.y, z: r.z + (rng() - 0.5) * 2, ry: rng() * 6 }));
    mids.forEach((m) => spots.push({ x: m.x - Math.sin(m.ry) * 2, y: 13.19, z: m.z - Math.cos(m.ry) * 2, ry: rng() * 6 }));
    put('yaba_rooftop_water_tank', spots, { collide: false });
  }

  // ---------- danfos: parked on wide major roads, driving the right-hand lane ----------
  const danfoT = get('yaba_danfo_minibus');
  const movers = [];
  let moving = null;
  if (danfoT) {
    const majors = world.roads.filter((r) => r.fit && MAJOR.includes(r.cls) && r.w >= 9);
    const parked = [];
    majors.forEach((r) => {
      const { pts, nrm, half } = r.fit;
      for (let i = 6; i < pts.length - 6 && parked.length < (lowQuality ? 3 : 6); i += 9) {
        if (rng() > 0.35) continue;
        const tx = -nrm[i][1], tz = nrm[i][0], lane = half[i] - 1.25;
        const x = pts[i][0] - nrm[i][0] * lane, z = pts[i][1] - nrm[i][1] * lane; // right-hand kerb lane
        if (parked.some((p) => Math.hypot(p.x - x, p.z - z) < 30)) continue;
        parked.push({ x, z, ry: Math.atan2(tx, tz) - Math.PI / 2 });
      }
    });
    // parked danfos stood in the kerb lane, where the traffic system (traffic.js) now drives: they are
    // left out, and danfos load at the motor park and drive in the traffic instead (Elvis, 10 October 2026)
    void parked;
    // moving danfos are the traffic system's too; none are made here (a single unplaced copy used to sit
    // at the middle of the district as a stray box)
    const n = 0;
    if (n > 0) { moving = movingInstances(danfoT, n, -Math.PI / 2); group.add(moving.group); }
    const routes = majors.length ? majors : world.roads.filter((r) => r.fit);
    for (let k = 0; k < n; k++) {
      const r = routes[k % routes.length];
      const path = r.fit.pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
      const lens = [0];
      for (let i = 1; i < path.length; i++) lens.push(lens[i - 1] + path[i].distanceTo(path[i - 1]));
      movers.push({ path, lens, total: lens[lens.length - 1], s: rng() * lens[lens.length - 1], dir: k % 2 ? -1 : 1, speed: 7 + rng() * 4, lane: Math.max(1.4, r.w / 4) });
    }
    counts.danfo_moving = n;
  }

  const tmp = new THREE.Vector3();
  function update(dt, t, player) {
    movers.forEach((m, k) => {
      let i = 1; while (i < m.lens.length - 1 && m.lens[i] < m.s) i++;
      const a = m.path[i - 1], b = m.path[i], seg = m.lens[i] - m.lens[i - 1] || 1;
      const u = (m.s - m.lens[i - 1]) / seg;
      tmp.copy(a).lerp(b, u);
      const tx = (b.x - a.x) / seg * m.dir, tz = (b.z - a.z) / seg * m.dir;
      const px = tmp.x - tz * m.lane, pz = tmp.z + tx * m.lane; // right of travel
      const ahead = Math.hypot(px + tx * 4 - player.x, pz + tz * 4 - player.z) < 3.5; // give way to people
      if (!reduced && !ahead) m.s += m.dir * m.speed * dt;
      if (m.s > m.total - 1 || m.s < 1) { m.dir *= -1; m.s = Math.max(1, Math.min(m.total - 1, m.s)); }
      moving.setAt(k, px, pz, Math.atan2(tx, tz));
      m.body = { cx: px, cz: pz, hx: 1.05, hz: 2.7, ry: Math.atan2(tx, tz) };
    });
  }
  // moving danfos as boxes, for people and the player's car to bump into (world bible 7.5)
  const bodies = () => movers.map((m) => m.body).filter(Boolean);

  return { bankDoor, group, interact, lamps, update, bodies, counts, pois, shops: placed.filter((p) => p.road && interact.some((i) => i.id.startsWith('shop:'))), landmarks: mids };
}
