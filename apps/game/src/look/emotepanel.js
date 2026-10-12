import { C, FONT } from './uikit.js';
import { EMOTES, QUICK, faceSheetCanvas, faceSheetInfo } from './expressions.js';
import { sfx } from './audio.js';

// The emote sheet you open with G: every emote with its face, sorted into moods. Pick one and you do it;
// the first six are on the number keys.

const MOODS = [['all', 'All'], ['greet', 'Hello'], ['happy', 'Happy'], ['dance', 'Dance'], ['funny', 'Funny'], ['annoyed', 'Cross'], ['sad', 'Down'], ['surprise', 'Wow'], ['food', 'Food'], ['tired', 'Tired'], ['work', 'Work']];
const ICON = 52;

const CSS = `
#lk-emo { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(.96); z-index: 40; width: min(640px, calc(100vw - 32px)); max-height: min(640px, calc(100vh - 48px));
  display: none; flex-direction: column; border-radius: 26px; background: ${C.paper}; color: ${C.ink}; font-family: ${FONT}; opacity: 0; transition: opacity .16s, transform .2s cubic-bezier(.2,1.4,.4,1);
  box-shadow: 0 6px 0 rgba(59,42,32,.22), 0 28px 70px rgba(10,14,30,.35); }
#lk-emo.on { display: flex; } #lk-emo.in { opacity: 1; transform: translate(-50%, -50%) scale(1); }
#lk-emo header { padding: 18px 20px 10px; display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
#lk-emo h3 { margin: 0; font: 800 22px/1.1 ${FONT}; } #lk-emo header small { font: 700 12.5px/1.3 ${FONT}; color: ${C.ink2}; }
#lk-emo .moods { flex: none; display: flex; gap: 6px; padding: 0 20px 12px; overflow-x: auto; scrollbar-width: none; }
#lk-emo .moods button { flex: none; white-space: nowrap; border: 0; border-radius: 999px; padding: 6px 12px; background: ${C.paper2}; color: ${C.ink}; font: 700 13px/1 ${FONT}; cursor: pointer; }
#lk-emo .moods button.sel { background: ${C.ink}; color: ${C.paper}; }
#lk-emo .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; padding: 4px 20px 20px; overflow-y: auto; }
#lk-emo .grid button { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 6px 8px; border: 2px solid #e3d4b4; border-radius: 18px; background: #fffaf0; color: ${C.ink};
  font: 700 12.5px/1.15 ${FONT}; cursor: pointer; transition: transform .12s, border-color .12s; }
#lk-emo .grid button:hover, #lk-emo .grid button:focus-visible { transform: translateY(-2px); border-color: ${C.teal}; outline: none; }
#lk-emo .grid i { width: ${ICON}px; height: ${ICON}px; border-radius: 50%; background-color: #c98f62; background-repeat: no-repeat; box-shadow: inset 0 -3px 0 rgba(0,0,0,.08); }
#lk-emo .grid kbd { position: absolute; top: 6px; right: 6px; min-width: 18px; height: 18px; display: grid; place-items: center; border-radius: 999px; background: ${C.ink}; color: ${C.paper}; font: 700 10.5px/1 ${FONT}; }
#lk-emo footer { padding: 0 20px 16px; display: flex; justify-content: flex-end; }
#lk-emo footer button { border: 0; border-radius: 999px; padding: 8px 14px; background: ${C.paper2}; color: ${C.ink}; font: 700 14px/1 ${FONT}; cursor: pointer; }
#lk-emo footer kbd { margin-right: 6px; padding: 2px 7px; border-radius: 999px; background: ${C.ink}; color: ${C.paper}; font: 700 11px/1 ${FONT}; }
@media (prefers-reduced-motion: reduce) { #lk-emo { transition: opacity .16s; transform: translate(-50%, -50%); } }
`;

export function createEmotePanel({ onPick }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const el = document.createElement('div'); el.id = 'lk-emo'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Emotes');
  document.body.appendChild(el);
  let sheet = null, mood = 'all';
  const icon = (cell) => {
    // the face sheet scaled so one cell is the icon; open-eyed frames are the even cells
    const { cols, rows, cell: px } = faceSheetInfo(), k = cell * 2, s = ICON / px * 1.25;
    return `background-image:url(${sheet});background-size:${cols * px * s}px ${rows * px * s}px;background-position:${-(k % cols) * px * s - (px * s - ICON) / 2}px ${-Math.floor(k / cols) * px * s - (px * s - ICON) / 2 - 2}px`;
  };
  function render() {
    const list = EMOTES.filter((e) => mood === 'all' || e.tags.includes(mood));
    el.innerHTML = `<header><h3>Emotes</h3><small>${EMOTES.length} to choose from · 1 to 6 for your favourites</small></header>
      <div class="moods">${MOODS.map(([k, n]) => `<button data-m="${k}" class="${k === mood ? 'sel' : ''}">${n}</button>`).join('')}</div>
      <div class="grid">${list.map((e) => `<button data-id="${e.id}" title="${e.name}"><i style="${icon(e.cell)}"></i>${e.name}${QUICK.includes(e.id) ? `<kbd>${QUICK.indexOf(e.id) + 1}</kbd>` : ''}</button>`).join('')}</div>
      <footer><button class="x"><kbd>Esc</kbd>Close</button></footer>`;
    el.querySelectorAll('.moods button').forEach((b) => { b.onclick = () => { mood = b.dataset.m; sfx('tap'); render(); }; });
    el.querySelectorAll('.grid button').forEach((b) => { b.onclick = () => { close(); onPick(b.dataset.id); }; });
    el.querySelector('.x').onclick = close;
  }
  const key = (e) => { if (e.key === 'Escape' || e.key.toLowerCase() === 'g') { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
  function open() {
    if (!sheet) sheet = faceSheetCanvas(false).toDataURL('image/png');
    render(); el.classList.add('on'); requestAnimationFrame(() => el.classList.add('in')); sfx('open');
    addEventListener('keydown', key, true);
    el.querySelector('.grid button')?.focus({ preventScroll: true });
  }
  function close() { el.classList.remove('in'); setTimeout(() => el.classList.remove('on'), 160); removeEventListener('keydown', key, true); }
  return { open, close, toggle: () => (el.classList.contains('on') ? close() : open()), get isOpen() { return el.classList.contains('on'); }, dispose: () => { el.remove(); style.remove(); } };
}
