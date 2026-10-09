// Menus for a world of developers: a dev phone (Tab), the district map (M), a bag of
// gadgets (I), and a first-visit controls guide drawn as line art.
// Patterns borrowed from the references Elvis shared; the look stays Builders World.

import { BUILDERS } from '../builders.js';

const CSS = `
#lkm-dim { position: fixed; inset: 0; z-index: 30; background: rgba(5,8,18,.55); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
  opacity: 0; pointer-events: none; transition: opacity .2s ease; }
#lkm-dim.on { opacity: 1; pointer-events: auto; }
.lkm-hints { position: fixed; right: 18px; bottom: 16px; z-index: 32; display: flex; gap: 8px; }
.lkm-hints span { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px 7px 7px; border-radius: 999px; background: #f4ead2; color: #3a2f28;
  font: 650 14px/1 ui-sans-serif, system-ui, sans-serif; }
.lkm-hints b { display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 5px; border-radius: 999px; background: #3a2f28; color: #f4ead2; font-size: 11px; }

/* dev phone */
#lkm-phone { position: fixed; z-index: 31; left: max(4vw, 24px); top: 50%; width: 340px; height: min(620px, calc(100vh - 80px)); transform: translate(-20px, -50%) scale(.96);
  opacity: 0; pointer-events: none; transition: opacity .18s ease, transform .22s ease; border-radius: 46px; background: #0f1524; padding: 10px;
  box-shadow: 0 30px 80px rgba(0,0,0,.55), inset 0 0 0 2px #2a3350; }
#lkm-phone.on { opacity: 1; pointer-events: auto; transform: translate(0, -50%) scale(1); }
#lkm-phone .scr { height: 100%; border-radius: 38px; background: linear-gradient(170deg, #f7efdc, #efe3c7); padding: 18px 20px; box-sizing: border-box;
  display: flex; flex-direction: column; color: #3a2f28; font-family: ui-rounded, "SF Pro Rounded", system-ui, sans-serif; }
#lkm-phone .bar { display: flex; justify-content: space-between; align-items: center; font: 650 13px/1 inherit; color: #8b7d6b; padding: 4px 6px 0; }
#lkm-phone h2 { margin: 18px 0 14px; text-align: center; font: 800 24px/1 inherit; }
#lkm-phone .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px 12px; }
#lkm-phone .app { border: 0; background: none; padding: 0; cursor: pointer; display: grid; justify-items: center; gap: 7px; color: #5b4d40; font: 650 11.5px/1.1 inherit; }
#lkm-phone .app i { width: 78px; height: 78px; border-radius: 24px; display: grid; place-items: center; box-shadow: inset 0 -4px 0 rgba(0,0,0,.12); transition: transform .12s ease; }
#lkm-phone .app i svg { width: 40px; height: 40px; }
#lkm-phone .app:hover i, #lkm-phone .app:focus-visible i { transform: translateY(-3px) scale(1.04); }
#lkm-phone .app:focus-visible { outline: none; }
#lkm-phone .app:focus-visible span { text-decoration: underline; }
#lkm-phone .foot { margin-top: auto; text-align: center; font-size: 12px; color: #8b7d6b; padding-bottom: 6px; }

/* map */
#lkm-map { position: fixed; inset: 0; z-index: 31; display: grid; grid-template-columns: 240px 1fr 240px; gap: 22px; padding: 28px 28px 70px; box-sizing: border-box;
  opacity: 0; pointer-events: none; transition: opacity .2s ease; color: #eef2ff; }
#lkm-map.on { opacity: 1; pointer-events: auto; }
#lkm-map .col { background: rgba(14,22,40,.82); border: 1px solid rgba(255,255,255,.08); border-radius: 26px; padding: 18px; overflow: auto; }
#lkm-map h3 { margin: 0 0 14px; font: 800 18px/1 ui-rounded, system-ui, sans-serif; letter-spacing: .02em; }
#lkm-map .res { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
#lkm-map .res button, #lkm-map .places button { border: 0; cursor: pointer; font: inherit; color: inherit; }
#lkm-map .res button { background: rgba(255,255,255,.05); border-radius: 18px; padding: 10px 6px 8px; display: grid; justify-items: center; gap: 6px; font-size: 11.5px; }
#lkm-map .res button.sel { background: rgba(242,179,61,.18); box-shadow: inset 0 0 0 2px #f2b33d; }
#lkm-map .res .av { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; font: 800 18px/1 system-ui; color: #10131c; position: relative; }
#lkm-map .res .av.live::after { content: ''; position: absolute; right: 1px; bottom: 3px; width: 11px; height: 11px; border-radius: 50%; background: #5fe08d; box-shadow: 0 0 0 2px #0e1628; }
#lkm-map .mid { position: relative; display: grid; place-items: center; }
#lkm-map .ribbon { position: absolute; top: -6px; left: 50%; transform: translateX(-50%); z-index: 2; background: #f2b33d; color: #2a1a02; padding: 10px 46px 12px;
  font: 900 26px/1 ui-rounded, system-ui, sans-serif; letter-spacing: .04em; clip-path: polygon(0 0, 100% 0, 94% 50%, 100% 100%, 0 100%, 6% 50%); }
#lkm-map .ribbon small { display: block; text-align: center; font: 700 11px/1.4 system-ui; letter-spacing: .14em; text-transform: uppercase; opacity: .7; }
#lkm-map canvas { width: min(100%, calc(100vh - 140px)); aspect-ratio: 1; border-radius: 30px; box-shadow: 0 20px 60px rgba(0,0,0,.5); cursor: crosshair; }
#lkm-map .bubble { position: absolute; pointer-events: none; transform: translate(-50%, -130%); background: #f4ead2; color: #3a2f28; padding: 8px 16px; border-radius: 16px;
  font: 750 15px/1.2 system-ui; white-space: nowrap; display: none; }
#lkm-map .places { display: grid; gap: 8px; }
#lkm-map .places button { display: flex; align-items: center; gap: 12px; text-align: left; padding: 10px 12px; border-radius: 16px; background: rgba(255,255,255,.05); font-size: 13px; }
#lkm-map .places button:hover, #lkm-map .places button.sel { background: rgba(242,179,61,.16); }
#lkm-map .places i { width: 36px; height: 36px; flex: none; border-radius: 50%; display: grid; place-items: center; }
#lkm-map .places i svg { width: 20px; height: 20px; }
#lkm-map .places small { display: block; color: #a3afd0; font-size: 11.5px; margin-top: 2px; }

/* bag */
#lkm-bag { position: fixed; z-index: 31; left: 50%; top: 50%; width: min(860px, calc(100vw - 32px)); height: min(560px, calc(100vh - 100px)); transform: translate(-50%, -48%);
  opacity: 0; pointer-events: none; transition: opacity .18s ease, transform .2s ease; display: grid; grid-template-columns: 1fr 280px; gap: 18px; }
#lkm-bag.on { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%); }
#lkm-bag .main, #lkm-bag .side { background: rgba(14,22,40,.9); border: 1px solid rgba(255,255,255,.08); border-radius: 26px; padding: 20px; color: #eef2ff; overflow: auto; }
#lkm-bag h3 { margin: 0 0 4px; font: 800 22px/1 ui-rounded, system-ui, sans-serif; }
#lkm-bag .sub { color: #a3afd0; font-size: 12.5px; margin-bottom: 14px; }
#lkm-bag .tabs { display: flex; gap: 6px; margin-bottom: 16px; }
#lkm-bag .tabs button { border: 0; border-radius: 999px; padding: 8px 14px; background: rgba(255,255,255,.07); color: #dfe5f7; font: 650 13px/1 inherit; cursor: pointer; }
#lkm-bag .tabs button.on { background: #f2b33d; color: #2a1a02; }
#lkm-bag .items { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 12px; }
#lkm-bag .it { position: relative; border: 0; border-radius: 20px; background: rgba(255,255,255,.05); color: #eef2ff; padding: 14px 8px 10px; display: grid; justify-items: center; gap: 8px;
  font: 600 12px/1.2 inherit; cursor: pointer; }
#lkm-bag .it svg { width: 46px; height: 46px; }
#lkm-bag .it.sel { box-shadow: inset 0 0 0 2px #f2b33d; background: rgba(242,179,61,.12); }
#lkm-bag .it.locked { opacity: .45; }
#lkm-bag .it .eq { position: absolute; top: 8px; right: 8px; width: 9px; height: 9px; border-radius: 50%; background: #5fe08d; }
#lkm-bag .side .big { display: grid; place-items: center; height: 150px; border-radius: 20px; background: radial-gradient(circle at 50% 40%, rgba(242,179,61,.18), transparent 70%); }
#lkm-bag .side .big svg { width: 96px; height: 96px; }
#lkm-bag .side h4 { margin: 14px 0 6px; font: 800 18px/1.1 system-ui; }
#lkm-bag .side p { color: #c5cde6; font-size: 13px; line-height: 1.5; margin: 0 0 10px; }
#lkm-bag .side .tag { display: inline-block; font-size: 11px; padding: 3px 8px; border-radius: 6px; background: rgba(255,255,255,.08); color: #a3afd0; margin-bottom: 12px; }
#lkm-bag .side button.act { width: 100%; border: 0; border-radius: 12px; padding: 11px; background: #f2b33d; color: #2a1a02; font: 750 14px/1 inherit; cursor: pointer; }
#lkm-bag .side button.act[disabled] { background: rgba(255,255,255,.08); color: #6f7ca3; cursor: default; }

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
  #lkm-map { grid-template-columns: 1fr; grid-template-rows: auto 1fr auto; padding: 16px 16px 64px; overflow: auto; }
  #lkm-map .col { max-height: 160px; }
  #lkm-map .res { grid-template-columns: repeat(4, 1fr); }
  #lkm-bag { grid-template-columns: 1fr; height: calc(100vh - 90px); overflow: auto; }
  #lkm-phone { left: 50%; width: min(340px, calc(100vw - 32px)); transform: translate(-50%, -50%) scale(.96); }
  #lkm-phone.on { transform: translate(-50%, -50%) scale(1); }
  #lkm-tip { display: none; }
}
@media (prefers-reduced-motion: reduce) { #lkm-dim, #lkm-phone, #lkm-map, #lkm-bag, #lkm-guide { transition: none; } }
`;

