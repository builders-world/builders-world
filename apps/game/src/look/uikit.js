// The Builders World UI kit (world bible 11.1): warm paper, brown ink, a rounded display face,
// Adire indigo patterns, and drawn art instead of line icons. Taken from the references Elvis
// shared (the island map, the phone, the wardrobe ring, the face pickers) and set in Lagos.

export const C = {
  paper: '#f7efdc', paper2: '#efe2c4', ink: '#3b2a20', ink2: '#7a6552',
  teal: '#2a9d94', sea: '#8ed3c4', sea2: '#73c2b2', amber: '#f2b33d', coral: '#e46f4f',
  indigo: '#22336a', indigo2: '#30468a', indigo3: '#4a64b0', leaf: '#7fb35e', leaf2: '#5f9a45',
};
export const FONT = '"Baloo 2", ui-rounded, "SF Pro Rounded", system-ui, sans-serif';

// the display face, from Google Fonts; the rounded system face stands in offline
export function loadFont() {
  if (document.getElementById('bw-font')) return;
  const l = document.createElement('link');
  l.id = 'bw-font'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&display=swap';
  document.head.appendChild(l);
}

const uri = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

// ---------- Adire patterns: indigo cloth with resist-dye motifs ----------
const ADIRE = {
  // circles with a dot, like the eleko starch prints
  rings: (fg) => `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><g fill="none" stroke="${fg}" stroke-width="3"><circle cx="14" cy="14" r="8"/><circle cx="42" cy="42" r="8"/></g><g fill="${fg}"><circle cx="14" cy="14" r="2.5"/><circle cx="42" cy="42" r="2.5"/><circle cx="42" cy="14" r="2"/><circle cx="14" cy="42" r="2"/></g></svg>`,
  // running water lines
  waves: (fg) => `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="24"><path d="M0 12c6-8 18-8 24 0s18 8 24 0" fill="none" stroke="${fg}" stroke-width="3" stroke-linecap="round"/></svg>`,
  // little roof triangles, rows of houses
  roofs: (fg) => `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><path d="M6 18l8-10 8 10zM26 38l8-10 8 10z" fill="${fg}"/></svg>`,
  // ladder stitches
  stitch: (fg) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M4 4v24M28 4v24M4 10h24M4 22h24" fill="none" stroke="${fg}" stroke-width="2.5" stroke-linecap="round"/></svg>`,
};
export const pattern = (name, fg = 'rgba(255,255,255,.14)') => uri(ADIRE[name](fg));

// full-screen backdrop: indigo cloth with patterned blobs in the corners (the wardrobe screen)
export function backdropSVG() {
  const p = (id, motif, fg) => `<pattern id="${id}" width="${motif === 'waves' ? 48 : 56}" height="${motif === 'waves' ? 24 : 56}" patternUnits="userSpaceOnUse">${ADIRE[motif](fg).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</pattern>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><defs>
    ${p('a', 'roofs', '#3a58a8')}${p('b', 'waves', '#5c6fc0')}${p('c', 'rings', '#7d5aa6')}</defs>
    <rect width="1600" height="900" fill="${C.indigo}"/>
    <path d="M0 0h420c40 90-60 150-20 260S300 420 160 400 0 300 0 300z" fill="#2b4389"/><path d="M0 0h420c40 90-60 150-20 260S300 420 160 400 0 300 0 300z" fill="url(#a)"/>
    <path d="M1600 0h-360c-60 70 30 150-10 230s60 160 200 150 170-60 170-60z" fill="#33448f"/><path d="M1600 0h-360c-60 70 30 150-10 230s60 160 200 150 170-60 170-60z" fill="url(#b)"/>
    <path d="M1600 900h-440c-30-90 70-140 50-230s110-150 230-100 160 90 160 90z" fill="#3d3a86"/><path d="M1600 900h-440c-30-90 70-140 50-230s110-150 230-100 160 90 160 90z" fill="url(#c)"/>
    <path d="M0 900h300c30-80-40-120-10-200S180 560 80 590 0 650 0 650z" fill="#2b4389"/><path d="M0 900h300c30-80-40-120-10-200S180 560 80 590 0 650 0 650z" fill="url(#c)"/>
  </svg>`;
}

