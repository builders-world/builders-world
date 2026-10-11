import * as THREE from 'three';
import { playEmote } from './expressions.js';
import { createAvatarModel } from '../onboarding/avatar.js';
import { rigAvatar } from './anim.js';
import { prepareLook, dress } from './style.js';
import { walletEngine, effortsMark, fmt } from './wallet.js';
import { sfx } from './audio.js';
import { addFeed, feedStock } from './fear.js';
import { C, FONT } from './uikit.js';

// Street food (world bible 11.8). Every food stall and kitchen has someone behind the counter. Step
// up (E) and the camera cuts to you at the counter, face to face with the vendor; order from the menu
// and watch it made: the mallam turns the suya on the grill, slices it, adds yaji and onions, wraps it
// in newspaper and hands it over. Then you eat it. The suya spot has a real charcoal grill: glowing
// coals and smoke, a kerosene lantern after dark, a cooler of zobo.

const MENUS = {
  suya: { vendor: 'Mallam Sani', look: { body: 'm', skin: '#5a3825', hair: 'fila', top: 'kaftan', topColor: '#2f6b4f', bottom: 'trousers', bottomColor: '#2f6b4f', shoes: 'sandals', shoeColor: '#8a5a36', acc: [] },
    hello: 'Welcome! Fresh suya, hot from the fire. How much I go cut for you?', made: 'suya',
    items: [['Beef suya', 400, 'Thin slices, yaji, onions, tomatoes, in newspaper'], ['Kilishi', 600, 'Dried and spiced, the travelling kind'], ['Chicken suya', 500, 'Wing and thigh on the stick'], ['Zobo (cold)', 200, 'From the cooler, hibiscus and ginger']] },
  corn: { vendor: 'Mama Ngozi', look: { body: 'f', skin: '#7a4a2e', hair: 'gele', top: 'adire', topColor: '#3a4f7a', bottom: 'wrapper', bottomColor: '#e46f4f', shoes: 'sandals', shoeColor: '#1d2028', acc: ['earrings'] },
    hello: 'Corn just come off the fire. You want am with ube or coconut?', made: 'corn',
    items: [['Corn for the birds', 50, 'A cup of dried grains to scatter (F), for pigeons and chickens', 'corn'], ['Roasted corn', 150, 'Charred on the grill'], ['Corn and ube', 300, 'With roasted African pear'], ['Fresh coconut', 200, 'Opened while you wait']] },
  fruit: { vendor: 'Iya Basira', look: { body: 'f', skin: '#986746', hair: 'gele', top: 'ankara', topColor: '#5f9a45', bottom: 'wrapper', bottomColor: '#e2b13c', shoes: 'sandals', shoeColor: '#8a5a36', acc: ['beads'] },
    hello: 'Oranges sweet today o! I fit peel am for you.', made: 'fruit',
    items: [['Peeled oranges (3)', 100, 'Peeled in one long ribbon'], ['Pineapple slices', 250, 'Cut fresh'], ['Garden eggs', 150, 'With groundnut paste']] },
  kitchen: { vendor: 'Mama Nkechi', look: { body: 'f', skin: '#7a4a2e', hair: 'gele', top: 'dress', topColor: '#e46f4f', bottom: 'skirt', bottomColor: '#e46f4f', shoes: 'sandals', shoeColor: '#1d2028', acc: ['earrings', 'beads'] },
    hello: 'My pikin, sit down! Jollof dey, beans dey, plantain just fry.', made: 'plate',
    items: [['Jollof and plantain', 800, 'Party jollof with dodo'], ['Beans and plantain', 700, 'Ewa agoyin with the pepper sauce'], ['Puff-puff (6)', 150, 'Still warm'], ['Chapman', 300, 'With the cucumber slice']] },
  cafe: { vendor: 'Kofo', look: { body: 'f', skin: '#b07a52', hair: 'braids', top: 'tee', topColor: '#1d2028', bottom: 'trousers', bottomColor: '#2f4f7f', shoes: 'sneakers', shoeColor: '#ddd5be', acc: ['glasses'] },
    hello: 'Hey! What can I get you? The wifi password is on the menu board.', made: 'cup',
    items: [['Flat white', 500, 'Nigerian beans, roasted in Ibadan'], ['Zobo iced tea', 350, 'Our house special'], ['Meat pie', 400, 'Flaky, from the oven']] },
  kiosk: { vendor: 'Uche', look: { body: 'm', skin: '#986746', hair: 'low', top: 'tee', topColor: '#e46f4f', bottom: 'trousers', bottomColor: '#304344', shoes: 'sneakers', shoeColor: '#ddd5be', acc: [] },
    hello: 'Cold malt, zobo, gala, plantain chips. What you need?', made: 'cup',
    items: [['Dog biscuits (6)', 150, 'Hold one out (F) and a dog is your friend', 'treat'], ['Malt (cold)', 250, 'From the fridge'], ['Gala', 150, 'The sausage roll every danfo sells'], ['Plantain chips', 200, 'Sweet or salty']] },
};
const kindOf = (name = '') => (/Suya/.test(name) ? 'suya' : /\bCorn\b/.test(name) ? 'corn' : /Fruit/.test(name) ? 'fruit' : /Kitchen/.test(name) ? 'kitchen' : /Cafe/.test(name) ? 'cafe' : /kiosk/i.test(name) ? 'kiosk' : null);

