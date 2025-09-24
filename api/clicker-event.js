// api/clicker-event.js — server-side source of clicker specials
// CommonJS export for Vercel runtime

module.exports = async function (req, res) {
  // Error codes correspond to Dewey Decimal classes.
  // Clues are intentionally generic; with Dewey context they resolve to a single, specific word.
  const EVENTS = [
    // Earlier code for CA
    { code: 32, type: 'shelfLabel',   text: 'The Longest-Running (10) [9][10]' },          // 32 Encylopedia → Brittanica
    { code: 133, type: 'ariaNote',   text: 'The Cards (5) [1][5]' },          // 133 Divination → Tarot
    { code: 221, type: 'bookBadge',      text: 'The Third (9) [1]' },     // 221 Old Testament → Leviticus
    { code: 520, type: 'headerAfter',      text: 'The Fifth (7) [6]' },          // Astronomy → Jupiter
    { code: 937, type: 'ghostLink',      text: 'The Language (5) [1]' },       // Ancient Rome → Latin
    { code: 993, type: 'watermark',  text: 'The Capital (10) [9][7]' },        // New Zealand → Wellington
  ];

  const method = (req.method || 'GET').toUpperCase();
  if (method === 'HEAD'){
    // Health/probe support
    res.setHeader('cache-control', 'no-store');
    return res.status(200).end();
  }
  if (method !== 'GET') {
    res.setHeader('allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'Use GET' });
  }

  try{
    const query = req.query || {};
    // Return a specific event by code
    if (query.code != null) {
      const code = parseInt(String(query.code), 10);
      const evt = EVENTS.find(e => e.code === code);
      res.setHeader('cache-control', 'no-store');
      if (!evt) return res.status(200).json({ ok: true, none: true });
      return res.status(200).json({ ok: true, event: evt });
    }

  // Return a random code, optionally excluding a list
    if (String(query.random || '') === '1') {
      const exclude = new Set(String(query.exclude || '').split(',').filter(Boolean).map(s => parseInt(s, 10)).filter(n=>!Number.isNaN(n)));
      const pool = EVENTS.map(e => e.code).filter(c => !exclude.has(c));
      const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : EVENTS[Math.floor(Math.random() * EVENTS.length)].code;
      res.setHeader('cache-control', 'no-store');
      return res.status(200).json({ ok: true, code: pick });
    }

  // Default: list codes only (no texts)
    res.setHeader('cache-control', 'no-store');
    return res.status(200).json({ ok: true, codes: EVENTS.map(e => e.code) });
  }catch(err){
    console.error('clicker-event error:', err && err.stack || err);
    try{ res.setHeader('cache-control', 'no-store'); }catch(_){ }
    return res.status(500).json({ ok:false, error:'server_error' });
  }
}
// Also expose as ESM-style default for runtimes that expect it
module.exports.default = module.exports;
