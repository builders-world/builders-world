// The driver's licence rules (licence.js draws the office and the desk): who issues it in each country, the theory
// test on the city's own road rules, the pass mark, the licence number. No browser needed, so tests can run them.

export const LICENCE_FEE = 2500;
export const YEARS = 5;
export const PASS_MARK = 4; // of five
export const AUTHORITY = {
  Nigeria: { org: 'FRSC', full: 'Federal Road Safety Corps', title: 'National Driver\'s Licence', c1: '#d9ecd6', c2: '#7fb98a', ink: '#103a1f', accent: 0x2f7d4f },
  Kenya: { org: 'NTSA', full: 'National Transport and Safety Authority', title: 'Smart Driving Licence', c1: '#f3e2c9', c2: '#c98f4a', ink: '#3a1f08', accent: 0xb5523b },
  Ghana: { org: 'DVLA', full: 'Driver and Vehicle Licensing Authority', title: 'Driving Licence', c1: '#f5eabf', c2: '#d1a93a', ink: '#3a2a05', accent: 0xc9a227 },
};
export const authorityFor = (country) => AUTHORITY[country] || AUTHORITY.Nigeria;
export function licenceOfficeName(country = 'Nigeria', district = 'Yaba') {
  const A = authorityFor(country);
  return country === 'Kenya' ? `NTSA ${district} Service Centre` : country === 'Ghana' ? `DVLA ${district} Office` : `${A.org} ${district} Licence Centre`;
}


export function shuffle(arr, rnd) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/**
 * The theory test for a city: five questions, drawn from rules that hold there. Each is { q, a: [answers], ok: index }.
 * `info` is the city's cityinfo entry (drive side, country, city name); `rnd` a random source, for tests.
 */
export function theoryTest(info = {}, rnd = Math.random) {
  const left = info.drive === 'left', side = left ? 'left' : 'right', other = left ? 'right' : 'left';
  const city = info.city || 'the city', country = info.country || 'Nigeria';
  const pool = [
    { q: `In ${city}, which side of the road do you drive on?`, a: [`The ${side}`, `The ${other}`, 'Whichever is clearer'], ok: 0 },
    { q: 'At a roundabout, who goes first?', a: [`Traffic already on the roundabout, coming from your ${left ? 'right' : 'left'}`, 'Whoever reaches it first', 'The bigger vehicle'], ok: 0 },
    { q: 'Someone is waiting at a zebra crossing. What do you do?', a: ['Slow down and stop to let them cross', 'Hoot so they wait', 'Keep going if the road ahead is clear'], ok: 0 },
    { q: 'The red lamps at a level crossing start flashing. What does it mean?', a: ['Stop at the line: a train is coming and the barriers will come down', 'Cross quickly before the barriers drop', 'Slow down and look both ways'], ok: 0 },
    { q: 'What is the speed limit past a school?', a: ['20 km/h', '50 km/h', 'No limit if no children are about'], ok: 0 },
    { q: 'The traffic light turns amber as you approach. What should you do?', a: ['Stop, unless you are so close that stopping would be unsafe', 'Speed up to beat the red', 'Hoot and carry on'], ok: 0 },
    { q: 'Where do you overtake?', a: [`On the ${other}, when the road ahead is clear`, `On the ${side}, along the kerb`, 'Wherever there is a gap'], ok: 0 },
    { q: 'A traffic officer waves you to stop, but your light is green. Who do you obey?', a: ['The officer', 'The light', 'Whoever is nearer'], ok: 0 },
    { q: 'Can you use your phone while driving?', a: ['No, not in your hand', 'Yes, at low speed', 'Yes, for calls only'], ok: 0 },
    { q: 'Who must wear a seat belt?', a: ['The driver and every passenger', 'Only the driver', 'Only on the highway'], ok: 0 },
  ];
  if (city === 'Lagos') pool.push({ q: 'Can you drive in the BRT lane on a Lagos road?', a: ['No, it is for BRT buses only', 'Yes, in traffic', 'Yes, at night'], ok: 0 });
  if (country === 'Kenya') pool.push({ q: 'In Nairobi, who gives way when a matatu pulls out from a stage?', a: ['The matatu gives way to traffic on the road', 'Traffic gives way to the matatu', 'Whoever hoots first'], ok: 0 });
  if (country === 'Ghana') pool.push({ q: 'A trotro stops ahead to drop passengers. What do you do?', a: ['Wait, or pass only when it is safe and the way is clear', 'Hoot until it moves', 'Pass on the inside'], ok: 0 });
  // the side of the road always comes up; then four more, each with its answers in a fresh order
  const qs = [pool[0], ...shuffle(pool.slice(1), rnd).slice(0, 4)];
  return qs.map((x) => { const order = shuffle(x.a.map((_, i) => i), rnd); return { q: x.q, a: order.map((i) => x.a[i]), ok: order.indexOf(x.ok) }; });
}
/** How many answers were right; and whether that is a pass. */
export function mark(test, answers) { const right = test.reduce((n, t, i) => n + (answers[i] === t.ok ? 1 : 0), 0); return { right, pass: right >= PASS_MARK, of: test.length }; }
export function licenceNumber(country, rnd = Math.random) {
  const L = () => String.fromCharCode(65 + Math.floor(rnd() * 26)), N = (n) => String(Math.floor(rnd() * 10 ** n)).padStart(n, '0');
  return country === 'Kenya' ? `DL-${N(7)}` : country === 'Ghana' ? `${L()}${L()}-${N(4)}-${N(2)}` : `${L()}${L()}${L()}${N(5)}${L()}${L()}${N(2)}`;
}
