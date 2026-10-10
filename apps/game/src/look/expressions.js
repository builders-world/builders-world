import * as THREE from 'three';

// Expressions and emotes (world bible 7.4 and 11.2). Every rigged person has a face: one small patch on
// the front of the head showing a cell of a face sheet drawn here on a canvas (eyes, brows, mouth,
// blush, tears, sweat), and a blink frame for each. An emote is a face, a body movement and sometimes a
// symbol over the head; there are 52, each unique in its face (checked by the emote sheet test).
// The director (createEmotes) hands them out so nobody near anybody else does the same thing at the same
// time, each person shuffles through their own bag before repeating, personality and the hour weight the
// choice, and events around people (rain, a goal, a horn, music, someone waving) set off reactions.

// ---------- the faces ----------
// eyes: dot happy closed wide sad angry squint wink heart star x spiral side up half roll teary
// brows: none flat up angry sad one knit
// mouth: smile soft grin laugh flat frown o wide smirk tongue kiss teeth wavy yawn chew pout cat whistle
// extra: blush tears stream sweat vein sparkle cold sick
const F = (eyes, brows, mouth, extra = []) => ({ eyes, brows, mouth, extra: [].concat(extra) });

// rest faces: what someone looks like between emotes, by temperament
export const REST = {
  calm: F('dot', 'flat', 'soft'),
  bright: F('dot', 'up', 'smile'),
  serious: F('dot', 'knit', 'flat'),
  tired: F('half', 'sad', 'flat'),
};

