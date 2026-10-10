import * as THREE from 'three';
import { sfx } from './audio.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAvatarModel } from '../onboarding/avatar.js';
import { dress, lookFor } from './style.js';
import { buildCafe, buildGym, buildBank } from './venues.js';
import { BUILDERS } from '../builders.js';
import { mulberry32 } from '../mesh.js';
import { buildPlayerHome, HOME_LINES } from './rooms.js';
import { decorate, DECOR_LINES } from './decor.js';
import { walletEngine, effortsMark, fmt } from './wallet.js';
import { session } from '../session.js';

// Enterable workspaces (world bible 6.6): reception and board, hot desks, focus pods, a meeting room,
// a cafeteria and a lounge. Metrics from the bible: ceiling 3.6 m, desks 0.75 m high and 1.4 m wide,
// aisles 1.2 m and more. Built once per place, far from the street, and shown on its own.

const ORIGIN = new THREE.Vector3(3000, 0, 0);
const W = 26, D = 18, H = 3.6;
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const LID_OPEN = -0.24, LID_SHUT = Math.PI / 2 - 0.02;
// the desk computers: what a session costs (Efforts), free with a membership card
export const DESK_FEE = { cafe: 200, hub: 300, loft: 300, studio: 0, myhome: 0 };
const placeName = (k) => PLACES[k]?.name || (k === 'myhome' ? 'Your home' : 'Here');

export const PLACES = {
  hub: { name: 'Yaba Creative Hub', kind: 'Shared workspace', accent: 0x2a9d94, floor: 0x8a8f96, seed: 3 },
  loft: { name: 'Lagos Builders Loft', kind: 'Co-working loft', accent: 0xe46f4f, floor: 0x7a6656, seed: 7 },
  studio: { name: 'Eko Design Studio', kind: 'Design and media studio', accent: 0xf2b33d, floor: 0x6a707c, seed: 11 },
  cafe: { name: 'Kofo Cafe', kind: 'Coffee and a table to work at', accent: 0xa87950, floor: 0x8a5a36, seed: 13 },
  gym: { name: 'Yaba Fitness', kind: 'Gym', accent: 0xe46f4f, floor: 0x3b3f45, seed: 17 },
  bank: { name: 'Yaba Builders Bank', kind: 'Banking hall', accent: 0x2a9d94, floor: 0xd9d2c3, seed: 19 },
};

