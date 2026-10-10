import { OPTIONS, DEFAULT_LOOK, cleanLook } from './style.js';
import { C, FONT } from './uikit.js';
import { sfx } from './audio.js';

// The wardrobe (world bible 7.4a): change your body, skin, hair, clothes, shoes and accessories,
// and see it on yourself as you go; the camera turns round to face you like a mirror.

const CSS = `
#lk-ward { position: fixed; right: 14px; top: 74px; bottom: 74px; z-index: 32; width: min(380px, calc(100vw - 28px)); display: none; flex-direction: column; border-radius: 26px; background: ${C.paper}; color: ${C.ink}; font-family: ${FONT};
  box-shadow: 0 6px 0 rgba(59,42,32,.22), 0 30px 70px rgba(10,14,30,.3); overflow: hidden; }
#lk-ward.on { display: flex; }
#lk-ward header { padding: 16px 18px 8px; } #lk-ward h3 { margin: 0; font: 800 22px/1.1 ${FONT}; } #lk-ward header p { margin: 4px 0 0; color: ${C.ink2}; font: 600 13.5px/1.35 ${FONT}; }
#lk-ward .body { flex: 1; overflow-y: auto; padding: 4px 18px 10px; overscroll-behavior: contain; }
#lk-ward h4 { margin: 14px 0 6px; font: 800 12px/1 ${FONT}; letter-spacing: .08em; text-transform: uppercase; color: ${C.ink2}; }
#lk-ward .chips { display: flex; flex-wrap: wrap; gap: 6px; }
#lk-ward .chips button { border: 2px solid #e3d4b4; border-radius: 999px; padding: 7px 12px; background: #fffaf0; color: ${C.ink}; font: 700 13.5px/1 ${FONT}; cursor: pointer; }
#lk-ward .chips button.on { border-color: ${C.teal}; background: #e2f3ef; }
#lk-ward .sw { display: flex; flex-wrap: wrap; gap: 8px; } #lk-ward .sw button { width: 32px; height: 32px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 2px #e3d4b4; cursor: pointer; padding: 0; }
#lk-ward .sw button.on { box-shadow: 0 0 0 3px ${C.teal}; }
#lk-ward footer { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 10px; padding: 12px 18px 16px; border-top: 2px dashed #e3d4b4; }
#lk-ward footer button { box-sizing: border-box; height: 44px; margin: 0; border: 0; border-radius: 999px; padding: 0 14px; display: flex; align-items: center; justify-content: center; font: 800 15px/1 ${FONT}; cursor: pointer; background: #eadfc6; color: ${C.ink}; box-shadow: 0 3px 0 rgba(59,42,32,.18); transform: none; }
#lk-ward footer button:hover { filter: brightness(1.04); } #lk-ward footer button:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(59,42,32,.18); }
#lk-ward footer .go { background: ${C.teal}; color: #fff; }
`;
const GROUPS = [['body', 'Body'], ['skin', 'Skin', true], ['hair', 'Hair'], ['hairColor', 'Hair colour', true], ['top', 'Top'], ['topColor', 'Top colour and print', true], ['bottom', 'Bottoms'], ['bottomColor', 'Bottoms colour', true], ['shoes', 'Shoes'], ['shoeColor', 'Shoe colour', true], ['acc', 'Accessories']];

export function createWardrobe({ toast }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const el = document.createElement('div'); el.id = 'lk-ward'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Wardrobe'); document.body.appendChild(el);
  let look = null, before = null;
  const saved = () => { try { return JSON.parse(localStorage.getItem('bw-style') || 'null'); } catch { return null; } };
  const apply = () => dispatchEvent(new CustomEvent('bw:style', { detail: look }));
  function render() {
    el.innerHTML = `<header><h3>Wardrobe</h3><p>Dress the way you like. Everyone you meet sees it.</p></header><div class="body">${GROUPS.map(([k, name, swatch]) => `<h4>${name}</h4><div class="${swatch ? 'sw' : 'chips'}">${OPTIONS[k].map(([v, label]) => {
      const on = k === 'acc' ? look.acc.includes(v) : look[k] === v;
      return swatch ? `<button data-k="${k}" data-v="${v}" class="${on ? 'on' : ''}" style="background:${v}" aria-label="${label}" title="${label}"></button>` : `<button data-k="${k}" data-v="${v}" class="${on ? 'on' : ''}">${label}</button>`;
    }).join('')}</div>`).join('')}</div><footer><button class="x">Cancel</button><button class="go">Looks good</button></footer>`;
    el.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => {
      const k = b.dataset.k, v = b.dataset.v;
      if (k === 'acc') look.acc = look.acc.includes(v) ? look.acc.filter((a) => a !== v) : [...look.acc, v];
      else look[k] = v;
      // a gele or fila goes with the outfit; a dress needs no bottoms
      look = cleanLook(look); sfx('tap'); apply();
      const sc = el.querySelector('.body').scrollTop; render(); el.querySelector('.body').scrollTop = sc;
    }; });
    el.querySelector('.x').onclick = () => { look = before; apply(); close(); };
    el.querySelector('.go').onclick = () => { close(); toast?.('New look saved. Other builders see it too.', 2400); sfx('arrive'); };
  }
  function open(current) {
    before = cleanLook(saved() || current || DEFAULT_LOOK); look = { ...before, acc: [...before.acc] };
    render(); el.classList.add('on'); sfx('open');
    dispatchEvent(new CustomEvent('bw:mirror', { detail: true }));
  }
  function close() { el.classList.remove('on'); dispatchEvent(new CustomEvent('bw:mirror', { detail: false })); }
  function dispose() { el.remove(); style.remove(); }
  return { open, close, get isOpen() { return el.classList.contains('on'); }, cancel: () => { if (before) { look = before; apply(); } close(); }, dispose };
}
