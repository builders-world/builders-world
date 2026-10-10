import * as THREE from 'three';
import { attachFace } from './expressions.js';

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
const tmpV = { x: 0, y: 0, z: 0 };
// someone built without a rig (a gateman who stands still) still joins the distance cull
export function trackPerson(root) { PEOPLE.add(root); return root; }

export function cullPeople(camera, dist = 60) {
  const cx = camera.position.x, cz = camera.position.z, d2 = dist * dist;
  for (const root of PEOPLE) {
    if (!root.parent) { PEOPLE.delete(root); continue; }
    const e = root.matrixWorld.elements, dx = e[12] - cx, dz = e[14] - cz, far = dx * dx + dz * dz > d2;
    if (far === !!root.userData.far) continue;
    root.userData.far = far;
    root.children.forEach((c) => { c.visible = !far; c.matrixWorldAutoUpdate = !far; });
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
  PEOPLE.add(root);
  const own = [];
  const box = (w, h, d, y, mat) => { const g = new THREE.BoxGeometry(w, h, d).translate(0, y, 0); own.push(g); return new THREE.Mesh(g, mat); };
  const group = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

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
    const ankle = group(knee, 0, -SHIN, 0.0);
    if (shoe) { shoe.position.set(0, 0.13 - (HIP_Y - THIGH - SHIN), 0.055); ankle.add(shoe); }
    const shoulder = group(chest, s * 0.31, SHOULDER_Y - HIP_Y, 0);
    shoulder.rotation.z = s * 0.08;
    shoulder.add(box(0.14, UPPER + 0.02, 0.2, -UPPER / 2, arm.material));
    const elbow = group(shoulder, 0, -UPPER, 0);
    elbow.add(box(0.13, FORE, 0.18, -FORE / 2, arm.material));
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
  function update(dt, s) {
    if (root.userData.far) return; // out of sight: no pose to work out
    const speed = s.speed || 0;
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
    const f = Math.max(lerp(0.9 + 0.38 * sp, 1.45 + 0.13 * sp, run), sp * duty / lerp(0.54, 0.85, run));
    const T = sp * duty / f;                                           // how far a planted foot travels back
    const lift = lerp(0.07, 0.16, run) * walk;
    cur.cycle = ((cur.cycle ?? 0) + f * dt * Math.min(1, sp / 0.25)) % 1;
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
      set(j.shoulder, 'x', s.seated ? -0.55 : -legHip * lerp(0.9, 1.3, run) * (armAmp > 0 ? 1 : 0) * Math.min(1, walk * 1.5) - 0.15 * air, k);
      set(j.shoulder, 'z', sgn * (0.08 + 0.55 * air + 0.04 * run), k);
      if (s.seated) { set(j.elbow, 'x', -0.95, k); return; } // forearms forward onto the desk
      set(j.elbow, 'x', -(lerp(0.25, 1.4, run) * walk + Math.max(0, legHip) * 0.4 * walk + 0.5 * air + 0.08), k);
    };
    armPose(L, L.hip.rotation.x, -1);
    armPose(R, R.hip.rotation.x, 1);
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
    pelvis.position.y = (walk > 0.02 && !s.seated ? cur.hipH : HIP_Y) + breathe - cur.land * 0.1 - (s.seated ? 0.36 : 0);
    // lean into a run; a small hip and chest counter-twist, no side-to-side rocking; the head looks ahead
    set(chest, 'x', lerp(0.04, 0.2, run) * walk + 0.08 * air, k);
    set(pelvis, 'y', -0.05 * walk * Math.sin(ph), k);
    set(chest, 'y', 0.07 * walk * Math.sin(ph) * lerp(1, 1.3, run), k);
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
    root.userData.face?.update(dt);
  }
  const JOINTS = { pelvis, chest, neck, 'L.hip': L.hip, 'L.knee': L.knee, 'L.ankle': L.ankle, 'L.shoulder': L.shoulder, 'L.elbow': L.elbow, 'R.hip': R.hip, 'R.knee': R.knee, 'R.ankle': R.ankle, 'R.shoulder': R.shoulder, 'R.elbow': R.elbow };
  // start an emote: { fn(P, t, u, lift), dur, full, amp, done }; a new one ends the last
  function emote(spec) { if (cur.e) cur.e.done?.(); cur.e = { ...spec, t: 0 }; cur.g = null; }
  function landed(v) { cur.land = Math.min(1, Math.abs(v) / 6); }
  function wave() { cur.wave = 1.5; }
  const DUR = { cheer: 2.0, thumbs: 1.6, laugh: 1.8, thanks: 1.8, dance: 3.2, look: 2.6, phone: 4.5, stretch: 2.2, shift: 3.5 };
  function play(name) { if (!DUR[name]) return; cur.g = { name, t: 0, dur: DUR[name], idle: ['look', 'phone', 'stretch', 'shift'].includes(name) }; }
  function dispose() { own.forEach((g) => g.dispose()); }
  const rig = { pelvis, chest, neck, L, R, attach, update, landed, wave, play, dispose, emote, emoting: () => !!cur.e, moving: () => cur.walk > 0.3 };
  root.userData.rig = rig;
  attachFace(root, rig); // eyes, brows and a mouth that can change (expressions.js)
  return rig;
}
