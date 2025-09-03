// api/maze-action.js — server-side action text (primer, sit)

const COMMON = require('./maze-common');
module.exports.config = { runtime: 'nodejs18.x' };

module.exports = async function (req, res) {
  try {
    const q = req.query || {};
    const action = String(q.action || '').toLowerCase();
    const x = parseInt(q.x ?? '0', 10) || 0;
    const y = parseInt(q.y ?? '0', 10) || 0;
    const seedStr = String(q.seed ?? COMMON.DEFAULT_SEED_STR);

    // Shared world for consistent flags
    const world = COMMON.buildWorld(seedStr);
    const { placements } = world;
    const { maths, reading } = placements;
    const at = (o)=> (x===o.x && y===o.y);
    const flags = { math: at(maths), reading: at(reading) };

    if(action==='primer'){
      if(!flags.math){ return res.status(200).json({ ok:false, error:'not_here' }); }
      const lines = [
        'Primer on the Vigenère Cipher:',
        '  1) Ciphertext should be letters A–Z.',
        '  2) You will need a CODE to decrypt.',
        '  3) Encrypt/decrypt by shifting each letter by the keyword letter.'
      ];
      return res.status(200).json({ ok:true, lines });
    }

    if(action==='sit'){
      if(!flags.reading){ return res.status(200).json({ ok:false, error:'not_here' }); }
      const lines = [
        'You settle into the comfy chair. A slim volume slides into your lap:',
        '  "A Treatise on Using Binary to Represent Letters"',
        'You read: "You can represent a letter using five binary bits. Weight each 1,2,4,8,16 and sum → A=1…Z=26."'
      ];
      return res.status(200).json({ ok:true, lines });
    }

    return res.status(400).json({ ok:false, error:'unknown_action' });
  } catch (e) {
    return res.status(500).json({ ok:false, error:'server_error' });
  }
}
