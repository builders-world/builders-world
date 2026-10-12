import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cityInfo } from './cityinfo.js';
import { signTexture } from './props.js';
import { lookFor } from './style.js';

// Food trucks (Elvis, 10 October 2026: "if it's basically like a truck, a food truck ... there should be a window showing
// the person who's working in real time, basically the attendant, and improve the experience. When I want to place the
// order, I need to feel very immersive"). A van with a serving hatch down its side: the awning flap propped up, a
// counter ledge, and inside, lit, the cook at the griddle and the shelves behind. You step up to the hatch (E) and order
// face to face (food.js does the counter: the first-person cut, the menu, the cooking, the hand-over). Each city's truck
// sells what its streets eat from a truck.

const TRUCKS = {
  Lagos: [
    { name: 'Shawarma Express', paint: 0xe46f4f, vendor: 'Tobi', made: 'plate', hello: 'Oya, what you go take? Shawarma just dey come off the grill!', cooking: 'Make I wrap am tight for you.', thanks: 'Enjoy am o!',
      items: [['Chicken shawarma', 1200, 'Wrapped with cabbage, cream and a sausage'], ['Beef shawarma', 1300, 'Extra pepper if you want am'], ['Small chops pack', 900, 'Puff-puff, samosa, spring roll, peppered gizzard'], ['Chapman', 400, 'Ice cold, with the cucumber slice']] },
    { name: 'Small Chops on Wheels', paint: 0x7d5aa6, vendor: 'Ronke', made: 'plate', hello: 'Small chops for your meeting? Everything fresh this morning.', cooking: 'One minute, I dey pack am.', thanks: 'Thank you! Come again.',
      items: [['Party pack', 1100, 'Puff-puff, samosa, spring roll, chicken'], ['Peppered gizzard', 700, 'Gizdodo, with plantain'], ['Puff-puff (10)', 300, 'Sugar on top'], ['Zobo', 250, 'Cold, with ginger']] },
  ],
  Abuja: [
    { name: 'Capital Grill Truck', paint: 0x2f7d4f, vendor: 'Musa', made: 'plate', hello: 'Welcome! Asun is hot and peppery today.', cooking: 'Coming. I go add onions.', thanks: 'Enjoy, my friend.',
      items: [['Asun (peppered goat)', 1500, 'Smoked goat, chopped, in pepper sauce'], ['Chicken shawarma', 1200, 'The Wuse lunchtime favourite'], ['Masa (6)', 400, 'Rice cakes with pepper'], ['Zobo', 250, 'Cold, with ginger']] },
  ],
  'Port Harcourt': [
    { name: 'Bole King on Wheels', paint: 0xf2b33d, vendor: 'Ibinabo', made: 'plate', hello: 'Bole don ready! Na correct fish I get today.', cooking: 'Make I cut the fish for you.', thanks: 'Enjoy! Na Garden City bole be this.',
      items: [['Bole and fish', 1500, 'Roasted plantain, grilled croaker, pepper sauce'], ['Bole and groundnut', 500, 'The quick one'], ['Roasted yam', 600, 'With palm oil sauce'], ['Zobo', 250, 'Cold']] },
  ],
  Uyo: [
    { name: 'Ibom Kitchen on Wheels', paint: 0x2a6fb5, vendor: 'Arit', made: 'plate', hello: 'Welcome! Today na ekpang nkukwo, e sweet well well.', cooking: 'Small, small. I dey dish am.', thanks: 'Enjoy! Come back tomorrow.',
      items: [['Ekpang nkukwo', 1400, 'Grated cocoyam in leaves, with periwinkle'], ['Roast fish and plantain', 1500, 'From the grill'], ['Coconut rice', 1000, 'With fried fish'], ['Zobo', 250, 'Cold']] },
  ],
  Nairobi: [
    { name: 'Smokie Pasua Mobile', paint: 0xb5523b, vendor: 'Wanjiru', made: 'plate', hello: 'Karibu! Smokie pasua with fresh kachumbari.', cooking: 'Sawa, one minute.', thanks: 'Asante! Karibu tena.',
      items: [['Smokie pasua', 300, 'Smokie split open, kachumbari inside'], ['Mutura', 400, 'Kenyan blood sausage, grilled'], ['Chips mwitu', 500, 'Chips in a paper cone, chilli and salt'], ['Chai', 200, 'Spiced, milky']] },
  ],
  Accra: [
    { name: 'Kelewele Express', paint: 0xc9a227, vendor: 'Akosua', made: 'plate', hello: 'Akwaaba! Kelewele is hot, hot.', cooking: 'Let me pack it for you.', thanks: 'Medaase! Enjoy.',
      items: [['Kelewele', 400, 'Spiced fried ripe plantain, with peanuts'], ['Waakye pack', 1000, 'Rice and beans with shito, gari and wele'], ['Sobolo', 250, 'Hibiscus, ginger, cold']] },
  ],
};
export const trucksFor = (city) => TRUCKS[city] || TRUCKS.Lagos;

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
// the van, in its own frame: 7.2 m long along x (cab at +x), the hatch on the +z side
const L = { x0: -3.5, x1: 2.0, w: 2.4, floor: 0.85, roof: 3.2, hx0: -2.7, hx1: 1.2, hy0: 1.75, hy1: 2.65 };
export const TRUCK_FOOT = { W: 7.4, D: 2.6 };

