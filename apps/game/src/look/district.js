import * as THREE from 'three';
import { instanceAsset, collidersFor, movingInstances, footprint } from './kit.js';
import { mulberry32 } from '../mesh.js';

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
    const fp = footprint(template);
    const front = template.bounds.max.z; // the kit's fronts face local +z
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

  // ---------- active street edges: compound shops ----------
  const shopT = get('yaba_compound_shop');
  if (shopT) {
    const spots = spaced(lots(shopT), lowQuality ? 4 : 6, 28, placed);
    put('yaba_compound_shop', spots);
    spots.forEach((s, i) => {
      placed.push(s);
      const [name, line] = SHOP_NAMES[i % SHOP_NAMES.length];
      const fx = -Math.sin(s.ry + Math.PI), fz = -Math.cos(s.ry + Math.PI);
      interact.push({ id: `shop:${i}`, label: `Visit ${name}`, x: s.x + Math.sin(s.ry) * 4.8, z: s.z + Math.cos(s.ry) * 4.8, r: 3.5, line, name });
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
      interact.push({ id: `stall:${i}`, label: `Stop at the ${name.toLowerCase()}`, x: s.x + Math.sin(s.ry) * 2.4, z: s.z + Math.cos(s.ry) * 2.4, r: 3.2, line, name });
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
    const n = lowQuality ? 2 : 5;
    moving = movingInstances(danfoT, n, -Math.PI / 2);
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

  return { group, interact, lamps, update, bodies, counts, shops: placed.filter((p) => p.road && interact.some((i) => i.id.startsWith('shop:'))), landmarks: mids };
}
