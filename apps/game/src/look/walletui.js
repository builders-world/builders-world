import { C, FONT } from './uikit.js';

// The wallet you carry (Elvis, 10 October 2026): a real leather bifold, drawn in the same paper and ink
// as the rest of the kit. It opens with your cards rising out of their slots (the Yaba Builders Bank
// card, then any passes you hold) and Efforts notes peeking from the cash pocket. Click it and it moves
// aside for the overview: balance, GitHub, and what you spent, on a square sheet beside it.

const esc = (t) => String(t ?? '').replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));
const CARD = {
  bank: { bg: C.teal, fg: '#fff', label: 'YABA BUILDERS BANK', sub: 'DEBIT' },
  resident: { bg: '#4a64b0', fg: '#fff', label: 'RESIDENT', sub: 'YABA-CONNECT' },
  eko: { bg: C.amber, fg: C.ink, label: 'EKO STUDIO', sub: 'MEMBER' },
  tenant: { bg: '#7fb35e', fg: C.ink, label: 'ESTATE', sub: 'TENANT' },
  visitor: { bg: C.coral, fg: '#fff', label: 'VISITOR', sub: 'PASS' },
};

export const WALLET_CSS = `
#lkm-wal.wal2 { left: 0; top: 0; width: 100vw; height: 100vh; max-height: none; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 0;
  background: none !important; box-shadow: none !important; border: 0 !important; transform: none; overflow: hidden; }
#lkm-wal.wal2.on { transform: none; }
#lkm-wal.wal2 .wl { position: relative; flex: 0 0 auto; width: min(400px, 82vw); cursor: pointer; transition: transform .45s cubic-bezier(.2,.8,.2,1); filter: drop-shadow(0 18px 26px rgba(10,14,30,.28)); } /* one soft shadow: a hard offset copy read as a grey slab */
#lkm-wal.wal2 .wl svg { display: block; width: 100%; height: auto; }
#lkm-wal.wal2 .wl:focus { outline: none; } #lkm-wal.wal2 .wl:focus-visible .tip { box-shadow: 0 0 0 3px ${C.amber}; }
#lkm-wal.wal2 .wp svg { display: inline-block; width: auto; height: auto; vertical-align: -2px; flex: 0 0 auto; }
#lkm-wal.wal2 .wl:hover { transform: translateY(-4px) rotate(-1deg); }
#lkm-wal.wal2 .tip { position: absolute; left: 50%; bottom: -46px; transform: translateX(-50%); white-space: nowrap; padding: 7px 14px; border-radius: 999px; background: ${C.paper}; color: ${C.ink}; font: 700 14px/1 ${FONT}; box-shadow: 0 6px 16px rgba(10,14,30,.18); transition: opacity .2s; }
#lkm-wal.wal2.panel .tip { opacity: 0; }
#lkm-wal.wal2 .wp { flex: 0 0 auto; width: 0; height: min(440px, calc(100vh - 40px)); opacity: 0; overflow: hidden; margin-left: 0; border-radius: 26px; background: ${C.paper}; color: ${C.ink};
  box-shadow: 0 6px 0 rgba(59,42,32,.22), 0 24px 60px rgba(10,14,30,.35); transition: width .45s cubic-bezier(.2,.8,.2,1), opacity .3s ease .1s, margin .45s; display: flex; flex-direction: column; }
#lkm-wal.wal2.panel .wp { width: min(440px, calc(100vw - 32px)); opacity: 1; margin-left: 30px; }
#lkm-wal.wal2 .wp .in { width: min(440px, calc(100vw - 32px)); box-sizing: border-box; padding: 20px 22px 16px; display: flex; flex-direction: column; height: 100%; }
#lkm-wal.wal2 h3 { margin: 0 0 10px; font: 800 26px/1 ${FONT}; } #lkm-wal.wal2 h3 small { display: block; margin-top: 4px; font: 600 13px/1 ${FONT}; color: ${C.ink2}; }
#lkm-wal.wal2 .bal { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 18px; background: ${C.teal}; color: #fff; }
#lkm-wal.wal2 .bal b { font: 800 36px/1 ${FONT}; } #lkm-wal.wal2 .bal small { margin-left: auto; font: 700 12px/1.2 ${FONT}; opacity: .85; text-align: right; }
#lkm-wal.wal2 .how { margin: 8px 0; font: 600 12.5px/1.4 ${FONT}; color: ${C.ink2}; } #lkm-wal.wal2 .st { margin: 6px 0; font: 600 12.5px/1.4 ${FONT}; color: ${C.coral}; }
#lkm-wal.wal2 .gh { display: flex; gap: 8px; } #lkm-wal.wal2 .gh input { flex: 1; min-width: 0; border: 2px solid #e3d4b4; border-radius: 999px; padding: 8px 14px; background: #fffaf0; color: ${C.ink}; font: 700 14px/1 ${FONT}; }
#lkm-wal.wal2 .gh button { border: 0; cursor: pointer; }
#lkm-wal.wal2 h4 { margin: 12px 0 4px; font: 800 14px/1 ${FONT}; color: ${C.teal}; }
#lkm-wal.wal2 ul { flex: 1 1 auto; min-height: 0; overflow: auto; list-style: none; margin: 0; padding: 0; }
#lkm-wal.wal2 li { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; padding: 6px 0; border-top: 2px dashed #e3d4b4; font: 600 13.5px/1.3 ${FONT}; }
#lkm-wal.wal2 li b { white-space: nowrap; display: inline-flex; align-items: center; gap: 2px; } #lkm-wal.wal2 li b.in { color: #2f8a4f; } #lkm-wal.wal2 li.none { display: block; color: ${C.ink2}; }
#lkm-wal.wal2 .row { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
#lkm-wal.wal2 .row button { border: 0; cursor: pointer; }
#lkm-wal.wal2.atm .wp { border: 10px solid ${C.teal}; }
/* the two halves of the wallet: tap the cards to see them, tap the cash to count it */
#lkm-wal.wal2 .half { position: absolute; top: 8%; bottom: 8%; width: 47%; border-radius: 18px; cursor: pointer; transition: background .15s; }
#lkm-wal.wal2 .half.l { left: 3%; } #lkm-wal.wal2 .half.r { right: 3%; }
#lkm-wal.wal2 .half:hover, #lkm-wal.wal2 .half:focus-visible { background: rgba(255,250,240,.12); outline: none; box-shadow: inset 0 0 0 3px rgba(242,179,61,.7); }
#lkm-wal.wal2 .half.on { box-shadow: inset 0 0 0 3px ${C.amber}; }
#lkm-wal.wal2 .wl:hover { transform: none; }
#lkm-wal.wal2 .col { display: none; flex-direction: column; gap: 12px; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 4px 4px 8px; margin: 0 -4px; scrollbar-width: thin; }
#lkm-wal.wal2[data-view="cards"] .col.cards, #lkm-wal.wal2[data-view="money"] .col.money, #lkm-wal.wal2[data-view="overview"] .ov { display: flex; }
#lkm-wal.wal2:not([data-view="overview"]) .ov { display: none; }
#lkm-wal.wal2 .ov { flex-direction: column; flex: 1 1 auto; min-height: 0; }
#lkm-wal.wal2 .col .bw-card { flex: none; max-width: none; animation: wl-out .55s cubic-bezier(.2,1.1,.3,1) both; }
#lkm-wal.wal2 .col .stack { animation: wl-out .55s cubic-bezier(.2,1.1,.3,1) both; }
@keyframes wl-out { from { transform: translate(-90px, 40px) rotate(-6deg) scale(.7); opacity: 0; } 60% { opacity: 1; } to { transform: none; opacity: 1; } }
#lkm-wal.wal2 .total { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 18px; background: #6aa857; color: #fff; flex: none; }
#lkm-wal.wal2 .total b { font: 800 30px/1 ${FONT}; } #lkm-wal.wal2 .total small { margin-left: auto; font: 700 12px/1.2 ${FONT}; opacity: .9; text-align: right; }
#lkm-wal.wal2 .stack { display: grid; grid-template-columns: 116px 1fr auto; gap: 12px; align-items: center; padding: 10px 12px; border-radius: 16px; background: #fffaf0; border: 2px solid #ecdfc2; flex: none; }
#lkm-wal.wal2 .stack svg { width: 116px; height: 64px; } #lkm-wal.wal2 .stack b { display: block; font: 800 15px/1.1 ${FONT}; } #lkm-wal.wal2 .stack small { font: 700 12px/1.2 ${FONT}; color: ${C.ink2}; }
#lkm-wal.wal2 .stack .sum { font: 800 15px/1 ${FONT}; white-space: nowrap; }
#lkm-wal.wal2 .colhint { margin: 0; font: 600 12.5px/1.4 ${FONT}; color: ${C.ink2}; flex: none; }
@media (prefers-reduced-motion: reduce) { #lkm-wal.wal2 .col .bw-card, #lkm-wal.wal2 .col .stack { animation: none; } }
/* the opening: the flap swings, the cards rise one by one, the notes flutter */
@keyframes wl-card { from { transform: translateY(70px); opacity: 0; } 60% { opacity: 1; } to { transform: none; opacity: 1; } }
@keyframes wl-note { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-3deg) translateY(-3px); } }
@keyframes wl-open { from { transform: scaleX(.15); } to { transform: none; } }
@keyframes wl-coin { from { transform: translateY(-40px); opacity: 0; } 70% { transform: translateY(4px); opacity: 1; } to { transform: none; opacity: 1; } }
#lkm-wal.wal2 .flap { transform-origin: 200px 150px; animation: wl-open .5s cubic-bezier(.2,.8,.2,1) both; }
#lkm-wal.wal2 .card { animation: wl-card .6s cubic-bezier(.2,.9,.25,1.15) both; }
#lkm-wal.wal2 .note { transform-box: fill-box; transform-origin: 50% 100%; animation: wl-note 2.6s ease-in-out infinite; }
#lkm-wal.wal2 .coin { animation: wl-coin .5s ease-out both; }
@media (prefers-reduced-motion: reduce) { #lkm-wal.wal2 .flap, #lkm-wal.wal2 .card, #lkm-wal.wal2 .note, #lkm-wal.wal2 .coin { animation: none; } }
@media (max-width: 760px) {
  #lkm-wal.wal2 { flex-direction: column; justify-content: flex-start; padding-top: 24px; overflow: auto; }
  #lkm-wal.wal2 .wl { width: min(300px, 80vw); }
  #lkm-wal.wal2 .wp { height: 0; width: min(440px, calc(100vw - 32px)); transition: height .45s, opacity .3s; }
  #lkm-wal.wal2.panel .wp { height: auto; min-height: 380px; margin: 24px 0 0; }
}
`;

