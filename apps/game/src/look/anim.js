import * as THREE from 'three';
import { attachFace } from './expressions.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Character animation (world bible 7.4): a jointed rig over the shared avatar, so people walk,
// run and jump instead of bobbing. Codex's avatar file is untouched: its single-box legs and arms are
// hidden and rebuilt here as thigh + shin + foot and upper arm + forearm + hand, in its own materials.
// Conventions: the avatar faces +z; a positive rotation.x on a hip or shoulder swings the limb back.

const HIP_Y = 0.82, THIGH = 0.34, SHIN = 0.33, SHOULDER_Y = 1.25, UPPER = 0.23, FORE = 0.24;
const near = (a, b, e = 0.012) => Math.abs(a - b) < e;

// Level of detail for people (performance, world bible 7.2): every rigged avatar is registered; far
// from the camera its parts are not drawn, its matrices are not updated and its pose is not worked out.
// The root's own visibility stays the business of whoever owns the avatar (indoors, asleep...).
export const PEOPLE = new Set();
if (typeof window !== 'undefined') window.__bwPeople = PEOPLE; // for the tests (scratch scripts), like window.__bw
const tmpV = { x: 0, y: 0, z: 0 };
// someone built without a rig (a gateman who stands still) still joins the distance cull
export function trackPerson(root) { PEOPLE.add(root); return root; }

// Far off, someone is a single mesh (a level of detail): every part of them baked once, in their own colours, into one
// geometry, one draw call instead of thirty-odd. Close to, every part is drawn and moves. Far beyond that, nothing is.
const LOD_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
const AVG = new Map();
function avgColour(tex) {
  if (AVG.has(tex.uuid)) return AVG.get(tex.uuid);
  const c = new THREE.Color(0.75, 0.65, 0.55), img = tex.image;
  try { if (img && (img.width || img.videoWidth)) { const cv = document.createElement('canvas'); cv.width = cv.height = 8; const g = cv.getContext('2d'); g.drawImage(img, 0, 0, 8, 8); const d = g.getImageData(0, 0, 8, 8).data; let r = 0, gg = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 40) continue; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; } if (n) c.setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace); } } catch { /* a texture we cannot read: the default */ }
  AVG.set(tex.uuid, c); return c;
}
function bakeLod(root, attach = true) {
  // every part's own matrix worked out from where it is now: a person put away out of sight stops updating theirs (cull),
  // and one put away before it was ever drawn still has the identity there, which baked a head as a 2 m ball on the ground
  root.traverse((o) => o.updateMatrix());
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), m = new THREE.Matrix4(), col = new THREE.Color(), geos = [];
  const shown = (o) => { for (let a = o; a && a !== root; a = a.parent) { const v = a.parent === root ? (a.userData.vis ?? a.visible) : a.visible; if (!v) return false; } return true; };
  root.traverse((o) => {
    // (a see-through overlay, the drawn face, is left out: from afar the head's own skin is what shows)
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.lod || Array.isArray(o.material) || ((o.material.transparent || o.material.alphaTest > 0 || o.userData.face) && o.material.map) || !shown(o)) return;
    const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    const g = new THREE.BufferGeometry(); g.setAttribute('position', src.getAttribute('position').clone());
    if (src.getAttribute('normal')) g.setAttribute('normal', src.getAttribute('normal').clone()); else g.computeVertexNormals();
    m.multiplyMatrices(inv, o.matrixWorld); g.applyMatrix4(m);
    col.copy(o.material.color || col.set(0xffffff)); if (o.material.map) col.multiply(avgColour(o.material.map)); // a pattern or a face: its average colour, which is what it reads as from afar
    const n = g.getAttribute('position').count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); geos.push(g); src.dispose();
  });
  if (!geos.length) return null;
  const merged = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
  // never below their own feet: a pose set by hand (a crouched skater, a rider's legs) can reach under the ground line,
  // which from afar reads as someone sunk into the pavement
  merged.computeBoundingBox(); if (merged.boundingBox.min.y < -0.05) merged.translate(0, -merged.boundingBox.min.y, 0);
  const lod = new THREE.Mesh(merged, LOD_MAT); lod.userData.lod = true; lod.castShadow = true; lod.visible = false; if (attach) root.add(lod);
  return lod;
}
// The far stand-in, walking (Elvis, 13 October 2026: "some of the characters are not moving well ... gliding"): one
// merged mesh was a single frozen pose, so a person past the close-up distance slid along on still legs. Now it is a
// little flipbook: four poses from the walk cycle (each foot planting and passing) and the pose they stood in when it was
// made (a seated or busy person keeps theirs). The rig steps through it at their real walking pace (update), so they
// walk at any distance, still at one draw call and without working out a single joint.
const WALK_FRAMES = 4, LOD_WALK = 1.2;
function bakeLodSet(root) {
  const rig = root.userData.rigApi, set = new THREE.Group(); set.userData.lod = true; set.visible = false; set.name = 'lod';
  const still = bakeLod(root, false); if (!still) return null;
  const frames = [];
  if (rig?.poseAt) {
    const undo = rig.poseAt(null); // keeps what it changes, to put back after
    for (let i = 0; i < WALK_FRAMES; i++) { rig.poseAt(i / WALK_FRAMES, LOD_WALK); const f = bakeLod(root, false); if (f) frames.push(f); }
    undo();
    root.updateMatrixWorld(true);
  }
  [still, ...frames].forEach((m) => { m.visible = false; set.add(m); });
  still.visible = true;
  set.userData.still = still; set.userData.frames = frames.length === WALK_FRAMES ? frames : null;
  root.add(set);
  return set;
}
/** A person's clothes or body changed (style.js dress): bake their far-off mesh again when it is next needed. */
export function staleLod(root) { const L = root?.userData?.lodMesh; if (L) { L.removeFromParent(); L.traverse((m) => m.geometry?.dispose()); root.userData.lodMesh = null; } unpackPerson(root); }

