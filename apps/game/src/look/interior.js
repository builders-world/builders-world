import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAvatarModel } from '../onboarding/avatar.js';
import { BUILDERS } from '../builders.js';
import { mulberry32 } from '../mesh.js';

// Enterable workspaces (world bible 6.6): reception and board, hot desks, focus pods, a meeting room,
// a cafeteria and a lounge. Metrics from the bible: ceiling 3.6 m, desks 0.75 m high and 1.4 m wide,
// aisles 1.2 m and more. Built once per place, far from the street, and shown on its own.

const ORIGIN = new THREE.Vector3(3000, 0, 0);
const W = 26, D = 18, H = 3.6;
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

export const PLACES = {
  hub: { name: 'Yaba Creative Hub', kind: 'Shared workspace', accent: 0x2a9d94, floor: 0x8a8f96, seed: 3 },
  loft: { name: 'Lagos Builders Loft', kind: 'Co-working loft', accent: 0xe46f4f, floor: 0x7a6656, seed: 7 },
  studio: { name: 'Eko Design Studio', kind: 'Design and media studio', accent: 0xf2b33d, floor: 0x6a707c, seed: 11 },
};

// the three places take the district's name, so Wuse gets a Wuse hub, not a Yaba one
export function namePlaces(district = 'Yaba', city = 'Lagos') {
  if (district === 'Yaba') return;
  PLACES.hub.name = `${district} Creative Hub`;
  PLACES.loft.name = `${city} Builders Loft`;
  PLACES.studio.name = `${district} Design Studio`;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function codeScreen(lines) {
  return canvasTex(512, 320, (g, w, h) => {
    g.fillStyle = '#0d1117'; g.fillRect(0, 0, w, h);
    g.font = '15px Menlo, monospace';
    const cols = ['#79c0ff', '#ffa657', '#a5d6ff', '#d2a8ff', '#7ee787', '#e6edf3'];
    lines.forEach((l, i) => { g.fillStyle = cols[i % cols.length]; g.fillText(l, 16, 28 + i * 20); });
  });
}

const SNIPPET = [
  "import { buildWorld } from './world.js';",
  '',
  'export function grow(plot, work) {',
  '  // verified pushes light windows',
  '  plot.lit = work.lastPush < 1;',
  '  plot.floors = floorsFor(work);',
  '  return plot;',
  '}',
  '',
  '// git push origin main',
  '// ✓ 3 commits verified',
];

export function createInteriors({ scene, reduced, toast, getEnv }) {
  const built = {};
  let current = null; // { key, group, colliders, seats, interact }
  const fade = document.createElement('div');
  Object.assign(fade.style, { position: 'fixed', inset: '0', background: '#05070d', opacity: '0', pointerEvents: 'none', transition: 'opacity .35s ease', zIndex: '40' });
  document.body.appendChild(fade);

  // the computer overlay: a working screen at your desk
  const screen = document.createElement('div');
  screen.innerHTML = `<style>
    #lki { position: fixed; z-index: 34; inset: 6vh 8vw; border-radius: 28px; border: 14px solid #f7efdc; box-shadow: 0 6px 0 rgba(59,42,32,.25), 0 30px 70px rgba(10,14,30,.4); background: #0d1117; color: #e6edf3; display: none; overflow: hidden;
      box-shadow: 0 30px 90px rgba(0,0,0,.6); font: 13px/1.5 Menlo, ui-monospace, monospace; }
    #lki.on { display: grid; grid-template-columns: 220px 1fr; }
    #lki aside { background: #161b22; padding: 16px; border-right: 1px solid #30363d; }
    #lki aside h4 { margin: 0 0 10px; font: 700 12px/1 system-ui; letter-spacing: .1em; text-transform: uppercase; color: #8b949e; }
    #lki aside div { padding: 6px 8px; border-radius: 6px; color: #c9d1d9; }
    #lki aside div.on { background: #1f6feb33; color: #fff; }
    #lki main { padding: 18px 22px; overflow: auto; position: relative; }
    #lki pre { margin: 0; white-space: pre-wrap; }
    #lki .bar { position: absolute; right: 18px; top: 14px; display: flex; gap: 8px; }
    #lki button { font: 600 12px system-ui; border: 0; border-radius: 8px; padding: 8px 12px; cursor: pointer; background: #21262d; color: #e6edf3; }
    #lki button.p { background: #238636; }
    #lki .term { white-space: pre-wrap; margin-top: 18px; padding: 12px; border-radius: 10px; background: #010409; color: #7ee787; min-height: 80px; }
  </style><div id="lki" role="dialog" aria-label="Your computer"></div>`;
  document.body.appendChild(screen);
  const lki = screen.querySelector('#lki');
  function openComputer() {
    const you = BUILDERS.find((b) => b.id === 'you');
    lki.innerHTML = `<aside><h4>Repositories</h4>${(you?.repoList || []).map(([r], i) => `<div class="${i ? '' : 'on'}">${r}</div>`).join('')}
      <h4 style="margin-top:18px">This desk</h4><div>${current ? PLACES[current.key].name : ''}</div></aside>
      <main><div class="bar"><button class="p">Commit and push</button><button class="x">Close (Esc)</button></div>
      <pre>${SNIPPET.join('\n').replace(/</g, '&lt;')}</pre>
      <div class="term">$ git status\nOn branch main\nYour branch is up to date with 'origin/main'.</div></main>`;
    lki.classList.add('on');
    lki.querySelector('.x').onclick = closeComputer;
    lki.querySelector('.p').onclick = () => {
      lki.querySelector('.term').textContent = '$ git push origin main\nThis desk is a preview. Real pushes count when GitHub verifies them, wherever you work.';
    };
  }
  function closeComputer() { lki.classList.remove('on'); }

  function build(key) {
    const P = PLACES[key];
    const rng = mulberry32(P.seed);
    const g = new THREE.Group();
    g.position.copy(ORIGIN);
    g.visible = false;
    const mat = (c, r = 0.7, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const M = {
      floor: mat(P.floor, 0.35), wall: mat(0xd9d2c3, 0.85), trim: mat(P.accent, 0.6), wood: mat(0x8a5a36, 0.6), woodL: mat(0xc9a27a, 0.6),
      metal: mat(0x3a3f48, 0.4, 0.6), dark: mat(0x1d2028, 0.5), fabric: mat(0x3f5a6a, 0.95), fabric2: mat(P.accent, 0.95),
      glass: new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.05, transparent: true, opacity: 0.25 }),
      leaf: mat(0x2f6b2c, 0.8), pot: mat(0xb8b0a0, 0.9),
      warm: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.3, 0.6) }),
      sky: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.75, 1.0) }),
    };
    const add = (geo, m, cast = true) => { const o = new THREE.Mesh(geo, m); g.add(o); return o; };
    const colliders = []; // [x0, z0, x1, z1] in interior space
    const block = (x, z, w, d) => colliders.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);

    // shell: floor, ceiling, walls, teal trim, a glass front onto the street with real daylight behind it
    add(box(W, 0.1, D, 0, -0.05, 0), M.floor);
    add(box(W, 0.1, D, 0, H + 0.05, 0), M.wall);
    add(mergeGeometries([box(W, H, 0.2, 0, H / 2, -D / 2), box(0.2, H, D, -W / 2, H / 2, 0), box(0.2, H, D, W / 2, H / 2, 0),
      box(W / 2 - 3, H, 0.2, -W / 4 - 1.5, H / 2, D / 2)]), M.wall);
    add(mergeGeometries([box(W, 0.12, 0.25, 0, H - 0.1, -D / 2 + 0.05), box(0.25, 0.12, D, -W / 2 + 0.05, H - 0.1, 0), box(0.25, 0.12, D, W / 2 - 0.05, H - 0.1, 0), box(W, 0.3, 0.22, 0, 0.15, -D / 2 + 0.1)]), M.trim);
    const window = add(box(W / 2 - 1, H - 0.8, 0.05, W / 4 + 0.5, H / 2, D / 2 - 0.05), M.sky);
    add(box(W / 2 - 1, H - 0.8, 0.08, W / 4 + 0.5, H / 2, D / 2 - 0.12), M.glass);
    [[0, -D / 2, W, 0.4], [-W / 2, 0, 0.4, D], [W / 2, 0, 0.4, D], [-W / 4 - 1.5, D / 2, W / 2 - 3, 0.4], [W / 4 + 0.5, D / 2, W / 2 - 1, 0.4]].forEach(([x, z, w, d]) => block(x, z, w, d));
    // the door: 2 m wide, between the wall and the glass (bible 4.1)
    const door = { x: -1.5, z: D / 2 - 1.2 };

    // reception and the hub board
    add(box(3.2, 1.05, 0.8, -6, 0.525, D / 2 - 3), M.woodL); block(-6, D / 2 - 3, 3.2, 0.8);
    add(box(3.3, 0.06, 0.9, -6, 1.08, D / 2 - 3), M.trim);
    const boardTex = canvasTex(512, 256, (x, w, h) => {
      x.fillStyle = '#2b4a5a'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#f4ead2'; x.font = '900 34px "Arial Black", Impact, sans-serif'; x.fillText(P.name.toUpperCase(), 20, 48);
      x.font = '20px Arial'; ['Demo night: Thursday 7pm', 'Wifi: ask at reception', 'Rust study group: room 2', 'Hiring? Pin it here'].forEach((t, i) => {
        x.fillStyle = ['#f7e27a', '#a8e0d0', '#f6a8a0', '#f9f3e3'][i]; x.fillRect(20 + (i % 2) * 245, 80 + Math.floor(i / 2) * 85, 225, 70);
        x.fillStyle = '#2b241d'; x.fillText(t, 30 + (i % 2) * 245, 120 + Math.floor(i / 2) * 85);
      });
    });
    add(new THREE.PlaneGeometry(3.2, 1.6).rotateY(Math.PI).translate(-9, 1.9, D / 2 - 0.12), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.8 }));

    // hot desks: rows of desks with monitors and chairs, instanced
    const desks = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) desks.push({ x: -10 + col * 2.6, z: -5 + row * 3.0 });
    const deskGeo = { top: box(1.4, 0.05, 0.7, 0, 0.75, 0), legs: mergeGeometries([box(0.05, 0.75, 0.6, -0.65, 0.375, 0), box(0.05, 0.75, 0.6, 0.65, 0.375, 0)]),
      monitor: mergeGeometries([box(0.6, 0.36, 0.03, 0, 1.1, -0.25), box(0.05, 0.2, 0.05, 0, 0.88, -0.25)]),
      chair: mergeGeometries([box(0.5, 0.06, 0.5, 0, 0.46, 0.55), box(0.5, 0.5, 0.06, 0, 0.75, 0.8), box(0.06, 0.45, 0.06, 0, 0.22, 0.55)]) };
    const inst = (geo, m, list) => {
      const im = new THREE.InstancedMesh(geo, m, list.length);
      const mm = new THREE.Matrix4();
      list.forEach((d, i) => im.setMatrixAt(i, mm.makeTranslation(d.x, 0, d.z)));
      g.add(im);
      return im;
    };
    inst(deskGeo.top, M.woodL, desks); inst(deskGeo.legs, M.metal, desks); inst(deskGeo.monitor, M.dark, desks); inst(deskGeo.chair, M.fabric, desks);
    desks.forEach((d) => block(d.x, d.z, 1.4, 0.7));
    // a lit screen on every desk someone is using
    const screenMat = new THREE.MeshBasicMaterial({ map: codeScreen(SNIPPET) });
    const used = new Set();
    desks.forEach((d, i) => { if (rng() < 0.45) used.add(i); });
    const screens = desks.filter((_, i) => used.has(i));
    inst(new THREE.PlaneGeometry(0.56, 0.32).translate(0, 1.1, -0.23), screenMat, screens);

    // people working, unnamed (ambient), seated at the used desks
    const people = [];
    const shirts = ['#3a8f6d', '#2d3f66', '#c25b4a', '#e0c36a', '#5a7fb0', '#d9d2c3', '#8a5aa0'];
    [...used].slice(0, 6).forEach((i, k) => {
      const av = createAvatarModel({ color: shirts[k % shirts.length], style: k % 2 ? 'hoodie' : 'jacket' });
      av.root.position.set(desks[i].x, -0.42, desks[i].z + 0.55);
      av.root.rotation.y = Math.PI;
      g.add(av.root); people.push(av);
    });

    // focus pods
    [[9, -7], [11.6, -7]].forEach(([x, z]) => {
      add(mergeGeometries([box(2.2, 2.4, 0.08, x, 1.2, z - 1.0), box(0.08, 2.4, 2.0, x - 1.1, 1.2, z), box(0.08, 2.4, 2.0, x + 1.1, 1.2, z)]), M.fabric2);
      add(box(1.2, 0.05, 0.6, x, 0.75, z - 0.6), M.woodL);
      block(x, z - 0.5, 2.2, 1.2);
    });

    // meeting room: glass walls, a long table
    add(mergeGeometries([box(6, 2.6, 0.06, 7, 1.3, -1.5), box(0.06, 2.6, 4, 4, 1.3, 0.5)]), M.glass);
    add(box(3.6, 0.06, 1.2, 7.5, 0.75, 0.6), M.wood);
    add(mergeGeometries([box(0.08, 0.72, 1.0, 6, 0.36, 0.6), box(0.08, 0.72, 1.0, 9, 0.36, 0.6)]), M.metal);
    block(7.5, 0.6, 3.6, 1.2); block(7, -1.5, 6, 0.3); block(4, -0.5, 0.3, 2);

    // cafeteria: counter, coffee machine, fridge, menu, round tables
    add(box(5, 1.05, 0.8, 8, 0.525, 5.2), M.wood); block(8, 5.2, 5, 0.8);
    add(box(5.1, 0.06, 0.9, 8, 1.08, 5.2), M.trim);
    add(box(0.5, 0.6, 0.45, 6.5, 1.4, 5.1), M.metal);
    add(box(0.9, 1.9, 0.7, 11.8, 0.95, 5.4), M.metal); block(11.8, 5.4, 0.9, 0.7);
    const menuTex = canvasTex(512, 256, (x, w, h) => {
      x.fillStyle = '#1d2028'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#f2b33d'; x.font = '900 32px "Arial Black", sans-serif'; x.fillText('CAFETERIA', 20, 44);
      x.fillStyle = '#eef2ff'; x.font = '22px Arial';
      ['Zobo', 'Chapman', 'Coffee', 'Puff-puff', 'Jollof and plantain'].forEach((t, i) => x.fillText(t, 24 + (i % 2) * 250, 92 + Math.floor(i / 2) * 50));
      x.fillStyle = '#a3afd0'; x.font = '16px Arial'; x.fillText('Free for builders today', 24, 236);
    });
    add(new THREE.PlaneGeometry(2.6, 1.3).rotateY(Math.PI).translate(8, 2.5, D / 2 - 0.12), new THREE.MeshBasicMaterial({ map: menuTex }));
    const tables = [{ x: 4, z: 3.6 }, { x: 6.2, z: 2.4 }, { x: 10.8, z: 2.6 }];
    inst(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 16).translate(0, 0.75, 0), M.woodL, tables);
    inst(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8).translate(0, 0.375, 0), M.metal, tables);
    tables.forEach((t) => block(t.x, t.z, 0.9, 0.9));
    const barista = createAvatarModel({ color: '#2a9d94', style: 'jacket' });
    barista.root.position.set(8.4, 0, 6.1); barista.root.rotation.y = Math.PI; g.add(barista.root); people.push(barista);

    // lounge: sofa, plants
    add(mergeGeometries([box(2.6, 0.45, 0.9, -9, 0.225, 5), box(2.6, 0.5, 0.2, -9, 0.7, 5.4)]), M.fabric2); block(-9, 5, 2.6, 0.9);
    [[-12, 7.5], [11.8, -8], [-12, -8], [3, 7.6]].forEach(([x, z]) => {
      add(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 10).translate(x, 0.25, z), M.pot);
      add(new THREE.IcosahedronGeometry(0.55, 0).translate(x, 1.0, z), M.leaf);
      block(x, z, 0.6, 0.6);
    });

    // pendant lights: warm practicals and a few real lights
    const pend = [];
    for (let x = -9; x <= 9; x += 6) for (let z = -4; z <= 4; z += 4) pend.push({ x, z });
    inst(new THREE.CylinderGeometry(0.18, 0.28, 0.2, 12).translate(0, H - 0.6, 0), M.warm, pend);
    const lights = [];
    [[-6, -2], [3, -2], [8, 4], [-8, 4]].forEach(([x, z]) => { const l = new THREE.PointLight(0xffc27a, 22, 14, 1.6); l.position.set(x, H - 0.7, z); g.add(l); lights.push(l); });
    const hemi = new THREE.HemisphereLight(0xdfe6ff, 0x4a3f35, 0.9); g.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1dc, 0); sun.position.set(6, 8, 14); g.add(sun);

    // what you can do here
    const interact = [
      { id: 'in:exit', label: `Leave ${P.name}`, x: door.x, z: door.z + 0.6, r: 2.2 },
      { id: 'in:board', label: 'Read the hub board', x: -9, z: D / 2 - 2, r: 2.2 },
      { id: 'in:cafe', label: 'Order at the counter', x: 8, z: 4.2, r: 2.4 },
      { id: 'in:meet', label: 'Book the meeting room', x: 5, z: 1.5, r: 2.2 },
      ...desks.map((d, i) => (used.has(i) ? null : { id: `in:desk:${i}`, label: 'Sit at this desk', x: d.x, z: d.z + 1.0, r: 1.3, desk: d })).filter(Boolean),
    ];

    scene.add(g);
    return { key, group: g, colliders, interact, door, window, sun, people, desks };
  }

  // ---------- inside: walking, sitting, the laptop ----------
  let seated = null, laptop = null;
  const laptopMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.35, metalness: 0.6 });
  const laptopScreen = new THREE.MeshBasicMaterial({ map: codeScreen(SNIPPET) });

  function enter(key) {
    if (!built[key]) built[key] = build(key);
    current = built[key];
    fade.style.opacity = '1';
    return new Promise((res) => setTimeout(() => {
      current.group.visible = true;
      fade.style.opacity = '0';
      toast(`${PLACES[key].name}. ${PLACES[key].kind}. Find a free desk, or grab something at the cafeteria.`, 4500);
      res({ x: ORIGIN.x + current.door.x, z: ORIGIN.z + current.door.z - 1.5, yaw: Math.PI });
    }, reduced ? 0 : 360));
  }

  function leave() {
    if (!current) return;
    stand();
    current.group.visible = false;
    current = null;
    closeComputer();
  }

  function sit(desk) {
    seated = desk;
    laptop?.removeFromParent();
    laptop = new THREE.Group();
    const base = new THREE.Mesh(box(0.34, 0.02, 0.24, 0, 0.785, 0.05), laptopMat);
    const lid = new THREE.Group();
    lid.position.set(0, 0.795, -0.07);
    lid.add(new THREE.Mesh(box(0.34, 0.22, 0.012, 0, 0.11, 0), laptopMat));
    lid.add(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19).translate(0, 0.11, 0.008), laptopScreen));
    lid.rotation.x = -Math.PI / 2; // closed to begin with
    laptop.add(base, lid);
    laptop.position.set(desk.x, 0, desk.z);
    laptop.userData.lid = lid;
    current.group.add(laptop);
    return { x: ORIGIN.x + desk.x, z: ORIGIN.z + desk.z + 0.55, yaw: Math.PI };
  }
  function stand() { seated = null; laptop?.removeFromParent(); laptop = null; closeComputer(); }

  // E inside: returns an action for the caller (walk out, sit, open laptop) or handles it here
  function use(px, pz) {
    if (!current) return null;
    const x = px - ORIGIN.x, z = pz - ORIGIN.z;
    if (seated) {
      const lid = laptop.userData.lid;
      if (lid.rotation.x < -0.5) { lid.userData.opening = true; toast('Laptop open. Press E again to use it, Esc to stand up.'); return { handled: true }; }
      openComputer();
      return { handled: true };
    }
    let best = null, bd = Infinity;
    current.interact.forEach((it) => { const d = Math.hypot(it.x - x, it.z - z); if (d < it.r && d < bd) { bd = d; best = it; } });
    if (!best) return null;
    if (best.id === 'in:exit') return { exit: true };
    if (best.id === 'in:board') { toast('Demo night is Thursday at 7pm. The Rust study group meets in room 2.', 4500); return { handled: true }; }
    if (best.id === 'in:cafe') { const items = ['Zobo', 'Chapman', 'coffee', 'puff-puff', 'jollof and plantain']; toast(`Your ${items[Math.floor(Math.random() * items.length)]} is ready at the counter. Free for builders today.`); return { handled: true }; }
    if (best.id === 'in:meet') { toast('Meeting room booked for 30 minutes. Voice rooms arrive with multiplayer.'); return { handled: true }; }
    if (best.desk) return { sit: sit(best.desk) };
    return null;
  }

  function prompt(px, pz) {
    if (!current) return null;
    if (seated) return laptop?.userData.lid.rotation.x < -0.5 ? 'Open your laptop' : 'Use your computer';
    const x = px - ORIGIN.x, z = pz - ORIGIN.z;
    let best = null, bd = Infinity;
    current.interact.forEach((it) => { const d = Math.hypot(it.x - x, it.z - z); if (d < it.r && d < bd) { bd = d; best = it; } });
    return best?.label || null;
  }

  // collisions inside: walls and furniture as boxes, the player as a circle
  function resolve(pos, rad = 0.45) {
    if (!current) return;
    const x = pos.x - ORIGIN.x, z = pos.z - ORIGIN.z;
    let nx = Math.max(-W / 2 + rad + 0.2, Math.min(W / 2 - rad - 0.2, x)), nz = Math.max(-D / 2 + rad + 0.2, Math.min(D / 2 - rad - 0.2, z));
    current.colliders.forEach(([x0, z0, x1, z1]) => {
      const cx = Math.max(x0, Math.min(x1, nx)), cz = Math.max(z0, Math.min(z1, nz));
      const dx = nx - cx, dz = nz - cz, d = Math.hypot(dx, dz);
      if (d < rad) {
        if (d > 1e-4) { nx = cx + (dx / d) * rad; nz = cz + (dz / d) * rad; } else {
          const l = nx - x0, r = x1 - nx, t = nz - z0, b = z1 - nz, m = Math.min(l, r, t, b);
          if (m === l) nx = x0 - rad; else if (m === r) nx = x1 + rad; else if (m === t) nz = z0 - rad; else nz = z1 + rad;
        }
      }
    });
    pos.x = nx + ORIGIN.x; pos.z = nz + ORIGIN.z;
  }
  function solidAt(x, y, z) {
    if (!current) return false;
    const lx = x - ORIGIN.x, lz = z - ORIGIN.z;
    return y > H - 0.2 || Math.abs(lx) > W / 2 - 0.3 || Math.abs(lz) > D / 2 - 0.3;
  }

  function update(dt, t) {
    if (!current) return;
    const env = getEnv?.() || { day: 1 };
    // the window shows the real sky: bright by day, deep blue at night
    current.window.material.color.setRGB(0.15 + 0.75 * env.day, 0.22 + 0.7 * env.day, 0.45 + 0.6 * env.day);
    current.sun.intensity = 1.6 * env.day;
    if (laptop?.userData.lid.userData.opening) {
      const lid = laptop.userData.lid;
      lid.rotation.x = Math.min(0.25, lid.rotation.x + dt * (reduced ? 100 : 3));
      if (lid.rotation.x >= 0.25) lid.userData.opening = false;
    }
  }

  return {
    enter, leave, use, prompt, resolve, solidAt, update, stand, closeComputer,
    get active() { return !!current; }, get seated() { return !!seated; }, get room() { return current; }, origin: ORIGIN, get computerOpen() { return lki.classList.contains('on'); },
    dispose() { Object.values(built).forEach((b) => { b.people.forEach((p) => p.dispose()); b.group.traverse((o) => o.geometry?.dispose()); b.group.removeFromParent(); }); fade.remove(); screen.remove(); },
  };
}