// body moves: P(joint, axis, value) blends a joint to a value; lift(m) raises the hips; u runs 0..1 over
// the emote, t is seconds. Joint conventions follow anim.js (negative shoulder x lifts the arm forward
// and up; positive R shoulder z or negative L shoulder z takes the arm out to the side).
const sin = Math.sin, abs = Math.abs;
export const BODIES = {
  wave: (P, t) => { P('R.shoulder', 'x', -2.7); P('R.shoulder', 'z', 0.35); P('R.elbow', 'x', -0.5 + 0.45 * sin(t * 14)); },
  greet: (P, t, u) => { P('chest', 'x', 0.35 * sin(Math.min(1, u * 2) * Math.PI)); P('neck', 'x', 0.25); P('R.shoulder', 'x', -1.6); P('R.elbow', 'x', -0.6 + 0.3 * sin(t * 10)); },
  bow: (P, t, u) => { const b = sin(Math.min(1, u * 1.4) * Math.PI); P('chest', 'x', 0.9 * b); P('neck', 'x', 0.3 * b); P('L.shoulder', 'x', 0.1); P('R.shoulder', 'x', 0.1); },
  laugh: (P, t) => { P('neck', 'x', -0.35); P('chest', 'x', -0.1 + 0.05 * sin(t * 22)); P('L.elbow', 'x', -0.9); P('R.elbow', 'x', -0.9); P('L.shoulder', 'x', -0.3); P('R.shoulder', 'x', -0.3); },
  giggle: (P, t) => { P('R.shoulder', 'x', -1.1); P('R.shoulder', 'z', -0.25); P('R.elbow', 'x', -2.0); P('chest', 'x', 0.15 + 0.04 * sin(t * 18)); P('neck', 'x', 0.1); P('L.shoulder', 'x', -0.4); P('L.elbow', 'x', -1.2); },
  cheer: (P, t, u, lift) => { P('L.shoulder', 'x', -2.8); P('R.shoulder', 'x', -2.8); P('L.shoulder', 'z', -0.4); P('R.shoulder', 'z', 0.4); P('L.elbow', 'x', -0.2); P('R.elbow', 'x', -0.2); lift(0.06 * abs(sin(t * 9))); },
  fistpump: (P, t) => { const k = abs(sin(t * 7)); P('R.shoulder', 'x', -1.6 - 1.0 * k); P('R.elbow', 'x', -1.6 + 1.0 * k); P('L.shoulder', 'x', -0.4); P('L.elbow', 'x', -1.4); P('chest', 'x', -0.08); },
  clap: (P, t) => { const k = sin(t * 16); P('L.shoulder', 'x', -1.1); P('R.shoulder', 'x', -1.1); P('L.shoulder', 'z', 0.25 + 0.2 * k); P('R.shoulder', 'z', -0.25 - 0.2 * k); P('L.elbow', 'x', -1.1); P('R.elbow', 'x', -1.1); },
  thumbs: (P) => { P('R.shoulder', 'x', -1.2); P('R.elbow', 'x', -1.3); P('neck', 'x', -0.1); P('neck', 'z', 0.12); },
  pray: (P) => { P('L.shoulder', 'x', -0.7); P('R.shoulder', 'x', -0.7); P('L.shoulder', 'z', 0.35); P('R.shoulder', 'z', -0.35); P('L.elbow', 'x', -1.9); P('R.elbow', 'x', -1.9); P('chest', 'x', 0.3); P('neck', 'x', 0.15); },
  shaku: (P, t, u, lift) => { const k = sin(t * 7); P('L.shoulder', 'x', -1.2 + 0.5 * k); P('R.shoulder', 'x', -1.2 - 0.5 * k); P('L.shoulder', 'z', 0.5 * k); P('R.shoulder', 'z', 0.5 * k); P('L.elbow', 'x', -1.6); P('R.elbow', 'x', -1.6); P('chest', 'x', 0.25); P('L.knee', 'x', 0.5 + 0.4 * Math.max(0, k)); P('R.knee', 'x', 0.5 + 0.4 * Math.max(0, -k)); P('L.hip', 'x', -0.3 * Math.max(0, k)); P('R.hip', 'x', -0.3 * Math.max(0, -k)); lift(-0.08); },
  zanku: (P, t, u, lift) => { const k = sin(t * 9); P('L.hip', 'x', -0.6 * Math.max(0, k)); P('L.knee', 'x', 1.0 * Math.max(0, k)); P('R.hip', 'x', -0.6 * Math.max(0, -k)); P('R.knee', 'x', 1.0 * Math.max(0, -k)); P('L.shoulder', 'x', -0.5); P('R.shoulder', 'x', -0.5); P('L.elbow', 'x', -1.3); P('R.elbow', 'x', -1.3); P('chest', 'y', 0.25 * k); lift(0.04 * abs(k)); },
  groove: (P, t, u, lift) => { const k = sin(t * 5); P('pelvis', 'z', 0.1 * k); P('chest', 'z', -0.08 * k); P('neck', 'z', 0.1 * k); P('L.shoulder', 'x', -0.5); P('R.shoulder', 'x', -0.5); P('L.elbow', 'x', -1.2 + 0.3 * k); P('R.elbow', 'x', -1.2 - 0.3 * k); lift(0.025 * abs(k)); },
  facepalm: (P, t, u) => { P('R.shoulder', 'x', -1.5); P('R.shoulder', 'z', -0.35); P('R.elbow', 'x', -2.1); P('neck', 'x', 0.35); P('chest', 'x', 0.15); P('neck', 'y', 0.12 * sin(u * 12)); },
  shrug: (P) => { P('L.shoulder', 'z', -0.55); P('R.shoulder', 'z', 0.55); P('L.elbow', 'x', -1.2); P('R.elbow', 'x', -1.2); P('L.shoulder', 'x', -0.3); P('R.shoulder', 'x', -0.3); P('neck', 'z', 0.2); },
  think: (P, t) => { P('R.shoulder', 'x', -1.0); P('R.shoulder', 'z', -0.2); P('R.elbow', 'x', -2.2); P('L.shoulder', 'x', -0.6); P('L.shoulder', 'z', 0.4); P('L.elbow', 'x', -1.4); P('neck', 'x', -0.15); P('neck', 'y', 0.25 + 0.05 * sin(t * 2)); },
  idea: (P, t, u, lift) => { P('R.shoulder', 'x', -2.6); P('R.shoulder', 'z', 0.1); P('R.elbow', 'x', -0.1); P('neck', 'x', -0.2); lift(u < 0.2 ? 0.05 * sin(u * 5 * Math.PI) : 0); },
  scratch: (P, t) => { P('R.shoulder', 'x', -2.4); P('R.shoulder', 'z', 0.3); P('R.elbow', 'x', -1.7 + 0.15 * sin(t * 16)); P('neck', 'z', -0.2); P('neck', 'x', 0.05); },
  surprise: (P, t, u) => { const k = Math.min(1, u * 6); P('L.shoulder', 'x', -1.3 * k); P('R.shoulder', 'x', -1.3 * k); P('L.shoulder', 'z', -0.5 * k); P('R.shoulder', 'z', 0.5 * k); P('L.elbow', 'x', -0.6); P('R.elbow', 'x', -0.6); P('chest', 'x', -0.2 * k); P('neck', 'x', -0.15); },
  shock: (P) => { P('L.shoulder', 'x', -1.4); P('R.shoulder', 'x', -1.4); P('L.shoulder', 'z', 0.3); P('R.shoulder', 'z', -0.3); P('L.elbow', 'x', -2.2); P('R.elbow', 'x', -2.2); P('chest', 'x', -0.12); },
  cower: (P, t, u, lift) => { P('L.shoulder', 'x', -2.0); P('R.shoulder', 'x', -2.0); P('L.shoulder', 'z', 0.4); P('R.shoulder', 'z', -0.4); P('L.elbow', 'x', -1.9); P('R.elbow', 'x', -1.9); P('chest', 'x', 0.45 + 0.03 * sin(t * 30)); P('L.knee', 'x', 0.6); P('R.knee', 'x', 0.6); P('L.hip', 'x', -0.4); P('R.hip', 'x', -0.4); lift(-0.12); },
  cry: (P, t) => { P('L.shoulder', 'x', -1.6); P('R.shoulder', 'x', -1.6); P('L.shoulder', 'z', 0.3); P('R.shoulder', 'z', -0.3); P('L.elbow', 'x', -2.2); P('R.elbow', 'x', -2.2); P('neck', 'x', 0.3 + 0.05 * sin(t * 12)); P('chest', 'x', 0.2); },
  slump: (P) => { P('chest', 'x', 0.3); P('neck', 'x', 0.45); P('L.shoulder', 'x', 0.15); P('R.shoulder', 'x', 0.15); P('L.shoulder', 'z', 0); P('R.shoulder', 'z', 0); },
  crossed: (P) => { P('L.shoulder', 'x', -0.9); P('R.shoulder', 'x', -0.9); P('L.shoulder', 'z', 0.55); P('R.shoulder', 'z', -0.55); P('L.elbow', 'x', -1.7); P('R.elbow', 'x', -1.7); P('neck', 'y', 0.35); P('neck', 'x', -0.08); },
  stomp: (P, t, u, lift) => { const k = Math.max(0, sin(t * 10)); P('R.hip', 'x', -0.5 * k); P('R.knee', 'x', 0.7 * k); P('L.shoulder', 'x', 0.3); P('R.shoulder', 'x', 0.3); P('L.shoulder', 'z', -0.25); P('R.shoulder', 'z', 0.25); P('L.elbow', 'x', -0.5); P('R.elbow', 'x', -0.5); P('chest', 'x', 0.15); lift(0.02 * k); },
  hips: (P, t) => { P('L.shoulder', 'z', -0.55); P('R.shoulder', 'z', 0.55); P('L.elbow', 'x', -1.4); P('R.elbow', 'x', -1.4); P('L.shoulder', 'x', 0.25); P('R.shoulder', 'x', 0.25); P('pelvis', 'z', 0.08); P('neck', 'z', -0.12 + 0.05 * sin(t * 3)); },
  eyeroll: (P, t, u) => { P('neck', 'z', 0.3 * sin(u * Math.PI)); P('neck', 'x', -0.25 * sin(u * Math.PI)); P('L.shoulder', 'z', -0.2); P('R.shoulder', 'z', 0.2); },
  point: (P, t) => { P('R.shoulder', 'x', -1.55); P('R.shoulder', 'z', 0.05); P('R.elbow', 'x', -0.05); P('chest', 'y', -0.2); P('neck', 'y', 0.05 * sin(t * 6)); },
  beckon: (P, t) => { P('R.shoulder', 'x', -1.3); P('R.elbow', 'x', -0.6 - 0.9 * abs(sin(t * 6))); P('neck', 'z', 0.1); },
  stop: (P) => { P('R.shoulder', 'x', -1.55); P('R.elbow', 'x', -0.35); P('L.shoulder', 'x', 0.1); P('chest', 'x', -0.08); P('neck', 'x', -0.08); },
  nod: (P, t) => { P('neck', 'x', 0.3 * abs(sin(t * 7))); },
  headshake: (P, t) => { P('neck', 'y', 0.45 * sin(t * 9)); P('L.shoulder', 'x', 0.1); },
  salute: (P) => { P('R.shoulder', 'x', -1.4); P('R.shoulder', 'z', 0.9); P('R.elbow', 'x', -2.2); P('chest', 'x', -0.1); P('neck', 'x', -0.08); },
  yawn: (P, t, u) => { const k = sin(Math.min(1, u * 1.2) * Math.PI); P('L.shoulder', 'x', -3.0 * k); P('R.shoulder', 'x', -1.3 * k); P('R.elbow', 'x', -2.0 * k); P('neck', 'x', -0.35 * k); P('chest', 'x', -0.15 * k); },
  doze: (P, t) => { P('neck', 'x', 0.55 + 0.08 * sin(t * 1.3)); P('chest', 'x', 0.18); P('L.shoulder', 'x', 0.1); P('R.shoulder', 'x', 0.1); },
  shiver: (P, t) => { P('L.shoulder', 'x', -0.9); P('R.shoulder', 'x', -0.9); P('L.shoulder', 'z', 0.6); P('R.shoulder', 'z', -0.6); P('L.elbow', 'x', -1.8); P('R.elbow', 'x', -1.8); P('chest', 'y', 0.06 * sin(t * 40)); P('chest', 'x', 0.2); P('neck', 'x', 0.2); },
  fan: (P, t) => { P('R.shoulder', 'x', -1.4); P('R.shoulder', 'z', -0.15 + 0.25 * sin(t * 14)); P('R.elbow', 'x', -1.6); P('neck', 'x', -0.25); P('L.shoulder', 'z', -0.15); },
  heart: (P) => { P('L.shoulder', 'x', -1.9); P('R.shoulder', 'x', -1.9); P('L.shoulder', 'z', 0.35); P('R.shoulder', 'z', -0.35); P('L.elbow', 'x', -1.4); P('R.elbow', 'x', -1.4); P('neck', 'z', 0.15); },
  kiss: (P, t, u) => { const out = u > 0.45; P('R.shoulder', 'x', out ? -1.9 : -1.4); P('R.shoulder', 'z', out ? 0.4 : -0.3); P('R.elbow', 'x', out ? -0.2 : -2.2); P('neck', 'z', 0.15); },
  guns: (P, t) => { const k = abs(sin(t * 5)); P('L.shoulder', 'x', -1.45 - 0.2 * k); P('R.shoulder', 'x', -1.45 - 0.2 * k); P('L.shoulder', 'z', -0.15); P('R.shoulder', 'z', 0.15); P('L.elbow', 'x', -0.15); P('R.elbow', 'x', -0.15); P('chest', 'x', -0.08); P('neck', 'z', 0.15); },
  peace: (P) => { P('R.shoulder', 'x', -2.2); P('R.shoulder', 'z', 0.5); P('R.elbow', 'x', -1.2); P('neck', 'z', 0.18); P('pelvis', 'z', 0.05); },
  proud: (P, t) => { P('L.shoulder', 'z', -0.55); P('R.shoulder', 'z', 0.55); P('L.elbow', 'x', -1.4); P('R.elbow', 'x', -1.4); P('L.shoulder', 'x', 0.25); P('R.shoulder', 'x', 0.25); P('chest', 'x', -0.2); P('neck', 'x', -0.25 + 0.03 * sin(t * 2)); },
  victory: (P, t, u, lift) => { const k = abs(sin(t * 6)); P('L.shoulder', 'x', -2.5); P('R.shoulder', 'x', -2.5); P('L.shoulder', 'z', -0.7); P('R.shoulder', 'z', 0.7); P('L.elbow', 'x', -1.0); P('R.elbow', 'x', -1.0); P('chest', 'x', -0.2); lift(0.03 * k); },
  starry: (P, t) => { P('L.shoulder', 'x', -1.2); P('R.shoulder', 'x', -1.2); P('L.shoulder', 'z', 0.35); P('R.shoulder', 'z', -0.35); P('L.elbow', 'x', -1.6); P('R.elbow', 'x', -1.6); P('chest', 'x', -0.1); P('pelvis', 'z', 0.06 * sin(t * 3)); },
  dizzy: (P, t, u, lift) => { P('pelvis', 'z', 0.12 * sin(t * 3)); P('chest', 'z', 0.1 * sin(t * 3 + 1)); P('neck', 'z', 0.2 * sin(t * 3 + 2)); P('L.shoulder', 'z', -0.4); P('R.shoulder', 'z', 0.4); lift(-0.03); },
  sneeze: (P, t, u) => { const pre = u < 0.55, k = pre ? u / 0.55 : 1 - (u - 0.55) / 0.45; P('neck', 'x', pre ? -0.45 * k : 0.5 * k); P('chest', 'x', pre ? -0.2 * k : 0.45 * k); P('R.shoulder', 'x', -1.3); P('R.elbow', 'x', -2.2); },
  chop: (P, t) => { const k = abs(sin(t * 5)); P('R.shoulder', 'x', -0.8 - 0.6 * k); P('R.elbow', 'x', -1.4 - 0.7 * k); P('L.shoulder', 'x', -0.6); P('L.elbow', 'x', -1.5); P('neck', 'x', 0.1); },
  drink: (P, t, u) => { const k = sin(Math.min(1, u * 1.3) * Math.PI); P('R.shoulder', 'x', -1.4 - 0.9 * k); P('R.elbow', 'x', -2.0); P('neck', 'x', -0.5 * k); },
  call: (P, t) => { P('R.shoulder', 'x', -0.8); P('R.shoulder', 'z', -0.1); P('R.elbow', 'x', -2.4); P('neck', 'z', 0.15); P('L.shoulder', 'x', -0.4 + 0.3 * sin(t * 3)); P('L.elbow', 'x', -1.0); },
  haggle: (P, t) => { const k = sin(t * 8); P('R.shoulder', 'x', -1.3 - 0.4 * k); P('R.elbow', 'x', -1.0); P('L.shoulder', 'x', -1.0); P('L.elbow', 'x', -1.4); P('chest', 'x', 0.12); P('neck', 'z', 0.1 * k); },
  mtchew: (P, t, u) => { const k = Math.min(1, u * 3); P('R.shoulder', 'x', -0.8 * k); P('R.shoulder', 'z', 0.5 * k * (u > 0.5 ? 1 : 0.3)); P('R.elbow', 'x', -0.9); P('neck', 'y', -0.5 * k); P('neck', 'x', -0.12); P('chest', 'y', -0.15 * k); },
  ehen: (P, t) => { const k = abs(sin(t * 8)); P('L.shoulder', 'x', -1.4 - 0.15 * k); P('R.shoulder', 'x', -1.4 - 0.15 * k); P('L.elbow', 'x', -0.3); P('R.elbow', 'x', -0.3); P('chest', 'x', 0.1); P('neck', 'x', -0.1 + 0.15 * k); },
  oya: (P, t) => { const k = sin(t * 6); P('R.shoulder', 'x', -1.2 + 0.9 * k); P('R.elbow', 'x', -0.5); P('chest', 'y', 0.15 * k); P('neck', 'y', 0.3); },
  welldone: (P, t) => { P('R.shoulder', 'x', -2.2); P('R.shoulder', 'z', 0.15); P('R.elbow', 'x', -0.8); P('neck', 'x', 0.1 + 0.1 * abs(sin(t * 4))); P('chest', 'x', 0.12); },
  jump: (P, t, u, lift) => { const k = abs(sin(t * 6)); P('L.shoulder', 'x', -2.6); P('R.shoulder', 'x', -2.6); P('L.shoulder', 'z', -0.5); P('R.shoulder', 'z', 0.5); P('L.knee', 'x', 0.9 * k); P('R.knee', 'x', 0.9 * k); P('L.hip', 'x', -0.5 * k); P('R.hip', 'x', -0.5 * k); lift(0.45 * k); },
  sigh: (P, t, u) => { const k = sin(u * Math.PI); P('L.shoulder', 'z', -0.05 + 0.12 * k); P('R.shoulder', 'z', 0.05 - 0.12 * k); P('chest', 'x', 0.1 + 0.1 * k); P('neck', 'x', -0.25 * (1 - k) + 0.3 * k); },
  fidget: (P, t) => { P('L.shoulder', 'x', -0.7); P('R.shoulder', 'x', -0.7); P('L.shoulder', 'z', 0.3); P('R.shoulder', 'z', -0.3); P('L.elbow', 'x', -1.5 + 0.2 * sin(t * 13)); P('R.elbow', 'x', -1.5 - 0.2 * sin(t * 11)); P('neck', 'y', 0.3 * sin(t * 2.5)); P('pelvis', 'z', 0.04 * sin(t * 5)); },
  shush: (P) => { P('R.shoulder', 'x', -1.35); P('R.shoulder', 'z', -0.32); P('R.elbow', 'x', -2.15); P('chest', 'x', 0.1); P('neck', 'x', 0.05); },
  listen: (P, t) => { P('R.shoulder', 'x', -1.0); P('R.shoulder', 'z', 0.75); P('R.elbow', 'x', -2.3); P('neck', 'z', -0.25); P('chest', 'z', -0.1 + 0.03 * sin(t * 3)); },
  smug: (P, t) => { P('L.shoulder', 'z', -0.55); P('L.elbow', 'x', -1.4); P('L.shoulder', 'x', 0.25); P('R.shoulder', 'x', -0.9); P('R.shoulder', 'z', -0.5); P('R.elbow', 'x', -1.6); P('neck', 'x', -0.3); P('neck', 'y', -0.2 + 0.04 * sin(t * 2)); P('chest', 'x', -0.12); },
  cheeky: (P, t) => { P('neck', 'z', 0.25 * sin(t * 4)); P('L.shoulder', 'x', -0.3); P('R.shoulder', 'x', -0.3); P('L.elbow', 'x', -1.0); P('R.elbow', 'x', -1.0); P('pelvis', 'z', 0.05 * sin(t * 4)); },
};

