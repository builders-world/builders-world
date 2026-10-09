import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sunPosition } from './sun.js';
import { mulberry32 } from '../mesh.js';

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
#lkc .tag { position: absolute; transform: translate(-50%, -100%); pointer-events: auto; cursor: pointer; text-align: center; padding: 7px 12px; border-radius: 12px;
  background: #f7efdc; color: #3b2a20; box-shadow: 0 4px 0 rgba(59,42,32,.2); white-space: nowrap; transition: transform .15s ease, background .15s ease; }
#lkc .tag .more { display: none; }
#lkc .tag:hover .more, #lkc .tag.on .more { display: block; }
#lkc .tag:hover, #lkc .tag.on { background: #fff; transform: translate(-50%, -106%); }
#lkc .tag b { display: block; font: 800 18px/1.2 "Baloo 2", ui-rounded, system-ui, sans-serif; }
#lkc .tag span { display: block; font-size: 12.5px; color: #7a6552; margin-top: 2px; }
#lkc .tag em { display: inline-block; margin-top: 6px; font: 700 11px/1 system-ui; font-style: normal; padding: 4px 8px; border-radius: 999px; background: #f2b33d; color: #2a1a02; }
#lkc .tag em.prev { background: rgba(255,255,255,.12); color: #dfe5f7; }
#lkc .back { position: absolute; right: 22px; top: 22px; pointer-events: auto; border: 0; border-radius: 999px; padding: 10px 18px; background: #f7efdc; color: #3b2a20; box-shadow: 0 3px 0 rgba(59,42,32,.2); font: 700 14px system-ui; cursor: pointer; }
@media (max-width: 600px) { #lkc h1 { font-size: 24px; left: 16px; top: 16px; max-width: 60%; } #lkc .back { right: 12px; top: 14px; padding: 8px 12px; } #lkc .tag { padding: 5px 9px; } #lkc .tag b { font-size: 14px; } #lkc .tag span { font-size: 11px; } }
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

// one diorama: a raised tile, real roads, real footprints (estimated blocks where the map is thin)
function diorama(c, manifest, seed) {
  const g = new THREE.Group();
  const s = (TILE / 2) / (manifest?.radius || c.r);
  const rng = mulberry32(seed);
  const parts = { ground: [], road: [], bld: [], est: [] };
  parts.ground.push(new THREE.CylinderGeometry(TILE * 0.56, TILE * 0.6, 6, 6).rotateY(Math.PI / 6).translate(0, -3, 0));
  const roads = manifest?.roads || [];
  roads.forEach((r) => {
    const w = Math.max(1.2, (r.w || 6) * s);
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
      const L = Math.hypot(bx - ax, bz - az) * s;
      if (L < 0.2) continue;
      const mx = ((ax + bx) / 2) * s, mz = ((az + bz) / 2) * s;
      if (Math.hypot(mx, mz) > TILE * 0.5) continue;
      parts.road.push(new THREE.BoxGeometry(w, 0.3, L + w * 0.5).rotateY(Math.atan2(bx - ax, bz - az)).translate(mx, 0.15, mz));
    }
  });
  const blds = manifest?.buildings || [];
  blds.forEach((b) => {
    const pts = b.pts.map(([x, z]) => new THREE.Vector2(x * s, -z * s));
    if (pts.length < 3 || pts.some((p) => Math.hypot(p.x, p.y) > TILE * 0.52)) return;
    const h = Math.max(1.2, ((b.h ?? (b.levels ? b.levels * 3 : 4 + rng() * 9)) * s) * 1.6);
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2);
    parts.bld.push(geo);
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
            if (Math.hypot(x, z) > TILE * 0.48) return;
            const w = (6 + rng() * 6) * s, dd = (6 + rng() * 6) * s, h = (4 + rng() * 9) * s * 1.6;
            parts.est.push(new THREE.BoxGeometry(w, h, dd).rotateY(Math.atan2(tx, tz)).translate(x, h / 2, z));
            estimated++;
          });
        }
      }
    });
  }
  const mats = {
    ground: new THREE.MeshLambertMaterial({ color: 0xa4ab7c }),
    road: new THREE.MeshLambertMaterial({ color: 0xf0deb0 }),
    bld: new THREE.MeshLambertMaterial({ color: 0xe6d3b3 }),
    est: new THREE.MeshLambertMaterial({ color: 0xbcd2d6, transparent: true, opacity: 0.8 }),
  };
  Object.entries(parts).forEach(([k, list]) => { if (list.length) g.add(new THREE.Mesh(mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x)).map((x) => { x.deleteAttribute('uv'); return x; })), mats[k])); });
  // night lights: amber points over buildings and roads, shown after dusk
  const lightPts = [];
  [...parts.bld, ...parts.est].forEach((geo) => { geo.computeBoundingBox(); const bb = geo.boundingBox; lightPts.push((bb.min.x + bb.max.x) / 2, bb.max.y + 0.2, (bb.min.z + bb.max.z) / 2); });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lightPts, 3));
  const lights = new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffb454, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0 }));
  g.add(lights);
  // rain: short streaks over the tile, shown when it is raining there now
  const rp = [];
  for (let i = 0; i < 260; i++) { const x = (rng() - 0.5) * TILE, z = (rng() - 0.5) * TILE, y = 14 + rng() * 34; rp.push(x, y, z, x + 0.4, y - 3, z); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0.6 }));
  rain.visible = false;
  g.add(rain);
  return { group: g, mats, lights, rain, estimated, footprints: blds.length };
}

