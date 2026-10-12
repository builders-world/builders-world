import * as THREE from 'three';

// Streaming (Elvis, 11 October 2026: "the world renders all at the same time... let them only see things as
// they approach them, just like most video games"). The district is built once, but only what is near is drawn
// in full. Trees, shrubs and flowers are instanced by the thousand: each instanced mesh keeps its whole list and
// hands the GPU only the instances inside a ring round the stream centre, a few times a second. Past the ring a
// tree swaps to a light stand-in (a trunk and one crown, about a fifteenth of the triangles) so the skyline and
// the aerial view keep their green; shrubs, beds and pots simply stop. At each edge things dissolve in over a few
// metres with a screen-door dither rather than popping, so walking toward a park you see it grow out of the air.

// the layers and their edges in metres; setStreamTier fills them from the graphics tier
export const LAYERS = {
  tree: { edge: 95, band: 14 }, // full trees inside, light trees outside (the two swap through the band)
  plant: { edge: 65, band: 10 }, // shrubs, flowers, hedges and pots inside, nothing outside
  lite: { edge: 1e9, band: 40 }, // how far the light trees reach: the horizon, where the haze is total
};

export const SIZE = { K: 190, min: 40, horizon: 1e9 }; // see streamSmall below
const centre = new THREE.Vector2();
const U = {}; // shader uniforms per layer, shared by every material of that layer
for (const k of Object.keys(LAYERS)) U[k] = { value: new THREE.Vector3() };
// lite trees fade in where full trees fade out: same edge and band as `tree`, flipped; and out again at their own edge
const uLiteOut = { value: new THREE.Vector2() };
const uCentre = { value: centre };
function syncUniforms() {
  for (const k of Object.keys(LAYERS)) U[k].value.set(LAYERS[k].edge, LAYERS[k].band, 0);
  uLiteOut.value.set(LAYERS.lite.edge, LAYERS.lite.band);
}
syncUniforms();

let tierNow = {}, enabled = true;
export function setStreamTier(t) {
  tierNow = t;
  LAYERS.tree.edge = enabled ? t.treeNear ?? 95 : 1e9;
  LAYERS.plant.edge = enabled ? t.plantNear ?? 65 : 1e9;
  LAYERS.lite.edge = enabled ? horizon : 1e9;
  SIZE.K = enabled ? t.sizeK ?? 190 : 1e9;
  SIZE.horizon = enabled ? horizon : 1e9;
  syncUniforms();
  dirty = true;
}
// the horizon: past it the haze is total (index.js sets the fog to end there), so nothing out there is drawn.
// It follows the fog every frame (closer in mist and rain, further from the air); the instances re-pick when it
// moves by more than a few metres
let horizon = 1e9;
export function setHorizon(h) {
  if (Math.abs(h - horizon) < 6) return;
  horizon = h;
  if (enabled) { LAYERS.lite.edge = h; SIZE.horizon = h; syncUniforms(); dirty = true; }
}
/** ?stream=0, or from the console: draw everything everywhere, as before streaming (for comparisons) */
export function setStreaming(on) { enabled = !!on; setStreamTier(tierNow); }
export const streaming = () => enabled;

