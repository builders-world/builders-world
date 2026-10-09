// Controls beyond the keyboard (world bible 11.4): a thumbstick and action buttons on touch screens,
// and game controllers (PlayStation 4 and 5, Xbox, anything with the standard layout) through the
// browser's Gamepad API, on desktop and on phones. Buttons are turned into the same key presses the
// keyboard makes, so every menu and action works the same way whichever you use.

import { C, FONT } from './uikit.js';

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

// standard-layout button index -> what it does
export const PAD_MAP = [
  { i: 0, key: ' ', what: 'Jump · confirm in menus' },
  { i: 1, key: 'escape', what: 'Back · close' },
  { i: 2, key: 'e', what: 'Interact · say hi' },
  { i: 3, key: 'v', what: 'Change camera' },
  { i: 4, key: 'tab', what: 'Phone' },
  { i: 5, key: 'm', what: 'Map' },
  { i: 6, key: '1', what: 'Wave' },
  { i: 7, key: null, what: 'Run (hold)' },
  { i: 8, key: 'i', what: 'Bag' },
  { i: 9, key: 'c', what: 'Cinematic travel' },
  { i: 10, key: null, what: 'Run (click the stick)' },
  { i: 11, key: 'b', what: 'Aerial view' },
  { i: 12, key: '2', what: 'Smile' },
  { i: 13, key: '3', what: 'Thumbs up' },
  { i: 14, key: '4', what: 'Fire' },
  { i: 15, key: 'n', what: 'Music on or off' },
];
const LABELS = {
  playstation: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →'],
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →'],
};
export const brandOf = (id = '') => (/054c|dualsense|dualshock|wireless controller|playstation|sony/i.test(id) ? 'playstation' : 'xbox');
export const padLabel = (brand, i) => LABELS[brand][i];

const CSS = `
#lk-touch { position: fixed; inset: 0; pointer-events: none; z-index: 16; display: none; }
body.bw-touch #lk-touch { display: block; }
body.nohud #lk-touch, body.bw-cine #lk-touch { display: none; }
#lk-stick { position: absolute; left: 22px; bottom: 74px; width: 132px; height: 132px; border-radius: 50%; background: rgba(247,239,220,.55);
  box-shadow: inset 0 0 0 3px rgba(59,42,32,.18); pointer-events: auto; touch-action: none; }
#lk-stick i { position: absolute; left: 50%; top: 50%; width: 58px; height: 58px; margin: -29px 0 0 -29px; border-radius: 50%; background: ${C.paper};
  box-shadow: 0 4px 0 rgba(59,42,32,.25); transition: transform .08s; }
#lk-btns { position: absolute; right: 18px; bottom: 82px; width: 170px; height: 170px; pointer-events: none; }
#lk-btns button { position: absolute; width: 58px; height: 58px; border: 0; border-radius: 50%; background: ${C.paper}; color: ${C.ink}; pointer-events: auto; touch-action: none;
  font: 800 12px/1 ${FONT}; box-shadow: 0 4px 0 rgba(59,42,32,.25); display: grid; place-items: center; }
#lk-btns button.on { background: ${C.teal}; color: #fff; }
#lk-btns .jump { right: 0; bottom: 0; width: 70px; height: 70px; background: ${C.amber}; font-size: 13px; }
#lk-btns .use { right: 80px; bottom: 0; }
#lk-btns .run { right: 0; bottom: 80px; }
#lk-btns .cam { right: 72px; bottom: 72px; width: 46px; height: 46px; font-size: 11px; }
#lk-btns .ph { right: 118px; bottom: 112px; width: 46px; height: 46px; font-size: 11px; }
#lk-pad { position: fixed; left: 50%; top: 18px; transform: translateX(-50%) translateY(-80px); transition: transform .3s; z-index: 40; padding: 8px 16px; border-radius: 999px;
  background: ${C.paper}; color: ${C.ink}; font: 700 14px/1 ${FONT}; box-shadow: 0 4px 0 rgba(59,42,32,.2); pointer-events: none; }
#lk-pad.on { transform: translateX(-50%) translateY(0); }
/* phones: only what you need in view; everything else is one tap away on the phone (Phone button) */
@media (max-width: 760px) {
  body.bw-touch #lkm-tip, body.bw-touch #dock, body.bw-touch #toolbar, body.bw-touch #brand, body.bw-touch #builders,
  body.bw-touch #lk-wx, body.bw-touch #lk-snd, body.bw-touch .lkm-hints { display: none !important; }
  body.bw-touch #lk-obj { top: 12px; left: 12px; right: auto; max-width: calc(100vw - 132px); min-width: 0; padding: 8px 12px; border-radius: 18px; pointer-events: auto; }
  body.bw-touch #lk-obj .d { font-size: 14px; }
  body.bw-touch #lk-obj .d svg { width: 15px; height: 15px; }
  body.bw-touch #lk-obj ul { margin-top: 5px; }
  body.bw-touch #lk-obj li { font-size: 12.5px; }
  body.bw-touch #lk-obj:not(.open) li:not(:first-child) { display: none; }
  body.bw-touch #lk-obj:not(.open) li.done { display: none; }
  body.bw-touch #lk-map { top: 12px; right: 12px; width: 92px; height: 92px; pointer-events: auto; border-width: 4px; }
  body.bw-touch #lk-eff { top: 112px; right: 12px; font-size: 13px; padding: 5px 10px 5px 8px; }
  body.bw-touch #lk-prompt { bottom: 268px; pointer-events: auto; }
  body.bw-touch #lk-osm { font-size: 9px; bottom: 2px; }
  body.bw-touch #card { bottom: 230px !important; }
}
`;

