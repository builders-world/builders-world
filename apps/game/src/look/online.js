import * as THREE from 'three';
import { createAvatarModel } from '../onboarding/avatar.js';
import { rigAvatar } from './anim.js';
import { C, FONT } from './uikit.js';

// Other players (world bible 13): every second you send where you are to /api/presence and get back
// everyone else in the district. They appear as avatars that glide between updates, walk with the
// same rig, carry a name tag, and speak in chat bubbles. Press Enter to say something to the street.

const store = { get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* */ } } };

const CSS = `
#lk-online { position: fixed; left: 14px; bottom: 66px; z-index: 15; display: flex; align-items: center; gap: 6px; padding: 6px 12px 6px 8px; border-radius: 999px;
  background: ${C.paper}; color: ${C.ink}; font: 700 13px/1 ${FONT}; box-shadow: 0 3px 0 rgba(59,42,32,.2); }
#lk-online i { width: 10px; height: 10px; border-radius: 50%; background: #b6a68c; }
#lk-online.on i { background: #3fbf6d; box-shadow: 0 0 0 3px rgba(63,191,109,.25); }
body.nohud #lk-online, body.bw-cine #lk-online { display: none; }
#lk-say { position: fixed; left: 50%; bottom: 120px; transform: translateX(-50%); z-index: 35; display: none; gap: 8px; align-items: center; padding: 6px 6px 6px 16px;
  border-radius: 999px; background: ${C.paper}; box-shadow: 0 5px 0 rgba(59,42,32,.2), 0 16px 40px rgba(10,14,30,.3); }
#lk-say.on { display: flex; }
#lk-say input { width: min(420px, 70vw); border: 0; background: none; color: ${C.ink}; font: 700 16px/1 ${FONT}; outline: none; }
#lk-say b { font: 700 12px/1 ${FONT}; color: ${C.ink2}; }
.lk-ptag { position: absolute; transform: translate(-50%, -100%); padding: 3px 10px; border-radius: 999px; background: ${C.teal}; color: #fff; font: 700 12.5px/1.3 ${FONT};
  white-space: nowrap; box-shadow: 0 3px 0 rgba(0,0,0,.2); pointer-events: none; }
`;