// the props some emotes hold in the right hand
const PROP = { phone: [0x22262c, [0.05, 0.1, 0.012]], bottle: [0x2f8a5a, [0.05, 0.16, 0.05]], fan: [0xe46f4f, [0.16, 0.12, 0.01]], corn: [0xe0b23a, [0.04, 0.13, 0.04]] };

// The emotes. id is at most 8 characters (presence carries it to other players); emoji is the chat bubble;
// tags: moods for choosing; full: needs the legs (only when standing still); sym: a symbol over the head.
export const EMOTES = [
  { id: 'wave', name: 'Wave', emoji: '👋', face: F('dot', 'up', 'smile', 'blush'), body: 'wave', dur: 1.8, tags: ['greet'] },
  { id: 'ekaaro', name: 'E kaaro (greeting)', emoji: '🙇', face: F('happy', 'up', 'soft', 'blush'), body: 'greet', dur: 2.2, tags: ['greet', 'morning', 'polite'] },
  { id: 'bow', name: 'Bow', emoji: '🙇', face: F('closed', 'flat', 'soft'), body: 'bow', dur: 2.0, tags: ['polite'], full: true },
  { id: 'welldone', name: 'Well done', emoji: '🙌', face: F('dot', 'up', 'grin'), body: 'welldone', dur: 2.0, tags: ['greet', 'polite', 'work'] },
  { id: 'laugh', name: 'Laugh', emoji: '😂', face: F('happy', 'up', 'laugh'), face2: F('happy', 'up', 'grin'), body: 'laugh', dur: 2.2, tags: ['happy', 'funny'] },
  { id: 'giggle', name: 'Giggle', emoji: '🤭', face: F('happy', 'sad', 'cat', 'blush'), body: 'giggle', dur: 1.9, tags: ['happy', 'funny', 'shy'] },
  { id: 'cheer', name: 'Cheer', emoji: '🙌', face: F('wide', 'up', 'laugh'), body: 'cheer', dur: 2.0, tags: ['happy', 'win'] },
  { id: 'fistpump', name: 'Fist pump', emoji: '💪', face: F('squint', 'angry', 'grin'), body: 'fistpump', dur: 1.8, tags: ['win', 'work'] },
  { id: 'clap', name: 'Clap', emoji: '👏', face: F('happy', 'flat', 'smile'), body: 'clap', dur: 2.0, tags: ['happy', 'win', 'polite'] },
  { id: 'thumbs', name: 'Thumbs up', emoji: '👍', face: F('wink', 'one', 'smirk'), body: 'thumbs', dur: 1.6, tags: ['happy', 'polite', 'work'] },
  { id: 'thanks', name: 'Thank you', emoji: '🙏', face: F('closed', 'sad', 'smile'), body: 'pray', dur: 2.0, tags: ['polite', 'grateful'] },
  { id: 'shaku', name: 'Shaku shaku', emoji: '🕺', face: F('happy', 'angry', 'teeth'), body: 'shaku', dur: 3.6, tags: ['dance', 'happy', 'music'], full: true },
  { id: 'zanku', name: 'Zanku legwork', emoji: '💃', face: F('half', 'up', 'tongue'), body: 'zanku', dur: 3.6, tags: ['dance', 'music'], full: true },
  { id: 'groove', name: 'Groove', emoji: '🎶', face: F('closed', 'up', 'whistle'), body: 'groove', dur: 3.2, tags: ['dance', 'music', 'calm'], sym: 'note' },
  { id: 'facepalm', name: 'Facepalm', emoji: '🤦', face: F('closed', 'knit', 'frown'), body: 'facepalm', dur: 2.0, tags: ['annoyed', 'oops'] },
  { id: 'shrug', name: 'Shrug', emoji: '🤷', face: F('side', 'one', 'smirk'), body: 'shrug', dur: 1.8, tags: ['unsure', 'oops'] },
  { id: 'think', name: 'Think', emoji: '🤔', face: F('up', 'one', 'pout'), body: 'think', dur: 2.6, tags: ['unsure', 'work', 'calm'], sym: 'dots' },
  { id: 'idea', name: 'Idea!', emoji: '💡', face: F('wide', 'up', 'grin', 'sparkle'), body: 'idea', dur: 1.8, tags: ['work', 'happy'], sym: 'bulb' },
  { id: 'confused', name: 'Confused', emoji: '😕', face: F('squint', 'one', 'wavy'), body: 'scratch', dur: 2.0, tags: ['unsure'], sym: 'q' },
  { id: 'surprise', name: 'Surprised', emoji: '😮', face: F('wide', 'up', 'o'), body: 'surprise', dur: 1.6, tags: ['surprise', 'loud'], sym: 'bang' },
  { id: 'shock', name: 'Shocked', emoji: '😱', face: F('wide', 'up', 'wide', 'sweat'), body: 'shock', dur: 1.8, tags: ['surprise', 'scared', 'loud'] },
  { id: 'scared', name: 'Scared', emoji: '😨', face: F('teary', 'sad', 'teeth', ['sweat', 'cold']), body: 'cower', dur: 2.0, tags: ['scared', 'storm'], full: true },
  { id: 'cry', name: 'Cry', emoji: '😭', face: F('closed', 'sad', 'wide', 'stream'), body: 'cry', dur: 2.4, tags: ['sad'] },
  { id: 'sad', name: 'Sad', emoji: '😞', face: F('sad', 'sad', 'frown', 'tears'), body: 'slump', dur: 2.6, tags: ['sad', 'tired'] },
  { id: 'sulk', name: 'Sulk', emoji: '😤', face: F('side', 'knit', 'pout'), body: 'crossed', dur: 2.6, tags: ['annoyed', 'sad'] },
  { id: 'angry', name: 'Angry', emoji: '😠', face: F('angry', 'angry', 'teeth', 'vein'), body: 'stomp', dur: 1.8, tags: ['annoyed', 'loud', 'traffic'], sym: 'steam' },
  { id: 'annoyed', name: 'Annoyed', emoji: '😒', face: F('half', 'knit', 'flat'), body: 'hips', dur: 2.2, tags: ['annoyed', 'traffic'] },
  { id: 'eyeroll', name: 'Eye roll', emoji: '🙄', face: F('roll', 'flat', 'smirk'), body: 'eyeroll', dur: 1.8, tags: ['annoyed', 'funny'] },
  { id: 'point', name: 'Point', emoji: '👉', face: F('dot', 'up', 'o'), body: 'point', dur: 1.8, tags: ['look', 'surprise'] },
  { id: 'beckon', name: 'Come here', emoji: '🫴', face: F('wink', 'up', 'smile'), body: 'beckon', dur: 1.8, tags: ['greet', 'friendly'] },
  { id: 'stop', name: 'Wait!', emoji: '✋', face: F('dot', 'angry', 'flat'), body: 'stop', dur: 1.6, tags: ['annoyed', 'traffic'] },
  { id: 'nod', name: 'Nod', emoji: '🙂', face: F('dot', 'flat', 'smile', 'blush'), body: 'nod', dur: 1.5, tags: ['polite', 'calm', 'agree'] },
  { id: 'nope', name: 'No no', emoji: '🙅', face: F('closed', 'angry', 'frown'), body: 'headshake', dur: 1.6, tags: ['annoyed', 'disagree'] },
  { id: 'salute', name: 'Salute', emoji: '🫡', face: F('squint', 'flat', 'flat', 'sparkle'), body: 'salute', dur: 1.8, tags: ['polite', 'work'] },
  { id: 'yawn', name: 'Yawn', emoji: '🥱', face: F('closed', 'sad', 'yawn'), body: 'yawn', dur: 2.4, tags: ['tired', 'night'] },
  { id: 'sleepy', name: 'Sleepy', emoji: '😴', face: F('closed', 'flat', 'o'), body: 'doze', dur: 3.2, tags: ['tired', 'night'], sym: 'zzz' },
  { id: 'shiver', name: 'Cold', emoji: '🥶', face: F('x', 'sad', 'teeth', 'cold'), body: 'shiver', dur: 2.4, tags: ['rain', 'cold'] },
  { id: 'fanself', name: 'Too hot', emoji: '🥵', face: F('half', 'sad', 'tongue', ['sweat', 'blush']), body: 'fan', dur: 2.4, tags: ['hot'], prop: 'fan' },
  { id: 'love', name: 'Love it', emoji: '😍', face: F('heart', 'up', 'grin', 'blush'), body: 'heart', dur: 2.0, tags: ['happy', 'love', 'food'], sym: 'heart' },
  { id: 'kiss', name: 'Blow a kiss', emoji: '😘', face: F('wink', 'up', 'kiss', 'blush'), body: 'kiss', dur: 1.8, tags: ['love', 'friendly'], sym: 'heart' },
  { id: 'guns', name: 'Finger guns', emoji: '😎', face: F('wink', 'one', 'grin'), body: 'guns', dur: 1.6, tags: ['funny', 'friendly'] },
  { id: 'peace', name: 'Peace', emoji: '✌️', face: F('happy', 'flat', 'tongue'), body: 'peace', dur: 1.8, tags: ['happy', 'friendly'] },
  { id: 'proud', name: 'Proud', emoji: '😌', face: F('closed', 'up', 'smirk', 'sparkle'), body: 'proud', dur: 2.2, tags: ['win', 'work'] },
  { id: 'victory', name: 'Victory', emoji: '🏆', face: F('star', 'up', 'laugh'), body: 'victory', dur: 2.0, tags: ['win'], sym: 'sparks' },
  { id: 'starry', name: 'Starstruck', emoji: '🤩', face: F('star', 'up', 'o', 'blush'), body: 'starry', dur: 2.2, tags: ['surprise', 'love'] },
  { id: 'dizzy', name: 'Dizzy', emoji: '😵‍💫', face: F('spiral', 'flat', 'wavy', 'sick'), body: 'dizzy', dur: 2.4, tags: ['oops', 'hot'] },
  { id: 'achoo', name: 'Sneeze', emoji: '🤧', face: F('closed', 'knit', 'wide', 'blush'), body: 'sneeze', dur: 1.8, tags: ['rain', 'cold'] },
  { id: 'chop', name: 'Eat', emoji: '😋', face: F('happy', 'up', 'chew'), body: 'chop', dur: 2.4, tags: ['food', 'happy'], prop: 'corn' },
  { id: 'drink', name: 'Drink', emoji: '🥤', face: F('closed', 'up', 'kiss'), body: 'drink', dur: 2.0, tags: ['food', 'hot'], prop: 'bottle' },
  { id: 'call', name: 'On the phone', emoji: '📱', face: F('side', 'up', 'laugh'), face2: F('side', 'up', 'o'), body: 'call', dur: 3.6, tags: ['work', 'calm'], prop: 'phone' },
  { id: 'haggle', name: 'How much?', emoji: '💸', face: F('squint', 'knit', 'o'), face2: F('squint', 'knit', 'flat'), body: 'haggle', dur: 2.2, tags: ['food', 'market'] },
  { id: 'mtchew', name: 'Mtchew', emoji: '😏', face: F('side', 'angry', 'pout'), body: 'mtchew', dur: 1.9, tags: ['annoyed', 'traffic', 'funny'] },
  { id: 'ehen', name: 'Ehen!', emoji: '☝️', face: F('wide', 'one', 'laugh'), body: 'ehen', dur: 1.8, tags: ['agree', 'funny', 'loud'] },
  { id: 'oya', name: 'Oya, let\'s go', emoji: '🏃', face: F('wide', 'flat', 'grin'), body: 'oya', dur: 1.8, tags: ['friendly', 'work'] },
  { id: 'jump', name: 'Jump for joy', emoji: '🥳', face: F('happy', 'up', 'wide', 'sparkle'), body: 'jump', dur: 1.8, tags: ['win', 'happy'], full: true, sym: 'sparks' },
  { id: 'sigh', name: 'Sigh', emoji: '😮‍💨', face: F('half', 'sad', 'o'), body: 'sigh', dur: 2.2, tags: ['tired', 'sad', 'traffic'] },
  { id: 'nervous', name: 'Nervous', emoji: '😬', face: F('side', 'sad', 'teeth', 'sweat'), body: 'fidget', dur: 2.6, tags: ['scared', 'unsure'] },
  { id: 'smug', name: 'Smug', emoji: '😏', face: F('half', 'one', 'smirk'), body: 'smug', dur: 2.2, tags: ['funny', 'win'] },
  { id: 'cheeky', name: 'Cheeky', emoji: '😜', face: F('wink', 'up', 'tongue'), body: 'cheeky', dur: 1.8, tags: ['funny', 'friendly'] },
  { id: 'shush', name: 'Shh', emoji: '🤫', face: F('squint', 'up', 'kiss'), body: 'shush', dur: 1.8, tags: ['calm', 'funny'] },
  { id: 'listen', name: 'Listen', emoji: '👂', face: F('side', 'one', 'o'), body: 'listen', dur: 2.0, tags: ['look', 'music'] },
];
export const BY_ID = Object.fromEntries(EMOTES.map((e) => [e.id, e]));
// your number keys: the six most used
export const QUICK = ['wave', 'laugh', 'thumbs', 'cheer', 'thanks', 'shaku'];

