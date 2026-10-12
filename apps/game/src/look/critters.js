import * as THREE from 'three';
import { petModel, animatePet, BREEDS } from './pets.js';
import { cityInfo } from './cityinfo.js';
import { sfx } from './audio.js';
import { threat, ME, trustOf, addTrust, moodBubble } from './fear.js';

// The neighbourhood's own animals, and your pet making friends with them (Elvis, 10 October 2026: "your dog should
// also be able to make friends with other pets and other animals around the area"). Neighbours' dogs and cats keep to
// their own patch by the estates and the parks; in the Nigerian and Ghanaian cities goats wander the verges and
// chickens peck by the houses, as they do.
//
// When your pet comes close to one: a dog or a cat meets it nose to nose for a few seconds (both wag, a heart or two)
// and after that they are friends, kept on this device. Friends greet with a burst of zoomies and tag along with your
// pet for a while. A goat stares your dog down; chickens scatter.

const DOGS = ['Tiger', 'Rex', 'Lucky', 'Bobby', 'Jack', 'Caesar', 'Sasha'], CATS = ['Pepper', 'Mimi', 'Kitty', 'Shadow', 'Tom'];
const FKEY = 'bw-pet-friends';
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));

// a West African dwarf goat: small, stocky, short horns, a beard
function goatModel(i) {
  const g = new THREE.Group(), coat = ['#f1ece2', '#3b2a20', '#8a5a36', '#d9cbb0'][i % 4], k = 1;
  const body = box(0.26, 0.24, 0.5, coat); body.position.y = 0.42; g.add(body);
  const head = new THREE.Group(); head.position.set(0, 0.55, 0.3); g.add(head);
  head.add(box(0.14, 0.15, 0.2, coat)); const horn = box(0.03, 0.12, 0.03, '#6e6252'); [-1, 1].forEach((s) => { const h = horn.clone(); h.position.set(s * 0.045, 0.1, -0.05); h.rotation.x = -0.5; head.add(h); const ear = box(0.08, 0.03, 0.05, coat); ear.position.set(s * 0.09, 0.02, -0.03); head.add(ear); });
  const beard = box(0.04, 0.07, 0.03, coat); beard.position.set(0, -0.09, 0.07); head.add(beard);
  const legs = [[-0.08, 0.17], [0.08, 0.17], [-0.08, -0.17], [0.08, -0.17]].map(([x, z]) => { const p = new THREE.Group(); p.position.set(x, 0.3, z); const l = box(0.05, 0.3, 0.05, coat); l.position.y = -0.15; p.add(l); g.add(p); return p; });
  const tail = box(0.04, 0.08, 0.04, coat); tail.position.set(0, 0.55, -0.26); tail.rotation.x = -0.6; g.add(tail);
  g.userData = { head, legs, k, kind: 'goat' };
  return g;
}
// a village chicken
function chickenModel(i) {
  const g = new THREE.Group(), c = ['#b5523b', '#f1ece2', '#3b2a20', '#c98f4a'][i % 4];
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6).scale(0.9, 0.85, 1.15), new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })); body.position.y = 0.2; g.add(body);
  const head = new THREE.Group(); head.position.set(0, 0.33, 0.1); g.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), body.material));
  const comb = box(0.02, 0.05, 0.06, '#d7263d'); comb.position.set(0, 0.06, 0); head.add(comb);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#f2b33d' })); beak.position.set(0, -0.005, 0.06); head.add(beak);
  const tail = box(0.06, 0.12, 0.05, c); tail.position.set(0, 0.28, -0.13); tail.rotation.x = -0.4; g.add(tail);
  const legs = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * 0.04, 0.1, 0); const l = box(0.015, 0.1, 0.015, '#e2b13c'); l.position.y = -0.05; p.add(l); g.add(p); return p; });
  g.userData = { head, legs, k: 1, kind: 'chicken' };
  return g;
}

