import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { shared } from '../shaders.js';
import { mulberry32 } from '../mesh.js';
import { createAvatarModel } from '../onboarding/avatar.js';
import { rigAvatar } from './anim.js';
import { wallMaterial } from './surfaces.js';
import { frondTexture, leafTexture, boardTexture, muralTexture, buildSignTexture, hubSignTexture } from './textures.js';
import { instanceAsset, collidersFor, footprint } from './kit.js';

const V3 = THREE.Vector3;
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (rt, rb, h, seg, x = 0, y = 0, z = 0) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
function colorize(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
const glowMat = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });

// ---------- clay tree: the arrival scene's planter tree, at street size (world bible 7.1) ----------
// A stone planter, a wood trunk and fat ellipsoid leaves in two greens, as one vertex-coloured mesh.
function clayTreeGeometry() {
  const parts = [colorize(cyl(0.34, 0.3, 0.6, 10, 0, 0.3, 0), "#c3bdae"), colorize(cyl(0.38, 0.38, 0.06, 10, 0, 0.6, 0), "#d6d0c0"),
    colorize(cyl(0.045, 0.065, 1.6, 7, 0, 1.4, 0), '#a87950')];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, leaf = new THREE.SphereGeometry(1, 7, 5);
    leaf.scale(0.14, 0.56, 0.24);
    leaf.rotateX(Math.sin(a) * 0.75); leaf.rotateZ(Math.cos(a) * 0.85);
    leaf.translate(Math.cos(a) * 0.3, 1.75 + i * 0.07, Math.sin(a) * 0.3);
    parts.push(colorize(leaf, i % 2 ? '#45694c' : '#7d9263'));
  }
  return mergeGeometries(parts);
}

// One material set for every prop, so a street of props stays a handful of programs.
export function propMaterials(city) {
  return {
    concrete: wallMaterial(),
    yellow: new THREE.MeshStandardMaterial({ color: 0xe9b21c, roughness: 0.42, metalness: 0.05 }),
    black: new THREE.MeshStandardMaterial({ color: 0x263832, roughness: 0.7 }), // the clay look's darkest tone is deep green, never black
    glass: new THREE.MeshStandardMaterial({ color: 0x7fa6a4, roughness: 0.18, metalness: 0.05 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x6f7787, roughness: 0.35, metalness: 0.7 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x55605a, roughness: 0.55, metalness: 0.4 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xa87950, roughness: 0.75 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x263832, roughness: 0.9 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0xa87950, roughness: 0.85 }),
    frond: new THREE.MeshStandardMaterial({ map: frondTexture(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6 }),
    leaf: new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.55 }),
    board: new THREE.MeshStandardMaterial({ map: boardTexture(), roughness: 0.8 }),
    mural: new THREE.MeshStandardMaterial({ map: muralTexture(city), roughness: 0.7 }),
    buildSign: new THREE.MeshStandardMaterial({ map: buildSignTexture(), emissive: 0xffffff, emissiveMap: buildSignTexture(), emissiveIntensity: 0.35, roughness: 0.6 }),
    hubSign: new THREE.MeshStandardMaterial({ map: hubSignTexture(), emissive: 0xffffff, emissiveMap: hubSignTexture(), emissiveIntensity: 0.9, roughness: 0.6 }),
    warm: glowMat(2.0, 1.15, 0.45),
    interior: glowMat(1.35, 0.8, 0.38),
    head: glowMat(2.4, 2.25, 1.9),
    tail: glowMat(2.2, 0.12, 0.08),
    teal: glowMat(0.25, 1.5, 1.35),
    ghost: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.75, 1.6), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }),
  };
}

