import AFRICA from './africa.json';
import { AIRPORTS, km, flightMinutes } from './travelrules.js';

// The map, zoomed out past the district (Elvis, 10 October 2026: "you should also be able to zoom out and see Nigeria,
// then move to other countries. But we're going to build out other countries slowly. For now, let's focus on Nigeria").
// Two steps out: Nigeria with Ghana beside it, then Africa from Senegal to Kenya. The countries are Natural Earth's
// 1:50m boundaries (public domain, via the world-atlas package), simplified (africa.json); the cities you can go to are
// pins, yours marked; tap one to see how far it is and to travel there.

export const CITY_PINS = {
  Lagos: { lat: 6.5244, lon: 3.3792, state: 'Lagos State', country: 'Nigeria' },
  Abuja: { lat: 9.0765, lon: 7.3986, state: 'Federal Capital Territory', country: 'Nigeria' },
  'Port Harcourt': { lat: 4.8156, lon: 7.0498, state: 'Rivers State', country: 'Nigeria' },
  Uyo: { lat: 5.0377, lon: 7.9128, state: 'Akwa Ibom State', country: 'Nigeria', label: 'Uyo (Akwa Ibom)' },
  Accra: { lat: 5.6037, lon: -0.187, state: 'Greater Accra', country: 'Ghana' },
  Nairobi: { lat: -1.2921, lon: 36.8219, state: 'Nairobi County', country: 'Kenya' },
};
const OURS = new Set(['Nigeria', 'Ghana', 'Kenya']);
// the two views, as [lon0, lat0, lon1, lat1]
export const LEVELS = { nigeria: [-4.5, 1.5, 16.5, 15.5], africa: [-18, -12, 52, 24] };
const FONT = '"Baloo 2", ui-rounded, system-ui, sans-serif';

