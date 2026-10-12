// Card art (world bible 11.4): each city's card has its own colour and a landmark drawn across the
// bottom, the way a transit or ID card carries its city. Flat paper-cut shapes in two tones, so the
// type over them stays readable. viewBox 0 0 380 240 (a card is 1.586 : 1).

// district -> its city, the card's colours (light to dark), the ink for text, and the landmark
export const CARD_CITY = {
  Yaba: { city: 'Lagos', from: '#3fb0e0', to: '#1b5f97', ink: '#04213b', art: 'lagos', what: 'Lekki-Ikoyi Link Bridge' },
  Wuse: { city: 'Abuja', from: '#f0cf72', to: '#b98a2c', ink: '#3a2706', art: 'abuja', what: 'Zuma Rock and the National Mosque' },
  'Old GRA': { city: 'Port Harcourt', from: '#5cc98b', to: '#1f7a4a', ink: '#05301a', art: 'ph', what: 'The Garden City' },
  Uyo: { city: 'Uyo', from: '#f08bb8', to: '#a83a72', ink: '#3a0624', art: 'uyo', what: 'Ibom Plaza' },
  Kilimani: { city: 'Nairobi', from: '#a995ea', to: '#5b47a8', ink: '#170d3a', art: 'nairobi', what: 'KICC' },
  Osu: { city: 'Accra', from: '#ef7a6a', to: '#a8302a', ink: '#3a0806', art: 'accra', what: 'Independence Arch' },
};
export const cityFor = (district) => CARD_CITY[district] || { city: district, from: '#8fcf7c', to: '#4f9a55', ink: '#0f2a13', art: 'lagos', what: '' };

