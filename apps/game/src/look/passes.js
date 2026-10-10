import { loadProfile } from '../onboarding/state.js';
import { walletEngine, effortsMark, fmt } from './wallet.js';
import { PLACES } from './interior.js';
import { sfx } from './audio.js';
import { C, FONT } from './uikit.js';

// Passes and Wi-Fi (world bible 6.7): a little real-life friction, on purpose. Eko Design Studio is
// for members: you register at the door, pay in Efforts, and a membership card goes in your bag.
// The card has the members' Wi-Fi password on it. Every workplace has its own network, and the
// district has one for its residents (Yaba-Connect, password on your resident card). A laptop that
// is not on a network cannot browse or push. Networks you have joined are remembered.

const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } } };
const DAY = 86400000;
export const PLANS = { day: { name: 'Day pass', days: 1, price: 500 }, month: { name: 'Monthly membership', days: 30, price: 3000 } };
const ROLES = ['Designer', 'Developer', 'Product', 'Founder', 'Student'];

// the networks: one per workplace, and the district's own for residents
export function networksFor(district = 'Yaba') {
  return {
    studio: { ssid: 'Eko-Members', pass: 'ekomembers26', where: 'On your Eko membership card' },
    hub: { ssid: `${district}Hub-Guest`, pass: 'buildtogether', where: `On the notice board at the ${PLACES.hub.name}` },
    loft: { ssid: 'BuildersLoft', pass: 'shiplagos', where: `On the notice board at the ${PLACES.loft.name}` },
    district: { ssid: `${district}-Connect`, pass: `${district.toLowerCase()}-resident`, where: `On your ${district} resident card` },
  };
}
// who needs a card to get in
export const MEMBERS_ONLY = { studio: { card: 'eko', name: () => PLACES.studio.name } };

const CSS = `
#lk-reg { position: fixed; inset: 0; z-index: 36; display: none; place-items: center; background: rgba(20,16,12,.45); font-family: ${FONT}; color: ${C.ink}; }
#lk-reg.on { display: grid; }
#lk-reg svg { display: inline-block; vertical-align: -2px; margin: 0 2px; }
#lk-reg .box { width: min(440px, calc(100vw - 32px)); max-height: calc(100vh - 40px); overflow-y: auto; padding: 22px 22px 18px; border-radius: 26px; background: ${C.paper}; box-shadow: 0 6px 0 rgba(59,42,32,.25), 0 30px 70px rgba(10,14,30,.35); }
#lk-reg h3 { margin: 0; font: 800 23px/1.1 ${FONT}; } #lk-reg .sub { color: ${C.ink2}; margin: 4px 0 14px; font: 600 14px/1.4 ${FONT}; }
#lk-reg label { display: block; margin: 12px 0 6px; font: 800 12px/1 ${FONT}; letter-spacing: .08em; text-transform: uppercase; color: ${C.ink2}; }
#lk-reg input[type=text] { width: 100%; box-sizing: border-box; border: 2px solid #e3d4b4; border-radius: 14px; padding: 10px 14px; background: #fffaf0; color: ${C.ink}; font: 700 16px/1 ${FONT}; }
#lk-reg .chips { display: flex; flex-wrap: wrap; gap: 6px; }
#lk-reg .chips button, #lk-reg .plans button { border: 2px solid #e3d4b4; border-radius: 999px; padding: 8px 14px; background: #fffaf0; color: ${C.ink}; font: 700 14px/1 ${FONT}; cursor: pointer; }
#lk-reg .plans { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; } #lk-reg .plans button { border-radius: 16px; padding: 12px; text-align: left; line-height: 1.3; }
#lk-reg .chips button.on, #lk-reg .plans button.on { border-color: ${C.teal}; background: #e2f3ef; }
#lk-reg .rules { display: flex; gap: 10px; align-items: flex-start; margin-top: 14px; font: 600 13.5px/1.4 ${FONT}; } #lk-reg .rules input { margin-top: 3px; width: 18px; height: 18px; }
#lk-reg .err { color: #c0392b; font: 700 13.5px/1.3 ${FONT}; min-height: 18px; margin-top: 10px; }
#lk-reg .row { display: flex; gap: 8px; margin-top: 6px; } #lk-reg .row button { flex: 1; border: 0; border-radius: 999px; padding: 12px; font: 800 15px/1 ${FONT}; cursor: pointer; }
#lk-reg .go { background: ${C.teal}; color: #fff; } #lk-reg .x { background: #eadfc6; color: ${C.ink}; }
.bw-card { position: relative; width: 100%; max-width: 380px; aspect-ratio: 1.586; box-sizing: border-box; padding: 16px 18px; border-radius: 18px; color: #1d1a16; overflow: hidden; font-family: ${FONT};
  box-shadow: 0 4px 0 rgba(0,0,0,.18), 0 14px 30px rgba(10,14,30,.25); }
.bw-card.eko { background: linear-gradient(135deg, #f2c94c, #e8a93a); } .bw-card.resident { background: linear-gradient(135deg, #8fcf7c, #4f9a55); color: #0f2a13; }
.bw-card.tenant { background: linear-gradient(135deg, #7fd1c7, #2a9d94); color: #0b2b28; } .bw-card.visitor { background: linear-gradient(135deg, #c9b8f0, #8a6fd1); color: #1f1338; }
.bw-card .org { font: 900 15px/1 ${FONT}; letter-spacing: .06em; } .bw-card .kind { font: 700 11px/1 ${FONT}; letter-spacing: .14em; opacity: .75; margin-top: 4px; }
.bw-card .nm { position: absolute; left: 18px; bottom: 44px; font: 800 21px/1.1 ${FONT}; } .bw-card .role { position: absolute; left: 18px; bottom: 26px; font: 700 12.5px/1 ${FONT}; opacity: .8; }
.bw-card .no { position: absolute; left: 18px; bottom: 10px; font: 700 11.5px/1 ui-monospace, Menlo, monospace; opacity: .85; }
.bw-card .qr { position: absolute; right: 16px; top: 16px; width: 58px; height: 58px; background: #fff; border-radius: 8px; padding: 4px; display: grid; grid-template-columns: repeat(9, 1fr); gap: 0; }
.bw-card .qr i { background: #1d1a16; } .bw-card .qr i.o { background: transparent; }
.bw-card .wifi { position: absolute; right: 14px; bottom: 10px; text-align: right; font: 700 11px/1.35 ui-monospace, Menlo, monospace; background: rgba(255,255,255,.55); padding: 5px 8px; border-radius: 8px; }
.bw-card.expired::after { content: 'EXPIRED'; position: absolute; inset: 0; display: grid; place-items: center; font: 900 30px/1 ${FONT}; color: #c0392b; background: rgba(255,255,255,.55); transform: rotate(-12deg); }
`;