// ---------- a person close up, in fewer pieces (Elvis, 13 October 2026: performance) ----------
// A dressed person is 25 to 40 small meshes, each a draw call. The plain ones hanging off each joint of the rig (the
// torso, sleeves, collar and buttons on the chest; the hair and ears on the neck; a shin and its shoe) are merged into
// one mesh per joint, coloured per vertex with one material for everyone; the rig moves the joints as before, so walking,
// waving and sitting are unchanged. Anything with a picture on it (the drawn face, a print), anything see-through, and
// the bits the face hides are left as they are. Undone when the person is dressed again (staleLod).
const PACK_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 });
const NO_PACK = typeof location !== 'undefined' && new URLSearchParams(location.search).get('pack') === '0'; // (to compare)
const packable = (o, skip) => {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.lod || o.userData.pack || o.userData.faceDecor || skip.has(o) || Array.isArray(o.material)) return false;
  const m = o.material; return !!m && !m.map && !m.transparent && !(m.alphaTest > 0) && (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial) && o.visible && !o.children.length;
};
export function packPerson(root) {
  if (!root || root.userData.packed || root.userData.noPack || NO_PACK) return;
  root.userData.packed = true;
  const skip = new Set(root.userData.dressFound?.brows || []), byParent = new Map(), col = new THREE.Color();
  root.traverse((o) => { if (o !== root && o.parent !== root && packable(o, skip)) { const l = byParent.get(o.parent) || []; l.push(o); byParent.set(o.parent, l); } });
  for (const [p, list] of byParent) {
    if (list.length < 2) continue;
    const geos = list.map((o) => {
      o.updateMatrix();
      const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, g = new THREE.BufferGeometry();
      g.setAttribute('position', src.getAttribute('position').clone()); if (src.getAttribute('normal')) g.setAttribute('normal', src.getAttribute('normal').clone()); else g.computeVertexNormals();
      g.applyMatrix4(o.matrix);
      col.copy(o.material.color || col.set(0xffffff)); const n = g.getAttribute('position').count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) col.toArray(c, i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(c, 3)); if (src !== o.geometry) src.dispose(); return g;
    });
    const mesh = new THREE.Mesh(mergeGeometries(geos, false), PACK_MAT); geos.forEach((g) => g.dispose());
    mesh.userData.pack = list; mesh.castShadow = list.some((o) => o.castShadow); mesh.receiveShadow = list.some((o) => o.receiveShadow);
    p.add(mesh); list.forEach((o) => { o.visible = false; o.userData.packedAway = true; });
  }
}
export function unpackPerson(root) {
  if (!root?.userData?.packed) return; root.userData.packed = false;
  const packs = []; root.traverse((o) => { if (o.userData.pack) packs.push(o); });
  packs.forEach((m) => { m.userData.pack.forEach((o) => { if (o.userData.packedAway) { o.visible = true; o.userData.packedAway = false; } }); m.removeFromParent(); m.geometry.dispose(); });
}

