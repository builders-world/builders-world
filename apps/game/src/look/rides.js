import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { danfo, propMaterials } from './props.js';
import { cloneAsset } from './kit.js';
import { nearestOn, pathLength, pointAlong } from './nav.js';
import { pushOutDynamic } from './physics.js';
import { walletEngine, effortsMark, fmt } from './wallet.js';

// fares in Efforts: a danfo is cheapest, a taxi to yourself dearest, the keys dearer still
const FARE = { danfo: 300, keke: 500, taxi: 1500 }, DRIVE_EXTRA = 500;
const fareOf = (c) => FARE[c.kind] + (c.mode === 'drive' ? DRIVE_EXTRA : 0);

// Hired rides (world bible 9.2): danfo at stops on main roads, keke on inner streets, ride-hail
// taxis from the phone. Free, because the PRD bans in-world money. Players choose to ride as a
// passenger along the satnav route, or to drive themselves. Nigeria drives on the right.
// Okada are not offered in Yaba: as far as we know, Lagos banned them in Lagos Mainland in 2022.

const MAIN = ['primary', 'secondary', 'tertiary', 'trunk'];
const INNER = ['residential', 'unclassified', 'living_street'];
const TYPES = {
  danfo: { name: 'Danfo', cruise: 11, wheelbase: 3.0, radius: 1.3, cam: 11, seatY: 1.3 },
  keke: { name: 'Keke', cruise: 8, wheelbase: 1.8, radius: 0.9, cam: 8, seatY: 0.9 },
  taxi: { name: 'Taxi', cruise: 12, wheelbase: 2.6, radius: 1.1, cam: 9, seatY: 0.9 },
};
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

function keke(M) {
  const g = new THREE.Group();
  const add = (geo, mat) => g.add(new THREE.Mesh(geo, mat));
  add(mergeGeometries([box(1.3, 0.7, 2.4, 0, 0.75, 0), box(1.25, 0.08, 2.3, 0, 1.95, -0.05)]), M.yellow);
  add(mergeGeometries([box(0.06, 0.9, 0.06, -0.6, 1.5, 1.0), box(0.06, 0.9, 0.06, 0.6, 1.5, 1.0), box(0.06, 0.9, 0.06, -0.6, 1.5, -1.1), box(0.06, 0.9, 0.06, 0.6, 1.5, -1.1)]), M.black);
  add(box(1.1, 0.5, 0.04, 0, 1.55, 1.12), M.glass);
  const wheels = [cyl(0.28, 0.2).translate(0, 0.28, 1.05), cyl(0.28, 0.2).translate(-0.62, 0.28, -0.85), cyl(0.28, 0.2).translate(0.62, 0.28, -0.85)];
  add(mergeGeometries(wheels), M.tyre);
  add(box(0.2, 0.12, 0.05, 0, 0.95, 1.22), M.head);
  return g;
}
function taxi(M) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.35, metalness: 0.3 });
  const add = (geo, mat) => g.add(new THREE.Mesh(geo, mat));
  add(mergeGeometries([box(1.8, 0.6, 4.4, 0, 0.6, 0), box(1.6, 0.5, 2.2, 0, 1.15, -0.2)]), paint);
  add(box(1.62, 0.42, 2.0, 0, 1.15, -0.2), M.glass);
  add(mergeGeometries([cyl(0.33, 0.24).translate(-0.85, 0.33, 1.35), cyl(0.33, 0.24).translate(0.85, 0.33, 1.35), cyl(0.33, 0.24).translate(-0.85, 0.33, -1.35), cyl(0.33, 0.24).translate(0.85, 0.33, -1.35)]), M.tyre);
  add(mergeGeometries([box(0.35, 0.14, 0.05, -0.6, 0.72, 2.21), box(0.35, 0.14, 0.05, 0.6, 0.72, 2.21)]), M.head);
  add(mergeGeometries([box(0.3, 0.14, 0.05, -0.65, 0.75, -2.21), box(0.3, 0.14, 0.05, 0.65, 0.75, -2.21)]), M.tail);
  return g;
}
function cyl(r, w) { return new THREE.CylinderGeometry(r, r, w, 12).rotateZ(Math.PI / 2); }

