import * as THREE from 'three';
import { walletEngine, effortsMark, fmt } from './wallet.js';
import { sfx } from './audio.js';
import { C, FONT } from './uikit.js';

// Pets (world bible 11.7): adopt a dog or a cat from the Yaba Animal Shelter (phone, Pets), pick a
// breed and a name, and it goes everywhere with you. E to pet it. G throws a ball (dogs fetch, cats
// watch it go), L points a laser on the ground (cats lose their minds), Y whistles it back to you.

export const BREEDS = {
  dog: [
    { id: 'awuku', name: 'Nigerian local (Awuku)', fur: '#c48a4e', patch: '#f1e2c6', size: 1.0, ears: 'up', snout: 1.0, tail: 'curl' },
    { id: 'boerboel', name: 'Boerboel', fur: '#b98a52', patch: '#3a2a1e', size: 1.35, ears: 'flop', snout: 0.8, tail: 'straight' },
    { id: 'gsd', name: 'German Shepherd', fur: '#a86b33', patch: '#1d1a17', size: 1.25, ears: 'up', snout: 1.25, tail: 'bush' },
    { id: 'lab', name: 'Labrador', fur: '#e2c48a', patch: '#e2c48a', size: 1.2, ears: 'flop', snout: 1.0, tail: 'straight' },
    { id: 'poodle', name: 'Poodle', fur: '#f4ede0', patch: '#f4ede0', size: 0.85, ears: 'flop', snout: 1.1, tail: 'pom', fluff: true },
  ],
  cat: [
    { id: 'tabby', name: 'Tabby', fur: '#b0784a', patch: '#6b4428', size: 1.0, ears: 'up', snout: 0.5, tail: 'long', stripes: true },
    { id: 'black', name: 'Black cat', fur: '#1f1d1f', patch: '#1f1d1f', size: 1.0, ears: 'up', snout: 0.5, tail: 'long' },
    { id: 'calico', name: 'Calico', fur: '#f2ece0', patch: '#d07a3a', size: 0.95, ears: 'up', snout: 0.5, tail: 'long', spots: true },
    { id: 'siamese', name: 'Siamese', fur: '#efe2cc', patch: '#4a3628', size: 0.95, ears: 'up', snout: 0.55, tail: 'long', points: true },
    { id: 'persian', name: 'Persian', fur: '#d9d2c8', patch: '#d9d2c8', size: 1.05, ears: 'up', snout: 0.35, tail: 'bush', fluff: true },
  ],
};
const NAMES = { dog: ['Bingo', 'Simba', 'Rex', 'Lucky', 'Bobo', 'Oga', 'Dudu', 'Jollof'], cat: ['Mimi', 'Puff-puff', 'Kitty', 'Ade', 'Zobo', 'Shadow', 'Moyo', 'Chin-chin'] };
const FEE = 300;
const clean = (p) => {
  if (!p || !BREEDS[p.kind]) return null;
  const br = BREEDS[p.kind].find((b) => b.id === p.breed) || BREEDS[p.kind][0];
  return { kind: p.kind, breed: br.id, name: String(p.name || '').replace(/[<>&"]/g, '').trim().slice(0, 16) || NAMES[p.kind][0] };
};

// a pet with legs that walk, a head, ears and a tail for its breed
export function petModel(kind, breedId) {
  const br = BREEDS[kind].find((b) => b.id === breedId) || BREEDS[kind][0], dog = kind === 'dog', k = br.size * (dog ? 1.15 : 0.85);
  const fur = new THREE.MeshStandardMaterial({ color: br.fur, roughness: br.fluff ? 1 : 0.9, flatShading: !!br.fluff });
  const patch = new THREE.MeshStandardMaterial({ color: br.patch, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.5 });
  const B = (w, h, d, m = fur) => new THREE.Mesh(br.fluff ? new THREE.IcosahedronGeometry(0.5, 1).scale(w, h, d) : new THREE.BoxGeometry(w, h, d), m);
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const legH = 0.17 * k, bodyY = legH + 0.08 * k;
  const torso = B(0.2 * k, 0.17 * k, 0.44 * k); torso.position.y = bodyY; body.add(torso);
  if (br.points || br.stripes || br.spots || dog) {
    const marks = br.stripes ? [-0.12, 0, 0.12].map((z) => { const m = B(0.205 * k, 0.04 * k, 0.04 * k, patch); m.position.set(0, bodyY + 0.07 * k, z * k); return m; })
      : br.spots ? [[0.05, 0.08, 0.1], [-0.06, 0.06, -0.08]].map(([x, y, z]) => { const m = B(0.1 * k, 0.06 * k, 0.12 * k, patch); m.position.set(x * k, bodyY + y * k, z * k); return m; })
        : dog && br.patch !== br.fur ? [(() => { const m = B(0.205 * k, 0.07 * k, 0.26 * k, patch); m.position.set(0, bodyY + 0.06 * k, -0.04 * k); return m; })()] : [];
    marks.forEach((m) => body.add(m));
  }
  const head = new THREE.Group(); head.position.set(0, bodyY + 0.1 * k, 0.24 * k); body.add(head);
  head.add(B(0.17 * k, 0.15 * k, 0.16 * k));
  const snout = B(0.1 * k, 0.08 * k, 0.09 * k * br.snout + 0.02, br.points ? patch : fur); snout.position.set(0, -0.025 * k, 0.1 * k + 0.04 * k * br.snout); head.add(snout);
  const nose = B(0.035 * k, 0.03 * k, 0.02, dark); nose.position.set(0, -0.005 * k, snout.position.z + 0.045 * k * br.snout + 0.01); head.add(nose);
  // a tongue, out when panting or begging (dogs)
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.04 * k, 0.012 * k, 0.07 * k), new THREE.MeshStandardMaterial({ color: 0xe36a7a, roughness: 0.6 }));
  tongue.position.set(0, -0.06 * k, snout.position.z + 0.02 * k); tongue.rotation.x = 0.5; tongue.visible = false; head.add(tongue);
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014 * k, 6, 4), dark); eye.position.set(s * 0.045 * k, 0.025 * k, 0.081 * k); head.add(eye);
    const ear = B(0.05 * k, br.ears === 'up' ? 0.08 * k : 0.09 * k, 0.025 * k, br.points ? patch : fur);
    if (br.ears === 'up') { ear.position.set(s * 0.055 * k, 0.1 * k, -0.02 * k); ear.rotation.z = s * -0.2; } else { ear.position.set(s * 0.095 * k, 0.0, -0.01 * k); ear.rotation.z = s * 0.25; }
    head.add(ear);
  });
  const legs = [[-0.065, 0.15], [0.065, 0.15], [-0.065, -0.15], [0.065, -0.15]].map(([x, z]) => {
    const pivot = new THREE.Group(); pivot.position.set(x * k, legH, z * k); body.add(pivot);
    const leg = B(0.05 * k, legH, 0.05 * k, br.points ? patch : fur); leg.position.y = -legH / 2; pivot.add(leg);
    return pivot;
  });
  const tail = new THREE.Group(); tail.position.set(0, bodyY + 0.06 * k, -0.22 * k); body.add(tail);
  const tl = br.tail === 'long' ? 0.3 : br.tail === 'curl' ? 0.16 : 0.22;
  const tm = B(br.tail === 'bush' ? 0.07 * k : 0.035 * k, br.tail === 'bush' ? 0.07 * k : 0.035 * k, tl * k, br.points ? patch : fur); tm.position.z = -tl * k / 2; tail.add(tm);
  if (br.tail === 'pom') { const pom = B(0.08 * k, 0.08 * k, 0.08 * k); pom.position.z = -tl * k; tail.add(pom); }
  tail.rotation.x = br.tail === 'curl' ? -1.1 : dog ? -0.5 : 0.6;
  g.userData = { body, head, legs, tail, tongue, legH, bodyY, k, tailRest: tail.rotation.x, kind };
  return g;
}

