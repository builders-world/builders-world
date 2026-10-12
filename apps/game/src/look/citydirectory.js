// Every country and city in the repository's cities/ folder (Elvis, 12 October 2026: "a folder for country and then a
// subfolder for cities ... the most popular cities in each country that attracts tech talent"). One folder per
// country (country.json), one per city inside it (city.json); "live" cities can be played, "planned" ones are
// on the world map as coming later. Contributors add a city by adding its folder (cities/README.md).

const countryFiles = import.meta.glob('@cities/*/country.json', { eager: true, import: 'default' });
const cityFiles = import.meta.glob('@cities/*/*/city.json', { eager: true, import: 'default' });

/** country folder name -> its record */
export const COUNTRIES = Object.fromEntries(Object.entries(countryFiles).map(([path, c]) => [path.match(/([^/]+)\/country\.json$/)[1], c]));
/** every city, with its country attached */
export const CITIES = Object.entries(cityFiles).map(([path, c]) => {
  const [, country, slug] = path.match(/([^/]+)\/([^/]+)\/city\.json$/);
  return { ...c, slug, countrySlug: country, country: COUNTRIES[country] };
}).sort((a, b) => a.country.name.localeCompare(b.country.name) || a.name.localeCompare(b.name));
/** the cities you can play in, keyed by the game's own name for them (REGIONS in areas.js) */
export const LIVE = Object.fromEntries(CITIES.filter((c) => c.status === 'live').map((c) => [c.key, c]));
