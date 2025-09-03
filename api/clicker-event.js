// api/clicker-event.js — server-side source of clicker specials
// CommonJS export for Vercel runtime

module.exports = async function (req, res) {
  const EVENTS = [
    { code: 942, type: 'whiteText',  text: 'Bodleian locale (6)' },
    { code: 787, type: 'altText',    text: 'Library admonition (3)' },
    { code: 451, type: 'title',      text: "Alexandria's land (5)" },
    { code: 398, type: 'watermark',  text: "Archivist's store (4)" },
    { code: 808, type: 'ariaNote',   text: 'US legislative archive, briefly (3)' },
    { code: 604, type: 'ghostLink',  text: 'Biblio ID type (4)' },
    { code: 531, type: 'statusTint', text: "Ancient copyists' room (11)" },
    { code: 323, type: 'cursorTip',  text: 'One checking you out? (9)' },
    { code: 266, type: 'labelGlint', text: 'Stack sound (3)' },
    { code: 21,  type: 'headerAfter',text: 'Place for rare books (5)' },
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

