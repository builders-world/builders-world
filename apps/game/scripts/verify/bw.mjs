#!/usr/bin/env node
// Verify the game in a real browser: open it at a city and area, act like a player, take screenshots, and report what
// went wrong (console errors, failed requests, frame rate). For agents and people alike: every change that shows on
// screen is checked with this before it is called done. README.md next to this file has the recipes.
//
//   node scripts/verify/bw.mjs shot  --city Lagos --area Yaba [--device phone] [--quality low] [--hour 21] [--aerial]
//   node scripts/verify/bw.mjs run   plan.json            a scripted check: steps, screenshots, asserts (see README)
//   node scripts/verify/bw.mjs login [--base URL]        sign in with GitHub once, in a window you can see
//   node scripts/verify/bw.mjs logout
//
// Where: --base URL (a running server, a preview or production), or --serve (start this checkout's own dev server on a
// free port). Without either it uses http://127.0.0.1:5173.
// Out: --out DIR (default: a fresh folder in the system temp directory). It holds the screenshots, sheet.png (all of
// them on one page, to look at in one go) and report.json. The last line printed is the report's path.
import { chromium, devices } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir, homedir, platform } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), GAME = resolve(HERE, '../..');
export const SESSION_FILE = join(homedir(), '.config', 'builders-world', 'session.json');
export const PROD = 'https://buildersworld.vercel.app';

// ---------- arguments ----------
export function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) { a._.push(k); continue; }
    const name = k.slice(2), next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) a[name] = true; else { a[name] = next; i++; }
  }
  return a;
}

// ---------- the signed-in session (never printed, never in the repository) ----------
export function readSession() { try { return JSON.parse(readFileSync(SESSION_FILE, 'utf8')); } catch { return null; } }
function writeSession(s) { mkdirSync(dirname(SESSION_FILE), { recursive: true }); writeFileSync(SESSION_FILE, JSON.stringify(s)); chmodSync(SESSION_FILE, 0o600); }

// ---------- a dev server of this checkout, on a free port ----------
const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
async function serve() {
  const port = await freePort();
  const child = spawn(process.execPath, [join(GAME, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: GAME, stdio: ['ignore', 'pipe', 'pipe'] });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i++) { try { const r = await fetch(url); if (r.ok) return { url, stop: () => child.kill() }; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 500)); }
  child.kill(); throw new Error('the dev server did not start');
}

// ---------- the browser ----------
const GPU = platform() === 'darwin' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--ignore-gpu-blocklist'];
const DEVICES = { desktop: { viewport: { width: 1440, height: 900 } }, laptop: { viewport: { width: 1280, height: 800 } }, phone: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }, tablet: { ...devices['iPad (gen 7)'] } };

