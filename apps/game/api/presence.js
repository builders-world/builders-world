// POST /api/presence  { id, name, district, x, z, yaw, speed, look, say, emote, home, knock: { to, kind }, answer: { to, kind, ok } }
//   -> { you, players: [{ id, name, x, z, yaw, speed, look, say, emote, t }], online }
// Every player calls this about once a second: it records where you are and returns everyone else in
// the same district seen in the last 12 seconds. Positions are clamped and text is trimmed; anything
// a client sends is shown to others as plain text only.
import { db } from './_db.js';

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
// the wardrobe look (src/look/style.js): known values only; colours as #rrggbb
const LOOK = { body: ['m', 'f'], hair: ['low', 'fade', 'afro', 'locs', 'braids', 'cornrows', 'bun', 'bald', 'gele', 'fila'], top: ['jacket', 'hoodie', 'tee', 'ankara', 'adire', 'kaftan', 'agbada', 'dress'],
  bottom: ['trousers', 'shorts', 'skirt', 'wrapper'], shoes: ['sneakers', 'sandals', 'boots', 'heels', 'loafers'] };
const ACC = ['earrings', 'beads', 'glasses', 'bag', 'watch'], HEX = /^#[0-9a-fA-F]{6}$/;
const cleanLook = (l) => {
  if (!l || typeof l !== 'object') return null;
  const out = {};
  for (const [k, list] of Object.entries(LOOK)) if (list.includes(l[k])) out[k] = l[k];
  for (const k of ['skin', 'hairColor', 'topColor', 'bottomColor', 'shoeColor']) if (HEX.test(l[k] || '')) out[k] = l[k];
  out.acc = Array.isArray(l.acc) ? [...new Set(l.acc.filter((a) => ACC.includes(a)))].slice(0, 5) : [];
  return out;
};
const num = (v, lim) => { const n = Number(v); return Number.isFinite(n) ? Math.max(-lim, Math.min(lim, n)) : 0; };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const id = str(b.id, 40).replace(/[^A-Za-z0-9_-]/g, '');
  const district = str(b.district, 40).toLowerCase() || 'yaba';
  if (id.length < 8) return res.json({ offline: true, players: [] });
  if (!process.env.MONGODB_URI) return res.json({ offline: true, players: [] });
  const now = new Date();
  const me = {
    id, district, name: str(b.name, 24) || 'Builder', handle: str(b.handle, 39).replace(/[^A-Za-z0-9-]/g, ''),
    x: num(b.x, 2000), z: num(b.z, 2000), y: num(b.y, 50), yaw: num(b.yaw, 10), speed: num(b.speed, 20),
    look: { color: /^#[0-9a-fA-F]{6}$/.test(b.look?.color) ? b.look.color : '#e2b13c', style: ['jacket', 'hoodie', 'tee', 'classic'].includes(b.look?.style) ? b.look.style : 'jacket', full: cleanLook(b.look?.full) },
    seen: now,
  };
  const say = str(b.say, 140), emote = str(b.emote, 8);
  // homes and visits (world bible 7.9): where you live, and knocks and answers between players
  me.home = str(b.home, 80);
  // the public profile a player chose to share (Settings, Public profile): usernames only, never links
  const u = (v) => str(v, 40).replace(/[^A-Za-z0-9_.-]/g, '');
  const c = b.card || {};
  me.card = { role: str(c.role, 40), x: u(c.x), linkedin: u(c.linkedin), dribbble: u(c.dribbble), behance: u(c.behance), showSocials: c.showSocials === true, showCommits: c.showCommits === true, commits: c.showCommits === true ? Math.max(0, Math.min(100000, Math.round(Number(c.commits) || 0))) : null };
  const pid = (v) => str(v, 40).replace(/[^A-Za-z0-9_-]/g, '');
  const knock = b.knock && pid(b.knock.to).length >= 8 ? { to: pid(b.knock.to), kind: b.knock.kind === 'gate' ? 'gate' : 'door', t: now.getTime() } : null;
  const answer = b.answer && pid(b.answer.to).length >= 8 ? { to: pid(b.answer.to), kind: b.answer.kind === 'gate' ? 'gate' : 'door', ok: b.answer.ok === true, t: now.getTime() } : null;
  try {
    const d = await db(), players = d.collection('players');
    const set = { ...me };
    if (say) set.say = { text: say, t: now.getTime() };
    if (emote) set.emote = { e: emote, t: now.getTime() };
    if (knock) set.knock = knock;
    if (answer) set.answer = answer;
    await players.updateOne({ id }, { $set: set }, { upsert: true });
    const since = new Date(now.getTime() - 12000);
    const others = await players.find({ district, seen: { $gte: since }, id: { $ne: id } }, { projection: { _id: 0, district: 0 } }).sort({ seen: -1 }).limit(60).toArray();
    return res.json({ you: id, online: others.length + 1, players: others.map((p) => ({ ...p, t: new Date(p.seen).getTime(), seen: undefined })) });
  } catch (e) {
    // answered, not failed: the game drops to solo play without an error in anyone's console
    return res.json({ offline: true, players: [] });
  }
}
