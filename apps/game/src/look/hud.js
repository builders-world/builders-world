import * as THREE from 'three';
import { createMenus } from './menus.js';
import { createNav, nearestOn, pathLength, pointAlong } from './nav.js';
import { createTrail } from './trail.js';
import { audioEngine, sfx } from './audio.js';
import { walletEngine, effortsMark, fmt } from './wallet.js';
import { C as K, FONT, loadFont } from './uikit.js';

// The in-world overlay from the reference screenshot: district and objective,
// minimap, a route on the ground, a contextual prompt, name tags and the board.

const CSS = `
#lk { position: fixed; inset: 0; pointer-events: none; z-index: 15; font-family: ${FONT}; }
body.nohud #lk { display: none; }
#lk .pane { background: ${K.paper}; border-radius: 20px; color: ${K.ink}; box-shadow: 0 4px 0 rgba(59,42,32,.2), 0 12px 30px rgba(10,14,30,.25); }
#lk-obj { position: absolute; top: 74px; left: 14px; padding: 12px 16px 12px 14px; min-width: 250px; }
#lk-obj .d { display: flex; align-items: center; gap: 9px; font: 800 20px/1 ${FONT}; }
#lk-obj .d svg { width: 20px; height: 20px; flex: none; }
#lk-obj ul { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 6px; }
#lk-obj li { display: flex; align-items: center; gap: 9px; font: 600 14px/1.25 ${FONT}; color: ${K.ink}; }
#lk-obj li i { width: 15px; height: 15px; border-radius: 50%; border: 2.5px solid ${K.teal}; flex: none; display: grid; place-items: center; font-style: normal; font-size: 10px; color: #10131c; }
#lk-obj li.done { color: ${K.ink2}; text-decoration: line-through; }
#lk-obj li.done i { background: ${K.teal}; }
#lk-obj li.todo i { border-color: #c9b998; }
#lk-obj li em { margin-left: auto; padding-left: 12px; font-style: normal; color: ${K.coral}; font-weight: 800; font-variant-numeric: tabular-nums; font-size: 12px; }
#lk-map { position: absolute; top: 68px; right: 14px; width: 156px; height: 156px; border-radius: 50%; overflow: hidden;
  border: 5px solid ${K.paper}; box-shadow: 0 4px 0 rgba(59,42,32,.2), 0 12px 30px rgba(10,14,30,.3); background: ${K.sea}; }
#lk-map canvas { width: 100%; height: 100%; display: block; }
#lk-prompt { position: absolute; left: 50%; bottom: 96px; transform: translate(-50%, 8px); opacity: 0; transition: opacity .2s ease, transform .2s ease;
  display: flex; align-items: center; gap: 12px; padding: 8px 20px 8px 8px; border-radius: 999px; font: 700 16px/1 ${FONT}; }
#lk-prompt.on { opacity: 1; transform: translate(-50%, 0); }
#lk kbd { display: inline-grid; place-items: center; min-width: 30px; height: 30px; padding: 0 7px; border-radius: 999px; background: ${K.ink}; color: ${K.paper};
  font: 700 14px/1 ${FONT}; }
#lk-keys { position: absolute; right: 66px; bottom: 14px; padding: 12px 16px; display: grid; grid-template-columns: auto auto; gap: 10px 14px; align-items: center;
  font-size: 13.5px; transition: opacity .6s ease; }
#lk-keys .wasd { display: grid; grid-template-columns: repeat(3, 24px); gap: 3px; }
#lk-keys .wasd kbd { min-width: 24px; height: 24px; font-size: 11px; }
#lk-keys.fade { opacity: 0; }
#lk-tags { position: absolute; inset: 0; }
#lk-tags div { position: absolute; transform: translate(-50%, -100%); display: flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px;
  background: ${K.paper}; color: ${K.ink}; font: 700 13.5px/1.2 ${FONT}; white-space: nowrap; box-shadow: 0 3px 0 rgba(59,42,32,.22); }
#lk-tags div b { width: 8px; height: 8px; border-radius: 50%; background: #3fbf6d; }
#lk-board { position: absolute; right: 186px; top: 74px; width: min(420px, calc(100vw - 32px)); max-height: calc(100vh - 250px); overflow: auto; padding: 18px;
  pointer-events: auto; display: none; }
#lk-board.on { display: block; }
#lk-board h2 { margin: 0 0 2px; font: 800 26px/1.1 ${FONT}; }
#lk-board .sub { color: ${K.ink2}; font-size: 12.5px; margin-bottom: 14px; }
#lk-board h3 { margin: 16px 0 8px; font: 800 15px/1 ${FONT}; color: ${K.teal}; }
#lk-board .who { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 2px dashed #e3d4b4; }
#lk-board .who .av { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: 12px; color: #10131c; }
#lk-board .who .n { font-weight: 650; }
#lk-board .who .s { color: ${K.ink2}; font-size: 12.5px; }
#lk-board .who svg { margin-left: auto; width: 18px; height: 18px; color: ${K.ink2}; }
#lk-board .note { padding: 10px 12px; border-radius: 4px 14px 14px 14px; margin-bottom: 8px; color: ${K.ink}; font: 600 14px/1.35 ${FONT}; box-shadow: 0 3px 0 rgba(59,42,32,.15); transform: rotate(-.6deg); }
#lk-board textarea { width: 100%; box-sizing: border-box; min-height: 64px; border-radius: 14px; border: 2px solid #e3d4b4; background: #fffaf0;
  color: ${K.ink}; padding: 10px; font: 600 14px/1.4 ${FONT}; resize: vertical; }
#lk-board .row { display: flex; gap: 8px; margin-top: 8px; }
#lk-board button { border: 0; border-radius: 999px; padding: 9px 16px; font: 700 14px/1 ${FONT}; cursor: pointer; background: ${K.paper2}; color: ${K.ink}; }
#lk-board button.p { background: ${K.teal}; color: #fff; box-shadow: 0 3px 0 #1d6f69; }
#lk-board .x { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; padding: 0; }
#lk-board .tag { display: inline-block; font-size: 10.5px; color: ${K.ink}; background: ${K.paper2}; border-radius: 6px; padding: 2px 6px; margin-left: 6px; vertical-align: 2px; }
#lk-wx { position: absolute; top: 234px; right: 14px; width: 156px; box-sizing: border-box; padding: 10px 12px; pointer-events: auto; font-size: 12px; }
#lk-wx .t { display: flex; align-items: baseline; gap: 6px; font-size: 24px; font-weight: 800; }
#lk-wx .t span { font-size: 13px; font-weight: 700; color: ${K.ink}; }
#lk-wx .p { color: ${K.ink2}; margin-top: 2px; font-weight: 600; }
#lk-wx button { margin-top: 8px; width: 100%; border: 0; border-radius: 8px; padding: 6px 8px; background: rgba(255,255,255,.08); color: #eef2ff; font: 600 11.5px/1.2 "Baloo 2", ui-rounded, system-ui, sans-serif; cursor: pointer; }
#lk-wx .src { display: block; margin-top: 6px; color: ${K.ink2}; font-size: 10.5px; }
#lk-wx .src a { color: inherit; }
#lk-eff { position: absolute; right: 14px; top: 338px; display: flex; align-items: center; gap: 4px; padding: 7px 14px 7px 10px; border: 0; border-radius: 999px; pointer-events: auto; cursor: pointer; font: 800 17px/1 ${FONT}; color: ${K.ink}; }
#lk-eff svg { color: ${K.teal}; }
@media (max-width: 700px) { #lk-eff { top: 262px; font-size: 14px; } }
@media (max-width: 700px) { #lk-wx { top: 172px; width: 120px; padding: 8px 10px; } #lk-wx .t { font-size: 16px; } #lk-wx button { display: none; } }
/* the music button, above the zoom dock */
#lk-snd { position: absolute; right: 14px; bottom: 200px; width: 46px; height: 46px; border: 0; border-radius: 50%; background: ${K.paper}; color: ${K.ink}; pointer-events: auto; cursor: pointer;
  display: grid; place-items: center; box-shadow: 0 4px 0 rgba(59,42,32,.2), 0 10px 24px rgba(10,14,30,.2); }
#lk-snd svg { width: 24px; height: 24px; }
#lk-snd.off { color: #b6a68c; }
#lk-snd.off::after { content: ''; position: absolute; width: 30px; height: 3px; border-radius: 2px; background: ${K.coral}; transform: rotate(-45deg); }
/* cinematic travel: letterbox bars, the HUD steps aside, one quiet caption */
#lk-cine { position: fixed; inset: 0; pointer-events: none; z-index: 14; }
#lk-cine::before, #lk-cine::after { content: ''; position: absolute; left: 0; right: 0; height: 0; background: #14110d; transition: height .6s cubic-bezier(.2,.8,.2,1); }
#lk-cine::before { top: 0; } #lk-cine::after { bottom: 0; }
body.bw-cine #lk-cine::before, body.bw-cine #lk-cine::after { height: 11vh; }
#lk-cine span { position: absolute; z-index: 1; left: 50%; bottom: 3.6vh; transform: translateX(-50%); color: #f7efdc; font: 700 15px/1 ${FONT}; opacity: 0; transition: opacity .6s .3s; white-space: nowrap; }
#lk-cine span b { display: inline-grid; place-items: center; min-width: 24px; height: 24px; margin: 0 4px; border-radius: 999px; background: #f7efdc; color: #3b2a20; font-size: 12px; }
body.bw-cine #lk-cine span { opacity: .9; }
body.bw-cine #lk .pane, body.bw-cine #lk-map, body.bw-cine #lk-tags, body.bw-cine #lkm-tip, body.bw-cine #labels, body.bw-cine .ui { opacity: 0 !important; transition: opacity .4s; pointer-events: none; }
@media (prefers-reduced-motion: reduce) { #lk-cine::before, #lk-cine::after, #lk-cine span { transition: none; } }
body.bw-inside #lk-map, body.bw-inside #lk-wx, body.bw-inside #lk-osm, body.bw-inside #lk-obj { display: none; }
#lk-osm { position: absolute; left: 50%; bottom: 4px; transform: translateX(-50%); font-size: 10.5px; color: rgba(238,242,255,.6); pointer-events: auto; }
#lk-osm a { color: inherit; }
#lk-toast { position: absolute; left: 50%; top: 22px; transform: translateX(-50%); padding: 10px 20px; border-radius: 999px; font: 700 15px/1.3 ${FONT}; opacity: 0; transition: opacity .3s; }
#lk-toast.on { opacity: 1; }
@media (max-width: 700px) {
  #lk-obj { top: 70px; min-width: 0; right: 120px; padding: 10px 12px; }
  #lk-obj .d { font-size: 16px; }
  #lk-map { width: 96px; height: 96px; top: 68px; }
  #lk-keys { display: none; }
  #lk-board { right: 16px; top: 70px; }
}
@media (prefers-reduced-motion: reduce) { #lk-prompt, #lk-keys, #lk-toast { transition: none; } }
`;