export function createCritters({ scene, world, getPet, toast, spots = [] }) {
  const C = cityInfo(), group = new THREE.Group(); group.name = 'critters'; scene.add(group);
  const owners = (C.cast || []).map((p) => (p.name || '').split(' ')[0]).filter(Boolean);
  const nigeriaOrGhana = ['Nigeria', 'Ghana'].includes(C.country);
  let friends = []; try { friends = JSON.parse(localStorage.getItem(FKEY) || '[]'); } catch { /* */ }
  const keep = () => { try { localStorage.setItem(FKEY, JSON.stringify(friends)); } catch { /* */ } };
  const list = [];
  let seed = 11; const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) / 16777216; };
  const reach = (x, z) => world.nearestReachable?.(x, z) || { x, z };
  // where they live: by the estate gates and doors, the parks, and the open verges
  // on the street side of things, never shut inside a gated estate: the parks first, then verges round the district
  const homes = [...spots]; for (let i = 0; homes.length < 12 && i < 40; i++) { const a = rnd() * Math.PI * 2, r = world.radius * (0.2 + rnd() * 0.6); homes.push({ x: Math.cos(a) * r, z: Math.sin(a) * r }); }
  const at = (i) => { const h = homes.length ? homes[i % homes.length] : { x: (rnd() - 0.5) * world.radius, z: (rnd() - 0.5) * world.radius }; const q = reach(h.x + (rnd() - 0.5) * 6, h.z + (rnd() - 0.5) * 6); return new THREE.Vector3(q.x, 0, q.z); };
  const add = (kind, i, model, name, owner) => { const home = at(i * 3 + (kind === 'cat' ? 1 : kind === 'goat' ? 2 : 0)); model.position.copy(home); group.add(model); list.push({ kind, model, name, owner, home, pos: home.clone(), goal: null, wait: rnd() * 4, v: 0, met: 0, meet: 0, happy: 0, follow: 0, flee: 0, t: rnd() * 10, act: null, bold: kind === 'dog' && i % 2 === 0, state: 'idle', calm: 0, barkT: 0, cluckT: 0, mood: moodBubble(model, kind === 'chicken' ? 0.62 : kind === 'goat' ? 1.0 : 0.95) }); };
  for (let i = 0; i < 4; i++) { const br = BREEDS.dog[(i * 2 + 1) % BREEDS.dog.length]; add('dog', i, petModel('dog', br.id), DOGS[i % DOGS.length], owners[i] || null); }
  for (let i = 0; i < 3; i++) { const br = BREEDS.cat[(i * 2) % BREEDS.cat.length]; add('cat', i + 4, petModel('cat', br.id), CATS[i % CATS.length], owners[i + 4] || null); }
  if (nigeriaOrGhana) {
    for (let i = 0; i < 3; i++) add('goat', i + 7, goatModel(i), null, null);
    for (let i = 0; i < 4; i++) add('chicken', 10 + Math.floor(i / 2), chickenModel(i), null, null);
  }
  const label = (c) => `${c.name}${c.owner ? ` (${c.owner}'s ${c.kind})` : ` the ${c.kind}`}`;
  const isFriend = (c) => friends.includes(label(c));

  const hearts = [];
  const heart = (p) => { const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: 0xe8557a, transparent: true })); h.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.6, (Math.random() - 0.5) * 0.4)); group.add(h); hearts.push({ h, t: 0 }); };
  const step = (c, tx, tz, v, dt) => { const dx = tx - c.pos.x, dz = tz - c.pos.z, d = Math.hypot(dx, dz); if (d < 0.2) return 0; const s = Math.min(v, d * 3); c.pos.x += (dx / d) * s * dt; c.pos.z += (dz / d) * s * dt; world.resolve(c.pos, 0.2, 0); const want = Math.atan2(dx, dz), dh = Math.atan2(Math.sin(want - c.model.rotation.y), Math.cos(want - c.model.rotation.y)); c.model.rotation.y += dh * (1 - Math.exp(-dt * 8)); return s; };

  let t = 0, cool = 0;
  const told = new Set(), fed = {}; // (each dog's first bark at you explained once; the first feed of each kind)
  addEventListener('bw:fed', (e) => { const who = e.detail?.who; if (who && !fed[who]) { fed[who] = 1; toast?.('The pigeons crowd round your feet for the corn.', 2400); } });
  function update(dt, player) {
    t += dt; cool -= dt;
    const pet = getPet?.(), pp = pet?.pos, petOn = !!(pet && pp && pet.visible !== false);
    list.forEach((c) => {
      c.t += dt;
      const far = player && Math.hypot(c.pos.x - player.x, c.pos.z - player.z) > 90;
      c.model.visible = !far; if (far) return;
      const dPet = petOn ? Math.hypot(c.pos.x - pp.x, c.pos.z - pp.z) : 99;
      let speed = 0, sit = 0, wag = c.happy > 0, tongue = false;
      c.happy = Math.max(0, c.happy - dt);
      if (c.kind === 'chicken') {
        // chickens: peck about home; a dog coming close sends them running, wings going
        // and so does you running at them (fear.js); calm, they peck on round your feet; corn brings them over
        const th = threat(c.pos.x, c.pos.z, { wary: 1.2, eats: 'corn', trust: trustOf(label(c)) });
        if (petOn && dPet < 4 && pet.kind === 'dog') { c.flee = 1.5; c.fx = pp.x; c.fz = pp.z; if (cool <= 0) { cool = 6; sfx('swish'); } }
        if (th.t >= 0.6) { c.flee = 1.8; c.fx = ME.x; c.fz = ME.z; c.mood.set('alarm', 1.2); if (c.cluckT <= 0 && th.d < 15) { c.cluckT = 2.5; sfx('cluck'); } }
        c.cluckT -= dt;
        if (c.flee > 0) { c.flee -= dt; const ax = c.pos.x - c.fx, az = c.pos.z - c.fz, L = Math.hypot(ax, az) || 1; speed = step(c, c.pos.x + (ax / L) * 3, c.pos.z + (az / L) * 3, 3.2, dt); }
        else if (ME.feeding === 'corn' && th.d < 9) { const a = c.t * 0.2 + list.indexOf(c) * 1.7; speed = step(c, ME.x + Math.cos(a) * 1.1, ME.z + Math.sin(a) * 1.1, 1.6, dt); if (th.d < 1.8) { c.mood.set('food', 1); addTrust(label(c), dt * 0.05); if (!fed.chickens) { fed.chickens = 1; toast?.('The chickens come running for the corn.', 2400); } } }
        else { c.wait -= dt; if (c.wait <= 0) { c.wait = 1 + rnd() * 3; c.goal = new THREE.Vector3(c.home.x + (rnd() - 0.5) * 5, 0, c.home.z + (rnd() - 0.5) * 5); } if (c.goal) speed = step(c, c.goal.x, c.goal.z, 0.7, dt); }
        const U = c.model.userData; U.head.rotation.x = speed < 0.05 ? Math.max(0, Math.sin(c.t * 6)) * 0.9 : 0; U.legs.forEach((l, i) => { l.rotation.x = speed > 0.05 ? Math.sin(c.t * 14 + i * Math.PI) * 0.6 : 0; });
        c.mood.update(dt, t); c.model.position.set(c.pos.x, speed > 2 ? Math.abs(Math.sin(c.t * 12)) * 0.12 : 0, c.pos.z); return;
      }
      if (c.kind === 'goat') {
        // goats: graze, wander a little; a dog that comes close gets stared at
        const th = threat(c.pos.x, c.pos.z, { wary: 0.8, eats: 'corn' });
        if (th.t >= 0.7) { c.flee = 2.5; c.mood.set('unsure', 1.5); }
        if (c.flee > 0) { c.flee -= dt; const ax = c.pos.x - ME.x, az = c.pos.z - ME.z, L = Math.hypot(ax, az) || 1; speed = step(c, c.pos.x + (ax / L) * 3, c.pos.z + (az / L) * 3, 2.4, dt); }
        else if (ME.feeding === 'corn' && th.d < 8) { speed = th.d > 1.2 ? step(c, ME.x, ME.z, 1.1, dt) : 0; if (th.d < 1.6) c.mood.set('food', 1); }
        else if (petOn && dPet < 3 && pet.kind === 'dog') { const want = Math.atan2(pp.x - c.pos.x, pp.z - c.pos.z); c.model.rotation.y += Math.atan2(Math.sin(want - c.model.rotation.y), Math.cos(want - c.model.rotation.y)) * (1 - Math.exp(-dt * 4)); if (!c.met) { c.met = 1; toast?.(`A goat stares ${pet.name} down. ${pet.name} backs off. The goat wins.`, 3000); } }
        else { c.met = dPet > 8 ? 0 : c.met; c.wait -= dt; if (c.wait <= 0) { c.wait = 3 + rnd() * 6; c.goal = new THREE.Vector3(c.home.x + (rnd() - 0.5) * 9, 0, c.home.z + (rnd() - 0.5) * 9); } if (c.goal) speed = step(c, c.goal.x, c.goal.z, 0.6, dt); }
        const U = c.model.userData; U.head.rotation.x = speed < 0.05 && !(petOn && dPet < 3) ? 0.9 + Math.sin(c.t * 2) * 0.1 : 0; U.legs.forEach((l, i) => { l.rotation.x = speed > 0.05 ? Math.sin(c.t * 9 + (i % 2) * Math.PI + (i > 1 ? Math.PI / 2 : 0)) * 0.5 : 0; });
        c.mood.update(dt, t); c.model.position.set(c.pos.x, 0, c.pos.z); return;
      }
      // dogs and cats and you (fear.js). Charge at one, or walk straight up to it as a stranger, and a bold dog barks and
      // holds its ground while a timid one or a cat bolts and keeps its distance. Stay calm (stand still, or back off
      // slowly) and a barking dog settles and comes to sniff your hand; a biscuit wins one over at once. Trust is kept
      // on this device: a dog that knows you comes over wagging
      const id = label(c), trust = trustOf(id), th = threat(c.pos.x, c.pos.z, { wary: c.kind === 'cat' ? 1.3 : 1, trust, eats: c.kind === 'dog' ? 'treat' : null });
      const faceMe = (k = 6) => { const want = Math.atan2(ME.x - c.pos.x, ME.z - c.pos.z); c.model.rotation.y += Math.atan2(Math.sin(want - c.model.rotation.y), Math.cos(want - c.model.rotation.y)) * (1 - Math.exp(-dt * k)); };
      let busy = false;
      if (th.t >= 0.6 && trust < 0.7 && c.state !== 'flee') {
        if (c.kind === 'dog' && c.bold) { if (c.state !== 'bark') { c.state = 'bark'; c.calm = 0; if (!told.has(id)) { told.add(id); toast?.(`${c.name} is barking at you. Stand still and stay calm, or offer a biscuit (F).`, 3400); } } else c.calm = 0; }
        else { c.state = 'flee'; c.scared = 3.5; }
      }
      if (c.state === 'bark') {
        busy = true; faceMe(8); c.mood.set(c.calm > 1.5 ? 'settle' : 'alarm', 0.4);
        c.barkT -= dt; if (c.barkT <= 0 && c.calm < 1.5) { c.barkT = 0.8 + rnd() * 0.6; if (th.d < 30) sfx('bark', { big: c.model.userData.k > 1.05, twice: rnd() < 0.4, vol: Math.max(0.2, 1 - th.d / 30) }); c.hop = 0.25; }
        if (ME.speed < 0.6 || th.closing < -0.3) c.calm += dt;
        if (ME.feeding === 'treat' && th.d < 8) c.state = 'treat';
        else if (th.d > 16) c.state = 'idle';
        else if (c.calm > 4) { c.state = 'sniff'; c.sniffT = 0; addTrust(id, 0.35); toast?.(`${c.name} stops barking and comes to sniff your hand.`, 2600); }
      } else if (c.state === 'flee') {
        busy = true; c.scared -= dt; c.mood.set('alarm', 0.4);
        const ax = c.pos.x - ME.x, az = c.pos.z - ME.z, L = Math.hypot(ax, az) || 1;
        speed = step(c, c.pos.x + (ax / L) * 4, c.pos.z + (az / L) * 4, c.kind === 'cat' ? 4.5 : 5.5, dt); tongue = c.kind === 'dog';
        if (c.scared <= 0) { c.state = 'wary'; c.waryT = 6; }
      } else if (c.state === 'wary') {
        // keeps its distance and watches you; comes round if you stay calm
        busy = true; faceMe(3); c.mood.set('unsure', 0.4); c.waryT -= dt;
        if (th.d < 5) { const ax = c.pos.x - ME.x, az = c.pos.z - ME.z, L = Math.hypot(ax, az) || 1; speed = step(c, c.pos.x + (ax / L) * 2, c.pos.z + (az / L) * 2, 1.8, dt); }
        if (ME.still > 3 && th.d < 9) addTrust(id, dt * 0.03);
        if (c.waryT <= 0) c.state = 'idle';
      } else if (c.state === 'sniff') {
        busy = true; c.sniffT += dt; wag = c.kind === 'dog'; faceMe(6);
        if (th.d > 1.1) speed = step(c, ME.x, ME.z, 1.4, dt);
        if (c.sniffT > 1.5) c.mood.set('friend', 1.2);
        if (c.sniffT > 3.5 || th.d > 12) { c.state = 'idle'; if (rnd() < 0.7) heart(c.pos); }
      } else if (c.state === 'treat' || (ME.feeding === 'treat' && c.kind === 'dog' && th.d < 8 && th.t < 0.6)) {
        busy = true; c.state = 'treat'; faceMe(8); wag = true; tongue = true; c.mood.set('food', 0.4);
        if (th.d > 0.9) speed = step(c, ME.x, ME.z, 3.2, dt);
        else { ME.feeding = null; c.state = 'idle'; c.happy = 4; addTrust(id, 0.55); heart(c.pos); heart(c.pos); sfx('arrive'); c.mood.set('friend', 2.5); toast?.(`${c.name} takes the biscuit from your hand. ${c.name} likes you now.`, 2800); dispatchEvent(new CustomEvent('bw:me', { detail: { played: 0.1 } })); }
        if (!ME.feeding && c.state === 'treat') c.state = 'idle';
      } else if (trust >= 0.6 && th.d < 7 && th.d > 1.4 && ME.speed < 3 && !(petOn && dPet < 3.2)) {
        // a dog that knows you trots over, wagging, and sits by you
        busy = true; wag = c.kind === 'dog'; speed = step(c, ME.x, ME.z, 2.4, dt); if (rnd() < dt * 0.15) c.mood.set('friend', 1.2);
      } else if (trust < 0.3 && th.d < 5 && ME.still > 1 && !(petOn && dPet < 3.2)) { faceMe(3); if (rnd() < dt * 0.3) c.mood.set('unsure', 1.2); }
      c.hop = Math.max(0, (c.hop || 0) - dt);
      c.mood.update(dt, t);
      if (busy) {
        c.model.position.set(c.pos.x, c.hop > 0 ? Math.sin((0.25 - c.hop) / 0.25 * Math.PI) * 0.06 : 0, c.pos.z);
        const P = c.model.userData; P.sit = (P.sit || 0) * Math.exp(-dt * 4);
        animatePet(c.model, dt, c.t, speed, { sit: P.sit, wag, tongue: tongue ? 1 : 0, alert: c.state === 'bark' });
        return;
      }
      // dogs and cats: meet your pet nose to nose; after a few seconds together they are friends
      const friend = isFriend(c);
      if (petOn && dPet < 3.2 && (c.kind === pet.kind || pet.kind === 'dog' || friend)) {
        const want = Math.atan2(pp.x - c.pos.x, pp.z - c.pos.z); c.model.rotation.y += Math.atan2(Math.sin(want - c.model.rotation.y), Math.cos(want - c.model.rotation.y)) * (1 - Math.exp(-dt * 6));
        if (dPet > 1.1) speed = step(c, pp.x, pp.z, 1.6, dt);
        if (!friend) {
          c.meet += dt; wag = c.kind === 'dog'; if (Math.random() < dt * 1.5) heart(c.pos);
          if (c.meet > 0.2 && c.meet - dt <= 0.2) toast?.(`${pet.name} meets ${label(c)}. Sniff, sniff.`, 2400);
          if (c.meet > 3.2) { friends.push(label(c)); keep(); c.happy = 4; c.follow = 25; c.met = 1; sfx('arrive'); toast?.(`${pet.name} and ${c.name} are friends now.`, 3000); pet.cheer?.(3); dispatchEvent(new CustomEvent('bw:me', { detail: { played: 0.1 } })); }
        } else if (c.met === 0) { c.met = 1; c.happy = 3; c.follow = 25; c.act = 'zoomies'; c.actT = 2.5; pet.cheer?.(3); if (cool <= 0) { cool = 20; toast?.(`${c.name} spots ${pet.name} and bounds over: friends!`, 2600); } }
      } else { c.meet = Math.max(0, c.meet - dt * 0.5); if (dPet > 12) c.met = 0; }
      if (c.act === 'zoomies' && (c.actT -= dt) > 0 && petOn) { const a = t * 3.2; speed = step(c, pp.x + Math.cos(a) * 1.8, pp.z + Math.sin(a) * 1.8, 6, dt); tongue = true; wag = true; }
      else if (c.follow > 0 && petOn && dPet > 1.8 && dPet < 40) { c.follow -= dt; speed = step(c, pp.x - 1.2, pp.z - 0.8, dPet > 6 ? 6 : 2.6, dt); tongue = speed > 4; }
      else if (!(petOn && dPet < 3.2)) {
        // their own patch: wander, sit, lie about; back home when they have drifted
        c.follow = Math.max(0, c.follow - dt);
        c.wait -= dt;
        const away = Math.hypot(c.pos.x - c.home.x, c.pos.z - c.home.z);
        if (c.wait <= 0 || away > 14) { c.wait = 3 + rnd() * 7; c.goal = rnd() < 0.5 || away > 14 ? new THREE.Vector3(c.home.x + (rnd() - 0.5) * 8, 0, c.home.z + (rnd() - 0.5) * 8) : null; }
        if (c.goal) speed = step(c, c.goal.x, c.goal.z, 1.3, dt); else sit = 1;
      }
      c.model.position.set(c.pos.x, 0, c.pos.z);
      const P = c.model.userData; P.sit = (P.sit || 0) + ((speed < 0.05 ? sit : 0) - (P.sit || 0)) * (1 - Math.exp(-dt * 4));
      animatePet(c.model, dt, c.t, speed, { sit: P.sit, wag, tongue: tongue ? 1 : 0 });
    });
    hearts.forEach((q) => { q.t += dt; q.h.position.y += dt * 0.6; q.h.material.opacity = Math.max(0, 1 - q.t / 1.4); });
    for (let i = hearts.length - 1; i >= 0; i--) if (hearts[i].t > 1.4) { hearts[i].h.removeFromParent(); hearts.splice(i, 1); }
  }
  return {
    update, states: () => list.map((c) => ({ kind: c.kind, name: c.name, state: c.state, trust: +trustOf(label(c)).toFixed(2) })), nearDog: (p) => { if (!p) return false; let best = null, bd = 10; list.forEach((c) => { const d = Math.hypot(c.pos.x - p.x, c.pos.z - p.z); if (c.model.visible && d < bd && c.kind !== 'goat') { bd = d; best = c; } }); return best?.kind === 'dog'; }, // the nearest animal that eats is a dog get friends() { return friends.slice(); }, get count() { return list.length; }, debug: () => list.map((c) => ({ kind: c.kind, name: c.name, x: +c.pos.x.toFixed(1), z: +c.pos.z.toFixed(1), meet: +c.meet.toFixed(1), vis: c.model.visible })),
    bodies: () => list.filter((c) => c.model.visible).map((c) => ({ x: c.pos.x, z: c.pos.z, r: c.kind === 'chicken' ? 0.15 : 0.3 })),
    dispose() { group.removeFromParent(); },
  };
}
