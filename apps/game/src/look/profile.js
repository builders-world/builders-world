import * as THREE from 'three';
import { RAD, GAP, C, FONT } from './uikit.js';
import { BY_ID, REST } from './expressions.js';
import { sfx } from './audio.js';
import { walletEngine } from './wallet.js';

// You, bottom left (Elvis, 10 October 2026: "a circle shows your character profile picture, but of course, animated...
// if it's angry, let the profile look angry... moods and also skill levels, coding, charisma, communicating,
// chatting... if the character changes the hairstyle or the clothing or the headset, let it reflect"). The circle is
// a live camera on your own avatar's face, so whatever you wear and whatever your face is doing is what it shows.
// Beside it, your dog, live too: click it (or Q) to play as the dog while you follow it.
//
// Needs run down as you play and come back from doing things: energy (rest on a bench, sleep, the sofa), food (cook,
// eat, a coffee, an ice cream), social (say hi, chat, emote with people), fun (sport, play with your pet, the parks,
// the radio). Mood comes from them and from what just happened (lose reputation and you are annoyed, level up and you
// are proud), and your face at rest follows your mood. Skills level up from what you do: coding at a computer (and
// your GitHub commits, through the Efforts they earned), charisma, communication, chatting, fitness, creativity.

export const SKILLS = [
  { id: 'coding', name: 'Coding', how: 'Use a computer at a desk; every GitHub commit counts' },
  { id: 'charisma', name: 'Charisma', how: 'Emote, win people over, build your reputation' },
  { id: 'communication', name: 'Communication', how: 'Say hi to people (E) and get answers back' },
  { id: 'chatting', name: 'Chatting', how: 'Type messages to people nearby (Enter)' },
  { id: 'fitness', name: 'Fitness', how: 'Walk, run, swim, play sport' },
  { id: 'creativity', name: 'Creativity', how: 'Change your look, spend time in studios and the Creative Park' },
];
const NEEDS = [['energy', 'Energy'], ['food', 'Food'], ['social', 'Social'], ['fun', 'Fun']];
// one line-drawn glyph per need and skill, the same size and weight everywhere (16 by 16, the ink's own colour)
const ICON = {
  energy: 'M9 1.5 3.5 9H7.5L6.8 14.5 12.5 7H8.5Z', food: 'M2 8h12a6 6 0 0 1-12 0ZM5.5 5.5c0-1 1-1 1-2.2M8 5.5c0-1 1-1 1-2.2M10.5 5.5c0-1 1-1 1-2.2',
  social: 'M2 3h12v8H7.5L4 13.5V11H2Z', fun: 'M8 1.8 9.8 5.9 14.2 6.3 10.9 9.2 11.9 13.6 8 11.3 4.1 13.6 5.1 9.2 1.8 6.3 6.2 5.9Z',
  coding: 'M5.5 4 1.5 8l4 4M10.5 4l4 4-4 4M9.2 2.5 6.8 13.5', charisma: 'M8 14.5A6.5 6.5 0 1 0 8 1.5a6.5 6.5 0 0 0 0 13ZM5 9.5c1.6 2 4.4 2 6 0M5.8 6.2h.1M10.2 6.2h.1',
  communication: 'M2 6.5h2.5L9 3v10L4.5 9.5H2ZM11.5 5.5a3.5 3.5 0 0 1 0 5M13 3.5a6.5 6.5 0 0 1 0 9', chatting: 'M2 3h12v8H7.5L4 13.5V11H2ZM5.5 7h.1M8 7h.1M10.5 7h.1',
  fitness: 'M1.5 6v4M3.5 4v8M12.5 4v8M14.5 6v4M3.5 8h9', creativity: 'M2.5 13.5c2 0 3.2-1 3.2-3 0-1 .8-1.8 1.8-1.8l5.7-5.7-2-2-5.7 5.7c0 1-.8 1.8-1.8 1.8-2 0-3.2 1.2-3.2 3.2Z',
};
const glyph = (k) => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${ICON[k] || ''}"/></svg>`;
// how fast each runs down, per minute of play
const DECAY = { energy: 1 / 45, food: 1 / 35, social: 1 / 28, fun: 1 / 24 };
export const levelOf = (xp) => Math.min(10, Math.floor(Math.sqrt(Math.max(0, xp) / 18)) + 1);
const xpFor = (lv) => (lv - 1) ** 2 * 18;

