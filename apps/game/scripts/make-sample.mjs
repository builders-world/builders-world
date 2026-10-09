// Offline stand-in for an OSM manifest: an irregular Yaba-ish street grid.
// Same format as src/osm.js produces. The app labels it "sample" when used.
import { writeFile, mkdir } from 'node:fs/promises';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rng(2026);
const ANG = (17 * Math.PI) / 180;
const rot = (u, v, a = ANG) => [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)];
const R = 230;

const roads = [];
let id = 1;
const road = (cls, w, name, pts) => roads.push({ id: id++, cls, w, name, pts: pts.map(([u, v]) => rot(u, v).map((x) => +x.toFixed(2))) });

// long axis streets (v = const), gently bent
const vLines = [-140, -70, 0, 70, 140];
vLines.forEach((v, i) => {
  const cls = v === 0 ? 'primary' : i % 2 ? 'residential' : 'tertiary';
  const w = v === 0 ? 14 : cls === 'tertiary' ? 10 : 8;
  const pts = [];
  for (let u = -300; u <= 300; u += 50) pts.push([u, v + Math.sin(u / 130 + i) * 4]);
  road(cls, w, v === 0 ? 'Main road (sample)' : null, pts);
});
// cross streets (u = const)
const uLines = [-216, -144, -72, 0, 72, 144, 216];
uLines.forEach((u, i) => {
  const cls = u === 0 ? 'secondary' : i % 2 ? 'residential' : 'tertiary';
  const w = cls === 'secondary' ? 12 : cls === 'tertiary' ? 10 : 8;
  const pts = [];
  for (let v = -240; v <= 240; v += 48) pts.push([u + Math.sin(v / 90 + i) * 3, v]);
  road(cls, w, null, pts);
});

const buildings = [];
const bid = () => 100000 + buildings.length;
function lot(u, v, w, d, a) {
  const hw = w / 2, hd = d / 2;
  let pts = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
  if (r() < 0.22) { // L-shaped lot
    const nw = hw * (0.2 + r() * 0.35), nd = hd * (0.2 + r() * 0.35);
    pts = [[-hw, -hd], [hw, -hd], [hw, hd - nd * 2], [hw - nw * 2, hd - nd * 2], [hw - nw * 2, hd], [-hw, hd]];
  }
  pts = pts.map(([x, y]) => {
    const c = Math.cos(a), s = Math.sin(a);
    return rot(u + x * c - y * s, v + x * s + y * c).map((q) => +q.toFixed(2));
  });
  const lv = r() < 0.42 ? 1 + Math.floor(r() * 4) : r() < 0.06 ? 5 + Math.floor(r() * 3) : null;
  buildings.push({ id: bid(), pts, h: null, levels: lv, name: null });
}

for (let ui = 0; ui < uLines.length - 1; ui++) {
  for (let vi = 0; vi < vLines.length - 1; vi++) {
    const u0 = uLines[ui] + 11, u1 = uLines[ui + 1] - 11;
    const v0 = vLines[vi] + 12, v1 = vLines[vi + 1] - 12;
    for (const [rowV, dir] of [[v0, 1], [v1, -1]]) {
      let u = u0;
      while (u < u1 - 9) {
        const w = Math.min(11 + r() * 12, u1 - u);
        const d = 13 + r() * 14;
        if (r() > 0.1) lot(u + w / 2, rowV + dir * (d / 2), w - 1.6, d - 1.4, (r() - 0.5) * 0.12);
        u += w + 0.8;
      }
    }
  }
}

const inR = (b) => {
  let x = 0, z = 0;
  for (const p of b.pts) { x += p[0]; z += p[1]; }
  return Math.hypot(x / b.pts.length, z / b.pts.length) < R * 1.15;
};
const manifest = {
  version: 1,
  source: 'sample',
  name: 'Yaba',
  center: { lat: 6.5095, lon: 3.3715 },
  radius: R,
  generated: 'synthetic',
  buildings: buildings.filter(inR),
  roads: roads.map((rd) => ({ ...rd, pts: rd.pts.filter((p) => Math.hypot(p[0], p[1]) <= R * 1.25) })).filter((rd) => rd.pts.length > 1),
};
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/data/sample.json', import.meta.url), JSON.stringify(manifest));
console.log(`sample: ${manifest.buildings.length} buildings, ${manifest.roads.length} roads`);
