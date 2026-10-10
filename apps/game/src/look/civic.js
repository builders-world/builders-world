import * as THREE from 'three';
import { signTexture } from './props.js';
import { trackDetail } from './quality.js';
import { cityInfo } from './cityinfo.js';

// City furniture with names on it (world bible 4.4): Lagos street-name signs at junctions, fingerposts
// pointing at real Yaba landmarks, and bus shelters at the danfo stops. Placement follows the land-use
// rules: pavement or verge only, never a plot, never a carriageway, never inside anything.

// Real places around Yaba (approximate coordinates); the fingerposts point at them from where they stand.
export const LANDMARKS = [
  { name: 'Tejuosho Market', lat: 6.5050, lon: 3.3700 },
  { name: 'Yaba College of Technology', short: 'Yaba Tech', lat: 6.5185, lon: 3.3730 },
  { name: 'University of Lagos', short: 'UNILAG', lat: 6.5158, lon: 3.3897 },
  { name: 'Co-Creation Hub', short: 'CcHub', lat: 6.5163, lon: 3.3787 },
  { name: 'E-Centre', lat: 6.5058, lon: 3.3778 },
  { name: 'Ojuelegba', lat: 6.5073, lon: 3.3632 },
  { name: "Queen's College", lat: 6.5005, lon: 3.3768 },
  { name: 'National Stadium', short: 'Stadium, Surulere', lat: 6.4987, lon: 3.3652 },
];

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

// the places a sign may point to: this city's own (cityinfo.js), or Yaba's
export const cityLandmarks = () => cityInfo().landmarks || LANDMARKS;

