import * as THREE from 'three';

// Accumulates flat-shaded, vertex-coloured geometry into one BufferGeometry.
// No textures anywhere: colour lives in vertices, per the art direction.

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const cache = new Map();
function cyl(rTop, rBot, seg) {
  const k = `c${rTop}_${rBot}_${seg}`;
  if (!cache.has(k)) cache.set(k, new THREE.CylinderGeometry(rTop, rBot, 1, seg, 1));
  return cache.get(k);
}
function ico(detail) {
  const k = `i${detail}`;
  if (!cache.has(k)) cache.set(k, new THREE.IcosahedronGeometry(1, detail));
  return cache.get(k);
}

export class MeshBuilder {
  constructor() {
    this.pos = [];
    this.col = [];
  }

  add(geo, t, color, { grad = 0.3, vary = 0.03 } = {}) {
    const { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = t;
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    _e.set(rx, ry, rz);
    _q.setFromEuler(_e);
    _p.set(x, y, z);
    _s.set(sx, sy, sz);
    _m.compose(_p, _q, _s);
    g.applyMatrix4(_m);
    const p = g.attributes.position;
    const n = p.count;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const yy = p.getY(i);
      if (yy < minY) minY = yy;
      if (yy > maxY) maxY = yy;
    }
    const span = Math.max(maxY - minY, 1e-3);
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i += 3) {
      const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
      const cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
      const cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
      const v = 1 + (hash3(cx, cy, cz) - 0.5) * 2 * vary;
      for (let k = 0; k < 3; k++) {
        const yy = p.getY(i + k);
        const f = (1 - grad + grad * ((yy - minY) / span)) * v;
        this.pos.push(p.getX(i + k), yy, p.getZ(i + k));
        this.col.push(c.r * f, c.g * f, c.b * f);
      }
    }
    g.dispose();
  }

  // x,z = centre, y = base
  box(x, y, z, w, h, d, color, opts, ry = 0) {
    this.add(unitBox, { x, y: y + h / 2, z, sx: w, sy: h, sz: d, ry }, color, opts);
  }

  cyl(x, y, z, rTop, rBot, h, seg, color, opts) {
    this.add(cyl(rTop, rBot, seg), { x, y: y + h / 2, z, sy: h }, color, opts);
  }

  blob(x, y, z, r, color, opts, sy = 1) {
    this.add(ico(0), { x, y, z, sx: r, sy: r * sy, sz: r }, color, opts);
  }

  // Flat triangles (flat array of xyz), one colour, no gradient by default.
  raw(positions, color, { grad = 0, vary = 0 } = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.add(g, {}, color, { grad, vary });
    g.dispose();
  }

  // Extrude a world-space polygon [[x,z],...] upward from baseY.
  extrude(points, baseY, height, color, opts) {
    const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 1 });
    this.add(g, { y: baseY, rx: -Math.PI / 2 }, color, opts);
    g.dispose();
  }

  toGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals(); // non-indexed => flat normals
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