// Leaves and fronds move in the wind. The street is allowed to be alive.
function addSway(material, amount) {
  material.onBeforeCompile = (s) => {
    s.uniforms.uTime = shared.uTime;
    s.uniforms.uReduced = shared.uReduced;
    s.uniforms.uWind = shared.uWind;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uReduced; uniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec3 ip = instanceMatrix[3].xyz;
          #else
            vec3 ip = vec3(0.0);
          #endif
          float k = max(0.0, position.y - 1.0) * ${amount.toFixed(4)} * uWind * (1.0 - uReduced);
          float ph = ip.x * 0.37 + ip.z * 0.21;
          transformed.x += sin(uTime * 1.3 + ph) * k + sin(uTime * 3.1 + position.x * 2.0 + ph) * k * 0.25;
          transformed.z += cos(uTime * 1.1 + ph) * k * 0.6;
        }`);
  };
  material.customProgramCacheKey = () => `sway-${amount}`;
}

// ---------- palm: curved trunk and drooping fronds ----------
function palmGeometry() {
  const curve = new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(0.3, 3, 0), new V3(0.9, 6, 0), new V3(1.6, 8.6, 0)]);
  const trunk = new THREE.TubeGeometry(curve, 16, 0.2, 7, false);
  // taper the tube toward the crown
  const p = trunk.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const c = curve.getPointAt(THREE.MathUtils.clamp(y / 8.6, 0, 1));
    const k = 1.15 - 0.4 * (y / 8.6);
    p.setX(i, c.x + (p.getX(i) - c.x) * k);
    p.setZ(i, c.z + (p.getZ(i) - c.z) * k);
  }
  const top = curve.getPointAt(1);
  const fronds = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.PlaneGeometry(4.2, 1.1, 10, 1).translate(2.1, 0, 0);
    const q = g.attributes.position;
    for (let k = 0; k < q.count; k++) {
      const x = q.getX(k);
      q.setY(k, q.getY(k) * 0.5 - 0.08 * x * x);
      q.setZ(k, q.getY(k) * 0.4);
    }
    g.rotateX(Math.PI / 2 - 0.2 * (i % 2));
    g.rotateY((i / 9) * Math.PI * 2 + (i % 3) * 0.2);
    g.translate(top.x, top.y, top.z);
    fronds.push(g);
  }
  return { trunk, fronds: mergeGeometries(fronds) };
}

function bananaGeometry() {
  const leaves = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.PlaneGeometry(0.9, 2.2, 1, 6).translate(0, 1.1, 0);
    const q = g.attributes.position;
    for (let k = 0; k < q.count; k++) {
      const y = q.getY(k);
      q.setZ(k, 0.18 * y * y);
    }
    g.rotateX(-0.35 - (i % 2) * 0.25);
    g.rotateY((i / 6) * Math.PI * 2);
    g.translate(0, 0.35, 0);
    leaves.push(g);
  }
  const stem = cyl(0.08, 0.12, 1.0, 6, 0, 0.5, 0);
  return { leaves: mergeGeometries(leaves), stem };
}

function instanced(geo, mat, spots, scale = () => 1) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, spots.length));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  spots.forEach((s, i) => {
    q.setFromAxisAngle(new V3(0, 1, 0), s.ry ?? 0);
    const k = scale(s, i);
    m.compose(new V3(s.x, s.y ?? 0, s.z), q, new V3(k, k, k));
    mesh.setMatrixAt(i, m);
  });
  mesh.count = spots.length;
  mesh.frustumCulled = false;
  return mesh;
}

// ---------- the danfo ----------
export function danfo(M) {
  const g = new THREE.Group();
  const add = (geo, mat) => { const o = new THREE.Mesh(geo, mat); g.add(o); return o; };
  add(mergeGeometries([box(2.1, 1.25, 5.2, 0, 0.95, 0), box(2.0, 0.9, 4.3, 0, 2.0, -0.25), box(1.9, 0.25, 1.1, 0, 1.55, 2.3)]), M.yellow);
  add(mergeGeometries([box(2.14, 0.12, 5.24, 0, 1.25, 0), box(2.14, 0.12, 5.24, 0, 0.95, 0), box(2.02, 0.06, 4.32, 0, 2.47, -0.25)]), M.black);
  add(mergeGeometries([box(2.04, 0.62, 3.9, 0, 2.02, -0.35), box(1.84, 0.7, 0.06, 0, 2.0, 1.95)]), M.glass);
  add(mergeGeometries([box(2.06, 0.5, 3.6, 0, 2.0, -0.45)]), M.interior).scale.set(0.98, 0.9, 0.98);
  const wheels = [];
  [-1.6, 1.7].forEach((z) => [-1, 1].forEach((s) => wheels.push(cyl(0.42, 0.42, 0.32, 12, 0, 0, 0).rotateZ(Math.PI / 2).translate(s * 0.98, 0.42, z))));
  add(mergeGeometries(wheels), M.tyre);
  add(mergeGeometries([box(0.42, 0.22, 0.05, -0.7, 1.15, 2.62), box(0.42, 0.22, 0.05, 0.7, 1.15, 2.62)]), M.head);
  add(mergeGeometries([box(0.3, 0.3, 0.05, -0.85, 1.2, -2.62), box(0.3, 0.3, 0.05, 0.85, 1.2, -2.62)]), M.tail);
  add(box(2.2, 0.08, 0.3, 0, 0.42, 2.6), M.metal);
  return g;
}

// ---------- the community board, at the spawn point ----------
function communityBoard(M) {
  const g = new THREE.Group();
  const posts = mergeGeometries([box(0.18, 3.3, 0.18, -2.05, 1.65, 0), box(0.18, 3.3, 0.18, 2.05, 1.65, 0), box(4.3, 0.16, 0.22, 0, 0.95, 0), box(4.3, 0.16, 0.22, 0, 3.15, 0)]);
  g.add(new THREE.Mesh(posts, M.wood));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 2.05).translate(0, 2.05, 0.12), M.board);
  g.add(face);
  const roof = new THREE.Mesh(mergeGeometries([box(4.9, 0.08, 1.3, 0, 3.55, 0.3).rotateX(-0.12), box(4.9, 0.12, 0.1, 0, 3.42, 0.95)]), M.darkMetal);
  g.add(roof);
  g.add(new THREE.Mesh(box(4.0, 0.05, 0.08, 0, 3.32, 0.55), M.warm));
  return g;
}

function bench(M) {
  return mergeGeometries([box(1.8, 0.08, 0.45, 0, 0.48, 0), box(1.8, 0.4, 0.06, 0, 0.82, -0.2), box(0.08, 0.48, 0.4, -0.8, 0.24, 0), box(0.08, 0.48, 0.4, 0.8, 0.24, 0)]);
}

// A community build area: a painted outline, a signpost, and a ghost of what could go there.
function buildArea(M, w, d) {
  const g = new THREE.Group();
  const dashes = [];
  const dash = (x, z, rot) => dashes.push(box(0.9, 0.03, 0.12, x, 0.17, z).rotateY(0).applyMatrix4(new THREE.Matrix4().makeRotationY(rot)));
  for (let x = -w / 2 + 0.5; x < w / 2; x += 1.4) { dash(x, -d / 2, 0); dash(x, d / 2, 0); }
  for (let z = -d / 2 + 0.5; z < d / 2; z += 1.4) { dashes.push(box(0.12, 0.03, 0.9, -w / 2, 0.17, z)); dashes.push(box(0.12, 0.03, 0.9, w / 2, 0.17, z)); }
  g.add(new THREE.Mesh(mergeGeometries(dashes), M.teal));
  const post = new THREE.Mesh(box(0.12, 2.2, 0.12, -w / 2 - 0.4, 1.1, -d / 2), M.darkMetal);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8).translate(-w / 2 - 0.4, 2.0, -d / 2 + 0.07), M.buildSign);
  g.add(post, sign);
  const ghost = new THREE.Mesh(bench(M), M.ghost);
  g.add(ghost);
  g.userData.ghost = ghost;
  return g;
}

function hub(M) {
  const g = new THREE.Group();
  const shell = colorize(mergeGeometries([box(7, 0.25, 4.4, 0, 3.1, 0), box(7.4, 0.2, 5.0, 0, 6.2, 0), box(0.25, 6.2, 4.4, -3.5, 3.1, 0), box(0.25, 6.2, 4.4, 3.5, 3.1, 0), box(7, 6.2, 0.25, 0, 3.1, -2.2)]), '#6a707c');
  g.add(new THREE.Mesh(shell, M.concrete));
  g.add(new THREE.Mesh(mergeGeometries([box(6.7, 2.7, 0.06, 0, 1.5, 2.1), box(6.7, 2.7, 0.06, 0, 4.6, 2.1)]), M.glass));
  g.add(new THREE.Mesh(mergeGeometries([box(6.6, 2.5, 0.05, 0, 1.5, 1.6), box(6.6, 2.5, 0.05, 0, 4.6, 1.6)]), M.interior));
  const mull = [];
  for (let x = -3.3; x <= 3.31; x += 1.1) mull.push(box(0.08, 6.0, 0.12, x, 3.1, 2.14));
  mull.push(box(7, 0.14, 0.14, 0, 3.15, 2.17)); // 4 cm proud of the uprights, or every crossing shimmers
  g.add(new THREE.Mesh(mergeGeometries(mull), M.black));
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.8).translate(-4.25, 4.3, 1.4).rotateY(0), M.hubSign));
  g.add(new THREE.Mesh(box(0.2, 3.0, 1.6, -4.25, 4.3, 0.55), M.black));
  return g;
}

// A painted sign on a canvas: bold text on a coloured board, for shop fronts and street furniture.
export function signTexture(text, { bg = '#2a9d94', fg = '#f7efdc', w = 512, h = 128, sub = '' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${Math.round(h * (sub ? 0.42 : 0.56))}px "Baloo 2", "Arial Black", sans-serif`;
  g.fillText(text, w / 2, h * (sub ? 0.4 : 0.54));
  if (sub) { g.globalAlpha = 0.85; g.font = `700 ${Math.round(h * 0.2)}px "Baloo 2", sans-serif`; g.fillText(sub, w / 2, h * 0.78); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// An ATM gallery: two machines under a canopy, the bank's sign above.
function atmGallery(M) {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x2a9d94, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x263832, roughness: 0.6 });
  const screen = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.95, 0.85) });
  g.add(new THREE.Mesh(box(3.6, 0.12, 1.8, 0, 0.06, 0), M.concrete));
  [-0.8, 0.8].forEach((x) => {
    g.add(new THREE.Mesh(box(0.9, 1.75, 0.7, x, 0.12 + 0.875, -0.35), shell));
    g.add(new THREE.Mesh(box(0.6, 0.42, 0.04, x, 1.42, 0.02), screen));
    g.add(new THREE.Mesh(box(0.5, 0.06, 0.25, x, 1.08, 0.1), dark));
  });
  g.add(new THREE.Mesh(box(3.8, 0.14, 2.0, 0, 2.75, -0.1), dark));
  [-1.75, 1.75].forEach((x) => g.add(new THREE.Mesh(box(0.12, 2.7, 0.12, x, 1.35, -0.95), dark)));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.6), new THREE.MeshStandardMaterial({ map: signTexture('ATM', { sub: 'Yaba Builders Bank · Efforts' }), emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.6 }));
  sign.position.set(0, 3.22, 0.9); sign.material.emissiveMap = sign.material.map;
  g.add(sign);
  return g;
}

