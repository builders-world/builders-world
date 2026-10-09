import * as THREE from 'three';

// Character animation (world bible 7.4): a jointed rig over the shared avatar, so people walk,
// run and jump instead of bobbing. Codex's avatar file is untouched: its single-box legs and arms are
// hidden and rebuilt here as thigh + shin + foot and upper arm + forearm + hand, in its own materials.
// Conventions: the avatar faces +z; a positive rotation.x on a hip or shoulder swings the limb back.

const HIP_Y = 0.82, THIGH = 0.34, SHIN = 0.33, SHOULDER_Y = 1.25, UPPER = 0.23, FORE = 0.24;
const near = (a, b, e = 0.012) => Math.abs(a - b) < e;

export function rigAvatar(root) {
  const kids = [...root.children];
  const find = (fn) => kids.filter((o) => o.isMesh && fn(o.position));
  const legs = find((p) => near(Math.abs(p.x), 0.135) && near(p.y, 0.49));
  const shoes = find((p) => near(Math.abs(p.x), 0.135) && near(p.y, 0.13));
  const arms = find((p) => near(Math.abs(p.x), 0.32) && near(p.y, 1.04));
  const hands = find((p) => near(Math.abs(p.x), 0.345) && near(p.y, 0.76));
  if (legs.length !== 2 || arms.length !== 2) return null; // not the shared avatar: leave it alone
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
  const cur = { phase: 0, walk: 0, run: 0, air: 0, land: 0, wave: 0 };
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
    const speed = s.speed || 0;
    const k = ease(16, dt);
    cur.walk = lerp(cur.walk, Math.min(1, speed / 1.2) * (s.air ? 0 : 1), ease(10, dt));
    cur.run = lerp(cur.run, s.running && speed > 3 ? 1 : 0, ease(6, dt));
    cur.air = lerp(cur.air, s.air ? 1 : 0, ease(14, dt));
    cur.land = Math.max(0, cur.land - dt * 5);
    // one full cycle is two steps; the step length grows with speed, so the feet never slide
    const step = lerp(0.72, 1.25, cur.run);
    if (!s.air) cur.phase += (speed * dt / step) * Math.PI;
    const ph = cur.phase, run = cur.run, walk = cur.walk, air = cur.air;

    const hipAmp = lerp(0.42, 0.78, run) * walk;
    const legPose = (j, p) => {
      const swing = Math.sin(p);                 // + forward
      const rising = Math.max(0, Math.cos(p));   // the leg is swinging forward: lift the foot
      let hip = -hipAmp * swing;
      let knee = walk * (lerp(0.08, 0.35, run) + rising ** 1.4 * lerp(0.75, 1.65, run));
      // airborne: one knee up, one trailing, like a jump in a cartoon done right
      hip = lerp(hip, p === ph ? -0.7 : 0.25, air);
      knee = lerp(knee, p === ph ? 1.3 : 0.9, air);
      if (s.seated) { hip = -1.5; knee = 1.5; } // thighs level on the seat, shins down
      set(j.hip, 'x', hip, k);
      set(j.knee, 'x', knee, k);
      set(j.ankle, 'x', -(j.hip.rotation.x + j.knee.rotation.x) * 0.55 + 0.12 * walk, k); // keep the sole near flat
    };
    legPose(L, ph);
    legPose(R, ph + Math.PI);

    const armAmp = lerp(0.55, 0.95, run) * walk;
    const armPose = (j, p, sgn) => {
      const swing = Math.sin(p);                 // opposite leg
      set(j.shoulder, 'x', s.seated ? -0.55 : armAmp * swing - 0.15 * air, k);
      set(j.shoulder, 'z', sgn * (0.08 + 0.55 * air + 0.04 * run), k);
      // the forearm swings further forward than back, as real arms do
      if (s.seated) { set(j.elbow, 'x', -0.95, k); return; } // forearms forward onto the desk
      set(j.elbow, 'x', -(lerp(0.22, 1.35, run) * walk + Math.max(0, -swing) * lerp(0.45, 0.25, run) * walk + 0.5 * air + 0.08), k);
    };
    armPose(L, ph, -1);
    armPose(R, ph + Math.PI, 1);
    // a wave: the right arm up, the forearm swinging, for about a second and a half
    if (cur.wave > 0) {
      cur.wave = Math.max(0, cur.wave - dt);
      const w = Math.min(1, cur.wave * 3, (1.5 - cur.wave) * 5), kk = ease(18, dt);
      set(R.shoulder, 'x', lerp(R.shoulder.rotation.x, -2.7, w), kk);
      set(R.shoulder, 'z', lerp(R.shoulder.rotation.z, 0.35, w), kk);
      R.elbow.rotation.x = lerp(R.elbow.rotation.x, -0.5 + 0.45 * Math.sin((s.t || 0) * 14), w);
    }

    // the hips ride the stance leg: highest as the legs pass, lowest at heel strike; a run adds flight
    const hipA = Math.abs(hipAmp * Math.sin(ph));
    const drop = (THIGH + SHIN) * (1 - Math.cos(hipA)) * (1 - run * 0.4);
    const flight = run * walk * 0.07 * Math.abs(Math.cos(ph));
    const breathe = (1 - walk) * 0.006 * Math.sin((s.t || 0) * 2.2);
    pelvis.position.y = HIP_Y - drop + flight + breathe - cur.land * 0.1 - (s.seated ? 0.36 : 0);
    // lean into a run, a little hip and chest counter-twist, the head keeps looking ahead
    set(chest, 'x', lerp(0.03, 0.2, run) * walk + 0.08 * air, k);
    set(pelvis, 'y', -0.07 * walk * Math.sin(ph), k);
    set(chest, 'y', 0.12 * walk * Math.sin(ph) * lerp(1, 1.4, run), k);
    set(neck, 'y', -chest.rotation.y * 0.8 - pelvis.rotation.y, k);
    set(neck, 'x', -chest.rotation.x * 0.6, k);
    set(pelvis, 'z', 0.02 * walk * Math.sin(ph) * (1 - run), k);
  }
  function landed(v) { cur.land = Math.min(1, Math.abs(v) / 6); }
  function wave() { cur.wave = 1.5; }
  function dispose() { own.forEach((g) => g.dispose()); }
  const rig = { pelvis, chest, neck, L, R, attach, update, landed, wave, dispose };
  root.userData.rig = rig;
  return rig;
}