// ---------- people: drawn faces and figures (the face pickers, kept simple and warm) ----------
const SKIN = ['#5b3a29', '#6e4630', '#7d4f33', '#8d5a3b', '#a0673f', '#b97a4a'];
const HAIR = ['#1d1512', '#2a1d17', '#3a271d'];
const WRAP = ['#e46f4f', '#2a9d94', '#f2b33d', '#7d5aa6'];
const SHIRT = ['#2a9d94', '#e46f4f', '#f2b33d', '#4a64b0', '#7fb35e', '#c9a7f5', '#f6a8a0'];
function rng(seed) { let a = (Math.imul(seed + 0x9e37, 2654435761) ^ 0x5bd1e995) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function personFor(seed, over = {}) {
  const r = rng(seed * 7919 + 101); r(); r(); r();
  return { skin: SKIN[Math.floor(r() * SKIN.length)], hair: HAIR[Math.floor(r() * HAIR.length)], style: Math.floor(r() * 6),
    wrap: WRAP[Math.floor(r() * WRAP.length)], shirt: SHIRT[Math.floor(r() * SHIRT.length)], glasses: r() < 0.2, ...over };
}

// head in a 100 x 100 box, centred at (50, 52)
function headParts(p, { glasses = p.glasses, cap = false, phones = false } = {}) {
  const ink = C.ink, back = [], front = [];
  if (p.style === 1) back.push(`<circle cx="50" cy="44" r="36" fill="${p.hair}"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<circle cx="${50 + Math.cos(i * 0.9 - 2.6) * 34}" cy="${42 + Math.sin(i * 0.9 - 2.6) * 32}" r="9" fill="${p.hair}"/>`).join('')}`);
  if (p.style === 2) back.push([22, 30, 70, 78].map((x) => `<rect x="${x - 4}" y="44" width="8" height="${x < 50 ? 40 : 38}" rx="4" fill="${p.hair}"/>`).join(''));
  const face = `<circle cx="24" cy="55" r="6" fill="${p.skin}"/><circle cx="76" cy="55" r="6" fill="${p.skin}"/><circle cx="50" cy="54" r="28" fill="${p.skin}"/>
    <ellipse cx="40" cy="55" rx="3.2" ry="4.2" fill="${ink}"/><ellipse cx="60" cy="55" rx="3.2" ry="4.2" fill="${ink}"/>
    <path d="M35 46q5-3 10 0M55 46q5-3 10 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="34" cy="64" r="4.5" fill="#f08a7a" opacity=".35"/><circle cx="66" cy="64" r="4.5" fill="#f08a7a" opacity=".35"/>
    <path d="M44 66q6 5 12 0" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  let top = '';
  if (p.style === 0 || p.style === 2 || p.style === 4 || p.style === 5) top = `<path d="M22 52c0-20 12-31 28-31s28 11 28 31c-6-9-16-14-28-14s-22 5-28 14z" fill="${p.hair}"/>`;
  if (p.style === 4) top += `<circle cx="50" cy="20" r="11" fill="${p.hair}"/>`;
  if (p.style === 5) top += [30, 40, 50, 60, 70].map((x) => `<circle cx="${x}" cy="${x === 50 ? 23 : x === 40 || x === 60 ? 25 : 30}" r="6" fill="${p.hair}"/>`).join('');
  if (p.style === 3) top = `<path d="M18 50c-4-24 12-38 32-38s38 12 32 38c-8-8-18-11-32-11s-24 3-32 11z" fill="${p.wrap}"/><path d="M50 12c10-8 26-4 24 8-8-4-16-4-24-8z" fill="${p.wrap}"/><path d="M26 40q24-12 48 0" stroke="${ink}" stroke-opacity=".25" stroke-width="3" fill="none"/>`;
  front.push(face, top);
  if (glasses) front.push(`<g fill="#bfe3ff" fill-opacity=".35" stroke="${ink}" stroke-width="2.6"><circle cx="40" cy="55" r="8"/><circle cx="60" cy="55" r="8"/></g><path d="M48 55h4" stroke="${ink}" stroke-width="2.6"/>`);
  if (cap) front.push(`<path d="M22 44c0-16 12-26 28-26s28 10 28 26z" fill="${C.coral}" stroke="${ink}" stroke-width="2.5"/><path d="M50 44h34c2 0 2 6-2 6H50z" fill="#c4553a" stroke="${ink}" stroke-width="2.5"/><circle cx="50" cy="19" r="3" fill="${ink}"/>`);
  if (phones) front.push(`<path d="M18 54c0-26 14-38 32-38s32 12 32 38" fill="none" stroke="${C.amber}" stroke-width="6" stroke-linecap="round"/><path d="M18 54c0-26 14-38 32-38s32 12 32 38" fill="none" stroke="${ink}" stroke-width="1.5" opacity=".5"/>
    <rect x="12" y="46" width="12" height="20" rx="5" fill="${C.coral}" stroke="${ink}" stroke-width="2.5"/><rect x="76" y="46" width="12" height="20" rx="5" fill="${C.coral}" stroke="${ink}" stroke-width="2.5"/>`);
  return { back: back.join(''), front: front.join('') };
}

