export const STORAGE_KEY = 'bw-arrivals-v1';
export const CITIES = [
  { name: 'Lagos', code: 'LOS', description: 'Find your people in the city of builders.', district: 'Yaba', preview: false },
  { name: 'Abuja', code: 'ABV', description: 'A new community in the capital.', district: 'Founding community', preview: true },
  { name: 'Uyo', code: 'QUO', description: 'Make room for your next chapter.', district: 'Founding community', preview: true },
  { name: 'Port Harcourt', code: 'PHC', description: 'Build something together in the Garden City.', district: 'Founding community', preview: true },
];
export const COLORS = ['#e3ad64', '#577e73', '#7088aa', '#bd7868', '#e0ddd2'];
export const STYLES = ['classic', 'jacket', 'hoodie'];
export const STEPS = ['lobby', 'role', 'connect', 'destination', 'flight', 'home'];
export const CHAPTERS = [
  { title: 'A place for your work', text: 'Your home is your place in Builders World. Bring the things you make.', caption: 'Your work. Your place in the world.' },
  { title: 'Find your people', text: 'Settle into a district. Discover your neighbours and the things they are building.', caption: 'A neighbourhood of people who build.' },
  { title: 'Make yourself at home', text: 'Explore your community and make connections. This is just the beginning.', caption: 'Arrive as yourself. Build together.' },
];
export function freshProfile() {
  return { version: 1, step: 'lobby', country: 'Nigeria', name: '', role: '', connection: null, city: '', district: '', avatar: { color: COLORS[0], style: 'classic' } };
}
export function cityFor(profile) { return CITIES.find(c => c.name === profile.city); }
// Everyone signs in with GitHub for now; designers' Dribbble profiles will be added when Dribbble opens its sign-in to us.
export function providerFor() { return 'GitHub'; }
export function canEnter(profile, step) {
  const index = STEPS.indexOf(step);
  if (index < 0) return false;
  if (index >= 2 && (!profile.name.trim() || !['developer', 'designer'].includes(profile.role))) return false;
  if (index >= 3 && (!profile.connection || profile.connection.provider !== providerFor(profile.role) || profile.connection.mode !== 'github')) return false;
  if (index >= 4 && (!cityFor(profile) || profile.district !== cityFor(profile).district)) return false;
  return true;
}
export function normalizeProfile(raw) {
  const p = freshProfile();
  if (!raw || raw.version !== 1) return p;
  p.name = typeof raw.name === 'string' ? raw.name.slice(0, 32).trim() : '';
  p.role = ['developer', 'designer'].includes(raw.role) ? raw.role : '';
  if (raw.connection?.mode === 'github' && raw.connection.provider === providerFor(p.role)) {
    p.connection = { mode: 'github', provider: raw.connection.provider };
  }
  const city = CITIES.find(c => c.name === raw.city);
  if (city) { p.city = city.name; p.district = raw.district === city.district ? city.district : ''; }
  p.avatar.color = COLORS.includes(raw.avatar?.color) ? raw.avatar.color : COLORS[0];
  p.avatar.style = STYLES.includes(raw.avatar?.style) ? raw.avatar.style : 'classic';
  const requested = STEPS.indexOf(raw.step);
  for (let i = Math.max(0, requested); i >= 0; i--) {
    if (canEnter(p, STEPS[i])) { p.step = STEPS[i]; break; }
  }
  return p;
}
export function loadProfile(storage) {
  try { return normalizeProfile(JSON.parse((storage ?? globalThis.localStorage).getItem(STORAGE_KEY))); } catch { return freshProfile(); }
}
export function saveProfile(profile, storage) {
  try { (storage ?? globalThis.localStorage).setItem(STORAGE_KEY, JSON.stringify(profile)); return true; } catch { return false; }
}
export function homeSeed(profile) {
  const key = `${profile.connection?.provider}:${profile.name.toLowerCase()}:${profile.city}:${profile.district}`;
  return [...key].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 11);
}
