import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sunPosition } from './sun.js';
import { mulberry32 } from '../mesh.js';
import { terrainFor, landmarkFor, LANDMARK_NAME } from './citytiles.js';

// The city sheet (world bible 5.1): every city as a small isometric diorama on one sheet, each lit by
// its own real local time and weather. Hover to see it live; click to drop into its district.

export const CITIES = [
  { city: 'Lagos', district: 'Yaba', file: 'yaba', lat: 6.5095, lon: 3.3715, r: 230, live: true },
  { city: 'Abuja', district: 'Wuse', file: 'wuse', lat: 9.0790, lon: 7.4700, r: 200 },
  { city: 'Port Harcourt', district: 'Old GRA', file: 'old-gra', lat: 4.7790, lon: 7.0130, r: 200 },
  { city: 'Uyo', district: 'Uyo', file: 'uyo', lat: 5.0333, lon: 7.9259, r: 200 },
  { city: 'Nairobi', district: 'Kilimani', file: 'kilimani', lat: -1.2905, lon: 36.7855, r: 200 },
  { city: 'Accra', district: 'Osu', file: 'osu', lat: 5.5560, lon: -0.1830, r: 200 },
];
const TILE = 100; // world units per diorama
// tiles sit on a grid that is square to the screen, not to the world, so rows read as rows
const SX = new THREE.Vector3(1, 0, -1).normalize(), SY = new THREE.Vector3(1, 0, 1).normalize();
function layout(portrait) {
  const cols = portrait ? 2 : 3, rows = Math.ceil(CITIES.length / cols);
  const gx = portrait ? 124 : 138, gy = portrait ? 235 : 175;
  return CITIES.map((_, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    return new THREE.Vector3().addScaledVector(SX, (c - (cols - 1) / 2) * gx).addScaledVector(SY, (r - (rows - 1) / 2) * gy);
  });
}