export function portraitSVG(p, size = 64) {
  const h = headParts(p);
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${h.back}<path d="M18 100c2-16 14-22 32-22s30 6 32 22z" fill="${p.shirt}"/><path d="M42 80l8 8 8-8" fill="none" stroke="${C.ink}" stroke-opacity=".3" stroke-width="2.5"/>${h.front}</svg>`;
}

// a whole figure in a 200 x 300 box, wearing what the bag says
export function figureSVG(p, wearing = []) {
  const on = (id) => wearing.includes(id);
  const h = headParts(p, { glasses: on('glasses') || p.glasses, cap: on('cap'), phones: on('headphones') });
  const ink = C.ink;
  return `<svg viewBox="0 0 200 300" aria-hidden="true">
    <ellipse cx="100" cy="288" rx="52" ry="9" fill="#000" opacity=".18"/>
    ${on('backpack') ? `<rect x="60" y="128" width="80" height="92" rx="20" fill="${C.teal}" stroke="${ink}" stroke-width="3"/>` : ''}
    <path d="M76 230h20v48h-22z" fill="#2b3550" stroke="${ink}" stroke-width="3"/><path d="M104 230h20l2 48h-22z" fill="#2b3550" stroke="${ink}" stroke-width="3"/>
    <path d="M70 272h28v14H66c-3 0-3-9 4-14zM102 272h28c7 5 7 14 4 14h-32z" fill="#f4ead2" stroke="${ink}" stroke-width="3"/>
    <path d="M58 150c4-18 20-26 42-26s38 8 42 26l6 48c1 10-6 14-12 10l-6-30v64H70v-64l-6 30c-6 4-13 0-12-10z" fill="${p.shirt}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="57" cy="206" r="9" fill="${p.skin}" stroke="${ink}" stroke-width="3"/><circle cx="143" cy="206" r="9" fill="${p.skin}" stroke="${ink}" stroke-width="3"/>
    <path d="M90 126l10 12 10-12" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="3"/>
    ${on('backpack') ? `<path d="M74 132l8 60M126 132l-8 60" stroke="#1f6f69" stroke-width="7" stroke-linecap="round"/>` : ''}
    <g transform="translate(40 10) scale(1.2)">${h.back}${h.front}</g>
  </svg>`;
}

// ---------- items: filled art with brown ink outlines ----------
const S = `stroke="${C.ink}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
export const ART = {
  laptop: `<path d="M12 14h40v26H12z" fill="#2b3550" ${S}/><path d="M16 18h32v18H16z" fill="#22336a"/><path d="M26 23l-4 4 4 4M38 23l4 4-4 4M33 22l-3 10" stroke="${C.sea}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M6 42h52l-4 7H10z" fill="#c9ced8" ${S}/>`,
  phone: `<rect x="20" y="6" width="24" height="52" rx="6" fill="#2b2420" ${S}/><rect x="23" y="12" width="18" height="36" rx="3" fill="${C.amber}"/><rect x="26" y="16" width="5" height="5" rx="1.5" fill="${C.paper}"/><rect x="33" y="16" width="5" height="5" rx="1.5" fill="${C.coral}"/><rect x="26" y="24" width="5" height="5" rx="1.5" fill="${C.teal}"/><circle cx="32" cy="53" r="2" fill="${C.paper}"/>`,
  tablet: `<rect x="10" y="8" width="44" height="48" rx="6" fill="#e9e4da" ${S}/><rect x="15" y="13" width="34" height="36" rx="2" fill="#fff"/><path d="M19 40c6-10 10 2 15-8s8-6 11-10" stroke="${C.coral}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M44 38l6 6" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`,
  keyboard: `<rect x="5" y="20" width="54" height="26" rx="5" fill="${C.coral}" ${S}/>${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${10 + i * 8}" y="25" width="6" height="6" rx="1.5" fill="${C.paper}"/>`).join('')}${[0, 1, 2, 3, 4].map((i) => `<rect x="${13 + i * 8}" y="33" width="6" height="6" rx="1.5" fill="${C.paper}"/>`).join('')}<rect x="20" y="40" width="24" height="3" rx="1.5" fill="${C.paper}"/>`,
  skateboard: `<rect x="8" y="26" width="48" height="10" rx="5" fill="${C.coral}" ${S}/><circle cx="18" cy="42" r="5" fill="${C.paper}" ${S}/><circle cx="46" cy="42" r="5" fill="${C.paper}" ${S}/>`,
  skates: `<path d="M16 12h14v22h14a6 6 0 0 1 6 6v4H16z" fill="#7d5aa6" ${S}/><circle cx="22" cy="52" r="5" fill="${C.amber}" ${S}/><circle cx="42" cy="52" r="5" fill="${C.amber}" ${S}/>`,
  powerbank: `<rect x="18" y="8" width="28" height="48" rx="7" fill="${C.leaf}" ${S}/><path d="M35 16l-9 15h8l-6 15 12-18h-8l5-12z" fill="${C.amber}" ${S}/>`,
  router: `<rect x="8" y="34" width="48" height="16" rx="5" fill="${C.paper}" ${S}/><circle cx="17" cy="42" r="2.4" fill="${C.leaf}"/><circle cx="25" cy="42" r="2.4" fill="${C.amber}"/><path d="M20 34V22M44 34V22" ${S}/><path d="M24 20a12 12 0 0 1 16 0M20 14a18 18 0 0 1 24 0" stroke="${C.teal}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  notebook: `<rect x="14" y="7" width="36" height="50" rx="4" fill="${C.indigo2}" ${S}/><path d="M20 7v50" stroke="${C.ink}" stroke-width="2.6"/><path d="M44 7v50" stroke="${C.coral}" stroke-width="4"/><rect x="25" y="16" width="14" height="8" rx="2" fill="${C.paper}"/>`,
  headphones: `<path d="M12 38v-6a20 20 0 0 1 40 0v6" fill="none" stroke="${C.amber}" stroke-width="7" stroke-linecap="round"/><path d="M12 38v-6a20 20 0 0 1 40 0v6" fill="none" ${S}/><rect x="6" y="34" width="14" height="20" rx="6" fill="${C.coral}" ${S}/><rect x="44" y="34" width="14" height="20" rx="6" fill="${C.coral}" ${S}/>`,
  backpack: `<rect x="14" y="14" width="36" height="44" rx="12" fill="${C.teal}" ${S}/><path d="M24 14a8 8 0 0 1 16 0" fill="none" ${S}/><rect x="20" y="36" width="24" height="16" rx="5" fill="#1f6f69" ${S}/><path d="M32 36v6" ${S}/>`,
  cap: `<path d="M10 40a22 22 0 0 1 44 0z" fill="${C.coral}" ${S}/><path d="M32 40h24c3 0 3 7-2 7H32z" fill="#c4553a" ${S}/><circle cx="32" cy="18" r="3" fill="${C.ink}"/><path d="M32 19v20" stroke="${C.ink}" stroke-opacity=".25" stroke-width="2"/>`,
  glasses: `<g fill="#bfe3ff" ${S}><circle cx="20" cy="34" r="11"/><circle cx="44" cy="34" r="11"/></g><path d="M31 33q1-3 2 0" ${S} fill="none"/><path d="M9 31l-4-8M55 31l4-8" ${S}/><path d="M15 30l5-4M39 30l5-4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
  medal: (glyph, fill) => `<path d="M22 4l6 18M42 4l-6 18" stroke="${C.coral}" stroke-width="7"/><circle cx="32" cy="38" r="20" fill="${fill}" ${S}/><circle cx="32" cy="38" r="14" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/><g transform="translate(20 26)">${glyph}</g>`,
};
const GLYPH = {
  push: `<circle cx="12" cy="4" r="3.4" fill="${C.ink}"/><circle cx="12" cy="20" r="3.4" fill="${C.ink}"/><path d="M12 7v10" stroke="${C.ink}" stroke-width="3"/>`,
  merge: `<circle cx="6" cy="4" r="3" fill="${C.ink}"/><circle cx="6" cy="20" r="3" fill="${C.ink}"/><circle cx="18" cy="12" r="3" fill="${C.ink}"/><path d="M6 7v10M6 9c0 3 4 3 9 3" stroke="${C.ink}" stroke-width="2.6" fill="none"/>`,
  launch: `<path d="M12 0c5 4 6 10 4 16l-4 4-4-4c-2-6-1-12 4-16z" fill="${C.ink}"/><circle cx="12" cy="9" r="2.4" fill="#fff"/>`,
  streak: `<path d="M12 0c1 6 8 8 8 15a8 8 0 0 1-16 0c0-4 2-6 4-8 0 3 2 4 3 4 0-4-1-7 1-11z" fill="${C.coral}" stroke="${C.ink}" stroke-width="2"/>`,
};
ART.firstpush = ART.medal(GLYPH.push, C.amber);
ART.merged = ART.medal(GLYPH.merge, '#9cd3c6');
ART.launch = ART.medal(GLYPH.launch, '#c9a7f5');
ART.streak = ART.medal(GLYPH.streak, C.amber);
export const art = (id, size = 64) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${typeof ART[id] === 'string' ? ART[id] : ''}</svg>`;