// ---------- the face sheet: one canvas, every face twice (eyes open, mid-blink) ----------
const CELL = 96, COLS = 16;
const faceKey = (f) => `${f.eyes}|${f.brows}|${f.mouth}|${f.extra.join(',')}`;
const FACES = []; const FACE_AT = new Map();
const addFace = (f) => { const k = faceKey(f); if (!FACE_AT.has(k)) { FACE_AT.set(k, FACES.length); FACES.push(f); } return FACE_AT.get(k); };
Object.values(REST).forEach(addFace);
EMOTES.forEach((e) => { e.cell = addFace(e.face); if (e.face2) e.cell2 = addFace(e.face2); });
const ROWS = Math.ceil((FACES.length * 2) / COLS);
export const faceSheetInfo = () => ({ faces: FACES.length, cols: COLS, rows: ROWS, cell: CELL });

const INK = '#2a1d17', WHITE = '#fffaf0';
function drawFace(g, f, blink, fem) {
  // the face area: eyes about 44% down the cell, 17 px either side; the mouth about 80% down
  const ex = 17, ey = 44, my = 77, cx = CELL / 2;
  g.lineCap = 'round'; g.lineJoin = 'round';
  const eye = (s) => {
    const x = cx + s * ex;
    let kind = f.eyes;
    if (blink && !['closed', 'happy', 'x', 'spiral', 'heart', 'star', 'squint'].includes(kind)) kind = 'closed';
    if (kind === 'wink') kind = s > 0 ? 'happy' : (blink ? 'closed' : 'dot');
    g.fillStyle = INK; g.strokeStyle = INK; g.lineWidth = 3.4;
    const dot = (rx, ry, ox = 0, oy = 0) => { g.beginPath(); g.ellipse(x + ox, ey + oy, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = WHITE; g.beginPath(); g.arc(x + ox + rx * 0.35, ey + oy - ry * 0.4, Math.max(1, rx * 0.32), 0, Math.PI * 2); g.fill(); g.fillStyle = INK; };
    switch (kind) {
      case 'dot': dot(3.6, 5.2); break;
      case 'wide': g.fillStyle = WHITE; g.beginPath(); g.ellipse(x, ey, 7, 8, 0, 0, 7); g.fill(); g.lineWidth = 2; g.stroke(); g.fillStyle = INK; dot(3.4, 4.2); break;
      case 'teary': g.fillStyle = WHITE; g.beginPath(); g.ellipse(x, ey, 6.5, 7.5, 0, 0, 7); g.fill(); g.lineWidth = 2; g.stroke(); g.fillStyle = INK; dot(4.4, 5.4, 0, 1); g.fillStyle = 'rgba(120,190,255,.8)'; g.beginPath(); g.ellipse(x, ey + 7, 6, 2.2, 0, 0, 7); g.fill(); break;
      case 'happy': g.beginPath(); g.arc(x, ey + 3, 5.5, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); break;
      case 'closed': g.beginPath(); g.moveTo(x - 5.5, ey + 1); g.quadraticCurveTo(x, ey + 4, x + 5.5, ey + 1); g.stroke(); break;
      case 'sad': dot(3.4, 4.6, 0, 1); g.lineWidth = 2.6; g.beginPath(); g.moveTo(x - s * 6, ey - 6); g.lineTo(x + s * 5, ey - 2.5); g.stroke(); break;
      case 'angry': dot(3.4, 4.2, 0, 1.2); g.lineWidth = 3; g.beginPath(); g.moveTo(x - s * 6, ey - 3); g.lineTo(x + s * 5, ey - 6.5); g.stroke(); break;
      case 'squint': g.beginPath(); g.moveTo(x - s * 5, ey - 4); g.lineTo(x + s * 4, ey); g.lineTo(x - s * 5, ey + 4); g.stroke(); break;
      case 'heart': g.fillStyle = '#e2384f'; g.beginPath(); g.moveTo(x, ey + 6); g.bezierCurveTo(x - 9, ey - 1, x - 5, ey - 8, x, ey - 3); g.bezierCurveTo(x + 5, ey - 8, x + 9, ey - 1, x, ey + 6); g.fill(); break;
      case 'star': { g.fillStyle = '#f2b33d'; g.strokeStyle = '#a8701a'; g.lineWidth = 1.2; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 3 : 7.5, a = -Math.PI / 2 + k * Math.PI / 5; g.lineTo(x + Math.cos(a) * r, ey + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); break; }
      case 'x': g.lineWidth = 3; g.beginPath(); g.moveTo(x - 4.5, ey - 4.5); g.lineTo(x + 4.5, ey + 4.5); g.moveTo(x + 4.5, ey - 4.5); g.lineTo(x - 4.5, ey + 4.5); g.stroke(); break;
      case 'spiral': g.lineWidth = 2; g.beginPath(); for (let a = 0; a < Math.PI * 5; a += 0.2) g.lineTo(x + Math.cos(a * s) * a * 0.45, ey + Math.sin(a * s) * a * 0.45); g.stroke(); break;
      case 'side': dot(3.4, 5, 2.6, 0); break;
      case 'up': dot(3.4, 4.6, 0.5, -2.6); break;
      case 'roll': g.fillStyle = WHITE; g.beginPath(); g.ellipse(x, ey, 6, 6.5, 0, 0, 7); g.fill(); g.lineWidth = 1.8; g.stroke(); g.fillStyle = INK; g.beginPath(); g.ellipse(x + s * 1.5, ey - 4.2, 3.4, 2.2, 0, 0, 7); g.fill(); break;
      case 'half': g.beginPath(); g.ellipse(x, ey + 1.5, 3.8, 3.2, 0, 0, Math.PI); g.fill(); g.lineWidth = 2.6; g.beginPath(); g.moveTo(x - 5.5, ey + 1.2); g.lineTo(x + 5.5, ey + 1.2); g.stroke(); break;
      default: dot(3.6, 5.2);
    }
    if (fem && !['heart', 'star', 'x', 'spiral'].includes(kind)) { g.lineWidth = 2; g.strokeStyle = INK; g.beginPath(); g.moveTo(x + s * 5, ey - 3); g.lineTo(x + s * 8.5, ey - 6); g.stroke(); }
  };
  eye(-1); eye(1);
  // brows
  const by = 29; g.strokeStyle = INK; g.lineWidth = 3;
  // a > 0 lifts the inner end (worried), a < 0 drops it (cross); the inner end is the one nearer the nose
  const brow = (s, a, dy = 0) => { const x = cx + s * ex, inner = x - s * 6, outer = x + s * 6; g.beginPath(); g.moveTo(outer, by + dy + a * 4); g.lineTo(inner, by + dy - a * 4); g.stroke(); };
  switch (f.brows) {
    case 'flat': brow(-1, 0); brow(1, 0); break;
    case 'up': brow(-1, 0, -5); brow(1, 0, -5); break;
    case 'angry': brow(-1, -1, 2); brow(1, -1, 2); break; // inner ends down
    case 'sad': brow(-1, 0.9, -1); brow(1, 0.9, -1); break; // inner ends up
    case 'one': brow(-1, 0, 0); brow(1, -0.4, -7); break;
    case 'knit': brow(-1, -0.6, 3); brow(1, -0.6, 3); g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 2, by + 3); g.lineTo(cx - 1, by + 7); g.moveTo(cx + 2, by + 3); g.lineTo(cx + 1, by + 7); g.stroke(); break;
    default: break;
  }
  // mouth
  const lip = fem ? '#8a3340' : INK, red = '#b8333f', tongue = '#e86a7a';
  g.strokeStyle = lip; g.fillStyle = INK; g.lineWidth = 3;
  const opening = (w, h, oy = 0, teeth = false, tng = false) => { g.fillStyle = '#4a1a1a'; g.beginPath(); g.ellipse(cx, my + oy, w, h, 0, 0, Math.PI * 2); g.fill(); if (teeth) { g.save(); g.clip(); g.fillStyle = WHITE; g.fillRect(cx - w, my + oy - h, w * 2, h * 0.45); g.restore(); } if (tng) { g.save(); g.beginPath(); g.ellipse(cx, my + oy, w, h, 0, 0, 7); g.clip(); g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, my + oy + h * 0.75, w * 0.7, h * 0.55, 0, 0, 7); g.fill(); g.restore(); } g.lineWidth = fem ? 2.4 : 1.6; g.strokeStyle = lip; g.beginPath(); g.ellipse(cx, my + oy, w, h, 0, 0, Math.PI * 2); g.stroke(); };
  switch (f.mouth) {
    case 'smile': g.beginPath(); g.arc(cx, my - 8, 10, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); break;
    case 'soft': g.beginPath(); g.arc(cx, my - 12, 12, Math.PI * 0.35, Math.PI * 0.65); g.stroke(); break;
    case 'grin': g.fillStyle = '#4a1a1a'; g.beginPath(); g.moveTo(cx - 11, my - 3); g.quadraticCurveTo(cx, my + 1, cx + 11, my - 3); g.quadraticCurveTo(cx, my + 12, cx - 11, my - 3); g.fill(); g.fillStyle = WHITE; g.beginPath(); g.moveTo(cx - 10, my - 2.6); g.quadraticCurveTo(cx, my + 1.2, cx + 10, my - 2.6); g.lineTo(cx + 8, my + 1.5); g.quadraticCurveTo(cx, my + 4, cx - 8, my + 1.5); g.fill(); g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx - 11, my - 3); g.quadraticCurveTo(cx, my + 1, cx + 11, my - 3); g.quadraticCurveTo(cx, my + 12, cx - 11, my - 3); g.stroke(); break;
    case 'laugh': g.fillStyle = '#4a1a1a'; g.beginPath(); g.moveTo(cx - 12, my - 4); g.lineTo(cx + 12, my - 4); g.quadraticCurveTo(cx + 11, my + 13, cx, my + 13); g.quadraticCurveTo(cx - 11, my + 13, cx - 12, my - 4); g.fill(); g.fillStyle = WHITE; g.fillRect(cx - 11, my - 4, 22, 3.5); g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, my + 9, 6, 3.5, 0, 0, 7); g.fill(); g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx - 12, my - 4); g.lineTo(cx + 12, my - 4); g.quadraticCurveTo(cx + 11, my + 13, cx, my + 13); g.quadraticCurveTo(cx - 11, my + 13, cx - 12, my - 4); g.stroke(); break;
    case 'flat': g.beginPath(); g.moveTo(cx - 7, my); g.lineTo(cx + 7, my); g.stroke(); break;
    case 'frown': g.beginPath(); g.arc(cx, my + 9, 9, Math.PI * 1.22, Math.PI * 1.78); g.stroke(); break;
    case 'o': opening(4, 5); break;
    case 'wide': opening(7, 9, 2); break;
    case 'yawn': opening(6, 11, 3, false, true); break;
    case 'smirk': g.beginPath(); g.moveTo(cx - 7, my + 1); g.quadraticCurveTo(cx + 3, my + 2, cx + 9, my - 4); g.stroke(); break;
    case 'tongue': g.beginPath(); g.arc(cx, my - 8, 10, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); g.fillStyle = tongue; g.beginPath(); g.ellipse(cx + 3, my + 4, 4.5, 5, 0, 0, 7); g.fill(); g.lineWidth = 1.4; g.strokeStyle = '#a8394a'; g.beginPath(); g.moveTo(cx + 3, my + 1.5); g.lineTo(cx + 3, my + 6); g.stroke(); break;
    case 'kiss': g.fillStyle = fem ? red : '#9a3a44'; g.beginPath(); g.ellipse(cx + 1, my, 4, 3.4, 0, 0, 7); g.fill(); g.fillStyle = '#4a1a1a'; g.beginPath(); g.ellipse(cx + 1, my, 1.6, 1.4, 0, 0, 7); g.fill(); break;
    case 'teeth': g.fillStyle = WHITE; g.beginPath(); g.roundRect(cx - 10, my - 4, 20, 9, 3); g.fill(); g.lineWidth = 1.6; g.strokeStyle = INK; g.stroke(); g.beginPath(); g.moveTo(cx - 10, my + 0.5); g.lineTo(cx + 10, my + 0.5); for (let k = -6; k <= 6; k += 4) { g.moveTo(cx + k, my - 4); g.lineTo(cx + k, my + 5); } g.stroke(); break;
    case 'wavy': g.beginPath(); g.moveTo(cx - 10, my); for (let k = 0; k <= 20; k++) g.lineTo(cx - 10 + k, my + Math.sin(k * 0.9) * 2.4); g.stroke(); break;
    case 'chew': g.beginPath(); g.arc(cx - 3, my - 5, 8, Math.PI * 0.25, Math.PI * 0.75); g.stroke(); g.fillStyle = '#d99a7a'; g.beginPath(); g.ellipse(cx + 9, my - 2, 4, 3, 0, 0, 7); g.fill(); break;
    case 'pout': g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 5, my + 2); g.quadraticCurveTo(cx, my - 3, cx + 5, my + 2); g.stroke(); break;
    case 'cat': g.lineWidth = 2.6; g.beginPath(); g.moveTo(cx - 8, my - 2); g.quadraticCurveTo(cx - 4, my + 4, cx, my - 1); g.quadraticCurveTo(cx + 4, my + 4, cx + 8, my - 2); g.stroke(); break;
    case 'whistle': opening(3, 3, 0, false); g.strokeStyle = lip; g.lineWidth = 1.6; g.beginPath(); g.arc(cx, my, 4.6, 0, 7); g.stroke(); break;
    default: break;
  }
  // extras
  for (const x of f.extra) {
    if (x === 'blush') { g.fillStyle = 'rgba(232,96,110,.45)'; [-1, 1].forEach((s) => { g.beginPath(); g.ellipse(cx + s * 24, 60, 7, 4, 0, 0, 7); g.fill(); }); }
    if (x === 'tears') { g.fillStyle = 'rgba(110,180,255,.95)'; g.beginPath(); g.moveTo(cx + 19, 52); g.quadraticCurveTo(cx + 23, 60, cx + 19, 62); g.quadraticCurveTo(cx + 15, 60, cx + 19, 52); g.fill(); }
    if (x === 'stream') { g.fillStyle = 'rgba(110,180,255,.85)'; [-1, 1].forEach((s) => g.fillRect(cx + s * ex - 3, ey + 3, 6, 40)); }
    if (x === 'sweat') { g.fillStyle = 'rgba(120,190,255,.95)'; g.beginPath(); g.moveTo(cx + 33, 18); g.quadraticCurveTo(cx + 40, 30, cx + 33, 32); g.quadraticCurveTo(cx + 26, 30, cx + 33, 18); g.fill(); }
    if (x === 'vein') { g.strokeStyle = '#d23a3a'; g.lineWidth = 2.6; const vx = cx - 30, vy = 18; g.beginPath(); g.moveTo(vx - 6, vy - 2); g.quadraticCurveTo(vx - 1, vy - 1, vx - 2, vy - 6); g.moveTo(vx + 6, vy - 2); g.quadraticCurveTo(vx + 1, vy - 1, vx + 2, vy - 6); g.moveTo(vx - 6, vy + 2); g.quadraticCurveTo(vx - 1, vy + 1, vx - 2, vy + 6); g.moveTo(vx + 6, vy + 2); g.quadraticCurveTo(vx + 1, vy + 1, vx + 2, vy + 6); g.stroke(); }
    if (x === 'sparkle') { g.fillStyle = '#f2b33d'; [[cx + 34, 22, 6], [cx - 35, 30, 4]].forEach(([sx, sy, r]) => { g.beginPath(); g.moveTo(sx, sy - r); g.quadraticCurveTo(sx, sy, sx + r, sy); g.quadraticCurveTo(sx, sy, sx, sy + r); g.quadraticCurveTo(sx, sy, sx - r, sy); g.quadraticCurveTo(sx, sy, sx, sy - r); g.fill(); }); }
    if (x === 'cold') { g.strokeStyle = 'rgba(90,150,230,.8)'; g.lineWidth = 2; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx + k * 8, 10); g.lineTo(cx + k * 8, 22); g.stroke(); } }
    if (x === 'sick') { g.fillStyle = 'rgba(120,190,90,.35)'; g.fillRect(cx - 28, 8, 56, 26); }
  }
}

