import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// The Yaba asset kit, loaded once from the manifest. Each GLB becomes a template:
// its visible meshes (geometry, authored material, matrix relative to the asset root,
// including the export correction) and its COLLISION_* proxies, kept apart.
// Repeated props are drawn as InstancedMeshes that share those geometries and materials.

const BASE = './assets/yaba-kit/';

export async function loadKit() {
  const res = await fetch(`${BASE}asset-manifest.json`);
  if (!res.ok) throw new Error(`asset manifest ${res.status}`);
  const manifest = await res.json();
  const loader = new GLTFLoader();
  const cache = new Map();

  function load(id) {
    if (cache.has(id)) return cache.get(id);
    const entry = manifest.assets.find((a) => a.id === id);
    if (!entry) throw new Error(`unknown asset ${id}`);
    const p = loader.loadAsync(BASE + entry.runtime.split('/').pop()).then((gltf) => toTemplate(id, entry, gltf));
    cache.set(id, p);
    return p;
  }

  // load everything the street uses up front, in parallel
  const ids = manifest.assets.map((a) => a.id);
  const templates = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await load(id)])));
  return { manifest, templates, get: (id) => templates[id] };
}

function toTemplate(id, entry, gltf) {
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const meshes = [], colliders = [], anchors = {};
  root.traverse((o) => {
    if (!o.isMesh) return;
    const box = new THREE.Box3().setFromObject(o);
    if (o.name.startsWith('COLLISION')) {
      colliders.push({ name: o.name, box });
      return;
    }
    meshes.push({ name: o.name, geometry: o.geometry, material: o.material, matrix: o.matrixWorld.clone() });
    anchors[o.name] = box.getCenter(new THREE.Vector3());
  });
  const bounds = new THREE.Box3();
  meshes.forEach((m) => {
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    bounds.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrix));
  });
  return { id, entry, meshes, colliders, anchors, bounds, collisionName: entry.collision };
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);

// Placement matrix for a ground spot: position on y=0, turned about Y. No rescaling.
export function placement({ x, z, ry = 0, y = 0 }) {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromAxisAngle(Y, ry), _s);
}

// Many copies of one asset: one InstancedMesh per authored mesh, shared geometry and material.
export function instanceAsset(template, spots) {
  const group = new THREE.Group();
  group.name = `kit:${template.id}`;
  if (!spots.length) return group;
  const places = spots.map(placement);
  template.meshes.forEach((m) => {
    const inst = new THREE.InstancedMesh(m.geometry, m.material, places.length);
    inst.name = `${template.id}/${m.name}`;
    places.forEach((P, i) => inst.setMatrixAt(i, _m.multiplyMatrices(P, m.matrix)));
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    group.add(inst);
  });
  return group;
}

// Collision proxies in world space, as boxes on the ground plane (centre, half sizes, turn).
// Kept apart from render meshes: nothing here is drawn.
export function collidersFor(template, spots) {
  const out = [];
  spots.forEach((s) => {
    template.colliders.forEach((c) => {
      const ctr = c.box.getCenter(new THREE.Vector3()), size = c.box.getSize(new THREE.Vector3());
      const cs = Math.cos(s.ry || 0), sn = Math.sin(s.ry || 0);
      out.push({ name: c.name, cx: s.x + ctr.x * cs + ctr.z * sn, cz: s.z - ctr.x * sn + ctr.z * cs, hx: size.x / 2, hz: size.z / 2, ry: s.ry || 0 });
    });
  });
  return out;
}

// What a kit model's parts mean for walking: steps are surfaces you stand on (their top is your
// floor), planters and the like are solid. Read from the part names, in world space for each spot.
export function surfacesFor(template, spots) {
  const treads = [], solids = [];
  spots.forEach((s) => {
    const cs = Math.cos(s.ry || 0), sn = Math.sin(s.ry || 0);
    template.meshes.forEach((m) => {
      const isStep = /step/i.test(m.name), isSolid = /planter|pot|bollard|bin/i.test(m.name);
      if (!isStep && !isSolid) return;
      m.geometry.computeBoundingBox();
      const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrix), c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3());
      const box = { name: `${template.id}_${m.name}`, cx: s.x + c.x * cs + c.z * sn, cz: s.z - c.x * sn + c.z * cs, hx: size.x / 2, hz: size.z / 2, ry: s.ry || 0 };
      if (isStep) treads.push({ ...box, top: b.max.y }); else solids.push({ ...box, h: b.max.y });
    });
  });
  return { treads, solids };
}

// A point on the asset (such as a lamp's glow) in world space for a given spot.
export function anchorAt(template, name, spot) {
  const a = template.anchors[name];
  if (!a) return null;
  return a.clone().applyMatrix4(placement(spot));
}

// Ground footprint of the asset after turning, for finding space to place it.
export function footprint(template) {
  const s = template.bounds.getSize(new THREE.Vector3()), c = template.bounds.getCenter(new THREE.Vector3());
  return { w: s.x, d: s.z, cx: c.x, cz: c.z, h: s.y };
}

// Copies that move every frame (traffic): one InstancedMesh per authored mesh, matrices updated in place.
// `forward` turns the asset so its authored front faces the caller's +Z convention (the danfo's front is +X);
// it aligns axes for steering maths and is not an export correction.
export function movingInstances(template, count, forward = 0) {
  const group = new THREE.Group();
  group.name = `kit:${template.id}:moving`;
  const align = new THREE.Matrix4().makeRotationY(forward);
  const parts = template.meshes.map((m) => {
    const inst = new THREE.InstancedMesh(m.geometry, m.material, Math.max(1, count));
    inst.frustumCulled = false;
    group.add(inst);
    return { inst, local: new THREE.Matrix4().multiplyMatrices(align, m.matrix) };
  });
  const P = new THREE.Matrix4(), out = new THREE.Matrix4();
  return {
    group,
    setAt(i, x, z, ry) {
      P.compose(_p.set(x, 0, z), _q.setFromAxisAngle(Y, ry), _s);
      parts.forEach(({ inst, local }) => { inst.setMatrixAt(i, out.multiplyMatrices(P, local)); inst.instanceMatrix.needsUpdate = true; });
    },
    setCount(n) { parts.forEach(({ inst }) => { inst.count = n; }); },
  };
}

// A single movable copy (a hired vehicle): shared geometry and materials, own transform.
export function cloneAsset(template, forward = 0) {
  const outer = new THREE.Group();
  const inner = new THREE.Group();
  inner.rotation.y = forward;
  template.meshes.forEach((m) => {
    const mesh = new THREE.Mesh(m.geometry, m.material);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(m.matrix);
    inner.add(mesh);
  });
  outer.add(inner);
  outer.userData.shared = true; // do not dispose shared geometry with this group
  return outer;
}