// ---------- phone apps: chunky glyphs in brown ink with one light detail ----------
const G = `fill="${C.ink}"`, L = `fill="${C.paper}"`;
const APP = {
  map: `<path d="M8 14l11-5 10 5 11-5v27l-11 5-10-5-11 5z" ${L} stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/><path d="M24 30s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z" ${G}/><circle cx="24" cy="18" r="2.6" fill="${C.sea}"/>`,
  bag: `<rect x="9" y="15" width="30" height="26" rx="7" ${G}/><path d="M17 15v-3a7 7 0 0 1 14 0v3" fill="none" stroke="${C.ink}" stroke-width="4"/><rect x="18" y="25" width="12" height="6" rx="2" ${L}/>`,
  board: `<rect x="7" y="8" width="34" height="26" rx="4" ${G}/><rect x="11" y="12" width="10" height="9" rx="1.5" fill="${C.amber}"/><rect x="24" y="12" width="13" height="7" rx="1.5" ${L}/><rect x="24" y="22" width="9" height="8" rx="1.5" fill="#9cd3c6"/><path d="M15 34v8M33 34v8" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`,
  people: `<circle cx="18" cy="17" r="7" ${G}/><circle cx="33" cy="19" r="6" ${G}/><path d="M5 40c1-9 6-13 13-13s12 4 13 13zM27 40c1-6 3-10 8-10s8 4 9 10z" ${G}/><circle cx="16" cy="16" r="1.6" ${L}/><circle cx="20" cy="16" r="1.6" ${L}/>`,
  camera: `<path d="M6 16h9l3-5h12l3 5h9v24H6z" ${G} stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/><circle cx="24" cy="27" r="8" ${L}/><circle cx="24" cy="27" r="4.5" fill="#7d5aa6"/><circle cx="22.5" cy="25.5" r="1.3" fill="#fff"/>`,
  car: `<path d="M7 30l3-11c1-3 3-4 5-4h18c2 0 4 1 5 4l3 11v8H7z" ${G}/><rect x="13" y="19" width="22" height="8" rx="2" fill="${C.amber}"/><circle cx="15" cy="38" r="4" ${L} stroke="${C.ink}" stroke-width="2.5"/><circle cx="33" cy="38" r="4" ${L} stroke="${C.ink}" stroke-width="2.5"/>`,
  recycle: `<rect x="10" y="10" width="28" height="5" rx="2" ${G}/><path d="M13 15h22l-2.5 26h-17z" ${G}/><path d="M24 21l4 6h-8zM19 34h10" fill="none" stroke="${C.ink}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`,
  build: `<rect x="6" y="26" width="36" height="5" rx="2" ${G}/><path d="M11 31v9M37 31v9" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/><rect x="8" y="19" width="32" height="4" rx="2" ${G}/><path d="M30 6l8 8-3 3-8-8z" ${G}/><path d="M28 12L14 26" stroke="${C.ink}" stroke-width="3.5" stroke-linecap="round"/>`,
  cities: `<path d="M24 6l16 9-16 9-16-9z" ${L} stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/><path d="M8 24l16 9 16-9M8 32l16 9 16-9" fill="none" stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><rect x="20" y="10" width="6" height="7" ${G}/>`,
  weather: `<circle cx="17" cy="17" r="8" fill="${C.amber}" stroke="${C.ink}" stroke-width="2.5"/><path d="M15 38a8 8 0 0 1 1-16 10 10 0 0 1 19 3 6 6 0 0 1-1 13z" ${G}/><path d="M20 42l-2 3M28 42l-2 3" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`,
  settings: `<path d="M21 5h6l1 5 4 2 5-3 4 4-3 5 2 4 5 1v6l-5 1-2 4 3 5-4 4-5-3-4 2-1 5h-6l-1-5-4-2-5 3-4-4 3-5-2-4-5-1v-6l5-1 2-4-3-5 4-4 5 3 4-2z" ${G}/><circle cx="24" cy="24" r="6" ${L}/>`,
  home: `<path d="M6 24L24 9l18 15" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 22v18h26V22L24 12z" ${G}/><rect x="20" y="28" width="8" height="12" ${L}/>`,
  atm: `<rect x="8" y="6" width="32" height="36" rx="5" ${G}/><rect x="13" y="11" width="22" height="12" rx="2" ${L}/><rect x="15" y="29" width="18" height="4" rx="2" ${L}/><path d="M18 36h12" stroke="${C.paper}" stroke-width="3" stroke-linecap="round"/>`,
  food: `<path d="M8 22h32a16 16 0 0 1-32 0z" ${G}/><path d="M14 18c2-4 6-4 8 0M24 16c2-4 6-4 8 0" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/><path d="M12 26h24" stroke="${C.paper}" stroke-width="3" stroke-linecap="round"/>`,
  cafe: `<path d="M9 18h24v10a10 10 0 0 1-10 10h-4A10 10 0 0 1 9 28z" ${G}/><path d="M33 21h3a5 5 0 0 1 0 10h-3" fill="none" stroke="${C.ink}" stroke-width="3.5"/><path d="M17 8c-2 3 2 5 0 8M24 8c-2 3 2 5 0 8" fill="none" stroke="${C.ink}" stroke-width="2.6" stroke-linecap="round"/>`,
  fuel: `<rect x="9" y="8" width="20" height="32" rx="4" ${G}/><rect x="13" y="12" width="12" height="8" rx="2" ${L}/><path d="M29 16l6 5v14a3 3 0 0 0 6 0V22l-4-6" fill="none" stroke="${C.ink}" stroke-width="3.2" stroke-linejoin="round"/>`,
  bus: `<rect x="8" y="8" width="32" height="28" rx="7" ${G}/><rect x="12" y="13" width="24" height="10" rx="2" ${L}/><circle cx="15" cy="39" r="3.5" ${G}/><circle cx="33" cy="39" r="3.5" ${G}/><circle cx="14" cy="29" r="2" ${L}/><circle cx="34" cy="29" r="2" ${L}/>`,
  shop: `<path d="M8 18l4-10h24l4 10z" ${G}/><path d="M10 18v20h28V18" fill="none" stroke="${C.ink}" stroke-width="3.5"/><rect x="20" y="26" width="8" height="12" ${G}/><path d="M8 18a4 4 0 0 0 8 0 4 4 0 0 0 8 0 4 4 0 0 0 8 0 4 4 0 0 0 8 0" fill="none" stroke="${C.paper}" stroke-width="2"/>`,
  work: `<rect x="10" y="10" width="28" height="19" rx="2" ${G}/><path d="M5 34h38l-3 5H8z" ${G}/><path d="M20 16l-3 3 3 3M28 16l3 3-3 3" fill="none" stroke="${C.paper}" stroke-width="2.6" stroke-linecap="round"/>`,
  gym: `<rect x="5" y="17" width="6" height="14" rx="2" ${G}/><rect x="37" y="17" width="6" height="14" rx="2" ${G}/><rect x="11" y="13" width="5" height="22" rx="2" ${G}/><rect x="32" y="13" width="5" height="22" rx="2" ${G}/><path d="M16 24h16" stroke="${C.ink}" stroke-width="4"/>`,
  wallet: `<rect x="6" y="12" width="36" height="26" rx="6" ${G}/><rect x="28" y="21" width="14" height="9" rx="3" ${L}/><circle cx="33" cy="25.5" r="2" ${G}/><path d="M10 12l18-6 4 6" fill="none" stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="round"/>`,
  // Cities: the globe, with a pin on Lagos
  globe: `<circle cx="24" cy="25" r="16" ${L} stroke="${C.ink}" stroke-width="3.5"/><path d="M8 25h32M24 9c-6 5-6 27 0 32M24 9c6 5 6 27 0 32" fill="none" stroke="${C.ink}" stroke-width="2.5"/><path d="M33 20s-6-5-6-9a6 6 0 0 1 12 0c0 4-6 9-6 9z" fill="${C.coral}" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="33" cy="11" r="2" ${L}/>`,
  // Aerial: a drone looking down
  aerial: `<path d="M12 14l24 20M36 14L12 34" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/><g ${G}><ellipse cx="10" cy="12" rx="7" ry="2.6"/><ellipse cx="38" cy="12" rx="7" ry="2.6"/><ellipse cx="10" cy="36" rx="7" ry="2.6"/><ellipse cx="38" cy="36" rx="7" ry="2.6"/></g><rect x="16" y="18" width="16" height="12" rx="4" ${G}/><circle cx="24" cy="24" r="3.6" fill="${C.sea}"/><path d="M20 34l-3 8M28 34l3 8" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 3"/>`,
  // Pets: a paw print
  paw: `<ellipse cx="24" cy="32" rx="10" ry="8.5" ${G}/><ellipse cx="11" cy="21" rx="4.2" ry="5.4" ${G} transform="rotate(-18 11 21)"/><ellipse cx="19" cy="13" rx="4.2" ry="5.6" ${G}/><ellipse cx="29" cy="13" rx="4.2" ry="5.6" ${G}/><ellipse cx="37" cy="21" rx="4.2" ry="5.4" ${G} transform="rotate(18 37 21)"/><ellipse cx="24" cy="33" rx="4" ry="2.5" fill="${C.coral}" opacity=".9"/>`,
  // Wardrobe: a shirt on a hanger
  hanger: `<path d="M24 12a3.5 3.5 0 1 1 3.5-3.5" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/><path d="M24 12v3M8 22l16-7 16 7" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 20l-7 6 4 5 4-3v14h18V28l4 3 4-5-7-6-5-1a5 5 0 0 1-10 0z" ${G}/><path d="M21 19a3 3 0 0 0 6 0" fill="none" stroke="${C.paper}" stroke-width="2"/>`,
  // Sports: a basketball
  sport: `<circle cx="24" cy="24" r="16" fill="${C.coral}" stroke="${C.ink}" stroke-width="3.5"/><path d="M8 24h32M24 8v32M12.5 12.5c6 5 6 18 0 23M35.5 12.5c-6 5-6 18 0 23" fill="none" stroke="${C.ink}" stroke-width="2.5"/>`,
  help: `<path d="M8 10h32v22H22l-8 7v-7H8z" ${G} stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/><path d="M20 17a4 4 0 1 1 5 4c-1 1-1 2-1 3" fill="none" stroke="${C.paper}" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="28" r="1.8" ${L}/>`,
};
export const appIcon = (id) => `<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">${APP[id] || ''}</svg>`;