// one animation step. Poses (0..1 each): sit, lie (down, chin on paws), beg (up on the hind legs, paws
// out to you), bow (the play bow: front down, tail end up), scratch (a hind leg at the ear), plus hop
// (metres of a jump) and tongue (panting). Whatever the pose, the lowest point is set on the ground, so
// nothing sinks into it (a sitting dog used to pivot about a point at ground level and lose its rear).
const _box = new THREE.Box3();
export function animatePet(g, dt, t, speed, { sit = 0, wag = 0, lie = 0, beg = 0, bow = 0, scratch = 0, hop = 0, tongue = 0 } = {}) {
  const u = g.userData, phase = t * (6 + speed * 3), moving = speed > 0.05;
  // the gait: diagonal pairs, and a little side to side roll that grows with speed (the trot's waddle)
  u.legs.forEach((l, i) => { l.rotation.set(moving ? Math.sin(phase + (i === 0 || i === 3 ? 0 : Math.PI)) * Math.min(0.8, 0.3 + speed * 0.12) : 0, 0, 0); });
  u.body.rotation.set(0, 0, moving ? Math.sin(phase) * Math.min(0.08, 0.02 + speed * 0.01) : 0);
  u.body.position.set(0, 0, 0);
  // sit: the back end down (tilt about the hips), back legs folded forward, front legs kept upright
  // (a negative tilt lifts the front: sitting a little, begging a lot; the play bow puts the front down)
  const tilt = -0.5 * sit - 1.05 * beg + 0.3 * bow, flat = lie;
  u.body.rotation.x = tilt * (1 - flat);
  u.legs[2].rotation.x += -1.25 * sit - 1.4 * flat + 1.05 * beg - 0.3 * bow; u.legs[3].rotation.x += -1.25 * sit - 1.4 * flat + 1.05 * beg - 0.3 * bow;
  u.legs[0].rotation.x += 0.5 * sit + 1.45 * flat + 0.2 * beg - 1.25 * bow; u.legs[1].rotation.x += 0.5 * sit + 1.45 * flat + 0.45 * beg - 1.25 * bow;
  if (scratch) { u.legs[3].rotation.x = -1.6 * scratch + Math.sin(t * 28) * 0.25 * scratch; u.legs[3].rotation.z = -0.5 * scratch; }
  u.head.rotation.set(0.35 * sit + 0.8 * beg + 0.3 * flat - 0.25 * bow + 0.4 * scratch, 0, 0.25 * scratch);
  u.tail.rotation.y = Math.sin(t * (wag ? 16 : 3)) * (wag ? 0.7 : 0.25);
  u.tail.rotation.x = u.tailRest - 0.5 * bow;
  if (u.tongue) { u.tongue.visible = tongue > 0.3; u.tongue.position.y = -0.06 * u.k - 0.012 * u.k * Math.abs(Math.sin(t * 9)); }
  // ground: the lowest point of the posed body sits on y = 0, then any hop lifts it
  g.updateMatrixWorld(true); _box.setFromObject(u.body);
  u.body.position.y = (g.position.y - _box.min.y) + hop + (moving ? Math.abs(Math.sin(phase)) * 0.015 : 0);
}

