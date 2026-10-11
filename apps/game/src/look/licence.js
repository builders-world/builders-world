import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAvatarModel } from '../onboarding/avatar.js';
import { dress, lookFor } from './style.js';
import { C, FONT } from './uikit.js';
import { sfx } from './audio.js';
import { walletEngine, effortsMark, fmt } from './wallet.js';
import { cityInfo } from './cityinfo.js';

// The driver's licence (Elvis's list, 10 October 2026: "on that card you can also have passport, your driver's
// license"; the licence gates driving). Every city has its licensing office, run by the country's real authority:
// the FRSC in Nigeria, the NTSA in Kenya, the DVLA in Ghana. Getting one is what it is in life, shortened: the form
// and the fee, an eye test, a theory test on this city's own road rules (the side you keep to, who gives way at a
// roundabout, the school zone limit, what flashing red lamps at a level crossing mean), your photo, the card. With it
// in your bag, a hired taxi, danfo or keke lets you take the wheel (rides.js); without it you ride as a passenger.

import { LICENCE_FEE, YEARS, PASS_MARK, authorityFor, theoryTest, mark, licenceNumber, shuffle } from './licencerules.js';

export { LICENCE_FEE, AUTHORITY, authorityFor, licenceOfficeName, theoryTest, mark, licenceNumber } from './licencerules.js';
/** A valid licence in the bag, or null. */
export const licenceOf = (passes) => (passes?.cards?.() || []).find((c) => c.kind === 'licence' && c.until > Date.now()) || null;
const esc = (t) => String(t ?? '').replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));

// ---------- the card ----------
export function licenceCardHTML(c, holder = '') {
  const A = authorityFor(c.country);
  const until = new Date(c.until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const car = `<svg viewBox="0 0 64 40" style="position:absolute;right:18px;top:18px;width:64px;height:40px" aria-hidden="true"><path d="M6 28l5-12c1-3 3-4 6-4h30c3 0 5 1 6 4l5 12v6H6z" fill="${A.ink}" opacity=".85"/><rect x="16" y="15" width="13" height="8" rx="2" fill="#fff" opacity=".8"/><rect x="33" y="15" width="13" height="8" rx="2" fill="#fff" opacity=".8"/><circle cx="17" cy="34" r="5" fill="${A.ink}"/><circle cx="47" cy="34" r="5" fill="${A.ink}"/></svg>`;
  return `<div class="bw-card licence ${c.until < Date.now() ? 'expired' : ''}" style="--c1:${A.c1};--c2:${A.c2};--ink:${A.ink}">${car}
    <div class="org">${esc(A.org)}</div><div class="dist">${esc(A.title)} · ${esc(c.country)}</div><div class="kind">CLASS ${esc(c.cls || 'B')} · CARS</div>
    <div class="nm">${esc(holder || c.name)}</div><div class="role">Issued in ${esc(c.city || '')}</div><div class="no">${esc(c.no)} · valid to ${until}</div></div>`;
}

// ---------- the desk ----------
const CSS = `
#lk-lic { position: fixed; inset: 0; z-index: 36; display: none; place-items: center; background: rgba(20,16,12,.45); font-family: ${FONT}; color: ${C.ink}; }
#lk-lic.on { display: grid; }
#lk-lic .box { width: min(520px, calc(100vw - 32px)); max-height: calc(100vh - 40px); overflow-y: auto; box-sizing: border-box; padding: 22px 22px 18px; border-radius: 26px; background: ${C.paper}; box-shadow: 0 6px 0 rgba(59,42,32,.25), 0 30px 70px rgba(10,14,30,.35); }
#lk-lic h3 { margin: 0; font: 800 23px/1.1 ${FONT}; } #lk-lic .sub { color: ${C.ink2}; margin: 6px 0 14px; font: 600 14px/1.45 ${FONT}; }
#lk-lic .sub svg { display: inline-block; vertical-align: -2px; }
#lk-lic label { display: block; margin: 12px 0 6px; font: 800 12px/1 ${FONT}; letter-spacing: .08em; text-transform: uppercase; color: ${C.ink2}; }
#lk-lic input[type=text] { width: 100%; box-sizing: border-box; border: 2px solid #e3d4b4; border-radius: 14px; padding: 10px 14px; background: #fffaf0; color: ${C.ink}; font: 700 16px/1 ${FONT}; }
#lk-lic .err { color: #c0392b; font: 700 13.5px/1.3 ${FONT}; min-height: 18px; margin-top: 10px; }
#lk-lic .row { display: flex; gap: 8px; margin-top: 10px; } #lk-lic .row button { flex: 1 1 0; border: 0; border-radius: 999px; padding: 12px; font: 800 15px/1 ${FONT}; cursor: pointer; }
#lk-lic .row svg { display: inline-block; vertical-align: -2px; }
#lk-lic .go { background: ${C.teal}; color: #fff; } #lk-lic .x { background: #eadfc6; color: ${C.ink}; }
#lk-lic .chart { margin: 4px 0 12px; padding: 14px; border-radius: 16px; background: #fff; text-align: center; font: 800 18px/1.5 ui-monospace, Menlo, monospace; letter-spacing: .3em; color: #1d1a16; }
#lk-lic .chart .r1 { font-size: 34px; } #lk-lic .chart .r2 { font-size: 24px; } #lk-lic .chart .r3 { font-size: 16px; } #lk-lic .chart .r4 { font-size: 11px; }
#lk-lic .ans { display: grid; gap: 8px; } #lk-lic .ans button { width: 100%; text-align: left; border: 2px solid #e3d4b4; border-radius: 14px; padding: 11px 14px; background: #fffaf0; color: ${C.ink}; font: 700 14.5px/1.3 ${FONT}; cursor: pointer; }
#lk-lic .ans button:hover, #lk-lic .ans button:focus-visible { border-color: ${C.teal}; outline: none; }
#lk-lic .ans button.on { border-color: ${C.teal}; background: #e2f3ef; }
#lk-lic .prog { display: flex; gap: 6px; margin: 0 0 12px; } #lk-lic .prog i { flex: 1; height: 6px; border-radius: 3px; background: #e3d4b4; } #lk-lic .prog i.d { background: ${C.teal}; }
#lk-lic .q { font: 800 17px/1.3 ${FONT}; margin-bottom: 12px; }
#lk-lic .cam { width: 120px; height: 140px; margin: 6px auto 10px; border-radius: 16px; background: #23303a; display: grid; place-items: center; position: relative; overflow: hidden; }
#lk-lic .cam::after { content: ''; position: absolute; inset: 0; background: #fff; opacity: 0; animation: lkl-flash 1.4s ease .3s both; }
@keyframes lkl-flash { 0%, 100% { opacity: 0; } 12% { opacity: .9; } }
`;
let dlg = null;
function dialog() {
  if (dlg) return dlg;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  dlg = document.createElement('div'); dlg.id = 'lk-lic'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-label', 'Driver\'s licence'); document.body.appendChild(dlg);
  dlg.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') closeLicenceDesk(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeLicenceDesk(); });
  return dlg;
}
export function closeLicenceDesk() { dlg?.classList.remove('on'); if (dlg?.contains(document.activeElement)) document.activeElement.blur(); }
export const licenceDeskOpen = () => !!dlg?.classList.contains('on');