let SHEETS = null; // { plain, fem }: canvases
function sheets() {
  if (SHEETS) return SHEETS;
  const make = (fem) => {
    const cv = document.createElement('canvas'); cv.width = COLS * CELL; cv.height = ROWS * CELL;
    const g = cv.getContext('2d');
    FACES.forEach((f, i) => [0, 1].forEach((b) => { const k = i * 2 + b, x = (k % COLS) * CELL, y = Math.floor(k / COLS) * CELL; g.save(); g.translate(x, y); g.beginPath(); g.rect(2, 2, CELL - 4, CELL - 4); g.clip(); drawFace(g, f, !!b, fem); g.restore(); }));
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    tex.repeat.set(1 / COLS, 1 / ROWS);
    return { cv, tex };
  };
  SHEETS = { plain: make(false), fem: make(true) };
  return SHEETS;
}
export function faceSheetCanvas(fem = false) { return sheets()[fem ? 'fem' : 'plain'].cv; }

// ---------- a face on a head ----------
// The patch is the front of the head's own ellipsoid (avatar.js: centre 1.61 m, radii 0.205, 0.24, 0.19),
// 1.5% larger, from just above the brows to the chin; it takes the head's light and shadow.
const PATCH = new THREE.SphereGeometry(1, 14, 12, Math.PI / 2 - 0.9, 1.8, 0.62, 1.55);
export function attachFace(root, rig) {
  if (!rig || root.userData.face) return root.userData.face;
  const S = sheets();
  let fem = false;
  const tex = S.plain.tex.clone(); // shares the sheet's pixels; only its offset is this person's
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const mesh = new THREE.Mesh(PATCH, mat); mesh.scale.set(0.205 * 1.015, 0.24 * 1.015, 0.19 * 1.015); mesh.position.y = 1.61; mesh.name = 'face';
  const holder = rig.attach(mesh, 'head');
  // the avatar's own dash eyes give way to the drawn ones
  const oldEyes = root.userData.dressFound?.brows || [];
  const seed = Math.random();
  let rest = REST.calm, cell = FACE_AT.get(faceKey(rest)), cell2 = null, swapT = 0, blinkT = 1 + seed * 4, blinking = 0, t = 0;
  const show = (c, blink) => { const k = c * 2 + (blink ? 1 : 0); tex.offset.set((k % COLS) / COLS, 1 - (Math.floor(k / COLS) + 1) / ROWS); };
  show(cell, false);
  const face = {
    mesh: holder,
    set(f, f2 = null) { cell = FACE_AT.get(faceKey(f)) ?? addFaceLate(f); cell2 = f2 ? (FACE_AT.get(faceKey(f2)) ?? null) : null; swapT = 0; show(cell, false); },
    rest(f) { rest = f || rest; face.set(rest); },
    get restFace() { return rest; },
    // a new binding, not a new upload
    setFem(v) { if (v === fem) return; fem = v; tex.source = (v ? S.fem : S.plain).tex.source; tex.version++; },
    update(dt) {
      t += dt;
      oldEyes.forEach((o) => { o.visible = false; });
      blinkT -= dt;
      if (blinkT <= 0 && !blinking) { blinking = 0.13; blinkT = 2.2 + Math.random() * 4.5; }
      if (blinking) { blinking = Math.max(0, blinking - dt); }
      let c = cell;
      if (cell2 != null) { swapT += dt; if (Math.floor(swapT * 5) % 2) c = cell2; }
      show(c, blinking > 0);
    },
    dispose() { mat.dispose(); tex.dispose(); },
  };
  root.userData.face = face;
  // the curvy frame's printed lashes and lips are drawn on the face now
  root.traverse((o) => { if (o.userData?.faceDecor) o.visible = false; });
  return face;
}
function addFaceLate() { return FACE_AT.get(faceKey(REST.calm)); } // every face is on the sheet already