/** Draw the country map into a canvas context of w x h pixels; returns the pins' screen positions for taps. */
export function drawCountryMap(g, w, h, { level = 'nigeria', here = 'Lagos', pick = null, dpr = 1 } = {}) {
  const [lon0, lat0, lon1, lat1] = LEVELS[level], latc = (lat0 + lat1) / 2, kx = Math.cos((latc * Math.PI) / 180);
  const s = Math.min(w / ((lon1 - lon0) * kx), h / (lat1 - lat0)), ox = (w - (lon1 - lon0) * kx * s) / 2, oy = (h - (lat1 - lat0) * s) / 2;
  const P = (lon, lat) => [ox + (lon - lon0) * kx * s, oy + (lat1 - lat) * s];
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#9fd0d6'; g.fillRect(0, 0, w, h); // the sea
  // little waves on the sea, in the game's paper style
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2 * dpr;
  for (let y = 30 * dpr; y < h; y += 46 * dpr) for (let x = ((y / dpr) % 92) * dpr; x < w; x += 92 * dpr) { g.beginPath(); g.arc(x, y, 9 * dpr, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
  // the countries: ours warm and outlined in ink, the rest pale
  const ring = (r) => { g.beginPath(); r.forEach(([lo, la], i) => { const [x, y] = P(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
  AFRICA.forEach((c) => { const ours = OURS.has(c.name); c.rings.forEach((r) => { ring(r); g.fillStyle = c.name === 'Nigeria' ? '#f6d58a' : ours ? '#f3e2b4' : '#ece2cc'; g.fill(); g.lineWidth = (ours ? 2.6 : 1.2) * dpr; g.strokeStyle = ours ? '#3b2a20' : 'rgba(59,42,32,.35)'; g.stroke(); }); });
  // country names: ours always, the others when the whole of Africa is in view and there is room
  g.textAlign = 'center'; g.textBaseline = 'middle';
  AFRICA.forEach((c) => {
    const ours = OURS.has(c.name); if (!ours && level === 'nigeria') return;
    const r = c.rings.reduce((a, b) => (b.length > a.length ? b : a)), xs = r.map((p) => p[0]), ys = r.map((p) => p[1]);
    const [cx, cy] = P((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2), wpx = (Math.max(...xs) - Math.min(...xs)) * kx * s;
    if (!ours && wpx < 70 * dpr) return;
    g.font = `${ours ? 800 : 700} ${(ours ? (level === 'nigeria' && c.name === 'Nigeria' ? 30 : 18) : 12) * dpr}px ${FONT}`;
    g.fillStyle = ours ? 'rgba(59,42,32,.55)' : 'rgba(59,42,32,.4)';
    const off = c.name === 'Nigeria' && level === 'nigeria' ? -1.6 : 0; // above the cities
    const [, ly] = P(0, (Math.min(...ys) + Math.max(...ys)) / 2 + (off ? 2.6 : 0));
    g.fillText(c.name.toUpperCase(), cx, off ? ly : cy);
  });
  // the cities you can go to
  const pins = [];
  Object.entries(CITY_PINS).forEach(([name, c]) => {
    const [x, y] = P(c.lon, c.lat); if (x < 0 || x > w || y < 0 || y > h) return;
    const mine = name === here, sel = pick === name, r = (mine ? 11 : 8) * dpr;
    if (mine) { g.fillStyle = 'rgba(228,111,79,.25)'; g.beginPath(); g.arc(x, y, r * 2.4, 0, 7); g.fill(); }
    g.fillStyle = mine ? '#e46f4f' : sel ? '#2a9d94' : '#3b2a20'; g.strokeStyle = '#fff'; g.lineWidth = 3 * dpr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
    const label = c.label || name, small = level === 'africa';
    // the whole of Africa in view: the southern Nigerian cities sit close together, so only yours and the far ones are named
    if (small && !mine && !sel && ['Port Harcourt', 'Uyo'].includes(name)) { pins.push({ name, x, y, r: Math.max(14 * dpr, r * 2) }); return; }
    g.font = `800 ${(small ? 13 : 16) * dpr}px ${FONT}`; const tw = g.measureText(label).width;
    // to the side the label fits, away from its neighbours (Port Harcourt below Uyo)
    const left = name === 'Port Harcourt' || name === 'Accra', down = name === 'Port Harcourt' ? 1 : name === 'Uyo' ? -1 : 0;
    const lx = left ? x - r - 8 * dpr - tw : x + r + 8 * dpr, ly = y + down * 16 * dpr;
    g.fillStyle = 'rgba(247,239,220,.92)'; g.beginPath(); g.roundRect(lx - 6 * dpr, ly - 12 * dpr, tw + 12 * dpr, 24 * dpr, 8 * dpr); g.fill();
    g.fillStyle = '#3b2a20'; g.textAlign = 'left'; g.fillText(label, lx, ly + 1 * dpr);
    if (mine) { g.font = `700 ${11 * dpr}px ${FONT}`; g.fillStyle = '#e46f4f'; g.fillText('You are here', lx, ly + 20 * dpr); }
    pins.push({ name, x, y, r: Math.max(22 * dpr, r * 2) });
  });
  // off the edge: the way to Nairobi when only Nigeria is in view
  if (level === 'nigeria') {
    const [x, y] = [w - 18 * dpr, P(0, 12.5)[1]]; // up in the north east, clear of the zoom buttons
    g.fillStyle = 'rgba(247,239,220,.92)'; g.font = `800 ${14 * dpr}px ${FONT}`; const t = 'Nairobi, Kenya →'; const tw = g.measureText(t).width;
    g.beginPath(); g.roundRect(x - tw - 14 * dpr, y - 14 * dpr, tw + 14 * dpr, 28 * dpr, 10 * dpr); g.fill(); g.fillStyle = '#3b2a20'; g.textAlign = 'right'; g.fillText(t, x - 7 * dpr, y + 1 * dpr);
    pins.push({ name: 'Nairobi', x: x - tw / 2, y, r: Math.max(tw / 2, 24 * dpr) });
  }
  return { pins, project: P };
}

/** What a tap on a city says: how far, how long by air, and what you can do. */
export function cityCard(name, here) {
  const c = CITY_PINS[name]; if (!c) return null;
  if (name === here) return { title: name, sub: `${c.state}, ${c.country}`, line: 'You are here. The other areas of the city are a taxi ride away.', action: 'Around the city' };
  const d = Math.round(km(here, name)), mins = flightMinutes(here, name), intl = (AIRPORTS[here]?.country || 'Nigeria') !== c.country;
  return { title: name, sub: `${c.state}, ${c.country}`, line: `${d.toLocaleString('en-US')} km away · about ${mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60 ? `${mins % 60} min` : ''}` : `${mins} min`} by air${intl ? ' · you need a passport' : ''}`, action: 'Travel there' };
}
