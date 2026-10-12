// Spotify "now playing" (world bible 11.9). Your own Spotify keeps playing in your own app; the game
// only reads what it is playing and shows it: a chip on your screen, a line on your profile, a note other
// players see. Nothing is streamed through the game, so nothing in the game needs a music licence.
// Sign-in is Spotify's own (Authorization Code with PKCE, no secret in the browser). It needs a Spotify
// app's client ID in VITE_SPOTIFY_CLIENT_ID; without one the feature stays off. Creator mode hides it.

const CLIENT_ID = import.meta.env?.VITE_SPOTIFY_CLIENT_ID || '';
const SCOPES = 'user-read-currently-playing user-read-playback-state';
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }, set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } } };
const redirect = () => `${location.origin}${location.pathname}`;
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function createSpotify({ onChange } = {}) {
  let token = store.get('bw-sp-token'); // { access, refresh, until }
  let now = null, timer = null;
  const available = !!CLIENT_ID;

  async function connect() {
    if (!available) return false;
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const state = b64url(crypto.getRandomValues(new Uint8Array(12)));
    store.set('bw-sp-pkce', { verifier, state });
    const u = new URL('https://accounts.spotify.com/authorize');
    Object.entries({ client_id: CLIENT_ID, response_type: 'code', redirect_uri: redirect(), scope: SCOPES, code_challenge_method: 'S256', code_challenge: challenge, state }).forEach(([k, v]) => u.searchParams.set(k, v));
    location.assign(u.toString());
    return true;
  }
  async function tokenRequest(body) {
    const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: CLIENT_ID, ...body }) });
    if (!r.ok) throw new Error('token');
    const j = await r.json();
    token = { access: j.access_token, refresh: j.refresh_token || token?.refresh, until: Date.now() + (j.expires_in - 60) * 1000 };
    store.set('bw-sp-token', token);
  }
  // back from Spotify's sign-in: swap the code for a token and tidy the address bar
  async function finishLogin() {
    const q = new URLSearchParams(location.search), code = q.get('code'), state = q.get('state'), pk = store.get('bw-sp-pkce');
    if (!code || !pk || state !== pk.state) return;
    try { await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirect(), code_verifier: pk.verifier }); } catch { /* the user sees "not connected" */ }
    store.set('bw-sp-pkce', null);
    q.delete('code'); q.delete('state'); history.replaceState(null, '', `${location.pathname}${q.toString() ? `?${q}` : ''}`);
  }
  async function poll() {
    if (!token) return;
    try {
      if (Date.now() > token.until && token.refresh) await tokenRequest({ grant_type: 'refresh_token', refresh_token: token.refresh });
      const r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: { Authorization: `Bearer ${token.access}` } });
      if (r.status === 401) { disconnect(); return; }
      const j = r.status === 204 ? null : await r.json();
      const it = j?.is_playing && j.item?.type === 'track' ? j.item : null;
      const next = it ? { t: String(it.name).slice(0, 80), a: (it.artists || []).map((x) => x.name).join(', ').slice(0, 60), id: /^[A-Za-z0-9]{22}$/.test(it.id) ? it.id : '' } : null;
      if (JSON.stringify(next) !== JSON.stringify(now)) { now = next; onChange?.(now); }
    } catch { /* offline: keep the last one */ }
  }
  function disconnect() { token = null; store.set('bw-sp-token', null); now = null; onChange?.(null); }
  function start() { clearInterval(timer); if (!token) return; poll(); timer = setInterval(poll, 20000); }
  // a stand-in for tests and demos: ?np=Title|Artist shows a track without Spotify
  const mock = new URLSearchParams(location.search).get('np');
  if (mock) { const [t, a] = mock.split('|'); now = { t: t.slice(0, 80), a: (a || '').slice(0, 60), id: '' }; setTimeout(() => onChange?.(now), 0); }
  else finishLogin().then(start);
  return { available, connect, disconnect, get connected() { return !!token || !!mock; }, get now() { return now; } };
}

export const trackUrl = (np) => (np?.id ? `https://open.spotify.com/track/${np.id}` : null);
