import * as THREE from 'three';

// Style (world bible 7.4a): bodies, skin tones, hairstyles, Afrocentric fashion, footwear and
// accessories, layered over the shared avatar without touching Codex's file (src/onboarding/avatar.js).
// The avatar is a set of plain parts; this finds them by place and material, recolours them, and adds
// what the look needs: braids, locs, an afro, a gele, a fila; Ankara and Adire prints; an agbada, a
// kaftan, a wrapper or a dress; sandals, boots or heels; earrings, beads, a crossbody bag.
// Call dress() before rigAvatar(), or pass the rig, so new parts ride the right joints.

export const OPTIONS = {
  body: [['m', 'Broad'], ['f', 'Curvy']],
  skin: [['#5a3825', 'Deep'], ['#7a4a2e', 'Dark'], ['#986746', 'Brown'], ['#b07a52', 'Caramel'], ['#c99a6e', 'Light']],
  hair: [['low', 'Low cut'], ['fade', 'Fade'], ['afro', 'Afro'], ['locs', 'Locs'], ['braids', 'Braids'], ['cornrows', 'Cornrows'], ['bun', 'Bun'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['bald', 'Clean shave'], ['gele', 'Gele'], ['fila', 'Fila cap']],
  hairColor: [['#1b1714', 'Black'], ['#4a2c1a', 'Brown'], ['#8a4a1f', 'Copper'], ['#c9a227', 'Gold tips'], ['#7a2e5a', 'Plum']],
  top: [['jacket', 'Jacket'], ['hoodie', 'Hoodie'], ['tee', 'Tee'], ['ankara', 'Ankara shirt'], ['adire', 'Adire top'], ['kaftan', 'Kaftan'], ['agbada', 'Agbada'], ['dress', 'Ankara dress']],
  topColor: [['#e2b13c', 'Gold'], ['#2a9d94', 'Teal'], ['#e46f4f', 'Coral'], ['#3a4f7a', 'Indigo'], ['#5f9a45', 'Green'], ['#7d5aa6', 'Purple'], ['#f4ead2', 'Cream'], ['#1d2028', 'Black']],
  bottom: [['trousers', 'Trousers'], ['shorts', 'Shorts'], ['skirt', 'Skirt'], ['wrapper', 'Wrapper']],
  bottomColor: [['#304344', 'Slate'], ['#1d2028', 'Black'], ['#6b4a30', 'Brown'], ['#2f4f7f', 'Denim'], ['#e0d6bf', 'Khaki']],
  shoes: [['sneakers', 'Sneakers'], ['sandals', 'Palm sandals'], ['boots', 'Boots'], ['heels', 'Heels'], ['loafers', 'Loafers']],
  shoeColor: [['#ddd5be', 'White'], ['#1d2028', 'Black'], ['#8a5a36', 'Tan'], ['#e46f4f', 'Red']],
  acc: [['earrings', 'Earrings'], ['beads', 'Coral beads'], ['glasses', 'Glasses'], ['bag', 'Crossbody bag'], ['watch', 'Watch']],
};
const has = (k, v) => OPTIONS[k].some(([x]) => x === v);
export const DEFAULT_LOOK = { body: 'm', skin: '#986746', hair: 'low', hairColor: '#1b1714', top: 'jacket', topColor: '#e2b13c', bottom: 'trousers', bottomColor: '#304344', shoes: 'sneakers', shoeColor: '#ddd5be', acc: [] };

// keep only known values: used on anything that arrives from the network or storage
export function cleanLook(l = {}) {
  const out = { ...DEFAULT_LOOK };
  for (const k of Object.keys(OPTIONS)) {
    if (k === 'acc') out.acc = Array.isArray(l.acc) ? [...new Set(l.acc.filter((a) => has('acc', a)))].slice(0, 5) : [];
    else if (has(k, l[k]) || (/Color$/.test(k) && /^#[0-9a-fA-F]{6}$/.test(l[k] || ''))) out[k] = l[k];
  }
  return out;
}

// prints: drawn once per colour, cached
const prints = new Map();
function print(kind, color) {
  const key = `${kind}|${color}`; if (prints.has(key)) return prints.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const base = new THREE.Color(color), hex = (k) => `#${base.clone().offsetHSL(k[0], k[1], k[2]).getHexString()}`;
  g.fillStyle = color; g.fillRect(0, 0, 128, 128);
  if (kind === 'ankara') {
    const a = hex([0.45, 0.1, 0.05]), b = hex([0.1, 0.05, 0.25]), d = hex([0, 0, -0.25]);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = 16 + i * 32, y = 16 + j * 32;
      g.fillStyle = a; g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = b; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = d; g.fillRect(x + 12, y - 2, 6, 4); g.fillRect(x - 2, y + 12, 4, 6);
    }
  } else { // adire: indigo resist-dye, circles and lines
    g.fillStyle = '#26365e'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(230,236,250,.85)'; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = 16 + i * 32, y = 16 + j * 32; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(x - 14, y + 14); g.lineTo(x + 14, y + 14); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  prints.set(key, t); return t;
}

const near = (a, b, e = 0.012) => Math.abs(a - b) < e;
const G = { box: new THREE.BoxGeometry(1, 1, 1), sphere: new THREE.SphereGeometry(1, 14, 10), cyl: new THREE.CylinderGeometry(1, 1, 1, 14), cone: new THREE.CylinderGeometry(0.62, 1, 1, 16, 1, true), cone3: new THREE.ConeGeometry(1, 1, 3), torus: new THREE.TorusGeometry(1, 0.18, 6, 18) };

// find the avatar's own parts by where they are: call before rigAvatar() moves them onto joints
export function prepareLook(root) {
  if (root.userData.dressFound) return root.userData.dressFound;
  const kids = []; root.traverse((o) => { if (o.isMesh) kids.push(o); });
  const byColor = (hex) => kids.find((o) => o.material?.color?.getHexString() === hex)?.material;
  return (root.userData.dressFound = {
    skin: byColor('986746'), hair: byColor('252722'), trouser: byColor('304344'), shoe: byColor('ddd5be'),
    shirt: kids.find((o) => near(o.position.y, 1.03) && near(o.scale.x, 0.49))?.material,
    torso: kids.find((o) => near(o.position.y, 1.03) && near(o.scale.x, 0.49)),
    cap: kids.find((o) => near(o.position.y, 1.77)), brows: kids.filter((o) => near(o.position.y, 1.65)),
    shoes: kids.filter((o) => o.material?.color?.getHexString() === 'ddd5be'),
    // the base model's own garment details, switched per top below
    hood: kids.find((o) => near(o.position.y, 1.32) && near(o.position.z, -0.1)),
    zipper: kids.find((o) => near(o.position.y, 1.06) && near(o.position.z, 0.146)),
    collar: kids.find((o) => near(o.position.y, 1.28) && near(o.position.z, 0.151)),
    pocket: kids.find((o) => near(o.position.y, 1.14) && near(o.position.x, 0.12)),
  });
}

export function dress(root, look, rig) {
  const L = cleanLook(look);
  // undo the previous look
  (root.userData.dressParts || []).forEach((o) => { o.removeFromParent(); o.traverse?.((c) => { if (c.userData?.ownGeo) c.geometry?.dispose(); }); o.material?.dispose?.(); });
  const parts = root.userData.dressParts = [];
  if (!root.userData.dressFound) prepareLook(root);
  const F = root.userData.dressFound;
  if (!F.skin || !F.shirt) return L; // not the shared avatar
  // the rig has moved parts onto joints: new parts go where the rig says, by height
  const put = (obj, y) => { if (rig?.attach) rig.attach(obj, y > 1.36 ? 'head' : 'chest'); else root.add(obj); parts.push(rig?.attach ? obj.parent : obj); };
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
  const add = (geo, m, x, y, z, sx, sy, sz, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, 0, rz); put(o, y); return o; };

  // colours
  F.skin.color.set(L.skin); F.hair.color.set(L.hairColor); F.trouser.color.set(L.bottomColor); F.shoe.color.set(L.shoeColor);
  // the top: colour, and a print for Ankara and Adire
  const printed = ['ankara', 'adire', 'dress', 'agbada', 'kaftan'].includes(L.top);
  F.shirt.color.set(printed && L.top !== 'kaftan' ? '#ffffff' : L.topColor);
  F.shirt.map = printed && L.top !== 'kaftan' ? print(L.top === 'adire' ? 'adire' : 'ankara', L.topColor) : null; F.shirt.needsUpdate = true;
  // hair
  const H = mat(L.hairColor), cap = F.cap;
  if (cap) cap.visible = ['low', 'fade', 'afro', 'bun', 'cornrows', 'long', 'ponytail'].includes(L.hair);
  F.brows.forEach((b) => { b.visible = true; });
  if (cap) cap.scale.set(0.208, L.hair === 'fade' ? 0.07 : 0.105, 0.19);
  if (L.hair === 'afro') add(G.sphere, H, 0, 1.84, -0.06, 0.3, 0.22, 0.26); // sits back off the brows, so the face shows
  if (L.hair === 'bun') add(G.sphere, H, 0, 1.86, -0.12, 0.1, 0.1, 0.1);
  // long hair: a fringe-less fall down the back to the shoulder blades, and over the ears
  if (L.hair === 'long') { add(G.sphere, H, 0, 1.76, -0.03, 0.225, 0.13, 0.21); add(G.box, H, 0, 1.47, -0.13, 0.4, 0.5, 0.1); [-1, 1].forEach((s2) => add(G.box, H, s2 * 0.2, 1.56, -0.02, 0.06, 0.3, 0.16)); }
  // a high ponytail
  if (L.hair === 'ponytail') { add(G.sphere, H, 0, 1.76, -0.03, 0.22, 0.12, 0.2); add(G.sphere, H, 0, 1.84, -0.19, 0.07, 0.07, 0.07); add(G.cyl, H, 0, 1.64, -0.25, 0.05, 0.36, 0.05, 0.25); }
  if (L.hair === 'cornrows') for (let k = -2; k <= 2; k++) add(G.box, H, k * 0.075, 1.79, -0.04, 0.035, 0.03, 0.36);
  if (L.hair === 'locs' || L.hair === 'braids') {
    add(G.sphere, H, 0, 1.77, -0.025, 0.215, 0.11, 0.2);
    const n = L.hair === 'braids' ? 14 : 10, len = L.hair === 'braids' ? 0.42 : 0.3, w = L.hair === 'braids' ? 0.025 : 0.04;
    for (let k = 0; k < n; k++) { const a = Math.PI * 0.15 + (k / (n - 1)) * Math.PI * 0.7; add(G.cyl, H, Math.cos(a) * 0.19, 1.66 - len / 2 + 0.08, -Math.sin(a) * 0.15 - 0.03, w, len, w); }
  }
  if (L.hair === 'gele') { // a head tie, folded high, in the outfit's print
    const gm = mat('#ffffff'); gm.map = print('ankara', L.topColor);
    add(G.sphere, gm, 0, 1.79, -0.02, 0.24, 0.13, 0.22);
    [[0, 1.9, -0.02, 0.3, 0.09, 0.2, 0.3], [0.08, 1.98, -0.04, 0.26, 0.08, 0.17, -0.5], [-0.09, 1.95, 0.02, 0.22, 0.07, 0.16, 0.7]].forEach(([x, y, z, sx, sy, sz, rz]) => add(G.box, gm, x, y, z, sx, sy, sz, 0, rz));
  }
  if (L.hair === 'fila') { const fm = mat(L.topColor); add(G.cyl, fm, 0, 1.82, -0.02, 0.21, 0.14, 0.2); add(G.box, fm, 0.1, 1.9, -0.02, 0.2, 0.04, 0.2, 0, -0.5); }

  // ---------- the body (after LEGO's minifigs and Minecraft's Alex: the frame reads in the shoulders,
  // the arms, the waist and the hips, and the face, not in bulk) ----------
  const fem = L.body === 'f';
  if (F.torso) F.torso.scale.x = fem ? 0.4 : 0.49;
  const arms = [rig?.L, rig?.R].filter(Boolean);
  arms.forEach((side, i) => {
    const sgn = i === 0 ? -1 : 1;
    if (side.shoulder.userData.x0 === undefined) side.shoulder.userData.x0 = side.shoulder.position.x;
    side.shoulder.position.x = side.shoulder.userData.x0 * (fem ? 0.86 : 1);
    void sgn;
  });
  // the meshes of each arm: the upper sleeve, the forearm (sleeve or skin), the hand
  const armMeshes = (side) => ({ upper: side.shoulder.children.find((o) => o.isMesh), fore: side.elbow.children.find((o) => o.isMesh && o.geometry?.type === 'BoxGeometry' && Math.abs(o.position.y) < 1e-6) });
  const SHORT = ['tee', 'ankara', 'dress'].includes(L.top);
  arms.forEach((side) => {
    const m = armMeshes(side);
    [m.upper, m.fore].forEach((o) => { if (!o) return; o.scale.x = fem ? 0.78 : 1; o.scale.z = fem ? 0.9 : 1; });
    if (m.fore) m.fore.material = SHORT ? F.skin : F.shirt;
  });
  // a face: lashes and lips for the curvy frame, as minifigs print them
  const skinCol = new THREE.Color(L.skin);
  // (a rigged person's face is drawn by expressions.js, which draws the lashes and lips itself)
  root.userData.face?.setFem(fem);
  if (fem && !root.userData.face) {
    const lash = mat('#1b1714');
    [-1, 1].forEach((s2) => add(G.box, lash, s2 * 0.105, 1.66, 0.165, 0.035, 0.012, 0.012, 0, s2 * 0.5));
    add(G.box, mat(`#${skinCol.clone().lerp(new THREE.Color('#b0414f'), 0.55).getHexString()}`), 0, 1.525, 0.182, 0.07, 0.022, 0.012);
  }

  // ---------- the top ----------
  const shade = (c, k) => `#${new THREE.Color(c).offsetHSL(0, 0, k).getHexString()}`;
  const topBase = printed && L.top !== 'kaftan' ? '#5a4a3a' : L.topColor;
  const trim = mat(shade(topBase, -0.18)), skinM = mat(L.skin);
  const front = fem ? 0.141 : 0.143, half = fem ? 0.2 : 0.245;
  // the base model's details: the jacket has its zip, chest pocket and the white tee at the neck; the
  // hoodie its hood; everything else is drawn here
  if (F.zipper) F.zipper.visible = L.top === 'jacket';
  if (F.pocket) F.pocket.visible = L.top === 'jacket';
  if (F.collar) F.collar.visible = L.top === 'jacket';
  if (F.hood) F.hood.visible = L.top === 'hoodie';
  if (L.top === 'jacket') {
    // open lapels and a hem band
    [-1, 1].forEach((s2) => add(G.box, trim, s2 * 0.055, 1.17, front + 0.006, 0.05, 0.24, 0.012, 0, s2 * 0.32));
    add(G.box, trim, 0, 0.78, front + 0.002, half * 2 + 0.004, 0.06, 0.01);
  }
  if (L.top === 'hoodie') {
    add(G.box, trim, 0, 0.88, front + 0.006, 0.26, 0.13, 0.012);
    const cord = mat('#f4ead2');
    [-1, 1].forEach((s2) => add(G.box, cord, s2 * 0.045, 1.16, front + 0.008, 0.012, 0.13, 0.01));
    add(G.box, trim, 0, 0.77, front + 0.002, half * 2 + 0.004, 0.05, 0.01);
  }
  if (L.top === 'tee') {
    // a crew neck: the skin of the throat showing in a low curve
    add(G.cyl, skinM, 0, 1.3, front - 0.012, 0.07, 0.05, 0.02, Math.PI / 2);
    add(G.box, trim, 0, 1.32, front - 0.008, 0.16, 0.02, 0.02);
  }
  if (L.top === 'ankara') {
    // a shirt: a pointed collar and a button placket
    const cm = mat('#ffffff'); cm.map = print('ankara', L.topColor);
    [-1, 1].forEach((s2) => add(G.box, cm, s2 * 0.055, 1.29, front + 0.008, 0.1, 0.06, 0.014, 0, -s2 * 0.45));
    const bt = mat('#f4ead2');
    add(G.box, trim, 0, 1.02, front + 0.006, 0.022, 0.52, 0.008);
    [1.18, 1.04, 0.9].forEach((y) => add(G.sphere, bt, 0, y, front + 0.012, 0.012, 0.012, 0.008));
  }
  if (L.top === 'adire') {
    // a V-neck
    add(G.cone3, skinM, 0, 1.27, front - 0.004, 0.06, 0.1, 0.012, Math.PI);
  }
  // long tunics and the dress
  const T = mat(L.top === 'kaftan' ? L.topColor : '#ffffff');
  if (L.top !== 'kaftan') T.map = print('ankara', L.topColor);
  if (L.top === 'kaftan' || L.top === 'agbada') add(G.box, T, 0, 0.72, 0, L.top === 'agbada' ? 0.62 : (fem ? 0.44 : 0.5), 0.5, 0.3);
  if (L.top === 'kaftan') { const gold = mat('#d9a83a', { roughness: 0.4 }); add(G.box, gold, 0, 1.2, front + 0.006, 0.05, 0.18, 0.01); add(G.box, gold, 0, 1.29, front + 0.004, 0.16, 0.03, 0.01); }
  if (L.top === 'agbada') { add(G.box, T, 0, 1.08, -0.01, 0.82, 0.52, 0.32); add(G.box, mat('#f4ead2'), 0, 1.22, 0.165, 0.18, 0.18, 0.01); }

  // ---------- below the waist ----------
  // skirts, wrappers and the dress hang from the hips (the pelvis joint), LEGO style, wide enough at
  // the hem that walking legs stay inside them; under them, bare legs
  const B = mat(L.bottomColor);
  const pelvisPut = (obj, y) => { if (rig?.pelvis) { obj.position.y = y - 0.82; rig.pelvis.add(obj); } else { obj.position.y = y; root.add(obj); } parts.push(obj); return obj; };
  const flare = (m, yTop, yBot, rTop, rBot, depth = 0.8) => {
    const geo = new THREE.CylinderGeometry(rTop, rBot, yTop - yBot, 16, 1, true);
    const o = new THREE.Mesh(geo, m); m.side = THREE.DoubleSide; o.scale.z = depth; o.userData.ownGeo = true;
    return pelvisPut(o, (yTop + yBot) / 2);
  };
  const skirtLike = L.top === 'dress' || L.bottom === 'skirt' || L.bottom === 'wrapper';
  F.trouser.color.set(skirtLike || L.bottom === 'shorts' ? L.skin : L.bottomColor);
  if (L.top === 'dress') {
    flare(T, 0.8, 0.46, fem ? 0.22 : 0.26, 0.36, 0.78);
    add(G.box, trim, 0, 0.79, 0, (fem ? 0.4 : 0.49) + 0.01, 0.04, 0.29);
  } else if (L.bottom === 'skirt') {
    flare(B, 0.84, 0.5, fem ? 0.22 : 0.26, 0.35, 0.8);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(fem ? 0.225 : 0.265, fem ? 0.225 : 0.265, 0.05, 16), mat(shade(L.bottomColor, -0.12))); band.scale.z = 0.8; band.userData.ownGeo = true; pelvisPut(band, 0.845);
  } else if (L.bottom === 'wrapper') {
    const wm = mat('#ffffff'); wm.map = print('ankara', L.bottomColor === '#304344' ? L.topColor : L.bottomColor);
    flare(wm, 0.86, 0.2, fem ? 0.22 : 0.26, 0.32, 0.9);
    // the tuck at the waist
    const knot = new THREE.Mesh(G.box, wm); knot.scale.set(0.09, 0.1, 0.05); knot.position.set(0.12, 0, 0.2); pelvisPut(knot, 0.82); knot.position.x = 0.12; knot.position.z = 0.2;
  } else if (L.bottom === 'shorts') {
    // shorts ride the thighs so they move with the legs
    [rig?.L, rig?.R].forEach((side) => { if (!side?.hip) return; const o = new THREE.Mesh(G.box, B); o.scale.set(fem ? 0.2 : 0.21, 0.24, 0.25); o.position.set(0, -0.11, 0); side.hip.add(o); parts.push(o); });
    // and a rounded seat round each hip joint: the same shape at any stride, so the top of the shorts never
    // breaks into corners as the legs swing (a box seat stayed put while the legs moved under it)
    [rig?.L, rig?.R].forEach((side) => { if (!side?.hip) return; const o = new THREE.Mesh(new THREE.CylinderGeometry(fem ? 0.115 : 0.124, fem ? 0.115 : 0.124, fem ? 0.2 : 0.214, 14).rotateZ(Math.PI / 2), B); o.userData.ownGeo = true; side.hip.add(o); parts.push(o); });
  }
  // hips for the curvy frame, in whatever is worn there
  if (fem && !skirtLike) { const hip = new THREE.Mesh(G.box, L.bottom === 'shorts' ? B : F.trouser); hip.scale.set(0.46, 0.14, 0.27); pelvisPut(hip, 0.8); }
  if (!fem && !skirtLike) { const belt = new THREE.Mesh(G.box, mat('#2b2018')); belt.scale.set(0.5, 0.04, 0.29); pelvisPut(belt, 0.76); }
  // footwear: the avatar's own shoes, reshaped, plus a heel or a boot shaft
  F.shoes.forEach((s) => { s.scale.y = L.shoes === 'sandals' ? 0.07 : L.shoes === 'heels' ? 0.1 : L.shoes === 'loafers' ? 0.12 : 0.16; s.scale.z = L.shoes === 'heels' ? 0.3 : 0.36; });
  if (L.shoes === 'boots' || L.shoes === 'heels') {
    // a boot's shaft wraps the shin, so it rides the knee joint (the shin's own frame): on the ankle it
    // turned with the foot, which the walk keeps level, and the bare shin showed above it at every
    // bent knee. The shin runs 0.33 m down from the knee; the shaft covers its lower 0.22 m and is a
    // little wider all round. A heel rides the ankle, with the foot.
    const S = mat(L.shoeColor);
    [rig?.L, rig?.R].forEach((side) => {
      if (!side?.ankle) return;
      const o = new THREE.Mesh(G.box, S);
      if (L.shoes === 'boots') { o.scale.set(0.205, 0.23, 0.235); o.position.set(0, -0.33 + 0.115, 0); (side.knee || side.ankle).add(o); }
      else { o.scale.set(0.05, 0.1, 0.05); o.position.set(0, 0.02, -0.12); side.ankle.add(o); }
      parts.push(o);
    });
  }
  // accessories
  const gold = mat('#d9a83a', { metalness: 0.7, roughness: 0.3 });
  if (L.acc.includes('earrings')) [-1, 1].forEach((s) => add(G.sphere, gold, s * 0.205, 1.55, 0.01, 0.025, 0.035, 0.025));
  if (L.acc.includes('beads')) add(G.torus, mat('#d9473b', { roughness: 0.4 }), 0, 1.31, 0.02, 0.11, 0.11, 0.11, Math.PI / 2 - 0.25);
  if (L.acc.includes('glasses')) { const gm = mat('#1d2028'); [-1, 1].forEach((s) => add(G.torus, gm, s * 0.075, 1.63, 0.19, 0.05, 0.05, 0.05)); add(G.box, gm, 0, 1.63, 0.19, 0.06, 0.01, 0.01); }
  if (L.acc.includes('bag')) { const bm = mat('#8a5a36'); add(G.box, bm, 0.2, 0.86, 0.14, 0.2, 0.16, 0.06); add(G.box, bm, 0, 1.08, 0.15, 0.04, 0.62, 0.02, 0, 0.62); }
  if (L.acc.includes('watch') && rig?.L?.elbow) { const w = new THREE.Mesh(G.box, gold); w.scale.set(0.15, 0.04, 0.19); w.position.set(0, -0.2, 0); rig.L.elbow.add(w); parts.push(w); }
  root.userData.look = L;
  return L;
}

// a look for someone, drawn from their name, so everyone in the district dresses their own way
export function lookFor(seed, { fem = false, elder = false, tier = 1 } = {}) {
  let h = [...String(seed)].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 7);
  const pick = (arr) => { h = (Math.imul(h, 1103515245) + 12345) >>> 0; return arr[(h >>> 8) % arr.length]; };
  const col = (k) => pick(OPTIONS[k])[0];
  const L = { body: fem ? 'f' : 'm', skin: col('skin'), hairColor: pick(['#1b1714', '#1b1714', '#4a2c1a', fem ? '#8a4a1f' : '#1b1714']), topColor: col('topColor'), bottomColor: col('bottomColor'), shoeColor: col('shoeColor') };
  if (fem) Object.assign(L, { hair: pick(elder ? ['gele', 'gele', 'bun'] : ['braids', 'gele', 'afro', 'bun', 'cornrows', 'locs']), top: pick(elder ? ['dress', 'kaftan'] : ['dress', 'ankara', 'adire', 'tee', 'jacket']), bottom: pick(['skirt', 'wrapper', 'trousers']), shoes: pick(['sandals', 'heels', 'sneakers']), acc: [pick(['earrings', 'beads']), ...(tier === 0 ? ['bag'] : [])] });
  else Object.assign(L, { hair: pick(elder ? ['fila', 'bald', 'low'] : ['low', 'fade', 'afro', 'locs', 'cornrows', 'bald']), top: pick(elder ? ['agbada', 'kaftan'] : tier === 2 ? ['tee', 'hoodie', 'ankara', 'tee'] : ['jacket', 'ankara', 'kaftan', 'hoodie', 'tee']), bottom: pick(['trousers', 'trousers', 'shorts']), shoes: pick(['sneakers', 'sandals', 'loafers', 'boots']), acc: pick([[], ['watch'], ['glasses']]) });
  return cleanLook(L);
}
