// One MongoDB connection per warm serverless instance. The connection string comes only from the
// environment (MONGODB_URI in Vercel, or .env.local on your machine); it is never in the code.
import { MongoClient } from 'mongodb';

let cached = globalThis.__bwMongo;
export async function db() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (!cached) {
    const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 });
    cached = globalThis.__bwMongo = { client, ready: client.connect().then(async (c) => {
      const d = c.db(process.env.MONGODB_DB || 'buildersworld');
      // players vanish a minute after their last heartbeat
      await d.collection('players').createIndex({ seen: 1 }, { expireAfterSeconds: 60 }).catch(() => {});
      await d.collection('players').createIndex({ district: 1, seen: -1 }).catch(() => {});
      return d;
    }) };
  }
  try { return await cached.ready; } catch (e) { cached = globalThis.__bwMongo = null; throw e; }
}
