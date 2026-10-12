// Who is playing. People sign in with GitHub on the game's server (open-world-backend); the server hands the browser a session token,
// which lives here and goes with every call that needs to know who is asking. Everything about identity (the player's id, handle and
// wallet count) comes from the server's answer, never from what the player types.
//
// The profile (what you chose at arrivals and in the wardrobe) is kept on the server too, so it follows you to any device. The game
// still reads it from localStorage while playing; this file copies it down once at startup (on a fresh device) and back up when it changes.
import { apiUrl } from './api.js';

const TOKEN_KEY = 'bw-session';
const ARRIVALS_KEY = 'bw-arrivals-v1';
const WAIT = 5000; // how long startup waits for the server before the game carries on solo
const SYNC_EVERY = 20000;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};
const json = (k) => { try { return JSON.parse(store.get(k) || 'null'); } catch { return null; } };

export const session = {
  token: store.get(TOKEN_KEY) || '',
  /** { account: { id, login, name }, profile } once the server has said who this is; null when signed out or unreachable. */
  me: null,
  /** Why the last sign-in did not work ('denied', 'github', 'server'), for the page to say. */
  error: '',
};
export const signedIn = () => !!(session.token && session.me);
export const authHeaders = () => (session.token ? { Authorization: `Bearer ${session.token}` } : {});
export const signInUrl = () => `${apiUrl('/api/auth/github')}?return=${encodeURIComponent(location.origin)}`;

// GitHub sends the browser back to the game as <origin>/#bw-session=<token> (or #bw-error=<why>). A fragment is never sent to any
// server, and it is removed from the address bar straight away.
function pickUp() {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const token = hash.get('bw-session'), error = hash.get('bw-error');
  if (!token && !error) return;
  if (token && /^[0-9a-f]{64}$/.test(token)) { session.token = token; store.set(TOKEN_KEY, token); }
  if (error) session.error = error.replace(/[^a-z]/g, '').slice(0, 20);
  history.replaceState(null, '', location.pathname + location.search);
}

async function call(path, options = {}) {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), WAIT);
  try {
    return await fetch(apiUrl(path), { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...authHeaders(), ...options.headers }, signal: control.signal });
  } finally { clearTimeout(timer); }
}

async function load() {
  try {
    const r = await call('/api/me');
    if (r.status === 401) { session.token = ''; store.del(TOKEN_KEY); return; }
    if (r.ok && (r.headers.get('content-type') || '').includes('json')) session.me = await r.json();
  } catch { /* the server is unreachable: play solo */ }
}

// A fresh device (nothing chosen here yet) takes the saved profile; a device that already has choices keeps them and sends them up.
function adopt() {
  const saved = session.me?.profile;
  if (!saved) return;
  const local = json(ARRIVALS_KEY);
  if ((!local || !local.name) && saved.role && saved.city) {
    store.set(ARRIVALS_KEY, JSON.stringify({ version: 1, step: 'home', country: 'Nigeria', name: saved.name, role: saved.role, connection: { mode: 'github', provider: 'GitHub' }, city: saved.city, district: saved.district, avatar: saved.avatar }));
  }
  if (saved.look && !store.get('bw-style')) store.set('bw-style', JSON.stringify(saved.look));
  if (saved.pet && !store.get('bw-pet')) store.set('bw-pet', JSON.stringify(saved.pet));
  if (saved.card && !store.get('bw-public')) { const { commits, ...card } = saved.card; store.set('bw-public', JSON.stringify(card)); }
}

const profileNow = () => {
  const arrivals = json(ARRIVALS_KEY) || {};
  return { name: arrivals.name || '', role: arrivals.role || '', city: arrivals.city || '', district: arrivals.district || '', avatar: arrivals.avatar || {}, look: json('bw-style'), pet: json('bw-pet'), card: json('bw-public') || {} };
};
let lastSent = '';
export async function syncProfile(keepalive = false) {
  if (!signedIn()) return;
  const profile = profileNow();
  if (!profile.name) return; // nothing chosen yet: never overwrite what the server has with a blank
  const body = JSON.stringify(profile);
  if (body === lastSent) return;
  try {
    const r = await call('/api/me/profile', { method: 'PUT', body, keepalive });
    if (r.ok) lastSent = body;
  } catch { /* try again next time */ }
}
function keepInSync() {
  setTimeout(syncProfile, 3000);
  setInterval(syncProfile, SYNC_EVERY);
  document.addEventListener('visibilitychange', () => { if (document.hidden) syncProfile(true); });
  addEventListener('pagehide', () => syncProfile(true));
}

/** Runs before the game starts. Never throws and never waits long: without a server the game is played solo. */
export async function boot() {
  pickUp();
  if (session.token) await load();
  adopt();
  keepInSync();
}

export async function signOut() {
  try { await call('/api/auth/logout', { method: 'POST', body: '{}' }); } catch { /* the token is dropped here either way */ }
  session.token = ''; session.me = null; store.del(TOKEN_KEY);
}
