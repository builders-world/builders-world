// Minimal static server for Railway. No dependencies.
// Serves ./dist, long-caches hashed assets, never caches the manifest data.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const port = Number(process.env.PORT) || 3000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

async function send(res, file) {
  const body = await readFile(file);
  const ext = extname(file);
  const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream' };
  if (file.includes('/assets/')) headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  else if (ext === '.json') headers['Cache-Control'] = 'no-cache';
  res.writeHead(200, headers);
  res.end(body);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, rel);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    try {
      const s = await stat(file);
      if (s.isDirectory()) file = join(file, 'index.html');
    } catch {
      file = join(root, 'index.html'); // single-page fallback
    }
    await send(res, file);
  } catch (e) {
    res.writeHead(500);
    res.end('Server error');
  }
}).listen(port, '0.0.0.0', () => console.log(`yaba-scene on :${port}`));