// eye test: read the smallest line you can; one of the offered lines is the chart's
const LETTERS = 'EFPTOZLDCHNRUV';
function chartRows(rnd) { return [1, 2, 3, 5].map((n) => Array.from({ length: n + 1 }, () => LETTERS[Math.floor(rnd() * LETTERS.length)]).join('')); }

/** The licence counter: form and fee, eye test, theory test, photo, card. */
export function openLicenceDesk({ passes, place, toast, myName, rnd = Math.random }) {
  const d = dialog(), info = cityInfo() || {}, A = authorityFor(info.country);
  const show = (html, focus = 'input, .ans button, .go') => {
    d.innerHTML = `<div class="box">${html}</div>`; d.classList.add('on');
    d.querySelectorAll('.x').forEach((b) => b.addEventListener('click', closeLicenceDesk));
    setTimeout(() => d.querySelector(focus)?.focus(), 30);
  };
  const have = licenceOf(passes);
  if (have) { show(`<h3>You have a licence</h3><div class="sub">${esc(A.title)} ${esc(have.no)}. It is in your bag (I, Cards). Hire a taxi, danfo or keke and choose Drive yourself.</div>${licenceCardHTML(have, myName())}<div class="row"><button class="x">Thanks</button></div>`, '.x'); return; }
  let name = '';
  const form = (err = '') => {
    show(`<h3>Apply for a driver's licence</h3><div class="sub">${esc(place)}, ${esc(A.full)}. A licence lets you drive the vehicles you hire. Fill in the form and pay ${effortsMark(13)}${fmt(LICENCE_FEE)}; then an eye test and a short theory test on ${esc(info.city || 'the city')}'s road rules. Pass with ${PASS_MARK} of 5.</div>
      <label for="lkl-name">Full name</label><input id="lkl-name" type="text" maxlength="30" value="${esc(myName() || '')}" placeholder="As on your resident card">
      <div class="err">${esc(err)}</div>
      <div class="row"><button class="x">Not now</button><button class="go">Pay ${effortsMark(14, '#fff')}${fmt(LICENCE_FEE)} · start</button></div>`);
    d.querySelector('.go').onclick = () => {
      name = d.querySelector('#lkl-name').value.trim();
      if (name.length < 3) return form('Write your full name, as it should appear on the licence.');
      if (!walletEngine().spend(LICENCE_FEE, `${place}: driver's licence`)) return form(`The fee is ${fmt(LICENCE_FEE)} Efforts. Push a commit or two and come back.`);
      sfx('interact'); eye();
    };
  };
  // the eye test: the chart, then which line is the fourth row
  const eye = (tries = 0) => {
    const rows = chartRows(rnd), want = rows[2];
    const choices = shuffle([want, ...chartRows(rnd).slice(2, 3), chartRows(rnd)[2]].filter((v, i, a) => a.indexOf(v) === i), rnd);
    show(`<h3>Eye test</h3><div class="sub">Cover one eye and read the chart on the wall. Which is the third line?</div>
      <div class="chart">${rows.map((r, i) => `<div class="r${i + 1}">${r}</div>`).join('')}</div>
      <div class="ans">${choices.map((c, i) => `<button data-i="${i}">${c.split('').join(' ')}</button>`).join('')}</div>${tries ? '<div class="err">Not quite. Take your time and look again.</div>' : ''}`);
    d.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => (choices[+b.dataset.i] === want ? theory() : eye(tries + 1)); });
  };
  // the theory test: five questions, one at a time
  const theory = () => {
    const test = theoryTest(info, rnd), answers = [];
    const ask = (k) => {
      const t = test[k];
      show(`<h3>Theory test</h3><div class="prog">${test.map((_, i) => `<i class="${i < k ? 'd' : ''}"></i>`).join('')}</div>
        <div class="q">${k + 1}. ${esc(t.q)}</div><div class="ans">${t.a.map((a, i) => `<button data-i="${i}">${esc(a)}</button>`).join('')}</div>`);
      d.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => { answers[k] = +b.dataset.i; if (k + 1 < test.length) ask(k + 1); else result(test, answers); }; });
    };
    ask(0);
  };
  const result = (test, answers) => {
    const m = mark(test, answers);
    if (!m.pass) {
      const wrong = test.map((t, i) => (answers[i] === t.ok ? null : `<li><b>${esc(t.q)}</b><br>${esc(t.a[t.ok])}</li>`)).filter(Boolean).join('');
      show(`<h3>${m.right} of ${m.of}: not this time</h3><div class="sub">You need ${PASS_MARK}. Here is what to remember. You can sit it again now, free: the fee covers a retake.</div><ul class="sub" style="padding-left:18px">${wrong}</ul>
        <div class="row"><button class="x">Later</button><button class="go">Sit it again</button></div>`, '.go');
      d.querySelector('.go').onclick = theory;
      return;
    }
    sfx('interact');
    show(`<h3>${m.right} of ${m.of}: passed</h3><div class="sub">Look at the camera for your licence photo.</div>
      <div class="cam"><svg width="70" height="84" viewBox="0 0 70 84"><circle cx="35" cy="30" r="20" fill="#c98f62"/><path d="M6 84c4-22 16-30 29-30s25 8 29 30z" fill="${C.teal}"/></svg></div><div class="sub" style="text-align:center;margin:0">Printing your card...</div>`, '.none');
    setTimeout(() => {
      const c = passes.addCard({ kind: 'licence', no: licenceNumber(info.country, rnd), name, cls: 'B', country: info.country || 'Nigeria', city: info.city || '', until: Date.now() + YEARS * 365 * 86400000 });
      sfx('arrive'); passes.addRep?.(1, 'licensed to drive');
      show(`<h3>Your licence is ready</h3><div class="sub">It is in your bag (I, Cards). Hire a taxi, danfo or keke and choose Drive yourself. Drive on the ${info.drive === 'left' ? 'left' : 'right'}.</div>${licenceCardHTML(c)}<div class="row"><button class="x">Thank you</button></div>`, '.x');
      toast?.('Driver\'s licence issued. It is in your bag.', 2600);
    }, 2200);
  };
  form();
}