export function createInput({ onKey }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const root = document.createElement('div'); root.id = 'lk-touch';
  root.innerHTML = `<div id="lk-stick" aria-label="Move"><i></i></div>
    <div id="lk-btns"><button class="jump" aria-label="Jump">Jump</button><button class="use" aria-label="Interact">Use</button>
    <button class="run" aria-label="Run">Run</button><button class="cam" aria-label="Camera">Cam</button><button class="ph" aria-label="Phone">Phone</button></div>`;
  document.body.appendChild(root);
  const toast = document.createElement('div'); toast.id = 'lk-pad'; document.body.appendChild(toast);

  const state = { move: { x: 0, y: 0 }, look: { x: 0, y: 0 }, run: false, runToggle: false, pad: null, brand: 'xbox' };
  const settings = { touch: store.get('bw-touch', 'auto'), invertY: store.get('bw-invert', false), sensitivity: store.get('bw-sens', 1) };
  const coarse = matchMedia('(pointer: coarse)').matches;
  const applyTouch = () => document.body.classList.toggle('bw-touch', settings.touch === 'on' || (settings.touch === 'auto' && coarse));
  applyTouch();

  // ---------- thumbstick ----------
  const stick = root.querySelector('#lk-stick'), knob = stick.querySelector('i');
  let sid = null;
  const setStick = (e) => {
    const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width / 2 - 14;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    state.move.x = dx / max; state.move.y = -dy / max;
    state.run = Math.hypot(dx, dy) / max > 0.92 || state.runToggle; // push to the rim to run
  };
  stick.addEventListener('pointerdown', (e) => { sid = e.pointerId; stick.setPointerCapture(sid); setStick(e); e.preventDefault(); e.stopPropagation(); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === sid) setStick(e); });
  const release = (e) => { if (e.pointerId !== sid) return; sid = null; knob.style.transform = ''; state.move.x = state.move.y = 0; state.run = state.runToggle; };
  stick.addEventListener('pointerup', release); stick.addEventListener('pointercancel', release);
  const tap = (sel, key) => root.querySelector(sel).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onKey(key); });
  tap('.jump', ' '); tap('.use', 'e'); tap('.cam', 'v'); tap('.ph', 'tab');
  const runBtn = root.querySelector('.run');
  runBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); state.runToggle = !state.runToggle; state.run = state.runToggle; runBtn.classList.toggle('on', state.runToggle); });

  // ---------- controllers ----------
  const prev = [];
  const dead = (v) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);
  let toastT = 0;
  const say = (t) => { toast.textContent = t; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 2600); };
  addEventListener('gamepadconnected', (e) => { state.brand = brandOf(e.gamepad.id); say(`${state.brand === 'playstation' ? 'PlayStation' : 'Xbox-style'} controller connected · Settings › Controls shows the buttons`); });
  addEventListener('gamepaddisconnected', () => { state.pad = null; say('Controller disconnected'); });

  function poll() {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const p = pads.find((g) => g.mapping === 'standard') || pads[0];
    state.pad = p || null;
    if (!p) return;
    state.brand = brandOf(p.id);
    const ax = dead(p.axes[0] || 0), ay = dead(p.axes[1] || 0), lx = dead(p.axes[2] || 0), ly = dead(p.axes[3] || 0);
    if (sid === null) { state.move.x = ax; state.move.y = -ay; }
    state.look.x = lx * settings.sensitivity; state.look.y = ly * settings.sensitivity * (settings.invertY ? -1 : 1);
    const btn = (i) => !!p.buttons[i]?.pressed;
    if (btn(10) && !prev[10]) state.runToggle = !state.runToggle;
    state.run = btn(7) || state.runToggle || (sid !== null && state.run);
    PAD_MAP.forEach(({ i, key }) => {
      const now = btn(i);
      if (now && !prev[i] && key) {
        // in a menu: the d-pad moves between buttons and the confirm button presses one
        const menu = document.querySelector('#lkm-phone.on, #lkm-map.on, #lkm-bag.on, #lkm-set.on, #lkm-wal.on, #lkr.on');
        if (menu && i >= 12 && i <= 15) { const f = [...menu.querySelectorAll('button, input, [tabindex]')].filter((el) => el.offsetParent); const at = f.indexOf(document.activeElement); const step = i === 12 || i === 14 ? -1 : 1; (f[(at + step + f.length) % f.length] || f[0])?.focus(); }
        else if (menu && i === 0 && document.activeElement && menu.contains(document.activeElement)) document.activeElement.click();
        else onKey(key);
      }
      prev[i] = now;
    });
    prev[10] = btn(10);
  }

  function set(k, v) {
    settings[k] = v; store.set({ touch: 'bw-touch', invertY: 'bw-invert', sensitivity: 'bw-sens' }[k], v);
    if (k === 'touch') applyTouch();
  }
  return { state, settings, set, poll, padLabel: (i) => padLabel(state.brand, i), get connected() { return state.pad?.id || null; }, dispose() { root.remove(); toast.remove(); style.remove(); } };
}
