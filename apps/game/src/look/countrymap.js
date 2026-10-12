import WORLD from './world.json';
import { AIRPORTS, km, flightMinutes } from './travelrules.js';
import { CITIES, LIVE } from './citydirectory.js';
import { kmBetween } from './areas.js';

// The map, zoomed out past the district (Elvis, 10 and 11 October 2026: "zoom out and see Nigeria, then move to other
// countries ... I should be able to pan around the globe. So even if those regions are not yet unlocked, I should be able
// to at least see them"). The whole world, on a Mercator map like any map app: drag to look around (it wraps east and
// west), scroll or pinch to zoom, from your country out to the globe. Every country is drawn; the ones with cities you
// can go to are warm and outlined, with a pin for each city; the rest wait, pale, "coming later". Tap a pin to see how
// far it is and to travel there. Countries are Natural Earth's 1:50m boundaries (public domain, via world-atlas),
// simplified (world.json).

// the cities you can play, from cities/<country>/<city>/city.json (citydirectory.js); the planned ones are drawn too
export const CITY_PINS = Object.fromEntries(Object.entries(LIVE).map(([key, c]) => [key, { lat: c.lat, lon: c.lon, state: c.state, country: c.country.mapName || c.country.name, label: c.label !== c.name ? c.label : undefined }]));
const PLANNED = CITIES.filter((c) => c.status !== 'live');
const OPEN = new Set(Object.values(CITY_PINS).map((c) => c.country));
const FONT = '"Baloo 2", ui-rounded, system-ui, sans-serif';
const TILE = 256, MINZ = 1, MAXZ = 7.2;

// Web Mercator: longitude and latitude to "world pixels" at zoom z (the world is 256 x 2^z wide)
const size = (z) => TILE * 2 ** z;
const toWorld = (lon, lat, z) => { const s = size(z), la = Math.max(-84, Math.min(84, lat)) * Math.PI / 180; return [((lon + 180) / 360) * s, (0.5 - Math.log(Math.tan(Math.PI / 4 + la / 2)) / (2 * Math.PI)) * s]; };
const fromWorld = (x, y, z) => { const s = size(z); return [(x / s) * 360 - 180, (Math.atan(Math.sinh(Math.PI * (1 - 2 * y / s))) * 180) / Math.PI]; };
// a ring that crosses the date line (the far east of Russia) is unwrapped, so it runs on past 180 degrees instead of
// striking back across the whole map; the copies either side of the world fill in the rest
WORLD.forEach((c) => c.rings.forEach((r) => { let off = 0; for (let k = 1; k < r.length; k++) { const d = r[k][0] + off - r[k - 1][0]; if (d > 180) off -= 360; else if (d < -180) off += 360; if (off) r[k] = [r[k][0] + off, r[k][1]]; } }));
// each country's box, worked out once, for skipping what is off screen and for placing its name
const BOX = WORLD.map((c) => { let a = 540, b = 90, cc = -540, d = -90, big = null, bigN = 0; c.rings.forEach((r) => { r.forEach(([x, y]) => { a = Math.min(a, x); cc = Math.max(cc, x); b = Math.min(b, y); d = Math.max(d, y); }); if (r.length > bigN) { bigN = r.length; big = r; } }); const bx = big.map((p) => p[0]), by = big.map((p) => p[1]); return { lon0: a, lon1: cc, lat0: b, lat1: d, label: [(Math.min(...bx) + Math.max(...bx)) / 2, (Math.min(...by) + Math.max(...by)) / 2], w: Math.max(...bx) - Math.min(...bx) }; });

/** A view centred on a country (the whole of it in the window), or on the world. */
export function worldView(country, w, h, dpr = 1) {
  const idx = WORLD.findIndex((c) => c.name === country);
  if (idx < 0) return { lon: 10, lat: 10, z: 2.2 };
  const B = BOX[idx], pad = 2.3;
  let z = MAXZ + Math.log2(dpr); while (z > MINZ) { const [x0, y0] = toWorld(B.lon0, B.lat1, z), [x1, y1] = toWorld(B.lon1, B.lat0, z); if ((x1 - x0) * pad < w && (y1 - y0) * pad < h) break; z -= 0.1; }
  return clampView({ lon: (B.lon0 + B.lon1) / 2, lat: (B.lat0 + B.lat1) / 2, z: Math.max(minZoom(h), Math.min(z, 6.5 + Math.log2(dpr))) }, h);
}
const minZoom = (h) => Math.max(MINZ, Math.log2(h / (TILE * 0.85))); // never smaller than the window is tall
/** Zoom about a point on screen (px, py), keeping that spot under the pointer. Zoom counts canvas pixels, so a sharp
 * (high density) screen goes one step further in for the same size on screen. */
