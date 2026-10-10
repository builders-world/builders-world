import * as THREE from 'three';
import { dressSkyline } from './neon.js';
import { shared, logDepth } from '../shaders.js';
import { weather } from './surfaces.js';
import { mulberry32 } from '../mesh.js';

// ---------- the sky: real time of day, real cloud cover ----------
// uNight, uDay and uGold come from the sun's real elevation; uCloud and uStorm from live weather.
export function blueHourSky() {
  const geo = new THREE.SphereGeometry(900, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTime: shared.uTime, uReduced: shared.uReduced, uFlash: { value: 0 },
      uSunDir: { value: new THREE.Vector3(-0.6, 0.05, 0.8).normalize() },
      uNight: { value: 0 }, uDay: { value: 0 }, uGold: { value: 0.4 },
      uCloud: { value: 0.5 }, uStorm: { value: 0 }, uFog: { value: 0 }, uFogCol: { value: new THREE.Color('#24305a') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uReduced, uFlash, uNight, uDay, uGold, uCloud, uStorm, uFog;
      uniform vec3 uSunDir, uFogCol;
      varying vec3 vDir;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
      vec3 band(vec3 top, vec3 mid, vec3 hor, float y) {
        return mix(mix(hor, mid, smoothstep(0.0, 0.22, y)), top, smoothstep(0.2, 0.9, y));
      }
      void main() {
        float y = clamp(vDir.y, -0.2, 1.0);
        // blue hour is the base the street was designed around
        vec3 col = band(vec3(0.020, 0.040, 0.115), vec3(0.060, 0.110, 0.290), vec3(0.230, 0.270, 0.470), y);
        vec3 night = band(vec3(0.006, 0.010, 0.030), vec3(0.016, 0.026, 0.070), vec3(0.070, 0.070, 0.120), y);
        night += vec3(0.16, 0.10, 0.07) * (1.0 - smoothstep(0.0, 0.14, y)); // the city's own glow on the horizon
        vec3 day = band(vec3(0.200, 0.470, 0.820), vec3(0.430, 0.680, 0.900), vec3(0.780, 0.870, 0.900), y); // a bright Lagos blue (Elvis, 10 Oct 2026: more vibrant)
        col = mix(col, night, uNight);
        col = mix(col, day, uDay);
        // warm light toward the sun when it is low
        float toward = max(0.0, dot(normalize(vDir), uSunDir));
        col += vec3(1.0, 0.48, 0.22) * uGold * pow(toward, 3.0) * (1.0 - smoothstep(-0.05, 0.35, y)) * 0.9;
        // the sun itself, through any gaps in the cloud
        float disc = smoothstep(0.9993, 0.9997, toward) * uDay * (1.0 - uCloud * 0.9);
        col += vec3(6.0, 5.4, 4.6) * disc + vec3(0.9, 0.7, 0.45) * pow(toward, 60.0) * uDay * 0.35 * (1.0 - uCloud);
        // cloud deck: coverage from live cloud cover
        vec2 uv = vDir.xz / max(0.08, vDir.y + 0.12) * 0.9 + vec2(uTime * 0.004 * (1.0 - uReduced), 0.0);
        float c = smoothstep(mix(0.78, 0.22, uCloud), mix(0.98, 0.55, uCloud), fbm(uv * 1.3));
        float shade = fbm(uv * 2.7 + 4.0);
        vec3 cloudNight = mix(vec3(0.07, 0.08, 0.16), vec3(0.22, 0.17, 0.16), shade);
        vec3 cloudDay = mix(vec3(0.66, 0.70, 0.66), vec3(0.96, 0.95, 0.90), shade);
        vec3 cloudCol = mix(mix(cloudNight, vec3(0.30, 0.32, 0.48) * (0.6 + 0.6 * shade), 1.0 - uNight), cloudDay, uDay);
        cloudCol += vec3(1.0, 0.55, 0.3) * uGold * pow(toward, 2.0) * 0.6;
        cloudCol *= 1.0 - 0.55 * uStorm;
        col = mix(col, cloudCol, c * smoothstep(-0.02, 0.18, y) * 0.92);
        col = mix(col, col * 0.55 + vec3(0.04, 0.045, 0.06), uStorm * 0.6);
        // haze and fog swallow the horizon
        col = mix(col, uFogCol, uFog * (1.0 - smoothstep(0.0, 0.5, y)));
        col += vec3(0.55, 0.6, 0.85) * uFlash * (0.4 + c);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  logDepth(mat);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  mesh.userData.flash = mat.uniforms.uFlash;
  mesh.userData.u = mat.uniforms;
  return mesh;
}

// ---------- rain: streaks that live entirely in the vertex shader ----------
export function rain(count) {
  const quad = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index;
  g.setAttribute('position', quad.getAttribute('position'));
  g.setAttribute('uv', quad.getAttribute('uv'));
  const off = new Float32Array(count * 4);
  const r = mulberry32(42);
  for (let i = 0; i < count; i++) {
    off[i * 4] = r(); off[i * 4 + 1] = r(); off[i * 4 + 2] = r(); off[i * 4 + 3] = r();
  }
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
  g.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: shared.uTime, uReduced: shared.uReduced, uRain: weather.uRain, uCam: { value: new THREE.Vector3() }, uWindVec: { value: new THREE.Vector2(0.12, 0.05) } },
    vertexShader: /* glsl */ `
      attribute vec4 aOff;
      uniform float uTime, uReduced, uRain;
      uniform vec3 uCam;
      uniform vec2 uWindVec;
      varying float vA;
      varying vec2 vUv;
      void main() {
        const vec3 box = vec3(70.0, 34.0, 70.0);
        float speed = mix(17.0, 4.0, uReduced) * (0.85 + 0.3 * aOff.w);
        vec3 p = aOff.xyz * box;
        p.y = mod(p.y - uTime * speed, box.y);
        p.xz = mod(p.xz - uCam.xz + box.xz * 0.5, box.xz) + uCam.xz - box.xz * 0.5;
        p.y += uCam.y - box.y * 0.45;
        vec3 fall = normalize(vec3(uWindVec.x, -1.0, uWindVec.y));
        vec4 vp = viewMatrix * vec4(p, 1.0);
        vec3 vf = normalize((viewMatrix * vec4(fall, 0.0)).xyz);
        vec3 side = normalize(cross(vf, vec3(0.0, 0.0, 1.0)));
        float len = mix(0.9, 0.25, uReduced);
        vp.xyz += vf * position.y * len + side * position.x * 0.022;
        // rain is something you stand in; from the aerial view it fades away
        vA = (1.0 - smoothstep(18.0, 40.0, uCam.y)) * (aOff.w < uRain * mix(1.0, 0.35, uReduced) ? 1.0 : 0.0) * (1.0 - smoothstep(6.0, 55.0, -vp.z)) * smoothstep(0.4, 2.0, -vp.z);
        vUv = uv;
        gl_Position = projectionMatrix * vp;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      varying vec2 vUv;
      void main() {
        float a = vA * smoothstep(0.0, 0.4, vUv.y) * (1.0 - abs(vUv.x - 0.5) * 2.0);
        if (a < 0.01) discard;
        gl_FragColor = vec4(vec3(0.55, 0.62, 0.8) * a * 0.35, 1.0);
      }`,
  });
  logDepth(mat);
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.userData.cam = mat.uniforms.uCam;
  mesh.userData.wind = mat.uniforms.uWindVec;
  return mesh;
}