// ---------- places: little buildings on paper islands (the map's right column) ----------
const isle = `<ellipse cx="60" cy="80" rx="54" ry="10" fill="#fff" opacity=".55"/><ellipse cx="60" cy="78" rx="48" ry="8" fill="${C.paper}"/>`;
const PLACE = {
  board: `${isle}<path d="M34 72V40M86 72V40" stroke="${C.ink}" stroke-width="4"/><rect x="24" y="22" width="72" height="40" rx="5" fill="#5a3d2a" stroke="${C.ink}" stroke-width="3"/><rect x="30" y="28" width="16" height="12" rx="2" fill="${C.amber}"/><rect x="50" y="28" width="20" height="10" rx="2" fill="${C.paper}"/><rect x="74" y="28" width="16" height="14" rx="2" fill="#9cd3c6"/><rect x="34" y="44" width="22" height="12" rx="2" fill="#f6a8a0"/><rect x="62" y="44" width="16" height="12" rx="2" fill="${C.paper}"/>`,
  build: `${isle}<circle cx="86" cy="40" r="16" fill="${C.leaf}" stroke="${C.ink}" stroke-width="3"/><path d="M86 54v20" stroke="${C.ink}" stroke-width="5"/><rect x="22" y="56" width="50" height="6" rx="2" fill="#8a5a3a" stroke="${C.ink}" stroke-width="2.6"/><rect x="22" y="46" width="50" height="6" rx="2" fill="#8a5a3a" stroke="${C.ink}" stroke-width="2.6"/><path d="M28 62v12M66 62v12" stroke="${C.ink}" stroke-width="4"/><path d="M14 74l6-6 6 6" fill="none" stroke="${C.teal}" stroke-width="3" stroke-dasharray="3 3"/>`,
  hub: `${isle}<rect x="22" y="22" width="76" height="52" fill="#d9d2c4" stroke="${C.ink}" stroke-width="3"/><rect x="18" y="14" width="84" height="10" rx="2" fill="${C.teal}" stroke="${C.ink}" stroke-width="3"/>${[0, 1, 2, 3].map((i) => `<rect x="${30 + i * 17}" y="30" width="11" height="11" rx="1.5" fill="${C.amber}"/>`).join('')}<rect x="50" y="52" width="20" height="22" fill="${C.indigo2}" stroke="${C.ink}" stroke-width="2.6"/><rect x="30" y="52" width="12" height="10" fill="#bfe3ff"/><rect x="78" y="52" width="12" height="10" fill="#bfe3ff"/>`,
  home: `${isle}<path d="M28 42l32-24 32 24" fill="${C.coral}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/><rect x="34" y="40" width="52" height="34" fill="${C.paper2}" stroke="${C.ink}" stroke-width="3"/><rect x="54" y="52" width="14" height="22" fill="${C.teal}" stroke="${C.ink}" stroke-width="2.6"/><rect x="40" y="48" width="10" height="10" fill="${C.amber}" stroke="${C.ink}" stroke-width="2"/><rect x="72" y="48" width="10" height="10" fill="${C.amber}" stroke="${C.ink}" stroke-width="2"/>`,
};
export const placeArt = (id) => `<svg viewBox="0 0 120 90" width="120" height="90" aria-hidden="true">${PLACE[id] || PLACE.home}</svg>`;