// each mood: its word, the ring's colour, the face at rest (from the expression sheet)
const face = (id) => BY_ID[id]?.face || REST.calm;
export const MOODS = {
  happy: { word: 'Happy', col: '#7fb35e', face: () => face('laugh') },
  proud: { word: 'Proud', col: '#f2b33d', face: () => face('proud') },
  excited: { word: 'Excited', col: '#e46f4f', face: () => face('starry') },
  content: { word: 'Content', col: '#2a9d94', face: () => REST.bright },
  focused: { word: 'Focused', col: '#4a64b0', face: () => REST.serious },
  tired: { word: 'Tired', col: '#8a7a9a', face: () => REST.tired },
  hungry: { word: 'Hungry', col: '#d98c2f', face: () => face('sigh') },
  lonely: { word: 'Lonely', col: '#6f8fb0', face: () => face('sad') },
  bored: { word: 'Bored', col: '#a59a88', face: () => face('eyeroll') },
  annoyed: { word: 'Annoyed', col: '#c0392b', face: () => face('annoyed') },
  angry: { word: 'Angry', col: '#a8261a', face: () => face('angry') },
};

const CSS = `
#lk-me { position: fixed; left: 14px; bottom: 112px; z-index: 15; display: flex; align-items: flex-end; gap: 8px; font-family: ${FONT}; color: ${C.ink}; pointer-events: none; }
#lk-me .ph { position: relative; width: 78px; height: 78px; border-radius: 50%; box-shadow: 0 0 0 4px var(--mood, ${C.teal}), 0 0 0 7px ${C.paper}, 0 6px 16px rgba(10,14,30,.3); cursor: pointer; pointer-events: auto; transition: box-shadow .4s; }
#lk-me .ph .lv { position: absolute; right: -6px; bottom: -4px; min-width: 22px; height: 22px; padding: 0 5px; box-sizing: border-box; border-radius: 999px; background: ${C.ink}; color: ${C.paper}; font: 800 12px/22px ${FONT}; text-align: center; }
#lk-me svg, #lk-mepanel svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; flex: none; }
#lk-me .card { pointer-events: auto; padding: ${GAP.sm}px ${GAP.md}px; border-radius: ${RAD.md}px; background: ${C.paper}; cursor: pointer; min-width: 168px; box-shadow: 0 2px 0 rgba(59,42,32,.14); }
#lk-me .card .top { display: flex; align-items: center; gap: ${GAP.sm}px; }
#lk-me .card b { font: 800 15px/1.1 ${FONT}; }
#lk-me .card .mood { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px 2px 6px; border-radius: ${RAD.pill}px; background: color-mix(in srgb, var(--mood, ${C.teal}) 14%, transparent); font: 800 12px/1.3 ${FONT}; color: var(--mood, ${C.teal}); }
#lk-me .card .mood i { width: 7px; height: 7px; border-radius: 50%; background: var(--mood, ${C.teal}); }
#lk-me .needs { display: grid; grid-template-columns: repeat(4, 1fr); gap: ${GAP.sm}px; margin-top: ${GAP.sm}px; }
#lk-me .needs .nd { display: flex; align-items: center; gap: 3px; color: ${C.ink2}; }
#lk-me .needs .nd b { flex: 1; height: 5px; border-radius: ${RAD.pill}px; background: ${C.paper2}; overflow: hidden; } #lk-me .needs .nd b i { display: block; height: 100%; border-radius: ${RAD.pill}px; background: ${C.teal}; transition: width .6s; }
#lk-me .needs .nd.low { color: ${C.coral}; } #lk-me .needs .nd.low b i { background: ${C.coral}; }
#lk-me .dog { position: relative; width: 46px; height: 46px; border-radius: 50%; margin-left: 2px; box-shadow: 0 0 0 3px ${C.paper2}, 0 0 0 5px ${C.paper}, 0 4px 10px rgba(10,14,30,.25); cursor: pointer; pointer-events: auto; display: none; }
#lk-me .dog.on { display: block; } #lk-me .dog.driving { box-shadow: 0 0 0 3px ${C.amber}, 0 0 0 5px ${C.paper}, 0 4px 10px rgba(10,14,30,.25); }
#lk-me .dog .k { position: absolute; left: 50%; bottom: -9px; transform: translateX(-50%); padding: 1px 6px; border-radius: 999px; background: ${C.ink}; color: ${C.paper}; font: 800 10.5px/16px ${FONT}; white-space: nowrap; }
/* the full status, beside the column at the bottom left (dock.js), never on top of it */
#lk-mepanel { position: fixed; left: 300px; bottom: 60px; z-index: 30; width: min(340px, calc(100vw - 28px)); max-height: calc(100vh - 140px); overflow-y: auto; box-sizing: border-box; padding: ${GAP.lg}px; border-radius: ${RAD.lg}px; background: ${C.paper}; color: ${C.ink}; font-family: ${FONT}; box-shadow: 0 2px 0 rgba(59,42,32,.14), 0 14px 34px rgba(10,14,30,.22); display: none; }
#lk-mepanel.on { display: block; }
#lk-mepanel .hd { display: flex; align-items: center; gap: ${GAP.md}px; padding-right: 32px; }
#lk-mepanel .hd .lvl { flex: none; width: 40px; height: 40px; border-radius: ${RAD.md}px; display: grid; place-items: center; background: ${C.ink}; color: ${C.paper}; font: 800 16px/1 ${FONT}; }
#lk-mepanel .hd .lvl small { display: block; font: 700 9px/1 ${FONT}; letter-spacing: .06em; text-transform: uppercase; opacity: .7; margin-bottom: 2px; }
#lk-mepanel h3 { margin: 0; font: 800 18px/1.15 ${FONT}; }
#lk-mepanel .moodline { display: flex; align-items: flex-start; gap: ${GAP.sm}px; margin-top: ${GAP.md}px; padding: ${GAP.sm}px ${GAP.md}px; border-radius: ${RAD.md}px; background: color-mix(in srgb, var(--mood, ${C.teal}) 12%, ${C.paper}); font: 600 13px/1.4 ${FONT}; }
#lk-mepanel .moodline b { color: var(--mood, ${C.teal}); }
#lk-mepanel h4 { margin: ${GAP.lg}px 0 ${GAP.sm}px; font: 800 11px/1 ${FONT}; letter-spacing: .08em; text-transform: uppercase; color: ${C.ink2}; }
#lk-mepanel .needs { display: grid; grid-template-columns: 1fr 1fr; gap: ${GAP.sm}px; }
#lk-mepanel .need { padding: ${GAP.sm}px 10px; border-radius: ${RAD.md}px; background: ${C.paper2}; }
#lk-mepanel .need .r { display: flex; align-items: center; gap: 6px; font: 800 13px/1 ${FONT}; } #lk-mepanel .need .r em { margin-left: auto; font: 700 12px/1 ${FONT}; font-style: normal; color: ${C.ink2}; font-variant-numeric: tabular-nums; }
#lk-mepanel .bar { height: 6px; margin-top: 6px; border-radius: ${RAD.pill}px; background: rgba(59,42,32,.1); overflow: hidden; } #lk-mepanel .bar i { display: block; height: 100%; border-radius: ${RAD.pill}px; background: ${C.teal}; }
#lk-mepanel .need.low { color: ${C.coral}; } #lk-mepanel .need.low .bar i { background: ${C.coral}; }
#lk-mepanel .sk { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 2px ${GAP.sm}px; padding: ${GAP.sm}px 0; border-top: 1px solid rgba(59,42,32,.08); }
#lk-mepanel .sk:first-of-type { border-top: 0; }
#lk-mepanel .sk .ic { grid-row: span 2; width: 28px; height: 28px; border-radius: ${RAD.sm}px; display: grid; place-items: center; background: ${C.paper2}; color: ${C.teal}; }
#lk-mepanel .sk b { font: 800 14px/1.2 ${FONT}; } #lk-mepanel .sk em { font: 800 12px/1.2 ${FONT}; font-style: normal; color: ${C.teal}; white-space: nowrap; }
#lk-mepanel .sk .bar { grid-column: 2 / -1; margin-top: 0; }
#lk-mepanel .sk small { grid-column: 2 / -1; color: ${C.ink2}; font: 600 11.5px/1.3 ${FONT}; }
#lk-mepanel .fr { display: flex; flex-wrap: wrap; gap: 6px; } #lk-mepanel .fr span { padding: 5px 10px; border-radius: ${RAD.pill}px; background: ${C.paper2}; font: 700 12.5px/1 ${FONT}; }
#lk-mepanel .sub { color: ${C.ink2}; font: 600 13px/1.4 ${FONT}; }
#lk-mepanel .x { position: absolute; right: ${GAP.md}px; top: ${GAP.md}px; border: 0; border-radius: ${RAD.sm}px; width: 28px; height: 28px; background: ${C.paper2}; color: ${C.ink}; font: 800 14px/1 ${FONT}; cursor: pointer; }
@media (max-width: 760px) { #lk-mepanel { left: 14px; bottom: 200px; } }
body.nohud #lk-me, body.bw-cine #lk-me, body.nohud #lk-mepanel { display: none; }
@media (max-width: 640px) { #lk-me { bottom: 96px; } #lk-me .card { display: none; } }
`;