export async function runCitySheet({ renderer, onEnter, onBack, reduced }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const ui = document.createElement('div'); ui.id = 'lkc';
  ui.innerHTML = `<h1>Builders World<small>Every city on its own clock and its own weather. Pick one to go in.</small></h1>
    <button class="back">Back to the street</button>
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
  const view = portrait ? Math.min(560, 138 / aspect) : Math.max(170, 285 / aspect);
  const cam = new THREE.OrthographicCamera(-view * aspect, view * aspect, view, -view, -2000, 4000);
  const ISO = new THREE.Vector3(1, Math.tan(THREE.MathUtils.degToRad(35.264)) * Math.SQRT2, 1).normalize();
  const target = new THREE.Vector3().addScaledVector(SY, portrait ? -18 : 0);
  const spots = layout(portrait);
  cam.position.copy(target).addScaledVector(ISO, 1000); cam.lookAt(target);

  const tiles = await Promise.all(CITIES.map(async (c, i) => {
    const [m, wx] = await Promise.all([loadCity(c), weatherFor(c)]);
    const d = diorama(c, m, 100 + i);
    d.group.position.copy(spots[i]);
    scene.add(d.group);
    const tag = document.createElement('div'); tag.className = 'tag';
    ui.appendChild(tag);
    return { c, d, wx, tag, hover: 0 };
  }));

  function localTime(t) {
    const off = t.wx?.offset ?? Math.round(t.c.lon / 15) * 3600;
    return new Date(Date.now() + off * 1000).toISOString().slice(11, 16);
  }
  function render() {
    tiles.forEach((t) => {
      const sun = sunPosition(new Date(), t.c.lat, t.c.lon);
      const day = THREE.MathUtils.smoothstep(sun.elevation, -6, 10);
      const tint = new THREE.Color().setRGB(0.32 + 0.68 * day, 0.38 + 0.62 * day, 0.62 + 0.38 * day);
      ['ground', 'road', 'bld', 'est'].forEach((k) => { const base = { ground: 0xa4ab7c, road: 0xf0deb0, bld: 0xe6d3b3, est: 0xbcd2d6 }[k]; t.d.mats[k].color.set(base).multiply(tint); });
      t.d.lights.material.opacity = 1 - day;
      t.d.rain.visible = !!t.wx?.rain && !reduced;
      const temp = t.wx?.temp != null ? `${Math.round(t.wx.temp)}° ${LABEL(t.wx.code)}` : 'Weather loading';
      const where = t.c.district === t.c.city || portrait ? '' : `${t.c.district} · `;
      const brief = portrait && t.wx?.temp != null ? `${Math.round(t.wx.temp)}°` : temp;
      t.tag.innerHTML = `<b>${t.c.city}</b><span>${where}${localTime(t)} · ${brief}</span>
        <div class="more">${portrait ? `<span>${t.c.district} · ${temp}</span>` : ''}<span>${t.d.footprints} mapped buildings${t.d.estimated ? `, ${t.d.estimated} estimated` : ''}</span>
        ${t.c.live ? '<span>Fully dressed street</span>' : '<span>Real streets, early dressing</span>'}<em>Enter ${t.c.district}</em></div>`;
    });
  }
  render();
  const clock = setInterval(render, 30000);

  // hover and click
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let hovered = null, diving = null;
  const pick = (ev) => {
    mouse.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(mouse, cam);
    const hit = ray.intersectObjects(tiles.map((t) => t.d.group), true)[0];
    return hit ? tiles.find((t) => t.d.group === hit.object.parent) : null;
  };
  const onMove = (ev) => { hovered = pick(ev); renderer.domElement.style.cursor = hovered ? 'pointer' : 'default'; };
  const enter = (t) => { if (diving) return; diving = { t, k: 0 }; };
  const onClick = (ev) => { const t = pick(ev); if (t) enter(t); };
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('click', onClick);
  tiles.forEach((t) => { t.tag.onclick = () => enter(t); t.tag.onmouseenter = () => { hovered = t; }; t.tag.onmouseleave = () => { hovered = null; }; });

  const v = new THREE.Vector3();
  let raf = 0, last = performance.now();
  const loop = () => {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    tiles.forEach((t) => {
      t.hover += ((hovered === t ? 1 : 0) - t.hover) * (1 - Math.exp(-dt * 10));
      t.d.group.position.y = t.hover * 6;
      t.tag.classList.toggle('on', hovered === t);
      if (t.d.rain.visible) { t.d.rain.position.y = -((now / 25) % 11); }
      v.copy(t.d.group.position); v.y += 34; v.addScaledVector(SY, -40); v.project(cam);
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
