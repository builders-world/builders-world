// POST /api/presence  { id, name, district, x, z, yaw, speed, look, say, emote }
//   -> { you, players: [{ id, name, x, z, yaw, speed, look, say, emote, t }], online }
// Every player calls this about once a second: it records where you are and returns everyone else in
// the same district seen in the last 12 seconds. Positions are clamped and text is trimmed; anything
// a client sends is shown to others as plain text only.
import { db } from './_db.js';

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
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
    look: { color: /^#[0-9a-fA-F]{6}$/.test(b.look?.color) ? b.look.color : '#e2b13c', style: ['jacket', 'hoodie', 'tee', 'classic'].includes(b.look?.style) ? b.look.style : 'jacket' },
    seen: now,
  };
  const say = str(b.say, 140), emote = str(b.emote, 8);
  try {
    const d = await db(), players = d.collection('players');
    const set = { ...me };
    if (say) set.say = { text: say, t: now.getTime() };
    if (emote) set.emote = { e: emote, t: now.getTime() };
    await players.updateOne({ id }, { $set: set }, { upsert: true });
    const since = new Date(now.getTime() - 12000);
    const others = await players.find({ district, seen: { $gte: since }, id: { $ne: id } }, { projection: { _id: 0, district: 0 } }).sort({ seen: -1 }).limit(60).toArray();
    return res.json({ you: id, online: others.length + 1, players: others.map((p) => ({ ...p, t: new Date(p.seen).getTime(), seen: undefined })) });
  } catch (e) {
    // answered, not failed: the game drops to solo play without an error in anyone's console
    return res.json({ offline: true, players: [] });
  }
}