const CSS = `
#lk-food { position: fixed; right: 16px; top: 74px; z-index: 33; width: min(360px, calc(100vw - 32px)); max-height: calc(100vh - 160px); overflow-y: auto; display: none; padding: 18px; border-radius: 24px; background: ${C.paper}; color: ${C.ink}; font-family: ${FONT};
  box-shadow: 0 6px 0 rgba(59,42,32,.22), 0 24px 60px rgba(10,14,30,.3); }
#lk-food.on { display: block; } #lk-food h3 { margin: 0; font: 800 21px/1.1 ${FONT}; } #lk-food .say { margin: 8px 0 12px; padding: 10px 12px; border-radius: 14px; background: ${C.paper2}; font: 700 14px/1.4 ${FONT}; }
#lk-food .it { display: flex; justify-content: space-between; gap: 10px; align-items: center; width: 100%; margin-bottom: 6px; border: 2px solid #e3d4b4; border-radius: 14px; padding: 9px 12px; background: #fffaf0; color: ${C.ink}; font: 700 14.5px/1.2 ${FONT}; cursor: pointer; text-align: left; }
#lk-food .it small { display: block; color: ${C.ink2}; font-weight: 600; font-size: 12.5px; margin-top: 2px; } #lk-food .it:disabled { opacity: .5; cursor: default; }
#lk-food .row { display: flex; gap: 8px; margin-top: 10px; } #lk-food .row button { flex: 1; border: 0; border-radius: 999px; padding: 11px; font: 800 14px/1 ${FONT}; cursor: pointer; background: #eadfc6; color: ${C.ink}; } #lk-food .row .go { background: ${C.teal}; color: #fff; }
#lk-food svg { display: inline-block; vertical-align: -2px; }
`;