// ---------- icons: one stroke family, so menus feel like one product ----------
const ic = (d, color = 'currentColor', w = 2.2) => `<svg viewBox="0 0 48 48" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  map: ic('<path d="M6 12l11-4 14 5 11-4v27l-11 4-14-5-11 4z"/><path d="M17 8v27M31 13v27"/>'),
  bag: ic('<rect x="9" y="16" width="30" height="24" rx="6"/><path d="M17 16v-3a7 7 0 0 1 14 0v3M9 26h30"/>'),
  board: ic('<rect x="8" y="9" width="32" height="24" rx="3"/><path d="M14 33v8M34 33v8M14 16h8M14 22h14M28 15l4 4"/>'),
  people: ic('<circle cx="18" cy="17" r="6"/><circle cx="33" cy="19" r="5"/><path d="M7 38c1-7 6-11 11-11s10 4 11 11M28 30c5-1 11 2 12 8"/>'),
  camera: ic('<rect x="7" y="14" width="34" height="24" rx="5"/><circle cx="24" cy="26" r="7"/><path d="M17 14l3-5h8l3 5"/>'),
  build: ic('<path d="M8 34h32M12 34v6M36 34v6M10 27h28M14 27v7M34 27v7"/><path d="M24 8v12M18 14l6-6 6 6"/>'),
  cities: ic('<path d="M24 6l16 9-16 9-16-9z"/><path d="M8 24l16 9 16-9M8 33l16 9 16-9"/>'),
  weather: ic('<path d="M14 32a8 8 0 1 1 3-15 10 10 0 0 1 19 4 6 6 0 0 1-1 11z"/><path d="M18 38l-2 4M26 38l-2 4M34 38l-2 4"/>'),
  settings: ic('<circle cx="24" cy="24" r="6"/><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4"/>'),
  car: ic('<path d="M8 30l3-10a4 4 0 0 1 4-3h18a4 4 0 0 1 4 3l3 10"/><rect x="6" y="28" width="36" height="9" rx="3"/><circle cx="14" cy="38" r="3"/><circle cx="34" cy="38" r="3"/>'),
  help: ic('<circle cx="24" cy="24" r="17"/><path d="M19 19a5 5 0 1 1 7 5c-2 1-2 2-2 4M24 34v.5"/>'),
  laptop: ic('<rect x="10" y="11" width="28" height="19" rx="2"/><path d="M5 35h38l-3 4H8z"/><path d="M19 20l-3 3 3 3M29 20l3 3-3 3"/>'),
  phone: ic('<rect x="15" y="5" width="18" height="38" rx="4"/><path d="M22 38h4"/>'),
  tablet: ic('<rect x="9" y="7" width="30" height="34" rx="4"/><path d="M22 36h4M15 15h18M15 21h12"/>'),
  keyboard: ic('<rect x="5" y="15" width="38" height="18" rx="3"/><path d="M10 21h2M16 21h2M22 21h2M28 21h2M34 21h4M10 27h4M18 27h12M34 27h4"/>'),
  headphones: ic('<path d="M9 30v-6a15 15 0 0 1 30 0v6"/><rect x="6" y="28" width="8" height="12" rx="3"/><rect x="34" y="28" width="8" height="12" rx="3"/>'),
  powerbank: ic('<rect x="13" y="8" width="22" height="34" rx="4"/><path d="M26 15l-5 9h6l-5 9"/>'),
  router: ic('<rect x="8" y="26" width="32" height="12" rx="3"/><path d="M14 32h2M20 32h2M24 26V14M17 18a10 10 0 0 1 14 0M13 13a16 16 0 0 1 22 0"/>'),
  notebook: ic('<rect x="11" y="6" width="26" height="36" rx="3"/><path d="M17 6v36M22 15h10M22 21h10"/>'),
  backpack: ic('<path d="M14 18a10 10 0 0 1 20 0v20a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z"/><path d="M19 9a5 5 0 0 1 10 0M14 27h20M20 27v5h8v-5"/>'),
  cap: ic('<path d="M10 28a14 14 0 0 1 28 0z"/><path d="M38 28h6"/><path d="M24 14v-2"/>'),
  glasses: ic('<circle cx="15" cy="27" r="7"/><circle cx="33" cy="27" r="7"/><path d="M22 26c1-1 3-1 4 0M8 25l-3-6M40 25l3-6"/>'),
  push: ic('<circle cx="24" cy="12" r="4"/><circle cx="24" cy="36" r="4"/><path d="M24 16v16"/>'),
  launch: ic('<path d="M24 6c6 5 8 12 6 20l-6 6-6-6c-2-8 0-15 6-20z"/><path d="M18 30l-5 5M30 30l5 5M24 34v8"/>'),
  streak: ic('<path d="M24 6c2 8 10 10 10 20a10 10 0 0 1-20 0c0-5 3-8 5-10 0 4 2 6 4 6 0-6-1-10 1-16z"/>'),
  merge: ic('<circle cx="14" cy="10" r="4"/><circle cx="14" cy="38" r="4"/><circle cx="34" cy="24" r="4"/><path d="M14 14v20M14 18c0 6 8 6 16 6"/>'),
  pin: ic('<path d="M24 42s12-12 12-22a12 12 0 0 0-24 0c0 10 12 22 12 22z"/><circle cx="24" cy="20" r="4"/>'),
  hub: ic('<rect x="8" y="14" width="32" height="26" rx="2"/><path d="M8 24h32M16 14V8h16v6"/>'),
  home: ic('<path d="M8 22L24 9l16 13"/><path d="M12 19v20h24V19M20 39V28h8v11"/>'),
  monument: ic('<path d="M18 42V14l6-8 6 8v28M14 42h20M18 24h12"/>'),
};

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
const COLORS = ['#7fd3b0', '#9cb3ff', '#f6a8a0', '#f7e27a', '#c9a7f5', '#8fd0f0', '#f2b33d', '#a8e0d0'];

const placeName = (world) => world.place?.name ?? 'Yaba';
export function createMenus({ world, props, weatherFeed, getPlayer, getPath, snapToStreet, onRoute, onEquip, onPhoto, onRide, toast }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.innerHTML = `<div id="lkm-dim"></div><div id="lkm-phone" role="dialog" aria-label="Phone"><div class="scr"></div></div>
    <div id="lkm-map" role="dialog" aria-label="Map of ${placeName(world)}"></div><div id="lkm-bag" role="dialog" aria-label="Bag"></div>
    <div class="lkm-hints" hidden></div><div id="lkm-guide" role="dialog" aria-label="Controls"></div>
    <div id="lkm-tip"><span><b>Tab</b>Phone</span><span><b>M</b>Map</span><span><b>I</b>Bag</span><span><b>E</b>Interact</span><span><b>V</b>Camera</span></div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const dim = $('#lkm-dim'), phone = $('#lkm-phone'), mapEl = $('#lkm-map'), bagEl = $('#lkm-bag'), hints = $('.lkm-hints'), guide = $('#lkm-guide');
  let open = null;
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
    ['Map', 'map', '#6fc7b8', () => openMap()],
    ['Bag', 'bag', '#f2b33d', () => openBag()],
    ['Board', 'board', '#f6a8a0', () => { close(); props.openBoard?.(); }],
    ['Builders', 'people', '#9be08f', () => openMap(true)],
    ['Camera', 'camera', '#c9a7f5', () => { close(); onPhoto?.(); }],
    ['Ride', 'car', '#f2b33d', () => { close(); onRide?.(); }],
    ['Build', 'build', '#8fd0f0', () => { close(); onRoute?.(props.area, 'Community build area'); }],
    ['Cities', 'cities', '#f6c66e', () => { close(); location.search = '?world=1&view=cities'; }],
    ['Weather', 'weather', '#9cb3ff', () => { const w = weatherFeed?.state; toast(w ? `${w.loc.label}: ${w.label}${w.tempC != null ? `, ${Math.round(w.tempC)}°C` : ''}. Updated every 10 minutes.` : 'Weather is loading.'); }],
    ['Settings', 'settings', '#cfc6b4', () => toast('Quality, sound and accessibility settings land here next.')],
    ['Help', 'help', '#f4ead2', () => { close(); showGuide(); }],
  ];
  function openPhone() {
    const w = weatherFeed?.state;
    const time = weatherFeed ? weatherFeed.localTime() : new Date().toTimeString().slice(0, 5);
    phone.querySelector('.scr').innerHTML = `
      <div class="bar"><span>${w?.tempC != null ? `${Math.round(w.tempC)}° ${w.label}` : placeName(world)}</span><span>${time}</span><span>${world.via === 'sample' ? 'Sample' : placeName(world)}</span></div>
      <h2>Builders</h2>
      <div class="grid">${APPS.map(([n, i, c], k) => `<button class="app" data-k="${k}"><i style="background:${c}">${ICON[i].replace('currentColor', '#2b2420')}</i><span>${n}</span></button>`).join('')}</div>
      <div class="foot">Your phone. Tab opens and closes it.</div>`;
    phone.querySelectorAll('.app').forEach((b) => { b.onclick = () => APPS[+b.dataset.k][3](); });
    show(phone, [['Esc', 'Put away'], ['Enter', 'Open']]);
    phone.querySelector('.app')?.focus();
  }

  // ---------- map ----------
  const places = [
    props.interact.find((i) => i.id === 'board') && { id: 'board', name: 'Community board', sub: 'Notes and neighbours', icon: 'board', color: '#f6a8a0', at: props.interact.find((i) => i.id === 'board') },
    props.area && { id: 'build', name: 'Community build area', sub: `Add a bench for ${placeName(world)}`, icon: 'build', color: '#3ad1c0', at: props.area },
    props.hubAt && { id: 'hub', name: `${placeName(world)} Creative Hub`, sub: 'Desks, wifi, people', icon: 'hub', color: '#f2b33d', at: props.hubAt },
    (() => { const p = world.plots.find((pl) => pl.b.id === 'you'); return p && { id: 'home', name: 'Your plot', sub: 'Grows with your verified work', icon: 'home', color: '#f7e27a', at: { x: p.center.x, z: p.center.z } }; })(),
  ].filter(Boolean);
  let selRes = null, selPlace = null;
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = mapCanvas.height = 900;
  const MAPR = world.radius * 1.05;
  const toPx = (x, z) => [(x / MAPR) * 380 + 450, (z / MAPR) * 380 + 450];
  function drawBigMap() {
    const g = mapCanvas.getContext('2d');
    g.clearRect(0, 0, 900, 900);
    // land and water, Animal Crossing style but in the night palette
    g.fillStyle = '#16304a'; g.fillRect(0, 0, 900, 900);
    g.fillStyle = '#23405e';
    g.beginPath(); g.arc(450, 450, 405, 0, 7); g.fill();
    g.fillStyle = '#2b4a3a';
    g.beginPath(); g.arc(450, 450, 392, 0, 7); g.fill();
    // grid
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.setLineDash([6, 8]); g.lineWidth = 1.5;
    for (let i = 1; i < 7; i++) { const v = 60 + i * 111; g.beginPath(); g.moveTo(v, 40); g.lineTo(v, 860); g.stroke(); g.beginPath(); g.moveTo(40, v); g.lineTo(860, v); g.stroke(); }
    g.setLineDash([]);
    g.fillStyle = 'rgba(255,255,255,.45)'; g.font = '700 20px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    'ABCDEFG'.split('').forEach((l, i) => g.fillText(l, 22, 60 + 55 + i * 111));
    for (let i = 0; i < 7; i++) g.fillText(String(i + 1), 60 + 55 + i * 111, 882);
    // buildings
    const blds = world.footprints || [];
    g.fillStyle = 'rgba(214,220,232,.28)';
    blds.forEach((pts) => { g.beginPath(); pts.forEach(([x, z], i) => { const [px, py] = toPx(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fill(); });
    // roads
    g.lineCap = 'round'; g.lineJoin = 'round';
    world.roads.forEach((r) => {
      const foot = ['footway', 'path', 'cycleway', 'pedestrian'].includes(r.cls);
      g.strokeStyle = foot ? 'rgba(232,214,170,.5)' : '#d9c9a0';
      g.lineWidth = foot ? 3 : Math.max(5, r.w * 1.6);
      g.beginPath(); r.pts.forEach(([x, z], i) => { const [px, py] = toPx(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke();
    });
    // street names along the longest roads
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '700 15px system-ui';
    const named = new Set();
    world.roads.filter((r) => r.name && !named.has(r.name)).forEach((r) => {
      named.add(r.name);
      const m = r.pts[Math.floor(r.pts.length / 2)], n = r.pts[Math.min(r.pts.length - 1, Math.floor(r.pts.length / 2) + 1)];
      const [px, py] = toPx(m[0], m[1]), [qx, qy] = toPx(n[0], n[1]);
      let a = Math.atan2(qy - py, qx - px); if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
      g.save(); g.translate(px, py); g.rotate(a); g.fillText(r.name, 0, -12); g.restore();
    });
    // plots as little houses
    world.plots.forEach((p, i) => {
      const [px, py] = toPx(p.center.x, p.center.z);
      const sel = selRes === p.b.id;
      g.fillStyle = sel ? '#f2b33d' : p.b.id === 'you' ? '#f7e27a' : COLORS[i % COLORS.length];
      g.beginPath(); g.moveTo(px, py - 16); g.lineTo(px + 14, py - 4); g.lineTo(px + 10, py - 4); g.lineTo(px + 10, py + 10); g.lineTo(px - 10, py + 10); g.lineTo(px - 10, py - 4); g.lineTo(px - 14, py - 4); g.closePath(); g.fill();
      if (sel) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); }
    });
    // places
    places.forEach((pl) => {
      const [px, py] = toPx(pl.at.x, pl.at.z);
      g.fillStyle = selPlace === pl.id ? '#ffffff' : '#0f1524';
      g.beginPath(); g.arc(px, py, 19, 0, 7); g.fill();
      g.fillStyle = pl.color; g.beginPath(); g.arc(px, py, 15, 0, 7); g.fill();
    });
    // the route, if one is set
    const route = getPath?.();
    if (route) {
      g.strokeStyle = '#c7f0ff'; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); route.forEach((p, i) => { const [x, y] = toPx(p.x, p.z); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
      g.strokeStyle = '#4fb6ff'; g.lineWidth = 6; g.stroke();
    }
    // you are here
    const pl = getPlayer();
    const [px, py] = toPx(pl.x, pl.z);
    g.fillStyle = '#4fb6ff'; g.strokeStyle = '#fff'; g.lineWidth = 3;
    g.beginPath(); g.arc(px, py, 11, 0, 7); g.fill(); g.stroke();
  }
  function openMap(focusResidents = false) {
    mapEl.innerHTML = `
      <div class="col"><h3>Residents</h3><div class="res">${BUILDERS.map((b, i) => `<button data-id="${b.id}" class="${selRes === b.id ? 'sel' : ''}">
        <span class="av ${b.live ? 'live' : ''}" style="background:${b.id === 'you' ? '#f7e27a' : COLORS[i % COLORS.length]}">${b.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>${b.name.split(' ')[0]}</button>`).join('')}</div></div>
      <div class="mid"><div class="ribbon">${placeName(world)}<small>${world.place?.city ?? 'Lagos'}</small></div><div class="bubble"></div></div>
      <div class="col"><h3>Places</h3><div class="places">${places.map((p) => `<button data-p="${p.id}" class="${selPlace === p.id ? 'sel' : ''}"><i style="background:${p.color}">${ICON[p.icon].replace('currentColor', '#10131c')}</i><span>${p.name}<small>${p.sub}</small></span></button>`).join('')}</div>
        <p style="color:#a3afd0;font-size:12px;line-height:1.5;margin-top:16px">Pick a place or a resident, or click any street, to set a destination. The trail follows the streets.</p></div>`;
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
      const wx = ((px - 450) / 380) * MAPR, wz = ((py - 450) / 380) * MAPR;
      const s = snapToStreet?.(wx, wz);
      if (!s || s.d > 25) { toast('Pick a point on or near a street.'); return; }
      selPlace = null; selRes = null;
      onRoute?.({ x: s.x, z: s.z }, 'your marker', true);
      setTimeout(() => { drawBigMap(); showBubble(s.x, s.z, 'Marker'); }, 50);
    };
    mapEl.querySelectorAll('.res button').forEach((b) => {
      b.onclick = () => {
        selRes = b.dataset.id; selPlace = null;
        mapEl.querySelectorAll('.res button').forEach((x) => x.classList.toggle('sel', x === b));
        drawBigMap();
        const p = world.plots.find((pl) => pl.b.id === selRes);
        if (p) { showBubble(p.center.x, p.center.z, p.b.name); const f = world.frontOf([p.center.x, p.center.z]); onRoute?.({ x: f.x, z: f.z }, `${p.b.name.split(' ')[0]}'s plot`, true); setTimeout(drawBigMap, 50); }
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
  let bagTab = 'gadgets', bagSel = 'laptop';
  function openBag() {
    const list = ITEMS.filter((i) => i.tab === bagTab);
    if (!list.find((i) => i.id === bagSel)) bagSel = list[0].id;
    const it = ITEMS.find((i) => i.id === bagSel);
    const isOn = equipped.includes(it.id);
    bagEl.innerHTML = `
      <div class="main"><h3>Bag</h3><div class="sub">What you carry around ${placeName(world)}. Linking your real gadgets comes later.</div>
        <div class="tabs">${[['gadgets', 'Gadgets'], ['wear', 'Wearables'], ['badges', 'Badges']].map(([k, n]) => `<button data-t="${k}" class="${bagTab === k ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div class="items">${list.map((i) => `<button class="it ${i.id === bagSel ? 'sel' : ''} ${i.locked ? 'locked' : ''}" data-i="${i.id}">${equipped.includes(i.id) ? '<span class="eq"></span>' : ''}${ICON[i.icon]}<span>${i.name}</span></button>`).join('')}</div></div>
      <div class="side"><div class="big">${ICON[it.icon].replace('currentColor', '#f2b33d')}</div><h4>${it.name}</h4><span class="tag">${it.tag}</span><p>${it.desc}</p>
        ${it.locked ? '<button class="act" disabled>Not earned yet</button>' : it.always ? '<button class="act" disabled>Always with you</button>' : `<button class="act">${isOn ? (it.wear ? 'Take off' : 'Put back') : (it.wear ? 'Wear' : 'Carry')}</button>`}</div>`;
    bagEl.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => { bagTab = b.dataset.t; openBag(); }; });
    bagEl.querySelectorAll('.it').forEach((b) => { b.onclick = () => { bagSel = b.dataset.i; openBag(); }; });
    const act = bagEl.querySelector('.act:not([disabled])');
    if (act) act.onclick = () => {
      const on = !equipped.includes(it.id);
      equipped = on ? [...equipped, it.id] : equipped.filter((x) => x !== it.id);
      store.set('bw-bag-equipped', equipped);
      onEquip?.(it.id, on);
      openBag();
    };
    show(bagEl, [['I', 'Close'], ['Click', 'Select']]);
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
