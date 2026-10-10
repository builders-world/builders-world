import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAvatarModel } from '../onboarding/avatar.js';
import { dress, lookFor } from './style.js';
import { C, FONT } from './uikit.js';
import { sfx } from './audio.js';
import { walletEngine, effortsMark, fmt } from './wallet.js';
import { cityFor } from './cardart.js';
import { AIRPORTS, ECOSYSTEM, proofOfFunds, fare, entryRule, canTravel, flightMinutes, passportNumber, PASSPORT_FEE, ETA_FEE } from './travelrules.js';

// Papers (world bible 6.8): the Immigration Centre where you get a passport (a form, your photo and
// fingerprints, a fee) and the electronic travel authorisations some countries ask for, and the board that
// tells you, for every city, what you would need to fly there from here. The airport (airport.js) reads the
// same papers at check-in and at passport control.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const DEMONYM = { Nigeria: 'Nigerian', Ghana: 'Ghanaian', Kenya: 'Kenyan' };
const esc = (t) => String(t ?? '').replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));
function tex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }

// ---------- who you are, on paper ----------
export function papers(passes, here) {
  const cards = passes?.cards?.() || [];
  const res = cards.filter((c) => c.kind === 'resident').sort((a, b) => a.issued - b.issued)[0];
  const homeCity = res ? cityFor(res.district).city : here;
  const nationality = AIRPORTS[homeCity]?.country || 'Nigeria';
  const passport = cards.find((c) => c.kind === 'passport' && c.until > Date.now()) || null;
  const etas = cards.filter((c) => c.kind === 'eta' && c.until > Date.now()).map((c) => c.country);
  return { nationality, homeCity, passport, etas, id: !!res || !!cards.find((c) => c.kind === 'tenant'), cards };
}
export function travelStatus(passes, from, to) {
  const P = papers(passes, from);
  return canTravel(from, to, { nationality: P.nationality, balance: walletEngine().balance(), passport: P.passport?.no || null, etas: P.etas, id: P.id });
}

// ---------- the dialogs ----------
const CSS = `
#lk-imm { position: fixed; inset: 0; z-index: 36; display: none; place-items: center; background: rgba(20,16,12,.45); font-family: ${FONT}; color: ${C.ink}; }
#lk-imm.on { display: grid; }
#lk-imm .box { width: min(520px, calc(100vw - 32px)); max-height: calc(100vh - 40px); overflow-y: auto; box-sizing: border-box; padding: 22px 22px 18px; border-radius: 26px; background: ${C.paper}; box-shadow: 0 6px 0 rgba(59,42,32,.25), 0 30px 70px rgba(10,14,30,.35); }
#lk-imm .box.wide { width: min(760px, calc(100vw - 32px)); }
#lk-imm h3 { margin: 0; font: 800 23px/1.1 ${FONT}; } #lk-imm .sub { color: ${C.ink2}; margin: 6px 0 14px; font: 600 14px/1.45 ${FONT}; }
#lk-imm label { display: block; margin: 12px 0 6px; font: 800 12px/1 ${FONT}; letter-spacing: .08em; text-transform: uppercase; color: ${C.ink2}; }
#lk-imm input[type=text] { width: 100%; box-sizing: border-box; border: 2px solid #e3d4b4; border-radius: 14px; padding: 10px 14px; background: #fffaf0; color: ${C.ink}; font: 700 16px/1 ${FONT}; }
#lk-imm .fixed { padding: 10px 14px; border-radius: 14px; background: ${C.paper2}; font: 700 15px/1.2 ${FONT}; }
#lk-imm .err { color: #c0392b; font: 700 13.5px/1.3 ${FONT}; min-height: 18px; margin-top: 10px; }
#lk-imm .row { display: flex; gap: 8px; margin-top: 10px; } #lk-imm .row button { flex: 1 1 0; border: 0; border-radius: 999px; padding: 12px; font: 800 15px/1 ${FONT}; cursor: pointer; }
#lk-imm .go { background: ${C.teal}; color: #fff; } #lk-imm .x { background: #eadfc6; color: ${C.ink}; }
#lk-imm .bio { display: grid; grid-template-columns: 120px 1fr; gap: 16px; align-items: center; margin: 8px 0; }
#lk-imm .cam { width: 120px; height: 140px; border-radius: 16px; background: #23303a; display: grid; place-items: center; position: relative; overflow: hidden; }
#lk-imm .cam::after { content: ''; position: absolute; inset: 0; background: #fff; opacity: 0; animation: lki-flash 1.4s ease .3s both; }
@keyframes lki-flash { 0%, 100% { opacity: 0; } 12% { opacity: .9; } }
#lk-imm .prints { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
#lk-imm .prints i { aspect-ratio: .75; border-radius: 40% 40% 30% 30%; background: repeating-radial-gradient(circle at 50% 70%, #c9b89a 0 2px, #f4ead2 2px 5px); opacity: .25; animation: lki-print .5s ease both; }
@keyframes lki-print { to { opacity: 1; } }
#lk-imm table { width: 100%; border-collapse: collapse; font: 600 13.5px/1.35 ${FONT}; }
#lk-imm th { text-align: left; font: 800 11.5px/1 ${FONT}; letter-spacing: .06em; text-transform: uppercase; color: ${C.ink2}; padding: 6px 8px; }
#lk-imm td { padding: 8px; border-top: 2px dashed #e3d4b4; vertical-align: top; } #lk-imm td b { font: 800 14.5px/1.2 ${FONT}; } #lk-imm td small { display: block; color: ${C.ink2}; font: 600 12px/1.3 ${FONT}; }
#lk-imm .t-ok, #lk-imm .ok { color: #2f8a4f; font-weight: 800; } #lk-imm .t-no { color: #b5523b; }
#lk-imm .sub svg, #lk-imm td svg, #lk-imm .row svg { display: inline-block; vertical-align: -2px; }
#lk-imm .ctry { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; margin-top: 8px; border-radius: 14px; background: #fffaf0; border: 2px solid #ecdfc2; font: 700 14.5px/1.2 ${FONT}; }
#lk-imm .ctry button { border: 0; border-radius: 999px; padding: 8px 14px; background: ${C.teal}; color: #fff; font: 800 13px/1 ${FONT}; cursor: pointer; }
`;
let dlg = null;
function dialog() {
  if (dlg) return dlg;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  dlg = document.createElement('div'); dlg.id = 'lk-imm'; dlg.setAttribute('role', 'dialog'); document.body.appendChild(dlg);
  dlg.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') closeDialog(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(); });
  return dlg;
}
export function closeDialog() { dlg?.classList.remove('on'); }
export const dialogOpen = () => !!dlg?.classList.contains('on');

