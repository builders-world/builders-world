// Recreation (Elvis, 12 October 2026): things to do outdoors "with guides, tutorials and fees". The Outdoors app on the
// phone books them; each activity has a named guide from the city (knowledge.js), a fee in Efforts and a lesson
// before you start. Skydiving is first: a tandem over the open city, then solo once you have done one. The rest of
// the list (archery, hiking, climbing, mountain biking, paragliding, wingsuit, bungee, the beach, a range, a photo
// safari in Kenya) is shown as coming, so the app says what the city will have.
import { createSkydive } from './skydive.js';
import { createArchery } from './archery.js';
import { createClimbing } from './climbing.js';
import { createSurf } from './surf.js';
import { nameFor } from '../knowledge.js';
import { walletEngine, effortsMark, fmt } from '../wallet.js';
import { sfx } from '../audio.js';
import { C, FONT } from '../uikit.js';
import { regionOf } from '../areas.js';

const FEE = { tandem: 1500, solo: 800, arch18: 400, arch30: 500, boulder: 300, surf: 600 };
const SOON = ['Hiking', 'Mountain biking', 'Paragliding', 'Bungee'];
const COACH_LOOK = { body: 'f', skin: '#6b4226', hair: 'braids', top: 'tee', topColor: '#2a9d94', bottom: 'trousers', bottomColor: '#2b2f36', shoes: 'sneakers', shoeColor: '#f4f1ea', acc: [] };
const LOOK = { body: 'm', skin: '#4a2e1c', hair: 'low', top: 'jacket', topColor: '#d9583f', bottom: 'trousers', bottomColor: '#2b2f36', shoes: 'sneakers', shoeColor: '#1d2028', acc: [] };
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* private window */ } } };

const CSS = `
#lk-out { position: fixed; inset: 0; z-index: 45; display: none; place-items: center; background: rgba(20,16,12,.35); }
#lk-out.on { display: grid; }
#lk-out .sh { width: min(440px, calc(100vw - 32px)); max-height: calc(100vh - 48px); overflow: auto; box-sizing: border-box; padding: 18px; border-radius: 22px;
  background: ${C.paper}; color: ${C.ink}; font: 600 14px/1.4 ${FONT}; box-shadow: 0 5px 0 rgba(59,42,32,.2), 0 18px 40px rgba(10,14,30,.3); position: relative; }
#lk-out h3 { margin: 0 0 2px; font: 800 22px/1.15 ${FONT}; }
#lk-out .sub { color: ${C.ink2 || '#7a6a58'}; font-size: 12.5px; margin-bottom: 12px; }
#lk-out .act { display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 16px; background: #fffaf0; margin-top: 8px; }
#lk-out .act .t { flex: 1; } #lk-out .act b { display: block; font: 800 16px/1.2 ${FONT}; } #lk-out .act small { color: #7a6a58; font-size: 12px; }
#lk-out svg { display: inline-block; vertical-align: -2px; margin-right: 3px; }
#lk-out .act button { flex: none; width: auto; min-width: 96px; }
#lk-out button { border: 0; border-radius: 999px; padding: 10px 14px; font: 800 13.5px/1 ${FONT}; cursor: pointer; background: #efe2c4; color: ${C.ink}; white-space: nowrap; }
#lk-out button.go { background: ${C.amber}; box-shadow: 0 3px 0 #c98f1f; }
#lk-out button:disabled { opacity: .45; cursor: default; box-shadow: none; }
#lk-out .x { position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; padding: 0; }
#lk-out .soon { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; } #lk-out .soon span { padding: 4px 10px; border-radius: 999px; background: #efe2c4; font-size: 12px; color: #7a6a58; }
`;

/**
 * @param o { scene, world, openWorld, parks (greenrey.parks), avatar, toast, standAt(x, z), canStart() }
 */
