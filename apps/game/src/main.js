import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { loadManifest, DEFAULT_PLACE } from './osm.js';
import { buildWorld, buildSky } from './world.js';
import { shared } from './shaders.js';
import { initChrome } from './ui.js';
import { loadProfile } from './onboarding/state.js';
import { createAvatarModel } from './onboarding/avatar.js';
import { prepareLook, dress } from './look/style.js';
import { createLook, blueHourSky, pickQuality, createWeather } from './look/index.js';
import { loadKit } from './look/kit.js';
import { rigAvatar } from './look/anim.js';
import { walkMarker } from './look/trail.js';
import { SKIN_CSS, loadFont } from './look/uikit.js';
import { audioEngine, sfx } from './look/audio.js';
import { createInput } from './look/input.js';
import { createOnline } from './look/online.js';
import { weather as wx } from './look/surfaces.js';
import { pushOutDynamic } from './look/physics.js';

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

const quality = pickQuality(q);
const canvas = document.getElementById('c');
// Depth: layers sit 3 cm or more apart and the near plane is 0.3 m, which resolves them past the fog line.
// A logarithmic depth buffer also works (?logz=1) but costs about 4.5 ms a frame, so it is opt-in.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: q.get('logz') === '1' });
renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'low' ? 1 : 1.5));
renderer.setSize(innerWidth, innerHeight, false);

const scene = new THREE.Scene();
// near plane at 0.3 m: more depth precision across the district, still close enough for first person
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 4000);

