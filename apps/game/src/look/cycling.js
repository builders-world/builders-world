import * as THREE from 'three';

// Who rides where on the highways (Elvis, 10 October 2026: "demarcations for cycling, areas where people can
// cycle, areas where bikes are not allowed to go through"). world.js paints a green cycle lane at the kerb
// of every main road wide enough for one. Here: the signs (a blue cycle lane sign where each lane starts and
// ends; a red no cycling sign along the pavements beside them and at the foot of every footbridge), and the
// rule itself: world.noCycling(x, z, y) is true on those pavements and on the footbridges, where a bike is
// walked (mobility.js), and world.inCycleLane(x, z) is true in the green lane.

function canvas(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
  draw(g, w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// a bicycle in profile, centred at (x, y), about s wide
export function drawBike(g, x, y, s, color) {
  const k = s / 100; g.save(); g.translate(x - 50 * k, y - 32 * k); g.scale(k, k);
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
  [[22, 44], [78, 44]].forEach(([cx, cy]) => { g.beginPath(); g.arc(cx, cy, 18, 0, Math.PI * 2); g.stroke(); });
  g.beginPath(); g.moveTo(22, 44); g.lineTo(44, 44); g.lineTo(66, 18); g.lineTo(36, 18); g.lineTo(22, 44); g.stroke(); // frame
  g.beginPath(); g.moveTo(44, 44); g.lineTo(34, 10); g.stroke(); g.beginPath(); g.moveTo(26, 8); g.lineTo(42, 8); g.stroke(); // seat
  g.beginPath(); g.moveTo(78, 44); g.lineTo(66, 8); g.lineTo(74, 4); g.stroke(); // fork and bars
  g.restore();
}
const TEX = {};
const laneTex = () => TEX.lane || (TEX.lane = canvas(256, 320, (g, w) => {
  g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, 320);
  g.fillStyle = '#1f5fa8'; g.beginPath(); g.arc(128, 120, 104, 0, Math.PI * 2); g.fill();
  drawBike(g, 128, 124, 150, '#ffffff');
  g.fillStyle = '#1d2028'; g.font = '700 34px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('CYCLE LANE', 128, 290);
}));
const noTex = () => TEX.no || (TEX.no = canvas(256, 320, (g, w) => {
  g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, 320);
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 120, 104, 0, Math.PI * 2); g.fill();
  drawBike(g, 128, 124, 140, '#1d2028');
  g.strokeStyle = '#c8281e'; g.lineWidth = 22; g.beginPath(); g.arc(128, 120, 93, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(128 - 66, 120 - 66); g.lineTo(128 + 66, 120 + 66); g.stroke();
  g.fillStyle = '#1d2028'; g.font = '700 30px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('NO CYCLING', 128, 290);
}));

