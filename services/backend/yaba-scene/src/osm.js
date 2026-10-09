// Shared by the browser app and scripts/fetch-osm.mjs. No three.js in here.
// Turns raw Overpass JSON into a small "district manifest" in local metres.

export const DEFAULT_PLACE = { name: 'Yaba', lat: 6.5095, lon: 3.3715, radius: 230 };

export const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const ROAD_WIDTH = {
  motorway: 16, trunk: 15, primary: 14, secondary: 12, tertiary: 10,
  unclassified: 8, residential: 8, living_street: 6, service: 5, pedestrian: 4,
  footway: 2.4, path: 2.2, cycleway: 2.4,
};

export function overpassQuery({ lat, lon, radius }) {
  return (
    `[out:json][timeout:30];(` +
    `way["building"](around:${radius},${lat},${lon});` +
    `way["highway"](around:${radius},${lat},${lon});` +
    `);out geom tags;`
  );
}

export function slug(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function project(lat, lon, c) {
  const kx = 111320 * Math.cos((c.lat * Math.PI) / 180);
  const kz = 110574;
  return [(lon - c.lon) * kx, -(lat - c.lat) * kz]; // north is -z
}

function num(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function parseOverpass(json, place) {
  const R = place.radius;
  const buildings = [];
  const roads = [];
  for (const el of json.elements || []) {
    if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) continue;
    const t = el.tags || {};
    const pts = el.geometry.map((g) => project(g.lat, g.lon, place).map((v) => +v.toFixed(2)));
    if (t.building) {
      if (pts.length < 4) continue;
      const ring = pts.slice(0, -1);
      let cx = 0, cz = 0;
      for (const p of ring) { cx += p[0]; cz += p[1]; }
      cx /= ring.length; cz /= ring.length;
      if (Math.hypot(cx, cz) > R * 1.15) continue;
      buildings.push({
        id: el.id,
        pts: ring,
        h: num(t.height),
        levels: num(t['building:levels']),
        name: t.name || null,
      });
    } else if (t.highway) {
      const cls = t.highway;
      const w = ROAD_WIDTH[cls];
      if (!w) continue;
      const kept = pts.filter((p) => Math.hypot(p[0], p[1]) <= R * 1.25);
      if (kept.length < 2) continue;
      roads.push({ id: el.id, cls, w, name: t.name || null, pts: kept });
    }
  }
  return {
    version: 1,
    source: 'osm',
    name: place.name,
    center: { lat: place.lat, lon: place.lon },
    radius: R,
    generated: new Date().toISOString(),
    buildings,
    roads,
  };
}

async function postOverpass(url, query, signal) {
  const res = await fetch(url, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal,
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

export async function fetchOverpass(place, timeoutMs = 25000) {
  const q = overpassQuery(place);
  let last;
  for (const url of OVERPASS) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const json = await postOverpass(url, q, ctl.signal);
      clearTimeout(timer);
      return parseOverpass(json, place);
    } catch (e) {
      clearTimeout(timer);
      last = e;
    }
  }
  throw last || new Error('Overpass unreachable');
}

// Load order: baked manifest (CDN-style) -> local cache -> live OSM -> sample.
export async function loadManifest(place, { live = true } = {}) {
  const key = `bw:${slug(place.name)}:${place.lat}:${place.lon}:${place.radius}`;
  try {
    const r = await fetch(`./data/${slug(place.name)}.json`, { cache: 'no-cache' });
    if (r.ok) {
      const m = await r.json();
      if (m.buildings?.length) return { manifest: m, via: 'baked' };
    }
  } catch { /* fall through */ }
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const m = JSON.parse(cached);
      if (m.buildings?.length) return { manifest: m, via: 'cache' };
    }
  } catch { /* storage unavailable */ }
  if (live) {
    try {
      const m = await fetchOverpass(place);
      if (m.buildings.length) {
        try { localStorage.setItem(key, JSON.stringify(m)); } catch { /* quota */ }
        return { manifest: m, via: 'live' };
      }
    } catch { /* fall through */ }
  }
  const r = await fetch('./data/sample.json');
  return { manifest: await r.json(), via: 'sample' };
}
