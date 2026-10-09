import * as THREE from 'three';
import { PlanarReflection, weather } from './surfaces.js';
import { rain, lampCones, LampLights, skyline } from './atmosphere.js';
import { buildProps } from './props.js';
import { createHud } from './hud.js';

export { blueHourSky } from './atmosphere.js';

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

export function createLook({ renderer, scene, camera, world, reduced, quality, sky }) {
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
  const hud = createHud({
    world, props, camera, reduced,
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

  // Lightning: rare, two flashes at most per strike, never more than three a second.
  let nextStrike = 18 + Math.random() * 20, flashT = -1;
  // a soft cool fill from the camera side, so characters never go black against the light
  const fill = new THREE.PointLight(0xa9bbff, night ? 6 : 0, 11, 1.5);
  group.add(fill);
  const flashLight = new THREE.DirectionalLight(0xa8b8ff, 0);
  flashLight.position.set(-200, 300, 100);
  group.add(flashLight);

  function update(dt, t, player, yaw, arrival) {
    lights?.update(dt, player, arrival);
    fill.position.set(camera.position.x * 0.6 + player.x * 0.4, 3.2, camera.position.z * 0.6 + player.z * 0.4);
    if (rainMesh) rainMesh.userData.cam.value.copy(camera.position);
    props.update(dt, t, player);
    hud.update(dt, t, player, yaw);
    if (night && !reduced) {
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
    if (reflection) reflection.render(renderer, scene, camera);
  }

  function setSize(w, h) { reflection?.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio()); }

  function dispose() {
    hud.dispose();
    props.dispose();
    lights?.dispose();
    reflection?.dispose();
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
    });
    group.removeFromParent();
  }

  return { update, renderReflection, setSize, dispose, hud, props, quality, viewYaw: props.viewYaw, stats: () => ({ lights: lights?.lights.length ?? 0, rain: tier.rain, reflect: !!reflection }) };
}

