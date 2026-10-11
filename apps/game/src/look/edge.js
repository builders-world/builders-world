import * as THREE from 'three';
import { signTexture } from './props.js';
import { cityInfo } from './cityinfo.js';
import { trackDetail } from './quality.js';

// Where a road leaves the area (Elvis, 11 October 2026: "where a playable area ends along a road, make the transition
// feel intentional"): the signs a real town puts up. Outbound traffic passes "Leaving Yaba"; inbound, "Welcome to Yaba".
// The cars keep flowing past them, so the city reads as going on; you come to rest at the edge (main.js) and the
// Travel app takes you on. Every city: the names and the driving side come from its own settings.
export function buildEdgeSigns({ world, scene, area, city }) {
  const group = new THREE.Group(); group.name = 'edge-signs'; scene.add(group);
  const R = world.radius, Rb = R * 0.97, side = cityInfo().drive === 'left' ? -1 : 1, cols = [], placed = [];
  const post = new THREE.MeshStandardMaterial({ color: 0x55605a, roughness: 0.55, metalness: 0.3 });
  const mats = {
    out: new THREE.MeshStandardMaterial({ map: signTexture(`LEAVING ${area.toUpperCase()}`, { bg: '#1f6b45', fg: '#ffffff', w: 760, h: 300, sub: `${city} continues · Travel app` }), roughness: 0.55 }),
    in: new THREE.MeshStandardMaterial({ map: signTexture(`WELCOME TO ${area.toUpperCase()}`, { bg: '#1f6b45', fg: '#ffffff', w: 760, h: 300, sub: city }), roughness: 0.55 }),
  };
  const free = (x, z) => !world.onCarriageway?.(x, z, 0.4) && !world.onRail?.(x, z, 0.3) && !world.solidAt?.(x, 1, z) && !world.inAnyBuilding?.(x, z, 0.4) && !placed.some((q) => Math.hypot(q.x - x, q.z - z) < 6);
  const put = (x, z, hx, hz, half, mat) => {
    const rx = -hz * side, rz = hx * side; // the kerb side for this traffic
    for (let o = half + 0.9; o < half + 4.5; o += 0.4) {
      const px = x + rx * o, pz = z + rz * o; if (!free(px, pz)) continue;
      const g = new THREE.Group(); g.position.set(px, 0, pz); g.rotation.y = Math.atan2(-hx, -hz); // facing the traffic it is for
      const face = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.87), mat); face.position.set(0, 2.25, 0.04); g.add(face);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.87), post); back.position.set(0, 2.25, 0.02); back.rotation.y = Math.PI; g.add(back);
      [-0.9, 0.9].forEach((dx) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.7, 0.08), post); p.position.set(dx, 1.35, 0); g.add(p); });
      group.add(trackDetail(g, 1.1)); placed.push({ x: px, z: pz });
      cols.push({ name: 'edge_sign', cx: px + Math.cos(g.rotation.y) * 0.9, cz: pz - Math.sin(g.rotation.y) * 0.9, hx: 0.06, hz: 0.06, ry: 0 }, { name: 'edge_sign', cx: px - Math.cos(g.rotation.y) * 0.9, cz: pz + Math.sin(g.rotation.y) * 0.9, hx: 0.06, hz: 0.06, ry: 0 });
      return true;
    }
    return false;
  };
  let n = 0;
  (world.roads || []).forEach((r) => {
    if (!r.fit || n >= 16) return;
    const { pts, half } = r.fit;
    for (let i = 0; i < pts.length - 1 && n < 16; i++) {
      const a = pts[i], b = pts[i + 1], ra = Math.hypot(a[0], a[1]), rb = Math.hypot(b[0], b[1]);
      if ((ra - Rb) * (rb - Rb) > 0) continue; // this piece does not cross the line
      const u = (Rb - ra) / ((rb - ra) || 1), x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u;
      let dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      if (rb < ra) { dx = -dx; dz = -dz; } // (dx, dz) now points out of the area
      const h = Math.max(half[i], half[i + 1]);
      if (!r.oneway || rb > ra) n += put(x, z, dx, dz, h, mats.out) ? 1 : 0; // traffic heading out
      if (!r.oneway || rb < ra) n += put(x, z, -dx, -dz, h, mats.in) ? 1 : 0; // traffic coming in
    }
  });
  world.addColliders?.(cols);
  return { group, count: n };
}