// the title banner with folded tails
export const ribbonSVG = (w = 360) => `<svg viewBox="0 0 ${w} 84" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30h40v44H0l14-22z" fill="#c98f1f"/><path d="M${w} 30h-40v44h40l-14-22z" fill="#c98f1f"/><path d="M28 74l12-8v8zM${w - 28} 74l-12-8v8z" fill="#8f6514"/><rect x="28" y="6" width="${w - 56}" height="62" rx="6" fill="${C.amber}"/><rect x="28" y="56" width="${w - 56}" height="12" fill="#e3a21f"/></svg>`;

// shared CSS for paper surfaces and key chips
export const KIT_CSS = `
/* a game, not a page (Elvis, 10 October 2026): nothing selects, no callout on a long press, no grey
   flash on a tap; text you type into still selects as normal */
html, body, body * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
input, textarea, select, [contenteditable="true"], input *, textarea * { -webkit-user-select: text; user-select: text; -webkit-touch-callout: default; }

.bw-paper { background: ${C.paper}; color: ${C.ink}; border-radius: 22px; box-shadow: 0 5px 0 rgba(59,42,32,.18), 0 18px 40px rgba(10,14,30,.28); font-family: ${FONT}; }
.bw-chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px 6px 6px; border-radius: 999px; background: ${C.paper}; color: ${C.ink};
  font: 700 15px/1 ${FONT}; box-shadow: 0 3px 0 rgba(59,42,32,.2); }
.bw-chip b { display: grid; place-items: center; min-width: 24px; height: 24px; padding: 0 6px; border-radius: 999px; background: ${C.ink}; color: ${C.paper}; font: 700 12px/1 ${FONT}; }
`;

