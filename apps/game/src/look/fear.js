import * as THREE from 'three';

// Fear and trust in animals (Elvis, 11 October 2026: "if animals sense danger, let them bark. If birds sense danger,
// let them fly. If they sense a friendly approach, let them stay... if I'm running towards the bird, the bird should
// fly away, or the chicken should run... a dog should feel threatened, either run away or stand its ground, where I
// have to then tame it... or just stay calm"). Every animal reads the same picture of you: how fast you are coming at
// it, how close you are, whether you are holding out food, and how far it already trusts you. Each kind answers in its
// own way (birds.js, critters.js): pigeons take off, chickens run flapping, cats slink off, goats trot away, and
// dogs either bark and hold their ground or bolt. Stand still or move slowly and they settle; corn brings the birds
// and chickens to you, a biscuit makes a dog's day.

// ---------- you, as the animals see you ----------
export const ME = { x: 0, z: 0, vx: 0, vz: 0, speed: 0, still: 0, feeding: null, feedLeft: 0 };
let px = null, pz = null;
/** each frame, from the player's position: a smoothed velocity and how long you have been still */
export function watchPlayer(dt, p) {
  if (!p || dt <= 0) return;
  if (px === null || Math.hypot(p.x - px, p.z - pz) > 8) { px = p.x; pz = p.z; } // a jump (quick travel, a door): no speed
  const k = 1 - Math.exp(-dt * 8);
  ME.vx += ((p.x - px) / dt - ME.vx) * k; ME.vz += ((p.z - pz) / dt - ME.vz) * k;
  px = p.x; pz = p.z; ME.x = p.x; ME.z = p.z;
  ME.speed = Math.hypot(ME.vx, ME.vz);
  ME.still = ME.speed < 0.5 ? ME.still + dt : 0;
  if (ME.feeding) { ME.feedLeft -= dt; if (ME.feedLeft <= 0 || ME.speed > 3.5) ME.feeding = null; }
}

/**
 * How threatening you are to an animal at (x, z), 0 (no bother) to 1 (run!).
 * wary: how jumpy this animal is (1 a pigeon's ordinary nerves, more is jumpier); trust: 0 to 1, what it has learnt of you.
 */
export function threat(x, z, { wary = 1, trust = 0, eats = null } = {}) {
  const dx = x - ME.x, dz = z - ME.z, d = Math.hypot(dx, dz) || 1e-3;
  const closing = (ME.vx * dx + ME.vz * dz) / d; // metres a second you are coming at it
  let t = 0;
  if (ME.speed > 4.2 && closing > 2 && d < 9 * wary) t = 1; // running at it
  else if (closing > 1.6 && d < 3.4 * wary) t = 0.7; // walking straight at it, close
  else if (ME.speed > 4.2 && d < 4.5 * wary) t = 0.6; // running past close by
  else if (d < 1.3 * wary && ME.still < 1.5) t = 0.45; // right up close and not settled
  // holding out something it eats, and not charging: no threat at all
  if (ME.feeding && eats && ME.feeding === eats && ME.speed < 2.2) t = Math.min(t, 0.1);
  // what it has learnt of you takes the edge off (though nothing stays put for a sprint straight at it)
  t *= 1 - Math.min(0.85, trust * 0.85);
  return { t, d, closing };
}

// ---------- food in your bag ----------
const FKEY = 'bw-feed';
const read = () => { try { return JSON.parse(localStorage.getItem(FKEY) || '{}'); } catch { return {}; } };
const write = (v) => { try { localStorage.setItem(FKEY, JSON.stringify(v)); } catch { /* storage unavailable */ } };
export const FEED = {
  corn: { name: 'corn', hold: 'You scatter a handful of corn.', none: 'No corn left. The corn sellers have cups of it for the birds.' },
  treat: { name: 'dog biscuits', hold: 'You hold out a dog biscuit.', none: 'No biscuits left. The kiosks sell them.' },
};
export const feedStock = (k) => read()[k] || 0;
export function addFeed(k, n) { const v = read(); v[k] = (v[k] || 0) + n; write(v); }
/** F: hold out food for the animals round you (corn first if there are birds or chickens about, else a biscuit) */
export function holdOutFood(prefer) {
  const order = prefer === 'treat' ? ['treat', 'corn'] : ['corn', 'treat'];
  const k = order.find((q) => feedStock(q) > 0);
  if (!k) return { ok: false, say: FEED[prefer || 'corn'].none };
  const v = read(); v[k] -= 1; write(v);
  ME.feeding = k; ME.feedLeft = 12;
  return { ok: true, kind: k, say: `${FEED[k].hold} ${feedStock(k)} left.` };
}

// ---------- trust, kept on this device ----------
const TKEY = 'bw-animal-trust';
let trustAll = null;
export function trustOf(id) { trustAll ||= (() => { try { return JSON.parse(localStorage.getItem(TKEY) || '{}'); } catch { return {}; } })(); return trustAll[id] || 0; }
let saveT = 0;
export function addTrust(id, d) {
  trustOf(id); trustAll[id] = Math.max(0, Math.min(1, (trustAll[id] || 0) + d));
  clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(TKEY, JSON.stringify(trustAll)); } catch { /* */ } }, 800);
  return trustAll[id];
}

// ---------- what an animal feels, over its head ----------
// ! alarm (barking, about to bolt), ? unsure of you, ... settling, a heart for a friend
const glyphs = new Map();
function glyphMat(ch, color) {
  const key = ch + color; if (glyphs.has(key)) return glyphs.get(key);
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  g.fillStyle = '#fffaf0'; g.strokeStyle = '#3b2a20'; g.lineWidth = 4; g.beginPath(); g.arc(32, 30, 24, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(26, 52); g.lineTo(32, 62); g.lineTo(38, 52); g.fill();
  g.fillStyle = color; g.font = '900 34px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 32, 32);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }); glyphs.set(key, m); return m;
}
export const MOOD = { alarm: ['!', '#c8402a'], unsure: ['?', '#c9871d'], settle: ['…', '#5a6f86'], friend: ['♥', '#e0457a'], food: ['✿', '#3f8a4a'] };
/** a little bubble that floats over an animal and shows its mood (null hides it) */
export function moodBubble(parent, y = 0.9) {
  const s = new THREE.Sprite(glyphMat('?', '#c9871d')); s.scale.setScalar(0.34); s.position.y = y; s.visible = false; s.renderOrder = 12; parent.add(s);
  let cur = null, hold = 0;
  return {
    set(mood, secs = 1.6) { if (!mood) return; if (mood !== cur) { s.material = glyphMat(...MOOD[mood]); cur = mood; } hold = secs; s.visible = true; },
    update(dt, t) { if (hold > 0) { hold -= dt; s.position.y = y + Math.sin(t * 5) * 0.03; if (hold <= 0) { s.visible = false; cur = null; } } },
  };
}