// ---------- playing an emote on someone ----------
const SYM = {};
function symbolTexture(kind) {
  if (SYM[kind]) return SYM[kind];
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  g.translate(32, 32); g.lineCap = 'round'; g.lineJoin = 'round';
  const bubble = () => { g.fillStyle = '#f7efdc'; g.beginPath(); g.arc(0, 0, 26, 0, 7); g.fill(); g.strokeStyle = 'rgba(59,42,32,.35)'; g.lineWidth = 2; g.stroke(); };
  bubble(); g.fillStyle = '#3b2a20'; g.strokeStyle = '#3b2a20'; g.font = '800 36px "Baloo 2", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (kind === 'q') g.fillText('?', 0, 3);
  if (kind === 'bang') { g.fillStyle = '#e46f4f'; g.fillText('!', 0, 3); }
  if (kind === 'zzz') { g.font = '800 22px "Baloo 2", system-ui'; g.fillText('z', -9, 8); g.font = '800 28px "Baloo 2", system-ui'; g.fillText('Z', 7, -4); }
  if (kind === 'note') { g.fillText('♪', -2, 3); }
  if (kind === 'heart') { g.fillStyle = '#e2384f'; g.beginPath(); g.moveTo(0, 14); g.bezierCurveTo(-24, -2, -12, -22, 0, -8); g.bezierCurveTo(12, -22, 24, -2, 0, 14); g.fill(); }
  if (kind === 'bulb') { g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(0, -4, 12, 0, 7); g.fill(); g.fillStyle = '#7b867d'; g.fillRect(-6, 8, 12, 8); }
  if (kind === 'steam') { g.fillStyle = '#d23a3a'; g.font = '800 30px "Baloo 2", system-ui'; g.fillText('#', 0, 3); }
  if (kind === 'dots') { [-10, 0, 10].forEach((x) => { g.beginPath(); g.arc(x, 2, 4, 0, 7); g.fill(); }); }
  if (kind === 'sparks') { g.fillStyle = '#f2b33d'; [[0, -2, 14], [-13, 10, 6], [13, 9, 7]].forEach(([x, y, r]) => { g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); }); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return (SYM[kind] = new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
}

// play emote `id` on a rigged person; style { amp, speed } varies how big and how fast, per person
export function playEmote(root, id, style = {}) {
  const rig = root.userData.rig, e = BY_ID[id]; if (!rig || !e) return false;
  const face = root.userData.face;
  const body = BODIES[e.body];
  const amp = style.amp ?? 1, speed = style.speed ?? 1, phase = style.phase ?? Math.random() * 6;
  // the hand prop and the symbol come and go with the emote
  let prop = null, sym = null;
  if (e.prop && rig.R?.elbow) { const [c, [w, h, d]] = PROP[e.prop]; prop = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 })); prop.position.set(0, -0.3, 0.06); rig.R.elbow.add(prop); }
  if (e.sym && typeof document !== 'undefined') { sym = new THREE.Sprite(symbolTexture(e.sym)); sym.scale.set(0.34, 0.34, 1); sym.position.set(0.18, 2.12, 0); root.add(sym); }
  rig.emote({
    dur: e.dur / speed, full: !!e.full,
    fn: (P, t, u, lift) => { body?.(P, t * speed + phase, u, lift); if (sym) { sym.position.y = 2.12 + 0.08 * Math.sin(t * 3) + u * 0.12; sym.material.opacity = Math.min(1, (1 - u) * 5, u * 8); } },
    amp,
    done: () => { prop?.removeFromParent(); prop?.geometry.dispose(); prop?.material.dispose(); sym?.removeFromParent(); if (face?.owner === e.id) face.rest(); },
  });
  // after rig.emote, which ends (and un-faces) whatever was playing before
  face?.set(e.face, e.face2); if (face) face.owner = e.id;
  return true;
}