// ---------- light cones under lamps, visible because of the rain ----------
export function lampCones(lamps) {
  const g = new THREE.CylinderGeometry(0.25, 3.2, 1, 24, 1, true).translate(0, -0.5, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uArrival: shared.uArrival, uRain: weather.uRain, uLamps: shared.uLamps },
    vertexShader: /* glsl */ `
      attribute float aDelay;
      varying float vH; varying float vFacing; varying float vDelay; varying float vDist;
      void main() {
        vH = -position.y;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vec3 wn = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vec3 toCam = normalize(cameraPosition - wp.xyz);
        vFacing = abs(dot(wn, toCam));
        vDelay = aDelay;
        vec4 vp = viewMatrix * wp;
        vDist = -vp.z;
        gl_Position = projectionMatrix * vp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uArrival, uRain, uLamps;
      varying float vH; varying float vFacing; varying float vDelay; varying float vDist;
      void main() {
        float on = clamp((uArrival - vDelay) / 0.5, 0.0, 1.0);
        float a = pow(max(vFacing, 0.0), 2.2) * (1.0 - vH) * smoothstep(0.0, 0.15, vH) * (1.0 - smoothstep(20.0, 90.0, vDist));
        gl_FragColor = vec4(vec3(1.0, 0.62, 0.25) * a * (0.035 + 0.05 * uRain) * on * uLamps, 1.0);
      }`,
  });
  logDepth(mat);
  const mesh = new THREE.InstancedMesh(g, mat, Math.max(1, lamps.length));
  const m = new THREE.Matrix4();
  const delay = new Float32Array(Math.max(1, lamps.length));
  lamps.forEach((l, i) => {
    m.makeScale(1, l.y - 0.1, 1).setPosition(l.x, l.y - 0.1, l.z);
    mesh.setMatrixAt(i, m);
    delay[i] = l.delay ?? 0;
  });
  g.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delay, 1));
  mesh.count = lamps.length;
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  return mesh;
}

