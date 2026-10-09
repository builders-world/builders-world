// Collision helpers (world bible 7.5): circles for people, turned boxes for things on the ground.
// Everything is 2D on the ground plane; heights only decide what a jump can clear.

// Push a circle out of a turned box { cx, cz, hx, hz, ry }. Returns true when it moved.
export function pushOutBox(pos, rad, c) {
  const dx = pos.x - c.cx, dz = pos.z - c.cz;
  const cs = Math.cos(c.ry || 0), sn = Math.sin(c.ry || 0);
  const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
  // nearest point on the box, then out along the shortest way
  const qx = Math.max(-c.hx, Math.min(c.hx, lx)), qz = Math.max(-c.hz, Math.min(c.hz, lz));
  let ox = lx - qx, oz = lz - qz, d = Math.hypot(ox, oz);
  if (d >= rad) return false;
  let nx, nz;
  if (d > 1e-6) { nx = qx + (ox / d) * rad; nz = qz + (oz / d) * rad; }
  else if (c.hx - Math.abs(lx) < c.hz - Math.abs(lz)) { nx = Math.sign(lx || 1) * (c.hx + rad); nz = lz; }
  else { nx = lx; nz = Math.sign(lz || 1) * (c.hz + rad); }
  pos.x = c.cx + nx * cs + nz * sn;
  pos.z = c.cz - nx * sn + nz * cs;
  return true;
}

// Push a circle out of another circle { x, z, r }. Returns true when it moved.
export function pushOutCircle(pos, rad, o) {
  const dx = pos.x - o.x, dz = pos.z - o.z, d = Math.hypot(dx, dz), min = rad + o.r;
  if (d >= min) return false;
  const l = d || 1e-6;
  pos.x = o.x + (dx / l) * min; pos.z = o.z + (dz / l) * min;
  return true;
}

// Moving bodies: people as circles, vehicles as boxes. Returns true when anything pushed.
export function pushOutDynamic(pos, rad, bodies) {
  let hit = false;
  for (const b of bodies) hit = (b.r !== undefined ? pushOutCircle(pos, rad, b) : pushOutBox(pos, rad, b)) || hit;
  return hit;
}