// ---------- the director: who does what, and when ----------
// - each person has a temperament (rest face, how often they emote, which moods they lean to) seeded from
//   who they are, and a shuffled bag of emotes they work through before any repeats
// - nobody starts an emote someone within 14 m is already doing, or did in the last 8 seconds
// - events nearby set off reactions; reactors get different emotes from the event's pool, a beat apart
const TEMPER = {
  cheerful: { rest: 'bright', rate: 1.3, lean: ['happy', 'friendly', 'greet', 'dance'] },
  grumpy: { rest: 'serious', rate: 0.8, lean: ['annoyed', 'tired', 'disagree'] },
  hustler: { rest: 'calm', rate: 1.1, lean: ['work', 'market', 'agree', 'win'] },
  dreamer: { rest: 'calm', rate: 0.9, lean: ['unsure', 'calm', 'love', 'music'] },
  shy: { rest: 'calm', rate: 0.6, lean: ['shy', 'polite', 'calm'] },
  loud: { rest: 'bright', rate: 1.5, lean: ['loud', 'funny', 'dance'] },
  tired: { rest: 'tired', rate: 0.7, lean: ['tired', 'sad'] },
};
const TEMPERS = Object.keys(TEMPER);
// what each kind of event sets off
export const REACT = {
  rain: ['shiver', 'achoo', 'sigh', 'facepalm', 'mtchew', 'nervous'],
  storm: ['scared', 'shock', 'surprise', 'nervous'],
  goal: ['cheer', 'victory', 'jump', 'fistpump', 'clap', 'ehen', 'shock', 'facepalm'],
  horn: ['mtchew', 'angry', 'stop', 'annoyed', 'eyeroll', 'surprise'],
  music: ['shaku', 'zanku', 'groove', 'clap', 'listen', 'cheer'],
  greet: ['wave', 'ekaaro', 'welldone', 'nod', 'beckon', 'thumbs'],
  laugh: ['laugh', 'giggle', 'ehen', 'cheeky', 'guns'],
  dance: ['shaku', 'zanku', 'groove', 'clap', 'cheer'],
  food: ['chop', 'love', 'drink', 'thumbs', 'haggle'],
  breakdown: ['facepalm', 'shrug', 'sigh', 'mtchew', 'think', 'point'],
  police: ['nervous', 'salute', 'point', 'shush', 'surprise'],
  hot: ['fanself', 'drink', 'sigh', 'dizzy'],
  night: ['yawn', 'sleepy', 'sigh'],
  win: ['victory', 'proud', 'cheer', 'jump', 'clap'],
  lose: ['facepalm', 'sad', 'cry', 'sulk', 'nope'],
  thanks: ['thanks', 'bow', 'nod', 'love'],
  sad: ['sad', 'cry', 'sigh', 'facepalm'],
  build: ['clap', 'proud', 'thumbs', 'idea', 'welldone'],
};