export function createPasses({ toast, district = 'Yaba' } = {}) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const reg = document.createElement('div'); reg.id = 'lk-reg'; reg.setAttribute('role', 'dialog'); reg.setAttribute('aria-label', 'Membership'); document.body.appendChild(reg);
  const NETS = networksFor(district);
  let cards = store.get('bw-passes', []); // [{ kind, no, name, role, plan, issued, until, district }]
  let known = store.get('bw-wifi-known', {}); // ssid -> password that worked
  let link = null; // { ssid, bars } the laptop's connection, while you are in range
  const profile = (() => { try { return loadProfile(); } catch { return {}; } })();
  const myName = () => (profile?.name || walletEngine().handle || '').trim();
  const save = () => store.set('bw-passes', cards);
  const now = () => Date.now();
  const card = (kind) => cards.filter((c) => c.kind === kind && (!c.district || c.district === district)).sort((a, b) => b.until - a.until)[0] || null;
  const valid = (kind) => { const c = card(kind); return !!c && c.until > now(); };
  const number = (prefix) => `${prefix}-${String(1000 + Math.floor(Math.random() * 9000))}`;

  // every resident of the district has a resident card, from the day they arrive
  if (!card('resident')) {
    cards.push({ kind: 'resident', no: number(district.slice(0, 2).toUpperCase()), name: myName() || 'Resident', role: `${district} resident`, issued: now(), until: now() + 3650 * DAY, district });
    save();
    setTimeout(() => toast?.(`Your ${district} resident card is in your bag (I, Cards). It has the ${NETS.district.ssid} Wi-Fi password.`, 5200), 6500);
  }

  // ---------- the card, drawn ----------
  // a made-up QR code: three solid corner squares and a pattern from the card number
  function qr(seed) {
    let h = [...seed].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 7), s = '';
    for (let i = 0; i < 81; i++) {
      const r = i % 9, q = Math.floor(i / 9), corner = (r < 3 && q < 3) || (r > 5 && q < 3) || (r < 3 && q > 5);
      h = (Math.imul(h, 1103515245) + 12345) >>> 0;
      s += `<i class="${corner || (h >> 16) & 1 ? '' : 'o'}"></i>`;
    }
    return s;
  }
  function cardHTML(c) {
    const until = new Date(c.until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    // estate passes: a resident's pass for a rented home, a visitor's pass for a few days
    if (c.kind === 'tenant' || c.kind === 'visitor') {
      const when = c.kind === 'visitor' ? new Date(c.until).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : until;
      return `<div class="bw-card ${c.kind} ${c.until < now() ? 'expired' : ''}">
        <div class="org">${esc(c.estate.toUpperCase())}</div><div class="kind">${c.kind === 'tenant' ? 'RESIDENT PASS' : 'VISITOR PASS'}</div><div class="qr">${qr(c.no)}</div>
        <div class="nm">${esc(c.name)}</div><div class="role">${esc(c.kind === 'tenant' ? c.addr : `Visiting ${c.host}`)}</div><div class="no">${c.no} · until ${when}</div>
        <div class="wifi">${c.kind === 'tenant' ? `Wi-Fi ${esc(c.wifi?.ssid || '')}<br>pass ${esc(c.wifi?.pass || '')}` : `Gate ${c.gate}`}</div></div>`;
    }
    const net = c.kind === 'eko' ? NETS.studio : NETS.district;
    const org = c.kind === 'eko' ? PLACES.studio.name.toUpperCase() : `${district.toUpperCase()} DISTRICT`;
    const kind = c.kind === 'eko' ? (PLANS[c.plan]?.name || 'Member').toUpperCase() : 'RESIDENT CARD';
    return `<div class="bw-card ${c.kind === 'eko' ? 'eko' : 'resident'} ${c.until < now() ? 'expired' : ''}">
      <div class="org">${org}</div><div class="kind">${kind}</div><div class="qr">${qr(c.no)}</div>
      <div class="nm">${esc(c.name === 'Resident' && myName() ? myName() : c.name)}</div><div class="role">${esc(c.role)}</div><div class="no">${c.no} · valid to ${until}</div>
      <div class="wifi">Wi-Fi ${net.ssid}<br>pass ${net.pass}</div></div>`;
  }
  const esc = (t) => String(t).replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));

  // ---------- registering at Eko's door ----------
  let regDone = null;
  function openRegister(onDone) {
    regDone = onDone;
    const old = card('eko');
    const st = { name: myName(), role: old?.role || 'Designer', plan: 'month', rules: false };
    const render = (err = '') => {
      const P = PLANS[st.plan], bal = walletEngine().balance();
      reg.innerHTML = `<div class="box"><h3>${old ? 'Renew your membership' : 'Become a member'}</h3>
        <div class="sub">${PLACES.studio.name} is for members. Register, and your card goes in your bag with the members' Wi-Fi on it. You have ${effortsMark(13)}${fmt(bal)}.</div>
        <label for="lk-reg-name">Name on the card</label><input id="lk-reg-name" type="text" maxlength="28" value="${esc(st.name)}" placeholder="Your full name">
        <label>You are a</label><div class="chips">${ROLES.map((r) => `<button data-r="${r}" class="${st.role === r ? 'on' : ''}">${r}</button>`).join('')}</div>
        <label>Plan</label><div class="plans">${Object.entries(PLANS).map(([k, p]) => `<button data-p="${k}" class="${st.plan === k ? 'on' : ''}"><b>${p.name}</b><br>${effortsMark(12)}${fmt(p.price)} · ${p.days === 1 ? '24 hours' : `${p.days} days`}</button>`).join('')}</div>
        <div class="rules"><input type="checkbox" id="lk-reg-rules" ${st.rules ? 'checked' : ''}><label for="lk-reg-rules" style="all:unset">I will keep the quiet zones quiet, not hold desks I am not using, and clean up after myself.</label></div>
        <div class="err">${err}</div>
        <div class="row"><button class="x">Not now</button><button class="go">Register · ${effortsMark(14)}${fmt(P.price)}</button></div></div>`;
      const nm = reg.querySelector('#lk-reg-name');
      nm.oninput = () => { st.name = nm.value; };
      reg.querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => { st.role = b.dataset.r; render(); }; });
      reg.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => { st.plan = b.dataset.p; render(); }; });
      reg.querySelector('#lk-reg-rules').onchange = (e) => { st.rules = e.target.checked; };
      reg.querySelector('.x').onclick = closeRegister;
      reg.querySelector('.go').onclick = () => {
        const name = st.name.trim();
        if (name.length < 2) return render('Put your name on the card.');
        if (!st.rules) return render('Tick the house rules to register.');
        if (!walletEngine().spend(P.price, `${PLACES.studio.name}: ${P.name.toLowerCase()}`)) return render(`Not enough Efforts: you need ${fmt(P.price)}. Push some commits, or pick the day pass.`);
        const c = { kind: 'eko', no: old?.no || number('EKO'), name, role: st.role, plan: st.plan, issued: now(), until: Math.max(now(), old?.until || 0) + P.days * DAY };
        cards = cards.filter((x) => x.kind !== 'eko'); cards.push(c);
        cards.forEach((x) => { if (x.kind === 'resident' && x.name === 'Resident') x.name = name; }); // the resident card gets your name too
        save();
        sfx('arrive');
        reg.innerHTML = `<div class="box"><h3>Welcome to Eko</h3><div class="sub">Your card is in your bag (I, Cards). Tap it at the door. The members' Wi-Fi is on the back.</div>${cardHTML(c)}
          <div class="row" style="margin-top:16px"><button class="x">Later</button><button class="go">Tap in</button></div></div>`;
        reg.querySelector('.x').onclick = closeRegister;
        reg.querySelector('.go').onclick = () => { const f = regDone; closeRegister(); f?.(); };
      };
    };
    render();
    reg.classList.add('on');
    setTimeout(() => reg.querySelector('#lk-reg-name')?.focus(), 50);
  }
  function closeRegister() { reg.classList.remove('on'); regDone = null; }

  // ---------- Wi-Fi ----------
  // in range: the building's own network, strong; the district network, faint through the walls
  function inRange(place) {
    if (!place) return [];
    const t = place === 'myhome' ? tenancy() : null;
    const own = t ? t.wifi : NETS[place];
    return [own && { ...own, bars: 4 }, { ...NETS.district, bars: 1 }].filter(Boolean);
  }
  function arrive(place) {
    link = null;
    const best = inRange(place).filter((n) => known[n.ssid] === n.pass).sort((a, b) => b.bars - a.bars)[0];
    if (best) link = { ssid: best.ssid, bars: best.bars };
    return link;
  }
  function join(place, ssid, pass) {
    const n = inRange(place).find((x) => x.ssid === ssid);
    if (!n) return { ok: false, why: 'That network is out of range.' };
    if (String(pass) !== n.pass) return { ok: false, why: 'Incorrect password.' };
    known = { ...known, [ssid]: pass }; store.set('bw-wifi-known', known);
    link = { ssid, bars: n.bars };
    return { ok: true };
  }
  const forgetLink = () => { link = null; };

  // ---------- estate passes and reputation (gates.js) ----------
  function addCard(c) { cards = cards.filter((x) => !(x.kind === c.kind && (c.kind === 'tenant' || x.estate === c.estate))); cards.push({ no: number(c.kind === 'tenant' ? 'RES' : 'VIS'), name: myName() || 'Guest', issued: now(), ...c }); save(); return cards[cards.length - 1]; }
  const visitorFor = (estate) => cards.filter((c) => c.kind === 'visitor' && c.estate === estate).sort((a, b) => b.until - a.until)[0] || null;
  const tenancy = () => cards.find((c) => c.kind === 'tenant' && c.until > now()) || null;
  const access = (estate) => { const t = tenancy(); if (t && t.estate === estate) return 'resident'; const v = visitorFor(estate); return v && v.until > now() ? 'visitor' : null; };
  let repScore = store.get('bw-rep', 50);
  const repLabel = (r = repScore) => (r < 30 ? 'On the watch list' : r < 60 ? 'Neighbour' : r < 80 ? 'Good neighbour' : 'Pillar of the community');
  function addRep(d, why) { repScore = Math.max(0, Math.min(100, repScore + d)); store.set('bw-rep', repScore); if (why) toast?.(`Reputation ${d > 0 ? '+' : ''}${d}: ${why}`, 2600); return repScore; }
  function dispose() { style.remove(); reg.remove(); }
  return {
    valid, card, cardHTML, cards: () => cards.slice().sort((a, b) => (a.kind === 'eko' ? -1 : 1) - (b.kind === 'eko' ? -1 : 1)),
    openRegister, closeRegister, get registering() { return reg.classList.contains('on'); },
    addCard, visitorFor, tenancy, access, addRep, get rep() { return repScore; }, repLabel,
    inRange, arrive, join, forgetLink, get link() { return link; }, known: () => ({ ...known }), NETS, dispose,
  };
}

let instance = null;
export const passesEngine = (opts) => (instance ??= createPasses(opts));