// the passport desk: a form, then your photo and fingerprints, then the passport
export function openPassportDesk({ passes, here, place, toast, myName }) {
  const d = dialog(), P = papers(passes, here);
  const show = (html) => { d.innerHTML = `<div class="box">${html}</div>`; d.classList.add('on'); d.querySelector('.x')?.addEventListener('click', closeDialog); setTimeout(() => d.querySelector('input, .go')?.focus(), 30); };
  if (P.passport) {
    show(`<h3>You have a passport</h3><div class="sub">${esc(P.nationality)} passport ${esc(P.passport.no)}, valid until ${new Date(P.passport.until).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}. It is in your bag (I, Cards).</div>${passes.cardHTML(P.passport)}<div class="row"><button class="x">Thanks</button></div>`);
    return;
  }
  const form = (err = '') => {
    show(`<h3>Apply for a passport</h3><div class="sub">${esc(place)}. A ${esc(P.nationality)} passport lets you fly abroad. It takes a minute: the form, your photo and fingerprints, and a fee of ${effortsMark(13)}${fmt(PASSPORT_FEE)}.</div>
      <label for="lki-name">Full name</label><input id="lki-name" type="text" maxlength="30" value="${esc(myName() || '')}" placeholder="As on your resident card">
      <label>Nationality</label><div class="fixed">${esc(P.nationality)} <small style="color:${C.ink2}">· from your ${esc(P.homeCity)} resident card</small></div>
      <div class="err">${esc(err)}</div>
      <div class="row"><button class="x">Not now</button><button class="go">Pay ${effortsMark(14, '#fff')}${fmt(PASSPORT_FEE)} · take my photo</button></div>`);
    const nm = d.querySelector('#lki-name');
    d.querySelector('.go').onclick = () => {
      const name = nm.value.trim();
      if (name.length < 3) return form('Write your full name, as it should appear.');
      if (!walletEngine().spend(PASSPORT_FEE, `${place}: passport`)) return form(`The fee is ${fmt(PASSPORT_FEE)} Efforts. Push a commit or two and come back.`);
      sfx('interact');
      show(`<h3>Biometrics</h3><div class="sub">Look at the camera. Then each finger on the glass.</div>
        <div class="bio"><div class="cam"><svg width="70" height="84" viewBox="0 0 70 84"><circle cx="35" cy="30" r="20" fill="#c98f62"/><path d="M6 84c4-22 16-30 29-30s25 8 29 30z" fill="${C.teal}"/></svg></div>
        <div class="prints">${[0, 1, 2, 3].map((i) => `<i style="animation-delay:${0.9 + i * 0.35}s"></i>`).join('')}</div></div>
        <div class="sub" style="margin:0">Capturing...</div>`);
      setTimeout(() => {
        const c = passes.addCard({ kind: 'passport', no: passportNumber(P.nationality, Math.random()), name, nationality: P.nationality, until: Date.now() + 10 * 365 * 86400000, stamps: [] });
        sfx('arrive'); passes.addRep?.(1, 'papers in order');
        show(`<h3>Your passport is ready</h3><div class="sub">It is in your bag (I, Cards). Take it to the airport: domestic flights need any ID, ECOWAS countries your passport, and others an electronic travel authorisation from counter 2.</div>${passes.cardHTML(c)}<div class="row"><button class="x">Thank you</button></div>`);
        toast?.('Passport issued. It is in your bag.', 2600);
      }, 2700);
    };
  };
  form();
}

