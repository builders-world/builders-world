import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Each workspace its own character (world bible 6.6), in the space the shared layout leaves free (the
// back wall, the left wall, and the floor between the desks and the meeting room, x 0 to 3.5, z -8 to -2):
// the Creative Hub is for developers (a CI wall, server racks, an architecture whiteboard), the Builders
// Loft is industrial (brick, long communal tables, phone booths, lockers, ducts), Eko Design Studio is for
// designers (moodboards, a swatch wall, a product plinth on a photo sweep, drawing tablets).
// Room: 26 x 18 m, centred, walls at x = +-13 and z = +-9, ceiling 3.6 m.

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
function tex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
const mat = (c, r = 0.7, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

export const DECOR_LINES = {
  'in:ci': ['main is green. 214 tests, 3 minutes 12 seconds.', 'A red build on the payments service. Someone is already on it.', 'Deploy #482 rolled out to 100%.'],
  'in:arch': ['Gateway, then the queue, then the workers. Someone drew a dragon next to the cache.', '"Why is there a second database?" written in red, circled twice.'],
  'in:racks': ['Two racks of the hub\'s own machines. The fans hum.', 'The status lights blink green, all twelve nodes up.'],
  'in:booth': ['You take a call in the phone booth. Quiet at last.', 'The booth smells faintly of someone\'s suya lunch.'],
  'in:locker': ['Your locker: a spare charger, a hoodie, and three granola bars.', 'Locker 14. Yours for the month.'],
  'in:long': ['The long table hums with three hackathon teams.', 'Someone is pitching their startup to anyone who will listen.'],
  'in:swatch': ['Two hundred paint chips. You pick "Lagos dusk".', 'Teal, coral, amber. It always comes back to these.'],
  'in:plinth': ['A product shoot: a hand-carved stool under softbox light.', 'The sweep is spotless. Shoes off, please.'],
  'in:moods': ['Moodboards for a Lagos fintech rebrand.', 'Adire patterns pinned next to Swiss grids.'],
};

export function decorate(key, { g, block, interact, H = 3.6 }) {
  const add = (geo, m) => { const o = new THREE.Mesh(geo, m); g.add(o); return o; };
  const say = (id, label, x, z, r = 1.8) => interact.push({ id, label, x, z, r });
  const dark = mat(0x1d2028, 0.5), metal = mat(0x8a929a, 0.35, 0.5);
  if (key === 'hub') {
    // the CI wall: a big screen of pipelines, green and the odd red
    const ci = tex(1024, 400, (x, w, h) => {
      x.fillStyle = '#0d1117'; x.fillRect(0, 0, w, h); x.font = '700 30px monospace'; x.fillStyle = '#e6edf3'; x.fillText('main  ·  builds', 30, 50);
      ['gateway', 'jobs', 'web', 'payments', 'mobile', 'docs'].forEach((n, i) => { const ok = n !== 'payments'; x.fillStyle = ok ? '#238636' : '#da3633'; x.fillRect(30, 80 + i * 50, 22, 22); x.fillStyle = '#e6edf3'; x.font = '24px monospace'; x.fillText(`${n.padEnd(10)} ${ok ? 'passed' : 'failed'}  ${2 + i}m${(i * 7) % 60}s`, 70, 100 + i * 50); for (let k = 0; k < 14; k++) { x.fillStyle = (k + i) % 9 === 0 && !ok ? '#da3633' : '#2ea043'; x.fillRect(600 + k * 28, 82 + i * 50, 20, 20); } });
    });
    add(box(5.2, 2.2, 0.12, -6, 2.1, -8.85), dark); add(new THREE.PlaneGeometry(5.0, 2.0).translate(-6, 2.1, -8.78), new THREE.MeshBasicMaterial({ map: ci }));
    say('in:ci', 'Check the CI wall', -6, -6.6, 2.4);
    // two server racks with blinking lights
    const leds = [];
    [1.4, 2.4].forEach((x) => { add(box(0.8, 2.1, 1.0, x, 1.05, -8.3), dark); block(x, -8.3, 0.8, 1.0); for (let u = 0; u < 9; u++) { add(box(0.7, 0.12, 0.02, x, 0.3 + u * 0.2, -7.79), metal); const l = new THREE.Mesh(box(0.04, 0.04, 0.01, x - 0.25, 0.3 + u * 0.2, -7.775), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.2, 0.8) })); g.add(l); leds.push(l); } });
    say('in:racks', 'Look at the server racks', 1.9, -7.2, 1.8);
    // the architecture whiteboard on the left wall
    const arch = tex(1024, 512, (x, w, h) => {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.strokeStyle = '#1d4e89'; x.lineWidth = 6; x.font = '700 30px sans-serif'; x.fillStyle = '#1d4e89';
      [['Gateway', 80, 80], ['Queue', 420, 80], ['Workers', 760, 80], ['Postgres', 250, 330], ['Redis', 600, 330]].forEach(([t, bx, by]) => { x.strokeRect(bx, by, 200, 90); x.fillText(t, bx + 30, by + 55); });
      x.beginPath(); x.moveTo(280, 125); x.lineTo(420, 125); x.moveTo(620, 125); x.lineTo(760, 125); x.moveTo(180, 170); x.lineTo(330, 330); x.moveTo(520, 170); x.lineTo(680, 330); x.stroke();
      x.strokeStyle = '#c0392b'; x.fillStyle = '#c0392b'; x.font = '700 28px sans-serif'; x.fillText('why 2 DBs??', 700, 470); x.beginPath(); x.ellipse(780, 460, 120, 34, 0, 0, 7); x.stroke();
    });
    add(new THREE.PlaneGeometry(4.2, 2.1).rotateY(Math.PI / 2).translate(-12.88, 1.8, -3), new THREE.MeshStandardMaterial({ map: arch, roughness: 0.5 }));
    say('in:arch', 'Read the architecture whiteboard', -11.4, -3, 2.0);
    let t = 0; return { tick(dt) { t += dt; leds.forEach((l, i) => { l.visible = Math.sin(t * (2 + (i % 4)) + i) > -0.3; }); } };
  }
  if (key === 'loft') {
    // brick on the back and left walls
    const brick = tex(512, 256, (x, w, h) => { x.fillStyle = '#8a4b33'; x.fillRect(0, 0, w, h); for (let r = 0; r < 16; r++) for (let c = 0; c < 9; c++) { const off = r % 2 ? 28 : 0; x.fillStyle = ['#a65a3c', '#9c5236', '#b26444', '#94503a'][(r * 3 + c) % 4]; x.fillRect(c * 60 + off - 28, r * 16 + 2, 56, 12); } });
    brick.wrapS = brick.wrapT = THREE.RepeatWrapping;
    const bk = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.95 }); bk.map.repeat.set(4, 2);
    add(new THREE.PlaneGeometry(26, H).translate(0, H / 2, -8.88), bk);
    const bk2 = bk.clone(); bk2.map = brick.clone(); bk2.map.repeat.set(3, 2); bk2.map.needsUpdate = true;
    add(new THREE.PlaneGeometry(18, H).rotateY(Math.PI / 2).translate(-12.88, H / 2, 0), bk2);
    // exposed ducts along the ceiling
    add(new THREE.CylinderGeometry(0.28, 0.28, 24, 14).rotateZ(Math.PI / 2).translate(0, H - 0.45, -6.5), metal);
    add(new THREE.CylinderGeometry(0.22, 0.22, 16, 14).rotateX(Math.PI / 2).translate(-11.5, H - 0.4, 0), metal);
    // a long communal table, benches either side
    const wood = mat(0x6b4426, 0.6);
    add(box(1.3, 0.07, 5.2, 1.6, 0.76, -5.2), wood); add(mergeGeometries([box(0.08, 0.76, 1.1, 1.6, 0.38, -7.4), box(0.08, 0.76, 1.1, 1.6, 0.38, -3.0)]), dark); block(1.6, -5.2, 1.3, 5.2);
    [0.6, 2.6].forEach((x) => { add(box(0.35, 0.45, 5.0, x, 0.225, -5.2), wood); block(x, -5.2, 0.35, 5.0); });
    for (let k = 0; k < 4; k++) add(box(0.34, 0.02, 0.22, 1.6 + (k % 2 ? 0.3 : -0.3), 0.8, -7 + k * 1.2), dark); // laptops left open
    say('in:long', 'Sit in on the long table', 1.6, -2.0, 1.8);
    // two phone booths against the back wall
    const booth = mat(0x2a9d94, 0.8), felt = mat(0x1d4a46, 0.98);
    [[-1.8, -8.0], [-0.4, -8.0]].forEach(([x, z]) => { add(mergeGeometries([box(1.2, 2.3, 0.08, x, 1.15, z - 0.55), box(0.08, 2.3, 1.1, x - 0.6, 1.15, z), box(0.08, 2.3, 1.1, x + 0.6, 1.15, z), box(1.2, 0.08, 1.1, x, 2.3, z)]), booth); add(box(1.04, 2.0, 0.04, x, 1.1, z - 0.5), felt); add(new THREE.Mesh(box(1.1, 2.1, 0.04, x, 1.1, z + 0.54), new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.05, transparent: true, opacity: 0.25 })).geometry, new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.05, transparent: true, opacity: 0.25 })); block(x, z, 1.2, 1.1); });
    say('in:booth', 'Take a call in a phone booth', -1.1, -6.8, 1.6);
    // lockers along the left wall
    const lockerTex = tex(256, 512, (x, w, h) => { x.fillStyle = '#3f6e8a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2b4f63'; x.lineWidth = 6; x.strokeRect(6, 6, w - 12, h - 12); x.fillStyle = '#2b4f63'; for (let k = 0; k < 6; k++) x.fillRect(60, 40 + k * 14, 136, 5); x.fillStyle = '#d9d2c3'; x.fillRect(200, 250, 14, 50); });
    const lockerM = new THREE.MeshStandardMaterial({ map: lockerTex, roughness: 0.5, metalness: 0.3 });
    for (let k = 0; k < 8; k++) { add(box(0.5, 1.9, 0.55, -12.6, 0.95, -8 + k * 0.56), lockerM); }
    block(-12.6, -6.04, 0.55, 4.5);
    say('in:locker', 'Open your locker', -11.6, -6.0, 1.8);
    return null;
  }
  if (key === 'studio') {
    // moodboards along the back wall
    const boards = [['#2a9d94', '#f2b33d', '#e46f4f', '#3b2a20'], ['#b9c8f2', '#f6a8a0', '#8fca72', '#fbf7ee'], ['#5a4632', '#c9a27a', '#e9e1d0', '#2a6f6a']];
    boards.forEach((cols, i) => { const t = tex(512, 360, (x, w, h) => { x.fillStyle = '#efe7d6'; x.fillRect(0, 0, w, h); for (let k = 0; k < 7; k++) { x.save(); x.translate(40 + (k % 4) * 115 + (k > 3 ? 55 : 0), 40 + Math.floor(k / 4) * 160); x.rotate(((k * 37) % 10 - 5) / 60); x.fillStyle = cols[k % 4]; x.fillRect(0, 0, 100, 130); x.fillStyle = '#ffffff'; x.fillRect(10, 100, 80, 16); x.restore(); } }); add(new THREE.PlaneGeometry(2.6, 1.8).translate(-9 + i * 3.1, 1.9, -8.86), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 })); });
    say('in:moods', 'Look at the moodboards', -6, -6.8, 2.6);
    // the swatch wall on the left wall: hundreds of paint chips
    const sw = tex(1024, 512, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); for (let r = 0; r < 12; r++) for (let c = 0; c < 26; c++) { x.fillStyle = `hsl(${(c * 14) % 360} ${40 + (r % 4) * 15}% ${30 + r * 5}%)`; x.fillRect(12 + c * 38.5, 12 + r * 41, 32, 34); } });
    add(new THREE.PlaneGeometry(5.6, 2.4).rotateY(Math.PI / 2).translate(-12.88, 1.7, -3), new THREE.MeshStandardMaterial({ map: sw, roughness: 0.7 }));
    say('in:swatch', 'Browse the swatch wall', -11.4, -3, 2.0);
    // a photo sweep with a plinth and a product under softbox light
    const paper = mat(0xf4f1ea, 0.9);
    const sweep = new THREE.Shape(); sweep.moveTo(0, 0); sweep.lineTo(2.2, 0); sweep.quadraticCurveTo(3.0, 0, 3.0, 0.8); sweep.lineTo(3.0, 2.6); sweep.lineTo(2.96, 2.6); sweep.lineTo(2.96, 0.8); sweep.quadraticCurveTo(2.96, 0.04, 2.2, 0.04); sweep.lineTo(0, 0.04); sweep.closePath();
    const sg = new THREE.ExtrudeGeometry(sweep, { depth: 3.0, bevelEnabled: false }).rotateY(Math.PI / 2).translate(0.2, 0, -5.0); add(sg, paper);
    add(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 20).translate(1.7, 0.45, -6.3), mat(0xffffff, 0.4)); block(1.7, -6.3, 0.8, 0.8);
    add(mergeGeometries([box(0.4, 0.05, 0.4, 1.7, 1.18, -6.3), box(0.04, 0.3, 0.04, 1.55, 1.0, -6.45), box(0.04, 0.3, 0.04, 1.85, 1.0, -6.45), box(0.04, 0.3, 0.04, 1.55, 1.0, -6.15), box(0.04, 0.3, 0.04, 1.85, 1.0, -6.15)]), mat(0xc9a27a, 0.6)); // a little stool, the product
    const soft = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.1) });
    [[0.4, -4.8], [3.2, -4.8]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(0.02, 0.02, 1.9, 6).translate(x, 0.95, z), dark); add(box(0.6, 0.6, 0.08, x, 2.0, z), soft); block(x, z, 0.3, 0.3); });
    say('in:plinth', 'Look at the product shoot', 1.7, -4.4, 1.8);
    // drawing tablets on the cafeteria-side table... on a small table by the swatches
    add(box(1.6, 0.05, 0.8, -10.6, 0.75, 1.4), mat(0xc9a27a, 0.6)); block(-10.6, 1.4, 1.6, 0.8);
    [-11.0, -10.2].forEach((x) => { const tb = new THREE.Mesh(box(0.5, 0.02, 0.36, x, 0.79, 1.4), dark); g.add(tb); add(new THREE.PlaneGeometry(0.44, 0.3).rotateX(-Math.PI / 2).translate(x, 0.801, 1.4), new THREE.MeshBasicMaterial({ color: 0xfbf7ee })); });
    return null;
  }
  return null;
}
