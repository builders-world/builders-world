// The city knowledge base (cities/KNOWLEDGE.md; Elvis, 12 October 2026: "in Nairobi, people shouldn't be speaking
// Pidgin. They should either speak Swahili or English ... build out a robust knowledge base for every single city, so we
// know how NPCs will interact ... so that everything feels unique to each city"). Each country and each city has a
// knowledge.json: how people are named, which languages they speak on the street, how they greet each other, what they
// say about the weather, what they eat, how they get around. knowledgeload.js loads the current city's (and its
// country's) before the world is built; everything that names a person or puts words in their mouth asks this module.

let K = { country: {}, city: {}, key: null };

/** Set the knowledge (knowledgeload.js, and the tests). */
export function setKnowledge(country, city, key = 'test') { K = { country: country || {}, city: city || {}, key }; }
export const knowledge = () => K;

// a steady number in [0, 1) from any seed, so the same person always gets the same name and voice
export function unit(seed) {
  let h = 2166136261; const s = String(seed);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
const pickBy = (u, list) => list[Math.floor(u * list.length) % list.length];
function weighted(u, weights) {
  const e = Object.entries(weights || {}).filter(([, w]) => w > 0); if (!e.length) return null;
  const tot = e.reduce((a, [, w]) => a + w, 0); let x = u * tot;
  for (const [k, w] of e) { x -= w; if (x <= 0) return k; }
  return e[e.length - 1][0];
}

/**
 * A person's name in this city: a community by the city's mix, then a first name (theirs, or the English or Christian
 * or Muslim one many people carry with it) and a family name, in the country's order.
 * @param seed  anything steady about the person (an id, an index)
 * @param sex   'm' or 'f'
 */
export function nameFor(seed, sex = unit(`${seed}:sex`) < 0.5 ? 'm' : 'f') {
  const N = K.country.names; if (!N?.groups) return null;
  const group = weighted(unit(`${seed}:group`), K.city.names?.weights || N.weights) || Object.keys(N.groups)[0];
  const G = N.groups[group] || Object.values(N.groups)[0];
  const own = G.given?.[sex] || [], also = G.also?.[sex] || [];
  const useAlso = also.length && unit(`${seed}:also`) < 0.45;
  const first = useAlso ? pickBy(unit(`${seed}:first`), also) : pickBy(unit(`${seed}:first`), own.length ? own : also);
  // family_f: what women carry where it differs from men (Akhmetova for Akhmetov; Javanese second names like Lestari)
  const fam = sex === 'f' && G.family_f?.length ? G.family_f : G.family;
  let family = pickBy(unit(`${seed}:family`), fam?.length ? fam : own);
  if (family === first) family = pickBy(unit(`${seed}:family2`), fam || own);
  // a group can put the family name first though its country does not (Chinese names in Singapore and Malaysia)
  const order = G.order || N.order || 'given family';
  // two family names where people carry both (the father's, then the mother's: Mexico, Colombia, Chile, Peru, Brazil)
  if (order === 'given family family') {
    let second = pickBy(unit(`${seed}:family-2`), G.family?.length ? G.family : own);
    if (second === family) second = pickBy(unit(`${seed}:family-3`), G.family || own);
    if (second !== family) return { first, family, second, sex, group, full: `${first} ${family} ${second}` };
  }
  return { first, family, sex, group, full: order.startsWith('family') ? `${family} ${first}` : `${first} ${family}` };
}

/** The registers heard on this city's streets, with their shares: { en: 0.4, sheng: 0.35, ... }. */
export function street() { return K.city.street || { en: 1 }; }
/**
 * Which register a person speaks: the city's mix, leaning to English for the well-off (tier 0) and to the street
 * language for the hustlers (tier 2).
 */
export function registerFor(tier = 1, seed = Math.random()) {
  const s = street(), lean = [2.2, 1, 0.45][tier] ?? 1;
  const w = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, k === 'en' ? v * lean : v / lean]));
  return weighted(typeof seed === 'number' ? seed : unit(seed), w) || 'en';
}
/** A chat line of a kind (greet, reply, sunny, rain, bye, busy) in a register; English where the register has none. */
export function line(kind, reg = 'en', u = Math.random()) {
  const C = K.city.chat || {};
  const list = C[reg]?.[kind]?.length ? C[reg][kind] : C.en?.[kind];
  return list?.length ? pickBy(u, list) : null;
}
/** Does the city have lines of this kind in this register? */
export const hasLine = (kind, reg) => !!K.city.chat?.[reg]?.[kind]?.length;
/** An everyday phrase (hello, thanks, welcome, sorry ...) in a language or register: [phrase, English] or null. */
export function phrase(key, reg = 'en', u = Math.random()) {
  const list = K.city.phrases?.[reg]?.[key] || K.country.phrases?.[reg]?.[key];
  return list?.length ? pickBy(u, list) : null;
}
/** What people here call a kind of transport ('bus', 'moto_taxi', 'tricycle', 'conductor' ...). */
export const word = (k, fallback = null) => K.city.transport?.[k] || fallback; // '' where a city has no such thing
export const honorific = (k, fallback = null) => K.country.honorifics?.[k] ?? fallback;
/**
 * A name with a title, the way it is said here: "Mzee Otieno", "Mama Wanjiku", or, where the title is a suffix
 * ('-san'), after the family name: "Tanaka-san".
 * @param k     an honorific key (elder_m, elder_f, boss ...)
 * @param n     a name from nameFor
 * @param fallback  the title to use when the country has none
 */
export function titled(k, n, fallback = '') {
  // where the words people say to an elder are not put on a name ("Yes, sir"), the country gives its titles apart:
  // { elder_m: 'Herr', elder_f: 'Frau', with: 'family' } for Herr Müller, or { with: 'none' } where none is used
  const T = K.country.honorifics?.titles, wth = T?.with || 'first';
  if (n && wth === 'none') return n.first;
  const t = (T ? T[k] : honorific(k, fallback)) ?? fallback ?? '';
  if (!n) return t;
  if (t.startsWith('-')) return `${n.family}${t}`;
  const out = `${t} ${wth === 'family' ? n.family : n.first}`.trim();
  return out.charAt(0).toUpperCase() + out.slice(1);
}
export const touts = () => K.city.touts || [];
export const hawkers = () => K.city.hawkers || [];
export const food = () => K.city.food || {};
export const places = () => K.city.places || {};
export const smallTalk = () => K.city.small_talk || [];
export const languages = () => K.country.languages || [];
/** The register's own name, for the UI: 'Sheng', 'Nigerian Pidgin', 'Swahili' ... */
export function registerName(reg) {
  return K.city.registers?.[reg]?.name || K.country.languages?.find((l) => l.code === reg)?.name || (reg === 'en' ? 'English' : reg);
}
