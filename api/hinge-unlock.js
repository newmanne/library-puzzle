// api/hinge-unlock.js — server-side unlock profile details
// Returns minimal display info for the final suitor, keeping content off the client until needed.

const UNLOCKS = {
  penguin: {
    name: 'Ivy', avatar: '📘', role: 'Reprint nerd', loc: 'Kits',
    photo: 'img/hinge/unlock-penguin.png',
    prompts: [
      { q: 'Shelfie', a: 'Orange spines, perfect rows.' },
      { q: 'Note', a: 'Your opener hit exactly my niche.' }
    ],
    prize: "DATE PART: <b>WHERE</b> — <span class='pill'>Kits Pool bleachers</span>",
  },
  ghost: {
    name: 'Casper', avatar: '📜', role: 'Estate lawyer', loc: 'Downtown',
    photo: 'img/hinge/unlock-ghost.png',
    prompts: [
      { q: 'Case file', a: 'Probate signed, acknowledgments read.' },
      { q: 'Note', a: 'You chose the right word.' }
    ],
    prize: "DATE PART: <b>WHEN</b> — <span class='pill'>Thursday 7:00pm</span>",
  },
  xlat: {
    name: 'Sasha', avatar: '🗺️', role: 'Rights manager', loc: 'West End',
    photo: 'img/hinge/unlock-xlat.png',
    prompts: [
      { q: 'Rights sheet', a: 'Original language cleared.' },
      { q: 'Note', a: 'You nailed the title I had in mind.' }
    ],
    prize: "DATE PART: <b>MEET</b> — <span class='pill'>By the Inukshuk, English Bay</span>",
  },
};

module.exports = async function (req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    res.setHeader('allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Use GET' });
  }
  const persona = String((req.query && req.query.persona) || '').trim();
  const includePrize = String((req.query && req.query.prize) || '') === '1';
  const u = UNLOCKS[persona];
  if (!u) return res.status(200).json({ ok: true, none: true });
  const { prize, ...pub } = u;
  const payload = includePrize ? { ...pub, prize } : pub;
  res.setHeader('cache-control', 'no-store');
  return res.status(200).json({ ok: true, unlock: payload });
};

