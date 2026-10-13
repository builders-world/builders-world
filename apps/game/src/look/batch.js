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
// plain pieces (a colour, no picture, lit, not see-through, not glowing) merge across colours too: the colour goes into
// the vertices and one shared material per finish draws them all (Elvis, 13 October 2026: performance)
const PLAIN = new Map();
const isPlain = (m) => (m.isMeshStandardMaterial || m.isMeshLambertMaterial) && !m.map && !m.normalMap && !m.alphaMap && !m.emissiveMap && !m.transparent && !(m.alphaTest > 0) && !m.vertexColors && !m.isShaderMaterial && !(m.onBeforeCompile?.toString().length > 40) && !m.userData?.noShare && !(m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) * (m.emissiveIntensity ?? 1) > 0.01);
const plainKey = (m) => `plain|${Math.round((m.roughness ?? 0.8) * 4) / 4}|${Math.round((m.metalness ?? 0) * 4) / 4}|${m.side}|${m.flatShading ? 1 : 0}|${m.fog === false ? 0 : 1}`;
function plainMat(k, m) { if (!PLAIN.has(k)) PLAIN.set(k, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: Math.round((m.roughness ?? 0.8) * 4) / 4, metalness: Math.round((m.metalness ?? 0) * 4) / 4, side: m.side, flatShading: !!m.flatShading, fog: m.fog !== false })); return PLAIN.get(k); }
function matKey(m) {
  if (isPlain(m)) return plainKey(m);
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
    const mk = matKey(o.material), plain = mk.startsWith('plain|');
    const key = `${ck}|${mk}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}|${o.renderOrder}|${o.frustumCulled ? 1 : 0}|${plain ? 'pn' : sig(o.geometry)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  let before = 0, after = 0;
  groups.forEach((list) => {
    before += list.length;
    if (list.length < 2) { after += list.length; return; }
    const plain = matKey(list[0].material).startsWith('plain|'), col = new THREE.Color();
    const geos = list.map((o) => {
      m.multiplyMatrices(inv, o.matrixWorld);
      if (!plain) { const g = o.geometry.clone(); g.applyMatrix4(m); return g; }
      // a plain piece: its shape and its colour, nothing else (pieces from different builders carry different extras)
      const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, g = new THREE.BufferGeometry();
      g.setAttribute('position', src.getAttribute('position').clone()); if (src.getAttribute('normal')) g.setAttribute('normal', src.getAttribute('normal').clone()); else g.computeVertexNormals();
      g.applyMatrix4(m); col.copy(o.material.color || col.set(0xffffff)); const n = g.getAttribute('position').count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) col.toArray(c, i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(c, 3)); if (src !== o.geometry) src.dispose(); return g;
    });
    let merged = null; try { merged = mergeGeometries(geos, false); } catch { merged = null; }
    geos.forEach((g) => g.dispose());
    if (!merged) { after += list.length; return; }
    const first = list[0], mesh = new THREE.Mesh(merged, plain ? plainMat(matKey(first.material), first.material) : look.get(matKey(first.material)) || first.material);
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

// ---------- kits: a model placed many times, part by part (Elvis, 13 October 2026: performance) ----------
// A kit (a Yaba midrise block, a market stall, a rooftop water tank) is drawn as one instanced mesh per part: a corner
// block is 37 parts, so 37 draw calls however few copies stand. The parts of a kit move together, so each part's
// placement is the kit's placement times the part's own offset; the plain parts (a colour, no picture, not
// see-through, not glowing) are merged into one shape, coloured per vertex, and drawn as one instanced mesh with the
// kit's placements. Parts with pictures or glass stay as they are. Checked copy by copy before anything is changed.
const KIT_EPS = 1e-3;
export function mergeKits(root) {
  let kits = 0, from = 0;
  const groups = []; root.traverse((o) => { if (!o.userData?.kitMerged && o.children.filter((c) => c.isInstancedMesh).length >= 2) groups.push(o); });
  const a = new THREE.Matrix4(), b = new THREE.Matrix4(), rel = new THREE.Matrix4(), chk = new THREE.Matrix4(), col = new THREE.Color();
  for (const g of groups) {
    const parts = g.children.filter((c) => c.isInstancedMesh && c.visible && !Array.isArray(c.material) && isPlain(c.material) && !c.instanceColor && !c.geometry.morphAttributes?.position);
    if (parts.length < 2) continue;
    const n = parts[0].count; if (!n || parts.some((p) => p.count !== n)) continue;
    // each part's shape carried into the first part's instance frame: T = (M0 I0,0)^-1 (Mp Ip,0); a kit only if the same
    // T holds for every copy (M0 I0,c T = Mp Ip,c), checked before anything changes
    const M0 = parts[0].matrix, Ts = []; let ok = true;
    for (const p of parts) {
      parts[0].getMatrixAt(0, b); p.getMatrixAt(0, a);
      const T = new THREE.Matrix4().multiplyMatrices(M0, b).invert().multiply(new THREE.Matrix4().multiplyMatrices(p.matrix, a));
      for (let i = 1; i < n && ok; i++) {
        parts[0].getMatrixAt(i, b); p.getMatrixAt(i, a);
        chk.multiplyMatrices(M0, b).multiply(T); rel.multiplyMatrices(p.matrix, a);
        for (let k = 0; k < 16; k++) if (Math.abs(chk.elements[k] - rel.elements[k]) > KIT_EPS * Math.max(1, Math.abs(rel.elements[k]))) { ok = false; break; }
      }
      if (!ok) break; Ts.push(T);
    }
    if (!ok) continue;
    const geos = parts.map((p, k) => {
      const src = p.geometry.index ? p.geometry.toNonIndexed() : p.geometry, ng = new THREE.BufferGeometry();
      ng.setAttribute('position', src.getAttribute('position').clone()); if (src.getAttribute('normal')) ng.setAttribute('normal', src.getAttribute('normal').clone()); else ng.computeVertexNormals();
      ng.applyMatrix4(Ts[k]);
      col.copy(p.material.color || col.set(0xffffff)); const m = ng.getAttribute('position').count, c = new Float32Array(m * 3); for (let i = 0; i < m; i++) col.toArray(c, i * 3);
      ng.setAttribute('color', new THREE.BufferAttribute(c, 3)); if (src !== p.geometry) src.dispose(); return ng;
    });
    // one finish for the merged kit: the most common among its parts
    const first = parts[0].material, k = plainKey(first), merged = mergeGeometries(geos, false); geos.forEach((q) => q.dispose()); if (!merged) continue;
    const im = new THREE.InstancedMesh(merged, plainMat(k, first), n);
    for (let i = 0; i < n; i++) { parts[0].getMatrixAt(i, a); im.setMatrixAt(i, a); }
    im.matrix.copy(parts[0].matrix); im.matrix.decompose(im.position, im.quaternion, im.scale); im.matrixAutoUpdate = false;
    im.castShadow = parts.some((p) => p.castShadow); im.receiveShadow = parts.some((p) => p.receiveShadow); im.name = 'kit-merged';
    im.computeBoundingSphere(); g.add(im); im.updateMatrixWorld(true);
    parts.forEach((p) => { p.removeFromParent(); p.dispose?.(); });
    g.userData.kitMerged = true; kits++; from += parts.length;
  }
  return { kits, from };
}