const cullFr = new THREE.Frustum(), cullM = new THREE.Matrix4(), cullS = new THREE.Sphere();
export function cullPeople(camera, dist = 60, lodDist = Math.min(32, dist * 0.55)) {
  if (typeof window !== 'undefined') window.__bwCull = cullPeople;
  const cx = camera.position.x, cz = camera.position.z, d2 = dist * dist, l2 = lodDist * lodDist;
  // out of view and not close: put away like the far ones (not drawn, not posed, no shadow). Within 15 m everyone
  // stays, and the view is taken a little wide, so turning round never finds a crowd popping in at your elbow
  let packs = 0, bakes = 0;
  camera.updateMatrixWorld(); cullFr.setFromProjectionMatrix(cullM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  for (const root of PEOPLE) {
    if (!root.parent) { PEOPLE.delete(root); continue; }
    const e = root.matrixWorld.elements, dx = e[12] - cx, dz = e[14] - cz, dd = dx * dx + dz * dz;
    // (you are never culled: a cinematic camera far from your body, the taxi ride to the airport, used to leave you hidden)
    const unseen = dd > 225 && !cullFr.intersectsSphere(cullS.set(cullS.center.set(e[12], e[13] + 0.9, e[14]), 5));
    let state = root.userData.noLod ? 'near' : dd > d2 || unseen ? 'far' : dd > l2 && root.userData.rigged ? 'lod' : 'near';
    // the walking stand-in is five poses to bake: a few people a pass; anyone waiting stays as they are, in full
    if (state === 'lod' && !root.userData.lodMesh) { if (bakes >= 4) state = root.userData.cull === 'far' ? 'far' : 'near'; else bakes++; }
    // close up and not you: merged into fewer pieces, a few people a pass so a crowd arriving never stalls a frame
    if (state === 'near' && !root.userData.noLod && !root.userData.packed && packs < 6 && root.userData.rigged) { packs++; packPerson(root); }
    if (state === (root.userData.cull || 'near') && !(state === 'lod' && !root.userData.lodMesh)) continue;
    // leaving the close-to state: remember what each part showed (a rig hides the avatar's own box legs and arms for
    // good; showing everything again on the way back put a frozen second pair over the moving ones)
    if ((root.userData.cull || 'near') === 'near') root.children.forEach((c) => { if (!c.userData.lod) c.userData.vis = c.visible; });
    root.userData.cull = state; root.userData.far = state === 'far';
    let lod = root.userData.lodMesh;
    if (state === 'lod' && !lod) lod = root.userData.lodMesh = bakeLodSet(root);
    root.children.forEach((c) => { if (c.userData.lod) return; c.visible = state === 'near' && (c.userData.vis ?? true); c.matrixWorldAutoUpdate = state === 'near'; c.traverse((x) => { x.matrixAutoUpdate = state === 'near'; }); });
    if (lod) lod.visible = state === 'lod';
  }
  void tmpV;
}

export function rigAvatar(root) {
  const kids = [...root.children];
  const find = (fn) => kids.filter((o) => o.isMesh && fn(o.position));
  const legs = find((p) => near(Math.abs(p.x), 0.135) && near(p.y, 0.49));
  const shoes = find((p) => near(Math.abs(p.x), 0.135) && near(p.y, 0.13));
  const arms = find((p) => near(Math.abs(p.x), 0.32) && near(p.y, 1.04));
  const hands = find((p) => near(Math.abs(p.x), 0.345) && near(p.y, 0.76));
  if (legs.length !== 2 || arms.length !== 2) return null; // not the shared avatar: leave it alone
  PEOPLE.add(root); root.userData.rigged = true;
  const own = [];
  const box = (w, h, d, y, mat) => { const g = new THREE.BoxGeometry(w, h, d).translate(0, y, 0); own.push(g); return new THREE.Mesh(g, mat); };
  const group = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  // a short cylinder lying across the limb at a joint: it looks the same at any bend
  const hinge = (r, w, mat) => { const g = new THREE.CylinderGeometry(r, r, w, 14).rotateZ(Math.PI / 2); own.push(g); return new THREE.Mesh(g, mat); };

  const pelvis = group(root, 0, HIP_Y, 0);
  const chest = group(pelvis, 0, 0, 0);
  // everything above the hips rides on the chest; the head gets its own neck pivot
  const neck = group(chest, 0, 1.4 - HIP_Y, 0);
  kids.forEach((o) => {
    if (legs.includes(o) || shoes.includes(o) || arms.includes(o) || hands.includes(o)) return;
    const target = o.position.y > 1.36 ? neck : chest;
    const base = target === neck ? 1.4 : HIP_Y;
    o.position.y -= base; target.add(o);
  });

  const side = (s) => {
    const leg = legs.find((o) => Math.sign(o.position.x) === s), shoe = shoes.find((o) => Math.sign(o.position.x) === s);
    const arm = arms.find((o) => Math.sign(o.position.x) === s), hand = hands.find((o) => Math.sign(o.position.x) === s);
    leg.visible = false; arm.visible = false;
    const hip = group(pelvis, s * 0.135, 0, 0);
    hip.add(box(0.19, THIGH + 0.02, 0.23, -THIGH / 2, leg.material));
    const knee = group(hip, 0, -THIGH, 0);
    knee.add(box(0.175, SHIN + 0.02, 0.21, -SHIN / 2, leg.material));
    // a rounded knee: the joint the thigh and shin turn about, so a bent leg stays one piece (Elvis, 10 October
    // 2026: "it feels like the body is dismembering as it's walking"): no wedge of light opens behind the knee
    knee.add(hinge(0.105, 0.172, leg.material));
    const ankle = group(knee, 0, -SHIN, 0.0);
    if (shoe) { shoe.position.set(0, 0.13 - (HIP_Y - THIGH - SHIN), 0.055); ankle.add(shoe); }
    const shoulder = group(chest, s * 0.31, SHOULDER_Y - HIP_Y, 0);
    shoulder.rotation.z = s * 0.08;
    shoulder.add(box(0.14, UPPER + 0.02, 0.2, -UPPER / 2, arm.material));
    const elbow = group(shoulder, 0, -UPPER, 0);
    elbow.add(box(0.13, FORE, 0.18, -FORE / 2, arm.material));
    elbow.add(hinge(0.09, 0.128, arm.material)); // and a rounded elbow, so the sleeve does not break in two
    if (hand) { hand.position.set(0, -FORE - 0.02, 0); elbow.add(hand); }
    return { hip, knee, ankle, shoulder, elbow };
  };
  const L = side(-1), R = side(1);
  // gear and props attach to the right bone: offsets are taken off so authored positions still hold
  const rest = { chest: HIP_Y, neck: 1.4 };
  function attach(obj, where) {
    const g = new THREE.Group();
    g.position.y = -rest[where === 'head' ? 'neck' : 'chest'];
    g.add(obj);
    (where === 'head' ? neck : chest).add(g);
    return g;
  }

  // ---------- the pose: targets from the gait, eased so states blend ----------
  const cur = { phase: 0, walk: 0, run: 0, air: 0, land: 0, wave: 0, g: null, e: null, still: 0, nextIdle: 4 };
  const J = (o) => o; // joints are written directly below
  void J;
  const ease = (k, dt) => 1 - Math.exp(-dt * k);
  const lerp = (a, b, k) => a + (b - a) * k;
  const set = (o, axis, v, k) => { o.rotation[axis] = lerp(o.rotation[axis], v, k); };

  /**
   * @param dt     seconds
   * @param s      { speed: ground speed m/s, running: bool, air: bool, vy: vertical speed, t: time, seated: bool }
   */
  // how fast the body really moves over the ground (world position, frame to frame): a walk driven by the speed someone
  // asked for slides its feet whenever the body moves at another (eased toward a far-off goal, catching up with a remote
  // player's report, slowed by a crowd). Driven by this, a planted foot stays planted, for every character alike
  // both over the ground (world) and within its own group (local): a body carried by something (a rider in a car) moves
  // in the world but not in its group, so it is the local one that says whether they are walking when nobody says
  let lastX = null, lastZ = null, lastLX = null, lastLZ = null, moved = 0, movedL = 0;
  const measure = (dt) => {
    const e = root.matrixWorld.elements, x = e[12], z = e[14], lx = root.position.x, lz = root.position.z;
    if (lastX !== null && dt > 1e-4) {
      const d = Math.hypot(x - lastX, z - lastZ), dl = Math.hypot(lx - lastLX, lz - lastLZ), k = 1 - Math.exp(-dt * 10);
      if (d < 3) moved += (d / dt - moved) * k; else moved = 0; // (a jump of metres is a teleport, not a walk)
      if (dl < 3) movedL += (dl / dt - movedL) * k; else movedL = 0;
    }
    lastX = x; lastZ = z; lastLX = lx; lastLZ = lz; return moved;
  };
  function update(dt, s) {
    const real = measure(dt);
    // walking, not seated, not in the air, not marking time on the spot: the legs follow the ground speed
    // walking (said so), not seated, not in the air, not marking time on the spot: the legs follow the ground speed
    const asked = s.speed || 0, free = !s.seated && !s.air && !s.inPlace && s.cycle == null;
    const speed = free && asked > 0.05 ? Math.min(7, real) : asked; // (said 0: riding, pedalling, posed by hand; not a walk)
    // far off: the flipbook stand-in (bakeLodSet), stepped at this pace
    if (root.userData.cull === 'lod') {
      const set = root.userData.lodMesh, fr = set?.userData?.frames;
      if (fr) {
        const sp = speed, f = Math.max(0.9 + 0.38 * sp, (sp * 0.62) / 0.54);
        if (sp > 0.15) cur.cycle = ((cur.cycle ?? 0) + f * dt) % 1;
        const show = sp > 0.15 ? fr[Math.floor(cur.cycle * fr.length) % fr.length] : set.userData.still;
        set.children.forEach((m) => { m.visible = m === show; });
      }
      return;
    }
    if (root.userData.far) return; // out of sight: no pose to work out
    const k = ease(16, dt);
    cur.walk = lerp(cur.walk, Math.min(1, speed / 1.2) * (s.air ? 0 : 1), ease(10, dt));
    cur.run = lerp(cur.run, s.running && speed > 3 ? 1 : 0, ease(6, dt));
    cur.air = lerp(cur.air, s.air ? 1 : 0, ease(14, dt));
    cur.land = Math.max(0, cur.land - dt * 5);
    // ---- the legs, by where the feet go (no sliding, no sinking) ----
    // A walk cycle has each foot planted on the ground (stance) while the body passes over it, then
    // swinging forward through the air. A planted foot stays put: in the body's frame it moves back at
    // exactly the walking speed. Hip and knee angles are solved from where the ankle must be (two-bone
    // IK), and the hips ride as high as the planted legs allow, which gives the bob. Cadence rises with
    // speed so the stride stays within reach of these short legs.
    const run = cur.run, walk = cur.walk, air = cur.air;
    // speed, smoothed: people's speeds are measured frame by frame and jitter, which would jerk the stride
    cur.sp = lerp(cur.sp ?? 0, s.air || s.seated ? 0 : speed, ease(8, dt));
    const sp = cur.sp;
    const duty = lerp(0.62, 0.36, run);                                // share of the cycle a foot is planted
    // cycles a second (two steps each), quicker when a stride would overreach these short legs
    // Above about 2 m/s (the player's walk) these short legs cannot reach a stride that keeps up, and the
    // cadence ran to over three strides a second: a frantic shuffle. There the step stays at full reach and the
    // planted foot is let slip a little instead, so the legs swing at a believable pace.
    const reachMax = lerp(0.54, 0.85, run), hurry = Math.min(1, Math.max(0, (sp - 2) / 0.8)) * (1 - run);
    const f = Math.max(lerp(0.9 + 0.38 * sp, 1.45 + 0.13 * sp, run), (sp * duty / reachMax) * lerp(1, 0.74, hurry));
    const T = Math.min(reachMax, sp * duty / f);                       // how far a planted foot travels back
    const lift = lerp(0.07, 0.16, run) * walk;
    cur.cycle = s.cycle ?? ((cur.cycle ?? 0) + f * dt * Math.min(1, sp / 0.25)) % 1;
    const FOOT = HIP_Y - THIGH - SHIN, LEG = THIGH + SHIN;
    const footAt = (u) => {
      u = ((u % 1) + 1) % 1;
      if (u < duty) return { z: T / 2 - T * (u / duty), y: FOOT, stance: true };
      // swing: a Hermite curve that leaves and lands at the planted foot's own speed (no jolt at
      // lift-off or touch-down), and a lift that eases in and out
      // (the end speeds are kept small: matching the planted speed exactly made the foot overshoot and the leg lock straight)
      const q = (u - duty) / (1 - duty), m = -T * 0.3, q2 = q * q, q3 = q2 * q;
      const z = (2 * q3 - 3 * q2 + 1) * (-T / 2) + (q3 - 2 * q2 + q) * m + (-2 * q3 + 3 * q2) * (T / 2) + (q3 - q2) * m;
      const up = Math.sin(Math.PI * q);
      return { z, y: FOOT + lift * up * up, stance: false, q };
    };
    const feet = [footAt(cur.cycle), footAt(cur.cycle + 0.5)];
    // the hips: a touch of bend at the knees, and no higher than a planted leg reaches
    let hipH = HIP_Y - lerp(0.006, 0.07, run) * walk; // nearly straight at mid-stance when walking, sat lower in a run
    // (both feet: a swinging foot reaching forward to land lowers the hips smoothly before it lands)
    // a soft minimum, so the hips glide from one leg's support to the other's instead of kinking
    const reach = feet.map((ft) => ft.y + Math.sqrt(Math.max(0.01, (LEG * 0.985) ** 2 - ft.z * ft.z)));
    const softMin = (a, b, w = 0.012) => Math.min(a, b) - w * Math.log(Math.exp(-(a - Math.min(a, b)) / w) + Math.exp(-(b - Math.min(a, b)) / w));
    hipH = softMin(hipH, softMin(reach[0], reach[1]));
    // standing still the hips sit at full height, so the legs are straight: the walk's slightly lowered hips left a
    // standing person with knees bent 30 degrees and thighs forward, which read from the side as a slanted body
    hipH = lerp(HIP_Y, hipH, Math.min(1, walk * 3));
    cur.hipH = hipH; // no easing: a lagging hip overstretches the leg and the knee snaps straight
    const legIK = (j, ft) => {
      const dy = ft.y - cur.hipH, dz = ft.z, d = Math.min(LEG - 1e-4, Math.max(0.12, Math.hypot(dy, dz)));
      const knee = Math.PI - Math.acos(Math.min(1, Math.max(-1, (THIGH * THIGH + SHIN * SHIN - d * d) / (2 * THIGH * SHIN))));
      const toward = Math.atan2(-dz, -dy), off = Math.acos(Math.min(1, Math.max(-1, (THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d))));
      let hip = toward - off, kn = knee;
      // in the air, or seated, the old poses take over
      hip = lerp(hip, j === L ? -0.7 : 0.25, air); kn = lerp(kn, j === L ? 1.3 : 0.9, air);
      if (s.seated) { hip = -1.5; kn = 1.5; }
      const kk = walk > 0.05 && !air ? 1 : k; // walking: exactly where the foot is, or it slides
      set(j.hip, 'x', hip, kk); set(j.knee, 'x', kn, kk);
      // the sole flat on the ground in stance; toes up a little as the foot swings through
      set(j.ankle, 'x', -(j.hip.rotation.x + j.knee.rotation.x) + (ft.stance ? 0 : -0.25 * Math.sin(Math.PI * (ft.q || 0)) ** 2 * walk), kk);
    };
    legIK(L, feet[0]); legIK(R, feet[1]);
    const ph = cur.cycle * Math.PI * 2 + Math.PI / 2; // for the arms and the twist: 0 where the left foot strikes

    const armAmp = lerp(0.42, 0.9, run) * walk;
    const armPose = (j, legHip, sgn) => {
      // each arm swings against the leg on the same side
      // a full swing, so the hands pass the hips instead of hanging in front of them (seen from the side, a
      // hand that barely moves sits right over the crotch)
      set(j.shoulder, 'x', s.seated ? -0.55 : -legHip * lerp(1.35, 1.3, run) * (armAmp > 0 ? 1 : 0) * Math.min(1, walk * 1.5) - 0.15 * air, k);
      set(j.shoulder, 'z', sgn * (0.08 + 0.05 * walk + 0.55 * air + 0.04 * run), k);
      if (s.seated) { set(j.elbow, 'x', -0.95, k); return; } // forearms forward onto the desk
      // a walking arm stays nearly straight (a bent forearm crossing a sleeve of the same colour reads as the body breaking)
      set(j.elbow, 'x', -(lerp(0.12, 1.4, run) * walk + Math.max(0, legHip) * lerp(0.28, 0.4, run) * walk + 0.5 * air + 0.06), k);
    };
    armPose(L, L.hip.rotation.x, -1);
    armPose(R, R.hip.rotation.x, 1);
    // the sideways tilts and the chest's bow only ever come from gestures and emotes (below): ease them back to
    // upright every frame, or a head tilt from an emote stayed for good (a neck left at 11 degrees, a slanted chest)
    set(neck, 'z', 0, k); set(chest, 'z', 0, k); set(pelvis, 'x', 0, k); set(root, 'z', 0, k);
    // ---- gestures and idle moments: layered on the pose, faded in and out ----
    // standing still, people fidget now and then: look around, check the phone, stretch, shift weight
    if (!s.seated && speed < 0.1 && !s.air) {
      cur.still += dt;
      if (!cur.g && cur.still > cur.nextIdle) { cur.nextIdle = cur.still + 6 + Math.random() * 8; play(['look', 'phone', 'stretch', 'shift', 'look'][Math.floor(Math.random() * 5)]); }
    } else { cur.still = 0; cur.nextIdle = 3 + Math.random() * 5; if (cur.g?.idle) cur.g = null; }
    if (cur.g) {
      const G = cur.g; G.t += dt;
      const w = Math.min(1, G.t * 4, (G.dur - G.t) * 4), t = s.t || 0, kk = ease(14, dt);
      // the gesture owns these joints while it plays: blend from the walking pose by w, no tug of war
      const pose = (j, axis, v) => { j.rotation[axis] = lerp(j.rotation[axis], v, w); };
      void kk;
      if (G.t >= G.dur) cur.g = null;
      else if (G.name === 'cheer') { // both arms up, a little bounce
        pose(L.shoulder, 'x', -2.8); pose(R.shoulder, 'x', -2.8); pose(L.shoulder, 'z', -0.4); pose(R.shoulder, 'z', 0.4); pose(L.elbow, 'x', -0.2); pose(R.elbow, 'x', -0.2);
        pelvis.position.y += w * 0.06 * Math.abs(Math.sin(t * 9));
      } else if (G.name === 'thumbs') { // right arm forward, forearm up
        pose(R.shoulder, 'x', -1.2); pose(R.elbow, 'x', -1.3); pose(neck, 'x', -0.1);
      } else if (G.name === 'laugh') { // head back, shoulders shaking
        pose(neck, 'x', -0.35); pose(chest, 'x', -0.1 + 0.05 * Math.sin(t * 22)); pose(L.elbow, 'x', -0.9); pose(R.elbow, 'x', -0.9); pose(L.shoulder, 'x', -0.3); pose(R.shoulder, 'x', -0.3);
      } else if (G.name === 'thanks') { // hands together at the chest, a small bow
        pose(L.shoulder, 'x', -0.7); pose(R.shoulder, 'x', -0.7); pose(L.shoulder, 'z', 0.35); pose(R.shoulder, 'z', -0.35); pose(L.elbow, 'x', -1.9); pose(R.elbow, 'x', -1.9); pose(chest, 'x', 0.3); pose(neck, 'x', 0.15);
      } else if (G.name === 'dance') { // side to side, arms pumping
        pelvis.position.y += w * 0.05 * Math.abs(Math.sin(t * 8));
        pose(pelvis, 'z', 0.12 * Math.sin(t * 8)); pose(chest, 'y', 0.3 * Math.sin(t * 8));
        pose(L.shoulder, 'x', -0.9 + 0.6 * Math.sin(t * 8)); pose(R.shoulder, 'x', -0.9 - 0.6 * Math.sin(t * 8)); pose(L.elbow, 'x', -1.4); pose(R.elbow, 'x', -1.4);
        pose(L.knee, 'x', 0.3 + 0.3 * Math.max(0, Math.sin(t * 8))); pose(R.knee, 'x', 0.3 + 0.3 * Math.max(0, -Math.sin(t * 8)));
      } else if (G.name === 'look') { // glance one way, then the other
        pose(neck, 'y', 0.7 * Math.sin((G.t / G.dur) * Math.PI * 2));
      } else if (G.name === 'phone') { // phone out, head down
        pose(R.shoulder, 'x', -0.6); pose(R.elbow, 'x', -1.7); pose(R.shoulder, 'z', -0.15); pose(neck, 'x', 0.45);
      } else if (G.name === 'stretch') { // arms up and back
        pose(L.shoulder, 'x', -3.0); pose(R.shoulder, 'x', -3.0); pose(L.elbow, 'x', -0.3); pose(R.elbow, 'x', -0.3); pose(chest, 'x', -0.15);
      } else if (G.name === 'shift') { // weight onto one leg
        pose(pelvis, 'z', 0.08); pose(L.knee, 'x', 0.25); pose(chest, 'z', -0.05);
      }
    }
    // a wave: the right arm up, the forearm swinging, for about a second and a half
    if (cur.wave > 0) {
      cur.wave = Math.max(0, cur.wave - dt);
      const w = Math.min(1, cur.wave * 3, (1.5 - cur.wave) * 5), kk = ease(18, dt);
      set(R.shoulder, 'x', lerp(R.shoulder.rotation.x, -2.7, w), kk);
      set(R.shoulder, 'z', lerp(R.shoulder.rotation.z, 0.35, w), kk);
      R.elbow.rotation.x = lerp(R.elbow.rotation.x, -0.5 + 0.45 * Math.sin((s.t || 0) * 14), w);
    }

    // the hips at the height the planted legs allow (above), breathing when still
    const breathe = (1 - walk) * 0.006 * Math.sin((s.t || 0) * 2.2);
    pelvis.position.y = s.seated ? (s.seatY || HIP_Y - 0.36) + breathe : (walk > 0.02 ? cur.hipH : HIP_Y) + breathe - cur.land * 0.1;
    // lean into a run; a small hip and chest counter-twist, no side-to-side rocking; the head looks ahead
    set(chest, 'x', lerp(0.04, 0.2, run) * walk + 0.08 * air, k);
    set(pelvis, 'y', -0.035 * walk * Math.sin(ph), k);
    set(chest, 'y', 0.045 * walk * Math.sin(ph) * lerp(1, 1.6, run), k);
    set(neck, 'y', -chest.rotation.y * 0.9 - pelvis.rotation.y, k);
    set(neck, 'x', -chest.rotation.x * 0.6 + 0.32 * (s.slump || 0), k); // sad people look at the ground
    set(pelvis, 'z', 0.02 * walk * Math.sin(ph) * (1 - run), k);
    // ---- an emote (expressions.js): its own body move, blended over everything above ----
    if (cur.e) {
      const E = cur.e; E.t += dt;
      if (E.t >= E.dur || (E.full && walk > 0.3)) { cur.e = null; E.done?.(); }
      else {
        const w = Math.min(1, E.t * 4, (E.dur - E.t) * 4), amp = E.amp ?? 1;
        // an emote that is not "full" leaves the legs to the walk
        const P = (name, axis, v) => { const j = JOINTS[name]; if (!j || (!E.full && /hip|knee|ankle/.test(name) && walk > 0.1)) return; j.rotation[axis] = lerp(j.rotation[axis], v * amp, w); };
        E.fn(P, E.t, E.t / E.dur, (m) => { pelvis.position.y += m * w; });
      }
    }
    // ---- doing something at home (rooms.js): lying on the bed, the sofa, cooking, the shower... ----
    if (s.pose) { cur.seatYLie = s.seatY || 0.7; homePose(s.pose, s.t || 0, k); }
    else if (cur.lying) { root.rotation.x = 0; root.position.y = 0; cur.lying = false; }
    root.userData.face?.update(dt);
  }
  function homePose(name, t, k) {
    const sh = (j, x, z) => { set(j.shoulder, 'x', x, k); if (z !== undefined) set(j.shoulder, 'z', z, k); };
    const el = (j, v) => set(j.elbow, 'x', v, k);
    if (name === 'lie') {
      // on your back on the bed: the body tips back about the feet (the bed's height is the seat height)
      cur.lying = true; root.rotation.x = -Math.PI / 2; root.position.y = (cur.seatYLie ?? 0.7);
      [L, R].forEach((j) => { set(j.hip, 'x', 0, k); set(j.knee, 'x', 0.08, k); set(j.ankle, 'x', 0.3, k); sh(j, -0.05, (j === L ? -1 : 1) * 0.12); el(j, -0.15); });
      pelvis.position.y = HIP_Y; set(neck, 'x', -0.1, k);
      return;
    }
    if (cur.lying) { root.rotation.x = 0; root.position.y = 0; cur.lying = false; }
    const sw = Math.sin(t * 3.2), sw2 = Math.sin(t * 6.5);
    if (name === 'sofa' || name === 'tv') { sh(L, -0.35, -0.12); sh(R, -0.35, 0.12); el(L, -0.7); el(R, -0.7); set(chest, 'x', -0.14, k); }
    else if (name === 'feet') { [L, R].forEach((j) => { set(j.hip, 'x', -1.45, k); set(j.knee, 'x', 0.1, k); set(j.ankle, 'x', 0.2, k); }); sh(L, -0.2, -0.2); sh(R, -0.2, 0.2); el(L, -0.4); el(R, -0.4); set(chest, 'x', -0.22, k); }
    else if (name === 'read') { sh(L, -0.95, 0.15); sh(R, -0.95, -0.15); el(L, -1.35); el(R, -1.35); set(neck, 'x', 0.3, k); }
    else if (name === 'eat') { const b = Math.max(0, Math.sin(t * 1.7)); sh(L, -0.55, 0.1); el(L, -1.0); sh(R, -0.6 - 0.7 * b, -0.1); el(R, -0.9 - 1.0 * b); set(neck, 'x', 0.15 - 0.1 * b, k); }
    else if (name === 'cook') { sh(L, -0.8, 0.12); el(L, -1.0); sh(R, -0.95, -0.15 + 0.22 * sw); el(R, -1.05 + 0.18 * Math.cos(t * 3.2)); set(neck, 'x', 0.35, k); }
    else if (name === 'shower') { sh(L, -2.6, -0.25 + 0.15 * sw2); sh(R, -2.6, 0.25 - 0.15 * sw2); el(L, -1.5); el(R, -1.5); set(neck, 'x', -0.25, k); }
    else if (name === 'wash') { sh(L, -0.7, 0.1 + 0.08 * sw2); sh(R, -0.7, -0.1 - 0.08 * sw2); el(L, -0.6); el(R, -0.6); set(neck, 'x', 0.4, k); }
    else if (name === 'reach') { const u = Math.min(1, (t % 4) / 1.2); sh(R, -1.4 + 0.9 * u, -0.1); el(R, -0.2 - 1.6 * u); sh(L, -0.1); el(L, -0.2); }
    else if (name === 'bench') { sh(L, -0.85, 0.1); sh(R, -0.9, -0.1); el(L, -1.15 + 0.06 * sw2); el(R, -1.2 + 0.08 * Math.sin(t * 5)); set(neck, 'x', 0.4, k); }
    else if (name === 'present') { sh(R, -1.0 + 0.35 * sw, -0.25); el(R, -0.9); sh(L, -0.3 - 0.25 * Math.max(0, -sw), 0.15); el(L, -0.5); set(neck, 'x', -0.05, k); }
  }
  const JOINTS = { pelvis, chest, neck, 'L.hip': L.hip, 'L.knee': L.knee, 'L.ankle': L.ankle, 'L.shoulder': L.shoulder, 'L.elbow': L.elbow, 'R.hip': R.hip, 'R.knee': R.knee, 'R.ankle': R.ankle, 'R.shoulder': R.shoulder, 'R.elbow': R.elbow };
  // start an emote: { fn(P, t, u, lift), dur, full, amp, done }; a new one ends the last
  function emote(spec) { if (cur.e) cur.e.done?.(); cur.e = { ...spec, t: 0 }; cur.g = null; }
  function landed(v) { cur.land = Math.min(1, Math.abs(v) / 6); }
  function wave() { cur.wave = 1.5; }
  const DUR = { cheer: 2.0, thumbs: 1.6, laugh: 1.8, thanks: 1.8, dance: 3.2, look: 2.6, phone: 4.5, stretch: 2.2, shift: 3.5 };
  function play(name) { if (!DUR[name]) return; cur.g = { name, t: 0, dur: DUR[name], idle: ['look', 'phone', 'stretch', 'shift'].includes(name) }; }
  function dispose() { own.forEach((g) => g.dispose()); }
  // the walk at a given point of its cycle, for baking the far stand-in; poseAt(null) returns a function that puts every
  // joint and the walk's state back as they were
  function poseAt(cycle, speed = LOD_WALK) {
    if (cycle === null) {
      const saved = []; root.traverse((o) => { if (o !== root && !o.isMesh) saved.push([o, o.rotation.clone(), o.position.clone()]); }); const c0 = { ...cur };
      return () => { saved.forEach(([o, r, p]) => { o.rotation.copy(r); o.position.copy(p); }); Object.assign(cur, c0); };
    }
    const far = root.userData.far, cull = root.userData.cull; root.userData.far = false; root.userData.cull = 'near';
    cur.walk = 1; cur.run = 0; cur.air = 0; cur.sp = speed; cur.e = null;
    update(0.5, { speed, cycle, t: 0, inPlace: true });
    root.userData.far = far; root.userData.cull = cull;
  }
  const rig = { pelvis, chest, neck, L, R, attach, update, landed, wave, play, dispose, emote, poseAt, emoting: () => !!cur.e, moving: () => cur.walk > 0.3 };
  root.userData.rigApi = rig;
  root.userData.rig = rig;
  attachFace(root, rig); // eyes, brows and a mouth that can change (expressions.js)
  return rig;
}
