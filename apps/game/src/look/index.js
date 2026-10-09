import * as THREE from 'three';
import { PlanarReflection, weather } from './surfaces.js';
import { rain, lampCones, LampLights, skyline } from './atmosphere.js';
import { buildProps } from './props.js';
import { createHud } from './hud.js';
import { createGear } from './gear.js';
import { sunPosition, sunDirection } from './sun.js';
import { shared } from '../shaders.js';

export { blueHourSky } from './atmosphere.js';
export { createWeather } from './weather.js';

const C = (hex) => new THREE.Color(hex);
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const PAL = {
  hemiSky: { night: C(0x1e2a52), blue: C(0x4a64b8), day: C(0xa8c4ee) },
  hemiGround: { night: C(0x0e0c0a), blue: C(0x1a1612), day: C(0x6a5a48) },
  fog: { night: C(0x0c1226), blue: C(0x24305a), day: C(0xa3b4c8), gold: C(0xa88a86), storm: C(0x3a4250) },
  sun: { gold: C(0xffa868), day: C(0xfff3e2), moon: C(0x8ea6ff) },
};

// Quality tiers. Low drops the mirror, most rain, most lights and the walkers,
// so the same street still runs on a laptop with no real GPU.
export function pickQuality(q) {
  const asked = q.get('quality');
  if (asked === 'low' || asked === 'high') return asked;
  const coarse = matchMedia('(pointer: coarse)').matches;
  return coarse || Math.min(innerWidth, innerHeight) < 600 ? 'low' : 'high';
}

const TIERS = {
  high: { reflect: 0.5, rain: 9000, lights: 8 },
  low: { reflect: 0, rain: 2500, lights: 3 },
};

