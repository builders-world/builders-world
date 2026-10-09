import * as THREE from 'three';
import { pointAlong, pathLength } from './nav.js';
import { logDepth } from '../shaders.js';

// The route on the ground (world bible 11): a soft painted ribbon that follows the streets, with arrows
// that flow toward the destination, fading in near your feet and out in the distance; a light column
// stands over the destination, as GPS beacons do in open-world games. Everything sits 24 cm up with a
// depth offset, above every ground layer (the road paint is at 17 cm), so nothing fights the road.

const Y = 0.24, STEP = 0.5, AHEAD = 70, WIDTH = 1.0;
const N = Math.ceil(AHEAD / STEP) + 2;

export function createTrail({ reduced }) {
  const group = new THREE.Group();
  group.name = 'trail';
  const pos = new Float32Array(N * 2 * 3), uv = new Float32Array(N * 2 * 2);
  const idx = [];
  for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } // wound to face up
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const uniforms = { uTime: { value: 0 }, uLen: { value: 1 }, uFlow: { value: reduced ? 0 : 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime, uLen, uFlow; varying vec2 vUv;
      void main() {
        float across = vUv.x * 2.0 - 1.0;      // -1 .. 1 over the width
        float along = vUv.y;                    // metres from the start of the ribbon
        float edge = 1.0 - smoothstep(0.78, 1.0, abs(across));
        // arrows: a V that opens backwards, so its point leads toward the destination
        // the centre of each arrow is further along than its arms, so the tip leads toward the destination
        float s = fract((along + abs(across) * 0.55) / 2.2 - uTime * 0.55 * uFlow);
        float arrow = smoothstep(0.0, 0.06, s) * (1.0 - smoothstep(0.24, 0.32, s)) * step(abs(across), 0.7);
        vec3 band = vec3(0.165, 0.616, 0.580);    // teal
        vec3 cream = vec3(0.969, 0.937, 0.863);
        vec3 col = mix(band, cream, arrow);
        float fade = smoothstep(0.0, 2.5, along) * (1.0 - smoothstep(uLen - 12.0, uLen, along));
        float a = edge * fade * mix(0.55, 0.95, arrow);
        if (a < 0.01) discard;
        gl_FragColor = vec4(col, a);
      }`,
  });
  logDepth(mat);
  const ribbon = new THREE.Mesh(geo, mat);
  ribbon.frustumCulled = false; ribbon.renderOrder = 3;
  group.add(ribbon);

  // destination: a soft light column and a pulsing ground ring
  const beaconMat = new THREE.ShaderMaterial({
    uniforms: { uTime: uniforms.uTime }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying float vY; void main() { vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; varying float vY; void main() { float a = (1.0 - smoothstep(0.0, 22.0, vY)) * (0.45 + 0.1 * sin(uTime * 2.0)); gl_FragColor = vec4(vec3(0.95, 0.75, 0.35) * a, 1.0); }`,
  });
  logDepth(beaconMat);
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 22, 20, 1, true).translate(0, 11, 0), beaconMat);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xf2b33d, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  ring.position.y = Y;
  const dest = new THREE.Group(); dest.add(beacon, ring); dest.visible = false;
  group.add(dest);

  function update(path, along, t) {
    uniforms.uTime.value = t;
    if (!path) { ribbon.visible = false; dest.visible = false; return; }
    const total = pathLength(path), from = along + 0.6, to = Math.min(total, from + AHEAD);
    const len = Math.max(0.01, to - from);
    uniforms.uLen.value = to >= total ? len + 12 : len; // fade only at the far end when the route goes on
    let n = 0, prev = null;
    for (let s = from; n < N; s += STEP) {
      const p = pointAlong(path, Math.min(s, to));
      if (!p) break;
      // a smoothed heading avoids pinches at corners
      const q = pointAlong(path, Math.min(Math.min(s, to) + 1.2, total)) || p, r = pointAlong(path, Math.max(Math.min(s, to) - 1.2, 0)) || p;
      let tx = q.x - r.x, tz = q.z - r.z; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const nx = -tz * WIDTH / 2, nz = tx * WIDTH / 2;
      pos.set([p.x - nx, Y, p.z - nz, p.x + nx, Y, p.z + nz], n * 6);
      const d = Math.min(s, to) - from;
      uv.set([0, d, 1, d], n * 4);
      prev = p; n++;
      if (s >= to) break;
    }
    // collapse unused vertices onto the last one
    for (let k = n; k < N; k++) { pos.copyWithin(k * 6, (n - 1) * 6, n * 6); uv.copyWithin(k * 4, (n - 1) * 4, n * 4); }
    geo.attributes.position.needsUpdate = true; geo.attributes.uv.needsUpdate = true;
    geo.computeBoundingSphere();
    ribbon.visible = n > 1;
    const end = path[path.length - 1];
    dest.position.set(end.x, 0, end.z); dest.visible = true;
    const k = 1 + (reduced ? 0 : 0.08 * Math.sin(t * 3));
    ring.scale.set(k, 1, k);
    void prev;
  }
  function dispose() { geo.dispose(); mat.dispose(); beaconMat.dispose(); beacon.geometry.dispose(); ring.geometry.dispose(); ring.material.dispose(); }
  return { group, update, dispose };
}

// The click-to-walk marker: a white disc in a golden-yellow ring, above every ground layer.
export function walkMarker() {
  const g = new THREE.Group();
  const off = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 };
  // white and yellow (Elvis, 9 October): a white disc in a warm golden ring with a deeper gold edge
  g.add(new THREE.Mesh(new THREE.CircleGeometry(0.42, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.95, ...off })));
  g.add(new THREE.Mesh(new THREE.RingGeometry(0.5, 0.66, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffc23d, opacity: 1, ...off })));
  g.add(new THREE.Mesh(new THREE.RingGeometry(0.66, 0.7, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd9940f, opacity: 1, ...off })));
  g.children.forEach((m) => { m.position.y = Y; m.renderOrder = 3; });
  return g;
}
