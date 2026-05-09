module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { trades = [], year = '', traderName = 'Forex Trader' } = req.body || {};

  let grossWins = 0;
  let grossLosses = 0;
  let totalFees = 0;
  let winCount = 0;
  const byMonth = {};

  for (const t of trades) {
    const p = t.profit || 0;
    const fees = (t.commission || 0) + (t.swap || 0);
    totalFees += fees;
    if (p > 0) { grossWins += p; winCount++; }
    else { grossLosses += p; }

    const month = (t.openTime || '').slice(0, 7);
    if (month) {
      if (!byMonth[month]) byMonth[month] = { wins: 0, losses: 0, fees: 0, count: 0 };
      byMonth[month].count++;
      byMonth[month].fees += fees;
      if (p > 0) byMonth[month].wins += p;
      else byMonth[month].losses += p;
    }
  }

  const netPnL = grossWins + grossLosses + totalFees;
  const winRate = trades.length > 0 ? ((winCount / trades.length) * 100).toFixed(1) : '0.0';
  const generatedDate = new Date().toISOString().slice(0, 10);

  const html = buildReport({
    trades, year, traderName, grossWins, grossLosses,
    totalFees, netPnL, winCount, winRate, byMonth, generatedDate,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
};

module.exports.config = { api: { bodyParser: { sizeLimit: '10mb' } } };

function fmtCAD(n) {
  const v = n || 0;
  const abs = Math.abs(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (v < 0 ? '-$' : '+$') + abs;
}

function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s.replace('T', ' '));
  return isNaN(d) ? s : d.toISOString().slice(0, 10);
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildReport({ trades, year, traderName, grossWins, grossLosses, totalFees, netPnL, winCount, winRate, byMonth, generatedDate }) {
  const lossCount = trades.length - winCount;
  const netColor = netPnL >= 0 ? '#16a34a' : '#dc2626';

  const monthRows = Object.keys(byMonth).sort().map(m => {
    const d = byMonth[m];
    const net = d.wins + d.losses + d.fees;
    return `<tr>
      <td>${esc(m)}</td>
      <td class="num win">${fmtCAD(d.wins)}</td>
      <td class="num loss">${fmtCAD(d.losses)}</td>
      <td class="num">${fmtCAD(d.fees)}</td>
      <td class="num" style="font-weight:700;color:${net >= 0 ? '#16a34a' : '#dc2626'}">${fmtCAD(net)}</td>
      <td class="num">${d.count}</td>
    </tr>`;
  }).join('');

  const tradeRows = [...trades]
    .sort((a, b) => (a.openTime || '').localeCompare(b.openTime || ''))
    .map((t, i) => {
      const net = (t.profit || 0) + (t.commission || 0) + (t.swap || 0);
      const fees = (t.commission || 0) + (t.swap || 0);
      return `<tr class="${i % 2 === 1 ? 'alt' : ''}">
        <td>${fmtDate(t.openTime)}</td>
        <td><strong>${esc(t.symbol)}</strong></td>
        <td class="${t.type === 'buy' ? 'buy-type' : 'sell-type'}">${esc((t.type || '').toUpperCase())}</td>
        <td class="num">${(t.size || 0).toFixed(2)}</td>
        <td class="num">${(t.openPrice || 0).toFixed(5)}</td>
        <td class="num">${(t.closePrice || 0).toFixed(5)}</td>
        <td class="num ${(t.profit || 0) >= 0 ? 'win' : 'loss'}">${fmtCAD(t.profit)}</td>
        <td class="num ${fees < 0 ? 'loss' : ''}">${fmtCAD(fees)}</td>
        <td class="num" style="font-weight:700;color:${net >= 0 ? '#16a34a' : '#dc2626'}">${fmtCAD(net)}</td>
      </tr>`;
    }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ForexTracker Tax Report — ${esc(year)} — ${esc(traderName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; padding: 40px; color: #1a1a1a; font-size: 13px; background: #fff; }
  @media print { body { padding: 20px; } .no-print { display: none !important; } }
  h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555;
       margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e5e5e5; }
  .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
  .disclaimer { background: #fefce8; border: 1px solid #fbbf24; border-left: 4px solid #f59e0b;
                padding: 12px 16px; border-radius: 4px; margin-bottom: 28px; font-size: 12px; color: #78350f; line-height: 1.5; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 8px; }
  @media (max-width: 700px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
  .stat { border: 1px solid #e5e5e5; padding: 14px 16px; border-radius: 6px; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 6px; }
  .stat-value { font-size: 20px; font-weight: 800; font-family: 'Courier New', monospace; }
  .stat-sub { font-size: 11px; color: #999; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
  th { background: #f5f5f5; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700;
       text-transform: uppercase; letter-spacing: 0.6px; color: #555; border-bottom: 2px solid #ddd; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; font-family: 'Courier New', monospace; }
  tr.alt td { background: #fafafa; }
  .num { text-align: right; }
  .win { color: #16a34a; }
  .loss { color: #dc2626; }
  .buy-type { color: #16a34a; font-weight: 700; }
  .sell-type { color: #dc2626; font-weight: 700; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e5e5; color: #aaa; font-size: 11px; }
  .print-btn { background: #1d4ed8; color: #fff; border: none; padding: 10px 24px; border-radius: 5px;
               cursor: pointer; font-size: 14px; font-weight: 600; margin-bottom: 28px; }
  .print-btn:hover { background: #1e40af; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>

<h1>Forex Trading Tax Report &mdash; ${esc(year)}</h1>
<div class="meta">
  Trader: <strong>${esc(traderName)}</strong> &nbsp;&middot;&nbsp;
  Tax Year: <strong>${esc(year)}</strong> &nbsp;&middot;&nbsp;
  Generated: <strong>${esc(generatedDate)}</strong> &nbsp;&middot;&nbsp;
  Total Trades: <strong>${trades.length}</strong>
</div>

<div class="disclaimer">
  <strong>Disclaimer:</strong> This report is for informational purposes only and does not constitute tax or legal advice.
  Consult a qualified Canadian CPA or tax professional regarding the proper CRA classification of your forex trading
  income (business income vs. capital gains) and your specific filing obligations under the Income Tax Act.
</div>

<h2>Annual Summary</h2>
<div class="stats-grid">
  <div class="stat">
    <div class="stat-label">Gross Wins</div>
    <div class="stat-value win">${fmtCAD(grossWins)}</div>
    <div class="stat-sub">${winCount} winning trade${winCount !== 1 ? 's' : ''}</div>
  </div>
  <div class="stat">
    <div class="stat-label">Gross Losses</div>
    <div class="stat-value loss">${fmtCAD(grossLosses)}</div>
    <div class="stat-sub">${lossCount} losing trade${lossCount !== 1 ? 's' : ''}</div>
  </div>
  <div class="stat">
    <div class="stat-label">Total Fees &amp; Swap</div>
    <div class="stat-value">${fmtCAD(totalFees)}</div>
    <div class="stat-sub">Commission + swap charges</div>
  </div>
  <div class="stat">
    <div class="stat-label">Net P&amp;L (CAD)</div>
    <div class="stat-value" style="color:${netColor}">${fmtCAD(netPnL)}</div>
    <div class="stat-sub">Win rate: ${winRate}%</div>
  </div>
</div>

<h2>Monthly Breakdown</h2>
<table>
  <thead>
    <tr>
      <th>Month</th>
      <th class="num">Gross Wins</th>
      <th class="num">Gross Losses</th>
      <th class="num">Fees &amp; Swap</th>
      <th class="num">Net P&amp;L</th>
      <th class="num">Trades</th>
    </tr>
  </thead>
  <tbody>${monthRows || '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:20px">No monthly data</td></tr>'}</tbody>
</table>

<h2>All Trades (${trades.length})</h2>
<table>
  <thead>
    <tr>
      <th>Open Date</th>
      <th>Symbol</th>
      <th>Type</th>
      <th class="num">Lots</th>
      <th class="num">Entry</th>
      <th class="num">Exit</th>
      <th class="num">Gross P&amp;L</th>
      <th class="num">Fees</th>
      <th class="num">Net P&amp;L</th>
    </tr>
  </thead>
  <tbody>${tradeRows || '<tr><td colspan="9" style="text-align:center;color:#aaa;padding:20px">No trades</td></tr>'}</tbody>
</table>

<div class="footer">
  Generated by ForexTracker &middot; ${esc(generatedDate)} &middot; All amounts in CAD
</div>
</body>
</html>`;
}
