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
import { buildParks, buildRecreation, findSite } from './parks.js';
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
import { createTraffic } from './traffic.js';
import { buildFlyover } from './flyover.js';
import { buildRoadSigns } from './roadsigns.js';
import { buildCycling } from './cycling.js';
import { buildGreenrey } from './greenrey.js';
import { createStreetLife } from './streetlife.js';
import { createMobility } from './mobility.js';
import { buildShopfronts } from './shopfronts.js';
import { buildShopSigns } from './shopsigns.js';
import { buildFoodTrucks } from './foodtruck.js';
import { cullPeople, PEOPLE } from './anim.js';
import { createEmotes } from './expressions.js';
import { createEmotePanel } from './emotepanel.js';
import { createSpotify, trackUrl } from './spotify.js';
import { buildLandmarks } from './landmarks.js';
import { createSports } from './sports/index.js';
import { TIERS, trackDetail, cullDetail } from './quality.js';
import { watchPlayer, holdOutFood } from './fear.js';
import { regionOf, areaOf, areaName, areaUrl, areaFare, kmBetween, bearing, cityLabel } from './areas.js';
import { buildEdgeSigns } from './edge.js';
import { createDock } from './dock.js';
import { createRailway } from './railway.js';
import { createShop } from './shop.js';
import { createDigitalBoard } from './digital.js';
import { ITEMS } from './menus.js';
import { setStreamTier, updateStream, streamStats, streamSmall, cullSmall, smallStats, setStreaming, setHorizon, streaming } from './stream.js';
import { walletEngine } from './wallet.js';
import { sfx } from './audio.js';
import { createInteriors, PLACES, namePlaces } from './interior.js';
import { openLicenceDesk, licenceDeskOpen, closeLicenceDesk, licenceOf } from './licence.js';
import { papers, openPassportDesk, openEtaDesk, openTravelBoard, dialogOpen as travelDialogOpen, closeDialog as closeTravelDialog } from './travel.js';
import { AIRPORTS } from './travelrules.js';
import { createProfile, createPortraits } from './profile.js';
import { createCritters } from './critters.js';
import { openCheckIn, flyPanel, openAirportTaxi, airDialogOpen, TRIP_KEY, SHUTTLE, createAnnouncer } from './airport.js';
import { CITIES } from './cities.js';
import { sunPosition, sunDirection } from './sun.js';
import { shared } from '../shaders.js';
import { setCity, cityInfo } from './cityinfo.js';
import { BUILDERS } from '../builders.js';
import { createOfficials } from './officials.js';
import { createCompass } from './compass.js';

// sun shadows cover the ground round the player; they fade out towards the edge of that area, so there
// is never a line on the street where shadows stop
THREE.ShaderChunk.shadowmap_pars_fragment = THREE.ShaderChunk.shadowmap_pars_fragment.replace(
  'return mix( 1.0, shadow, shadowIntensity );',
  'vec2 bwEdge = abs( shadowCoord.xy * 2.0 - 1.0 );\n\t\treturn mix( 1.0, shadow, shadowIntensity * ( 1.0 - smoothstep( 0.6, 0.97, max( bwEdge.x, bwEdge.y ) ) ) );'
);

export { blueHourSky } from './atmosphere.js';
export { createWeather } from './weather.js';

const C = (hex) => new THREE.Color(hex);
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const PAL = {
  // the clay look from the arrival scene (world bible 7.1): high soft sky light, warm sun, sage air
  hemiSky: { night: C(0x34446e), blue: C(0x6f80b4), day: C(0xd4ebff) },
  hemiGround: { night: C(0x1c1914), blue: C(0x3a3426), day: C(0x817151) },
  fog: { night: C(0x1a2340), blue: C(0x4a5878), day: C(0xc4dcec), gold: C(0xe6c49a), storm: C(0x6a7470) },
  sun: { gold: C(0xffb87a), day: C(0xffe0ac), moon: C(0x9fb2ff) },
  fill: { day: C(0xb8d9df), night: C(0x3a6aa0) },
};

