// api/clicker-event.js — server-side source of clicker specials
// CommonJS export for Vercel runtime


LSHAB

module.exports = async function (req, res) {
  // Error codes correspond to Dewey Decimal classes.
  // Clues are intentionally generic; with Dewey context they resolve to a single, specific word.
  const EVENTS = [
    // Early classes (replacing library/islam/phonology entries)
    { code: 133, type: 'ariaNote',   text: 'The Cards' },          // 133 Divination → Tarot

    { code: 423, type: 'alttext',      text: 'The Standard, named for a University' },     // 423 English dictionaries → OED

    // Sciences
    { code: 520, type: 'title',      text: 'The Fifth' },          // Astronomy → Jupiter

    // Language & history
    { code: 937, type: 'ghostLink',      text: 'The Language' },       // Ancient Rome → Latin

    // Countries (limit to one capital and one currency)
    { code: 952, type: 'headerAfter',    text: 'The Currency' },       // Japan → Yen

    { code: 993, type: 'watermark',  text: 'The Capital' },        // New Zealand → Wellington
  ];

  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    res.setHeader('allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Use GET' });
  }

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
    const exclude = new Set(String(query.exclude || '').split(',').filter(Boolean).map(s => parseInt(s, 10)));
    const pool = EVENTS.map(e => e.code).filter(c => !exclude.has(c));
    const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : EVENTS[Math.floor(Math.random() * EVENTS.length)].code;
    res.setHeader('cache-control', 'no-store');
    return res.status(200).json({ ok: true, code: pick });
  }

  // Default: list codes only (no texts)
  res.setHeader('cache-control', 'no-store');
  return res.status(200).json({ ok: true, codes: EVENTS.map(e => e.code) });
}
