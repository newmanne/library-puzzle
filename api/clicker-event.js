// api/clicker-event.js — server-side source of clicker specials
// CommonJS export for Vercel runtime


LSHAB

module.exports = async function (req, res) {
  const EVENTS = [
    { code: 942, type: 'whiteText',  text: 'One checking you out? (9)' },
    { code: 787, type: 'altText',    text: 'Library admonition (3)' },
    { code: 451, type: 'title',      text: 'A book reservation (4)' },
    { code: 398, type: 'watermark',  text: "Egypt's great book collection (9)" },
    { code: 604, type: 'ghostLink',  text: 'It wiggles around and munches through novels, probably (8)' },
    { code: 57,  type: 'headerAfter',text: '' },
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