// counter 2: electronic travel authorisations for the countries that ask for one
export function openEtaDesk({ passes, here, place, toast }) {
  const d = dialog(), P = papers(passes, here);
  const countries = [...new Set(Object.values(AIRPORTS).map((a) => a.country))].filter((c) => entryRule(P.nationality, Object.keys(AIRPORTS).find((k) => AIRPORTS[k].country === c)).kind === 'eta');
  const render = (msg = '') => {
    const P2 = papers(passes, here);
    d.innerHTML = `<div class="box"><h3>Travel authorisations</h3><div class="sub">Some countries ask ${esc(P.nationality)} travellers for an electronic travel authorisation before they fly. ${effortsMark(13)}${fmt(ETA_FEE)} each, valid a year. You need a passport first.</div>
      ${countries.map((c) => `<div class="ctry"><span>${esc(c)}</span>${P2.etas.includes(c) ? '<span class="ok">Approved ✓</span>' : `<button data-c="${esc(c)}">Apply · ${fmt(ETA_FEE)}</button>`}</div>`).join('') || '<p class="sub">None needed: every city here is open to you with your passport or ID.</p>'}
      <div class="err">${esc(msg)}</div><div class="row"><button class="x">Done</button></div></div>`;
    d.classList.add('on');
    d.querySelector('.x').onclick = closeDialog;
    d.querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => {
      if (!papers(passes, here).passport) return render('Get your passport at counter 1 first.');
      if (!walletEngine().spend(ETA_FEE, `${place}: ${b.dataset.c} travel authorisation`)) return render(`It is ${fmt(ETA_FEE)} Efforts.`);
      passes.addCard({ kind: 'eta', estate: b.dataset.c, country: b.dataset.c, no: `ETA-${Math.floor(Math.random() * 9e5 + 1e5)}`, until: Date.now() + 365 * 86400000 });
      sfx('arrive'); toast?.(`${b.dataset.c} travel authorisation approved.`, 2400); render();
    }; });
  };
  render();
}

// the board: for every city, what flying there from here takes, and whether you have it
export function openTravelBoard({ passes, here }) {
  const d = dialog(), P = papers(passes, here), bal = walletEngine().balance();
  const rows = Object.keys(AIRPORTS).filter((c) => c !== here).map((c) => {
    const s = travelStatus(passes, here, c), A = AIRPORTS[c];
    return `<tr><td><b>${esc(c)}</b><small>${A.code} · ${esc(A.name)}</small><small>${esc(ECOSYSTEM[c]?.note || '')}</small></td>
      <td>${esc(s.rule.label || '')}</td><td>${effortsMark(11)}${fmt(s.fare)}<small>${flightMinutes(here, c)} min</small></td><td>${effortsMark(11)}${fmt(proofOfFunds(c))}</td>
      <td>${s.ok ? '<span class="t-ok">Ready ✓</span>' : `<span class="t-no">${s.needs.map(esc).join('<br>')}</span>`}</td></tr>`;
  }).join('');
  d.innerHTML = `<div class="box wide"><h3>Where you can fly from ${esc(here)}</h3><div class="sub">You are ${esc(DEMONYM[P.nationality] || P.nationality)}, with ${effortsMark(13)}${fmt(bal)}. Every city asks for proof of funds: Efforts you still hold after the fare, more where the tech scene is bigger. ${P.passport ? `Passport ${esc(P.passport.no)}.` : 'No passport yet: counter 1.'}</div>
    <table><tr><th>City</th><th>Entry</th><th>Fare</th><th>Proof of funds</th><th>You</th></tr>${rows}</table><div class="row"><button class="x">Close</button></div></div>`;
  d.classList.add('on'); d.querySelector('.x').onclick = closeDialog;
}

