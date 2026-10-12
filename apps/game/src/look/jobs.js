import { nameFor } from './knowledge.js';
import * as THREE from 'three';
import { createAvatarModel } from '../onboarding/avatar.js';
import { rigAvatar } from './anim.js';
import { prepareLook, dress, lookFor } from './style.js';
import { walletEngine, effortsMark, fmt } from './wallet.js';
import { sfx } from './audio.js';
import { C, FONT } from './uikit.js';
import { cityInfo } from './cityinfo.js';
import { JOBS, REPAIRS, GITS, DESIGNS, TICKETS, SHIFT, REFRESH_MIN, markDesign, designPay, shiftPay, gitRight, canWork, tally } from './jobdata.js';

// Jobs in the world (jobdata.js has the work itself). People with something for a builder to do stand in public places,
// a briefcase over their heads while they have it: a shopkeeper whose laptop is playing up, a stall owner who wants a
// website, a student at the hub whose push keeps failing, the bank manager short of someone on the IT help desk. Now and
// then a phone is snatched near you: photograph the thief and report it, on your phone or at the police station.
// Each job is a short panel with real choices; the pay goes into the wallet, a little reputation with it.

const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } } };
const esc = (t) => String(t ?? '').replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));
const shuffle = (arr, seed = Math.random) => { const a = arr.map((v, i) => [v, i]); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(seed() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const NAMES = { Nigeria: ['Chidi', 'Amaka', 'Tunde', 'Bisi', 'Emeka', 'Ngozi', 'Femi', 'Kemi'], Kenya: ['Wanjiru', 'Otieno', 'Achieng', 'Kamau', 'Njeri', 'Mwangi'], Ghana: ['Kofi', 'Ama', 'Kwame', 'Akosua', 'Yaw', 'Efua'] };

const CSS = `
#lk-job { position: fixed; inset: 0; z-index: 36; display: none; place-items: center; background: rgba(20,16,12,.45); font-family: ${FONT}; color: ${C.ink}; }
#lk-job.on { display: grid; }
#lk-job .box { width: min(540px, calc(100vw - 32px)); max-height: calc(100vh - 40px); overflow-y: auto; box-sizing: border-box; padding: 22px 22px 18px; border-radius: 26px; background: ${C.paper}; box-shadow: 0 6px 0 rgba(59,42,32,.25), 0 30px 70px rgba(10,14,30,.35); }
#lk-job h3 { margin: 0; font: 800 23px/1.1 ${FONT}; } #lk-job .sub { color: ${C.ink2}; margin: 6px 0 12px; font: 600 14px/1.45 ${FONT}; } #lk-job .sub svg { display: inline-block; vertical-align: -2px; }
#lk-job .say { margin: 0 0 12px; padding: 10px 12px; border-radius: 14px; background: ${C.paper2}; font: 700 14px/1.4 ${FONT}; }
#lk-job .q { font: 800 16px/1.3 ${FONT}; margin: 4px 0 10px; }
#lk-job .ans { display: grid; gap: 8px; } #lk-job .ans button { width: 100%; text-align: left; border: 2px solid #e3d4b4; border-radius: 14px; padding: 11px 14px; background: #fffaf0; color: ${C.ink}; font: 700 14.5px/1.3 ${FONT}; cursor: pointer; }
#lk-job .ans button:hover, #lk-job .ans button:focus-visible { border-color: ${C.teal}; outline: none; } #lk-job .ans button.on { border-color: ${C.teal}; background: #e2f3ef; }
#lk-job .ans button.cmd { font: 700 13.5px/1.3 ui-monospace, Menlo, monospace; }
#lk-job .term { min-height: 64px; margin: 0 0 10px; padding: 10px 12px; border-radius: 12px; background: #1d2028; color: #a9dc8f; font: 600 13px/1.6 ui-monospace, Menlo, monospace; }
#lk-job .term i { color: #6b7380; font-style: normal; }
#lk-job .row { display: flex; gap: 8px; margin-top: 12px; } #lk-job .row button { flex: 1 1 0; border: 0; border-radius: 999px; padding: 12px; font: 800 15px/1 ${FONT}; cursor: pointer; }
#lk-job .go { background: ${C.teal}; color: #fff; } #lk-job .x { background: #eadfc6; color: ${C.ink}; } #lk-job .go:disabled { opacity: .45; cursor: default; }
#lk-job .prog { display: flex; gap: 6px; margin: 0 0 12px; } #lk-job .prog i { flex: 1; height: 6px; border-radius: 3px; background: #e3d4b4; } #lk-job .prog i.d { background: ${C.teal}; } #lk-job .prog i.w { background: ${C.coral}; }
#lk-job .site { margin: 4px 0 12px; border-radius: 14px; overflow: hidden; border: 2px solid #e3d4b4; font: 700 13px/1.3 ${FONT}; }
#lk-job .site .bar { padding: 6px 10px; background: #ece2cc; font: 600 11px/1 ui-monospace, Menlo, monospace; color: #7a6552; }
#lk-job .site .pg { padding: 14px; min-height: 90px; } #lk-job .site .pg b { display: block; font: 800 18px/1.1 ${FONT}; margin-bottom: 6px; } #lk-job .site .pg .btn { display: inline-block; margin-top: 8px; padding: 7px 12px; border-radius: 999px; font: 800 12px/1 ${FONT}; }
#lk-job .ok { color: #2f8a4f; } #lk-job .bad { color: #b5523b; }
`;

export function createJobs({ world, scene, props, toast, passes, onRoute, reduced }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'lk-job'; el.setAttribute('role', 'dialog'); document.body.appendChild(el);
  el.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') close(); });
  const group = new THREE.Group(); group.name = 'jobs'; scene.add(group);
  const country = cityInfo().country || 'Nigeria', names = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => nameFor(`job-${i}`, i % 2 ? 'f' : 'm')?.first).filter(Boolean); // (named as people are here: look/knowledge.js)
  if (!names.length) names.push(...(NAMES[country] || NAMES.Nigeria));
  let state = store.get('bw-jobs', { done: {}, day: '', count: 0 });
  const save = () => store.set('bw-jobs', state);
  const now = () => Date.now();

  // ---------- the briefcase over someone with work ----------
  const markTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'); g.fillStyle = '#f2b33d'; g.strokeStyle = '#3b2a20'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#3b2a20'; g.beginPath(); g.roundRect(30, 46, 68, 44, 8); g.fill(); g.strokeStyle = '#3b2a20'; g.lineWidth = 6; g.beginPath(); g.roundRect(50, 34, 28, 16, 5); g.stroke(); g.fillStyle = '#f2b33d'; g.fillRect(58, 62, 12, 8); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const markMat = new THREE.SpriteMaterial({ map: markTex, depthTest: true });

  // ---------- where people with work stand: on open ground by a public place ----------
  const free = (x, z) => !world.onCarriageway?.(x, z, 0.5) && !world.onRail?.(x, z, 1) && !world.inPlot?.(x, z, 0.3) && !world.solidAt?.(x, 1, z) && !world.kitColliders?.some((k) => Math.hypot(k.cx - x, k.cz - z) < Math.max(k.hx || 0, k.hz || 0) + 0.6);
  // (clear of anything else you press E at, so E always means them)
  const clearOf = (x, z) => (props.interact || []).every((i) => Math.hypot(i.x - x, i.z - z) > (i.r || 2) + 2.6);
  const near = (a, used) => { for (let r = 3.5; r < 14; r += 0.7) for (let k = 0; k < 14; k++) { const ang = (k / 14) * Math.PI * 2 + r, x = a.x + Math.cos(ang) * r, z = a.z + Math.sin(ang) * r; if (free(x, z) && clearOf(x, z) && used.every((u) => Math.hypot(u.x - x, u.z - z) > 6) && (!world.nearestReachable || Math.hypot(world.nearestReachable(x, z).x - x, world.nearestReachable(x, z).z - z) < 1)) return { x, z }; } return null; };
  const shop = (props.interact || []).find((i) => i.id?.startsWith('shop:') && /Provision|Gadget|Print|Repair|MoMo|Money/i.test(i.name || '')) || (props.interact || []).find((i) => i.id?.startsWith('shop:'));
  const stall = (props.interact || []).find((i) => i.id?.startsWith('stall:')) || (props.interact || []).find((i) => i.id?.startsWith('truck:'));
  const board = (props.interact || []).find((i) => i.id === 'board');
  const anchors = [
    shop && { kind: 'repair', at: shop, where: shop.name, role: 'the shopkeeper', tier: 1 },
    stall && { kind: 'design', at: stall, where: stall.name, role: 'the owner', tier: 1 },
    (props.hubAt || board) && { kind: 'git', at: props.hubAt || board, where: props.hubAt ? 'the Creative Hub' : 'the community board', role: 'a student', tier: 2 },
    props.bankDoor && { kind: 'support', at: props.bankDoor, where: 'the bank', role: 'the branch manager', tier: 0 },
  ].filter(Boolean);
  const givers = [], used = [];
  anchors.forEach((a, i) => {
    const spot = near(a.at, used); if (!spot) return; used.push(spot);
    const fem = i % 2 === 1, name = names[(i * 3 + names.length) % names.length];
    const av = createAvatarModel({ color: '#888', style: 'tee' }); prepareLook(av.root); const rig = rigAvatar(av.root);
    dress(av.root, { ...lookFor(`job-${a.kind}-${name}`, { tier: a.tier, fem }), ...(a.kind === 'support' ? { top: 'jacket', topColor: '#2a6fb5' } : {}) }, rig);
    av.root.position.set(spot.x, 0, spot.z); av.root.rotation.y = Math.atan2(a.at.x - spot.x, a.at.z - spot.z) + Math.PI; group.add(av.root);
    // a laptop under the arm for the ones with computer trouble
    if (a.kind === 'repair' || a.kind === 'git') { const lap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.26), new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.4, metalness: 0.5 })); lap.position.set(0.32, 1.0, 0.1); lap.rotation.z = 1.2; av.root.add(lap); }
    const mark = new THREE.Sprite(markMat); mark.scale.set(0.55, 0.55, 1); mark.position.set(spot.x, 2.35, spot.z); group.add(mark);
    const it = { id: `gig:${a.kind}`, label: '', x: spot.x, z: spot.z, r: 2.4, name: `${name} (${JOBS[a.kind].title})` };
    props.interact.push(it);
    props.pois?.push({ kind: 'gig', name: `${JOBS[a.kind].title}: ${name}`, x: spot.x, z: spot.z });
    world.addColliders?.([{ name: 'job_giver', cx: spot.x, cz: spot.z, hx: 0.3, hz: 0.3, ry: 0, h: 1.8 }]);
    givers.push({ ...a, name, it, av, rig, mark, t: Math.random() * 10 });
  });
  const ready = (g) => now() - (state.done[g.kind] || 0) > REFRESH_MIN * 60000;
  const refreshLabels = () => givers.forEach((g) => { const on = ready(g); g.mark.visible = on; g.it.label = on ? `${g.name} has work for you: ${JOBS[g.kind].title} · ${fmt(JOBS[g.kind].pay)} Efforts` : `Talk to ${g.name}`; });
  refreshLabels();

  // ---------- the panel ----------
  let open = null;
  function show(html, focus = '.ans button, .go') { el.innerHTML = `<div class="box">${html}</div>`; el.classList.add('on'); el.querySelectorAll('.x').forEach((b) => { b.onclick = close; }); setTimeout(() => el.querySelector(focus)?.focus(), 30); }
  function close() { el.classList.remove('on'); open = null; if (el.contains(document.activeElement)) document.activeElement.blur(); }
  // the pay, the reputation, the day's tally, the job off the board for a while
  function paid(g, amount, line) {
    state = { ...state, ...tally(state), done: { ...state.done, [g.kind]: now() } }; save(); refreshLabels();
    if (amount > 0) { walletEngine().earn(amount, `${JOBS[g.kind].title} for ${g.name}`); sfx('arrive'); passes?.addRep?.(1, `helped ${g.name}`); dispatchEvent(new CustomEvent('bw:job', { detail: { kind: g.kind, amount } })); }
    show(`<h3>${amount > 0 ? 'Paid' : 'Not this time'}</h3><div class="sub">${line}</div>${amount > 0 ? `<div class="say">${effortsMark(16)} <b>${fmt(amount)} Efforts</b> are in your wallet.</div>` : ''}<div class="row"><button class="x">Done</button></div>`, '.x');
    if (amount > 0) toast?.(`+${fmt(amount)} Efforts from ${g.name}: ${JOBS[g.kind].title}.`, 2800);
  }
  const intro = (g, say, go) => {
    const cap = canWork(state);
    if (!cap.ok) { show(`<h3>${esc(g.name)}</h3><div class="say">"${esc(say)}"</div><div class="sub">You have done ${cap.left === 0 ? 'all your' : ''} jobs for today. Come back tomorrow: people will still need help.</div><div class="row"><button class="x">Okay</button></div>`, '.x'); return; }
    show(`<h3>${esc(JOBS[g.kind].title)}</h3><div class="sub">${esc(g.name)}, ${esc(g.role)} at ${esc(g.where)} · pays ${effortsMark(13)}${fmt(JOBS[g.kind].pay)}${g.kind === 'support' || g.kind === 'design' ? ' for good work' : ''} · ${cap.left} job${cap.left === 1 ? '' : 's'} left today</div><div class="say">"${esc(say)}"</div><div class="row"><button class="x">Not now</button><button class="go">${esc(JOBS[g.kind].verb)}</button></div>`, '.go');
    el.querySelector('.go').onclick = go;
  };

  // fixing a laptop: each step, one sensible check among the options
  function repair(g) {
    const R = REPAIRS[Math.floor(Math.random() * REPAIRS.length)];
    intro(g, R.problem, () => {
      let k = 0, wrong = 0;
      const step = () => {
        const s = R.steps[k], order = shuffle(s.a);
        show(`<h3>Fix a laptop</h3><div class="prog">${R.steps.map((_, i) => `<i class="${i < k ? 'd' : ''}"></i>`).join('')}</div><div class="say">"${esc(R.problem)}"</div><div class="q">${esc(s.q)}</div><div class="ans">${order.map(([t, i]) => `<button data-i="${i}">${esc(t)}</button>`).join('')}</div>${wrong ? '<div class="sub bad">That would not help. Think about the simplest check.</div>' : ''}`);
        el.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => { if (+b.dataset.i === s.ok) { sfx('tap'); k++; wrong = 0; if (k >= R.steps.length) { const pay = Math.max(800, JOBS.repair.pay - missed * 400); paid(g, pay, `${g.name}'s laptop works again. ${missed ? 'It took a few tries, so the tip is smaller.' : 'First time, every step.'}`); } else step(); } else { missed++; wrong = 1; step(); } }; });
      };
      let missed = 0; step();
    });
  }
  // helping someone push: build the commands in order
  function git(g) {
    const G = GITS[Math.floor(Math.random() * GITS.length)];
    intro(g, G.situation, () => {
      const pool = shuffle([...G.want, ...G.extra]).map(([t]) => t); let seq = [], tries = 0;
      const draw = (msg = '') => {
        show(`<h3>Help push their work</h3><div class="say">"${esc(G.situation)}"</div><div class="q">Run the commands in order</div><div class="term">${seq.length ? seq.map((c) => `$ ${esc(c)}`).join('<br>') : '<i>$ (pick the commands below)</i>'}</div><div class="ans">${pool.map((c, i) => `<button class="cmd" data-i="${i}" ${seq.includes(c) ? 'disabled' : ''}>${esc(c)}</button>`).join('')}</div>${msg}<div class="row"><button class="x">Leave it</button><button class="reset x" style="flex:.6">Clear</button><button class="go" ${seq.length ? '' : 'disabled'}>Run it</button></div>`);
        el.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => { seq.push(pool[+b.dataset.i]); sfx('tap'); draw(); }; });
        el.querySelector('.reset').onclick = (e) => { e.stopPropagation(); seq = []; draw(); };
        el.querySelector('.go').onclick = () => {
          if (gitRight(G, seq)) { paid(g, Math.max(1000, JOBS.git.pay - tries * 500), `It worked: their work is on GitHub. ${tries ? '' : 'Clean first run.'}`); return; }
          tries++; const bad = seq.find((c) => G.extra.includes(c)); seq = [];
          draw(`<div class="sub bad">${bad ? `"${esc(bad)}" would make things worse here.` : 'Not quite: right commands, wrong order, or one missing.'} Try again.</div>`);
        };
      };
      draw();
    });
  }
  // designing a website: three choices, and the page as it would look
  function design(g) {
    const D = DESIGNS[Math.floor(Math.random() * DESIGNS.length)], orders = D.choices.map((c) => shuffle(c.a)), picks = [];
    intro(g, `${D.brief} Can you design it? It's for ${D.name}.`, () => {
      const PAL = [['#2b2f33', '#f28c28', '#fff'], ['#f4f4f4', '#cfcfcf', '#999'], ['#e46f4f', '#2a9d94', '#f2b33d']];
      const draw = () => {
        const lay = picks[0] !== undefined ? D.choices[0].a[picks[0]][0] : 'Pick a layout', col = picks[1] ?? null, btn = picks[2] !== undefined ? D.choices[2].a[picks[2]][0] : '…';
        const p = col === null ? ['#fffaf0', '#3b2a20', '#3b2a20'] : col === 0 ? ['#2b2f33', '#f28c28', '#fff'] : col === 1 ? ['#f4f4f4', '#cfcfcf', '#9a9a9a'] : PAL[2];
        show(`<h3>Design a website</h3><div class="say">${esc(D.name)}: "${esc(D.brief)}"</div>
          <div class="site"><div class="bar">${esc(D.name.toLowerCase().replace(/[^a-z]+/g, ''))}.ng</div><div class="pg" style="background:${p[0]};color:${p[2]}"><b style="color:${p[1]}">${esc(D.name)}</b>${esc(lay)}<br><span class="btn" style="background:${p[1]};color:${p[0]}">${esc(btn)}</span></div></div>
          ${D.choices.map((c, ci) => `<div class="q">${esc(c.q)}</div><div class="ans">${orders[ci].map(([o, i]) => `<button data-c="${ci}" data-i="${i}" class="${picks[ci] === i ? 'on' : ''}">${esc(o[0])}</button>`).join('')}</div>`).join('')}
          <div class="row"><button class="x">Leave it</button><button class="go" ${picks.filter((v) => v !== undefined).length === 3 ? '' : 'disabled'}>Show ${esc(g.name)}</button></div>`, '.ans button');
        el.querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => { picks[+b.dataset.c] = +b.dataset.i; sfx('tap'); draw(); }; });
        el.querySelector('.go').onclick = () => { const s = markDesign(D, picks), pay = designPay(s, JOBS.design.pay); paid(g, pay, s >= 5 ? `${g.name} loves it: "That's exactly it!"` : s >= 3 ? `"It's good, but not quite what I asked for." Half the fee.` : `"That isn't what my customers need." Read the brief again next time.`); };
      };
      draw();
    });
  }
  // the bank's IT help desk: a shift of tickets, some of them scams
  function support(g) {
    intro(g, 'Our IT person is off sick and the queue is long. Can you take the help desk for a shift?', () => {
      const list = shuffle(TICKETS).slice(0, SHIFT).map(([t]) => t), res = [];
      const ask = (k) => {
        const t = list[k], order = shuffle(t.a);
        show(`<h3>IT help desk</h3><div class="prog">${list.map((_, i) => `<i class="${i < k ? (res[i] ? 'd' : 'w') : ''}"></i>`).join('')}</div><div class="sub">${esc(t.who)}</div><div class="say">${esc(t.issue)}</div><div class="ans">${order.map(([a, i]) => `<button data-i="${i}">${esc(a)}</button>`).join('')}</div>`);
        el.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => { res[k] = +b.dataset.i === t.ok; sfx('tap'); if (k + 1 < list.length) ask(k + 1); else { const right = res.filter(Boolean).length; paid(g, shiftPay(right, JOBS.support.pay), `${right} of ${SHIFT} tickets sorted${right === SHIFT ? ': a clean shift, with a bonus' : ''}.${list.some((q, i) => /OTP|phishing|password/i.test(q.issue + q.a[q.ok]) && !res[i]) ? ' Watch for scams: nobody ever needs an OTP or a password.' : ''}`); } }; });
      };
      ask(0);
    });
  }

  // ---------- a crime near you: photograph the thief, then report it ----------
  const police = (props.pois || []).find((q) => q.kind === 'police');
  let crime = null, nextCrime = 240 + Math.random() * 300, evidence = store.get('bw-evidence', null);
  const crimeIt = { id: 'gig:thief', label: 'Photograph the thief', x: 0, z: 1e6, r: 5 };
  props.interact.push(crimeIt);
  const reportIt = police ? { id: 'gig:police', label: 'Report the snatching at the police station', x: police.x, z: police.z, r: 0 } : null;
  if (reportIt) props.interact.push(reportIt);
  function startCrime(player) {
    if (!world.plan || !world.nearestReachable) return;
    // a victim beside you, a thief running off down the street
    const a = Math.random() * Math.PI * 2, from = world.nearestReachable(player.x + Math.cos(a) * 9, player.z + Math.sin(a) * 9); if (!from) return;
    const far = world.nearestReachable(player.x + Math.cos(a) * 140, player.z + Math.sin(a) * 140), path = far && world.plan(from, far);
    if (!path || path.length < 2) return;
    const av = createAvatarModel({ color: '#333', style: 'hoodie' }); prepareLook(av.root); const rig = rigAvatar(av.root);
    dress(av.root, { ...lookFor('thief', { tier: 2 }), top: 'hoodie', topColor: '#2b2f33' }, rig); av.root.position.set(from.x, 0, from.z); group.add(av.root);
    crime = { av, rig, path: path.map((p) => ({ x: p.x, z: p.z })), i: 1, t: 0, snapped: false };
    sfx('horn'); toast?.(`"Thief! He took my phone!" Someone in a dark hoodie is running off. Get close and press E to photograph him, then report it.`, 5200);
  }
  function endCrime() { if (!crime) return; crime.av.removeFromParent(); crime = null; crimeIt.z = 1e6; }
  function photograph() {
    if (!crime || crime.snapped) return false;
    crime.snapped = true; evidence = { at: now() }; store.set('bw-evidence', evidence); sfx('interact');
    const f = document.createElement('div'); f.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:40;opacity:.9;transition:opacity .5s;pointer-events:none'; document.body.appendChild(f); requestAnimationFrame(() => { f.style.opacity = '0'; }); setTimeout(() => f.remove(), 600);
    toast?.(`Got him on camera. Now report it: phone, Gigs, "Report to the police"${police ? `, or at ${police.name}` : ''}.`, 4200);
    setTimeout(endCrime, 2500);
    return true;
  }
  function report(where) {
    if (!evidence || now() - evidence.at > 30 * 60000) { toast?.('Nothing to report right now. If you see a crime, photograph it first.', 2600); return false; }
    evidence = null; store.set('bw-evidence', null);
    const g = { kind: 'report', name: where === 'station' ? (police?.name || 'the police') : 'the police' };
    state = { ...state, ...tally(state) }; save();
    walletEngine().earn(JOBS.report.pay, 'Reported a phone snatching'); passes?.addRep?.(2, 'reported a crime'); sfx('arrive');
    toast?.(`Reported, with your photo. The police thank you: +${fmt(JOBS.report.pay)} Efforts.`, 3600); void g;
    return true;
  }

  function use(it) {
    if (it.id === 'gig:thief') return photograph();
    if (it.id === 'gig:police') return report('station');
    const g = givers.find((q) => q.it === it); if (!g) return false;
    g.rig?.wave?.();
    if (!ready(g)) { const mins = Math.ceil((REFRESH_MIN * 60000 - (now() - state.done[g.kind])) / 60000); toast?.(`${g.name}: "Thank you again! Check back in ${mins} minute${mins === 1 ? '' : 's'}, I might have something else."`, 3000); return true; }
    open = g;
    ({ repair, git, design, support })[g.kind](g);
    return true;
  }
  // every frame: the people with work idle and look about, the briefcases bob, the thief runs
  let t = 0, labelT = 0;
  function update(dt, player, inside) {
    t += dt; labelT -= dt;
    if (labelT <= 0) { labelT = 5; refreshLabels(); if (reportIt) reportIt.r = evidence ? 4 : 0; }
    givers.forEach((g) => { g.t += dt; if (Math.hypot(player.x - g.it.x, player.z - g.it.z) < 50) g.rig?.update(dt * (reduced ? 0.5 : 1), { speed: 0, t: g.t }); g.mark.position.y = 2.35 + Math.sin(t * 2 + g.t) * 0.06; });
    if (!inside && !crime && (nextCrime -= dt) <= 0) { nextCrime = 420 + Math.random() * 480; startCrime(player); }
    if (crime) {
      crime.t += dt;
      const P = crime.path, a = crime.av.root.position, b = P[Math.min(crime.i, P.length - 1)], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), v = crime.snapped ? 0 : 3.1;
      if (d < 0.4) crime.i++; else { a.x += (dx / d) * v * dt; a.z += (dz / d) * v * dt; crime.av.root.rotation.y = Math.atan2(dx, dz); }
      crime.rig?.update(dt, { speed: v, running: true, t });
      crimeIt.x = a.x; crimeIt.z = a.z;
      if (crime.i >= P.length || crime.t > 45) { if (!crime.snapped) toast?.('The thief got away. Next time, get closer faster.', 2600); endCrime(); }
    }
  }
  const list = () => [...givers.filter(ready).map((g) => ({ kind: g.kind, title: JOBS[g.kind].title, who: g.name, where: g.where, pay: JOBS[g.kind].pay, x: g.it.x, z: g.it.z })), ...(evidence ? [{ kind: 'report', title: 'Report the snatching you photographed', who: 'the police', where: 'from your phone', pay: JOBS.report.pay, report: true }] : [])];
  return { use, update, list, report: () => report('phone'), close, get isOpen() { return el.classList.contains('on'); }, left: () => canWork(state).left, route: (j) => onRoute?.({ x: j.x, z: j.z }, j.who), givers, dispose() { group.removeFromParent(); el.remove(); st.remove(); }, startCrime };
}
