// The bottom-left of the HUD as one column (Elvis, 11 October 2026 UI brief: "no essential HUD component should overlap
// another in any normal gameplay state, including when Builders is open or the inventory contains items"). Things that
// used to be pinned to the corner each at its own height (your status, the bag of litter you carry, your pet's bar,
// what you are playing, who is online) now stack in one column above the key bar, in a fixed order, a set gap apart;
// anything hidden takes no room, so nothing lands on anything else whatever is showing. Each keeps its own look.
import { GAP } from './uikit.js';

// bottom to top
const ORDER = ['lk-online', 'lk-me', 'lk-bag', 'lk-petbar', 'lk-np'];

export function createDock() {
  const st = document.createElement('style');
  st.textContent = `
#lk-dock { position: fixed; left: 14px; bottom: 60px; z-index: 15; display: flex; flex-direction: column-reverse; align-items: flex-start; gap: ${GAP.sm + 2}px; pointer-events: none; max-height: calc(100vh - 300px); }
#lk-dock > * { position: static !important; left: auto !important; bottom: auto !important; margin: 0 !important; }
#lk-dock > :not(#lk-me) { pointer-events: auto; }
body.nohud #lk-dock, body.bw-cine #lk-dock { display: none; }
@media (max-width: 700px) { #lk-dock { bottom: 14px; } }`;
  document.head.appendChild(st);
  const dock = document.createElement('div'); dock.id = 'lk-dock'; document.body.appendChild(dock);
  const adopt = () => {
    ORDER.forEach((id) => { const el = document.getElementById(id); if (el && el.parentElement !== dock) dock.appendChild(el); });
    // keep the order whatever came first
    ORDER.map((id) => document.getElementById(id)).filter((el) => el && el.parentElement === dock).forEach((el) => dock.appendChild(el));
  };
  adopt();
  const mo = new MutationObserver(() => { if (ORDER.some((id) => { const el = document.getElementById(id); return el && el.parentElement !== dock; })) adopt(); });
  mo.observe(document.body, { childList: true });
  return { el: dock, adopt, dispose() { mo.disconnect(); dock.remove(); st.remove(); } };
}
