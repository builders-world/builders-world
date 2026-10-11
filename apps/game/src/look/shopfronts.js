import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAvatarModel } from '../onboarding/avatar.js';
import { rigAvatar } from './anim.js';
import { prepareLook, dress, lookFor } from './style.js';

// Serving windows on the street's shops (Elvis, 10 October 2026: "if it's an open window shop, there should be a window
// showing the person who's working in real time, basically the attendant"). The compound shop's front had a dark glass
// opening, a door and a window, and nobody in sight; the kitchen's cook stood inside the wall. Now the opening is a
// serving window: side cheeks and a little roof out to the edge of the porch, a counter at chest height from the street,
// and behind it a lit shelf of what the shop sells (provisions, phone repairs with their spanners and screwdrivers,
// printing, gadgets, the kitchen's pots, the cafe's machine). The attendant stands in it, on the porch, facing the street.
// Food shops get their vendor from food.js, at the same window; the others get theirs here.

// the compound shop (build_yaba_assets.py make_compound_shop): the front wall at z 2.9, the porch step to z 3.85 and
// 0.46 m high, the shuttered opening centred at x -2.35, 2.25 m wide, from 1.41 to 3.09 m up
export const WINDOW = { x: -2.35, wall: 2.9, front: 3.85, porch: 0.46, w: 2.7, top: 2.85, stand: 3.3 };
export const shopKind = (name = '') => (/Repair|Phone Doctor|Fundi/i.test(name) ? 'repairs' : /Print|Bind|Copy/i.test(name) ? 'print' : /Gadget/i.test(name) ? 'gadget' : /Kitchen|Chop|Kibanda|Buka|Bukka|Canteen/i.test(name) ? 'kitchen' : /Cafe|Coffee/i.test(name) ? 'cafe' : 'provisions');
const FOOD = /Kitchen|Chop|Kibanda|Buka|Bukka|Canteen|Cafe|Coffee|kiosk/i; // food.js puts its own vendor in these

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
function tex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

