import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { signTexture } from './props.js';

// What makes the planned estates readable at street level (world bible 7.5b): a sign over every gate
// with the gate number and the estate's name, a number plaque beside every front door (1A, 2B...),
// and cars in the driveways of the houses that have one.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

export function buildEstateSigns({ world, scene }) {
  const group = new THREE.Group(); group.name = 'estate-signs'; scene.add(group);
  const estates = world.estates || [], addresses = world.addresses || [], cars = world.carSpots || [];

  // ---------- gate signs: a beam across the pillars, the sign on both faces ----------
  const beam = new THREE.MeshStandardMaterial({ color: 0x3b2f27, roughness: 0.7 });
  estates.forEach((E) => E.gates.forEach((g) => {
    const tex = signTexture(`GATE ${g.no}`, { bg: '#263832', fg: '#f2c94c', w: 768, h: 150, sub: E.name });
    const [[ax, az], [bx, bz]] = g.post, cx = (ax + bx) / 2, cz = (az + bz) / 2, span = Math.hypot(bx - ax, bz - az);
    const holder = new THREE.Group(); holder.position.set(cx, 0, cz); holder.rotation.y = g.ry; group.add(holder);
    holder.add(new THREE.Mesh(box(span + 0.6, 0.25, 0.3, 0, 2.95, 0), beam));
    [1, -1].forEach((sd) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(5.2, span - 0.4), 1.0), new THREE.MeshBasicMaterial({ map: tex, color: 0xdddddd }));
      m.position.set(0, 3.6, sd * 0.16); if (sd < 0) m.rotation.y = Math.PI; holder.add(m);
    });
    holder.add(new THREE.Mesh(box(Math.min(5.4, span - 0.2), 1.2, 0.26, 0, 3.6, 0), beam));
  }));

  // ---------- house numbers: one atlas of plaques, one draw call ----------
  const COLS = 16, CW = 128, CH = 64;
  const rows = Math.max(1, Math.ceil(addresses.length / COLS));
  const can = document.createElement('canvas'); can.width = COLS * CW; can.height = rows * CH;
  const cx2 = can.getContext('2d');
  addresses.forEach((a, i) => {
    const x = (i % COLS) * CW, y = Math.floor(i / COLS) * CH;
    cx2.fillStyle = '#263832'; cx2.fillRect(x + 2, y + 2, CW - 4, CH - 4);
    cx2.strokeStyle = '#f2c94c'; cx2.lineWidth = 3; cx2.strokeRect(x + 6, y + 6, CW - 12, CH - 12);
    cx2.fillStyle = '#f7efdc'; cx2.textAlign = 'center'; cx2.textBaseline = 'middle';
    cx2.font = '900 30px "Baloo 2", "Arial Black", sans-serif'; cx2.fillText(a.no, x + CW / 2, y + CH * 0.42);
    cx2.font = '700 12px "Baloo 2", Arial, sans-serif'; cx2.fillText(`GATE ${a.gate}`, x + CW / 2, y + CH * 0.78);
  });
  const atlas = new THREE.CanvasTexture(can); atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 4;
  const plates = [];
  addresses.forEach((a, i) => {
    if (!a.door || !a.lamp) return;
    // the door is 1.9 m in from its step; t runs from the lamp's side to the planter's side
    const nx = Math.sin(a.door.ry), nz = Math.cos(a.door.ry);
    const dx = a.door.x - nx * 1.9, dz = a.door.z - nz * 1.9;
    let tx = -(a.lamp.x - (dx + nx * 0.2)) / 1.55, tz = -(a.lamp.z - (dz + nz * 0.2)) / 1.55;
    const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    const g = new THREE.PlaneGeometry(0.62, 0.31);
    const u0 = (i % COLS) / COLS, v1 = 1 - Math.floor(i / COLS) / rows, u1 = u0 + 1 / COLS, v0 = v1 - 1 / rows;
    const uv = g.attributes.uv; uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
    // under the porch light (the planter stands on the other side), so it is lit at night
    g.rotateY(a.door.ry); g.translate(dx + nx * 0.1 - tx * 1.55, 1.55, dz + nz * 0.1 - tz * 1.55);
    plates.push(g);
  });
  if (plates.length) group.add(new THREE.Mesh(mergeGeometries(plates), new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.6 })));

  // ---------- cars in the driveways ----------
  const PAINT = [0xf7f3ea, 0x2b2b2e, 0xb8bec4, 0x9b2f2f, 0x2f4f7f, 0x3f6b4b, 0xd9b64a, 0x6b4a8a];
  const body = new THREE.InstancedMesh(mergeGeometries([box(1.8, 0.55, 4.2, 0, 0.55, 0), box(1.62, 0.55, 2.2, 0, 1.1, -0.2)]), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 }), Math.max(1, cars.length));
  const glass = new THREE.InstancedMesh(mergeGeometries([box(1.64, 0.4, 2.0, 0, 1.12, -0.2)]), new THREE.MeshStandardMaterial({ color: 0x2c3a44, roughness: 0.15, metalness: 0.4 }), Math.max(1, cars.length));
  const wheels = new THREE.InstancedMesh(mergeGeometries([[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]].map(([x, z]) => new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12).rotateZ(Math.PI / 2).translate(x, 0.34, z))), new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.8 }), Math.max(1, cars.length));
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  cars.forEach((c, i) => {
    Q.setFromAxisAngle(Y, c.ry + Math.PI); P.set(c.x, 0.04, c.z); M.compose(P, Q, S);
    body.setMatrixAt(i, M); glass.setMatrixAt(i, M); wheels.setMatrixAt(i, M);
    body.setColorAt(i, col.setHex(PAINT[Math.floor((Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * PAINT.length)]));
  });
  body.count = glass.count = wheels.count = cars.length;
  if (cars.length) { group.add(body, glass, wheels); world.addColliders(cars.map((c) => ({ name: 'parked_car', cx: c.x, cz: c.z, hx: 0.95, hz: 2.15, ry: c.ry, h: 1.5 }))); }

  return { group, dispose() { group.removeFromParent(); atlas.dispose(); } };
}