const CSS = `
#lkc { position: fixed; inset: 0; pointer-events: none; z-index: 20; font-family: "Baloo 2", ui-rounded, system-ui, sans-serif; color: #3b2a20; }
#lkc h1 { position: absolute; left: 28px; top: 22px; margin: 0; font: 800 34px/1 "Baloo 2", ui-rounded, system-ui, sans-serif; }
#lkc h1 small { display: block; margin-top: 6px; font: 600 15px/1.4 "Baloo 2", ui-rounded, system-ui, sans-serif; color: #3b5f58; }
#lkc .tag { position: absolute; transform: translate(-50%, -100%); pointer-events: auto; cursor: pointer; width: 214px; box-sizing: border-box; text-align: left; padding: 10px 12px 11px; border: 0; border-radius: 18px;
  background: #f7efdc; color: #3b2a20; font-family: "Baloo 2", ui-rounded, system-ui, sans-serif; box-shadow: 0 4px 0 rgba(59,42,32,.18), 0 10px 24px rgba(20,40,40,.16);
  transition: transform .18s cubic-bezier(.2,1.4,.4,1), background .15s ease, box-shadow .15s ease; }
#lkc .tag::after { content: ''; position: absolute; left: 50%; bottom: -7px; width: 14px; height: 14px; background: inherit; transform: translateX(-50%) rotate(45deg); border-radius: 3px; }
#lkc .tag:hover, #lkc .tag.on, #lkc .tag:focus-visible { background: #fffaf0; transform: translate(-50%, -104%); box-shadow: 0 5px 0 rgba(59,42,32,.2), 0 16px 34px rgba(20,40,40,.22); outline: none; z-index: 2; }
#lkc .tag:focus-visible { box-shadow: 0 0 0 3px #f2b33d, 0 16px 34px rgba(20,40,40,.22); }
#lkc .tag .hd { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
#lkc .tag b { font: 800 18px/1.1 "Baloo 2", ui-rounded, system-ui, sans-serif; }
#lkc .tag .sky { flex: none; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; background: #fff3d6; }
#lkc .tag .sky.night { background: #26305c; }
#lkc .tag .sub { display: block; margin-top: 2px; font: 700 12px/1.35 "Baloo 2", ui-rounded, system-ui, sans-serif; color: #7a6552; }
#lkc .tag.sel { background: #fffaf0; box-shadow: 0 0 0 3px #2a9d94, 0 10px 24px rgba(20,40,40,.2); }
#lkc .panel { position: absolute; left: 50%; bottom: 40px; transform: translateX(-50%); width: min(560px, calc(100vw - 32px)); box-sizing: border-box; pointer-events: auto; display: grid; grid-template-columns: 1fr auto; gap: 10px 18px; align-items: center;
  padding: 16px 18px; border-radius: 22px; background: #f7efdc; color: #3b2a20; box-shadow: 0 5px 0 rgba(59,42,32,.2), 0 18px 40px rgba(20,40,40,.22); font-family: "Baloo 2", ui-rounded, system-ui, sans-serif; }
#lkc .panel h2 { margin: 0; font: 800 24px/1.05 "Baloo 2", ui-rounded, system-ui, sans-serif; } #lkc .panel h2 small { font: 700 14px/1 "Baloo 2", system-ui; color: #7a6552; margin-left: 6px; }
#lkc .panel .now { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
#lkc .panel .now .sky { width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; background: #fff3d6; font-style: normal; } #lkc .panel .now .sky.night { background: #26305c; } #lkc .panel .now .sky svg { width: 14px; height: 14px; }
#lkc .panel .now span { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px 4px 6px; border-radius: 999px; background: #efe2c4; font: 700 12.5px/1 "Baloo 2", system-ui; }
#lkc .panel .go { grid-row: 1; grid-column: 2; border: 0; border-radius: 16px; padding: 14px 18px; background: #f2b33d; color: #2a1a02; font: 800 16px/1.1 "Baloo 2", system-ui; cursor: pointer; box-shadow: 0 4px 0 rgba(120,80,10,.28); white-space: nowrap; }
#lkc .panel .go:hover, #lkc .panel .go:focus-visible { background: #f6c25a; outline: none; transform: translateY(-1px); }
#lkc .panel dl { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 2px 0 0; padding-top: 10px; border-top: 2px dashed #e3d4b4; }
#lkc .panel dl div { display: flex; align-items: baseline; gap: 5px; min-width: 0; }
#lkc .panel dt { font: 700 12px/1.2 "Baloo 2", system-ui; color: #7a6552; } #lkc .panel dd { margin: 0; font: 800 13.5px/1.2 "Baloo 2", system-ui; }
#lkc .panel .status { grid-column: 1 / -1; font: 700 12.5px/1.3 "Baloo 2", system-ui; color: #1d5f58; } #lkc .panel .status.early { color: #7a5a2a; }
@media (max-width: 600px) { #lkc .panel { grid-template-columns: 1fr; bottom: 36px; padding: 12px 14px; } #lkc .panel .go { grid-row: auto; grid-column: 1; width: 100%; } #lkc .panel h2 { font-size: 20px; } }
#lkc .back { position: absolute; right: 22px; top: 22px; pointer-events: auto; border: 0; border-radius: 999px; padding: 10px 18px; background: #f7efdc; color: #3b2a20; box-shadow: 0 3px 0 rgba(59,42,32,.2); font: 700 14px system-ui; cursor: pointer; }
@media (max-width: 600px) { #lkc h1 { font-size: 24px; left: 16px; top: 16px; max-width: 60%; } #lkc .back { right: 12px; top: 14px; padding: 8px 12px; } #lkc .tag { width: 136px; padding: 7px 9px; border-radius: 14px; } #lkc .tag b { font-size: 14.5px; } #lkc .tag .sub { font-size: 10.5px; } #lkc .tag .sky { width: 22px; height: 22px; } #lkc .note { display: none; } #lkc .panel .status { display: none; } #lkc h1 small { font-size: 12.5px; } }
#lkc .note { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); font-size: 12px; color: #2f5d55; text-align: center; }
#lkc .note a { color: inherit; }
`;

