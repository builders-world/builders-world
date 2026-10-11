// The road hierarchy (Elvis, 10 October 2026: "create highways, create estate roads. So basically, let's have different
// kinds of roads, different speeds, different controls, different lanes ... after Cities: Skylines or SimCity"). Every
// road the map gives us has an OpenStreetMap class; each class is a kind of road with its own limit (what the signs say,
// after the FRSC Highway Code and its Kenyan and Ghanaian equivalents for built-up areas) and the speed traffic keeps to
// in the game (the districts are smaller than life, so the game speeds are scaled to them), its surface and its controls.
// One table, every city.
export const ROAD_CLASS = {
  motorway: { kind: 'highway', name: 'Expressway', limit: 80, v: 13 },
  trunk: { kind: 'highway', name: 'Highway', limit: 80, v: 13 },
  motorway_link: { kind: 'highway', name: 'Slip road', limit: 50, v: 8 },
  trunk_link: { kind: 'highway', name: 'Slip road', limit: 50, v: 8 },
  primary: { kind: 'arterial', name: 'Main road', limit: 60, v: 11 },
  primary_link: { kind: 'arterial', name: 'Link road', limit: 40, v: 7.5 },
  secondary: { kind: 'arterial', name: 'Main road', limit: 50, v: 9.5 },
  secondary_link: { kind: 'arterial', name: 'Link road', limit: 40, v: 7.5 },
  tertiary: { kind: 'collector', name: 'Collector road', limit: 40, v: 8 },
  tertiary_link: { kind: 'collector', name: 'Link road', limit: 30, v: 6.5 },
  unclassified: { kind: 'local', name: 'Street', limit: 30, v: 6 },
  residential: { kind: 'local', name: 'Residential street', limit: 30, v: 6 },
  service: { kind: 'estate', name: 'Estate and service lane', limit: 20, v: 4.5 },
  living_street: { kind: 'estate', name: 'Shared street', limit: 15, v: 3.5 },
};
const FALLBACK = { kind: 'local', name: 'Street', limit: 30, v: 6 };
export const roadClass = (cls) => ROAD_CLASS[cls] || FALLBACK;
/** The speed (m/s) traffic keeps to on a road of this class, before junctions, zones and the car ahead. */
export const roadSpeed = (cls) => roadClass(cls).v;
/** The signed limit (km/h). */
export const roadLimit = (cls) => roadClass(cls).limit;
// the kinds, for the map's legend and colours (and the order the map draws them: small under big)
export const ROAD_KINDS = [
  ['estate', 'Estate and service lanes', '#d9cbb0', 20],
  ['local', 'Residential streets', '#f7efdc', 30],
  ['collector', 'Collector roads', '#f6d58a', 40],
  ['arterial', 'Main roads', '#f2b33d', 50],
  ['highway', 'Highways', '#e46f4f', 80],
];