export function hashSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

export function createEmotes({ people, getPlayer, getEnv, isPlayer = () => false }) {
  const state = new WeakMap(); // root -> { temper, bag, recent, next, style }
  const live = []; // { id, x, z, until }
  const history = []; // what was played, for the tests and the emote audit
  let clock = 0;
  const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];
  function who(root) {
    let s = state.get(root);
    if (s) return s;
    const seed = hashSeed(root.uuid);
    const trait = root.userData.trait && TEMPER[root.userData.trait] ? root.userData.trait : TEMPERS[Math.floor(seed * TEMPERS.length)];
    const T = TEMPER[trait];
    s = { trait, T, bag: [], recent: [], next: clock + 3 + seed * 25, style: { amp: 0.85 + seed * 0.3, speed: 0.88 + ((seed * 7.31) % 1) * 0.26 } };
    state.set(root, s);
    root.userData.face?.rest(REST[T.rest]);
    return s;
  }
  // a fresh bag: every emote this person would do at this hour and in this weather
  function refill(s) {
    const h = getEnv?.()?.hour ?? 12, wet = (getEnv?.()?.rain ?? 0) > 0.2;
    const ok = EMOTES.filter((e) => !e.tags.includes('night') || h >= 21 || h < 6).filter((e) => !e.tags.includes('hot') || (h >= 11 && h < 17 && !wet)).filter((e) => !e.tags.includes('morning') || (h >= 5 && h < 12)).filter((e) => !e.tags.includes('rain') || wet);
    // each emote once; what this temperament leans to tends to come up sooner (a weighted shuffle)
    s.bag = ok.map((e) => [e.id, Math.random() ** (1 / (e.tags.some((t) => s.T.lean.includes(t)) ? 3 : 1))]).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }
  const busyNear = (x, z) => new Set(live.filter((l) => l.until > clock && (l.x - x) ** 2 + (l.z - z) ** 2 < 14 * 14).map((l) => l.id));
  function start(root, id) {
    const s = who(root), e = BY_ID[id]; if (!e) return false;
    const moving = root.userData.rig?.moving?.() ?? false;
    if (e.full && moving) return false;
    if (!playEmote(root, id, { ...s.style, phase: hashSeed(root.uuid + clock) * 6 })) return false;
    const p = root.getWorldPosition(tmp);
    live.push({ id, x: p.x, z: p.z, until: clock + e.dur + 8 });
    history.push({ id, who: root.uuid, x: p.x, z: p.z, at: clock, until: clock + e.dur }); if (history.length > 300) history.shift();
    s.recent.push(id); if (s.recent.length > 10) s.recent.shift();
    return true;
  }
  // choose for one person: the next thing in their bag nobody near is doing and they did not do lately
  function choose(root, pool = null) {
    const s = who(root), p = root.getWorldPosition(tmp), near = busyNear(p.x, p.z);
    const moving = root.userData.rig?.moving?.() ?? false;
    const fine = (id) => BY_ID[id] && !near.has(id) && !s.recent.includes(id) && !(moving && BY_ID[id].full);
    if (pool) { const order = [...pool].sort(() => Math.random() - 0.5); return order.find(fine) || order.find((id) => BY_ID[id] && !near.has(id) && !(moving && BY_ID[id].full)) || null; }
    if (!s.bag.length) refill(s);
    for (let k = 0; k < s.bag.length; k++) if (fine(s.bag[k])) return s.bag.splice(k, 1)[0];
    refill(s); return s.bag.find(fine) || null;
  }
  const tmp = new THREE.Vector3();
  const queue = []; // reactions waiting their beat: { root, pool, at }
  // something happened at (x, z): people within r react, each differently, a beat apart
  function event(kind, x, z, r = 18, { max = 8, chance = 0.85 } = {}) {
    const pool = REACT[kind]; if (!pool) return 0;
    let n = 0, k = 0;
    const list = [...people()].filter((root) => root.userData.rig && !isPlayer(root) && root.visible && !root.userData.far).map((root) => [root, root.getWorldPosition(new THREE.Vector3())]).filter(([, p]) => (p.x - x) ** 2 + (p.z - z) ** 2 < r * r).sort((a, b) => (a[1].x - x) ** 2 + (a[1].z - z) ** 2 - ((b[1].x - x) ** 2 + (b[1].z - z) ** 2));
    for (const [root] of list) {
      if (n >= max) break;
      if (Math.random() > chance) continue;
      // the pool turns for each reactor so neighbours start from different emotes
      const turned = pool.slice(k % pool.length).concat(pool.slice(0, k % pool.length)); k++;
      queue.push({ root, pool: turned, at: clock + 0.15 + n * (0.25 + Math.random() * 0.35) }); n++;
    }
    return n;
  }
  function update(dt) {
    clock += dt;
    for (let i = live.length - 1; i >= 0; i--) if (live[i].until < clock) live.splice(i, 1);
    // reactions whose beat has come
    for (let i = queue.length - 1; i >= 0; i--) {
      const q = queue[i]; if (q.at > clock) continue; queue.splice(i, 1);
      if (q.root.userData.rig?.emoting?.()) continue;
      const id = q.pool.find((x) => !busyNear(...xz(q.root)).has(x) && BY_ID[x] && !(BY_ID[x].full && q.root.userData.rig.moving?.())) || null;
      if (id) start(q.root, id);
    }
    // everyday life: people near the camera emote now and then, each on their own clock
    const P = getPlayer?.(); if (!P) return;
    let started = 0;
    for (const root of people()) {
      if (started >= 2) break; // never a wave of emotes on one frame
      if (!root.userData.rig || isPlayer(root) || root.userData.far || !root.visible || !root.parent) continue;
      const s = who(root);
      if (clock < s.next) continue;
      const p = root.getWorldPosition(tmp);
      if ((p.x - P.x) ** 2 + (p.z - P.z) ** 2 > 45 * 45) { s.next = clock + 4 + Math.random() * 6; continue; }
      s.next = clock + (10 + Math.random() * 26) / s.T.rate;
      if (root.userData.rig.emoting?.() || root.userData.busy) continue;
      const id = choose(root); if (id && start(root, id)) started++;
    }
  }
  const xz = (root) => { const p = root.getWorldPosition(tmp); return [p.x, p.z]; };
  return { update, event, start, choose, who, get live() { return live; }, history };
}
