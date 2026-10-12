// The guide's lesson before an activity (recreation/): a card of numbered steps with Back and Next, the guide's name
// on top, the last button starting the activity. Shared by skydiving and archery.
import { sfx } from '../audio.js';
import { C, FONT } from '../uikit.js';

const CSS = `
.bw-brief { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 40; width: min(460px, calc(100vw - 32px)); box-sizing: border-box; padding: 16px 18px; border-radius: 20px;
  background: ${C.paper}; color: ${C.ink}; font: 600 14px/1.45 ${FONT}; box-shadow: 0 5px 0 rgba(59,42,32,.2), 0 18px 40px rgba(10,14,30,.3); }
.bw-brief h4 { margin: 0 0 2px; font: 800 18px/1.2 ${FONT}; } .bw-brief .who { color: ${C.teal}; font-weight: 800; font-size: 12px; margin-bottom: 6px; }
.bw-brief .dots { display: flex; gap: 5px; margin: 10px 0 0; } .bw-brief .dots i { width: 8px; height: 8px; border-radius: 50%; background: #e3d4b4; } .bw-brief .dots i.on { background: ${C.coral}; }
.bw-brief .row { display: flex; gap: 8px; margin-top: 12px; } .bw-brief button { flex: 1; border: 0; border-radius: 999px; padding: 10px; font: 800 14px/1 ${FONT}; cursor: pointer; background: #efe2c4; color: ${C.ink}; }
.bw-brief button.go { background: ${C.amber}; box-shadow: 0 3px 0 #c98f1f; }
`;
let styled = false;

/**
 * @param o { id, who, steps: [{ t, b }], last: label of the final button, onDone() }
 * @returns { el, next(), remove() }
 */
export function briefCard(o) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); styled = true; }
  const el = document.createElement('div'); el.className = 'bw-brief'; if (o.id) el.id = o.id;
  el.innerHTML = '<div class="who"></div><h4></h4><div class="b"></div><div class="dots"></div><div class="row"><button class="back">Back</button><button class="go">Next</button></div>';
  document.body.appendChild(el);
  let step = 0;
  const render = () => {
    const st = o.steps[step];
    el.querySelector('.who').textContent = o.who;
    el.querySelector('h4').textContent = `${step + 1}. ${st.t}`; el.querySelector('.b').textContent = st.b;
    el.querySelector('.dots').innerHTML = o.steps.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('');
    el.querySelector('.back').style.visibility = step ? 'visible' : 'hidden';
    el.querySelector('.go').textContent = step === o.steps.length - 1 ? o.last : 'Next';
  };
  const next = () => { if (step < o.steps.length - 1) { step++; render(); sfx('tap'); } else { el.remove(); o.onDone(); } };
  el.querySelector('.back').onclick = () => { step = Math.max(0, step - 1); render(); sfx('tap'); };
  el.querySelector('.go').onclick = next;
  render();
  return { el, next, remove: () => el.remove(), get step() { return step; } };
}

// While an activity is on, the street's touch controls, your badge and the prompt make way for the activity's own.
let modeCss = null;
export function recMode(on) {
  if (!modeCss) { modeCss = document.createElement('style'); modeCss.textContent = 'body.bw-rec #lk-touch, body.bw-rec #lk-me, body.bw-rec #lk-prompt { display: none !important; } @media (pointer: coarse) { body.bw-rec #lk-skeys { display: none !important; } }'; document.head.appendChild(modeCss); }
  document.body.classList.toggle('bw-rec', on);
}
