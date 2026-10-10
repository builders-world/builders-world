import * as THREE from 'three';
import { createAvatarModel } from '../onboarding/avatar.js';
import { rigAvatar } from './anim.js';
import { C, FONT } from './uikit.js';
import { sfx } from './audio.js';
import { prepareLook, dress, lookFor } from './style.js';
const WOMEN = new Set(['Amaka', 'Zainab', 'Funke', 'Grace', 'Ifeoma', 'Halima']);

// The people of the district (world bible 11.5). Each resident has a home on a real street, a job at a
// real place on the map, a family, sometimes a pet, a personality, a dream, and a day that follows real
// Lagos time: the commute, the work, lunch, errands, the walk home. Life happens to them too: a baby, a
// promotion, a loss. Events are drawn from the date, so every player sees the same story on the same day.

const TRAITS = {
  hustler: { pace: 1.25, chat: 0.6, label: 'always in a hurry, always on a call' },
  cheerful: { pace: 1.0, chat: 1.0, label: 'greets everybody' },
  shy: { pace: 0.95, chat: 0.35, label: 'quiet, kind once you know them' },
  dreamer: { pace: 0.85, chat: 0.7, label: 'head in the clouds, notebook in hand' },
  grumpy: { pace: 1.1, chat: 0.45, label: 'complains about NEPA, means well' },
  elder: { pace: 0.7, chat: 0.9, label: 'everybody calls them Mummy or Baba' },
};
const PEOPLE = [
  { name: 'Chidi Okafor', age: 29, trait: 'hustler', job: 'Backend developer', at: 'work', tier: 1, color: '#c25b4a', style: 'hoodie', spouse: 'Ngozi', kids: [], pet: null, dream: 'Ship a fintech app that his mum can use without calling him' },
  { name: 'Amaka Eze', age: 34, trait: 'cheerful', job: 'Product designer', at: 'work', tier: 0, color: '#e0c36a', style: 'jacket', spouse: 'Tunde', kids: ['Zara'], pet: { kind: 'dog', name: 'Bingo' }, dream: 'Open a design school in Yaba for girls' },
  { name: 'Bayo Adeyemi', age: 41, trait: 'grumpy', job: 'Barista', at: 'cafe', tier: 1, color: '#5a7fb0', style: 'tee', spouse: 'Yetunde', kids: ['Tobi', 'Kemi'], pet: null, dream: 'Roast his own Nigerian-grown coffee' },
  { name: 'Zainab Bello', age: 26, trait: 'dreamer', job: 'Junior frontend developer', at: 'work', tier: 0, color: '#d9d2c3', style: 'jacket', spouse: null, kids: [], pet: { kind: 'cat', name: 'Pepper' }, dream: 'Speak at a conference in Nairobi' },
  { name: 'Emeka Nwosu', age: 38, trait: 'hustler', job: 'Suya seller', at: 'food', tier: 2, color: '#7fb35e', style: 'tee', spouse: 'Adaeze', kids: ['Chuka'], pet: null, dream: 'Three suya spots, one in Lekki' },
  { name: 'Funke Ajayi', age: 52, trait: 'elder', job: 'Provisions shop owner', at: 'shop', tier: 1, color: '#e98a6a', style: 'jacket', spouse: null, kids: ['Dapo', 'Bisi', 'Wale'], pet: null, dream: 'See her children graduate, every one of them' },
  { name: 'Kunle Bakare', age: 23, trait: 'shy', job: 'Yaba Tech student', at: 'work', tier: 2, color: '#4a64b0', style: 'hoodie', spouse: null, kids: [], pet: null, dream: 'Get his first remote job and buy his mother a fridge' },
  { name: 'Grace Okon', age: 31, trait: 'cheerful', job: 'Bank teller', at: 'atm', tier: 0, color: '#c9a7f5', style: 'jacket', spouse: 'Ime', kids: [], pet: { kind: 'dog', name: 'Lucky' }, dream: 'Leave banking and start a bakery' },
  { name: 'Musa Ibrahim', age: 45, trait: 'grumpy', job: 'Fuel station attendant', at: 'fuel', shift: 'night', tier: 2, color: '#f2b33d', style: 'tee', spouse: 'Hauwa', kids: ['Aisha', 'Umar', 'Sani'], pet: null, dream: 'Send Aisha to medical school' },
  { name: 'Ifeoma Chukwu', age: 28, trait: 'dreamer', job: 'Community organiser', at: 'board', tier: 1, color: '#2a9d94', style: 'hoodie', spouse: null, kids: [], pet: { kind: 'cat', name: 'Biscuit' }, dream: 'A playground on every street in Yaba' },
  { name: 'Segun Lawal', age: 35, trait: 'hustler', job: 'Danfo conductor', at: 'bus', tier: 2, color: '#e46f4f', style: 'tee', spouse: 'Tolu', kids: ['Femi'], pet: null, dream: 'Own the danfo instead of renting it' },
  { name: 'Halima Yusuf', age: 63, trait: 'elder', job: 'Retired teacher', at: 'board', tier: 1, color: '#a87950', style: 'jacket', spouse: null, kids: ['Rukayya', 'Bilal'], pet: { kind: 'cat', name: 'Mama Cat' }, dream: 'Teach one more child to read' },
];
// things that happen in a life, with how they feel and what is said about them
const EVENTS = [
  { id: 'baby', needs: (p) => p.spouse, mood: 0.9, days: 6, en: (p, k) => `${p.spouse} and I had a baby girl! We named her ${k}.`, pd: (p, k) => `God don bless us, ${p.spouse} born baby girl! Her name na ${k}.`, kid: true },
  { id: 'promotion', mood: 0.7, days: 3, en: () => 'Got promoted this week. Still can\'t believe it.', pd: () => 'Dem promote me o! Thank God.' },
  { id: 'shipped', needs: (p) => p.at === 'work', mood: 0.6, days: 2, en: () => 'We shipped the release last night. Finally!', pd: () => 'We don ship am! E work!' },
  { id: 'loss', mood: -0.8, days: 5, en: () => 'We buried my grandmother on Saturday. Keep us in your prayers.', pd: () => 'Na my grandma we bury Saturday. Pray for us.', grief: true },
  { id: 'rent', mood: -0.5, days: 3, en: () => 'Landlord raised the rent again. I\'m tired.', pd: () => 'Landlord don increase rent again. I tire o.' },
  { id: 'nepa', mood: -0.3, days: 1, en: () => 'No light since yesterday. My laptop is on 4%.', pd: () => 'NEPA take light since yesterday o.' },
  { id: 'pet', needs: (p) => !p.pet, mood: 0.5, days: 3, en: (p, k) => `I adopted a puppy! His name is ${k}.`, pd: (p, k) => `I don get small dog, ${k} be him name!`, newPet: true },
  { id: 'interview', mood: 0.3, days: 2, en: () => 'Final interview tomorrow. Wish me luck.', pd: () => 'Interview na tomorrow, abeg pray for me.' },
];
const BABY_NAMES = ['Ada', 'Ife', 'Tomi', 'Kamsi', 'Zina', 'Oyin', 'Ruth', 'Amara'], PUPPY = ['Rex', 'Toby', 'Bobby', 'Chief'];

