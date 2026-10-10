import * as THREE from 'three';
import { noiseTexture } from './textures.js';
import { shared } from '../shaders.js';

// Shared weather state. The ground, walls and rain all read the same numbers,
// so a storm makes everything wetter together.
export const weather = {
  uWet: { value: 1 },
  uRain: { value: 1 },
  uReflect: { value: null },
  uReflectMatrix: { value: new THREE.Matrix4() },
  uHasReflect: { value: 0 },
};

// ---------- planar reflection of everything above y = 0 ----------
export class PlanarReflection {
  constructor(scale = 0.5) {
    this.scale = scale;
    this.target = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType });
    this.virtual = new THREE.PerspectiveCamera();
    this.hidden = [];
    this._n = new THREE.Vector3(0, 1, 0);
    this._plane = new THREE.Plane();
    this._clip = new THREE.Vector4();
    this._q = new THREE.Vector4();
    this._cam = new THREE.Vector3();
    this._rot = new THREE.Matrix4();
    this._look = new THREE.Vector3();
    this._view = new THREE.Vector3();
    this._tgt = new THREE.Vector3();
    weather.uReflect.value = this.target.texture;
  }

  setSize(w, h) { this.target.setSize(Math.max(16, Math.floor(w * this.scale)), Math.max(16, Math.floor(h * this.scale))); }

  render(renderer, scene, camera) {
    const n = this._n, v = this.virtual;
    this._cam.setFromMatrixPosition(camera.matrixWorld);
    if (this._cam.y <= 0.05) { weather.uHasReflect.value = 0; return; }
    this._rot.extractRotation(camera.matrixWorld);
    this._view.copy(this._cam); this._view.y = -this._view.y;
    this._look.set(0, 0, -1).applyMatrix4(this._rot).add(this._cam);
    this._tgt.copy(this._look); this._tgt.y = -this._tgt.y;
    v.position.copy(this._view);
    v.up.set(0, 1, 0).applyMatrix4(this._rot).reflect(n);
    v.lookAt(this._tgt);
    v.far = camera.far; v.near = camera.near;
    v.updateMatrixWorld();
    v.projectionMatrix.copy(camera.projectionMatrix);

    weather.uReflectMatrix.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(v.projectionMatrix).multiply(v.matrixWorldInverse);

    // oblique near plane so nothing under the ground leaks into the mirror
    this._plane.setFromNormalAndCoplanarPoint(n, new THREE.Vector3(0, 0, 0)).applyMatrix4(v.matrixWorldInverse);
    const p = this._plane, pm = v.projectionMatrix, q = this._q, c = this._clip;
    c.set(p.normal.x, p.normal.y, p.normal.z, p.constant);
    q.x = (Math.sign(c.x) + pm.elements[8]) / pm.elements[0];
    q.y = (Math.sign(c.y) + pm.elements[9]) / pm.elements[5];
    q.z = -1.0;
    q.w = (1.0 + pm.elements[10]) / pm.elements[14];
    c.multiplyScalar(2.0 / c.dot(q));
    pm.elements[2] = c.x; pm.elements[6] = c.y; pm.elements[10] = c.z + 1.0 - 0.003; pm.elements[14] = c.w;

    const prev = renderer.getRenderTarget();
    this.hidden.forEach((o) => { o.userData._vis = o.visible; o.visible = false; });
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, v);
    renderer.setRenderTarget(prev);
    this.hidden.forEach((o) => { o.visible = o.userData._vis; });
    weather.uHasReflect.value = 1;
  }

  dispose() { this.target.dispose(); }
}

// Adds a world-position varying to a built-in material.
function withWorldPos(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
    .replace('#include <project_vertex>', '#include <project_vertex>\n  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;');
}


// Grass and earth (Elvis, 10 October 2026: "parchments are green, not fully detailed"): wherever the base
// colour reads as lawn or open ground (green over blue, not redder than green), the ground gets broad
// light and dark patches, a finer mottling, a blade-scale grain, a few worn earth spots and a touch of
// yellowing in the sun. Roads, kerbs and pavements are untouched: their colours fail the test.
const GRASS = `
  {
    vec3 gc = diffuseColor.rgb;
    float gmask = smoothstep(-0.02, 0.02, gc.g - gc.r) * smoothstep(0.08, 0.15, gc.g - gc.b);
    if (gmask > 0.001) {
      // (the noise sits near its middle, so stretch it to use the whole range)
      float big = smoothstep(0.32, 0.68, texture2D(tNoise, vWPos.xz * 0.012).r), mid = smoothstep(0.3, 0.7, texture2D(tNoise, vWPos.xz * 0.07).g), blade = smoothstep(0.25, 0.75, texture2D(tNoise, vWPos.xz * 1.6).b);
      // lush deeper-green patches, drier yellow ones, worn earth, all broken up by a blade-scale grain
      vec3 g = gc * (0.78 + 0.36 * big) * (0.9 + 0.2 * mid) * (0.84 + 0.3 * blade);
      g = mix(g, g * vec3(0.78, 0.92, 0.7), smoothstep(0.6, 0.85, big) * 0.7);
      g = mix(g, g * vec3(1.12, 1.06, 0.8), smoothstep(0.55, 0.85, mid) * 0.55);
      g = mix(g, vec3(0.58, 0.49, 0.35) * (0.8 + 0.35 * blade), smoothstep(0.32, 0.14, big) * 0.6);
      diffuseColor.rgb = mix(gc, g, gmask);
    }
  }`;

