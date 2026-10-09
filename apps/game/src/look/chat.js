// Chat bubbles (world bible 11.2): people on the street greet each other and you, in the English and
// Pidgin mix of Lagos. Register follows lifestyle: tier 0 (well-off) speaks mostly English, tier 2 mostly
// Pidgin, tier 1 mixes freely. Moods show as a line or just an emoji. Keys 1-6 send your own emote.

import * as THREE from 'three';
import { sfx } from './audio.js';
import { FONT, C } from './uikit.js';

const PIDGIN_SHARE = [0.1, 0.5, 0.9];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const LINES = {
  greet: {
    en: ['Hi! How are you doing?', 'Hello there!', 'Hey, lovely to see you.', 'How is work going?', 'Shipping anything today?', 'Nice to see you around.'],
    pd: ['How far?', 'How you dey?', 'My guy! How body?', 'Wetin dey sup?', 'How work na?', 'Bros, how far now?', 'Sister, how you dey?'],
  },
  reply: {
    en: ['Fine, thanks. You?', 'Very well, thank you!', 'Busy, but good.', 'Doing great, thanks!', "Can't complain."],
    pd: ['I dey o!', 'We dey, we move!', 'Body dey inside cloth.', 'No wahala at all.', 'God dey!', 'E dey go, small small.', 'We dey kampe!'],
  },
  morning: { en: ['Good morning!', 'Morning! Early start?'], pd: ['Morning o!', 'Good morning o, how night?'] },
  afternoon: { en: ['Good afternoon.', 'Afternoon! Had lunch yet?'], pd: ['Afternoon o!', 'You don chop?'] },
  evening: { en: ['Good evening!', 'Heading home?'], pd: ['Evening o!', 'Make we waka go house.'] },
  rain: { en: ['Mind the rain!', 'This rain is something else.'], pd: ['This rain no wan stop o!', 'Rain don soak me finish.'] },
  sunny: { en: ['Lovely weather today.', 'Nice and bright out.'], pd: ['Sun dey shine well well today.', 'Hot no be here o!'] },
};
const MOODS = {
  busy: { emoji: '💻', en: 'Deadline today. Wish me luck!', pd: 'Deadline dey my neck o!' },
  hungry: { emoji: '🍲', en: 'Off to get lunch.', pd: 'Hunger wan kill me, I dey find food.' },
  happy: { emoji: '😄', en: 'Just shipped a feature!', pd: 'Wetin I build don work o!' },
  tired: { emoji: '😮‍💨', en: 'Long day...', pd: 'I don tire o.' },
  focused: { emoji: '🎧', en: null, pd: null },
  excited: { emoji: '🎉', en: 'Demo night is Thursday!', pd: 'Thursday na demo night, you go come?' },
};
// your emotes, and how people answer them
const EMOTES = ['👋', '😄', '👍', '🔥', '🙏', '🎉'];
const ANSWER = {
  '👋': null, // a wave gets a proper greeting back
  '😄': { en: ['😄', 'Ha! Good mood today.'], pd: ['😄', 'You dey happy o!'] },
  '👍': { en: ['👍', 'Nice one.'], pd: ['👍', 'Sharp!'] },
  '🔥': { en: ['🔥', 'Looking good!'], pd: ['🔥🔥', 'Na fire!'] },
  '🙏': { en: ['🙏', 'Thank you!'], pd: ['🙏', 'Thank you o!', 'God bless!'] },
  '🎉': { en: ['🎉', 'Congratulations!'], pd: ['🎉', 'Congrats o!'] },
};

const CSS = `
#lk-chat { position: fixed; inset: 0; pointer-events: none; z-index: 13; }
body.nohud #lk-chat, body.bw-cine #lk-chat { display: none; }
.lkc-b { position: absolute; left: 0; top: 0; transform: translate(-50%, -100%) scale(.6); opacity: 0; transition: opacity .18s ease, transform .22s cubic-bezier(.2,1.6,.4,1);
  max-width: 220px; padding: 7px 12px; border-radius: 16px; background: ${C.paper}; color: ${C.ink}; font: 700 14px/1.25 ${FONT};
  box-shadow: 0 3px 0 rgba(59,42,32,.2); white-space: normal; text-align: center; will-change: transform; }
.lkc-b::after { content: ''; position: absolute; left: 50%; bottom: -6px; width: 12px; height: 12px; background: ${C.paper}; transform: translateX(-50%) rotate(45deg); border-radius: 2px; }
.lkc-b.on { opacity: 1; transform: translate(-50%, -100%) scale(1); }
.lkc-b.emoji { font-size: 24px; padding: 4px 10px; }
.lkc-b.me { background: ${C.teal}; color: #fff; }
.lkc-b.me::after { background: ${C.teal}; }
.lkc-b small { display: block; font: 700 10.5px/1 ${FONT}; color: ${C.ink2}; margin-bottom: 2px; }
.lkc-b.me small { color: rgba(255,255,255,.75); }
@media (prefers-reduced-motion: reduce) { .lkc-b { transition: opacity .18s; transform: translate(-50%, -100%); } }
`;