// a stable random number from strings: the same person on the same day gets the same answer
const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

function petMesh(kind, color) {
  const fur = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const box = (w, h, d, x, y, z) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(x, y, z), fur);
  const g = new THREE.Group();
  const big = kind === 'dog' ? 1.35 : 1;
  g.add(box(0.18 * big, 0.16 * big, 0.42 * big, 0, 0.22 * big, 0), box(0.16 * big, 0.15 * big, 0.17 * big, 0, 0.33 * big, 0.27 * big));
  if (kind === 'dog') g.add(box(0.08, 0.08, 0.1, 0, 0.3, 0.42), box(0.05, 0.1, 0.03, -0.07, 0.43, 0.28), box(0.05, 0.1, 0.03, 0.07, 0.43, 0.28));
  else g.add(box(0.04, 0.06, 0.03, -0.05, 0.42, 0.27), box(0.04, 0.06, 0.03, 0.05, 0.42, 0.27));
  [[-0.06, 0.15], [0.06, 0.15], [-0.06, -0.15], [0.06, -0.15]].forEach(([x, z]) => g.add(box(0.05, 0.16 * big, 0.05, x * big, 0.08 * big, z * big)));
  const tail = box(0.035, 0.035, 0.26, 0, 0.32 * big, -0.3 * big); tail.rotation.x = kind === 'dog' ? -0.6 : 0.7; g.add(tail);
  g.userData.tail = tail;
  return g;
}