// the three places take the district's name, so Wuse gets a Wuse hub, not a Yaba one
export function namePlaces(district = 'Yaba', city = 'Lagos') {
  if (district === 'Yaba') return;
  PLACES.hub.name = `${district} Creative Hub`;
  PLACES.loft.name = `${city} Builders Loft`;
  PLACES.studio.name = `${district} Design Studio`;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function codeScreen(lines) {
  return canvasTex(512, 320, (g, w, h) => {
    g.fillStyle = '#0d1117'; g.fillRect(0, 0, w, h);
    g.font = '15px Menlo, monospace';
    const cols = ['#79c0ff', '#ffa657', '#a5d6ff', '#d2a8ff', '#7ee787', '#e6edf3'];
    lines.forEach((l, i) => { g.fillStyle = cols[i % cols.length]; g.fillText(l, 16, 28 + i * 20); });
  });
}

const SNIPPET = [
  "import { buildWorld } from './world.js';",
  '',
  'export function grow(plot, work) {',
  '  // verified pushes light windows',
  '  plot.lit = work.lastPush < 1;',
  '  plot.floors = floorsFor(work);',
  '  return plot;',
  '}',
  '',
  '// git push origin main',
  '// ✓ 3 commits verified',
];

export function createInteriors({ scene, reduced, toast, getEnv, onPackUp, net, onOrder, onTeller }) {
  const built = {};
  let current = null; // { key, group, colliders, seats, interact }
  const fade = document.createElement('div');
  Object.assign(fade.style, { position: 'fixed', inset: '0', background: '#05070d', opacity: '0', pointerEvents: 'none', transition: 'opacity .35s ease', zIndex: '40' });
  document.body.appendChild(fade);

  // the computer overlay: a working screen at your desk
  const screen = document.createElement('div');
  screen.innerHTML = `<style>
    #lki { position: fixed; z-index: 34; inset: 6vh 8vw; border-radius: 28px; border: 14px solid #f7efdc; box-shadow: 0 6px 0 rgba(59,42,32,.25), 0 30px 70px rgba(10,14,30,.4); background: #0d1117; color: #e6edf3; display: none; overflow: hidden;
      box-shadow: 0 30px 90px rgba(0,0,0,.6); font: 13px/1.5 Menlo, ui-monospace, monospace; }
    #lki.on { display: grid; grid-template-columns: 220px 1fr; }
    #lki aside { background: #161b22; padding: 16px; border-right: 1px solid #30363d; }
    #lki aside h4 { margin: 0 0 10px; font: 700 12px/1 system-ui; letter-spacing: .1em; text-transform: uppercase; color: #8b949e; }
    #lki aside div { padding: 6px 8px; border-radius: 6px; color: #c9d1d9; }
    #lki aside div.on { background: #1f6feb33; color: #fff; }
    #lki main { padding: 66px 22px 18px; overflow: auto; position: relative; }
    #lki .bar { flex-wrap: wrap; justify-content: flex-end; left: 18px; }
    #lki pre { margin: 0; white-space: pre-wrap; }
    #lki .bar { position: absolute; right: 18px; top: 14px; display: flex; gap: 8px; }
    #lki button { font: 600 12px system-ui; border: 0; border-radius: 8px; padding: 8px 12px; cursor: pointer; background: #21262d; color: #e6edf3; }
    #lki button.p { background: #238636; }
    #lki .term { white-space: pre-wrap; margin-top: 18px; padding: 12px; border-radius: 10px; background: #010409; color: #7ee787; min-height: 80px; }
    #lki aside { overflow-y: auto; }
    #lki .wf { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; background: #3a1d1d; color: #ffb4a8; }
    #lki .wf.up { background: #12301f; color: #7ee787; }
    #lki .bars { display: inline-flex; align-items: flex-end; gap: 2px; height: 14px; } #lki .bars i { width: 3px; background: #4b535d; border-radius: 1px; } #lki .bars i.on { background: currentColor; }
    #lki .nets { margin-top: 6px; display: grid; gap: 4px; } #lki .nets > button { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; }
    #lki .nets > button.on { outline: 1px solid #238636; } #lki .lock { margin-left: auto; font-size: 10px; color: #8b949e; }
    #lki .pw { display: grid; grid-template-columns: 1fr auto; gap: 6px; padding: 4px 0 6px; } #lki .pw input { min-width: 0; border: 1px solid #30363d; border-radius: 8px; padding: 7px 9px; background: #0d1117; color: #e6edf3; font: 13px system-ui; }
    #lki .pw .err { grid-column: 1 / -1; color: #ff7b72; font: 600 12px system-ui; } #lki .none { color: #8b949e; }
    #lki aside .tab { cursor: pointer; }
    #lki .page { font: 14px/1.5 system-ui; color: #e6edf3; } #lki .page h2 { font: 700 22px system-ui; margin: 10px 0; } #lki .addr { padding: 7px 12px; border-radius: 999px; background: #161b22; color: #8b949e; font: 12px ui-monospace, monospace; }
    #lki .page .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; } #lki .page .cards div { padding: 12px; border-radius: 10px; background: #161b22; }
    #lki .page.off { display: grid; place-items: center; text-align: center; min-height: 50vh; } #lki .dino { font: 28px monospace; color: #8b949e; } #lki .slow { color: #e3b341; }
    #lki.on.lock { display: grid; grid-template-columns: 1fr; place-items: center; background: radial-gradient(circle at 50% 30%, #1d3a4a, #0b1622 70%); }
    #lki .login { width: min(340px, 80vw); display: grid; justify-items: center; gap: 10px; text-align: center; font: 14px/1.45 system-ui; color: #e6edf3; }
    #lki .login .av { width: 84px; height: 84px; border-radius: 50%; display: grid; place-items: center; background: #2a9d94; color: #fff; font: 800 34px/1 system-ui; box-shadow: 0 0 0 4px rgba(255,255,255,.12); }
    #lki .login h3 { margin: 4px 0 0; font: 700 20px/1.2 system-ui; } #lki .login .h { color: #8b949e; font: 600 13px system-ui; margin-top: -6px; }
    #lki .login .where { padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,.08); color: #c9d1d9; font: 600 12px system-ui; }
    #lki .login p { margin: 0; color: #c9d1d9; font: 13px/1.45 system-ui; }
    #lki .login input { width: 100%; box-sizing: border-box; border: 1px solid #30363d; border-radius: 10px; padding: 11px 12px; background: rgba(1,4,9,.6); color: #e6edf3; font: 15px system-ui; outline: none; }
    #lki .login input:focus { border-color: #2a9d94; box-shadow: 0 0 0 3px rgba(42,157,148,.3); }
    #lki .login .go { width: 100%; padding: 11px; border-radius: 10px; background: #2a9d94; color: #fff; font: 700 14px system-ui; }
    #lki .login .err { min-height: 18px; color: #ff7b72; font: 600 12.5px system-ui; }
    #lki .login .links { display: flex; gap: 14px; } #lki .login .links button { background: none; padding: 4px; color: #8b949e; font: 600 12.5px system-ui; text-decoration: underline; }
    #lki aside .who { margin-bottom: 12px; padding: 8px 10px; border-radius: 8px; background: #12301f; color: #7ee787; font: 600 12px/1.35 system-ui; }
  </style><div id="lki" role="dialog" aria-label="Your computer"></div>`;
  document.body.appendChild(screen);
  const lki = screen.querySelector('#lki');
  // the laptop: code, a browser, and Wi-Fi it has to be on before either reaches the internet (passes.js)
  let view = 'code', wifiOpen = false, joining = null, wifiErr = '', pageAt = 0, pushed = '';
  const bars = (n) => `<span class="bars">${[1, 2, 3, 4].map((k) => `<i class="${k <= n ? 'on' : ''}" style="height:${2 + k * 3}px"></i>`).join('')}</span>`;
  const esc = (t) => String(t).replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));
  function browserView(L) {
    if (!L) return `<div class="page off"><h2>No internet</h2><p>This laptop is not on a network. Click <b>Wi-Fi</b> at the top left and join one. The password is on the notice board here, on your membership card, or, for ${esc(net?.NETS?.district?.ssid || 'the district network')}, on your resident card.</p><div class="dino">( -_-)</div></div>`;
    if (L.bars < 2 && performance.now() - pageAt < 2600) return `<div class="page"><div class="addr">builders.world</div><p class="slow">Loading... weak signal on ${esc(L.ssid)}. Pages will be slow.</p></div>`;
    const you = BUILDERS.find((b) => b.id === 'you');
    return `<div class="page"><div class="addr">builders.world/home</div><h2>Good to see you online</h2>
      <div class="cards"><div><b>github.com/${esc(you?.handle || 'you')}</b><br>${(you?.repoList || []).length} repositories, ${you?.commits ?? 0} commits this year</div>
      <div><b>Yaba tech jobs</b><br>Product designer at a fintech, React Native at a logistics startup, Rust contractor</div>
      <div><b>This week in Yaba</b><br>Demo night Thursday 7pm. Rust study group, room 2. Design crit at Eko on Saturday.</div></div>
      ${L.bars < 2 ? '<p class="slow">You are on the district Wi-Fi from inside: it works, slowly. The building\'s own network is faster.</p>' : ''}</div>`;
  }
  // ---------- the desk computer: the venue's own machine, for a fee or free with a membership ----------
  // You sign in to it with your own profile and a password you set the first time, which every desk
  // computer in Builders World asks for. It is on the building's own network, so no Wi-Fi to join.
  // The password is a game password, kept on this device as a salted hash: not your GitHub password.
  let desk = null; // { lit, signedIn }
  const PASS_KEY = 'bw-desk-pass';
  const me = () => { const name = session.me?.account?.name || (() => { try { return JSON.parse(localStorage.getItem('bw-arrivals-v1') || '{}').name; } catch { return ''; } })() || 'Builder'; return { name, handle: session.me?.account?.login || '' }; };
  const readPass = () => { try { return JSON.parse(localStorage.getItem(PASS_KEY) || 'null'); } catch { return null; } };
  async function hash(salt, pass) {
    const text = `${salt}:${pass}`;
    if (crypto?.subtle) { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
    let h = 2166136261; for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return `f${(h >>> 0).toString(16)}`; // no crypto (plain http): still not stored in the clear
  }
  const deskFee = () => (current ? DESK_FEE[current.key] ?? 200 : 0);
  const member = () => !!net?.valid?.('eko');
  function useDesk() {
    if (!seated || !current) return false;
    if (lidOpen()) { const lid = laptop.userData.lid; lid.userData.opening = false; lid.userData.closing = true; } // your laptop shuts while you use theirs
    if (!desk) {
      const fee = deskFee();
      if (fee && !member() && !seated.paid) {
        if (!walletEngine().spend(fee, `${placeName(current.key)}: desk computer`)) { toast(`The desk computer is ${fmt(fee)} Efforts a session, and you are short. Use your laptop, or come back with a membership card.`, 3800); return true; }
        seated.paid = true; // signing out and back in at this desk costs nothing more
        toast(`Paid ${fmt(fee)} Efforts for the desk computer. It is yours until you stand up.`, 2800);
      } else if (fee) toast('Free with your membership card.', 2200);
      const lit = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.32).translate(0, 1.1, -0.23), new THREE.MeshBasicMaterial({ color: 0x1d3a4a }));
      lit.position.set(seated.x, 0, seated.z + 0.003); current.group.add(lit);
      desk = { lit, signedIn: false };
      sfx('open');
    }
    if (desk.signedIn) openComputer(); else openLock();
    return true;
  }
  function openLock(err = '') {
    const rec = readPass(), who = me();
    lki.classList.add('on', 'lock');
    lki.innerHTML = `<div class="login"><div class="av">${esc((who.name || '?').trim()[0]?.toUpperCase() || '?')}</div><h3>${esc(who.name)}</h3>${who.handle ? `<div class="h">@${esc(who.handle)}</div>` : ''}
      <span class="where">${esc(placeName(current.key))} · desk computer</span>
      ${rec ? '<input type="password" class="p1" placeholder="Password" aria-label="Your desk password" autocomplete="off">'
        : '<p>First time on a desk computer: make a password. Every desk in Builders World will ask for it. Not your GitHub password.</p><input type="password" class="p1" placeholder="New password (4 or more)" aria-label="New password" autocomplete="off"><input type="password" class="p2" placeholder="Type it again" aria-label="Type the password again" autocomplete="off">'}
      <div class="err">${esc(err)}</div><button class="go">${rec ? 'Sign in' : 'Create and sign in'}</button>
      <div class="links">${rec ? '<button class="forgot">Forgot it?</button>' : ''}<button class="x">Not now (Esc)</button></div></div>`;
    const p1 = lki.querySelector('.p1'), p2 = lki.querySelector('.p2');
    const submit = async () => {
      const a = p1.value;
      if (!rec) {
        if (a.length < 4) return openLock('Use 4 characters or more.');
        if (a !== p2.value) return openLock('The two passwords do not match.');
        const salt = Math.random().toString(36).slice(2, 10);
        try { localStorage.setItem(PASS_KEY, JSON.stringify({ salt, hash: await hash(salt, a) })); } catch { /* */ }
      } else if (await hash(rec.salt, a) !== rec.hash) return openLock('That is not the password.');
      desk.signedIn = true; net?.wire?.(current.key); sfx('arrive');
      toast(`Signed in as ${who.name}. On the ${placeName(current.key)} network.`, 2400);
      lki.classList.remove('lock'); openComputer();
    };
    lki.querySelector('.go').onclick = submit;
    [p1, p2].filter(Boolean).forEach((inp) => { inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); submit(); } if (e.key === 'Escape') closeComputer(); }; });
    lki.querySelector('.x').onclick = closeComputer;
    lki.querySelector('.forgot')?.addEventListener('click', () => { try { localStorage.removeItem(PASS_KEY); } catch { /* */ } openLock('Password cleared. Make a new one.'); });
    setTimeout(() => p1.focus(), 30);
  }
  function signOut(quiet = false) {
    if (!desk) return false;
    desk.lit.removeFromParent(); desk.lit.geometry.dispose(); desk.lit.material.dispose();
    if (net?.link?.wired) net.forgetLink();
    desk = null; closeComputer();
    if (!quiet) { sfx('close'); toast('Signed out. The desk computer is ready for the next person.', 2400); }
    return true;
  }

  function openComputer() {
    if (desk && !desk.signedIn) return openLock();
    lki.classList.remove('lock');
    const you = BUILDERS.find((b) => b.id === 'you'), L = net?.link || null, nets = current ? net?.inRange(current.key) || [] : [];
    lki.innerHTML = `<aside>${desk?.signedIn ? `<div class="who">${esc(placeName(current.key))} desk computer<br>Signed in as ${esc(me().name)}</div>` : ''}
      <button class="wf ${L ? 'up' : ''}" aria-expanded="${wifiOpen}">${bars(L ? L.bars : 0)} ${L ? esc(L.ssid) : 'Wi-Fi: not connected'}</button>
      ${wifiOpen ? `<div class="nets">${nets.map((n) => `<button data-s="${esc(n.ssid)}" class="${L?.ssid === n.ssid ? 'on' : ''}">${bars(n.bars)} ${esc(n.ssid)} <span class="lock">locked</span></button>
        ${joining === n.ssid ? `<div class="pw"><input type="password" placeholder="Password" aria-label="Password for ${esc(n.ssid)}" autocomplete="off"><button class="join">Join</button><div class="err">${esc(wifiErr)}</div></div>` : ''}`).join('') || '<div class="none">No networks here.</div>'}</div>` : ''}
      <h4 style="margin-top:14px">View</h4><div class="tab ${view === 'code' ? 'on' : ''}" data-v="code">Code</div><div class="tab ${view === 'web' ? 'on' : ''}" data-v="web">Browser</div>
      <h4 style="margin-top:14px">Repositories</h4>${(you?.repoList || []).map(([r], i) => `<div class="${i ? '' : 'on'}">${r}</div>`).join('')}
      <h4 style="margin-top:14px">This desk</h4><div>${current ? placeName(current.key) : ''}</div></aside>
      <main><div class="bar"><button class="p">Commit and push</button><button class="x">Close the screen (Esc)</button>${desk?.signedIn ? '<button class="c">Sign out (O)</button>' : '<button class="c">Close laptop (F)</button>'}<button class="u">Pack up and leave</button></div>
      ${view === 'code' ? `<pre>${SNIPPET.join('\n').replace(/</g, '&lt;')}</pre><div class="term">${pushed || "$ git status\nOn branch main\nYour branch is up to date with 'origin/main'."}</div>` : browserView(L)}</main>`;
    lki.classList.add('on');
    lki.querySelector('.x').onclick = closeComputer;
    lki.querySelector('.c').onclick = () => (desk?.signedIn ? signOut() : closeLaptop());
    lki.querySelector('.u').onclick = () => onPackUp?.();
    lki.querySelector('.wf').onclick = () => { wifiOpen = !wifiOpen; joining = null; wifiErr = ''; openComputer(); };
    lki.querySelectorAll('.tab').forEach((t) => { t.onclick = () => { view = t.dataset.v; pageAt = performance.now(); openComputer(); if (view === 'web' && L && L.bars < 2) setTimeout(() => lki.classList.contains('on') && view === 'web' && openComputer(), 2700); }; });
    lki.querySelectorAll('.nets > button').forEach((b) => { b.onclick = () => {
      const ssid = b.dataset.s, saved = net?.known()[ssid];
      if (saved && net.join(current.key, ssid, saved).ok) { wifiOpen = false; toast(`Connected to ${ssid}.`, 1800); openComputer(); return; }
      joining = ssid; wifiErr = ''; openComputer(); setTimeout(() => lki.querySelector('.pw input')?.focus(), 30);
    }; });
    const pw = lki.querySelector('.pw input');
    const tryJoin = () => {
      const r = net.join(current.key, joining, pw.value);
      if (!r.ok) { wifiErr = r.why; openComputer(); setTimeout(() => lki.querySelector('.pw input')?.focus(), 30); return; }
      toast(`Connected to ${joining}. The laptop will remember it.`, 2400); sfx('arrive'); wifiOpen = false; joining = null; openComputer();
    };
    if (pw) { lki.querySelector('.join').onclick = tryJoin; pw.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); tryJoin(); } }; }
    lki.querySelector('.p').onclick = () => {
      const now = net?.link;
      pushed = now ? `$ git push origin main\n${now.bars < 2 ? 'Writing objects: 100% (slowly, on the district Wi-Fi)\n' : ''}This desk is a preview. Real pushes count when GitHub verifies them, wherever you work.`
        : "$ git push origin main\nfatal: unable to access 'https://github.com/': Could not resolve host: github.com\n(no Wi-Fi: click Wi-Fi at the top left)";
      view = 'code'; openComputer();
    };
  }
  function closeComputer() { lki.classList.remove('on'); }

  function build(key) {
    const P = PLACES[key];
    const rng = mulberry32(P.seed);
    const g = new THREE.Group();
    g.position.copy(ORIGIN);
    g.visible = false;
    const mat = (c, r = 0.7, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const M = {
      floor: mat(P.floor, 0.35), wall: mat(0xd9d2c3, 0.85), trim: mat(P.accent, 0.6), wood: mat(0x8a5a36, 0.6), woodL: mat(0xc9a27a, 0.6),
      metal: mat(0x3a3f48, 0.4, 0.6), dark: mat(0x1d2028, 0.5), fabric: mat(0x3f5a6a, 0.95), fabric2: mat(P.accent, 0.95),
      glass: new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.05, transparent: true, opacity: 0.25 }),
      leaf: mat(0x2f6b2c, 0.8), pot: mat(0xb8b0a0, 0.9),
      warm: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.3, 0.6) }),
      sky: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.75, 1.0) }),
    };
    const add = (geo, m, cast = true) => { const o = new THREE.Mesh(geo, m); g.add(o); return o; };
    const colliders = []; // [x0, z0, x1, z1] in interior space
    const block = (x, z, w, d) => colliders.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);

    // shell: floor, ceiling, walls, teal trim, a glass front onto the street with real daylight behind it
    add(box(W, 0.1, D, 0, -0.05, 0), M.floor);
    add(box(W, 0.1, D, 0, H + 0.05, 0), M.wall);
    add(mergeGeometries([box(W, H, 0.2, 0, H / 2, -D / 2), box(0.2, H, D, -W / 2, H / 2, 0), box(0.2, H, D, W / 2, H / 2, 0),
      box(W / 2 - 3, H, 0.2, -W / 4 - 1.5, H / 2, D / 2)]), M.wall);
    add(mergeGeometries([box(W, 0.12, 0.25, 0, H - 0.1, -D / 2 + 0.05), box(0.25, 0.12, D, -W / 2 + 0.05, H - 0.1, 0), box(0.25, 0.12, D, W / 2 - 0.05, H - 0.1, 0), box(W, 0.3, 0.22, 0, 0.15, -D / 2 + 0.1)]), M.trim);
    const window = add(box(W / 2 - 1, H - 0.8, 0.05, W / 4 + 0.5, H / 2, D / 2 - 0.05), M.sky);
    add(box(W / 2 - 1, H - 0.8, 0.08, W / 4 + 0.5, H / 2, D / 2 - 0.12), M.glass);
    [[0, -D / 2, W, 0.4], [-W / 2, 0, 0.4, D], [W / 2, 0, 0.4, D], [-W / 4 - 1.5, D / 2, W / 2 - 3, 0.4], [W / 4 + 0.5, D / 2, W / 2 - 1, 0.4]].forEach(([x, z, w, d]) => block(x, z, w, d));
    // the door: 2 m wide, between the wall and the glass (bible 4.1)
    const door = { x: -1.5, z: D / 2 - 1.2 };

    // reception and the hub board
    add(box(3.2, 1.05, 0.8, -6, 0.525, D / 2 - 3), M.woodL); block(-6, D / 2 - 3, 3.2, 0.8);
    add(box(3.3, 0.06, 0.9, -6, 1.08, D / 2 - 3), M.trim);
    const boardTex = canvasTex(512, 256, (x, w, h) => {
      x.fillStyle = '#2b4a5a'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#f4ead2'; x.font = '900 34px "Arial Black", Impact, sans-serif'; x.fillText(P.name.toUpperCase(), 20, 48);
      x.font = '20px Arial'; ['Demo night: Thursday 7pm', key === 'studio' ? 'Wi-Fi: see your card' : `Wi-Fi ${net?.NETS?.[key]?.ssid || ''}`, 'Rust study group: room 2', key === 'studio' ? 'Design crit: Saturday' : `pass: ${net?.NETS?.[key]?.pass || 'ask'}`].forEach((t, i) => {
        x.fillStyle = ['#f7e27a', '#a8e0d0', '#f6a8a0', '#f9f3e3'][i]; x.fillRect(20 + (i % 2) * 245, 80 + Math.floor(i / 2) * 85, 225, 70);
        x.fillStyle = '#2b241d'; x.fillText(t, 30 + (i % 2) * 245, 120 + Math.floor(i / 2) * 85);
      });
    });
    add(new THREE.PlaneGeometry(3.2, 1.6).rotateY(Math.PI).translate(-9, 1.9, D / 2 - 0.12), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.8 }));

    // hot desks: rows of desks with monitors and chairs, instanced
    const desks = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) desks.push({ x: -10 + col * 2.6, z: -5 + row * 3.0 });
    const deskGeo = { top: box(1.4, 0.05, 0.7, 0, 0.75, 0), legs: mergeGeometries([box(0.05, 0.75, 0.6, -0.65, 0.375, 0), box(0.05, 0.75, 0.6, 0.65, 0.375, 0)]),
      monitor: mergeGeometries([box(0.6, 0.36, 0.03, 0, 1.1, -0.25), box(0.05, 0.2, 0.05, 0, 0.88, -0.25)]),
      chair: mergeGeometries([box(0.5, 0.06, 0.5, 0, 0.46, 0.55), box(0.5, 0.5, 0.06, 0, 0.75, 0.8), box(0.06, 0.45, 0.06, 0, 0.22, 0.55)]) };
    const inst = (geo, m, list) => {
      const im = new THREE.InstancedMesh(geo, m, list.length);
      const mm = new THREE.Matrix4();
      list.forEach((d, i) => im.setMatrixAt(i, mm.makeTranslation(d.x, 0, d.z)));
      g.add(im);
      return im;
    };
    inst(deskGeo.top, M.woodL, desks); inst(deskGeo.legs, M.metal, desks); inst(deskGeo.monitor, M.dark, desks); inst(deskGeo.chair, M.fabric, desks);
    desks.forEach((d) => block(d.x, d.z, 1.4, 0.7));
    // a lit screen on every desk someone is using
    const screenMat = new THREE.MeshBasicMaterial({ map: codeScreen(SNIPPET) });
    const used = new Set();
    desks.forEach((d, i) => { if (rng() < 0.45) used.add(i); });
    const screens = desks.filter((_, i) => used.has(i));
    inst(new THREE.PlaneGeometry(0.56, 0.32).translate(0, 1.1, -0.23), screenMat, screens);

    // people working, unnamed (ambient), seated at the used desks
    const people = [];
    const shirts = ['#3a8f6d', '#2d3f66', '#c25b4a', '#e0c36a', '#5a7fb0', '#d9d2c3', '#8a5aa0'];
    [...used].slice(0, 6).forEach((i, k) => {
      const av = createAvatarModel({ color: shirts[k % shirts.length], style: k % 2 ? 'hoodie' : 'jacket' });
      dress(av.root, lookFor(`${key}-desk-${i}`, { fem: k % 2 === 1, tier: 1 }));
      av.root.position.set(desks[i].x, -0.42, desks[i].z + 0.55);
      av.root.rotation.y = Math.PI;
      g.add(av.root); people.push(av);
    });

    // focus pods
    [[9, -7], [11.6, -7]].forEach(([x, z]) => {
      add(mergeGeometries([box(2.2, 2.4, 0.08, x, 1.2, z - 1.0), box(0.08, 2.4, 2.0, x - 1.1, 1.2, z), box(0.08, 2.4, 2.0, x + 1.1, 1.2, z)]), M.fabric2);
      add(box(1.2, 0.05, 0.6, x, 0.75, z - 0.6), M.woodL);
      block(x, z - 0.5, 2.2, 1.2);
    });

    // meeting room: glass walls, a long table
    add(mergeGeometries([box(6, 2.6, 0.06, 7, 1.3, -1.5), box(0.06, 2.6, 4, 4, 1.3, 0.5)]), M.glass);
    add(box(3.6, 0.06, 1.2, 7.5, 0.75, 0.6), M.wood);
    add(mergeGeometries([box(0.08, 0.72, 1.0, 6, 0.36, 0.6), box(0.08, 0.72, 1.0, 9, 0.36, 0.6)]), M.metal);
    block(7.5, 0.6, 3.6, 1.2); block(7, -1.5, 6, 0.3); block(4, -0.5, 0.3, 2);

    // cafeteria: counter, coffee machine, fridge, menu, round tables
    add(box(5, 1.05, 0.8, 8, 0.525, 5.2), M.wood); block(8, 5.2, 5, 0.8);
    add(box(5.1, 0.06, 0.9, 8, 1.08, 5.2), M.trim);
    add(box(0.5, 0.6, 0.45, 6.5, 1.4, 5.1), M.metal);
    add(box(0.9, 1.9, 0.7, 11.8, 0.95, 5.4), M.metal); block(11.8, 5.4, 0.9, 0.7);
    const menuTex = canvasTex(512, 256, (x, w, h) => {
      x.fillStyle = '#1d2028'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#f2b33d'; x.font = '900 32px "Arial Black", sans-serif'; x.fillText('CAFETERIA', 20, 44);
      x.fillStyle = '#eef2ff'; x.font = '22px Arial';
      ['Zobo', 'Chapman', 'Coffee', 'Puff-puff', 'Jollof and plantain'].forEach((t, i) => x.fillText(t, 24 + (i % 2) * 250, 92 + Math.floor(i / 2) * 50));
      x.fillStyle = '#a3afd0'; x.font = '16px Arial'; x.fillText('Free for builders today', 24, 236);
    });
    add(new THREE.PlaneGeometry(2.6, 1.3).rotateY(Math.PI).translate(8, 2.5, D / 2 - 0.12), new THREE.MeshBasicMaterial({ map: menuTex }));
    const tables = [{ x: 4, z: 3.6 }, { x: 6.2, z: 2.4 }, { x: 10.8, z: 2.6 }];
    inst(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 16).translate(0, 0.75, 0), M.woodL, tables);
    inst(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8).translate(0, 0.375, 0), M.metal, tables);
    tables.forEach((t) => block(t.x, t.z, 0.9, 0.9));
    const barista = createAvatarModel({ color: '#2a9d94', style: 'jacket' });
    barista.root.position.set(8.4, 0, 6.1); barista.root.rotation.y = Math.PI; g.add(barista.root); people.push(barista);

    // lounge: sofa, plants
    add(mergeGeometries([box(2.6, 0.45, 0.9, -9, 0.225, 5), box(2.6, 0.5, 0.2, -9, 0.7, 5.4)]), M.fabric2); block(-9, 5, 2.6, 0.9);
    [[-12, 7.5], [11.8, -8], [-12, -8], [3, 7.6]].forEach(([x, z]) => {
      add(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 10).translate(x, 0.25, z), M.pot);
      add(new THREE.IcosahedronGeometry(0.55, 0).translate(x, 1.0, z), M.leaf);
      block(x, z, 0.6, 0.6);
    });

    // pendant lights: warm practicals and a few real lights
    const pend = [];
    for (let x = -9; x <= 9; x += 6) for (let z = -4; z <= 4; z += 4) pend.push({ x, z });
    inst(new THREE.CylinderGeometry(0.18, 0.28, 0.2, 12).translate(0, H - 0.6, 0), M.warm, pend);
    const lights = [];
    [[-6, -2], [3, -2], [8, 4], [-8, 4]].forEach(([x, z]) => { const l = new THREE.PointLight(0xffc27a, 22, 14, 1.6); l.position.set(x, H - 0.7, z); g.add(l); lights.push(l); });
    const hemi = new THREE.HemisphereLight(0xdfe6ff, 0x4a3f35, 0.9); g.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1dc, 0); sun.position.set(6, 8, 14); g.add(sun);

    // what you can do here
    const interact = [
      { id: 'in:exit', label: `Leave ${P.name}`, x: door.x, z: door.z + 0.6, r: 2.2 },
      { id: 'in:board', label: 'Read the hub board', x: -9, z: D / 2 - 2, r: 2.2 },
      { id: 'in:cafe', label: 'Order at the counter', x: 8, z: 4.2, r: 2.4 },
      { id: 'in:meet', label: 'Book the meeting room', x: 5, z: 1.5, r: 2.2 },
      ...desks.map((d, i) => (used.has(i) ? null : { id: `in:desk:${i}`, label: 'Sit at this desk', x: d.x, z: d.z + 1.0, r: 1.3, desk: d })).filter(Boolean),
    ];

    // and what makes this place itself (decor.js)
    const own = decorate(key, { g, block, interact, H });
    scene.add(g);
    return { key, group: g, colliders, interact, door, window, sun, people, desks, tick: own?.tick };
  }

  // ---------- a home: what you see when someone who lives here invites you in ----------
  function buildHome() {
    const HW = 12, HD = 9, HH = 3.0;
    const g = new THREE.Group(); g.position.copy(ORIGIN); g.visible = false;
    const mat = (c, r = 0.7, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const M = { floor: mat(0x9c6b45, 0.45), wall: mat(0xefe3cc, 0.9), accent: mat(0x2a6f6a, 0.9), wood: mat(0x7a4a2a, 0.6), woodL: mat(0xc9a27a, 0.6), sofa: mat(0xb5523b, 0.95), chair: mat(0xe0b44a, 0.95),
      metal: mat(0xd8d8d8, 0.35, 0.4), dark: mat(0x1d2028, 0.5), rug: mat(0xe0c36a, 0.95), leaf: mat(0x2f6b2c, 0.8), pot: mat(0xb8b0a0, 0.9),
      sky: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.75, 1.0) }), screen: new THREE.MeshBasicMaterial({ color: 0x3a6ea5 }), warm: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.3, 0.6) }) };
    const add = (geo, m) => { const o = new THREE.Mesh(geo, m); g.add(o); return o; };
    const colliders = [], block = (x, z, w, d) => colliders.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
    // the room: floor, ceiling, walls, a patterned feature wall behind the sofa, a window on the street
    add(box(HW, 0.1, HD, 0, -0.05, 0), M.floor); add(box(HW, 0.1, HD, 0, HH + 0.05, 0), M.wall);
    add(mergeGeometries([box(HW, HH, 0.2, 0, HH / 2, -HD / 2), box(0.2, HH, HD, -HW / 2, HH / 2, 0), box(0.2, HH, HD, HW / 2, HH / 2, 0), box(1.9, HH, 0.2, -5.05, HH / 2, HD / 2), box(HW - 4.2, HH, 0.2, 2.1, HH / 2, HD / 2)]), M.wall);
    const ankara = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#2a6f6a'; x.fillRect(0, 0, w, h); const cols = ['#e0b44a', '#b5523b', '#f4ead2', '#1d3b3a']; for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) { x.fillStyle = cols[(i + j) % 4]; x.beginPath(); x.arc(16 + i * 32, 16 + j * 32, 9, 0, Math.PI * 2); x.fill(); x.fillStyle = cols[(i + j + 2) % 4]; x.fillRect(12 + i * 32, 12 + j * 32, 8, 8); } });
    add(new THREE.PlaneGeometry(5.2, HH - 0.2).translate(-2.2, HH / 2, -HD / 2 + 0.11), new THREE.MeshStandardMaterial({ map: ankara, roughness: 0.9 }));
    const window = add(box(2.6, 1.4, 0.05, 3.2, 1.6, HD / 2 - 0.12), M.sky);
    [[0, -HD / 2, HW, 0.4], [-HW / 2, 0, 0.4, HD], [HW / 2, 0, 0.4, HD], [-5.05, HD / 2, 1.9, 0.4], [2.1, HD / 2, HW - 4.2, 0.4]].forEach(([x, z, w, d]) => block(x, z, w, d));
    const door = { x: -3.5, z: HD / 2 - 1.0 };
    add(box(1.3, 2.3, 0.08, -3.5, 1.15, HD / 2 + 0.02), M.wood);
    // the living room: rug, sofa, armchair, coffee table, the TV on its stand
    add(box(3.4, 0.02, 2.4, -2.2, 0.01, -2.2), M.rug);
    add(mergeGeometries([box(2.8, 0.45, 0.9, -2.2, 0.225, -3.7), box(2.8, 0.55, 0.22, -2.2, 0.72, -4.1), box(0.22, 0.6, 0.9, -3.5, 0.3, -3.7), box(0.22, 0.6, 0.9, -0.9, 0.3, -3.7)]), M.sofa); block(-2.2, -3.8, 2.8, 1.0);
    add(mergeGeometries([box(0.9, 0.45, 0.9, -4.9, 0.225, -1.8), box(0.22, 0.55, 0.9, -5.25, 0.72, -1.8)]), M.chair); block(-4.9, -1.8, 0.9, 0.9);
    add(box(1.2, 0.4, 0.6, -2.2, 0.2, -2.1), M.wood); block(-2.2, -2.1, 1.2, 0.6);
    add(box(1.8, 0.5, 0.45, -2.2, 0.25, 0.4), M.wood); block(-2.2, 0.4, 1.8, 0.45);
    add(box(1.4, 0.8, 0.06, -2.2, 0.95, 0.42), M.dark); add(new THREE.PlaneGeometry(1.3, 0.7).rotateY(Math.PI).translate(-2.2, 0.95, 0.38), M.screen);
    // family photos above the sofa
    [[-3.3, 1.9, 0.5, 0.6, 0xe0b44a], [-2.5, 2.0, 0.7, 0.5, 0xf4ead2], [-1.6, 1.85, 0.45, 0.55, 0xb5523b], [-0.9, 2.05, 0.4, 0.4, 0x8fbf5a]].forEach(([x, y, w, h, c]) => { add(box(w + 0.08, h + 0.08, 0.04, x, y, -HD / 2 + 0.14), M.wood); add(box(w, h, 0.02, x, y, -HD / 2 + 0.17), mat(c, 0.8)); });
    // dining table and four chairs
    add(box(1.7, 0.06, 0.95, 2.6, 0.75, -2.4), M.woodL); add(mergeGeometries([box(0.06, 0.75, 0.06, 1.85, 0.375, -2.0), box(0.06, 0.75, 0.06, 3.35, 0.375, -2.0), box(0.06, 0.75, 0.06, 1.85, 0.375, -2.8), box(0.06, 0.75, 0.06, 3.35, 0.375, -2.8)]), M.wood);
    [[2.2, -1.6, 0], [3.0, -1.6, 0], [2.2, -3.2, Math.PI], [3.0, -3.2, Math.PI]].forEach(([x, z]) => add(mergeGeometries([box(0.45, 0.05, 0.45, x, 0.45, z), box(0.45, 0.5, 0.05, x, 0.7, z + (z > -2.4 ? 0.22 : -0.22))]), M.wood));
    block(2.6, -2.4, 2.0, 2.0);
    // the kitchen: counter, cooker, fridge
    add(box(0.75, 0.95, 3.6, 5.45, 0.475, -2.5), M.woodL); add(box(0.8, 0.05, 3.7, 5.45, 0.97, -2.5), M.metal); block(5.45, -2.5, 0.8, 3.7);
    add(box(0.6, 0.06, 0.6, 5.45, 1.02, -3.6), M.dark); add(box(0.75, 1.8, 0.7, 5.45, 0.9, 0.2), M.metal); block(5.45, 0.2, 0.8, 0.75);
    // plants, a standing lamp, the ceiling fan every Lagos living room has
    [[-5.4, -4.0], [4.6, 3.8], [-5.4, 3.6]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(0.28, 0.22, 0.45, 10).translate(x, 0.22, z), M.pot); add(new THREE.IcosahedronGeometry(0.5, 0).translate(x, 0.9, z), M.leaf); block(x, z, 0.6, 0.6); });
    add(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6).translate(-0.4, 0.8, -4.0), M.dark); add(new THREE.CylinderGeometry(0.18, 0.25, 0.3, 12).translate(-0.4, 1.65, -4.0), M.warm);
    const fan = new THREE.Group(); fan.position.set(0, HH - 0.35, -1.2);
    fan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), M.metal));
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(box(1.1, 0.02, 0.18, 0.62, 0, 0), M.woodL); b.rotation.y = (k / 3) * Math.PI * 2; fan.add(b); }
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6).translate(0, HH - 0.15, -1.2), M.metal); g.add(fan);
    [[-2.2, -1.5], [2.8, -2.2]].forEach(([x, z]) => { const l = new THREE.PointLight(0xffc27a, 14, 10, 1.6); l.position.set(x, HH - 0.5, z); g.add(l); });
    g.add(new THREE.HemisphereLight(0xfff1dc, 0x4a3f35, 0.85));
    const sun = new THREE.DirectionalLight(0xfff1dc, 0); sun.position.set(4, 6, 10); g.add(sun);
    scene.add(g);
    // the people who live here, placed for each visit
    const people = [];
    const room = { key: 'home', group: g, colliders, interact: [], door, window, sun, people, desks: [], W: HW, D: HD, H: HH, fan, host: null,
      setHost(h) {
        people.splice(0).forEach((p) => { p.root.removeFromParent(); p.dispose?.(); });
        room.host = h; room.lineAt = -1;
        if (!h.self) { const me = createAvatarModel({ color: h.color, style: h.style }); if (h.look) dress(me.root, h.look); me.root.position.set(1.6, 0, -1.2); me.root.rotation.y = 2.6; g.add(me.root); people.push(me); }
        if (h.spouse && !h.self) { const sp = createAvatarModel({ color: '#8a5aa0', style: 'classic' }); dress(sp.root, lookFor(h.spouse, { fem: !h.fem })); sp.root.position.set(-1.6, -0.42, -3.55); g.add(sp.root); people.push(sp); }
        (h.self ? [] : h.kids || []).filter((k) => !k.startsWith('baby')).slice(0, 2).forEach((k, i) => { const kid = createAvatarModel({ color: ['#f6a8a0', '#7fb3d5'][i], style: 'tee' }); kid.root.scale.setScalar(0.62); kid.root.position.set(-2.8 + i * 1.1, 0, -1.3); kid.root.rotation.y = Math.PI; g.add(kid.root); people.push(kid); });
        room.interact = h.self ? [
          { id: 'in:exit', label: 'Go out', x: door.x, z: door.z + 0.4, r: 1.8 },
          { id: 'in:rest', label: 'Put your feet up', x: -2.2, z: -2.9, r: 1.6 },
        ] : [
          { id: 'in:exit', label: `Leave ${h.first}'s home`, x: door.x, z: door.z + 0.4, r: 1.8 },
          { id: 'in:host', label: `Talk to ${h.first}`, x: 1.6, z: -1.2, r: 2.0 },
          { id: 'in:photos', label: 'Look at the family photos', x: -3.9, z: -2.6, r: 1.5 },
        ];
      },
    };
    return room;
  }

  // ---------- inside: walking, sitting, the laptop ----------
  let seated = null, laptop = null;
  const laptopMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.35, metalness: 0.6 });
  const laptopScreen = new THREE.MeshBasicMaterial({ map: codeScreen(SNIPPET) });

  function enter(key, host) {
    if (key === 'home' && host?.self) key = 'myhome'; // your own home is the seven-room house (rooms.js)
    const VENUE = { cafe: () => buildCafe({ ORIGIN, scene, onOrder }), gym: () => buildGym({ ORIGIN, scene, toast }), bank: () => buildBank({ ORIGIN, scene, toast, onTeller }) };
    if (!built[key]) built[key] = key === 'myhome' ? buildPlayerHome({ ORIGIN, scene, screenTex: laptopScreen.map }) : key === 'home' ? buildHome() : VENUE[key] ? VENUE[key]() : build(key);
    current = built[key];
    if (key === 'home' || key === 'myhome') current.setHost(host);
    fade.style.opacity = '1';
    return new Promise((res) => setTimeout(() => {
      current.group.visible = true;
      fade.style.opacity = '0';
      sfx('door');
      toast(key === 'cafe' ? 'Kofo Cafe. Order at the counter, or take a table and work. The Wi-Fi is on the menu board.' : key === 'gym' ? 'Yaba Fitness. Treadmills, weights, the bag. First visit is on the house.' : key === 'bank' ? 'Yaba Builders Bank. Join the queue for a teller, or ask about a loan.' : key === 'myhome' ? `Home sweet home: ${host.addr}. Living room, kitchen and bedroom at the front; your workspace, lab and studio at the back.` : key === 'home' ? `${host.first}'s home. ${host.pidgin ? 'Make yourself at home o.' : 'Make yourself at home.'}` : `${PLACES[key].name}. ${PLACES[key].kind}. Find a free desk, or grab something at the cafeteria.`, 4500);
      res({ x: ORIGIN.x + current.door.x, z: ORIGIN.z + current.door.z - 1.5, yaw: Math.PI });
    }, reduced ? 0 : 360));
  }

  function leave() {
    if (!current) return;
    stand();
    current.group.visible = false;
    current = null;
    closeComputer();
  }

  function sit(desk) {
    seated = desk;
    laptop?.removeFromParent();
    laptop = new THREE.Group();
    const base = new THREE.Mesh(box(0.34, 0.02, 0.24, 0, 0.785, 0.05), laptopMat);
    const lid = new THREE.Group();
    lid.position.set(0, 0.801, -0.07); // on top of the base (0.795), by half the lid's thickness
    lid.add(new THREE.Mesh(box(0.34, 0.22, 0.012, 0, 0.11, 0), laptopMat));
    lid.add(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19).translate(0, 0.11, 0.008), laptopScreen));
    // the hinge is at the back of the base (you sit at +z): open, the screen leans back away from you;
    // closed, it lies forward on the keyboard, screen down
    lid.rotation.x = LID_SHUT; // closed to begin with
    laptop.add(base, lid);
    laptop.position.set(desk.x, 0, desk.z);
    laptop.userData.lid = lid;
    current.group.add(laptop);
    return { x: ORIGIN.x + desk.x, z: ORIGIN.z + desk.z + 0.55, yaw: Math.PI };
  }
  function stand() { signOut(true); if (seated) seated.paid = false; seated = null; laptop?.removeFromParent(); laptop = null; closeComputer(); }
  const lidOpen = () => !!laptop && laptop.userData.lid.rotation.x < 1.0;
  // close the lid; it stays on the desk
  function closeLaptop() {
    closeComputer();
    if (!lidOpen()) return false;
    const lid = laptop.userData.lid; lid.userData.opening = false; lid.userData.closing = true;
    sfx('close'); toast('Laptop closed. E to open it again, Esc to pack up and leave.', 3000);
    return true;
  }
  // close the lid, slide the laptop into your bag, stand up: resolves when you are on your feet
  function packUp() {
    if (!seated) return Promise.resolve(false);
    closeComputer();
    const wasOpen = lidOpen();
    if (wasOpen) { const lid = laptop.userData.lid; lid.userData.opening = false; lid.userData.closing = true; }
    return new Promise((res) => setTimeout(() => { stand(); sfx('close'); toast('Laptop in your bag. See you next time.', 2200); res(true); }, wasOpen && !reduced ? 450 : 60));
  }

  // E inside: returns an action for the caller (walk out, sit, open laptop) or handles it here
  function use(px, pz) {
    if (!current) return null;
    const x = px - ORIGIN.x, z = pz - ORIGIN.z;
    if (seated) {
      if (desk) { if (desk.signedIn) openComputer(); else openLock(); return { handled: true }; }
      const lid = laptop.userData.lid;
      if (!lidOpen()) { lid.userData.closing = false; lid.userData.opening = true; toast('Laptop open. E to use it, F to close it, Esc to pack up and leave.', 3200); return { handled: true }; }
      openComputer();
      return { handled: true };
    }
    let best = null, bd = Infinity;
    current.interact.forEach((it) => { const d = Math.hypot(it.x - x, it.z - z); if (d < it.r && d < bd) { bd = d; best = it; } });
    if (!best) return null;
    if (best.id === 'in:exit') return { exit: true };
    if (best.id === 'in:host') { const h = current.host; const lines = h.pidgin ? ['You go take Zobo or Chapman? Siddon, make yourself comfortable.', `Abeg no mind the place. ${h.kids?.length ? `${h.kids[0]} scatter am this morning.` : 'Na small house but e sweet.'}`, `Me? I dey hustle: ${h.dream.toLowerCase()}.`] : ['Can I get you some Zobo? Or Chapman? Sit, sit.', `Sorry about the mess. ${h.kids?.length ? `${h.kids[0]} was busy this morning.` : 'It is small, but it is home.'}`, `My dream? ${h.dream}.`]; current.lineAt = ((current.lineAt ?? -1) + 1) % lines.length; toast(`${h.first}: "${lines[current.lineAt]}"`, 4500); return { handled: true }; }
    if (best.id === 'in:wardrobe') { dispatchEvent(new Event('bw:wardrobe')); return { handled: true }; }
    if (DECOR_LINES[best.id]) { const l = DECOR_LINES[best.id]; toast(l[Math.floor(Math.random() * l.length)], 3400); return { handled: true }; }
    if (HOME_LINES[best.id]) { const l = HOME_LINES[best.id]; toast(l[Math.floor(Math.random() * l.length)], 3200); return { handled: true }; }
    if (best.id === 'in:rest') { toast(['Home sweet home.', 'The fan hums. Yaba is loud outside and quiet in here.', 'You could get used to this.'][Math.floor(Math.random() * 3)], 3000); return { handled: true }; }
    if (best.id === 'in:photos') { const h = current.host; toast(`Family photos: ${[h.spouse && `${h.first} and ${h.spouse} on their wedding day`, h.kids?.length && `${h.kids.join(' and ')}`, 'a beach day at Elegushi', 'a graduation in Akoka'].filter(Boolean).join(', ')}.`, 5200); return { handled: true }; }
    if (best.id === 'in:board') { const n = net?.NETS?.[current.key]; toast(`Demo night is Thursday at 7pm. ${current.key === 'studio' ? 'Members\' Wi-Fi is on your membership card.' : n ? `Wi-Fi ${n.ssid}, password ${n.pass}.` : ''}`, 5200); return { handled: true }; }
    if (best.id === 'in:cafe') { const items = ['Zobo', 'Chapman', 'coffee', 'puff-puff', 'jollof and plantain']; toast(`Your ${items[Math.floor(Math.random() * items.length)]} is ready at the counter. Free for builders today.`); return { handled: true }; }
    if (best.id === 'in:meet') { toast('Meeting room booked for 30 minutes. Voice rooms arrive with multiplayer.'); return { handled: true }; }
    if (best.use) { best.use(); return { handled: true }; }
    if (best.desk) return { sit: sit(best.desk) };
    return null;
  }

  function prompt(px, pz) {
    if (!current) return null;
    if (seated) return desk ? 'Use the desk computer' : lidOpen() ? 'Use your computer' : 'Open your laptop';
    const x = px - ORIGIN.x, z = pz - ORIGIN.z;
    let best = null, bd = Infinity;
    current.interact.forEach((it) => { const d = Math.hypot(it.x - x, it.z - z); if (d < it.r && d < bd) { bd = d; best = it; } });
    return best?.label || null;
  }

  // collisions inside: walls and furniture as boxes, the player as a circle
  function resolve(pos, rad = 0.45) {
    if (!current) return;
    const x = pos.x - ORIGIN.x, z = pos.z - ORIGIN.z;
    const RW = current.W ?? W, RD = current.D ?? D;
    let nx = Math.max(-RW / 2 + rad + 0.2, Math.min(RW / 2 - rad - 0.2, x)), nz = Math.max(-RD / 2 + rad + 0.2, Math.min(RD / 2 - rad - 0.2, z));
    current.colliders.forEach(([x0, z0, x1, z1]) => {
      const cx = Math.max(x0, Math.min(x1, nx)), cz = Math.max(z0, Math.min(z1, nz));
      const dx = nx - cx, dz = nz - cz, d = Math.hypot(dx, dz);
      if (d < rad) {
        if (d > 1e-4) { nx = cx + (dx / d) * rad; nz = cz + (dz / d) * rad; } else {
          const l = nx - x0, r = x1 - nx, t = nz - z0, b = z1 - nz, m = Math.min(l, r, t, b);
          if (m === l) nx = x0 - rad; else if (m === r) nx = x1 + rad; else if (m === t) nz = z0 - rad; else nz = z1 + rad;
        }
      }
    });
    pos.x = nx + ORIGIN.x; pos.z = nz + ORIGIN.z;
  }
  function solidAt(x, y, z) {
    if (!current) return false;
    const lx = x - ORIGIN.x, lz = z - ORIGIN.z;
    return y > (current.H ?? H) - 0.2 || Math.abs(lx) > (current.W ?? W) / 2 - 0.3 || Math.abs(lz) > (current.D ?? D) / 2 - 0.3;
  }

  function update(dt, t) {
    if (!current) return;
    if (current.fan && !reduced) current.fan.rotation.y += dt * 4;
    current.tick?.(dt, t);
    const env = getEnv?.() || { day: 1 };
    // the window shows the real sky: bright by day, deep blue at night
    current.window.material.color.setRGB(0.15 + 0.75 * env.day, 0.22 + 0.7 * env.day, 0.45 + 0.6 * env.day);
    current.sun.intensity = 1.6 * env.day;
    if (laptop?.userData.lid.userData.opening) {
      const lid = laptop.userData.lid;
      lid.rotation.x = Math.max(LID_OPEN, lid.rotation.x - dt * (reduced ? 100 : 3));
      if (lid.rotation.x <= LID_OPEN) lid.userData.opening = false;
    }
    if (laptop?.userData.lid.userData.closing) {
      const lid = laptop.userData.lid;
      lid.rotation.x = Math.min(LID_SHUT, lid.rotation.x + dt * (reduced ? 100 : 4));
      if (lid.rotation.x >= LID_SHUT) lid.userData.closing = false;
    }
  }

  return {
    enter, leave, use, prompt, resolve, solidAt, update, stand, closeComputer, closeLaptop, packUp, useDesk, signOut: () => signOut(), get deskOn() { return !!desk; }, deskFee, get member() { return member(); }, get lidOpen() { return lidOpen(); },
    get active() { return !!current; }, get seated() { return !!seated; }, get room() { return current; }, origin: ORIGIN, get computerOpen() { return lki.classList.contains('on'); },
    dispose() { Object.values(built).forEach((b) => { b.people.forEach((p) => p.dispose()); b.group.traverse((o) => o.geometry?.dispose()); b.group.removeFromParent(); }); fade.remove(); screen.remove(); },
  };
}
