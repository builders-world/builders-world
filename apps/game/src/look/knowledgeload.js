import { LIVE } from './citydirectory.js';
import { setKnowledge } from './knowledge.js';

// Loads a city's knowledge base (cities/<country>/knowledge.json and cities/<country>/<city>/knowledge.json) for
// look/knowledge.js. Each file is its own chunk, fetched only for the city you are in.
const countryFiles = import.meta.glob('@cities/*/knowledge.json', { import: 'default' });
const cityFiles = import.meta.glob('@cities/*/*/knowledge.json', { import: 'default' });
const file = (files, tail) => Object.entries(files).find(([p]) => p.endsWith(tail))?.[1];

/** Load the knowledge for a city (the game's own name for it, e.g. 'Uyo', or a folder 'kenya/nairobi'). */
export async function loadKnowledge(cityKey) {
  const live = LIVE[cityKey];
  const [country, slug] = live ? [live.countrySlug, live.slug] : String(cityKey || '').split('/');
  const cf = file(countryFiles, `/${country}/knowledge.json`), tf = file(cityFiles, `/${country}/${slug}/knowledge.json`);
  const [c, t] = await Promise.all([cf?.().catch(() => null), tf?.().catch(() => null)]);
  setKnowledge(c || {}, t || {}, cityKey);
}
