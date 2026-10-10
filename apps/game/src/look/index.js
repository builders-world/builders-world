import * as THREE from 'three';
import { PlanarReflection, weather } from './surfaces.js';
import { rain, lampCones, LampLights, skyline } from './atmosphere.js';
import { buildProps } from './props.js';
import { createHud } from './hud.js';
import { createGear } from './gear.js';
import { createLife } from './life.js';
import { dressDistrict } from './district.js';
import { createRides } from './rides.js';
import { createChat } from './chat.js';
import { buildParks, buildRecreation } from './parks.js';
import { createLives } from './lives.js';
import { buildCivic } from './civic.js';
import { createLitter } from './litter.js';
import { buildPlaceFronts, hubSign } from './places.js';
import { buildEstateSigns } from './estatesigns.js';
import { passesEngine, MEMBERS_ONLY } from './passes.js';
import { createGates } from './gates.js';
import { buildBench } from './build.js';
import { createProfiler } from './profiler.js';
import { createWardrobe } from './wardrobe.js';
import { createPets } from './pets.js';
import { createFood } from './food.js';
import { walletEngine } from './wallet.js';
import { createInteriors, PLACES, namePlaces } from './interior.js';
import { sunPosition, sunDirection } from './sun.js';
import { shared } from '../shaders.js';

export { blueHourSky } from './atmosphere.js';
export { createWeather } from './weather.js';

