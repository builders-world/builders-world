// A guided hike up the city's real hills (Elvis, 13 October 2026: "So go ahead and build hills"; hiking had been listed
// as coming). The route is the one worked out over the real ground (scripts/city/hills.py): from the trailhead on the
// city's side up to the highest summit, along the mapped paths where they go that way. A guide from the city walks it
// with you and tells you what you are looking at. W walks, Shift strides out, S stops for a rest, E drinks; the steep
// parts slow you and tire you, rest brings you back. The walk runs eight times faster than the clock (F for sixteen),
// so a climb that takes an hour and a half on the real hill takes ten minutes or so here. At the top: the view, the numbers,
// and the guide's car back down to the city.
import * as THREE from 'three';
import { person, playerPerson, gameKeys, sportsUI } from '../sports/common.js';
import { sfx } from '../audio.js';
import { C, FONT } from '../uikit.js';
import { briefCard, recMode, release } from './brief.js';

// what the guide points out, by city: [share of the way up, line]
const LINES = {
  Nairobi: [[0.15, 'These are the Ngong Hills: in Maa the name means the knuckles of a fist. Seven of them along the ridge.'], [0.4, 'The white turbines are KenGen\'s wind farm. The wind up here hardly stops.'], [0.65, 'Look west: the ground falls away into the Rift Valley, a kilometre down.'], [0.9, 'On a very clear morning you can see Kilimanjaro from the top, far to the south.']],
  Accra: [[0.15, 'This is the Akwapim ridge. Accra is down there on the plains, the sea behind it.'], [0.4, 'The botanical gardens at Aburi are just along the ridge. They opened in 1890.'], [0.65, 'Cooler up here, you feel it? People come up from Accra on Sundays for that.'], [0.9, 'Nearly there. From the top you can see right across the Accra plains.']],
  Abuja: [[0.15, 'Granite, all of it: the same stone as Aso Rock and Zuma Rock.'], [0.4, 'Mind your feet on the bare rock, it is smooth where the rain runs.'], [0.65, 'Turn round: that is the city\'s grid laid out below us.'], [0.9, 'The last pull. Use your hands on the rock if you need them.']],
};
const STEPS = (site, len, climb) => [
  { t: 'The route', b: `${(len / 1000).toFixed(1)} km to the top of ${site.summit || site.name}, ${Math.round(climb)} m of climbing. We follow the paths where they go our way; the posts with the red band mark it.` },
  { t: 'Water and sun', b: 'Two litres each, a hat, and you drink before you are thirsty (E). The sun is stronger up here than it feels.' },
  { t: 'The pace', b: 'W walks, Shift strides out, S stops for a rest. The steep parts tire you; rest when the bar is low, not after it runs out. The walk goes eight times faster than the clock; F for sixteen.' },
  { t: 'At the top', b: 'We stop, we look, we take the picture. Then my car is at the road below the summit and I drive you back to the city.' },
];

/**
 * @param o { scene, hills (openworld hills api), site, guide: { name, first, look }, avatar, toast, city, onEnd(result) }
 */
