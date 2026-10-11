import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { signTexture } from './props.js';
import { THEMES } from '../world.js';

// The flyover (world bible 9.6): the main road climbs over its busiest junction on a concrete deck, the
// way Lagos does it at Ojuelegba and Jibowu. Through traffic goes over; the cross street and the
// pedestrians go under, between the piers. Ramps drop back to the road either side.

const H = 6.2, SPAN = 36, RAMP = 46;
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

// Where flyovers go: junctions a major road runs straight through, with room for both ramps on the
// straight, the best first (trunk over primary over secondary, then nearest the start), each clear of
// the ones already chosen and of anything in `taken` ([x, z] points). Planned before the footbridges
// (world.js), so the two are laid out together and never meet.
export function planFlyovers({ roads, junctionAt, spawn, max = 2, taken = [] }) {
  const MAJOR = ['trunk', 'primary', 'secondary'];
  const cands = [];
  roads.filter((r) => r.fit && MAJOR.includes(r.cls)).forEach((r) => {
    const { pts, half } = r.fit;
    for (let i = 2; i < pts.length - 2; i++) {
      if (!junctionAt?.(pts[i], r)) continue;
      // walk out both ways, checking it stays straight for half the span plus a ramp
      const need = SPAN / 2 + RAMP;
      const dir = [pts[i + 1][0] - pts[i - 1][0], pts[i + 1][1] - pts[i - 1][1]], dl = Math.hypot(...dir) || 1, ux = dir[0] / dl, uz = dir[1] / dl;
      let ok = true;
      for (const s of [-1, 1]) {
        let L = 0, j = i;
        while (L < need && ok) { const k = j + s; if (k < 0 || k >= pts.length) { ok = false; break; } const sx = pts[k][0] - pts[j][0], sz = pts[k][1] - pts[j][1], sl = Math.hypot(sx, sz) || 1; if (Math.abs((sx / sl) * ux + (sz / sl) * uz) < 0.985) ok = false; L += sl; j = k; }
      }
      if (!ok) continue;
      const score = (r.cls === 'trunk' ? 3 : r.cls === 'primary' ? 2 : 1) * 1000 - Math.hypot(pts[i][0] - spawn.x, pts[i][1] - spawn.z);
      cands.push({ r, i, x: pts[i][0], z: pts[i][1], ux, uz, half: Math.max(...half.slice(i - 2, i + 3)), score, SPAN, RAMP });
    }
  });
  // a run: the deck and both ramps, as a box along the road
  const inRun = (f, px, pz, pad) => { const dx = px - f.x, dz = pz - f.z; return Math.abs(dx * f.ux + dz * f.uz) < SPAN / 2 + RAMP + pad && Math.abs(-dx * f.uz + dz * f.ux) < f.half + pad; };
  const out = [];
  for (const c of cands.sort((a, b) => b.score - a.score)) {
    if (out.length >= max) break;
    if (taken.some(([px, pz]) => inRun(c, px, pz, 3))) continue;
    // two flyovers never share a stretch of road: their runs (and 20 m between) stay apart
    if (out.some((f) => Math.hypot(f.x - c.x, f.z - c.z) < 2 * (SPAN / 2 + RAMP) + 20)) continue;
    out.push(c);
  }
  out.inRun = (px, pz, pad = 0) => out.some((f) => inRun(f, px, pz, pad));
  return out;
}

export function buildFlyover({ world, scene }) {
  // what world.js planned (footbridges were kept clear of it); otherwise plan now, clear of the footbridges
  let plan = world.flyoverPlan;
  if (!plan) {
    const taken = [];
    (world.bridges || (world.bridge ? [world.bridge] : [])).forEach((b) => { if (b?.ends?.length !== 2) return; const [e0, e1] = b.ends, L = Math.hypot(e1.x - e0.x, e1.z - e0.z); for (let t = 0; t <= L; t += 1) taken.push([e0.x + (e1.x - e0.x) * t / L, e0.z + (e1.z - e0.z) * t / L]); b.ends.forEach((e) => taken.push([e.foot.x, e.foot.z])); });
    plan = planFlyovers({ roads: world.roads, junctionAt: world.junctionAt, spawn: world.spawn, max: 2, taken });
  }
  if (!plan.length) return null;
  const built = plan.map((best) => buildOne(world, scene, best));
  // one face for everyone who asks (traffic.js): the first flyover's numbers, and questions answered for all of them
  return { ...built[0], list: built, heightFor: (px, pz, road) => Math.max(0, ...built.map((f) => f.heightFor(px, pz, road))), over: (px, pz, road) => built.some((f) => (!road || road === f.road) && f.over(px, pz)) };
}