// The skin (world bible 11.1): one look for every panel on the street, Codex's chrome included.
// Codex's chrome is built on CSS variables, so the skin redefines them on <body> instead of editing
// index.html or ui.js; nothing in those files changes. Applied with body.bw-skin.
export const SKIN_CSS = `
body.bw-skin { --glass: ${C.paper}; --solid: #fffaf0; --fg: ${C.ink}; --fg2: ${C.ink2}; --fg3: #a08c74; --line: rgba(59,42,32,.08);
  --hover: rgba(59,42,32,.07); --seg: rgba(59,42,32,.12); --accent: ${C.amber}; --accent-ink: ${C.ink}; --accent-text: #a8680a; --ok: ${C.teal};
  --shadow: 0 4px 0 rgba(59,42,32,.2), 0 12px 28px rgba(10,14,30,.22); --lbl: ${C.paper}; --r: 22px; font-family: ${FONT}; }
body.bw-skin .glass { border: 0; backdrop-filter: none; -webkit-backdrop-filter: none; }
body.bw-skin #brand { padding: 8px 16px 8px 8px; border-radius: 999px; }
body.bw-skin #brand .mark { border-radius: 50%; width: 32px; height: 32px; box-shadow: inset 0 -3px 0 rgba(59,42,32,.18); }
body.bw-skin #brand b { font: 800 16px/1.1 ${FONT}; letter-spacing: 0; }
body.bw-skin #brand span.s, body.bw-skin #src { font: 600 12px/1.2 ${FONT}; }
body.bw-skin #src { background: rgba(42,157,148,.12); color: ${C.teal}; }
body.bw-skin #toolbar { border-radius: 999px; padding: 5px; }
body.bw-skin .seg { border-radius: 999px; background: rgba(59,42,32,.07); }
body.bw-skin .seg button { border-radius: 999px; font: 700 14px/1 ${FONT}; color: ${C.ink2}; height: 32px; }
body.bw-skin .seg button[aria-pressed='true'] { background: ${C.teal} !important; color: #fff; box-shadow: 0 2px 0 #1d6f69 !important; }
body.bw-skin .ib { border-radius: 50%; color: ${C.ink}; }
body.bw-skin .ib svg { stroke-width: 2.3; }
body.bw-skin .ib:hover { background: rgba(242,179,61,.25); }
body.bw-skin #dock { border-radius: 999px; padding: 6px 5px; }
body.bw-skin #bbtn { border-radius: 999px; height: 42px; padding: 0 18px 0 14px; font: 800 15px/1 ${FONT}; color: ${C.ink}; }
body.bw-skin #bbtn svg { color: ${C.teal}; stroke-width: 2.3; }
body.bw-skin #bbtn .n { display: inline-grid; place-items: center; min-width: 22px; height: 22px; border-radius: 999px; background: ${C.amber}; color: ${C.ink}; font-size: 12px; }
body.bw-skin #blist, body.bw-skin #card, body.bw-skin #help { border-radius: 24px; }
body.bw-skin #blist h2, body.bw-skin .sec h4 { font: 800 14px/1 ${FONT}; text-transform: none; letter-spacing: 0; color: ${C.teal}; }
body.bw-skin .row { border-radius: 14px; font-family: ${FONT}; }
body.bw-skin .av { border-radius: 50%; font: 800 16px/1 ${FONT}; }
body.bw-skin .c-head h3 { font: 800 19px/1.1 ${FONT}; letter-spacing: 0; }
body.bw-skin .chip { font: 700 12px/1.2 ${FONT}; padding: 4px 10px; background: ${C.paper2}; }
body.bw-skin .chip.ver { background: rgba(42,157,148,.14); }
body.bw-skin .stat { border-radius: 16px; background: ${C.paper2}; }
body.bw-skin .stat b { font: 800 18px/1.1 ${FONT}; }
body.bw-skin .more { border-radius: 999px; background: ${C.paper2}; font: 700 14px/1 ${FONT}; color: ${C.ink}; }
body.bw-skin .go { border-radius: 999px; font: 800 15px/1 ${FONT}; box-shadow: 0 3px 0 #c98f1f; }
body.bw-skin #help h2 { font: 800 20px/1.1 ${FONT}; }
body.bw-skin #help dd { font: 600 14px/1.3 ${FONT}; }
body.bw-skin kbd { border: 0; border-radius: 999px; background: ${C.ink}; color: ${C.paper}; font: 700 12px/1.6 ${FONT}; padding: 1px 8px; }
body.bw-skin #toast { font: 700 15px/1.3 ${FONT}; padding: 10px 20px; }
body.bw-skin .lbl { border: 0; font: 700 13px/1.4 ${FONT}; padding: 3px 11px 3px 9px; box-shadow: 0 3px 0 rgba(59,42,32,.2); }
body.bw-skin #loader { background: ${C.sea}; color: ${C.ink}; font-family: ${FONT}; }
body.bw-skin #loader b { color: ${C.ink}; }
@media (max-width: 600px) {
  body.bw-skin #brand { max-width: calc(100vw - 236px); padding-right: 12px; }
  body.bw-skin #brand span.s { display: none; }
  body.bw-skin .seg button { padding: 0 9px; font-size: 13px; }
  body.bw-skin #toolbar .sep { display: none; }
}
`;