export function createHike(o) {
  const { toast, hills, site } = o;
  const group = new THREE.Group(); group.name = 'hike'; o.scene.add(group);
  const keys = gameKeys(['w', 's', 'shift', 'e', 'f', 'c', 'escape', 'enter', ' ', 'arrowup', 'arrowdown']); const ui = sportsUI(); recMode(true);
  // the route, every 2 m, on the ground
  const R = []; let len = 0, climb = 0;
  for (let i = 0; i + 1 < site.hike.length; i++) {
    const a = site.hike[i], b = site.hike[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 2));
    for (let j = 0; j < n; j++) { const x = a.x + (b.x - a.x) * j / n, z = a.z + (b.z - a.z) * j / n; R.push({ x, z, y: hills.heightAt(x, z) ?? 0, d: len + (L * j) / n }); }
    len += L;
  }
  const last = site.hike[site.hike.length - 1]; R.push({ x: last.x, z: last.z, y: hills.heightAt(last.x, last.z) ?? 0, d: len });
  for (let i = 1; i < R.length; i++) climb += Math.max(0, R[i].y - R[i - 1].y);
  const at = (d) => { d = Math.max(0, Math.min(len, d)); let lo = 0, hi = R.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (R[m].d <= d) lo = m; else hi = m; } const a = R[lo], b = R[hi], t = b.d > a.d ? (d - a.d) / (b.d - a.d) : 0; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, yaw: Math.atan2(b.x - a.x, b.z - a.z) }; };

  const you = playerPerson(o.avatar, 'you-hike'), guide = person(o.guide.look, `hike-${o.guide.name}`);
  group.add(you.obj, guide.obj);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), new THREE.MeshStandardMaterial({ color: '#4aa3c9', roughness: 0.3 }));
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.18), new THREE.MeshStandardMaterial({ color: C.coral, roughness: 0.7 })); pack.position.set(0, 1.1, -0.22); you.obj.add(pack);
  const lines = (LINES[o.city] || LINES.Nairobi).map(([f, t]) => ({ f, t, said: false }));
  const S = { phase: 'brief', t: 0, d: 0, v: 0, stamina: 1, water: 6, view: 0, ff: 8, rests: 0, clock: 0, sum: null };
  const card = briefCard({ id: 'bw-brief', who: `${o.guide.name}, your guide · ${site.name}`, steps: STEPS(site, len, climb), last: 'Start walking', onDone: () => { card.remove(); S.phase = 'walk'; S.t = 0; ui.show(true); ui.keys([['W', 'walk'], ['Shift', 'stride'], ['S', 'rest'], ['E', 'drink'], ['F', 'faster'], ['C', 'camera']]); ui.call(`${o.guide.first}: "Slow and steady. The hill is not going anywhere."`, 3000); pad.classList.add('on'); } });

  // phone buttons
  const touch = matchMedia('(pointer: coarse)').matches, pad = document.createElement('div'); pad.id = 'bw-hikepad';
  if (touch) {
    pad.innerHTML = `<style>#bw-hikepad{position:fixed;inset:auto 0 18px 0;display:none;justify-content:flex-end;gap:10px;padding:0 16px;z-index:35}#bw-hikepad.on{display:flex}#bw-hikepad button{width:64px;height:64px;border-radius:50%;border:0;background:${C.paper};color:${C.ink};font:800 12.5px/1 ${FONT};box-shadow:0 3px 0 rgba(59,42,32,.25)}#bw-hikepad button.big{background:${C.amber}}</style><button data-k="e">Drink</button><button data-k="s">Rest</button><button data-k="shift">Stride</button><button data-k="w" class="big">Walk</button>`;
    document.body.appendChild(pad); pad.held = new Set();
    pad.querySelectorAll('button').forEach((b) => { const k = b.dataset.k; b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (k === 'e') drink(); else pad.held.add(k); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, () => pad.held.delete(k))); });
  }
  const down = (k) => keys.has(k) || pad.held?.has(k);
  function drink() { if (S.water <= 0) { ui.call(`${o.guide.first}: "Have some of mine."`, 1600); S.stamina = Math.min(1, S.stamina + 0.1); return; } S.water--; S.stamina = Math.min(1, S.stamina + 0.18); sfx('tap'); ui.call(`Water. ${S.water} ${S.water === 1 ? 'sip' : 'sips'} left.`, 1200); you.obj.add(bottle); bottle.position.set(0.3, 1.45, 0.15); setTimeout(() => bottle.removeFromParent(), 900); }

  function update(dt) {
    dt = Math.min(dt, 0.05);
    const tk = keys.take();
    if (tk.includes('enter') && S.phase === 'brief') card.next();
    if (tk.includes('escape')) { finish(S.phase === 'brief' ? { aborted: true } : summary(false)); return; }
    if (tk.includes('c')) S.view = (S.view + 1) % 3;
    if (tk.includes('f')) { S.ff = S.ff === 8 ? 16 : 8; toast(`The walk runs ${S.ff} times faster than the clock.`, 1400); }
    if (tk.includes('e') && S.phase === 'walk') drink();
    S.t += dt;
    if (S.phase === 'walk') {
      const step = dt * S.ff; S.clock += step;
      const here = at(S.d), ahead = at(S.d + 6), grade = (ahead.y - here.y) / 6;
      const walk = down('w') || down('arrowup'), stride = walk && down('shift'), rest = down('s') || down('arrowdown');
      // walking pace on the level, slowed by the slope (Tobler's hiking function, near enough), and by being tired
      const tob = 6 * Math.exp(-3.5 * Math.abs(grade + 0.05)) / 3.6, tired = S.stamina < 0.15 ? 0.45 : 1;
      const want = walk && !rest ? tob * (stride ? 1.45 : 1) * tired : 0;
      S.v += (want - S.v) * (1 - Math.exp(-dt * 4));
      S.d = Math.min(len, S.d + S.v * step);
      // effort: climbing and striding tire you; standing still brings you back
      S.stamina = Math.max(0, Math.min(1, S.stamina - step * (S.v * Math.max(0, grade) * 0.006 + (stride ? 0.0012 : 0)) + (S.v < 0.1 ? step * 0.02 : 0)));
      if (rest && S.v < 0.1 && !S.resting) { S.resting = true; S.rests++; } if (!rest) S.resting = false;
      if (S.stamina < 0.15 && !S.toldTired) { S.toldTired = true; ui.call(`${o.guide.first}: "Stop a minute. Drink. Then on."`, 2400); } if (S.stamina > 0.5) S.toldTired = false;
      const f = S.d / len; lines.forEach((l) => { if (!l.said && f >= l.f) { l.said = true; ui.call(`${o.guide.first}: "${l.t}"`, 5200); } });
      if (S.d >= len - 0.5) { S.phase = 'summit'; S.t = 0; sfx('cheer'); S.sum = summary(true); ui.call(`${site.summit || site.name}. ${site.top_m ? `${site.top_m.toLocaleString()} m above the sea.` : ''} Well walked.`, 5000); ui.keys([['Space', 'drive back'], ['C', 'camera']]); pad.classList.remove('on'); }
      ui.board([{ name: 'Up', cols: [`${Math.round(Math.max(0, here.y - R[0].y))}\u00a0m`] }, { name: 'Legs', cols: [`${Math.round(S.stamina * 100)}%`] }], ['', '']); // (how far along: the bar)
      ui.meter(S.d / len, 1);
    } else if (S.phase === 'summit') {
      if (tk.includes(' ') || S.t > 14) { finish(S.sum); return; }
    }
    // you, and the guide a few steps ahead (or beside you at the top)
    const me = at(S.d), g = S.phase === 'summit' ? at(len) : at(S.d + 3.2);
    you.obj.position.set(me.x, me.y, me.z); you.obj.rotation.y = S.phase === 'summit' ? me.yaw + Math.PI : me.yaw; you.rig?.update(dt, { speed: S.v, t: S.t });
    guide.obj.position.set(g.x + (S.phase === 'summit' ? 1.4 : 0), g.y, g.z); guide.obj.rotation.y = S.phase === 'summit' ? me.yaw + Math.PI : g.yaw; guide.rig?.update(dt, { speed: S.phase === 'walk' ? S.v : 0, t: S.t });
  }
  function summary(top) {
    return { top, km: +(S.d / 1000).toFixed(2), climbed: Math.round(Math.max(0, at(S.d).y - R[0].y)), minutes: Math.round(S.clock / 60), rests: S.rests, summit: site.summit || site.name, height: site.top_m };
  }

  let ended = false;
  function finish(result) {
    if (ended) return; ended = true;
    keys.on = false; ui.show(false); ui.meter(null); card.remove(); pad.remove(); recMode(false);
    you.dispose?.(); guide.dispose?.(); release(group);
    o.onEnd?.(result);
  }
  keys.on = true;

  const cam = { from: new THREE.Vector3(), at: new THREE.Vector3() };
  function pose() {
    if (ended) return null;
    const me = at(S.d), fx = Math.sin(me.yaw), fz = Math.cos(me.yaw), far = innerWidth < innerHeight ? 1.5 : 1;
    if (S.phase === 'brief') { const v = at(0), w = at(60); cam.from.set(v.x - fx * 9 + fz * 4, v.y + 4, v.z - fz * 9 - fx * 4); cam.at.set(w.x, w.y + 6, w.z); }
    else if (S.phase === 'summit') { const a = S.t * 0.18 + me.yaw; cam.from.set(me.x + Math.sin(a) * 14, me.y + 6, me.z + Math.cos(a) * 14); cam.at.set(me.x, me.y + 1.4, me.z); }
    else if (S.view === 1) { const w = at(S.d + 25); cam.from.set(me.x + fx * 0.3, me.y + 1.65, me.z + fz * 0.3); cam.at.set(w.x, w.y + 1.4, w.z); }
    else if (S.view === 2) { cam.from.set(me.x + fz * 9 * far, me.y + 3, me.z - fx * 9 * far); cam.at.set(me.x, me.y + 1.2, me.z); } // from the side: the slope you are on
    else { const w = at(S.d + 14); cam.from.set(me.x - fx * 7 * far, me.y + 3.4, me.z - fz * 7 * far); cam.at.set(w.x, w.y + 1.2, w.z); } // behind you the way you face (at the gate the route has no behind)
    // the ground under the camera: never under the hill
    const gy = hills.heightAt(cam.from.x, cam.from.z); if (gy != null && cam.from.y < gy + 1.5) cam.from.y = gy + 1.5;
    you.obj.visible = S.view !== 1 || S.phase !== 'walk';
    return { x: me.x, z: me.z, yaw: me.yaw, hide: true, cam: { from: cam.from, at: cam.at }, speed: 0 };
  }
  return { update, pose, get phase() { return S.phase; }, state: () => ({ phase: S.phase, d: Math.round(S.d), len: Math.round(len), climb: Math.round(climb), stamina: +S.stamina.toFixed(2), y: Math.round(at(S.d).y) }), finish };
}
