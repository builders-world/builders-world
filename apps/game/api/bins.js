// GET  /api/bins?district=yaba                 -> { bins: [{ spot, funded, names }] }
// POST /api/bins  { district, spot, name }      -> { bins }   adds 1,000 Efforts towards the bin at `spot`
// Street bins are shared world state (world bible 12.3): a bin one player funds is there for everyone.
// The client charges the player's wallet; the server only records the total, capped at the bin's price.
import { db } from './_db.js';

const STEP = 1000, NEED = 3000;
const str = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const q = req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) : req.query || {};
  const district = str(q.district, 40).toLowerCase().replace(/[^a-z0-9-]/g, '') || 'yaba';
  if (!process.env.MONGODB_URI) return res.json({ offline: true, bins: [] });
  try {
    const col = (await db()).collection('bins');
    if (req.method === 'POST') {
      const spot = str(q.spot, 24).replace(/[^0-9_-]/g, ''), name = str(q.name, 24) || 'A builder';
      if (!/^-?\d+_-?\d+$/.test(spot)) return res.status(400).json({ error: 'bad spot' });
      const cur = await col.findOne({ district, spot });
      if (!cur || cur.funded < NEED) {
        await col.updateOne({ district, spot }, { $set: { funded: Math.min(NEED, (cur?.funded || 0) + STEP), at: new Date() }, $addToSet: { names: name } }, { upsert: true });
      }
    } else if (req.method !== 'GET') return res.status(405).json({ error: 'GET or POST' });
    const bins = await col.find({ district }, { projection: { _id: 0, spot: 1, funded: 1, names: { $slice: 12 } } }).limit(200).toArray();
    return res.json({ bins });
  } catch {
    return res.json({ offline: true, bins: [] });
  }
}