function buildOne(world, scene, best) {
  const { x, z, ux, uz } = best, nx = -uz, nz = ux;
  const W = Math.min(best.half * 2 - 0.6, 11); // the deck covers the carriageway, both directions
  const group = new THREE.Group(); group.name = 'flyover'; scene.add(group);
  const concrete = new THREE.MeshStandardMaterial({ color: 0xc9c2b4, roughness: 0.9 }), dark = new THREE.MeshStandardMaterial({ color: THEMES.night.road, roughness: 0.8 }); // the same asphalt as the road below it
  const paint = new THREE.MeshBasicMaterial({ color: 0xf2efe6 });
  // the height along the road: up the ramp, level over the junction, down the other side
  const heightAt = (s) => { const a = Math.abs(s); if (a <= SPAN / 2) return H; if (a >= SPAN / 2 + RAMP) return 0; const u = 1 - (a - SPAN / 2) / RAMP; return H * (u * u * (3 - 2 * u)); };
  const along = (px, pz) => (px - x) * ux + (pz - z) * uz, across = (px, pz) => (px - x) * nx + (pz - z) * nz;
  // the deck and ramps as one mesh: short slabs following the curve
  const parts = [], tops = [], rails = [], marks = [];
  const ry = Math.atan2(ux, uz);
  const STEP = 2;
  for (let s = -(SPAN / 2 + RAMP); s < SPAN / 2 + RAMP; s += STEP) {
    const m = s + STEP / 2, h = heightAt(m), slope = (heightAt(s + STEP) - heightAt(s)) / STEP;
    if (h < 0.05) continue;
    const cx = x + ux * m, cz = z + uz * m;
    const slab = box(W, 0.55, STEP + 0.05, 0, -0.275, 0); slab.rotateX(-Math.atan(slope)); slab.rotateY(ry); slab.translate(cx, h + 0.05, cz); parts.push(slab);
    const top = box(W - 0.6, 0.04, STEP + 0.05, 0, 0.02, 0); top.rotateX(-Math.atan(slope)); top.rotateY(ry); top.translate(cx, h + 0.05, cz); tops.push(top);
    [-1, 1].forEach((sd) => { const rl = box(0.3, 0.9, STEP + 0.05, sd * (W / 2 - 0.15), 0.45, 0); rl.rotateX(-Math.atan(slope)); rl.rotateY(ry); rl.translate(cx, h + 0.05, cz); rails.push(rl); });
    if (Math.floor(m / 6) % 2 === 0) { const mk = box(0.15, 0.02, STEP * 0.9, 0, 0.06, 0); mk.rotateX(-Math.atan(slope)); mk.rotateY(ry); mk.translate(cx, h + 0.05, cz); marks.push(mk); }
  }
  group.add(new THREE.Mesh(mergeGeometries(parts), concrete), new THREE.Mesh(mergeGeometries(tops), dark), new THREE.Mesh(mergeGeometries(rails), concrete), new THREE.Mesh(mergeGeometries(marks), paint));
  // piers: pairs under the deck, clear of the cross street (none within 9 m of the junction), and never in the lanes of
  // any other road that passes under the deck (a service road, a side street); the ramps' side walls likewise
  const onOtherRoad = (px, pz, pad) => world.roads.some((r) => r !== best.r && r.fit && r.fit.pts.some((a, i) => { if (i === r.fit.pts.length - 1) return false; const b = r.fit.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L2)); return Math.hypot(a[0] + dx * u - px, a[1] + dz * u - pz) < Math.max(r.fit.half[i], r.fit.half[i + 1]) + pad; }));
  const piers = [];
  for (let s = -(SPAN / 2 + RAMP * 0.5); s <= SPAN / 2 + RAMP * 0.5; s += 12) {
    if (Math.abs(s) < 9) continue;
    const h = heightAt(s); if (h < 2.4) continue;
    const cx = x + ux * s, cz = z + uz * s;
    if (onOtherRoad(cx, cz, 1.2)) continue;
    const p = box(1.4, h - 0.5, 1.4, 0, (h - 0.5) / 2, 0); p.rotateY(ry); p.translate(cx, 0, cz); piers.push(p);
    const cap = box(W * 0.7, 0.6, 1.8, 0, h - 0.5, 0); cap.rotateY(ry); cap.translate(cx, 0, cz); piers.push(cap);
    world.addColliders?.([{ name: 'flyover_pier', cx, cz, hx: 0.7, hz: 0.7, ry, h }]);
  }
  if (piers.length) group.add(new THREE.Mesh(mergeGeometries(piers), concrete));
  // the name on both faces of the deck over the junction
  const name = (best.r.name || 'Yaba').toUpperCase();
  const tex = signTexture(`${name} FLYOVER`, { bg: '#2f6b4f', fg: '#ffffff', w: 1100, h: 140 });
  [-1, 1].forEach((sd) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.0), new THREE.MeshBasicMaterial({ map: tex, color: 0xdddddd })); m.position.set(x + nx * sd * (W / 2 + 0.03), H - 0.35, z + nz * sd * (W / 2 + 0.03)); m.rotation.y = Math.atan2(nx * sd, nz * sd); group.add(m); });
  // walls along the low ends of the ramps: nobody walks into a ramp from the side, and nobody walks up it
  // (where the road is wider than the deck, the ground lanes run on beside the ramp: no wall between the lanes)
  const wider = (px, pz) => { const P = best.r.fit.pts; let bi = 0, bd = Infinity; P.forEach(([qx, qz], i) => { const d = Math.hypot(qx - px, qz - pz); if (d < bd) { bd = d; bi = i; } }); return best.r.fit.half[bi] > W / 2 + 0.3; };
  const walls = [];
  for (const sd of [-1, 1]) for (let s = SPAN / 2 + RAMP * 0.25; s < SPAN / 2 + RAMP; s += 3) {
    const h = heightAt(s + 1.5); if (h > 2.4) continue;
    [-1, 1].forEach((side) => { const cx = x + ux * sd * (s + 1.5) + nx * side * (W / 2 - 0.15), cz = z + uz * sd * (s + 1.5) + nz * side * (W / 2 - 0.15); if (!onOtherRoad(cx, cz, 0.4) && !wider(cx, cz)) walls.push({ name: 'flyover_ramp', cx, cz, hx: 0.2, hz: 1.6, ry, h: h + 1 }); });
  }
  world.addColliders?.(walls);
  // the camera does not pass through the deck
  world.claim?.({ kind: 'flyover_deck', cx: x, cz: z, hx: W / 2, hz: SPAN / 2 + 8, ry, y0: H - 0.6, y1: H + 1.1 });
  // and the whole run, ramps too, is land set aside, so nothing placed after it (a venue, a park, the audit) lands on it
  world.claims?.push({ kind: 'flyover_run', cx: x, cz: z, hx: W / 2 + 0.5, hz: SPAN / 2 + RAMP, ry });
  return {
    group, road: best.r, x, z, ux, uz, W, H, SPAN, RAMP,
    // how high a car is here, if it is on the flyover's road and inside its span
    heightFor(px, pz, road) { if (road !== best.r || Math.abs(across(px, pz)) > W / 2 + 0.5) return 0; return heightAt(along(px, pz)); },
    over: (px, pz) => Math.abs(along(px, pz)) < SPAN / 2 + 4,
  };
}