export function buildCycling({ world, scene }) {
  const lanes = world.cycleLanes || [];
  const group = new THREE.Group(); group.name = 'cycling'; scene.add(group);
  // ---- the rule: pavement and lane strips beside each lane, as segments in road coordinates ----
  const segs = [];
  lanes.forEach((L) => {
    const { pts, nrm, half, paveL, paveR } = L.road.fit, pave = L.sg > 0 ? paveL : paveR;
    for (let k = 1; k < L.idx.length; k++) {
      const i0 = L.idx[k - 1], i1 = L.idx[k];
      segs.push({ ax: pts[i0][0], az: pts[i0][1], bx: pts[i1][0], bz: pts[i1][1], nx: nrm[i0][0], nz: nrm[i0][1], sg: L.sg, half: Math.min(half[i0], half[i1]), pave: Math.min(pave[i0], pave[i1]) });
    }
  });
  // signed distance out from the road's centre line on the lane's side, if (x, z) is alongside a segment
  const across = (S, x, z) => {
    const dx = S.bx - S.ax, dz = S.bz - S.az, L2 = dx * dx + dz * dz || 1, u = ((x - S.ax) * dx + (z - S.az) * dz) / L2;
    if (u < -0.02 || u > 1.02) return null;
    return ((x - S.ax) * S.nx + (z - S.az) * S.nz) * S.sg;
  };
  const bridges = world.bridges || [];
  const onBridge = (x, z, y) => y > 0.4 && bridges.some((b) => b.ends.some((e) => { const ex = e.foot.x - b.x, ez = e.foot.z - b.z, L2 = ex * ex + ez * ez || 1, u = Math.max(0, Math.min(1, ((x - b.x) * ex + (z - b.z) * ez) / L2)); return Math.hypot(x - b.x - ex * u, z - b.z - ez * u) < 1.6; }));
  world.noCycling = (x, z, y = 0) => onBridge(x, z, y) || segs.some((S) => { const d = across(S, x, z); return d !== null && S.pave > 0.5 && d > S.half + 0.05 && d < S.half + S.pave + 0.3; });
  world.inCycleLane = (x, z) => segs.some((S) => { const d = across(S, x, z); return d !== null && d > S.half - 2.05 && d < S.half - 0.4; });

  // ---- the signs ----
  const pole = new THREE.MeshStandardMaterial({ color: 0x8d9196, roughness: 0.5, metalness: 0.6 });
  const M = { lane: new THREE.MeshBasicMaterial({ map: laneTex() }), no: new THREE.MeshBasicMaterial({ map: noTex() }) };
  const placed = [];
  const free = (x, z) => !world.onCarriageway?.(x, z, 0.3) && !world.inAnyBuilding?.(x, z, 0.4) && !world.inPlot?.(x, z, 0.3)
    && !(world.kitColliders || []).some((k) => Math.hypot(k.cx - x, k.cz - z) < Math.max(k.hx, k.hz) + 0.6) && !placed.some((p) => Math.hypot(p.x - x, p.z - z) < 4);
  const sign = (x, z, ry, mat) => {
    if (!free(x, z)) return false;
    placed.push({ x, z });
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.5, 8).translate(0, 1.25, 0), pole); p.position.set(x, 0, z); group.add(p);
    // two faces back to back, so it reads from both ways along the road
    [0, Math.PI].forEach((r) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.7), mat); f.position.set(x, 2.15, z); f.rotation.y = ry + r; f.translateZ(0.025); group.add(f); });
    world.addColliders?.([{ name: 'sign_post', cx: x, cz: z, hx: 0.08, hz: 0.08, ry: 0 }]);
    return true;
  };
  let laneSigns = 0, noSigns = 0;
  lanes.forEach((L) => {
    const { pts, nrm, half } = L.road.fit, at = (i, off) => [pts[i][0] + nrm[i][0] * (half[i] + off) * L.sg, pts[i][1] + nrm[i][1] * (half[i] + off) * L.sg];
    const ry = (i) => { const j = Math.min(i + 1, pts.length - 1), h = Math.max(0, j - 1); return Math.atan2(pts[j][0] - pts[h][0], pts[j][1] - pts[h][1]); };
    // a cycle lane sign at each end, just in from the kerb
    [L.idx[0], L.idx[L.idx.length - 1]].forEach((i) => { const [x, z] = at(i, 0.45); if (sign(x, z, ry(i), M.lane)) laneSigns++; });
    // no cycling on the pavement beside it, every 80 m or so
    const steps = Math.floor(L.len / 80);
    for (let k = 1; k <= steps; k++) { const i = L.idx[Math.round((k / (steps + 1)) * (L.idx.length - 1))]; for (const off of [0.45, 0.9]) { const [x, z] = at(i, off); if (sign(x, z, ry(i), M.no)) { noSigns++; break; } } }
  });
  // and at the foot of every footbridge's stairs
  bridges.forEach((b) => b.ends.forEach((e) => {
    const ux = Math.sin(e.up), uz = Math.cos(e.up);
    for (const side of [1.3, -1.3, 1.8, -1.8]) { const x = e.foot.x + uz * side, z = e.foot.z - ux * side; if (sign(x, z, e.up, M.no)) { noSigns++; break; } }
  }));
  return { group, laneSigns, noSigns, lanes: lanes.length, km: lanes.reduce((a, L) => a + L.len, 0) / 1000 };
}