// the back shelf: what each kind of shop has behind its counter, drawn flat in the game's paper colours
function shelfTexture(kind) {
  return tex(512, 320, (g, W, H) => {
    g.fillStyle = '#f3e3c2'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#c9a27a'; [100, 200, 300].forEach((y) => g.fillRect(0, y, W, 12)); // three shelves
    const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const can = (x, y, c) => { r(x, y - 46, 30, 46, c); r(x, y - 46, 30, 8, '#e8e2d0'); };
    const bottle = (x, y, c) => { r(x + 8, y - 64, 12, 18, c); r(x, y - 48, 28, 48, c); };
    if (kind === 'provisions') {
      for (let i = 0; i < 12; i++) can(14 + i * 41, 100, ['#e46f4f', '#2a9d94', '#f2b33d', '#7d5aa6'][i % 4]);
      for (let i = 0; i < 9; i++) bottle(16 + i * 55, 200, ['#6b3a1e', '#2f7d4f', '#c0392b'][i % 3]);
      for (let i = 0; i < 6; i++) { r(18 + i * 82, 252, 70, 48, '#e2b13c'); r(18 + i * 82, 252, 70, 10, '#c98f3a'); } // bread
    } else if (kind === 'repairs') {
      r(20, 20, W - 40, 76, '#2b2f33'); for (let i = 0; i < 8; i++) { r(36 + i * 58, 30, 40, 60, '#1d2028'); r(40 + i * 58, 34, 32, 50, ['#8fd6ff', '#a9dc8f', '#f6b3a8', '#f7d36b'][i % 4]); } // phones on the board
      // spanner and screwdriver, big, so the trade reads from down the street
      g.save(); g.translate(150, 160); g.rotate(-0.6); r(-8, -55, 16, 110, '#9aa3b2'); g.beginPath(); g.arc(0, -62, 22, 0, Math.PI * 2); g.fillStyle = '#9aa3b2'; g.fill(); r(-7, -88, 14, 22, '#f3e3c2'); g.restore();
      g.save(); g.translate(360, 160); g.rotate(0.6); r(-6, -20, 12, 75, '#9aa3b2'); r(-11, -70, 22, 52, '#e46f4f'); g.restore();
      for (let i = 0; i < 7; i++) r(30 + i * 68, 262, 50, 36, ['#1d2028', '#3b3f45'][i % 2]); // batteries and chargers
    } else if (kind === 'print') {
      r(40, 40, 140, 58, '#e8e2d0'); r(60, 30, 100, 14, '#3b3f45'); r(56, 80, 108, 10, '#2b2f33'); // the printer
      for (let i = 0; i < 4; i++) r(230 + i * 66, 30, 54, 70, ['#e46f4f', '#2a9d94', '#f2b33d', '#7d5aa6'][i]); // posters
      for (let i = 0; i < 8; i++) for (let k = 0; k < 5; k++) r(18 + i * 61, 192 - k * 9, 52, 7, k % 2 ? '#ffffff' : '#e8e2d0'); // reams
      for (let i = 0; i < 6; i++) r(26 + i * 80, 248, 62, 52, ['#2a6fb5', '#2f7d4f', '#c0392b'][i % 3]); // bound decks
    } else if (kind === 'gadget') {
      for (let i = 0; i < 8; i++) { r(18 + i * 60, 40, 48, 60, '#ffffff'); r(24 + i * 60, 50, 36, 36, ['#2a9d94', '#3b3f45', '#e46f4f'][i % 3]); } // boxed gadgets
      g.strokeStyle = '#1d2028'; g.lineWidth = 6; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(50 + i * 80, 150, 24, 0, Math.PI * 1.6); g.stroke(); } // cables
      for (let i = 0; i < 9; i++) r(16 + i * 55, 250, 40, 50, ['#1d2028', '#f2b33d', '#2a9d94'][i % 3]); // power banks
    } else if (kind === 'kitchen') {
      for (let i = 0; i < 4; i++) { g.fillStyle = '#9aa3b2'; g.beginPath(); g.ellipse(70 + i * 125, 80, 50, 18, 0, 0, Math.PI * 2); g.fill(); r(20 + i * 125, 40, 100, 42, '#b8bec4'); } // big pots
      for (let i = 0; i < 3; i++) { r(40 + i * 160, 130, 120, 68, ['#2a6fb5', '#e46f4f', '#2f7d4f'][i]); r(40 + i * 160, 130, 120, 12, '#f3e3c2'); } // coolers
      for (let i = 0; i < 10; i++) { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(30 + i * 50, 285, 22, 8, 0, 0, Math.PI * 2); g.fill(); } // plates
    } else if (kind === 'cafe') {
      r(40, 30, 150, 70, '#3b3f45'); r(60, 44, 40, 30, '#9aa3b2'); r(120, 44, 40, 30, '#9aa3b2'); // the machine
      for (let i = 0; i < 8; i++) { r(230 + (i % 4) * 66, 40 + Math.floor(i / 4) * 32, 40, 26, '#f4ead2'); } // cups
      for (let i = 0; i < 6; i++) r(26 + i * 80, 140, 60, 58, ['#8a5a36', '#6b3a1e'][i % 2]); // bags of beans
      for (let i = 0; i < 5; i++) { g.fillStyle = '#e2b13c'; g.beginPath(); g.ellipse(60 + i * 95, 280, 34, 16, 0, 0, Math.PI * 2); g.fill(); } // pies
    }
  });
}

