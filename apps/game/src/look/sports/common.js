import * as THREE from 'three';
import { createAvatarModel } from '../../onboarding/avatar.js';
import { rigAvatar, staleLod, PEOPLE } from '../anim.js';
import { prepareLook, dress, lookFor } from '../style.js';
import { signTexture } from '../props.js';
import { C, FONT } from '../uikit.js';

// Shared by the sports (sports/): a person, a box, a material, a sign, the scoreboard card, and the
// keyboard while a game is on (the game takes the keys it needs so the street does not also act on them).

export const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
export const mat = (color, r = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: r, ...extra });

export function person(look, seed) {
  const av = createAvatarModel({ color: '#888', style: 'tee' });
  prepareLook(av.root);
  const rig = rigAvatar(av.root);
  dress(av.root, look || lookFor(seed), rig);
  return { av, rig, obj: av.root, dispose: () => { rig?.dispose?.(); av.dispose?.(); staleLod(av.root); PEOPLE.delete(av.root); } }; // the rig's own joints and a far stand-in too, not just the body
}

// a copy of you for a game or an activity: your wardrobe look if you have chosen one, else the body you arrived with
export const playerBody = (avatar) => { let b = null; avatar?.traverse?.((o) => { if (!b && o.userData?.isPlayer) b = o; }); return b; };
export function playerPerson(avatar, seed = 'you') {
  const body = playerBody(avatar);
  if (body?.userData.look) return person(body.userData.look, seed);
  const av = createAvatarModel(body?.userData.modelOptions || { color: '#e2b13c', style: 'jacket' });
  prepareLook(av.root);
  const rig = rigAvatar(av.root);
  return { av, rig, obj: av.root, dispose: () => { rig?.dispose?.(); av.dispose?.(); staleLod(av.root); PEOPLE.delete(av.root); } };
}

export function signBoard(title, sub, bg = '#22336a', w = 4.2) {
  const g = new THREE.Group();
  const post = mat(0x263832);
  g.add(new THREE.Mesh(box(0.1, 0.9, 0.1, -w / 2 + 0.3, -0.45, 0), post), new THREE.Mesh(box(0.1, 0.9, 0.1, w / 2 - 0.3, -0.45, 0), post));
  const tex = signTexture(title, { bg, fg: '#ffffff', w: 1024, h: 200, sub });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 200 / 1024), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
  const back = face.clone(); back.rotation.y = Math.PI;
  g.add(face, back);
  return g;
}

