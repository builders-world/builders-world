import * as THREE from 'three';
import { C, FONT } from './uikit.js';

// A compass across the top of the screen (Elvis, 10 October 2026: "a compass at the center top, where you can tell
// what is north, west, east, south"). A strip of bearings slides under a fixed needle as you turn: the letter under
// the needle is the way the camera faces. North is the top of the map: -z in the world, as OpenStreetMap lays it out.

const PX = 2.2; // pixels a degree
const NAMES = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };

const CSS = `
#lk-compass { position: fixed; left: 50%; top: 12px; transform: translateX(-50%); z-index: 15; width: 360px; max-width: calc(100vw - 230px); height: 34px; border-radius: 999px;
  background: ${C.paper}; box-shadow: 0 3px 0 rgba(59,42,32,.18), 0 8px 20px rgba(10,14,30,.16); overflow: hidden; pointer-events: none; font-family: ${FONT};
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent); mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent); }
#lk-compass .strip { position: absolute; top: 0; bottom: 0; left: 50%; will-change: transform; }
#lk-compass .t { position: absolute; bottom: 5px; width: 2px; margin-left: -1px; border-radius: 1px; background: rgba(59,42,32,.35); }
#lk-compass .t.big { background: rgba(59,42,32,.6); }
#lk-compass .l { position: absolute; top: 4px; transform: translateX(-50%); font: 800 14px/1 ${FONT}; color: ${C.ink}; }
#lk-compass .l.n { color: ${C.coral}; font-size: 16px; }
#lk-compass .l.minor { font-size: 11px; top: 6px; color: ${C.ink2}; }
#lk-compass .needle { position: absolute; left: 50%; top: 0; width: 0; height: 0; margin-left: -6px; border: 6px solid transparent; border-top: 7px solid ${C.coral}; }
body.nohud #lk-compass, body.bw-cine #lk-compass, body.bw-inside #lk-compass { display: none; }
@media (max-width: 640px) { #lk-compass { top: 64px; width: 240px; max-width: calc(100vw - 32px); } }
`;

export function createCompass({ camera }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const el = document.createElement('div'); el.id = 'lk-compass'; el.setAttribute('aria-hidden', 'true');
  // three turns of the strip, so it can slide either way without running out
  let marks = '';
  for (let d = -360; d <= 720; d += 15) {
    const b = ((d % 360) + 360) % 360, x = d * PX;
    marks += `<i class="t${b % 45 === 0 ? ' big' : ''}" style="left:${x}px;height:${b % 45 === 0 ? 9 : 5}px"></i>`;
    if (NAMES[b]) marks += `<b class="l${b === 0 ? ' n' : b % 90 ? ' minor' : ''}" style="left:${x}px">${NAMES[b]}</b>`;
  }
  el.innerHTML = `<div class="strip">${marks}</div><i class="needle"></i>`;
  document.body.appendChild(el);
  const strip = el.querySelector('.strip'), f = new THREE.Vector3();
  let last = -1;
  function update() {
    camera.getWorldDirection(f);
    // the bearing: 0 north (-z), 90 east (+x)
    const b = ((Math.atan2(f.x, -f.z) * 180) / Math.PI + 360) % 360;
    if (Math.abs(b - last) < 0.2) return; last = b;
    strip.style.transform = `translateX(${-b * PX}px)`;
  }
  return { update, el, dispose() { el.remove(); style.remove(); } };
}
