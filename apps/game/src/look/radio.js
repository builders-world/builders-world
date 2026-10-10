import { C, FONT } from './uikit.js';
import { STATIONS } from './radiostations.js';

// Radio on the phone (Elvis, 10 October 2026: "an open source radio app... the radio of every single state.
// If you're in Nairobi, you hear the channels in Nairobi"). The stations are the city's real FM stations,
// played live from their own streams. Where each stream lives comes from Radio Browser
// (radio-browser.info), the free, open, community-run directory of internet radio: every station keeps
// its directory id, so the app asks the directory for the station's current address when it opens and
// falls back to the one it shipped with. A station that will not start within a few seconds is skipped.
// Nothing is streamed through the game's servers.

const MIRRORS = ['de1', 'de2', 'fi1', 'at1'];
const KEY = 'bw-radio';
const store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } },
  set(v) { try { localStorage.setItem(KEY, JSON.stringify({ ...store.get(), ...v })); } catch { /* storage unavailable */ } },
};
async function directory(path) {
  for (const m of MIRRORS) {
    try {
      const r = await fetch(`https://${m}.api.radio-browser.info${path}`, { signal: AbortSignal.timeout(4000) });
      if (r.ok) return await r.json();
    } catch { /* the next mirror */ }
  }
  return null;
}

