import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TREES, SPECIES, pickTree, floraMaterial } from './flora.js';

// Parks on the open green land (Elvis, 10 October 2026: "rather than having just trees all over the place... let's
// have parks... creative parks... research parks... parks where people can go have picnics... romantic gardens...
// places where you can go play chess"). Each open green space big enough gets one park, laid out the way parks are:
// a hedge round it, a gate and a name board on the street side, paths to the middle, trees placed on purpose, and
// what the park is for in the middle. Six kinds, dealt out so a district gets a mix:
//   picnic    lawns, picnic tables and blankets under shade trees, a gazebo
//   romance   a rose garden: a pergola walk under bougainvillea, a fountain, rose beds, benches for two, fairy lights
//   creative  sculptures, a mural wall, an open-air stage with steps to sit on
//   research  a botanical research garden: one of each of the ten species with a plaque, a greenhouse, a weather mast, a pond
//   play      a children's park: swings, a slide, a see-saw, a roundabout, a sandpit, an ice-cream kiosk
//   games     chess tables, a giant chess board, and the board game of the country (ayo, oware or bao)

export const PARK_KINDS = ['picnic', 'romance', 'games', 'creative', 'play', 'research'];
const NAMES = { picnic: ['Picnic Lawn', 'Family Gardens'], romance: ['Rose Garden', 'Lovers\' Garden'], creative: ['Creative Park', 'Art Park'], research: ['Botanical Research Garden', 'Arboretum'], play: ['Children\'s Park', 'Adventure Playground'], games: ['Chess Garden', 'Board Game Garden'] };
const BOARD = { Nigeria: ['Ayo', 'ayo olopon: two rows of six pits, four seeds each; sow, capture, outwit'], Ghana: ['Oware', 'oware: two rows of six houses; the Asante game of sowing and capturing'], Kenya: ['Bao', 'bao: four rows of eight pits, the Swahili coast\'s great game'] };

// a vertex-coloured box or cylinder, for merging
const paint = (geo, hex) => { const g = geo.index ? geo.toNonIndexed() : geo, c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g; };
const B = (w, h, d, hex, y = 0) => paint(new THREE.BoxGeometry(w, h, d).translate(0, y + h / 2, 0), hex);
const CY = (r0, r1, h, hex, y = 0, seg = 12) => paint(new THREE.CylinderGeometry(r1, r0, h, seg).translate(0, y + h / 2, 0), hex);
function tex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const FONT = '"Baloo 2", ui-rounded, system-ui, sans-serif';
const WOOD = '#a87950', DARKWOOD = '#7a5a3e', STONE = '#cfc8ba', PATH = '#d8cfbd', STEEL = '#6f7787', WHITE = '#f4efe2';

/**
 * Lay out parks on rectangles found in the open green land.
 * rects: [{ x, z, ang, face, w, d }] (as greenrey's placeRect returns them, u along the street, v away from it)
 * Returns { group, cols, seats, pois, interact, flora, claims }.
 */
