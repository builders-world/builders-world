// A developer's view of the baked open city (city.html, not part of the game's build): chunks round a point, meshed on
// the main thread, seen from above, to check the road network's junctions, roundabouts and paint.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { meshChunk } from './chunkmesh.js';
import { facadeMaterial, facadeUniforms } from './facade.js';

const q = new URLSearchParams(location.search), city = q.get('city') || 'nairobi';
const X = +(q.get('x') ?? 0), Z = +(q.get('z') ?? 0), RAD = +(q.get('r') ?? 450), H = +(q.get('h') ?? 260), lod = +(q.get('lod') ?? 0);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(innerWidth, innerHeight); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#cfe3ea');
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 20000);
camera.position.set(X + H * 0.35 * +(q.get('tilt') ?? 1), H, Z + H * 0.55 * +(q.get('tilt') ?? 1));
const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(X, 0, Z); controls.update();
scene.add(new THREE.HemisphereLight(0xd4ebff, 0x8a7a52, 2.2));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4); sun.position.set(-300, 600, 250); scene.add(sun);
const flat = new THREE.MeshLambertMaterial({ vertexColors: true }), fac = facadeMaterial();
facadeUniforms.uNight.value = +(q.get('night') ?? 0);
const base = `./city/${city}/`;
const meta = await (await fetch(`${base}index.json`)).json();
const S = meta.chunk;
let n = 0;
for (const [i, j] of meta.chunks) {
  const cx = (i + 0.5) * S, cz = (j + 0.5) * S; if (Math.hypot(cx - X, cz - Z) > RAD + S) continue;
  const d = await (await fetch(`${base}${i}_${j}.json`)).json(), o = meshChunk(d, meta, { lod, ci: i, cj: j, size: S });
  const geo = (L, f) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(L.p, 3)); g.setAttribute('normal', new THREE.BufferAttribute(L.n, 3)); g.setAttribute('color', new THREE.BufferAttribute(L.c, 3)); if (f) g.setAttribute('aFac', new THREE.BufferAttribute(L.f, 4)); return g; };
  scene.add(new THREE.Mesh(geo(o.ground), flat), new THREE.Mesh(geo(o.solid), flat), new THREE.Mesh(geo(o.facade, true), fac));
  n++;
}
document.getElementById('hud').textContent = `${meta.city}: ${n} chunks round (${X}, ${Z})`;
window.__ready = true;
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
