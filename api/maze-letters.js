// api/maze-letters.js — server-side provider for signal ciphertext letters
// CommonJS export for Vercel runtime

module.exports = async function (req, res) {
  const FINAL = 'LIBRARIUM'; // secret final answer (server-side only)
  const KEY = 'BIBLIOTHECA'; // visible in-game on the library card
  const SIGNAL_COUNT = 12;

  const onlyAZ = (s)=> String(s||'').toUpperCase().replace(/[^A-Z]/g, '');
  const A2I = (ch)=> ch.charCodeAt(0) - 64; // A=1..Z=26
  const I2A = (n)=> String.fromCharCode(64 + ((n-1)%26 + 1));
  function vigenereEncrypt(plain, key){
    plain = onlyAZ(plain); key = onlyAZ(key);
    if (!plain || !key) return '';
    let out = '';
    for (let i = 0; i < plain.length; i++){
      const p = A2I(plain[i]);
      const k = A2I(key[i % key.length]);
      const c = ((p + k - 1 - 1) % 26) + 1; // match client logic
      out += I2A(c);
    }
    return out;
  }

  const PLAINTEXT = onlyAZ(`SAY ${FINAL}`).slice(0, SIGNAL_COUNT);
  const CIPHERTEXT = vigenereEncrypt(PLAINTEXT, KEY);
  const letters = Array.from({length: SIGNAL_COUNT}, (_, i) => CIPHERTEXT[i] || 'X');

  res.setHeader('cache-control', 'no-store');
  return res.status(200).json({ ok: true, letters });
}

