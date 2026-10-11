import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { loadManifest, DEFAULT_PLACE } from './osm.js';
import { buildWorld, buildSky } from './world.js';
import { shared } from './shaders.js';
import { initChrome } from './ui.js';
import { loadProfile } from './onboarding/state.js';
import { signedIn } from './session.js';
import { createAvatarModel } from './onboarding/avatar.js';
import { prepareLook, dress } from './look/style.js';
import { createLook, blueHourSky, createWeather } from './look/index.js';
import { TIERS, ORDER, LABEL, deviceInfo, autoTier, graphicsChoice, saveChoice } from './look/quality.js';
import { ContactShadePass } from './look/ao.js';
import { loadKit } from './look/kit.js';
import { rigAvatar } from './look/anim.js';
import { walkMarker } from './look/trail.js';
import { SKIN_CSS, loadFont } from './look/uikit.js';
import { audioEngine, sfx } from './look/audio.js';
import { createInput } from './look/input.js';
import { createOnline } from './look/online.js';
import { weather as wx } from './look/surfaces.js';
import { pushOutDynamic } from './look/physics.js';
import { setEstateNames } from './estates.js';
import { CITY_INFO } from './look/cityinfo.js';

const q = new URLSearchParams(location.search);
const TEST_PACE = +(q.get('pace') ?? 1); // tests walk faster; players never see this
const PLAYER_R = 0.42; // the body is about 0.5 m across; 0.42 fits a 2 m gate with room to spare
// one cartoon skin over every panel on the street, Codex's chrome included (world bible 11.1)
{ const st = document.createElement('style'); st.textContent = SKIN_CSS; document.head.appendChild(st); document.body.classList.add('bw-skin'); loadFont(); }
const arrivalProfile = loadProfile();
const resident = q.get('resident') === '1' && arrivalProfile.step === 'home' && arrivalProfile.city === 'Lagos' && arrivalProfile.district === 'Yaba';
const place = {
  ...DEFAULT_PLACE,
  name: q.get('name') || DEFAULT_PLACE.name,
  lat: +(q.get('lat') ?? DEFAULT_PLACE.lat),
  lon: +(q.get('lon') ?? DEFAULT_PLACE.lon),
  radius: +(q.get('r') ?? DEFAULT_PLACE.radius),
  city: q.get('city') || 'Lagos',
};
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};
const norm = (t) => (t === 'day' || t === 'light' ? 'day' : 'night');
let themeName = norm(q.get('theme') || store.get('bw-theme') || 'night');

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// live weather for the street, at city level; ?wx=storm or ?hour=19.5 preview other conditions
const weatherFeed = createWeather({ district: place, profile: arrivalProfile, query: q });
weatherFeed.start();
shared.uReduced.value = reduced ? 1 : 0;
const still = q.get('still') === '1';
if (q.get('hud') === '0') document.body.classList.add('nohud');

const canvas = document.getElementById('c');
// Depth: layers sit 3 cm or more apart and the near plane is 0.3 m, which resolves them past the fog line.
// A logarithmic depth buffer also works (?logz=1) but costs about 4.5 ms a frame, so it is opt-in.
// the post stack draws into its own multisampled buffer, so the canvas needs no antialiasing of its own
const renderer = new THREE.WebGLRenderer({ canvas, antialias: q.get('post') === '0', powerPreference: 'high-performance', logarithmicDepthBuffer: q.get('logz') === '1' });
// graphics quality (look/quality.js): Auto reads the machine; the player can choose in Settings
const gfx = { info: deviceInfo(renderer.getContext()), choice: graphicsChoice(q), downs: 0 };
let quality = gfx.choice === 'auto' ? autoTier(gfx.info) : gfx.choice;
let BASE_PR = Math.min(devicePixelRatio, TIERS[quality].pr);
renderer.setPixelRatio(BASE_PR);
renderer.setSize(innerWidth, innerHeight, false);

const scene = new THREE.Scene();
// near plane at 0.3 m: more depth precision across the district, still close enough for first person
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 4000);