export function createOnline({ scene, camera, chat, getPlayer, getHeading, getSpeed, district, profile, toast }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const chip = document.createElement('div'); chip.id = 'lk-online'; chip.innerHTML = '<i></i><span>Connecting…</span>';
  const say = document.createElement('div'); say.id = 'lk-say'; say.innerHTML = '<input maxlength="140" placeholder="Say something to the street…" aria-label="Message"><b>Enter to send · Esc</b>';
  const tags = document.createElement('div'); tags.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:12';
  document.body.append(chip, say, tags);
  const input = say.querySelector('input');

  let id = store.get('bw-pid', '');
  if (id.length < 8) { id = `p${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`; store.set('bw-pid', id); }
  const me = () => ({ name: profile?.name || store.get('bw-gh', '') || 'Builder', handle: store.get('bw-gh', '').replace(/"/g, ''), look: profile?.avatar || { color: '#e2b13c', style: 'jacket' } });

  const remote = new Map(); // id -> { obj, rig, tag, from, to, t0, lastSay, lastEmote }
  let pending = { say: '', emote: '' }, busy = false, timer = 0, ok = null, fails = 0;

  function spawn(p) {
    const av = createAvatarModel({ color: p.look?.color, style: p.look?.style });
    const rig = rigAvatar(av.root);
    av.root.position.set(p.x, p.y || 0, p.z);
    scene.add(av.root);
    const tag = document.createElement('div'); tag.className = 'lk-ptag'; tag.textContent = p.name; tags.appendChild(tag);
    const r = { obj: av.root, rig, tag, dispose: av.dispose, from: new THREE.Vector3(p.x, p.y || 0, p.z), to: new THREE.Vector3(p.x, p.y || 0, p.z), yaw: p.yaw, t0: performance.now(), speed: 0, lastSay: p.say?.t || 0, lastEmote: p.emote?.t || 0, name: p.name };
    remote.set(p.id, r);
    return r;
  }

  async function beat() {
    if (busy || document.hidden) return;
    busy = true;
    const P = getPlayer();
    const body = { id, district, x: P.x, z: P.z, y: P.y || 0, yaw: getHeading(), speed: getSpeed(), ...me(), say: pending.say, emote: pending.emote };
    pending = { say: '', emote: '' };
    try {
      const r = await fetch('/api/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) { ok = false; fails = 9; chip.classList.remove('on'); chip.querySelector('span').textContent = 'Offline · playing solo'; return; }
      const j = await r.json();
      if (j.offline) throw new Error('offline');
      ok = true; fails = 0;
      chip.classList.add('on'); chip.querySelector('span').textContent = j.online === 1 ? 'Online · just you here' : `Online · ${j.online} here`;
      const seen = new Set();
      j.players.forEach((p) => {
        seen.add(p.id);
        const r2 = remote.get(p.id) || spawn(p);
        r2.from.copy(r2.obj.position); r2.to.set(p.x, p.y || 0, p.z); r2.t0 = performance.now(); r2.yaw = p.yaw; r2.speed = p.speed; r2.name = p.name; r2.tag.textContent = p.name;
        if (p.say && p.say.t > r2.lastSay) { r2.lastSay = p.say.t; chat?.sayFrom?.(r2.obj, p.say.text, p.name); }
        if (p.emote && p.emote.t > r2.lastEmote) { r2.lastEmote = p.emote.t; chat?.sayFrom?.(r2.obj, p.emote.e, p.name, true); }
      });
      remote.forEach((r2, k) => { if (!seen.has(k)) { r2.obj.removeFromParent(); r2.tag.remove(); r2.dispose?.(); remote.delete(k); } });
    } catch {
      fails++;
      if (fails > 2) { ok = false; chip.classList.remove('on'); chip.querySelector('span').textContent = 'Offline · playing solo'; }
    } finally { busy = false; }
  }

  // Enter opens the message box; Enter again sends; Esc closes
  addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || say.classList.contains('on') || e.target.closest?.('input, textarea')) return;
    if (document.querySelector('#lkm-phone.on, #lkm-map.on, #lkm-bag.on, #lkm-set.on, #lkm-wal.on, #lkr.on')) return;
    e.preventDefault(); say.classList.add('on'); input.value = ''; input.focus();
  });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { say.classList.remove('on'); input.blur(); }
    if (e.key === 'Enter') {
      const text = input.value.trim().slice(0, 140);
      say.classList.remove('on'); input.blur();
      if (!text) return;
      pending.say = text; chat?.sayMine?.(text);
      if (ok === false) toast?.('You are offline, so only you can see that.');
      timer = 0;
    }
  });
  addEventListener('bw:emote', (e) => { pending.emote = e.detail; timer = Math.min(timer, 0.2); });

  const v = new THREE.Vector3();
  function update(dt) {
    timer -= dt;
    if (timer <= 0) { timer = 1; beat(); }
    const now = performance.now();
    remote.forEach((r) => {
      const k = Math.min(1, (now - r.t0) / 1000);
      r.obj.position.lerpVectors(r.from, r.to, k);
      const dh = Math.atan2(Math.sin(r.yaw - r.obj.rotation.y), Math.cos(r.yaw - r.obj.rotation.y));
      r.obj.rotation.y += dh * (1 - Math.exp(-dt * 10));
      r.rig?.update(dt, { speed: k < 1 ? Math.min(r.speed, 7) : 0, running: r.speed > 4, t: now / 1000 });
      v.copy(r.obj.position); v.y += 2.15;
      const far = v.distanceTo(camera.position); v.project(camera);
      const vis = v.z < 1 && far < 45 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      r.tag.style.display = vis ? '' : 'none';
      if (vis) { r.tag.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`; r.tag.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`; }
    });
  }
  const bodies = () => [...remote.values()].map((r) => ({ x: r.obj.position.x, z: r.obj.position.z, r: 0.33 }));
  function dispose() { remote.forEach((r) => { r.obj.removeFromParent(); r.dispose?.(); }); chip.remove(); say.remove(); tags.remove(); style.remove(); }
  return { update, bodies, dispose, get count() { return remote.size; }, get online() { return ok; }, id };
}