// the wallet itself, open, as SVG: leather, stitching, card slots on the left, the cash pocket on the right
export function walletSVG({ cards = [], balance = '0', mark = '' }) {
  const ink = C.ink, leather = '#9a6438', inner = '#7d4e2b', pocket = '#b77b48';
  const list = [{ kind: 'bank', no: '4728', name: '' }, ...cards.slice(0, 3)];
  // cards sit in three slots, the newest on top, each a little higher than the one in front of it
  const cardSVG = list.map((c, i) => {
    const d = CARD[c.kind] || CARD.visitor, y = 42 + i * 24, x = 36 + i * 4, dl = 0.35 + (list.length - 1 - i) * 0.12;
    const last4 = String(c.no || '').replace(/\D/g, '').slice(-4).padStart(4, '0');
    return `<g class="card" style="animation-delay:${dl}s"><rect x="${x}" y="${y}" width="138" height="88" rx="10" fill="${d.bg}" stroke="${ink}" stroke-width="3"/>
      <rect x="${x + 12}" y="${y + 30}" width="22" height="17" rx="3" fill="${C.amber}" stroke="${ink}" stroke-width="2"/><path d="M${x + 12} ${y + 38}h22M${x + 23} ${y + 30}v17" stroke="${ink}" stroke-width="1.2"/>
      <text x="${x + 12}" y="${y + 16}" font-family="Baloo 2, sans-serif" font-weight="800" font-size="10.5" fill="${d.fg}">${esc(d.label)}</text>
      <text x="${x + 12}" y="${y + 70}" font-family="Baloo 2, sans-serif" font-weight="700" font-size="11" fill="${d.fg}" opacity=".9">•••• ${last4}</text>
      <text x="${x + 126}" y="${y + 70}" text-anchor="end" font-family="Baloo 2, sans-serif" font-weight="800" font-size="9" fill="${d.fg}" opacity=".85">${esc(d.sub)}</text></g>`;
  }).join('');
  // the slot fronts cover the bottom of each card, so the cards look tucked in
  const slots = [0, 1, 2].map((i) => `<path d="M24 ${118 + i * 20}h160v${80 - i * 20}H24z" fill="${i % 2 ? pocket : inner}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M32 ${126 + i * 20}h144" stroke="#e8c49a" stroke-width="2" stroke-dasharray="5 5" opacity=".7"/>`).join('');
  // Efforts notes in the cash pocket, fanned, and two coins
  const notes = [[-8, '#8fca72'], [-2, '#7fb35e'], [5, '#a3d688']].map(([r, col], i) => `<g class="note" style="animation-delay:${i * 0.4}s"><g transform="rotate(${r} 300 150)"><rect x="232" y="${40 + i * 8}" width="136" height="70" rx="6" fill="${col}" stroke="${ink}" stroke-width="3"/>
      <rect x="240" y="${48 + i * 8}" width="120" height="54" rx="4" fill="none" stroke="${ink}" stroke-width="1.5" opacity=".5"/><circle cx="300" cy="${75 + i * 8}" r="15" fill="${C.paper}" stroke="${ink}" stroke-width="2"/>
      <g transform="translate(290 ${65 + i * 8}) scale(1.1)">${mark}</g><text x="252" y="${64 + i * 8}" font-family="Baloo 2, sans-serif" font-weight="800" font-size="11" fill="${ink}">1000</text><text x="356" y="${98 + i * 8}" text-anchor="end" font-family="Baloo 2, sans-serif" font-weight="800" font-size="11" fill="${ink}">1000</text></g></g>`).join('');
  const coins = [[250, 228], [282, 236]].map(([x, y], i) => `<g class="coin" style="animation-delay:${0.9 + i * 0.15}s"><circle cx="${x}" cy="${y}" r="15" fill="${C.amber}" stroke="${ink}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${ink}" stroke-width="1.5" opacity=".6"/></g>`).join('');
  return `<svg viewBox="0 0 400 300" role="img" aria-label="Your wallet: ${esc(balance)} Efforts">
    <defs><radialGradient id="wl-sh"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="200" cy="270" rx="176" ry="16" fill="url(#wl-sh)"/>
    <g class="flap">
      <rect x="14" y="30" width="372" height="236" rx="22" fill="${leather}" stroke="${ink}" stroke-width="4"/>
      <rect x="24" y="40" width="352" height="216" rx="16" fill="none" stroke="#e8c49a" stroke-width="2.5" stroke-dasharray="7 6" opacity=".8"/>
      <path d="M200 34v228" stroke="${ink}" stroke-width="3" opacity=".55"/><path d="M196 36v224" stroke="#6b4022" stroke-width="5" opacity=".35"/>
    </g>
    ${cardSVG}
    ${slots}
    ${notes}
    <path d="M216 126h160v128a10 10 0 0 1-10 10H226a10 10 0 0 1-10-10z" fill="${pocket}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M224 134h144" stroke="#e8c49a" stroke-width="2" stroke-dasharray="5 5" opacity=".7"/>
    ${coins}
    <g transform="translate(296 186)"><rect x="-58" y="-20" width="116" height="40" rx="12" fill="${C.paper}" stroke="${ink}" stroke-width="3"/><text x="0" y="7" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="19" fill="${ink}">${esc(balance)}</text></g>
    <circle cx="372" cy="150" r="9" fill="#c9a27a" stroke="${ink}" stroke-width="3"/>
  </svg>`;
}

