// Copy the Yaba asset kit from the parent Builders World repository into this app's public folder.
// The parent repository's manifest stays the source of truth: file names are not changed, the
// manifest is copied as is, and SOURCE.md records which commit the copy came from.
//
//   node scripts/sync-yaba-kit.mjs                 -> finds the parent repo automatically
//   node scripts/sync-yaba-kit.mjs /path/to/Builders-World
import { cp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = 'assets/exports/models/yaba-kit';
const candidates = [
  process.argv[2],
  path.resolve(app, '../../..'), // apps/world/yaba-scene inside Builders-World
  path.resolve(app, '../../Builders-World'), // a worktree beside Builders-World
].filter(Boolean);

let parent = null;
for (const c of candidates) {
  try { await access(path.join(c, KIT, 'asset-manifest.json')); parent = c; break; } catch { /* try the next one */ }
}
if (!parent) throw new Error(`Could not find ${KIT}/asset-manifest.json. Pass the Builders-World path as an argument.`);

const manifest = JSON.parse(await readFile(path.join(parent, KIT, 'asset-manifest.json'), 'utf8'));
const out = path.join(app, 'public/assets/yaba-kit');
await mkdir(out, { recursive: true });
await cp(path.join(parent, KIT, 'asset-manifest.json'), path.join(out, 'asset-manifest.json'));
for (const a of manifest.assets) await cp(path.join(parent, a.runtime), path.join(out, path.basename(a.runtime)));

let sha = 'unknown';
try { sha = execFileSync('git', ['-C', parent, 'log', '-1', '--format=%H', '--', KIT], { encoding: 'utf8' }).trim(); } catch { /* not a git checkout */ }
await writeFile(path.join(out, 'SOURCE.md'), `# Yaba asset kit: local copy

Copied from the parent Builders World repository by \`scripts/sync-yaba-kit.mjs\`. Do not edit these files here.

- Source: \`${KIT}/\` in Builders-World
- Source commit (last change to the kit): \`${sha}\`
- Synced: ${new Date().toISOString()}
- Files: \`asset-manifest.json\` and ${manifest.assets.length} GLBs, names unchanged

The manifest's \`runtime\` paths point into the parent repository. The app maps each one to this folder by file name.
Blender sources, renders and references stay in the parent repository and are not copied.
Re-run \`node scripts/sync-yaba-kit.mjs\` after the kit changes.
`);
console.log(`Synced ${manifest.assets.length} assets from ${parent} (${sha.slice(0, 7)}) to public/assets/yaba-kit`);
