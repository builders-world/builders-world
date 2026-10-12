import { loadProfile } from '../onboarding/state.js';
import { walletEngine, effortsMark, fmt } from './wallet.js';
import { PLACES } from './interior.js';
import { sfx } from './audio.js';
import { C, FONT } from './uikit.js';
import { cityFor, cardArt } from './cardart.js';
import { cityInfo, CITY_INFO } from './cityinfo.js';
import { licenceCardHTML } from './licence.js';

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
  const W = cityInfo().wifi || CITY_INFO.Lagos.wifi; // each city's own networks (cityinfo.js)
  return {
    studio: { ssid: 'Eko-Members', pass: 'ekomembers26', where: 'On your Eko membership card' },
    hub: { ssid: `${district}Hub-Guest`, pass: 'buildtogether', where: `On the notice board at the ${PLACES.hub.name}` },
    loft: { ssid: W.loft[0], pass: W.loft[1], where: `On the notice board at the ${PLACES.loft.name}` },
    cafe: { ssid: W.cafe[0], pass: W.cafe[1], where: `On the menu board at ${PLACES.cafe.name}` },
    gym: { ssid: W.gym[0], pass: W.gym[1], where: 'At the gym front desk' },
    bank: { ssid: W.bank[0], pass: W.bank[1], where: 'Ask a teller' },
    district: { ssid: `${district.replace(/\s+/g, '')}-Connect`, pass: `${district.toLowerCase().replace(/\s+/g, '')}-resident`, where: `On your ${district} card` },
    // the public hotspots outdoors (the community board, bus stops, the motor park, parks): the password is on the board
    free: { ssid: `${district.replace(/\s+/g, '')}-Free-WiFi`, pass: `${district.toLowerCase().replace(/\s+/g, '')}free`, where: 'Pinned on the community board' },
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
.bw-card { position: relative; width: 100%; max-width: 380px; aspect-ratio: 1.586; box-sizing: border-box; padding: 16px 18px; border-radius: 18px; color: var(--ink, #1d1a16); overflow: hidden; font-family: ${FONT};
  background: linear-gradient(135deg, var(--c1, #8fcf7c), var(--c2, #4f9a55)); box-shadow: 0 4px 0 rgba(0,0,0,.18), 0 14px 30px rgba(10,14,30,.25); isolation: isolate; }
.bw-card .art { position: absolute; inset: 0; width: 100%; height: 100%; z-index: -1; }
.bw-card::before { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.22) 45%, transparent 60%); } /* a sheen */
.bw-card .org { font: 900 22px/1 ${FONT}; letter-spacing: .04em; } .bw-card .dist { font: 700 12px/1 ${FONT}; opacity: .8; margin-top: 4px; }
.bw-card .kind { display: inline-block; margin-top: 8px; padding: 4px 9px; border-radius: 999px; background: rgba(255,255,255,.6); font: 800 10px/1 ${FONT}; letter-spacing: .14em; }
.bw-card .chip { position: absolute; right: 86px; top: 22px; width: 34px; height: 26px; border-radius: 6px; background: linear-gradient(135deg, #f6dc8a, #c9a24a); box-shadow: inset 0 0 0 1.5px rgba(90,60,10,.35); }
.bw-card .chip::after { content: ''; position: absolute; inset: 6px 9px; border: 1.5px solid rgba(90,60,10,.35); border-radius: 3px; }
.bw-card .nm { position: absolute; left: 18px; bottom: 46px; font: 800 21px/1.1 ${FONT}; text-shadow: 0 1px 0 rgba(255,255,255,.35); } .bw-card .role { position: absolute; left: 18px; bottom: 28px; font: 700 12.5px/1 ${FONT}; opacity: .85; }
.bw-card .no { position: absolute; left: 18px; bottom: 11px; font: 700 11px/1 ui-monospace, Menlo, monospace; opacity: .85; }
.bw-card .qr { position: absolute; right: 16px; top: 16px; width: 54px; height: 54px; background: #fff; border-radius: 8px; padding: 4px; display: grid; grid-template-columns: repeat(9, 1fr); gap: 0; }
.bw-card .qr i { background: #1d1a16; } .bw-card .qr i.o { background: transparent; }
.bw-card .wifi { position: absolute; right: 14px; bottom: 10px; text-align: right; font: 700 10.5px/1.35 ui-monospace, Menlo, monospace; background: rgba(255,255,255,.72); color: #1d1a16; padding: 5px 8px; border-radius: 8px; }
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
    const visitor = cards.some((x) => x.kind === 'resident' && x.district && x.district !== district);
    setTimeout(() => toast?.(`Your ${district} ${visitor ? 'visitor' : 'resident'} card is in your bag (I, Cards). It has the ${NETS.district.ssid} Wi-Fi password.`, 5200), 6500);
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
  // the district you came to live in (your arrivals city) gets the resident card; every other district
  // you visit gives you a visitor's card, with that district's Wi-Fi on it
  const home = () => { const own = cards.filter((x) => x.kind === 'resident'); const city = profile?.city; return own.find((x) => cityFor(x.district).city === city)?.district || own.sort((a, b) => a.issued - b.issued)[0]?.district || district; };
  function cardHTML(c) {
    const until = new Date(c.until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const style = (from, to, ink) => `style="--c1:${from};--c2:${to};--ink:${ink}"`;
    // estate passes: a resident's pass for a rented home, a visitor's pass for a few days
    if (c.kind === 'tenant' || c.kind === 'visitor') {
      const when = c.kind === 'visitor' ? new Date(c.until).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : until;
      return `<div class="bw-card ${c.kind} ${c.until < now() ? 'expired' : ''}" ${c.kind === 'tenant' ? style('#7fd1c7', '#2a9d94', '#0b2b28') : style('#c9b8f0', '#8a6fd1', '#1f1338')}>${cardArt('estate')}
        <div class="org">${esc(c.estate.toUpperCase())}</div><div class="kind">${c.kind === 'tenant' ? 'RESIDENT PASS' : 'VISITOR PASS'}</div><div class="qr">${qr(c.no)}</div>
        <div class="nm">${esc(c.name)}</div><div class="role">${esc(c.kind === 'tenant' ? c.addr : `Visiting ${c.host}`)}</div><div class="no">${c.no} · until ${when}</div>
        <div class="wifi">${c.kind === 'tenant' ? `Wi-Fi ${esc(c.wifi?.ssid || '')}<br>pass ${esc(c.wifi?.pass || '')}` : `Gate ${c.gate}`}</div></div>`;
    }
    // a passport: the booklet's colour, the coat of arms, the number; a travel authorisation, a slip
    if (c.kind === 'passport') {
      const [c1, c2] = { Nigeria: ['#2a7a52', '#0f3d27'], Ghana: ['#7a2a34', '#3d0f16'], Kenya: ['#2a3a6a', '#0f1a3d'] }[c.nationality] || ['#2a3a6a', '#0f1a3d'];
      const stamps = (c.stamps || []).slice(-3).map((s) => `<span style="display:inline-block;margin-right:4px;padding:2px 6px;border:2px solid #f4e6b0;border-radius:6px;font:800 9px/1 monospace;transform:rotate(-6deg)">${esc(s)}</span>`).join('');
      return `<div class="bw-card passport" ${style(c1, c2, '#f4e6b0')}><div class="org">${esc(String(c.nationality).toUpperCase())}</div><div class="dist">Passport · Passeport</div><div class="kind" style="background:rgba(244,230,176,.25);color:#f4e6b0">PASSPORT</div>
        <svg viewBox="0 0 60 60" style="position:absolute;right:20px;top:18px;width:58px;height:58px"><circle cx="30" cy="30" r="26" fill="none" stroke="#f4e6b0" stroke-width="3"/><path d="M30 12l5 12h13l-10 8 4 13-12-8-12 8 4-13-10-8h13z" fill="#f4e6b0"/></svg>
        <div class="nm" style="color:#f4e6b0">${esc(c.name)}</div><div class="role">${stamps || 'No stamps yet'}</div><div class="no">${esc(c.no)} · valid to ${until}</div></div>`;
    }
    if (c.kind === 'licence') return licenceCardHTML(c);
    if (c.kind === 'eta') return `<div class="bw-card eta" ${style('#e8f3ef', '#bfe0d6', '#0b2b28')}><div class="org">${esc(String(c.country).toUpperCase())}</div><div class="dist">Electronic travel authorisation</div><div class="kind">APPROVED</div><div class="nm">${esc(c.name)}</div><div class="role">For your passport, one year</div><div class="no">${esc(c.no)} · valid to ${until}</div></div>`;
    const name = esc(c.name === 'Resident' && myName() ? myName() : c.name);
    if (c.kind === 'eko') {
      const net = NETS.studio;
      return `<div class="bw-card eko ${c.until < now() ? 'expired' : ''}" ${style('#f6d36a', '#e39a2e', '#3a2306')}>${cardArt('eko')}
        <div class="org">EKO</div><div class="dist">${esc(PLACES.studio.name)}</div><div class="kind">${(PLANS[c.plan]?.name || 'Member').toUpperCase()}</div><span class="chip"></span><div class="qr">${qr(c.no)}</div>
        <div class="nm">${name}</div><div class="role">${esc(c.role)}</div><div class="no">${c.no} · valid to ${until}</div><div class="wifi">Wi-Fi ${net.ssid}<br>pass ${net.pass}</div></div>`;
    }
    // a district card: its own city's colours and landmark, its own network
    const d = c.district || district, city = cityFor(d), net = networksFor(d).district, isHome = d === home();
    return `<div class="bw-card resident ${c.until < now() ? 'expired' : ''}" ${style(city.from, city.to, city.ink)} title="${esc(city.what)}">${cardArt(city.art)}
      <div class="org">${esc(city.city.toUpperCase())}</div><div class="dist">${esc(d)} district</div><div class="kind">${isHome ? 'RESIDENT CARD' : 'VISITOR CARD'}</div><span class="chip"></span><div class="qr">${qr(c.no)}</div>
      <div class="nm">${name}</div><div class="role">${isHome ? `${esc(d)} resident` : `Visiting ${esc(d)}`}</div><div class="no">${c.no} · valid to ${until}</div>
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
    link = null; here = place;
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
  const forgetLink = () => { link = null; here = null; };

  // ---------- the phone's Wi-Fi ----------
  // (Elvis, 10 October 2026: "the phone should also need to connect to Wi-Fi before it can work. So introduce public Wi-Fi
  // as well, and a way to find ... passwords for the Wi-Fi".) Inside, the phone sees what the laptop sees. Outdoors there
  // are hotspots: the free network and the residents' network round the community board, the bus stops, the motor park
  // and the parks, and each workplace's own network a little way out of its door. A network you have joined before
  // (phone or laptop) joins by itself. A MiFi router carried in the bag is your own data, anywhere.
  let here = null, spots = [];
  const setHotspots = (list) => { spots = list.filter(Boolean); };
  function phoneNets(pos) {
    if (here) return inRange(here);
    const out = new Map();
    for (const s of spots) {
      const d = Math.hypot(pos.x - s.x, pos.z - s.z); if (d > s.r) continue;
      const bars = d < s.r * 0.35 ? 4 : d < s.r * 0.6 ? 3 : d < s.r * 0.85 ? 2 : 1;
      (s.kind === 'public' ? [NETS.free, NETS.district] : [s.net]).forEach((n) => { if (!n) return; const o = out.get(n.ssid); if (!o || o.bars < bars) out.set(n.ssid, { ...n, bars, near: s.name }); });
    }
    return [...out.values()].sort((a, b) => b.bars - a.bars);
  }
  function phoneLink(pos, mifi = false) {
    if (mifi) return { ssid: 'Your MiFi', bars: 4, mifi: true };
    const n = phoneNets(pos).find((x) => known[x.ssid] === x.pass);
    return n ? { ssid: n.ssid, bars: n.bars } : null;
  }
  function phoneJoin(pos, ssid, pass) {
    const n = phoneNets(pos).find((x) => x.ssid === ssid);
    if (!n) return { ok: false, why: 'That network is out of range.' };
    if (String(pass).trim() !== n.pass) return { ok: false, why: 'Incorrect password.' };
    known = { ...known, [ssid]: n.pass }; store.set('bw-wifi-known', known);
    return { ok: true };
  }
  // the nearest public hotspot, for when you have nothing
  const nearestHotspot = (pos) => spots.filter((s) => s.kind === 'public').map((s) => ({ ...s, d: Math.max(0, Math.hypot(pos.x - s.x, pos.z - s.z) - s.r * 0.6) })).sort((a, b) => a.d - b.d)[0] || null;
  // a desk computer is wired to the building's own network: no password, and nothing your laptop remembers
  const wire = (place) => { const n = place === 'myhome' ? tenancy()?.wifi : NETS[place]; if (n) link = { ssid: n.ssid, bars: 4, wired: true }; return !!n; };

  // ---------- estate passes and reputation (gates.js) ----------
  function addCard(c) { cards = cards.filter((x) => !(x.kind === c.kind && (c.kind === 'tenant' || x.estate === c.estate))); cards.push({ no: number(c.kind === 'tenant' ? 'RES' : 'VIS'), name: myName() || 'Guest', issued: now(), ...c }); save(); return cards[cards.length - 1]; }
  const visitorFor = (estate) => cards.filter((c) => c.kind === 'visitor' && c.estate === estate).sort((a, b) => b.until - a.until)[0] || null;
  const tenancy = () => cards.find((c) => c.kind === 'tenant' && c.until > now()) || null;
  const access = (estate) => { const t = tenancy(); if (t && t.estate === estate) return 'resident'; const v = visitorFor(estate); return v && v.until > now() ? 'visitor' : null; };
  let repScore = store.get('bw-rep', 50);
  const repLabel = (r = repScore) => (r < 30 ? 'On the watch list' : r < 60 ? 'Neighbour' : r < 80 ? 'Good neighbour' : 'Pillar of the community');
  function addRep(d, why) { dispatchEvent(new CustomEvent('bw:rep', { detail: { d, why } })); repScore = Math.max(0, Math.min(100, repScore + d)); store.set('bw-rep', repScore); if (why) toast?.(`Reputation ${d > 0 ? '+' : ''}${d}: ${why}`, 2600); return repScore; }
  function dispose() { style.remove(); reg.remove(); }
  return {
    valid, card, cardHTML, cards: () => cards.slice().sort((a, b) => (a.kind === 'eko' ? -1 : 1) - (b.kind === 'eko' ? -1 : 1)),
    openRegister, closeRegister, get registering() { return reg.classList.contains('on'); },
    addCard, visitorFor, tenancy, access, addRep, get rep() { return repScore; }, repLabel,
    inRange, arrive, join, forgetLink, wire, get link() { return link; }, get here() { return here; }, setHotspots, phoneNets, phoneLink, phoneJoin, nearestHotspot, known: () => ({ ...known }), NETS, dispose,
  };
}

let instance = null;
export const passesEngine = (opts) => (instance ??= createPasses(opts));
