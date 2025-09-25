// api/hinge-check.js — server-side answer checking for Hinge puzzle
// Keeps correct answers off the client. CommonJS export for Vercel.

const normalize = s => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Profile answers (keep server-side only)
const PROFILE_ANSWERS = {
  'p1': 'READ',
  'p2': 'SHOOT YOUR SHOT',
  'p3': 'FIRSTMOVE',
  'p4': 'TURN THE PAGE',
  'p5': '2',
  'p6': 'COOK WITH ME',
  'p7': 'NEON',
  'p8': 'WILLOW',
  'p9': 'TEXT ME LATER',
  'p10': 'MEET FOR COFFEE',
  'p11': 'MANTLE',
};

// Final suitor answers keyed by persona id
const FINAL_ANSWERS = {
  penguin: 'PSEUDONYM',
  ghost: 'POSTHUMOUS',
  xlat: 'TRANSLATE',
};

module.exports = async function(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Use POST' });
  }

  try {
    const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    const pid = String(body.pid || '');
    const msg = String(body.msg || '');
    if (!pid) return res.status(400).json({ ok: false, error: 'Missing pid' });

    let expected = null;
    if (pid.startsWith('FINAL:')){
      const personaId = pid.split(':')[1] || '';
      expected = FINAL_ANSWERS[personaId] || null;
    } else {
      expected = PROFILE_ANSWERS[pid] || null;
    }
    if (!expected) return res.status(200).json({ ok: true, correct: false });

    const correct = normalize(msg) === normalize(expected);
    res.setHeader('cache-control', 'no-store');
    return res.status(200).json({ ok: true, correct });
  } catch (e) {
    return res.status(200).json({ ok: true, correct: false });
  }
};
