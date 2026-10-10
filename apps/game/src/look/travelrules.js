// Travel in Builders World (world bible 6.8): where you can fly, what it costs and what you need. These are
// the game's rules, loosely after the real ones: flying within your own country needs any ID (your resident
// card will do); between ECOWAS countries (Nigeria and Ghana) a passport is enough; anywhere else needs a
// passport and that country's electronic travel authorisation. Every city also asks for proof of funds: you
// must hold enough Efforts to show you can look after yourself there, and the richer a city's tech scene,
// the more it asks. Fares are paid; proof of funds is only shown. Nothing here touches the page, so the
// rules are tested on their own (tests/travel.test.js).

export const AIRPORTS = {
  Lagos: { code: 'LOS', name: 'Murtala Muhammed International Airport', country: 'Nigeria', lat: 6.5774, lon: 3.3212 },
  Abuja: { code: 'ABV', name: 'Nnamdi Azikiwe International Airport', country: 'Nigeria', lat: 9.0068, lon: 7.2632 },
  'Port Harcourt': { code: 'PHC', name: 'Port Harcourt International Airport', country: 'Nigeria', lat: 5.0155, lon: 6.9496 },
  Uyo: { code: 'QUO', name: 'Victor Attah International Airport', country: 'Nigeria', lat: 4.8725, lon: 8.0930 },
  Nairobi: { code: 'NBO', name: 'Jomo Kenyatta International Airport', country: 'Kenya', lat: -1.3192, lon: 36.9278 },
  Accra: { code: 'ACC', name: 'Kotoka International Airport', country: 'Ghana', lat: 5.6052, lon: -0.1668 },
};

// how strong each city's tech scene is (1 to 5), and so the proof of funds it asks for, in Efforts
export const ECOSYSTEM = {
  Lagos: { tier: 5, note: 'Africa\'s biggest startup scene: Yaba, Lekki, Ikoyi' },
  Nairobi: { tier: 5, note: 'Silicon Savannah: Kilimani, Westlands, iHub' },
  Accra: { tier: 4, note: 'West Africa\'s fast riser: Osu, Airport City' },
  Abuja: { tier: 3, note: 'Government tech and fintech in Wuse and the CBD' },
  'Port Harcourt': { tier: 2, note: 'Energy tech in the Garden City' },
  Uyo: { tier: 1, note: 'A young scene, growing fast' },
};
export const proofOfFunds = (city) => [0, 4000, 8000, 15000, 25000, 40000][ECOSYSTEM[city]?.tier ?? 1];

const ECOWAS = new Set(['Nigeria', 'Ghana']);
export const ETA_FEE = 4000, PASSPORT_FEE = 3000;
export const PASSPORT_PREFIX = { Nigeria: 'A', Ghana: 'G', Kenya: 'AK' };

// great-circle distance, km
export function km(a, b) {
  const A = AIRPORTS[a], B = AIRPORTS[b]; if (!A || !B) return 0;
  const r = Math.PI / 180, dl = (B.lat - A.lat) * r, dn = (B.lon - A.lon) * r;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(A.lat * r) * Math.cos(B.lat * r) * Math.sin(dn / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
// a one-way fare in Efforts: a base, a rate per km, a little more to cross a border; rounded to 100
export function fare(from, to) {
  if (from === to || !AIRPORTS[from] || !AIRPORTS[to]) return 0;
  const intl = AIRPORTS[from].country !== AIRPORTS[to].country;
  return Math.round((2000 + km(from, to) * 6 + (intl ? 3000 : 0)) / 100) * 100;
}
// flight time in minutes: 30 on the ground and in the climb, then about 750 km an hour
export const flightMinutes = (from, to) => Math.round(30 + (km(from, to) / 750) * 60);

/** What crossing from city `from` to city `to` asks of a traveller of `nationality`. */
export function entryRule(nationality, to) {
  const country = AIRPORTS[to]?.country;
  if (!country) return { kind: 'unknown' };
  if (country === nationality) return { kind: 'domestic', document: 'any ID', label: 'Domestic: any ID (your resident card will do)' };
  if (ECOWAS.has(country) && ECOWAS.has(nationality)) return { kind: 'ecowas', document: 'passport', label: 'ECOWAS: your passport, no visa' };
  return { kind: 'eta', document: 'passport', authorisation: country, fee: ETA_FEE, label: `Passport and a ${country} electronic travel authorisation` };
}

/**
 * Can this traveller fly from `from` to `to` now? `t`: { nationality, balance, passport, etas: [country], id: bool }.
 * Returns { ok, fare, needs: [what is missing, in words], rule, proof }.
 */
export function canTravel(from, to, t) {
  const rule = entryRule(t.nationality, to), f = fare(from, to), proof = proofOfFunds(to);
  const needs = [];
  if (!AIRPORTS[to] || from === to) return { ok: false, fare: 0, needs: ['Pick another city'], rule, proof };
  if (rule.kind === 'domestic' && !t.id && !t.passport) needs.push('An ID: your resident card or a passport');
  if (rule.kind !== 'domestic' && !t.passport) needs.push('A passport (apply at the Immigration Centre)');
  if (rule.kind === 'eta' && !(t.etas || []).includes(rule.authorisation)) needs.push(`A ${rule.authorisation} travel authorisation (Immigration Centre, ${ETA_FEE.toLocaleString('en-US')} Efforts)`);
  if (t.balance < f) needs.push(`The fare: ${f.toLocaleString('en-US')} Efforts`);
  else if (t.balance - f < proof) needs.push(`Proof of funds: ${proof.toLocaleString('en-US')} Efforts left after the fare (${to}'s tech scene asks for it)`);
  return { ok: needs.length === 0, fare: f, needs, rule, proof };
}

// a passport number for a nationality, from a seed (stable for the same player)
export function passportNumber(nationality, seed = Math.random()) {
  const n = String(Math.floor((Math.abs(seed) % 1) * 1e8)).padStart(8, '0');
  return `${PASSPORT_PREFIX[nationality] || 'P'}${n}`;
}
