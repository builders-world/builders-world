// The airport on the map (Elvis, 11 October 2026: "the actual airport is not visible on the map. So please make the
// airport visible on the map. You should be able to see planes from the map. You should be able to see the large
// airport ... create a new zone on the map where you have the airport"). Inside the airport the map is the airport:
// the terminal with each step of the way marked (screening, check-in, passport control and security in this airport's
// order, duty free, the gates; immigration, baggage reclaim and customs on the arrivals side), the apron with a plane at
// every stand, the taxiway, the runway, the tower and the hangars; and live, the plane taxiing, the one taking off or
// landing, the tug and the travellers, and you. The same drawing serves the full map and the corner minimap.
// Coordinates are the airport room's own (airport.js): metres, the landside front at z = 34, the airside glass at -46.

const C = { grass: '#93b86a', grass2: '#86ad5e', concrete: '#cfcabd', road: '#5a5d63', paint: '#f6f1df', yellow: '#f2c418', hall: '#f7efdc', hall2: '#efe4c9', ink: '#3b2a20', zone: 'rgba(42,157,148,.18)', zoneInk: '#2a9d94', step: '#e46f4f', glass: '#9fc4d6', me: '#e46f4f' };

/** The airport's plan, from its room (airport.js mapData). */
export const planOf = (room) => room?.mapData || null;

// a plane seen from above: fuselage, swept wings, tail, nose toward its heading
function plane(g, x, z, yaw, s, { air = 0, colour = '#ffffff' } = {}) {
  g.save(); g.translate(x, z); g.rotate(-yaw); // yaw is a three.js turn about y; +z on the map is down
  const L = 32 * s, span = 26 * s;
  if (air > 0.5) { g.save(); g.translate(Math.min(30, air * 0.25) * s, Math.min(30, air * 0.25) * s); g.fillStyle = 'rgba(30,40,30,.25)'; shape(g, L, span); g.fill(); g.restore(); }
  g.fillStyle = colour; g.strokeStyle = C.ink; g.lineWidth = Math.max(0.6, 1.6 * s); shape(g, L, span); g.fill(); g.stroke();
  g.restore();
}
function shape(g, L, span) {
  const w = L * 0.06;
  g.beginPath();
  g.moveTo(0, L * 0.5); // the nose (+z)
  g.quadraticCurveTo(w, L * 0.42, w, L * 0.3);
  g.lineTo(w, L * 0.12); g.lineTo(span / 2, -L * 0.04); g.lineTo(span / 2, -L * 0.1); g.lineTo(w, -L * 0.02); // right wing
  g.lineTo(w * 0.7, -L * 0.36); g.lineTo(span * 0.2, -L * 0.46); g.lineTo(span * 0.2, -L * 0.5); g.lineTo(0, -L * 0.47); // right tailplane
  g.lineTo(-span * 0.2, -L * 0.5); g.lineTo(-span * 0.2, -L * 0.46); g.lineTo(-w * 0.7, -L * 0.36); // left tailplane
  g.lineTo(-w, -L * 0.02); g.lineTo(-span / 2, -L * 0.1); g.lineTo(-span / 2, -L * 0.04); g.lineTo(-w, L * 0.12); // left wing
  g.lineTo(-w, L * 0.3); g.quadraticCurveTo(-w, L * 0.42, 0, L * 0.5);
  g.closePath();
}

/**
 * Paint the airport under the current transform (1 unit = 1 m of the room's own coordinates).
 * `px` is how many screen pixels a metre is (for line widths and text); `labels` writes the names (the full map).
 */
