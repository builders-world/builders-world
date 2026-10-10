import * as THREE from 'three';
import { BUILDERS } from '../builders.js';
import { FONT } from './uikit.js';
import { sfx } from './audio.js';

// The profiler (world bible 11.6), Watch Dogs style: press P and the people around you get tags; the
// one nearest the middle of your view opens up into a profile. Residents show their lives (age, job,
// address, how they are doing, a fact from their week); the builders show their work; other players
// show only what they chose to share in Settings, Public profile (role, commits, socials, design work).

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const CSS = `
#lk-prof { position: fixed; inset: 0; pointer-events: none; z-index: 14; }
#lk-prof .tag { position: absolute; transform: translate(-50%, -100%); padding: 3px 8px 3px 6px; border-left: 3px solid #2ad1b8; background: rgba(16,20,24,.86); color: #e8f3f0; font: 700 11px/1.35 ${MONO}; white-space: nowrap; letter-spacing: .02em; }
#lk-prof .tag b { color: #fff; } #lk-prof .tag.focus { border-left-color: #f2c94c; }
#lk-prof .card { position: absolute; left: 14px; top: 186px; width: min(320px, calc(100vw - 28px)); padding: 14px 16px; background: rgba(16,20,24,.92); color: #e8f3f0; border: 1px solid rgba(42,209,184,.45); border-left: 4px solid #2ad1b8;
  font: 600 12.5px/1.5 ${MONO}; pointer-events: auto; box-shadow: 0 16px 40px rgba(0,0,0,.35); }
#lk-prof .card h3 { margin: 0 0 2px; font: 800 17px/1.2 ${FONT}; color: #fff; letter-spacing: .01em; } #lk-prof .card .k { color: #8fb8b0; }
#lk-prof .card .row { display: flex; justify-content: space-between; gap: 10px; border-top: 1px dashed rgba(143,184,176,.3); padding: 3px 0; } #lk-prof .card .row span:last-child { text-align: right; color: #fff; }
#lk-prof .card a { color: #2ad1b8; text-decoration: none; } #lk-prof .card .hint { margin-top: 8px; color: #8fb8b0; font-size: 11px; }
#lk-prof .scan { position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; transform: translate(-50%, -50%); border: 2px solid rgba(42,209,184,.7); border-radius: 50%; }
body.nohud #lk-prof, body.bw-cine #lk-prof { display: none; }
`;
const esc = (t) => String(t ?? '').replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));
const INCOME = ['comfortable', 'steady', 'getting by'];
const user = (v) => String(v || '').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 40); // usernames only, never a URL
const gh = (v) => String(v || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 39); // GitHub allows letters, digits, hyphens