export async function open(opts = {}) {
  const server = opts.serve ? await serve() : null;
  const base = String(opts.base || server?.url || 'http://127.0.0.1:5173').replace(/\/+$/, '');
  const browser = await chromium.launch({ headless: !opts.headed, args: GPU });
  const dev = DEVICES[opts.device || 'desktop'] || DEVICES.desktop;
  const context = await browser.newContext({ ...dev, ...(opts.width ? { viewport: { width: +opts.width, height: +(opts.height || 900) } } : {}) });
  const session = opts.signedIn ? readSession() : null;
  if (opts.signedIn && !session) throw new Error(`not signed in: run "node scripts/verify/bw.mjs login" first (${SESSION_FILE})`);
  await context.addInitScript(([tok, keepGuides]) => {
    try { if (!keepGuides) { localStorage.setItem('bw-guide-seen', '1'); localStorage.setItem('bw-help-seen', '1'); } if (tok) localStorage.setItem('bw-session', tok); } catch { /* storage off */ }
  }, [session?.token || '', !!opts.guides]);
  const page = await context.newPage();
  const report = { base, device: opts.device || 'desktop', viewport: page.viewportSize(), started: new Date().toISOString(), errors: [], failed: [], steps: [], shots: [], checks: [] };
  page.on('pageerror', (e) => report.errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') report.errors.push(m.text()); });
  page.on('response', (r) => {
    const u = r.url().replace(base, ''), type = r.headers()['content-type'] || '';
    if (r.status() >= 400) report.failed.push(`${r.status()} ${r.request().method()} ${u}`);
    // a server that answers every unknown path with the page (vite preview, SPA fallbacks) hides a 404 as a 200: a .json
    // that comes back as HTML is a missing file
    else if (/\.json(\?|$)/.test(u) && /text\/html/.test(type)) report.failed.push(`html-for-json ${r.request().method()} ${u}`);
  });
  page.on('requestfailed', (r) => report.failed.push(`failed ${r.method()} ${r.url().replace(base, '')} (${r.failure()?.errorText})`));
  const cdp = await context.newCDPSession(page);
  const out = resolve(opts.out || join(tmpdir(), 'bw-verify', new Date().toISOString().replace(/[:.]/g, '-')));
  mkdirSync(out, { recursive: true });
  const bw = {
    page, browser, context, base, out, report,
    /** the game at a place: city, area, quality, hour, weather; or any extra query (q: 'a=1&b=2') */
    async game(o = {}) {
      const q = new URLSearchParams({ world: '1', offline: o.online ? '0' : '1', ...(o.city ? { city: o.city } : {}), ...(o.area ? { area: o.area } : {}), quality: o.quality || 'medium', hour: String(o.hour ?? 11), wx: o.weather || 'clear' });
      if (o.q) new URLSearchParams(o.q).forEach((v, k) => q.set(k, v));
      if (o.online) q.delete('offline');
      const url = `${base}/${o.path || ''}?${q}`;
      report.url = url;
      await page.goto(url);
      await page.waitForFunction(() => window.__bw?.ready && window.__bw.look, null, { timeout: o.timeout || 150000 });
      // the open city: wait for it to be in (best effort; a district-only place has none)
      await page.waitForFunction(() => { const w = window.__bw.look.openWorld; return !w?.active || w.ready; }, null, { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(o.settle ?? 4000);
      report.place = await bw.eval(() => ({ city: window.__bw.world.place?.city, area: window.__bw.world.place?.name, open: !!window.__bw.look.openWorld?.active, quality: window.__bw.quality }));
    },
    /** a screenshot that does not wait for web fonts (Playwright's own can hang on "waiting for fonts" headless) */
    async shot(name) {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const file = join(out, `${String(report.shots.length).padStart(2, '0')}-${name.replace(/[^\w-]+/g, '-')}.png`);
      writeFileSync(file, Buffer.from(data, 'base64')); report.shots.push({ name, file }); return file;
    },
    eval: (fn, arg) => page.evaluate(fn, arg),
    /** frames a second over ms, measured in the page */
    fps: (ms = 3000) => page.evaluate((ms) => new Promise((res) => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(tick); else res(Math.round((n * 1000) / (performance.now() - t0))); }; requestAnimationFrame(tick); }), ms),
    async aerial(on = true, dist = 1600) { await page.evaluate(([on, dist]) => { const c = window.__bw.cam; window.__bw.setAerial?.(on); if (on) { c.dist = c.distT = dist; c.pitch = c.pitchT = 1.0; } }, [on, dist]); await page.waitForTimeout(6000); },
    /** a contact sheet of every screenshot: one image to look at instead of many */
    async sheet() {
      if (!report.shots.length) return null;
      const imgs = report.shots.map((s) => ({ name: s.name, src: `data:image/png;base64,${readFileSync(s.file).toString('base64')}` }));
      const p2 = await context.newPage(); const cols = report.device === 'phone' ? 4 : 2, w = report.device === 'phone' ? 300 : 720;
      await p2.setViewportSize({ width: cols * (w + 8) + 8, height: 400 });
      await p2.setContent(`<body style="margin:0;padding:8px;background:#222;font:12px system-ui;color:#eee;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:8px">${imgs.map((i) => `<figure style="margin:0"><img src="${i.src}" style="width:${w}px;display:block"><figcaption>${i.name}</figcaption></figure>`).join('')}</body>`);
      await p2.waitForFunction(() => [...document.images].every((i) => i.complete));
      const file = join(out, 'sheet.png'); await p2.screenshot({ path: file, fullPage: true }); await p2.close(); report.sheet = file; return file;
    },
    async close() {
      report.ended = new Date().toISOString();
      // the API is expected to be unreachable while the game runs offline (the default); anything else that failed is a fault
      report.failedCounted = report.failed.filter((f) => !(/ \/api\//.test(f) && /offline=1/.test(report.url || '')));
      report.ok = !report.errors.length && !report.failedCounted.length && report.checks.every((c) => c.ok) && report.steps.every((s) => !s.error);
      await bw.sheet().catch((e) => { report.sheetError = String(e.message || e); });
      writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
      await browser.close(); server?.stop();
      return join(out, 'report.json');
    },
  };
  return bw;
}

// ---------- a plan: steps a player would take, with checks ----------
// { "base"?, "serve"?, "device"?, "signedIn"?, "game": { city, area, quality, hour, weather, q }, "steps": [
//   { "shot": "name" }, { "wait": 1500 }, { "press": "w" }, { "hold": "w", "ms": 800 }, { "type": "hello" },
//   { "click": "#selector" }, { "tap": "#selector" }, { "event": "bw:outdoors" }, { "eval": "js expression or () => {}" },
//   { "waitFor": "js expression", "timeout": 10000 }, { "log": "js expression" }, { "aerial": true }, { "fps": 3000 },
//   { "expect": "js expression that must be truthy", "name": "what it checks" } ] }
export async function runPlan(plan, opts = {}) {
  const bw = await open({ ...plan, ...opts });
  try {
    await bw.game(plan.game || {});
    await bw.shot('start');
    for (const st of plan.steps || []) {
      const rec = { ...st }; const t0 = Date.now();
      try {
        // a step's JavaScript: an expression, or a function (then it is called); either may return a promise
        const run = (src) => bw.page.evaluate((src) => { const v = (0, eval)(src); return typeof v === 'function' ? v() : v; }, src);
        if (st.shot) await bw.shot(st.shot);
        else if (st.wait) await bw.page.waitForTimeout(st.wait);
        else if (st.press) await bw.page.keyboard.press(st.press);
        else if (st.hold) { await bw.page.keyboard.down(st.hold); await bw.page.waitForTimeout(st.ms || 500); await bw.page.keyboard.up(st.hold); }
        else if (st.type) await bw.page.keyboard.type(st.type);
        else if (st.click) await bw.page.click(st.click, { timeout: st.timeout || 10000 });
        else if (st.tap) await bw.page.tap(st.tap, { timeout: st.timeout || 10000 });
        else if (st.event) await bw.page.evaluate((n) => dispatchEvent(new Event(n)), st.event);
        else if (st.eval) rec.value = await run(st.eval);
        else if (st.log) rec.value = await run(st.log);
        else if (st.waitFor) await bw.page.waitForFunction((src) => { const v = (0, eval)(src); return typeof v === 'function' ? v() : v; }, st.waitFor, { timeout: st.timeout || 15000, polling: 200 });
        else if (st.aerial !== undefined) await bw.aerial(!!st.aerial, st.dist);
        else if (st.fps) rec.value = await bw.fps(st.fps);
        else if (st.expect) { const v = await run(st.expect); rec.value = v; bw.report.checks.push({ name: st.name || st.expect, ok: !!v, value: v }); }
      } catch (e) { rec.error = String(e.message || e).split('\n')[0]; if (st.shotOnError !== false) await bw.shot(`error-${bw.report.steps.length}`).catch(() => {}); }
      rec.ms = Date.now() - t0; bw.report.steps.push(rec);
      if (rec.error && !st.optional) break;
    }
    bw.report.fps = await bw.fps(2000).catch(() => null);
    await bw.shot('end');
  } catch (e) { bw.report.steps.push({ error: String(e.message || e).split('\n')[0] }); await bw.shot('failed').catch(() => {}); }
  return bw.close();
}

// ---------- sign in once, in a window you can see; the token is kept out of the repository and never printed ----------
// It opens your own Chrome or Edge when installed (else Playwright's Chromium: sign in to GitHub with your password, or a
// passkey on your phone through the QR code), with a profile of its own next to the session, so GitHub remembers you the
// next time. It goes straight to GitHub's sign-in.
async function login(opts) {
  const base = String(opts.base || PROD).replace(/\/+$/, '');
  const profile = join(dirname(SESSION_FILE), 'browser-profile'); mkdirSync(profile, { recursive: true });
  let context;
  for (const channel of ['chrome', 'msedge', undefined]) { // your Chrome or Edge if installed, else Playwright's Chromium
    try { context = await chromium.launchPersistentContext(profile, { ...(channel ? { channel } : {}), headless: !!opts.headless, viewport: { width: 1280, height: 860 } }); break; } catch { /* not installed */ }
  }
  const page = context.pages()[0] || await context.newPage();
  await page.goto(`${base}/api/auth/github?return=${encodeURIComponent(base)}`);
  await page.bringToFront().catch(() => {});
  console.log(`A browser window is open on GitHub's sign-in for Builders World (${base}). Sign in there and approve; it comes back to the game by itself. Waiting up to 10 minutes...`);
  // the game keeps the session in localStorage once GitHub sends you back; look on every tab of the window
  const deadline = Date.now() + 600000; let token = null, closed = false;
  context.on('close', () => { closed = true; });
  while (!token && !closed && Date.now() < deadline) {
    for (const pg of context.pages()) {
      if (!pg.url().startsWith(base)) continue;
      token = await pg.evaluate(() => { try { const t = localStorage.getItem('bw-session'); return t && /^[0-9a-f]{64}$/.test(t) ? t : null; } catch { return null; } }).catch(() => null);
      if (token) break;
      const err = await pg.evaluate(() => location.hash.match(/bw-error=([a-z]+)/)?.[1] || null).catch(() => null);
      if (err) { console.error(`GitHub sign-in came back with "${err}". Try again: node scripts/verify/bw.mjs login`); await context.close(); process.exitCode = 1; return; }
    }
    if (!token) await new Promise((r) => setTimeout(r, 1000));
  }
  if (!token) { console.error(closed ? 'The window was closed before sign-in finished. Nothing was saved. Run it again and finish signing in.' : 'No sign-in after 10 minutes. Nothing was saved.'); await context.close().catch(() => {}); process.exitCode = 1; return; }
  const me = await fetch(`${base}/api/me`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  writeSession({ token, base, login: me?.account?.login || null, at: new Date().toISOString() });
  await context.close();
  console.log(`Signed in${me?.account?.login ? ` as @${me.account.login}` : ''}. Saved to ${SESSION_FILE} (only you can read it). Done.`);
}

// ---------- the command line ----------
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const a = parseArgs(process.argv.slice(2)), cmd = a._[0];
  const common = { base: a.base, serve: !!a.serve, device: a.device, out: a.out, headed: !!a.headed, signedIn: !!a['signed-in'], width: a.width, height: a.height, guides: !!a.guides };
  const game = { city: a.city, area: a.area, quality: a.quality, hour: a.hour, weather: a.weather, q: a.q, online: !!a.online };
  try {
    if (cmd === 'login') await login(a);
    else if (cmd === 'logout') { if (existsSync(SESSION_FILE)) rmSync(SESSION_FILE); console.log('Signed out (session file removed).'); }
    else if (cmd === 'run') {
      if (!a._[1]) throw new Error('which plan? node scripts/verify/bw.mjs run plan.json');
      const plan = JSON.parse(readFileSync(a._[1], 'utf8'));
      const file = await runPlan(plan, Object.fromEntries(Object.entries(common).filter(([, v]) => v !== undefined && v !== false)));
      summarise(file);
    } else if (cmd === 'shot') {
      const steps = [];
      if (a.eval) steps.push({ eval: a.eval }, { wait: 1500 }, { shot: 'after-eval' });
      if (a.aerial) steps.push({ aerial: true }, { shot: 'aerial' });
      steps.push({ fps: 3000 });
      const file = await runPlan({ ...common, game, steps }, {});
      summarise(file);
    } else {
      console.log(readFileSync(join(HERE, 'README.md'), 'utf8'));
    }
  } catch (e) { console.error(String(e.message || e)); process.exit(1); }
}

function summarise(file) {
  const r = JSON.parse(readFileSync(file, 'utf8'));
  const lines = [`${r.ok ? 'PASS' : 'FAIL'}  ${r.place ? `${r.place.area}, ${r.place.city}${r.place.open ? ' (open city)' : ''}` : r.url}  ${r.device} ${r.viewport?.width}x${r.viewport?.height} ${r.place?.quality || ''}  fps ${r.fps ?? '?'}`];
  r.steps.filter((s) => s.error || s.value !== undefined).forEach((s) => lines.push(`  ${s.error ? 'ERROR' : 'value'} ${JSON.stringify(s).slice(0, 220)}`));
  r.checks.forEach((c) => lines.push(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` (got ${JSON.stringify(c.value)})`}`));
  if (r.errors.length) lines.push(`  console errors (${r.errors.length}):`, ...r.errors.slice(0, 8).map((e) => `    ${e.slice(0, 200)}`));
  const failed = r.failedCounted || r.failed;
  if (failed.length) lines.push(`  failed requests (${failed.length}):`, ...failed.slice(0, 8).map((f) => `    ${f.slice(0, 200)}`));
  lines.push(`  screenshots: ${r.shots.length}, sheet: ${r.sheet || 'none'}`, file);
  console.log(lines.join('\n'));
  if (!r.ok) process.exitCode = 2;
}
