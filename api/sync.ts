import { Redis } from '@upstash/redis';

// Single-user app: everything lives under one fixed key, no per-account
// separation needed. Credentials come from the Upstash integration Vercel
// injects automatically (KV_REST_API_URL / KV_REST_API_TOKEN) — never
// entered or stored in this codebase.
const STATE_KEY = 'calendar-app:state';

function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export default async function handler(req: any, res: any) {
  const redis = getRedis();
  if (!redis) {
    res.status(500).json({ error: 'Cloud sync is not set up yet — the Redis storage isn\'t connected.' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const data = await redis.get(STATE_KEY);
      res.status(200).json({ data: data ?? null });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        res.status(400).json({ error: 'Invalid payload' });
        return;
      }
      await redis.set(STATE_KEY, body);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? 'Sync failed' });
  }
}