async function loadCity(c) {
  try { const r = await fetch(`./data/${c.file}.json`); if (r.ok) return await r.json(); } catch { /* fall through */ }
  return null;
}
async function weatherFor(c) {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,precipitation,weather_code,cloud_cover&timezone=auto`);
    if (!r.ok) return null;
    const j = await r.json();
    return { temp: j.current.temperature_2m, code: j.current.weather_code, rain: j.current.precipitation > 0.05 || (j.current.weather_code >= 51 && j.current.weather_code <= 99), cloud: (j.current.cloud_cover ?? 0) / 100, offset: j.utc_offset_seconds };
  } catch { return null; }
}
const LABEL = (code) => (code == null ? '' : code === 0 ? 'Clear' : code <= 2 ? 'Partly cloudy' : code === 3 ? 'Overcast' : code <= 48 ? 'Fog' : code <= 57 ? 'Drizzle' : code <= 67 ? 'Rain' : code <= 82 ? 'Showers' : code >= 95 ? 'Thunderstorm' : 'Rain');

// one diorama: a raised tile with the city's own ground (citytiles.js), real roads, real footprints
// (estimated blocks where the map is thin), its landmark, its lights after dark and its weather now
function diorama(c, manifest, seed) {
  const g = new THREE.Group();
  const s = (TILE / 2) / (manifest?.radius || c.r);
  const rng = mulberry32(seed);
  const R = TILE * 0.555, land = terrainFor(c.city, R, rng);
  const parts = { ground: [], road: [], bld: [], est: [] };
  parts.ground.push(new THREE.CylinderGeometry(TILE * 0.56, TILE * 0.6, 6, 6).rotateY(Math.PI / 6).translate(0, -3.05, 0));
  const onLand = (x, z) => !land.isWater(x, z) && Math.hypot(x, z) < TILE * 0.5;
  const roads = manifest?.roads || [];
  const lampPts = [];
  roads.forEach((r) => {
    const w = Math.max(1.2, (r.w || 6) * s);
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
      const L = Math.hypot(bx - ax, bz - az) * s;
      if (L < 0.2) continue;
      const mx = ((ax + bx) / 2) * s, mz = ((az + bz) / 2) * s;
      if (!onLand(mx, mz)) continue;
      const y = land.height(mx, mz);
      parts.road.push(new THREE.BoxGeometry(w, 0.3, L + w * 0.5).rotateY(Math.atan2(bx - ax, bz - az)).translate(mx, y + 0.2, mz));
      if (L > 3 && rng() < 0.5) lampPts.push(mx, y + 1.2, mz);
    }
  });
  const blds = manifest?.buildings || [];
  let shown = 0;
  blds.forEach((b) => {
    const pts = b.pts.map(([x, z]) => new THREE.Vector2(x * s, -z * s));
    if (pts.length < 3 || pts.some((p) => Math.hypot(p.x, p.y) > TILE * 0.52)) return;
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cz = -pts.reduce((a, p) => a + p.y, 0) / pts.length;
    if (!onLand(cx, cz)) return; // the lagoon, the river and the sea take what they cover
    const h = Math.max(1.2, ((b.h ?? (b.levels ? b.levels * 3 : 4 + rng() * 9)) * s) * 1.6);
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, land.height(cx, cz), 0);
    parts.bld.push(geo); shown++;
  });
  // thin map data: estimated blocks along the real roads, drawn lighter and labelled as estimated
  let estimated = 0;
  if (blds.length < 80) {
    roads.forEach((r) => {
      for (let i = 0; i < r.pts.length - 1; i += 1) {
        const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
        const L = Math.hypot(bx - ax, bz - az); if (L < 12) continue;
        const tx = (bx - ax) / L, tz = (bz - az) / L;
        for (let d = 8; d < L - 6; d += 14) {
          [-1, 1].forEach((side) => {
            if (rng() < 0.35) return;
            const off = (r.w || 6) / 2 + 6 + rng() * 3;
            const x = (ax + tx * d - tz * off * side) * s, z = (az + tz * d + tx * off * side) * s;
            if (Math.hypot(x, z) > TILE * 0.48 || !onLand(x, z)) return;
            const w = (6 + rng() * 6) * s, dd = (6 + rng() * 6) * s, h = (4 + rng() * 9) * s * 1.6;
            parts.est.push(new THREE.BoxGeometry(w, h, dd).rotateY(Math.atan2(tx, tz)).translate(x, land.height(x, z) + h / 2, z));
            estimated++;
          });
        }
      }
    });
  }
  const mats = {
    ground: new THREE.MeshLambertMaterial({ color: 0x8f8a62 }),
    road: new THREE.MeshLambertMaterial({ color: 0xf0deb0 }),
    bld: new THREE.MeshLambertMaterial({ color: 0xe6d3b3, emissive: 0x000000 }),
    est: new THREE.MeshLambertMaterial({ color: 0xbcd2d6, transparent: true, opacity: 0.8, emissive: 0x000000 }),
    land: new THREE.MeshLambertMaterial({ vertexColors: true }),
    water: new THREE.MeshLambertMaterial({ color: 0x4fa3c9, transparent: true, opacity: 0.92 }),
    tree: new THREE.MeshLambertMaterial({ color: 0x4f8a4c }),
    trunk: new THREE.MeshLambertMaterial({ color: 0x8a6440 }),
  };
  Object.entries(parts).forEach(([k, list]) => { if (list.length) g.add(new THREE.Mesh(mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x)).map((x) => { x.deleteAttribute('uv'); return x; })), mats[k])); });
  g.add(new THREE.Mesh(land.geo, mats.land));
  if (land.water) g.add(new THREE.Mesh(land.water, mats.water));
  if (land.trees) g.add(new THREE.Mesh(land.trees, mats.tree));
  if (land.trunks) g.add(new THREE.Mesh(land.trunks, mats.trunk));
  const mark = landmarkFor(c.city, land); g.add(mark);
  // night: windows and street lamps glow amber, after dusk
  const lightPts = [...lampPts];
  [...parts.bld, ...parts.est].forEach((geo) => { geo.computeBoundingBox(); const bb = geo.boundingBox; lightPts.push((bb.min.x + bb.max.x) / 2, bb.max.y + 0.2, (bb.min.z + bb.max.z) / 2); });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lightPts, 3));
  const lights = new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffc070, size: 1.9, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false }));
  g.add(lights);
  // rain: short streaks over the tile, shown when it is raining there now; cloud puffs when it is cloudy
  const rp = [];
  for (let i = 0; i < 300; i++) { const x = (rng() - 0.5) * TILE, z = (rng() - 0.5) * TILE, y = 14 + rng() * 34; rp.push(x, y, z, x + 0.4, y - 3, z); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0.6 }));
  rain.visible = false; g.add(rain);
  const puffs = []; for (let k = 0; k < 4; k++) { const x = (rng() - 0.5) * TILE * 0.7, z = (rng() - 0.5) * TILE * 0.7; for (let j = 0; j < 3; j++) puffs.push(new THREE.IcosahedronGeometry(2.6 + rng() * 2, 1).scale(1.4, 0.6, 1).translate(x + j * 3, 52 + rng() * 3, z + (rng() - 0.5) * 3)); }
  const clouds = new THREE.Mesh(mergeGeometries(puffs), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
  clouds.visible = false; g.add(clouds);
  return { group: g, mats, lights, rain, clouds, mark, estimated, footprints: shown };
}

export async function runCitySheet({ renderer, onEnter, onBack, reduced }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const ui = document.createElement('div'); ui.id = 'lkc';
  ui.innerHTML = `<h1>Builders World<small>Every city on its own clock and its own weather. Hover or use the arrow keys to look, click to go in.</small></h1>
    <button class="back">Back to the street</button>
    <section class="panel" aria-live="polite"></section>
    <div class="note">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · Weather: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> · Lighter blocks are estimated where map data is thin.</div>`;
  document.body.appendChild(ui);
  ui.querySelector('.back').onclick = () => onBack?.();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ed3c4); // the lagoon, as on the map
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x1a1612, 1.1); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-200, 300, 120); scene.add(key);

  // classic isometric: 45° turn, 35.264° tilt, orthographic
  const aspect = innerWidth / innerHeight;
  const portrait = innerWidth / innerHeight < 1;
  const view = portrait ? Math.min(680, 178 / aspect) : Math.max(205, 330 / aspect); // room below for the panel
  const cam = new THREE.OrthographicCamera(-view * aspect, view * aspect, view, -view, -2000, 4000);
  const ISO = new THREE.Vector3(1, Math.tan(THREE.MathUtils.degToRad(35.264)) * Math.SQRT2, 1).normalize();
  const target = new THREE.Vector3().addScaledVector(SY, portrait ? 10 : 30);
  const spots = layout(portrait);
  cam.position.copy(target).addScaledVector(ISO, 1000); cam.lookAt(target);

  const tiles = await Promise.all(CITIES.map(async (c, i) => {
    const [m, wx] = await Promise.all([loadCity(c), weatherFor(c)]);
    const d = diorama(c, m, 100 + i);
    d.group.position.copy(spots[i]);
    scene.add(d.group);
    const tag = document.createElement('button'); tag.className = 'tag'; tag.setAttribute('aria-label', `Go to ${c.city}, ${c.district}`);
    ui.appendChild(tag);
    return { c, d, wx, tag, hover: 0 };
  }));

  // ?cityhour=22 shows every city at that local hour (for checking the night)
  const forced = (() => { const h = +new URLSearchParams(location.search).get('cityhour'); return Number.isFinite(h) && new URLSearchParams(location.search).has('cityhour') ? h : null; })();
  const nowFor = (t) => { if (forced == null) return new Date(); const off = t.wx?.offset ?? Math.round(t.c.lon / 15) * 3600; const d = new Date(); const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0) + forced * 3600000 - off * 1000; return new Date(utc); };
  const SUN = '<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="4" fill="#f2b33d"/><g stroke="#f2b33d" stroke-width="2" stroke-linecap="round"><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4"/></g></svg>';
  const MOON = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M11.5 11.8A6 6 0 0 1 6 2a6 6 0 1 0 7.8 7.8 6 6 0 0 1-2.3 2z" fill="#f7efdc"/></svg>';
  const RAIN = '<svg width="18" height="18" viewBox="0 0 18 18"><path d="M5 10a3.5 3.5 0 0 1 .3-7 4.5 4.5 0 0 1 8.4 2A2.6 2.6 0 0 1 13 10z" fill="#8fa6c9"/><path d="M6 12l-1 3M9.5 12l-1 3M13 12l-1 3" stroke="#4f78b0" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const esc = (x) => String(x).replace(/[<>&"]/g, '');
  function localTime(t) {
    if (forced != null) return `${String(Math.floor(forced)).padStart(2, '0')}:${String(Math.round((forced % 1) * 60)).padStart(2, '0')}`;
    const off = t.wx?.offset ?? Math.round(t.c.lon / 15) * 3600;
    return new Date(Date.now() + off * 1000).toISOString().slice(11, 16);
  }
  function render() {
    tiles.forEach((t) => {
      const sun = sunPosition(nowFor(t), t.c.lat, t.c.lon);
      const day = THREE.MathUtils.smoothstep(sun.elevation, -6, 10), dusk = Math.max(0, 1 - Math.abs(sun.elevation - 2) / 10) * (1 - Math.abs(day - 0.5) * 1.2);
      t.day = day;
      // day: warm and bright; night: a deep blue wash with the windows and lamps lit; dusk: a little gold
      const tint = new THREE.Color().setRGB(0.2 + 0.85 * day + 0.12 * dusk, 0.24 + 0.78 * day + 0.04 * dusk, 0.46 + 0.56 * day - 0.1 * dusk);
      ['ground', 'road', 'bld', 'est', 'tree', 'trunk'].forEach((k) => { const base = { ground: 0x8f8a62, road: 0xf0deb0, bld: 0xe6d3b3, est: 0xbcd2d6, tree: 0x4f8a4c, trunk: 0x8a6440 }[k]; t.d.mats[k].color.set(base).multiply(tint); });
      t.d.mats.land.color.copy(tint); t.d.mats.water.color.set(0x4fa3c9).multiply(tint);
      t.d.mark.traverse((m) => { if (m.isMesh) { m.userData.base ??= m.material.color.getHex(); m.material.color.set(m.userData.base).multiply(tint); } });
      t.d.mats.bld.emissive.setRGB(0.16, 0.1, 0.03).multiplyScalar(1 - day);
      t.d.lights.material.opacity = Math.min(1, (1 - day) * 1.2);
      t.d.rain.visible = !!t.wx?.rain && !reduced;
      t.d.clouds.visible = (t.wx?.cloud ?? 0) > 0.6 || !!t.wx?.rain;
      const night = day < 0.35;
      const temp = t.wx?.temp != null ? `${Math.round(t.wx.temp)}° ${LABEL(t.wx.code)}` : 'Weather loading';
      t.tag.classList.toggle('night', night);
      t.sky = t.wx?.rain ? RAIN : night ? MOON : SUN; t.temp = temp;
      t.tag.innerHTML = `<div class="hd"><b>${esc(t.c.city)}</b><i class="sky ${night && !t.wx?.rain ? 'night' : ''}" title="${t.wx?.rain ? 'Raining' : night ? 'Night' : 'Day'}">${t.sky}</i></div>
        <span class="sub">${esc(t.c.district)} · ${localTime(t)}</span>`;    });
  }
  // the panel: everything about the city you are looking at, and the way in
  const panel = ui.querySelector('.panel');
  let selected = null;
  function showPanel(t) {
    if (!t) return;
    selected = t; tiles.forEach((x) => x.tag.classList.toggle('sel', x === t));
    panel.innerHTML = `<div><h2>${esc(t.c.city)}<small>${esc(t.c.district)} district</small></h2>
      <div class="now"><span><i class="sky ${t.tag.querySelector('.sky.night') ? 'night' : ''}">${t.sky}</i>${localTime(t)} local time</span><span>${esc(t.temp)}</span></div></div>
      <button class="go">Enter ${esc(t.c.district)} →</button>
      <dl><div><dt>Buildings</dt><dd>${t.d.footprints} mapped${t.d.estimated ? `, ${t.d.estimated} estimated` : ''}</dd></div><div><dt>Landmark</dt><dd>${esc(LANDMARK_NAME[t.c.city] || '—')}</dd></div></dl>
      <div class="status ${t.c.live ? '' : 'early'}">${t.c.live ? 'Fully dressed street: people, traffic and places, live now' : 'Real streets from OpenStreetMap, early dressing: come and help build it'}</div>`;
    panel.querySelector('.go').onclick = () => enter(t);
  }
  render();
  showPanel(tiles.find((t) => t.c.live) || tiles[0]);
  const clock = setInterval(() => { render(); showPanel(selected); }, 30000);

  // hover and click
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let hovered = null, diving = null;
  const pick = (ev) => {
    mouse.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(mouse, cam);
    const hit = ray.intersectObjects(tiles.map((t) => t.d.group), true)[0];
    return hit ? tiles.find((t) => t.d.group === hit.object.parent) : null;
  };
  const onMove = (ev) => { hovered = pick(ev); if (hovered) showPanel(hovered); renderer.domElement.style.cursor = hovered ? 'pointer' : 'default'; };
  const enter = (t) => { if (diving) return; diving = { t, k: 0 }; };
  const onClick = (ev) => { const t = pick(ev); if (t) enter(t); };
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('click', onClick);
  // a card: hover or focus opens it; click enters (on a touch screen the first tap opens it, the second enters)
  const touch = matchMedia('(hover: none)').matches;
  tiles.forEach((t, i) => {
    t.tag.onclick = () => { if (touch && selected !== t) { hovered = t; showPanel(t); return; } enter(t); };
    t.tag.onmouseenter = () => { hovered = t; showPanel(t); }; t.tag.onmouseleave = () => { if (document.activeElement !== t.tag) hovered = null; };
    t.tag.onfocus = () => { hovered = t; showPanel(t); }; t.tag.onblur = () => { if (hovered === t) hovered = null; };
    t.tag.onkeydown = (e) => { const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (step) { e.preventDefault(); tiles[(i + step + tiles.length) % tiles.length].tag.focus(); } };
  });

  const v = new THREE.Vector3();
  let raf = 0, last = performance.now();
  const loop = () => {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    tiles.forEach((t) => {
      t.hover += ((hovered === t || selected === t ? 1 : 0) - t.hover) * (1 - Math.exp(-dt * 10));
      t.d.group.position.y = t.hover * 6;
      t.tag.classList.toggle('on', hovered === t);
      if (t.d.rain.visible) { t.d.rain.position.y = -((now / 25) % 11); }
      v.copy(t.d.group.position); v.y += 22; v.addScaledVector(SY, -40); v.project(cam);
      t.tag.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`; t.tag.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
    });
    if (diving) {
      // drop toward the city: zoom in on its tile, then hand over to the street
      diving.k += dt / (reduced ? 0.01 : 0.9);
      const k = Math.min(1, diving.k), e = k * k * (3 - 2 * k);
      cam.zoom = 1 + e * 5;
      cam.position.copy(target).lerp(diving.t.d.group.position, e).addScaledVector(ISO, 1000);
      cam.lookAt(new THREE.Vector3().copy(target).lerp(diving.t.d.group.position, e));
      cam.updateProjectionMatrix();
      if (k >= 1) { cancelAnimationFrame(raf); cleanup(); onEnter?.(diving.t.c); return; }
    }
    renderer.render(scene, cam);
    raf = requestAnimationFrame(loop);
  };
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  loop();

  const onResize = () => { const a = innerWidth / innerHeight; cam.left = -view * a; cam.right = view * a; cam.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); };
  addEventListener('resize', onResize);
  function cleanup() {
    clearInterval(clock); removeEventListener('resize', onResize);
    renderer.domElement.removeEventListener('pointermove', onMove); renderer.domElement.removeEventListener('click', onClick);
    ui.remove(); style.remove();
  }
  window.__bwCities = { ready: true, tiles: tiles.map((t) => ({ city: t.c.city, footprints: t.d.footprints, estimated: t.d.estimated, rain: !!t.wx?.rain })) };
}
