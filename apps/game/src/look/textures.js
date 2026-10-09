import * as THREE from 'three';
import { mulberry32 } from '../mesh.js';

// Every texture here is painted at load time on a canvas. Nothing is downloaded,
// so there is nothing to license and the first scene stays small.

const cache = new Map();
const once = (key, make) => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
};

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

// Tileable value noise, summed over octaves.
function fbmField(size, octaves, seed, base = 4) {
  const rng = mulberry32(seed);
  const out = new Float32Array(size * size);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = base << o;
    const grid = new Float32Array(cells * cells).map(() => rng());
    const step = size / cells;
    for (let y = 0; y < size; y++) {
      const gy = y / step, y0 = Math.floor(gy), fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      const y1 = (y0 + 1) % cells;
      for (let x = 0; x < size; x++) {
        const gx = x / step, x0 = Math.floor(gx), fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const x1 = (x0 + 1) % cells;
        const a = grid[(y0 % cells) * cells + (x0 % cells)], b = grid[(y0 % cells) * cells + x1];
        const c = grid[y1 * cells + (x0 % cells)], d = grid[y1 * cells + x1];
        out[y * size + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy);
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

// R: broad puddle field. G: fine grain. B: streaks. A: cells for ripples.
export function noiseTexture() {
  return once('noise', () => {
    const S = 256;
    const broad = fbmField(S, 4, 11, 3);
    const grain = fbmField(S, 3, 23, 32);
    const streak = fbmField(S, 3, 37, 6);
    const [c, g] = canvas(S);
    const img = g.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      img.data[i * 4] = broad[i] * 255;
      img.data[i * 4 + 1] = grain[i] * 255;
      img.data[i * 4 + 2] = streak[i] * 255;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 4;
    return t;
  });
}

function srgb(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A palm frond: a midrib with leaflets, on transparent ground.
export function frondTexture() {
  return once('frond', () => {
    const [c, g] = canvas(256, 64);
    const rng = mulberry32(5);
    g.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const x = 8 + i * 5.2;
      const len = 26 * Math.sin(Math.PI * Math.min(1, (i + 4) / 50));
      const shade = 40 + rng() * 40;
      g.strokeStyle = `rgb(${shade * 0.55},${shade + 50},${shade * 0.6})`;
      g.lineWidth = 3;
      [-1, 1].forEach((s) => {
        g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 9, 32 + s * len); g.stroke();
      });
    }
    g.strokeStyle = '#5a6a3a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 32); g.lineTo(256, 32); g.stroke();
    return srgb(c);
  });
}

// A broad banana or elephant-ear leaf.
export function leafTexture() {
  return once('leaf', () => {
    const [c, g] = canvas(128, 256);
    const grd = g.createLinearGradient(0, 0, 128, 0);
    grd.addColorStop(0, '#2f6b2c'); grd.addColorStop(0.5, '#4f8f3a'); grd.addColorStop(1, '#2a5f2a');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(64, 250);
    g.bezierCurveTo(-10, 180, 0, 40, 64, 6);
    g.bezierCurveTo(128, 40, 138, 180, 64, 250);
    g.fill();
    g.strokeStyle = 'rgba(200,220,150,0.6)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(64, 250); g.lineTo(64, 10); g.stroke();
    g.strokeStyle = 'rgba(20,50,20,0.35)'; g.lineWidth = 1.5;
    for (let y = 30; y < 240; y += 9) {
      g.beginPath(); g.moveTo(64, y); g.lineTo(10, y - 22); g.stroke();
      g.beginPath(); g.moveTo(64, y); g.lineTo(118, y - 22); g.stroke();
    }
    return srgb(c);
  });
}

function wrapText(g, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; }
    else line = test;
  }
  g.fillText(line, x, y);
}

