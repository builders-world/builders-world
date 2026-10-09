import * as THREE from 'three';

// Logarithmic depth for hand-written shaders (world bible 7.2): the renderer uses a log depth buffer
// so layers a few centimetres apart stay resolved hundreds of metres away; built-in materials get the
// chunks automatically, these need them added or they would sort against the scene incorrectly.
export function logDepth(m) {
  const v = m.vertexShader, f = m.fragmentShader;
  const persp = v.includes('#include <common>') ? '' : 'bool isPerspectiveMatrix( mat4 m ) { return m[ 2 ][ 3 ] == - 1.0; }\n';
  const vm = v.search(/void\s+main\s*\(\s*\)/), vEnd = v.lastIndexOf('}');
  m.vertexShader = v.slice(0, vm) + '\n#include <logdepthbuf_pars_vertex>\n' + persp + v.slice(vm, vEnd) + '\n#include <logdepthbuf_vertex>\n' + v.slice(vEnd);
  const fm = f.search(/void\s+main\s*\(\s*\)\s*\{/), fOpen = f.indexOf('{', fm) + 1;
  m.fragmentShader = f.slice(0, fm) + '\n#include <logdepthbuf_pars_fragment>\n' + f.slice(fm, fOpen) + '\n  #include <logdepthbuf_fragment>\n' + f.slice(fOpen);
  return m;
}

// All time-based light behaviour lives in shaders driven by shared uniforms,
// never per-mesh JavaScript. Nothing here moves unless something changed.

export const shared = {
  uTime: { value: 0 },
  uArrival: { value: 0 },
  uReduced: { value: 0 },
  uDay: { value: 0 },
  uLamps: { value: 1 }, // street lamps on (1) or off (0); real time switches them at dusk and dawn
  uWind: { value: 1 }, // how hard leaves and fronds move
};

const AMBER = new THREE.Color('#ffb454');

export function makeWindowMaterial(pane = '#1c2744') {
  const m = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uAmber: { value: new THREE.Vector3(AMBER.r, AMBER.g, AMBER.b) },
        uPane: { value: new THREE.Color(pane) },
      },
    ]),
    vertexShader: /* glsl */ `
      attribute float aLit;
      attribute float aPulse;
      attribute float aSeed;
      attribute float aDelay;
      varying vec2 vUv;
      varying float vLit;
      varying float vPulse;
      varying float vSeed;
      varying float vDelay;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vLit = aLit;
        vPulse = aPulse;
        vSeed = aSeed;
        vDelay = aDelay;
        vec4 mvPosition = instanceMatrix * vec4(position, 1.0);
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uArrival;
      uniform float uReduced;
      uniform float uDay;
      uniform vec3 uAmber;
      uniform vec3 uPane;
      varying vec2 vUv;
      varying float vLit;
      varying float vPulse;
      varying float vSeed;
      varying float vDelay;
      #include <fog_pars_fragment>

      float easeOutBack(float x) {
        float c1 = 1.70158;
        float c3 = c1 + 1.0;
        float u = x - 1.0;
        return 1.0 + c3 * u * u * u + c1 * u * u;
      }

      void main() {
        // A push turns a window on in about 400ms with a touch of overshoot.
        float t = clamp((uArrival - vDelay) / 0.4, 0.0, 1.0);
        float on = mix(easeOutBack(t), t, uReduced);
        float lit = clamp(vLit * on, 0.0, 1.2);

        // Presence is a slow breath at about 2.5s. Never a strobe.
        float breath = 0.5 + 0.5 * sin(6.2831853 * uTime / 2.5 + vSeed * 6.2831853);
        float pulseAmt = vPulse * (1.0 - uReduced);
        float level = mix(1.0, 0.62 + 0.38 * breath, pulseAmt);

        vec3 pane = uPane * (0.75 + 0.5 * fract(vSeed * 13.7));
        vec3 lamp = uAmber * mix(0.85 + 0.45 * fract(vSeed * 7.13), 0.92, uDay) * level;

        float ix = step(0.07, min(vUv.x, 1.0 - vUv.x));
        float iy = step(0.07, min(vUv.y, 1.0 - vUv.y));
        float inner = ix * iy;
        vec3 col = mix(pane, lamp, lit);
        col *= mix(0.45, 1.0, inner);

        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }
    `,
  });
  logDepth(m);
  m.uniforms.uTime = shared.uTime;
  m.uniforms.uArrival = shared.uArrival;
  m.uniforms.uReduced = shared.uReduced;
  m.uniforms.uDay = shared.uDay;
  m.polygonOffset = true;
  m.polygonOffsetFactor = -2;
  m.polygonOffsetUnits = -2;
  return m;
}

// Soft pools of lamp light on the ground.
export function makeGlowMaterial() {
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uAmber: { value: new THREE.Vector3(AMBER.r, AMBER.g, AMBER.b) },
      uArrival: shared.uArrival,
      uDay: shared.uDay,
      uLamps: shared.uLamps,
    },
    vertexShader: /* glsl */ `
      attribute float aDelay;
      varying vec2 vUv;
      varying float vDelay;
      void main() {
        vUv = uv;
        vDelay = aDelay;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uAmber;
      uniform float uArrival;
      uniform float uDay;
      uniform float uLamps;
      varying vec2 vUv;
      varying float vDelay;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.4);
        float on = clamp((uArrival - vDelay) / 0.5, 0.0, 1.0);
        gl_FragColor = vec4(uAmber * a * 0.2 * on * (1.0 - uDay) * uLamps, 1.0);
      }
    `,
  });
  logDepth(m);
  return m;
}

// Monument beam: static geometry, the sweep is angle-vs-time in the shader.
export function makeBeamMaterial(radius) {
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uAmber: { value: new THREE.Vector3(AMBER.r, AMBER.g, AMBER.b) },
      uTime: shared.uTime,
      uReduced: shared.uReduced,
      uArrival: shared.uArrival,
      uDay: shared.uDay,
      uRadius: { value: radius },
      uPhase: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vLocal;
      void main() {
        vLocal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uAmber;
      uniform float uTime;
      uniform float uReduced;
      uniform float uArrival;
      uniform float uDay;
      uniform float uRadius;
      uniform float uPhase;
      varying vec3 vLocal;
      void main() {
        float ang = atan(vLocal.z, vLocal.x);
        float sweep = uTime * 0.32 * (1.0 - uReduced) + uPhase;
        float c = max(0.0, cos(ang - sweep));
        float beam = pow(c, 420.0);
        float r = length(vLocal.xz) / uRadius;
        float fall = pow(clamp(1.0 - r, 0.0, 1.0), 1.3);
        float on = clamp((uArrival - 1.0) / 0.6, 0.0, 1.0);
        float a = beam * fall * on * (1.0 - uDay);
        // reduced motion: a steady faint halo instead of a sweep
        a = mix(a, 0.05 * fall * on, uReduced);
        gl_FragColor = vec4(uAmber * a * 0.55, 1.0);
      }
    `,
  });
  logDepth(m);
  return m;
}