// ---------- the licensing office, inside (the interior contract, interior.js) ----------
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
function tex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }

export function buildLicensing({ ORIGIN, scene, name, country = 'Nigeria' }) {
  const W = 18, D = 14, H = 3.6, A = authorityFor(country), accent = `#${A.accent.toString(16).padStart(6, '0')}`;
  const g = new THREE.Group(); g.position.copy(ORIGIN); g.visible = false;
  const mat = (c, r = 0.7, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const M = { floor: mat(0xd6d0c2, 0.45), wall: mat(0xf0efe8, 0.85), band: mat(A.accent, 0.6), wood: mat(0xc9a27a, 0.6), dark: mat(0x1d2028, 0.5), metal: mat(0xb8bec4, 0.35, 0.5), chair: mat(0x3f5a6a, 0.9), screen: new THREE.MeshBasicMaterial({ color: 0x8fd6ff }), sky: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.75, 1.0) }), glass: new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.05, transparent: true, opacity: 0.3 }) };
  const parts = new Map(); const add = (geo, m) => { if (!parts.has(m)) parts.set(m, []); parts.get(m).push(geo); };
  const colliders = [], block = (x, z, w, d) => colliders.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  add(box(W, 0.1, D, 0, -0.05, 0), M.floor); add(box(W, 0.1, D, 0, H + 0.05, 0), M.wall);
  [[0, -D / 2, W, 0.2], [-W / 2, 0, 0.2, D], [W / 2, 0, 0.2, D]].forEach(([x, z, w, d]) => { add(box(w, H, d, x, H / 2, z), M.wall); block(x, z, Math.max(w, 0.4), Math.max(d, 0.4)); });
  [[-5.25, D / 2, 7.5], [5.25, D / 2, 7.5]].forEach(([x, z, w]) => { add(box(w, H, 0.2, x, H / 2, z), M.wall); block(x, z, w, 0.4); });
  const door = { x: 0, z: D / 2 - 1.2 };
  add(box(W, 0.35, 0.22, 0, 0.18, -D / 2 + 0.12), M.band);
  const window = new THREE.Mesh(box(5, 1.5, 0.05, 5.2, 1.8, D / 2 - 0.12), M.sky); g.add(window);
  const people = [];
  // counter 1: licences, an officer behind glass
  add(box(5, 1.1, 0.8, -4, 0.55, -3.8), M.wood); add(box(5.1, 0.06, 0.9, -4, 1.12, -3.8), M.band); add(box(4.8, 1.3, 0.04, -4, 1.8, -3.85), M.glass); block(-4, -3.8, 5, 0.9);
  const off = createAvatarModel({ color: accent, style: 'jacket' }); dress(off.root, { ...lookFor('licence-officer', { tier: 1 }), top: 'jacket', topColor: accent }); off.root.position.set(-4, 0, -4.9); g.add(off.root); people.push(off);
  const lab = (text, w, x, y, z, ry = 0) => { const t = tex(512, 96, (c, cw, ch) => { c.fillStyle = '#1d2028'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#f2b33d'; c.font = '700 40px sans-serif'; c.textAlign = 'center'; c.fillText(text, cw / 2, 62); }); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 512).rotateY(ry).translate(x, y, z), new THREE.MeshBasicMaterial({ map: t })); g.add(m); };
  lab('1  Driver\'s licences', 2.8, -4, 2.6, -3.8);
  // the theory test room: computer booths along the right wall, each with a screen of the questions
  for (let k = 0; k < 3; k++) {
    const z = -4.5 + k * 2.2;
    add(box(1.2, 0.75, 1.6, 7.9, 0.375, z), M.wood); add(box(0.06, 0.45, 0.7, 8.2, 1.0, z), M.dark); g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.38).rotateY(-Math.PI / 2).translate(8.16, 1.0, z), M.screen));
    add(box(0.5, 0.06, 0.5, 7.1, 0.45, z), M.chair); add(box(0.06, 0.5, 0.5, 6.85, 0.7, z), M.chair); block(7.9, z, 1.2, 1.6);
    if (k < 2) add(box(1.4, 1.5, 0.05, 7.9, 0.75, z + 1.1), M.wall);
  }
  lab('2  Theory test', 2.4, W / 2 - 0.13, 2.7, -2.3, -Math.PI / 2);
  // the eye chart on the left wall, a mark on the floor 6 m away
  const chart = tex(256, 360, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.textAlign = 'center'; [['E', 120], ['F P', 70], ['T O Z', 46], ['L P E D', 32], ['P E C F D', 22], ['E D F C Z P', 15]].forEach(([s, px], i) => { c.font = `700 ${px}px sans-serif`; c.fillText(s, w / 2, 110 + i * 48 - (i === 0 ? 0 : 20)); }); });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.05).rotateY(Math.PI / 2).translate(-W / 2 + 0.12, 1.7, 2.2), new THREE.MeshBasicMaterial({ map: chart })));
  add(box(0.5, 0.012, 0.08, -W / 2 + 6, 0.006, 2.2), M.band);
  lab('3  Eye test', 2.0, -W / 2 + 0.13, 2.6, 2.2, Math.PI / 2);
  // road signs on the back wall, the way every licensing office has them
  const signs = tex(900, 260, (c, w, h) => { c.fillStyle = '#f7f3ea'; c.fillRect(0, 0, w, h); const at = (i) => 90 + i * 180;
    c.fillStyle = '#c0392b'; c.beginPath(); for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; c.lineTo(at(0) + Math.cos(a) * 70, 120 + Math.sin(a) * 70); } c.fill(); c.fillStyle = '#fff'; c.font = '800 34px sans-serif'; c.textAlign = 'center'; c.fillText('STOP', at(0), 132);
    c.fillStyle = '#fff'; c.strokeStyle = '#c0392b'; c.lineWidth = 14; c.beginPath(); c.arc(at(1), 120, 62, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = '#111'; c.font = '800 50px sans-serif'; c.fillText('50', at(1), 138);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(at(2), 50); c.lineTo(at(2) + 72, 180); c.lineTo(at(2) - 72, 180); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#111'; c.font = '700 22px sans-serif'; c.fillText('SCHOOL', at(2), 158);
    c.fillStyle = '#2a6fb5'; c.beginPath(); c.arc(at(3), 120, 66, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 10; c.beginPath(); c.arc(at(3), 120, 32, 0.4, Math.PI * 2 - 0.4); c.stroke();
    c.fillStyle = '#fff'; c.strokeStyle = '#c0392b'; c.lineWidth = 12; c.beginPath(); c.moveTo(at(4) - 60, 60); c.lineTo(at(4) + 60, 180); c.moveTo(at(4) + 60, 60); c.lineTo(at(4) - 60, 180); c.stroke();
    c.fillStyle = '#3b2a20'; c.font = '700 20px sans-serif'; ['Stop', 'Limit 50', 'School', 'Roundabout', 'Level crossing'].forEach((s, i) => c.fillText(s, at(i), 240)); });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.3).translate(3.2, 2.2, -D / 2 + 0.13), new THREE.MeshBasicMaterial({ map: signs })));
  // waiting chairs and a queue machine
  for (let r = 0; r < 2; r++) for (let k = 0; k < 5; k++) add(mergeGeometries([box(0.5, 0.06, 0.5, -1.2 + k * 0.6, 0.45, 0.8 + r * 1.3), box(0.5, 0.5, 0.06, -1.2 + k * 0.6, 0.7, 0.55 + r * 1.3)]), M.chair);
  block(0, 1.45, 3.2, 2.6);
  add(box(0.6, 1.5, 0.5, -3.0, 0.75, D / 2 - 1.8), M.dark); block(-3.0, D / 2 - 1.8, 0.6, 0.5);
  const sign = tex(1024, 140, (c, w, h) => { c.fillStyle = accent; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 58px sans-serif'; c.textAlign = 'center'; c.fillText(name.toUpperCase(), w / 2, 90); });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(7, 0.95).translate(-4, 3.2, -D / 2 + 0.13), new THREE.MeshBasicMaterial({ map: sign })));
  parts.forEach((list, m) => g.add(new THREE.Mesh(mergeGeometries(list.map((q) => (q.index ? q.toNonIndexed() : q))), m)));
  [[-4, -2], [5, -2], [0, 3]].forEach(([x, z]) => { const l = new THREE.PointLight(0xfff0d8, 14, 12, 1.6); l.position.set(x, H - 0.5, z); g.add(l); });
  g.add(new THREE.HemisphereLight(0xffffff, 0x4a4a40, 1.0));
  const sun = new THREE.DirectionalLight(0xfff1dc, 0); sun.position.set(4, 6, 10); g.add(sun);
  scene.add(g);
  const interact = [
    { id: 'in:exit', label: `Leave ${name}`, x: door.x, z: door.z + 0.6, r: 2.2 },
    { id: 'in:licence', label: 'Counter 1: apply for a driver\'s licence', x: -4, z: -2.8, r: 1.8 },
    { id: 'in:theory', label: 'Theory test booths', x: 6.6, z: -2.3, r: 1.8 },
    { id: 'in:eyes', label: 'The eye chart', x: -W / 2 + 6, z: 2.2, r: 1.6 },
    { id: 'in:lqueue', label: 'Take a queue number', x: -3.0, z: D / 2 - 2.6, r: 1.4 },
  ];
  return { key: 'licensing', group: g, colliders, interact, door, window, sun, people, desks: [], W, D, H };
}
