import * as THREE from 'three';
import { createAvatarModel } from '../onboarding/avatar.js';
import { trackPerson } from './anim.js';
import { walletEngine, effortsMark, fmt } from './wallet.js';
import { sfx } from './audio.js';
import { C, FONT } from './uikit.js';

// Gated estates (world bible 7.5c). Every gate has a gateman. Residents come and go; anyone else signs
// in at the gatehouse. Say who you are visiting and the guard rings them: if they are home, awake and
// happy to see you, you get a visitor pass for that estate, good for three days, and a day's wait
// before the next one. Or rent a vacant house and the estate is yours to walk into. Walk past the
// gate without a pass and the guard turns you back; climb the wall and it costs you your reputation.

const VISIT_DAYS = 3, COOLDOWN_DAYS = 1, RENT = 5000, RENT_DAYS = 30, DAY = 86400000;
const GUARDS = ['Sule', 'Baba Musa', 'Officer Chinedu', 'Mallam Garba', 'Oga Tunde', 'Ibrahim', 'Femi', 'Aliyu'];

const CSS = `
#lk-gate { position: fixed; inset: 0; z-index: 36; display: none; place-items: center; background: rgba(20,16,12,.45); font-family: ${FONT}; color: ${C.ink}; }
#lk-gate.on { display: grid; }
#lk-gate .box { width: min(460px, calc(100vw - 32px)); max-height: calc(100vh - 40px); overflow-y: auto; padding: 22px; border-radius: 26px; background: ${C.paper}; box-shadow: 0 6px 0 rgba(59,42,32,.25), 0 30px 70px rgba(10,14,30,.35); }
#lk-gate h3 { margin: 0; font: 800 22px/1.1 ${FONT}; } #lk-gate .sub { color: ${C.ink2}; margin: 4px 0 12px; font: 600 14px/1.4 ${FONT}; }
#lk-gate .say { padding: 10px 14px; border-radius: 16px; background: ${C.paper2}; margin-bottom: 12px; font: 700 14.5px/1.4 ${FONT}; }
#lk-gate label { display: block; margin: 12px 0 6px; font: 800 12px/1 ${FONT}; letter-spacing: .08em; text-transform: uppercase; color: ${C.ink2}; }
#lk-gate .list { display: grid; gap: 6px; } #lk-gate .list button { display: flex; justify-content: space-between; align-items: center; gap: 10px; border: 2px solid #e3d4b4; border-radius: 14px; padding: 10px 12px; background: #fffaf0; color: ${C.ink}; font: 700 14px/1.2 ${FONT}; cursor: pointer; text-align: left; }
#lk-gate .list button small { color: ${C.ink2}; font-weight: 600; } #lk-gate .list button:disabled { opacity: .5; cursor: default; }
#lk-gate .row { display: flex; gap: 8px; margin-top: 14px; } #lk-gate .row button { flex: 1; border: 0; border-radius: 999px; padding: 12px; font: 800 15px/1 ${FONT}; cursor: pointer; background: #eadfc6; color: ${C.ink}; }
#lk-gate svg { display: inline-block; vertical-align: -2px; }
`;

