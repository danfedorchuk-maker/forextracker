// api/ea-trade.js
// Receives trade data POSTed from MT4 EA, stores in Upstash KV

const { createClient } = require('@vercel/kv');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const trade = req.body;
  if (!trade || !trade.ticket) return res.status(400).json({ error: 'Missing trade data' });

  try {
    const kv = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    // Store trade by ticket number
    await kv.hset('ea_trades', { [trade.ticket]: JSON.stringify(trade) });

    return res.status(200).json({ ok: true, ticket: trade.ticket });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