// The cork board at the spawn point, covered in notes and photos.
export function boardTexture() {
  return once('board', () => {
    const [c, g] = canvas(1024, 640);
    const rng = mulberry32(8);
    g.fillStyle = '#9b7148';
    g.fillRect(0, 0, 1024, 640);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(${60 + rng() * 60},${40 + rng() * 40},${20 + rng() * 20},0.35)`;
      g.fillRect(rng() * 1024, rng() * 640, 2, 2);
    }
    g.fillStyle = '#f4ead2';
    g.font = 'bold 64px "Arial Black", Impact, sans-serif';
    g.textAlign = 'left';
    g.save(); g.translate(40, 96); g.rotate(-0.04); g.fillText('YABA BUILDERS', 0, 0); g.restore();
    g.font = 'bold 30px "Arial Narrow", Arial, sans-serif';
    g.fillStyle = '#f2b33d';
    g.fillText('IDEAS · PEOPLE · PLACES', 48, 140);

    const notes = [
      ['#f7e27a', 'Code & chops at the hub, Friday 7pm'],
      ['#f6a8a0', 'Who wants to fix the stairway lights?'],
      ['#a8e0d0', 'Looking for a designer for my open source CLI'],
      ['#f9f3e3', 'Bench for the corner by the mural? Vote here'],
      ['#c9d8f7', 'Shipped v2 of bytepipe. Thanks Yaba!'],
      ['#f7e27a', 'Garden lot needs planters. 3 done, 5 to go'],
      ['#f6a8a0', 'Pair on Rust this weekend?'],
      ['#a8e0d0', 'Fixed the waste bin by the danfo stop'],
    ];
    const spots = [[560, 40], [800, 60], [40, 200], [300, 190], [600, 230], [840, 260], [80, 420], [380, 430]];
    notes.forEach(([col, text], i) => {
      const [x, y] = spots[i];
      g.save();
      g.translate(x + 85, y + 85);
      g.rotate((rng() - 0.5) * 0.16);
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(-82, -78, 170, 170);
      g.fillStyle = col;
      g.fillRect(-85, -85, 170, 170);
      g.fillStyle = '#3a2f28';
      g.font = '22px "Comic Sans MS", "Marker Felt", sans-serif';
      wrapText(g, text, -72, -45, 145, 28);
      g.fillStyle = '#d23b2f';
      g.beginPath(); g.arc(0, -72, 7, 0, Math.PI * 2); g.fill();
      g.restore();
    });
    // two "photos" of the street
    [[640, 440], [860, 470]].forEach(([x, y], i) => {
      g.save(); g.translate(x, y); g.rotate(i ? 0.05 : -0.06);
      g.fillStyle = '#fafafa'; g.fillRect(0, 0, 150, 120);
      const sky = g.createLinearGradient(0, 8, 0, 100);
      sky.addColorStop(0, '#2b3f78'); sky.addColorStop(1, '#e09a5a');
      g.fillStyle = sky; g.fillRect(8, 8, 134, 90);
      g.fillStyle = '#1b2236';
      for (let k = 0; k < 6; k++) g.fillRect(14 + k * 21, 98 - 20 - rng() * 40, 16, 90);
      g.restore();
    });
    return srgb(c);
  });
}

// The mural: skyline, bridge and sun, with the line from the reference image.
export function muralTexture(city = 'Lagos') {
  return once('mural', () => {
    const [c, g] = canvas(1536, 384);
    const rng = mulberry32(3);
    const bg = g.createLinearGradient(0, 0, 1536, 0);
    bg.addColorStop(0, '#1f6f78'); bg.addColorStop(0.55, '#2b8a84'); bg.addColorStop(1, '#215d70');
    g.fillStyle = bg; g.fillRect(0, 0, 1536, 384);
    // painted blobs
    for (let i = 0; i < 14; i++) {
      g.fillStyle = ['#e8c14a', '#e46f4f', '#f2e6c8', '#173e52'][i % 4];
      g.globalAlpha = 0.55;
      g.beginPath();
      g.ellipse(rng() * 1536, rng() * 384, 60 + rng() * 120, 30 + rng() * 70, rng() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    // sun
    g.fillStyle = '#f2b33d';
    g.beginPath(); g.arc(1180, 150, 110, 0, Math.PI * 2); g.fill();
    // skyline
    g.fillStyle = '#123247';
    let x = 860;
    while (x < 1536) {
      const w = 30 + rng() * 50, h = 60 + rng() * 170;
      g.fillRect(x, 330 - h, w, h + 60);
      x += w + 4;
    }
    // the link bridge: one tall pylon with fanned cables
    g.strokeStyle = '#f2e6c8'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(1050, 330); g.lineTo(1090, 60); g.lineTo(1130, 330); g.stroke();
    g.lineWidth = 2;
    for (let k = 0; k < 9; k++) {
      g.beginPath(); g.moveTo(1090, 70 + k * 6); g.lineTo(900 + k * 18, 320); g.stroke();
      g.beginPath(); g.moveTo(1090, 70 + k * 6); g.lineTo(1280 - k * 18, 320); g.stroke();
    }
    g.fillStyle = '#f2e6c8'; g.fillRect(860, 318, 676, 10);
    // the words
    g.save();
    g.translate(70, 120);
    g.rotate(-0.07);
    g.font = '900 104px "Arial Black", Impact, sans-serif';
    g.lineWidth = 14; g.strokeStyle = '#173e52';
    g.fillStyle = '#f2e6c8';
    ['BUILD TOGETHER', `A BRIGHTER ${city.toUpperCase()}`].forEach((t, i) => {
      g.strokeText(t, 0, i * 118);
      g.fillText(t, 0, i * 118);
    });
    g.restore();
    // weathering
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(20,30,30,${rng() * 0.25})`;
      g.fillRect(rng() * 1536, rng() * 384, 1 + rng() * 3, 1 + rng() * 6);
    }
    return srgb(c);
  });
}

// Signpost face for a community build area.
export function buildSignTexture() {
  return once('buildsign', () => {
    const [c, g] = canvas(512, 256);
    g.fillStyle = '#0f2a33'; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#3ad1c0'; g.lineWidth = 10; g.strokeRect(10, 10, 492, 236);
    g.fillStyle = '#3ad1c0';
    // a small bench glyph
    g.fillRect(40, 120, 110, 16); g.fillRect(48, 136, 12, 40); g.fillRect(130, 136, 12, 40); g.fillRect(40, 90, 110, 12);
    g.fillStyle = '#f4ead2';
    g.font = 'bold 44px "Arial Narrow", Arial, sans-serif';
    g.fillText('COMMUNITY', 180, 100);
    g.fillText('BUILD AREA', 180, 150);
    g.font = '28px Arial, sans-serif';
    g.fillStyle = '#f2b33d';
    g.fillText('Add something for Yaba', 180, 200);
    return srgb(c);
  });
}

// Vertical sign for the hub, light text on dark.
export function hubSignTexture() {
  return once('hubsign', () => {
    const [c, g] = canvas(256, 512);
    g.fillStyle = '#16181d'; g.fillRect(0, 0, 256, 512);
    g.save(); g.translate(20, 150); g.rotate(-0.12);
    g.font = '900 54px "Arial Black", Impact, sans-serif';
    g.fillStyle = '#f7d27a';
    ['YABA', 'CREATIVE', 'HUB'].forEach((t, i) => g.fillText(t, 0, i * 70, 216));
    g.restore();
    return srgb(c);
  });
}