export function buildParkland({ rects, city = 'Lagos', country = 'Nigeria', district = '', rnd = Math.random }) {
  const group = new THREE.Group(); group.name = 'parkland';
  const cols = [], seats = [], pois = [], interact = [], flora = [], claims = [], vc = [], lights = [];
  const mats = { sign: [] };
  const used = new Set(), seen = {};
  rects.forEach((p, n) => {
    // the biggest spaces get the kinds that need room; every kind once before any repeats
    const kind = p.kind || PARK_KINDS.find((k) => !used.has(k) && (k !== 'research' || p.w >= 30) && (k !== 'creative' || p.w >= 26)) || PARK_KINDS[n % PARK_KINDS.length];
    used.add(kind);
    const cs = Math.cos(p.ang), sn = Math.sin(p.ang), at = (u, v) => [p.x + u * cs + v * sn, p.z - u * sn + v * cs];
    const front = Math.cos(p.face - p.ang) > 0 ? 1 : -1, W2 = p.w / 2, D2 = p.d / 2;
    // put a part at (u, v) in the park, turned r about its own centre (r = 0 faces +v)
    const put = (geo, u, v, r = 0, y = 0) => { geo.rotateY(p.ang + r); const [x, z] = at(u, v); geo.translate(x, y, z); vc.push(geo); };
    const col = (u, v, w, d, r = 0, name = 'park_thing', h) => { const [x, z] = at(u, v); cols.push({ name, cx: x, cz: z, hx: w / 2, hz: d / 2, ry: p.ang + r, ...(h ? { h } : {}) }); };
    const tree = (k, u, v, s = 0.85 + rnd() * 0.3) => { const [x, z] = at(u, v); flora.push({ kind: k, x, z, s, ry: rnd() * 6.28 }); const r = (TREES[k]?.r ?? 0.4) * s; cols.push({ name: `tree_${k}`, cx: x, cz: z, hx: r, hz: r, ry: 0 }); };
    const plant = (k, u, v, s = 1, r = 0) => { const [x, z] = at(u, v); flora.push({ kind: k, x, z, s, ry: p.ang + r }); };
    const bench = (u, v, r) => { // r: the way the sitter faces, in park terms
      const g = mergeGeometries([B(1.6, 0.08, 0.45, WOOD, 0.42), B(1.6, 0.4, 0.06, WOOD, 0.55).translate(0, 0, -0.22), B(0.08, 0.42, 0.4, STEEL).translate(-0.7, 0, 0), B(0.08, 0.42, 0.4, STEEL).translate(0.7, 0, 0)]);
      put(g, u, v, r); col(u, v, 1.6, 0.5, r, 'bench', 0.9);
      const [x, z] = at(u, v), yaw = p.ang + r; seats.push({ x: x + Math.sin(yaw) * 0.05, z: z + Math.cos(yaw) * 0.05, yaw });
    };
    const path = (u0, v0, u1, v1, w = 2) => { const L = Math.hypot(u1 - u0, v1 - v0), r = Math.atan2(u1 - u0, v1 - v0); put(paint(new THREE.BoxGeometry(w, 0.02, L + w * 0.3).translate(0, 0.045, 0), PATH), (u0 + u1) / 2, (v0 + v1) / 2, r); };
    const lamp = (u, v) => { put(mergeGeometries([CY(0.06, 0.05, 3.2, '#3d4a44'), CY(0.16, 0.12, 0.3, '#3d4a44', 3.2)]), u, v); const [x, z] = at(u, v); lights.push([x, 3.35, z]); col(u, v, 0.15, 0.15, 0, 'lamp_post'); };
    const bin = (u, v) => { put(CY(0.24, 0.26, 0.85, '#2f6d5f', 0, 10), u, v); col(u, v, 0.5, 0.5, 0, 'bin', 0.9); };

    // ---------- every park: the hedge, the gates, the paths, the name board, the trees round the edge ----------
    const gate = 1.8; // half the gap in the hedge at the front and back
    for (let u = -W2 + 0.5; u < W2; u += 1) { if (Math.abs(u) > gate) { plant('hedge', u, front * D2, 1, 0); plant('hedge', u, -front * D2, 1, 0); } }
    for (let v = -D2 + 0.5; v < D2; v += 1) { plant('hedge', -W2, v, 1, Math.PI / 2); plant('hedge', W2, v, 1, Math.PI / 2); }
    [[-1, 1], [1, 1]].forEach(([s]) => { const L = W2 - gate; [front, -front].forEach((f) => col(s * (gate + L / 2), f * D2, L, 0.7, 0, 'hedge', 0.9)); });
    [-1, 1].forEach((s) => col(s * W2, 0, 0.7, p.d, 0, 'hedge', 0.9));
    path(0, front * (D2 + 0.6), 0, -front * (D2 + 0.6), 2.2); path(-W2 + 1.5, 0, W2 - 1.5, 0, 1.8);
    // the name board at the gate, facing the street
    const nth = (seen[kind] = (seen[kind] ?? -1) + 1), name = `${district ? `${district} ` : ''}${NAMES[kind][nth % 2]}${nth > 1 ? ` ${nth}` : ''}`.trim();
    const nt = tex(512, 160, (c, w, h) => { c.fillStyle = '#2f6d5f'; c.fillRect(0, 0, w, h); c.strokeStyle = '#f4efe2'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20); c.fillStyle = '#f4efe2'; let s = 58; c.font = `800 ${s}px ${FONT}`; while (c.measureText(name).width > w - 60 && s > 26) { s -= 3; c.font = `800 ${s}px ${FONT}`; } c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, w / 2, h / 2 - 12); c.font = `600 26px ${FONT}`; c.fillText(kind === 'research' ? 'Open daily · please keep to the paths' : 'Open daily · 6am to 10pm', w / 2, h / 2 + 40); });
    { const bu = gate + 1.6, bv = front * (D2 + 0.4); put(B(0.12, 2.2, 0.12, DARKWOOD), bu - 1.1, bv); put(B(0.12, 2.2, 0.12, DARKWOOD), bu + 1.1, bv); col(bu, bv, 2.4, 0.3, 0, 'park_sign');
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), new THREE.MeshStandardMaterial({ map: nt, roughness: 0.7, side: THREE.DoubleSide })); const [x, z] = at(bu, bv); m.position.set(x, 1.75, z); m.rotation.y = p.ang + (front > 0 ? 0 : Math.PI); group.add(m); mats.sign.push(m); }
    lamp(gate + 0.6, front * (D2 - 1)); lamp(-gate - 0.6, front * (D2 - 1)); bin(-gate - 1.4, front * (D2 - 1.2));
    // a row of one species along the back and the sides, evenly spaced: planted, not scattered
    const edgeKind = pickTree(city, 'park', rnd), cornerKind = pickTree(city, 'park', rnd);
    for (let u = -W2 + 3; u <= W2 - 3 + 0.01; u += Math.max(6, (p.w - 6) / Math.round((p.w - 6) / 7))) if (Math.abs(u) > gate + 2) tree(edgeKind, u, -front * (D2 - 2.2));
    [[-1, 1], [1, 1]].forEach(([s]) => { tree(cornerKind, s * (W2 - 2.4), front * (D2 - 2.6)); if (p.d > 20) tree(edgeKind, s * (W2 - 2.2), 0 + front * 0.1 - front * (D2 * 0.35)); });
    // flower beds either side of the gate
    plant('bed', -gate - 2.6, front * (D2 - 1.6), 1, 0); plant('bed', gate + 3.4, front * (D2 - 1.6), 1, 0);

    // ---------- what the park is for ----------
    const cw = Math.min(p.w - 10, 26), cd = Math.min(p.d - 9, 16); // the middle, inside the edge trees
    if (kind === 'picnic') {
      const spots = [[-cw * 0.32, cd * 0.25], [cw * 0.32, cd * 0.25], [-cw * 0.32, -cd * 0.28], [cw * 0.32, -cd * 0.28]];
      spots.forEach(([u, v], i) => {
        // a picnic table with its benches, under its own shade tree
        put(mergeGeometries([B(1.8, 0.06, 0.8, WOOD, 0.74), B(1.8, 0.05, 0.3, WOOD, 0.44).translate(0, 0, 0.6), B(1.8, 0.05, 0.3, WOOD, 0.44).translate(0, 0, -0.6), B(0.08, 0.74, 1.5, DARKWOOD).translate(-0.7, 0, 0), B(0.08, 0.74, 1.5, DARKWOOD).translate(0.7, 0, 0)]), u, v);
        col(u, v, 1.9, 1.7, 0, 'picnic_table', 0.8);
        tree(['mango', 'neem', 'mango', 'flamboyant'][i], u + (i % 2 ? 2.6 : -2.6), v + (i < 2 ? 1.2 : -1.2), 0.75);
      });
      // blankets on the grass with a basket
      [[0, cd * 0.42, '#d94f4f'], [-cw * 0.1, -cd * 0.45, '#2a9d94'], [cw * 0.12, -cd * 0.05, '#f2b33d']].forEach(([u, v, c], i) => { put(paint(new THREE.BoxGeometry(1.8, 0.02, 1.5).translate(0, 0.055, 0), c), u + 3, v, i * 0.4); put(B(0.4, 0.26, 0.28, '#b88a4e', 0.06), u + 3.4, v + 0.3, i); });
      // a gazebo: six posts, a pointed roof, a bench round inside
      const gu = 0, gv = -front * cd * 0.05;
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; put(B(0.14, 2.6, 0.14, WHITE), gu + Math.cos(a) * 2.1, gv + Math.sin(a) * 2.1); col(gu + Math.cos(a) * 2.1, gv + Math.sin(a) * 2.1, 0.2, 0.2, 0, 'gazebo_post'); }
      put(paint(new THREE.ConeGeometry(2.9, 1.3, 6).translate(0, 3.25, 0), '#b5523b'), gu, gv, Math.PI / 6);
      put(paint(new THREE.CylinderGeometry(2.25, 2.25, 0.08, 6).translate(0, 0.02, 0), STONE), gu, gv, Math.PI / 6);
      bench(gu, gv - 1.3, 0); bench(gu, gv + 1.3, Math.PI);
    } else if (kind === 'romance') {
      // a pergola walk down the main path, bougainvillea climbing every arch, fairy lights along the beams
      for (let k = 0; k < 5; k++) { const v = front * (D2 - 4 - k * 2); put(mergeGeometries([B(0.16, 2.6, 0.16, WHITE).translate(-1.4, 0, 0), B(0.16, 2.6, 0.16, WHITE).translate(1.4, 0, 0), B(3.2, 0.16, 0.2, WHITE, 2.6)]), 0, v); col(-1.4, v, 0.2, 0.2, 0, 'pergola'); col(1.4, v, 0.2, 0.2, 0, 'pergola'); plant('bougainvillea', -1.7, v, 0.9); plant('bougainvillea', 1.7, v, 0.9, 1); for (let b = -1; b <= 1; b += 0.5) { const [x, z] = at(b * 1.2, v); lights.push([x, 2.85, z, true]); } }
      put(mergeGeometries([B(0.12, 0.12, 9, WHITE, 2.72).translate(-1.4, 0, 0), B(0.12, 0.12, 9, WHITE, 2.72).translate(1.4, 0, 0)]), 0, front * (D2 - 8));
      // the fountain in the middle: a round basin, water, a tiered bowl and a jet
      put(mergeGeometries([CY(2.4, 2.4, 0.5, STONE, 0, 24), CY(0.35, 0.3, 1.2, STONE, 0.5, 12), CY(0.9, 0.6, 0.25, STONE, 1.7, 16)]), 0, 0); col(0, 0, 4.8, 4.8, 0, 'fountain', 0.6);
      const water = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.04, 24), new THREE.MeshStandardMaterial({ color: 0x6fb8c9, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85 }));
      { const [x, z] = at(0, 0); water.position.set(x, 0.46, z); group.add(water); const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0xbfe6ef, transparent: true, opacity: 0.6, roughness: 0.1 })); jet.position.set(x, 2.5, z); jet.name = 'fountain_jet'; group.add(jet); }
      // rose beds in a ring, benches for two looking at the water, a flowering tree at each corner of the middle
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; plant('rose', Math.cos(a) * 3.7, Math.sin(a) * 3.7, 1.1); }
      [[0, -5.2, 0], [-5.6, 0, Math.PI / 2], [5.6, 0, -Math.PI / 2]].forEach(([u, v, r]) => bench(u, -front * Math.abs(v) * (v ? 1 : 0) + (v ? 0 : 0) + (u ? 0 : -front * 5.2), u ? r : (front > 0 ? 0 : Math.PI)));
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b], i) => tree(i % 2 ? 'jacaranda' : 'pinkTrumpet', a * cw * 0.42, b * cd * 0.4, 0.7));
      plant('hibiscus', -cw * 0.25, -front * cd * 0.42); plant('hibiscus', cw * 0.25, -front * cd * 0.42, 1, 1);
    } else if (kind === 'creative') {
      // a mural wall at the back, painted bright
      const mt = tex(1024, 256, (c, w, h) => { const cols = ['#e46f4f', '#f2b33d', '#2a9d94', '#4a64b0', '#8a5aa0', '#7fb35e']; c.fillStyle = '#f7efdc'; c.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { c.fillStyle = cols[i % cols.length]; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 70, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#3b2a20'; c.font = `900 120px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BUILD IT HERE', w / 2, h / 2 + 8); });
      { const mu = 0, mv = -front * (cd * 0.5 + 1.2), L = Math.min(cw, 14); put(B(L, 3, 0.4, '#e8e0cf'), mu, mv); col(mu, mv, L, 0.4, 0, 'mural_wall');
        const m = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.2, 2.8), new THREE.MeshStandardMaterial({ map: mt, roughness: 0.8 })); const [x, z] = at(mu, mv + front * 0.21); m.position.set(x, 1.5, z); m.rotation.y = p.ang + (front > 0 ? 0 : Math.PI); group.add(m); }
      // the stage: a raised platform with a canopy, steps in a fan in front to sit on
      { const su = -cw * 0.28, sv = 0; put(mergeGeometries([B(6, 0.7, 4, '#7a6552'), B(0.15, 3.4, 0.15, STEEL, 0.7).translate(-2.9, 0, -1.9), B(0.15, 3.4, 0.15, STEEL, 0.7).translate(2.9, 0, -1.9), B(6.2, 0.12, 1.2, '#e46f4f', 4.1).translate(0, 0, -1.4)]), su, sv, Math.PI / 2 * front); col(su, sv, 4, 6, 0, 'stage', 0.7);
        for (let k = 0; k < 3; k++) { put(B(1, 0.35 + k * 0.0, 5 + k * 1.2, STONE, 0), su + 3.6 + k * 1.4, sv); col(su + 3.6 + k * 1.4, sv, 1, 5 + k * 1.2, 0, 'steps', 0.4); const [x, z] = at(su + 3.6 + k * 1.4, sv); seats.push({ x, z, yaw: p.ang - Math.PI / 2 }); } }
      // sculptures: stacked shapes in the clay colours, a big ring, a figure reaching up
      const sculpt = [[cw * 0.25, cd * 0.2, () => mergeGeometries([B(1.2, 1.2, 1.2, '#2a9d94', 0.4), paint(new THREE.IcosahedronGeometry(0.7, 0).translate(0, 2.3, 0), '#f2b33d'), B(1.4, 0.4, 1.4, STONE)])],
        [cw * 0.3, -cd * 0.25, () => mergeGeometries([paint(new THREE.TorusGeometry(1.2, 0.25, 8, 20).translate(0, 1.85, 0), '#e46f4f'), B(1, 0.4, 0.6, STONE)])],
        [cw * 0.05, cd * 0.35, () => mergeGeometries([paint(new THREE.ConeGeometry(0.6, 2.6, 5).translate(0, 1.7, 0), '#4a64b0'), paint(new THREE.SphereGeometry(0.45, 10, 8).translate(0, 3.3, 0), '#8a5aa0'), B(1.1, 0.4, 1.1, STONE)])]];
      sculpt.forEach(([u, v, g]) => { put(g(), u, v, rnd() * 3); col(u, v, 1.4, 1.4, 0, 'sculpture'); });
      tree('goldenShower', cw * 0.42, -cd * 0.45, 0.8); tree('flamboyant', -cw * 0.45, cd * 0.4, 0.75);
      plant('canna', cw * 0.15, -cd * 0.05); plant('croton', cw * 0.18, cd * 0.05); plant('croton', -cw * 0.05, -cd * 0.4);
      bench(cw * 0.15, -cd * 0.42, front > 0 ? 0 : Math.PI);
    } else if (kind === 'research') {
      // one of each of the ten species in two rows either side of the main path, each with its plaque
      const per = 5, du = Math.min(4.6, (cw - 2) / per);
      SPECIES.forEach((k, i) => {
        const row = i < per ? -1 : 1, u = (i % per - (per - 1) / 2) * du + (i % per >= (per - 1) / 2 ? 1.6 : -1.6) * 0, v = row * cd * 0.36;
        const uu = (i % per - (per - 1) / 2) * du + Math.sign((i % per) - (per - 1) / 2 || 1) * 0.0;
        if (Math.abs(uu) < 1.6) { /* keep the main path clear */ }
        const pu = Math.abs(uu) < 1.4 ? uu + (uu < 0 ? -1.4 : 1.4) : uu;
        tree(k, pu, v, 0.6); void u;
        const pv = v - row * 2.1; put(mergeGeometries([B(0.08, 0.8, 0.08, DARKWOOD), B(0.6, 0.38, 0.06, '#2f6d5f', 0.75).rotateX(-0.5)]), pu, pv, row > 0 ? 0 : Math.PI);
        const [x, z] = at(pu, pv - row * 0.6); const T = TREES[k];
        interact.push({ id: `park:plaque:${n}:${k}`, label: `Read the plaque: ${T.name}`, x, z, r: 1.4, say: `${T.name} (${T.sci}), ${T.colour}. ${T.fact}` });
      });
      // the greenhouse at one end, a weather mast at the other, a pond in the middle of the cross
      { const gu = -cw * 0.5 + 1.5, gv = 0, gw = 3.6, gd = 5; const glass = new THREE.Mesh(new THREE.BoxGeometry(gw, 2.6, gd).translate(0, 1.3, 0), new THREE.MeshStandardMaterial({ color: 0xcfe9ec, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false })); const [x, z] = at(gu, gv); glass.position.set(x, 0, z); glass.rotation.y = p.ang; group.add(glass);
        put(paint(new THREE.CylinderGeometry(gw / 2, gw / 2, gd, 4, 1, false, Math.PI / 4).rotateX(Math.PI / 2).scale(1, 0.45, 1).translate(0, 2.6, 0), '#dfeff0'), gu, gv);
        for (let k = -1; k <= 1; k += 2) for (let j = -1; j <= 1; j += 2) put(B(0.08, 2.6, 0.08, WHITE), gu + k * gw / 2, gv + j * gd / 2);
        col(gu, gv, gw, gd, 0, 'greenhouse'); plant('pot', gu - 0.8, gv + 1.2, 1); plant('palmPot', gu + 0.8, gv - 1.2, 1); }
      { const wu = cw * 0.5 - 1.2, wv = cd * 0.1; put(mergeGeometries([CY(0.06, 0.05, 4, STEEL), B(0.9, 0.04, 0.04, STEEL, 4), CY(0.12, 0.12, 0.12, WHITE, 4.05), B(0.8, 0.5, 0.05, '#1f2f52', 1.6).rotateX(-0.6)]), wu, wv); col(wu, wv, 0.4, 0.4, 0, 'weather_mast'); }
      { const pond = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.04, 20).scale(2.4, 1, 1.6), new THREE.MeshStandardMaterial({ color: 0x5d9fae, roughness: 0.1, metalness: 0.15 })); const pu = cw * 0.25, pv = 0; const [x, z] = at(pu, pv); pond.position.set(x, 0.06, z); pond.rotation.y = p.ang; group.add(pond); col(pu, pv, 4.8, 3.2, 0, 'pond', 0.2);
        for (let k = 0; k < 9; k++) { const a = k * 0.7; put(paint(new THREE.IcosahedronGeometry(0.3, 0).translate(0, 0.15, 0), '#9b958a'), pu + Math.cos(a) * 2.5, pv + Math.sin(a) * 1.75); } }
      bench(-cw * 0.15, 1.2, Math.PI); bench(cw * 0.05, -1.2, 0);
    } else if (kind === 'play') {
      // soft red play surface under it all
      put(paint(new THREE.BoxGeometry(Math.min(cw, 18), 0.03, Math.min(cd, 12)).translate(0, 0.05, 0), '#c8634a'), 0, -front * 1.5);
      const pv = -front * 1.5;
      // swings: an A-frame and two seats
      { const su = -5.5; put(mergeGeometries([B(0.1, 2.6, 0.1, '#f2b33d').rotateX(0.2).translate(-1.6, 0, 0.3), B(0.1, 2.6, 0.1, '#f2b33d').rotateX(-0.2).translate(-1.6, 0, -0.3), B(0.1, 2.6, 0.1, '#f2b33d').rotateX(0.2).translate(1.6, 0, 0.3), B(0.1, 2.6, 0.1, '#f2b33d').rotateX(-0.2).translate(1.6, 0, -0.3), B(3.4, 0.12, 0.12, '#f2b33d', 2.5), B(0.03, 1.9, 0.03, STEEL, 0.6).translate(-0.9, 0, 0), B(0.03, 1.9, 0.03, STEEL, 0.6).translate(-0.5, 0, 0), B(0.6, 0.05, 0.25, '#2a9d94', 0.55).translate(-0.7, 0, 0), B(0.03, 1.9, 0.03, STEEL, 0.6).translate(0.5, 0, 0), B(0.03, 1.9, 0.03, STEEL, 0.6).translate(0.9, 0, 0), B(0.6, 0.05, 0.25, '#e46f4f', 0.55).translate(0.7, 0, 0)]), su, pv + 2.5); col(su, pv + 2.5, 3.6, 1.2, 0, 'swings'); }
      // the slide: a ladder up to a deck, a chute down
      { const su = 1.5, sv = pv + 2.6; put(mergeGeometries([B(1.2, 0.1, 1.2, '#4a64b0', 1.7), B(0.1, 1.7, 0.1, '#4a64b0').translate(-0.55, 0, -0.55), B(0.1, 1.7, 0.1, '#4a64b0').translate(0.55, 0, -0.55), B(0.1, 1.7, 0.1, '#4a64b0').translate(-0.55, 0, 0.55), B(0.1, 1.7, 0.1, '#4a64b0').translate(0.55, 0, 0.55), B(0.7, 0.08, 3.2, '#f2b33d').rotateX(-0.55).translate(0, 0.85, 2.1), B(0.6, 1.8, 0.08, STEEL).rotateX(0.25).translate(0, 0, -0.9)]), su, sv); col(su, sv + 1, 1.4, 3.6, 0, 'slide'); }
      // a see-saw and a roundabout
      put(mergeGeometries([B(0.3, 0.45, 0.3, '#2f6d5f'), B(3.2, 0.08, 0.3, '#e46f4f', 0.45)]), -3, pv - 2.4, 0.15); col(-3, pv - 2.4, 3.2, 0.4, 0, 'seesaw', 0.6);
      put(mergeGeometries([CY(1.2, 1.2, 0.12, '#2a9d94', 0.25, 16), CY(0.08, 0.08, 0.9, STEEL, 0.25), paint(new THREE.TorusGeometry(0.9, 0.04, 6, 16).rotateX(Math.PI / 2).translate(0, 1.05, 0), STEEL)]), 2.5, pv - 2.6); col(2.5, pv - 2.6, 2.4, 2.4, 0, 'roundabout', 0.6);
      // the sandpit and the ice-cream kiosk
      put(mergeGeometries([B(3, 0.3, 3, WOOD), paint(new THREE.BoxGeometry(2.7, 0.04, 2.7).translate(0, 0.3, 0), '#e8d39a')]), 6, pv - 1); col(6, pv - 1, 3, 3, 0, 'sandpit', 0.3);
      { const ku = cw * 0.45, kv = cd * 0.35 * -front + front * 2; put(mergeGeometries([B(2, 2.2, 1.6, '#f7efdc'), B(2.4, 0.15, 2, '#e46f4f', 2.3)]), ku, kv); col(ku, kv, 2, 1.6, 0, 'kiosk');
        const [x, z] = at(ku, kv + front * 1.3); interact.push({ id: `park:icecream:${n}`, label: 'Buy an ice cream', x, z, r: 1.6, say: 'Fan Ice, vanilla, from the cool box: the taste of every Nigerian childhood. 200 Efforts.', cost: 200 }); }
      bench(-cw * 0.4, -cd * 0.4 * front, front > 0 ? 0 : Math.PI); bench(cw * 0.1, cd * 0.42 * front, front > 0 ? Math.PI : 0);
      tree('mango', -cw * 0.45, cd * 0.2, 0.8); tree('neem', cw * 0.45, -cd * 0.1, 0.8);
    } else if (kind === 'games') {
      // stone chess tables with a stool either side, under shade
      const ct = tex(256, 256, (c) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#3b2a20' : '#f4efe2'; c.fillRect(i * 32, j * 32, 32, 32); } });
      const cmat = new THREE.MeshStandardMaterial({ map: ct, roughness: 0.6 });
      [[-cw * 0.32, cd * 0.22], [-cw * 0.32, -cd * 0.22], [cw * 0.32, cd * 0.22], [cw * 0.32, -cd * 0.22]].forEach(([u, v], i) => {
        put(mergeGeometries([CY(0.22, 0.2, 0.7, STONE), B(0.9, 0.08, 0.9, STONE, 0.7), CY(0.2, 0.18, 0.45, STONE).translate(0, 0, 0.8), CY(0.2, 0.18, 0.45, STONE).translate(0, 0, -0.8)]), u, v);
        const top = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62).rotateX(-Math.PI / 2), cmat); const [x, z] = at(u, v); top.position.set(x, 0.785, z); top.rotation.y = p.ang; group.add(top);
        col(u, v, 0.95, 2.1, 0, 'chess_table', 0.8);
        interact.push({ id: `park:chess:${n}:${i}`, label: 'Play chess', x: x + Math.sin(p.ang) * 1.3, z: z + Math.cos(p.ang) * 1.3, r: 1.3, chess: true });
        if (i % 2 === 0) tree(i ? 'neem' : 'mango', u + (u < 0 ? -2.4 : 2.4), v + 1.6, 0.7);
      });
      // a giant chess board on the paving, a few pieces standing on it
      { const S = 0.9, gu = 0, gv = 0; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) put(paint(new THREE.BoxGeometry(S, 0.03, S).translate(0, 0.055, 0), (i + j) % 2 ? '#3b2a20' : '#efe7d6'), gu + (i - 3.5) * S, gv + (j - 3.5) * S);
        const piece = (i, j, white, kind2) => { const c = white ? '#f4efe2' : '#2e2420', h = { k: 1.2, q: 1.1, r: 0.8, b: 0.95, n: 0.85, p: 0.6 }[kind2]; put(mergeGeometries([CY(0.3, 0.24, 0.12, c), CY(0.2, 0.14, h, c, 0.12), kind2 === 'k' ? B(0.08, 0.3, 0.08, c, h + 0.12) : kind2 === 'n' ? B(0.18, 0.3, 0.32, c, h).rotateX(0.4) : paint(new THREE.SphereGeometry(0.16, 8, 6).translate(0, h + 0.18, 0), c)]), gu + (i - 3.5) * S, gv + (j - 3.5) * S); };
        piece(4, 0, true, 'k'); piece(3, 0, true, 'q'); piece(0, 0, true, 'r'); piece(6, 2, true, 'n'); piece(4, 3, true, 'p'); piece(3, 4, false, 'p'); piece(4, 7, false, 'k'); piece(2, 5, false, 'n'); piece(7, 7, false, 'r'); piece(5, 6, false, 'b');
        const [x, z] = at(gu, gv - front * 4.2); interact.push({ id: `park:giant:${n}`, label: 'Move a giant chess piece', x, z, r: 2.2, say: 'You walk the white knight to f3 with both arms. A man on the bench calls it a waste of a tempo.' }); }
      // the country's own board game, on a wooden table
      const [bg, bgs] = BOARD[country] || BOARD.Nigeria;
      { const bu = 0, bv = -front * (cd * 0.42); put(mergeGeometries([B(1.4, 0.72, 0.8, WOOD), B(1.2, 0.08, 0.5, DARKWOOD, 0.72), CY(0.2, 0.18, 0.45, STONE).translate(0, 0, 0.8), CY(0.2, 0.18, 0.45, STONE).translate(0, 0, -0.8)]), bu, bv); col(bu, bv, 1.4, 2.1, 0, 'board_table', 0.8);
        for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) put(CY(0.06, 0.06, 0.02, '#4a3020', 0.79, 8), bu - 0.45 + i * 0.18, bv - 0.1 + j * 0.2);
        const [x, z] = at(bu, bv + front * 1.2); interact.push({ id: `park:board:${n}`, label: `Watch a game of ${bg}`, x, z, r: 1.6, say: `Two elders at ${bg.toLowerCase()} (${bgs}). The seeds click; a crowd of three says nothing, loudly.` }); }
      bench(-cw * 0.05, cd * 0.42 * -front, front > 0 ? 0 : Math.PI);
    }
    // bushes and flowers round the middle, so even the plain lawn has colour
    ['hibiscus', 'ixora', 'croton', 'bougainvillea'].forEach((k, i) => { const u = (i % 2 ? 1 : -1) * (W2 - 4.2), v = (i < 2 ? 1 : -1) * (D2 * 0.15); plant(k, u, v, 1, i); });
    // the park on the map and in people's days; nobody builds on it
    const [cx, cz] = at(0, 0);
    pois.push({ kind: 'park', name, x: cx, z: cz, theme: kind });
    claims.push({ kind: 'park', cx: p.x, cz: p.z, hx: W2, hz: D2, ry: p.ang });
  });
  if (vc.length) { const m = new THREE.Mesh(mergeGeometries(vc), floraMaterial()); m.castShadow = true; m.receiveShadow = true; m.name = 'parkland_things'; group.add(m); }
  // lamp globes and fairy lights: glowing, no light sources
  if (lights.length) { const glow = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c9 }), lights.length); const m4 = new THREE.Matrix4(); lights.forEach(([x, y, z, small], i) => glow.setMatrixAt(i, m4.makeScale(small ? 0.05 : 0.18, small ? 0.05 : 0.18, small ? 0.05 : 0.18).setPosition(x, y, z))); glow.name = 'parkland_lights'; group.add(glow); }
  return { group, cols, seats, pois, interact, flora, claims };
}