// ---------- the scoreboard card and the controls line ----------
const CSS = `
#lk-score { position: fixed; left: 50%; top: 14px; transform: translateX(-50%); z-index: 30; display: none; flex-direction: column; align-items: center; gap: 4px; pointer-events: none; }
#lk-score.on { display: flex; }
#lk-score .card { display: flex; align-items: stretch; border-radius: 16px; overflow: hidden; background: ${C.paper}; color: ${C.ink}; font: 700 15px/1.2 ${FONT}; box-shadow: 0 4px 0 rgba(59,42,32,.22), 0 14px 30px rgba(10,14,30,.25); }
#lk-score .card > div { padding: 7px 12px; display: flex; flex-direction: column; justify-content: center; }
#lk-score .card .nm { min-width: 120px; } #lk-score .card .nm span { display: flex; align-items: center; gap: 6px; }
#lk-score .card .nm span.srv::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: ${C.amber}; }
#lk-score .card .col { align-items: center; min-width: 34px; background: ${C.paper2}; border-left: 1px solid #e3d4b4; }
#lk-score .card .col.pts { background: ${C.ink}; color: ${C.paper}; min-width: 44px; }
#lk-score .card .col small { font: 700 10px/1 ${FONT}; opacity: .7; margin-bottom: 2px; }
#lk-score .call { padding: 5px 14px; border-radius: 999px; background: ${C.coral}; color: #fff; font: 800 15px/1.2 ${FONT}; box-shadow: 0 3px 0 rgba(0,0,0,.2); opacity: 0; transition: opacity .2s; }
#lk-score .call.on { opacity: 1; }
#lk-skeys { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 30; display: none; gap: 10px; padding: 6px 14px; border-radius: 999px; background: ${C.paper}; color: ${C.ink};
  font: 700 13px/1.3 ${FONT}; box-shadow: 0 3px 0 rgba(59,42,32,.2); white-space: nowrap; max-width: calc(100vw - 20px); overflow: hidden; text-overflow: ellipsis; }
#lk-skeys.on { display: flex; } #lk-skeys kbd { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; margin-right: 4px; border-radius: 999px; background: ${C.ink}; color: ${C.paper}; font: 700 11px/1 ${FONT}; }
body.bw-playing #lk-online, body.bw-playing #lk-prompt, body.bw-playing #lk-keys, body.bw-playing #lk-obj, body.bw-playing #lk-tags, body.bw-playing #lkm-tip, body.bw-playing .lkm-hints { opacity: 0 !important; pointer-events: none !important; }
#lk-meter { position: fixed; left: 50%; bottom: 60px; transform: translateX(-50%); z-index: 30; width: 220px; height: 14px; border-radius: 999px; background: ${C.paper}; box-shadow: 0 3px 0 rgba(59,42,32,.2); display: none; overflow: hidden; }
#lk-meter.on { display: block; } #lk-meter i { position: absolute; left: 0; top: 0; bottom: 0; background: ${C.teal}; border-radius: 999px; }
#lk-meter b { position: absolute; top: -2px; bottom: -2px; width: 4px; background: ${C.coral}; border-radius: 2px; }
`;
let ui = null;
export function sportsUI() {
  if (ui) return ui;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const score = document.createElement('div'); score.id = 'lk-score'; score.innerHTML = '<div class="card"></div><div class="call"></div>';
  const keys = document.createElement('div'); keys.id = 'lk-skeys';
  const meter = document.createElement('div'); meter.id = 'lk-meter'; meter.innerHTML = '<i></i><b></b>';
  document.body.append(score, keys, meter);
  let callT = 0;
  ui = {
    show(on) { score.classList.toggle('on', on); keys.classList.toggle('on', on); document.body.classList.toggle('bw-playing', on); if (!on) meter.classList.remove('on'); },
    // rows: [{ name, serving, cols: [..] }], heads: column titles; the last column is the live points
    board(rows, heads = []) {
      const esc = (t) => String(t).replace(/[<>&"]/g, '');
      score.querySelector('.card').innerHTML = `<div class="nm">${rows.map((r) => `<span class="${r.serving ? 'srv' : ''}">${esc(r.name)}</span>`).join('')}</div>`
        + heads.map((h, k) => `<div class="col ${k === heads.length - 1 ? 'pts' : ''}"><small>${esc(h)}</small>${rows.map((r) => `<span>${esc(r.cols[k] ?? '')}</span>`).join('')}</div>`).join('');
    },
    call(text, ms = 1400) { const c = score.querySelector('.call'); c.textContent = text; c.classList.add('on'); clearTimeout(callT); callT = setTimeout(() => c.classList.remove('on'), ms); },
    keys(list) { keys.innerHTML = list.map(([k, what]) => `<span><kbd>${k}</kbd>${what}</span>`).join(''); },
    meter(v, mark) { meter.classList.toggle('on', v != null); if (v == null) return; meter.querySelector('i').style.width = `${Math.max(0, Math.min(1, v)) * 100}%`; meter.querySelector('b').style.left = `${(mark ?? 0.8) * 100}%`; },
  };
  return ui;
}

// ---------- the keyboard during a game ----------
// While a game is on, its keys are captured before the street sees them (no jumping, no opening the map
// mid-rally). Esc always reaches the game, which offers to leave.
export function gameKeys(use = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'e', 'f', 'escape', 'j', 'k', 'l']) {
  const down = new Set(), pressed = [];
  let on = false;
  const kd = (e) => {
    if (!on || e.target.closest?.('input, textarea, select')) return;
    const k = e.key.toLowerCase();
    if (!use.includes(k)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!down.has(k)) pressed.push(k);
    down.add(k);
  };
  const ku = (e) => { if (!on) return; const k = e.key.toLowerCase(); if (use.includes(k)) { e.stopImmediatePropagation(); down.delete(k); } };
  const blur = () => down.clear();
  addEventListener('keydown', kd, true); addEventListener('keyup', ku, true); addEventListener('blur', blur);
  return {
    set on(v) { on = v; down.clear(); pressed.length = 0; }, get on() { return on; },
    has: (k) => down.has(k),
    // keys pressed since the last call, in order
    take: () => pressed.splice(0),
    axis: () => ({ x: (down.has('d') || down.has('arrowright') ? 1 : 0) - (down.has('a') || down.has('arrowleft') ? 1 : 0), y: (down.has('w') || down.has('arrowup') ? 1 : 0) - (down.has('s') || down.has('arrowdown') ? 1 : 0) }),
    dispose() { removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); removeEventListener('blur', blur); },
  };
}