export function createFood({ scene, props, toast, getEnv, reduced, addLamps, world }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const panel = document.createElement('div'); panel.id = 'lk-food'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Order food'); document.body.appendChild(panel);
  const group = new THREE.Group(); group.name = 'food'; scene.add(group);
  const coal = new THREE.MeshStandardMaterial({ color: 0x2a1a12, emissive: 0xff5a1a, emissiveIntensity: 1.4, roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x3b3f45, roughness: 0.5, metalness: 0.6 });
  const meat = new THREE.MeshStandardMaterial({ color: 0x7a3a1e, roughness: 0.7 });
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0xd8d2c8, transparent: true, opacity: 0.35, depthWrite: false });
  const stalls = [], smoke = [];

  // a vendor behind every food counter, and the suya spot's grill
  props.interact.filter((it) => it.at && kindOf(it.name)).forEach((it) => {
    const kind = kindOf(it.name), M = MENUS[kind], { x, z, ry, depth } = it.at, fx = Math.sin(ry), fz = Math.cos(ry), tx = Math.cos(ry), tz = -Math.sin(ry);
    // behind the counter: inside a shop, or just behind a stall's table (it reaches 1.13 m back) under its
    // awning (district.js); where a wall stands right behind the stall, beside it instead
    let back = depth > 3 ? depth - 2.4 : -1.6, side = 0;
    if (depth <= 3 && world?.blockedAt?.(x - fx * 1.6, z - fz * 1.6, 0.3)) { back = 0.4; side = -2.55; }
    const av = createAvatarModel({ color: M.look.topColor, style: 'tee' }); prepareLook(av.root); const rig = rigAvatar(av.root); dress(av.root, M.look, rig);
    av.root.position.set(x + fx * back + tx * side, 0, z + fz * back + tz * side); av.root.rotation.y = ry; group.add(av.root);
    if (depth <= 3) world?.addColliders?.([{ name: 'vendor', cx: av.root.position.x, cz: av.root.position.z, hx: 0.3, hz: 0.3, ry, h: 1.8 }]); // you cannot walk through the trader
    // where you stand to order: just in front of the counter
    const eyeAt = depth > 3 ? depth - 0.4 : 2.35;
    const st = { it, kind, M, av, rig, front: { x: it.x, z: it.z }, eye: { x: x + fx * eyeAt + tx * side * 0.5, z: z + fz * eyeAt + tz * side * 0.5 }, vendor: av.root.position.clone(), ry, busy: 0, making: null };
    if (kind === 'suya' || kind === 'corn') {
      // the grill: a drum on legs, coals that glow, skewers or cobs on the mesh
      // beside the stall, where the smoke can go up
      // a stall's table is 4.1 m wide: the grill stands beside it
      const gs = depth > 3 ? 1.55 : 2.6, gx = x + tx * gs + fx * 0.1, gz = z + tz * gs + fz * 0.1, g = new THREE.Group(); g.position.set(gx, 0, gz); g.rotation.y = ry; group.add(g);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.45).translate(0, 0.85, 0), metal));
      [[-0.4, -0.18], [0.4, -0.18], [-0.4, 0.18], [0.4, 0.18]].forEach(([a, b]) => g.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.04).translate(a, 0.42, b), metal)));
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.05, 0.38).translate(0, 0.9, 0), coal));
      for (let k = 0; k < 7; k++) g.add(kind === 'suya' ? new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.34).translate(-0.33 + k * 0.11, 0.96, 0), meat) : new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8).rotateX(Math.PI / 2).translate(-0.3 + k * 0.1, 0.96, 0), new THREE.MeshStandardMaterial({ color: 0xd9a63a, roughness: 0.7 })));
      // the coals' glow goes through the shared lamp pool (a light per grill would cost every material)
      addLamps?.([{ x: gx, y: 1.1, z: gz, power: 10, color: 0xff6a2a, kind: 'fire' }]); st.coal = coal;
      st.smokeAt = new THREE.Vector3(gx, 1.05, gz);
      if (kind === 'suya') {
        // a cooler of zobo, and a kerosene lantern that comes on after dark
        const cl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.35).translate(0, 0.2, 0), new THREE.MeshStandardMaterial({ color: 0x2a6fb0, roughness: 0.5 })); cl.position.set(x - tx * (gs - 0.2) + fx * (depth > 3 ? 0.2 : 1.6), 0, z - tz * (gs - 0.2) + fz * (depth > 3 ? 0.2 : 1.6)); cl.rotation.y = ry; group.add(cl);
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.18, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.8) })); lamp.position.set(gx, 1.55, gz); group.add(lamp); st.lantern = lamp;
      }
    }
    stalls.push(st);
  });

  // ---------- ordering ----------
  let at = null;
  function open(it) {
    const st = stalls.find((s) => s.it === it); if (!st) return false;
    at = st; sfx('open');
    // first person at the counter: your eyes, looking at the vendor's face
    const eye = { x: st.eye.x, y: 1.95, z: st.eye.z }; // looking over the goods on the counter
    dispatchEvent(new CustomEvent('bw:shot', { detail: { from: eye, at: { x: st.vendor.x, y: 1.3, z: st.vendor.z }, first: true } }));
    st.rig?.wave?.();
    render(st.M.hello);
    panel.classList.add('on');
    return true;
  }
  function render(say, busy = false) {
    const st = at; if (!st) return;
    panel.innerHTML = `<h3>${st.it.name}</h3><div class="say"><b>${st.M.vendor}:</b> "${say}"</div>
      ${st.M.items.map(([n, p, d], i) => `<button class="it" data-i="${i}" ${busy ? 'disabled' : ''}><span>${n}<small>${d}</small></span><span>${effortsMark(12)}${fmt(p)}</span></button>`).join('')}
      <div class="row"><button class="x">${busy ? 'Wait for it...' : 'Leave'}</button></div>`;
    panel.querySelectorAll('.it').forEach((b) => { b.onclick = () => order(+b.dataset.i); });
    panel.querySelector('.x').onclick = () => { if (!busy) close(); };
  }
  function order(i) {
    const st = at, [name, price, , feed] = st.M.items[i];
    if (!walletEngine().spend(price, `${name} at ${st.it.name}`)) { render(`Ah, you no get enough Efforts for ${name.toLowerCase()}. ${fmt(price)} na the price.`); return; }
    // food for the animals goes in your bag, not your mouth (fear.js)
    if (feed) { addFeed(feed, 6); sfx('pick'); render(feed === 'corn' ? 'Na for the pigeons? Throw am small small, dem go gather.' : 'Hold am out flat. Even the fierce ones go soft.'); toast(`In your bag: ${feed === 'corn' ? 'corn for the birds' : 'dog biscuits'} (${feedStock(feed)}). Press F near animals to hold some out.`, 3200); return; }
    sfx('interact');
    render(st.kind === 'suya' ? 'Ehen! Make I cut am fresh for you.' : st.kind === 'cafe' ? 'Coming right up.' : 'No wahala, one minute.', true);
    if (st.indoor) { setTimeout(() => { if (at !== st) return; sfx('arrive'); render('Here you go. Enjoy!'); toast(`${name}: ${['delicious', 'exactly what you needed', 'worth every Effort'][Math.floor(Math.random() * 3)]}.`, 2800); }, 2200); return; }
    st.making = { t: 0, name, parcel: null };
  }
  function close() {
    panel.classList.remove('on'); dispatchEvent(new CustomEvent('bw:shot', { detail: null }));
    if (at?.making?.parcel) at.making.parcel.removeFromParent();
    if (at) at.making = null;
    at = null;
  }

  // ---------- each frame: smoke, coals, the vendor at work ----------
  let t = 0, puffT = 0;
  function update(dt, player) {
    t += dt; puffT -= dt;
    const night = (getEnv?.()?.day ?? 1) < 0.5;
    coal.emissiveIntensity = 1.2 + Math.sin(t * 7) * 0.25 + Math.sin(t * 13) * 0.15; // the coals flicker
    stalls.forEach((st) => {

      if (st.lantern) st.lantern.visible = night;
      // smoke from the grills near you
      if (st.smokeAt && puffT <= 0 && !reduced && Math.hypot(st.smokeAt.x - player.x, st.smokeAt.z - player.z) < 40) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), smokeMat.clone()); m.position.copy(st.smokeAt).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.2)); group.add(m); smoke.push({ m, t: 0 });
      }
      // making your order
      const mk = st.making; if (!mk) { st.rig?.update(dt, { speed: 0, t }); return; }
      mk.t += dt;
      st.rig?.update(dt, { speed: 0, t });
      if (mk.t > 0.6 && mk.t < 3.2 && Math.floor(mk.t * 3) !== Math.floor((mk.t - dt) * 3)) sfx('tap');
      if (mk.t > 3.2 && !mk.parcel) {
        // the parcel: newspaper for suya and corn, a plate, a cup
        const P = st.M.made, mat = new THREE.MeshStandardMaterial({ color: P === 'suya' || P === 'corn' ? 0xe8e2d0 : P === 'cup' ? 0xf4ead2 : 0xffffff, roughness: 0.8 });
        mk.parcel = new THREE.Mesh(P === 'cup' ? new THREE.CylinderGeometry(0.05, 0.04, 0.12, 12) : P === 'plate' ? new THREE.CylinderGeometry(0.14, 0.12, 0.04, 16) : new THREE.BoxGeometry(0.22, 0.06, 0.12), mat);
        mk.parcel.position.copy(st.vendor).add(new THREE.Vector3(0, 1.0, 0)); group.add(mk.parcel); sfx('open');
      }
      if (mk.parcel) {
        // handed across the counter toward you
        const dx = st.eye.x - st.vendor.x, dz = st.eye.z - st.vendor.z, d = Math.hypot(dx, dz) || 1, k = Math.min(1, (mk.t - 3.2) / 1.0);
        mk.parcel.position.set(st.vendor.x + (dx / d) * (d - 0.55) * k, 1.0 + k * 0.3, st.vendor.z + (dz / d) * (d - 0.55) * k);
        if (mk.t > 4.6 && !mk.done) {
          mk.done = true; sfx('arrive');
          playEmote(st.av.root, st.kind === 'suya' ? 'thanks' : st.kind === 'cafe' ? 'nod' : 'welldone'); // the trader's thanks
          dispatchEvent(new CustomEvent('bw:react', { detail: { kind: 'food', x: st.vendor.x, z: st.vendor.z, r: 7, max: 2, chance: 0.5 } }));
          const line = st.kind === 'suya' ? `Enjoy! I add extra yaji for you.` : st.kind === 'kitchen' ? 'Chop well o!' : st.kind === 'cafe' ? 'Enjoy, see you tomorrow!' : 'Enjoy!';
          render(line);
          toast(`${mk.name}: ${['delicious', 'exactly what you needed', 'worth every Effort'][Math.floor(Math.random() * 3)]}.`, 2800);
          setTimeout(() => { if (mk.parcel) mk.parcel.removeFromParent(); if (st.making === mk) st.making = null; }, 1600);
        }
      }
    });
    if (puffT <= 0) puffT = 0.35;
    smoke.forEach((q) => { q.t += dt; q.m.position.y += dt * 0.55; q.m.position.x += dt * 0.12; q.m.scale.setScalar(1 + q.t * 1.6); q.m.material.opacity = Math.max(0, 0.35 - q.t * 0.12); });
    for (let i = smoke.length - 1; i >= 0; i--) if (smoke[i].t > 3) { smoke[i].m.removeFromParent(); smoke[i].m.material.dispose(); smoke.splice(i, 1); }
  }
  const handles = (it) => !!stalls.find((s) => s.it === it);
  function dispose() { group.removeFromParent(); panel.remove(); style.remove(); }
  // ordering indoors (the cafe's counter): the same menu, no camera cut
  function menu(kind) {
    const M = MENUS[kind]; if (!M) return false;
    at = { it: { name: kind === 'cafe' ? 'Kofo Cafe' : M.vendor }, kind, M, vendor: new THREE.Vector3(), eye: { x: 0, z: 0 }, rig: null, making: null, indoor: true };
    render(M.hello); panel.classList.add('on'); sfx('open');
    return true;
  }
  return { open, close, handles, update, menu, get isOpen() { return panel.classList.contains('on'); }, stalls, dispose };
}