export function buildShopfronts({ world, scene, props, addLamps, reduced }) {
  const group = new THREE.Group(); group.name = 'shopfronts'; scene.add(group);
  const M = { cheek: new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: 0.8 }), roof: new THREE.MeshStandardMaterial({ color: 0xe46f4f, roughness: 0.7 }),
    counter: new THREE.MeshStandardMaterial({ color: 0xa87950, roughness: 0.6 }), top: new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.5 }), dark: new THREE.MeshStandardMaterial({ color: 0x3b2a20, roughness: 0.9 }) };
  const people = [], shops = [];
  const W = WINDOW, half = W.w / 2;
  // the window's pieces, in the shop's own frame
  const frame = mergeGeometries([
    box(0.12, W.top - W.porch, W.front - W.wall, W.x - half, (W.top + W.porch) / 2, (W.wall + W.front) / 2), // left cheek
    box(0.12, W.top - W.porch, W.front - W.wall, W.x + half, (W.top + W.porch) / 2, (W.wall + W.front) / 2), // right cheek
  ]);
  const roof = box(W.w + 0.3, 0.1, W.front - W.wall + 0.25, W.x, W.top + 0.05, (W.wall + W.front) / 2 + 0.1);
  const counterFront = box(W.w - 0.12, 1.0, 0.12, W.x, W.porch + 0.5, W.front - 0.06);
  const counterTop = box(W.w + 0.06, 0.07, 0.42, W.x, W.porch + 1.03, W.front - 0.1);
  (props.interact || []).filter((it) => it.id?.startsWith('shop:') && it.at).forEach((it, i) => {
    const { x, z, ry } = it.at, kind = shopKind(it.name);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; group.add(g);
    g.add(new THREE.Mesh(frame, M.cheek), new THREE.Mesh(roof, M.roof), new THREE.Mesh(counterFront, M.counter), new THREE.Mesh(counterTop, M.top));
    // the shelf behind, lit from inside, over the old dark glass
    const sm = new THREE.MeshStandardMaterial({ map: shelfTexture(kind), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0.0, roughness: 0.9 });
    sm.emissiveMap = sm.map; sm.emissiveIntensity = 0.35;
    const shelf = new THREE.Mesh(new THREE.PlaneGeometry(W.w - 0.15, W.top - W.porch - 0.1), sm); shelf.position.set(W.x, (W.top + W.porch) / 2, W.wall + 0.26); g.add(shelf); // just in front of the old dark glass (z 3.10)
    // nobody walks into it: the window stands on the porch, inside the shop's own footprint
    const c = Math.cos(ry), s = Math.sin(ry), lx = W.x, lz = (W.wall + W.front) / 2;
    world.addColliders?.([{ name: 'shop_window', cx: x + lx * c + lz * s, cz: z - lx * s + lz * c, hx: half + 0.06, hz: (W.front - W.wall) / 2, ry, h: W.top }]);
    // a warm light inside the window, through the shared lamp pool
    const wx = x + lx * c + (W.wall + 0.6) * s, wz = z - lx * s + (W.wall + 0.6) * c;
    addLamps?.([{ x: wx, y: W.top - 0.2, z: wz, power: 10, boost: 6, color: 0xffcf8a }]);
    // where the attendant stands, and where you stand to be served (food.js reads these too)
    const stand = { x: x + lx * c + W.stand * s, z: z - lx * s + W.stand * c, y: W.porch, ry };
    const eye = { x: x + lx * c + (W.front + 1.15) * s, z: z - lx * s + (W.front + 1.15) * c };
    it.window = { stand, eye, kind };
    // move the place you press E to the window, so you face the attendant
    it.x = x + lx * c + (W.front + 0.9) * s; it.z = z - lx * s + (W.front + 0.9) * c;
    shops.push({ it, kind });
    if (FOOD.test(it.name)) return; // the kitchen and the cafe: food.js stands its vendor here
    const av = createAvatarModel({ color: '#888', style: 'tee' }); prepareLook(av.root); const rig = rigAvatar(av.root);
    dress(av.root, lookFor(`shopkeeper-${it.name}`, { tier: 1, fem: i % 2 === 0 }), rig);
    av.root.position.set(stand.x, stand.y, stand.z); av.root.rotation.y = ry; group.add(av.root);
    people.push({ av, rig, it, t: Math.random() * 10 });
  });

  // they are at work: a look down at the counter, a glance up the street, a wave when you come up to the window
  let t = 0;
  function update(dt, player) {
    t += dt;
    people.forEach((q) => {
      q.t += dt;
      const d = Math.hypot(player.x - q.it.x, player.z - q.it.z);
      if (d > 60) return; // too far to see
      q.rig?.update(dt * (reduced ? 0.5 : 1), { speed: 0, t: q.t });
      if (d < 3.4 && !q.greeted) { q.greeted = true; q.rig?.wave?.(); } else if (d > 8) q.greeted = false;
    });
  }
  // E at a shop that is not a food counter: the attendant greets you at the window
  function greet(it) { const q = people.find((p) => p.it === it); if (!q) return false; q.rig?.wave?.(); return true; }
  const bodies = () => people.map((q) => ({ x: q.av.root.position.x, z: q.av.root.position.z, r: 0.3 }));
  return { group, update, greet, shops, people, bodies, dispose() { group.removeFromParent(); } };
}