function stopSign(M, kind) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(box(0.08, 2.6, 0.08, 0, 1.3, 0), M.darkMetal));
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = kind === 'danfo' ? '#e9b21c' : '#2a9d94'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#15171c'; x.font = '900 46px "Arial Black", Impact, sans-serif'; x.textAlign = 'center';
  x.fillText(kind === 'danfo' ? 'DANFO' : 'KEKE', 128, 62);
  x.font = '700 24px Arial, sans-serif'; x.fillText(kind === 'danfo' ? 'BUS STOP' : 'PARK', 128, 102);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), face);
  plate.position.y = 2.45;
  const back = plate.clone(); back.rotation.y = Math.PI;
  g.add(plate, back);
  return g;
}

export function createRides({ world, scene, nav, props, reduced, toast, onState, getBodies }) {
  const M = propMaterials();
  const group = new THREE.Group();
  group.name = 'rides';
  scene.add(group);

  // ---------- stops along real streets ----------
  const stops = [];
  const used = [];
  world.roads.forEach((r) => {
    if (!r.fit) return;
    const kind = MAIN.includes(r.cls) ? 'danfo' : INNER.includes(r.cls) ? 'keke' : null;
    if (!kind) return;
    const { pts, nrm, half, paveL, paveR } = r.fit;
    const every = kind === 'danfo' ? 160 : 200;
    let acc = every / 2;
    for (let i = 1; i < pts.length - 1; i++) {
      acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc < every) continue;
      const side = paveR[i] >= 1.2 ? -1 : paveL[i] >= 1.2 ? 1 : 0; // right-hand kerb first: Nigeria drives on the right
      if (!side) continue;
      const pave = side < 0 ? paveR[i] : paveL[i];
      const off = half[i] + Math.min(0.9, pave * 0.5);
      const x = pts[i][0] + nrm[i][0] * off * side, z = pts[i][1] + nrm[i][1] * off * side;
      if (Math.hypot(x, z) > world.radius || used.some((u) => Math.hypot(u.x - x, u.z - z) < 60)) continue;
      acc = 0;
      used.push({ x, z });
      const sign = stopSign(M, kind);
      sign.position.set(x + nrm[i][0] * side * 0.4, 0, z + nrm[i][1] * side * 0.4);
      sign.rotation.y = Math.atan2(-nrm[i][0] * side, -nrm[i][1] * side);
      group.add(sign);
      // where the vehicle pulls in: the kerb lane beside the stop
      const lane = half[i] - 1.4;
      const stop = { id: `stop:${stops.length}`, kind, label: kind === 'danfo' ? 'Hire a ride: danfo' : 'Hire a ride: keke', x, z, r: 3.5,
        kerb: { x: pts[i][0] + nrm[i][0] * lane * side, z: pts[i][1] + nrm[i][1] * lane * side }, tan: [nrm[i][1] * side * -1, nrm[i][0] * side] };
      stops.push(stop);
      props.interact.push(stop);
    }
  });

  // ---------- the ride panel ----------
  const panel = document.createElement('div');
  panel.id = 'lkr';
  panel.innerHTML = `<style>
    #lkr { position: fixed; z-index: 31; right: 186px; top: 74px; width: min(380px, calc(100vw - 32px)); max-height: calc(100vh - 150px); overflow-y: auto; overscroll-behavior: contain; padding: 18px; border-radius: 20px; display: none;
      background: #f7efdc; color: #3b2a20; font: 600 14px/1.45 "Baloo 2", ui-rounded, system-ui, sans-serif; box-shadow: 0 5px 0 rgba(59,42,32,.2), 0 18px 40px rgba(10,14,30,.28); border-radius: 26px; }
    #lkr.on { display: block; }
    #lkr h3 { margin: 0 0 4px; font: 800 24px/1.1 "Baloo 2", ui-rounded, system-ui, sans-serif; }
    #lkr .sub { color: #7a6552; font-size: 13px; margin-bottom: 12px; }
    #lkr .lkr-lbl { font: 800 14px/1 "Baloo 2", ui-rounded, system-ui, sans-serif; color: #2a9d94; margin: 14px 0 7px; }
    #lkr .opts { display: grid; gap: 6px; }
    #lkr button { border: 0; border-radius: 16px; padding: 11px 14px; text-align: left; background: #efe2c4; color: #3b2a20; font: 700 14px/1.2 "Baloo 2", ui-rounded, system-ui, sans-serif; cursor: pointer; }
    #lkr button.sel { background: #fff; box-shadow: inset 0 0 0 3px #2a9d94; }
    #lkr button[disabled] { opacity: .45; cursor: default; }
    #lkr .row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    #lkr .go { margin-top: 16px; width: 100%; text-align: center; background: #f2b33d; color: #3b2a20; font-weight: 800; font-size: 16px; border-radius: 999px; box-shadow: 0 3px 0 #c98f1f; }
    @media (max-width: 700px) { #lkr { right: 16px; top: 70px; } }
  </style><div class="body"></div>`;
  document.body.appendChild(panel);
  const body = panel.querySelector('.body');

  let choice = null; // { kind, from, dest, mode }
  function openPanel(kind, from) {
    const places = (props.places || []).filter(Boolean);
    choice = { kind, from, dest: places[0] || null, mode: 'passenger' };
    render();
    panel.classList.add('on');
    onState?.({ menu: true });
  }
  function render() {
    const places = props.places || [];
    if (ride && (ride.phase === 'arriving' || ride.phase === 'waiting')) {
      body.innerHTML = `<h3>Your ${ride.T.name.toLowerCase()} is ${ride.phase === 'waiting' ? 'here' : 'on its way'}</h3><div class="sub">${ride.phase === 'waiting' ? 'Walk up to it and press E to get in.' : 'Wait at the kerb, it is coming to you.'}</div>
        <button class="go cancel">Cancel the ride · ${effortsMark(14)}${fmt(ride.fare || 0)} back</button><button class="x" style="margin-top:6px;width:100%;text-align:center">Close</button>`;
      body.querySelector('.cancel').onclick = () => { cancel(); closePanel(); };
      body.querySelector('.x').onclick = closePanel;
      return;
    }
    const kinds = choice.from.app ? ['taxi', 'danfo', 'keke'] : [choice.kind];
    body.innerHTML = `<h3>Hire a ride</h3><div class="sub">You have ${effortsMark(13)}${fmt(walletEngine().balance())}. ${choice.from.app ? 'A driver comes to you.' : TYPES[choice.kind].name + ' from this stop.'}</div>
      ${choice.from.app ? `<div class="lkr-lbl">Vehicle</div><div class="row">${kinds.map((k) => `<button data-k="${k}" class="${choice.kind === k ? 'sel' : ''}">${TYPES[k].name}<br><small>${effortsMark(11)}${fmt(FARE[k])}</small></button>`).join('')}${(world.place?.city ?? 'Lagos') === 'Lagos' ? '<button disabled>Okada: not allowed in Yaba</button>' : ''}</div>` : ''}
      <div class="lkr-lbl">Where to</div><div class="opts">${places.map((p, i) => `<button data-d="${i}" class="${choice.dest === p ? 'sel' : ''}">${p.name}</button>`).join('')}</div>
      <div class="lkr-lbl">How</div><div class="row"><button data-m="passenger" class="${choice.mode === 'passenger' ? 'sel' : ''}">Ride as passenger</button><button data-m="drive" class="${choice.mode === 'drive' ? 'sel' : ''}">Drive yourself</button></div>
      <button class="go">${choice.mode === 'drive' ? 'Get the keys' : 'Call the ride'} · ${effortsMark(14)}${fmt(fareOf(choice))}</button>
      <button class="x" style="margin-top:6px;width:100%;text-align:center">Cancel</button>`;
    body.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => { choice.kind = b.dataset.k; render(); }; });
    body.querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { choice.dest = places[+b.dataset.d]; render(); }; });
    body.querySelectorAll('[data-m]').forEach((b) => { b.onclick = () => { choice.mode = b.dataset.m; render(); }; });
    body.querySelector('.go').onclick = () => {
      const fare = fareOf(choice);
      if (!walletEngine().spend(fare, `${TYPES[choice.kind].name} ride`)) { toast(`Not enough Efforts for this ride. Push some commits and come back.`); return; }
      closePanel(); summon(choice, fare);
    };
    body.querySelector('.x').onclick = closePanel;
  }
  function closePanel() { panel.classList.remove('on'); onState?.({ menu: false }); }

  // ---------- the vehicle ----------
  let ride = null; // { kind, mesh, mode, phase, path, s, v, yaw, pos, dest }
  // the kit's danfo when it is loaded (front is +X, aligned to the ride's +Z), the code-built one otherwise
  const kitDanfo = world.kit?.get('yaba_danfo_minibus');
  const builders = { danfo: () => (kitDanfo ? cloneAsset(kitDanfo, -Math.PI / 2) : danfo(M)), keke: () => keke(M), taxi: () => taxi(M) };

  function laneOf(pts, side = 1.7) {
    // shift a centreline route into the right-hand lane
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const tx = b.x - a.x, tz = b.z - a.z, L = Math.hypot(tx, tz) || 1;
      return { x: p.x + (-tz / L) * side, z: p.z + (tx / L) * side };
    });
  }

  // the last ~45 m of the same street, driving toward the pickup in the lane on the pickup's side
  function approachFor(x, z) {
    let best = null;
    world.roads.forEach((r) => {
      if (!r.fit) return;
      r.fit.pts.forEach((p, i) => {
        const d = Math.hypot(p[0] - x, p[1] - z);
        if (!best || d < best.d) best = { r, i, d };
      });
    });
    if (!best) return null;
    const { pts, nrm } = best.r.fit;
    const side = (x - pts[best.i][0]) * nrm[best.i][0] + (z - pts[best.i][1]) * nrm[best.i][1] >= 0 ? 1 : -1;
    // right-hand traffic: the right of travel is -normal, so a stop on the -normal side is reached driving forward
    const step = side < 0 ? -1 : 1;
    const path = [];
    let L = 0, i = best.i;
    path.unshift({ x: pts[i][0], z: pts[i][1] });
    while (L < 45 && i + step >= 0 && i + step < pts.length) {
      const j = i + step;
      L += Math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]);
      path.unshift({ x: pts[j][0], z: pts[j][1] });
      i = j;
    }
    return path.length > 1 ? path : null;
  }

  function summon(c, fare = 0) {
    if (ride) remove(); // one ride at a time: a new call sends the old one away
    const T = TYPES[c.kind];
    const pickup = c.from.kerb || { x: c.from.x, z: c.from.z };
    const approach = approachFor(pickup.x, pickup.z) || [{ x: pickup.x + 30, z: pickup.z }, pickup];
    const mesh = builders[c.kind]();
    group.add(mesh);
    const lanePath = laneOf(approach, 1.9);
    if (c.from.kerb) lanePath.push({ x: c.from.kerb.x, z: c.from.kerb.z }); // pull in to the kerb at the stop
    ride = { kind: c.kind, T, mesh, mode: c.mode, phase: 'arriving', fare, path: lanePath, s: 0, v: 0, yaw: 0, steer: 0,
      pos: new THREE.Vector3(lanePath[0].x, 0, lanePath[0].z), dest: c.dest, pickup };
    const a = lanePath[0], b = lanePath[1];
    ride.yaw = Math.atan2(b.x - a.x, b.z - a.z);
    toast(c.mode === 'drive' ? `Your ${T.name.toLowerCase()} is on its way. You will drive.` : `Your ${T.name.toLowerCase()} is coming. Wait at the kerb.`);
    onState?.({ ride: true, phase: 'arriving' });
  }

  function board() {
    if (ride.mode === 'drive') {
      ride.phase = 'driving'; ride.v = 0;
      toast('W to drive, S to brake and reverse, A and D to steer. E to get out.', 5000);
    } else {
      const route = ride.dest ? nav.route({ x: ride.pos.x, z: ride.pos.z }, ride.dest.at) : null;
      if (!route) { toast('No road route to there. Try another place.'); alight(); return; }
      ride.path = laneOf(route); ride.s = 0; ride.phase = 'riding';
      toast(`On the way to ${ride.dest.name}. E to get off early.`);
    }
    onState?.({ ride: true, phase: ride.phase, seated: true });
  }

  function remove() {
    if (!ride) return;
    if (!ride.mesh.userData.shared) ride.mesh.traverse((o) => o.geometry?.dispose());
    ride.mesh.removeFromParent();
    ride = null;
  }
  // changed your mind before getting in: the driver goes, the fare comes back
  function cancel() {
    if (!ride || (ride.phase !== 'arriving' && ride.phase !== 'waiting')) return false;
    const fare = ride.fare || 0, name = ride.T.name.toLowerCase();
    remove();
    if (fare) walletEngine().earn?.(fare, `Cancelled ${name} ride, refunded`);
    onState?.({ ride: false, exitAt: null });
    toast(`Ride cancelled.${fare ? ` ${fmt(fare)} Efforts back in your wallet.` : ''}`, 2600);
    return true;
  }
  function alight(player) {
    if (!ride) return;
    // step out onto the pavement on the right, clear of buildings
    const out = { x: ride.pos.x + Math.cos(ride.yaw) * 2.2, z: ride.pos.z - Math.sin(ride.yaw) * 2.2 };
    const p = new THREE.Vector3(out.x, 0, out.z);
    world.resolve(p, 0.8);
    const wasMoving = ride.phase !== 'arriving';
    if (!ride.mesh.userData.shared) ride.mesh.traverse((o) => o.geometry?.dispose());
    ride.mesh.removeFromParent();
    ride = null;
    onState?.({ ride: false, exitAt: wasMoving ? p : null });
    return p;
  }

  // follow a polyline at speed, slowing for bends and at the end
  function follow(dt) {
    const L = pathLength(ride.path);
    const ahead = pointAlong(ride.path, Math.min(L, ride.s + 8));
    const here = pointAlong(ride.path, ride.s);
    let bend = Math.abs(Math.atan2(Math.sin(ahead.yaw - here.yaw), Math.cos(ahead.yaw - here.yaw)));
    const target = ride.stopping ? 0 : Math.min(ride.T.cruise * (1 - Math.min(0.7, bend)), Math.sqrt(Math.max(0, 2 * 4 * (L - ride.s))));
    ride.v += Math.max(-6 * dt, Math.min(2.5 * dt, target - ride.v));
    if (reduced) ride.v = Math.min(ride.v, ride.T.cruise * 0.6);
    ride.s = Math.min(L, ride.s + ride.v * dt);
    const p = pointAlong(ride.path, ride.s);
    ride.pos.set(p.x, 0, p.z);
    let dy = p.yaw - ride.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    ride.yaw += dy * (1 - Math.exp(-dt * 6));
    return (ride.stopping || L - ride.s < 0.4) && ride.v < 0.3;
  }

  // a simple bicycle model: throttle, brake, steering that tightens with speed
  function drive(dt, keys) {
    const up = keys.has('w') || keys.has('arrowup'), down = keys.has('s') || keys.has('arrowdown');
    const left = keys.has('a') || keys.has('arrowleft'), right = keys.has('d') || keys.has('arrowright');
    const maxF = 14, maxR = -4; // 50 km/h forward, walking pace in reverse
    if (up) ride.v += (ride.v < 0 ? 6 : 3) * dt;
    else if (down) ride.v -= (ride.v > 0 ? 6 : 2) * dt;
    else ride.v -= Math.sign(ride.v) * Math.min(Math.abs(ride.v), 1.2 * dt);
    ride.v = Math.max(maxR, Math.min(maxF, ride.v));
    const steerT = (left ? 1 : 0) - (right ? 1 : 0);
    ride.steer += (steerT * 0.55 - ride.steer) * (1 - Math.exp(-dt * 6));
    ride.yaw += (ride.v / ride.T.wheelbase) * Math.tan(ride.steer) * dt;
    const prev = ride.pos.clone();
    ride.pos.x += Math.sin(ride.yaw) * ride.v * dt;
    ride.pos.z += Math.cos(ride.yaw) * ride.v * dt;
    // the whole body collides, nose to tail: buildings, fences, props, traffic and people stop it,
    // and it bounces back a little (world bible 7.5)
    const fx = Math.sin(ride.yaw), fz = Math.cos(ride.yaw), half = ride.T.wheelbase / 2 + 0.6;
    const others = getBodies?.() || [];
    let hit = false;
    for (const u of [-1, -0.5, 0, 0.5, 1]) {
      const probe = { x: ride.pos.x + fx * half * u, z: ride.pos.z + fz * half * u };
      const bx = probe.x, bz = probe.z;
      world.resolve(probe, ride.T.radius, 0);
      if (Math.hypot(probe.x - bx, probe.z - bz) > 0.01 || pushOutDynamic({ x: bx, z: bz }, ride.T.radius, others)) { hit = true; break; }
    }
    if (hit) { ride.pos.copy(prev); ride.v *= -0.2; }
  }

  function update(dt, t, keys, player) {
    if (!ride) return null;
    if (ride.phase === 'arriving') {
      if (follow(dt)) {
        ride.phase = 'waiting';
        toast(ride.mode === 'drive' ? 'Your ride is here. Press E to get in and drive.' : 'Your ride is here. Press E to get in.');
      }
    } else if (ride.phase === 'riding') {
      if (follow(dt)) { const early = ride.stopping, p = alight(); toast(early ? 'Pulled over. Mind the traffic.' : 'You have arrived.'); return { exit: p }; }
    } else if (ride.phase === 'driving') drive(dt, keys);
    if (ride) {
      ride.mesh.position.copy(ride.pos);
      ride.mesh.rotation.y = ride.yaw;
    }
    return ride && (ride.phase === 'riding' || ride.phase === 'driving') ? { pos: ride.pos, yaw: ride.yaw, cam: ride.T.cam, seatY: ride.T.seatY, nose: ride.T.wheelbase * 0.5 + 1.05 } : null;
  }

  // E: board when waiting nearby, get off when seated
  function use(player) {
    if (!ride) return false;
    if (ride.phase === 'waiting' && Math.hypot(player.x - ride.pos.x, player.z - ride.pos.z) < 8) { board(); return true; }
    if (ride.phase === 'riding' || ride.phase === 'driving') {
      if (Math.abs(ride.v) > 1.5) {
        if (ride.phase === 'riding') { if (!ride.stopping) { ride.stopping = true; toast('Asking the driver to pull over...', 2200); } return true; }
        toast('Slow down first: S to brake.'); return true;
      }
      const p = alight(); onState?.({ ride: false, exitAt: p }); return true;
    }
    return false;
  }

  function dispose() {
    if (ride) ride.mesh.removeFromParent();
    panel.remove();
    group.traverse((o) => { o.geometry?.dispose(); });
    group.removeFromParent();
  }

  return {
    update, use, openPanel, dispose, stops,
    isMenuOpen: () => panel.classList.contains('on'), closeMenu: closePanel,
    get active() { return !!ride; }, cancel, get pending() { return !!ride && (ride.phase === 'arriving' || ride.phase === 'waiting'); },
    // the hired vehicle, while you are not in it, is something to walk around
    body: () => (ride && ride.phase !== 'riding' && ride.phase !== 'driving' ? { cx: ride.pos.x, cz: ride.pos.z, hx: ride.T.radius, hz: ride.T.wheelbase / 2 + 0.6, ry: ride.yaw } : null),
    get debug() { return ride && { phase: ride.phase, x: ride.pos.x, z: ride.pos.z, s: ride.s, L: pathLength(ride.path), v: ride.v, pickup: ride.pickup }; }, get seated() { return !!ride && (ride.phase === 'riding' || ride.phase === 'driving'); },
  };
}
