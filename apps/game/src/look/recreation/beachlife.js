// Beach life (Elvis, 13 October 2026: "Did you add Beach Life"). The open city's beaches as people use them on a
// weekend in Lagos and Accra: rows of striped umbrellas and loungers, bars of planks and thatch with plastic chairs
// out front, a coconut seller with his barrow, corn on the coals, suya (kelewele in Accra) on the grill, a football
// game on the hard sand, people on towels and in the water between the lifeguard's flags, and horses walked up and
// down the tide line by their owners, as at Elegushi, Lekki and Labadi. The sea washes up the sand in lines of foam.
// You can buy what the sellers sell, and hire a horse: A and D steer it, W for a trot, Esc to get down.
//
// One beach is set up at a time, the nearest to you once you are within 700 m of it; it is all laid out in the beach's
// own frame (u along the shore, v out to sea from the water's edge, the sand inland at v < 0).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { person, playerPerson, gameKeys, sportsUI } from '../sports/common.js';
import { lookFor } from '../style.js';
import { nameFor } from '../knowledge.js';
import { walletEngine } from '../wallet.js';
import { sfx } from '../audio.js';
import { C, FONT } from '../uikit.js';
import { recMode } from './brief.js';

const SAND = -0.232, SEA = -0.21, NEAR = 700, FAR = 1000;
const mat = (c, r = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
// paint a geometry one colour (vertex colours), so a whole beach's umbrellas or chairs are one mesh
const paint = (g, c) => { g = g.index ? g.toNonIndexed() : g; const col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) col.toArray(a, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const merged = (geos, r = 0.8) => { const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: r })); m.castShadow = true; m.receiveShadow = true; return m; };
function tex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }

// what the beach sells, by country: [id, what, price, the seller's line]
const MENU = {
  Nigeria: { bars: ['Cold Chapman', 'Suya Spot'], grill: ['suya', 'Suya, in newspaper with onions and yaji', 300, 'Hot suya! Suya with onion!'], drink: ['chapman', 'A Chapman, very cold', 250], corn: 'Roasted corn and ube' },
  Ghana: { bars: ['Sobolo & Chill', 'Chop Bar'], grill: ['kelewele', 'Kelewele, spicy fried plantain', 200, 'Kelewele! Fresh kelewele!'], drink: ['sobolo', 'A cold sobolo', 150], corn: 'Roasted corn and coconut' },
};
const UMB = [['#e04a3a', '#f6f1e6'], ['#2a9d94', '#f6f1e6'], ['#f2b631', '#e04a3a'], ['#4a64b0', '#f6f1e6'], ['#f2b631', '#2a9d94']];
const HORSE = ['#7a4a2a', '#e9e2d6', '#3a2a22', '#a8703f'];
const BLANKET = ['#e04a3a', '#2a9d94', '#f2b631', '#7b3fa0'];

// ---------- a horse: nose along +z, hooves at y = 0, legs on pivots so it can walk and trot ----------
export function horseModel(coat = HORSE[0], blanket = BLANKET[0]) {
  const g = new THREE.Group(), coatM = mat(coat, 0.7), dark = mat('#2a2220', 0.6), cloth = mat(blanket, 0.85), tack = mat('#4a3020', 0.6);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.0, 6, 14).rotateX(Math.PI / 2).scale(0.85, 1, 1), coatM); body.position.y = 1.3; g.add(body);
  const neck = new THREE.Group(); neck.position.set(0, 1.5, 0.62); g.add(neck);
  neck.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 4, 10).rotateX(-0.75).translate(0, 0.3, 0.22), coatM));
  neck.add(new THREE.Mesh(box(0.07, 0.12, 0.62).rotateX(-0.75).translate(0, 0.44, 0.1), dark)); // the mane
  const head = new THREE.Group(); head.position.set(0, 0.6, 0.48); neck.add(head);
  head.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.42, 4, 10).rotateX(Math.PI / 2 + 0.55).translate(0, -0.08, 0.2), coatM));
  [-1, 1].forEach((s) => { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 6), coatM); ear.position.set(s * 0.08, 0.14, -0.02); head.add(ear); });
  head.add(new THREE.Mesh(box(0.3, 0.035, 0.035, 0, -0.12, 0.3), tack)); head.add(new THREE.Mesh(box(0.03, 0.3, 0.03, 0.14, -0.05, 0.12).rotateX(0.5), tack));
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.03, 0.85, 6).translate(0, -0.42, 0), dark); tail.position.set(0, 1.5, -0.88); tail.rotation.x = 0.35; g.add(tail);
  // the saddle cloth in its owner's colours, with tassels, and the saddle on it
  g.add(new THREE.Mesh(box(0.92, 0.05, 0.85, 0, 1.68, 0.05).rotateZ(0), cloth)); [-1, 1].forEach((s) => g.add(new THREE.Mesh(box(0.04, 0.42, 0.85, s * 0.43, 1.48, 0.05), cloth)));
  g.add(new THREE.Mesh(box(0.42, 0.12, 0.55, 0, 1.75, 0.05), tack));
  const legs = [];
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([s, f], i) => {
    const hip = new THREE.Group(); hip.position.set(s * 0.2, 1.1, f * 0.52); g.add(hip);
    hip.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.38, 4, 8).translate(0, -0.25, 0), coatM));
    const knee = new THREE.Group(); knee.position.y = -0.52; hip.add(knee);
    knee.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.45, 8).translate(0, -0.22, 0), coatM));
    knee.add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.12, 8).translate(0, -0.5, 0), dark));
    legs.push({ hip, knee, phase: i === 0 || i === 3 ? 0 : Math.PI });
  });
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  let ph = 0;
  g.userData.walk = (dt, speed) => { // walk below 2 m/s, trot above; the diagonal pairs move together
    const trot = speed > 2, amp = Math.min(1, speed / 1.4) * (trot ? 0.6 : 0.4); ph += dt * (trot ? 7.5 : 4.2) * Math.min(1, 0.3 + speed);
    legs.forEach((l) => { const a = ph + l.phase; l.hip.rotation.x = Math.sin(a) * amp; l.knee.rotation.x = Math.max(0, -Math.cos(a)) * amp * 1.4; });
    body.position.y = 1.3 + (trot ? Math.abs(Math.sin(ph)) * 0.06 : 0); neck.rotation.x = Math.sin(ph * 2) * 0.04 * Math.min(1, speed); tail.rotation.z = Math.sin(ph * 0.7) * 0.15;
  };
  return g;
}