export function createLook({ renderer, scene, camera, world, reduced, quality, sky, bloom, weatherFeed, avatar }) {
  const tier = TIERS[quality] || TIERS.high;
  const env = world.env;
  const night = !!env.wet;
  weather.uWet.value = env.wet ? 1 : 0;
  weather.uRain.value = env.rain ? (reduced ? 0.4 : 1) : 0;
  weather.uHasReflect.value = 0;

  const group = new THREE.Group();
  scene.add(group);
  const off = new Set((new URLSearchParams(location.search).get('no') || '').split(','));

  const props = buildProps(world, group, { lowQuality: quality === 'low', reduced });
  if (!off.has('skyline')) group.add(skyline(world));

  let reflection = null, rainMesh = null, cones = null, lights = null;
  if (night) {
    if (tier.reflect && !off.has('reflect')) {
      reflection = new PlanarReflection(tier.reflect);
      reflection.setSize(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio());
    }
    rainMesh = rain(tier.rain);
    if (!off.has('rain')) group.add(rainMesh);
    cones = lampCones(world.lamps.filter((l) => l.kind === 'street'));
    if (!off.has('cones')) group.add(cones);
    lights = new LampLights(group, off.has('lights') ? 0 : tier.lights);
    lights.setLamps([...world.lamps, ...props.lamps]);
  }

  // the bench that appears when someone builds
  const placed = new THREE.Group();
  group.add(placed);
  const gear = avatar ? createGear(avatar) : null;
  const hud = createHud({
    world, props, camera, reduced, weatherFeed: night ? weatherFeed : null,
    onEquip: (id, on) => gear?.set(id, on),
    onInteract: (what) => {
      if (what !== 'place-bench' || !props.area) return;
      const ghost = props.root.children.find((c) => c.userData.ghost)?.userData.ghost;
      if (!ghost) return;
      const bench = new THREE.Mesh(ghost.geometry, new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.7 }));
      ghost.getWorldPosition(bench.position);
      ghost.getWorldQuaternion(bench.quaternion);
      ghost.visible = false;
      placed.add(bench);
    },
  });
  group.add(hud.route);

  if (reflection) reflection.hidden = [world.ground, rainMesh, cones, hud.route].filter(Boolean);

  // ---------- real time and real weather ----------
  // Targets come from the sun's real position and the live forecast; the street eases toward them,
  // so a shower rolls in over seconds and dusk takes as long as dusk does.
  const R = world.radius;
  const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3(-0.4, 0.8, 0.45).normalize();
  const cur = { rain: 0, wet: 0, cloud: 0.4, storm: 0, fog: 0, wind: 3, windDir: 200 };
  let first = true;
  const tmpA = new THREE.Color(), tmpB = new THREE.Color();
  const mix3 = (out, a, b, c, tb, tc) => out.copy(a).lerp(b, tb).lerp(c, tc);
  const district = world.center?.lat != null ? world.center : { lat: 6.5095, lon: 3.3715 };
  let live = null;

  function environment(dt) {
    const wx = weatherFeed?.state;
    const loc = wx?.loc || district;
    const sun = sunPosition(weatherFeed ? weatherFeed.now() : new Date(), loc.lat, loc.lon);
    const e = sun.elevation;
    sunDirection(sun, sunDir);
    const target = wx || { rain: 0, wet: 0, cloud: 0.4, storm: false, fog: 0, wind: { speed: 3, dir: 200 } };
    const k = first ? 1 : 1 - Math.exp(-dt / 6);
    cur.rain += ((target.rain || 0) - cur.rain) * k;
    cur.wet += ((target.wet || 0) - cur.wet) * (first ? 1 : 1 - Math.exp(-dt / 20));
    cur.cloud += ((target.cloud ?? 0.4) - cur.cloud) * k;
    cur.storm += ((target.storm ? 1 : 0) - cur.storm) * k;
    cur.fog += ((target.fog || 0) - cur.fog) * k;
    cur.wind += ((target.wind?.speed ?? 3) - cur.wind) * k;
    cur.windDir = target.wind?.dir ?? cur.windDir;
    first = false;

    const day = smooth(-4, 12, e);
    const deep = 1 - smooth(-16, -7, e);
    const gold = smooth(-6, 1, e) * (1 - smooth(4, 16, e)) * (1 - 0.7 * cur.cloud);
    const overcastDark = cur.storm * 0.7 + Math.max(0, cur.cloud - 0.85) * 1.5;
    const lamps = Math.max(1 - smooth(-2, 6, e), Math.min(1, overcastDark) * day * 0.8);

    // sun or moon
    const sunI = day * 3.2 * (1 - 0.68 * cur.cloud) * (1 - 0.45 * cur.fog) * (1 - 0.5 * cur.storm);
    const moonI = (1 - day) * 0.3 * (1 - 0.5 * cur.cloud);
    const rig = world.rig;
    if (sunI >= moonI) {
      rig.moon.position.copy(sunDir).multiplyScalar(300);
      rig.moon.color.copy(PAL.sun.gold).lerp(PAL.sun.day, smooth(2, 22, e));
      rig.moon.intensity = sunI;
    } else {
      rig.moon.position.copy(moonDir).multiplyScalar(300);
      rig.moon.color.copy(PAL.sun.moon);
      rig.moon.intensity = moonI;
    }
    const blueToDay = day, nightAmt = deep * (1 - day);
    mix3(rig.hemi.color, PAL.hemiSky.blue, PAL.hemiSky.night, PAL.hemiSky.day, nightAmt, blueToDay);
    mix3(rig.hemi.groundColor, PAL.hemiGround.blue, PAL.hemiGround.night, PAL.hemiGround.day, nightAmt, blueToDay);
    rig.hemi.intensity = (0.42 - 0.12 * nightAmt + 1.6 * day) * (1 - 0.12 * cur.cloud) * (1 - 0.3 * cur.storm);
    rig.rim.intensity = 0.3 * (1 - day) + 0.1;

    // fog and haze
    if (scene.fog) {
      mix3(tmpA, PAL.fog.blue, PAL.fog.night, PAL.fog.day, nightAmt, day);
      tmpA.lerp(PAL.fog.gold, gold * 0.6).lerp(PAL.fog.storm, cur.storm * 0.6 * day);
      scene.fog.color.copy(tmpA);
      const thick = Math.max(cur.fog, cur.rain * 0.45);
      scene.fog.near = R * (0.08 - 0.06 * thick);
      // from the aerial view you look through far more air, so let the haze thin out
      const high = smooth(25, 90, camera.position.y);
      scene.fog.far = R * (1.9 - 1.3 * thick) * (1 + 2.2 * high);
      scene.fog.near = scene.fog.near * (1 + 4 * high);
    }
    renderer.toneMappingExposure = 1.05 - 0.05 * day;
    if (bloom) { bloom.strength = 0.55 - 0.3 * day; bloom.threshold = 0.85 + 0.75 * day; }

    // sky
    const u = sky?.userData.u;
    if (u) {
      u.uSunDir.value.copy(sunDir);
      u.uNight.value = deep; u.uDay.value = day; u.uGold.value = gold;
      u.uCloud.value = cur.cloud; u.uStorm.value = cur.storm; u.uFog.value = Math.max(cur.fog, cur.rain * 0.4);
      u.uFogCol.value.copy(scene.fog ? scene.fog.color : tmpA);
    }

    // street
    shared.uLamps.value = lamps;
    shared.uDay.value = day; // daylight fades lamp pools and the monument sweep
    shared.uWind.value = Math.max(0.3, Math.min(2.6, 0.3 + cur.wind / 5));
    weather.uRain.value = cur.rain * (reduced ? 0.4 : 1);
    weather.uWet.value = cur.wet;
    fill.intensity = 6 * (1 - day);
    if (rig.bulbMat) rig.bulbMat.color.setRGB(...rig.bulb).multiplyScalar(0.06 + 0.94 * lamps);
    props.materials.warm.color.setRGB(2.0, 1.15, 0.45).multiplyScalar(0.12 + 0.88 * lamps);
    if (rainMesh) {
      const to = ((cur.windDir + 180) * Math.PI) / 180, slant = Math.min(cur.wind, 15) * 0.025;
      rainMesh.userData.wind.value.set(Math.sin(to) * slant, -Math.cos(to) * slant);
    }
    live = { elevation: e, day, lamps, ...cur };
  }

  // Lightning: rare, two flashes at most per strike, never more than three a second.
  let nextStrike = 18 + Math.random() * 20, flashT = -1;
  // a soft cool fill from the camera side, so characters never go black against the light
  const fill = new THREE.PointLight(0xa9bbff, night ? 6 : 0, 11, 1.5);
  group.add(fill);
  const flashLight = new THREE.DirectionalLight(0xa8b8ff, 0);
  flashLight.position.set(-200, 300, 100);
  group.add(flashLight);

  function update(dt, t, player, yaw, arrival) {
    if (night) environment(dt);
    lights?.update(dt, player, arrival);
    fill.position.set(camera.position.x * 0.6 + player.x * 0.4, 3.2, camera.position.z * 0.6 + player.z * 0.4);
    if (rainMesh) rainMesh.userData.cam.value.copy(camera.position);
    props.update(dt, t, player);
    hud.update(dt, t, player, yaw);
    // lightning only when there is a thunderstorm where the weather comes from
    if (night && !reduced && cur.storm > 0.5) {
      nextStrike -= dt;
      if (nextStrike <= 0) { flashT = 0; nextStrike = 25 + Math.random() * 35; }
      let f = 0;
      if (flashT >= 0) {
        flashT += dt;
        f = Math.max(0, 1 - flashT / 0.12) + (flashT > 0.42 ? Math.max(0, 0.7 - (flashT - 0.42) / 0.15) : 0);
        if (flashT > 0.8) flashT = -1;
      }
      if (sky?.userData.flash) sky.userData.flash.value = f * 0.6;
      flashLight.intensity = f * 1.4;
    }
  }

  function renderReflection() {
    // a dry street has nothing to mirror, so skip the extra pass
    if (reflection && weather.uWet.value > 0.03) reflection.render(renderer, scene, camera);
    else weather.uHasReflect.value = 0;
  }

  function setSize(w, h) { reflection?.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio()); }

  function dispose() {
    hud.dispose();
    gear?.dispose();
    props.dispose();
    lights?.dispose();
    reflection?.dispose();
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
    });
    group.removeFromParent();
  }

  return { update, renderReflection, setSize, dispose, hud, props, quality, viewYaw: props.viewYaw, get env() { return live; }, stats: () => ({ lights: lights?.lights.length ?? 0, rain: tier.rain, reflect: !!reflection }) };
}

