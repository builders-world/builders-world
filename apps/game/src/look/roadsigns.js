import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LANDMARKS } from './civic.js';
import { trackDetail } from './quality.js';

// Road signs for drivers (world bible 9.3, after the FRSC Highway Code): green direction boards on the
// approaches to the big junctions (an arrow, where it goes, how far), speed limits on the main roads,
// and the zones where cars must slow right down: a school zone round each school (20 km/h) and a
// pedestrian zone round the markets (15 km/h). The zones are real: traffic.js keeps cars to them.
// Signs stand on the driver's side (the right), on the pavement, facing the traffic they are for.

const KMH = 1 / 3.6;
const MAJOR = ['trunk', 'primary', 'secondary', 'tertiary'];
const LIMIT = { trunk: 60, primary: 50, secondary: 50, tertiary: 40 };
const ZONES = { queens: 'school', yabatech: 'school', unilag: 'school', tejuosho: 'market', ecentre: 'market' };

function canvas(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
  draw(g); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const FONTS = '"Baloo 2", ui-rounded, system-ui, sans-serif';

// a direction board: rows of [arrow, label, distance]
function boardTexture(rows) {
  const W = 1024, RH = 150, H = rows.length * RH + 40;
  return { tex: canvas(W, H, (g) => {
    g.fillStyle = '#1f6b45'; g.beginPath(); g.roundRect(0, 0, W, H, 28); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 10; g.beginPath(); g.roundRect(14, 14, W - 28, H - 28, 20); g.stroke();
    rows.forEach(([dir, label, dist], k) => {
      const y = 20 + k * RH + RH / 2;
      // the arrow: up, left or right
      g.save(); g.translate(90, y); g.rotate(dir === 'left' ? -Math.PI / 2 : dir === 'right' ? Math.PI / 2 : 0);
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -48); g.lineTo(38, -6); g.lineTo(14, -6); g.lineTo(14, 46); g.lineTo(-14, 46); g.lineTo(-14, -6); g.lineTo(-38, -6); g.closePath(); g.fill(); g.restore();
      g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left';
      // a long name gets smaller letters before it is ever cut short
      let size = 70; g.font = `800 ${size}px ${FONTS}`;
      while (g.measureText(label).width > W - 420 && size > 46) { size -= 4; g.font = `800 ${size}px ${FONTS}`; }
      let text = label; while (g.measureText(text).width > W - 420 && text.length > 4) text = `${text.slice(0, -2)}…`;
      g.fillText(text, 170, y + 4);
      g.font = `700 60px ${FONTS}`; g.textAlign = 'right'; g.fillText(dist, W - 50, y + 4);
      if (k < rows.length - 1) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(40, 20 + (k + 1) * RH - 2, W - 80, 4); }
    });
  }), aspect: H / W };
}
const limitTexture = (n) => canvas(256, 256, (g) => {
  g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
  g.strokeStyle = '#d0262a'; g.lineWidth = 30; g.beginPath(); g.arc(128, 128, 106, 0, 7); g.stroke();
  g.fillStyle = '#111'; g.font = `800 ${n >= 100 ? 92 : 112}px ${FONTS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 128, 136);
});
// the school sign: a red-bordered triangle with two children walking, over a plate
const schoolTexture = () => canvas(256, 360, (g) => {
  g.fillStyle = '#fff'; g.strokeStyle = '#d0262a'; g.lineWidth = 22; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(128, 18); g.lineTo(242, 214); g.lineTo(14, 214); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#111';
  const kid = (x, s) => { g.beginPath(); g.arc(x, 96 * s + 20, 13 * s, 0, 7); g.fill(); g.fillRect(x - 10 * s, 112 * s + 20, 20 * s, 44 * s); g.save(); g.lineWidth = 9 * s; g.strokeStyle = '#111'; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 4 * s, 154 * s + 20); g.lineTo(x - 16 * s, 186 * s + 20); g.moveTo(x + 4 * s, 154 * s + 20); g.lineTo(x + 14 * s, 186 * s + 20); g.stroke(); g.restore(); };
  kid(104, 1); kid(150, 0.85);
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(14, 238, 228, 110, 14); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#111'; g.textAlign = 'center'; g.font = `800 40px ${FONTS}`; g.fillText('SCHOOL', 128, 282); g.font = `700 32px ${FONTS}`; g.fillText('SLOW · 20', 128, 324);
});
// the pedestrian zone: a blue square with a walking figure, over a plate
const pedTexture = () => canvas(256, 360, (g) => {
  g.fillStyle = '#1f5aa6'; g.beginPath(); g.roundRect(14, 14, 228, 210, 18); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(134, 60, 16, 0, 7); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(130, 84); g.lineTo(122, 146); g.lineTo(98, 196); g.moveTo(122, 146); g.lineTo(150, 196); g.moveTo(128, 100); g.lineTo(100, 132); g.moveTo(128, 100); g.lineTo(158, 124); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(14, 238, 228, 110, 14); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#111'; g.textAlign = 'center'; g.font = `800 32px ${FONTS}`; g.fillText('PEDESTRIANS', 128, 282); g.font = `700 32px ${FONTS}`; g.fillText('SLOW · 15', 128, 324);
});

export function buildRoadSigns({ world, scene, traffic, landmarks }) {
  const group = new THREE.Group(); group.name = 'roadsigns'; scene.add(group);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x55605a, roughness: 0.55, metalness: 0.3 });
  const posts = [], cols = [], placed = [];
  let currentKind = 'board';
  const nodes = traffic?.nodes || [];
  const c = world.center || { lat: 6.5095, lon: 3.3715 };
  const toXZ = (lat, lon) => [(lon - c.lon) * 111320 * Math.cos((c.lat * Math.PI) / 180), -(lat - c.lat) * 110574];
  const free = (x, z) => !world.onCarriageway?.(x, z, 0.35) && !world.inPlot?.(x, z, 0.3) && !world.inAnyBuilding?.(x, z, 0.4) && !world.solidAt?.(x, 1, z)
    && !world.kitColliders.some((k) => Math.hypot(k.cx - x, k.cz - z) < Math.max(k.hx, k.hz) + 0.7) && !placed.some((p) => Math.hypot(p.x - x, p.z - z) < 3.5);
  // the kerbside spot on the driver's right, `back` metres before the point (x, z) heading (hx, hz)
  // (`half`: a board's half width, which stands across the pavement: its road end must stay off the road too)
  const kerbside = (x, z, hx, hz, lane, half = 0) => {
    const rx = -hz, rz = hx; // right of the heading (traffic.js: the driver's right)
    for (let off = lane + 1.4; off < lane * 3 + 9; off += 0.4) {
      const px = x + rx * off, pz = z + rz * off;
      if (world.onCarriageway?.(px - rx * half, pz - rz * half, 0.45)) continue;
      return free(px, pz) && (!half || (free(px + rx * half, pz + rz * half) && !world.inPlot?.(px + rx * half, pz + rz * half, 0.2))) ? { x: px, z: pz } : null;
    }
    return null;
  };
  // a panel on posts, facing the traffic heading (hx, hz), whose drivers read it as they come
  const panel = (at, hx, hz, mat, w, h, y0, twoPosts) => {
    const g = new THREE.Group(); g.position.set(at.x, 0, at.z); g.rotation.y = Math.atan2(-hx, -hz);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); face.position.set(0, y0 + h / 2, 0.04); g.add(face);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), postMat); back.position.set(0, y0 + h / 2, 0.02); back.rotation.y = Math.PI; g.add(back);
    (twoPosts ? [-w / 2 + 0.2, w / 2 - 0.2] : [0]).forEach((px) => { const p = new THREE.BoxGeometry(0.09, y0 + h, 0.09).translate(px, (y0 + h) / 2, 0); p.applyMatrix4(new THREE.Matrix4().makeRotationY(g.rotation.y)).translate(at.x, 0, at.z); posts.push(p); });
    group.add(trackDetail(g, 1.1));
    cols.push({ name: 'road_sign', cx: at.x, cz: at.z, hx: twoPosts ? w / 2 : 0.1, hz: 0.1, ry: g.rotation.y });
    placed.push({ ...at, hx, hz, kind: currentKind });
    return g;
  };

  // ---------- 1. direction boards on the approaches to the big junctions ----------
  const dirOf = (a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1; return [dx / L, dz / L]; };
  // follow a road out of node n along edge e for up to `len` metres; returns the point and the heading toward n
  const walkBack = (n, e, len) => {
    let cur = n, nxt = e.to, acc = 0, road = e.road;
    for (let k = 0; k < 40; k++) {
      const a = nodes[cur], b = nodes[nxt], L = Math.hypot(b.x - a.x, b.z - a.z);
      if (acc + L >= len) { const u = (len - acc) / (L || 1); const x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u; const [hx, hz] = dirOf(b, a); return { x, z, hx, hz }; }
      acc += L; const on = nodes[nxt].out.find((o) => o.road === road && o.to !== cur); if (!on) return null; cur = nxt; nxt = on.to;
    }
    return null;
  };
  const junctions = nodes.map((n, i) => ({ n, i })).filter(({ n }) => n.out.length >= 3 && n.out.some((e) => e.major) && Math.hypot(n.x, n.z) < world.radius * 0.85)
    .sort((a, b) => Math.hypot(a.n.x - world.spawn.x, a.n.z - world.spawn.z) - Math.hypot(b.n.x - world.spawn.x, b.n.z - world.spawn.z));
  let boards = 0;
  for (const { n, i: ni } of junctions) {
    if (boards >= 12) break;
    for (const ein of n.out) {
      if (boards >= 12) break;
      const at = walkBack(ni, ein, 22) || walkBack(ni, ein, 14); if (!at) continue;
      const [hx, hz] = [at.hx, at.hz], rx = -hz, rz = hx;
      // every other way out of the junction: which way it turns, and where it goes
      const rows = [];
      n.out.forEach((ex) => {
        if (ex === ein || ex.road === ein.road && Math.abs(dirOf(n, nodes[ex.to])[0] * hx + dirOf(n, nodes[ex.to])[1] * hz) < 0.5) return;
        const [vx, vz] = dirOf(n, nodes[ex.to]);
        if (vx * -hx + vz * -hz > 0.8) return; // back the way you came
        const turn = vx * hx + vz * hz > 0.7 ? 'up' : vx * rx + vz * rz > 0 ? 'right' : 'left';
        // the real place that lies that way, if one does
        let best = null, bestA = 0.55;
        LANDMARKS.forEach((l) => { const [lx, lz] = toXZ(l.lat, l.lon), d = Math.hypot(lx - n.x, lz - n.z); if (d < 150) return; const a = Math.acos(Math.max(-1, Math.min(1, ((lx - n.x) * vx + (lz - n.z) * vz) / d))); if (a < bestA) { bestA = a; best = { l, d }; } });
        const label = best ? (best.l.short || best.l.name) : ex.road?.name; if (!label) return;
        const dist = best ? (best.d >= 1000 ? `${(best.d / 1000).toFixed(1)} km` : `${Math.round(best.d / 100) * 100} m`) : '';
        if (!rows.some((r) => r[1] === label)) rows.push([turn, label, dist]);
      });
      if (!rows.length) continue;
      rows.sort((a, b) => ['left', 'up', 'right'].indexOf(a[0]) - ['left', 'up', 'right'].indexOf(b[0]));
      // the full board where the pavement takes it, a smaller one where it is narrow
      let w = 2.6, spot = kerbside(at.x, at.z, hx, hz, ein.lane, w / 2);
      if (!spot) { w = 1.8; spot = kerbside(at.x, at.z, hx, hz, ein.lane, w / 2); }
      if (!spot) continue;
      const { tex, aspect } = boardTexture(rows.slice(0, 3));
      panel(spot, hx, hz, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }), w, w * aspect, 2.1, true);
      boards++;
    }
  }

  // ---------- 2. speed limits on the main roads, just past each junction ----------
  currentKind = 'limit';
  const limitMats = {};
  let limits = 0;
  for (const { i: ni } of junctions) {
    for (const eout of nodes[ni].out.filter((e) => e.major && LIMIT[e.road?.cls])) {
      if (limits >= 16) break;
      const at = walkBack(ni, eout, 14); if (!at) continue;
      // traffic leaving the junction heads away from n: the reverse of walkBack's heading
      const hx = -at.hx, hz = -at.hz, spot = kerbside(at.x, at.z, hx, hz, eout.lane); if (!spot) continue;
      const v = LIMIT[eout.road.cls];
      limitMats[v] ||= new THREE.MeshStandardMaterial({ map: limitTexture(v), roughness: 0.5, transparent: true, alphaTest: 0.5 });
      panel(spot, hx, hz, limitMats[v], 0.62, 0.62, 2.0, false);
      limits++;
    }
  }

  // ---------- 3. school and pedestrian zones, signed where each road comes in ----------
  currentKind = 'zone';
  const zones = [];
  (landmarks?.placed || []).forEach((L) => { const kind = ZONES[L.key]; if (!kind || L.far || L.x === undefined) return; zones.push({ kind, x: L.x, z: L.z, r: kind === 'school' ? 70 : 60, limit: (kind === 'school' ? 20 : 15) * KMH, name: L.name }); });
  world.slowZones = zones;
  const zoneMat = { school: new THREE.MeshStandardMaterial({ map: schoolTexture(), roughness: 0.5, transparent: true, alphaTest: 0.5 }), market: new THREE.MeshStandardMaterial({ map: pedTexture(), roughness: 0.5, transparent: true, alphaTest: 0.5 }) };
  let zoneSigns = 0;
  zones.forEach((Z) => {
    // every road edge that crosses into the zone: a sign just outside, for the traffic coming in
    const done = [];
    nodes.forEach((a) => a.out.forEach((e) => {
      const b = nodes[e.to], da = Math.hypot(a.x - Z.x, a.z - Z.z), db = Math.hypot(b.x - Z.x, b.z - Z.z);
      if (!(da >= Z.r && db < Z.r) || done.some((d) => Math.hypot(d.x - a.x, d.z - a.z) < 25)) return;
      const [hx, hz] = dirOf(a, b), spot = kerbside(a.x, a.z, hx, hz, e.lane); if (!spot) return;
      done.push(a); panel(spot, hx, hz, zoneMat[Z.kind], 0.7, 0.98, 1.4, false); zoneSigns++;
    }));
  });

  if (posts.length) { const m = new THREE.Mesh(mergeGeometries(posts), postMat); m.castShadow = true; group.add(m); }
  world.addColliders?.(cols);
  world.roadSigns = { zones, placed, counts: { boards, limits, zoneSigns } }; // for the layout audit and tests
  return world.roadSigns;
}