// ---------- a pool of real lights that follow the player between lamps ----------
export class LampLights {
  constructor(scene, count, reach = 26) {
    this.lights = [];
    this.reach = reach;
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(0xffa64a, 0, reach, 1.6);
      scene.add(l);
      this.lights.push(l);
    }
    this.lamps = [];
    this.timer = 0;
  }

  setLamps(lamps) { this.lamps = lamps; this.timer = 0; }

  update(dt, focus, arrival) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.25;
      const ranked = this.lamps
        .map((l) => ({ l, d: Math.hypot(l.x - focus.x, l.z - focus.z) - (l.boost || 0) }))
        .sort((a, b) => a.d - b.d);
      this.lights.forEach((light, i) => {
        const r = ranked[i];
        if (!r) { light.userData.base = 0; return; }
        light.position.set(r.l.x, r.l.y - 0.3, r.l.z);
        light.color.set(r.l.color || 0xffa64a);
        light.userData.base = (r.l.power || 70) * (1 - THREE.MathUtils.smoothstep(r.d + (r.l.boost || 0), this.reach * 1.2, this.reach * 2.6));
        light.userData.delay = r.l.delay ?? 0;
      });
    }
    this.lights.forEach((l) => {
      const on = THREE.MathUtils.clamp((arrival - (l.userData.delay || 0)) / 0.5, 0, 1);
      l.intensity = (l.userData.base || 0) * on * shared.uLamps.value;
    });
  }

  dispose() { this.lights.forEach((l) => l.removeFromParent()); }
}