const CSS = `
#lk-life { position: fixed; right: 14px; bottom: 90px; z-index: 22; width: min(340px, calc(100vw - 28px)); padding: 16px 18px; border-radius: 22px; background: ${C.paper}; color: ${C.ink};
  font: 600 13.5px/1.45 ${FONT}; box-shadow: 0 5px 0 rgba(59,42,32,.2), 0 16px 40px rgba(10,14,30,.28); display: none; }
#lk-life.on { display: block; }
#lk-life h3 { margin: 0; font: 800 21px/1.1 ${FONT}; } #lk-life .sub { color: ${C.ink2}; margin: 2px 0 10px; }
#lk-life .now { padding: 8px 12px; border-radius: 14px; background: ${C.paper2}; margin-bottom: 8px; }
#lk-life .mood { display: inline-block; padding: 2px 10px; border-radius: 999px; font-weight: 800; margin-left: 4px; }
#lk-life dl { display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; margin: 8px 0 0; } #lk-life dt { color: ${C.teal}; font-weight: 800; } #lk-life dd { margin: 0; }
#lk-life .x { position: absolute; right: 12px; top: 10px; border: 0; background: none; font: 800 18px/1 ${FONT}; color: ${C.ink2}; cursor: pointer; }
body.bw-cine #lk-life { display: none; }
`;