const CSS = `
#lk-pets { position: fixed; inset: 0; z-index: 36; display: none; place-items: center; background: rgba(20,16,12,.45); font-family: ${FONT}; color: ${C.ink}; }
#lk-pets.on { display: grid; }
#lk-pets .box { width: min(460px, calc(100vw - 32px)); max-height: calc(100vh - 40px); overflow-y: auto; padding: 22px; border-radius: 26px; background: ${C.paper}; box-shadow: 0 6px 0 rgba(59,42,32,.25), 0 30px 70px rgba(10,14,30,.35); }
#lk-pets h3 { margin: 0; font: 800 22px/1.1 ${FONT}; } #lk-pets .sub { color: ${C.ink2}; margin: 4px 0 10px; font: 600 14px/1.4 ${FONT}; }
#lk-pets label { display: block; margin: 12px 0 6px; font: 800 12px/1 ${FONT}; letter-spacing: .08em; text-transform: uppercase; color: ${C.ink2}; }
#lk-pets .chips { display: flex; flex-wrap: wrap; gap: 6px; } #lk-pets .chips button { border: 2px solid #e3d4b4; border-radius: 999px; padding: 8px 13px; background: #fffaf0; color: ${C.ink}; font: 700 14px/1 ${FONT}; cursor: pointer; }
#lk-pets .chips button.on { border-color: ${C.teal}; background: #e2f3ef; }
#lk-pets input { width: 100%; box-sizing: border-box; border: 2px solid #e3d4b4; border-radius: 14px; padding: 10px 14px; background: #fffaf0; color: ${C.ink}; font: 700 16px/1 ${FONT}; }
#lk-pets .row { display: flex; gap: 8px; margin-top: 16px; } #lk-pets .row button { flex: 1; border: 0; border-radius: 999px; padding: 12px; font: 800 15px/1 ${FONT}; cursor: pointer; background: #eadfc6; color: ${C.ink}; } #lk-pets .row .go { background: ${C.teal}; color: #fff; }
#lk-pets svg { display: inline-block; vertical-align: -2px; }
#lk-petbar { position: fixed; left: 14px; bottom: 214px; z-index: 15; display: none; gap: 6px; align-items: center; padding: 6px 8px 6px 12px; border-radius: 999px; background: ${C.paper}; color: ${C.ink}; font: 800 13px/1 ${FONT}; box-shadow: 0 3px 0 rgba(59,42,32,.2); }
#lk-petbar.on { display: flex; } #lk-petbar button { border: 0; border-radius: 999px; padding: 6px 10px; background: ${C.paper2}; color: ${C.ink}; font: 800 12px/1 ${FONT}; cursor: pointer; } #lk-petbar button b { color: ${C.teal}; margin-right: 3px; }
body.nohud #lk-petbar, body.bw-cine #lk-petbar { display: none; }
`;