const PIN = '<svg viewBox="0 0 24 24"><path fill="#e46f4f" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.8" fill="#fff"/></svg>';
const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg>';

const NEARBY = [
  ['Kemi', 'Designing a park nook', '#7fd3b0', true],
  ['Tunde', 'Fixing the stairway', '#9cb3ff', true],
  ['Nara', 'Adding more plants', '#f6a8a0', false],
  ['Ada', 'Sketching wall art', '#f7e27a', false],
];
const NOTES = [
  ['#f7e27a', 'Code and chops at the hub, Friday 7pm. Bring a laptop.'],
  ['#a8e0d0', 'Fixed the waste bin by the danfo stop.'],
  ['#f6a8a0', 'Who wants to fix the stairway lights with me?'],
];

export function createHud({ world, props, camera, reduced, onInteract, weatherFeed, onEquip, onUse, onRide, isExtraOpen, closeExtra, getPrompt, onChat }) {
  loadFont();
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const el = document.createElement('div');
  el.id = 'lk';
  el.innerHTML = `
    <div id="lk-obj" class="pane" aria-live="polite"><div class="d">${PIN}<span>${world.place?.name ?? 'Yaba'} District</span></div><ul></ul></div>
    <div id="lk-map"><canvas width="312" height="312" aria-label="Minimap"></canvas></div>
    <div id="lk-prompt" class="pane"><kbd>E</kbd><span></span></div>
    <div id="lk-tags"></div>
    <div id="lk-board" class="pane" role="dialog" aria-label="Community board"></div>
    <div id="lk-toast" class="pane" role="status"></div>
    <button id="lk-snd" aria-label="Music" title="Music (N)"></button>
    <div id="lk-cine"><span>Cinematic travel <b>C</b> or move to take over</span></div>
    ${weatherFeed ? '<div id="lk-wx" class="pane" aria-live="polite"></div>' : ''}
    <button id="lk-eff" class="pane" aria-label="Wallet"></button>
    ${world.via === 'sample' ? '' : '<div id="lk-osm">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a></div>'}`;
  document.body.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const objList = $('#lk-obj ul'), prompt = $('#lk-prompt'), promptText = $('#lk-prompt span');
  const boardEl = $('#lk-board'), toastEl = $('#lk-toast');
  const map = $('#lk-map canvas').getContext('2d');
  // your Efforts, always in view; tap for the wallet
  const effBtn = $('#lk-eff'), wal = walletEngine();
  const effSync = () => { effBtn.innerHTML = `${effortsMark(20)}${fmt(wal.balance())}`; };
  effSync(); const effOff = wal.onChange(effSync);
  effBtn.onclick = () => menus.openWallet();
  // music on or off, one tap (N on the keyboard does the same)
  const sndBtn = $('#lk-snd'), snd = audioEngine();
  sndBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.8" fill="currentColor"/><circle cx="17.5" cy="16" r="2.8" fill="currentColor"/></svg>';
  const sndSync = (st) => { sndBtn.classList.toggle('off', !st.music); sndBtn.setAttribute('aria-pressed', String(st.music)); };
  sndSync(snd.settings); const sndOff = snd.onChange(sndSync);
  sndBtn.onclick = () => { snd.wake(); snd.set('music', !snd.settings.music); toast(snd.settings.music ? 'Music on' : 'Music off', 1400); };

  // ---------- objectives ----------
  const steps = [
    { text: 'Meet the builders at the community board', target: props.interact.find((i) => i.id === 'board'), done: false },
    { text: 'Find the community build area', target: props.area, done: false, near: true },
    { text: `Add a bench for ${world.place?.name ?? 'Yaba'}`, target: props.area, done: false },
  ].filter((s) => s.target);
  let current = 0;
  let custom = null; // a route the player set from the map
  function renderSteps(dist) {
    if (custom) {
      objList.innerHTML = `<li><i></i><span>${custom.label}</span>${dist != null ? `<em>${Math.round(dist)} m</em>` : ''}</li>`;
      return;
    }
    objList.innerHTML = steps.map((s, i) => {
      if (i > current + 1) return '';
      const cls = s.done ? 'done' : i === current ? '' : 'todo';
      const d = i === current && dist != null ? `<em>${Math.round(dist)} m</em>` : '';
      return `<li class="${cls}"><i>${s.done ? '✓' : ''}</i><span>${s.text}</span>${d}</li>`;
    }).join('');
  }
  function complete(i) {
    if (!steps[i] || steps[i].done) return;
    steps[i].done = true;
    if (i === current) current++;
    renderSteps();
  }

  let toastTimer = 0;
  function toast(msg, ms = 3600) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
  }

  // ---------- the board ----------
  const posted = [];
  function openBoard() {
    const notes = [...posted.map((t) => ['#f9f3e3', t]), ...NOTES];
    boardEl.innerHTML = `
      <button class="x" aria-label="Close">✕</button>
      <h2>${world.place?.name ?? 'Yaba'} Builders</h2>
      <div class="sub">Ideas, people and places. Sample residents for this preview.</div>
      <h3>Builders nearby</h3>
      ${NEARBY.map(([n, s, c, talking]) => `<div class="who"><div class="av" style="background:${c}">${n[0]}</div>
        <div><div class="n">${n}</div><div class="s">${s}</div></div>${talking ? SPEAKER : ''}</div>`).join('')}
      <h3>Notes</h3>
      ${notes.map(([c, t]) => `<div class="note" style="background:${c}">${t}</div>`).join('')}
      <h3>Leave a note</h3>
      <textarea maxlength="200" placeholder="Say hello, share an idea, ask for help"></textarea>
      <div class="row"><button class="p" data-a="post">Pin note</button><button data-a="close">Close</button></div>`;
    boardEl.classList.add('on');
    boardEl.querySelector('.x').onclick = closeBoard;
    boardEl.querySelector('[data-a=close]').onclick = closeBoard;
    boardEl.querySelector('[data-a=post]').onclick = () => {
      const v = boardEl.querySelector('textarea').value.trim();
      if (!v) return;
      posted.unshift(v);
      openBoard();
      toast('Note pinned on this device. Shared notes come with accounts.');
    };
    complete(0);
  }
  function closeBoard() { boardEl.classList.remove('on'); }

  function setRoute(at, label, fromMap) {
    if (!at) return;
    custom = { x: at.x, z: at.z, name: label, label: `Go to ${label}` };
    path = null;
    renderSteps();
    sfx('route');
    if (fromMap) toast(`Route set to ${label}. Follow the trail, or press C to travel there.`);
  }

  // ---------- route on the ground: a ribbon with arrows and a destination beacon (trail.js) ----------
  const nav = createNav(world.roads);
  let path = null, pathAt = 0, pathAlong = 0; // the satnav route, when the player has set a destination
  const trail = createTrail({ reduced });
  const route = trail.group;

  // ---------- tags ----------
  const tagsEl = $('#lk-tags');
  const tags = props.builders.map((b) => {
    const d = document.createElement('div');
    d.innerHTML = `<span>${b.name}</span>${b.live ? '<b></b>' : ''}`;
    tagsEl.appendChild(d);
    return { b, d };
  });
  const v = new THREE.Vector3();

  let active = null;
  function interact() {
    if (boardEl.classList.contains('on')) { closeBoard(); return true; }
    if (onUse?.(lastPlayer, active)) return true; // rides: get in, get out, hire at a stop
    if (!active) return false;
    if (active.id.startsWith('npc:')) { onChat?.(active.id.slice(4)); return true; }
    if (active.id === 'atm') { sfx('interact'); menus.openWallet({ atm: true }); return true; }
    sfx('interact');
    if (active.id === 'board') openBoard();
    else if (active.line) toast(`${active.name}: ${active.line}`, 4500); // shops and stalls along the street
    if (active.id === 'build') {
      if (steps[2] && !steps[2].done) {
        onInteract?.('place-bench');
        complete(1); complete(2);
        toast('Bench added. It stays on this device until shared building is live.');
        active.label = 'Bench added';
      }
    }
    return true;
  }

  function drawMap(player, yaw, target) {
    const S = 312, C = S / 2, k = 1.9; // pixels per metre
    map.setTransform(1, 0, 0, 1, 0, 0);
    map.clearRect(0, 0, S, S);
    map.fillStyle = '#7fb35e'; map.fillRect(0, 0, S, S);
    map.translate(C, C);
    map.rotate(yaw - Math.PI); // camera forward points up
    map.translate(-player.x * k, -player.z * k);
    map.lineCap = 'round'; map.lineJoin = 'round';
    world.roads.forEach((r) => {
      if (['footway', 'path', 'cycleway', 'pedestrian'].includes(r.cls)) return;
      map.beginPath(); r.pts.forEach(([x, z], i) => (i ? map.lineTo(x * k, z * k) : map.moveTo(x * k, z * k)));
      map.strokeStyle = '#c4a46c'; map.lineWidth = Math.max(4, r.w * k * 0.9) + 5; map.stroke();
      map.strokeStyle = '#f0deb0'; map.lineWidth = Math.max(4, r.w * k * 0.9); map.stroke();
    });
    world.plots.forEach((p) => {
      map.fillStyle = p.b.id === 'you' ? '#f2b33d' : '#e2a07c';
      map.beginPath(); p.pts.forEach(([x, z], i) => (i ? map.lineTo(x * k, z * k) : map.moveTo(x * k, z * k))); map.closePath(); map.fill();
    });
    const POI_COL = { atm: '#2a9d94', food: '#e46f4f', cafe: '#a87950', fuel: '#e46f4f', bus: '#f2b33d', work: '#4a64b0', shop: '#7d5aa6', gym: '#326952' };
    (props.pois || []).forEach((q) => { const c = POI_COL[q.kind]; if (!c) return; map.fillStyle = '#fff'; map.beginPath(); map.arc(q.x * k, q.z * k, 7, 0, 7); map.fill(); map.fillStyle = c; map.beginPath(); map.arc(q.x * k, q.z * k, 5, 0, 7); map.fill(); });
    if (props.area) { map.fillStyle = '#3ad1c0'; map.beginPath(); map.arc(props.area.x * k, props.area.z * k, 6, 0, 7); map.fill(); }
    if (path) {
      map.strokeStyle = '#2a9d94'; map.lineWidth = 10; map.lineCap = 'round'; map.lineJoin = 'round';
      map.beginPath(); path.forEach((p, i) => (i ? map.lineTo(p.x * k, p.z * k) : map.moveTo(p.x * k, p.z * k))); map.stroke();
      map.strokeStyle = '#fff'; map.lineWidth = 5; map.setLineDash([1, 10]); map.stroke(); map.setLineDash([]);
    }
    if (target) {
      map.fillStyle = '#e46f4f'; map.beginPath(); map.arc(target.x * k, target.z * k, 10, 0, 7); map.fill();
      map.fillStyle = '#fff'; map.beginPath(); map.arc(target.x * k, target.z * k, 4, 0, 7); map.fill();
    }
    map.setTransform(1, 0, 0, 1, 0, 0);
    const street = streetName(player);
    if (street) {
      map.font = `800 22px ${FONT}`; map.textAlign = 'center'; map.textBaseline = 'middle';
      const w = map.measureText(street).width + 26;
      map.fillStyle = '#f7efdc'; map.beginPath(); map.roundRect(C - w / 2, S - 64, w, 36, 18); map.fill();
      map.fillStyle = '#3b2a20'; map.fillText(street, C, S - 45);
    }
    // player arrow, always pointing up
    map.fillStyle = '#e46f4f'; map.strokeStyle = '#fff'; map.lineWidth = 4;
    map.beginPath(); map.moveTo(C, C - 16); map.lineTo(C + 11, C + 12); map.lineTo(C, C + 6); map.lineTo(C - 11, C + 12); map.closePath(); map.stroke(); map.fill();
    // north marker on the rim
    const na = yaw - Math.PI;
    const nx = C + Math.sin(na) * (C - 18), ny = C - Math.cos(na) * (C - 18);
    map.fillStyle = '#3b2a20'; map.beginPath(); map.arc(nx, ny, 14, 0, 7); map.fill();
    map.fillStyle = '#f7efdc'; map.font = `800 17px ${FONT}`; map.textAlign = 'center'; map.textBaseline = 'middle'; map.fillText('N', nx, ny + 1);
  }

  // nearest named road within a short walk, like a callout on a competitive map
  function streetName(p) {
    let best = 18, name = null;
    world.roads.forEach((r) => {
      if (!r.name) return;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], dx = bx - ax, dz = bz - az;
        const t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / (dx * dx + dz * dz || 1)));
        const d = Math.hypot(p.x - ax - dx * t, p.z - az - dz * t) - r.w / 2;
        if (d < best) { best = d; name = r.name; }
      }
    });
    return name;
  }

  let mapTimer = 0;
  renderSteps();

  const lastPlayer = new THREE.Vector3();
  function update(dt, t, player, yaw) {
    lastPlayer.copy(player);
    const step = steps[current];
    if (custom && Math.hypot(custom.x - player.x, custom.z - player.z) < 4) { sfx('arrive'); toast(`You are at ${custom.name}.`); custom = null; }
    const target = custom || step?.target;
    // nearest interactable
    active = null;
    let best = Infinity;
    props.interact.forEach((it) => {
      const d = Math.hypot(it.x - player.x, it.z - player.z);
      if (d < it.r && d < best) { best = d; active = it; }
    });
    const inner = getPrompt?.(player); // inside a workspace, the room decides the prompt
    if (inner !== undefined) active = inner ? { id: 'inside', label: inner } : null;
    if (active) { promptText.textContent = active.label; prompt.classList.add('on'); } else prompt.classList.remove('on');
    if (!custom && step?.near && target && Math.hypot(target.x - player.x, target.z - player.z) < 4.5) complete(current);

    // satnav: keep the route current, re-route when the player leaves it
    if (custom) {
      pathAt -= dt;
      const off = path ? nearestOn(path, player.x, player.z).d : Infinity;
      // a walkable path by the movement rules; the street graph only if the planner finds nothing
      if (!path || (off > 6 && pathAt <= 0)) { path = world.plan?.(player, custom) || nav.route(player, custom); pathAt = 1; }
    } else path = null;
    // objective distance: along the route when there is one, as the crow flies otherwise
    const onPath = path ? nearestOn(path, player.x, player.z) : null;
    const dist = path ? Math.max(0, pathLength(path) - onPath.along) : target ? Math.hypot(target.x - player.x, target.z - player.z) : null;
    mapTimer -= dt;
    if (mapTimer <= 0) { mapTimer = 0.1; renderSteps(dist); drawMap(player, yaw, target); }

    // the trail, only for a destination the player chose
    pathAlong = onPath ? onPath.along : 0;
    trail.update(path && dist > 3 ? path : null, pathAlong, t);

    // name tags
    tags.forEach(({ b, d }) => {
      v.setFromMatrixPosition(b.obj.matrixWorld); v.y += 2.15;
      const dd = v.distanceTo(camera.position);
      v.project(camera);
      const vis = v.z < 1 && dd < 45;
      d.style.display = vis ? 'flex' : 'none';
      if (vis) d.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`, d.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
    });
  }

  // ---------- live weather chip ----------
  const wxEl = el.querySelector('#lk-wx');
  let wxTimer = 0, unsub = null;
  function renderWeather() {
    const w = weatherFeed?.state;
    if (!wxEl || !w) return;
    const temp = w.tempC == null ? '' : `${Math.round(w.tempC)}°`;
    const tag = w.source === 'preset' ? ' · preview' : w.source === 'offline' ? ' · offline' : '';
    wxEl.innerHTML = `<div class="t">${temp}<span>${w.label}</span></div>
      <div class="p">${w.loc.label} · ${weatherFeed.localTime()}${tag}</div>
      <span class="src">Weather: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></span>`;
  }
  if (weatherFeed) {
    unsub = weatherFeed.onChange(renderWeather);
    wxTimer = setInterval(renderWeather, 30000); // keep the clock honest
  }

  // ---------- phone, map, bag and the controls guide ----------
  props.openBoard = openBoard;
  const menus = createMenus({
    world, props, weatherFeed, toast, onEquip,
    getPlayer: () => lastPlayer,
    getPath: () => path,
    onRide: () => onRide?.(lastPlayer),
    snapToStreet: (x, z) => nav.snap(x, z),
    onRoute: (at, label, fromMap) => setRoute(at, label, fromMap),
    onPhoto: () => { document.body.classList.add('nohud'); toast('Photo mode. Press H to bring the interface back.', 4000); },
  });

  function dispose() { sndOff(); effOff(); menus.dispose(); unsub?.(); clearInterval(wxTimer); el.remove(); style.remove(); route.removeFromParent(); trail.dispose(); }

  return { update, interact, route, dispose, nav, setRoute: (at, label) => setRoute(at, label, true), travel: () => (path ? { path, along: pathAlong, total: pathLength(path) } : null), clearRoute: () => { custom = null; path = null; }, isOpen: () => boardEl.classList.contains('on') || menus.isOpen() || !!isExtraOpen?.(), close: () => { closeBoard(); menus.close(); closeExtra?.(); }, toast, menuKey: (k) => menus.key(k) };
}
