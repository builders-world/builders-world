import * as THREE from 'three';

// Clouds you climb up to (Elvis, 12 October 2026: "on aerial view users will be able to see the clouds ... the higher
// you scroll up, the higher altitude ... just like the way you can see it from planes, where you can see the grid from
// planes with clouds"). Soft clay puffs, each a few rounded blobs, in a layer 600 to 1,100 m up, drifting with the wind;
// how many there are follows the live weather (a few on a clear day, a deck of them in the rains). From the street they
// are out of sight; from the aerial view they appear as you rise, you pass through them (the view goes white for a
// moment, as from a plane), and above them the city shows through the gaps.
// The layer is one instanced mesh that wraps round the camera, so it never ends.

const SPAN = 14000, BASE = 620, TOP = 1100, N = 150, BLOBS = 7;

export function createClouds() {
  const group = new THREE.Group(); group.name = 'clouds';
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#c9d3df', emissiveIntensity: 0.35, transparent: true, opacity: 0.95, depthWrite: true });
  const mesh = new THREE.InstancedMesh(geo, mat, N * BLOBS);
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; group.add(mesh);
  // each cloud: a centre in the wrapping tile, a size, and its blobs round it (a flat-bottomed heap)
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const clouds = Array.from({ length: N }, (_, i) => {
    const s = 60 + rnd() * 170, blobs = Array.from({ length: BLOBS }, (__, k) => {
      const a = rnd() * Math.PI * 2, r = (k === 0 ? 0 : 0.35 + rnd() * 0.75) * s;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r * 0.7, y: rnd() * s * 0.25, r: s * (k === 0 ? 0.75 : 0.35 + rnd() * 0.35) };
    });
    return { x: rnd() * SPAN, z: rnd() * SPAN, y: BASE + rnd() * (TOP - BASE - 200), s, blobs, rank: i / N };
  });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  let wind = 0, cover = 0.4, shown = 0, inside = 0;
  const api = { group, get inside() { return inside; } };
  /** cover: 0 clear to 1 overcast (live weather); returns how far the camera is inside a cloud (0..1), for the fog */
  api.update = (camera, dt, c = 0.4) => {
    cover += (c - cover) * Math.min(1, dt * 0.5);
    wind += dt * 4; // metres a second, east
    const alt = camera.position.y;
    shown += ((alt > 140 ? 1 : 0) - shown) * Math.min(1, dt * 2);
    group.visible = shown > 0.01;
    if (!group.visible) { inside = 0; return 0; }
    const want = 0.12 + 0.88 * cover; // the share of the clouds out today
    let k = 0, deep = 0;
    clouds.forEach((cl) => {
      // wrap each cloud into the tile round the camera, so the layer never runs out
      const wx = ((cl.x + wind - camera.position.x) % SPAN + SPAN * 1.5) % SPAN - SPAN / 2 + camera.position.x;
      const wz = ((cl.z - camera.position.z) % SPAN + SPAN * 1.5) % SPAN - SPAN / 2 + camera.position.z;
      const on = cl.rank < want ? Math.min(1, (want - cl.rank) * 8) * shown : 0;
      cl.blobs.forEach((b) => {
        const r = b.r * on;
        v.set(wx + b.x, cl.y + b.y, wz + b.z); sc.set(r, r * 0.62, r);
        m.compose(v, q, sc); mesh.setMatrixAt(k++, m);
        if (r > 1) { const d = Math.hypot((camera.position.x - v.x) / r, (camera.position.y - v.y) / (r * 0.62), (camera.position.z - v.z) / r); if (d < 1.4) deep = Math.max(deep, 1 - Math.max(0, d - 0.6) / 0.8); }
      });
    });
    mesh.instanceMatrix.needsUpdate = true;
    inside += (deep - inside) * Math.min(1, dt * 6);
    return inside;
  };
  return api;
}
