import { walletEngine, effortsMark, fmt } from './wallet.js';
import { sfx } from './audio.js';
import { C, FONT, RAD, GAP, art } from './uikit.js';

// The gadget shop (Elvis's list: "umbrella and raincoat, own bicycle, gadget shop, binoculars"). Every city already has a
// shop that sells gadgets on its street (Gadget Corner in Yaba, Crescent Gadgets in Wuse, Pitakwa Gadgets in Old GRA,
// Ibom Gadgets in Uyo; in Osu and Kilimani the phone repairers, who sell them too). E there opens its counter: the
// things the bag can hold that have a price, bought with Efforts and kept on this device. Bought, an item sits in the bag
// like the rest, to carry or wear.

export const GADGET_SHOP = /gadget|phone repairs|phone doctor/i;
const KEY = 'bw-owned';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
export const owns = (id) => read().includes(id);
const add = (id) => { const v = read(); if (!v.includes(id)) v.push(id); try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } };

const CSS = `
#lk-shop { position: fixed; right: 16px; top: 74px; z-index: 33; width: min(380px, calc(100vw - 32px)); max-height: calc(100vh - 160px); overflow-y: auto; box-sizing: border-box; display: none; padding: ${GAP.lg}px; border-radius: ${RAD.lg}px; background: ${C.paper}; color: ${C.ink}; font-family: ${FONT}; box-shadow: 0 2px 0 rgba(59,42,32,.14), 0 18px 40px rgba(10,14,30,.25); }
#lk-shop.on { display: block; } #lk-shop h3 { margin: 0; font: 800 20px/1.1 ${FONT}; } #lk-shop .say { margin: ${GAP.sm}px 0 ${GAP.md}px; padding: ${GAP.sm}px ${GAP.md}px; border-radius: ${RAD.md}px; background: ${C.paper2}; font: 600 13.5px/1.4 ${FONT}; }
#lk-shop .it { display: grid; grid-template-columns: 48px 1fr auto; align-items: center; gap: ${GAP.md}px; width: 100%; margin-bottom: ${GAP.sm}px; padding: ${GAP.sm}px; border: 2px solid #e3d4b4; border-radius: ${RAD.md}px; background: #fffaf0; color: ${C.ink}; font: 700 14px/1.2 ${FONT}; text-align: left; cursor: pointer; }
#lk-shop .it:disabled { opacity: .6; cursor: default; } #lk-shop .it small { display: block; margin-top: 2px; color: ${C.ink2}; font: 600 12px/1.3 ${FONT}; }
#lk-shop .it .p { font: 800 13px/1 ${FONT}; white-space: nowrap; } #lk-shop .it .p.own { color: ${C.teal}; }
#lk-shop .x { width: 100%; margin-top: ${GAP.sm}px; border: 0; border-radius: ${RAD.pill}px; padding: 11px; background: #eadfc6; color: ${C.ink}; font: 800 14px/1 ${FONT}; cursor: pointer; }
`;

export function createShop({ items, toast, onBought }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'lk-shop'; el.setAttribute('role', 'dialog'); document.body.appendChild(el);
  el.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') close(); });
  let shopName = '';
  // closing hands the keyboard back to the game (a focused button inside the hidden panel would swallow every key)
  const close = () => { el.classList.remove('on'); if (el.contains(document.activeElement)) document.activeElement.blur(); };
  function render(say) {
    const forSale = items.filter((i) => i.price);
    el.innerHTML = `<h3>${shopName}</h3><div class="say">${say}</div>
      ${forSale.map((i) => { const has = owns(i.id); return `<button class="it" data-id="${i.id}" ${has ? 'disabled' : ''}>${art(i.icon || i.id, 48)}<span>${i.name}<small>${i.desc}</small></span><span class="p ${has ? 'own' : ''}">${has ? 'In your bag' : `${effortsMark(12)}${fmt(i.price)}`}</span></button>`; }).join('')}
      <button class="x">Leave</button>`;
    el.querySelectorAll('.it').forEach((b) => { b.onclick = () => buy(b.dataset.id); });
    el.querySelector('.x').onclick = close;
  }
  function buy(id) {
    const it = items.find((i) => i.id === id); if (!it || owns(id)) return;
    if (!walletEngine().spend(it.price, `${it.name} at ${shopName}`)) { render(`That one is ${fmt(it.price)} Efforts. Come back when you have it.`); return; }
    add(id); sfx('pick'); onBought?.(it);
    render(`Good choice. The ${it.name.toLowerCase().replace(/^your own /, '')} is yours.`);
    toast?.(`In your bag: ${it.name}. Open the bag (I) to ${it.wear ? 'wear' : 'carry'} it.`, 3200);
  }
  return {
    // E at a shop: true if it is the gadget shop and its counter opened
    open(shop) {
      if (!shop?.name || !GADGET_SHOP.test(shop.name)) return false;
      shopName = shop.name; render('Everything you need for the street. What are you looking for?'); el.classList.add('on'); el.querySelector('.it:not([disabled])')?.focus();
      return true;
    },
    close, get isOpen() { return el.classList.contains('on'); },
    dispose() { el.remove(); st.remove(); },
  };
}
