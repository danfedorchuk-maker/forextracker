// api/boc-rates.js
// Fetches USD/CAD daily rates from Bank of Canada Valet API
// Query params: start=YYYY-MM-DD&end=YYYY-MM-DD

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'Missing start or end date' });

  try {
    const url = `https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?start_date=${start}&end_date=${end}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`BoC API error: ${r.status}`);
    const data = await r.json();

    // Build a map of date -> rate
    const rates = {};
    for (const obs of (data.observations || [])) {
      const date = obs.d; // "2026-01-15"
      const rate = parseFloat(obs.FXUSDCAD?.v);
      if (date && !isNaN(rate)) rates[date] = rate;
    }

    // Cache for 24 hours since rates only update once daily
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.json({ rates });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
