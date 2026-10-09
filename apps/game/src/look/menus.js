// Menus for a world of developers: a dev phone (Tab), the district map (M), a bag of
// gadgets (I), and a first-visit controls guide drawn as line art.
// Patterns borrowed from the references Elvis shared; the look stays Builders World.

import { BUILDERS } from '../builders.js';
import { loadProfile } from '../onboarding/state.js';
import { C, FONT, KIT_CSS, loadFont, pattern, backdropSVG, personFor, portraitSVG, figureSVG, art, appIcon, placeArt, ribbonSVG } from './uikit.js';

const CSS = `${KIT_CSS}
#lkm-dim { position: fixed; inset: 0; z-index: 30; background: rgba(5,8,18,.55); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
  opacity: 0; pointer-events: none; transition: opacity .2s ease; }
#lkm-dim.on { opacity: 1; pointer-events: auto; }
.lkm-hints { position: fixed; right: 18px; bottom: 16px; z-index: 32; display: flex; gap: 8px; }
.lkm-hints span { display: inline-flex; align-items: center; gap: 8px; padding: 7px 16px 7px 7px; border-radius: 999px; background: ${C.paper}; color: ${C.ink};
  font: 700 16px/1 ${FONT}; box-shadow: 0 3px 0 rgba(59,42,32,.22); }
.lkm-hints b { display: grid; place-items: center; min-width: 26px; height: 26px; padding: 0 6px; border-radius: 999px; background: ${C.ink}; color: ${C.paper}; font-size: 12px; }

/* dev phone: cream, chunky glyph apps, the hovered app's name as the title */
#lkm-phone { position: fixed; z-index: 31; left: max(4vw, 24px); top: 50%; width: 330px; height: min(600px, calc(100vh - 80px)); transform: translate(-20px, -50%) scale(.96);
  opacity: 0; pointer-events: none; transition: opacity .18s ease, transform .22s ease; border-radius: 64px; background: ${C.paper}; padding: 0;
  box-shadow: 0 6px 0 rgba(59,42,32,.22), 0 30px 80px rgba(0,0,0,.45); }
#lkm-phone.on { opacity: 1; pointer-events: auto; transform: translate(0, -50%) scale(1); }
#lkm-phone .scr { height: 100%; padding: 26px 26px 20px; box-sizing: border-box; display: flex; flex-direction: column; color: ${C.ink}; font-family: ${FONT}; }
#lkm-phone .bar { display: flex; justify-content: space-between; align-items: center; font: 700 15px/1 ${FONT}; color: #b9ab93; padding: 4px 8px 0; }
#lkm-phone .bar svg { width: 22px; height: 22px; }
#lkm-phone h2 { margin: 16px 0 16px; text-align: center; font: 800 30px/1 ${FONT}; color: ${C.ink}; }
#lkm-phone .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 12px; }
#lkm-phone .app { border: 0; background: none; padding: 0; cursor: pointer; display: grid; justify-items: center; }
#lkm-phone .app i { width: 80px; height: 80px; border-radius: 28px; display: grid; place-items: center; box-shadow: inset 0 -5px 0 rgba(59,42,32,.14); transition: transform .12s ease; }
#lkm-phone .app span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
#lkm-phone .app:hover i, #lkm-phone .app:focus-visible i { transform: translateY(-3px) scale(1.05); box-shadow: inset 0 -5px 0 rgba(59,42,32,.14), 0 0 0 4px #fff, 0 0 0 7px ${C.amber}; }
#lkm-phone .app:focus-visible { outline: none; }
#lkm-phone .dots { margin-top: auto; display: flex; justify-content: center; gap: 8px; padding-top: 10px; }
#lkm-phone .dots i { width: 12px; height: 12px; border-radius: 50%; background: #d9ccb2; }
#lkm-phone .dots i.on { background: #fff; box-shadow: 0 0 0 3px ${C.teal}; }

/* map: the district as an illustrated island on the lagoon */
#lkm-map { position: fixed; inset: 0; z-index: 31; display: grid; grid-template-columns: 250px 1fr 230px; gap: 18px; padding: 26px 28px 74px; box-sizing: border-box;
  opacity: 0; pointer-events: none; transition: opacity .2s ease; color: ${C.ink}; font-family: ${FONT};
  background: ${C.sea} ${pattern('roofs', 'rgba(47,128,116,.16)')}; }
#lkm-map.on { opacity: 1; pointer-events: auto; }
#lkm-map .col { position: relative; padding: 70px 16px 18px; overflow: auto; border-radius: 40px 60px 50px 40px / 50px 40px 60px 50px; background: ${C.sea2} ${pattern('waves', 'rgba(255,255,255,.16)')}; }
#lkm-map h3 { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); margin: 0; padding: 8px 26px; border-radius: 999px; background: #5bae9d; color: #fff; font: 800 22px/1 ${FONT}; white-space: nowrap; }
#lkm-map .res { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 10px; }
#lkm-map .res button, #lkm-map .places button { border: 0; cursor: pointer; font: inherit; color: inherit; background: none; padding: 0; }
#lkm-map .res button { display: grid; justify-items: center; gap: 2px; font: 700 13px/1.1 ${FONT}; color: #fff; text-shadow: 0 1px 0 rgba(0,0,0,.2); }
#lkm-map .res .hs { position: relative; width: 86px; height: 82px; display: grid; place-items: end center; clip-path: polygon(50% 0, 100% 38%, 92% 38%, 92% 100%, 8% 100%, 8% 38%, 0 38%);
  background: rgba(255,255,255,.22); transition: transform .12s ease; }
#lkm-map .res .hs svg { margin-bottom: -2px; }
#lkm-map .res button:hover .hs, #lkm-map .res button.sel .hs, #lkm-map .res button:focus-visible .hs { background: #fff; transform: scale(1.08); }
#lkm-map .res button:focus-visible { outline: none; }
#lkm-map .res .live { position: absolute; top: 30px; right: 14px; width: 12px; height: 12px; border-radius: 50%; background: #5fe08d; box-shadow: 0 0 0 2.5px #fff; }
#lkm-map .mid { position: relative; display: grid; place-items: center; min-height: 0; }
#lkm-map .ribbon { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); z-index: 2; width: 380px; height: 84px; display: grid; place-items: center; }
#lkm-map .ribbon svg { position: absolute; inset: 0; width: 100%; height: 100%; }
#lkm-map .ribbon b { position: relative; margin-top: -10px; font: 800 34px/1 ${FONT}; color: ${C.ink}; text-align: center; }
#lkm-map .ribbon small { display: block; font: 700 12px/1.3 ${FONT}; letter-spacing: .16em; text-transform: uppercase; color: #7a5410; }
#lkm-map canvas { width: min(100%, calc(100vh - 120px)); aspect-ratio: 1; cursor: pointer; }
#lkm-map .bubble { position: absolute; pointer-events: none; transform: translate(-50%, calc(-100% - 22px)); background: #f2ead6; color: ${C.ink}; padding: 10px 22px; border-radius: 28px;
  font: 800 22px/1.1 ${FONT}; white-space: nowrap; display: none; box-shadow: 0 4px 0 rgba(59,42,32,.15); }
#lkm-map .bubble::after { content: ''; position: absolute; left: 50%; bottom: -10px; width: 18px; height: 18px; background: #f2ead6; transform: translateX(-50%) rotate(45deg); border-radius: 3px; }
#lkm-map .places { display: grid; gap: 4px; }
#lkm-map .places button { display: grid; justify-items: center; transition: transform .12s ease; }
#lkm-map .places button span { margin-top: -10px; padding: 4px 12px; border-radius: 999px; background: ${C.paper}; font: 700 13px/1.15 ${FONT}; text-align: center; box-shadow: 0 3px 0 rgba(59,42,32,.15); }
#lkm-map .places button small { display: block; color: ${C.ink2}; font-size: 11.5px; font-weight: 600; }
#lkm-map .places button:hover, #lkm-map .places button.sel, #lkm-map .places button:focus-visible { transform: translateY(-3px) scale(1.04); outline: none; }
#lkm-map .places button.sel span { background: ${C.amber}; }
#lkm-map .hint { margin: 12px 6px 0; color: #fff; font: 600 12.5px/1.45 ${FONT}; text-shadow: 0 1px 0 rgba(0,0,0,.15); }

/* bag: you in the middle, what you carry in a ring around you (the wardrobe screen) */
#lkm-bag { position: fixed; inset: 0; z-index: 31; opacity: 0; pointer-events: none; transition: opacity .2s ease; font-family: ${FONT}; color: ${C.ink};
  background: ${C.indigo} center / cover no-repeat; overflow: hidden; }
#lkm-bag.on { opacity: 1; pointer-events: auto; }
#lkm-bag .tabs { position: absolute; top: 24px; left: 28px; display: flex; gap: 8px; z-index: 3; }
#lkm-bag .tabs button { border: 0; border-radius: 999px; padding: 9px 18px; background: rgba(255,255,255,.14); color: #fff; font: 700 15px/1 ${FONT}; cursor: pointer; }
#lkm-bag .tabs button.on { background: ${C.paper}; color: ${C.ink}; box-shadow: 0 3px 0 rgba(0,0,0,.2); }
#lkm-bag .stage { position: absolute; left: 50%; top: 52%; width: 760px; height: 640px; transform: translate(-50%, -50%) scale(var(--k, 1)); }
#lkm-bag .disc { position: absolute; left: 50%; top: 50%; width: 360px; height: 420px; transform: translate(-50%, -50%); border-radius: 46% 54% 50% 50% / 52% 48% 52% 48%;
  background: #2c4489 ${pattern('roofs', 'rgba(108,140,220,.28)')}; }
#lkm-bag .fig { position: absolute; left: 50%; top: 50%; width: 230px; transform: translate(-50%, -52%); }
#lkm-bag .it { position: absolute; width: 132px; height: 132px; transform: translate(-50%, -50%); border: 0; padding: 0; background: none; cursor: pointer; display: grid; place-items: center; transition: transform .14s ease; }
#lkm-bag .it .fl { position: absolute; inset: 0; }
#lkm-bag .it .fl path { fill: rgba(255,255,255,.2); stroke: rgba(255,255,255,.28); stroke-width: 2; }
#lkm-bag .it svg.a { position: relative; filter: drop-shadow(0 3px 0 rgba(0,0,0,.18)); }
#lkm-bag .it:hover, #lkm-bag .it:focus-visible { transform: translate(-50%, -50%) scale(1.07); outline: none; }
#lkm-bag .it.sel .fl path { fill: ${C.paper}; stroke: ${C.amber}; stroke-width: 5; }
#lkm-bag .it.locked svg.a { filter: grayscale(1) opacity(.5); }
#lkm-bag .it .eq { position: absolute; top: 14px; right: 18px; width: 22px; height: 22px; border-radius: 50%; background: #5fe08d; box-shadow: 0 0 0 3px #fff; display: grid; place-items: center; color: #10331c; font: 800 13px/1 ${FONT}; }
#lkm-bag .name { position: absolute; left: 50%; top: 18px; transform: translateX(-50%); z-index: 3; padding: 12px 34px; border-radius: 999px; background: ${C.teal}; color: #fff;
  font: 800 28px/1 ${FONT}; white-space: nowrap; box-shadow: 0 5px 0 rgba(0,0,0,.2); }
#lkm-bag .name::after { content: ''; position: absolute; left: 50%; bottom: -9px; width: 18px; height: 18px; background: ${C.teal}; transform: translateX(-50%) rotate(45deg); border-radius: 3px; }
#lkm-bag .card { position: absolute; left: 28px; bottom: 24px; width: min(330px, calc(100vw - 56px)); padding: 16px 18px; z-index: 3; }
#lkm-bag .card .tag { display: inline-block; font: 700 11.5px/1 ${FONT}; padding: 5px 10px; border-radius: 999px; background: ${C.paper2}; color: ${C.ink2}; margin-bottom: 8px; }
#lkm-bag .card p { margin: 0; font: 600 14.5px/1.45 ${FONT}; }
#lkm-bag .acts { position: absolute; right: 18px; bottom: 16px; display: flex; gap: 8px; z-index: 3; }
#lkm-bag .acts button { border: 0; cursor: pointer; }
#lkm-bag .acts button[disabled] { opacity: .55; cursor: default; }
/* first-visit guide, line art over the darkened street */
#lkm-guide { position: fixed; inset: 0; z-index: 33; display: grid; place-items: center; background: radial-gradient(ellipse at center, rgba(5,8,18,.55), rgba(5,8,18,.85));
  color: #fff; opacity: 0; pointer-events: none; transition: opacity .5s ease; font: 800 15px/1 "Avenir Next", system-ui, sans-serif; letter-spacing: .12em; }
#lkm-guide.on { opacity: 1; pointer-events: auto; }
#lkm-guide .row { display: flex; align-items: flex-end; gap: clamp(28px, 6vw, 80px); flex-wrap: wrap; justify-content: center; padding: 0 24px; }
#lkm-guide .g { display: grid; justify-items: center; gap: 16px; }
#lkm-guide .keys { display: grid; grid-template-columns: repeat(3, 54px); gap: 8px; }
#lkm-guide kbd { display: grid; place-items: center; height: 54px; min-width: 54px; padding: 0 10px; box-sizing: border-box; border: 2.5px solid #fff; border-radius: 12px;
  font: 800 18px/1 "Avenir Next", system-ui, sans-serif; letter-spacing: 0; }
#lkm-guide svg { stroke: #fff; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
#lkm-guide .or { opacity: .8; margin: 0 4px 20px; }
#lkm-guide .skip { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); font: 600 12px/1 system-ui; letter-spacing: .08em; opacity: .65; }
#lkm-tip { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 14; font: 600 12px/1 system-ui; color: rgba(238,242,255,.7);
  display: flex; gap: 14px; pointer-events: none; }
body.nohud #lkm-tip { display: none; }
#lkm-tip b { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 4px; margin-right: 5px; border-radius: 5px; background: rgba(238,242,255,.85); color: #0d1326; font-size: 10.5px; }
@media (max-width: 700px) {
  #lkm-map { grid-template-columns: 1fr; grid-template-rows: auto auto auto; padding: 70px 12px 70px; overflow: auto; align-content: start; }
  #lkm-map .mid { order: -1; }
  #lkm-map .ribbon { top: -62px; width: 280px; height: 66px; } #lkm-map .ribbon b { font-size: 26px; }
  #lkm-map canvas { width: 100%; }
  #lkm-map .col { padding-top: 62px; }
  #lkm-map .res { grid-template-columns: repeat(4, 1fr); }
  #lkm-map .res .hs { width: 70px; height: 68px; }
  #lkm-map .places { grid-template-columns: repeat(2, 1fr); }
  #lkm-bag .name { font-size: 20px; top: 64px; padding: 9px 22px; }
  #lkm-bag .tabs { left: 12px; right: 12px; top: 14px; flex-wrap: wrap; }
  #lkm-bag .card { left: 12px; bottom: 64px; width: calc(100vw - 24px); box-sizing: border-box; padding: 12px 14px; }
  #lkm-phone { left: 50%; width: min(340px, calc(100vw - 32px)); transform: translate(-50%, -50%) scale(.96); }
  #lkm-phone.on { transform: translate(-50%, -50%) scale(1); }
  #lkm-tip { display: none; }
}
@media (prefers-reduced-motion: reduce) { #lkm-dim, #lkm-phone, #lkm-map, #lkm-bag, #lkm-guide { transition: none; } }
`;