const L = 'rgba(255,255,255,.30)', D = 'rgba(0,0,0,.16)', S = 'rgba(255,255,255,.55)';
const ART = {
  // the lagoon, the Lekki-Ikoyi Link's single pylon with its fan of cables, Eko Atlantic behind
  lagos: `<path d="M0 214h380v26H0z" fill="${D}"/>
    <g fill="${L}"><rect x="226" y="118" width="22" height="96"/><rect x="252" y="96" width="18" height="118"/><rect x="274" y="132" width="26" height="82"/><rect x="304" y="108" width="20" height="106"/><rect x="328" y="140" width="30" height="74"/></g>
    <g stroke="${S}" stroke-width="2.2"><path d="M110 92L40 196M110 92L60 196M110 92L80 196M110 92L140 196M110 92L160 196M110 92L180 196"/></g>
    <path d="M104 90h12l4 124h-20z" fill="${S}"/><path d="M0 196h220v8H0z" fill="${S}"/>
    <g fill="${D}"><path d="M0 222c30-6 60 6 90 0s60-6 90 0 60 6 90 0 60-6 110 0v18H0z"/></g>`,
  // Zuma Rock, the great dome north of the city, and the National Mosque's gold dome and minarets
  abuja: `<path d="M0 214h380v26H0z" fill="${D}"/>
    <path d="M20 214c10-70 40-112 92-118 50-4 82 40 96 118z" fill="${L}"/>
    <g stroke="${D}" stroke-width="3" fill="none"><path d="M78 120c-8 20-10 52-6 90M112 108c-4 30-2 70 4 104M150 116c6 26 12 58 14 96"/></g>
    <g fill="${S}"><path d="M260 214v-44a36 36 0 0 1 72 0v44z"/><rect x="242" y="128" width="8" height="86"/><rect x="342" y="128" width="8" height="86"/><path d="M246 116l4 12h-8zM346 116l4 12h-8z"/><rect x="292" y="122" width="8" height="12"/></g>`,
  // the Garden City: palms along the river and the Pleasure Park's wheel
  ph: `<path d="M0 214h380v26H0z" fill="${D}"/>
    <g stroke="${S}" stroke-width="3" fill="none"><circle cx="268" cy="132" r="58"/><path d="M268 74v116M210 132h116M227 91l82 82M309 91l-82 82"/></g>
    <path d="M250 214l18-40 18 40z" fill="${S}"/>
    <g fill="${L}"><rect x="54" y="120" width="7" height="94" rx="3"/><rect x="128" y="138" width="6" height="76" rx="3"/></g>
    <g fill="${S}"><path d="M57 120c-30-2-44 10-52 22 18-10 34-12 52-8zM57 120c26-8 44-2 54 8-18-4-36-4-54 0zM57 120c-8-22 2-36 12-42-2 16-6 28-12 42zM131 138c-24-2-36 8-42 18 14-8 28-10 42-6zM131 138c20-6 36-2 44 6-14-2-30-2-44 0z"/></g>
    <path d="M0 226c40-6 80 6 120 0s80-6 120 0 80 6 140 0v14H0z" fill="${D}"/>`,
  // Ibom Plaza's tiered fountain and the arches of the stadium beyond
  uyo: `<path d="M0 214h380v26H0z" fill="${D}"/>
    <g stroke="${L}" stroke-width="6" fill="none"><path d="M196 214c0-60 34-100 84-100s84 40 84 100M226 214c0-44 22-72 54-72s54 28 54 72"/></g>
    <g fill="${S}"><path d="M44 214h120l-10-18H54z"/><path d="M70 196h68l-6-16H76z"/><rect x="98" y="132" width="12" height="48"/><path d="M84 132h40l-8-10H92z"/></g>
    <g stroke="${S}" stroke-width="2.5" fill="none"><path d="M104 120c-14-24-34-26-46-14M104 120c14-24 34-26 46-14M104 118c0-20 4-30 0-40"/></g>`,
  // KICC, the tower with its round crown, and an acacia
  nairobi: `<path d="M0 214h380v26H0z" fill="${D}"/>
    <g fill="${S}"><rect x="232" y="88" width="34" height="126" rx="6"/><ellipse cx="249" cy="84" rx="30" ry="9"/><rect x="246" y="62" width="6" height="16"/></g>
    <g fill="${L}"><rect x="200" y="168" width="98" height="46"/><path d="M286 214v-30a26 26 0 0 1 52 0v30z"/></g>
    <rect x="84" y="150" width="7" height="64" fill="${L}"/><path d="M28 152c18-18 96-22 124 0-40 10-84 10-124 0z" fill="${S}"/>`,
  // the Independence Arch (Black Star Gate) with its star
  accra: `<path d="M0 214h380v26H0z" fill="${D}"/>
    <path d="M150 214v-96h150v96h-30v-60a45 45 0 0 0-90 0v60z" fill="${S}"/>
    <rect x="140" y="108" width="170" height="12" fill="${L}"/>
    <path d="M225 52l9 22h24l-19 14 7 23-21-14-21 14 7-23-19-14h24z" fill="${S}"/>
    <g fill="${L}"><rect x="30" y="160" width="60" height="54"/><path d="M26 160h68l-8-14H34z"/><rect x="330" y="150" width="40" height="64"/></g>`,
  // Eko Design Studio: a studio front and a pencil
  eko: `<path d="M0 214h380v26H0z" fill="${D}"/>
    <g fill="${L}"><rect x="190" y="110" width="160" height="104"/><rect x="200" y="96" width="140" height="18"/></g>
    <g fill="${S}"><rect x="210" y="132" width="34" height="34"/><rect x="254" y="132" width="34" height="34"/><rect x="298" y="132" width="34" height="34"/><rect x="254" y="176" width="34" height="38"/></g>
    <path d="M40 200l92-92 18 18-92 92-24 6z" fill="${S}"/><path d="M132 108l10-10 18 18-10 10z" fill="${L}"/>`,
  // an estate: the gate between its pillars, the houses behind
  estate: `<path d="M0 214h380v26H0z" fill="${D}"/>
    <g fill="${L}"><path d="M200 214v-60l40-30 40 30v60z"/><path d="M290 214v-50l34-26 34 26v50z"/></g>
    <g fill="${S}"><rect x="40" y="120" width="22" height="94"/><rect x="150" y="120" width="22" height="94"/><rect x="34" y="112" width="34" height="10"/><rect x="144" y="112" width="34" height="10"/></g>
    <g stroke="${S}" stroke-width="4"><path d="M62 150h88M62 196h88M78 150v46M96 150v46M114 150v46M132 150v46"/></g>`,
};
export const cardArt = (key) => `<svg class="art" viewBox="0 0 380 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${ART[key] || ''}</svg>`;
