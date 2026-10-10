import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { signTexture } from './props.js';

// The flyover (world bible 9.6): the main road climbs over its busiest junction on a concrete deck, the
// way Lagos does it at Ojuelegba and Jibowu. Through traffic goes over; the cross street and the
// pedestrians go under, between the piers. Ramps drop back to the road either side.

const H = 6.2, SPAN = 36, RAMP = 46;
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

export function buildFlyover({ world, scene }) {
  const MAJOR = ['trunk', 'primary', 'secondary'];
  // a junction a major road runs straight through, with room for both ramps on the straight
  let best = null;
  world.roads.filter((r) => r.fit && MAJOR.includes(r.cls)).forEach((r) => {
    const { pts, half } = r.fit;
    for (let i = 2; i < pts.length - 2; i++) {
      if (!world.junctionAt?.(pts[i], r)) continue;
      // walk out both ways, checking it stays straight for half the span plus a ramp
      const need = SPAN / 2 + RAMP;
      const dir = [pts[i + 1][0] - pts[i - 1][0], pts[i + 1][1] - pts[i - 1][1]], dl = Math.hypot(...dir) || 1, ux = dir[0] / dl, uz = dir[1] / dl;
      let ok = true;
      for (const s of [-1, 1]) {
        let L = 0, j = i;
        while (L < need && ok) { const k = j + s; if (k < 0 || k >= pts.length) { ok = false; break; } const sx = pts[k][0] - pts[j][0], sz = pts[k][1] - pts[j][1], sl = Math.hypot(sx, sz) || 1; if (Math.abs((sx / sl) * ux + (sz / sl) * uz) < 0.985) ok = false; L += sl; j = k; }
      }
      if (!ok) continue;
      const score = (r.cls === 'trunk' ? 3 : r.cls === 'primary' ? 2 : 1) * 1000 - Math.hypot(pts[i][0] - world.spawn.x, pts[i][1] - world.spawn.z);
      if (!best || score > best.score) best = { r, i, x: pts[i][0], z: pts[i][1], ux, uz, half: Math.max(...half.slice(i - 2, i + 3)), score };
    }
  });
  if (!best) return null;
  const { x, z, ux, uz } = best, nx = -uz, nz = ux;
  const W = Math.min(best.half * 2 - 0.6, 11); // the deck covers the carriageway, both directions
  const group = new THREE.Group(); group.name = 'flyover'; scene.add(group);
  const concrete = new THREE.MeshStandardMaterial({ color: 0xc9c2b4, roughness: 0.9 }), dark = new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.95 });
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
  // piers: pairs under the deck, clear of the cross street (none within 9 m of the junction)
  const piers = [];
  for (let s = -(SPAN / 2 + RAMP * 0.5); s <= SPAN / 2 + RAMP * 0.5; s += 12) {
    if (Math.abs(s) < 9) continue;
    const h = heightAt(s); if (h < 2.4) continue;
    const cx = x + ux * s, cz = z + uz * s;
    const p = box(1.4, h - 0.5, 1.4, 0, (h - 0.5) / 2, 0); p.rotateY(ry); p.translate(cx, 0, cz); piers.push(p);
    const cap = box(W * 0.7, 0.6, 1.8, 0, h - 0.5, 0); cap.rotateY(ry); cap.translate(cx, 0, cz); piers.push(cap);
    world.addColliders?.([{ name: 'flyover_pier', cx, cz, hx: 0.7, hz: 0.7, ry, h }]);
  }
  group.add(new THREE.Mesh(mergeGeometries(piers), concrete));
  // the name on both faces of the deck over the junction
  const name = (best.r.name || 'Yaba').toUpperCase();
  const tex = signTexture(`${name} FLYOVER`, { bg: '#2f6b4f', fg: '#ffffff', w: 1100, h: 140 });
  [-1, 1].forEach((sd) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.0), new THREE.MeshBasicMaterial({ map: tex, color: 0xdddddd })); m.position.set(x + nx * sd * (W / 2 + 0.03), H - 0.35, z + nz * sd * (W / 2 + 0.03)); m.rotation.y = Math.atan2(nx * sd, nz * sd); group.add(m); });
  // walls along the low ends of the ramps: nobody walks into a ramp from the side, and nobody walks up it
  const walls = [];
  for (const sd of [-1, 1]) for (let s = SPAN / 2 + RAMP * 0.25; s < SPAN / 2 + RAMP; s += 3) {
    const h = heightAt(s + 1.5); if (h > 2.4) continue;
    [-1, 1].forEach((side) => { const cx = x + ux * sd * (s + 1.5) + nx * side * (W / 2 - 0.15), cz = z + uz * sd * (s + 1.5) + nz * side * (W / 2 - 0.15); walls.push({ name: 'flyover_ramp', cx, cz, hx: 0.2, hz: 1.6, ry, h: h + 1 }); });
  }
  world.addColliders?.(walls);
  // the camera does not pass through the deck
  world.claim?.({ kind: 'flyover_deck', cx: x, cz: z, hx: W / 2, hz: SPAN / 2 + 8, ry, y0: H - 0.6, y1: H + 1.1 });
  return {
    group, road: best.r, x, z, ux, uz, W, H, SPAN, RAMP,
    // how high a car is here, if it is on the flyover's road and inside its span
    heightFor(px, pz, road) { if (road !== best.r || Math.abs(across(px, pz)) > W / 2 + 0.5) return 0; return heightAt(along(px, pz)); },
    over: (px, pz) => Math.abs(along(px, pz)) < SPAN / 2 + 4,
  };
}
