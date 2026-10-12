import * as THREE from 'three';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n));
const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ARROW = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

function status(b) {
  if (b.demoResident) return 'New arrival';
  if (b.live) return 'Working now';
  if (b.lastPush === 0) return 'Pushed today';
  if (b.lastPush > 60) return 'Dark';
  if (b.lastPush > 14) return `Dimmed · ${b.lastPush}d`;
  return `${b.lastPush}d ago`;
}

// Interface chrome. main.js passes handlers; this file only touches the DOM.
export function initChrome(h) {
  const el = {
    title: $('#b-title'), sub: $('#b-sub'), src: $('#src'), srcT: $('#src-t'),
    card: $('#card'), blist: $('#blist'), bbtn: $('#bbtn'), bcount: $('#bcount'),
    toast: $('#toast'), help: $('#help'), labels: $('#labels'),
  };
  let world = null;
  let labels = [];
  let shownId = null;
  let shownFull = false;
  let pinned = null;
  let dismissed = null;
  let toastTimer = 0;

  // ---- toolbar ----
  const segs = [...document.querySelectorAll('.seg button')];
  segs.forEach((b) => b.addEventListener('click', () => h.onView(b.dataset.view === 'aerial')));
  $('#btn-theme').addEventListener('click', () => h.onTheme());
  $('#btn-help').addEventListener('click', () => api.toggleHelp());

  // ---- dock: zoom taps, rotate holds ----
  $('#zin').addEventListener('click', () => h.onZoom(-1));
  $('#zout').addEventListener('click', () => h.onZoom(1));
  const hold = (id, name) => {
    const b = $(id);
    const on = (e) => { e.preventDefault(); h.setHold(name, true); };
    const off = () => h.setHold(name, false);
    b.addEventListener('pointerdown', on);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, off));
  };
  hold('#rotl', 'rotL');
  hold('#rotr', 'rotR');

  // ---- builders list ----
  el.bbtn.addEventListener('click', () => api.toggleList());
  el.blist.addEventListener('click', (e) => {
    const r = e.target.closest('.row');
    if (!r) return;
    api.toggleList(false);
    h.onGoto(r.dataset.id);
  });
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#builders')) api.toggleList(false);
    if (!e.target.closest('#help') && !e.target.closest('#btn-help')) api.toggleHelp(false);
  });

  // ---- plot card ----
  el.card.addEventListener('click', (e) => {
    if (e.target.closest('.x')) { dismissed = shownId; pinned = null; api.hideCard(); }
    else if (e.target.closest('.go')) h.onGoto(shownId);
    else if (e.target.closest('.more')) { const b = world.plots.find((p) => p.b.id === shownId)?.b; if (b) api.showCard(b, true); }
  });

  function cardHTML(b, full) {
    const on = b.lastPush <= 14;
    const chip = b.demoResident ? '<span class="chip">Local preview · unverified</span>' : b.live
      ? '<span class="chip live">Live now</span>'
      : `<span class="chip">${status(b)}</span>`;
    const ver = b.verified.map((v) => `<span class="chip ver">${CHECK}${esc(v)}</span>`).join('');
    const mrr = b.mrrPublic ? `<li class="r"><span>MRR</span><span>$${b.mrr.toLocaleString()}</span></li>` : '';
    return (
      `<div class="c-head"><div class="av ${on ? 'on' : ''}">${esc(initials(b.name))}</div>` +
      `<div><h3>${esc(b.name)}</h3><div class="tg">${esc(b.tagline)}</div></div>` +
      `<button class="ib x" aria-label="Close">${CLOSE}</button></div>` +
      `<div class="chips">${chip}${ver}</div>` +
      (full ? '' : `<button class="more">View details</button>`) +
      (!full ? '' : `<div class="stats">` +
      `<div class="stat"><b>${b.streak ? b.streak + 'd' : '–'}</b><span>Streak</span></div>` +
      `<div class="stat"><b>${b.consistency}/30</b><span>Consistency</span></div>` +
      `<div class="stat"><b>${fmt(b.stars)}</b><span>Stars</span></div></div>` +
      `<div class="sec"><h4>Today</h4><ul><li>${esc(b.today)}</li></ul></div>` +
      `<div class="sec"><h4>Last 30 days</h4><ul>${mrr}${b.month.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>` +
      `<div class="sec"><h4>Repos on this plot</h4><ul>${b.repoList.map(([n, s]) => `<li class="r"><span>${esc(n)}</span><span>${esc(s)}</span></li>`).join('')}</ul></div>` +
      `<button class="go">Go to plot ${ARROW}</button>`)
    );
  }

  const v = new THREE.Vector3();
  const api = {
    setWorld(w, via, place) {
      world = w;
      el.title.textContent = place.name;
      el.sub.textContent = `${place.city} · ${w.plots.length} plots · ${w.counts.buildings - w.plots.length} unclaimed`;
      const osm = w.source === 'osm';
      el.src.className = osm ? '' : 'warn';
      el.srcT.textContent = osm ? `OpenStreetMap · ${via === 'live' ? 'live' : via === 'cache' ? 'cached' : 'baked'}` : 'Sample layout';
      el.src.title = osm
        ? 'Footprints and streets come from OpenStreetMap.'
        : 'OpenStreetMap was not reachable, so this is a stand-in street grid.';

      const rows = w.plots.map((p) => p.b).sort((a, b) => a.lastPush - b.lastPush || a.handle.localeCompare(b.handle));
      el.bcount.textContent = rows.length;
      el.blist.innerHTML =
        '<h2>Builders in this district</h2>' +
        rows.map((b) => `<button class="row" data-id="${b.id}"><i class="d ${b.lastPush <= 14 ? '' : 'off'}"></i><span class="h">@${esc(b.handle)}</span><span class="st">${status(b)}</span></button>`).join('');

      el.labels.innerHTML = '';
      labels = [];
      const mk = (cls, html, pos, maxD) => {
        const d = document.createElement('div');
        d.className = `lbl ${cls}`;
        d.innerHTML = html;
        el.labels.appendChild(d);
        labels.push({ el: d, pos, maxD });
      };
      w.plots.forEach((p) => mk(p.b.lastPush <= 14 ? '' : 'off', `<i></i>@${esc(p.b.handle)}`, new THREE.Vector3(p.center.x, p.topY + 3.2, p.center.z), 120));
      w.monuments.forEach((m) => mk('mon', `<i></i>${esc(m.label)}`, new THREE.Vector3(m.x, m.topY + 6, m.z), 1e9));
      if (shownId) { const b = w.plots.find((p) => p.b.id === shownId); if (b) { shownId = null; api.showCard(b.b, !!pinned); } }
    },

    setView(aerial) {
      segs.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.view === 'aerial') === aerial)));
    },

    showCard(b, pin = false) {
      if (pin) pinned = b.id;
      const full = pinned === b.id;
      if (shownId === b.id && shownFull === full) return;
      shownId = b.id;
      shownFull = full;
      api.toggleList(false);
      el.card.innerHTML = cardHTML(b, full);
      el.card.classList.add('show');
    },
    hideCard() { shownId = null; shownFull = false; el.card.classList.remove('show'); },
    unpin() { pinned = null; if (shownId && shownFull) api.hideCard(); },

    toggleList(open) {
      const o = open ?? !el.blist.classList.contains('open');
      el.blist.classList.toggle('open', o);
      el.bbtn.setAttribute('aria-expanded', String(o));
      if (o) api.hideCard();
    },
    toggleHelp(open) {
      const o = open ?? !el.help.classList.contains('open');
      el.help.classList.toggle('open', o);
    },
    toast(msg, ms = 3200) {
      el.toast.textContent = msg;
      el.toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.toast.classList.remove('show'), ms);
    },

    update(camera, p, near = true) {
      const w = innerWidth, hgt = innerHeight;
      for (const l of labels) {
        v.copy(l.pos).project(camera);
        const d = camera.position.distanceTo(l.pos);
        const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && d < l.maxD;
        if (!vis) { l.el.style.opacity = 0; continue; }
        l.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * hgt}px) translate(-50%, -100%)`;
        l.el.style.opacity = l.maxD > 1e8 ? 0.9 : Math.max(0, Math.min(1, (l.maxD - d) / 40));
      }
      if (pinned || !world) return;
      if (!near) { if (shownId) api.hideCard(); return; }
      // walk up to a plot and its card appears; closing it keeps it closed until you leave
      let best = null, bd = Infinity;
      for (const pl of world.plots) {
        const dd = pl.dist(p.x, p.z);
        if (dd < bd) { bd = dd; best = pl; }
      }
      if (dismissed && (!best || best.b.id !== dismissed || bd > 14)) dismissed = null;
      if (best && bd < (shownId ? 14 : 8) && dismissed !== best.b.id && !el.blist.classList.contains('open')) api.showCard(best.b);
      else if (shownId && (!best || bd >= 14)) api.hideCard();
    },
  };
  return api;
}
