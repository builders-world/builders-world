// Graphics quality (Elvis, 10 October 2026): players pick how good the world looks against how fast it
// runs, or leave it on Auto and let the game read the machine. Higher tiers draw more pixels, real sun
// shadows, contact shading in corners and under eaves, sharper textures at a slant, more lamps and more
// of the street at a distance. Lower tiers keep the same flat, bright look and hold the frame rate.

export const ORDER = ['low', 'medium', 'high', 'ultra'];
export const LABEL = { auto: 'Auto', low: 'Low', medium: 'Medium', high: 'High', ultra: 'Ultra' };

// pr: pixel ratio cap; msaa: edge smoothing samples; shadows: sun shadow map size (0 = none) and how far
// round you they reach; ao: contact shading samples (0 = none); aniso: texture sharpness at a slant;
// lights: lamps that light the street at night; people/detail: metres before characters and small
// things are left out; govMin: the lowest the resolution may drop to hold 60 frames a second.
export const TIERS = {
  low: { pr: 1, msaa: 0, bloom: false, shadows: 0, shadowR: 0, ao: 0, aniso: 1, lights: 3, reflect: 0, rain: 2500, people: 32, detail: 80, govMin: 0.5, env: 0 },
  medium: { pr: 1.25, msaa: 2, bloom: true, shadows: 0, shadowR: 0, ao: 0, aniso: 4, lights: 8, reflect: 0.35, rain: 5000, people: 45, detail: 120, govMin: 0.6, env: 0 },
  high: { pr: 1.5, msaa: 4, bloom: true, shadows: 2048, shadowR: 45, soft: false, shadowHz: 30, ao: 8, aniso: 8, lights: 14, reflect: 0.5, rain: 9000, people: 60, detail: 170, govMin: 0.65, env: 0 },
  // Ultra holds at least 30 frames a second rather than chasing 60: the resolution stays full until the
  // frame rate drops under 30 (fps30); edges are smoothed 2x, which at Retina density looks the same as 4x
  ultra: { pr: 2, msaa: 2, bloom: true, shadows: 3072, shadowR: 70, soft: true, ao: 10, aniso: 16, lights: 22, reflect: 0.75, rain: 12000, people: 95, detail: 300, govMin: 0.55, env: 0.35, fps30: true, shadowHz: 30 },
};

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

// what the browser will say about the machine. Chrome and Edge report memory (rounded, at most 8 GB);
// Safari and Firefox do not, so the graphics chip and the core count carry more weight there
export function deviceInfo(gl) {
  let raw = '';
  try {
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    raw = String((ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER)) || '');
  } catch { /* some browsers hide it */ }
  // "ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)" -> "Apple M1 Pro"
  let gpu = raw;
  const m = raw.match(/Renderer:\s*([^,)]+)/) || raw.match(/^ANGLE \([^,]+,\s*([^,]+?)(?:\s*\(0x[0-9a-f]+\))?\s*(?:Direct3D[^,]*)?,/i);
  if (m) gpu = m[1];
  gpu = gpu.replace(/\s*\(0x[0-9a-f]+\)/i, '').replace(/\s*Direct3D.*$/i, '').replace(/\s*OpenGL.*$/i, '').replace(/\(TM\)|\(R\)/g, '').trim();
  const mem = navigator.deviceMemory || 0;
  const cores = navigator.hardwareConcurrency || 0;
  const mobile = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900;
  let kind = 'unknown';
  if (/swiftshader|llvmpipe|software|basic render/i.test(raw)) kind = 'software';
  else if (/RTX|GTX|Quadro|Radeon RX|Radeon Pro|\bArc\b A\d/i.test(gpu)) kind = 'discrete';
  else if (/Apple M\d/i.test(gpu)) kind = 'apple';
  else if (/Intel|UHD|Iris|Radeon\s*Graphics|Vega|Mali|Adreno|PowerVR|Apple GPU/i.test(gpu)) kind = 'integrated';
  return { gpu, mem, cores, mobile, kind };
}

// the tier Auto picks. It errs low: a smooth world beats a pretty slideshow, and anyone can turn it up
export function autoTier(info) {
  const { gpu, mem, cores, mobile, kind } = info;
  if (kind === 'software') return 'low';
  if (mobile) return mem >= 6 && cores >= 8 ? 'medium' : 'low';
  if (mem && mem <= 2) return 'low';
  if (mem && mem <= 4) return kind === 'discrete' || kind === 'apple' ? 'medium' : 'low';
  if (kind === 'integrated') return cores >= 8 ? 'medium' : 'low';
  if (kind === 'apple') return /Max|Ultra/i.test(gpu) ? 'ultra' : 'high';
  if (kind === 'discrete') return /RTX\s*(30[7-9]0|40\d0|50\d0)|RX\s*(6[89]\d0|7[89]\d0|9\d{3})/i.test(gpu) ? 'ultra' : 'high';
  return cores && cores < 4 ? 'medium' : 'high';
}

// ?quality=low|medium|high|ultra overrides for tests; otherwise the saved choice, otherwise Auto
export function graphicsChoice(q) {
  const asked = q?.get?.('quality');
  if (ORDER.includes(asked)) return asked;
  const saved = store.get('bw-graphics');
  return ORDER.includes(saved) ? saved : 'auto';
}
export function saveChoice(c) { store.set('bw-graphics', c); }

// ---------- distance detail ----------
// Small things far off cost a draw call each and show as a few pixels: parked and moving cars, estate
// signs, stalls. Each registers here with a size factor; past the tier's distance it is left out.
// Only things whose visibility no other system sets are registered, so nothing fights over it.
export const DETAIL = new Set();
export function trackDetail(obj, scale = 1) { obj.userData.lodScale = scale; DETAIL.add(obj); return obj; }
export function cullDetail(camera, dist) {
  const cx = camera.position.x, cz = camera.position.z;
  for (const o of DETAIL) {
    if (!o.parent) { DETAIL.delete(o); continue; }
    const e = o.matrixWorld.elements, dx = e[12] - cx, dz = e[14] - cz, d = dist * o.userData.lodScale;
    const far = dx * dx + dz * dz > d * d;
    if (far === !!o.userData.lodFar) continue;
    o.userData.lodFar = far; o.visible = !far;
  }
}