const composer = new EffectComposer(
  renderer,
  new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 })
);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.5, 0.42);
let street = null;
composer.addPass(bloom);
composer.addPass(new OutputPass());

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
  // your look from the wardrobe (style.js), kept on this device and sent with your presence
  try { const saved = JSON.parse(localStorage.getItem('bw-style') || 'null'); if (saved) dress(body, saved, rig); } catch { /* */ }
  // the wardrobe turns the camera round to face you, like a mirror
  let mirrorSave = null;
  addEventListener('bw:mirror', (e) => {
    if (e.detail) { mirrorSave = mirrorSave || { yaw: cam.yawT, dist: cam.distT, pitch: cam.pitchT }; cam.yawT = heading + Math.PI; cam.distT = 3.6; cam.pitchT = 0.12; }
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
    world = buildWorld(manifest, via, name, kit);
    world.place = { name: place.name, city: place.city };
    sky = world.env.wet ? blueHourSky() : buildSky(name);
    scene.add(sky, world.scene);
    const E = world.env;
    scene.fog = new THREE.Fog(E.fog, world.radius * E.fogNear, world.radius * E.fogFar);
    scene.background = new THREE.Color(E.bg);
    renderer.toneMapping = E.tone === 'aces' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    renderer.toneMappingExposure = E.exposure;
    bloom.enabled = E.bloom.on;
    bloom.strength = E.bloom.strength; bloom.radius = E.bloom.radius; bloom.threshold = E.bloom.threshold;
    chrome.setWorld(world, via, place);
    street?.dispose();
    if (q.get('look') !== '0') street = createLook({ renderer, scene, camera, world, reduced, quality, sky, bloom, weatherFeed, avatar: body });
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
    else if (k >= '1' && k <= '6' && k.length === 1) { if (!e.repeat) street?.chat?.emote(+k, player); }
    else if (k === 'n') { if (!e.repeat) { audio.wake(); audio.set('music', !audio.settings.music); (street?.hud.toast ?? chrome.toast)(audio.settings.music ? 'Music on' : 'Music off', 1400); } }
    else if (k === 't') { if (!e.repeat) setTheme(themeName === 'night' ? 'day' : 'night'); }
    else if (k === 'h') { if (!e.repeat) document.body.classList.toggle('nohud'); }
    else if (k === '?' || k === '/') chrome.toggleHelp();
    else if (k === 'e' && !e.repeat && street?.hud.interact()) { /* handled by the street */ }
    else if (k === 'f' && !e.repeat && street?.seatAction?.('close')) { /* close the laptop at your desk */ }
    else if (k === 'p' && !e.repeat && street?.profiler) street.profiler.toggle(); // the profiler: who is that?
    else if (k === 'escape') { street?.hud.close(); chrome.unpin(); chrome.hideCard(); chrome.toggleList(false); chrome.toggleHelp(false); }
    else if (k === '=' || k === '+') zoomKey(-1);
    else if (k === '-' || k === '_') zoomKey(1);
    else if (k === ' ') { e.preventDefault(); if (!e.repeat) jumpQueued = true; }
    else { keys.add(k); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { walkTarget = null; walkPath = null; marker.visible = false; } }
  });
  function zoomKey(dir) { const [lo, hi] = limits(); cam.distT = Math.max(lo, Math.min(hi, cam.distT * (1 + dir * 0.12))); }
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => { keys.clear(); holds.rotL = holds.rotR = false; });

  let drag = null;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.x = e.clientX; drag.y = e.clientY;
    cam.yawT -= dx * 0.005;
    cam.pitchT = Math.max(0.02, Math.min(1.35, cam.pitchT + dy * 0.004));
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
    if (hit && hit.point.y > 0.5 && cam.aerial && world.nearestReachable) { const q = world.nearestReachable(hit.point.x, hit.point.z); if (q) { cut(() => { player.set(q.x, 0, q.z); onStreetGround(player); setAerial(false); snap = true; }); return; } }
    if (!hit || hit.point.y > 0.5) { chrome.toast('Click the street to walk there'); return; }
    pt.copy(hit.point);
    if (Math.hypot(pt.x, pt.z) > world.radius * 1.05) return;
    if (cam.aerial) {
      cut(() => { player.set(pt.x, 0, pt.z); onStreetGround(player); setAerial(false); snap = true; });
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
  let jumpQueued = false, jumpV = 0, jumpY = 0, stepAcc = 0, groundY = 0, boxedCheck = 1, boxedT = 0, boxedAt = { x: 0, z: 0 };
  const idle = { t: 0, on: false, shot: -1, until: 0 };
  // other players, through the database (online.js); ?offline=1 plays solo
  let lastSpeed = 0;
  const online = q.get('offline') === '1' ? null : createOnline({ scene, camera, chat: { sayFrom: (...a) => street?.chat?.sayFrom(...a), sayMine: (t) => street?.chat?.sayMine(t) }, getPlayer: () => ({ x: player.x, z: player.z, y: groundY }), getHeading: () => heading, getSpeed: () => lastSpeed, district: place.name, profile: resident ? arrivalProfile : null, toast: (t) => street?.hud.toast(t),
    getHome: () => street?.passes?.tenancy?.()?.addr || '', onKnock: (p) => street?.gates?.knocked(p), onAnswer: (p) => street?.gates?.answered(p) });
  street?.setOnline?.(online);
  ['keydown', 'pointerdown', 'pointermove', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, () => { idle.t = 0; }, { passive: true, capture: true }));
  const audio = audioEngine();
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
  const cine = { t: 0, shot: -1, pos: new THREE.Vector3() };
  function applyView(kind) {
    const v = viewOf(kind);
    cam.pitchT = v.pitch;
    if (kind === 'foot') cam.distT = inside() ? Math.min(v.dist, 4.5) : v.dist;
    cine.t = 0; cine.shot = -1;
  }
  const inside = () => !!street?.inside;
  function cycleView() {
    const kind = riding ? 'ride' : 'foot';
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
    if (input.state.look.x || input.state.look.y) { cam.yawT -= input.state.look.x * 2.4 * dt; cam.pitchT = Math.max(0.02, Math.min(1.35, cam.pitchT + input.state.look.y * 1.3 * dt)); }
    // hold-to-rotate and Q/E
    const rot = (holds.rotL || keys.has('q') ? 1 : 0) - (holds.rotR || keys.has('e') ? 1 : 0);
    if (rot) cam.yawT += rot * 1.7 * dt;
    // eased camera: drag, zoom and rotate all glide
    const kc = 1 - Math.exp(-dt * 10);
    cam.yaw += (cam.yawT - cam.yaw) * kc;
    cam.pitch += (cam.pitchT - cam.pitch) * kc;
    cam.dist += (cam.distT - cam.dist) * kc;

    // moving into or out of a place, sitting down, standing up
    const move = street?.takeMove();
    if (move) {
      if (move.mode === 'stand') { if (move.x !== undefined) player.set(move.x, 0, move.z); else player.z += 0.9; seated = false; snap = true; }
      else {
        player.set(move.x, 0, move.z);
        if (move.yaw !== undefined) heading = cam.yaw = cam.yawT = move.yaw;
        // on a street bench the camera swings round to a three-quarter front view, so you see yourself sit
        if (move.mode === 'sit' && street?.benchSeated) { cam.yaw = cam.yawT = move.yaw + 2.5; cam.pitchT = Math.max(cam.pitchT, 0.32); }
        seated = move.mode === 'sit';
        if (move.mode === 'push') { walkTarget = null; walkPath = null; marker.visible = false; if (travel.on) setTravel(false); } // turned back at a gate
        if (move.mode === 'inside') { savedOutside = { dist: cam.distT, pitch: cam.pitchT }; cam.distT = cam.dist = 4.5; cam.pitchT = cam.pitch = 0.32; }
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
      if (riding) { riding = false; applyView('foot'); }
    } else if (rs?.pos) {
      if (!riding) { savedDist = cam.distT; riding = true; applyView('ride'); }
      player.set(rs.pos.x, 0, rs.pos.z);
      heading = rs.yaw;
      cam.distT = rs.cam * viewOf('ride').k;
      if (!drag) cam.yawT += Math.atan2(Math.sin(rs.yaw - cam.yawT), Math.cos(rs.yaw - cam.yawT)) * (1 - Math.exp(-dt * 2));
    }

    // walking, never running
    fwd.set(Math.sin(cam.yaw), 0, Math.cos(cam.yaw));
    right.set(-Math.cos(cam.yaw), 0, Math.sin(cam.yaw));
    mv.set(0, 0, 0);
    // on a bench or at a desk (screen closed), any move key or the stick gets you up
    if (seated && street?.canWalkOff && (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some((k) => keys.has(k)) || Math.abs(input.state.move.x) + Math.abs(input.state.move.y) > 0.3)) street.standUp();
    if (!cam.aerial && !riding && !seated) {
      if (keys.has('w') || keys.has('arrowup')) mv.add(fwd);
      if (keys.has('s') || keys.has('arrowdown')) mv.sub(fwd);
      if (keys.has('d') || keys.has('arrowright')) mv.add(right);
      if (keys.has('a') || keys.has('arrowleft')) mv.sub(right);
      // the thumbstick or a controller's left stick, relative to the camera like the keys
      if (Math.abs(input.state.move.x) + Math.abs(input.state.move.y) > 0.05 && !street?.hud.isOpen()) { mv.addScaledVector(fwd, input.state.move.y).addScaledVector(right, input.state.move.x); walkTarget = null; walkPath = null; marker.visible = false; }
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
      const free = inside || riding || seated || cam.aerial || groundY > 0.3 || jumpY > 0 || !trying || moved > 0.6 || !world.reachable || world.reachable(player.x, player.z);
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
    const pace = (inside ? 1.9 : running ? 6.4 : 2.8) * TEST_PACE;
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
    // jump: real gravity, from the ground only, not while riding or seated
    if (jumpQueued && jumpY === 0 && !riding && !seated && !cam.aerial) { jumpV = 5.0; sfx('jump'); } // peaks near 0.96 m
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
    avatar.position.y = groundY + jumpY;
    const groundSpeed = moving ? player.distanceTo(last) / Math.max(dt, 1e-4) : 0;
    lastSpeed = groundSpeed;
    if (rig && !reduced) rig.update(dt, { speed: Math.min(groundSpeed, 8), running, air: jumpY > 0.02, t, seated });
    else body.position.y = seated ? -0.42 : 0;
    // a footstep every stride, on whatever is underfoot
    if (moving && jumpY === 0 && !riding) { stepAcc += groundSpeed * dt; const stride = running ? 1.25 : 0.72; if (stepAcc > stride) { stepAcc = 0; sfx('step', { run: running, grass: !inside && !world.isFree(player.x, player.z, 0, { lots: false }) && world.isFree(player.x, player.z, 0, { lots: true }) }); } }
    online?.update(dt);
    audio.update(dt, { day: shared.uDay.value, rain: wx.uRain.value, inside, riding, speed: street?.rides?.()?.debug?.v ?? 0 });

    // damped third-person follow; district-to-district is a cut, never a flight
    if (cam.aerial) focus.set(0, 6, 0); else focus.set(player.x, 1.75 + groundY, player.z);
    const cp = Math.cos(cam.pitch);
    desired.set(
      focus.x - Math.sin(cam.yaw) * cp * cam.dist,
      focus.y + Math.sin(cam.pitch) * cam.dist,
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
    }
    const view = riding ? viewOf('ride') : viewOf('foot');
    let fixed = false;
    if (!cam.aerial && view.id === 'first') {
      // eye height in the head; in a vehicle the driver's eye line, set at the nose so the opaque
      // windscreen of the low-poly kit does not fill the view (GTA's bonnet camera does the same)
      const ahead = riding && rs ? rs.nose : 0.12, dir = riding && rs ? rs.yaw : cam.yaw;
      desired.set(player.x + Math.sin(dir) * ahead, riding && rs ? rs.seatY + 0.5 : seated ? 1.2 : 1.62, player.z + Math.cos(dir) * ahead);
      const lookDown = (cam.pitch - 0.35) * 1.3;
      focus.set(desired.x + Math.sin(cam.yaw) * Math.cos(lookDown) * 10, desired.y - Math.sin(lookDown) * 10, desired.z + Math.cos(cam.yaw) * Math.cos(lookDown) * 10);
      fixed = true;
    } else if (!cam.aerial && riding && rs && view.id === 'cine') {
      // cinematic: held shots from the roadside, the bumper and the side, cutting every few seconds
      cine.t -= dt;
      if (cine.t <= 0) {
        cine.shot = (cine.shot + 1) % 3; cine.t = 5.5;
        const fx = Math.sin(rs.yaw), fz = Math.cos(rs.yaw);
        if (cine.shot === 0) cine.pos.set(player.x + fx * 26 + fz * 6, 1.4, player.z + fz * 26 - fx * 6);
        snap = true;
      }
      const fx = Math.sin(rs.yaw), fz = Math.cos(rs.yaw);
      if (cine.shot === 0) desired.copy(cine.pos);
      else if (cine.shot === 1) desired.set(player.x + fx * 4.5 + fz * 0.6, 0.7, player.z + fz * 4.5 - fx * 0.6);
      else desired.set(player.x - fz * 7 - fx * 2, 1.9, player.z + fx * 7 - fz * 2);
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
    if (fixed && !snap) { const k = idle.on ? 1 - Math.exp(-dt * 3) : travel.on ? 1 - Math.exp(-dt * 5) : 1 - Math.exp(-dt * (view.id === 'first' ? 30 : 4)); camPos.lerp(desired, k); look.lerp(focus, 1 - Math.exp(-dt * (travel.on ? 6 : 20))); }
    else if (snap) { camPos.copy(desired); look.copy(focus); snap = false; }
    else {
      const k = 1 - Math.exp(-dt * 6);
      camPos.lerp(desired, k);
      look.lerp(focus, k);
    }
    camera.position.copy(camPos);
    camera.lookAt(look);
    // a wall pushed the camera into the avatar: hide it rather than show the inside of a head
    avatar.visible = !riding && (cam.aerial || travel.on || (view.id !== 'first' && camPos.distanceTo(look) > 1.7));

    chrome.update(camera, player, !cam.aerial);
    street?.update(dt, t, player, cam.yaw, shared.uArrival.value);
    street?.renderReflection();
    if (q.get('post') === '0') renderer.render(scene, camera); else composer.render();
  }
  frame();

  window.__bw = {
    get world() { return world; }, camera, cam, player, renderer, scene, via,
    get theme() { return themeName; }, setTheme, get look() { return street; }, quality, composer, weather: weatherFeed, get kit() { return kit; }, goto, setAerial, cycleView, setTravel, get travel() { return travel.on; }, idle, get online() { return online; }, audio, get view() { return (riding ? 'ride:' : 'foot:') + (riding ? viewOf('ride') : viewOf('foot')).id; }, get walkTarget() { return walkTarget; }, get walkPath() { return walkPath; }, walkTo, get groundY() { return groundY; },
    ready: true,
  };
}

main().catch((err) => {
  console.error(err);
  const l = document.getElementById('loader');
  l.classList.remove('gone');
  l.innerHTML = `<div>Could not build the world<small>${String(err.message || err)}</small></div>`;
});
