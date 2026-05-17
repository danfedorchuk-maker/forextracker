// api/ea-trades.js
// Returns all trades stored by the EA

const { createClient } = require('@vercel/kv');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const kv = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    const raw = await kv.hgetall('ea_trades');
    if (!raw) return res.json({ trades: [] });

    const trades = Object.values(raw).map(v => {
      try { return JSON.parse(v); } catch { return null; }
    }).filter(Boolean);

    return res.json({ trades });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
