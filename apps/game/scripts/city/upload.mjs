// Not used today: the cities ship with the deployment (public/city/). Kept for when there are too many for that.
//
// Upload a baked city (public/city/<slug>/, bake.mjs) to a Vercel Blob store, for the game to read through
// VITE_CITY_BASE. The tiles and map.json go under a folder named for their content, cached for a year; index.json,
// which names that folder ("v"), goes last and is cached for a minute, so a rebake goes live within a minute and
// nobody ever gets a new index with old tiles. Needs BLOB_READ_WRITE_TOKEN (vercel env pull, never committed).
//
//   node --env-file=.env.local scripts/city/upload.mjs lagos [nairobi ...]
//   node --env-file=.env.local scripts/city/upload.mjs --all
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { put, list, del } from '@vercel/blob';

const ROOT = new URL('../../public/city/', import.meta.url);
const args = process.argv.slice(2);
const slugs = args.includes('--all') ? readdirSync(ROOT).filter((d) => !d.startsWith('.')) : args;
if (!slugs.length) { console.error('which cities? (slugs, or --all)'); process.exit(1); }
if (!process.env.BLOB_READ_WRITE_TOKEN) { console.error('BLOB_READ_WRITE_TOKEN is not set (node --env-file=.env.local ...)'); process.exit(1); }

const send = (pathname, body, maxAge) => put(pathname, body, { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: maxAge });
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } })); }

for (const slug of slugs) {
  const dir = new URL(`${slug}/`, ROOT);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json').sort();
  const index = JSON.parse(readFileSync(new URL('index.json', dir), 'utf8'));
  const h = createHash('sha256'); files.forEach((f) => h.update(f).update(readFileSync(new URL(f, dir)))); h.update(JSON.stringify({ ...index, v: undefined }));
  const v = h.digest('hex').slice(0, 12), t0 = Date.now();
  let done = 0, bytes = 0;
  await pool(files, 12, async (f) => {
    const body = readFileSync(new URL(f, dir)); bytes += body.length;
    for (let tries = 0; ; tries++) { try { await send(`city/${slug}/${v}/${f}`, body, 31536000); break; } catch (e) { if (tries >= 3) throw e; await new Promise((r) => setTimeout(r, 1000 * (tries + 1))); } }
    if (++done % 100 === 0) process.stdout.write(`  ${slug}: ${done}/${files.length}\n`);
  });
  const res = await send(`city/${slug}/index.json`, JSON.stringify({ ...index, v }), 60);
  // older versions, once a week old (someone mid-game may still be on the one before)
  let old = 0, cursor; const week = Date.now() - 7 * 864e5;
  do { const r = await list({ prefix: `city/${slug}/`, cursor, limit: 1000 }); const gone = r.blobs.filter((b) => !b.pathname.startsWith(`city/${slug}/${v}/`) && !b.pathname.endsWith('/index.json') && new Date(b.uploadedAt).getTime() < week).map((b) => b.url); if (gone.length) { await del(gone); old += gone.length; } cursor = r.cursor; } while (cursor);
  console.log(`${slug}: ${files.length} files, ${(bytes / 1e6).toFixed(1)} MB as ${v} in ${((Date.now() - t0) / 1000).toFixed(0)}s${old ? `, ${old} old files removed` : ''} -> ${res.url.replace(/index\.json$/, '')}`);
}