// ---------- the skyline: far towers with cool lit windows, and the link bridge ----------
export function skyline(world) {
  const group = new THREE.Group();
  const R = world.radius;
  const r = mulberry32(77);
  // the skyline sits beyond the fog line, so it keeps its own colour instead of fading to white
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x1a2236, roughness: 0.9, fog: false });
  const towerList = [];
  const winTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 64, 256);
    for (let y = 4; y < 256; y += 8) for (let x = 4; x < 64; x += 8) {
      if (r() < 0.38) { g.fillStyle = r() < 0.7 ? '#cfe0ff' : '#ffe2b0'; g.fillRect(x, y, 4, 4); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    return t;
  })();
  // the lit-window shell sits 4% out and under the roof line, with a depth offset: at 600 m and beyond
  // a 1% shell and a shared roof plane shimmer against the tower
  const winMat = new THREE.MeshBasicMaterial({ map: winTex, color: new THREE.Color(1.4, 1.4, 1.5), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
  const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), towerMat, 60);
  const glow = new THREE.InstancedMesh(new THREE.BoxGeometry(1.04, 0.97, 1.04).translate(0, 0.485, 0), winMat, 60);
  const m = new THREE.Matrix4();
  // a skyline cluster in the direction you face at spawn, like the reference image
  const ahead = world.spawnYaw;
  // as many towers as the city really has: Lagos and Nairobi have a skyline, Uyo has one tall tower
  const dense = { Lagos: 1, Nairobi: 0.9, Abuja: 0.6, Accra: 0.55, 'Port Harcourt': 0.4, Uyo: 0.2 }[world.place?.city || 'Lagos'] ?? 0.5, count = Math.round(60 * dense);
  towers.count = count; glow.count = count;
  for (let i = 0; i < count; i++) {
    const a = ahead + (r() - 0.5) * 1.6;
    const d = R * (2.2 + r() * 1.1);
    const w = 14 + r() * 22, h = (40 + Math.pow(r(), 1.6) * 140) * (0.45 + 0.55 * dense);
    const ry = r() * 3, dd = w * (0.7 + r() * 0.6);
    m.compose(new THREE.Vector3(Math.sin(a) * d, 0, Math.cos(a) * d), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(w, h, dd));
    towerList.push({ x: Math.sin(a) * d, z: Math.cos(a) * d, w, d: dd, h, ry });
    towers.setMatrixAt(i, m); glow.setMatrixAt(i, m);
  }
  group.add(towers, glow);

  // Lekki-Ikoyi Link Bridge: one leaning pylon, fanned cables, a lit deck
  const bd = R * 2.0, ba = ahead + 0.35;
  const bx = Math.sin(ba) * bd, bz = Math.cos(ba) * bd;
  const bridge = new THREE.Group();
  bridge.position.set(bx, 0, bz);
  bridge.rotation.y = ba + Math.PI / 2;
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x2a3247, roughness: 0.7 });
  const lit = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.85, 2.4) });
  const span = 260;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(span, 1.6, 10), deckMat); deck.position.y = 14;
  const deckLine = new THREE.Mesh(new THREE.BoxGeometry(span, 0.35, 10.4), lit); deckLine.position.y = 13.1;
  bridge.add(deck, deckLine);
  const pylonH = 78;
  [-1, 1].forEach((s) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(2.2, pylonH, 2.2).translate(0, pylonH / 2, 0), lit);
    leg.position.set(0, 0, s * 4.5); leg.rotation.x = -s * 0.055;
    bridge.add(leg);
  });
  const pts = [];
  for (let k = 0; k < 11; k++) {
    const y = pylonH - 4 - k * 2.4;
    [-1, 1].forEach((side) => { pts.push(0, y, 0, side * (18 + k * 10.5), 14.8, 0); });
  }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  bridge.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: new THREE.Color(0.4, 0.6, 1.6) })));
  for (let x = -span / 2; x < span / 2; x += 12) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 14, 1.6).translate(0, 7, 0), deckMat); p.position.x = x;
    if (Math.abs(x) > 8) bridge.add(p);
  }
  if ((world.place?.city || 'Lagos') === 'Lagos') group.add(bridge); // the Lekki-Ikoyi Link belongs on the Lagos skyline only
  // neon and animated adverts (neon.js)
  const neon = dressSkyline(towerList, { center: world.center ? { x: 0, z: 0 } : { x: 0, z: 0 }, reduced: false });
  group.add(neon.group);
  const DAY = new THREE.Color(0xb9c4c2), DUSK = new THREE.Color(0x3a4258), NIGHT = new THREE.Color(0x141a2c);
  group.userData.update = (dt, day, night, mist = 0, fogCol = null) => {
    // towers read as a clay silhouette by day, a deep blue at dusk and night; in the morning mist they
    // fade into it (they ignore the scene's fog, being so far off, so the mist is applied here)
    towerMat.color.copy(NIGHT).lerp(DUSK, Math.min(1, day * 3)).lerp(DAY, Math.max(0, day * 1.4 - 0.4));
    // (emissive, so it holds even in the dim dawn light that leaves the lit colour dark)
    if (fogCol && mist > 0) { towerMat.emissive.copy(fogCol).multiplyScalar(Math.min(0.95, mist * 1.2)); towerMat.color.multiplyScalar(1 - Math.min(0.9, mist)); } else towerMat.emissive.setRGB(0, 0, 0);
    winMat.opacity = (0.25 + 0.75 * night) * (1 - Math.min(1, mist * 1.2));
    neon.group.visible = mist < 0.45;
    neon.update(dt, night);
  };
  group.userData.neon = neon;
  return group;
}