const composer = new EffectComposer(
  renderer,
  new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: TIERS[quality].msaa })
);
composer.addPass(new RenderPass(scene, camera));
// contact shading straight after the scene, before bloom and the grade (high and ultra)
const aoPass = new ContactShadePass(camera, 8);
aoPass.enabled = false;
composer.addPass(aoPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.5, 0.42);
let street = null;
composer.addPass(bloom);
// the glow is soft by nature: on sharp screens it is worked out at half size, which looks the same
{ const set = bloom.setSize.bind(bloom); bloom.setSize = (w, h) => { const k = renderer.getPixelRatio() >= 1.4 ? 0.5 : 1; set(Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))); }; }
// a light grade before output: a little more saturation and contrast, so the clay reads bright and
// lively rather than washed out (Elvis, 10 October 2026)
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uSat: { value: 1.12 }, uCon: { value: 1.05 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat, uCon; varying vec2 vUv;
    void main() { vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 g = mix(vec3(l), c.rgb, uSat); g = (g - 0.18) * uCon + 0.18; gl_FragColor = vec4(max(g, 0.0), c.a); }`,
});
composer.addPass(grade);
composer.addPass(new OutputPass());

// 60 frames a second (Elvis, 10 October 2026): the resolution follows the frame time. Over 18 ms on
// average and it steps down; comfortably under 14 ms for a while and it steps back up. Pixels are what
// cost most here, so this keeps the frame rate on any machine at the best sharpness it can afford.
const governor = { scale: 1, sum: 0, n: 0, good: 0, last: performance.now(), min: TIERS[quality].govMin };
function govern() {
  const now = performance.now(), dt = now - governor.last; governor.last = now;
  if (dt > 250 || document.hidden) return; // a stall or a background tab says nothing about the GPU
  governor.sum += dt; governor.n++;
  if (governor.n < 45) return;
  const avg = governor.sum / governor.n; governor.sum = 0; governor.n = 0;
  let next = governor.scale;
  // on Auto, a machine that cannot hold the frame rate even at the lowest resolution steps down a tier
  if (gfx.choice === 'auto' && governor.scale <= governor.min + 0.001 && avg > (TIERS[quality].fps30 ? 40 : 24)) {
    if (++gfx.downs >= 6 && ORDER.indexOf(quality) > 0) {
      gfx.downs = 0;
      applyGraphics(ORDER[ORDER.indexOf(quality) - 1]);
      lookRef?.hud.toast(`Graphics set to ${LABEL[quality]} to keep things smooth. Change it in Settings.`, 4200);
      return;
    }
  } else gfx.downs = 0;
  // most tiers aim for 60; Ultra aims never to drop under 30, and keeps every pixel while it is above it
  const slow = TIERS[quality].fps30 ? 34.5 : 18.5, fast = TIERS[quality].fps30 ? 26 : 14;
  if (avg > slow) { next = Math.max(governor.min, governor.scale - (avg > slow * 1.4 ? 0.15 : 0.08)); governor.good = 0; }
  else if (avg < fast) { if (++governor.good >= 3) { next = Math.min(1, governor.scale + 0.05); governor.good = 0; } }
  else governor.good = 0;
  if (Math.abs(next - governor.scale) > 0.001) {
    governor.scale = next;
    renderer.setPixelRatio(BASE_PR * next); composer.setPixelRatio(BASE_PR * next); composer.setSize(innerWidth, innerHeight); street?.setSize(innerWidth, innerHeight);
  }
}

// switch tier while playing: resolution, edge smoothing, contact shading, bloom and shadows change here;
// the street's own share (sun shadows, lamps, distances, texture sharpness) is in look/index.js
let shadowType = null, lookRef = null, worldRef = null;
function applyGraphics(name) {
  const t = TIERS[name]; if (!t) return;
  quality = name;
  BASE_PR = Math.min(devicePixelRatio, t.pr);
  governor.min = t.govMin; governor.scale = 1; governor.good = 0;
  [composer.renderTarget1, composer.renderTarget2].forEach((rt) => {
    let dirty = false;
    if (rt.samples !== t.msaa) { rt.samples = t.msaa; dirty = true; }
    if (t.ao && !rt.depthTexture) { rt.depthTexture = new THREE.DepthTexture(rt.width, rt.height, THREE.FloatType); dirty = true; }
    else if (!t.ao && rt.depthTexture) { rt.depthTexture.dispose(); rt.depthTexture = null; dirty = true; }
    if (dirty) rt.dispose();
  });
  aoPass.enabled = t.ao > 0; aoPass.setSamples(t.ao || 8);
  bloom.allowed = t.bloom && (worldRef?.env.bloom.on ?? true); bloom.enabled = bloom.allowed;
  const type = t.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  if (renderer.shadowMap.enabled !== t.shadows > 0 || (t.shadows && shadowType !== type)) {
    renderer.shadowMap.enabled = t.shadows > 0; renderer.shadowMap.type = type; shadowType = type;
    scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { if (m?.isMaterial) m.needsUpdate = true; }); });
  }
  renderer.setPixelRatio(BASE_PR); composer.setPixelRatio(BASE_PR); composer.setSize(innerWidth, innerHeight);
  lookRef?.setGraphics?.(t, name);
  lookRef?.setSize?.(innerWidth, innerHeight);
}
addEventListener('bw:graphics', (e) => {
  const c = e.detail;
  if (c !== 'auto' && !ORDER.includes(c)) return;
  gfx.choice = c; gfx.downs = 0; saveChoice(c);
  applyGraphics(c === 'auto' ? autoTier(gfx.info) : c);
});
// a small frame counter for anyone choosing a tier (Settings, Show frame rate)
const fpsEl = document.createElement('div');
fpsEl.id = 'bw-fps';
Object.assign(fpsEl.style, { position: 'fixed', bottom: '58px', left: '50%', transform: 'translateX(-50%)', zIndex: '30', padding: '3px 10px', borderRadius: '999px', background: '#f7efdc', color: '#3b2a20', font: '700 12px/1.3 "Baloo 2", system-ui, sans-serif', boxShadow: '0 2px 0 rgba(59,42,32,.22)', display: 'none', pointerEvents: 'none' });
document.body.appendChild(fpsEl);
const fpsMeter = { on: (() => { try { return localStorage.getItem('bw-fps') === '1'; } catch { return false; } })(), n: 0, t: performance.now() };
addEventListener('bw:fps', (e) => { fpsMeter.on = !!e.detail; fpsEl.style.display = fpsMeter.on ? 'block' : 'none'; try { localStorage.setItem('bw-fps', fpsMeter.on ? '1' : '0'); } catch { /* */ } });
if (fpsMeter.on) fpsEl.style.display = 'block';
function countFps() {
  if (!fpsMeter.on) return;
  fpsMeter.n++;
  const now = performance.now();
  if (now - fpsMeter.t > 500) { fpsEl.textContent = `${Math.round((fpsMeter.n * 1000) / (now - fpsMeter.t))} fps · ${LABEL[quality]}`; fpsMeter.n = 0; fpsMeter.t = now; }
}

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setSize(innerWidth, innerHeight);
  street?.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const m = o.material;
    if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
  });
}

async function main() {
  // the city sheet: every city as an isometric diorama; picking one loads its district
  if (q.get('view') === 'cities') {
    const { runCitySheet } = await import('./look/cities.js');
    document.getElementById('loader')?.classList.add('gone');
    document.getElementById('fade')?.classList.add('out');
    document.body.classList.add('nohud', 'bw-cities');
    await runCitySheet({
      renderer, reduced,
      onBack: () => { location.search = '?world=1'; },
      onEnter: (c) => { location.search = `?world=1&name=${encodeURIComponent(c.district)}&city=${encodeURIComponent(c.city)}&lat=${c.lat}&lon=${c.lon}&r=${c.r}`; },
    });
    return;
  }
  const { manifest, via } = resident
    ? { manifest: await (await fetch('./data/sample.json')).json(), via: 'sample' }
    : await loadManifest(place);

  // the Yaba asset kit (GLBs from the parent repo); the street falls back to code-built props without it
  let kit = null;
  if (q.get('kit') !== '0') {
    try { kit = await loadKit(); } catch (err) { console.warn('Yaba asset kit not loaded, using built-in props', err); }
  }
  let world = null;
  let sky = null;
  const fade = document.getElementById('fade');
  const loader = document.getElementById('loader');

  // a quick dip to the page colour hides rebuilds and cuts
  // ---- the switch (Elvis, 10 October 2026: "just like GTA... that transition effect it does when you are switching from
  // one character to another, from Franklin to Trevor... then zooms back on you and shows where you teleported to").
  // From the aerial view (and quick travel on the map) the camera climbs into the sky, glides over to the place, and
  // drops back down to you in hard steps, a whoosh and a thud at each, the colour drained until you land.
  const swoop = { on: false, t: 0, a: new THREE.Vector3(), b: new THREE.Vector3(), act: null, acted: false, H: 0, hits: 0, p0: new THREE.Vector3(), l0: new THREE.Vector3() };
  const swoopFx = document.createElement('div'); swoopFx.id = 'bw-swoop';
  swoopFx.innerHTML = `<style>#bw-swoop { position: fixed; inset: 0; z-index: 12; pointer-events: none; opacity: 0; transition: opacity .25s; background: radial-gradient(ellipse at center, transparent 45%%, rgba(8,12,24,.55) 100%%), repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 2px, transparent 2px 5px); }
    body.bw-swoop #bw-swoop { opacity: 1; } body.bw-swoop canvas { filter: saturate(.18) contrast(1.18) brightness(1.04); transition: filter .2s; }
    #bw-swoop.hit { animation: bwhit .32s ease-out; } @keyframes bwhit { 0%% { background-color: rgba(255,255,255,.55); } 100%% { background-color: transparent; } }</style>`;
  document.body.appendChild(swoopFx);
  function switchTo(x, z, act) {
    if (reduced || still || swoop.on) { cut(act); return; }
    Object.assign(swoop, { on: true, t: 0, acted: false, hits: 0, act });
    swoop.p0.copy(camPos); swoop.l0.copy(look); swoop.a.set(camPos.x, 0, camPos.z); swoop.b.set(x, 0, z);
    swoop.H = Math.max(camPos.y + 90, 340);
    document.body.classList.add('bw-swoop'); sfx('whoosh');
  }
  const swoopHit = () => { sfx('thud'); swoopFx.classList.remove('hit'); void swoopFx.offsetWidth; swoopFx.classList.add('hit'); };
  // one frame of it: overrides where the camera is and looks, given where it would be (desired, focus)
  const sw1 = new THREE.Vector3(), sw2 = new THREE.Vector3();
  function swoopFrame(dt, desired, focus) {
    swoop.t += dt; const T = swoop.t, H = swoop.H, ease = (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2), out3 = (u) => 1 - (1 - u) ** 3;
    if (T < 0.6) { const u = ease(T / 0.6); camPos.lerpVectors(swoop.p0, sw1.set(swoop.a.x, H, swoop.a.z + 0.02), u); look.lerpVectors(swoop.l0, sw2.set(swoop.a.x, 0, swoop.a.z), u); return; }
    if (T < 1.5) { const u = ease((T - 0.6) / 0.9); camPos.set(swoop.a.x + (swoop.b.x - swoop.a.x) * u, H, swoop.a.z + (swoop.b.z - swoop.a.z) * u + 0.02); look.set(camPos.x, 0, camPos.z - 0.02); if (u > 0.3 && u - dt / 0.9 <= 0.3) sfx('whoosh'); return; }
    if (!swoop.acted) { swoop.acted = true; swoop.act?.(); swoop.b.set(player.x, 0, player.z); }
    const B = swoop.b, stops = [[1.5, H, H * 0.34], [2.0, H * 0.34, H * 0.1]];
    if (T < 2.5) { const k = T < 2.0 ? 0 : 1, [t0, h0, h1] = stops[k], u = Math.min(1, (T - t0) / 0.2), h = h0 + (h1 - h0) * out3(u); camPos.set(B.x, h, B.z + 0.02 + h * 0.03); look.set(B.x, 0, B.z); if (u >= 1 && swoop.hits <= k) { swoop.hits = k + 1; swoopHit(); } return; }
    const u = Math.min(1, (T - 2.5) / 0.5), e = out3(u);
    camPos.set(B.x, H * 0.1, B.z + 0.02 + H * 0.003).lerp(desired, e); look.set(B.x, 0, B.z).lerp(focus, e);
    if (u >= 1) { swoop.on = false; document.body.classList.remove('bw-swoop'); swoopHit(); }
  }
  addEventListener('bw:swoopto', (e) => { const d = e.detail || {}; switchTo(d.x, d.z, () => { player.set(d.x, 0, d.z); onStreetGround(player); if (cam.aerial) setAerial(false); walkTarget = null; walkPath = null; marker.visible = false; if (d.name) (street?.hud.toast ?? chrome.toast)(`Quick travel: you are at ${d.name}.`, 2600); }); });
  function cut(fn) {
    if (reduced || still) { fn(); return; }
    fade.style.transition = 'opacity .13s ease';
    fade.classList.remove('out');
    setTimeout(() => { fn(); fade.classList.add('out'); }, 140);
  }

  // ---- avatar: the shared provisional avatar, until the final design arrives ----
  const avatar = new THREE.Group();
  const body = createAvatarModel(resident ? arrivalProfile.avatar : { color: '#e2b13c', style: 'jacket' }).root;
  prepareLook(body);
  const rig = rigAvatar(body); // jointed legs and arms: walk, run, jump
  body.userData.rig = rig;
  body.userData.isPlayer = true; // the emote director leaves you alone (expressions.js)
  // your look from the wardrobe (style.js), kept on this device and sent with your presence
  try { const saved = JSON.parse(localStorage.getItem('bw-style') || 'null'); if (saved) dress(body, saved, rig); } catch { /* */ }
  // the wardrobe turns the camera round to face you, like a mirror
  let mirrorSave = null, shotCam = null;
  addEventListener('bw:shot', (e) => { shotCam = e.detail || null; });
  addEventListener('bw:mirror', (e) => {
    if (e.detail) { mirrorSave = mirrorSave || { yaw: cam.yawT, dist: cam.distT, pitch: cam.pitchT }; cam.yawT = heading + Math.PI; cam.distT = 4.9; cam.pitchT = 0.06; }
    else if (mirrorSave) { cam.yawT = mirrorSave.yaw; cam.distT = mirrorSave.dist; cam.pitchT = mirrorSave.pitch; mirrorSave = null; }
  });
  addEventListener('bw:style', (e) => { dress(body, e.detail, rig); try { localStorage.setItem('bw-style', JSON.stringify(body.userData.look)); } catch { /* */ } });
  avatar.add(body);
  scene.add(avatar);
  if (resident) {
    const returnLink = document.createElement('a');
    returnLink.href = './';
    returnLink.textContent = '← Your arrival / edit avatar';
    Object.assign(returnLink.style, { position: 'fixed', bottom: '68px', left: '14px', zIndex: '20', color: 'var(--fg)', background: 'var(--glass)', padding: '10px 16px', font: '700 14px/1 var(--bw-font, inherit)', borderRadius: '999px', textDecoration: 'none', boxShadow: 'var(--shadow)' });
    document.body.appendChild(returnLink);
  }

  // destination marker for click-to-walk (static; it only exists while there is a target)
  const marker = walkMarker();
  marker.visible = false;
  scene.add(marker);

  const player = new THREE.Vector3();
  let heading = 0;
  let walkTarget = null, walkPath = null, walkAt = 0, replans = 0, sidestepT = 0;
  const sidestep = new THREE.Vector3();

  const cam = { yaw: 0, yawT: 0, pitch: 0.2, pitchT: 0.2, dist: 7, distT: 7, aerial: false };
  const modes = { street: { pitch: 0.2, dist: 7 }, aerial: { pitch: 0.62, dist: 0 } };
  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  let snap = true;
  const holds = { rotL: false, rotR: false };
  const limits = () => (cam.aerial ? [60, world.radius * 2.2] : [3.5, 40]);

  // ---- world (re)build: same layout, different light ----
  function build(name) {
    themeName = name;
    document.documentElement.dataset.theme = name === 'day' ? 'light' : 'dark';
    store.set('bw-theme', name);
    shared.uDay.value = name === 'day' ? 1 : 0;
    if (world) { scene.remove(world.scene); disposeTree(world.scene); }
    if (sky) { scene.remove(sky); disposeTree(sky); }
    setEstateNames(CITY_INFO[place.city]?.estates); // estates named after this city's streets, not Yaba's
    world = buildWorld(manifest, via, name, kit);
    world.place = { name: place.name, city: place.city, lat: place.lat, lon: place.lon };
    sky = world.env.wet ? blueHourSky() : buildSky(name);
    scene.add(sky, world.scene);
    const E = world.env;
    scene.fog = new THREE.Fog(E.fog, world.radius * E.fogNear, world.radius * E.fogFar);
    scene.background = new THREE.Color(E.bg);
    renderer.toneMapping = E.tone === 'aces' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    renderer.toneMappingExposure = E.exposure;
    bloom.allowed = E.bloom.on && TIERS[quality].bloom; bloom.enabled = bloom.allowed;
    bloom.strength = E.bloom.strength; bloom.radius = E.bloom.radius; bloom.threshold = E.bloom.threshold;
    chrome.setWorld(world, via, place);
    street?.dispose();
    if (q.get('look') !== '0') street = createLook({ renderer, scene, camera, world, reduced, quality, sky, bloom, weatherFeed, avatar: body });
    lookRef = street; worldRef = world;
  }

  function setAerial(flag) {
    if (flag && street?.inside) { (street?.hud.toast ?? chrome.toast)('Step outside to see the aerial view.', 2200); return; } // indoors the city is not drawn
    if (flag === cam.aerial) return;
    modes[cam.aerial ? 'aerial' : 'street'] = { pitch: cam.pitchT, dist: cam.distT };
    cam.aerial = flag;
    const m = modes[flag ? 'aerial' : 'street'];
    cam.pitchT = cam.pitch = m.pitch;
    cam.distT = cam.dist = m.dist || world.radius * 1.35;
    walkTarget = null; walkPath = null; marker.visible = false;
    snap = true;
    chrome.setView(flag);
  }

  // land on ground joined to the streets: a click or a jump never drops you in a boxed-in garden strip
  function onStreetGround(p) {
    world.resolve(p, PLAYER_R);
    if (world.reachable && !world.reachable(p.x, p.z)) { const q = world.nearestReachable(p.x, p.z); if (q) { p.set(q.x, 0, q.z); world.resolve(p, PLAYER_R); } }
    return p;
  }
  function goto(id) {
    if (street?.inside) { (street?.hud.toast ?? chrome.toast)('Leave the building first: walk out through the door.', 2600); return; }
    const pl = world.plots.find((p) => p.b.id === id);
    if (!pl) return;
    cut(() => {
      const f = world.frontOf([pl.center.x, pl.center.z]);
      player.set(f.x, 0, f.z);
      onStreetGround(player);
      heading = cam.yaw = cam.yawT = f.yaw;
      walkTarget = null; walkPath = null; marker.visible = false;
      setAerial(false);
      snap = true;
      chrome.showCard(pl.b, true);
    });
  }

  function setTheme(name) {
    if (name === themeName) return;
    cut(() => build(name));
  }

  const chrome = initChrome({
    onView: (a) => (a && street?.inside ? setAerial(true) : cut(() => setAerial(a))),
    onTheme: () => setTheme(themeName === 'night' ? 'day' : 'night'),
    onZoom: (dir) => { const [lo, hi] = limits(); cam.distT = Math.max(lo, Math.min(hi, cam.distT * (1 + dir * 0.22))); },
    setHold: (k, on) => { holds[k] = on; },
    onGoto: goto,
  });

  build(themeName);
  chrome.setView(false);
  player.set(world.spawn.x, 0, world.spawn.z);
  heading = world.spawnYaw;
  cam.yaw = cam.yawT = street?.viewYaw ?? world.spawnYaw;
  modes.aerial.dist = world.radius * 1.35;

  if (q.get('view') === 'aerial') { setAerial(true); cam.yaw = cam.yawT = 2.5; }

  // ---- input ----
  const keys = new Set();
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select')) {
      // typing in a field is not playing, but Esc always gets you out of it (and out of the panel it is in)
      if (e.key !== 'Escape' || e.target.closest('#lk-say')) return;
      e.target.blur();
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    // phone, map and bag take their keys first, and hold movement while open
    if (!e.repeat && street?.hud.menuKey(k)) { e.preventDefault(); keys.clear(); return; }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) street?.hud.walkAway?.(); // walking off closes the notice board
    if (street?.hud.isOpen() && !street?.canWalkOff && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) return;
    if (k === 'v') { if (!e.repeat) { if (cam.aerial) cut(() => setAerial(false)); else cycleView(); } }
    else if (k === 'b') { if (!e.repeat) { if (street?.inside && !cam.aerial) setAerial(true); else cut(() => setAerial(!cam.aerial)); } }
    else if (k === 'c') { if (!e.repeat) setTravel(!travel.on); }
    else if (k === 'q') { if (!e.repeat) setDog(!dog.on); }
    else if (k >= '1' && k <= '6' && k.length === 1) { if (!e.repeat) street?.chat?.emote(+k, player); }
    else if (k === 'g' && !e.repeat) dispatchEvent(new CustomEvent('bw:emotes')); // the emote sheet (look/emotepanel.js)
    else if (k === 'n') { if (!e.repeat) { audio.wake(); audio.set('music', !audio.settings.music); (street?.hud.toast ?? chrome.toast)(audio.settings.music ? 'Music on' : 'Music off', 1400); } }
    else if (k === 't') { if (!e.repeat) setTheme(themeName === 'night' ? 'day' : 'night'); }
    else if (k === 'h') { if (!e.repeat) document.body.classList.toggle('nohud'); }
    else if (k === '?' || k === '/') chrome.toggleHelp();
    else if (k === 'e' && !e.repeat && street?.hud.interact()) { /* handled by the street */ }
    else if (k === 'f' && !e.repeat && street?.seatAction?.('close')) { /* close the laptop at your desk */ }
    else if (k === 'f' && !e.repeat && street?.feed?.()) { /* hold out corn or a biscuit for the animals (fear.js) */ }
    else if (k === 'o' && !e.repeat && street?.seatAction?.('desk')) { /* the desk computer: sign in, or sign out */ }
    else if (k === 'p' && !e.repeat && street?.profiler) street.profiler.toggle(); // the profiler: who is that?
    else if (k === 'r' && !e.repeat && street?.seatAction?.('read')) { /* read your book on the sofa */ }
    else if (k === 'r' && !e.repeat && riding) { audio.wake(); const st = audio.nextStation(); (street?.hud.toast ?? chrome.toast)(`📻 ${st.name} · ${st.sub}`, 2200); } // the radio
    else if ((k === 'g' || k === 'l' || k === 'y') && !e.repeat && street?.pets?.act({ g: 'ball', l: 'laser', y: 'whistle' }[k])) { /* play with your pet */ }
    else if (k === 'escape') { street?.hud.close(); chrome.unpin(); chrome.hideCard(); chrome.toggleList(false); chrome.toggleHelp(false); }
    else if (k === '=' || k === '+') zoomKey(-1);
    else if (k === '-' || k === '_') zoomKey(1);
    else if (k === ' ') { e.preventDefault(); if (!e.repeat) jumpQueued = true; }
    else { keys.add(k); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { walkTarget = null; walkPath = null; marker.visible = false; } }
  });
  function zoomKey(dir) { const [lo, hi] = limits(); cam.distT = Math.max(lo, Math.min(hi, cam.distT * (1 + dir * 0.12))); }
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => { keys.clear(); holds.rotL = holds.rotR = false; });

  let drag = null, lookedAt = -9; // lookedAt: when you last turned the camera yourself (camera follow waits)
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.x = e.clientX; drag.y = e.clientY;
    cam.yawT -= dx * 0.005;
    cam.pitchT = Math.max(minPitch(), Math.min(1.35, cam.pitchT + dy * 0.004));
    if (drag.moved > 4) lookedAt = t;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [lo, hi] = limits();
    cam.distT = Math.max(lo, Math.min(hi, cam.distT * (1 + Math.sign(e.deltaY) * 0.09)));
  }, { passive: false });

  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pt = new THREE.Vector3();
  canvas.addEventListener('pointerup', (e) => {
    const was = drag; drag = null;
    if (!was || was.moved > 6) return;
    if (street?.inside) return; // indoors you walk with the keys; the street is not under your feet
    ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    const hitPlot = ray.intersectObjects(world.plots.map((p) => p.mesh), false)[0];
    if (hitPlot) { chrome.showCard(hitPlot.object.userData.builder, true); return; }
    chrome.unpin();
    // ground click: walk there, or from the aerial view cut down to that spot
    const hit = ray.intersectObjects([world.pick, world.solids], false)[0];
    // from the air a roof or a wall is a fine place to aim: you come down on the nearest street to it
    if (hit && hit.point.y > 0.5 && cam.aerial && world.nearestReachable) { const q = world.nearestReachable(hit.point.x, hit.point.z); if (q) { switchTo(q.x, q.z, () => { if (dog.on) setDog(false); player.set(q.x, 0, q.z); onStreetGround(player); setAerial(false); snap = true; }); return; } }
    if (!hit || hit.point.y > 0.5) { chrome.toast('Click the street to walk there'); return; }
    pt.copy(hit.point);
    if (Math.hypot(pt.x, pt.z) > world.radius * 1.05) return;
    if (cam.aerial) {
      switchTo(pt.x, pt.z, () => { if (dog.on) setDog(false); player.set(pt.x, 0, pt.z); onStreetGround(player); setAerial(false); snap = true; });
    } else {
      walkTo(pt);
    }
  });

  // plan a walkable path there, round buildings and through gates (navgrid.js), and set off
  function walkTo(pt) {
    const path = world.plan ? world.plan(player, pt) : [player.clone(), pt.clone()];
    if (!path) { chrome.toast('There is no way through to there'); return false; }
    walkPath = path; walkAt = 1; replans = 0;
    const end = path[path.length - 1];
    walkTarget = new THREE.Vector3(end.x, 0, end.z);
    marker.position.set(end.x, 0, end.z);
    marker.visible = true;
    marker.userData.setDay?.(street?.env?.day ?? 1);
    return true;
  }

  // ---- arrival: fade from black, your plot first, then the street lights up outward ----
  loader.classList.add('gone');
  shared.uArrival.value = still ? 99 : 0;
  let arrivalStarted = false;
  fade.style.transition = '';
  requestAnimationFrame(() => requestAnimationFrame(() => { fade.classList.add('out'); arrivalStarted = true; }));
  if (still) { fade.style.transition = 'none'; fade.classList.add('out'); }
  else {
    setTimeout(() => chrome.toast('Click the street to walk · drag to look around', 4500), 2200);
    if (!store.get('bw-help-seen')) { setTimeout(() => chrome.toggleHelp(true), 1600); setTimeout(() => { chrome.toggleHelp(false); store.set('bw-help-seen', '1'); }, 9000); }
  }

  let riding = false, savedDist = cam.distT, seated = false, savedOutside = null;
  let pose = null, seatY = null; // at home: lying on the bed, cooking, in the shower... and how high the seat is
  // a game in progress (sports/): it places you and holds the camera until it ends
  let playing = false, gameCam = false;
  let jumpQueued = false, jumpV = 0, jumpY = 0, stepAcc = 0, groundY = 0, boxedCheck = 1, boxedT = 0, boxedAt = { x: 0, z: 0 };
  const idle = { t: 0, on: false, shot: -1, until: 0 };
  // other players, through the server (online.js); you have to be signed in with GitHub to be among them. ?offline=1 plays solo
  let lastSpeed = 0;
  const online = q.get('offline') === '1' || !signedIn() ? null : createOnline({ scene, camera, chat: { sayFrom: (...a) => street?.chat?.sayFrom(...a), sayMine: (t) => street?.chat?.sayMine(t) }, getPlayer: () => ({ x: player.x, z: player.z, y: groundY }), getHeading: () => heading, getSpeed: () => lastSpeed, district: place.name, profile: resident ? arrivalProfile : null, toast: (t) => street?.hud.toast(t),
    getHome: () => street?.passes?.tenancy?.()?.addr || '', onKnock: (p) => street?.gates?.knocked(p), onAnswer: (p) => street?.gates?.answered(p) });
  street?.setOnline?.(online);
  ['keydown', 'pointerdown', 'pointermove', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, () => { idle.t = 0; }, { passive: true, capture: true }));
  const audio = audioEngine();
  // the phone's radio (look/radio.js) and the game's music do not play over each other: the music rests
  // while a station is on and comes back when it stops
  let musicBeforeRadio = null;
  addEventListener('bw:radio', (e) => {
    if (e.detail?.playing) { if (musicBeforeRadio === null) musicBeforeRadio = audio.settings.music; if (audio.settings.music) audio.set('music', false); }
    else if (musicBeforeRadio !== null) { if (musicBeforeRadio) audio.set('music', true); musicBeforeRadio = null; }
  });
  // touch stick and controllers: their buttons become the same key presses the keyboard makes
  const input = createInput({ onKey: (key) => { dispatchEvent(new KeyboardEvent('keydown', { key: key === 'tab' ? 'Tab' : key === 'escape' ? 'Escape' : key })); } });
  window.__bwInput = input;

  // ---- cinematic travel (C): walk the route on your own while the camera shoots it like a film,
  // after Red Dead Redemption 2's cinematic camera. Any movement key, or C again, hands control back.
  const travel = { on: false, shot: -1, t: 0, hold: new THREE.Vector3(), heading: 0 };
  function setTravel(on) {
    if (on) {
      const tr = street?.hud.travel?.();
      if (!tr || riding || seated || street?.inside) { (street?.hud.toast ?? chrome.toast)('Set a destination on the map (M) first, then press C to travel there.', 3200); return; }
      walkTarget = null; walkPath = null; marker.visible = false;
    }
    travel.on = on; travel.shot = -1; travel.t = 0;
    document.body.classList.toggle('bw-cine', on);
    if (!on) { snap = true; cam.yawT = cam.yaw = travel.heading; }
  }

  // camera views, after GTA V: V cycles near, mid and far third person and first person; vehicles add a
  // cinematic camera. On foot and in a vehicle each keep their own choice, like its independent camera modes.
  const VIEWS = {
    foot: [{ id: 'near', name: 'Near', dist: 4.2, pitch: 0.16 }, { id: 'mid', name: 'Mid', dist: 7, pitch: 0.2 },
      { id: 'far', name: 'Far', dist: 12, pitch: 0.3 }, { id: 'first', name: 'First person', dist: 0.01, pitch: 0.35 }],
    ride: [{ id: 'near', name: 'Near', k: 0.72, pitch: 0.2 }, { id: 'mid', name: 'Mid', k: 1, pitch: 0.24 },
      { id: 'far', name: 'Far', k: 1.5, pitch: 0.3 }, { id: 'first', name: 'First person', k: 0.01, pitch: 0.35 },
      { id: 'cine', name: 'Cinematic', k: 1, pitch: 0.24 }],
  };
  // Near is the default on foot (Elvis, 9 October); your own choice is remembered
  const viewIx = { foot: +(store.get('bw-view-foot') ?? 0) % 4, ride: +(store.get('bw-view-ride') ?? 1) % 5 };
  const viewOf = (kind) => VIEWS[kind][viewIx[kind]];
  // the taxi to the airport starts on the cinematic camera; V takes you back to your own choice
  let cineForce = false;
  // under a tall roof (the airport's 20 m departures hall) you can tilt the camera up past level and see the ceiling
  const minPitch = () => (street?.tallRoom ? -0.85 : 0.02);
  const cine = { t: 0, shot: -1, pos: new THREE.Vector3() };
  function applyView(kind) {
    const v = viewOf(kind);
    cam.pitchT = v.pitch;
    if (kind === 'foot') cam.distT = inside() ? Math.min(v.dist, street?.tallRoom ? 12 : 4.5) : v.dist;
    cine.t = 0; cine.shot = -1;
  }
  const inside = () => !!street?.inside;
  function cycleView() {
    const kind = riding ? 'ride' : 'foot';
    if (riding && cineForce) cineForce = false;
    viewIx[kind] = (viewIx[kind] + 1) % VIEWS[kind].length;
    store.set(`bw-view-${kind}`, String(viewIx[kind]));
    applyView(kind);
    (street?.hud.toast ?? chrome.toast)(`Camera: ${viewOf(kind).name} · V to change`, 1600);
  }
  applyView('foot'); cam.dist = cam.distT; cam.pitch = cam.pitchT;
  const clock = new THREE.Clock();
  let t = 0;
  let stuck = 0;
  const last = new THREE.Vector3();
  // ---- playing as your dog (Elvis, 10 October 2026: "a mini second character, which is the dog... move around like the
  // dog while your character follows the dog"). Q or the dog's portrait: you steer the dog, and your person walks the
  // dog's trail a couple of metres behind. Going indoors, onto a ride or into a game hands you back to yourself.
  const dog = { on: false, pos: new THREE.Vector3(), head: 0, trail: [], speed: 0, still: 0 };
  function setDog(on) {
    const P = street?.pets;
    if (on === dog.on) return;
    if (on && (!P?.pet || !P.model)) { (street?.hud.toast ?? chrome.toast)('Adopt a pet first: the Pets app on your phone.', 2600); return; }
    if (on && (street?.inside || riding || seated || playing || cam.aerial)) { (street?.hud.toast ?? chrome.toast)('Step outside onto the street first.', 2200); return; }
    dog.on = on;
    if (on) {
      dog.pos.copy(player); dog.head = heading; player.set(P.pos.x, 0, P.pos.z); world.resolve(player, 0.25);
      dog.trail = [dog.pos.clone(), player.clone()]; walkTarget = null; walkPath = null; marker.visible = false;
      P.drive({ x: player.x, z: player.z, yaw: heading, speed: 0, still: 0 }); cam.distT = 3.4; cam.pitchT = 0.3;
      (street?.hud.toast ?? chrome.toast)(`You are ${P.pet.name}. Sniff about, make friends. Q to be yourself again.`, 3200); sfx('route');
    } else { player.set(dog.pos.x, 0, dog.pos.z); heading = dog.head; P?.drive(null); snap = true; }
    street?.profile?.setDriving(on);
  }
  addEventListener('bw:dog', () => setDog(!dog.on));
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), mv = new THREE.Vector3();
  const focus = new THREE.Vector3(), desired = new THREE.Vector3();

  function frame() {
    requestAnimationFrame(frame); // scheduled first: one bad frame must never stop the game
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    shared.uTime.value = t;
    if (arrivalStarted && shared.uArrival.value < 50) shared.uArrival.value += dt;

    // controllers: poll every frame; the right stick turns and tilts the camera
    input.poll();
    if (input.state.look.x || input.state.look.y) { lookedAt = t; cam.yawT -= input.state.look.x * 2.4 * dt; cam.pitchT = Math.max(minPitch(), Math.min(1.35, cam.pitchT + input.state.look.y * 1.3 * dt)); }
    if (cam.pitchT < minPitch()) cam.pitchT = minPitch();
    // hold-to-rotate and Q/E
    const rot = (holds.rotL || keys.has('q') ? 1 : 0) - (holds.rotR || keys.has('e') ? 1 : 0);
    if (rot) { cam.yawT += rot * 1.7 * dt; lookedAt = t; }
    // eased camera: drag, zoom and rotate all glide
    const kc = 1 - Math.exp(-dt * 10);
    cam.yaw += (cam.yawT - cam.yaw) * kc;
    cam.pitch += (cam.pitchT - cam.pitch) * kc;
    cam.dist += (cam.distT - cam.dist) * kc;

    // moving into or out of a place, sitting down, standing up
    const move = street?.takeMove();
    if (move) {
      if (move.mode === 'stand') { if (move.x !== undefined) player.set(move.x, 0, move.z); else player.z += 0.9; seated = false; pose = null; seatY = null; snap = true; }
      else {
        player.set(move.x, 0, move.z);
        if (move.yaw !== undefined) { heading = move.yaw; if (!move.keepCam) cam.yaw = cam.yawT = move.yaw; }
        // on a street bench the camera swings round to a three-quarter front view, so you see yourself sit
        if (move.mode === 'sit' && street?.benchSeated) { cam.yaw = cam.yawT = move.yaw + 2.5; cam.pitchT = Math.max(cam.pitchT, 0.32); }
        // doing something at home: the camera comes round to the front, so you see yourself do it (from above, lying down)
        // (at a counter, a basin or a bench you face a wall: the camera stands to one side instead of in front)
        if (move.mode === 'pose' && !move.keepCam) { const atWall = ['cook', 'wash', 'reach', 'bench'].includes(move.pose); cam.yawT = move.yaw + (move.pose === 'lie' ? 2.2 : atWall ? 1.05 : 2.6); cam.pitchT = move.pose === 'lie' ? 0.75 : atWall ? 0.42 : 0.36; cam.distT = Math.max(cam.distT, atWall ? 3.2 : 3.6); }
        seated = move.mode === 'sit' || move.mode === 'pose';
        pose = move.mode === 'pose' ? move.pose : null; seatY = move.seatY ?? null;
        if (move.mode === 'push') { walkTarget = null; walkPath = null; marker.visible = false; if (travel.on) setTravel(false); } // turned back at a gate
        if (move.mode === 'inside') { savedOutside = { dist: cam.distT, pitch: cam.pitchT }; cam.distT = cam.dist = street?.tallRoom ? 7 : 4.5; cam.pitchT = cam.pitch = street?.tallRoom ? 0.24 : 0.32; } // a terminal's hall wants the camera further back
        if (move.mode === 'outside' && savedOutside) { cam.distT = savedOutside.dist; cam.pitchT = savedOutside.pitch; world.resolve(player, PLAYER_R); }
        snap = true;
      }
    }
    const inside = !!street?.inside;
    const C = street?.collider?.() || world;

    // a hired ride carries the player; the camera sits behind the vehicle
    const rs = street?.ride(dt, t, keys, player);
    if (rs?.exit) {
      player.copy(rs.exit); onStreetGround(player);
      if (riding) { riding = false; cineForce = false; applyView('foot'); }
    } else if (rs?.pos) {
      if (!riding) { savedDist = cam.distT; riding = true; cineForce = !!rs.cine; applyView('ride'); const st = audio.station; if (st && audio.settings.music) (street?.hud.toast ?? chrome.toast)(`📻 ${st.name} on the radio · R to change station`, 2600); }
      player.set(rs.pos.x, 0, rs.pos.z);
      heading = rs.yaw;
      cam.distT = rs.cam * viewOf('ride').k;
      if (!drag) cam.yawT += Math.atan2(Math.sin(rs.yaw - cam.yawT), Math.cos(rs.yaw - cam.yawT)) * (1 - Math.exp(-dt * 2));
    }

    const gs = street?.sport?.();
    if (gs) {
      if (!playing) { walkTarget = null; walkPath = null; marker.visible = false; if (travel.on) setTravel(false); }
      playing = true; player.set(gs.x, 0, gs.z); heading = gs.yaw;
      if (gs.cam) { shotCam = gs.cam; gameCam = true; }
    } else if (playing) { playing = false; if (gameCam) { shotCam = null; gameCam = false; } snap = true; }

    // walking, never running
    fwd.set(Math.sin(cam.yaw), 0, Math.cos(cam.yaw));
    right.set(-Math.cos(cam.yaw), 0, Math.sin(cam.yaw));
    mv.set(0, 0, 0);
    // on a bench or at a desk (screen closed), any move key or the stick gets you up
    if (seated && street?.canWalkOff && (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some((k) => keys.has(k)) || Math.abs(input.state.move.x) + Math.abs(input.state.move.y) > 0.3)) street.standUp();
    if (!cam.aerial && !riding && !seated && !playing) {
      if (keys.has('w') || keys.has('arrowup')) mv.add(fwd);
      if (keys.has('s') || keys.has('arrowdown')) mv.sub(fwd);
      if (keys.has('d') || keys.has('arrowright')) mv.add(right);
      if (keys.has('a') || keys.has('arrowleft')) mv.sub(right);
      // the thumbstick or a controller's left stick, relative to the camera like the keys
      if (Math.abs(input.state.move.x) + Math.abs(input.state.move.y) > 0.05 && !street?.hud.isOpen()) { mv.addScaledVector(fwd, input.state.move.y).addScaledVector(right, input.state.move.x); walkTarget = null; walkPath = null; marker.visible = false; }
      // camera follows you (Settings > Controls, after GTA V): while you steer yourself, the camera eases round
      // behind the way you are going, so A and D turn you and the view together. Not when you walk back toward
      // the camera, and not for a moment after you have looked around yourself
      if (input.settings.camFollow && mv.lengthSq() > 0 && t - lookedAt > 1.2) {
        const d = Math.atan2(Math.sin(Math.atan2(mv.x, mv.z) - cam.yawT), Math.cos(Math.atan2(mv.x, mv.z) - cam.yawT));
        if (Math.abs(d) < 2.0) cam.yawT += d * (1 - Math.exp(-dt * (keys.has('shift') ? 1.15 : 0.8)));
      }
      if (mv.lengthSq() > 0 && travel.on) setTravel(false);
      if (travel.on) {
        const tr = street?.hud.travel?.();
        if (!tr || tr.total - tr.along < 2.5) { setTravel(false); sfx('arrive'); (street?.hud.toast ?? chrome.toast)('You have arrived.', 2400); }
        else {
          // steer at a point a few metres along the route, so corners are walked round, not cut
          let acc = 0, aim = tr.path[tr.path.length - 1];
          for (let i = 1; i < tr.path.length; i++) { const A = tr.path[i - 1], B = tr.path[i], L = Math.hypot(B.x - A.x, B.z - A.z); if (acc + L >= tr.along + 2.5) { const u = (tr.along + 2.5 - acc) / (L || 1); aim = { x: A.x + (B.x - A.x) * u, z: A.z + (B.z - A.z) * u }; break; } acc += L; }
          const dx = aim.x - player.x, dz = aim.z - player.z, d = Math.hypot(dx, dz) || 1;
          mv.set(dx / d, 0, dz / d);
          travel.heading += Math.atan2(Math.sin(Math.atan2(dx, dz) - travel.heading), Math.cos(Math.atan2(dx, dz) - travel.heading)) * (1 - Math.exp(-dt * 3));
        }
      }
      if (mv.lengthSq() === 0 && walkTarget) {
        // follow the planned corners; skip ahead to any corner already reached
        const P = walkPath || [walkTarget];
        while (walkAt < P.length - 1 && Math.hypot(P[walkAt].x - player.x, P[walkAt].z - player.z) < 0.6) walkAt++;
        const aim = P[Math.min(walkAt, P.length - 1)];
        const dx = aim.x - player.x, dz = aim.z - player.z, dist = Math.hypot(dx, dz);
        if (walkAt >= P.length - 1 && dist < 0.45) { walkTarget = null; walkPath = null; marker.visible = false; }
        else { mv.set(dx / (dist || 1), 0, dz / (dist || 1)); if (sidestepT > 0) { sidestepT -= dt; mv.addScaledVector(sidestep, 1.2); } }
      }
    }
    // safety net: if you are ever boxed in (a gap nobody can walk out of), you step back onto the street
    boxedCheck -= dt;
    if (boxedCheck <= 0) {
      boxedCheck = 0.5;
      // boxed in means: off the street network, trying to move, and getting nowhere
      const trying = mv.lengthSq() > 0 || !!walkTarget, moved = Math.hypot(player.x - boxedAt.x, player.z - boxedAt.z);
      boxedAt.x = player.x; boxedAt.z = player.z;
      const free = inside || riding || seated || playing || cam.aerial || groundY > 0.3 || jumpY > 0 || !trying || moved > 0.6 || !world.reachable || world.reachable(player.x, player.z);
      boxedT = free ? 0 : boxedT + 0.5;
      if (boxedT >= 2) {
        boxedT = 0;
        const q = world.nearestReachable(player.x, player.z);
        if (q) cut(() => { player.set(q.x, 0, q.z); world.resolve(player, PLAYER_R); walkTarget = null; walkPath = null; marker.visible = false; snap = true; (street?.hud.toast ?? chrome.toast)('You were boxed in, so you stepped back out to the street.', 3000); });
      }
    }
    const moving = mv.lengthSq() > 0;
    // walk by default, run with Shift (world bible 7.4); indoors you walk like indoors
    const running = (keys.has('shift') || input.state.run) && !inside && !seated;
    const pace = dog.on ? (running ? 7.2 : 3.4) * TEST_PACE : (inside ? 1.9 : street?.mobility?.pace(running) ?? (running ? 6.4 : 2.8)) * TEST_PACE; // on a bike, a board or skates you go faster
    if (moving) {
      mv.normalize();
      last.copy(player);
      player.addScaledVector(mv, pace * dt);
      // static world first (a jump clears low fences), then everything that moves
      // static world first (a jump clears low fences; on a bridge you are above what is below), then everything that moves
      if (inside) C.resolve(player); else { world.resolve(player, PLAYER_R, groundY + jumpY); if (groundY < 1) pushOutDynamic(player, 0.4, [...(street?.bodies?.() || []), ...(online?.bodies() || [])]); world.resolve(player, PLAYER_R, groundY + jumpY); }
      if (walkTarget) {
        stuck = player.distanceTo(last) < pace * dt * 0.25 ? stuck + dt : 0;
        // blocked by someone walking past: plan again from here, twice, then give up politely
        if (stuck > 0.5) {
          stuck = 0;
          // someone in the way: step to the side and carry on, as people do (this does not count as a replan)
          const bod = [...(street?.bodies?.() || []), ...(online?.bodies() || [])].find((o) => o.r !== undefined && Math.hypot(o.x - player.x, o.z - player.z) < 1.4);
          if (bod && sidestepT <= 0) { const dx = player.x - bod.x, dz = player.z - bod.z, l = Math.hypot(dx, dz) || 1; sidestep.set(-dz / l, 0, dx / l); sidestepT = 0.6; }
          const again = bod ? walkPath : replans++ < 2 && world.plan ? world.plan(player, walkTarget) : null;
          if (again) { walkPath = again; walkAt = 1; } else { walkTarget = null; walkPath = null; marker.visible = false; }
        }
      }
      let dh = Math.atan2(mv.x, mv.z) - heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      heading += dh * (1 - Math.exp(-dt * 12));
    }
    avatar.position.copy(player);
    avatar.rotation.y = heading;
    if (dog.on) {
      if (street?.inside || riding || playing) setDog(false);
      else {
        // the trail the dog leaves; your person walks it about two metres behind
        const tl = dog.trail; if (player.distanceTo(tl[tl.length - 1]) > 0.3) { tl.push(player.clone()); if (tl.length > 80) tl.shift(); }
        let need = 2.4, tgt = tl[tl.length - 1];
        for (let i = tl.length - 1; i > 0; i--) { const d = tl[i].distanceTo(tl[i - 1]); if (need <= d) { tgt = tl[i].clone().lerp(tl[i - 1], need / d); break; } need -= d; tgt = tl[i - 1]; }
        // a step to the side of the dog's line, like someone walking a dog, so the camera behind the dog sees past you
        tgt = tgt.clone(); tgt.x += Math.cos(heading) * -1.3; tgt.z += -Math.sin(heading) * -1.3;
        let dx = tgt.x - dog.pos.x, dz = tgt.z - dog.pos.z, d = Math.hypot(dx, dz);
        if (d > 25) { dog.pos.set(player.x - Math.sin(heading) * 2, 0, player.z - Math.cos(heading) * 2); dx = 0; dz = 0; d = 0; }
        const v = d > 0.15 ? Math.min(d * 3, (running ? 7.2 : 3.4) * 1.15) : 0;
        if (v) { dog.pos.x += (dx / d) * v * dt; dog.pos.z += (dz / d) * v * dt; world.resolve(dog.pos, PLAYER_R, 0); const want = Math.atan2(dx, dz); dog.head += Math.atan2(Math.sin(want - dog.head), Math.cos(want - dog.head)) * (1 - Math.exp(-dt * 8)); }
        dog.speed = v;
        avatar.position.copy(dog.pos); avatar.rotation.y = dog.head;
      }
    }
    // jump: real gravity, from the ground only, not while riding or seated
    if (jumpQueued && jumpY === 0 && !riding && !seated && !playing && !cam.aerial && !dog.on) { jumpV = 5.0; sfx('jump'); } // peaks near 0.96 m
    jumpQueued = false;
    if (jumpV !== 0 || jumpY > 0) {
      jumpV -= 13 * dt; jumpY += jumpV * dt;
      if (jumpY <= 0) { if (jumpV < -1) { rig?.landed(jumpV); sfx('land', Math.min(1, -jumpV / 6)); } jumpY = 0; jumpV = 0; }
    }
    // the ground under your feet: steps, landings and the bridge deck; walk off an edge and you fall
    if (!inside && !riding && world.groundAt) {
      const g = world.groundAt(player.x, player.z, groundY + jumpY);
      if (g > groundY) { jumpY = Math.max(0, jumpY - (g - groundY)); groundY = g; }
      else if (g < groundY - 0.01) {
        if (groundY - g <= 0.45 && jumpY === 0) groundY = g; // down a step: no hop
        else { jumpY += groundY - g; groundY = g; if (jumpV === 0) jumpV = -0.01; } // off an edge: fall
      }
    } else if (inside || riding) { groundY = 0; }
    avatar.position.y = groundY + jumpY + (gs?.y || 0);
    const groundSpeed = moving ? player.distanceTo(last) / Math.max(dt, 1e-4) : 0;
    if (dog.on) { dog.still = groundSpeed < 0.05 ? dog.still + dt : 0; street?.pets?.drive({ x: player.x, z: player.z, yaw: heading, speed: groundSpeed, still: dog.still }); }
    lastSpeed = groundSpeed;
    if (rig && !reduced) rig.update(dt, gs ? { speed: Math.min(gs.speed || 0, 8), running: !!gs.running, air: (gs.y || 0) > 0.05, t, seated: !!gs.seated } : { speed: Math.min(dog.on ? dog.speed : groundSpeed, 8), running: dog.on ? dog.speed > 4 : running, air: jumpY > 0.02, t, seated: seated && !pose ? true : pose ? ['sofa', 'feet', 'tv', 'read', 'eat'].includes(pose) : false, pose, seatY });
    else body.position.y = seated ? -0.42 : 0;
    street?.mobility?.pose(rig, dt, groundSpeed, inside); // on wheels: pedalling or pushing, over the walk
    // a footstep every stride, on whatever is underfoot
    if (moving && jumpY === 0 && !riding) { stepAcc += groundSpeed * dt; const stride = running ? 1.25 : 0.72; if (stepAcc > stride) { stepAcc = 0; sfx('step', { run: running, grass: !inside && !world.isFree(player.x, player.z, 0, { lots: false }) && world.isFree(player.x, player.z, 0, { lots: true }) }); } }
    online?.update(dt);
    audio.update(dt, { day: shared.uDay.value, rain: wx.uRain.value, inside, riding, speed: street?.rides?.()?.debug?.v ?? 0 });

    // damped third-person follow; district-to-district is a cut, never a flight
    if (cam.aerial) focus.set(0, 6, 0); else focus.set(player.x, (dog.on ? 0.7 : 1.75) + groundY, player.z);
    const camPitch = Math.max(0.05, cam.pitch), lookUp = Math.max(0, -cam.pitch), cp = Math.cos(camPitch);
    desired.set(
      focus.x - Math.sin(cam.yaw) * cp * cam.dist,
      focus.y + Math.sin(camPitch) * cam.dist,
      focus.z - Math.cos(cam.yaw) * cp * cam.dist
    );
    if (!cam.aerial) {
      // keep the camera out of buildings
      const steps = 28;
      let free = 1;
      for (let i = 1; i <= steps; i++) {
        const u = i / steps;
        const x = focus.x + (desired.x - focus.x) * u;
        const y = focus.y + (desired.y - focus.y) * u;
        const z = focus.z + (desired.z - focus.z) * u;
        if (y < 0.6 || C.solidAt(x, y, z)) { free = Math.max(0.12, (i - 2) / steps); break; }
      }
      desired.lerpVectors(focus, desired, free);
      if (desired.y < 0.8) desired.y = 0.8;
      // looking up: the camera stays put and its aim rises, toward the roof
      if (lookUp > 0) { focus.y += Math.tan(Math.min(1.25, lookUp * 1.45)) * Math.hypot(desired.x - focus.x, desired.z - focus.z); desired.y = Math.max(0.9, desired.y - lookUp * 0.8); }
    }
    const view = riding ? (cineForce ? VIEWS.ride[4] : viewOf('ride')) : viewOf('foot');
    let fixed = false;
    if (!cam.aerial && view.id === 'first') {
      // eye height in the head; in a vehicle the driver's eye line, set at the nose so the opaque
      // windscreen of the low-poly kit does not fill the view (GTA's bonnet camera does the same)
      const ahead = riding && rs ? rs.nose : 0.12, dir = riding && rs ? rs.yaw : cam.yaw;
      desired.set(player.x + Math.sin(dir) * ahead, riding && rs ? rs.seatY + 0.5 : seated ? 1.2 : 1.62, player.z + Math.cos(dir) * ahead);
      const lookDown = Math.max(-1.3, (cam.pitch - 0.35) * 1.3);
      focus.set(desired.x + Math.sin(cam.yaw) * Math.cos(lookDown) * 10, desired.y - Math.sin(lookDown) * 10, desired.z + Math.cos(cam.yaw) * Math.cos(lookDown) * 10);
      fixed = true;
    } else if (!cam.aerial && riding && rs && view.id === 'cine') {
      // cinematic: held shots from the roadside, the bumper and the side, cutting every few seconds
      cine.t -= dt;
      if (cine.t <= 0) {
        cine.shot = (cine.shot + 1) % (cineForce ? 4 : 3); if (cineForce && cine.shot === 1) cine.shot = 2; // the airport run skips the bumper shot: too close to the taxi to see the city
        cine.t = cine.shot === 3 ? 9 : 5.5;
        const fx = Math.sin(rs.yaw), fz = Math.cos(rs.yaw);
        if (cine.shot === 0) cine.pos.set(player.x + fx * 26 + fz * 6, 1.4, player.z + fz * 26 - fx * 6);
        snap = true;
      }
      const fx = Math.sin(rs.yaw), fz = Math.cos(rs.yaw);
      if (cine.shot === 0) desired.copy(cine.pos);
      else if (cine.shot === 1) desired.set(player.x + fx * 4.5 + fz * 0.6, 0.7, player.z + fz * 4.5 - fx * 0.6);
      else if (cine.shot === 2) desired.set(player.x - fz * 7 - fx * 2, 1.9, player.z + fx * 7 - fz * 2);
      else { const a = t * 0.14; desired.set(player.x + Math.sin(a) * 26, 17, player.z + Math.cos(a) * 26); } // the drone: a slow orbit high over the taxi, the district all round
      focus.set(player.x, rs.seatY + 0.4, player.z);
      if (C.solidAt(desired.x, desired.y, desired.z)) desired.set(player.x - fx * rs.cam, 3.2, player.z - fz * rs.cam);
      fixed = true;
    }
    // ---- idle cinematic camera: stand still for 30 s and the camera wanders the street, like GTA V ----
    idle.t += dt;
    if (input.state.move.x || input.state.move.y || input.state.look.x || input.state.look.y) idle.t = 0;
    const idleNow = idle.t > 30 && !travel.on && !riding && !inside && !cam.aerial && !street?.hud.isOpen() && !reduced && !document.querySelector('#lk-board.on, #lkr.on');
    if (idleNow !== idle.on) { idle.on = idleNow; idle.shot = -1; idle.until = 0; document.body.classList.toggle('bw-cine', idleNow); document.body.classList.toggle('bw-idle', idleNow); if (!idleNow) snap = true; }
    if (idle.on) {
      const clearView = (x, y, z, tx, ty, tz) => { if (C.solidAt(x, y, z)) return false; for (let k = 1; k < 9; k++) { const u = k / 10; if (C.solidAt(x + (tx - x) * u, y + (ty - y) * u, z + (tz - z) * u)) return false; } return true; };
      idle.until -= dt;
      if (idle.until <= 0) {
        // what is worth watching near you: people (talking ones first), traffic, the billboard, shops and services
        const subs = [];
        (street?.props.people || []).forEach((q) => { const d = Math.hypot(q.obj.position.x - player.x, q.obj.position.z - player.z); if (d < 40) subs.push({ obj: q.obj, y: 1.35, near: 3.4, w: 3 - d / 20 }); });
        (street?.dressing?.bodies?.() || []).forEach((b) => { const d = Math.hypot(b.cx - player.x, b.cz - player.z); if (d < 60) subs.push({ at: new THREE.Vector3(b.cx, 1.4, b.cz), near: 9, w: 1.5 }); });
        const bb = street?.props.billboardMesh; if (bb) { bb.updateWorldMatrix(true, false); const v = new THREE.Vector3(0, 5.35, 0.17).applyMatrix4(bb.matrixWorld); if (v.distanceTo(player) < 70) subs.push({ at: v, near: 11, w: 2, low: true }); }
        (street?.props.pois || []).forEach((q) => { const d = Math.hypot(q.x - player.x, q.z - player.z); if (d < 50) subs.push({ at: new THREE.Vector3(q.x, 1.6, q.z), near: 7, w: 1 }); });
        subs.push({ obj: avatar, y: 1.2, near: 4.5, w: 1.2 });
        for (let tries = 0; tries < 12; tries++) {
          const tot = subs.reduce((a, q) => a + q.w, 0); let r = Math.random() * tot; const q = subs.find((x) => (r -= x.w) <= 0) || subs[0];
          if (q === idle.last && subs.length > 1) continue;
          const at = q.obj ? q.obj.position.clone().setY(q.y) : q.at.clone();
          const a = Math.random() * Math.PI * 2, dist = q.near * (0.85 + Math.random() * 0.5), h = q.low ? 1.4 : 1.2 + Math.random() * 2.2;
          const from = new THREE.Vector3(at.x + Math.sin(a) * dist, h, at.z + Math.cos(a) * dist);
          if (!clearView(from.x, from.y, from.z, at.x, at.y, at.z)) continue;
          idle.q = q; idle.last = q; idle.from = from; idle.drift = new THREE.Vector3(-Math.cos(a), 0, Math.sin(a)).multiplyScalar((Math.random() < 0.5 ? -1 : 1) * 0.35);
          idle.until = 5 + Math.random() * 2; snap = true;
          break;
        }
      }
      if (idle.from) {
        idle.from.addScaledVector(idle.drift, dt); // a slow dolly
        const q = idle.q, at = q.obj ? q.obj.position.clone().setY(q.y) : q.at;
        desired.copy(idle.from); focus.copy(at); fixed = true;
      }
    }
    if (travel.on && !cam.aerial && !reduced) {
      // four shots in turn, each held about six seconds, each checked for a clear line of sight
      const h = travel.heading, fx = Math.sin(h), fz = Math.cos(h), sx = -fz, sz = fx;
      // clear means no building volume, and no pole, tree or lamp on the ground, between the lens and you
      const clear = (x, y, z) => { if (C.solidAt(x, y, z)) return false; for (let k = 0; k < 10; k++) { const u = k / 10, px = x + (player.x - x) * u, pz = z + (player.z - z) * u, py = y + (1.2 - y) * u; if (C.solidAt(px, py, pz) || (u < 0.9 && world.blockedAt(px, pz, 0.35))) return false; } return true; };
      const shotAt = (n) => {
        if (n === 0) return [player.x + sx * 5.5 + fx * 1.5, 1.5, player.z + sz * 5.5 + fz * 1.5];      // tracking, from the side
        if (n === 1) return [travel.hold.x, 1.3, travel.hold.z];                                            // waiting ahead as you walk in
        if (n === 2) return [player.x - fx * 9, 6.5, player.z - fz * 9];                                    // high, behind, the street ahead
        return [player.x + fx * 3.6 - sx * 0.9, 0.75, player.z + fz * 3.6 - sz * 0.9];                     // low, in front, walking backwards
      };
      travel.t -= dt;
      if (travel.t <= 0) {
        for (let tries = 0; tries < 4; tries++) {
          travel.shot = (travel.shot + 1) % 4;
          if (travel.shot === 1) travel.hold.set(player.x + fx * 16 - sx * 2.5, 0, player.z + fz * 16 - sz * 2.5);
          const [x, y, z] = shotAt(travel.shot);
          if (clear(x, y, z)) break;
        }
        travel.t = 6; snap = true;
      }
      const [x, y, z] = shotAt(travel.shot);
      if (!clear(x, y, z)) travel.t = Math.min(travel.t, 0.01); // something walked into the shot: cut next frame
      desired.set(x, y, z);
      focus.set(player.x + (travel.shot === 2 ? fx * 6 : fx * 0.8), travel.shot === 2 ? 1.0 : 1.25, player.z + (travel.shot === 2 ? fz * 6 : fz * 0.8));
      fixed = true;
    }
    // a feature can ask for a held shot: first person at a food stall's counter, for instance
    if (shotCam) { desired.set(shotCam.from.x, shotCam.from.y, shotCam.from.z); focus.set(shotCam.at.x, shotCam.at.y, shotCam.at.z); fixed = true; }
    if (fixed && !snap) { const k = shotCam ? 1 - Math.exp(-dt * 5) : idle.on ? 1 - Math.exp(-dt * 3) : travel.on ? 1 - Math.exp(-dt * 5) : 1 - Math.exp(-dt * (view.id === 'first' ? 30 : 4)); camPos.lerp(desired, k); look.lerp(focus, 1 - Math.exp(-dt * (travel.on ? 6 : 20))); }
    else if (snap) { camPos.copy(desired); look.copy(focus); snap = false; }
    else {
      const k = 1 - Math.exp(-dt * 6);
      camPos.lerp(desired, k);
      look.lerp(focus, k);
    }
    if (swoop.on) swoopFrame(dt, desired, focus);
    camera.position.copy(camPos);
    camera.lookAt(look);
    // a wall pushed the camera into the avatar: hide it rather than show the inside of a head
    avatar.visible = !riding && !shotCam?.first && !gs?.hide && (cam.aerial || travel.on || (view.id !== 'first' && camPos.distanceTo(look) > 1.7));

    chrome.update(camera, player, !cam.aerial);
    street?.update(dt, t, player, cam.yaw, shared.uArrival.value);
    street?.renderReflection();
    grade.uniforms.uSat.value = 0.94 + 0.18 * shared.uDay.value; // vivid by day, calmer under the lamps at night
    if (q.get('post') === '0') renderer.render(scene, camera); else composer.render();
    street?.renderPortraits?.(dt);
    if (q.get('govern') !== '0') govern();
    countFps();
  }
  applyGraphics(quality);
  frame();

  window.__bw = {
    get world() { return world; }, camera, cam, player, renderer, scene, via,
    get theme() { return themeName; }, setTheme, get look() { return street; }, get quality() { return quality; }, graphics: { info: gfx.info, get choice() { return gfx.choice; }, get tier() { return quality; }, auto: () => autoTier(gfx.info) }, composer, weather: weatherFeed, get kit() { return kit; }, goto, setAerial, cycleView, setTravel, get travel() { return travel.on; }, idle, get online() { return online; }, audio, get view() { return (riding ? 'ride:' : 'foot:') + (riding ? viewOf('ride') : viewOf('foot')).id; }, get walkTarget() { return walkTarget; }, get walkPath() { return walkPath; }, walkTo, get groundY() { return groundY; }, get resScale() { return governor.scale; },
    ready: true,
  };
}

main().catch((err) => {
  console.error(err);
  const l = document.getElementById('loader');
  l.classList.remove('gone');
  l.innerHTML = `<div>Could not build the world<small>${String(err.message || err)}</small></div>`;
});