export function createRecreation(o) {
  const { toast } = o;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const panel = document.createElement('div'); panel.id = 'lk-out'; document.body.appendChild(panel);
  let jump = null;

  // the guide: one instructor per city, named as people there are named
  const who = nameFor('skydive-instructor', 'm');
  const guide = { name: who?.full || 'Captain Ade', first: who?.first || 'Ade', look: LOOK };
  // the drop zone: the largest park in the district (greenrey.js), the nearest the middle of those, and clear of
  // anything taller than a bench for 18 m round (at the district's edge the open city's buildings can reach in)
  const rects = (o.parks?.rects || []).slice().sort((a, b) => b.w * b.d - a.w * a.d || Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  const clear = (x, z) => { for (let dx = -18; dx <= 18; dx += 6) for (let dz = -18; dz <= 18; dz += 6) if (Math.hypot(dx, dz) <= 18 && o.world.solidAt?.(x + dx, 3, z + dz)) return false; return true; };
  const target = { x: 0, z: 0, name: 'the square' };
  const pickTarget = () => { const r = rects.find((q) => clear(q.x, q.z)) || rects[0]; if (r) Object.assign(target, { x: r.x, z: r.z, name: 'the park' }); };
  pickTarget();
  const tandems = () => +(store.get('bw:skydive:tandems') || 0);
  const lessons = () => +(store.get('bw:archery:lessons') || 0);
  const kw = nameFor('climbing-coach', 'm');
  const climbCoach = { name: kw?.full || 'Coach Tunde', first: kw?.first || 'Tunde', look: { ...LOOK, top: 'tee', topColor: '#3fae5a' } };
  // the bouldering wall: 9 m of grass along it and 6 m deep (the mats, then room to stand back), in a park, nothing in it
  function wallSpot() {
    // the park's own things (benches, the pavilion, its gate and stalls) keep 7 m clear of the wall and its mats
    const things = [...(o.parks?.seats || []), ...(o.parks?.pois || []), ...(o.parks?.interact || [])].filter((q) => Number.isFinite(q.x));
    for (const r of rects) for (const off of [12, 9, 15, 6, 18, 3]) for (let k = 0; k < 16; k++) {
      const a = (r.ang || 0) + (k * Math.PI) / 8, g = { x: Math.sin(a), z: Math.cos(a) }, f = { x: -g.x, z: -g.z };
      const at = { x: r.x + g.x * off, z: r.z + g.z * off }, mid = { x: at.x + f.x * 1.5, z: at.z + f.z * 1.5 };
      if (things.some((q) => Math.hypot(q.x - mid.x, q.z - mid.z) < 7)) continue;
      // trees (their crowns are above the solid trunk) and lamp posts (too thin to be solid): off the wall, its mats and
      // the view back to the camera
      if ((o.parks?.trees || []).some((q) => { const dx = q.x - at.x, dz = q.z - at.z, t = dx * f.x + dz * f.z, side = Math.abs(-dx * f.z + dz * f.x); return (t > -1 && t < 4.5 && side < 6.5) || (t > -8 && t <= -1 && side < 2.6); })) continue;
      if ([...(o.lamps || []), ...(o.parks?.lights || []).map(([x, , z]) => ({ x, z }))].some((l) => { const dx = l.x - at.x, dz = l.z - at.z, t = dx * f.x + dz * f.z, side = Math.abs(-dx * f.z + dz * f.x); return t > -7.5 && t < 3.5 && side < 5; })) continue;
      // the wall, its mats and where you stand; and behind that, a clear view back to where the camera stands
      let ok = true; for (let t = -7; t <= 3.2 && ok; t += 0.3) for (let side = -4.8; side <= 4.8; side += 0.3) if (o.world.solidAt?.(at.x + f.x * t - f.z * side, 1.2, at.z + f.z * t + f.x * side)) { ok = false; break; } // fine enough to catch a lamp post
      if (ok) return { at, dir: f };
    }
    return null;
  }
  const sw = nameFor('surf-instructor', 'm');
  const surfCoach = { name: sw?.full || 'Coach Seun', first: sw?.first || 'Seun', look: { ...LOOK, top: 'tee', topColor: '#2a9d94', bottom: 'shorts', bottomColor: '#22336a' } };
  const cw = nameFor('archery-coach', 'f');
  const coach = { name: cw?.full || 'Coach Ada', first: cw?.first || 'Ada', look: COACH_LOOK };
  // the archery range: a lane across a park with room for the distance, clear of trees and posts at chest height
  function rangeFor(dist) {
    for (const r of rects) for (let k = 0; k < 8; k++) {
      const a = (r.ang || 0) + (k * Math.PI) / 4, f = { x: Math.sin(a), z: Math.cos(a) }, line = { x: r.x - f.x * (dist / 2 + 1), z: r.z - f.z * (dist / 2 + 1) };
      let ok = true; for (let t = -2; t <= dist + 4 && ok; t += 1) for (const side of [-1.2, 0, 1.2]) if (o.world.solidAt?.(line.x + f.x * t - f.z * side, 1.3, line.z + f.z * t + f.x * side)) { ok = false; break; }
      if (ok && (!o.world.reachable || o.world.reachable(line.x, line.z))) return { line, dir: f };
    }
    return null;
  }

  function open() {
    sfx('tap');
    const city = o.world.place?.city || 'the city', bal = walletEngine().balance();
    const can = !!o.openWorld?.active, solo = tandems() > 0;
    panel.innerHTML = `<div class="sh"><button class="x" aria-label="Close">✕</button><h3>Outdoors</h3>
      <div class="sub">Guided, with a lesson first. You have ${effortsMark(13)}${fmt(bal)}.</div>
      <div class="act"><div class="t"><b>Tandem skydive</b><small>${can ? `3,000 m over ${city}, strapped to ${guide.name}. Lands in ${target.name}.` : `Over the open cities only: Lagos, Nairobi, Abuja, Port Harcourt, Accra and Uyo.`}</small></div>
        <button class="go" data-k="tandem" ${can ? '' : 'disabled'}>${effortsMark(12)}${fmt(FEE.tandem)}</button></div>
      <div class="act"><div class="t"><b>Solo jump</b><small>${solo ? `Your own canopy. ${guide.first} watches from the ground; the automatic opener is the last resort.` : 'After your first tandem.'}</small></div>
        <button class="go" data-k="solo" ${can && solo ? '' : 'disabled'}>${effortsMark(12)}${fmt(FEE.solo)}</button></div>
      <div class="act"><div class="t"><b>Archery lesson</b><small>${coach.name} sets up a range in the park: 18 m, a 40 cm face, twelve arrows.</small></div>
        <button class="go" data-k="arch18">${effortsMark(12)}${fmt(FEE.arch18)}</button></div>
      <div class="act"><div class="t"><b>Archery, 30 m</b><small>${lessons() ? 'The 80 cm face, twelve arrows, scored.' : 'After your first lesson.'}</small></div>
        <button class="go" data-k="arch30" ${lessons() ? '' : 'disabled'}>${effortsMark(12)}${fmt(FEE.arch30)}</button></div>
      <div class="act"><div class="t"><b>Bouldering</b><small>${climbCoach.name} runs a wall in the park: four problems, V0 to V3, mats below.</small></div>
        <button class="go" data-k="boulder">${effortsMark(12)}${fmt(FEE.boulder)}</button></div>
      ${(() => { const b = beachList()[0]; return b ? `<div class="act"><div class="t"><b>Surf lesson</b><small>${surfCoach.name} at ${b.label}: on the sand first, then six waves.</small></div>
        <button class="go" data-k="surf">${effortsMark(12)}${fmt(FEE.surf)}</button></div>` : ''; })()}
      ${(() => { const bs = beachList().slice(0, 3); return bs.length ? `<div class="act"><div class="t"><b>The beach</b><small>Free. ${bs.map((b, i) => `<a href="#" data-beach="${i}" style="color:${C.teal};font-weight:800">${b.label}</a> (${(b.d / 1000).toFixed(1)} km)`).join(' · ')}</small></div></div>` : ''; })()}
      <div class="soon">${SOON.map((s) => `<span>${s}: coming</span>`).join('')}</div></div>`;
    panel.querySelector('.x').onclick = close;
    panel.onclick = (e) => { if (e.target === panel) close(); };
    panel.querySelectorAll('button[data-k]').forEach((b) => { b.onclick = () => book(b.dataset.k); });
    const bs = beachList(); panel.querySelectorAll('[data-beach]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); toBeach(bs[+a.dataset.beach]); }; });
    panel.classList.add('on');
  }
  function close() { panel.classList.remove('on'); }

  // the city's beaches (the open city's bake: the named ones, else stretches of the coast), nearest first; one per name,
  // the unnamed called after the area they are in ("The beach at Victoria Island")
  function beachList() {
    const B = o.openWorld?.active ? o.openWorld.beaches?.() || [] : [];
    const c = o.world.center || { lat: 0, lon: 0 }, kx = 111320 * Math.cos((c.lat * Math.PI) / 180), P = o.getPlayer?.() || { x: 0, z: 0 };
    const areas = regionOf(o.world.place?.city)?.areas || [];
    const named = B.map((b) => {
      const lat = c.lat - b.z / 110574, lon = c.lon + b.x / kx;
      const near = areas.map((a) => [a, (a.lat - lat) ** 2 + ((a.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2]).sort((p, q) => p[1] - q[1])[0]?.[0];
      return { ...b, label: b.name || `The beach at ${near?.area || o.world.place?.city || 'the coast'}`, d: Math.hypot(b.x - P.x, b.z - P.z) };
    }).sort((a, b) => a.d - b.d);
    const seen = new Set(); return named.filter((b) => !seen.has(b.label) && seen.add(b.label));
  }
  function toBeach(b) {
    close();
    // onto the sand (the coast's line is the water's edge; the sand runs inland of it), facing the sea
    dispatchEvent(new CustomEvent('bw:jumpto', { detail: { x: b.x - b.sea.x * 14, z: b.z - b.sea.z * 14, name: b.label, quick: true } }));
    toast(`${b.label}. ${o.world.place?.city === 'Accra' ? 'Coconut sellers along the sand, a football game further down.' : 'Horses for hire, suya smoke, music from the bars.'}`, 3600);
  }

  function book(kind) {
    if (jump) return;
    if (kind.startsWith('arch')) { shoot(kind); return; }
    if (kind === 'boulder') { climb(); return; }
    if (kind === 'surf') { surf(); return; }
    if (o.canStart && !o.canStart()) { toast('Step outside onto the street first.', 2200); return; }
    pickTarget(); // again now: the open city round the district has loaded since the street was built
    const fee = FEE[kind];
    if (!walletEngine().spend(fee, kind === 'solo' ? 'Solo skydive' : 'Tandem skydive')) { toast('Not enough Efforts for this jump. Push some commits and come back.', 2600); return; }
    close();
    const start = o.getPlayer?.() || { x: target.x, z: target.z };
    jump = createSkydive({ scene: o.scene, world: o.world, openWorld: o.openWorld, target, guide, solo: kind === 'solo', avatar: o.avatar, toast, start,
      onEnd: (r, at) => {
        jump = null;
        if (!r || r.aborted) { walletEngine().earn?.(fee, 'Skydive refunded'); o.standAt?.(start.x, start.z); toast(`You ride the plane back down with ${guide.first}. Fee refunded.`, 2600); return; }
        if (!r.solo) store.set('bw:skydive:tandems', String(tandems() + 1));
        // off a roof the guide meets you at the target; otherwise you stand where you landed
        if (r.landing === 'roof' || r.landing === 'wall') o.standAt?.(target.x, target.z); else o.standAt?.(at.x, at.z);
        dispatchEvent(new CustomEvent('bw:me', { detail: { played: 0.3, skill: 'fitness', n: 1 } }));
        toast(`${r.solo ? 'Solo' : 'Tandem'}: ${r.points} points. Pulled at ${(r.pullAlt || 0).toLocaleString()} m${r.autoPull ? ' (not by you)' : ''}, ${r.freefall} s of freefall, ${r.peak} km/h at the fastest, ${r.distance} m from the target.`, 6000);
      } });
    toast(`${guide.name} meets you at the plane. Listen to the briefing on the climb.`, 3000);
  }

  function shoot(kind) {
    if (o.canStart && !o.canStart()) { toast('Step outside onto the street first.', 2200); return; }
    const dist = kind === 'arch30' ? 30 : 18, lane = rangeFor(dist);
    if (!lane) { toast(`${coach.first} cannot find ${dist} m of clear grass in the parks here.`, 2600); return; }
    if (!walletEngine().spend(FEE[kind], `Archery, ${dist} m`)) { toast('Not enough Efforts for the range. Push some commits and come back.', 2600); return; }
    close();
    jump = createArchery({ scene: o.scene, world: o.world, line: lane.line, dir: lane.dir, dist, coach, avatar: o.avatar, toast,
      onEnd: (r) => {
        jump = null; o.standAt?.(lane.line.x, lane.line.z);
        if (!r || r.aborted) { walletEngine().earn?.(FEE[kind], 'Archery refunded'); toast(`${coach.first} packs the range away. Fee refunded.`, 2400); return; }
        if (!r.arrows) return;
        if (dist === 18) store.set('bw:archery:lessons', String(lessons() + 1));
        dispatchEvent(new CustomEvent('bw:me', { detail: { played: 0.25, skill: 'fitness', n: 1 } }));
        toast(`Archery, ${dist} m: ${r.score} of ${r.max}, ${r.tens} tens (${r.xs} X), ${r.misses} ${r.misses === 1 ? 'miss' : 'misses'}. Ends: ${r.ends.join(' and ')}.`, 6000);
      } });
    toast(`${coach.name} has the range set up. Listen to the lesson first.`, 2600);
  }

  function climb() {
    if (o.canStart && !o.canStart()) { toast('Step outside onto the street first.', 2200); return; }
    const spot = wallSpot();
    if (!spot) { toast(`${climbCoach.first} cannot find a clear patch of grass for the wall here.`, 2600); return; }
    if (!walletEngine().spend(FEE.boulder, 'Bouldering')) { toast('Not enough Efforts for the wall. Push some commits and come back.', 2600); return; }
    close();
    jump = createClimbing({ scene: o.scene, at: spot.at, dir: spot.dir, coach: climbCoach, avatar: o.avatar, toast,
      onEnd: (r) => {
        jump = null; o.standAt?.(spot.at.x, spot.at.z);
        if (!r || r.aborted) { walletEngine().earn?.(FEE.boulder, 'Bouldering refunded'); toast(`${climbCoach.first} takes the wall down. Fee refunded.`, 2400); return; }
        dispatchEvent(new CustomEvent('bw:me', { detail: { played: 0.25, skill: 'fitness', n: 1 } }));
        toast(r.sends.length ? `Bouldering: sent ${r.sends.join(', ')}${r.flashes ? ` (${r.flashes} flashed)` : ''}, in ${r.tries} ${r.tries === 1 ? 'try' : 'tries'}.` : `Bouldering: ${r.tries} ${r.tries === 1 ? 'try' : 'tries'}, no sends yet. ${climbCoach.first} says come back.`, 5000);
      } });
    toast(`${climbCoach.name} has the wall up. The lesson first.`, 2400);
  }

  // surfing: to the nearest beach first (quick travel), then the lesson on its sand
  function surf() {
    if (o.canStart && !o.canStart()) { toast('Step outside onto the street first.', 2200); return; }
    const b = beachList()[0]; if (!b) { toast('No surf here: the city has no beach on the sea.', 2400); return; }
    if (!walletEngine().spend(FEE.surf, 'Surf lesson')) { toast('Not enough Efforts for the lesson. Push some commits and come back.', 2600); return; }
    const start = () => {
      jump = createSurf({ scene: o.scene, beach: b, coach: surfCoach, avatar: o.avatar, toast,
        onEnd: (r) => {
          jump = null; o.standAt?.(b.x - b.sea.x * 14, b.z - b.sea.z * 14);
          if (!r || r.aborted) { walletEngine().earn?.(FEE.surf, 'Surf lesson refunded'); toast(`${surfCoach.first} waves you off. Fee refunded.`, 2400); return; }
          dispatchEvent(new CustomEvent('bw:me', { detail: { played: 0.3, skill: 'fitness', n: 1 } }));
          toast(r.stood ? `Surf lesson: ${r.stood} ${r.stood === 1 ? 'wave' : 'waves'} ridden, best ride ${r.best} points.` : `Surf lesson: ${r.waves} tries, no ride yet. ${surfCoach.first} says the next one is yours.`, 5000);
        } });
    };
    const P = o.getPlayer?.() || { x: 0, z: 0 };
    if (Math.hypot(P.x - b.x, P.z - b.z) < 250) { close(); start(); return; }
    toBeach(b); setTimeout(start, 5500);
  }

  addEventListener('bw:outdoors', open);
  return {
    update: (dt) => jump?.update(dt),
    pose: () => jump?.pose() || null,
    get playing() { return jump?.phase || null; },
    get jump() { return jump; },
    get isOpen() { return panel.classList.contains('on'); },
    open, close, book, target, guide, beaches: beachList, toBeach,
    dispose() { removeEventListener('bw:outdoors', open); jump?.finish({ aborted: true }); panel.remove(); style.remove(); },
  };
}