// ---------- the Immigration Centre, inside (the interior contract, interior.js) ----------
export function buildImmigration({ ORIGIN, scene, name, country = 'Nigeria' }) {
  const W = 22, D = 16, H = 3.8;
  const g = new THREE.Group(); g.position.copy(ORIGIN); g.visible = false;
  const mat = (c, r = 0.7, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const M = { floor: mat(0xd9d2c3, 0.4), wall: mat(0xeef0e8, 0.85), green: mat(0x2f7d4f, 0.6), wood: mat(0xc9a27a, 0.6), dark: mat(0x1d2028, 0.5), metal: mat(0xb8bec4, 0.35, 0.5), chair: mat(0x3f5a6a, 0.9), glass: new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.05, transparent: true, opacity: 0.3 }), sky: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.75, 1.0) }), red: mat(0xc0392b, 0.6), warm: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.4, 0.7) }) };
  const parts = new Map(); const add = (geo, m) => { if (!parts.has(m)) parts.set(m, []); parts.get(m).push(geo); };
  const colliders = [], block = (x, z, w, d) => colliders.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  add(box(W, 0.1, D, 0, -0.05, 0), M.floor); add(box(W, 0.1, D, 0, H + 0.05, 0), M.wall);
  [[0, -D / 2, W, 0.2], [-W / 2, 0, 0.2, D], [W / 2, 0, 0.2, D]].forEach(([x, z, w, d]) => { add(box(w, H, d, x, H / 2, z), M.wall); block(x, z, Math.max(w, 0.4), Math.max(d, 0.4)); });
  [[-6.5, D / 2, 9], [6.5, D / 2, 9]].forEach(([x, z, w]) => { add(box(w, H, 0.2, x, H / 2, z), M.wall); block(x, z, w, 0.4); });
  const door = { x: 0, z: D / 2 - 1.2 };
  add(box(W, 0.4, 0.22, 0, 0.2, -D / 2 + 0.12), M.green);
  const window = new THREE.Mesh(box(6, 1.6, 0.05, 6.5, 1.8, D / 2 - 0.12), M.sky); g.add(window);
  // three counters behind glass, numbered, an officer at each
  const people = [];
  [-6, 0, 6].forEach((x, i) => {
    add(box(4.6, 1.1, 0.8, x, 0.55, -4.6), M.wood); add(box(4.7, 0.06, 0.9, x, 1.12, -4.6), M.green); block(x, -4.6, 4.6, 0.9);
    add(box(4.4, 1.3, 0.04, x, 1.8, -4.65), M.glass);
    const nt = tex(256, 160, (c, w, h) => { c.fillStyle = '#2f7d4f'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 96px sans-serif'; c.textAlign = 'center'; c.fillText(String(i + 1), w / 2, 112); });
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.38).translate(x - 1.6, 2.55, -4.58), new THREE.MeshBasicMaterial({ map: nt })));
    const lab = tex(512, 96, (c, w, h) => { c.fillStyle = '#1d2028'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2b33d'; c.font = '700 40px sans-serif'; c.textAlign = 'center'; c.fillText(['Passports', 'Travel authorisations', 'Enquiries'][i], w / 2, 62); });
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45).translate(x + 0.3, 2.55, -4.6), new THREE.MeshBasicMaterial({ map: lab })));
    const off = createAvatarModel({ color: '#2f7d4f', style: 'jacket' }); dress(off.root, { ...lookFor(`officer-${i}`, { fem: i === 1, tier: 1 }), top: 'jacket', topColor: '#2f7d4f' }); off.root.position.set(x, 0, -5.6); g.add(off.root); people.push(off);
  });
  // the queue: posts and belts in a zigzag
  for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) add(new THREE.CylinderGeometry(0.05, 0.07, 1.0, 8).translate(-3 + k * 1.5, 0.5, -1.4 + r * 1.3), M.metal);
  for (let r = 0; r < 3; r++) add(box(6.0, 0.06, 0.02, -0.0, 0.92, -1.4 + r * 1.3), M.red);
  // waiting chairs, the ticket machine, the biometrics booth, the flag
  for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) { add(mergeGeometries([box(0.5, 0.06, 0.5, -9.6 + r * 1.4, 0.45, 1 + k * 0.6), box(0.06, 0.5, 0.5, -9.85 + r * 1.4, 0.7, 1 + k * 0.6)]), M.chair); }
  block(-9.0, 2.5, 2.4, 3.8);
  add(box(0.6, 1.5, 0.5, 2.6, 0.75, D / 2 - 2.2), M.dark); g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3).translate(2.6, 1.2, D / 2 - 1.94), new THREE.MeshBasicMaterial({ color: 0x8fd6ff }))); block(2.6, D / 2 - 2.2, 0.6, 0.5);
  add(mergeGeometries([box(1.6, 2.3, 0.08, 9.2, 1.15, -1.5), box(0.08, 2.3, 1.6, 8.4, 1.15, -0.7)]), M.green); add(box(0.4, 0.3, 0.3, 9.4, 1.6, -1.3), M.dark); add(box(0.5, 0.05, 0.4, 9.4, 1.0, -0.7), M.glass); block(9.2, -1.0, 1.6, 1.6);
  const flagCols = { Nigeria: ['#008751', '#ffffff', '#008751'], Ghana: ['#ce1126', '#fcd116', '#006b3f'], Kenya: ['#000000', '#bb0000', '#006600'] }[country] || ['#008751', '#ffffff', '#008751'];
  const flag = tex(300, 200, (c, w, h) => { const vertical = country === 'Nigeria'; flagCols.forEach((col, i) => { c.fillStyle = col; if (vertical) c.fillRect(i * w / 3, 0, w / 3 + 1, h); else c.fillRect(0, i * h / 3, w, h / 3 + 1); }); if (country === 'Ghana') { c.fillStyle = '#000'; c.font = '60px sans-serif'; c.textAlign = 'center'; c.fillText('★', w / 2, h / 2 + 20); } });
  add(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 6).translate(-10.4, 1.3, -6.8), M.metal); g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6).translate(-9.93, 2.25, -6.8), new THREE.MeshStandardMaterial({ map: flag, side: THREE.DoubleSide })));
  // the requirements board on the left wall
  const board = tex(800, 480, (c, w, h) => { c.fillStyle = '#1d2028'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2b33d'; c.font = '800 40px sans-serif'; c.fillText('WHERE YOU CAN FLY', 30, 60); c.fillStyle = '#e6edf3'; c.font = '26px sans-serif'; Object.entries(AIRPORTS).forEach(([city, a], i) => { c.fillText(`${a.code}  ${city}`, 30, 120 + i * 56); c.fillStyle = '#8fd6a0'; c.fillText(`proof ${proofOfFunds(city).toLocaleString('en-US')}`, 470, 120 + i * 56); c.fillStyle = '#e6edf3'; }); });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.0).rotateY(Math.PI / 2).translate(-W / 2 + 0.12, 2.0, -2.5), new THREE.MeshBasicMaterial({ map: board })));
  const sign = tex(1024, 140, (c, w, h) => { c.fillStyle = '#2f7d4f'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 64px sans-serif'; c.textAlign = 'center'; c.fillText(name.toUpperCase(), w / 2, 92); });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(8, 1.0).translate(0, 3.25, -D / 2 + 0.13), new THREE.MeshBasicMaterial({ map: sign })));
  parts.forEach((list, m) => g.add(new THREE.Mesh(mergeGeometries(list.map((q) => (q.index ? q.toNonIndexed() : q))), m)));
  [[-6, -2], [6, -2], [0, 3]].forEach(([x, z]) => { const l = new THREE.PointLight(0xfff0d8, 16, 14, 1.6); l.position.set(x, H - 0.5, z); g.add(l); });
  g.add(new THREE.HemisphereLight(0xffffff, 0x4a4a40, 1.0));
  const sun = new THREE.DirectionalLight(0xfff1dc, 0); sun.position.set(4, 6, 10); g.add(sun);
  scene.add(g);
  const interact = [
    { id: 'in:exit', label: `Leave ${name}`, x: door.x, z: door.z + 0.6, r: 2.2 },
    { id: 'in:ticket', label: 'Take a queue number', x: 2.6, z: D / 2 - 3.0, r: 1.4 },
    { id: 'in:passport', label: 'Counter 1: passports', x: -6, z: -3.6, r: 1.8 },
    { id: 'in:eta', label: 'Counter 2: travel authorisations', x: 0, z: -3.6, r: 1.8 },
    { id: 'in:ask', label: 'Counter 3: enquiries', x: 6, z: -3.6, r: 1.8 },
    { id: 'in:fly', label: 'Read the board: where you can fly', x: -W / 2 + 1.6, z: -2.5, r: 2.0 },
    { id: 'in:bio', label: 'The biometrics booth', x: 8.6, z: 0.4, r: 1.4 },
  ];
  return { key: 'immigration', group: g, colliders, interact, door, window, sun, people, desks: [], W, D, H };
}