function truckModel(T) {
  const g = new THREE.Group(), z1 = L.w / 2;
  const paint = new THREE.MeshStandardMaterial({ color: T.paint, roughness: 0.5, metalness: 0.15 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf3ead7, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d2028, roughness: 0.8 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.35, metalness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x2a4a66, roughness: 0.1, metalness: 0.3 });
  const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.35, 0.95) });
  // the shell of the box body, open at the hatch
  g.add(new THREE.Mesh(mergeGeometries([
    box(L.x1 - L.x0, 0.1, L.w, (L.x0 + L.x1) / 2, L.floor - 0.05, 0), box(L.x1 - L.x0, 0.1, L.w, (L.x0 + L.x1) / 2, L.roof, 0), // floor, roof
    box(L.x1 - L.x0, L.roof - L.floor, 0.08, (L.x0 + L.x1) / 2, (L.roof + L.floor) / 2, -z1), // back
    box(0.08, L.roof - L.floor, L.w, L.x0, (L.roof + L.floor) / 2, 0), box(0.08, L.roof - L.floor, L.w, L.x1, (L.roof + L.floor) / 2, 0), // ends
    box(L.x1 - L.x0, L.hy0 - L.floor, 0.08, (L.x0 + L.x1) / 2, (L.hy0 + L.floor) / 2, z1), box(L.x1 - L.x0, L.roof - L.hy1, 0.08, (L.x0 + L.x1) / 2, (L.roof + L.hy1) / 2, z1), // below and above the hatch
    box(L.hx0 - L.x0, L.hy1 - L.hy0, 0.08, (L.x0 + L.hx0) / 2, (L.hy0 + L.hy1) / 2, z1), box(L.x1 - L.hx1, L.hy1 - L.hy0, 0.08, (L.hx1 + L.x1) / 2, (L.hy0 + L.hy1) / 2, z1), // either side
  ]), paint));
  // the cab, its windscreen, the wheels and the chassis
  g.add(new THREE.Mesh(mergeGeometries([box(1.7, 1.7, L.w - 0.05, L.x1 + 0.85, 1.6, 0), box(1.5, 0.35, L.w - 0.1, L.x1 + 0.9, 0.62, 0)]), white));
  g.add(new THREE.Mesh(box(0.06, 0.8, L.w - 0.3, L.x1 + 1.72, 2.0, 0).rotateZ(0), glass));
  [-1, 1].forEach((sz) => g.add(new THREE.Mesh(box(0.9, 0.7, 0.04, L.x1 + 0.9, 2.0, sz * (z1 - 0.01)), glass)));
  g.add(new THREE.Mesh(box(L.x1 - L.x0 + 1.6, 0.25, L.w - 0.4, (L.x0 + L.x1) / 2 + 0.6, 0.62, 0), dark));
  const wheel = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16).rotateX(Math.PI / 2);
  [[L.x0 + 1.0, -1], [L.x0 + 1.0, 1], [L.x1 + 0.9, -1], [L.x1 + 0.9, 1]].forEach(([x, sz]) => { const m = new THREE.Mesh(wheel, dark); m.position.set(x, 0.42, sz * (z1 - 0.1)); g.add(m); });
  // the awning flap, propped up over the hatch, and the counter ledge under it
  const flap = new THREE.Mesh(box(L.hx1 - L.hx0 + 0.2, 0.05, 1.1, 0, 0, 0.55), paint); flap.position.set((L.hx0 + L.hx1) / 2, L.hy1 + 0.04, z1 + 0.02); flap.rotation.x = -0.32; g.add(flap);
  [L.hx0, L.hx1].forEach((x) => g.add(new THREE.Mesh(box(0.04, 0.9, 0.04, x, L.hy1 - 0.3, z1 + 0.5).rotateX(0), steel)));
  g.add(new THREE.Mesh(box(L.hx1 - L.hx0, 0.06, 0.38, (L.hx0 + L.hx1) / 2, L.hy0 + 0.02, z1 + 0.17), steel));
  // inside: the griddle and the shelves, lit
  g.add(new THREE.Mesh(mergeGeometries([box(1.4, 0.9, 0.7, 0.4, L.floor + 0.45, -z1 + 0.4), box(1.6, 0.9, 0.5, -1.9, L.floor + 0.45, -z1 + 0.3)]), steel));
  g.add(new THREE.Mesh(box(1.2, 0.04, 0.5, 0.4, L.floor + 0.92, -z1 + 0.4), new THREE.MeshStandardMaterial({ color: 0x2a1a12, emissive: 0xff5a1a, emissiveIntensity: 0.6, roughness: 0.9 })));
  g.add(new THREE.Mesh(box(L.hx1 - L.hx0, 0.04, 0.6, (L.hx0 + L.hx1) / 2, L.roof - 0.08, 0), warm)); // the strip light
  // the name down the side above the hatch, and on the back, and a menu board on the panel below
  const nameTex = signTexture(T.name.toUpperCase(), { bg: '#f7efdc', fg: `#${T.paint.toString(16).padStart(6, '0')}`, w: 1200, h: 150 });
  const name = new THREE.Mesh(new THREE.PlaneGeometry(L.x1 - L.x0 - 0.4, 0.42), new THREE.MeshBasicMaterial({ map: nameTex, color: 0xeeeeee })); name.position.set((L.x0 + L.x1) / 2, (L.roof + L.hy1) / 2 + 0.05, z1 + 0.05); g.add(name);
  const back = name.clone(); back.rotation.y = Math.PI; back.position.z = -z1 - 0.05; g.add(back);
  const menuTex = signTexture(T.items.slice(0, 2).map(([n]) => n).join(' · '), { bg: '#3b2a20', fg: '#f7efdc', w: 1200, h: 110 });
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(L.hx1 - L.hx0, 0.32), new THREE.MeshBasicMaterial({ map: menuTex, color: 0xdddddd })); menu.position.set((L.hx0 + L.hx1) / 2, L.hy0 - 0.4, z1 + 0.05); g.add(menu);
  return g;
}

