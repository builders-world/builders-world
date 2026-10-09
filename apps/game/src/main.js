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
import { createLook, blueHourSky, pickQuality, createWeather } from './look/index.js';
import { loadKit } from './look/kit.js';

const q = new URLSearchParams(location.search);
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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'low' ? 1 : 1.5));
renderer.setSize(innerWidth, innerHeight, false);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.2, 4000);

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
  avatar.add(body);
  scene.add(avatar);
  if (resident) {
    const returnLink = document.createElement('a');
    returnLink.href = './';
    returnLink.textContent = '← Your arrival / edit avatar';
    Object.assign(returnLink.style, { position: 'fixed', bottom: '68px', left: '16px', zIndex: '20', color: 'var(--fg)', background: 'var(--solid)', padding: '10px 14px', fontSize: '12px', borderRadius: '8px', textDecoration: 'none' });
    document.body.appendChild(returnLink);
  }

  // destination marker for click-to-walk (static; it only exists while there is a target)
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.7, 28).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffb454, transparent: true, opacity: 0.9, depthWrite: false })
  );
  marker.position.y = 0.14;
  marker.visible = false;
  scene.add(marker);

  const player = new THREE.Vector3();
  let heading = 0;
  let walkTarget = null;

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
    if (flag === cam.aerial) return;
    modes[cam.aerial ? 'aerial' : 'street'] = { pitch: cam.pitchT, dist: cam.distT };
    cam.aerial = flag;
    const m = modes[flag ? 'aerial' : 'street'];
    cam.pitchT = cam.pitch = m.pitch;
    cam.distT = cam.dist = m.dist || world.radius * 1.35;
    walkTarget = null; marker.visible = false;
    snap = true;
    chrome.setView(flag);
  }

  function goto(id) {
    const pl = world.plots.find((p) => p.b.id === id);
    if (!pl) return;
    cut(() => {
      const f = world.frontOf([pl.center.x, pl.center.z]);
      player.set(f.x, 0, f.z);
      world.resolve(player, 0.8);
      heading = cam.yaw = cam.yawT = f.yaw;
      walkTarget = null; marker.visible = false;
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
    onView: (a) => cut(() => setAerial(a)),
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
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    // phone, map and bag take their keys first, and hold movement while open
    if (!e.repeat && street?.hud.menuKey(k)) { e.preventDefault(); keys.clear(); return; }
    if (street?.hud.isOpen() && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) return;
    if (k === 'v') { if (!e.repeat) cut(() => setAerial(!cam.aerial)); }
    else if (k === 't') { if (!e.repeat) setTheme(themeName === 'night' ? 'day' : 'night'); }
    else if (k === 'h') { if (!e.repeat) document.body.classList.toggle('nohud'); }
    else if (k === '?' || k === '/') chrome.toggleHelp();
    else if (k === 'e' && !e.repeat && street?.hud.interact()) { /* handled by the street */ }
    else if (k === 'escape') { street?.hud.close(); chrome.unpin(); chrome.hideCard(); chrome.toggleList(false); chrome.toggleHelp(false); }
    else if (k === '=' || k === '+') zoomKey(-1);
    else if (k === '-' || k === '_') zoomKey(1);
    else { keys.add(k); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { walkTarget = null; marker.visible = false; } }
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
    if (!hit || hit.point.y > 0.5) { chrome.toast('Click the street to walk there'); return; }
    pt.copy(hit.point);
    if (Math.hypot(pt.x, pt.z) > world.radius * 1.05) return;
    if (cam.aerial) {
      cut(() => { player.set(pt.x, 0, pt.z); world.resolve(player, 0.8); setAerial(false); snap = true; });
    } else {
      walkTarget = pt.clone();
      marker.position.set(pt.x, 0.14, pt.z);
      marker.visible = true;
    }
  });

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
  const clock = new THREE.Clock();
  let t = 0;
  let stuck = 0;
  const last = new THREE.Vector3();
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), mv = new THREE.Vector3();
  const focus = new THREE.Vector3(), desired = new THREE.Vector3();

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    shared.uTime.value = t;
    if (arrivalStarted && shared.uArrival.value < 50) shared.uArrival.value += dt;

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
      if (move.mode === 'stand') { player.z += 0.9; seated = false; }
      else {
        player.set(move.x, 0, move.z);
        if (move.yaw !== undefined) heading = cam.yaw = cam.yawT = move.yaw;
        seated = move.mode === 'sit';
        if (move.mode === 'inside') { savedOutside = { dist: cam.distT, pitch: cam.pitchT }; cam.distT = cam.dist = 4.5; cam.pitchT = cam.pitch = 0.32; }
        if (move.mode === 'outside' && savedOutside) { cam.distT = savedOutside.dist; cam.pitchT = savedOutside.pitch; world.resolve(player, 0.8); }
        snap = true;
      }
    }
    const inside = !!street?.inside;
    const C = street?.collider?.() || world;

    // a hired ride carries the player; the camera sits behind the vehicle
    const rs = street?.ride(dt, t, keys, player);
    if (rs?.exit) {
      player.copy(rs.exit); world.resolve(player, 0.8);
      if (riding) { cam.distT = savedDist; riding = false; }
    } else if (rs?.pos) {
      if (!riding) { savedDist = cam.distT; riding = true; }
      player.set(rs.pos.x, 0, rs.pos.z);
      heading = rs.yaw;
      cam.distT = rs.cam;
      if (!drag) cam.yawT += Math.atan2(Math.sin(rs.yaw - cam.yawT), Math.cos(rs.yaw - cam.yawT)) * (1 - Math.exp(-dt * 2));
    }

    // walking, never running
    fwd.set(Math.sin(cam.yaw), 0, Math.cos(cam.yaw));
    right.set(-Math.cos(cam.yaw), 0, Math.sin(cam.yaw));
    mv.set(0, 0, 0);
    if (!cam.aerial && !riding && !seated) {
      if (keys.has('w') || keys.has('arrowup')) mv.add(fwd);
      if (keys.has('s') || keys.has('arrowdown')) mv.sub(fwd);
      if (keys.has('d') || keys.has('arrowright')) mv.add(right);
      if (keys.has('a') || keys.has('arrowleft')) mv.sub(right);
      if (mv.lengthSq() === 0 && walkTarget) {
        const dx = walkTarget.x - player.x, dz = walkTarget.z - player.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.45) { walkTarget = null; marker.visible = false; }
        else mv.set(dx / dist, 0, dz / dist);
      }
    }
    const moving = mv.lengthSq() > 0;
    if (moving) {
      mv.normalize();
      last.copy(player);
      player.addScaledVector(mv, (inside ? 2.6 : 5.2) * dt); // indoors you walk like indoors
      if (inside) C.resolve(player); else world.resolve(player, 0.8);
      if (walkTarget) {
        stuck = player.distanceTo(last) < 5.2 * dt * 0.25 ? stuck + dt : 0;
        if (stuck > 0.5) { walkTarget = null; marker.visible = false; stuck = 0; }
      }
      let dh = Math.atan2(mv.x, mv.z) - heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      heading += dh * (1 - Math.exp(-dt * 12));
    }
    avatar.position.copy(player);
    avatar.rotation.y = heading;
    body.position.y = seated ? -0.42 : moving && !reduced ? Math.abs(Math.sin(t * 9)) * 0.05 : 0;
    body.rotation.z = moving && !reduced ? Math.sin(t * 9) * 0.04 : 0;

    // damped third-person follow; district-to-district is a cut, never a flight
    if (cam.aerial) focus.set(0, 6, 0); else focus.set(player.x, 1.75, player.z);
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
    if (snap) { camPos.copy(desired); look.copy(focus); snap = false; }
    else {
      const k = 1 - Math.exp(-dt * 6);
      camPos.lerp(desired, k);
      look.lerp(focus, k);
    }
    camera.position.copy(camPos);
    camera.lookAt(look);
    // a wall pushed the camera into the avatar: hide it rather than show the inside of a head
    avatar.visible = !riding && (cam.aerial || camPos.distanceTo(focus) > 1.7);

    chrome.update(camera, player, !cam.aerial);
    street?.update(dt, t, player, cam.yaw, shared.uArrival.value);
    street?.renderReflection();
    if (q.get('post') === '0') renderer.render(scene, camera); else composer.render();
    requestAnimationFrame(frame);
  }
  frame();

  window.__bw = {
    get world() { return world; }, camera, cam, player, renderer, scene, via,
    get theme() { return themeName; }, setTheme, get look() { return street; }, quality, composer, weather: weatherFeed, get kit() { return kit; }, goto, setAerial, get walkTarget() { return walkTarget; },
    ready: true,
  };
}

main().catch((err) => {
  console.error(err);
  const l = document.getElementById('loader');
  l.classList.remove('gone');
  l.innerHTML = `<div>Could not build the world<small>${String(err.message || err)}</small></div>`;
});