export const maxZoom = (dpr = 1) => MAXZ + Math.log2(dpr);
export function zoomWorld(v, f, px, py, w, h, dpr = 1) {
  const [cx, cy] = toWorld(v.lon, v.lat, v.z), wx = cx + (px - w / 2), wy = cy + (py - h / 2), [lon, lat] = fromWorld(wx, wy, v.z);
  const z = Math.max(minZoom(h), Math.min(maxZoom(dpr), v.z + Math.log2(f)));
  const [nx, ny] = toWorld(lon, lat, z), [clon, clat] = fromWorld(nx - (px - w / 2), ny - (py - h / 2), z);
  return clampView({ lon: clon, lat: clat, z }, h);
}
/** Drag the map by (dx, dy) screen pixels. East and west wrap round; north and south stop at the poles. */
export function panWorld(v, dx, dy, h) { const [cx, cy] = toWorld(v.lon, v.lat, v.z), [lon, lat] = fromWorld(cx - dx, cy - dy, v.z); return clampView({ lon: ((lon + 540) % 360) - 180, lat, z: v.z }, h); }
function clampView(v, h) {
  const s = size(v.z), [, y] = toWorld(0, v.lat, v.z), half = h / 2;
  const yc = s <= h ? s / 2 : Math.max(half, Math.min(s - half, y));
  return { lon: v.lon, lat: fromWorld(0, yc, v.z)[1], z: v.z };
}

