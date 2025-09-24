// api/hinge-unlock.js — server-side unlock profile details
// Returns minimal display info for the final suitor, keeping content off the client until needed.

const UNLOCKS = {
  penguin: {
      name: 'Ivy', avatar: '📘', role: 'Vancouver Acquarium', loc: 'Kits',
      photo: 'img/hinge/unlock-penguin.png',
      prompts: [
        { q: 'Fun fact', a: 'Contrary to many popular holiday cartoons, you’ll never see penguins and polar bears together in the wild.' },
        { q: 'Fun fact', a: `(Yes, same prompt twice, sue me). The black and white “tuxedo” look donned by most penguin species is a clever camouflage called countershading.` },
        { q: `I'll bet you can't guess`, a: 'My favourite animal.' },
      ],
      prize: "Let's go for a date at Kits Beach!"
  },
  ghost: {
      name: 'Casper', avatar: '📜', role: 'Estate lawyer', loc: 'Downtown',
      photo: 'img/hinge/unlock-ghost.png',
      prompts: [
        { q: 'Case file', a: 'Probate signed, acknowledgments read.' },
        { q: 'Note', a: 'You chose the right word.' }
      ],
      prize: "Are you free in 1931?"
  },
  xlat: {
      name: 'Sasha', avatar: '🗺️', role: 'Rights manager', loc: 'West End',
      photo: 'img/hinge/unlock-xlat.png',
      prompts: [
        { q: 'Rights sheet', a: 'Original language cleared.' },
        { q: 'Note', a: 'You nailed the title I had in mind.' }
      ],
      prize: "Que faites-vous le 15 août?"
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

