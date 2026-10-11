import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DETAIL } from './quality.js';
import { PEOPLE } from './anim.js';

// Fewer draw calls (performance, after #38): the scenery that never moves (landmarks, storefronts, signs, shelters, the
// playground's frames) was built from many small meshes, each one a draw call. Meshes that share a material are merged
// into one, per 48 m square of ground so the camera still skips what it cannot see. A thing that streams in and out on
// its own (quality.js trackDetail) is merged within itself, so it still streams; people, anything that moves or is
// marked userData.noBatch, instanced meshes and lines are left as they are. Nothing changes on screen.

const CELL = 48;
// two materials that look the same are the same for merging: many builders make a new material per part in the same
// colour (a landmark's 113 parts had 113 materials and 39 looks). Custom shaders keep their own identity.
const MAT_KEYS = ['type', 'roughness', 'metalness', 'emissiveIntensity', 'transparent', 'opacity', 'side', 'vertexColors', 'alphaTest', 'depthWrite', 'depthTest', 'flatShading', 'toneMapped', 'fog', 'wireframe'];
const look = new Map();
function matKey(m) {
  if (m.isShaderMaterial || m.onBeforeCompile?.toString().length > 40 || m.userData?.noShare) return m.uuid;
  let k = MAT_KEYS.map((n) => m[n]).join('|');
  ['color', 'emissive', 'specular'].forEach((n) => { if (m[n]?.isColor) k += `|${m[n].getHexString()}`; });
  ['map', 'emissiveMap', 'alphaMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'envMap', 'lightMap', 'bumpMap'].forEach((n) => { k += `|${m[n]?.uuid || ''}`; });
  if (!look.has(k)) look.set(k, m); // the first material with this look stands for all of them
  return k;
}
const sig = (g) => `${g.index ? 'i' : 'n'}|${Object.keys(g.attributes).sort().map((k) => `${k}${g.attributes[k].itemSize}`).join(',')}|${Object.keys(g.morphAttributes || {}).length}`;

function candidates(root, skipSet) {
  const out = [];
  const walk = (o, ok) => {
    if (o !== root && (o.userData?.noBatch || PEOPLE.has(o) || o.userData?.rig || o.userData?.isPlayer || skipSet.has(o))) return;
    if (!o.visible) return; // hidden on purpose (a swap, a lamp off): leave its subtree alone
    if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && !Array.isArray(o.material) && o.geometry?.attributes?.position && !o.geometry.morphTargetsRelative && !Object.keys(o.geometry.morphAttributes || {}).length && ok) out.push(o);
    o.children.forEach((c) => walk(c, ok));
  };
  walk(root, true);
  return out;
}

/** Merge the static meshes under `root` that share a material (per ground cell, unless `cell` is Infinity). */
export function batchStatic(root, { cell = CELL, skip = new Set() } = {}) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), m = new THREE.Matrix4(), v = new THREE.Vector3();
  const groups = new Map();
  candidates(root, skip).forEach((o) => {
    o.getWorldPosition(v);
    const ck = cell === Infinity ? 'all' : `${Math.floor(v.x / cell)},${Math.floor(v.z / cell)}`;
    const key = `${ck}|${matKey(o.material)}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}|${o.renderOrder}|${o.frustumCulled ? 1 : 0}|${sig(o.geometry)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  let before = 0, after = 0;
  groups.forEach((list) => {
    before += list.length;
    if (list.length < 2) { after += list.length; return; }
    const geos = list.map((o) => { m.multiplyMatrices(inv, o.matrixWorld); const g = o.geometry.clone(); g.applyMatrix4(m); return g; });
    let merged = null; try { merged = mergeGeometries(geos, false); } catch { merged = null; }
    geos.forEach((g) => g.dispose());
    if (!merged) { after += list.length; return; }
    const first = list[0], mesh = new THREE.Mesh(merged, look.get(matKey(first.material)) || first.material);
    mesh.castShadow = first.castShadow; mesh.receiveShadow = first.receiveShadow; mesh.renderOrder = first.renderOrder; mesh.frustumCulled = first.frustumCulled; mesh.name = 'batched';
    mesh.userData.batched = list.length;
    root.add(mesh);
    list.forEach((o) => o.removeFromParent());
    after += 1;
  });
  return { before, after };
}

/** The look's static scenery groups, batched: each streaming object within itself, the rest per ground cell. */
export function batchScenery(scene, names) {
  let before = 0, after = 0;
  names.forEach((name) => {
    const g = scene.getObjectByName(name); if (!g) return;
    // things that stream in and out on their own: merge inside each one
    const streamed = new Set(); g.traverse((o) => { if (o !== g && DETAIL.has(o)) streamed.add(o); });
    streamed.forEach((o) => { const r = batchStatic(o, { cell: Infinity }); before += r.before; after += r.after; });
    const r = batchStatic(g, { skip: streamed }); before += r.before; after += r.after;
  });
  return { before, after };
}