export function paintAirport(g, P, live, { px = 1, labels = true, me = null, upright = 0 } = {}) {
  const Z0 = P.Z0, FRONT = P.FRONT, lw = (n) => n / px; // a line n screen pixels wide
  // the ground: grass, the apron, the taxiway, the runway
  g.fillStyle = C.grass; g.fillRect(-2200, -900, 4400, 1200);
  g.fillStyle = C.grass2; for (let x = -2200; x < 2200; x += 120) g.fillRect(x, Z0 - 900, 60, 860); // mown stripes
  g.fillStyle = C.concrete; g.fillRect(-800, Z0 - 140, 1600, 140);
  g.fillStyle = C.road; g.fillRect(-800, Z0 - 172, 1600, 24); g.fillRect(-1600, Z0 - 323, 3200, 46);
  g.fillStyle = C.yellow; for (let x = -790; x < 790; x += 8) g.fillRect(x, Z0 - 160.15, 4, 0.3); // the taxiway's centre line
  g.fillStyle = C.paint; for (let x = -1580; x < 1580; x += 40) g.fillRect(x, Z0 - 300.45, 24, 0.9); // the runway's
  for (const s of [-1, 1]) g.fillRect(-1600, Z0 - 300 + s * 21.5 - 0.45, 3200, 0.9);
  for (let k = 0; k < 8; k++) for (const e of [-1, 1]) g.fillRect(e * 1540 - 18, Z0 - 317 + k * 4.8 - 0.9, 36, 1.8); // the thresholds
  // links from the apron to the taxiway and the runway
  g.fillStyle = C.road; [-500, -150, 200, 550].forEach((x) => g.fillRect(x - 10, Z0 - 300, 20, 140));
  // landside: the kerb and the road, the car park
  g.fillStyle = C.concrete; g.fillRect(-98, FRONT, 196, 7);
  g.fillStyle = C.road; g.fillRect(-268, 41, 536, 9);
  g.fillStyle = '#bdb6a6'; g.fillRect(-65, 67, 110, 30); g.strokeStyle = C.ink; g.lineWidth = lw(1.5); g.strokeRect(-65, 67, 110, 30);
  // the tower and the hangars
  g.fillStyle = '#d9d2c3'; g.beginPath(); g.arc(170, Z0 - 120, 8, 0, 7); g.fill(); g.stroke();
  for (let k = 0; k < 3; k++) { g.fillStyle = '#e8e4da'; g.fillRect(-290 - k * 70, Z0 - 145, 60, 50); g.strokeRect(-290 - k * 70, Z0 - 145, 60, 50); }
  // the terminal: departures (the tall hall, west), the core, arrivals (east)
  g.fillStyle = C.hall; g.fillRect(-68, Z0, 66, FRONT - Z0); g.fillStyle = C.hall2; g.fillRect(2, Z0, 66, FRONT - Z0);
  g.fillStyle = '#d9d2c3'; g.fillRect(-2, Z0, 4, FRONT - Z0);
  g.strokeStyle = C.ink; g.lineWidth = lw(2.5); g.strokeRect(-68, Z0, 136, FRONT - Z0);
  g.strokeStyle = C.glass; g.lineWidth = lw(3); g.beginPath(); g.moveTo(-68, FRONT); g.lineTo(68, FRONT); g.moveTo(-68, Z0); g.lineTo(68, Z0); g.stroke();
  // inside: check-in islands, the checkpoints across the hall, the gates, the belts
  g.fillStyle = C.zone; g.strokeStyle = C.zoneInk; g.lineWidth = lw(1.2);
  (P.islands || []).forEach((is) => { g.fillRect(is.x - 1.2, 10, 2.4, 14); g.strokeRect(is.x - 1.2, 10, 2.4, 14); });
  g.fillRect(-40, 28, 12, 5); g.strokeRect(-40, 28, 12, 5); // entrance screening
  (P.bands || []).forEach((b) => { g.strokeStyle = C.step; g.lineWidth = lw(2.2); g.beginPath(); g.moveTo(-68, b.z); g.lineTo(-2, b.z); g.stroke(); });
  (P.gates || []).forEach((gt) => { g.fillStyle = C.zone; g.fillRect(gt.x - 6, -44, 12, 8); g.strokeStyle = C.zoneInk; g.strokeRect(gt.x - 6, -44, 12, 8); });
  (P.belts || []).forEach((bx) => { g.strokeStyle = C.ink; g.lineWidth = lw(1.5); g.beginPath(); g.ellipse(bx, 0, 3.1, 7.5, 0, 0, 7); g.stroke(); });
  // jet bridges and the planes at the stands
  (P.stands || []).forEach((sx) => { g.strokeStyle = '#8f949b'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(sx, Z0); g.lineTo(sx - 2.7 + 2.2, Z0 - 8); g.stroke(); });
  (live?.parked || []).forEach((q) => plane(g, q.x, q.z, q.yaw, 1));
  // what moves: ground traffic, then the travellers, then the planes in the air on top
  if (live?.tug) { g.fillStyle = C.yellow; g.fillRect(live.tug.x - 6, live.tug.z - 1, 12, 2); }
  if (live?.people) { g.fillStyle = 'rgba(59,42,32,.75)'; live.people.forEach(([x, z]) => { g.beginPath(); g.arc(x, z, Math.max(0.45, lw(2)), 0, 7); g.fill(); }); }
  (live?.moving || []).forEach((q) => plane(g, q.x, q.z, q.yaw, 1, { air: q.y, colour: q.y > 0.5 ? '#fff6dc' : '#ffffff' }));
  // you
  if (me) {
    g.save(); g.translate(me.x, me.z); g.rotate(-me.yaw);
    const s = Math.max(1.6, lw(14)); g.fillStyle = C.me; g.strokeStyle = '#fff'; g.lineWidth = lw(2);
    g.beginPath(); g.moveTo(0, s * 1.3); g.lineTo(s * 0.8, -s * 0.8); g.lineTo(0, -s * 0.35); g.lineTo(-s * 0.8, -s * 0.8); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  if (!labels) return;
  // the names, upright, at a size that reads at this zoom
  const label = (t, x, z, { size = 12, col = C.ink, bg = 'rgba(247,239,220,.88)', min = 0 } = {}) => {
    if (px < min) return;
    g.save(); g.translate(x, z); g.rotate(upright); g.scale(1 / px, 1 / px);
    g.font = `800 ${size}px "Baloo 2", ui-rounded, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(t).width + 12; g.fillStyle = bg; g.beginPath(); g.roundRect(-w / 2, -size * 0.8, w, size * 1.6, 7); g.fill(); g.fillStyle = col; g.fillText(t, 0, 1); g.restore();
  };
  label(P.name || 'Airport', 0, FRONT + 26, { size: 16 });
  label('Departures', -34, FRONT - 3, { size: 12, min: 1.2 }); label('Arrivals', 35, FRONT - 3, { size: 12, min: 1.2 });
  label('Screening', -34, 30.5, { size: 10, min: 2.5 });
  (P.islands || []).forEach((is) => label(`Check-in ${is.L}`, is.x, 17, { size: 10, min: 2.5 }));
  (P.bands || []).forEach((b) => label(b.step === 'passport' ? 'Passport control' : 'Security', -34, b.z - 2.2, { size: 10, col: C.step, min: 2 }));
  label('Duty free', -34, P.dfz ?? -20, { size: 10, min: 2.5 });
  (P.gates || []).forEach((gt) => label(`Gate ${gt.n}`, gt.x, -40, { size: 11, col: C.zoneInk, min: 1.4 }));
  label('Immigration', 28, P.zi ?? -27, { size: 10, min: 2.5 }); label('Baggage reclaim', 34, 0, { size: 10, min: 2.5 }); label('Customs', 23, 10, { size: 10, min: 2.5 }); label('Way out', 35, 37, { size: 10, min: 2.5 });
  label('Apron', 120, Z0 - 70, { size: 12, min: 0.6 }); label('Taxiway', 330, Z0 - 160, { size: 11, min: 0.5 }); label('Runway', 0, Z0 - 300, { size: 13, col: '#fff', bg: 'rgba(59,42,32,.7)', min: 0.15 });
  label('Tower', 170, Z0 - 106, { size: 10, min: 0.8 }); label('Hangars', -360, Z0 - 120, { size: 10, min: 0.5 }); label('Car park', -10, 82, { size: 10, min: 1.2 }); label(`${P.code || ''} terminal`, 0, Z0 + 12, { size: 13, min: 0.15, col: C.zoneInk });
}

// the two views of the full map: the terminal and its apron, and the whole airfield
export const AIRPORT_VIEWS = { hall: [-82, -62, 82, 54], terminal: [-160, -240, 240, 110], airfield: [-1650, -420, 1650, 120] };
/** Fit a view into a w x h canvas; returns the transform's scale (px per metre) and offsets. */
export function fitView(view, w, h) {
  const [x0, z0, x1, z1] = AIRPORT_VIEWS[view], s = Math.min(w / (x1 - x0), h / (z1 - z0));
  return { s, ox: (w - (x1 - x0) * s) / 2 - x0 * s, oy: (h - (z1 - z0) * s) / 2 - z0 * s };
}

/** The stops in the terminal, in the order you meet them, for the map's side list. */
export function airportStops(P) {
  const out = [{ name: 'Entrance screening', x: -34, z: 30.5 }];
  (P.islands || []).forEach((is) => out.push({ name: `Check-in ${is.L}`, x: is.x, z: 17 }));
  (P.bands || []).forEach((b) => out.push({ name: b.step === 'passport' ? 'Passport control' : 'Security', x: -34, z: b.z }));
  out.push({ name: 'Duty free', x: -34, z: P.dfz ?? -20 });
  (P.gates || []).forEach((gt) => out.push({ name: `Gate ${gt.n}`, x: gt.x, z: -40 }));
  out.push({ name: 'Immigration (arrivals)', x: 28, z: P.zi ?? -27 }, { name: 'Baggage reclaim', x: 34, z: 0 }, { name: 'Customs', x: 23, z: 10 }, { name: 'Way out to the taxis', x: 35, z: 37 });
  return out;
}