const CSS = `
#lk-radio { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -46%) scale(.96); opacity: 0; pointer-events: none; z-index: 60; width: min(420px, calc(100vw - 32px));
  max-height: calc(100vh - 48px); display: flex; flex-direction: column; background: ${C.paper}; color: ${C.ink}; border-radius: 24px; font-family: ${FONT};
  box-shadow: 0 6px 0 rgba(59,42,32,.18), 0 22px 48px rgba(10,14,30,.32); transition: opacity .18s ease, transform .22s cubic-bezier(.2,1.3,.4,1); }
#lk-radio.on { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%) scale(1); }
#lk-radio header { display: flex; align-items: center; gap: 12px; padding: 18px 20px 6px; }
#lk-radio header h2 { margin: 0; font: 800 24px/1 ${FONT}; flex: 1; }
#lk-radio header small { display: block; margin-top: 4px; font: 600 14px/1.2 ${FONT}; color: #6b5a48; }
#lk-radio .x { flex: none; width: 38px; height: 38px; border: 0; border-radius: 12px; background: ${C.paper2}; color: ${C.ink}; font: 800 20px/1 ${FONT}; cursor: pointer; }
#lk-radio .dial { position: relative; margin: 10px 20px 4px; height: 58px; border-radius: 14px; background: #2b241d; overflow: hidden; box-shadow: inset 0 3px 0 rgba(0,0,0,.3); }
#lk-radio .dial .scale { position: absolute; inset: 8px 12px 18px; }
#lk-radio .dial .tick { position: absolute; bottom: 0; width: 2px; background: #c9b48a; opacity: .6; }
#lk-radio .dial .tick.big { opacity: 1; }
#lk-radio .dial .num { position: absolute; bottom: -16px; transform: translateX(-50%); font: 700 11px/1 ${FONT}; color: #c9b48a; }
#lk-radio .dial .needle { position: absolute; top: 4px; bottom: 4px; width: 3px; border-radius: 2px; background: ${C.coral}; box-shadow: 0 0 8px ${C.coral}; transition: left .45s cubic-bezier(.3,1.2,.4,1); }
#lk-radio .now { display: flex; align-items: center; gap: 12px; margin: 12px 20px 8px; }
#lk-radio .now .play { flex: none; width: 54px; height: 54px; border: 0; border-radius: 50%; background: ${C.ink}; color: ${C.paper}; cursor: pointer; display: grid; place-items: center; box-shadow: 0 3px 0 rgba(0,0,0,.25); }
#lk-radio .now .play:focus-visible, #lk-radio li button:focus-visible, #lk-radio .x:focus-visible { outline: 3px solid ${C.amber}; outline-offset: 2px; }
#lk-radio .now b { display: block; font: 800 18px/1.15 ${FONT}; }
#lk-radio .now span { display: block; font: 600 13px/1.3 ${FONT}; color: #6b5a48; }
#lk-radio .now .live { display: inline-flex; align-items: center; gap: 5px; margin-left: 6px; padding: 2px 7px; border-radius: 999px; background: ${C.coral}; color: #fff; font: 800 10px/1.4 ${FONT}; vertical-align: 2px; }
#lk-radio .now .live::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #fff; animation: lkr-blink 1s steps(2) infinite; }
@keyframes lkr-blink { 50% { opacity: 0; } }
#lk-radio .vol { display: flex; align-items: center; gap: 10px; margin: 0 20px 10px; font: 700 13px/1 ${FONT}; color: #6b5a48; }
#lk-radio .vol input { flex: 1; accent-color: ${C.teal}; }
#lk-radio ul { list-style: none; margin: 0; padding: 4px 12px 16px; overflow: auto; }
#lk-radio li button { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px; border: 0; border-radius: 14px; background: none; color: ${C.ink}; text-align: left; cursor: pointer; font-family: ${FONT}; }
#lk-radio li button:hover { background: ${C.paper2}; }
#lk-radio li button.on { background: #fff6e0; box-shadow: inset 0 0 0 2px ${C.amber}; }
#lk-radio li .f { flex: none; min-width: 58px; padding: 6px 0; border-radius: 10px; background: ${C.ink}; color: ${C.paper}; text-align: center; font: 800 14px/1 ${FONT}; }
#lk-radio li b { display: block; font: 800 16px/1.2 ${FONT}; }
#lk-radio li small { display: block; font: 600 12px/1.3 ${FONT}; color: #6b5a48; }
#lk-radio li.off { opacity: .45; }
#lk-radio .foot { padding: 0 20px 14px; font: 600 11px/1.4 ${FONT}; color: #8a7760; }
#lk-radio .foot a { color: inherit; }
#lk-radio-chip { position: fixed; left: 16px; top: 184px; z-index: 30; display: none; align-items: center; gap: 8px; padding: 6px 8px 6px 12px; border-radius: 999px; background: ${C.paper}; color: ${C.ink};
  font: 700 14px/1 ${FONT}; box-shadow: 0 3px 0 rgba(59,42,32,.2); cursor: pointer; }
#lk-radio-chip.on { display: inline-flex; }
#lk-radio-chip i { display: inline-flex; gap: 2px; align-items: flex-end; height: 12px; }
#lk-radio-chip i s { width: 3px; background: ${C.coral}; animation: lkr-bar .9s ease-in-out infinite; }
#lk-radio-chip i s:nth-child(2) { animation-delay: .2s; } #lk-radio-chip i s:nth-child(3) { animation-delay: .4s; }
@keyframes lkr-bar { 0%, 100% { height: 3px; } 50% { height: 12px; } }
#lk-radio-chip button { width: 26px; height: 26px; border: 0; border-radius: 50%; background: ${C.ink}; color: ${C.paper}; cursor: pointer; display: grid; place-items: center; }
`;
const PLAY = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
const STOP = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** The radio for the city you are in. */
export function createRadio({ city = 'Lagos', toast = () => {} } = {}) {
  const list = (STATIONS[city] || []).map((s) => ({ ...s }));
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const el = document.createElement('div'); el.id = 'lk-radio'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `Radio, ${city}`); document.body.appendChild(el);
  const chip = document.createElement('div'); chip.id = 'lk-radio-chip'; document.body.appendChild(chip);
  const audio = new Audio(); audio.preload = 'none'; audio.crossOrigin = null;
  const saved = store.get();
  audio.volume = Math.min(1, Math.max(0, saved.vol ?? 0.8));
  let cur = -1, playing = false, starting = null, refreshed = false;

  // the dial: the FM band, 87.5 to 108, with a needle on the station
  const fm = (s) => { const f = parseFloat(s.freq); return f >= 87.5 && f <= 108 ? f : null; };
  const pos = (f) => ((f - 87.5) / (108 - 87.5)) * 100;
  const ticks = () => { let h = ''; for (let f = 88; f <= 108; f += 1) h += `<i class="tick${f % 4 === 0 ? ' big' : ''}" style="left:${pos(f)}%;height:${f % 4 === 0 ? 14 : 8}px"></i>${f % 4 === 0 ? `<i class="num" style="left:${pos(f)}%">${f}</i>` : ''}`; return h; };

  function render() {
    const s = list[cur];
    el.innerHTML = `<header><div style="flex:1"><h2>Radio</h2><small>Live from ${esc(city)} · ${list.length} stations</small></div><button class="x" aria-label="Close">×</button></header>
      <div class="dial" aria-hidden="true"><div class="scale">${ticks()}</div><i class="needle" style="left:calc(12px + (100% - 24px) * ${s && fm(s) ? pos(fm(s)) / 100 : 0.5})"></i></div>
      <div class="now"><button class="play" aria-label="${playing ? 'Stop' : 'Play'}">${playing || starting ? STOP : PLAY}</button>
        <div><b>${s ? esc(s.name) : 'Pick a station'}${playing ? '<span class="live">LIVE</span>' : ''}</b><span>${s ? `${s.freq ? `${esc(s.freq)} FM · ` : ''}${esc(s.lang || '')}${starting ? ' · tuning in…' : ''}` : `What ${esc(city)} is listening to, right now.`}</span></div></div>
      <label class="vol">Volume <input type="range" min="0" max="1" step="0.05" value="${audio.volume}" aria-label="Volume"></label>
      <ul>${list.map((st, i) => `<li class="${st.off ? 'off' : ''}"><button data-i="${i}" class="${i === cur ? 'on' : ''}"><span class="f">${st.freq ? esc(st.freq) : 'WEB'}</span><span><b>${esc(st.name)}</b><small>${esc(st.about || st.lang || '')}${st.off ? ' · off air right now' : ''}</small></span></button></li>`).join('') || `<li style="padding:12px;font:600 14px/1.4 ${FONT}">No stations found for ${esc(city)} yet.</li>`}</ul>
      <p class="foot">Live streams from each station, found through <a href="https://www.radio-browser.info" target="_blank" rel="noopener">Radio Browser</a>, the open radio directory.</p>`;
    el.querySelector('.x').onclick = close;
    el.querySelector('.play').onclick = () => (playing || starting ? stop() : play(cur >= 0 ? cur : 0));
    el.querySelector('.vol input').oninput = (e) => { audio.volume = +e.target.value; store.set({ vol: audio.volume }); };
    el.querySelectorAll('li button').forEach((b) => { b.onclick = () => play(+b.dataset.i); });
    chip.innerHTML = s ? `<i aria-hidden="true"><s></s><s></s><s></s></i>${esc(s.name)}<button aria-label="Stop the radio">${STOP}</button>` : '';
    chip.classList.toggle('on', playing);
    chip.onclick = (e) => { if (e.target.closest('button')) stop(); else open(); };
  }

  // ask the directory where each station streams from today (once, when the radio is first opened)
  async function refresh() {
    if (refreshed) return; refreshed = true;
    const ids = list.map((s) => s.uuid).filter(Boolean);
    if (!ids.length) return;
    const got = await directory(`/json/stations/byuuid?uuids=${ids.join(',')}`);
    (got || []).forEach((d) => { const s = list.find((q) => q.uuid === d.stationuuid); if (s && /^https:/.test(d.url_resolved || '')) s.url = d.url_resolved; });
  }

  function play(i, tries = 0) {
    const s = list[i]; if (!s) return;
    cur = i; playing = false; store.set({ [city]: i });
    const token = {}; starting = token;
    audio.pause(); audio.src = s.url; audio.load();
    render();
    const fail = () => {
      if (starting !== token) return;
      starting = null; s.off = true;
      const next = list.findIndex((q, k) => k > i && !q.off);
      if (next >= 0 && tries < 4) { toast(`${s.name} is not coming through. Trying ${list[next].name}.`, 2200); play(next, tries + 1); }
      else { toast(`${s.name} is off air right now.`, 2200); render(); }
    };
    const timer = setTimeout(fail, 9000);
    audio.onplaying = () => { if (starting !== token) return; clearTimeout(timer); starting = null; playing = true; s.off = false; dispatchEvent(new CustomEvent('bw:radio', { detail: { playing: true, name: s.name } })); render(); };
    audio.onerror = () => { clearTimeout(timer); fail(); };
    audio.play().catch(() => { clearTimeout(timer); fail(); });
    // tell the directory a station was played (it asks apps to, to keep its popularity honest)
    if (s.uuid) directory(`/json/url/${s.uuid}`);
  }
  function stop() {
    starting = null; playing = false; audio.pause(); audio.removeAttribute('src'); audio.load();
    dispatchEvent(new CustomEvent('bw:radio', { detail: { playing: false } }));
    render();
  }
  function open() { refresh().then(render); el.classList.add('on'); render(); el.querySelector('.play')?.focus(); }
  function close() { el.classList.remove('on'); }
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && el.classList.contains('on')) { e.stopPropagation(); close(); } }, true);
  if (saved[city] != null && list[saved[city]]) cur = saved[city];
  render();
  return { open, close, stop, get isOpen() { return el.classList.contains('on'); }, get playing() { return playing; }, stations: list, dispose() { stop(); el.remove(); chip.remove(); style.remove(); } };
}