export function createGates({ world, scene, props, lives, passes, toast, getHour = () => new Date().getHours(), enterPlayerHome }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const panel = document.createElement('div'); panel.id = 'lk-gate'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Gatehouse'); document.body.appendChild(panel);
  const group = new THREE.Group(); group.name = 'gatemen'; scene.add(group);
  const estates = (world.estates || []).map((E, ei) => {
    const [o, a, , d] = E.corners, W = Math.hypot(a[0] - o[0], a[1] - o[1]), D = Math.hypot(d[0] - o[0], d[1] - o[1]);
    return { ...E, ei, o, u: [(a[0] - o[0]) / W, (a[1] - o[1]) / W], v: [(d[0] - o[0]) / D, (d[1] - o[1]) / D], W, D };
  });
  const inside = (E, x, z, m = 0) => { const dx = x - E.o[0], dz = z - E.o[1], s = dx * E.u[0] + dz * E.u[1], t = dx * E.v[0] + dz * E.v[1]; return s > m && s < E.W - m && t > m && t < E.D - m; };
  const houses = (name) => (world.addresses || []).filter((h) => h.estate === name);
  const residentsOf = (name) => (lives?.residents || []).filter((r) => (r.home.addr || '').endsWith(name));

  // a gateman at every gate, beside the opening, and the gatehouse window you talk to
  estates.forEach((E) => E.gates.forEach((g, gi) => {
    const guard = createAvatarModel({ color: '#3a4f7a', style: 'jacket' });
    const [px, pz] = g.post[1];
    guard.root.position.set(px + g.inward[0] * 1.2, 0, pz + g.inward[1] * 1.2);
    guard.root.rotation.y = g.ry; group.add(trackPerson(guard.root));
    g.guard = GUARDS[(E.ei * 3 + gi) % GUARDS.length];
    g.out = { x: g.x - g.inward[0] * 2.6, z: g.z - g.inward[1] * 2.6 };
    props.interact.push({ id: `gate:${E.ei}:${gi}`, label: `Gatehouse: ${E.name}, Gate ${g.no}`, x: g.out.x, z: g.out.z, r: 3.2 });
  }));

  // ---------- the gatehouse ----------
  const esc = (t) => String(t).replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));
  const when = (t) => new Date(t).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  let at = null; // { E, g }
  function open(id) {
    const [, ei, gi] = id.split(':').map(Number), E = estates[ei]; if (!E) return false;
    at = { E, g: E.gates[gi] }; render(); panel.classList.add('on'); sfx('open'); return true;
  }
  function close() { panel.classList.remove('on'); at = null; }
  function render(say) {
    const { E, g } = at, acc = passes.access(E.name), t = passes.tenancy(), v = passes.visitorFor(E.name);
    const res = residentsOf(E.name), taken = new Set(res.map((r) => r.home.addr)), vacant = houses(E.name).filter((h) => !taken.has(h.addr) && !(t && t.addr === h.addr));
    const greeting = say || (acc === 'resident' ? `Welcome home! Pass in.` : acc === 'visitor' ? `Your visitor pass is good until ${when(v.until)}. Go on in.` : `Good ${getHour() < 12 ? 'morning' : getHour() < 17 ? 'afternoon' : 'evening'}. Who are you here to see?`);
    panel.innerHTML = `<div class="box"><h3>${esc(E.name)}, Gate ${g.no}</h3><div class="sub">Gateman ${esc(g.guard)} · your reputation: ${passes.rep} (${passes.repLabel()})</div>
      <div class="say">${esc(g.guard)}: "${esc(greeting)}"</div>
      ${acc || !playersHere(E.name).length ? '' : `<label>Builders who live here</label><div class="list">${playersHere(E.name).map((p) => `<button data-pvisit="${p.id}"><span>${esc(p.name)}<br><small>${esc(p.home.split(',')[0])} · online now</small></span><span>Call</span></button>`).join('')}</div>`}
      ${acc ? '' : `<label>Visit a resident</label><div class="list">${res.map((r) => `<button data-visit="${r.id}"><span>${esc(r.name)}<br><small>${esc(r.home.addr.split(',')[0])} · ${esc(r.job)}</small></span><span>Call</span></button>`).join('') || '<div class="sub">Nobody here you know yet.</div>'}</div>`}
      ${acc === 'resident' ? '' : `<label>Rent a home here · ${effortsMark(12)}${fmt(RENT)} for ${RENT_DAYS} days</label><div class="list">${vacant.slice(0, 6).map((h) => `<button data-rent="${esc(h.addr)}"><span>House ${esc(h.no)}<br><small>Gate ${h.gate} · 2 bedrooms, garage</small></span><span>Rent</span></button>`).join('') || '<div class="sub">No vacant houses here right now.</div>'}</div>`}
      <div class="row"><button class="x">${acc ? 'Thanks' : 'Leave'}</button></div></div>`;
    panel.querySelector('.x').onclick = close;
    panel.querySelectorAll('[data-visit]').forEach((b) => { b.onclick = () => call(b.dataset.visit); });
    panel.querySelectorAll('[data-pvisit]').forEach((b) => { b.onclick = () => { const p = playersHere(at.E.name).find((q) => q.id === b.dataset.pvisit); if (!p) return; waiting = { id: p.id, kind: 'gate', estate: at.E.name, gate: at.g.no, name: p.name }; online.knock(p.id, 'gate'); render(`Ringing ${p.name}... (another builder; they answer from wherever they are)`); }; });
    panel.querySelectorAll('[data-rent]').forEach((b) => { b.onclick = () => rent(b.dataset.rent); });
  }
  // the guard rings the host on the intercom
  function call(rid) {
    const { E, g } = at, r = (lives?.residents || []).find((x) => x.id === rid); if (!r) return;
    const v = passes.visitorFor(E.name);
    if (v && v.until < Date.now() && Date.now() - v.until < COOLDOWN_DAYS * DAY) { render(`Your last visit here ended ${Math.round((Date.now() - v.until) / 3600000)} hours ago. Come back tomorrow.`); return; }
    render(`Ringing ${r.first}...`); sfx('interact');
    panel.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    setTimeout(() => {
      if (!at) return;
      if (!r.inside) { render(`${r.first} is not at home. ${(r.doing || '').replace(/^./, (c) => c.toLowerCase())}. Try later.`); return; }
      if (/Asleep|In bed/.test(r.doing || '')) { render(`It is late, ${r.first} is asleep. Come back in the morning.`); return; }
      const odds = 0.45 + (r.met ? 0.25 : 0) + (passes.rep - 50) / 100 + (r.mood || 0) * 0.2;
      if (Math.random() > odds) { render(`${r.first} says ${r.met ? 'not today, sorry' : 'they are not expecting anyone'}.`); return; }
      const c = passes.addCard({ kind: 'visitor', estate: E.name, gate: g.no, host: r.first, until: Date.now() + VISIT_DAYS * DAY });
      r.met = true;
      sfx('arrive');
      render(`${r.first} says let you in. Here is your visitor pass, good until ${when(c.until)}. ${r.home.addr.split(',')[0]} is on the ${r.home.addr.includes('A,') ? 'left' : 'right'}.`);
    }, 1600);
  }
  function rent(addr) {
    const { E } = at, h = houses(E.name).find((x) => x.addr === addr); if (!h) return;
    if (!walletEngine().spend(RENT, `Rent: ${h.no}, ${E.name}`)) { render(`Rent is ${fmt(RENT)} Efforts. You have ${fmt(walletEngine().balance())}.`); return; }
    const wifi = { ssid: `Home-${h.no}-${E.name.split(' ')[0]}`, pass: `${E.name.split(' ')[0].toLowerCase()}${h.no.toLowerCase()}` };
    passes.addCard({ kind: 'tenant', estate: E.name, addr: h.addr, gate: h.gate, house: h.no, until: Date.now() + RENT_DAYS * DAY, wifi });
    passes.addRep(3, 'a new neighbour');
    sfx('arrive'); placeHomeDoor();
    render(`Welcome to ${E.name}! House ${h.no} is yours. Your resident pass is in your bag.`);
  }

  // ---------- your own front door ----------
  let homeIt = null;
  function placeHomeDoor() {
    if (homeIt) { const k = props.interact.indexOf(homeIt); if (k >= 0) props.interact.splice(k, 1); homeIt = null; }
    const t = passes.tenancy(); if (!t) return;
    const h = (world.addresses || []).find((x) => x.addr === t.addr); if (!h?.door) return;
    homeIt = { id: 'myhome', label: `Your home, ${h.no}: go in`, x: h.door.x, z: h.door.z, r: 1.6, door: h.door };
    props.interact.push(homeIt);
  }
  placeHomeDoor();

  // ---------- the gate is watched ----------
  let lastOut = null, inEstate = null, cool = 0;
  function update(dt, player, indoors) {
    cool -= dt;
    if (indoors) return null;
    const E = estates.find((e) => inside(e, player.x, player.z, 0.3));
    if (!E) { lastOut = { x: player.x, z: player.z }; inEstate = null; return null; }
    if (passes.access(E.name)) { inEstate = E; return null; }
    // turned back: at the gate you are stopped politely; over the wall you are caught
    const g = E.gates.reduce((b, q) => (Math.hypot(q.x - player.x, q.z - player.z) < Math.hypot(b.x - player.x, b.z - player.z) ? q : b), E.gates[0]);
    const viaGate = lastOut && E.gates.some((q) => Math.hypot(q.x - lastOut.x, q.z - lastOut.z) < 6);
    if (cool <= 0) {
      cool = 2;
      if (viaGate) toast(`${g.guard}: "Oga, sign in at the gatehouse first. Who are you visiting?"`, 3600);
      else { toast(`${g.guard}: "Hey! You no fit climb wall enter estate. Out!"`, 3600); passes.addRep(-8, 'caught climbing an estate wall'); }
    }
    return { x: g.out.x, z: g.out.z, yaw: g.ry };
  }
  // inside your own home: the house is the interior, with nobody else in it
  function enterHome() {
    const t = passes.tenancy(); if (!t || !homeIt) return null;
    return { self: true, first: 'Your', name: 'Your home', door: homeIt.door, pidgin: false, kids: [], dream: 'make this place feel like home', addr: t.addr };
  }

  // ---------- other players: their homes, their doors, their answers (online.js) ----------
  let online = null, waiting = null, pdoors = new Map();
  const playersHere = (estate) => (online?.players() || []).filter((p) => p.home && p.home.endsWith(estate));
  function syncPlayerDoors() {
    const live = new Map((online?.players() || []).filter((p) => p.home).map((p) => [p.id, p]));
    pdoors.forEach((it, pid) => { if (!live.has(pid)) { const k = props.interact.indexOf(it); if (k >= 0) props.interact.splice(k, 1); pdoors.delete(pid); } });
    live.forEach((p, pid) => {
      const h = (world.addresses || []).find((a) => a.addr === p.home); if (!h?.door) return;
      let it = pdoors.get(pid);
      if (!it) { it = { id: `pknock:${pid}`, x: h.door.x, z: h.door.z, r: 1.6, door: h.door }; props.interact.push(it); pdoors.set(pid, it); }
      it.label = `Knock on ${p.name}'s door`;
    });
  }
  function knockPlayer(pid) {
    const p = (online?.players() || []).find((q) => q.id === pid), it = pdoors.get(pid); if (!p || !it) return false;
    sfx('knock'); waiting = { id: pid, kind: 'door', name: p.name, door: it.door, look: p.look };
    online.knock(pid, 'door'); toast(`You knock. Waiting for ${p.name}...`, 3000);
    return true;
  }
  // someone knocks on your door, or rings you from your estate's gate
  const ask = document.createElement('div'); ask.id = 'lk-ask'; document.body.appendChild(ask);
  const askCss = document.createElement('style'); askCss.textContent = `#lk-ask { position: fixed; right: 16px; top: 84px; z-index: 37; display: none; width: min(340px, calc(100vw - 32px)); padding: 16px 18px; border-radius: 22px; background: ${C.paper}; color: ${C.ink}; font: 700 15px/1.4 ${FONT}; box-shadow: 0 5px 0 rgba(59,42,32,.22), 0 20px 50px rgba(10,14,30,.3); }
    #lk-ask.on { display: block; } #lk-ask .row { display: flex; gap: 8px; margin-top: 12px; } #lk-ask button { flex: 1; border: 0; border-radius: 999px; padding: 10px; font: 800 14px/1 ${FONT}; cursor: pointer; background: #eadfc6; color: ${C.ink}; } #lk-ask button.y { background: ${C.teal}; color: #fff; }`;
  document.head.appendChild(askCss);
  function knocked(p) {
    sfx('knock');
    ask.innerHTML = `${esc(p.name)} is ${p.knock.kind === 'gate' ? 'at the gate of your estate, asking to visit you' : 'knocking at your door'}. Let them in?<div class="row"><button class="n">Not now</button><button class="y">Let them in</button></div>`;
    ask.classList.add('on');
    const reply = (ok) => { online?.answer(p.id, ok, p.knock.kind); ask.classList.remove('on'); toast(ok ? `You let ${p.name} in.` : `You told ${p.name} not now.`, 2200); };
    ask.querySelector('.y').onclick = () => reply(true); ask.querySelector('.n').onclick = () => reply(false);
    clearTimeout(knocked.t); knocked.t = setTimeout(() => ask.classList.remove('on'), 30000);
  }
  function answered(p) {
    if (!waiting || waiting.id !== p.id) return;
    const w = waiting; waiting = null;
    if (!p.answer.ok) { toast(`${w.name} can't have visitors right now.`, 3000); if (at) render(`${w.name} says not now.`); return; }
    if (w.kind === 'gate') {
      const c = passes.addCard({ kind: 'visitor', estate: w.estate, gate: w.gate, host: w.name, until: Date.now() + VISIT_DAYS * DAY });
      sfx('arrive'); if (at) render(`${w.name} says let you in. Your visitor pass is good until ${when(c.until)}.`); else toast(`${w.name} let you in: visitor pass in your bag.`, 3200);
      return;
    }
    // at their door: they open it
    toast(`${w.name} opens the door: come in!`, 2600);
    enterPlayerHome?.({ first: w.name, name: w.name, color: w.look?.color || '#e2b13c', style: w.look?.style || 'jacket', kids: [], pidgin: false, dream: 'build something people love', door: w.door });
  }
  let syncT = 0;
  const baseUpdate = update;
  function update2(dt, player, indoors) { syncT -= dt; if (syncT <= 0 && online) { syncT = 1; syncPlayerDoors(); } return baseUpdate(dt, player, indoors); }

  function dispose() { group.removeFromParent(); panel.remove(); style.remove(); ask.remove(); askCss.remove(); }
  return { open, close, update: update2, enterHome, knocked, answered, knockPlayer, setOnline: (o) => { online = o; }, get isOpen() { return panel.classList.contains('on'); }, estates, dispose };
}