export function createProfile({ avatar, getName, getPet, getFriends, onDog, toast }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'lk-me';
  el.innerHTML = `<div class="ph" title="You: mood and skills"><span class="lv">1</span></div><div class="card"><div class="top"><b class="nm"></b><span class="mood"><i></i><span></span></span></div><div class="needs">${NEEDS.map(([k, n]) => `<span class="nd" data-n="${k}" title="${n}">${glyph(k)}<b><i></i></b></span>`).join('')}</div></div><div class="dog" title="Play as your dog (Q)"><span class="k">Q</span></div>`;
  document.body.appendChild(el);
  const panel = document.createElement('div'); panel.id = 'lk-mepanel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'You'); document.body.appendChild(panel);
  const ph = el.querySelector('.ph'), dogEl = el.querySelector('.dog');

  // ---------- the state, kept on this device ----------
  const KEY = 'bw-profile-v1';
  let S = null; try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* */ }
  S = { xp: Object.fromEntries(SKILLS.map((s) => [s.id, 0])), need: { energy: 0.85, food: 0.7, social: 0.6, fun: 0.6 }, commitXp: 0, ...(S || {}) };
  SKILLS.forEach((s) => { S.xp[s.id] ??= 0; });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* */ } };
  let saveT = 0, moodNow = 'content', events = []; // events: { kind, until }
  // your GitHub commits, through the Efforts they earned, count toward coding
  const syncCommits = () => { const earned = walletEngine().earned?.() ?? 0, want = Math.floor(earned / 25); if (want > S.commitXp) { gain('coding', want - S.commitXp, true); S.commitXp = want; } };

  function gain(id, n, quiet = false) {
    const before = levelOf(S.xp[id]); S.xp[id] = Math.max(0, S.xp[id] + n); const after = levelOf(S.xp[id]);
    if (after > before && !quiet) { toast?.(`${SKILLS.find((s) => s.id === id).name} is up to level ${after}.`, 3200); sfx('arrive'); feel('proud', 25); }
  }
  const bump = (k, v) => { S.need[k] = Math.max(0, Math.min(1, S.need[k] + v)); };
  function feel(kind, secs) { events = events.filter((e) => e.kind !== kind); events.push({ kind, until: performance.now() + secs * 1000 }); }

  // ---------- what happens in the world ----------
  const on = (name, fn) => { addEventListener(name, fn); return () => removeEventListener(name, fn); };
  const offs = [
    on('bw:emote', () => { gain('charisma', 2); bump('social', 0.04); bump('fun', 0.02); }),
    on('bw:said', (e) => { const d = e.detail || {}; if (d.kind === 'hi') { gain('communication', 3); bump('social', 0.12); } else { gain('chatting', 3 + Math.min(3, Math.floor((d.len || 0) / 25))); bump('social', 0.07); } }),
    on('bw:rep', (e) => { const d = e.detail?.d || 0; if (d > 0) { gain('charisma', 2 * d); feel('happy', 30); } else if (d < 0) feel(d <= -5 ? 'angry' : 'annoyed', 45); }),
    on('bw:style', () => { gain('creativity', 3); feel('happy', 20); }),
    on('bw:radio', () => bump('fun', 0.05)),
    on('bw:me', (e) => { // other parts of the game report: { ate, rested, played, won, lost }
      const d = e.detail || {};
      if (d.ate) { bump('food', d.ate); feel('happy', 15); }
      if (d.rested) bump('energy', d.rested);
      if (d.played) { bump('fun', d.played); }
      if (d.won) { gain('fitness', 8); feel('excited', 30); }
      if (d.lost) feel('annoyed', 20);
      if (d.skill) gain(d.skill, d.n || 1);
    }),
  ];

  // ---------- each frame: needs run down, skills tick up from what you are doing ----------
  let walkAcc = 0, tick = 0, last = null;
  function update(dt, ctx = {}) {
    tick += dt; saveT += dt;
    const m = dt / 60;
    Object.entries(DECAY).forEach(([k, r]) => { S.need[k] = Math.max(0, S.need[k] - r * m * (k === 'energy' && ctx.running ? 2 : 1)); });
    if (ctx.computer) { S.xp.coding += dt / 8; bump('energy', -dt / 900); feel('focused', 4); if (levelOf(S.xp.coding - dt / 8) < levelOf(S.xp.coding)) gain('coding', 0.0001); }
    if (ctx.seated) bump('energy', dt / 150);
    if (ctx.resting) bump('energy', dt / 45);
    if (ctx.sport) { bump('fun', dt / 60); S.xp.fitness += dt / 6; }
    if (ctx.studio) S.xp.creativity += dt / 15;
    if (ctx.park) bump('fun', dt / 240);
    if (ctx.people) bump('social', dt / 400);
    if (ctx.player) {
      if (last) { const d = Math.hypot(ctx.player.x - last.x, ctx.player.z - last.z); if (d < 3 && !ctx.riding && !ctx.inside) { walkAcc += d * (ctx.running ? 2 : 1); if (walkAcc > 40) { walkAcc = 0; gain('fitness', 1); } } }
      last = { x: ctx.player.x, z: ctx.player.z };
    }
    if (saveT > 5) { saveT = 0; save(); syncCommits(); }
    // mood: what just happened first, then the lowest need, then how full the needs are
    const now = performance.now(); events = events.filter((e) => e.until > now);
    const ev = ['angry', 'annoyed', 'excited', 'proud', 'happy', 'focused'].find((k) => events.some((e) => e.kind === k));
    const N = S.need, low = Object.entries(N).sort((a, b) => a[1] - b[1])[0];
    const avg = (N.energy + N.food + N.social + N.fun) / 4;
    const mood = ev || (low[1] < 0.18 ? { energy: 'tired', food: 'hungry', social: 'lonely', fun: 'bored' }[low[0]] : avg > 0.68 ? 'happy' : 'content');
    if (mood !== moodNow) { moodNow = mood; avatar?.userData.face?.rest(MOODS[mood].face()); }
    if (tick > 0.5) { tick = 0; draw(); }
  }

  // ---------- drawing ----------
  const level = () => Math.round(SKILLS.reduce((a, s) => a + levelOf(S.xp[s.id]), 0) / SKILLS.length);
  function draw() {
    const M = MOODS[moodNow];
    el.style.setProperty('--mood', M.col);
    el.querySelector('.nm').textContent = getName?.() || 'You';
    el.querySelector('.mood span').textContent = M.word;
    el.querySelector('.lv').textContent = String(level());
    NEEDS.forEach(([k, n]) => { const s = el.querySelector(`[data-n="${k}"]`); s.querySelector('b i').style.width = `${Math.round(S.need[k] * 100)}%`; s.classList.toggle('low', S.need[k] < 0.25); s.title = `${n} ${Math.round(S.need[k] * 100)}%`; });
    const pet = getPet?.(); dogEl.classList.toggle('on', !!pet); dogEl.title = pet ? `Play as ${pet.name} (Q)` : '';
    if (panel.classList.contains('on')) drawPanel();
  }
  function drawPanel() {
    const M = MOODS[moodNow], pet = getPet?.(), fr = getFriends?.() || [];
    const why = { tired: 'Rest on a bench, or sleep at home.', hungry: 'Cook at home, or buy food from a stall.', lonely: 'Say hi to someone (E), or chat.', bored: 'Play a sport, play with your pet, visit a park.', angry: 'You lost reputation. Walk it off.', annoyed: 'Something went wrong. It passes.' }[moodNow] || 'Keep doing what you are doing.';
    panel.style.setProperty('--mood', M.col);
    panel.innerHTML = `<button class="x" aria-label="Close">✕</button>
      <div class="hd"><span class="lvl"><span><small>Level</small>${level()}</span></span><div><h3>${getName?.() || 'You'}</h3><div class="sub">Builder in ${document.getElementById('b-title')?.textContent || 'the city'}</div></div></div>
      <div class="moodline"><span>Feeling <b>${M.word.toLowerCase()}</b>. ${why}</span></div>
      <h4>Needs</h4><div class="needs">${NEEDS.map(([k, n]) => { const v = Math.round(S.need[k] * 100); return `<div class="need ${S.need[k] < 0.25 ? 'low' : ''}"><div class="r">${glyph(k)}${n}<em>${v}%</em></div><div class="bar"><i style="width:${v}%"></i></div></div>`; }).join('')}</div>
      <h4>Skills</h4>${SKILLS.map((s) => { const xp = S.xp[s.id], lv = levelOf(xp), a = xpFor(lv), b = xpFor(lv + 1), u = lv >= 10 ? 1 : (xp - a) / (b - a); return `<div class="sk"><span class="ic">${glyph(s.id)}</span><b>${s.name}</b><em>Level ${lv}${lv >= 10 ? ' · max' : ''}</em><div class="bar"><i style="width:${Math.round(u * 100)}%"></i></div><small>${s.how}</small></div>`; }).join('')}
      ${pet ? `<h4>${pet.name}'s friends</h4>${fr.length ? `<div class="fr">${fr.map((f) => `<span>${f}</span>`).join('')}</div>` : `<div class="sub">None yet. Walk ${pet.name} near other animals; play as ${pet.name} (Q) to go and say hello.</div>`}` : ''}`;
    panel.querySelector('.x').onclick = () => panel.classList.remove('on');
  }
  // the full status goes beside the bottom-left column (dock.js), however wide it is with your pet's bar or the bag in
  // it, and no higher than the objective card; on a narrow screen, above the column instead
  const place = () => {
    const d = document.getElementById('lk-dock')?.getBoundingClientRect(), ob = document.getElementById('lk-obj')?.getBoundingClientRect(), top = (ob && ob.height ? ob.bottom : 120) + 12;
    let bottom = 60;
    if (d && innerWidth > 760) { panel.style.left = `${Math.round(d.right + 12)}px`; }
    else if (d) { panel.style.left = '14px'; bottom = Math.round(innerHeight - d.top + 10); }
    panel.style.bottom = `${bottom}px`; panel.style.maxHeight = `${Math.max(200, innerHeight - bottom - top)}px`;
  };
  addEventListener('resize', () => { if (panel.classList.contains('on')) place(); });
  const toggle = (v = !panel.classList.contains('on')) => { panel.classList.toggle('on', v); if (v) { drawPanel(); place(); } };
  ph.onclick = () => toggle(); el.querySelector('.card').onclick = () => toggle();
  dogEl.onclick = () => onDog?.();
  draw(); syncCommits();

  return {
    el, update, toggle, feel, gain, bump, get mood() { return moodNow; }, get state() { return S; },
    setDriving(v) { dogEl.classList.toggle('driving', !!v); },
    // where the two live portraits go on the screen (CSS pixels), for the renderer
    rects() { const show = !document.body.classList.contains('nohud') && !document.body.classList.contains('bw-cine') && getComputedStyle(el).display !== 'none'; if (!show) return []; const out = [['me', ph.getBoundingClientRect()]]; if (dogEl.classList.contains('on')) out.push(['dog', dogEl.getBoundingClientRect()]); return out; },
    dispose() { offs.forEach((f) => f()); el.remove(); panel.remove(); st.remove(); save(); },
  };
}