export function buildFoodTrucks({ world, scene, props, used = [], addLamps }) {
  const group = new THREE.Group(); group.name = 'food-trucks'; scene.add(group);
  const city = cityInfo().city || 'Lagos', list = trucksFor(city);
  // open ground: walkable, off the roads and their pavements (a truck on the pavement puts walkers in the road), off the railway
  const free = (x, z) => (world.costAt ? world.costAt(x, z) < 2.6 : world.isFree(x, z, 0.5)) && !world.onCarriageway?.(x, z, 0.6) && !world.inReserve?.(x, z) && !world.onRail?.(x, z, 1);
  // where people gather: the parks, the hub, the motor park; a truck parks on open ground near one, its hatch toward it
  const anchors = (props.pois || []).filter((q) => /Park|Garden|Hub|Square|Market/i.test(q.name || '') && !/car park|parking/i.test(q.name || ''));
  const taken = [];
  const trucks = [];
  const want = list.length; // Lagos has two; every other city its one
  for (const a of anchors) {
    if (trucks.length >= want) break;
    if (taken.some((t) => Math.hypot(t.x - a.x, t.z - a.z) < 70)) continue;
    let site = null;
    for (let r = 10; r <= 40 && !site; r += 3) for (let k = 0; k < 16 && !site; k++) {
      const ang = (k / 16) * Math.PI * 2 + r, x = a.x + Math.cos(ang) * r, z = a.z + Math.sin(ang) * r;
      if (Math.hypot(x, z) > world.radius * 0.88) continue;
      // the hatch looks back at the place; the truck runs across that line
      const ry = Math.atan2(a.x - x, a.z - z) - 0; // +z of the truck toward the anchor
      const c = Math.cos(ry), s = Math.sin(ry), at = (u, v) => [x + u * c + v * s, z - u * s + v * c];
      let ok = !used.some((u) => Math.abs(u.x - x) < (u.W || 0) / 2 + 6 && Math.abs(u.z - z) < (u.D || 0) / 2 + 6);
      // the truck's footprint and, in front of the hatch, room for a queue
      for (let u = -TRUCK_FOOT.W / 2; u <= TRUCK_FOOT.W / 2 && ok; u += 1) for (let v = -TRUCK_FOOT.D / 2; v <= TRUCK_FOOT.D / 2 + 3.5 && ok; v += 1) if (!free(...at(u, v))) ok = false;
      for (let u = -TRUCK_FOOT.W / 2; u <= TRUCK_FOOT.W / 2 + 1e-6 && ok; u += TRUCK_FOOT.W / 8) if (!free(...at(u, -TRUCK_FOOT.D / 2)) || !free(...at(u, TRUCK_FOOT.D / 2))) ok = false; // the long edges exactly
      if (ok && world.nearestReachable) { const [qx, qz] = at((L.hx0 + L.hx1) / 2, L.w / 2 + 1.6), q = world.nearestReachable(qx, qz); if (!q || Math.hypot(q.x - qx, q.z - qz) > 1.5) ok = false; }
      if (ok) site = { x, z, ry };
    }
    if (!site) continue;
    const T = list[trucks.length % list.length], { x, z, ry } = site, c = Math.cos(ry), s = Math.sin(ry), at = (u, v) => ({ x: x + u * c + v * s, z: z - u * s + v * c });
    const m = truckModel(T); m.position.set(x, 0, z); m.rotation.y = ry; group.add(m);
    taken.push(site); used.push({ x, z, W: TRUCK_FOOT.W + 2, D: TRUCK_FOOT.D + 6 });
    world.addColliders?.([{ name: 'food_truck', cx: x + 0.35 * c, cz: z - 0.35 * s, hx: TRUCK_FOOT.W / 2, hz: TRUCK_FOOT.D / 2, ry, h: 3.3 }]);
    world.claim?.({ kind: 'venue', cx: x, cz: z + 0, hx: TRUCK_FOOT.W / 2 + 0.5, hz: TRUCK_FOOT.D / 2 + 0.5, ry });
    // the cook at the hatch, the place you stand, the light inside
    const mid = (L.hx0 + L.hx1) / 2, stand = { ...at(mid - 0.4, L.w / 2 - 0.55), y: L.floor, ry }, eye = at(mid - 0.4, L.w / 2 + 1.45), front = at(mid - 0.4, L.w / 2 + 1.5);
    addLamps?.([{ ...at(mid, 0.2), y: L.roof - 0.3, power: 14, boost: 8, color: 0xffcf8a }]);
    const menu = { vendor: T.vendor, look: lookFor(`truck-${city}-${trucks.length}`, { tier: 1, fem: /Ronke|Arit|Wanjiru|Akosua|Ibinabo/.test(T.vendor) }), hello: T.hello, cooking: T.cooking, thanks: T.thanks, made: T.made, items: T.items };
    const it = { id: `truck:${trucks.length}`, label: `Order at ${T.name}`, x: front.x, z: front.z, r: 3.0, name: T.name, at: { x, z, ry, depth: 2 }, menu, window: { stand, eye } };
    props.interact.push(it);
    props.pois?.push({ kind: 'food', name: T.name, x: front.x, z: front.z });
    trucks.push({ T, site, it, model: m });
  }
  return { group, trucks, dispose() { group.removeFromParent(); } };
}