// Strings of bulbs that sag between two points.
function stringLights(a, b, sag, n) {
  const bulbs = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    bulbs.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t), z: a.z + (b.z - a.z) * t });
  }
  return bulbs;
}

// ---------- assemble the street around the spawn point ----------
export function buildProps(world, scene, { lowQuality = false, reduced = false } = {}) {
  const kit = world.kit;
  const kitPlaced = {}; // asset id -> spots, for the handoff report
  const M = propMaterials(world.place?.city);
  addSway(M.frond, 0.03);
  addSway(M.leaf, 0.05);
  const root = new THREE.Group();
  scene.add(root);
  const rng = mulberry32(2026);
  const lamps = []; // extra lamps for the light pool
  const interact = []; // things the HUD can prompt for
  const builders = []; // named people with tags
  let billboardFace = null;
  const walkers = [];
  const movers = [];

  const S = world.spawn;
  const T = new V3(Math.sin(world.spawnYaw), 0, Math.cos(world.spawnYaw));
  const toYou = new V3(world.youCenter[0] - S.x, 0, world.youCenter[1] - S.z);
  const N = toYou.sub(T.clone().multiplyScalar(toYou.dot(T))).normalize();
  if (!isFinite(N.x)) N.set(T.z, 0, -T.x);
  const at = (along, out) => new V3(S.x + T.x * along + N.x * out, 0, S.z + T.z * along + N.z * out);
  const faceRoad = Math.atan2(-N.x, -N.z);
  const alongRoad = Math.atan2(T.x, T.z);

  const place = (obj, along, out, ry) => { const p = at(along, out); obj.position.set(p.x, 0, p.z); obj.rotation.y = ry; root.add(obj); return p; };
  const freeAt = (a, o, pad = 0.3, opt) => { const p = at(a, o); return world.isFree(p.x, p.z, pad, opt); };
  const taken = [];
  const overlaps = (a0, a1) => taken.some(([b0, b1]) => a0 < b1 && a1 > b0);

  // Find open ground on the building side: a w x d rectangle, front edge toward the road.
  // Dense blocks only open up in gaps between buildings, so search along the street.
  function findArea(pref, w, d, { from = 0.6, to = 12, lo = -14, hi = 46, lots = false, pad = 0.3 } = {}) {
    const cands = [];
    for (let a = lo; a <= hi; a += 0.5) cands.push(a);
    cands.sort((x, y) => Math.abs(x - pref) - Math.abs(y - pref));
    for (const a of cands) {
      if (overlaps(a - w / 2 - 0.5, a + w / 2 + 0.5)) continue;
      for (let o = from; o <= to - d; o += 0.5) {
        let ok = true;
        for (let u = -w / 2; u <= w / 2 + 1e-3 && ok; u += 0.5) for (let v = 0; v <= d + 1e-3 && ok; v += 0.5) if (!freeAt(a + u, o + v, pad, { lots })) ok = false;
        if (ok) { taken.push([a - w / 2, a + w / 2]); return { a, o, c: o + d / 2 }; }
      }
    }
    return null;
  }

  // Where the building face is, measured from the spawn line.
  function facadeOut(a) {
    for (let o = 0; o < 6; o += 0.1) if (!freeAt(a, o, 0.02)) return o;
    return null;
  }
  const nearPlot = (a, o) => { const p = at(a, o); return world.plots.some((pl) => pl.dist(p.x, p.z) < 1.5); };

  // community board, in the first gap that fits it
  const bSpot = findArea(8, 4.9, 1.8) ?? { a: 8, o: 1, c: 1.9 };
  let boardPos;
  const boardT = kit?.get('yaba_community_board');
  if (boardT) {
    // the kit's board; its notes face local -z, so a half turn faces the street
    const p = at(bSpot.a, bSpot.c), spot = { x: p.x, z: p.z, ry: faceRoad + Math.PI };
    root.add(instanceAsset(boardT, [spot]));
    world.addColliders(collidersFor(boardT, [spot]));
    kitPlaced.yaba_community_board = [spot];
    boardPos = p;
  } else {
    boardPos = place(communityBoard(M), bSpot.a, bSpot.c, faceRoad);
  }
  lamps.push({ x: boardPos.x - N.x * 2.2, y: 4.2, z: boardPos.z - N.z * 2.2, power: 8, boost: 40, color: 0xffb35c });
  interact.push({ id: 'board', label: 'Open community board', x: boardPos.x - N.x * 1.8, z: boardPos.z - N.z * 1.8, r: 4.2 });

  // two builders reading it
  [['Kemi', '#3a8f6d', 'jacket', -1.0], ['Tunde', '#2d3f66', 'hoodie', 1.1]].forEach(([name, color, style, o]) => {
    const av = createAvatarModel({ color, style });
    const p = at(bSpot.a + o, bSpot.c - 1.7);
    av.root.position.set(p.x, 0, p.z);
    av.root.rotation.y = Math.atan2(N.x, N.z);
    root.add(av.root);
    builders.push({ name, obj: av.root, live: true, dispose: av.dispose, rig: rigAvatar(av.root), tier: name === 'Kemi' ? 1 : 2 });
    interact.push({ id: `npc:${name}`, label: `Say hi to ${name}`, x: p.x, z: p.z, r: 2.2 });
  });

  // a community build area in the next open gap, with a bin already added and a bench waiting
  const aSpot = findArea(bSpot.a + 18, 5.2, 3.6, { lo: bSpot.a + 4 });
  let area = null;
  if (aSpot) {
    area = buildArea(M, 5, 3.4);
    const ap = place(area, aSpot.a, aSpot.c, faceRoad);
    interact.push({ id: 'build', label: 'Build here: add a bench', x: ap.x - N.x * 1.6, z: ap.z - N.z * 1.6, r: 4 });
    const bin = new THREE.Mesh(colorize(cyl(0.32, 0.28, 0.9, 10, 0, 0.45, 0), '#2f6b4f'), M.concrete);
    const bp = at(aSpot.a + 2.2, aSpot.c + 1.2); bin.position.set(bp.x, 0, bp.z); root.add(bin);
    world.addColliders([{ name: 'bin', cx: bp.x, cz: bp.z, hx: 0.32, hz: 0.32, ry: 0, h: 0.9 }]);
  }

  // the mural, now a framed roadside billboard (Elvis, 9 October 2026): two steel legs on open ground
  // beside the street, never on the pavement or the road; the board sits above head height, lit at night
  let mural = null;
  // open ground first; failing that, private land behind a fence, clear of houses, as real boards stand
  // public ground only, never a garden (estate-layout skill); the whole board clears buildings by 1 m. No spot, no billboard.
  const bbSpot = findArea(bSpot.a + 9, 8.6, 1.4, { from: 0.8, to: 14, pad: 1.0 });
  if (bbSpot) {
    mural = { a: bbSpot.a, o: bbSpot.c, len: 8 };
    const bb = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0x55605a, roughness: 0.55, metalness: 0.35 });
    const frame = new THREE.MeshStandardMaterial({ color: 0x263832, roughness: 0.6 });
    [-2.7, 2.7].forEach((x) => {
      bb.add(new THREE.Mesh(cyl(0.16, 0.2, 3.6, 12, x, 1.8, 0), steel));
      bb.add(new THREE.Mesh(colorize(cyl(0.42, 0.48, 0.3, 12, x, 0.15, 0), '#c3bdae'), M.concrete)); // footing
    });
    bb.add(new THREE.Mesh(box(8.5, 3.7, 0.28, 0, 5.35, 0.02), frame));
    bb.add(new THREE.Mesh(box(8.7, 0.1, 0.9, 0, 3.42, -0.42), steel)); // walkway
    bb.add(new THREE.Mesh(mergeGeometries([box(8.7, 0.04, 0.04, 0, 4.0, -0.85), ...[-4.3, -1.45, 1.45, 4.3].map((x) => box(0.04, 0.58, 0.04, x, 3.71, -0.85))]), steel));
    // the face: the mural artwork, glowing softly after dusk like a digital board
    const faceMat = M.mural.clone();
    faceMat.emissive = new THREE.Color(0xffffff); faceMat.emissiveMap = faceMat.map; faceMat.emissiveIntensity = 0.05;
    bb.add(new THREE.Mesh(new THREE.PlaneGeometry(8.0, 3.2).translate(0, 5.35, 0.17), faceMat));
    // three lamps on arms, pointing at the board
    [-2.7, 0, 2.7].forEach((x) => {
      bb.add(new THREE.Mesh(box(0.06, 0.06, 0.8, x, 7.3, 0.4), steel));
      bb.add(new THREE.Mesh(box(0.34, 0.14, 0.2, x, 7.22, 0.85), M.warm));
    });
    const bp = place(bb, bbSpot.a, bbSpot.c, faceRoad);
    world.claim?.({ kind: 'billboard', cx: bp.x, cz: bp.z, hx: 4.35, hz: 0.6, ry: faceRoad });
    billboardFace = faceMat;
    lamps.push({ x: bp.x - N.x * 1.2, y: 6.8, z: bp.z - N.z * 1.2, power: 18, boost: 30, color: 0xffd9a0 });
    // only the legs stand on the ground, so only they collide
    const r = faceRoad, cx = Math.cos(r), sx = Math.sin(r);
    world.addColliders([-2.7, 2.7].map((x) => ({ name: 'billboard_leg', cx: bp.x + x * cx, cz: bp.z - x * sx, hx: 0.5, hz: 0.5, ry: 0 })));
  }

  // the creative hub, only if a wide enough lot is free
  let hubAt = null;
  const hSpot = findArea(bSpot.a - 12, 7.6, 4.8);
  if (hSpot) {
    const hp = place(hub(M), hSpot.a, hSpot.c, faceRoad);
    world.addColliders([{ name: 'hub', cx: hp.x, cz: hp.z, hx: 3.7, hz: 2.3, ry: faceRoad }]);
    hubAt = { x: hp.x - N.x * 3.2, z: hp.z - N.z * 3.2 };
    lamps.push({ x: hp.x - N.x * 2.6, y: 2.9, z: hp.z - N.z * 2.6, power: 40, boost: 25, color: 0xffb060 });
  }

  // an ATM gallery on public ground near the board: your Efforts, on a machine
  const atmSpot = findArea(bSpot.a + 14, 3.8, 2.2, { from: 0.6, to: 12, pad: 0.6 });
  if (atmSpot) {
    const ap2 = place(atmGallery(M), atmSpot.a, atmSpot.c, faceRoad); // screens face the street
    world.addColliders([{ name: 'atm', cx: ap2.x + N.x * 0.35, cz: ap2.z + N.z * 0.35, hx: 1.8, hz: 0.5, ry: faceRoad }]);
    world.claim?.({ kind: 'atm', cx: ap2.x, cz: ap2.z, hx: 1.9, hz: 1.0, ry: faceRoad });
    interact.push({ id: 'atm', label: 'Use the ATM', x: ap2.x - N.x * 1.4, z: ap2.z - N.z * 1.4, r: 2.6 });
    lamps.push({ x: ap2.x - N.x * 0.6, y: 2.6, z: ap2.z - N.z * 0.6, power: 10, boost: 10, color: 0xbff5e6 });
  }

  // string lights over the pavement, from the board to the mural
  const endA = mural ? mural.a + mural.len / 2 - 1 : bSpot.a + 12;
  const sA = at(bSpot.a - 2.2, Math.max(0.4, bSpot.c - 0.6)), sB = at(endA, Math.max(0.4, (mural?.o ?? 1) - 0.3));
  const strand = stringLights({ x: sA.x, y: 4.3, z: sA.z }, { x: sB.x, y: 4.6, z: sB.z }, 0.6, 30);
  const bulbGeo = new THREE.SphereGeometry(0.07, 6, 4);
  root.add(instanced(bulbGeo, M.warm, strand));
  const wire = new THREE.BufferGeometry().setFromPoints(strand.map((b) => new V3(b.x, b.y + 0.06, b.z)));
  root.add(new THREE.Line(wire, new THREE.LineBasicMaterial({ color: 0x111111 })));
  lamps.push({ ...strand[15], power: 18, boost: 10, color: 0xffc070 });

  // a bench near the board, if there is room for one
  const benchSpot = findArea(bSpot.a - 5, 2, 0.8);
  if (benchSpot) place(new THREE.Mesh(bench(M), M.wood), benchSpot.a, benchSpot.c, faceRoad);

  // market stalls along the pavement: Yaba street life, warm light, things to buy
  const stallT = kit?.get('yaba_market_stall');
  if (stallT) {
    const fp = footprint(stallT), spots = [];
    for (const pref of [bSpot.a - 7, bSpot.a + 12, bSpot.a + 26]) {
      const s = findArea(pref, fp.w + 0.4, fp.d + 0.2, { from: 0.4, to: 8 });
      if (!s) continue;
      const p = at(s.a, s.c);
      spots.push({ x: p.x, z: p.z, ry: faceRoad });
      lamps.push({ x: p.x - N.x * 0.4, y: 2.6, z: p.z - N.z * 0.4, power: 22, boost: 12, color: 0xffb35c });
      if (spots.length >= (lowQuality ? 2 : 3)) break;
    }
    if (spots.length) {
      root.add(instanceAsset(stallT, spots));
      world.addColliders(collidersFor(stallT, spots));
      kitPlaced.yaba_market_stall = spots;
    }
  }

  // a starter house where a lot is free: what a new resident's first home looks like
  const houseT = kit?.get('yaba_starter_house');
  if (houseT) {
    const fp = footprint(houseT);
    const s = findArea(bSpot.a + 20, fp.w + 0.6, fp.d + 0.6, { from: 1, to: 16, lo: -30, hi: 60 });
    if (s) {
      const p = at(s.a, s.c), spot = { x: p.x, z: p.z, ry: faceRoad };
      root.add(instanceAsset(houseT, [spot]));
      world.addColliders(collidersFor(houseT, [spot]));
      kitPlaced.yaba_starter_house = [spot];
    }
  }

  // palms where world.js planted trees, plus plants by the board
  const palm = palmGeometry();
  // street trees are clay planter trees, as in the arrival scene; palms stay as accents by the board
  const treeSpots = world.trees.map((t) => ({ x: t.x, z: t.z, ry: rng() * Math.PI * 2 }));
  if (treeSpots.length) {
    const clayMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
    const r3 = mulberry32(77);
    root.add(instanced(clayTreeGeometry(), clayMat, treeSpots, () => 2.3 + r3() * 0.7));
    world.addColliders(treeSpots.map((t) => ({ name: 'clay_tree', cx: t.x, cz: t.z, hx: 0.75, hz: 0.75, ry: 0 })));
  }
  const palmSpots = [];
  // palms line the far pavement of the hero street, and stand at the back of the open gaps
  let farOut = null;
  for (let o = -3; o > -40 && farOut === null; o -= 0.5) if (freeAt(10, o, 0.2) && !freeAt(10, o + 1, 0.2)) farOut = o - 0.8;
  if (farOut !== null) for (let a = -12; a <= 44; a += 9 + rng() * 3) if (freeAt(a, farOut, 0.7)) { const p = at(a, farOut); palmSpots.push({ x: p.x, z: p.z, ry: rng() * 6 }); }
  [[bSpot.a - 2.2, bSpot.c + 2.6], [bSpot.a + 2.2, bSpot.c + 3.2], ...(aSpot ? [[aSpot.a - 2.6, aSpot.c + 2.6]] : [])].forEach(([a, o]) => {
    if (freeAt(a, o, 0.6)) { const p = at(a, o); palmSpots.push({ x: p.x, z: p.z, ry: rng() * 6 }); }
  });
  const palmT = kit?.get('yaba_palm_tree');
  if (palmT) {
    // the kit's palm, instanced; authored scale kept, only the turn varies
    const spots = palmSpots.map((s) => ({ x: s.x, z: s.z, ry: s.ry }));
    root.add(instanceAsset(palmT, spots));
    world.addColliders(collidersFor(palmT, spots));
    kitPlaced.yaba_palm_tree = spots;
  } else {
    root.add(instanced(palm.trunk, M.trunk, palmSpots, () => 0.85 + rng() * 0.45));
    const r2 = mulberry32(2026);
    root.add(instanced(palm.fronds, M.frond, palmSpots, () => 0.85 + r2() * 0.45));
  }

  const banana = bananaGeometry();
  const plantSpots = [];
  const tryPlant = (a, o) => { if (freeAt(a, o, 0.8)) { const p = at(a, o); plantSpots.push({ x: p.x, z: p.z, ry: rng() * 6 }); } };
  [[-2.9, 0.4], [2.9, 0.4], [-2.9, 1.6], [2.9, 1.6]].forEach(([u, v]) => tryPlant(bSpot.a + u, bSpot.c + v));
  if (aSpot) [[-3.1, -1], [3.1, -1], [-3.1, 1.2], [3.1, 1.2]].forEach(([u, v]) => tryPlant(aSpot.a + u, aSpot.c + v));
  // potted plants by the board and the build area, the arrival scene's own planters
  root.add(instanced(clayTreeGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }), [...plantSpots, ...(world.doorPlants || []).map((d) => ({ x: d.x, z: d.z, ry: rng() * 6 }))], () => 1.05 + rng() * 0.35));
  void banana;

  // danfos: two parked at the kerb ahead, three driving the main road
  const road = world.mainRoad;
  // the kit's danfo takes over parked and moving danfos (district.js)
  if (road && !kit?.get('yaba_danfo_minibus')) {
    const pts = road.pts.map(([x, z]) => new V3(x, 0, z));
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = lens[lens.length - 1];
    const sample = (s) => {
      s = Math.max(0, Math.min(total - 0.01, s));
      let i = 1; while (lens[i] < s) i++;
      const t = (s - lens[i - 1]) / (lens[i] - lens[i - 1]);
      const p = pts[i - 1].clone().lerp(pts[i], t);
      const tan = pts[i].clone().sub(pts[i - 1]).normalize();
      return { p, tan, n: new V3(-tan.z, 0, tan.x) };
    };
    const lane = road.w / 4;
    const count = lowQuality ? 2 : 4;
    for (let k = 0; k < count; k++) {
      const d = danfo(M);
      root.add(d);
      movers.push({ obj: d, s: (total / count) * k + rng() * 20, dir: k % 2 ? -1 : 1, speed: 6 + rng() * 3, sample, total, lane, parked: false });
    }
    // parked at the kerb near the spawn
    let best = 0, bestD = Infinity;
    for (let s = 0; s < total; s += 2) { const d0 = sample(s).p.distanceTo(new V3(S.x, 0, S.z)); if (d0 < bestD) { bestD = d0; best = s; } }
    [10, 17].forEach((ds) => {
      const d = danfo(M);
      root.add(d);
      const f = sample(best + ds);
      const side = f.n.dot(N) > 0 ? -1 : 1;
      d.position.copy(f.p).addScaledVector(f.n, side * (road.w / 2 - 1.3));
      d.rotation.y = Math.atan2(f.tan.x, f.tan.z);
    });
  }

  // people walking the pavement: residents, not builders (no name tags), each with a register for the
  // chat bubbles: tier 0 is well-off (mostly English, a smart jacket), 2 is working-class (mostly Pidgin)
  if (!lowQuality) {
    const RES = [['Chidi', '#c25b4a', 2], ['Amaka', '#e0c36a', 0], ['Bayo', '#5a7fb0', 1], ['Zainab', '#d9d2c3', 0], ['Emeka', '#7fb35e', 2], ['Funke', '#e98a6a', 1]];
    RES.forEach(([name, c, tier], i) => {
      const av = createAvatarModel({ color: c, style: tier === 0 ? 'jacket' : tier === 1 ? 'hoodie' : 'tee' });
      root.add(av.root);
      walkers.push({ name, tier, obj: av.root, dispose: av.dispose, rig: rigAvatar(av.root), s: -14 + i * 9, dir: i % 2 ? 1 : -1, out: 0.6 + (i % 2) * 0.9, speed: 1.1 + rng() * 0.4 });
    });
  }

  function update(dt, t, player) {
    if (area?.userData.ghost) area.userData.ghost.material.opacity = 0.22 + (reduced ? 0.1 : 0.12 * (0.5 + 0.5 * Math.sin(t * 2.4)));
    movers.forEach((m) => {
      if (reduced) return;
      const f0 = m.sample(m.s);
      const pos = f0.p.clone().addScaledVector(f0.n, -m.dir * m.lane);
      // give way to the player
      const ahead = pos.clone().addScaledVector(f0.tan, m.dir * 4);
      const blocked = Math.hypot(ahead.x - player.x, ahead.z - player.z) < 3.2;
      if (!blocked) m.s += m.dir * m.speed * dt;
      if (m.s > m.total - 2 || m.s < 2) { m.dir *= -1; m.s = Math.max(2, Math.min(m.total - 2, m.s)); }
      m.obj.position.copy(pos);
      m.obj.rotation.y = Math.atan2(f0.tan.x * m.dir, f0.tan.z * m.dir);
    });
    walkers.forEach((w) => {
      // walkers stop for the player and turn back at anything solid, never walking through it
      const next = at(w.s + w.dir * 0.9, -0.2 - w.out);
      const blockedByPlayer = Math.hypot(next.x - player.x, next.z - player.z) < 1.1;
      if (world.blockedAt(next.x, next.z, 0.3)) w.dir *= -1;
      else if (!reduced && !blockedByPlayer) w.s += w.dir * w.speed * dt;
      w.moving = !reduced && !blockedByPlayer;
      if (w.s > 34 || w.s < -16) w.dir *= -1;
      const p = at(w.s, -0.2 - w.out);
      w.obj.position.set(p.x, 0, p.z);
      w.obj.rotation.y = alongRoad + (w.dir > 0 ? 0 : Math.PI);
      if (!reduced) w.rig?.update(dt, { speed: w.moving ? w.speed : 0, t });
    });
    builders.forEach((b) => { if (!reduced) b.rig?.update(dt, { speed: 0, t: t + b.name.length }); });
    walkers.forEach(() => {
    });
  }

  function dispose() {
    builders.forEach((b) => b.dispose());
    walkers.forEach((w) => w.dispose());
    root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    Object.values(M).forEach((m) => m.dispose());
    root.removeFromParent();
  }

  // opening view: down the pavement, camera out over the road like the reference shot
  const view = T.clone().multiplyScalar(Math.cos(0.3)).addScaledVector(N, Math.sin(0.3));
  const viewYaw = Math.atan2(view.x, view.z);

  // people as circles, for the player to bump into
  const bodies = () => [...walkers, ...builders].map((w) => ({ x: w.obj.position.x, z: w.obj.position.z, r: 0.33 }));
  // everyone who can talk, for the chat bubbles
  const people = [...builders.map((b) => ({ id: b.name, name: b.name, obj: b.obj, rig: b.rig, tier: b.tier })), ...walkers.map((w) => ({ id: w.name, name: w.name, obj: w.obj, rig: w.rig, tier: w.tier }))];
  return { root, lamps, interact, builders, bodies, people, update, dispose, viewYaw, materials: M, hubAt, kitPlaced, billboardFace, objective: interact[0], area: interact.find((i) => i.id === 'build') };
}
