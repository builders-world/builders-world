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
    const bufs = [out.ground, out.solid, out.facade].flatMap((L) => [L.p.buffer, L.n.buffer, L.c.buffer, ...(L.f ? [L.f.buffer] : [])]);
    self.postMessage({ id: job.id, key: job.key, lod: job.lod, out }, bufs);
  } catch (err) {
    self.postMessage({ id: job.id, key: job.key, lod: job.lod, error: String(err?.message || err) });
  }
};