export function createLook({ renderer, scene, camera, world, reduced, quality, sky, bloom, weatherFeed, avatar }) {
  // the graphics tier (quality.js); Low still drops the mirror, most rain and most lights
  let gfx = TIERS[quality] || TIERS.high;
  const tier = gfx;
  const env = world.env;
  const night = !!env.wet;
  weather.uWet.value = env.wet ? 1 : 0;
  weather.uRain.value = env.rain ? (reduced ? 0.4 : 1) : 0;
  weather.uHasReflect.value = 0;

  const group = new THREE.Group();
  scene.add(group);
  const off = new Set((new URLSearchParams(location.search).get('no') || '').split(','));

  setCity(world.place?.city || 'Lagos', world.place?.name || 'Yaba'); // what makes this city itself (cityinfo.js)
  const compass = createCompass({ camera }); // which way you face, across the top (compass.js)
  // the demo builders say where they are: the city you are in, not always Lagos
  if (world.place?.city && world.place.city !== 'Lagos') BUILDERS.forEach((b) => { if (b.tagline) b.tagline = b.tagline.replace(/^Lagos\./, `${world.place.city}.`); });
  namePlaces(world.place?.name, world.place?.city);
  const props = buildProps(world, group, { lowQuality: quality === 'low', reduced });
  const dock = createDock(); // the bottom-left HUD as one column (dock.js)
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
  // the gadget shop's counter (shop.js); declared here so the interact handler can reach it
  const shop = createShop({ items: ITEMS, toast: (t, ms) => hud?.toast(t, ms) });
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

  let officials = null, rideBlock = null, homeAct = null, lastNearT = 0, nearNow = { park: false, people: false }, lastPos = null;
  let railway = null;
  let shopfronts = null;
  let greenrey = null, spotify = null, sports = null, mobility = null, slife = null, traffic = null, food = null, pets = null, petIt = null, wardrobe = null, profiler = null, onlineRef = null, building = null, gates = null, visiting = null, passes = null, rides = null, pendingExit = null, interiors = null, pendingMove = null, doorOut = null, litter = null, seats = [], benchSeat = null;
  // the tech places you can walk into (world bible 6.6)
  const doors = [];
  if (props.hubAt) doors.push({ key: 'hub', at: props.hubAt });
  // the loft and the studio get buildings of their own, with their names on the front (places.js);
  // the hub's building gets the same big sign
  if (props.hubGroup) hubSign(props.hubGroup);
  // the estates: gate signs, house numbers, cars in the driveways (estatesigns.js)
  const estateSigns = buildEstateSigns({ world, scene: group });
  const placeUsed = [];
  const fronts = buildPlaceFronts({ world, scene: group, keys: ['loft', 'studio', 'gym', 'immigration', 'licensing'], used: placeUsed,
    addLamps: (l) => props.lamps.push(...l) });
  doors.push(...fronts.doors);
  // Yaba's landmarks, each on the side it really lies (landmarks.js)
  const landmarks = buildLandmarks({ world, scene: group, props, used: placeUsed });
  // where the roads leave the area: Leaving / Welcome to signs (edge.js)
  try { buildEdgeSigns({ world, scene: group, area: areaName(areaOf(world.place?.city || 'Lagos', world.place?.name)) || world.place?.name || 'Yaba', city: cityLabel(world.place?.city || 'Lagos') }); } catch (err) { console.warn('edge signs skipped', err); }
  // the bank's banking hall, and Kofo Cafe, open their doors too (venues.js)
  if (dressing?.bankDoor) doors.push({ key: 'bank', at: dressing.bankDoor });
  const cafeFront = props.interact.find((i) => i.name === PLACES.cafe.name);
  if (cafeFront) { cafeFront.id = 'enter:cafe'; cafeFront.label = `Enter ${PLACES.cafe.name}`; delete cafeFront.line; }
  doors.forEach((d) => props.interact.push({ id: `enter:${d.key}`, label: MEMBERS_ONLY[d.key] ? `${PLACES[d.key].name}: members only` : `Enter ${PLACES[d.key].name}`, x: d.at.x, z: d.at.z, r: 3.5 }));
  // inside a place: say plainly that you walk with W A S D (Elvis, 10 October 2026: "it makes it hard for people to
  // understand if they can move"); the hint stays until you have walked a few steps
  const moveHint = document.createElement('div'); moveHint.id = 'lk-movehint';
  moveHint.innerHTML = '<span class="keys"><b>W</b><b>A</b><b>S</b><b>D</b></span><span><strong>Walk around</strong><small>or the arrow keys · E to use things · Esc to stand up</small></span>';
  const mhCss = document.createElement('style');
  mhCss.textContent = `#lk-movehint { position: fixed; left: 50%; top: 96px; transform: translate(-50%, -8px); z-index: 17; display: flex; align-items: center; gap: 12px; padding: 10px 16px 10px 12px; border-radius: 18px; background: #f7efdc; color: #3b2a20; font-family: "Baloo 2", system-ui, sans-serif; box-shadow: 0 4px 0 rgba(59,42,32,.18), 0 12px 28px rgba(10,14,30,.22); opacity: 0; pointer-events: none; transition: opacity .25s ease, transform .25s ease; }
    #lk-movehint.on { opacity: 1; transform: translate(-50%, 0); }
    #lk-movehint .keys { display: grid; grid-template-columns: repeat(3, 26px); grid-template-rows: 26px 26px; gap: 3px; }
    #lk-movehint .keys b { display: grid; place-items: center; border-radius: 7px; background: #3b2a20; color: #f7efdc; font: 800 13px/1 system-ui; }
    #lk-movehint .keys b:nth-child(1) { grid-column: 2; grid-row: 1; } #lk-movehint .keys b:nth-child(2) { grid-column: 1; grid-row: 2; } #lk-movehint .keys b:nth-child(3) { grid-column: 2; grid-row: 2; } #lk-movehint .keys b:nth-child(4) { grid-column: 3; grid-row: 2; }
    #lk-movehint strong { display: block; font: 800 17px/1.1 "Baloo 2", system-ui, sans-serif; }
    #lk-movehint small { display: block; font: 600 13px/1.3 "Baloo 2", system-ui, sans-serif; color: #6b5a48; }
    body.nohud #lk-movehint { display: none; }`;
  document.head.appendChild(mhCss); document.body.appendChild(moveHint);
  let hintFrom = null;
  function setInside(name) {
    moveHint.classList.toggle('on', !!name); hintFrom = name ? null : undefined;
    if (name) chat.clear?.();
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
      if (active?.id?.startsWith('shop:')) shopfronts?.greet(active); // the attendant at the window waves you over
      if (active && shop?.open(active)) return true; // the street's gadget shop: its counter (shop.js)
      if (homeAct) { actKey('e'); return true; }
      if (active?.id && (active.id.startsWith('sport:') || active.id.startsWith('chess:'))) return !!sports?.use(active.id);
      if (active?.id?.startsWith('life:')) return lives.talk(active.id);
      // people's homes: knock; go in only when they have asked you in (lives.js)
      if (active && food?.handles(active) && !active.id?.startsWith('enter:')) return food.open(active);
      if (active?.id?.startsWith('dock:')) return mobility.use(active.id, player);
      if (mobility?.mode === 'bike' && !interiors?.active) { mobility.unmount(); return true; } // E hops off the bike
      if (active?.id?.startsWith('hawk:')) return slife.buy(active.id);
      if (active?.id === 'pet') return pets.act('pet');
      if (active?.id?.startsWith('gate:')) return gates.open(active.id);
      if (active?.id?.startsWith('pknock:')) return gates.knockPlayer(active.id.slice(7));
      if (active?.id === 'myhome') {
        const host = gates.enterHome(); if (!host) return false;
        doorOut = { x: host.door.x, z: host.door.z, yaw: host.door.ry ?? 0 };
        interiors.enter('home', host).then((p) => { setInside('Your home'); pendingMove = { ...p, mode: 'inside' }; passes.arrive('myhome'); });
        return true;
      }
      // the parks (parkland.js): plaques to read, ice cream, the board game, the chess tables (a route to the Chess Corner)
      if (active?.id?.startsWith('park:')) {
        if (active.chess) {
          const cc = props.pois?.find((q) => q.kind === 'chess' || /chess corner/i.test(q.name || ''));
          if (cc) { hud.setRoute?.({ x: cc.x, z: cc.z }, cc.name); hud.toast(`The garden tables are for friendly games; the Chess Corner has the regulars and real clocks. Route set: ${Math.round(Math.hypot(cc.x - player.x, cc.z - player.z))} m.`, 3600); }
          else hud.toast('The garden tables are for friendly games. Two regulars set up here on Sunday afternoons.', 3200);
          return true;
        }
        if (active.cost && !walletEngine().spend(active.cost, active.label)) { hud.toast(`That is ${active.cost} Efforts.`, 2200); return true; } if (active.cost) dispatchEvent(new CustomEvent('bw:me', { detail: { ate: 0.12, played: 0.05 } })); if (/plaque/.test(active.id)) dispatchEvent(new CustomEvent('bw:me', { detail: { skill: 'creativity', n: 1 } }));
        sfx('interact'); hud.toast(active.say, 5200); return true;
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
        if (r?.act) { startAct(r.act); return true; }
        return !!r;
      }
      if (active?.id?.startsWith('enter:')) {
        const key = active.id.slice(6), door = { x: active.x, z: active.z, yaw: Math.atan2(active.x - player.x, active.z - player.z) + Math.PI };
        const go = () => {
          doorOut = door;
          interiors.enter(key).then((p) => {
            setInside(PLACES[key].name); pendingMove = { ...p, mode: 'inside' };
            const L = passes.arrive(key), own = passes.NETS[key];
            if (L || own || key === 'studio') setTimeout(() => hud.toast(L ? `Your laptop joined ${L.ssid}.` : `Your laptop is offline in here. ${key === 'studio' ? 'The members\' Wi-Fi is on your card' : `Wi-Fi ${own?.ssid}: the password is on the notice board`}.`, 4000), 4800);
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
    isExtraOpen: () => airDialogOpen() || travelDialogOpen() || licenceDeskOpen() || rides?.isMenuOpen() || interiors?.computerOpen || !!benchSeat || !!passes?.registering || !!gates?.isOpen || !!wardrobe?.isOpen || !!pets?.isOpen || !!food?.isOpen || !!sports?.isOpen,
    closeExtra: () => {
      rides?.closeMenu();
      if (licenceDeskOpen()) { closeLicenceDesk(); return; }
      if (passes?.registering) { passes.closeRegister(); return; }
      if (sports?.isOpen) { sports.close(); return; }
      if (gates?.isOpen) { gates.close(); return; }
      if (wardrobe?.isOpen) { wardrobe.cancel(); return; }
      if (pets?.isOpen) { pets.close(); return; }
      if (food?.isOpen) { food.close(); return; }
      if (interiors?.computerOpen) interiors.closeComputer();
      else if (interiors?.seated || benchSeat || homeAct) standUp();
    },
    getPrompt: (player) => (benchSeat || interiors?.seated || homeAct ? null : interiors?.active ? interiors.prompt(player.x, player.z) : undefined), // seated: the seat bar takes over
    world, props, camera, reduced, weatherFeed: night ? weatherFeed : null,
    onEquip: (id, on) => { gear?.set(id, on); mobility?.equip(id, on); },
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
  // Spotify now-playing: a chip on your screen and a line others see (spotify.js); creator mode hides it
  const npCss = document.createElement('style');
  npCss.textContent = `#lk-np { position: fixed; left: 14px; bottom: 192px; z-index: 15; display: none; align-items: center; gap: 8px; max-width: min(320px, calc(100vw - 28px)); padding: 6px 12px 6px 8px; border-radius: 999px; background: #121212; color: #fff; font: 700 12.5px/1.2 "Baloo 2", system-ui, sans-serif; text-decoration: none; box-shadow: 0 3px 0 rgba(0,0,0,.25); }
    #lk-np.on { display: flex; } #lk-np i { width: 18px; height: 18px; border-radius: 50%; background: #1ed760; flex: none; } #lk-np span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; } #lk-np small { opacity: .7; font-weight: 600; }
    body.bw-creator #lk-np, body.nohud #lk-np, body.bw-cine #lk-np { display: none !important; }`;
  document.head.appendChild(npCss);
  const npChip = document.createElement('a'); npChip.id = 'lk-np'; npChip.target = '_blank'; npChip.rel = 'noopener'; document.body.appendChild(npChip);
  spotify = createSpotify({ onChange: (np) => {
    npChip.classList.toggle('on', !!np);
    if (np) { npChip.innerHTML = `<i></i><span>${np.t.replace(/[<>&]/g, '')} <small>· ${np.a.replace(/[<>&]/g, '')}</small></span>`; const u = trackUrl(np); if (u) npChip.href = u; else npChip.removeAttribute('href'); }
  } });
  addEventListener('bw:spotify', () => { if (spotify.connected) { spotify.disconnect(); hud.toast('Spotify disconnected.', 1800); } else spotify.connect().then((ok) => { if (!ok) hud.toast('Spotify sign-in is not set up yet: it needs a Spotify app ID.', 3600); }); });
  const flyover = buildFlyover({ world, scene: group });
  traffic = createTraffic({ world, scene: group, flyover, reduced, lowQuality: quality === 'low', getPeople: () => [...lives.residents.filter((r) => r.obj.visible).map((r) => r.obj.position), ...(slife?.walkers || []).map((w) => w.obj.position)] });
  // the railway, where the city has one (railway.js): track, level crossings, the station, trains
  try { railway = createRailway({ world, scene: group, traffic, props, toast: hud.toast, cityName: world.place?.name }); } catch (err) { console.warn('railway skipped', err); }
  // the roadside billboard as a digital screen (digital.js)
  let digital = null; try { digital = createDigitalBoard({ face: props.billboardFace, world, getEnv: () => live, landmarks, railway }); } catch (err) { console.warn('digital board skipped', err); }
  // direction boards, speed limits, school and pedestrian zones that slow the cars (roadsigns.js)
  try { buildRoadSigns({ world, scene: group, traffic, landmarks }); } catch (err) { console.warn('road signs skipped', err); }
  // cycle lanes on the highways: their signs, and no cycling on the pavements beside them (cycling.js)
  let cycling = null;
  try { cycling = buildCycling({ world, scene: group }); } catch (err) { console.warn('cycling skipped', err); }
  // the shops' serving windows with their attendants (shopfronts.js), before the food counters take their places
  shopfronts = buildShopfronts({ world, scene: group, props, reduced, addLamps: (l) => props.lamps.push(...l) });
  food = createFood({ scene: group, props, world, toast: hud.toast, getEnv: () => live, reduced, addLamps: (l) => { props.lamps.push(...l); lights?.setLamps([...world.lamps, ...props.lamps, ...(world.porchLamps || [])]); } });
  pets = createPets({ scene: group, camera, world, toast: hud.toast, isIndoors: () => !!interiors?.active });
  // you, bottom left: a live portrait, your mood and needs, your skills; your dog beside you (profile.js)
  const petView = () => (pets?.pet ? { ...pets.pet, pos: pets.pos, visible: !interiors?.active, cheer: pets.cheer } : null);
  const meName = () => { try { const n = JSON.parse(localStorage.getItem('bw-arrivals-v1') || '{}').name; if (n) return n.split(' ')[0]; } catch { /* */ } return walletEngine().handle ? `@${walletEngine().handle}` : 'You'; };
  let critters = null;
  const profile = createProfile({ avatar, getName: meName, getPet: () => pets?.pet, getFriends: () => critters?.friends || [], onDog: () => dispatchEvent(new Event('bw:dog')), toast: hud.toast });
  const portraits = createPortraits(renderer);
  petIt = { id: 'pet', label: 'Pet', x: 0, z: 0, r: 0 }; props.interact.push(petIt);
  addEventListener('bw:shelter', () => { hud.close(); pets.openShelter(); });
  addEventListener('bw:wardrobe', () => { hud.close(); wardrobe.open(avatar?.userData.look || { topColor: avatar?.userData.dressFound?.shirt?.color ? `#${avatar.userData.dressFound.shirt.color.getHexString()}` : undefined }); });
  profiler = createProfiler({ camera, lives, props, getOnline: () => onlineRef, toast: hud.toast });
  gates = createGates({ world, scene: group, props, lives, passes, toast: hud.toast, getHour: () => live?.hour ?? 12,
    // another player said yes at their door: in you go, they are there to meet you
    enterPlayerHome: (host) => { doorOut = { x: host.door.x, z: host.door.z, yaw: host.door.ry ?? 0 }; interiors.enter('home', host).then((p) => { setInside(`${host.first}'s home`); pendingMove = { ...p, mode: 'inside' }; passes.arrive('home'); }); } });
  interiors = createInteriors({ city: world.place?.city || 'Lagos', country: AIRPORTS[world.place?.city || 'Lagos']?.country || 'Nigeria', scene, reduced, toast: hud.toast, getEnv: () => live || { day: 1 }, onPackUp: () => standUp(), net: passes, onOrder: (k) => food?.menu(k), onTeller: () => hud.openWallet({ atm: true }) });
  // everything that moves and can be bumped into: people, traffic, the waiting hired vehicle
  const bodies = () => [...(props.bodies?.() || []), ...(shopfronts?.bodies() || []), ...lives.bodies(), ...(mobility?.bodies() || []), ...(dressing?.bodies?.() || []), ...(traffic?.bodies() || []), ...(railway?.bodies() || []), ...(officials?.bodies?.() || []), ...(critters?.bodies?.() || []), rides?.body?.()].filter(Boolean);
  // driving needs a licence (licence.js): the hire panel asks, and points you to the licensing office
  const licenceDoor = () => doors.find((d) => d.key === 'licensing')?.at || null;
  rides = createRides({ world, scene: group, nav: hud.nav, props, reduced, toast: hud.toast,
    licence: { has: () => !!licenceOf(passes), office: () => PLACES.licensing.name, route: () => { const at = licenceDoor(); if (at) hud.setRoute(at, PLACES.licensing.name); return !!at; } }, getBodies: () => [...(props.bodies?.() || []), ...(dressing?.bodies?.() || [])],
    onState: (st) => { if (st.ride === false && st.exitAt) pendingExit = st.exitAt; } });
  const civic = buildCivic(world, group, { rides });
  // every place you can go and do something, for the map's icons and "find the nearest" (world bible 11.3)
  props.pois = [
    ...(dressing?.pois || []),
    ...doors.map((d) => ({ kind: 'work', name: PLACES[d.key].name, x: d.at.x, z: d.at.z })),
    ...(rides?.stops || []).map((s) => ({ kind: 'bus', name: s.kind === 'danfo' ? `${cityInfo().rides?.danfo?.name || 'Danfo'} stop` : 'Keke park', x: s.x, z: s.z })),
    ...props.interact.filter((i) => i.id === 'board').map((i) => ({ kind: 'board', name: 'Community board', x: i.x, z: i.z })),
    ...(props.area ? [{ kind: 'build', name: 'Community build area', x: props.area.x, z: props.area.z }] : []),
  ];

  // the phone's Wi-Fi outdoors (passes.js): public hotspots round the board, the bus stops, the motor park and the parks;
  // each workplace's own network a little way out of its door
  passes.setHotspots([
    ...props.interact.filter((i) => i.id === 'board').map((i) => ({ x: i.x, z: i.z, r: 48, name: 'the community board', kind: 'public' })),
    ...(rides?.stops || []).map((s) => ({ x: s.x, z: s.z, r: 34, name: s.kind === 'danfo' ? `the ${cityInfo().rides?.danfo?.name || 'danfo'} stop` : 'the keke park', kind: 'public' })),
    ...(props.pois || []).filter((q) => /Motor Park|Park|Garden/.test(q.name) && !/car park|parking/i.test(q.name)).map((q) => ({ x: q.x, z: q.z, r: 45, name: q.name, kind: 'public' })),
    ...doors.filter((d) => passes.NETS[d.key]).map((d) => ({ x: d.at.x, z: d.at.z, r: 22, name: PLACES[d.key].name, kind: 'place', net: passes.NETS[d.key] })),
  ]);
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
  let emotes = null, emotePanel = null, wasWet = false; // expressions.js
  const MIST = new THREE.Color();

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

    // morning mist (Elvis, 10 October 2026): it lies over the city before dawn, is thickest as the sun
    // comes up, and burns off as the sun climbs, gone by mid-morning; evenings stay clear
    const ltM = weatherFeed ? weatherFeed.localTime().split(':').map(Number) : [12, 0], hourL = ltM[0] + ltM[1] / 60;
    const mist = hourL < 12 && hourL > 2 ? smooth(-14, -4, e) * (1 - smooth(4, 34, e)) * 0.9 * (1 - 0.6 * cur.rain) : 0;
    const day = smooth(-4, 12, e);
    const deep = 1 - smooth(-16, -7, e);
    const gold = smooth(-6, 1, e) * (1 - smooth(4, 16, e)) * (1 - 0.7 * cur.cloud);
    const overcastDark = cur.storm * 0.7 + Math.max(0, cur.cloud - 0.85) * 1.5;
    const lamps = Math.max(1 - smooth(-2, 6, e), Math.min(1, overcastDark) * day * 0.8);

    // sun or moon
    const sunI = day * 3.2 * (1 - 0.68 * cur.cloud) * (1 - 0.45 * Math.max(cur.fog, mist)) * (1 - 0.5 * cur.storm);
    const moonI = (1 - day) * 0.3 * (1 - 0.5 * cur.cloud);
    const rig = world.rig;
    if (sunI >= moonI) {
      rig.moon.position.copy(sunDir).multiplyScalar(300).add(shadowFocus);
      rig.moon.color.copy(PAL.sun.gold).lerp(PAL.sun.day, smooth(2, 22, e));
      rig.moon.intensity = sunI;
    } else {
      rig.moon.position.copy(moonDir).multiplyScalar(300).add(shadowFocus);
      rig.moon.color.copy(PAL.sun.moon);
      rig.moon.intensity = moonI;
    }
    const blueToDay = day, nightAmt = deep * (1 - day);
    mix3(rig.hemi.color, PAL.hemiSky.blue, PAL.hemiSky.night, PAL.hemiSky.day, nightAmt, blueToDay);
    mix3(rig.hemi.groundColor, PAL.hemiGround.blue, PAL.hemiGround.night, PAL.hemiGround.day, nightAmt, blueToDay);
    rig.hemi.intensity = (0.6 - 0.15 * nightAmt + 1.9 * day) * (1 - 0.1 * cur.cloud) * (1 - 0.25 * cur.storm);
    rig.rim.color.copy(PAL.fill.night).lerp(PAL.fill.day, day);
    rig.rim.intensity = 0.35 * (1 - day) + 0.8 * day;
    // sun shadows fade in with a strong sun and out under cloud, storm and mist; the moon casts none
    if (rig.moon.castShadow) {
      const k = sunI >= moonI ? smooth(0.4, 1.6, sunI) : 0;
      rig.moon.shadow.intensity = 0.85 * k;
      // with shadows on, a little of the sky's fill goes to the sun so shade reads on pale paving too
      rig.moon.intensity *= 1 + 0.25 * k;
      rig.hemi.intensity *= 1 - 0.22 * k;
      // the shadow map is drawn 30 times a second on high and ultra, not every frame: half the cost, and
      // a shadow a frame behind its owner cannot be seen
      shadowTick = (shadowTick + 1) % (gfx.shadowHz ? 2 : 1);
      rig.moon.shadow.autoUpdate = false;
      if (k > 0.01 && shadowTick === 0) rig.moon.shadow.needsUpdate = true;
    }
    // the sky's light in shiny things (ultra): dim at night
    if (scene.environment) scene.environmentIntensity = gfx.env * (0.12 + 0.88 * day);

    // fog and haze
    if (scene.fog) {
      mix3(tmpA, PAL.fog.blue, PAL.fog.night, PAL.fog.day, nightAmt, day);
      tmpA.lerp(PAL.fog.gold, gold * 0.6).lerp(PAL.fog.storm, cur.storm * 0.6 * day);
      tmpA.lerp(MIST.copy(PAL.fog.day).lerp(PAL.fog.gold, 0.35).offsetHSL(0, -0.1, 0.06 * day), mist * 0.7); // mist: pale, warm where the sun is in it
      scene.fog.color.copy(tmpA);
      const thick = Math.max(cur.fog, cur.rain * 0.45, mist);
      scene.fog.near = R * (0.08 - 0.06 * thick);
      // from the aerial view you look through far more air, so let the haze thin out
      const high = smooth(25, 90, camera.position.y);
      scene.fog.far = R * (1.9 + 1.1 * day - 1.3 * thick) * (1 + 2.2 * high);
      scene.fog.near = scene.fog.near * (1 + 4 * high);
      // the horizon (quality.js): the haze is total there and nothing beyond it is drawn (stream.js). Where it
      // pulls the fog in, the haze also starts later, so the street up to halfway out is clearer than before
      const hz = gfx.horizon * (1 + 2.2 * high);
      if (streaming() && scene.fog.far > hz) { scene.fog.far = hz; scene.fog.near = Math.max(scene.fog.near, hz * 0.45); }
      // the mist sits close: at its thickest you see about 70 m, less in the aerial view's long sightlines
      scene.fog.far += (R * 0.32 * (1 + 1.6 * high) - scene.fog.far) * mist;
      scene.fog.near += (1.5 - scene.fog.near) * mist;
      setHorizon(streaming() ? scene.fog.far : 1e9);
    }
    renderer.toneMappingExposure = 1.05 + 0.1 * day;
    if (bloom) {
      bloom.strength = 0.45 - 0.3 * day; bloom.threshold = 0.85 + 0.75 * day;
      // by day the glow is too faint to see: skip the pass and save its cost
      if (bloom.allowed !== undefined) bloom.enabled = bloom.allowed && bloom.strength > 0.18;
    }

    // sky
    const u = sky?.userData.u;
    if (u) {
      u.uSunDir.value.copy(sunDir);
      u.uNight.value = deep; u.uDay.value = day; u.uGold.value = gold;
      u.uCloud.value = cur.cloud; u.uStorm.value = cur.storm; u.uFog.value = Math.max(cur.fog, cur.rain * 0.4, mist * 0.8);
      u.uFogCol.value.copy(scene.fog ? scene.fog.color : tmpA);
    }

    sky2?.userData.update?.(dt, day, Math.max(lamps, 1 - day), mist, scene.fog?.color);
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
  if (parks?.roundabout) traffic?.addRoundabout?.(parks.roundabout); // cars go round the island, not through it
  if (parks.park) props.pois?.push({ kind: 'park', name: parks.park.name, x: parks.park.x, z: parks.park.z });
  // places to play: skate park, water park, community garden, picnic lawn (parks.js)
  // the motor park (or matatu stage, trotro station) is reserved before the places to play: transport first
  const recTaken = [...placeUsed, ...(parks.park ? [{ x: parks.park.x, z: parks.park.z, W: parks.park.rx * 2 + 10, D: parks.park.rz * 2 + 10 }] : [])];
  // (a compact one, three quarters the size, where a full one will not fit)
  const motorParkAt = (() => { const f = findSite(world, recTaken, 34, 24); if (f) return { ...f, S: 1 }; const c = findSite(world, recTaken, 26, 19); if (c) return { ...c, S: 0.75 }; const m = findSite(world, recTaken, 22, 16); return m ? { ...m, S: 0.62 } : null; })();
  const rec = buildRecreation({ world, scene: group, uTime: shared.uTime, reduced, taken: recTaken });
  props.pois?.push(...rec.pois);
  // benches you can sit on: in the park, at the bus shelters
  seats = [...parks.benches, ...civic.added.filter((a) => a.seat).map((a) => a.seat)];
  seats.forEach((st, i) => props.interact.push({ id: `seat:${i}`, label: 'Sit on the bench', x: st.x + Math.sin(st.yaw) * 0.5, z: st.z + Math.cos(st.yaw) * 0.5, r: 1.3 }));
  // litter, the Recycling Point and street bins players fund together (litter.js)
  litter = createLitter({ world, scene: group, props, toast: hud.toast, used: rec.used, reduced, district: (world.place?.name || 'yaba').toLowerCase(),
    getName: () => (walletEngine().handle ? `@${walletEngine().handle}` : 'A builder') });
  // the motor park, the police, the hawkers, today's events (streetlife.js): after the parks and litter take their land
  mobility = createMobility({ world, scene: group, props, avatar, toast: hud.toast, used: rec.used, reduced, park: parks.park });
  // food trucks by the parks and the hub, now that they are placed (foodtruck.js); food.js runs their hatches
  try { const ft = buildFoodTrucks({ world, scene: group, props, used: rec.used, addLamps: (l) => { props.lamps.push(...l); lights?.setLamps([...world.lamps, ...props.lamps, ...(world.porchLamps || [])]); } }); ft.trucks.forEach((t) => food?.add(t.it)); } catch (err) { console.warn('food trucks skipped', err); }
  try { JSON.parse(localStorage.getItem('bw-bag-equipped') || '[]').forEach((id) => mobility.equip(id, true)); } catch { /* */ }
  slife = createStreetLife({ world, scene: group, props, traffic, chat, toast: hud.toast, getEnv: () => live, used: rec.used, reduced, parkAt: motorParkAt });
  // traffic officials in the city's own uniform: a marshal at the motor park, a patrol that clears jams (officials.js)
  try { officials = createOfficials({ world, scene: group, traffic, park: slife?.park, chat, toast: hud.toast, getPlayer: () => lastPlayer }); } catch (err) { console.warn('officials skipped', err); }
  // expressions (expressions.js): everyone emotes on their own clock, never in step with their neighbours,
  // and reacts to what happens around them; any module can raise an event with bw:react
  const meAt = new THREE.Vector3();
  emotes = createEmotes({ people: () => PEOPLE, getPlayer: () => avatar?.getWorldPosition(meAt), getEnv: () => ({ hour: live?.hour ?? 12, rain: live?.rain ?? 0 }), isPlayer: (r) => !!r.userData.isPlayer });
  addEventListener('bw:react', (e) => { const d = e.detail || {}; emotes.event(d.kind, d.x ?? meAt.x, d.z ?? meAt.z, d.r ?? 16, { max: d.max ?? 8, chance: d.chance ?? 0.85 }); });
  emotePanel = createEmotePanel({ onPick: (id) => chat.emote(id, avatar?.getWorldPosition(meAt) || meAt) });
  addEventListener('bw:emotes', () => emotePanel.toggle()); // G (main.js)
  // the Sports Centre, the Aquatic and Indoor Arena and the Chess Corner (sports/), on land still free
  if (!off.has('sports')) sports = createSports({ world, scene: group, props, used: rec.used, toast: hud.toast, avatar, getOnline: () => onlineRef, getMyName: () => (walletEngine().handle ? `@${walletEngine().handle}` : 'You') });
  props.pois?.filter((q) => q.kind === 'build').forEach((q) => { q.x = props.area.x; q.z = props.area.z; }); // the build area moved into the park
  // Greenrey: large open land becomes laterite, yards, car parks and building plots; grass stays in the gaps (greenrey.js)
  if (!off.has('greenrey')) { try { greenrey = buildGreenrey({ renderer, scene, world, group, park: parks.park }); } catch (err) { console.warn('Greenrey skipped', err); } }
  // signs that say what each place does, and the way to the car park (shopsigns.js), once the car parks are down
  try { buildShopSigns({ world, scene: group, props, doors, places: PLACES }); } catch (err) { console.warn('shop signs skipped', err); }
  // the parks greenrey laid out on the open green land (parkland.js): benches to sit on, the parks on the map, things to do
  // the neighbourhood's own animals, by the estates and the parks; your pet makes friends with them (critters.js)
  try { critters = createCritters({ scene: group, world, getPet: petView, toast: hud.toast, spots: (greenrey?.parks?.pois || []).map((q) => ({ x: q.x, z: q.z })) }); } catch (err) { console.warn('critters skipped', err); }
  if (greenrey?.parks) {
    const P = greenrey.parks, base = seats.length;
    P.seats.forEach((st, i) => { seats.push(st); props.interact.push({ id: `seat:${base + i}`, label: 'Sit on the bench', x: st.x + Math.sin(st.yaw) * 0.5, z: st.z + Math.cos(st.yaw) * 0.5, r: 1.3 }); });
    props.pois?.push(...P.pois);
    props.interact.push(...P.interact);
  }

  // ---------- graphics tier: sun shadows, lamps, distances, texture sharpness, sky reflections ----------
  const shadowFocus = new THREE.Vector3();
  let shadowTick = 0;
  const sunRig = world.rig.moon;
  group.add(sunRig.target);
  let envTex = null, sweepT = 0;
  // what casts and catches a shadow: solid lit things. Flat decals, glass, glowing and see-through
  // things neither cast nor catch; the ground and roads only catch
  const FLAT = /Plane|Circle|Ring/;
  function markShadows() {
    const on = gfx.shadows > 0;
    scene.traverse((o) => {
      if (!o.isMesh || o.userData.noShadow) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      const lit = m && (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial) && !m.transparent;
      o.receiveShadow = on && !!lit;
      const flat = FLAT.test(o.geometry?.type || '') || o === world.ground;
      if (!flat && o.geometry && !o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry?.boundingBox;
      o.castShadow = on && !!lit && !flat && !!bb && bb.max.y - bb.min.y > 0.08;
    });
  }
  function sharpen() {
    const a = Math.min(gfx.aniso, renderer.capabilities.getMaxAnisotropy());
    scene.traverse((o) => {
      if (!o.material) return;
      [].concat(o.material).forEach((m) => m?.isMaterial && ['map', 'emissiveMap', 'roughnessMap', 'normalMap'].forEach((k) => { const tx = m[k]; if (tx && !tx.isRenderTargetTexture && tx.anisotropy !== a) { tx.anisotropy = a; tx.needsUpdate = true; } }));
    });
  }
  // a soft sky for reflections: blue overhead, warm at the horizon, earth below
  function skyEnvironment() {
    const pm = new THREE.PMREMGenerator(renderer);
    const sc = new THREE.Scene();
    const geo = new THREE.SphereGeometry(10, 32, 16), col = [];
    const top = new THREE.Color(0x6aa8e8), hor = new THREE.Color(0xf2e2c4), bot = new THREE.Color(0x7c8a5c), c = new THREE.Color();
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 10; if (y >= 0) c.copy(hor).lerp(top, Math.pow(y, 0.6)); else c.copy(hor).lerp(bot, Math.min(1, -y * 3)); col.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    sc.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const rt = pm.fromScene(sc, 0.04);
    pm.dispose(); geo.dispose();
    return rt.texture;
  }
  function setGraphics(t) {
    setStreamTier(t);
    gfx = t;
    // sun shadows round the player
    sunRig.castShadow = t.shadows > 0;
    if (t.shadows) {
      const sh = sunRig.shadow;
      if (sh.mapSize.x !== t.shadows) { sh.mapSize.set(t.shadows, t.shadows); sh.map?.dispose(); sh.map = null; }
      const c = sh.camera, r = t.shadowR;
      // a tight depth range and small biases keep shadows attached to feet and walls, even with the sun low
      c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.near = 200; c.far = 420; c.updateProjectionMatrix();
      sh.bias = -0.00012; sh.normalBias = 0.022; sh.radius = t.soft ? 3 : 1.5;
    }
    markShadows();
    sharpen();
    // night lamps
    if (lights && lights.lights.length !== t.lights && !off.has('lights')) {
      lights.dispose(); lights = new LampLights(group, t.lights);
      lights.setLamps([...world.lamps, ...props.lamps, ...(world.porchLamps || [])]);
    }
    // the sky in shiny things
    if (t.env && !envTex) envTex = skyEnvironment();
    scene.environment = t.env ? envTex : null;
  }
  setGraphics(gfx);
  if (new URLSearchParams(location.search).get('stream') === '0') setStreaming(false);

  let cullT = 0, smallT = 1;
  // the groups whose pieces stay put (or move as whole pieces) and are safe to size-cull
  const SMALL_GROUPS = new Set(['district-dressing', 'place-fronts', 'landmarks', 'parks', 'recreation', 'food', 'sports', 'greenrey', 'litter', 'mobility', 'civic']);
  let lastPlayer = null;
  function update(dt, t, player, yaw, arrival) {
    lastPlayer = player;
    emotes?.update(dt);
    // the rain starting is news to everyone out in it
    const wet = (live?.rain ?? 0) > 0.25; if (wet && !wasWet) emotes?.event('rain', player.x, player.z, 35, { max: 8, chance: 0.7 }); wasWet = wet;
    // the shadow camera follows you, snapped to its own texels so edges do not crawl as you walk
    if (gfx.shadows) {
      const d = sunRig.position.clone().sub(shadowFocus).normalize();
      const right = new THREE.Vector3().crossVectors(THREE.Object3D.DEFAULT_UP, d).normalize(), up = new THREE.Vector3().crossVectors(d, right);
      const texel = (2 * gfx.shadowR) / gfx.shadows;
      const a = player.x * right.x + player.z * right.z, b = player.x * up.x + player.z * up.z;
      const p = new THREE.Vector3(player.x, 0, player.z);
      p.addScaledVector(right, Math.round(a / texel) * texel - a).addScaledVector(up, Math.round(b / texel) * texel - b);
      sunRig.position.sub(shadowFocus).add(p);
      shadowFocus.copy(p);
      sunRig.target.position.copy(shadowFocus);
      // new people, cars and props join the shadows every few seconds
      sweepT -= dt;
      if (sweepT <= 0) { sweepT = 4; markShadows(); }
    }
    // trees, shrubs and flowers stream in round you (stream.js); people far from the camera are not drawn or
    // animated; hidden rooms and the hidden street skip their matrix updates
    if (!interiors?.active) updateStream(camera);
    // small static things (benches, signs, stalls, docks) join the size cull as they are built, then leave the
    // render while they would be only a few pixels
    smallT -= dt;
    if (smallT <= 0) { smallT = 4; for (const c of group.children) if (SMALL_GROUPS.has(c.name) || c === props.root) streamSmall(c, { isPerson: (o) => PEOPLE.has(o) }); }
    cullT -= dt;
    if (cullT <= 0) {
      cullT = 0.2;
      if (!interiors?.active) { cullPeople(camera, gfx.people); cullDetail(camera, gfx.detail); cullSmall(camera); }
      scene.children.forEach((c) => { c.matrixWorldAutoUpdate = c.visible; });
      group.children.forEach((c) => { c.matrixWorldAutoUpdate = c.visible; });
    }
    if (night && !interiors?.active) environment(dt);
    interiors?.update(dt, t);
    { const R = airRoom(); if (R) R.follow?.(player.x, player.z); else if (announcer) { announcer.stop(); } announcer?.update(dt); const ph = rides?.airportPhase; if (!ph) tripOff(); else if (ph === 'riding') airTrip.querySelector('.s').textContent = 'On the way · V changes the camera'; }
    gear?.setRain?.((live?.rain ?? 0) > 0.15); // the umbrella opens in the rain (gear.js)
    watchPlayer(dt, player); // how the animals see you: speed, stillness, food in hand (fear.js)
    life?.update(dt, t, player);
    dressing?.update(dt, t, player);
    porch?.update(dt, player);
    lights?.update(dt, player, arrival);
    fill.position.set(camera.position.x * 0.6 + player.x * 0.4, 3.2, camera.position.z * 0.6 + player.z * 0.4);
    if (rainMesh) rainMesh.userData.cam.value.copy(camera.position);
    props.update(dt, t, player);
    if (!interiors?.active) { lives.update(dt, t, player); chat.update(dt, player); rec.update(t); litter?.update(dt, player); building?.update(dt); }
    profiler?.update(dt);
    if (moveHint.classList.contains('on') && lastPlayer) { if (hintFrom === null) hintFrom = { x: lastPlayer.x, z: lastPlayer.z, t: 0 }; else if (hintFrom) { hintFrom.t += dt; if (Math.hypot(lastPlayer.x - hintFrom.x, lastPlayer.z - hintFrom.z) > 4 || hintFrom.t > 20) moveHint.classList.remove('on'); } }
    compass?.update();
    if (homeAct) { homeAct.t += dt; if (homeAct.dur && homeAct.t >= homeAct.dur) endAct(true); if (!interiors?.active) homeAct = null; }
    if (!interiors?.active) { food?.update(dt, player); shopfronts?.update(dt, player); if (traffic?.addBlocker) { rideBlock ||= traffic.addBlocker({ r: 1.4 }); const rv = rides?.vehicle; rideBlock.on = !!(rv && world.onCarriageway?.(rv.x, rv.z, 0.6)); if (rv) { rideBlock.x = rv.x; rideBlock.z = rv.z; rideBlock.r = rv.r; } }
      traffic?.update(dt, player); railway?.update(dt, player); digital?.update(dt); slife?.update(dt, player); officials?.update(dt); mobility?.update(dt, t); sports?.update(dt); }
    pets?.update(dt, player, yaw ?? 0);
    if (!interiors?.active) critters?.update(dt, player);
    // what you are doing feeds your needs and skills (profile.js)
    { const near = (lastNearT -= dt) <= 0 ? ((lastNearT = 1), { park: (props.pois || []).some((q) => q.kind === 'park' && Math.hypot(q.x - player.x, q.z - player.z) < 26), people: (chat.people || []).some((q) => q.obj && Math.hypot(q.obj.position.x - player.x, q.obj.position.z - player.z) < 6) }) : null;
      if (near) nearNow = near;
      const sp = lastPos ? Math.hypot(player.x - lastPos.x, player.z - lastPos.z) / Math.max(dt, 1e-3) : 0; lastPos = { x: player.x, z: player.z };
      profile.update(dt, { player, running: sp > 4.5, inside: !!interiors?.active, riding: !!rides?.vehicle && sp > 1, computer: !!interiors?.computerOpen, seated: !!benchSeat || !!interiors?.seated, resting: !!homeAct && ['lie', 'sofa', 'tv', 'feet'].includes(homeAct.pose), sport: !!sports?.playing, studio: interiors?.room?.key === 'studio' || interiors?.room?.key === 'loft', park: !interiors?.active && nearNow.park, people: !interiors?.active && nearNow.people }); }
    if (petIt && pets?.pet) { petIt.x = pets.pos.x; petIt.z = pets.pos.z; petIt.r = interiors?.active || pets.driven ? 0 : 1.4; petIt.label = `Pet ${pets.pet.name}`; }
    // estate gates: no pass, no entry (gates.js)
    if (!pendingMove && !pets?.driven) { const push = gates?.update(dt, player, !!interiors?.active || !!benchSeat); if (push) pendingMove = { mode: 'push', ...push }; }
    syncSeat();
    hud.update(dt, t, player, yaw);
    // lightning only when there is a thunderstorm where the weather comes from
    if (night && !reduced && cur.storm > 0.5) {
      nextStrike -= dt;
      if (nextStrike <= 0) { flashT = 0; nextStrike = 25 + Math.random() * 35; emotes?.event('storm', player.x, player.z, 30, { max: 6 }); }
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

  // the two live portraits, drawn after the main picture (main.js calls this once a frame)
  function renderPortraits(dt) {
    const rects = profile.rects(); if (!rects.length) return;
    const eye = new THREE.Vector3(), at = new THREE.Vector3(), q = new THREE.Quaternion(), f = new THREE.Vector3();
    if (avatar?.parent) {
      avatar.getWorldPosition(at); avatar.getWorldQuaternion(q); f.set(0, 0, 1).applyQuaternion(q); f.y = 0; f.normalize();
      at.y += 1.55; eye.copy(at).addScaledVector(f, 0.95).add(new THREE.Vector3(-f.z * 0.18, 0.04, f.x * 0.18)); at.y -= 0.04;
      // the far-away cull (anim.js) hides a person's parts when the main camera is high up: show them for the portrait
      portraits.shoot('me', scene, eye, at, dt, [avatar.parent, avatar, ...avatar.children], pets?.model ? [pets.model] : []);
    }
    const pm = pets?.model;
    if (pm && rects.some(([id]) => id === 'dog')) {
      const k = pm.userData.k || 1; f.set(Math.sin(pm.rotation.y), 0, Math.cos(pm.rotation.y));
      at.set(pm.position.x, 0, pm.position.z).addScaledVector(f, 0.24 * k); at.y = 0.36 * k; eye.copy(at).addScaledVector(f, 0.65 * k + 0.2).add(new THREE.Vector3(-f.z * 0.12, 0.06 * k, f.x * 0.12));
      portraits.shoot('dog', scene, eye, at, dt, [pm, ...pm.children], avatar?.parent ? [avatar.parent] : []);
    }
    portraits.blit(rects);
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

  // Jump (map, Online now): straight to another player, a couple of metres away on open ground
  // ---------- papers: the Immigration Centre's desks (travel.js) ----------
  {
    const here = world.place?.city || 'Lagos', myName = () => { try { return JSON.parse(localStorage.getItem('bw-arrivals-v1') || '{}').name || ''; } catch { return ''; } };
    // the licensing office (licence.js): counter 1 does the whole thing; the booths and the chart explain themselves
    let lticket = 10 + Math.floor(Math.random() * 20);
    addEventListener('bw:licence', (e) => {
      const what = e.detail;
      if (what === 'licence') openLicenceDesk({ passes, place: PLACES.licensing.name, toast: hud.toast, myName });
      else if (what === 'theory') hud.toast('The theory test booths. Apply at counter 1 first; the test is five questions on this city\'s road rules.', 3400);
      else if (what === 'eyes') hud.toast('The eye chart. Counter 1 will ask you to read it from the mark on the floor.', 3000);
      else if (what === 'lqueue') { lticket += 1; hud.toast(`Your number is ${String(lticket).padStart(3, '0')}. Counter 1 for driver\'s licences.`, 3000); }
    });
    const desk = { passes, here, place: PLACES.immigration.name, toast: hud.toast, myName };
    let ticket = 40 + Math.floor(Math.random() * 30);
    addEventListener('bw:travel', (e) => {
      const what = e.detail;
      if (what === 'passport') openPassportDesk(desk);
      else if (what === 'eta') openEtaDesk(desk);
      else if (what === 'fly' || what === 'ask') openTravelBoard(desk);
      else if (what === 'ticket') { ticket += 1; hud.toast(`Your number is ${String(ticket).padStart(3, '0')}. Counter 1 for passports, counter 2 for travel authorisations.`, 3600); }
      else if (what === 'bio') hud.toast('The biometrics booth: your photo and fingerprints are taken at counter 1 when you apply.', 3400);
    });
  }
  // ---------- the airport (airport.js): the taxi there, then the real order of things ----------
  // Departures: entrance screening, check-in and the bag drop, then passport control and security in this airport's
  // order, then your gate and the cabin. Arrivals: immigration, your bag off the belt, customs, out to the taxis.
  const air = { screened: false, pass: null, carrying: false, bagDropped: false, secured: false, cleared: false, stamped: false, arrived: null, immigrated: false, bag: false, atGate: false };
  const cityHere = world.place?.city || 'Lagos';
  const airRoom = () => (interiors?.room?.key === 'airport' ? interiors.room : null);
  const stampPassport = (text) => { const P = papers(passes, cityHere); if (!P.passport) return false; passes.addCard({ ...P.passport, stamps: [...(P.passport.stamps || []), text] }); return true; };
  const day = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
  const myName2 = () => { try { return JSON.parse(localStorage.getItem('bw-arrivals-v1') || '{}').name || ''; } catch { return ''; } };
  let announcer = null;
  function enterAirport(arriving = null) {
    if (interiors?.active) return;
    doorOut = { x: world.spawn.x, z: world.spawn.z, yaw: 0 };
    interiors.enter('airport').then((p) => {
      const R = interiors.room;
      setInside(R.A.name);
      // a new visit: you come in off the street with your bag (a boarding pass you already paid for still counts),
      // or off a plane with your bag in the hold
      if (arriving) Object.assign(air, { arrived: { ...arriving, name: myName2() }, immigrated: false, bag: false, carrying: false, pass: null });
      else Object.assign(air, { arrived: null, screened: false, secured: false, cleared: false, stamped: false, carrying: !air.bagDropped });
      R.reset(air);
      announcer ||= createAnnouncer({ room: R, city: cityHere, getState: () => ({ ...air, name: myName2() }) });
      announcer.start();
      if (arriving) {
        const o = interiors.origin, a = R.arrive; pendingMove = { mode: 'inside', x: o.x + a.x, z: o.z + a.z + 1.2, yaw: Math.PI / 2 };
        hud.toast(arriving.intl ? `Welcome to ${cityHere}. Along the corridor to immigration, then baggage reclaim.` : `Welcome to ${cityHere}. Domestic arrivals: along the corridor, straight past immigration to baggage reclaim.`, 4200);
        setTimeout(() => airRoom() && announcer?.now(`Welcome to ${R.A.name}. Baggage from flight ${arriving.no} from ${arriving.from} will arrive on belt 2.`), 6000);
      } else {
        pendingMove = { ...p, mode: 'inside' };
        hud.toast(`${R.A.name}, departures. Every bag goes through the X-ray inside the doors; then check-in, ${R.order.map((q) => (q === 'security' ? 'security' : 'passport control')).join(', ')}, and your gate.`, 5200);
      }
    });
  }
  // the Travel app: ride there in a taxi, or skip straight to the kerb
  const airTrip = document.createElement('div'); airTrip.id = 'lk-airtrip';
  airTrip.innerHTML = `<style>#lk-airtrip { position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%); z-index: 32; display: none; align-items: center; gap: 12px; padding: 10px 10px 10px 18px; border-radius: 999px; background: #f7efdc; color: #3b2a20; font: 800 15px/1.2 "Baloo 2", system-ui, sans-serif; box-shadow: 0 4px 0 rgba(59,42,32,.22), 0 14px 30px rgba(10,14,30,.25); }
    #lk-airtrip.on { display: flex; } #lk-airtrip small { display: block; font: 600 12.5px/1.2 "Baloo 2", system-ui, sans-serif; color: #7a6552; }
    #lk-airtrip button { border: 0; border-radius: 999px; padding: 10px 16px; background: #2a9d94; color: #fff; font: 800 14px/1 "Baloo 2", system-ui, sans-serif; cursor: pointer; }
    body.nohud #lk-airtrip { display: none; }</style><div><span class="t"></span><small class="s"></small></div><button type="button">Skip trip</button>`;
  document.body.appendChild(airTrip);
  const tripOff = () => airTrip.classList.remove('on');
  airTrip.querySelector('button').onclick = () => { tripOff(); rides?.skipAirport(); };
  addEventListener('bw:fly', () => {
    if (interiors?.active) { hud.toast('Go outside first, then take a taxi to the airport.', 2400); return; }
    const A = AIRPORTS[cityHere];
    // the other areas of this city (areas.js), a taxi ride across town
    const P0 = world.place || {}, R = regionOf(cityHere), hereA = areaOf(cityHere, P0.name) || { lat: P0.lat, lon: P0.lon };
    const around = R ? { label: R.label, areas: R.areas.filter((a) => a.area !== P0.name).map((a) => { const km = kmBetween(hereA, a); return { ...a, name: areaName(a), km, fare: areaFare(km) }; }),
      onArea: (a, mode) => {
        if (!walletEngine().spend(a.fare, `Taxi to ${a.name}`)) { hud.toast(`The taxi to ${a.name} is ${a.fare} Efforts.`, 2400); return; }
        const go = () => { hud.toast(`${a.name}, ${R.label}.`, 2000); setTimeout(() => { location.search = areaUrl(cityHere, a); }, 600); };
        if (mode === 'skip' || !lastPlayer) { go(); return; }
        if (!rides?.airportRun({ x: lastPlayer.x, z: lastPlayer.z, bearing: bearing(hereA, a), name: a.name, onArrive: go })) { go(); return; }
        airTrip.querySelector('.t').textContent = `Taxi to ${a.name}`; airTrip.querySelector('.s').textContent = 'Wait at the kerb, then E to get in';
        airTrip.classList.add('on');
      } } : null;
    openAirportTaxi({ city: cityHere, around, onGo: (mode) => {
      if (!walletEngine().spend(SHUTTLE, `Taxi to ${A?.code}`)) { hud.toast(`The taxi is ${SHUTTLE} Efforts.`, 2400); return; }
      const arrive = (rode) => { tripOff(); hud.toast(rode === false ? 'The taxi drops you at departures.' : `${A.code} departures. The driver lifts your bag out of the boot.`, 2600); enterAirport(); };
      if (mode === 'skip' || !lastPlayer) { arrive(false); return; }
      // the airport's bearing from here, for which way the taxi heads out of the district
      const P = world.place || {}, r = Math.PI / 180;
      const bearing = Math.atan2(Math.sin((A.lon - (P.lon ?? A.lon)) * r) * Math.cos(A.lat * r), Math.cos((P.lat ?? A.lat) * r) * Math.sin(A.lat * r) - Math.sin((P.lat ?? A.lat) * r) * Math.cos(A.lat * r) * Math.cos((A.lon - (P.lon ?? A.lon)) * r));
      if (!rides?.airportRun({ x: lastPlayer.x, z: lastPlayer.z, bearing, name: A.name, onArrive: arrive })) { arrive(false); return; }
      airTrip.querySelector('.t').textContent = `Taxi to ${A.code}`; airTrip.querySelector('.s').textContent = 'Wait at the kerb, then E to get in';
      airTrip.classList.add('on');
    } });
  });
  addEventListener('bw:air', (e) => {
    const R = airRoom(); if (!R) return;
    const what = e.detail, me = myName2(), [first, second] = R.order;
    const stepName = (q) => (q === 'security' ? 'security' : air.pass?.intl === false ? 'the domestic lane' : 'passport control');
    const done = (q) => (q === 'security' ? air.secured : air.cleared);
    // entrance screening: bags through the X-ray and you through the arch, before anything else
    if (what === 'entry') {
      if (air.screened) { hud.toast('You are screened. Check-in is ahead: find your airline on the boards.', 2400); return; }
      sfx('interact');
      hud.toast(`${R.AG.avsec}: bag on the belt... through the X-ray... you through the arch. Clear. Welcome in.`, 3200);
      air.screened = true; R.open('entry'); return;
    }
    if (what === 'checkin') {
      if (air.pass) { hud.toast(`You are checked in: ${air.pass.no} to ${air.pass.to}, gate ${air.pass.gate}. Next: ${stepName(first)}.`, 3000); return; }
      const it = R.interact.find((q) => q.id === 'ap:checkin' && lastPlayer && Math.hypot(q.x + interiors.origin.x - lastPlayer.x, q.z + interiors.origin.z - lastPlayer.z) < q.r + 0.5);
      const island = it?.island ?? 0;
      openCheckIn({ room: R, passes, city: cityHere, name: me, toast: hud.toast, island,
        onPass: (bp) => { air.pass = bp; air.secured = false; air.cleared = false; air.stamped = false; air.bagDropped = false; R.setFlight(bp); },
        onBag: () => { air.bagDropped = true; air.carrying = false; R.dropBag(island); } });
      return;
    }
    if (what === 'assist') { hud.toast('Special assistance: wheelchairs, help for older travellers and families, and oversize bags (surfboards, guitars, a 3D printer for the hub).', 3800); return; }
    // the two checkpoints after check-in, in this airport's order
    if (what === 'passport' || what === 'security') {
      if (!air.pass) { hud.toast('Check in first: the airline islands are behind you.', 2600); return; }
      if (!air.bagDropped) { hud.toast('Drop your bag at the check-in counter first: it goes in the hold.', 2600); return; }
      if (what === second && !done(first)) { hud.toast(`${stepName(first)[0].toUpperCase()}${stepName(first).slice(1)} first.`, 2000); return; }
      if (what === 'security') {
        if (air.secured) { hud.toast('You are through security.', 1800); return; }
        sfx('beep'); if (lastPlayer) R.scanAt?.(lastPlayer.x);
        hud.toast('Laptop out, liquids in the clear bag, belt off, all in a tray... through the X-ray... walk through the arch... clear. Pack up on the far side.', 3800);
        air.secured = true; R.open('security'); return;
      }
      if (air.cleared) { hud.toast(air.pass.intl ? 'Your passport is stamped. On you go.' : 'Your boarding pass is checked. On you go.', 2000); return; }
      if (!air.pass.intl) { sfx('beep'); air.cleared = true; R.open('passport'); hud.toast(`Domestic: the agent scans your boarding pass for ${air.pass.no}. Through you go.`, 2600); return; }
      if (!stampPassport(`${air.pass.fromCode} OUT ${day()}`)) { hud.toast('You need a passport for this flight.', 2600); return; }
      sfx('arrive'); air.stamped = true; air.cleared = true; R.open('passport'); hud.toast(`${R.AG.imm}: stamped ${air.pass.fromCode} OUT ${day()}. Have a good trip.`, 3000); return;
    }
    if (what === 'gate') {
      const it = R.interact.find((q) => q.id === 'ap:gate' && lastPlayer && Math.hypot(q.x + interiors.origin.x - lastPlayer.x, q.z + interiors.origin.z - lastPlayer.z) < q.r + 0.5);
      if (!air.pass) { hud.toast('No boarding pass yet. Check in at the islands landside.', 2400); return; }
      const bp = air.pass;
      if (it && String(it.gate) !== String(bp.gate)) { hud.toast(`This is gate ${it.gate}. ${bp.no} to ${bp.to} boards at gate ${bp.gate}.`, 2600); return; }
      if (!air.secured || !air.cleared) { hud.toast('Finish security and passport control first.', 2400); return; }
      air.atGate = true;
      announcer?.now(`Ladies and gentlemen, ${bp.airline} flight ${bp.no} to ${bp.to} is now boarding at gate ${bp.gate}.`);
      hud.toast(`The gate agent scans your boarding pass and checks your ${bp.intl ? 'passport' : 'ID'}. Now boarding ${bp.no} to ${bp.to}. Seat ${bp.seat}.`, 3400);
      setTimeout(() => { // the boarding call plays out, then you walk down the jet bridge (the PA stops once you are aboard)
        if (!airRoom()) return;
        interiors.enter('cabin').then(() => {
          setInside(`${bp.no} to ${bp.to}`);
          const o = interiors.origin, s2 = interiors.room.seat; pendingMove = { mode: 'inside', x: o.x + 0.6, z: o.z + s2.z, yaw: 0 };
          setTimeout(() => dispatchEvent(new CustomEvent('bw:shot', { detail: { from: { x: o.x + 1.3, y: 1.25, z: o.z + s2.z + 0.1 }, at: { x: o.x + 0.2, y: 1.0, z: o.z + s2.z - 8 }, first: true } })), 500);
          flyPanel({ bp, onLanded: () => {
            try { localStorage.setItem(TRIP_KEY, JSON.stringify({ to: bp.to, from: bp.from, intl: bp.intl, toCode: bp.toCode, no: bp.no, at: Date.now() })); } catch { /* */ }
            air.pass = null; air.bagDropped = false;
            const c = CITIES.find((q) => q.city === bp.to);
            location.search = c?.live ? '?world=1' : `?world=1&name=${encodeURIComponent(c.district)}&city=${encodeURIComponent(c.city)}&lat=${c.lat}&lon=${c.lon}&r=${c.r}`;
          } });
        });
      }, 5200);
      return;
    }
    // arrivals
    if (what === 'arrivals') {
      if (!air.arrived) { hud.toast('This is the arrivals hall: immigration for people coming off the planes.', 2400); return; }
      if (air.immigrated) { hud.toast('You are through. Baggage reclaim is ahead.', 1800); return; }
      if (!air.arrived.intl) { air.immigrated = true; R.open('imm'); R.open('domArr'); hud.toast('Domestic arrivals: straight through to baggage reclaim.', 2200); return; }
      if (!stampPassport(`${air.arrived.toCode} IN ${day()}`)) { hud.toast('No passport? Wait here, an officer is coming.', 2800); return; }
      sfx('arrive'); air.immigrated = true; R.open('imm'); R.open('domArr'); hud.toast(`${R.AG.imm}: stamped ${air.arrived.toCode} IN ${day()}. ${R.AG.hello}.`, 3200); return;
    }
    if (what === 'bag') {
      if (!air.arrived) { hud.toast('Bags from the planes come round here.', 1800); return; }
      if (air.bag) { hud.toast('You have your bag. Customs is ahead: green if you have nothing to declare.', 2400); return; }
      sfx('pick'); air.bag = true; air.carrying = true; R.carry(true); R.open('customs'); hud.toast(`Belt 2, ${air.arrived.no} from ${air.arrived.from}: there it is, your teal case. Off the belt and onto its wheels.`, 3200); return;
    }
    if (what === 'customs' || what === 'declare') {
      if (!air.bag) { hud.toast('Collect your bag first: baggage reclaim, belt 2.', 2200); return; }
      hud.toast(what === 'customs' ? `${R.AG.customs}: nothing to declare. The officer waves you through.` : `${R.AG.customs}: you declare a laptop and a mechanical keyboard. Personal use: no duty. Through you go.`, 3000); air.leftArrivals = true; return;
    }
    if (what === 'sim') { hud.toast(`${R.AG.sims[0]} SIM, registered with your passport: data for the week. ${R.AG.sims.slice(1).join(' and ')} are at the next desk.`, 3200); return; }
    if (what === 'taxi') { hud.toast('The taxi desk: fixed fares into town. Or walk out and take one from the rank.', 2600); return; }
    if (what === 'board') { hud.toast(R.flights.map((f) => `${f.time} ${f.no} ${f.to} · ${f.island} · gate ${f.gate} · ${R.status(f).toLowerCase()}`).join('  ·  '), 6000); return; }
    if (what === 'cafe' || what === 'food') { if (walletEngine().spend(what === 'food' ? 900 : 300, what === 'food' ? 'Airport jollof' : 'Airport coffee')) { dispatchEvent(new CustomEvent('bw:me', { detail: { ate: what === 'food' ? 0.5 : 0.1 } })); hud.toast(what === 'food' ? 'Airport jollof and chicken: 900 Efforts, three times the street price.' : 'An airport flat white: 300 Efforts, twice the street price.', 2600); } return; }
    if (what === 'books') { hud.toast('Travel guides, Chimamanda, a thick book on distributed systems. You leave with nothing and a reading list.', 3000); return; }
    if (what === 'dutyfree') { hud.toast(`Perfume, chocolate, a ${cityHere} fridge magnet. You look, you do not buy.`, 2600); }
  });
  // an arrival: you landed here a moment ago (the page was loaded for this city), so you start in arrivals
  let arrivingNow = null;
  try { const trip = JSON.parse(localStorage.getItem(TRIP_KEY) || 'null'); if (trip && trip.to === cityHere && Date.now() - trip.at < 15 * 60000) { arrivingNow = trip; localStorage.removeItem(TRIP_KEY); } } catch { /* */ }
  if (arrivingNow) setTimeout(() => enterAirport(arrivingNow), 400);

  // ---------- where you start (world bible 6.6) ----------
  // Everyone has a home. New players start inside it; returning players come back to where they were
  // (or home, if that is where they left off). Saved every 5 s. Automated test runs keep the street start
  // unless ?start=home asks for it.
  {
    const qs = new URLSearchParams(location.search), LAST = 'bw-last', district = world.place?.name || 'Yaba';
    let last = null; try { last = JSON.parse(localStorage.getItem(LAST) || 'null'); } catch { /* */ }
    try { gates?.grantHome?.(); } catch (err) { console.warn('no home granted', err); }
    const goHome = () => { const host = gates?.enterHome?.(); if (!host || interiors?.active) return false; doorOut = { x: host.door.x, z: host.door.z, yaw: host.door.ry ?? 0 }; interiors.enter('home', host).then((p) => { setInside('Your home'); pendingMove = { ...p, mode: 'inside' }; passes.arrive('myhome'); }); return true; };
    const automated = navigator.webdriver && qs.get('start') !== 'home';
    if (!automated) {
      if (arrivingNow) { /* the airport takes you in */ } else if (qs.get('start') === 'home' || !last || (last.district === district && last.inside === 'myhome')) setTimeout(goHome, 300);
      else if (last.district === district && Number.isFinite(last.x)) { const q = world.nearestReachable?.(last.x, last.z) || last; pendingMove = { mode: 'stand', x: q.x, z: q.z }; }
    }
    let street = null;
    setInterval(() => {
      const p = lastPlayer; if (!p) return;
      if (!interiors?.active) street = { x: +p.x.toFixed(1), z: +p.z.toFixed(1) };
      const inside = interiors?.active ? interiors.room?.key || null : null;
      if (!street && !inside) return;
      try { localStorage.setItem(LAST, JSON.stringify({ district, ...(street || {}), inside, at: Date.now() })); } catch { /* */ }
    }, 5000);
  }
  addEventListener('bw:jumpto', (e) => { const d = e.detail || {}; if (interiors?.active) { hud.toast('Go outside first, then jump.', 2200); return; } const q = world.nearestReachable(d.x + 1.6, d.z + 1.6) || { x: d.x, z: d.z }; if (d.quick) { dispatchEvent(new CustomEvent('bw:swoopto', { detail: { x: q.x, z: q.z, name: d.name || 'your marker' } })); sfx('arrive'); return; } pendingMove = { mode: 'stand', x: q.x, z: q.z }; hud.toast(d.quick ? `Quick travel: you are at ${d.name || 'your marker'}.` : `You are with ${d.name || 'them'}.`, 2200); if (d.quick) sfx('arrive'); });
  // a teleport for the player (into or out of a place, sitting, standing), taken once
  // getting up, from a bench or a desk: at a desk the laptop closes and goes in your bag first
  let leaving = false;
  function standUp() {
    if (homeAct) { endAct(); return; }
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
    desk: () => (interiors?.deskOn ? interiors.signOut() : interiors?.useDesk()),
    leave: () => standUp(),
  };
  function seatAction(name) { if (homeAct) return actKey(name); if (!(benchSeat || interiors?.seated) || !SEAT_ACTS[name]) return false; SEAT_ACTS[name](); return true; }
  // ---------- doing things at home (rooms.js acts): sit on the sofa, lie down, cook, eat, shower... (Elvis, 10 October
  // 2026: "when I click on lie down, it doesn't physically show an animation of it lying down") ----------
  const ACT_WORDS = {
    cook: ['Cooking...', 'Stirring the pot. It smells like a party.'], eat: ['Eating', 'Jollof, plantain, a cold drink. Perfect.'], shower: ['Showering', 'Fresh. Ready to ship.'],
    wash: ['Washing your hands', 'Clean hands.'], reach: ['A cold drink', ['A cold Malt from the fridge.', 'Chilled zobo. Exactly what you needed.', 'Ice-cold water. Hydrate, then code.'] ], bench: ['Working', 'Done. That came out well.'], present: ['Recording', 'Cut! That take was the one.'],
  };
  const roomNow = () => interiors?.room;
  function startAct(a) {
    const R = roomNow(), pose = a.kind === 'sofa' ? (a.tv ? 'tv' : 'sofa') : a.kind;
    homeAct = { ...a, pose, t: 0 };
    pendingMove = { x: a.x, z: a.z, yaw: a.yaw, mode: 'pose', pose, seatY: a.seatY || null };
    if (a.tv) R?.set?.('tv', true);
    if (a.kind === 'cook') R?.set?.('cook', true);
    if (a.kind === 'shower') R?.set?.('shower', true);
    if (a.kind === 'eat') R?.set?.('plate', true);
    const w = ACT_WORDS[a.kind];
    hud.toast(a.kind === 'lie' ? 'You lie down. The ceiling fan of your mind slows. (Esc or move to get up.)' : a.kind === 'sofa' ? (a.tv ? 'TV on. Feet up with F.' : 'Comfy. Feet up with F, TV with E.') : w ? w[0] : a.label, 2600);
    seatState = ''; syncSeat();
  }
  function setPose(pose) { if (!homeAct) return; homeAct.pose = pose; pendingMove = { x: homeAct.x, z: homeAct.z, yaw: homeAct.yaw, mode: 'pose', pose, seatY: homeAct.seatY || null, keepCam: true }; seatState = ''; syncSeat(); }
  function endAct(done) {
    const a = homeAct; if (!a) return; homeAct = null;
    const R = roomNow();
    if (a.kind === 'sofa') R?.set?.('tv', false);
    if (a.kind === 'shower') R?.set?.('shower', false);
    if (a.kind === 'cook') { R?.set?.('cook', false); if (done) { R?.set?.('plate', true); hud.toast('Jollof is ready, on the table. Sit down and eat.', 3000); } }
    if (a.kind === 'eat' && done) { R?.set?.('plate', false); dispatchEvent(new CustomEvent('bw:me', { detail: { ate: 0.6 } })); }
    if (a.kind === 'shower' && done) dispatchEvent(new CustomEvent('bw:me', { detail: { rested: 0.1, played: 0.03 } }));
    if (done && ACT_WORDS[a.kind] && a.kind !== 'cook') { const l = ACT_WORDS[a.kind][1]; hud.toast(Array.isArray(l) ? l[Math.floor(Math.random() * l.length)] : l, 2600); }
    pendingMove = { mode: 'stand', x: a.back.x, z: a.back.z };
    seatState = ''; syncSeat();
  }
  function actKey(k) {
    const a = homeAct; if (!a) return false;
    if (k === 'close') k = 'f'; // (main.js sends F as the laptop's close key)
    if (k === 'leave' || k === 'escape') { endAct(); return true; }
    if (a.kind === 'sofa') {
      if (k === 'e' || k === 'tv') { const on = !roomNow()?.state?.tv; roomNow()?.set?.('tv', on); hud.toast(on ? 'TV on: Builders TV, Demo Day live.' : 'TV off.', 1800); seatState = ''; syncSeat(); return true; }
      if (k === 'f' || k === 'feet') { setPose(a.pose === 'feet' ? (roomNow()?.state?.tv ? 'tv' : 'sofa') : 'feet'); return true; }
      if ((k === 'r' || k === 'read') && roomNow()?.state?.book) { setPose(a.pose === 'read' ? 'sofa' : 'read'); return true; }
    }
    if (k === 'e') { endAct(); return true; }
    return false;
  }
  function syncSeat() {
    const st = leaving ? '' : homeAct ? `act:${homeAct.kind}:${homeAct.pose}:${roomNow()?.state?.tv ? 1 : 0}` : benchSeat ? 'bench' : interiors?.seated ? (interiors.computerOpen ? '' : interiors.deskOn ? 'desk' : interiors.lidOpen ? 'open' : 'closed') : '';
    const fee = interiors?.deskFee?.() || 0, deskLabel = !fee ? 'Desk computer' : interiors?.member ? 'Desk computer · free for members' : `Desk computer · ${fee} Efforts`;
    if (st === seatState) return;
    seatState = st;
    const btn = (k, label, act, go) => `<button data-act="${act}"${go ? ' class="go"' : ''}><b>${k}</b>${label}</button>`;
    if (st.startsWith('act:')) {
      const a = homeAct, tv = roomNow()?.state?.tv, book = roomNow()?.state?.book;
      seatBar.innerHTML = a.kind === 'sofa' ? btn('E', tv ? 'TV off' : 'Watch TV', 'tv', true) + btn('F', a.pose === 'feet' ? 'Feet down' : 'Put your feet up', 'feet') + (book ? btn('R', a.pose === 'read' ? 'Stop reading' : 'Read your book', 'read') : '') + btn('Esc', 'Stand up', 'leave')
        : a.dur ? btn('Esc', 'Stop', 'leave') : btn('E', a.kind === 'lie' ? 'Get up' : 'Stop', 'leave', true);
      seatBar.classList.add('on'); return;
    }
    seatBar.innerHTML = st === 'bench' ? btn('E', 'Stand up', 'leave', true)
      : st === 'closed' ? btn('E', 'Open laptop', 'use', true) + btn('O', deskLabel, 'desk') + btn('Esc', 'Pack up and leave', 'leave')
      : st === 'desk' ? btn('E', 'Use desk computer', 'use', true) + btn('O', 'Sign out', 'desk') + btn('Esc', 'Leave', 'leave')
      : st === 'open' ? btn('E', 'Use computer', 'use', true) + btn('F', 'Close laptop', 'close') + btn('Esc', 'Pack up and leave', 'leave') : '';
    seatBar.classList.toggle('on', !!st);
  }
  seatBar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { e.stopPropagation(); seatAction(b.dataset.act); } });
  function takeMove() { const m = pendingMove; pendingMove = null; return m; }

  function dispose() {
    compass.dispose();
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

  // F: hold out food for the animals near you: a biscuit if a dog is about, otherwise corn (fear.js)
  function feed() {
    if (interiors?.active || benchSeat) return false;
    const r = holdOutFood(critters?.nearDog?.(lastPlayer) ? 'treat' : 'corn');
    hud.toast(r.say, 2600); return true;
  }
  return { feed, get food() { return food; }, get greenrey() { return greenrey; }, update, renderReflection, setSize, setGraphics, sport: () => sports?.pose() || null, get sports() { return sports; }, get graphics() { return gfx; }, dispose, hud, props, bodies, chat, civic, lives, get parks() { return parks; }, get rec() { return rec; }, get litter() { return litter; }, pockets: () => world.pocketReport?.(), seats: () => seats, standUp, seatAction, get benchSeated() { return !!benchSeat; }, get passes() { return passes; }, get gates() { return gates; }, get profiler() { return profiler; }, get pets() { return pets; }, get cycling() { return cycling; }, get officials() { return officials; }, get spotify() { return spotify; }, get traffic() { return traffic; }, get landmarks() { return landmarks; }, get flyover() { return flyover; }, get streetLife() { return slife; }, get mobility() { return mobility; }, setOnline: (o) => { onlineRef = o; gates?.setOnline(o); }, get canWalkOff() { return !!benchSeat || !!homeAct || (!!interiors?.seated && !interiors.computerOpen); }, skyline: sky2, get life() { return life; }, quality, viewYaw: props.viewYaw, get env() { return live; }, dressing, ride, rides: () => rides, takeMove, collider: () => (interiors?.active ? interiors : null), get inside() { return !!interiors?.active; }, renderPortraits, get profile() { return profile; }, get critters() { return critters; }, get railway() { return railway; }, streamStats, smallStats, setStreaming, get tallRoom() { return (interiors?.room?.H || 0) > 12; }, get seated() { return !!interiors?.seated; }, stats: () => ({ lights: lights?.lights.length ?? 0, rain: tier.rain, reflect: !!reflection }) };
}

