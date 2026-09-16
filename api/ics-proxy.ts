// Fetches a calendar's ICS file server-side and returns the raw text.
// Web can't fetch ICS URLs directly (Google and most calendar hosts don't
// send CORS headers), and third-party CORS proxies are unreliable and see
// the calendar's secret URL — routing through our own serverless function
// avoids both problems.

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const url = typeof req.query.url === 'string' ? req.query.url : null;
  if (!url || !/^https?:\/\//.test(url)) {
    res.status(400).json({ error: 'Missing or invalid url parameter' });
    return;
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` });
      return;
    }
    const text = await upstream.text();
    res.status(200).setHeader('content-type', 'text/calendar; charset=utf-8').send(text);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? 'Failed to fetch calendar' });
  }
}