// ---------- the dissolve ----------
// v = how far inside the layer's edge this pixel is (0 at the edge, 1 a band inside). A full model keeps the
// pixel where v beats the dither, its light stand-in keeps exactly the others, so through the band one replaces
// the other pixel for pixel with nothing doubled and no gap.
export function streamMaterial(base, layer, { invert = false } = {}) {
  const m = base.clone();
  m.onBeforeCompile = (s) => {
    s.uniforms.uStreamC = uCentre; s.uniforms.uStream = U[layer]; s.uniforms.uLiteOut = uLiteOut;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vStreamW;')
      .replace('#include <project_vertex>', `#include <project_vertex>
  { vec4 sw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    sw = instanceMatrix * sw;
  #endif
    vStreamW = (modelMatrix * sw).xz; }`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vStreamW;\nuniform vec2 uStreamC;\nuniform vec3 uStream;\nuniform vec2 uLiteOut;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  { float sd = distance(vStreamW, uStreamC);
    float sv = clamp((uStream.x - sd) / uStream.y, 0.0, 1.0);
    float sh = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  #ifdef STREAM_INVERT
    if (sv > sh) discard;
    if (clamp((uLiteOut.x - sd) / uLiteOut.y, 0.0, 1.0) <= sh) discard;
  #else
    if (sv <= sh) discard;
  #endif
  }`);
  };
  if (invert) m.defines = { ...(m.defines || {}), STREAM_INVERT: '' };
  m.customProgramCacheKey = () => `stream-${invert ? 'out' : 'in'}`;
  return m;
}

// ---------- instanced meshes that only send what is near ----------
const STREAMED = new Set();
let dirty = true;
const _sphere = new THREE.Sphere();

/**
 * Stream an InstancedMesh: `layer` names the ring it belongs to; `outside` streams the instances beyond the
 * ring instead (the light trees). Matrices are kept, the mesh's count shrinks to what is in range.
 */
export function streamInstances(im, layer, { outside = false } = {}) {
  const n = im.count, src = im.instanceMatrix.array.slice(0, n * 16), xs = new Float32Array(n), zs = new Float32Array(n);
  for (let i = 0; i < n; i++) { xs[i] = src[i * 16 + 12]; zs[i] = src[i * 16 + 14]; }
  if (!im.geometry.boundingSphere) im.geometry.computeBoundingSphere();
  // instance scale tops out a little over 1; leave room for it in the bounds
  const s = { im, layer, outside, src, xs, zs, total: n, key: -1, reach: im.geometry.boundingSphere.radius * 1.4 + Math.abs(im.geometry.boundingSphere.center.y) };
  STREAMED.add(s);
  dirty = true;
  return im;
}

function select(s, cx, cz) {
  const L = LAYERS[s.layer], { xs, zs, src, total, im } = s, arr = im.instanceMatrix.array;
  // a few metres of margin so the instances crossing the edge are already there when the dither reaches them
  const pad = 8;
  const lo = s.outside ? Math.max(0, L.edge - L.band - pad) : 0, hi = s.outside ? LAYERS.lite.edge + pad : L.edge + pad;
  const lo2 = lo * lo, hi2 = hi * hi;
  let k = 0, sum = 0, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < total; i++) {
    const dx = xs[i] - cx, dz = zs[i] - cz, d2 = dx * dx + dz * dz;
    if (d2 < lo2 || d2 >= hi2) continue;
    sum = (sum + i * 2654435761) >>> 0; k++;
  }
  const key = (sum ^ (k * 40503)) >>> 0;
  if (key === s.key && k === im.count) return;
  s.key = key;
  let n = 0;
  for (let i = 0; i < total; i++) {
    const dx = xs[i] - cx, dz = zs[i] - cz, d2 = dx * dx + dz * dz;
    if (d2 < lo2 || d2 >= hi2) continue;
    arr.set(src.subarray(i * 16, i * 16 + 16), n * 16); n++;
    if (xs[i] < x0) x0 = xs[i]; if (xs[i] > x1) x1 = xs[i]; if (zs[i] < z0) z0 = zs[i]; if (zs[i] > z1) z1 = zs[i];
  }
  im.count = n;
  im.instanceMatrix.clearUpdateRanges(); im.instanceMatrix.addUpdateRange(0, Math.max(1, n) * 16); im.instanceMatrix.needsUpdate = true;
  im.visible = n > 0;
  // bounds round what is drawn, so the camera's frustum test can drop a whole species behind you
  if (n) { _sphere.center.set((x0 + x1) / 2, s.reach * 0.5, (z0 + z1) / 2); _sphere.radius = Math.hypot(x1 - x0, z1 - z0) / 2 + s.reach; (im.boundingSphere ||= new THREE.Sphere()).copy(_sphere); }
}

// where the world streams from: your eye on the street; from the air, the ground the camera looks at
const _dir = new THREE.Vector3();
let lastX = Infinity, lastZ = Infinity;
export function streamCentre(camera) {
  const p = camera.position;
  if (p.y > 30) {
    camera.getWorldDirection(_dir);
    const t = _dir.y < -0.05 ? Math.min(600, -p.y / _dir.y) : 0;
    centre.set(p.x + _dir.x * t, p.z + _dir.z * t);
  } else centre.set(p.x, p.z);
  return centre;
}

/** every frame: move the dissolve with the camera; a few times a second (or after a jump) re-pick the instances */
export function updateStream(camera, force = false) {
  streamCentre(camera);
  const moved = Math.hypot(centre.x - lastX, centre.y - lastZ);
  if (!force && !dirty && moved < 3) return false;
  lastX = centre.x; lastZ = centre.y; dirty = false;
  for (const s of STREAMED) {
    if (!s.im.parent) { STREAMED.delete(s); continue; }
    select(s, centre.x, centre.y);
  }
  return true;
}

/** for tests and the profiler: how much is streamed in right now */
export function streamStats() {
  let drawn = 0, total = 0, meshes = 0;
  for (const s of STREAMED) { drawn += s.im.count; total += s.total; meshes++; }
  return { drawn, total, meshes, centre: [Math.round(centre.x), Math.round(centre.y)], layers: Object.fromEntries(Object.entries(LAYERS).map(([k, v]) => [k, v.edge])) };
}

// ---------- small things, by how big they look ----------
// Benches, bins, signs, stalls, bike docks and the like are each a handful of draw calls. Each is kept while it
// would cover more than a few pixels: past `size x K` metres from the eye (K from the graphics tier) it leaves the
// render. This works through the render layer, not `visible`, so it never fights the systems that show and hide
// things for their own reasons (litter picked up, a stall closing at night). People and anything already on a
// distance cull (anim.js, quality.js) are left to theirs.
const SMALL = [];
const seen = new WeakSet();
const _box = new THREE.Box3(), _v = new THREE.Vector3(), _inv = new THREE.Matrix4();

/** register what is under `root`: each piece small enough to be one thing (under maxR metres round) */
export function streamSmall(root, { maxR = 22, isPerson = () => false } = {}) {
  root.updateWorldMatrix(true, true);
  // a person (or a car on its own cull) inside a piece could walk off with it: such pieces split into their parts
  const busy = (o) => { let b = false; o.traverse((c) => { if (c !== o && (isPerson(c) || c.userData.lodScale)) b = true; }); return b; };
  const visit = (o) => {
    if (seen.has(o) || isPerson(o) || o.userData.lodScale || o.userData.noStream) return;
    _box.setFromObject(o);
    if (_box.isEmpty()) return;
    const r = _box.getSize(_v).length() / 2;
    if (r > maxR || busy(o)) { if (o.isMesh) return; o.children.forEach(visit); return; }
    seen.add(o);
    const meshes = []; o.traverse((m) => { if (m.isMesh || m.isLine || m.isPoints || m.isSprite) meshes.push(m); });
    if (!meshes.length) return;
    const local = _box.getCenter(new THREE.Vector3()).applyMatrix4(_inv.copy(o.matrixWorld).invert());
    SMALL.push({ o, meshes, local, r, out: false });
  };
  root.children.forEach(visit);
}

const _c = new THREE.Vector3();
/** a few times a second: drop the pieces too small to see from where the camera is, bring back the rest */
export function cullSmall(camera) {
  const p = camera.position, K = SIZE.K;
  for (let i = SMALL.length - 1; i >= 0; i--) {
    const s = SMALL[i];
    if (!s.o.parent) { SMALL[i] = SMALL[SMALL.length - 1]; SMALL.pop(); continue; }
    _c.copy(s.local).applyMatrix4(s.o.matrixWorld);
    const lim = Math.min(SIZE.horizon + s.r, Math.max(SIZE.min, s.r * K)) * (s.out ? 0.95 : 1); // a little give, so nothing flickers on the line
    const out = _c.distanceToSquared(p) > lim * lim;
    if (out === s.out) continue;
    s.out = out;
    for (const m of s.meshes) { if (out) m.layers.disableAll(); else m.layers.set(0); }
  }
}
export const smallStats = () => ({ pieces: SMALL.length, out: SMALL.filter((s) => s.out).length });