export function buildCivic(world, scene, { rides } = {}) {
  const group = new THREE.Group(); group.name = 'civic'; scene.add(group);
  const post = new THREE.MeshStandardMaterial({ color: 0x55605a, roughness: 0.55, metalness: 0.3 });
  const used = [];
  const clear = (x, z, r = 0.6) => !world.onCarriageway?.(x, z, 0.3) && !world.inPlot?.(x, z, 0.3) && !world.solidAt?.(x, 1, z)
    && !world.kitColliders.some((c) => Math.hypot(c.cx - x, c.cz - z) < Math.max(c.hx, c.hz) + r) && !used.some((u) => Math.hypot(u.x - x, u.z - z) < 4);
  const added = [];

  // ---------- street-name signs: green plates with white letters, the Lagos standard ----------
  const named = world.roads.filter((r) => r.fit && r.name);
  const signMats = new Map();
  const plateMat = (name) => { if (!signMats.has(name)) { const t = signTexture(name.toUpperCase(), { bg: cityInfo().streetSign?.bg || '#1f6b45', fg: cityInfo().streetSign?.fg || '#ffffff', w: 768, h: 128 }); signMats.set(name, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })); } return signMats.get(name); };
  named.forEach((r) => {
    const { pts, nrm, half, paveL, paveR } = r.fit;
    [0, pts.length - 1].forEach((end) => {
      if (!world.junctionAt?.(pts[end], r)) return;
      const dir = end === 0 ? 1 : -1, k = Math.max(0, Math.min(pts.length - 1, end + dir));
      const side = paveR[end] >= paveL[end] ? -1 : 1, pave = side < 0 ? paveR[end] : paveL[end];
      if (pave < 0.8) return;
      const back = half[end] + Math.max(paveL[end], paveR[end]) + 1.5;
      const tx = pts[k][0] - pts[end][0], tz = pts[k][1] - pts[end][1], tl = Math.hypot(tx, tz) || 1;
      const off = half[end] + Math.min(0.5, pave - 0.3);
      const x = pts[end][0] + (tx / tl) * back + nrm[end][0] * off * side, z = pts[end][1] + (tz / tl) * back + nrm[end][1] * off * side;
      if (!clear(x, z)) return;
      used.push({ x, z });
      const g = new THREE.Group();
      g.add(new THREE.Mesh(box(0.08, 2.9, 0.08, 0, 1.45, 0), post));
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.32), plateMat(r.name));
      plate.position.set(0, 2.7, 0.045);
      const back2 = plate.clone(); back2.rotation.y = Math.PI; back2.position.z = -0.045;
      g.add(plate, back2, new THREE.Mesh(box(1.94, 0.36, 0.08, 0, 2.7, 0), post));
      g.position.set(x, 0, z);
      g.rotation.y = Math.atan2(tx, tz) + Math.PI / 2; // the plate runs along the street it names
      group.add(trackDetail(g, 1.2));
      world.addColliders([{ name: 'street_sign', cx: x, cz: z, hx: 0.08, hz: 0.08, ry: 0 }]);
      added.push({ kind: 'street_sign', name: r.name, x, z });
    });
  });

  // ---------- fingerposts to real landmarks, at the two busiest junctions ----------
  const c = world.center || { lat: 6.5095, lon: 3.3715 };
  const toXZ = (lat, lon) => [(lon - c.lon) * 111320 * Math.cos((c.lat * Math.PI) / 180), -(lat - c.lat) * 110574];
  const spots = [];
  named.filter((r) => ['primary', 'secondary', 'trunk', 'tertiary'].includes(r.cls)).forEach((r) => {
    const { pts, nrm, half, paveL, paveR } = r.fit;
    [Math.floor(pts.length / 3), Math.floor((2 * pts.length) / 3)].forEach((i) => {
      const side = paveR[i] >= paveL[i] ? -1 : 1, pave = side < 0 ? paveR[i] : paveL[i];
      if (pave < 1.2) return;
      const off = half[i] + pave * 0.6;
      spots.push({ x: pts[i][0] + nrm[i][0] * off * side, z: pts[i][1] + nrm[i][1] * off * side });
    });
  });
  let posts = 0;
  for (const sp of spots) {
    if (posts >= 3) break;
    if (!clear(sp.x, sp.z, 0.8) || Math.hypot(sp.x, sp.z) > world.radius * 0.8) continue;
    used.push(sp); posts++;
    const g = new THREE.Group(); g.position.set(sp.x, 0, sp.z);
    g.add(new THREE.Mesh(box(0.12, 3.6, 0.12, 0, 1.8, 0), post));
    const ranked = cityLandmarks().map((l) => { const [lx, lz] = toXZ(l.lat, l.lon); return { ...l, dx: lx - sp.x, dz: lz - sp.z, d: Math.hypot(lx - sp.x, lz - sp.z) }; }).sort((a, b) => a.d - b.d).slice(0, 5);
    ranked.forEach((l, k) => {
      const km = l.d >= 1000 ? `${(l.d / 1000).toFixed(1)} km` : `${Math.round(l.d / 50) * 50} m`;
      const tex = signTexture(`${l.short || l.name}`, { bg: '#f2b33d', fg: '#3b2a20', w: 640, h: 128, sub: km });
      const arm = new THREE.Group(); arm.position.y = 3.2 - k * 0.42; arm.rotation.y = Math.atan2(l.dx, l.dz) - Math.PI / 2;
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.3), mat); blade.position.set(0.85, 0, 0.03);
      const blade2 = blade.clone(); blade2.rotation.y = Math.PI; blade2.position.z = -0.03;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 3).rotateZ(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2b33d, roughness: 0.6 })); tip.position.set(1.7, 0, 0);
      arm.add(blade, blade2, tip, new THREE.Mesh(box(1.6, 0.33, 0.05, 0.85, 0, 0), post));
      g.add(arm);
    });
    group.add(trackDetail(g, 1.2));
    world.addColliders([{ name: 'fingerpost', cx: sp.x, cz: sp.z, hx: 0.12, hz: 0.12, ry: 0 }]);
    added.push({ kind: 'fingerpost', x: sp.x, z: sp.z, to: ranked.map((l) => l.short || l.name) });
  }

  // ---------- bus shelters at danfo stops: a canopy, a bench, a yellow BUS STOP header ----------
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf2c418, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fc6c4, roughness: 0.2, transparent: true, opacity: 0.45 });
  const head = new THREE.MeshStandardMaterial({ map: signTexture('BUS STOP', { bg: '#f2c418', fg: '#1a1a1a', w: 512, h: 96 }), roughness: 0.6 });
  (rides?.stops || []).filter((s) => s.kind === 'danfo').forEach((s) => {
    // behind the stop sign, away from the kerb, facing the road
    const ox = s.x - s.kerb.x, oz = s.z - s.kerb.z, ol = Math.hypot(ox, oz) || 1, nx = ox / ol, nz = oz / ol;
    const x = s.x + nx * 1.4, z = s.z + nz * 1.4, ry = Math.atan2(-nx, -nz);
    if (!clear(x, z, 0.4)) return;
    if (world.inPlot?.(x + nx * 0.9, z + nz * 0.9, 0.2)) return;
    used.push({ x, z });
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    g.add(new THREE.Mesh(box(3.2, 0.1, 1.5, 0, 2.5, 0), yellow));
    [-1.5, 1.5].forEach((px) => g.add(new THREE.Mesh(box(0.08, 2.5, 0.08, px, 1.25, -0.6), post)));
    g.add(new THREE.Mesh(box(3.0, 1.9, 0.04, 0, 1.25, -0.65), glass));
    g.add(new THREE.Mesh(box(2.4, 0.08, 0.4, 0, 0.48, -0.4), new THREE.MeshStandardMaterial({ color: 0xa87950, roughness: 0.8 })));
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.3), head); plate.position.set(0, 2.72, 0.76); g.add(plate);
    group.add(trackDetail(g, 1.2));
    // only the back panel and the posts are solid: you can step in under the canopy
    world.addColliders([{ name: 'shelter_back', cx: x - nx * 0.65, cz: z - nz * 0.65, hx: 1.55, hz: 0.06, ry }]);
    world.claim?.({ kind: 'bus_shelter', cx: x, cz: z, hx: 1.6, hz: 0.75, ry });
    added.push({ kind: 'bus_shelter', x, z, seat: { x: x - Math.sin(ry) * 0.35, z: z - Math.cos(ry) * 0.35, yaw: ry } });
  });

  return { group, added, dispose() { group.removeFromParent(); } };
}