// ---------- the live portraits: a small camera on your face (and your dog's), drawn into the circles ----------
// Each is rendered into its own small target about twelve times a second (cheap: the camera only sees a metre or
// two), then drawn every frame into its circle, after the main picture.
export function createPortraits(renderer) {
  const SIZE = 192;
  const slots = new Map();
  const mask = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 63, 0, Math.PI * 2); g.fill(); return new THREE.CanvasTexture(cv); })();
  const quad = new THREE.Scene(), ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const slot = (id) => {
    if (slots.has(id)) return slots.get(id);
    const rt = new THREE.WebGLRenderTarget(SIZE, SIZE, { samples: 4 }); rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: rt.texture, alphaMap: mask, transparent: true, depthTest: false, depthWrite: false }));
    const s = { rt, mesh, cam: new THREE.PerspectiveCamera(28, 1, 0.05, 3.2), t: 0 }; slots.set(id, s); return s;
  };
  const bg = new THREE.Color('#efe2c4'), prevClear = new THREE.Color();
  return {
    // shoot(id, scene, eye, at, dt, show[], hide[]) renders a slot when it is due; `show` made visible for it, `hide` hidden
    shoot(id, scene, eye, at, dt, show = [], hide = []) {
      const s = slot(id); s.t -= dt; if (s.t > 0) return; s.t = 1 / 12;
      s.cam.position.copy(eye); s.cam.lookAt(at);
      const vis = [...show, ...hide].map((o) => [o, o.visible]); show.forEach((o) => { o.visible = true; }); hide.forEach((o) => { o.visible = false; });
      const fog = scene.fog, back = scene.background; scene.fog = null; scene.background = bg;
      const prevT = renderer.getRenderTarget(), alpha = renderer.getClearAlpha(); renderer.getClearColor(prevClear);
      renderer.setRenderTarget(s.rt); renderer.render(scene, s.cam);
      renderer.setRenderTarget(prevT); renderer.setClearColor(prevClear, alpha);
      scene.fog = fog; scene.background = back; vis.forEach(([o, v]) => { o.visible = v; });
    },
    // draw the slots into their circles (CSS pixel rects from profile.rects())
    blit(rects) {
      if (!rects.length) return;
      const auto = renderer.autoClear, vp = new THREE.Vector4(); renderer.getViewport(vp);
      renderer.autoClear = false; renderer.setScissorTest(true);
      rects.forEach(([id, r]) => {
        const s = slots.get(id); if (!s || r.width < 4) return;
        const y = innerHeight - r.bottom; renderer.setViewport(r.left, y, r.width, r.height); renderer.setScissor(r.left, y, r.width, r.height);
        quad.add(s.mesh); renderer.render(quad, ortho); quad.remove(s.mesh);
      });
      renderer.setScissorTest(false); renderer.setViewport(vp); renderer.autoClear = auto;
    },
    dispose() { slots.forEach((s) => { s.rt.dispose(); s.mesh.material.dispose(); }); mask.dispose(); },
  };
}