// ---------- the wet street ----------
// Vertex colour keeps the road, kerb and path layout. Puddles come from a broad
// noise field; they are darker, smoother and reflect the mirror target.
export function wetGroundMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      tNoise: { value: noiseTexture() },
      uTime: shared.uTime, uReduced: shared.uReduced,
      uWet: weather.uWet, uRain: weather.uRain,
      tReflect: weather.uReflect, uReflectMatrix: weather.uReflectMatrix, uHasReflect: weather.uHasReflect,
    });
    withWorldPos(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D tNoise; uniform sampler2D tReflect; uniform mat4 uReflectMatrix;
        uniform float uTime, uReduced, uWet, uRain, uHasReflect;
        float wetPuddle;
        float wetGrain;
        vec2 ripple(vec2 p) {
          // a few expanding rings per metre cell, offset in time
          vec2 acc = vec2(0.0);
          for (int k = 0; k < 2; k++) {
            vec2 q = p * (1.6 + float(k) * 0.9) + float(k) * 3.7;
            vec2 cell = floor(q);
            vec2 f = fract(q) - 0.5;
            float h = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
            vec2 c = vec2(fract(h * 17.0), fract(h * 31.0)) - 0.5;
            vec2 d = f - c * 0.6;
            float r = length(d);
            float t = fract(uTime * 0.9 + h);
            float ring = sin((r - t * 0.45) * 60.0) * (1.0 - smoothstep(0.0, 0.08, abs(r - t * 0.45))) * (1.0 - t);
            acc += normalize(d + 1e-4) * ring;
          }
          return acc;
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec4 nz = texture2D(tNoise, vWPos.xz * 0.018);
        wetGrain = texture2D(tNoise, vWPos.xz * 0.45).g;
        wetPuddle = smoothstep(0.5, 0.58, nz.r + (wetGrain - 0.5) * 0.08) * uWet;
        ${GRASS}
        diffuseColor.rgb *= 0.93 + 0.14 * wetGrain;
        diffuseColor.rgb *= mix(1.0, 0.62, uWet) * mix(1.0, 0.55, wetPuddle);`)
      .replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = mix(0.86, mix(0.36 + 0.2 * wetGrain, 0.12, wetPuddle), uWet);`)
      .replace('#include <opaque_fragment>', `
        {
          vec2 rip = ripple(vWPos.xz) * uRain * (1.0 - uReduced) * (0.25 + 0.75 * wetPuddle);
          vec4 rp = uReflectMatrix * vec4(vWPos, 1.0);
          vec2 ruv = rp.xy / rp.w + rip * 0.012 + (wetGrain - 0.5) * 0.03 * (1.0 - wetPuddle);
          vec3 refl = texture2D(tReflect, ruv).rgb;
          float spread = 0.004 + 0.01 * (1.0 - wetPuddle);
          refl += texture2D(tReflect, ruv + vec2(0.0, spread)).rgb;
          refl += texture2D(tReflect, ruv + vec2(0.0, spread * 2.5)).rgb;
          refl /= 3.0;
          vec3 V = normalize(vViewPosition);
          float fres = 0.05 + 0.95 * pow(1.0 - clamp(dot(V, normal), 0.0, 1.0), 5.0);
          float amount = uWet * uHasReflect * mix(0.12, 0.85, wetPuddle) * mix(0.35, 1.0, fres);
          outgoingLight += refl * amount;
          // keep highlights inside half-float range so bloom never sees infinity
          outgoingLight = min(outgoingLight, vec3(24.0));
        }
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'bw-wet-ground';
  return m;
}

// ---------- walls: plaster, stains and rain streaks ----------
export function wallMaterial({ wetBottom = true } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { tNoise: { value: noiseTexture() }, uWet: weather.uWet });
    withWorldPos(shader);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWNrm;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vWNrm = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D tNoise; uniform float uWet; varying vec3 vWNrm; float wallWet;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 an = abs(vWNrm);
        if (an.y > 0.9) ${GRASS}
        vec2 uvw = an.y > 0.6 ? vWPos.xz : (an.x > an.z ? vWPos.zy : vWPos.xy);
        float mott = texture2D(tNoise, uvw * 0.11).r;
        float fine = texture2D(tNoise, uvw * 0.9).g;
        float streak = texture2D(tNoise, vec2(uvw.x * 0.35, vWPos.y * 0.015)).b;
        // clay: a whisper of mottling, not grime
        diffuseColor.rgb *= 0.93 + 0.1 * mott;
        diffuseColor.rgb *= 0.97 + 0.06 * fine;
        float grime = ${wetBottom ? '(1.0 - smoothstep(0.0, 2.4, vWPos.y))' : '0.0'};
        diffuseColor.rgb *= 1.0 - 0.1 * grime - 0.04 * smoothstep(0.55, 0.8, streak) * (1.0 - an.y);
        wallWet = uWet * (0.35 * grime + 0.25 * an.y);`)
      .replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = mix(0.86, 0.38, wallWet);`);
  };
  m.customProgramCacheKey = () => `bw-wall2-${wetBottom}`;
  return m;
}
