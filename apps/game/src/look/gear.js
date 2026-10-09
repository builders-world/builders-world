import * as THREE from 'three';

// Wearables from the bag, attached to the provisional avatar. Sized for the shared avatar
// model (head centre about 1.61 m, facing +z) and kept as separate parts so the final
// avatar can take the same slots.
export function createGear(avatar) {
  const parts = {};
  const mat = (c, r = 0.6, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const dark = mat(0x1d2028, 0.5), amber = mat(0xf2b33d, 0.45), canvas = mat(0x3f4a3c, 0.85), metal = mat(0x9aa3b2, 0.35, 0.6);

  parts.headphones = (() => {
    const g = new THREE.Group();
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.025, 8, 24, Math.PI), dark);
    band.position.y = 1.64;
    const cupGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.07, 16).rotateZ(Math.PI / 2);
    [-1, 1].forEach((s) => { const c = new THREE.Mesh(cupGeo, s > 0 ? amber : dark); c.position.set(s * 0.23, 1.6, 0); g.add(c); });
    g.add(band);
    return g;
  })();

  parts.backpack = (() => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.46, 0.17), canvas);
    body.position.set(0, 1.06, -0.24);
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.05), amber);
    pocket.position.set(0, 0.94, -0.34);
    const strapGeo = new THREE.BoxGeometry(0.05, 0.5, 0.03);
    [-1, 1].forEach((s) => { const st = new THREE.Mesh(strapGeo, dark); st.position.set(s * 0.13, 1.08, 0.15); g.add(st); });
    g.add(body, pocket);
    return g;
  })();

  parts.cap = (() => {
    const g = new THREE.Group();
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.215, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), amber);
    crown.position.y = 1.7;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16, 1, false, -Math.PI / 2, Math.PI), amber);
    brim.scale.set(1, 1, 1.3); brim.position.set(0, 1.71, 0.16);
    g.add(crown, brim);
    return g;
  })();

  parts.glasses = (() => {
    const g = new THREE.Group();
    const ring = new THREE.TorusGeometry(0.055, 0.009, 6, 18);
    [-1, 1].forEach((s) => { const r = new THREE.Mesh(ring, metal); r.position.set(s * 0.075, 1.63, 0.19); g.add(r); });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.008), metal);
    bridge.position.set(0, 1.635, 0.19);
    g.add(bridge);
    return g;
  })();

  Object.values(parts).forEach((p) => { p.visible = false; avatar.add(p); });

  return {
    set(id, on) { if (parts[id]) parts[id].visible = on; },
    dispose() {
      Object.values(parts).forEach((p) => { p.traverse((o) => o.geometry?.dispose()); p.removeFromParent(); });
      [dark, amber, canvas, metal].forEach((m) => m.dispose());
    },
  };
}
