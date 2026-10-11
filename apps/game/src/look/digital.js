import * as THREE from 'three';
import { cityInfo } from './cityinfo.js';
import { cityLabel, areaOf, areaName } from './areas.js';
import { onlineNow } from './online.js';

// Digital billboards (Elvis's list: "digital billboards"). The roadside board (props.js) becomes a screen that changes
// every few seconds, like the LED boards on Lagos's expressways: the city's mural, the time and the weather, this week's
// notices from the community board, a landmark worth the walk, a local shop's advert, the next train where there is a
// railway, and who is online. Every slide comes from the city's own data, so each city's board says its own things.
const W = 1024, H = 410;
const INK = '#3b2a20', PAPER = '#f7efdc', TEAL = '#2a9d94', AMBER = '#f2b33d', CORAL = '#e46f4f';

function wrap(g, text, x, y, maxW, lh, maxLines = 3) {
  const words = String(text).split(/\s+/); let line = '', n = 0;
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y + n * lh); line = w; if (++n >= maxLines) return; } else line = t; }
  if (line && n < maxLines) g.fillText(line, x, y + n * lh);
}

export function createDigitalBoard({ face, world, getEnv, landmarks, railway }) {
  if (!face) return null;
  const mural = face.map;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const C = cityInfo(), P = world.place || {}, city = cityLabel(P.city || 'Lagos'), area = areaName(areaOf(P.city || 'Lagos', P.name)) || P.name || '';
  const marks = (landmarks?.placed || []).filter((m) => !m.far && m.fact);
  const shops = (C.shops || []).filter(([n]) => !/kitchen|chop|kibanda/i.test(n));
  const frame = (accent, kicker) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    g.fillStyle = accent; g.fillRect(0, 0, W, 64);
    g.fillStyle = '#fff'; g.font = '800 30px "Baloo 2", system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText(kicker.toUpperCase(), 36, 34);
    g.textAlign = 'right'; g.fillText(`${area} · ${city}`.toUpperCase(), W - 36, 34); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  };
  const SLIDES = [
    () => null, // the mural, as it was
    () => { const e = getEnv?.() || {}, h = e.hour ?? 12, hh = Math.floor(h), mm = Math.floor((h - hh) * 60); frame(TEAL, 'Now');
      g.fillStyle = INK; g.font = '800 132px "Baloo 2", system-ui, sans-serif'; g.fillText(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, 36, 220);
      g.font = '700 46px "Baloo 2", system-ui, sans-serif'; g.fillText(`${e.temp != null ? `${Math.round(e.temp)}° · ` : ''}${(e.rain ?? 0) > 0.2 ? 'Rain: take an umbrella' : (e.cloud ?? 0) > 0.6 ? 'Cloudy' : 'Clear skies'}`, 36, 300);
      g.fillStyle = TEAL; g.font = '700 30px "Baloo 2", system-ui, sans-serif'; g.fillText(`Good ${h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'}, ${city}.`, 36, 360); return true; },
    () => { if (!C.board?.week) return false; frame(CORAL, 'This week'); g.fillStyle = INK; g.font = '800 48px "Baloo 2", system-ui, sans-serif'; wrap(g, C.board.week, 36, 150, W - 72, 60, 4); return true; },
    () => { if (!marks.length) return false; const m = marks[Math.floor(Date.now() / 7000) % marks.length]; frame(AMBER, 'Worth the walk'); g.fillStyle = INK; g.font = '800 64px "Baloo 2", system-ui, sans-serif'; wrap(g, m.name, 36, 150, W - 72, 70, 1); g.font = '600 36px "Baloo 2", system-ui, sans-serif'; g.fillStyle = '#5a4636'; wrap(g, m.fact, 36, 230, W - 72, 46, 3); return true; },
    () => { if (!shops.length) return false; const [n, line] = shops[Math.floor(Date.now() / 7000) % shops.length]; frame(INK, 'Advert'); g.fillStyle = CORAL; g.font = '800 70px "Baloo 2", system-ui, sans-serif'; wrap(g, n, 36, 160, W - 72, 74, 1); g.fillStyle = INK; g.font = '600 38px "Baloo 2", system-ui, sans-serif'; wrap(g, line, 36, 240, W - 72, 48, 3); return true; },
    () => { const st = railway?.station; frame(TEAL, st ? 'Trains' : 'Builders World');
      g.fillStyle = INK; g.font = '800 60px "Baloo 2", system-ui, sans-serif';
      if (st) { const T = railway.trains.find((t) => t.stopHead !== null); const eta = T ? (T.stopped > 0 ? 0 : Math.max(0, (T.wait > 0 ? T.wait : 0) + Math.max(0, T.stopHead - T.s) / 13)) : null; wrap(g, `${st.name} station`, 36, 160, W - 72, 66, 1); g.font = '700 44px "Baloo 2", system-ui, sans-serif'; g.fillText(eta === null ? 'No trains due' : eta < 5 ? 'Train at the platform' : `Next train in ${eta < 60 ? `${Math.round(eta / 5) * 5} s` : `${Math.round(eta / 60)} min`}`, 36, 250); }
      else { const n = onlineNow.players.length; wrap(g, n ? `${n} builder${n === 1 ? '' : 's'} online now` : 'Bring a friend: build together', 36, 170, W - 72, 66, 2); }
      return true; },
  ];
  let k = 0, t = 0;
  function show() {
    if (k === 0) { face.map = mural; face.emissiveMap = mural; face.needsUpdate = true; return; }
    if (!SLIDES[k]()) { k = (k + 1) % SLIDES.length; show(); return; }
    // LED rows, faint, so it reads as a screen
    g.fillStyle = 'rgba(0,0,0,.05)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
    tex.needsUpdate = true; face.map = tex; face.emissiveMap = tex; face.needsUpdate = true;
  }
  show();
  return { update(dt) { t += dt; if (t > 7) { t = 0; k = (k + 1) % SLIDES.length; show(); } }, get slide() { return k; } };
}