export function createChat({ camera, avatar, getEnv, reduced }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const root = document.createElement('div'); root.id = 'lk-chat'; document.body.appendChild(root);
  const people = []; // { id, name, obj, rig, tier, mood, cool, coolMe }
  const bubbles = []; // { el, obj, until, y }
  const pairs = new Map();
  const v = new THREE.Vector3();
  let clock = 0, tick = 0, moodT = 20, last = null, meCool = 0, quietUntil = 0;

  function add(p) { people.push({ cool: 0, coolMe: 0, mood: pick(Object.keys(MOODS)), ...p }); }
  const speaks = (p) => (Math.random() < PIDGIN_SHARE[p.tier ?? 1] ? 'pd' : 'en');
  const line = (set, p) => pick(LINES[set][speaks(p)]);

  function say(obj, text, { name, me = false, emoji = false, hold = 3.2 } = {}) {
    // one bubble per speaker: a new line replaces the old
    for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].obj === obj) { bubbles[i].el.remove(); bubbles.splice(i, 1); }
    if (bubbles.length >= 3) { bubbles[0].el.remove(); bubbles.shift(); }
    const el = document.createElement('div');
    el.className = `lkc-b${me ? ' me' : ''}${emoji ? ' emoji' : ''}`;
    el.innerHTML = `${name && !emoji ? `<small>${name}</small>` : ''}${text}`;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    bubbles.push({ el, obj, until: clock + hold });
    sfx('chat', { me });
  }

  // what a greeting sounds like right now: time of day and weather first, now and then
  function greeting(p) {
    const env = getEnv?.() || {};
    const r = Math.random();
    if (env.rain > 0.3 && r < 0.35) return line('rain', p);
    if (r < 0.45) { const h = env.hour ?? 12; return line(h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening', p); }
    if (env.day > 0.7 && env.rain < 0.1 && r < 0.55) return line('sunny', p);
    return line('greet', p);
  }

  function converse(a, b) {
    a.rig?.wave?.();
    say(a.obj, greeting(a), { name: a.name });
    setTimeout(() => { if (Math.random() < 0.5) b.rig?.wave?.(); say(b.obj, line('reply', b), { name: b.name }); }, 1300);
  }

  // the player says hi (E near someone), or sends an emote (1-6)
  function sayHi(p) {
    meCool = clock + 2;
    avatar?.userData.rig?.wave?.();
    say(avatar, `Hi ${p.name}! 👋`, { me: true });
    setTimeout(() => { p.rig?.wave?.(); say(p.obj, `${line('reply', p)}`, { name: p.name }); }, 1100);
    p.coolMe = clock + 30;
  }
  function emote(n, player) {
    const e = EMOTES[n - 1]; if (!e || clock < meCool) return;
    meCool = clock + 1.2;
    const GEST = { '👋': null, '😄': 'laugh', '👍': 'thumbs', '🔥': 'dance', '🙏': 'thanks', '🎉': 'cheer' };
    if (e === '👋') avatar?.userData.rig?.wave?.(); else avatar?.userData.rig?.play?.(GEST[e]);
    say(avatar, e, { me: true, emoji: true, hold: 2.2 });
    // the nearest person within 6 m answers
    let best = null, bd = 6;
    people.forEach((p) => { const d = Math.hypot(p.obj.position.x - player.x, p.obj.position.z - player.z); if (d < bd) { bd = d; best = p; } });
    if (!best) return;
    setTimeout(() => {
      if (e === '👋') { best.rig?.wave?.(); say(best.obj, greeting(best), { name: best.name }); return; }
      best.rig?.play?.({ '😄': 'laugh', '👍': 'thumbs', '🔥': 'cheer', '🙏': 'thanks', '🎉': 'cheer' }[e]);
      const opts = ANSWER[e][speaks(best)], t = pick(opts);
      say(best.obj, t, { name: best.name, emoji: [...t].length <= 2 });
    }, 900);
    best.coolMe = clock + 20;
  }
  const nearest = (player, r = 2.6) => { let best = null, bd = r; people.forEach((p) => { const d = Math.hypot(p.obj.position.x - player.x, p.obj.position.z - player.z); if (d < bd) { bd = d; best = p; } }); return best; };

  function update(dt, player) {
    clock += dt; tick -= dt;
    if (tick <= 0 && !reduced) {
      tick = 0.25;
      // people passing each other say hello
      for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) {
        const a = people[i], b = people[j], d = a.obj.position.distanceTo(b.obj.position);
        const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        // only where you can see it, now and then: two neighbours meeting is a moment, not a stream
        const seen = Math.min(Math.hypot(a.obj.position.x - player.x, a.obj.position.z - player.z), Math.hypot(b.obj.position.x - player.x, b.obj.position.z - player.z)) < 18;
        if (seen && d < 2.6 && clock > (pairs.get(key) || 0) && clock > a.cool && clock > b.cool && clock > quietUntil && Math.random() < 0.06) {
          pairs.set(key, clock + 150); quietUntil = clock + 12; a.cool = b.cool = clock + 6;
          (Math.random() < 0.5 ? converse(a, b) : converse(b, a));
        }
      }
      // someone you walk past greets you
      people.forEach((p) => {
        const d = Math.hypot(p.obj.position.x - player.x, p.obj.position.z - player.z);
        if (d < 3.0 && clock > p.coolMe && clock > p.cool && clock > quietUntil && Math.random() < 0.1) {
          p.coolMe = clock + 180; quietUntil = clock + 8; p.cool = clock + 5;
          if (Math.random() < 0.6) p.rig?.wave?.();
          say(p.obj, greeting(p), { name: p.name });
        }
      });
      // now and then someone shows how they feel
      moodT -= 0.25;
      if (moodT <= 0) {
        moodT = 30 + Math.random() * 30;
        const seen = clock > quietUntil ? people.filter((p) => clock > p.cool && p.obj.position.distanceTo(camera.position) < 20) : [];
        if (seen.length) {
          const p = pick(seen), m = MOODS[p.mood], text = Math.random() < 0.55 || !m.en ? m.emoji : `${m[speaks(p)]} ${m.emoji}`;
          say(p.obj, text, { name: p.name, emoji: text === m.emoji, hold: 2.6 });
          p.cool = clock + 6;
          if (Math.random() < 0.3) p.mood = pick(Object.keys(MOODS));
        }
      }
    }
    // place and expire bubbles
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (clock > b.until) { b.el.classList.remove('on'); const el = b.el; setTimeout(() => el.remove(), 250); bubbles.splice(i, 1); continue; }
      b.obj.getWorldPosition(v); v.y += 2.6; // above the name tags
      const far = v.distanceTo(camera.position);
      v.project(camera);
      const vis = v.z < 1 && far < 40 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      b.el.style.display = vis ? '' : 'none';
      b.sx = (v.x * 0.5 + 0.5) * innerWidth; b.sy = (-v.y * 0.5 + 0.5) * innerHeight; b.vis = vis;
    }
    // stack bubbles that would overlap: lower ones stay, higher ones step up
    const shown = bubbles.filter((b) => b.vis).sort((a, c) => c.sy - a.sy), placed = [];
    shown.forEach((b) => {
      const w = b.el.offsetWidth || 120, h = b.el.offsetHeight || 30;
      let y = b.sy;
      for (let guard = 0; guard < 8; guard++) {
        const hit = placed.find((r) => Math.abs(r.x - b.sx) < (r.w + w) / 2 + 4 && y > r.y - r.h - 6 && y - h < r.y + 6);
        if (!hit) break;
        y = hit.y - hit.h - 8;
      }
      placed.push({ x: b.sx, y, w, h });
      b.el.style.left = `${b.sx}px`; b.el.style.top = `${y}px`;
    });
    last = player;
  }
  function dispose() { root.remove(); style.remove(); }
  return { add, update, sayHi, emote, nearest, dispose, get people() { return people; }, get last() { return last; } };
}