export function createLives({ world, scene, getEnv, getPois, reduced, lowQuality, chat, interact, toast = () => {} }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const card = document.createElement('div'); card.id = 'lk-life'; document.body.appendChild(card);
  const group = new THREE.Group(); group.name = 'residents'; scene.add(group);
  const today = new Date().toISOString().slice(0, 10);
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

  // homes: real front doors; people live near the start so you meet them
  const doors = (world.doorPlants || []).slice().sort((a, b) => Math.hypot(a.x - world.spawn.x, a.z - world.spawn.z) - Math.hypot(b.x - world.spawn.x, b.z - world.spawn.z));
  const roster = PEOPLE.slice(0, lowQuality ? 6 : PEOPLE.length);
  const residents = roster.map((d, i) => {
    // home is the doorstep (not the planter beside it): where they go in and out, and where you knock
    const dp = doors[i * 2 + 1] || doors[i], home = dp?.step ? { ...dp.step } : dp ? { x: dp.x, z: dp.z } : { x: world.spawn.x + i, z: world.spawn.z };
    const av = createAvatarModel({ color: d.color, style: d.style });
    if (d.trait === 'elder') av.root.scale.setScalar(0.96);
    prepareLook(av.root);
    const rig = rigAvatar(av.root);
    dress(av.root, lookFor(d.name, { fem: WOMEN.has(d.name.split(' ')[0]), elder: d.trait === 'elder' || d.age > 50, tier: d.tier }), rig); // everyone dresses their own way (style.js)
    av.root.position.set(home.x, 0, home.z);
    group.add(av.root);
    let street = null, sd = 1e9; world.roads.forEach((rd) => { if (!rd.name) return; rd.pts.forEach(([x, z]) => { const dd = Math.hypot(x - home.x, z - home.z); if (dd < sd) { sd = dd; street = rd.name; } }); });
    home.addr = dp?.addr || (street ? `${1 + Math.floor(hash(d.name) * 40)} ${street}` : null); // the estate address when there is one
    const r = { ...d, id: d.name.split(' ')[0], first: d.name.split(' ')[0], home, obj: av.root, rig, kids: [...d.kids], pet: d.pet && { ...d.pet }, path: null, at0: 0, task: 'home', goal: null, mood: 0.2, reason: '', events: [], seed: hash(d.name), wait: 2 + i * 1.5, late: false };
    // life events from the last week, drawn from the date: everyone sees the same story on the same day
    for (let n = 6; n >= 0; n--) {
      const roll = hash(`${d.name}|${day(n)}`);
      if (roll > 0.16) continue;
      const pool = EVENTS.filter((e) => !e.needs || e.needs(r));
      const e = pool[Math.floor(hash(`${d.name}|${day(n)}|e`) * pool.length)];
      if (!e || n >= e.days) continue;
      const k = e.kid ? BABY_NAMES[Math.floor(roll * 100) % BABY_NAMES.length] : e.newPet ? PUPPY[Math.floor(roll * 100) % PUPPY.length] : null;
      if (e.kid) r.kids.push(`baby ${k}`);
      if (e.newPet) r.pet = { kind: 'dog', name: k };
      r.events.push({ ...e, k, ago: n });
    }
    const latest = r.events[r.events.length - 1];
    r.mood = latest ? latest.mood * (1 - latest.ago / (latest.days + 1)) : 0.15 + (r.trait === 'cheerful' ? 0.3 : r.trait === 'grumpy' ? -0.25 : 0);
    r.reason = latest ? (latest.grief ? 'grieving' : latest.mood > 0 ? 'happy news' : 'a hard week') : '';
    if (r.pet) { r.petObj = petMesh(r.pet.kind, r.pet.kind === 'dog' ? 0xb9875a : 0x2b2b2e); r.petObj.position.set(home.x + 0.8, 0, home.z); group.add(r.petObj); }
    if (r.kids.some((k) => !k.startsWith('baby')) && r.trait !== 'elder') { const kid = createAvatarModel({ color: '#f6a8a0', style: 'tee' }); kid.root.scale.setScalar(0.62); r.kidRig = rigAvatar(kid.root); r.kidObj = kid.root; kid.root.visible = false; group.add(kid.root); }
    const it = { id: `life:${r.id}`, label: `Talk to ${r.first}`, x: home.x, z: home.z, r: 2.4 };
    interact.push(it); r.it = it;
    // their front door: anyone can knock; nobody goes in unless they are invited
    r.doorIt = { id: `knock:${r.id}`, label: `Knock on ${r.first}'s door`, x: home.x, z: home.z, r: 1.7 };
    interact.push(r.doorIt);
    r.inside = true; r.obj.visible = false;
    chat?.add({ id: r.id, name: r.first, obj: r.obj, rig: r.rig, tier: r.tier, life: r });
    return r;
  });

  // ---------- the day: where should this person be now? ----------
  const poisOf = (k) => (getPois() || []).filter((q) => q.kind === k);
  const nearest = (list, p) => list.slice().sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
  const workplace = (r) => r.work || (r.work = nearest(poisOf(r.at).length ? poisOf(r.at) : poisOf('work'), r.home) || r.home);
  function plan(r, hour) {
    const start = 7 + r.seed * 1.5, end = 17 + r.seed * 2, lunch = 12 + ((r.seed * 7) % 1) * 2;
    const tiedToPost = ['food', 'shop', 'fuel', 'bus', 'atm'].includes(r.at); // they eat at work
    const errands = [poisOf('food'), poisOf('shop'), poisOf('atm'), poisOf('cafe')].flat();
    // night shift: the fuel station never closes, so its attendant works 7 pm to 7 am
    if (r.shift === 'night') {
      if (hour >= 19 || hour < 6.5) return { task: 'work', to: workplace(r), label: `Night shift at ${workplace(r).name || 'work'}` };
      if (hour < 7.2) return { task: 'homeward', to: r.home, label: 'Walking home after the night shift' };
      return { task: 'home', to: r.home, label: 'Asleep after the night shift' };
    }
    // everyone else is in bed by ten and up with the light
    if (hour >= 22 || hour < start - 0.4) return { task: 'home', to: r.home, label: hour < 12 ? 'Asleep, the alarm is set for six' : 'In bed' };
    if (hour >= Math.min(21, end + 2.5)) return { task: 'homeward', to: r.home, label: 'Heading home to sleep' };
    if (hour < start) return { task: 'commute', to: workplace(r), label: `Getting ready, then off to work as ${r.job.toLowerCase()}` };
    if (!tiedToPost && Math.abs(hour - lunch) < 0.4) { const f = nearest(poisOf('food'), workplace(r)) || workplace(r); return { task: 'lunch', to: f, label: `Lunch break at ${f.name || 'the food spot'}` }; }
    if (hour > end) {
      // after work, some go to play: the skate park, the water park, the garden, the picnic lawn
      const parks = poisOf('park');
      if (parks.length && hash(`${r.name}|${today}|play`) < 0.55 && hour < end + 2) { const pk = parks[Math.floor(hash(`${r.name}|${today}|pk`) * parks.length)]; return { task: 'errand', to: pk, label: `Unwinding at ${pk.name}${r.kids.length ? ` with ${r.kids[0]}` : ''}` }; }
      const e = errands[Math.floor(hash(`${r.name}|${today}|${Math.floor(hour)}`) * errands.length)];
      if (hour < end + 1 && e) return { task: 'errand', to: e, label: `Picking something up at ${e.name}` };
      return { task: 'homeward', to: r.home, label: `On the way home to ${r.spouse || (r.kids.length ? 'the kids' : 'a quiet evening')}` };
    }
    // working; now and then a quick errand
    const slot = Math.floor(hour * 3);
    if (hash(`${r.name}|${today}|${slot}`) < 0.18 && errands.length) { const e = errands[Math.floor(hash(`${r.name}|${slot}|w`) * errands.length)]; return { task: 'errand', to: e, label: `Quick run to ${e.name}` }; }
    const far = Math.hypot(r.obj.position.x - workplace(r).x, r.obj.position.z - workplace(r).z) > 25;
    return { task: 'work', to: workplace(r), label: far ? `Running late for work at ${workplace(r).name || 'the hub'}!` : `At work: ${r.job.toLowerCase()} at ${workplace(r).name || 'the hub'}` };
  }

  function go(r, to) {
    const p = world.plan?.(r.obj.position, to);
    r.path = p && p.length > 1 ? p : [{ x: to.x, z: to.z }]; r.at0 = 1; r.goal = to; r.stuck = 0;
  }

  let clock = 0, think = 0;
  const v = new THREE.Vector3();
  function update(dt, t, player) {
    clock += dt; think -= dt;
    const env = getEnv?.() || {};
    const hour = env.hour ?? 12;
    if (think <= 0) {
      think = 1.5;
      residents.forEach((r) => {
        const p = plan(r, hour);
        r.doing = p.label;
        if (p.task !== r.task || !r.goal || Math.hypot(p.to.x - r.goal.x, p.to.z - r.goal.z) > 1) {
          r.task = p.task;
          // late? the commute starts after their start time, so they hurry
          r.late = p.task === 'commute' ? false : (p.task === 'work' && Math.hypot(r.obj.position.x - p.to.x, r.obj.position.z - p.to.z) > 25);
          go(r, p.to);
        }
      });
    }
    residents.forEach((r) => {
      const T = TRAITS[r.trait];
      let speed = 0;
      if (r.path && !reduced) {
        while (r.at0 < r.path.length - 1 && Math.hypot(r.path[r.at0].x - r.obj.position.x, r.path[r.at0].z - r.obj.position.z) < 0.7) r.at0++;
        const aim = r.path[Math.min(r.at0, r.path.length - 1)];
        const dx = aim.x - r.obj.position.x, dz = aim.z - r.obj.position.z, d = Math.hypot(dx, dz);
        const arrived = r.at0 >= r.path.length - 1 && d < 1.2;
        if (!arrived) {
          // pace: personality, mood (sad people walk slower), urgency (late people run)
          const pace = (r.late ? 4.6 : 1.25) * T.pace * (r.mood < -0.4 ? 0.8 : 1);
          const prev = v.copy(r.obj.position);
          r.obj.position.x += (dx / d) * pace * dt; r.obj.position.z += (dz / d) * pace * dt;
          world.resolve(r.obj.position, 0.35, 0);
          speed = r.obj.position.distanceTo(prev) / Math.max(dt, 1e-4);
          if (speed < pace * 0.2) { r.stuck += dt; if (r.stuck > 1.5) { go(r, r.goal); } } else r.stuck = 0;
          const want = Math.atan2(dx, dz), dh = Math.atan2(Math.sin(want - r.obj.rotation.y), Math.cos(want - r.obj.rotation.y));
          r.obj.rotation.y += dh * (1 - Math.exp(-dt * 8));
        } else { r.path = null; r.late = false; }
      }
      // someone walking into them: they step aside, as people do, so nobody is ever stuck behind a resident
      const pd = Math.hypot(player.x - r.obj.position.x, player.z - r.obj.position.z);
      if (pd < 1.0 && pd > 0.01 && speed < 0.5) {
        const ax = r.obj.position.x - player.x, az = r.obj.position.z - player.z;
        r.obj.position.x += (ax / pd) * dt * 2.2 - (az / pd) * dt * 1.2; r.obj.position.z += (az / pd) * dt * 2.2 + (ax / pd) * dt * 1.2;
        world.resolve(r.obj.position, 0.35, 0);
      }
      // home: they reach the doorstep, turn to the door and go in; they come out of it when they leave
      const homeTask = r.task === 'home' || r.task === 'homeward';
      if (r.answering > 0) { r.answering -= dt; if (r.answering <= 0 && homeTask) { r.inside = true; r.invited = 0; } }
      else if (homeTask && !r.path && Math.hypot(r.obj.position.x - r.home.x, r.obj.position.z - r.home.z) < 1.6) {
        if (!r.inside) {
          r.goingIn = (r.goingIn || 0) + dt;
          const want = (r.home.ry ?? 0) + Math.PI, dh = Math.atan2(Math.sin(want - r.obj.rotation.y), Math.cos(want - r.obj.rotation.y));
          r.obj.rotation.y += dh * (1 - Math.exp(-dt * 10));
          if (r.goingIn > 0.6) { r.inside = true; r.goingIn = 0; }
        }
      } else if (r.inside && !homeTask) { r.inside = false; r.obj.position.set(r.home.x, 0, r.home.z); r.obj.rotation.y = r.home.ry ?? 0; }
      if (r.visiting) r.inside = true; // you are in their living room with them
      r.obj.visible = !r.inside;
      r.doorIt.label = r.invited > clock ? `Go in: ${r.first} invited you` : `Knock on ${r.first}'s door`;
      r.doorIt.id = r.invited > clock ? `visit:${r.id}` : `knock:${r.id}`;
      r.rig?.update(dt, { speed, running: r.late, t, slump: r.mood < -0.4 ? 1 : 0 });
      r.it.x = r.obj.position.x; r.it.z = r.obj.position.z; r.it.r = r.obj.visible && !(r.answering > 0) ? 2.4 : 0; // at the door, the door is what E is for
      // the pet trots behind; the eldest child comes along on the walk home
      if (r.petObj) {
        const behind = v.set(r.obj.position.x - Math.sin(r.obj.rotation.y) * 1.1 + 0.5, 0, r.obj.position.z - Math.cos(r.obj.rotation.y) * 1.1);
        const dx = behind.x - r.petObj.position.x, dz = behind.z - r.petObj.position.z, d = Math.hypot(dx, dz);
        r.petObj.visible = r.obj.visible && (r.task !== 'work' || d > 0.3);
        if (d > 0.25) { const s = Math.min(d, dt * Math.max(1.5, speed * 1.1)); r.petObj.position.x += (dx / d) * s; r.petObj.position.z += (dz / d) * s; const want = Math.atan2(dx, dz), dh = Math.atan2(Math.sin(want - r.petObj.rotation.y), Math.cos(want - r.petObj.rotation.y)); r.petObj.rotation.y += dh * (1 - Math.exp(-dt * 8)); }
        r.petObj.userData.tail.rotation.y = Math.sin(t * (speed > 0.2 ? 10 : 3)) * 0.5;
      }
      if (r.kidObj) {
        const show = r.obj.visible && (r.task === 'homeward' || r.task === 'errand' && hour > 15);
        r.kidObj.visible = show;
        if (show) { r.kidObj.position.set(r.obj.position.x + Math.cos(r.obj.rotation.y) * 0.7, 0, r.obj.position.z - Math.sin(r.obj.rotation.y) * 0.7); r.kidObj.rotation.y = r.obj.rotation.y; r.kidRig?.update(dt, { speed, t }); }
      }
    });
  }

  // ---------- what they say, which now comes from their life ----------
  const sp = (r) => (Math.random() < [0.1, 0.5, 0.9][r.tier] ? 'pd' : 'en');
  function lifeLine(r) {
    const e = r.events[r.events.length - 1];
    if (e && Math.random() < 0.55) return e[sp(r)](r, e.k);
    if (r.late) return sp(r) === 'pd' ? 'I don late o! Abeg excuse me!' : 'Sorry, running late for work!';
    if (r.task === 'lunch') return sp(r) === 'pd' ? 'Hunger dey catch me, I dey go chop.' : 'Off to grab some lunch.';
    if (r.task === 'homeward' && r.kids.length) return sp(r) === 'pd' ? `I dey go pick ${r.kids[0]} for house.` : `Heading home to ${r.kids[0]}.`;
    if (Math.random() < 0.4) return sp(r) === 'pd' ? `One day, I go ${r.dream.charAt(0).toLowerCase() + r.dream.slice(1)}.` : `One day I'll ${r.dream.charAt(0).toLowerCase() + r.dream.slice(1)}.`;
    return null;
  }
  const moodWord = (m) => (m > 0.55 ? ['Overjoyed', '#3fbf6d'] : m > 0.2 ? ['Good', '#7fb35e'] : m > -0.2 ? ['Okay', '#f2b33d'] : m > -0.5 ? ['Frustrated', '#e98a6a'] : ['Sad', '#7d5aa6']);
  function talk(id) {
    const r = residents.find((x) => `life:${x.id}` === id); if (!r) return false;
    r.met = true;
    const [mw, mc] = moodWord(r.mood);
    const e = r.events[r.events.length - 1];
    card.innerHTML = `<button class="x" aria-label="Close">×</button><h3>${r.name}</h3><div class="sub">${r.age} · ${r.job} · ${TRAITS[r.trait].label}</div>
      <div class="now">${r.doing || 'Out and about'}<br>Feeling <span class="mood" style="background:${mc}22;color:${mc}">${mw}</span>${r.reason ? ` · ${r.reason}` : ''}</div>
      <dl>${r.spouse ? `<dt>Family</dt><dd>Married to ${r.spouse}${r.kids.length ? `; ${r.kids.join(', ')}` : ''}</dd>` : r.kids.length ? `<dt>Family</dt><dd>${r.kids.join(', ')}</dd>` : '<dt>Family</dt><dd>Single, close to their mum</dd>'}
      ${r.pet ? `<dt>Pet</dt><dd>${r.pet.name}, a ${r.pet.kind}</dd>` : ''}
      <dt>Lives</dt><dd>${r.home.addr || 'just off the main road'}</dd><dt>Dream</dt><dd>${r.dream}</dd>
      ${e ? `<dt>This week</dt><dd>${e.en(r, e.k)}</dd>` : ''}</dl>`;
    card.classList.add('on'); card.querySelector('.x').onclick = () => card.classList.remove('on');
    clearTimeout(talk.t); talk.t = setTimeout(() => card.classList.remove('on'), 14000);
    const line = lifeLine(r) || (sp(r) === 'pd' ? 'How far? I dey o.' : 'Hello! Good to see you.');
    chat?.sayFrom?.(r.obj, line, r.first);
    if (r.mood > 0.5) r.rig?.play?.('cheer'); else if (r.mood < -0.4) r.rig?.play?.('thanks'); else r.rig?.wave?.();
    return true;
  }
  // knocking: nobody home, asleep, or they come to the door and maybe ask you in
  function knock(id) {
    const r = residents.find((x) => `knock:${x.id}` === id); if (!r) return false;
    sfx('knock');
    const pd = sp(r) === 'pd';
    setTimeout(() => {
      if (!r.inside || r.answering > 0) { toast(`No answer. ${r.first} is out: ${(r.doing || 'out and about').replace(/^./, (c) => c.toLowerCase())}.`, 3600); return; }
      if (/Asleep|In bed/.test(r.doing || '')) { toast(`From inside, sleepily: "${pd ? 'Who dey knock this late? Abeg come back tomorrow.' : 'Who is it? It is late, come back tomorrow.'}"`, 4200); return; }
      // they open the door
      r.inside = false; r.answering = 9; r.obj.position.set(r.home.x, 0, r.home.z); r.obj.rotation.y = r.home.ry ?? 0; r.obj.visible = true;
      const welcome = r.met || r.mood > -0.1 ? hash(`${r.name}|${today}|door`) < (r.met ? 0.95 : 0.7) : false;
      if (welcome) {
        r.invited = clock + 25; r.answering = 25;
        chat?.sayFrom?.(r.obj, pd ? 'Ah, na you! Come in, come in.' : 'Oh, hello! Come in, come in.', r.first);
        toast(`${r.first} invites you in. Press E at the door to go in.`, 3600);
      } else {
        chat?.sayFrom?.(r.obj, pd ? 'Not today o, I dey rest. Catch me outside tomorrow.' : 'Not today, I am resting. Catch me outside tomorrow!', r.first);
      }
      r.met = true;
      r.rig?.wave?.();
    }, 1300);
    return true;
  }
  // going in as a guest: what the house needs to know about who lives there
  function visit(id) {
    const r = residents.find((x) => `visit:${x.id}` === id); if (!r || !(r.invited > clock)) return null;
    r.visiting = true; r.invited = 0; r.answering = 0;
    return { id: r.id, first: r.first, name: r.name, job: r.job, color: r.color, style: r.style, look: r.obj.userData.look, fem: WOMEN.has(r.first), spouse: r.spouse, kids: r.kids, pet: r.pet, dream: r.dream, pidgin: sp(r) === 'pd', door: { ...r.home } };
  }
  function leaveVisit(id) { const r = residents.find((x) => x.id === id); if (r) r.visiting = false; }
  const bodies = () => residents.filter((r) => r.obj.visible).map((r) => ({ x: r.obj.position.x, z: r.obj.position.z, r: 0.33 }));
  function dispose() { group.removeFromParent(); card.remove(); style.remove(); }
  return { update, talk, knock, visit, leaveVisit, lifeLine, bodies, residents, people: residents.map((r) => ({ id: r.id, name: r.first, obj: r.obj, rig: r.rig, tier: r.tier })), dispose };
}
