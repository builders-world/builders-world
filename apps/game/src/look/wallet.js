// Efforts (world bible 12.1): the currency of Builders World. You earn it by shipping: every commit
// you push is 1,000 Efforts. Link a GitHub username and the wallet counts your public commits;
// until then it shows a demo balance. Spending is kept on this device.

const PER_COMMIT = 1000;
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

export function createWallet({ demoCommits = 12 } = {}) {
  const listeners = new Set();
  const state = {
    handle: store.get('bw-gh', ''),
    commits: store.get('bw-gh-commits', null),
    checked: store.get('bw-gh-at', 0),
    spent: store.get('bw-spent', []), // [{ what, amount, at }]
    bonus: store.get('bw-bonus', []), // Efforts earned in the world: cleaning the streets, recycling [{ what, amount, at }]
    status: '', source: store.get('bw-gh-src', 'commits'),
  };
  const earned = () => (state.handle && state.commits !== null ? state.commits : demoCommits) * PER_COMMIT;
  const spentTotal = () => state.spent.reduce((a, s) => a + s.amount, 0);
  const bonusTotal = () => state.bonus.reduce((a, s) => a + s.amount, 0);
  const balance = () => earned() + bonusTotal() - spentTotal();
  const emit = () => listeners.forEach((fn) => fn(api));

  // your shipping over the last year, from the game's own endpoint (api/efforts.js), which asks GitHub
  // on your behalf: exact commit contributions when the server has a token, the public contribution
  // calendar otherwise. Private work counts only if your GitHub profile shows private contributions.
  async function refresh(force = false) {
    if (!state.handle) return;
    if (!force && Date.now() - state.checked < 10 * 60 * 1000 && state.commits !== null) return;
    state.status = 'Counting your commits...'; emit();
    try {
      const r = await fetch(`/api/efforts?user=${encodeURIComponent(state.handle)}`);
      if (r.status === 404) { state.status = 'No GitHub user by that name.'; state.commits = null; emit(); return; }
      const ct = r.headers.get('content-type') || '';
      if (!r.ok || !ct.includes('json')) throw new Error('no endpoint');
      const j = await r.json();
      state.commits = j.commits; state.source = j.source; state.checked = Date.now();
      state.status = j.commits === 0 ? 'Nothing public in the last year yet. Push something!' : '';
      store.set('bw-gh-commits', state.commits); store.set('bw-gh-at', state.checked); store.set('bw-gh-src', j.source);
    } catch {
      state.status = 'Could not reach GitHub just now; showing your last count.';
    }
    emit();
  }
  function link(handle) {
    state.handle = String(handle || '').trim().replace(/^@/, '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 39);
    state.commits = null; state.checked = 0;
    store.set('bw-gh', state.handle); store.set('bw-gh-commits', null);
    emit();
    return refresh(true);
  }
  function spend(amount, what) {
    if (amount > balance()) return false;
    state.spent.push({ what, amount, at: Date.now() });
    if (state.spent.length > 200) state.spent.shift();
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
    balance, earned, spend, earn, link, refresh, bonus: bonusTotal,
    get handle() { return state.handle; }, get commits() { return state.handle && state.commits !== null ? state.commits : demoCommits; },
    get demo() { return !state.handle || state.commits === null; }, get status() { return state.status; }, get source() { return state.source; },
    get history() { return [...state.spent, ...state.bonus.map((b) => ({ ...b, earn: true }))].sort((a, b) => a.at - b.at).slice(-12).reverse(); },
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    PER_COMMIT,
  };
  refresh();
  return api;
}

let instance = null;
export const walletEngine = (opts) => (instance ??= createWallet(opts));