// ---------- a beach umbrella: striped canopy on a pole, nose up ----------
function umbrella(cols, tilt = 0) {
  const can = new THREE.ConeGeometry(1.5, 0.55, 8, 1, true).toNonIndexed(), n = can.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) new THREE.Color(cols[Math.floor(i / 6) % 2]).toArray(a, i * 3); // two triangles a segment
  can.setAttribute('color', new THREE.BufferAttribute(a, 3)); can.translate(0, 2.35, 0);
  const pole = paint(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 6).translate(0, 1.2, 0), '#ece6d8');
  const g = mergeGeometries([can, pole]); g.rotateZ(tilt); return g;
}
// a white plastic lounger, its back raised toward the land so you lie looking at the sea
function loungerGeo() {
  const back = paint(box(0.62, 0.07, 0.75), '#f6f3ec'); back.rotateX(0.9).translate(0, 0.62, -0.95);
  return mergeGeometries([paint(box(0.62, 0.08, 1.4, 0, 0.32, 0), '#f6f3ec'), back, ...[[-0.27, 0.55], [0.27, 0.55], [-0.27, -0.6], [0.27, -0.6]].map(([x, z]) => paint(box(0.05, 0.3, 0.05, x, 0.15, z), '#d8d2c4'))]);
}
const plasticChair = (c) => mergeGeometries([paint(box(0.44, 0.05, 0.42, 0, 0.44, 0), c), paint(box(0.44, 0.42, 0.05, 0, 0.66, -0.2), c), ...[[-0.19, 0.18], [0.19, 0.18], [-0.19, -0.18], [0.19, -0.18]].map(([x, z]) => paint(box(0.04, 0.44, 0.04, x, 0.22, z), c))]);
const plasticTable = (c) => mergeGeometries([paint(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 14).translate(0, 0.72, 0), c), ...[0, 1, 2, 3].map((k) => paint(box(0.04, 0.72, 0.04, Math.cos(k * 1.57 + 0.78) * 0.3, 0.36, Math.sin(k * 1.57 + 0.78) * 0.3), c))]);

