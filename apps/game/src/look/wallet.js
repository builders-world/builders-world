import { apiUrl } from '../api.js';
import { session, signedIn, authHeaders, signInUrl } from '../session.js';
// Efforts (world bible 12.1): the currency of Builders World. You earn it by shipping: every commit
// you push is 1,000 Efforts. Link a GitHub username and the wallet counts your public commits;
// until then it shows a demo balance. Spending is kept on this device.

const PER_COMMIT = 1000;
// everyone starts with this (Elvis, 11 October 2026: "for every user that joins, let's give them 25,000 efforts to start
// with"): it sits under whatever your commits and your work in the world add
export const WELCOME = 25000;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

// The symbol: an E whose middle arm is a double bar and whose spine runs through, top and bottom,
// the way currency marks carry a stroke (it is not the euro's C or the pound's L).
export function effortsMark(size = 18, color = 'currentColor') {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-label="Efforts" role="img" style="vertical-align:-0.15em">
    <path d="M8 2.5v19" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M17.5 5H8M17.5 19H8" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M5 10.4h10.5M5 13.6h10.5" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}
export const fmt = (n) => Math.round(n).toLocaleString('en-NG');

export function createWallet({ demoCommits = 0 } = {}) {
  const listeners = new Set();
  // a kept count belongs to the account it was counted for; anyone else's (or from before sign-in existed) is not used
  const handleNow = signedIn() ? session.me.account.login : '';
  const mine = handleNow && store.get('bw-gh-for', '') === handleNow;
  const state = {
    // signed in, the GitHub account is the one you signed in with: it cannot be typed in or changed
    handle: handleNow,
    commits: mine ? store.get('bw-gh-commits', null) : null,
    checked: mine ? store.get('bw-gh-at', 0) : 0,
    spent: store.get('bw-spent', []), // [{ what, amount, at }]
    bonus: store.get('bw-bonus', []), // Efforts earned in the world: cleaning the streets, recycling [{ what, amount, at }]
    status: '', source: store.get('bw-gh-src', 'commits'),
  };
  // a guest sees a demo balance; someone signed in has what their GitHub says, and nothing until it has been counted
  const earned = () => (state.handle && state.commits !== null ? state.commits : signedIn() ? 0 : demoCommits) * PER_COMMIT;
  const spentTotal = () => state.spent.reduce((a, s) => a + s.amount, 0);
  const bonusTotal = () => state.bonus.reduce((a, s) => a + s.amount, 0);
  const balance = () => WELCOME + earned() + bonusTotal() - spentTotal();
  const emit = () => listeners.forEach((fn) => fn(api));

  // your shipping over the last year, from the game's own endpoint (api/efforts.js), which asks GitHub
  // on your behalf: exact commit contributions when the server has a token, the public contribution
  // calendar otherwise. Private work counts only if your GitHub profile shows private contributions.
  async function refresh(force = false) {
    if (!signedIn()) return;
    if (!force && Date.now() - state.checked < 10 * 60 * 1000 && state.commits !== null) return;
    state.status = 'Counting your commits...'; emit();
    try {
      const r = await fetch(apiUrl('/api/me/efforts'), { headers: authHeaders() });
      if (r.status === 401) { state.status = 'Your sign-in has expired. Sign in again to count your commits.'; emit(); return; }
      if (r.status === 404) { state.status = 'No GitHub user by that name.'; state.commits = null; emit(); return; }
      const ct = r.headers.get('content-type') || '';
      if (!r.ok || !ct.includes('json')) throw new Error('no endpoint');
      const j = await r.json();
      state.commits = j.commits; state.source = j.source; state.checked = Date.now();
      state.status = j.commits === 0 ? 'Nothing public in the last year yet. Push something!' : '';
      store.set('bw-gh-for', state.handle); store.set('bw-gh-commits', state.commits); store.set('bw-gh-at', state.checked); store.set('bw-gh-src', j.source);
    } catch {
      state.status = 'Could not reach GitHub just now; showing your last count.';
    }
    emit();
  }
  // counts again; the account is whoever is signed in, never a name typed in
  function link() { return refresh(true); }
  function spend(amount, what) {
    if (amount > balance()) return false;
    state.spent.push({ what, amount, at: Date.now() });
    // (the oldest are folded into one line, never dropped: dropping them gave their cost back)
    if (state.spent.length > 200) { const old = state.spent.splice(0, 50).reduce((a, s) => a + s.amount, 0); state.spent.unshift({ what: 'Earlier spending', amount: old, at: 0 }); }
    store.set('bw-spent', state.spent);
    emit();
    return true;
  }
  // earned in the world, not by shipping: kept on this device next to what you spend
  function earn(amount, what) {
    amount = Math.max(0, Math.round(amount)); if (!amount) return;
    state.bonus.push({ what, amount, at: Date.now() });
    if (state.bonus.length > 400) { const old = state.bonus.splice(0, 100).reduce((a, s) => a + s.amount, 0); state.bonus.unshift({ what: 'Earlier street work', amount: old, at: 0 }); }
    store.set('bw-bonus', state.bonus);
    emit();
  }
  const api = {
    balance, earned, spend, earn, link, refresh, bonus: bonusTotal, WELCOME,
    get handle() { return state.handle; }, get commits() { return state.handle && state.commits !== null ? state.commits : signedIn() ? 0 : demoCommits; },
    get demo() { return !signedIn(); }, get counted() { return signedIn() && state.commits !== null; }, signInUrl, get status() { return state.status; }, get source() { return state.source; },
    get history() { return [...state.spent, ...state.bonus.map((b) => ({ ...b, earn: true }))].sort((a, b) => a.at - b.at).slice(-12).reverse(); },
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    PER_COMMIT,
  };
  refresh();
  return api;
}

let instance = null;
export const walletEngine = (opts) => (instance ??= createWallet(opts));