export function createPets({ scene, camera, world, toast, isIndoors }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const panel = document.createElement('div'); panel.id = 'lk-pets'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Animal shelter'); document.body.appendChild(panel);
  const bar = document.createElement('div'); bar.id = 'lk-petbar'; document.body.appendChild(bar);
  const group = new THREE.Group(); group.name = 'pets'; scene.add(group);
  const store = { get() { try { return clean(JSON.parse(localStorage.getItem('bw-pet') || 'null')); } catch { return null; } }, set(v) { try { localStorage.setItem('bw-pet', JSON.stringify(v)); } catch { /* */ } } };
  let stuckFor = 0, lastGap = 0, pet = store.get(), model = null, state = 'follow', target = null, love = 0, toy = null, laser = null, hearts = [], lastPlayer = new THREE.Vector3(), t = 0;
  const pos = new THREE.Vector3(), vel = new THREE.Vector3();

  function spawn(at) {
    model?.removeFromParent();
    if (!pet) { bar.classList.remove('on'); return; }
    model = petModel(pet.kind, pet.breed); group.add(model);
    pos.set(at.x + 1, 0, at.z - 1); model.position.copy(pos);
    bar.innerHTML = `<span>${pet.name}</span><button data-a="pet"><b>E</b>Pet</button><button data-a="ball"><b>G</b>Ball</button><button data-a="laser"><b>L</b>Laser</button><button data-a="whistle"><b>Y</b>Whistle</button>`;
    bar.querySelectorAll('button').forEach((b) => { b.onclick = () => act(b.dataset.a); });
    bar.classList.add('on');
  }

  // ---------- the shelter ----------
  function openShelter() {
    const st = { kind: pet?.kind || 'dog', breed: pet?.breed || 'awuku', name: pet?.name || '' };
    const render = (err = '') => {
      const list = BREEDS[st.kind]; if (!list.some((b) => b.id === st.breed)) st.breed = list[0].id;
      panel.innerHTML = `<div class="box"><h3>Yaba Animal Shelter</h3><div class="sub">${pet ? `You have ${pet.name}. Adopting again rehomes them with a good family.` : `Every animal here needs a home. Adoption is ${effortsMark(13)}${fmt(FEE)}, for the vet check.`}</div>
        <label>Dog or cat</label><div class="chips">${['dog', 'cat'].map((k) => `<button data-k="${k}" class="${st.kind === k ? 'on' : ''}">${k === 'dog' ? 'Dog' : 'Cat'}</button>`).join('')}</div>
        <label>Breed</label><div class="chips">${list.map((b) => `<button data-b="${b.id}" class="${st.breed === b.id ? 'on' : ''}">${b.name}</button>`).join('')}</div>
        <label for="lk-pet-name">Name</label><input id="lk-pet-name" maxlength="16" value="${st.name}" placeholder="${NAMES[st.kind][0]}">
        <div class="chips" style="margin-top:6px">${NAMES[st.kind].map((n) => `<button data-n="${n}">${n}</button>`).join('')}</div>
        <div class="sub" style="color:#c0392b;min-height:18px;margin-top:8px">${err}</div>
        <div class="row"><button class="x">Not now</button><button class="go">Adopt · ${effortsMark(14)}${fmt(FEE)}</button></div></div>`;
      const nm = panel.querySelector('#lk-pet-name'); nm.oninput = () => { st.name = nm.value; };
      panel.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => { st.kind = b.dataset.k; render(); }; });
      panel.querySelectorAll('[data-b]').forEach((b) => { b.onclick = () => { st.breed = b.dataset.b; render(); }; });
      panel.querySelectorAll('[data-n]').forEach((b) => { b.onclick = () => { st.name = b.dataset.n; render(); }; });
      panel.querySelector('.x').onclick = close;
      panel.querySelector('.go').onclick = () => {
        if (!walletEngine().spend(FEE, `Adopted a ${st.kind}`)) return render(`You need ${fmt(FEE)} Efforts.`);
        pet = clean(st); store.set(pet); close(); spawn(lastPlayer); sfx('arrive');
        toast(`${pet.name} is yours! E to pet, G for the ball, L for the laser, Y to whistle.`, 5000);
      };
    };
    render(); panel.classList.add('on');
  }
  function close() { panel.classList.remove('on'); }

  // ---------- play ----------
  const ahead = (d) => { const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y = 0; dir.normalize(); return lastPlayer.clone().addScaledVector(dir, d); };
  function act(a) {
    if (!pet || !model || isIndoors?.()) return false;
    if (a === 'pet') {
      if (pos.distanceTo(lastPlayer) > 2.4) { toast(`${pet.name} is too far away. Whistle (Y)!`, 2200); return true; }
      love = 2.5; state = 'sit'; sfx('chat', { me: false });
      for (let i = 0; i < 5; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: 0xe8557a, transparent: true })); h.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.5 + Math.random() * 0.2, (Math.random() - 0.5) * 0.4)); group.add(h); hearts.push({ h, t: 0 }); }
      toast(pet.kind === 'dog' ? `${pet.name} wags like mad.` : `${pet.name} purrs and leans into your hand.`, 2000);
      return true;
    }
    if (a === 'ball') {
      if (toy) return true;
      const to = ahead(9 + Math.random() * 4); const r = world.nearestReachable?.(to.x, to.z) || to; to.set(r.x, 0, r.z);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd8f02e, roughness: 0.6 }));
      ball.position.copy(lastPlayer).setY(1.2); group.add(ball);
      toy = { ball, from: ball.position.clone(), to, t: 0, phase: 'fly' }; sfx('jump');
      return true;
    }
    if (a === 'laser') {
      if (laser) { laser.dot.removeFromParent(); laser = null; state = 'follow'; return true; }
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.1, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.9, depthWrite: false }));
      dot.position.copy(ahead(3)).setY(0.2); group.add(dot); laser = { dot, t: 0 };
      toast(pet.kind === 'cat' ? `${pet.name}'s eyes go huge.` : `${pet.name} tilts their head.`, 2000);
      return true;
    }
    if (a === 'whistle') { state = 'come'; sfx('route'); toast(`You whistle. ${pet.name} comes running.`, 1800); return true; }
    return false;
  }

  // ---------- each frame ----------
  const idle = { act: null, t: 3, k: 0, moves: false, spot: null };
  // you can play as your pet (Elvis, 10 October 2026): main.js moves it and your person follows; the pet's own
  // mind is off while you drive, only its legs, tail and tongue keep going
  let driven = null;
  function update(dt, player, yaw) {
    t += dt; lastPlayer.set(player.x, 0, player.z);
    if (!pet || !model) return;
    const indoors = isIndoors?.();
    model.visible = !indoors;
    if (indoors) { pos.set(player.x + 1, 0, player.z); return; }
    if (driven) {
      love = Math.max(0, love - dt);
      pos.set(driven.x, 0, driven.z); model.position.set(pos.x, driven.y || 0, pos.z);
      const dh = Math.atan2(Math.sin(driven.yaw - model.rotation.y), Math.cos(driven.yaw - model.rotation.y)); model.rotation.y += dh * (1 - Math.exp(-dt * 14));
      const P = model.userData, ease = (key, want) => { P[key] = (P[key] || 0) + (want - (P[key] || 0)) * (1 - Math.exp(-dt * 6)); return P[key]; };
      animatePet(model, dt, t, driven.speed || 0, { sit: ease('sit', driven.speed < 0.05 && driven.still > 2 ? 1 : 0), wag: love > 0 || driven.speed > 0.5, tongue: driven.speed > 4 || love > 0 ? 1 : 0 });
      hearts.forEach((q) => { q.t += dt; q.h.position.y += dt * 0.6; q.h.material.opacity = Math.max(0, 1 - q.t / 1.4); });
      for (let i = hearts.length - 1; i >= 0; i--) if (hearts[i].t > 1.4) { hearts[i].h.removeFromParent(); hearts.splice(i, 1); }
      return;
    }
    // came out of a building, or got left far behind: trot back into view beside you
    // and if something is in the way (it runs straight, it does not plan), it finds its own way round:
    // no progress for a second and a half, and it turns up just behind you
    const gap = pos.distanceTo(lastPlayer);
    if (gap > 60 || (gap > 6 && (stuckFor += dt) > 1.5 && gap > lastGap - 0.3)) { const b = world.nearestReachable?.(player.x - Math.sin(yaw) * 2, player.z - Math.cos(yaw) * 2) || { x: player.x, z: player.z }; pos.set(b.x, 0, b.z); stuckFor = 0; }
    if (gap < lastGap - 0.3 || gap < 6) { stuckFor = 0; lastGap = gap; } else if (stuckFor === 0) lastGap = gap;
    love = Math.max(0, love - dt);
    let goal = null, run = false;
    if (laser) {
      laser.t += dt;
      const L = laser.dot.position, a = ahead(3 + Math.sin(laser.t * 0.9) * 1.5); a.x += Math.sin(laser.t * 3.1) * 1.5; a.z += Math.cos(laser.t * 2.3) * 1.5;
      L.lerp(a.setY(0.2), 1 - Math.exp(-dt * 6));
      goal = L; run = pet.kind === 'cat' || Math.sin(laser.t) > 0;
      if (pos.distanceTo(L) < 0.35 && Math.random() < dt * 2) model.userData.body.position.y += 0.08; // pounce
    } else if (toy) {
      toy.t += dt;
      if (toy.phase === 'fly') { const k = Math.min(1, toy.t / 0.9); toy.ball.position.lerpVectors(toy.from, toy.to, k); toy.ball.position.y = 0.07 + Math.sin(k * Math.PI) * 2.6 + (1 - k) * 1.1; if (k >= 1) { toy.phase = 'ground'; toy.t = 0; sfx('land', 0.3); } }
      if (pet.kind === 'dog') {
        if (toy.phase !== 'back') { goal = toy.ball.position; run = true; if (toy.phase === 'ground' && pos.distanceTo(toy.ball.position) < 0.4) toy.phase = 'back'; }
        else { goal = lastPlayer; run = true; toy.ball.position.copy(pos).add(new THREE.Vector3(Math.sin(model.rotation.y) * 0.3 * model.userData.k, 0.28 * model.userData.k, Math.cos(model.rotation.y) * 0.3 * model.userData.k)); if (pos.distanceTo(lastPlayer) < 1.3) { toy.ball.removeFromParent(); toy = null; love = 1.5; toast(`${pet.name} drops the ball at your feet. Good dog!`, 2000); } }
      } else {
        // a cat watches it go, maybe saunters over, and loses interest
        if (toy.phase === 'ground') { goal = toy.t < 3 ? toy.ball.position : lastPlayer; if (toy.t > 6) { toy.ball.removeFromParent(); toy = null; toast(`${pet.name} is not interested in fetching. Cats.`, 2200); } }
      }
    } else {
      const d = pos.distanceTo(lastPlayer);
      if (state === 'come' && d < 1.6) state = 'follow';
      if (state === 'sit' && love <= 0) state = 'follow';
      // an idle act that moves the pet about (zoomies, sniffing, coming up to beg) steers it itself
      if (state !== 'sit' && d > 1.8 && !idle.moves) { goal = new THREE.Vector3(player.x - Math.sin(yaw) * 1.3 + Math.cos(yaw) * 0.6, 0, player.z - Math.cos(yaw) * 1.3 - Math.sin(yaw) * 0.6); run = d > 6 || state === 'come'; }
    }
    let speed = 0;
    if (goal) {
      const dx = goal.x - pos.x, dz = goal.z - pos.z, d = Math.hypot(dx, dz);
      if (d > 0.25) {
        const v = Math.min(d * 3, run ? 6.5 : 2.6);
        pos.x += (dx / d) * v * dt; pos.z += (dz / d) * v * dt; world.resolve(pos, 0.22, 0); speed = v;
        const want = Math.atan2(dx, dz), dh = Math.atan2(Math.sin(want - model.rotation.y), Math.cos(want - model.rotation.y)); model.rotation.y += dh * (1 - Math.exp(-dt * 10));
      }
    }
    model.position.set(pos.x, model.position.y * 0.8, pos.z);
    // ---- what a pet does when there is nothing to do (dogs: sniff about, zoomies, beg to be petted, lie down,
    // scratch, a play bow, a little jump; cats: sit, loaf, stretch, groom). One at a time, never the same twice running.
    const P = model.userData, idleNow = !goal && !toy && !laser && state !== 'come' && speed < 0.05;
    idle.t -= dt;
    if (!idleNow && !idle.moves) { idle.act = null; idle.t = Math.min(idle.t, 2 + Math.random() * 2); }
    if (idleNow && idle.t <= 0) {
      const dogActs = ['sit', 'sit', 'lie', 'sniff', 'zoomies', 'beg', 'scratch', 'bow', 'hop', 'pant'], catActs = ['sit', 'lie', 'lie', 'groom', 'stretch', 'sniff'];
      const pool = (pet.kind === 'dog' ? dogActs : catActs).filter((a) => a !== idle.act);
      idle.act = pool[Math.floor(Math.random() * pool.length)]; idle.t = { sit: 4, lie: 7, sniff: 5, zoomies: 4, beg: 3, scratch: 2, bow: 1.6, hop: 1.4, pant: 4, groom: 3, stretch: 2 }[idle.act] + Math.random() * 2; idle.k = 0;
      if (idle.act === 'sniff') { const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 2; idle.spot = new THREE.Vector3(lastPlayer.x + Math.cos(a) * r, 0, lastPlayer.z + Math.sin(a) * r); }
      if (idle.act === 'beg') toast?.(pet.kind === 'dog' ? `${pet.name} puts their paws up on you. E to pet them.` : '', 1800);
    }
    idle.k += dt;
    // the moving ones steer the pet themselves
    idle.moves = idleNow || idle.moves ? (idle.act === 'sniff' || idle.act === 'zoomies' || idle.act === 'beg') && idle.t > 0 : false;
    let mv = 0;
    if (idle.moves) {
      // to beg, it comes right up to you first, then rears up with its paws on you
      const toYou = Math.hypot(pos.x - lastPlayer.x, pos.z - lastPlayer.z) || 1;
      const tgt = idle.act === 'sniff' ? idle.spot : idle.act === 'beg' ? new THREE.Vector3(lastPlayer.x + ((pos.x - lastPlayer.x) / toYou) * 0.5, 0, lastPlayer.z + ((pos.z - lastPlayer.z) / toYou) * 0.5) : new THREE.Vector3(lastPlayer.x + Math.cos(idle.k * 3.2) * 2.4, 0, lastPlayer.z + Math.sin(idle.k * 3.2) * 2.4);
      const dx = tgt.x - pos.x, dz = tgt.z - pos.z, d = Math.hypot(dx, dz), v = idle.act === 'zoomies' ? 7 : idle.act === 'beg' ? 2.6 : 1.4;
      if (d > 0.3) { pos.x += (dx / d) * Math.min(v, d * 4) * dt; pos.z += (dz / d) * Math.min(v, d * 4) * dt; world.resolve(pos, 0.22, 0); mv = Math.min(v, d * 4); const want = Math.atan2(dx, dz), dh = Math.atan2(Math.sin(want - model.rotation.y), Math.cos(want - model.rotation.y)); model.rotation.y += dh * (1 - Math.exp(-dt * 10)); }
      model.position.set(pos.x, 0, pos.z);
    }
    // a begging pet turns to you
    const upClose = Math.hypot(pos.x - lastPlayer.x, pos.z - lastPlayer.z) < 0.9;
    if (idle.act === 'beg' && (idleNow || idle.moves) && upClose) { const want = Math.atan2(lastPlayer.x - pos.x, lastPlayer.z - pos.z), dh = Math.atan2(Math.sin(want - model.rotation.y), Math.cos(want - model.rotation.y)); model.rotation.y += dh * (1 - Math.exp(-dt * 6)); }
    const on = (a) => (idleNow || idle.moves) && idle.act === a;
    const ease = (key, want) => { P[key] = (P[key] || 0) + (want - (P[key] || 0)) * (1 - Math.exp(-dt * 6)); return P[key]; };
    const sitting = (state === 'sit' && !goal) || on('sit') || on('groom') ? 1 : 0;
    animatePet(model, dt, t, Math.max(speed, mv), {
      sit: ease('sit', sitting), lie: ease('lie', on('lie') ? 1 : 0), beg: ease('beg', on('beg') && upClose ? 1 : 0), bow: ease('bow', on('bow') || on('stretch') ? 1 : 0),
      scratch: ease('scr', on('scratch') || (on('groom') && pet.kind === 'cat') ? 1 : 0), hop: on('hop') ? Math.max(0, Math.sin(idle.k * 7)) * 0.35 : 0,
      tongue: pet.kind === 'dog' && (on('pant') || on('beg') || on('zoomies') || speed > 4 || (toy && toy.phase === 'back')) ? 1 : 0,
      wag: love > 0 || (toy && pet.kind === 'dog') || on('beg') || on('bow') || on('zoomies') || on('hop'),
    });
    hearts.forEach((q) => { q.t += dt; q.h.position.y += dt * 0.6; q.h.material.opacity = Math.max(0, 1 - q.t / 1.4); });
    for (let i = hearts.length - 1; i >= 0; i--) if (hearts[i].t > 1.4) { hearts[i].h.removeFromParent(); hearts.splice(i, 1); }
  }
  // E near your pet pets it (the HUD asks this first)
  const near = (player) => !!(pet && model && model.visible && Math.hypot(pos.x - player.x, pos.z - player.z) < 2.2);
  spawn(world.spawn);
  function dispose() { group.removeFromParent(); panel.remove(); bar.remove(); style.remove(); }
  // drive(null) hands the pet back to its own mind; drive({ x, z, yaw, speed, still }) moves it
  function drive(d) { if (!d && driven) { state = 'follow'; idle.act = null; } driven = d; if (d) { toy?.ball.removeFromParent(); toy = null; if (laser) { laser.dot.removeFromParent(); laser = null; } } bar.classList.toggle('driving', !!d); }
  const cheer = (secs = 2.5) => { love = Math.max(love, secs); };
  return { update, act, near, drive, cheer, get driven() { return !!driven; }, get model() { return model; }, get playing() { return toy ? toy.phase : null; }, get idleAct() { return idle.act; }, openShelter, close, get isOpen() { return panel.classList.contains('on'); }, get pet() { return pet; }, get pos() { return pos; }, dispose };
}
