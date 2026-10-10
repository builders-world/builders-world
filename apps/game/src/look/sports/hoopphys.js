import * as THREE from 'three';

// Basketball physics with no browser in it, so it can be tested on its own: the ball under gravity and
// drag, the floor, the glass, the rim as a thin steel ring, the net, and the shot that drops it in.

// court space: the hoop end at -z. Rim centre, board face, the arc
export const HOOP = { rimY: 3.05, rimR: 0.2286, rimZ: -5.42, rimTube: 0.012, boardZ: -5.8, boardW: 1.83, boardY0: 2.9, boardY1: 3.97, ballR: 0.12, arc: 6.75, cornerX: 6.6, baseZ: -7, halfZ: 7, halfW: 7.5 };
export const G = 9.81, STEP = 1 / 240;
const DRAG = 0.012;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function stepFree(b, dt) { const sp = b.v.length(); b.v.y -= G * dt; b.v.addScaledVector(b.v, -DRAG * sp * dt); b.p.addScaledVector(b.v, dt); }

// the launch velocity that drops the ball through the middle of the rim from p: a launch angle that
// steepens for closer shots, and the speed found by flying the ball (drag included) and halving the gap
export function shotVelocity(p, launchDeg = 52) {
  const dx = 0 - p.x, dz = HOOP.rimZ - p.z, d = Math.hypot(dx, dz) || 1e-3;
  const ux = dx / d, uz = dz / d, th = THREE.MathUtils.degToRad(clamp(launchDeg, 40, 75));
  const at = (sp) => {
    const b = { p: p.clone(), v: new THREE.Vector3(ux * sp * Math.cos(th), sp * Math.sin(th), uz * sp * Math.cos(th)) };
    let t = 0;
    while (t < 4) {
      const y0 = b.p.y; stepFree(b, STEP); t += STEP;
      if (y0 >= HOOP.rimY && b.p.y < HOOP.rimY && b.v.y < 0) return (b.p.x - p.x) * ux + (b.p.z - p.z) * uz;
      if (b.p.y < 0) return -1;
    }
    return -1;
  };
  let lo = 2, hi = 16;
  for (let i = 0; i < 26; i++) { const mid = (lo + hi) / 2; if (at(mid) < d) lo = mid; else hi = mid; }
  const sp = (lo + hi) / 2;
  return new THREE.Vector3(ux * sp * Math.cos(th), sp * Math.sin(th), uz * sp * Math.cos(th));
}

// one step with the floor, the glass, the rim and the net; events: floor, board, rim, score, out
export function stepBall(b, dt, emit) {
  const r = HOOP.ballR, py = b.p.y;
  stepFree(b, dt);
  // the floor
  if (b.p.y < r && b.v.y < 0) { b.p.y = r; b.v.y = -b.v.y * 0.78; b.v.x *= 0.9; b.v.z *= 0.9; if (Math.abs(b.v.y) > 0.4) emit('floor', {}); }
  // the backboard's face
  if (b.p.z - r < HOOP.boardZ && b.p.z > HOOP.boardZ - 0.3 && b.v.z < 0 && Math.abs(b.p.x) < HOOP.boardW / 2 && b.p.y > HOOP.boardY0 && b.p.y < HOOP.boardY1) {
    b.p.z = HOOP.boardZ + r; b.v.z = -b.v.z * 0.62; b.v.x *= 0.85; b.v.y *= 0.9; emit('board', {});
  }
  // the rim: a thin ring; the ball bounces off the nearest point of it
  const dx = b.p.x, dz = b.p.z - HOOP.rimZ, hd = Math.hypot(dx, dz) || 1e-6;
  const cx = (dx / hd) * HOOP.rimR, cz = HOOP.rimZ + (dz / hd) * HOOP.rimR;
  const nx = b.p.x - cx, ny = b.p.y - HOOP.rimY, nz = b.p.z - cz, nd = Math.hypot(nx, ny, nz);
  if (nd < r + HOOP.rimTube) {
    const ux = nx / nd, uy = ny / nd, uz = nz / nd, vn = b.v.x * ux + b.v.y * uy + b.v.z * uz;
    if (vn < 0) { b.v.x -= 1.55 * vn * ux; b.v.y -= 1.55 * vn * uy; b.v.z -= 1.55 * vn * uz; b.v.multiplyScalar(0.86); emit('rim', { hard: -vn }); }
    const push = r + HOOP.rimTube - nd; b.p.x += ux * push; b.p.y += uy * push; b.p.z += uz * push;
  }
  // through the hoop, downward, inside the rim: a basket
  if (py >= HOOP.rimY && b.p.y < HOOP.rimY && b.v.y < 0 && hd < HOOP.rimR - r * 0.35 && !b.scored) { b.scored = true; b.v.multiplyScalar(0.55); emit('score', {}); }
  // the pole and the padding behind the board
  if (b.p.z < HOOP.boardZ - 0.05 && b.p.z > HOOP.boardZ - 1.4 && b.p.y > HOOP.boardY1 && b.v.y < 0 && Math.abs(b.p.x) < 0.4) { b.v.y = Math.abs(b.v.y) * 0.4; }
}

export const inside3 = (x, z) => (Math.abs(x) >= HOOP.cornerX ? false : Math.hypot(x, z - HOOP.rimZ) < HOOP.arc) || (Math.abs(x) < HOOP.cornerX && z < HOOP.rimZ);
export const outOfBounds = (x, z) => Math.abs(x) > HOOP.halfW || z < HOOP.baseZ || z > HOOP.halfZ + 1.5;

