import * as THREE from 'three';
import { wallMaterial } from '../look/surfaces.js';

// The open city's walls (chunkmesh.js): the districts' plaster, with the windows drawn in the shader rather than
// modelled, so thousands of real buildings cost a few triangles each. Each wall carries how far along it a point is
// (u), its length, the building's kind and a seed; floors come from the height. Kinds, in the clay look:
//   house  wood frame, pale blue glass, a white cross (the arrival scene's house), 3 m floors
//   block  dark frames in rows, a stone band at each floor, 3.2 m floors
//   shops  a glazed shopfront under a coloured fascia at street level, block windows above
//   tower  a glass curtain wall: mullions every 1.5 m, a spandrel at each floor, 3.6 m floors
//   works  a few high windows in a long wall
// At night some windows glow (uNight). Far away the windows melt into one even colour, so nothing shimmers.

export const facadeUniforms = { uNight: { value: 0 }, uHole: { value: new THREE.Vector3(0, 0, -1) } };

export function facadeMaterial() {
  const m = wallMaterial({ wetBottom: false });
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base(sh, r);
    Object.assign(sh.uniforms, facadeUniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aFac;\nvarying vec4 vFac;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFac = aFac;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uNight; uniform vec3 uHole; varying vec4 vFac;
        float fh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        vec3 facLight; float facGlass;`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (uHole.z > 0.0 && length(vWPos.xz - uHole.xy) < uHole.z) discard;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        facLight = vec3(0.0); facGlass = 0.0;
        {
          float kind = vFac.z, seed = vFac.w, u = vFac.x, len = vFac.y, y = vWPos.y;
          if (kind < 9.5 && len > 2.6) {
            float k = floor(kind + 0.5);
            float floorH = k == 0.0 ? 3.0 : k == 3.0 ? 3.6 : k == 4.0 ? 6.0 : 3.2;
            float fl = floor(y / floorH), fy = y - fl * floorH;
            // fade to an even tone where a window would be smaller than a few pixels (no moire, no shimmer)
            float px = max(fwidth(u), fwidth(y));
            float far = smoothstep(0.12, 0.45, px);
            vec3 wallC = diffuseColor.rgb, frame, glass, avg;
            float win = 0.0, frm = 0.0, cross = 0.0;
            if (k == 3.0) {
              // curtain wall: mullions and a spandrel band at each floor
              float mu = fract(u / 1.5), sp = smoothstep(0.0, 0.06, fy) * (1.0 - smoothstep(floorH - 0.9, floorH - 0.84, fy));
              win = step(0.06, mu) * step(mu, 0.94) * sp * step(1.0, y);
              glass = mix(vec3(0.36, 0.52, 0.6), vec3(0.62, 0.74, 0.8), smoothstep(0.0, 1.0, fy / floorH)) * (0.86 + 0.14 * fh(vec2(floor(u / 1.5), fl) + seed));
              frame = wallC; avg = mix(glass, wallC, 0.3);
            } else {
              float sp = k == 4.0 ? 6.0 : 3.0, inset = 0.6;
              float n = max(1.0, floor((len - 2.0 * inset) / sp)); sp = (len - 2.0 * inset) / n;
              float cu = (u - inset) / sp, cell = floor(cu), cx = fract(cu);
              float inRow = step(0.0, u - inset) * step(u, len - inset);
              float ww = k == 0.0 ? 0.55 : k == 4.0 ? 0.5 : 0.46, y0 = k == 4.0 ? 3.6 : 0.85, y1 = k == 4.0 ? 5.0 : (k == 0.0 ? 2.2 : 2.25);
              bool shopFloor = k == 2.0 && fl == 0.0;
              if (shopFloor) { ww = 0.86; y0 = 0.25; y1 = 2.6; }
              float hx = abs(cx - 0.5), inX = step(hx, ww * 0.5), inY = step(y0, fy) * step(fy, y1);
              float fw = k == 0.0 ? 0.07 : 0.05;
              win = inRow * inX * inY;
              frm = win * (1.0 - step(hx, ww * 0.5 - fw / sp * 2.0) * step(y0 + fw, fy) * step(fy, y1 - fw));
              if (k == 0.0) cross = win * (step(abs(cx - 0.5), 0.012) + step(abs(fy - (y0 + y1) * 0.5 - 0.1), 0.03));
              frame = k == 0.0 ? vec3(0.39, 0.19, 0.08) : vec3(0.1, 0.13, 0.16);
              glass = k == 0.0 ? vec3(0.22, 0.43, 0.52) : vec3(0.27, 0.42, 0.5);
              if (shopFloor) { glass = vec3(0.32, 0.46, 0.5); frame = vec3(0.12, 0.12, 0.12); }
              // shop fascia: a coloured band above the shopfront, its colour from the building
              if (k == 2.0 && fl == 0.0 && fy > 2.65 && fy < 3.15) {
                vec3 acc = fh(vec2(seed, 1.0)) < 0.25 ? vec3(0.03, 0.18, 0.12) : fh(vec2(seed, 2.0)) < 0.33 ? vec3(0.78, 0.17, 0.08) : fh(vec2(seed, 3.0)) < 0.5 ? vec3(0.08, 0.1, 0.22) : vec3(0.8, 0.5, 0.1);
                wallC = mix(wallC, acc, 1.0 - far * 0.5);
              }
              // a stone band at each floor line on blocks
              if (k == 1.0 || k == 2.0) wallC *= 1.0 - 0.07 * step(floorH - 0.16, fy) * step(1.0, fl + 0.5);
              avg = mix(wallC, glass, (k == 0.0 ? 0.2 : 0.22));
              glass *= 0.9 + 0.2 * fh(vec2(cell, fl) + seed);
            }
            vec3 col = wallC;
            col = mix(col, glass, win);
            col = mix(col, frame, frm);
            col = mix(col, vec3(0.97, 0.94, 0.87) * 0.9, clamp(cross, 0.0, 1.0));
            diffuseColor.rgb = mix(col, avg, far);
            facGlass = win * (1.0 - far);
            // lit windows at night: about a third, warm, each its own
            float lit = step(fh(vec2(floor(u / (k == 3.0 ? 1.5 : 3.0)), fl) + seed * 7.0), 0.36);
            facLight = vec3(1.0, 0.72, 0.38) * 1.6 * uNight * lit * mix(win * (1.0 - frm), 0.25, far) * step(0.5, fl + (k == 2.0 ? 1.0 : 0.5));
          }
        }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += facLight;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.25, facGlass);');
  };
  m.customProgramCacheKey = () => 'bw-city-facade';
  return m;
}