// ---------- what a developer carries ----------
const ITEMS = [
  { id: 'laptop', tab: 'gadgets', icon: 'laptop', name: 'Laptop', desc: 'Your main machine. Later, linking it to your presence agent will show you working at a bench when you are really coding.', tag: 'Gadget' },
  { id: 'phone', tab: 'gadgets', icon: 'phone', name: 'Phone', desc: 'This phone. Tab opens it anywhere in the world.', tag: 'Gadget', always: true },
  { id: 'tablet', tab: 'gadgets', icon: 'tablet', name: 'Tablet', desc: 'For sketching flows and reading docs on the danfo.', tag: 'Gadget' },
  { id: 'keyboard', tab: 'gadgets', icon: 'keyboard', name: 'Mechanical keyboard', desc: 'Loud, proud, and on every desk in the Creative Hub.', tag: 'Gadget' },
  { id: 'powerbank', tab: 'gadgets', icon: 'powerbank', name: 'Power bank', desc: 'For when the power goes in the middle of a deploy.', tag: 'Gadget' },
  { id: 'router', tab: 'gadgets', icon: 'router', name: 'MiFi router', desc: 'Your own data when the cafe wifi gives up.', tag: 'Gadget' },
  { id: 'notebook', tab: 'gadgets', icon: 'notebook', name: 'Notebook', desc: 'Paper still wins for system diagrams.', tag: 'Gadget' },
  { id: 'headphones', tab: 'wear', icon: 'headphones', name: 'Headphones', desc: 'Deep work mode. Shows on your avatar.', tag: 'Wearable', wear: true },
  { id: 'backpack', tab: 'wear', icon: 'backpack', name: 'Laptop backpack', desc: 'Carries the whole setup. Shows on your avatar.', tag: 'Wearable', wear: true },
  { id: 'cap', tab: 'wear', icon: 'cap', name: 'Cap', desc: 'Hackathon merch. Shows on your avatar.', tag: 'Wearable', wear: true },
  { id: 'glasses', tab: 'wear', icon: 'glasses', name: 'Glasses', desc: 'Blue light filter included. Shows on your avatar.', tag: 'Wearable', wear: true },
  { id: 'firstpush', tab: 'badges', icon: 'push', name: 'First push', desc: 'Earned from a verified push to a public repo.', tag: 'Badge · from verified work', locked: true },
  { id: 'merged', tab: 'badges', icon: 'merge', name: 'Merged upstream', desc: 'Earned when a PR to a repo you do not own is merged.', tag: 'Badge · from verified work', locked: true },
  { id: 'launch', tab: 'badges', icon: 'launch', name: 'Launched', desc: 'Earned from a verified Product Hunt launch.', tag: 'Badge · from verified work', locked: true },
  { id: 'streak', tab: 'badges', icon: 'streak', name: '30-day streak', desc: 'Earned from 30 days with a qualifying push.', tag: 'Badge · from verified work', locked: true },
];

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const placeName = (world) => world.place?.name ?? 'Yaba';
export function createMenus({ world, props, weatherFeed, getPlayer, getPath, snapToStreet, onRoute, onEquip, onPhoto, onRide, toast }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.innerHTML = `<div id="lkm-dim"></div><div id="lkm-phone" role="dialog" aria-label="Phone"><div class="scr"></div></div>
    <div id="lkm-map" role="dialog" aria-label="Map of ${placeName(world)}"></div><div id="lkm-bag" role="dialog" aria-label="Bag"></div>
    <div class="lkm-hints" hidden></div><div id="lkm-guide" role="dialog" aria-label="Controls"></div>
    <div id="lkm-tip"><span><b>Tab</b>Phone</span><span><b>M</b>Map</span><span><b>I</b>Bag</span><span><b>E</b>Interact</span><span><b>Shift</b>Run</span><span><b>Space</b>Jump</span><span><b>V</b>Camera</span><span><b>C</b>Travel</span></div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const dim = $('#lkm-dim'), phone = $('#lkm-phone'), mapEl = $('#lkm-map'), bagEl = $('#lkm-bag'), hints = $('.lkm-hints'), guide = $('#lkm-guide');
  let open = null;
  loadFont();
  const profile = (() => { try { return loadProfile(); } catch { return null; } })();
  const me = { color: profile?.avatar?.color || '#e2b13c' };
  me.look = personFor((BUILDERS.find((b) => b.id === 'you')?.seed ?? 1) * 31 + Math.max(0, BUILDERS.findIndex((b) => b.id === 'you')) * 5, { shirt: me.color });
  let equipped = store.get('bw-bag-equipped', ['backpack']);
  equipped.forEach((id) => onEquip?.(id, true));

  function setHints(list) {
    hints.hidden = !list;
    hints.innerHTML = (list || []).map(([k, t]) => `<span><b>${k}</b>${t}</span>`).join('');
  }
  function close() {
    [phone, mapEl, bagEl].forEach((p) => p.classList.remove('on'));
    dim.classList.remove('on');
    setHints(null);
    open = null;
  }
  function show(el, hintList) {
    close();
    dim.classList.add('on');
    el.classList.add('on');
    setHints(hintList);
    open = el;
  }
  dim.onclick = close;

  // ---------- phone ----------
  const APPS = [
    ['Map', 'map', '#8ed3c4', () => openMap()],
    ['Bag', 'bag', '#f2c46b', () => openBag()],
    ['Board', 'board', '#f6b3a8', () => { close(); props.openBoard?.(); }],
    ['Builders', 'people', '#a9dc8f', () => openMap(true)],
    ['Camera', 'camera', '#d3b4f2', () => { close(); onPhoto?.(); }],
    ['Ride', 'car', '#f7d36b', () => { close(); onRide?.(); }],
    ['Build', 'build', '#9fd6ef', () => { close(); onRoute?.(props.area, 'Community build area'); }],
    ['Cities', 'cities', '#f4c98a', () => { close(); location.search = '?world=1&view=cities'; }],
    ['Weather', 'weather', '#aebcff', () => { const w = weatherFeed?.state; toast(w ? `${w.loc.label}: ${w.label}${w.tempC != null ? `, ${Math.round(w.tempC)}°C` : ''}. Updated every 10 minutes.` : 'Weather is loading.'); }],
    ['Settings', 'settings', '#d8cfbd', () => toast('Quality, sound and accessibility settings land here next.')],
    ['Help', 'help', '#f0e1bd', () => { close(); showGuide(); }],
  ];
  const SIGNAL = `<svg viewBox="0 0 24 24"><path d="M3 18h3v3H3zM8 14h3v7H8zM13 10h3v11h-3zM18 6h3v15h-3z" fill="currentColor"/></svg>`;
  const LOCPIN = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 18s-5-5-5-8a5 5 0 0 1 10 0c0 3-5 8-5 8z" fill="currentColor"/></svg>`;
  function openPhone() {
    const time = weatherFeed ? weatherFeed.localTime() : new Date().toTimeString().slice(0, 5);
    phone.querySelector('.scr').innerHTML = `
      <div class="bar">${SIGNAL}<span>${time}</span>${LOCPIN}</div>
      <h2>Builders</h2>
      <div class="grid">${APPS.map(([n, i, c], k) => `<button class="app" data-k="${k}" aria-label="${n}"><i style="background:${c}">${appIcon(i)}</i><span>${n}</span></button>`).join('')}</div>
      <div class="dots"><i class="on"></i><i></i></div>`;
    const title = phone.querySelector('h2');
    phone.querySelectorAll('.app').forEach((b) => {
      const name = APPS[+b.dataset.k][0];
      b.onclick = () => APPS[+b.dataset.k][3]();
      b.onmouseenter = b.onfocus = () => { title.textContent = name; };
    });
    phone.querySelector('.grid').onmouseleave = () => { title.textContent = phone.contains(document.activeElement) ? document.activeElement.getAttribute('aria-label') || 'Builders' : 'Builders'; };
    show(phone, [['Esc', 'Put away'], ['Enter', 'Open']]);
    phone.querySelector('.app')?.focus();
  }

  // ---------- map ----------
  const places = [
    props.interact.find((i) => i.id === 'board') && { id: 'board', name: 'Community board', sub: 'Notes and neighbours', art: 'board', glyph: 'board', at: props.interact.find((i) => i.id === 'board') },
    props.area && { id: 'build', name: 'Build area', sub: `Add a bench for ${placeName(world)}`, art: 'build', glyph: 'build', at: props.area },
    props.hubAt && { id: 'hub', name: `${placeName(world)} Creative Hub`, sub: 'Desks, wifi, people', art: 'hub', glyph: 'people', at: props.hubAt },
    (() => { const p = world.plots.find((pl) => pl.b.id === 'you'); return p && { id: 'home', name: 'Your plot', sub: 'Grows with your work', art: 'home', glyph: 'home', at: { x: p.center.x, z: p.center.z } }; })(),
  ].filter(Boolean);
  // facility badges on the map: black discs with a light glyph, drawn once from SVG
  const badges = {};
  places.forEach((pl) => {
    const glyph = appIcon(pl.glyph).replaceAll(C.ink, '#__INK').replaceAll(C.paper, C.ink).replaceAll('#__INK', C.paper);
    const img = new Image();
    img.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="30" fill="${C.ink}" stroke="#fff" stroke-width="3"/><g transform="translate(10 10) scale(.92)">${glyph.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g></svg>`)}`;
    img.onload = () => { if (open === mapEl) drawBigMap(); };
    badges[pl.id] = img;
  });
  const people = BUILDERS.map((b, i) => ({ b, look: personFor((b.seed ?? 1) * 31 + i * 5, b.id === 'you' ? { shirt: me.color } : {}) }));
  let selRes = null, selPlace = null;
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = mapCanvas.height = 900;
  const MAPR = world.radius * 1.12;
  const toPx = (x, z) => [(x / MAPR) * 360 + 450, (z / MAPR) * 360 + 450];
  // the island's edge: a hand-drawn wobble around the district
  const edge = (a, pad = 0) => 382 + pad + Math.sin(a * 3 + 1.2) * 10 + Math.sin(a * 7 + 0.4) * 6 + Math.sin(a * 13) * 3;
  const blob = (g, pad) => { g.beginPath(); for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2, r = edge(a, pad); i ? g.lineTo(450 + Math.cos(a) * r, 450 + Math.sin(a) * r) : g.moveTo(450 + Math.cos(a) * r, 450 + Math.sin(a) * r); } g.closePath(); };
  const ROOF = ['#efe3c8', '#e2a07c', '#a9d3d4', '#eacb7a', '#d3c3e2', '#f2d6b8'];
  const hash = (pts) => Math.abs(Math.round(pts[0][0] * 13 + pts[0][1] * 7));
  function drawBigMap() {
    const g = mapCanvas.getContext('2d');
    g.clearRect(0, 0, 900, 900);
    // grid over the lagoon, letters and numbers like a paper map
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.setLineDash([10, 10]); g.lineWidth = 2;
    for (let i = 1; i < 7; i++) { const v = 45 + i * 115; g.beginPath(); g.moveTo(v, 40); g.lineTo(v, 860); g.stroke(); g.beginPath(); g.moveTo(40, v); g.lineTo(860, v); g.stroke(); }
    g.setLineDash([]);
    g.fillStyle = 'rgba(59,42,32,.45)'; g.font = `700 24px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    'ABCDEFG'.split('').forEach((l, i) => g.fillText(l, 20, 102 + i * 115));
    for (let i = 0; i < 7; i++) g.fillText(String(i + 1), 102 + i * 115, 884);
    // sand rim, then land
    g.fillStyle = '#f1dfaa'; blob(g, 16); g.fill();
    g.fillStyle = '#e5cd92'; blob(g, 7); g.fill();
    g.save(); blob(g, 0); g.clip();
    g.fillStyle = C.leaf; g.fillRect(0, 0, 900, 900);
    g.fillStyle = 'rgba(140,200,105,.55)';
    for (let i = 0; i < 26; i++) { const a = i * 2.4, r = (i * 53) % 330; g.beginPath(); g.arc(450 + Math.cos(a) * r, 450 + Math.sin(a) * r, 40 + (i % 5) * 12, 0, 7); g.fill(); }
    // trees as little triangles, where the street trees really are
    g.fillStyle = '#4f8a3a';
    (world.trees || []).forEach((t) => { const [x, y] = toPx(t.x, t.z); g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 6, y + 4); g.lineTo(x - 6, y + 4); g.closePath(); g.fill(); });
    // roads: a darker casing under a cream surface
    g.lineCap = 'round'; g.lineJoin = 'round';
    const roads = world.roads.filter((r) => !['footway', 'path', 'cycleway', 'pedestrian'].includes(r.cls));
    const line = (r) => { g.beginPath(); r.pts.forEach(([x, z], i) => { const [px, py] = toPx(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); };
    roads.forEach((r) => { g.strokeStyle = '#c4a46c'; g.lineWidth = Math.max(9, r.w * 1.5) + 6; line(r); g.stroke(); });
    roads.forEach((r) => { g.strokeStyle = '#f0deb0'; g.lineWidth = Math.max(9, r.w * 1.5); line(r); g.stroke(); });
    world.roads.filter((r) => !roads.includes(r)).forEach((r) => { g.strokeStyle = 'rgba(240,222,176,.8)'; g.lineWidth = 3; g.setLineDash([2, 7]); line(r); g.stroke(); g.setLineDash([]); });
    // buildings: coloured roofs with a soft shadow, like blocks on a model
    (world.footprints || []).forEach((pts) => {
      const path = () => { g.beginPath(); pts.forEach(([x, z], i) => { const [px, py] = toPx(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); };
      g.save(); g.translate(2.5, 3.5); g.fillStyle = 'rgba(59,42,32,.28)'; path(); g.fill(); g.restore();
      g.fillStyle = ROOF[hash(pts) % ROOF.length]; path(); g.fill();
      g.strokeStyle = 'rgba(59,42,32,.4)'; g.lineWidth = 1.4; g.stroke();
    });
    g.restore();
    // street names: once per street, on its longest stretch, never on top of another
    g.font = `800 15px ${FONT}`;
    const taken = [];
    const byName = new Map();
    roads.forEach((r) => { if (!r.name) return; const L = r.pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - r.pts[i - 1][0], p[1] - r.pts[i - 1][1]) : 0), 0); if (L > 70 && (!byName.has(r.name) || byName.get(r.name).L < L)) byName.set(r.name, { r, L }); });
    [...byName.values()].sort((a, b) => b.L - a.L).forEach(({ r }) => {
      const k = Math.floor(r.pts.length / 2), m = r.pts[Math.max(0, k - 1)], n = r.pts[k];
      const [px, py] = toPx((m[0] + n[0]) / 2, (m[1] + n[1]) / 2), [ax, ay] = toPx(m[0], m[1]), [bx, by] = toPx(n[0], n[1]);
      if (Math.hypot(px - 450, py - 450) > 340) return;
      const w = g.measureText(r.name).width;
      if (taken.some((t) => Math.abs(t.x - px) < (t.w + w) / 2 + 6 && Math.abs(t.y - py) < 30)) return;
      taken.push({ x: px, y: py, w });
      let a = Math.atan2(by - ay, bx - ax); if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
      g.save(); g.translate(px, py); g.rotate(a);
      g.lineWidth = 5; g.strokeStyle = '#f0deb0'; g.strokeText(r.name, 0, 1); g.fillStyle = C.ink; g.fillText(r.name, 0, 1);
      g.restore();
    });
    // neighbours' plots as little houses, yours in amber
    world.plots.forEach((p, i) => {
      const [x, y] = toPx(p.center.x, p.center.z);
      const sel = selRes === p.b.id;
      g.fillStyle = p.b.id === 'you' ? C.amber : ['#f2a35e', '#f2a35e', '#e98a6a', '#f2b85e'][i % 4];
      g.strokeStyle = sel ? '#fff' : C.ink; g.lineWidth = sel ? 5 : 2.6;
      const s = sel ? 1.35 : 1;
      g.beginPath(); g.moveTo(x, y - 16 * s); g.lineTo(x + 15 * s, y - 3 * s); g.lineTo(x + 11 * s, y - 3 * s); g.lineTo(x + 11 * s, y + 11 * s); g.lineTo(x - 11 * s, y + 11 * s); g.lineTo(x - 11 * s, y - 3 * s); g.lineTo(x - 15 * s, y - 3 * s); g.closePath();
      g.stroke(); g.fill(); if (sel) { g.strokeStyle = C.ink; g.lineWidth = 2.6; g.stroke(); }
      g.fillStyle = C.ink; g.fillRect(x - 3 * s, y + 3 * s, 6 * s, 8 * s);
    });
    // places as black badges
    places.forEach((pl) => {
      const [x, y] = toPx(pl.at.x, pl.at.z), r = selPlace === pl.id ? 26 : 19;
      if (badges[pl.id]?.complete) g.drawImage(badges[pl.id], x - r, y - r, r * 2, r * 2);
    });
    // the route: white footsteps over a teal line
    const route = getPath?.();
    if (route) {
      const pathTo = () => { g.beginPath(); route.forEach((p, i) => { const [x, y] = toPx(p.x, p.z); i ? g.lineTo(x, y) : g.moveTo(x, y); }); };
      g.strokeStyle = C.teal; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; pathTo(); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 6; g.setLineDash([1, 13]); pathTo(); g.stroke(); g.setLineDash([]);
    }
    // you are here: a coral pin
    const me2 = getPlayer();
    const [px, py] = toPx(me2.x, me2.z);
    g.fillStyle = C.coral; g.strokeStyle = '#fff'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(px, py); g.bezierCurveTo(px - 22, py - 26, px - 18, py - 52, px, py - 52); g.bezierCurveTo(px + 18, py - 52, px + 22, py - 26, px, py); g.closePath(); g.stroke(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py - 34, 8, 0, 7); g.fill();
  }
  function openMap(focusResidents = false) {
    mapEl.innerHTML = `
      <div class="col"><h3>Residents</h3><div class="res">${people.map(({ b, look }) => `<button data-id="${b.id}" class="${selRes === b.id ? 'sel' : ''}" aria-label="${b.name}">
        <span class="hs">${portraitSVG(look, 64)}${b.live ? '<i class="live" title="Building now"></i>' : ''}</span>${b.name.split(' ')[0]}</button>`).join('')}</div></div>
      <div class="mid"><div class="ribbon">${ribbonSVG(380)}<b>${placeName(world)}<small>${world.place?.city ?? 'Lagos'}</small></b></div><div class="bubble"></div></div>
      <div class="col"><h3>Places</h3><div class="places">${places.map((p) => `<button data-p="${p.id}" class="${selPlace === p.id ? 'sel' : ''}">${placeArt(p.art)}<span>${p.name}<small>${p.sub}</small></span></button>`).join('')}</div>
        <p class="hint">Pick a resident or a place, or tap any street, and a trail will lead you there.</p></div>`;
    mapEl.querySelector('.mid').prepend(mapCanvas);
    drawBigMap();
    const bubble = mapEl.querySelector('.bubble');
    const showBubble = (x, z, text) => {
      const r = mapCanvas.getBoundingClientRect(), m = mapEl.querySelector('.mid').getBoundingClientRect();
      const [px, py] = toPx(x, z);
      bubble.textContent = text; bubble.style.display = 'block';
      bubble.style.left = `${r.left - m.left + (px / 900) * r.width}px`; bubble.style.top = `${r.top - m.top + (py / 900) * r.height}px`;
    };
    mapCanvas.onclick = (ev) => {
      const r = mapCanvas.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * 900, py = ((ev.clientY - r.top) / r.height) * 900;
      const wx = ((px - 450) / 360) * MAPR, wz = ((py - 450) / 360) * MAPR;
      const s = snapToStreet?.(wx, wz);
      if (!s || s.d > 25) { toast('Pick a point on or near a street.'); return; }
      selPlace = null; selRes = null;
      onRoute?.({ x: s.x, z: s.z }, 'your marker', true);
      setTimeout(() => { drawBigMap(); showBubble(s.x, s.z, 'Your marker'); }, 50);
    };
    mapEl.querySelectorAll('.res button').forEach((b) => {
      b.onclick = () => {
        selRes = b.dataset.id; selPlace = null;
        mapEl.querySelectorAll('.res button').forEach((x) => x.classList.toggle('sel', x === b));
        drawBigMap();
        const p = world.plots.find((pl) => pl.b.id === selRes);
        if (p) { const f = world.frontOf([p.center.x, p.center.z]); onRoute?.({ x: f.x, z: f.z }, `${p.b.name.split(' ')[0]}'s plot`, true); setTimeout(() => { drawBigMap(); showBubble(p.center.x, p.center.z, p.b.name.split(' ')[0]); }, 50); }
      };
    });
    mapEl.querySelectorAll('.places button').forEach((b) => {
      b.onclick = () => {
        const p = places.find((x) => x.id === b.dataset.p);
        selPlace = p.id; selRes = null;
        mapEl.querySelectorAll('.places button').forEach((x) => x.classList.toggle('sel', x === b));
        onRoute?.(p.at, p.name, true);
        setTimeout(() => { drawBigMap(); showBubble(p.at.x, p.at.z, p.name); }, 50);
      };
    });
    show(mapEl, [['M', 'Close'], ['Click', 'Set a destination']]);
    if (focusResidents) mapEl.querySelector('.res button')?.focus();
  }

  // ---------- bag ----------
  // a scalloped tile, like the wardrobe ring
  const FLOWER = (() => { let d = ''; for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2, r = 58 + Math.cos(a * 7) * 5; d += `${i ? 'L' : 'M'}${(66 + Math.cos(a) * r).toFixed(1)} ${(66 + Math.sin(a) * r).toFixed(1)}`; } return `<svg class="fl" viewBox="0 0 132 132"><path d="${d}Z"/></svg>`; })();
  let bagTab = 'gadgets', bagSel = 'laptop', bagResize = false;
  function openBag() {
    const list = ITEMS.filter((i) => i.tab === bagTab);
    if (!list.find((i) => i.id === bagSel)) bagSel = list[0].id;
    const it = ITEMS.find((i) => i.id === bagSel);
    const isOn = equipped.includes(it.id);
    const n = list.length, rx = 300, ry = 238;
    const verb = it.locked ? 'Not earned yet' : it.always ? 'Always with you' : isOn ? (it.wear ? 'Take off' : 'Put back') : (it.wear ? 'Wear' : 'Carry');
    bagEl.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(backdropSVG())}")`;
    bagEl.innerHTML = `
      <div class="tabs" role="tablist">${[['gadgets', 'Gadgets'], ['wear', 'Wearables'], ['badges', 'Badges']].map(([k, nm]) => `<button role="tab" data-t="${k}" class="${bagTab === k ? 'on' : ''}" aria-selected="${bagTab === k}">${nm}</button>`).join('')}</div>
      <div class="name">${it.name}</div>
      <div class="stage"><div class="disc"></div><div class="fig">${figureSVG(me.look, equipped)}</div>
        ${list.map((i, k) => { const a = -Math.PI / 2 + (k / n) * Math.PI * 2; return `<button class="it ${i.id === bagSel ? 'sel' : ''} ${i.locked ? 'locked' : ''}" data-i="${i.id}" aria-label="${i.name}" style="left:${380 + Math.cos(a) * rx}px;top:${320 + Math.sin(a) * ry}px">${FLOWER}<svg class="a" viewBox="0 0 64 64" width="76" height="76">${art(i.id).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>${equipped.includes(i.id) ? '<span class="eq">✓</span>' : ''}</button>`; }).join('')}</div>
      <div class="card bw-paper"><span class="tag">${it.tag}</span><p>${it.desc}</p></div>
      <div class="acts"><button class="bw-chip act" ${it.locked || it.always ? 'disabled' : ''}><b>Enter</b>${verb}</button><button class="bw-chip cl"><b>I</b>Close</button></div>`;
    const fit = () => { const k = Math.min(1, (innerWidth - 20) / 780, (innerHeight - 170) / 640); bagEl.querySelector('.stage')?.style.setProperty('--k', String(Math.max(0.42, k))); };
    fit(); if (!bagResize) { bagResize = true; addEventListener("resize", () => { if (open === bagEl) bagEl.querySelector(".stage")?.style.setProperty("--k", String(Math.max(0.42, Math.min(1, (innerWidth - 20) / 780, (innerHeight - 170) / 640)))); }); }
    bagEl.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => { bagTab = b.dataset.t; openBag(); }; });
    bagEl.querySelectorAll('.it').forEach((b) => { b.onclick = () => { if (bagSel === b.dataset.i) bagEl.querySelector('.act:not([disabled])')?.click(); else { bagSel = b.dataset.i; openBag(); bagEl.querySelector(`.it[data-i="${bagSel}"]`)?.focus(); } }; });
    bagEl.querySelector('.cl').onclick = close;
    const act = bagEl.querySelector('.act:not([disabled])');
    if (act) act.onclick = () => {
      const on = !equipped.includes(it.id);
      equipped = on ? [...equipped, it.id] : equipped.filter((x) => x !== it.id);
      store.set('bw-bag-equipped', equipped);
      onEquip?.(it.id, on);
      openBag();
      bagEl.querySelector(`.it[data-i="${it.id}"]`)?.focus();
    };
    show(bagEl, null);
  }

  // ---------- first-visit guide ----------
  const touch = matchMedia('(pointer: coarse)').matches;
  function showGuide() {
    guide.innerHTML = touch ? `
      <div class="row">
        <div class="g"><svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="44"/><circle cx="60" cy="60" r="16"/></svg>MOVE</div>
        <div class="g"><svg width="120" height="120" viewBox="0 0 120 120"><path d="M40 70V40a8 8 0 0 1 16 0v26M56 50a8 8 0 0 1 16 0v14M72 56a8 8 0 0 1 16 0v18c0 18-10 30-28 30S34 92 30 80l-6-14a7 7 0 0 1 12-6l4 6"/><path d="M14 30h20M86 30h20M20 24l-6 6 6 6M100 24l6 6-6 6"/></svg>DRAG TO LOOK</div>
        <div class="g"><svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="56" r="10"/><circle cx="60" cy="56" r="24" stroke-dasharray="6 8"/><path d="M60 90v14"/></svg>TAP TO WALK</div>
      </div><div class="skip">TAP ANYWHERE TO START</div>` : `
      <div class="row">
        <div class="g"><div class="keys"><span></span><kbd>W</kbd><span></span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>MOVE</div>
        <div class="g"><svg width="110" height="130" viewBox="0 0 110 130"><rect x="18" y="10" width="74" height="110" rx="37"/><path d="M55 10v40M18 50h74"/><path d="M4 70h10M96 70h10M8 64l-6 6 6 6M102 64l6 6-6 6"/></svg>DRAG TO LOOK</div>
        <div class="g"><kbd>E</kbd>INTERACT</div>
        <div class="g"><div style="display:flex;gap:8px"><kbd style="min-width:84px">Shift</kbd><kbd style="min-width:110px">Space</kbd></div>RUN · JUMP</div>
        <div class="g"><kbd>V</kbd>CAMERA</div>
        <div class="or">OR</div>
        <div class="g"><div style="display:flex;gap:8px"><kbd style="min-width:72px">Tab</kbd><kbd>M</kbd><kbd>I</kbd></div>PHONE · MAP · BAG</div>
      </div><div class="skip">PRESS ANY KEY TO START</div>`;
    guide.classList.add('on');
    const done = () => {
      guide.classList.remove('on');
      store.set('bw-guide-seen', 1);
      removeEventListener('keydown', done, true); guide.removeEventListener('pointerdown', done);
    };
    setTimeout(() => { addEventListener('keydown', done, true); guide.addEventListener('pointerdown', done); }, 400);
    setTimeout(done, 12000);
  }
  if (!store.get('bw-guide-seen', 0) && !new URLSearchParams(location.search).has('still')) setTimeout(showGuide, 1800);

  // keys from the street: returns true when a menu used the key
  function key(k) {
    if (k === 'tab') { open === phone ? close() : openPhone(); return true; }
    if (k === 'm') { open === mapEl ? close() : openMap(); return true; }
    if (k === 'i') { open === bagEl ? close() : openBag(); return true; }
    if (k === 'escape' && open) { close(); return true; }
    return !!open && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', 'q'].includes(k);
  }

  function dispose() { root.remove(); style.remove(); }
  return { key, close, isOpen: () => !!open, openPhone, openMap, openBag, showGuide, dispose };
}
