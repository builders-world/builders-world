import * as THREE from 'three';
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

  // ---------- neighbourhood streets: utility poles and their wires ----------
  const poleT = get('yaba_utility_pole');
  if (poleT) {
    const poles = [], wires = [];
    world.roads.forEach((r) => {
      if (!r.fit || !NEIGHBOURHOOD.concat(MAJOR).includes(r.cls)) return;
      const { pts, nrm, half, paveL, paveR } = r.fit;
      let acc = 17, prev = null;
      for (let i = 1; i < pts.length - 1; i++) {
        acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (acc < 34) continue;
        const side = paveR[i] >= paveL[i] ? -1 : 1, pave = side < 0 ? paveR[i] : paveL[i];
        if (pave < 0.7) { prev = null; continue; }
        const off = half[i] + pave - 0.35; // building side of the pavement, away from the lamps at the kerb
        const x = pts[i][0] + nrm[i][0] * off * side, z = pts[i][1] + nrm[i][1] * off * side;
        // verge or pavement only: never on any carriageway, never in a plot (estate-layout skill)
        if (Math.hypot(x, z) > R * 0.95 || world.onCarriageway?.(x, z, 0.6) || world.inPlot?.(x, z, 0.5) || world.kitColliders.some((c) => Math.hypot(c.cx - x, c.cz - z) < 1.6)) { prev = null; continue; }
        acc = 0;
        const tx = -nrm[i][1], tz = nrm[i][0];
        const pole = { x, z, ry: Math.atan2(-tz, tx) };
        poles.push(pole);
        if (prev && Math.hypot(prev.x - x, prev.z - z) < 48) wires.push([prev, pole]);
        prev = pole;
      }
    });
    put('yaba_utility_pole', poles);
    // two sagging conductors per span, from the end of one pole's arm to the start of the next
    const pts = [];
    const arm = (p, ax, az) => [p.x + Math.cos(p.ry) * ax + Math.sin(p.ry) * az, p.z - Math.sin(p.ry) * ax + Math.cos(p.ry) * az];
    wires.forEach(([a, b]) => {
      [-0.55, 0.55].forEach((oz) => {
        const [ax, az] = arm(a, 4.2, oz), [bx, bz] = arm(b, -4.2, oz);
        const span = Math.hypot(bx - ax, bz - az), sag = 0.35 + span * 0.012;
        for (let k = 0; k < 10; k++) {
          const t0 = k / 10, t1 = (k + 1) / 10;
          const y0 = 7.9 - sag * 4 * t0 * (1 - t0), y1 = 7.9 - sag * 4 * t1 * (1 - t1);
          pts.push(ax + (bx - ax) * t0, y0, az + (bz - az) * t0, ax + (bx - ax) * t1, y1, az + (bz - az) * t1);
        }
      });
    });
    if (pts.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      group.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x15171c })));
    }
    counts.wire_spans = wires.length;
  }

  // ---------- drainage gutters at the kerb ----------
  const gutterT = get('yaba_drainage_gutter');
  if (gutterT) {
    const spots = [];
    // every carriageway as segments with their half width, so no gutter piece ever lies across a road:
    // runs stop at the kerb at junctions, where the water goes under the road in a culvert
    const carriage = [];
    world.roads.forEach((r, ri) => {
      if (!r.fit) return;
      const { pts, half } = r.fit;
      for (let k = 0; k < pts.length - 1; k++) carriage.push({ ri, ax: pts[k][0], az: pts[k][1], bx: pts[k + 1][0], bz: pts[k + 1][1], h: Math.max(half[k], half[k + 1]) });
    });
    const onRoad = (x, z, own) => carriage.some((c) => {
      if (c.ri === own) return false;
      const dx = c.bx - c.ax, dz = c.bz - c.az, L2 = dx * dx + dz * dz || 1;
      const u = Math.max(0, Math.min(1, ((x - c.ax) * dx + (z - c.az) * dz) / L2));
      return Math.hypot(x - c.ax - dx * u, z - c.az - dz * u) < c.h + 0.9;
    });
    const halfLen = footprint(gutterT).w / 2;
    world.roads.forEach((r, ri) => {
      if (!r.fit) return;
      const { pts, nrm, half, paveL, paveR } = r.fit;
      let acc = 0;
      for (let i = 1; i < pts.length - 1; i++) {
        acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (acc < 8) continue;
        acc = 0;
        const tx = -nrm[i][1], tz = nrm[i][0];
        const both = MAJOR.includes(r.cls); // neighbourhood streets drain to one side
        [[1, paveL[i]], [-1, paveR[i]]].forEach(([side, pave]) => {
          if (pave < 1.3) return;
          if (!both && side !== (paveL[i] >= paveR[i] ? 1 : -1)) return;
          const off = half[i] + 0.55;
          const x = pts[i][0] + nrm[i][0] * off * side, z = pts[i][1] + nrm[i][1] * off * side;
          if (Math.hypot(x, z) > R * (lowQuality ? 0.5 : 0.75)) return;
          // the piece and both its ends must clear every other carriageway
          if ([0, 1, -1].some((e) => onRoad(x + tx * halfLen * e, z + tz * halfLen * e, ri))) return;
          // sunk into the verge: the walls stand a kerb's height proud and the slabs sit near flush
          spots.push({ x, z, y: -0.24, ry: Math.atan2(-tz, tx) }); // covers 9 cm above the pavement, never level with it
          world.claim?.({ kind: 'drain', cx: x, cz: z, hx: halfLen, hz: 0.55, ry: Math.atan2(-tz, tx) });
        });
      }
    });
    // gutters have walkable slab covers: their proxies are not used for player collision
    put('yaba_drainage_gutter', spots, { collide: false });
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
    put('yaba_danfo_minibus', parked);
    const n = 0; // moving traffic is the traffic system now (traffic.js); these stay parked
    moving = movingInstances(danfoT, Math.max(1, n), -Math.PI / 2);
    group.add(moving.group);
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

  return { group, interact, lamps, update, bodies, counts, pois, shops: placed.filter((p) => p.road && interact.some((i) => i.id.startsWith('shop:'))), landmarks: mids };
}