const C = (hex) => new THREE.Color(hex);
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const PAL = {
  // the clay look from the arrival scene (world bible 7.1): high soft sky light, warm sun, sage air
  hemiSky: { night: C(0x34446e), blue: C(0x6f80b4), day: C(0xd7e6e4) },
  hemiGround: { night: C(0x1c1914), blue: C(0x3a3426), day: C(0x817151) },
  fog: { night: C(0x1a2340), blue: C(0x4a5878), day: C(0xc6d5c7), gold: C(0xd9bf9c), storm: C(0x6a7470) },
  sun: { gold: C(0xffb87a), day: C(0xffe0ac), moon: C(0x9fb2ff) },
  fill: { day: C(0xb8d9df), night: C(0x3a6aa0) },
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
  high: { reflect: 0.5, rain: 9000, lights: 14 },
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

  namePlaces(world.place?.name, world.place?.city);
  const props = buildProps(world, group, { lowQuality: quality === 'low', reduced });
  // the expanded kit: shops, stalls, landmarks, poles and wires, gutters, tanks, danfos
  const dressing = world.kit ? dressDistrict(world, group, { kit: world.kit, lowQuality: quality === 'low', reduced, spawn: world.spawn }) : null;
  if (dressing) { props.interact.push(...dressing.interact); props.lamps.push(...dressing.lamps); }
  const sky2 = off.has('skyline') ? null : skyline(world);
  if (sky2) group.add(sky2);

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
    lights.setLamps([...world.lamps, ...props.lamps, ...(world.porchLamps || [])]);
  }

  // the bench that appears when someone builds
  const placed = new THREE.Group();
  group.add(placed);
  const gear = avatar ? createGear(avatar) : null;
  // places a ride can take you, also used by the map
  const you = world.plots.find((pl) => pl.b.id === 'you');
  props.places = [
    props.interact.find((i) => i.id === 'board') && { name: 'Community board', at: props.interact.find((i) => i.id === 'board') },
    props.area && { name: 'Community build area', at: props.area },
    props.hubAt && { name: PLACES.hub.name, at: props.hubAt },
    you && { name: 'Your plot', at: world.frontOf([you.center.x, you.center.z]) },
    ...props.interact.filter((i) => i.id.startsWith('shop:')).map((i) => ({ name: i.name, at: i })),
  ].filter(Boolean);
  // porch lights: a small wall lamp by every front door. After dark the sensor ones switch on when
  // anyone (you or a passer-by) comes within 7 m and off 20 s after they leave; the rest burn all night.
  const porch = (() => {
    const list = world.porchLamps || [];
    if (!list.length) return null;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.3, 0.14), new THREE.MeshBasicMaterial({ color: 0xffffff }), list.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    list.forEach((l, i) => { m4.compose(new THREE.Vector3(l.mx, l.my, l.mz), q.setFromAxisAngle(up, l.ry), one); mesh.setMatrixAt(i, m4); l.until = 0; l.on = false; });
    const ON = new THREE.Color(1.6, 1.15, 0.6), OFF = new THREE.Color(0.32, 0.3, 0.27);
    list.forEach((l, i) => mesh.setColorAt(i, OFF));
    group.add(mesh);
    let tick = 0, clock = 0;
    return {
      mesh,
      update(dt, player) {
        clock += dt; tick -= dt; if (tick > 0) return; tick = 0.2;
        const dark = (live?.lamps ?? (night ? 1 : 0)) > 0.35;
        const movers = [player, ...(props.people || []).map((p) => p.obj.position)];
        let changed = false;
        list.forEach((l, i) => {
          if (Math.hypot(l.x - player.x, l.z - player.z) > 90) { if (l.on) { l.on = false; l.power = 0; mesh.setColorAt(i, OFF); changed = true; } return; }
          if (l.sensor && dark && movers.some((p) => Math.hypot(p.x - l.x, p.z - l.z) < 7)) l.until = clock + 20;
          const on = dark && (!l.sensor || clock < l.until);
          if (on !== l.on) { l.on = on; l.power = on ? 6 : 0; mesh.setColorAt(i, on ? ON : OFF); changed = true; }
        });
        if (changed) mesh.instanceColor.needsUpdate = true;
      },
    };
  })();

  let food = null, pets = null, petIt = null, wardrobe = null, profiler = null, onlineRef = null, building = null, gates = null, visiting = null, passes = null, rides = null, pendingExit = null, interiors = null, pendingMove = null, doorOut = null, litter = null, seats = [], benchSeat = null;
  // the tech places you can walk into (world bible 6.6)
  const doors = [];
  if (props.hubAt) doors.push({ key: 'hub', at: props.hubAt });
  // the loft and the studio get buildings of their own, with their names on the front (places.js);
  // the hub's building gets the same big sign
  if (props.hubGroup) hubSign(props.hubGroup);
  // the estates: gate signs, house numbers, cars in the driveways (estatesigns.js)
  const estateSigns = buildEstateSigns({ world, scene: group });
  const placeUsed = [];
  const fronts = buildPlaceFronts({ world, scene: group, keys: ['loft', 'studio'], used: placeUsed,
    addLamps: (l) => props.lamps.push(...l) });
  doors.push(...fronts.doors);
  doors.forEach((d) => props.interact.push({ id: `enter:${d.key}`, label: MEMBERS_ONLY[d.key] ? `${PLACES[d.key].name}: members only` : `Enter ${PLACES[d.key].name}`, x: d.at.x, z: d.at.z, r: 3.5 }));
  function setInside(name) {
    world.scene.visible = !name; if (sky) sky.visible = !name; group.visible = !name;
    document.body.classList.toggle('bw-inside', !!name);
    if (name) { savedFog = scene.fog; scene.fog = null; renderer.toneMappingExposure = 1.0; if (bloom) { bloom.strength = 0.3; bloom.threshold = 0.95; } }
    else { scene.fog = savedFog; }
  }
  let savedFog = null;
  const chat = createChat({ camera, avatar, getEnv: () => live, reduced });
  // residents with homes, jobs, families and a day that follows real time (lives.js)
  const lives = createLives({ world, scene: group, getEnv: () => live, getPois: () => props.pois, reduced, lowQuality: quality === 'low', chat, interact: props.interact, toast: (t, ms) => hud.toast(t, ms) });
  chat.setLife?.(lives.lifeLine);
  props.people = [...(props.people || []), ...lives.people];
  (props.people || []).forEach((p) => chat.add(p));
  const hud = createHud({
    onChat: (name) => { const p = chat.people.find((q) => q.name === name); if (p) chat.sayHi(p); },
    onUse: (player, active) => {
      if (benchSeat) { standUp(); return true; }
      if (active?.id?.startsWith('life:')) return lives.talk(active.id);
      // people's homes: knock; go in only when they have asked you in (lives.js)
      if (active && food?.handles(active)) return food.open(active);
      if (active?.id === 'pet') return pets.act('pet');
      if (active?.id?.startsWith('gate:')) return gates.open(active.id);
      if (active?.id?.startsWith('pknock:')) return gates.knockPlayer(active.id.slice(7));
      if (active?.id === 'myhome') {
        const host = gates.enterHome(); if (!host) return false;
        doorOut = { x: host.door.x, z: host.door.z, yaw: host.door.ry ?? 0 };
        interiors.enter('home', host).then((p) => { setInside('Your home'); pendingMove = { ...p, mode: 'inside' }; passes.arrive('myhome'); });
        return true;
      }
      if (active?.id?.startsWith('knock:')) return lives.knock(active.id);
      if (active?.id?.startsWith('visit:')) {
        const host = lives.visit(active.id); if (!host) return false;
        doorOut = { x: host.door.x, z: host.door.z, yaw: host.door.ry ?? 0 };
        visiting = host.id;
        interiors.enter('home', host).then((p) => { setInside(`${host.first}'s home`); pendingMove = { ...p, mode: 'inside' }; passes.arrive('home'); });
        return true;
      }
      if (active?.id?.startsWith('seat:')) {
        const st = seats[+active.id.slice(5)]; if (!st) return false;
        benchSeat = st; pendingMove = { x: st.x, z: st.z, yaw: st.yaw, mode: 'sit' };
        hud.toast('Sitting down. Press E or walk to stand up.', 2400); return true;
      }
      if (active?.id && (active.id.startsWith('litter:') || active.id.startsWith('bin:') || active.id === 'recycle')) return !!litter?.use(active.id, player);
      if (interiors?.active) {
        const r = interiors.use(player.x, player.z);
        if (r?.exit) { interiors.leave(); passes.forgetLink(); if (visiting) { lives.leaveVisit(visiting); visiting = null; } setInside(null); pendingMove = doorOut && { ...doorOut, mode: 'outside' }; return true; }
        if (r?.sit) { pendingMove = { ...r.sit, mode: 'sit' }; return true; } // the seat bar says what you can do now
        return !!r;
      }
      if (active?.id?.startsWith('enter:')) {
        const key = active.id.slice(6), door = { x: active.x, z: active.z, yaw: Math.atan2(active.x - player.x, active.z - player.z) + Math.PI };
        const go = () => {
          doorOut = door;
          interiors.enter(key).then((p) => {
            setInside(PLACES[key].name); pendingMove = { ...p, mode: 'inside' };
            const L = passes.arrive(key), own = passes.NETS[key];
            setTimeout(() => hud.toast(L ? `Your laptop joined ${L.ssid}.` : `Your laptop is offline in here. ${key === 'studio' ? 'The members\' Wi-Fi is on your card' : `Wi-Fi ${own?.ssid}: the password is on the notice board`}.`, 4000), 4800);
          });
        };
        // members only: register at the door, or tap your card
        const gate = MEMBERS_ONLY[key];
        if (gate && !passes.valid(gate.card)) { passes.openRegister(go); return true; }
        if (gate) { const c = passes.card(gate.card); hud.toast(`Card tapped. Welcome back, ${c.name.split(' ')[0]}.`, 2000); }
        go();
        return true;
      }
      if (rides?.use(player)) return true;
      if (active?.id?.startsWith('stop:')) { rides?.openPanel(active.kind, active); return true; }
      return false;
    },
    onRide: (player) => (interiors?.active ? hud.toast('Step outside to call a ride: the driver cannot come in.', 2600) : rides?.openPanel('taxi', { app: true, x: player.x, z: player.z })),
    isExtraOpen: () => rides?.isMenuOpen() || interiors?.computerOpen || !!benchSeat || !!passes?.registering || !!gates?.isOpen || !!wardrobe?.isOpen || !!pets?.isOpen || !!food?.isOpen,
    closeExtra: () => {
      rides?.closeMenu();
      if (passes?.registering) { passes.closeRegister(); return; }
      if (gates?.isOpen) { gates.close(); return; }
      if (wardrobe?.isOpen) { wardrobe.cancel(); return; }
      if (pets?.isOpen) { pets.close(); return; }
      if (food?.isOpen) { food.close(); return; }
      if (interiors?.computerOpen) interiors.closeComputer();
      else if (interiors?.seated || benchSeat) standUp();
    },
    getPrompt: (player) => (benchSeat || interiors?.seated ? null : interiors?.active ? interiors.prompt(player.x, player.z) : undefined), // seated: the seat bar takes over
    world, props, camera, reduced, weatherFeed: night ? weatherFeed : null,
    onEquip: (id, on) => gear?.set(id, on),
    onInteract: (what) => {
      if (what !== 'place-bench' || !props.area) return;
      const ghost = props.root.children.find((c) => c.userData.ghost)?.userData.ghost;
      if (!ghost) return;
      // the bench goes up as a time-lapse: builders in hard hats, part by part (build.js)
      const at = ghost.getWorldPosition(new THREE.Vector3()), quat = ghost.getWorldQuaternion(new THREE.Quaternion());
      ghost.visible = false;
      building = buildBench({ scene: placed, at: placed.worldToLocal(at.clone()), quat, player: avatar, reduced, onDone: (site) => {
        building = null; hud.toast('Your bench is built. Sit on it any time.', 3000);
        const yaw = new THREE.Euler().setFromQuaternion(quat, 'YXZ').y, st = { x: at.x + Math.sin(yaw) * 0.05, z: at.z + Math.cos(yaw) * 0.05, yaw };
        seats.push(st); props.interact.push({ id: `seat:${seats.length - 1}`, label: 'Sit on your bench', x: st.x + Math.sin(yaw) * 0.5, z: st.z + Math.cos(yaw) * 0.5, r: 1.3 });
        world.addColliders([{ name: 'bench', cx: at.x, cz: at.z, hx: 0.9, hz: 0.25, ry: yaw, h: 0.9 }]);
      } });
    },
  });
  group.add(hud.route);
  passes = passesEngine({ toast: hud.toast, district: world.place?.name || 'Yaba' });
  wardrobe = createWardrobe({ toast: hud.toast });
  food = createFood({ scene: group, props, toast: hud.toast, getEnv: () => live, reduced });
  pets = createPets({ scene: group, camera, world, toast: hud.toast, isIndoors: () => !!interiors?.active });
  petIt = { id: 'pet', label: 'Pet', x: 0, z: 0, r: 0 }; props.interact.push(petIt);
  addEventListener('bw:shelter', () => { hud.close(); pets.openShelter(); });
  addEventListener('bw:wardrobe', () => { hud.close(); wardrobe.open(avatar?.userData.look || { topColor: avatar?.userData.dressFound?.shirt?.color ? `#${avatar.userData.dressFound.shirt.color.getHexString()}` : undefined }); });
  profiler = createProfiler({ camera, lives, props, getOnline: () => onlineRef, toast: hud.toast });
  gates = createGates({ world, scene: group, props, lives, passes, toast: hud.toast, getHour: () => live?.hour ?? 12,
    // another player said yes at their door: in you go, they are there to meet you
    enterPlayerHome: (host) => { doorOut = { x: host.door.x, z: host.door.z, yaw: host.door.ry ?? 0 }; interiors.enter('home', host).then((p) => { setInside(`${host.first}'s home`); pendingMove = { ...p, mode: 'inside' }; passes.arrive('home'); }); } });
  interiors = createInteriors({ scene, reduced, toast: hud.toast, getEnv: () => live || { day: 1 }, onPackUp: () => standUp(), net: passes });
  // everything that moves and can be bumped into: people, traffic, the waiting hired vehicle
  const bodies = () => [...(props.bodies?.() || []), ...lives.bodies(), ...(dressing?.bodies?.() || []), rides?.body?.()].filter(Boolean);
  rides = createRides({ world, scene: group, nav: hud.nav, props, reduced, toast: hud.toast, getBodies: () => [...(props.bodies?.() || []), ...(dressing?.bodies?.() || [])],
    onState: (st) => { if (st.ride === false && st.exitAt) pendingExit = st.exitAt; } });
  const civic = buildCivic(world, group, { rides });
  // every place you can go and do something, for the map's icons and "find the nearest" (world bible 11.3)
  props.pois = [
    ...(dressing?.pois || []),
    ...doors.map((d) => ({ kind: 'work', name: PLACES[d.key].name, x: d.at.x, z: d.at.z })),
    ...(rides?.stops || []).map((s) => ({ kind: 'bus', name: s.kind === 'danfo' ? 'Danfo stop' : 'Keke park', x: s.x, z: s.z })),
    ...props.interact.filter((i) => i.id === 'board').map((i) => ({ kind: 'board', name: 'Community board', x: i.x, z: i.z })),
    ...(props.area ? [{ kind: 'build', name: 'Community build area', x: props.area.x, z: props.area.z }] : []),
  ];

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
  const kitLampAmber = [...new Set((world.kit?.get('yaba_street_lamp')?.meshes || []).map((m) => m.material).filter((m) => m.emissive && m.emissive.getHex()))];
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
    rig.hemi.intensity = (0.6 - 0.15 * nightAmt + 1.9 * day) * (1 - 0.1 * cur.cloud) * (1 - 0.25 * cur.storm);
    rig.rim.color.copy(PAL.fill.night).lerp(PAL.fill.day, day);
    rig.rim.intensity = 0.35 * (1 - day) + 0.8 * day;

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
    renderer.toneMappingExposure = 1.05 + 0.1 * day;
    if (bloom) { bloom.strength = 0.45 - 0.3 * day; bloom.threshold = 0.85 + 0.75 * day; }

    // sky
    const u = sky?.userData.u;
    if (u) {
      u.uSunDir.value.copy(sunDir);
      u.uNight.value = deep; u.uDay.value = day; u.uGold.value = gold;
      u.uCloud.value = cur.cloud; u.uStorm.value = cur.storm; u.uFog.value = Math.max(cur.fog, cur.rain * 0.4);
      u.uFogCol.value.copy(scene.fog ? scene.fog.color : tmpA);
    }

    sky2?.userData.update?.(dt, day, Math.max(lamps, 1 - day));
    // street
    shared.uLamps.value = lamps;
    shared.uDay.value = day; // daylight fades lamp pools and the monument sweep
    shared.uWind.value = Math.max(0.3, Math.min(2.6, 0.3 + cur.wind / 5));
    weather.uRain.value = cur.rain * (reduced ? 0.4 : 1);
    weather.uWet.value = cur.wet;
    fill.intensity = 6 * (1 - day);
    if (rig.bulbMat) rig.bulbMat.color.setRGB(...rig.bulb).multiplyScalar(0.06 + 0.94 * lamps);
    props.materials.warm.color.setRGB(2.0, 1.15, 0.45).multiplyScalar(0.12 + 0.88 * lamps);
    // the kit lamp's authored amber stays the same material; only how brightly it glows follows dusk and dawn
    kitLampAmber.forEach((m) => { m.emissiveIntensity = 0.12 + 0.88 * lamps; });
    if (props.billboardFace) props.billboardFace.emissiveIntensity = 0.05 + 0.22 * lamps; // the digital board glows after dusk
    if (rainMesh) {
      const to = ((cur.windDir + 180) * Math.PI) / 180, slant = Math.min(cur.wind, 15) * 0.025;
      rainMesh.userData.wind.value.set(Math.sin(to) * slant, -Math.cos(to) * slant);
    }
    const lt = weatherFeed ? weatherFeed.localTime().split(':').map(Number) : [12, 0];
    live = { elevation: e, day, lamps, hour: lt[0] + lt[1] / 60, ...cur };
  }

  // Lightning: rare, two flashes at most per strike, never more than three a second.
  let nextStrike = 18 + Math.random() * 20, flashT = -1;
  // a soft cool fill from the camera side, so characters never go black against the light
  const fill = new THREE.PointLight(0xa9bbff, night ? 6 : 0, 11, 1.5);
  group.add(fill);
  const flashLight = new THREE.DirectionalLight(0xa8b8ff, 0);
  flashLight.position.set(-200, 300, 100);
  group.add(flashLight);

  const life = off.has('life') ? null : createLife({ world, scene: group, camera, getEnv: () => live, reduced, lowQuality: quality === 'low', uTime: shared.uTime });
  props.pond = life?.birds?.pond || null; // for the map's park zone
  // the park around the pond, the waterfall, benches where people sit, the build area, a roundabout (parks.js)
  const parks = buildParks({ world, scene: group, pond: props.pond, area: { group: props.areaGroup, item: props.area }, uTime: shared.uTime, reduced,
    addLamps: (l) => { props.lamps.push(...l); lights?.setLamps([...world.lamps, ...props.lamps, ...(world.porchLamps || [])]); } });
  if (parks.park) props.pois?.push({ kind: 'park', name: parks.park.name, x: parks.park.x, z: parks.park.z });
  // places to play: skate park, water park, community garden, picnic lawn (parks.js)
  const rec = buildRecreation({ world, scene: group, uTime: shared.uTime, reduced, taken: [...placeUsed, ...(parks.park ? [{ x: parks.park.x, z: parks.park.z, W: parks.park.rx * 2 + 10, D: parks.park.rz * 2 + 10 }] : [])] });
  props.pois?.push(...rec.pois);
  // benches you can sit on: in the park, at the bus shelters
  seats = [...parks.benches, ...civic.added.filter((a) => a.seat).map((a) => a.seat)];
  seats.forEach((st, i) => props.interact.push({ id: `seat:${i}`, label: 'Sit on the bench', x: st.x + Math.sin(st.yaw) * 0.5, z: st.z + Math.cos(st.yaw) * 0.5, r: 1.3 }));
  // litter, the Recycling Point and street bins players fund together (litter.js)
  litter = createLitter({ world, scene: group, props, toast: hud.toast, used: rec.used, reduced, district: (world.place?.name || 'yaba').toLowerCase(),
    getName: () => (walletEngine().handle ? `@${walletEngine().handle}` : 'A builder') });
  props.pois?.filter((q) => q.kind === 'build').forEach((q) => { q.x = props.area.x; q.z = props.area.z; }); // the build area moved into the park

  function update(dt, t, player, yaw, arrival) {
    if (night && !interiors?.active) environment(dt);
    interiors?.update(dt, t);
    life?.update(dt, t, player);
    dressing?.update(dt, t, player);
    porch?.update(dt, player);
    lights?.update(dt, player, arrival);
    fill.position.set(camera.position.x * 0.6 + player.x * 0.4, 3.2, camera.position.z * 0.6 + player.z * 0.4);
    if (rainMesh) rainMesh.userData.cam.value.copy(camera.position);
    props.update(dt, t, player);
    if (!interiors?.active) { lives.update(dt, t, player); chat.update(dt, player); rec.update(t); litter?.update(dt); building?.update(dt); }
    profiler?.update(dt);
    if (!interiors?.active) food?.update(dt, player);
    pets?.update(dt, player, yaw ?? 0);
    if (petIt && pets?.pet) { petIt.x = pets.pos.x; petIt.z = pets.pos.z; petIt.r = interiors?.active ? 0 : 1.4; petIt.label = `Pet ${pets.pet.name}`; }
    // estate gates: no pass, no entry (gates.js)
    if (!pendingMove) { const push = gates?.update(dt, player, !!interiors?.active || !!benchSeat); if (push) pendingMove = { mode: 'push', ...push }; }
    syncSeat();
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
    if (reflection && !interiors?.active && weather.uWet.value > 0.03) reflection.render(renderer, scene, camera);
    else weather.uHasReflect.value = 0;
  }

  function setSize(w, h) { reflection?.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio()); }

  // the player's ride: a pose while seated, an exit point once, or null
  function ride(dt, t, keys, player) {
    if (pendingExit) { const p = pendingExit; pendingExit = null; return { exit: p }; }
    const r = rides?.update(dt, t, keys, player);
    if (r?.exit) return r;
    return r;
  }

  // a teleport for the player (into or out of a place, sitting, standing), taken once
  // getting up, from a bench or a desk: at a desk the laptop closes and goes in your bag first
  let leaving = false;
  function standUp() {
    if (benchSeat) {
      const st = benchSeat; benchSeat = null;
      pendingMove = { mode: 'stand', x: st.x + Math.sin(st.yaw) * 0.85, z: st.z + Math.cos(st.yaw) * 0.85 };
      return;
    }
    if (interiors?.seated && !leaving) { leaving = true; interiors.packUp().then(() => { leaving = false; pendingMove = { mode: 'stand' }; }); }
  }
  // ---------- the seat bar: everything you can do while sitting, as buttons with their keys ----------
  const seatCss = document.createElement('style');
  seatCss.textContent = `#lk-seatbar { position: fixed; left: 50%; bottom: 112px; transform: translateX(-50%); z-index: 16; display: none; gap: 8px; flex-wrap: wrap; justify-content: center; max-width: calc(100vw - 32px); }
    #lk-seatbar.on { display: flex; }
    #lk-seatbar button { flex: 0 0 auto; width: auto; margin: 0; display: flex; align-items: center; gap: 8px; padding: 7px 14px 7px 7px; border: 0; border-radius: 999px; background: #f7efdc; color: #3b2a20; font: 700 14px/1 "Baloo 2", system-ui, sans-serif; box-shadow: 0 3px 0 rgba(59,42,32,.22); cursor: pointer; }
    #lk-seatbar button.go { background: #2a9d94; color: #fff; }
    #lk-seatbar b { display: grid; place-items: center; min-width: 26px; height: 26px; padding: 0 6px; border-radius: 999px; background: #3b2a20; color: #f7efdc; font: 800 12px/1 system-ui; }
    #lk-seatbar button.go b { background: #fff; color: #2a9d94; }
    body.nohud #lk-seatbar, body.bw-cine #lk-seatbar { display: none; }`;
  document.head.appendChild(seatCss);
  const seatBar = document.createElement('div'); seatBar.id = 'lk-seatbar'; document.body.appendChild(seatBar);
  let seatState = '';
  const SEAT_ACTS = {
    use: () => hud.interact(),
    close: () => interiors?.closeLaptop(),
    leave: () => standUp(),
  };
  function seatAction(name) { if (!(benchSeat || interiors?.seated) || !SEAT_ACTS[name]) return false; SEAT_ACTS[name](); return true; }
  function syncSeat() {
    const st = leaving ? '' : benchSeat ? 'bench' : interiors?.seated ? (interiors.computerOpen ? '' : interiors.lidOpen ? 'open' : 'closed') : '';
    if (st === seatState) return;
    seatState = st;
    const btn = (k, label, act, go) => `<button data-act="${act}"${go ? ' class="go"' : ''}><b>${k}</b>${label}</button>`;
    seatBar.innerHTML = st === 'bench' ? btn('E', 'Stand up', 'leave', true)
      : st === 'closed' ? btn('E', 'Open laptop', 'use', true) + btn('Esc', 'Pack up and leave', 'leave')
      : st === 'open' ? btn('E', 'Use computer', 'use', true) + btn('F', 'Close laptop', 'close') + btn('Esc', 'Pack up and leave', 'leave') : '';
    seatBar.classList.toggle('on', !!st);
  }
  seatBar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { e.stopPropagation(); seatAction(b.dataset.act); } });
  function takeMove() { const m = pendingMove; pendingMove = null; return m; }

  function dispose() {
    if (interiors?.active) setInside(null);
    interiors?.dispose();
    rides?.dispose();
    life?.dispose();
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

  return { update, renderReflection, setSize, dispose, hud, props, bodies, chat, civic, lives, get parks() { return parks; }, get rec() { return rec; }, get litter() { return litter; }, pockets: () => world.pocketReport?.(), seats: () => seats, standUp, seatAction, get benchSeated() { return !!benchSeat; }, get passes() { return passes; }, get gates() { return gates; }, get profiler() { return profiler; }, get pets() { return pets; }, setOnline: (o) => { onlineRef = o; gates?.setOnline(o); }, get canWalkOff() { return !!benchSeat || (!!interiors?.seated && !interiors.computerOpen); }, skyline: sky2, get life() { return life; }, quality, viewYaw: props.viewYaw, get env() { return live; }, dressing, ride, rides: () => rides, takeMove, collider: () => (interiors?.active ? interiors : null), get inside() { return !!interiors?.active; }, get seated() { return !!interiors?.seated; }, stats: () => ({ lights: lights?.lights.length ?? 0, rain: tier.rain, reflect: !!reflection }) };
}

