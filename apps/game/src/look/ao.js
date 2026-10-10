import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// Contact shading for the high graphics tiers: the soft darkening where a wall meets the pavement, under
// eaves and awnings, between a person's feet and the ground. It reads the depth the scene pass already
// wrote, so the city is never drawn a second time; it works at half resolution and is blurred back up
// with depth-aware weights so edges stay clean. The shade is a cool clay grey rather than black, to
// keep the illustrated look (world bible 7.1).

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const AO_FRAG = /* glsl */ `
  #include <packing>
  uniform sampler2D tDepth;
  uniform mat4 uProj, uProjInv;
  uniform vec2 uTexel;
  uniform float uRadius;
  varying vec2 vUv;
  vec3 viewPos(vec2 uv) { float d = texture2D(tDepth, uv).x; vec4 p = uProjInv * vec4(vec3(uv, d) * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
  // interleaved gradient noise: even, with no rows or bands for the blur to leave behind
  float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
  void main() {
    // read depth at the centre of a full-resolution pixel: half way between two, the nearest pixel
    // flips from row to row and the ground comes out striped
    vec2 uv = (floor(vUv / uTexel) + 0.5) * uTexel;
    float d = texture2D(tDepth, uv).x;
    if (d >= 0.99999) { gl_FragColor = vec4(1.0); return; }
    vec3 P = viewPos(uv);
    // the normal from neighbouring depths, taking the nearer side so silhouettes do not smear
    vec3 l = viewPos(uv - vec2(uTexel.x, 0.0)), r = viewPos(uv + vec2(uTexel.x, 0.0));
    vec3 b = viewPos(uv - vec2(0.0, uTexel.y)), t = viewPos(uv + vec2(0.0, uTexel.y));
    vec3 dx = abs(r.z - P.z) < abs(P.z - l.z) ? r - P : P - l;
    vec3 dy = abs(t.z - P.z) < abs(P.z - b.z) ? t - P : P - b;
    vec3 N = normalize(cross(dx, dy));
    if (dot(N, P) > 0.0) N = -N;
    vec3 T = normalize(abs(N.y) < 0.99 ? cross(N, vec3(0.0, 1.0, 0.0)) : cross(N, vec3(1.0, 0.0, 0.0)));
    vec3 B = cross(N, T);
    float rnd = ign(floor(gl_FragCoord.xy)) * 6.2831853;
    // depth gets coarser with distance: lift the start point and the test with it, so flat ground never shades itself
    float dist = -P.z, bias = 0.03 + 0.006 * dist;
    P += N * (0.02 + 0.004 * dist);
    float occ = 0.0;
    for (int i = 0; i < SAMPLES; i++) {
      float fi = float(i) + 0.5, rr = sqrt(fi / float(SAMPLES)), a = fi * 2.3999632 + rnd;
      vec3 dir = T * (cos(a) * rr) + B * (sin(a) * rr) + N * sqrt(max(0.0, 1.0 - rr * rr));
      float s = mix(0.2, 1.0, fract(fi * 0.618034 + rnd * 0.1591549));
      vec3 S = P + dir * uRadius * s;
      vec4 c = uProj * vec4(S, 1.0);
      vec2 suv = c.xy / c.w * 0.5 + 0.5;
      if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
      float sz = viewPos(suv).z;
      float range = smoothstep(0.0, 1.0, uRadius / max(abs(P.z - sz), 1e-3));
      occ += step(S.z + bias, sz) * range;
    }
    float ao = 1.0 - occ / float(SAMPLES);
    // contact shade belongs close up; it fades out before the haze does
    ao = mix(1.0, ao, 1.0 - smoothstep(55.0, 150.0, -P.z));
    gl_FragColor = vec4(vec3(ao), 1.0);
  }`;

const BLEND_FRAG = /* glsl */ `
  #include <packing>
  uniform sampler2D tDiffuse, tAO, tDepth;
  uniform vec2 uAoTexel;
  uniform float uNear, uFar, uStrength;
  uniform vec3 uShade;
  varying vec2 vUv;
  float linZ(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); }
  void main() {
    vec4 col = texture2D(tDiffuse, vUv);
    float z0 = linZ(vUv), sum = 0.0, wsum = 0.0;
    for (int x = -1; x <= 2; x++) for (int y = -1; y <= 2; y++) {
      vec2 o = (vec2(float(x), float(y)) - 0.5) * uAoTexel;
      float w = 1.0 / (1.0 + abs(linZ(vUv + o) - z0) * 8.0 / max(z0 * 0.05, 0.05));
      sum += texture2D(tAO, vUv + o).r * w; wsum += w;
    }
    float ao = pow(clamp(sum / max(wsum, 1e-4), 0.0, 1.0), uStrength);
    col.rgb *= mix(uShade, vec3(1.0), ao);
    gl_FragColor = col;
  }`;

export class ContactShadePass extends Pass {
  constructor(camera, samples = 8) {
    super();
    this.camera = camera;
    this.needsSwap = true;
    this.target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.aoMat = new THREE.ShaderMaterial({
      defines: { SAMPLES: samples },
      uniforms: { tDepth: { value: null }, uProj: { value: new THREE.Matrix4() }, uProjInv: { value: new THREE.Matrix4() }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1.1 } },
      vertexShader: VERT, fragmentShader: AO_FRAG, depthTest: false, depthWrite: false,
    });
    this.blendMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, tAO: { value: null }, tDepth: { value: null }, uAoTexel: { value: new THREE.Vector2() }, uNear: { value: 0.3 }, uFar: { value: 4000 }, uStrength: { value: 2.0 }, uShade: { value: new THREE.Color(0.5, 0.5, 0.6) } },
      vertexShader: VERT, fragmentShader: BLEND_FRAG, depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad();
  }
  setSamples(n) { if (this.aoMat.defines.SAMPLES !== n) { this.aoMat.defines.SAMPLES = n; this.aoMat.needsUpdate = true; } }
  setSize(w, h) {
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    this.target.setSize(hw, hh);
    this.aoMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    this.blendMat.uniforms.uAoTexel.value.set(1 / hw, 1 / hh);
  }
  render(renderer, writeBuffer, readBuffer) {
    const depth = readBuffer.depthTexture;
    const out = this.renderToScreen ? null : writeBuffer;
    const u = this.aoMat.uniforms, v = this.blendMat.uniforms;
    if (depth) {
      u.tDepth.value = depth; u.uProj.value.copy(this.camera.projectionMatrix); u.uProjInv.value.copy(this.camera.projectionMatrixInverse);
      renderer.setRenderTarget(this.target); this.quad.material = this.aoMat; this.quad.render(renderer);
    }
    v.tDiffuse.value = readBuffer.texture; v.tAO.value = this.target.texture; v.tDepth.value = depth;
    v.uNear.value = this.camera.near; v.uFar.value = this.camera.far;
    // no depth to read (it is being attached): pass the picture through unshaded
    v.uStrength.value = depth ? this.strength ?? 2.0 : 0;
    renderer.setRenderTarget(out); this.quad.material = this.blendMat; this.quad.render(renderer);
  }
  dispose() { this.target.dispose(); this.aoMat.dispose(); this.blendMat.dispose(); this.quad.dispose(); }
}
