// The open city's builder, off the main thread: fetches a chunk's baked data (and keeps the last few hundred, so a
// change of detail does not fetch again), meshes it (chunkmesh.js) and hands the arrays back without copying them.
import { meshChunk } from './chunkmesh.js';

const cache = new Map(), MAX = 400;
async function data(url) {
  if (cache.has(url)) { const d = cache.get(url); cache.delete(url); cache.set(url, d); return d; }
  const r = await fetch(url); const d = r.ok ? await r.json() : {};
  cache.set(url, d); if (cache.size > MAX) cache.delete(cache.keys().next().value);
  return d;
}
self.onmessage = async ({ data: job }) => {
  try {
    const d = await data(job.url);
    const out = meshChunk(d, job.meta, job);
    // what the minimap draws and the city's traffic drives, near the player only: street centrelines (class, name, points,
    // one way, lanes, roundabout, deck heights), land, water
    // (not the streets inside the district: the minimap draws the district's own)
    const out2 = (p) => !job.hole || Math.hypot((p[0] + p[p.length - 2]) / 2 - job.hole[0], (p[1] + p[p.length - 1]) / 2 - job.hole[1]) >= job.hole[2];
    if (job.lod < 2) out.map = { roads: (d.segs || []).filter((q) => out2(q.p)).map((q) => [q.c, q.n ?? -1, q.p, q.o ? 1 : 0, q.l || 0, q.rb ? 1 : 0, q.e || null]), land: (d.land || []).map((l) => [l.k, l.p]), water: (d.water || []).map((w) => w.p) };
    const bufs = [out.base, out.ground, out.solid, out.facade].flatMap((L) => [L.p.buffer, L.n.buffer, L.c.buffer, ...(L.f ? [L.f.buffer] : [])]);
    self.postMessage({ id: job.id, key: job.key, lod: job.lod, out }, bufs);
  } catch (err) {
    self.postMessage({ id: job.id, key: job.key, lod: job.lod, error: String(err?.message || err) });
  }
};
