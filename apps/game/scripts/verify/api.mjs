#!/usr/bin/env node
// Call the game's API as a player would: signed in with the session from "bw.mjs login", or anonymously. Prints the
// status and the JSON. The token is sent, never printed, and anything in the answer that looks like a secret is masked.
//
//   node scripts/verify/api.mjs GET /api/me
//   node scripts/verify/api.mjs GET "/api/bins?district=Yaba" --anon
//   node scripts/verify/api.mjs PUT /api/me/profile --data '{"profile":{...}}'
//   node scripts/verify/api.mjs GET /api/me --base http://127.0.0.1:8080     (a local gateway)
//
// Default base: the session's (where you signed in), else production. Exit code 0 for 2xx, 1 otherwise.
import { readSession, parseArgs, PROD } from './bw.mjs';

const a = parseArgs(process.argv.slice(2));
const [method = 'GET', path] = a._.length > 1 ? a._ : ['GET', a._[0]];
if (!path) { console.error('usage: api.mjs [METHOD] /api/path [--data JSON] [--anon] [--base URL]'); process.exit(1); }
const s = a.anon ? null : readSession();
if (!a.anon && !s) { console.error('not signed in: run "node scripts/verify/bw.mjs login" first, or pass --anon'); process.exit(1); }
const base = String(a.base || s?.base || PROD).replace(/\/+$/, '');
const headers = { Accept: 'application/json', ...(s ? { Authorization: `Bearer ${s.token}` } : {}), ...(a.data ? { 'Content-Type': 'application/json' } : {}) };
const t0 = Date.now();
const r = await fetch(base + path, { method: method.toUpperCase(), headers, body: a.data || undefined });
const text = await r.text();
let body; try { body = JSON.parse(text); } catch { body = text.slice(0, 2000); }
const mask = (v) => (typeof v === 'string' && /^[0-9a-f]{40,}$|^(gh[pousr]_|eyJ)[\w.-]{20,}/.test(v) ? `${v.slice(0, 4)}…(masked)` : v);
const clean = (o) => (Array.isArray(o) ? o.map(clean) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, /token|secret|password/i.test(k) ? '(masked)' : clean(v)])) : mask(o));
console.log(`${r.status} ${method.toUpperCase()} ${base}${path}  (${Date.now() - t0} ms${s ? `, as @${s.login || 'you'}` : ', anonymous'})`);
console.log(typeof body === 'string' ? body : JSON.stringify(clean(body), null, 2));
process.exit(r.ok ? 0 : 1);