// a bar of planks and thatch, its counter to the sea, a painted board over it
function shack(name) {
  const g = new THREE.Group(), wood = '#9a6a3c', geos = [];
  [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]].forEach(([x, z]) => geos.push(paint(box(0.14, 2.6, 0.14, x, 1.3, z), wood)));
  geos.push(paint(box(3.4, 1.0, 0.18, 0, 0.5, 1.2), '#b07a44'), paint(box(3.5, 0.08, 0.5, 0, 1.04, 1.25), '#6f4a2a')); // the counter
  geos.push(paint(box(3.4, 2.2, 0.1, 0, 1.1, -1.2), '#b07a44'), paint(box(0.1, 2.2, 2.4, -1.65, 1.1, 0), '#a8743f'));
  geos.push(paint(box(2.6, 0.06, 0.4, 0, 1.6, -1.05), '#6f4a2a')); // a shelf of bottles behind
  for (let i = 0; i < 9; i++) geos.push(paint(new THREE.CylinderGeometry(0.04, 0.05, 0.26, 6).translate(-1.1 + i * 0.27, 1.76, -1.05), ['#3d7a3a', '#c9512b', '#e0b33a'][i % 3]));
  const roof = paint(new THREE.ConeGeometry(3.0, 1.5, 4).rotateY(Math.PI / 4).scale(1.25, 1, 1).translate(0, 3.25, 0), '#c9a35a');
  geos.push(roof, paint(new THREE.ConeGeometry(3.15, 0.25, 4).rotateY(Math.PI / 4).scale(1.25, 1, 1).translate(0, 2.55, 0), '#b38d48'));
  g.add(merged(geos));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: tex(512, 128, (c, w, h) => { c.fillStyle = '#2a9d94'; c.fillRect(0, 0, w, h); c.strokeStyle = '#f6f1e6'; c.lineWidth = 8; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = '#fff6df'; c.font = `800 62px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, w / 2, h / 2 + 3); }) }));
  sign.position.set(0, 2.3, 1.32); g.add(sign);
  const spk = new THREE.Mesh(box(0.42, 0.7, 0.36, 1.25, 0.35, 1.7), mat('#1e2126', 0.5)); g.add(spk); // the speaker on the sand, which is half the point
  return g;
}

/**
 * @param o { scene, world, openWorld, beaches() (recreation's list), interact (props.interact), getPlayer, avatar, toast, low }
 */
export function createBeachLife(o) {
  const country = o.world.place?.country === 'Ghana' || o.world.place?.city === 'Accra' ? 'Ghana' : 'Nigeria', menu = MENU[country];
  let cur = null, ride = null, t = 0, lastCheck = 9;

  function build(b) {
    const sv = new THREE.Vector3(b.sea.x, 0, b.sea.z).normalize(), su = new THREE.Vector3(-sv.z, 0, sv.x), O = new THREE.Vector3(b.x, 0, b.z);
    const yawSea = Math.atan2(sv.x, sv.z), at = (u, v, y = SAND) => new THREE.Vector3(O.x + su.x * u + sv.x * v, y, O.z + su.z * u + sv.z * v);
    // a spot is free when no building of the open city stands on it (the coast road can run close behind the sand)
    const free = (u, v) => { const p = at(u, v); return !o.openWorld?.solidAt?.(p.x, p.z); };
    const g = new THREE.Group(); g.name = `beach:${b.label}`; o.scene.add(g);
    const place = (obj, u, v, yaw = yawSea, y = SAND) => { obj.position.copy(at(u, v, y)); obj.rotation.y = yaw; g.add(obj); return obj; };
    const people = [], its = [], seed = `${b.label}`;
    const local = (u, v, yaw) => new THREE.Matrix4().makeRotationY(yaw).setPosition(at(u, v));
    const P = (k, opt = {}) => { const p = person(opt.look || lookFor(`${seed}-${k}`, { fem: opt.fem ?? k % 2 === 1, tier: 1 }), `${seed}-${k}`); people.push(p); return p; };
    const low = !!o.low;

    // the wet sand the sea has just left, and the foam that washes up it
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(130, 5).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#b99c66', transparent: true, opacity: 0.45, roughness: 0.4, depthWrite: false })); place(wet, 0, -1.8, yawSea + Math.PI / 2, SAND + 0.004); wet.rotation.y = yawSea;
    const foamTex = tex(256, 32, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0.2)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(Math.random() * w, h * 0.35 + Math.random() * h * 0.4, 1 + Math.random() * 2.5, 0, 7); c.fill(); } });
    foamTex.wrapS = THREE.RepeatWrapping; foamTex.repeat.set(6, 1);
    const foams = [0, 1, 2].map((k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(130, 3.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, depthWrite: false })); m.rotation.y = yawSea; g.add(m); return { m, ph: k / 3 }; });

    // umbrellas and loungers in two rows, a towel or two between
    const umbs = [], loungers = [], towels = [];
    for (let row = 0; row < 2; row++) for (let u = -52; u <= 12; u += 6.5) {
      const uu = u + (row ? 3.2 : 0), vv = row ? -21 : -14; if (!free(uu, vv)) continue;
      const k = Math.abs(Math.round(uu * 7 + row * 3)) % UMB.length;
      umbs.push(umbrella(UMB[k], ((uu * 13) % 5) * 0.02).applyMatrix4(local(uu, vv, 0)));
      [-0.75, 0.75].forEach((s) => loungers.push(loungerGeo().applyMatrix4(local(uu + s, vv + 0.4, yawSea))));
    }
    if (umbs.length) g.add(merged(umbs, 0.75)); if (loungers.length) g.add(merged(loungers, 0.5));
    // people on towels in the sun (on their backs, face up), more of them on the weekend
    for (let i = 0; i < (low ? 2 : 4); i++) {
      const u = -46 + i * 13, v = -9.5; if (!free(u, v)) continue;
      towels.push(paint(box(0.9, 0.02, 1.9), BLANKET[i % 4]).applyMatrix4(local(u, v, yawSea + 0.1 * i)));
      const p = P(`sun${i}`), r = new THREE.Group(); r.add(p.obj); p.obj.rotation.x = -Math.PI / 2; p.obj.position.set(0, 0.14, 0.85); place(r, u, v, yawSea + Math.PI + 0.1 * i, SAND + 0.02);
      const { L, R } = p.rig; [[L, -1], [R, 1]].forEach(([j, s]) => { j.shoulder.rotation.set(-2.9, 0, s * 0.3); j.elbow.rotation.set(-0.6, 0, 0); });
    }
    if (towels.length) g.add(merged(towels, 0.95));

    // the bars at the back of the sand, with plastic chairs and tables out front and someone behind the counter
    const chairs = [];
    menu.bars.forEach((name, k) => {
      const u = -42 + k * 15, v = -31; if (!free(u, v) || !free(u, v + 4)) return;
      place(shack(name), u, v);
      const bm = P(`bar${k}`, { fem: k === 0 }); place(bm.obj, u, v - 0.4);
      [[-1.6, 4], [1.6, 4.4]].forEach(([du, dv], j) => { chairs.push(plasticTable(j ? '#f6f3ec' : '#d9483a').applyMatrix4(local(u + du, v + dv, 0))); [-0.7, 0.7].forEach((s) => chairs.push(plasticChair(j ? '#f6f3ec' : '#d9483a').applyMatrix4(local(u + du + s, v + dv, s > 0 ? -Math.PI / 2 + yawSea : Math.PI / 2 + yawSea)))); });
      if (!low) { const sit = P(`bart${k}`), q = at(u - 1.6 - 0.7, v + 4); sit.obj.position.set(q.x, SAND - 0.36, q.z); sit.obj.rotation.y = yawSea + Math.PI / 2; g.add(sit.obj); seatPose(sit); }
      its.push({ id: `beach:drink:${k}`, label: `Buy ${menu.drink[1].replace(/^A /, 'a ').replace(/, very cold$/, '')} (${menu.drink[2]})`, ...xz(at(u, v + 2.2)), r: 2.6, buy: { what: menu.drink[1], price: menu.drink[2], who: nameFor(`${seed}-bar${k}`, k === 0 ? 'f' : 'm')?.first || 'The barman', line: 'Na cold one be this.' } });
    });
    if (chairs.length) g.add(merged(chairs, 0.55));

    // the sellers: coconuts on a barrow, corn on a grill, suya or kelewele over coals (with smoke)
    const smokes = [];
    const seller = (key, u, v, model, item) => { // item: [what, price, the call, the short name]
      if (!free(u, v)) return;
      place(model, u, v); const p = P(key, { fem: key === 'corn' }); place(p.obj, u - 0.2, v - 1.0);
      const who = nameFor(`${seed}-${key}`, key === 'corn' ? 'f' : 'm')?.first || 'The seller';
      its.push({ id: `beach:${key}`, label: `Buy ${item[3]} (${item[1]})`, ...xz(at(u, v + 1.2)), r: 2.4, buy: { what: item[0], price: item[1], who, line: item[2] } });
    };
    const barrow = new THREE.Group(); barrow.add(merged([paint(box(1.0, 0.35, 1.4, 0, 0.55, 0), '#5c6670'), paint(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12).rotateZ(Math.PI / 2).translate(0, 0.22, 0.75), '#2a2a2a'), paint(box(0.05, 0.05, 1.2, -0.35, 0.5, -0.9), '#8a6a44'), paint(box(0.05, 0.05, 1.2, 0.35, 0.5, -0.9), '#8a6a44'), ...Array.from({ length: 14 }, (_, i) => paint(new THREE.SphereGeometry(0.17, 8, 6).scale(1, 1.15, 1).translate(-0.3 + (i % 4) * 0.2, 0.82 + Math.floor(i / 8) * 0.18, -0.45 + Math.floor(i / 4) * 0.3), '#5f8f2e'))]));
    seller('coconut', -6, -27, barrow, ['A coconut, cut open with a straw', 150, 'Coconut! Sweet coconut!', 'a coconut']);
    const grill = (embers) => { const gg = new THREE.Group(); gg.add(merged([paint(box(1.2, 0.08, 0.6, 0, 0.8, 0), '#3a3a3a'), ...[[-0.5, -0.22], [0.5, -0.22], [-0.5, 0.22], [0.5, 0.22]].map(([x, z]) => paint(box(0.05, 0.8, 0.05, x, 0.4, z), '#3a3a3a')), ...Array.from({ length: 6 }, (_, i) => paint(box(0.08, 0.06, 0.4, -0.45 + i * 0.18, 0.88, 0), embers))])); const sm = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: '#e9e5de', transparent: true, opacity: 0.35, depthWrite: false })); gg.add(sm); smokes.push(sm); return gg; };
    seller('corn', 9, -29, grill('#e2c23a'), [menu.corn.split(' and ')[0], 100, 'Corn! Hot roasted corn!', 'roasted corn']);
    seller('grill', -30, -26, grill('#8a3a22'), [menu.grill[1], menu.grill[2], menu.grill[3], menu.grill[0]]);

    // the lifeguard on his tower, and the red and yellow flags you swim between
    if (free(0, -8)) {
      const tower = new THREE.Group(); tower.add(merged([...[[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]].map(([x, z]) => paint(box(0.1, 2.2, 0.1, x, 1.1, z), '#f6f1e6')), paint(box(1.5, 0.12, 1.3, 0, 2.2, 0), '#e04a3a'), paint(box(1.5, 0.7, 0.08, 0, 2.6, -0.6), '#e04a3a'), ...[0.5, 1.1, 1.7].map((y) => paint(box(0.7, 0.05, 0.08, 0, y, 0.6), '#f6f1e6'))]));
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), mat('#e04a3a', 0.8, { side: THREE.DoubleSide })); flag.position.set(0.7, 3.6, -0.5); tower.add(flag); tower.add(new THREE.Mesh(box(0.04, 1.6, 0.04, 0.3, 3.1, -0.5), mat('#d8d2c4')));
      place(tower, 0, -8);
      const lg = P('lifeguard', { look: { ...lookFor(`${seed}-lg`), top: 'tee', topColor: '#e04a3a', bottom: 'shorts', bottomColor: '#f2c230' } }); lg.obj.position.set(0, 2.26, 0.1); tower.add(lg.obj);
    }
    [-22, 22].forEach((u) => { const f = new THREE.Group(); f.add(new THREE.Mesh(box(0.05, 2.6, 0.05, 0, 1.3, 0), mat('#d8d2c4'))); const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshStandardMaterial({ map: tex(32, 64, (c) => { c.fillStyle = '#e04a3a'; c.fillRect(0, 0, 32, 32); c.fillStyle = '#f2c230'; c.fillRect(0, 32, 32, 32); }), side: THREE.DoubleSide })); fl.position.set(0.37, 2.1, 0); f.add(fl); place(f, u, -1.5, yawSea + Math.PI / 2); });
    // swimmers between the flags, head and shoulders out of the water
    const swimmers = [];
    for (let i = 0; i < (low ? 1 : 3); i++) { const p = P(`swim${i}`); const u = -14 + i * 12, v = 7 + (i % 2) * 5; place(p.obj, u, v, yawSea + Math.PI + (i - 1) * 0.6, SEA - 1.3); swimmers.push({ p, y: SEA - 1.3, ph: i * 2 }); const { L, R } = p.rig; L.shoulder.rotation.set(-1.4, 0, -0.5); R.shoulder.rotation.set(-1.4, 0, 0.5); }

    // football on the hard sand: two small goals, a ball, players chasing it
    const pitch = { u0: 22, u1: 48, v0: -27, v1: -9 }, team = [];
    if (free(35, -18) && free(22, -18) && free(48, -18)) {
      const goal = () => merged([paint(box(0.08, 1.2, 0.08, 0, 0.6, -1.1), '#f6f1e6'), paint(box(0.08, 1.2, 0.08, 0, 0.6, 1.1), '#f6f1e6'), paint(box(0.08, 0.08, 2.3, 0, 1.2, 0), '#f6f1e6'), paint(box(0.6, 0.06, 0.06, -0.3, 0.05, -1.1), '#f6f1e6'), paint(box(0.6, 0.06, 0.06, -0.3, 0.05, 1.1), '#f6f1e6')]);
      const g1 = goal(), g2 = goal(); place(g1, pitch.u0, -18, yawSea + Math.PI / 2); place(g2, pitch.u1, -18, yawSea - Math.PI / 2);
      const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), mat('#f6f1e6', 0.5)); g.add(ball);
      const B = { u: 35, v: -18, du: 0, dv: 0, y: 0 };
      for (let i = 0; i < (low ? 4 : 6); i++) { const p = P(`foot${i}`, { look: { ...lookFor(`${seed}-f${i}`), top: 'tee', topColor: i % 2 ? '#2a9d94' : '#f2b631', bottom: 'shorts' } }); g.add(p.obj); team.push({ p, u: 26 + (i % 3) * 8, v: -24 + i * 2.5, side: i % 2, home: { u: i % 2 ? 41 - (i % 3) * 5 : 29 + (i % 3) * 5, v: -24 + (i % 3) * 6 }, kick: 0 }); }
      team.ball = { ball, B };
    }

    // horses walked along the tide line by their owners, one with a rider on it
    const horses = [];
    for (let i = 0; i < 2; i++) {
      const h = { model: horseModel(HORSE[i % HORSE.length], BLANKET[(i + 1) % 4]), handler: P(`horse${i}`, { fem: false }), rider: i === 0 && !low ? P(`rider${i}`) : null, u: -30 + i * 40, dir: i ? -1 : 1, v: -5 - i * 1.5, wait: 0, free: true };
      g.add(h.model); g.add(h.handler.obj); if (h.rider) { h.model.add(h.rider.obj); h.rider.obj.position.set(0, 0.95, 0.05); ridePose(h.rider); }
      h.it = { id: `beach:horse:${i}`, label: 'Ride a horse (500)', x: 0, z: 0, r: 2.6 };
      its.push(h.it); horses.push(h);
    }
    o.interact?.push(...its);
    return { b, g, at, su, sv, yawSea, people, its, foams, wet, smokes, swimmers, team, pitch, horses, free };
  }
  const xz = (p) => ({ x: p.x, z: p.z });
  function seatPose(p) { const { L, R } = p.rig; [[L, -1], [R, 1]].forEach(([j, s]) => { j.hip.rotation.set(-1.45, 0, s * 0.05); j.knee.rotation.set(1.45, 0, 0); j.shoulder.rotation.set(-0.3, 0, s * 0.12); }); }
  function ridePose(p) { const { L, R } = p.rig; [[L, -1], [R, 1]].forEach(([j, s]) => { j.hip.rotation.set(-0.7, 0, s * 0.42); j.knee.rotation.set(0.9, 0, 0); j.shoulder.rotation.set(-0.7, 0, s * 0.1); j.elbow.rotation.set(-0.9, 0, 0); }); }

  function teardown() {
    if (!cur) return;
    if (ride) endRide();
    cur.its.forEach((it) => { const k = o.interact?.indexOf(it); if (k >= 0) o.interact.splice(k, 1); });
    cur.people.forEach((p) => p.dispose?.());
    cur.g.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); [].concat(m.material).forEach((q) => { q.map?.dispose(); q.dispose(); }); } });
    cur.g.removeFromParent(); cur = null;
  }

  // ---------- each frame ----------
  function update(dt) {
    t += dt; lastCheck += dt;
    const P = o.getPlayer?.() || { x: 0, z: 0 };
    if (lastCheck > 2) { // which beach, if any, is near enough to be set up
      lastCheck = 0;
      const near = (o.beaches?.() || []).filter((b) => b.sea).map((b) => ({ b, d: Math.hypot(b.x - P.x, b.z - P.z) })).sort((a, b) => a.d - b.d)[0];
      if (cur && (!near || near.b.label !== cur.b.label) && Math.hypot(cur.b.x - P.x, cur.b.z - P.z) > FAR) teardown();
      if (!cur && near && near.d < NEAR) { try { cur = build(near.b); } catch (err) { console.warn('beach life skipped', err); cur = null; } }
    }
    if (!cur) return;
    const B = cur;
    // the foam: a line of white water runs up the sand, thins and sinks in, the next behind it
    B.foams.forEach((f) => { const k = (t / 7 + f.ph) % 1, v = 16 - k * 18, w = 1 + k * 0.8; f.m.position.copy(B.at(0, v, SEA + 0.02)); f.m.scale.set(1, 1, w); f.m.material.opacity = Math.min(1, k * 4) * (k > 0.8 ? (1 - k) * 5 : 1) * 0.9; });
    B.wet.material.opacity = 0.35 + 0.15 * Math.sin(t * 0.9);
    B.smokes.forEach((s, i) => { const k = (t * 0.4 + i * 0.3) % 1; s.position.set(Math.sin(t + i) * 0.2, 1.1 + k * 2.2, 0); s.scale.setScalar(0.6 + k * 1.6); s.material.opacity = 0.35 * (1 - k); });
    B.swimmers.forEach((s) => { s.p.obj.position.y = s.y + Math.sin(t * 1.3 + s.ph) * 0.12; });
    // football: whoever is nearest chases the ball and boots it toward the other goal; the rest drift to their places
    if (B.team.ball) {
      const { ball, B: bl } = B.team.ball, pt = B.pitch;
      bl.u += bl.du * dt; bl.v += bl.dv * dt; bl.du *= Math.exp(-dt * 0.9); bl.dv *= Math.exp(-dt * 0.9); bl.y = Math.max(0, bl.y + (bl.vy = (bl.vy || 0) - 9.8 * dt) * dt); if (bl.y === 0) bl.vy = 0;
      if (bl.u < pt.u0 + 0.5 || bl.u > pt.u1 - 0.5) { bl.du *= -0.5; bl.u = Math.max(pt.u0 + 0.5, Math.min(pt.u1 - 0.5, bl.u)); } if (bl.v < pt.v0 || bl.v > pt.v1) { bl.dv *= -0.5; bl.v = Math.max(pt.v0, Math.min(pt.v1, bl.v)); }
      const bp = B.at(bl.u, bl.v, SAND + 0.11 + bl.y); ball.position.copy(bp); ball.rotation.x += Math.hypot(bl.du, bl.dv) * dt * 3;
      const chaser = B.team.reduce((a, q) => (Math.hypot(q.u - bl.u, q.v - bl.v) < Math.hypot(a.u - bl.u, a.v - bl.v) ? q : a));
      B.team.forEach((q) => {
        const to = q === chaser ? { u: bl.u - (q.side ? -0.4 : 0.4), v: bl.v } : { u: (q.home.u + bl.u) / 2, v: (q.home.v + bl.v) / 2 }, du = to.u - q.u, dv = to.v - q.v, d = Math.hypot(du, dv), sp = d > 0.4 ? Math.min(q === chaser ? 4.2 : 2.2, d * 2) : 0;
        if (d > 0.01) { q.u += (du / d) * sp * dt; q.v += (dv / d) * sp * dt; }
        q.kick -= dt;
        if (q === chaser && d < 0.6 && q.kick <= 0) { const goalU = q.side ? B.pitch.u0 : B.pitch.u1, a = Math.atan2(-18 - bl.v + (Math.random() - 0.5) * 8, goalU - bl.u); const f = 5 + Math.random() * 6; bl.du = Math.cos(a) * f; bl.dv = Math.sin(a) * f; bl.vy = Math.random() < 0.3 ? 3 : 0.5; q.kick = 1.2; }
        const p = B.at(q.u, q.v); q.p.obj.position.set(p.x, SAND, p.z);
        const face = Math.atan2(B.su.x * (bl.u - q.u) + B.sv.x * (bl.v - q.v), B.su.z * (bl.u - q.u) + B.sv.z * (bl.v - q.v)); q.p.obj.rotation.y = face;
        q.p.rig?.update(dt, { speed: sp, t });
      });
    }
    // the horses: walked up and down the tide line, turning at the ends, a pause now and then
    B.horses.forEach((h) => {
      if (ride?.h === h) return;
      let sp = 0;
      if (h.wait > 0) h.wait -= dt; else { sp = 1.1; h.u += h.dir * sp * dt; if (Math.abs(h.u) > 50 || !B.free(h.u + h.dir * 3, h.v)) { h.dir *= -1; h.wait = 3 + Math.random() * 4; } }
      const p = B.at(h.u, h.v), yaw = Math.atan2(B.su.x * h.dir, B.su.z * h.dir);
      h.model.position.set(p.x, SAND, p.z); h.model.rotation.y = yaw; h.model.userData.walk(dt, sp);
      const hp = B.at(h.u + h.dir * 0.9, h.v - 0.9); h.handler.obj.position.set(hp.x, SAND, hp.z); h.handler.obj.rotation.y = yaw; h.handler.rig?.update(dt, { speed: sp, t });
      Object.assign(h.it, xz(hp));
    });
    if (ride) rideStep(dt);
  }

  // ---------- buying, and hiring a horse ----------
  function use(id) {
    if (!cur) return false;
    const it = cur.its.find((q) => q.id === id); if (!it) return false;
    if (id.startsWith('beach:horse:')) { startRide(cur.horses[+id.split(':')[2]]); return true; }
    const b = it.buy; sfx('interact');
    if (!walletEngine().spend(b.price, `${b.what} on the beach`)) { o.toast(`${b.who}: "No money, no ${b.what.split(/[ ,]/)[0].toLowerCase()}."`, 2400); return true; }
    dispatchEvent(new CustomEvent('bw:me', { detail: { ate: /chapman|sobolo|coconut/i.test(b.what) ? 0.15 : 0.35 } }));
    o.toast(`${b.who}: "${b.line}" ${b.what}, ${b.price} Efforts.`, 3200); return true;
  }

  const keys = gameKeys(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'escape', 'e']);
  const ui = sportsUI();
  function startRide(h) {
    if (ride || !h) return;
    if (!walletEngine().spend(500, 'A horse ride on the beach')) { o.toast(`${h.handler.name || 'The owner'}: "Five hundred, my friend. Come back."`, 2400); return; }
    const you = playerPerson(o.avatar, 'you-horse'); ridePose(you);
    if (h.rider) h.rider.obj.visible = false;
    h.model.add(you.obj); you.obj.position.set(0, 0.95, 0.05);
    const owner = nameFor(`${cur.b.label}-horse${cur.horses.indexOf(h)}`, 'm')?.first || 'The owner';
    ride = { h, you, t: 0, yaw: h.model.rotation.y, sp: 0, owner, pad: touchPad() }; keys.on = true; recMode(true);
    ui.show(true); ui.keys([['A D', 'steer'], ['W', 'trot'], ['S', 'walk'], ['Esc', 'get down']]);
    ui.call(`${owner}: "Hold the reins loose. She knows the beach better than you."`, 3600); sfx('interact');
  }
  // on a phone: steer, walk, trot and get down as buttons (the street's own controls are put away meanwhile)
  function touchPad() {
    if (!matchMedia('(pointer: coarse)').matches) return null;
    const pad = document.createElement('div'); pad.id = 'bw-horsepad';
    pad.innerHTML = `<style>#bw-horsepad{position:fixed;inset:auto 0 18px 0;display:flex;justify-content:space-between;padding:0 16px;z-index:35;pointer-events:none}
      #bw-horsepad div{display:flex;gap:10px;pointer-events:auto} #bw-horsepad button{width:64px;height:64px;border-radius:50%;border:0;background:${C.paper};color:${C.ink};font:800 13px/1 ${FONT};box-shadow:0 3px 0 rgba(59,42,32,.25)}
      #bw-horsepad button.big{background:${C.amber}}</style>
      <div><button data-k="a">◀</button><button data-k="d">▶</button></div><div><button data-k="s">Walk</button><button data-k="w" class="big">Trot</button><button data-k="escape">Off</button></div>`;
    document.body.appendChild(pad); pad.held = new Set();
    pad.querySelectorAll('button').forEach((b) => {
      const k = b.dataset.k;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (k === 'escape') pad.off = true; else pad.held.add(k); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, () => pad.held.delete(k)));
    });
    return pad;
  }
  function rideStep(dt) {
    const r = ride, h = r.h, B = cur, down = (k) => keys.has(k) || r.pad?.held.has(k);
    const tk = keys.take(); if (tk.includes('escape') || tk.includes('e') || r.pad?.off || r.t > 120) { endRide(); return; }
    r.t += dt;
    const steer = (down('a') || down('arrowleft') ? 1 : 0) - (down('d') || down('arrowright') ? 1 : 0);
    const want = down('w') || down('arrowup') ? 3.4 : down('s') || down('arrowdown') ? 0.9 : 1.6;
    r.sp += (want - r.sp) * (1 - Math.exp(-dt * 1.5)); r.yaw += steer * 0.9 * dt;
    let nx = h.model.position.x + Math.sin(r.yaw) * r.sp * dt, nz = h.model.position.z + Math.cos(r.yaw) * r.sp * dt;
    // stay on the beach: the sand between the tide line and the bars, along the stretch that is set up
    const du = (nx - B.b.x) * B.su.x + (nz - B.b.z) * B.su.z, dv = (nx - B.b.x) * B.sv.x + (nz - B.b.z) * B.sv.z;
    if (dv > 2 || dv < -24 || Math.abs(du) > 70 || o.openWorld?.solidAt?.(nx, nz)) { r.sp *= 0.3; r.yaw += Math.PI * dt * 0.8; nx = h.model.position.x; nz = h.model.position.z; }
    h.model.position.set(nx, SAND, nz); h.model.rotation.y = r.yaw; h.model.userData.walk(dt, r.sp);
    // the owner jogs along beside at a walk, and waits when you trot off
    const hp = h.handler.obj.position, tx = nx + Math.cos(r.yaw) * 1.1, tz = nz - Math.sin(r.yaw) * 1.1, hd = Math.hypot(tx - hp.x, tz - hp.z), hs = hd > 1 ? Math.min(2.4, hd) : 0;
    if (hd > 0.01) { hp.x += ((tx - hp.x) / hd) * hs * dt; hp.z += ((tz - hp.z) / hd) * hs * dt; h.handler.obj.rotation.y = Math.atan2(tx - hp.x, tz - hp.z); }
    h.handler.rig?.update(dt, { speed: hs, t });
    if (r.t > 100 && !r.warned) { r.warned = true; ui.call(`${r.owner}: "Time is almost up, oga."`, 2400); }
  }
  function endRide() {
    const r = ride; if (!r) return; ride = null; keys.on = false; recMode(false); ui.show(false); r.pad?.remove();
    r.you.obj.removeFromParent(); r.you.dispose?.(); if (r.h.rider) r.h.rider.obj.visible = true;
    const p = r.h.model.position, side = { x: p.x + Math.cos(r.yaw) * 1.4, z: p.z - Math.sin(r.yaw) * 1.4 };
    r.h.u = (p.x - cur.b.x) * cur.su.x + (p.z - cur.b.z) * cur.su.z; r.h.v = Math.max(-8, Math.min(-3, (p.x - cur.b.x) * cur.sv.x + (p.z - cur.b.z) * cur.sv.z));
    o.standAt?.(side.x, side.z);
    dispatchEvent(new CustomEvent('bw:me', { detail: { played: 0.25 } }));
    o.toast(`${r.owner} takes the reins. ${Math.round(r.t)} s on the sand.`, 2600);
  }
  // the camera while you ride: behind and a little to the side, away from the side the owner walks on
  function pose() {
    if (!ride) return null;
    const p = ride.h.model.position, y = ride.yaw, fx = Math.sin(y), fz = Math.cos(y);
    return { x: p.x, z: p.z, yaw: y, hide: true, cam: { from: new THREE.Vector3(p.x - fx * 6.5 - fz * 1.6, 3.6, p.z - fz * 6.5 + fx * 1.6), at: new THREE.Vector3(p.x + fx * 2, 1.7, p.z + fz * 2) }, speed: 0 };
  }

  return { update, use, pose, get riding() { return !!ride; }, get current() { return cur; }, dispose() { teardown(); keys.on = false; } };
}
