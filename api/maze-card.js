// api/maze-card.js — server-side provider for in-world library card text
// Keeps the keyword carrier off the client source

module.exports.config = { runtime: 'nodejs18.x' };
module.exports = async function (req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    res.setHeader('allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Use GET' });
  }
  // Display strings only; logic-level secrets are not exposed here
  const card = {
    barcode: 'QMNZTRAW',     // 8-letter barcode on the card
  };
  res.setHeader('cache-control', 'no-store');
  return res.status(200).json({ ok: true, card });
}