export function createProfiler({ camera, lives, props, getOnline, toast }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const root = document.createElement('div'); root.id = 'lk-prof'; root.style.display = 'none'; document.body.appendChild(root);
  let on = false, focusKey = null, tick = 0;
  const tags = new Map(); // key -> element

  function subjects() {
    const out = [];
    (lives?.residents || []).forEach((r) => { if (r.obj.visible) out.push({ key: `r:${r.id}`, obj: r.obj, kind: 'resident', r }); });
    (props?.builders || []).forEach((b) => { const bd = BUILDERS.find((x) => x.name.split(' ')[0] === b.name); out.push({ key: `b:${b.name}`, obj: b.obj, kind: 'builder', name: b.name, bd }); });
    (getOnline?.()?.people?.() || []).forEach((p) => out.push({ key: `p:${p.id}`, obj: p.obj, kind: 'player', name: p.name, rec: p.rec }));
    return out;
  }
  const line = (s) => (s.kind === 'resident' ? `<b>${esc(s.r.name.toUpperCase())}</b> · ${esc(s.r.job)}` : s.kind === 'builder' ? `<b>${esc((s.bd?.name || s.name).toUpperCase())}</b> · ${esc(s.bd ? `${s.bd.repos} repos · ${s.bd.stars.toLocaleString()} stars` : 'builder')}` : `<b>${esc(s.name.toUpperCase())}</b> · ${esc(s.rec?.card?.role || 'builder, online now')}`);
  function profile(s) {
    const row = (k, v) => (v ? `<div class="row"><span class="k">${k}</span><span>${v}</span></div>` : '');
    if (s.kind === 'resident') {
      const r = s.r, e = r.events?.[r.events.length - 1];
      return `<h3>${esc(r.name)}</h3><div class="k">RESIDENT · ${esc(r.age)} · ${esc(r.trait)}</div>
        ${row('OCCUPATION', esc(r.job))}${row('LIVES', esc(r.home.addr || 'just off the main road'))}${row('INCOME', INCOME[r.tier ?? 1])}
        ${row('NOW', esc(r.doing || 'out and about'))}${row('FAMILY', esc(r.spouse ? `married to ${r.spouse}${r.kids.length ? `, ${r.kids.length} kid${r.kids.length > 1 ? 's' : ''}` : ''}` : r.kids.length ? `${r.kids.length} kid${r.kids.length > 1 ? 's' : ''}` : 'single'))}
        ${row('THIS WEEK', esc(e ? e.en(r, e.k) : `wants to ${r.dream.replace(/^./, (c) => c.toLowerCase())}`))}`;
    }
    if (s.kind === 'builder') {
      const b = s.bd;
      if (!b) return `<h3>${esc(s.name)}</h3><div class="k">BUILDER · YABA</div>${row('NOW', 'reading the community board')}`;
      return `<h3>${esc(b.name)}</h3><div class="k">BUILDER · ${esc(b.tagline)}</div>
        ${row('GITHUB', `<a href="https://github.com/${gh(b.handle)}" target="_blank" rel="noopener">@${esc(b.handle)}</a>`)}${row('REPOS', b.repos)}${row('STARS', b.stars.toLocaleString())}
        ${row('STREAK', `${b.streak} days`)}${row('VERIFIED', esc(b.verified.join(', ')))}${row('TODAY', esc(b.today))}`;
    }
    const c = s.rec?.card || {}, h = gh(s.rec?.handle);
    const socials = c.showSocials ? [c.x && `<a href="https://x.com/${user(c.x)}" target="_blank" rel="noopener">X @${esc(user(c.x))}</a>`, c.linkedin && `<a href="https://www.linkedin.com/in/${user(c.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`].filter(Boolean).join(' · ') : '';
    const design = c.showSocials ? [c.dribbble && `<a href="https://dribbble.com/${user(c.dribbble)}" target="_blank" rel="noopener">Dribbble</a>`, c.behance && `<a href="https://www.behance.net/${user(c.behance)}" target="_blank" rel="noopener">Behance</a>`].filter(Boolean).join(' · ') : '';
    return `<h3>${esc(s.name)}</h3><div class="k">BUILDER · ONLINE NOW</div>
      ${row('ROLE', esc(c.role))}${row('GITHUB', h ? `<a href="https://github.com/${h}" target="_blank" rel="noopener">@${esc(h)}</a>` : '')}
      ${row('COMMITS', c.showCommits && c.commits != null ? `${Number(c.commits).toLocaleString()} this year` : '')}${row('SOCIALS', socials)}${row('DESIGN', design)}${row('LIVES', esc(s.rec?.home || ''))}
      ${!c.role && !c.showSocials && !c.showCommits ? '<div class="hint">Keeps their profile private.</div>' : ''}`;
  }

  const v = new THREE.Vector3();
  function update(dt) {
    if (!on) return;
    tick -= dt; if (tick > 0) return; tick = 0.08;
    const list = subjects(), seen = new Set();
    let best = null, bd = Infinity;
    list.forEach((s) => {
      s.obj.getWorldPosition(v); const dist = v.distanceTo(camera.position); v.y += 2.35; v.project(camera);
      if (v.z > 1 || dist > 28 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) return;
      seen.add(s.key);
      let el = tags.get(s.key); if (!el) { el = document.createElement('div'); el.className = 'tag'; root.appendChild(el); tags.set(s.key, el); }
      el.innerHTML = line(s); el.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`; el.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
      const c = Math.hypot(v.x, v.y) + dist / 60; if (c < bd && dist < 22) { bd = c; best = s; }
    });
    tags.forEach((el, k) => { if (!seen.has(k)) { el.remove(); tags.delete(k); } else el.classList.toggle('focus', best && k === best.key); });
    let card = root.querySelector('.card');
    if (!best) { card?.remove(); focusKey = null; return; }
    if (!card) { card = document.createElement('div'); card.className = 'card'; root.appendChild(card); }
    if (focusKey !== best.key) { focusKey = best.key; sfx('tap'); }
    card.innerHTML = `${profile(best)}<div class="hint">P to close the profiler · aim at someone else to switch</div>`;
  }
  function toggle(force) {
    on = force ?? !on; root.style.display = on ? '' : 'none';
    if (!on) { tags.forEach((el) => el.remove()); tags.clear(); root.querySelector('.card')?.remove(); focusKey = null; }
    if (!root.querySelector('.scan')) { const sc = document.createElement('div'); sc.className = 'scan'; root.appendChild(sc); }
    toast?.(on ? 'Profiler on: aim at someone to see who they are. P to close.' : 'Profiler off', 1800);
    return on;
  }
  function dispose() { root.remove(); style.remove(); }
  return { update, toggle, get on() { return on; }, dispose };
}