/** Draw the world into a canvas of w x h pixels; returns the pins' screen positions, for taps. */
export function drawWorldMap(g, w, h, v, { here = 'Lagos', pick = null, dpr = 1 } = {}) {
  const z = v.z, zc = z - Math.log2(dpr), s = size(z), [cx, cy] = toWorld(v.lon, v.lat, z), ox = w / 2 - cx, oy = h / 2 - cy;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#9fd0d6'; g.fillRect(0, 0, w, h); // the sea
  g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2 * dpr; // waves, in the game's paper style
  for (let y = 26 * dpr; y < h; y += 48 * dpr) for (let x = ((y / dpr) % 96) * dpr; x < w; x += 96 * dpr) { g.beginPath(); g.arc(x, y, 8 * dpr, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
  // the copies of the world that show (it wraps east and west)
  const copies = []; for (let k = -2; k <= 2; k++) { const x0 = ox + k * s; if (x0 + s > 0 && x0 < w) copies.push(x0); }
  const lonPx = (lon) => ((lon + 180) / 360) * s, latPx = (lat) => toWorld(0, lat, z)[1];
  const ring = (r, x0) => { g.beginPath(); r.forEach(([lo, la], i) => { const x = x0 + lonPx(lo), y = oy + latPx(la); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
  const lw = Math.max(0.6, Math.min(2.6, (zc - 1) * 0.5)) * dpr;
  copies.forEach((x0) => WORLD.forEach((c, i) => {
    const B = BOX[i]; if (x0 + lonPx(B.lon1) < 0 || x0 + lonPx(B.lon0) > w || oy + latPx(B.lat0) < 0 || oy + latPx(B.lat1) > h) return;
    const open = OPEN.has(c.name);
    c.rings.forEach((r) => { ring(r, x0); g.fillStyle = c.name === 'Nigeria' ? '#f6d58a' : open ? '#f3e2b4' : '#ece5d3'; g.fill(); g.lineWidth = open ? lw * 1.6 : lw * 0.7; g.strokeStyle = open ? '#3b2a20' : 'rgba(59,42,32,.35)'; g.stroke(); });
  }));
  // country names where there is room: the open ones always, the rest once they are big enough to carry one
  g.textAlign = 'center'; g.textBaseline = 'middle';
  copies.forEach((x0) => WORLD.forEach((c, i) => {
    const B = BOX[i], open = OPEN.has(c.name), wpx = (B.w / 360) * s; if (wpx < (open ? 30 : 70) * dpr) return;
    const x = x0 + lonPx(B.label[0]), y = oy + latPx(B.label[1]); if (x < -50 || x > w + 50 || y < -20 || y > h + 20) return;
    const fs = Math.max(9, Math.min(open ? 26 : 16, wpx / (c.name.length * 0.9) / dpr)) * dpr;
    g.font = `${open ? 800 : 700} ${fs}px ${FONT}`; g.fillStyle = open ? 'rgba(59,42,32,.6)' : 'rgba(59,42,32,.38)';
    g.fillText(c.name.toUpperCase(), x, y - (open && zc >= 3.4 ? 34 * dpr : 0)); // above the city names
    if (!open && wpx > 160 * dpr) { g.font = `600 ${11 * dpr}px ${FONT}`; g.fillStyle = 'rgba(59,42,32,.32)'; g.fillText('coming later', x, y + fs * 0.9); }
  }));
  // the cities you can go to, laid out first so the names of the cities still to come keep clear of theirs
  const pins = [], placed = [], live = [];
  copies.forEach((x0) => Object.entries(CITY_PINS).forEach(([name, c]) => {
    const x = x0 + lonPx(c.lon), y = oy + latPx(c.lat); if (x < -20 || x > w + 20 || y < -20 || y > h + 20) return;
    const mine = name === here, sel = pick === name, r = (mine ? 10 : 7) * dpr, L = { name, c, x, y, r, mine, sel };
    placed.push([x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2]);
    // names once there is room for them (the southern Nigerian cities sit close together)
    const crowded = zc < 5 && ['Port Harcourt', 'Uyo'].includes(name) && !mine && !sel;
    if (!((zc < 3.4 && !mine && !sel) || crowded)) {
      L.label = c.label || name; g.font = `800 ${14 * dpr}px ${FONT}`; L.tw = g.measureText(L.label).width;
      const left = name === 'Port Harcourt' || name === 'Accra', down = name === 'Port Harcourt' ? 1 : name === 'Uyo' ? -1 : 0;
      L.lx = left ? x - r - 8 * dpr - L.tw : x + r + 8 * dpr; L.ly = y + down * 15 * dpr;
      placed.push([L.lx - 6 * dpr, L.ly - (mine && zc >= 3.4 ? 30 : 12) * dpr, L.tw + 12 * dpr, (mine && zc >= 3.4 ? 42 : 24) * dpr]);
    }
    live.push(L);
  }));
  // the cities still to come: small open rings, named once there is room (Elvis: "even if those regions are not yet
  // unlocked, I should be able to at least see them")
  const hits = (a) => placed.some((b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]);
  copies.forEach((x0) => PLANNED.forEach((c) => {
    const x = x0 + lonPx(c.lon), y = oy + latPx(c.lat); if (x < -20 || x > w + 20 || y < -20 || y > h + 20) return;
    const sel = pick === c.slug, r = (sel ? 6 : 4.5) * dpr;
    g.fillStyle = sel ? '#2a9d94' : '#fffaf0'; g.strokeStyle = sel ? '#fff' : 'rgba(59,42,32,.7)'; g.lineWidth = 2 * dpr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
    pins.push({ name: c.slug, planned: c, x, y, r: Math.max(16 * dpr, r * 2.5) });
    if (zc < 4.2) return;
    g.font = `700 ${11.5 * dpr}px ${FONT}`; const tw = g.measureText(c.name).width;
    // to the right of the ring if there is room, else to the left
    const boxes = [[x + r + 1 * dpr, y - 9 * dpr, tw + 8 * dpr, 18 * dpr], [x - r - 9 * dpr - tw, y - 9 * dpr, tw + 8 * dpr, 18 * dpr]], box = boxes.find((bx) => !hits(bx));
    if (!box) return;
    placed.push(box); g.fillStyle = 'rgba(247,239,220,.8)'; g.beginPath(); g.roundRect(...box, 7 * dpr); g.fill();
    g.fillStyle = 'rgba(59,42,32,.75)'; g.textAlign = 'left'; g.fillText(c.name, box[0] + 4 * dpr, y + 1 * dpr); g.textAlign = 'center';
  }));
  live.forEach(({ name, x, y, r, mine, sel, label, lx, ly, tw }) => {
    if (mine) { g.fillStyle = 'rgba(228,111,79,.25)'; g.beginPath(); g.arc(x, y, r * 2.4, 0, 7); g.fill(); }
    g.fillStyle = mine ? '#e46f4f' : sel ? '#2a9d94' : '#3b2a20'; g.strokeStyle = '#fff'; g.lineWidth = 3 * dpr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
    pins.push({ name, x, y, r: Math.max(20 * dpr, r * 2) });
    if (!label) return;
    g.font = `800 ${14 * dpr}px ${FONT}`; g.fillStyle = 'rgba(247,239,220,.92)'; g.beginPath(); g.roundRect(lx - 6 * dpr, ly - 12 * dpr, tw + 12 * dpr, 24 * dpr, 8 * dpr); g.fill();
    g.fillStyle = '#3b2a20'; g.textAlign = 'left'; g.fillText(label, lx, ly + 1 * dpr); g.textAlign = 'center';
    if (mine && zc >= 3.4) { g.font = `700 ${11 * dpr}px ${FONT}`; g.fillStyle = '#e46f4f'; g.textAlign = 'left'; g.fillText('You are here', lx, ly - 20 * dpr); g.textAlign = 'center'; }
  });
  return { pins, zoom: z, minZoom: minZoom(h), maxZoom: maxZoom(dpr) };
}

/** What a tap on a city says: how far, how long by air, and what you can do. */
export function cityCard(name, here) {
  const p = PLANNED.find((q) => q.slug === name);
  if (p) { const me = CITY_PINS[here] || CITY_PINS.Lagos, d = Math.round(kmBetween(me, p)); return { title: p.name, sub: p.country.name, line: `Coming later · ${d.toLocaleString('en-US')} km away`, about: p.tech, action: null }; }
  const c = CITY_PINS[name]; if (!c) return null;
  if (name === here) return { title: name, sub: `${c.state}, ${c.country}`, line: 'You are here. The other areas of the city are a taxi ride away.', action: 'Around the city' };
  const d = Math.round(km(here, name)), mins = flightMinutes(here, name), intl = (AIRPORTS[here]?.country || 'Nigeria') !== c.country;
  return { title: name, sub: `${c.state}, ${c.country}`, line: `${d.toLocaleString('en-US')} km away · about ${mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60 ? `${mins % 60} min` : ''}` : `${mins} min`} by air${intl ? ' · you need a passport' : ''}`, action: 'Travel there' };
}
