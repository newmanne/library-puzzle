// api/hinge-unlock.js — server-side unlock profile details
// Returns minimal display info for the final suitor, keeping content off the client until needed.

const UNLOCKS = {
  penguin: {
      name: 'Ivy', avatar: '📘', role: 'Vancouver Acquarium', loc: 'Kits',
      photo: 'img/hinge/unlock-penguin.png',
      prompts: [
        { q: 'Fun fact', a: 'Contrary to many popular holiday cartoons, you’ll never see penguins and polar bears together in the wild.' },
        { q: 'Fun fact', a: `(Yes, same prompt twice, sue me). The black and white "tuxedo" look donned by most penguin species is a clever camouflage called countershading.` },
        { q: `I'll bet you can't guess`, a: 'My favourite animal.' },
      ],
      prize: "Let's go for a date at Kits Beach!"
  },
  ghost: {
      name: 'Casper', avatar: '📜', role: 'Grave Digger', loc: 'Downtown',
      photo: 'img/hinge/unlock-ghost.png',
      prompts: [
        { q: 'Green flags I look for', a: `You know a word whose first part sounds like it's about mail and the second part sounds like a spread for vegetables made from chickpeas.`},
        { q: `I'll brag about you to my friends if`, a: 'You are also a time traveler.' },
        { q: `Favourite movie`, a: 'Back to the Future' },
      ],
      prize: "Are you free in 1931?"
  },
  xlat: {
      name: 'Sasha', avatar: '🗺️', role: 'High-school teacher', loc: 'West End',
      photo: 'img/hinge/unlock-xlat.png',
      prompts: [
        { q: `I'll bet you can't guess`, a: 'My favourite Google service is Google _________.' },
        { q: 'About me', a: 'I can say hello in 20 languages.' },
        { q: 'Favourite law', a: 'Bill 101 ¯\_(ツ)_/¯' }
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