// ---------- what your balance is in notes and coins ----------
// bundles of a hundred 1,000 notes, then notes, then coins: the same sum as your balance
export const DENOMS = [
  { v: 100000, kind: 'bundle', name: 'Bundle', sub: 'a hundred 1,000 notes, strapped' },
  { v: 1000, kind: 'note', name: '1,000 note', col: '#8fca72' }, { v: 500, kind: 'note', name: '500 note', col: '#e6b45c' },
  { v: 200, kind: 'note', name: '200 note', col: '#7fb3d6' }, { v: 100, kind: 'note', name: '100 note', col: '#d68fa8' },
  { v: 50, kind: 'coin', name: '50 coin' }, { v: 10, kind: 'coin', name: '10 coin' }, { v: 5, kind: 'coin', name: '5 coin' }, { v: 1, kind: 'coin', name: '1 coin' },
];
export function breakdown(total) {
  let left = Math.max(0, Math.floor(total)); const out = [];
  for (const d of DENOMS) { const n = Math.floor(left / d.v); if (n) { out.push({ ...d, n }); left -= n * d.v; } }
  return out;
}
// a stack of notes (fanned, up to five drawn), a strapped bundle, or a pile of coins
export function moneySVG(d, mark = '') {
  const ink = C.ink, show = Math.min(5, d.n);
  if (d.kind === 'coin') {
    const big = d.v >= 50, r = big ? 15 : 12;
    return `<svg viewBox="0 0 116 64" aria-hidden="true">${Array.from({ length: show }, (_, i) => `<g transform="translate(${30 + (i % 3) * 26} ${44 - Math.floor(i / 3) * 10 - (i % 2) * 4})"><ellipse rx="${r}" ry="${r * 0.62}" cy="4" fill="#b8892a" stroke="${ink}" stroke-width="2.5"/><ellipse rx="${r}" ry="${r * 0.62}" fill="${big ? C.amber : '#d9b45a'}" stroke="${ink}" stroke-width="2.5"/><text y="4" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="${big ? 11 : 9}" fill="${ink}">${d.v}</text></g>`).join('')}</svg>`;
  }
  if (d.kind === 'bundle') {
    return `<svg viewBox="0 0 116 64" aria-hidden="true">${Array.from({ length: show }, (_, i) => `<g transform="translate(${8 + i * 3} ${30 - i * 5})"><rect width="96" height="30" rx="4" fill="#7fb35e" stroke="${ink}" stroke-width="2.5"/><rect y="6" width="96" height="3" fill="#5f8f45"/><rect x="40" y="-1" width="16" height="32" fill="${C.paper}" stroke="${ink}" stroke-width="2"/></g>`).join('')}</svg>`;
  }
  return `<svg viewBox="0 0 116 64" aria-hidden="true">${Array.from({ length: show }, (_, i) => `<g transform="rotate(${(i - (show - 1) / 2) * 6} 58 60) translate(14 ${10 + i})"><rect width="88" height="44" rx="5" fill="${d.col}" stroke="${ink}" stroke-width="2.5"/><rect x="5" y="5" width="78" height="34" rx="3" fill="none" stroke="${ink}" stroke-width="1.2" opacity=".45"/><circle cx="44" cy="22" r="10" fill="${C.paper}" stroke="${ink}" stroke-width="1.8"/><text x="8" y="16" font-family="Baloo 2, sans-serif" font-weight="800" font-size="9" fill="${ink}">${d.v}</text></g>`).join('')}</svg>`;
}
