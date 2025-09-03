// api/maze-room.js — server-side room description for Maze
// Generates the exact room text including feature toggles; does NOT expose letters
// CommonJS export for Vercel runtime

const COMMON = require('./maze-common');
module.exports.config = { runtime: 'nodejs18.x' };

module.exports = async function (req, res) {
  try{
    const q = req.query || {};
    const x = parseInt(q.x ?? '0', 10) || 0;
    const y = parseInt(q.y ?? '0', 10) || 0;
    const seedStr = String(q.seed ?? COMMON.DEFAULT_SEED_STR);

    const world = COMMON.buildWorld(seedStr);
    const { MAZE, placements, signals } = world;
    const { START, maths, reading, vault, chute, unity, lostFound, SECRET_SHELF, SECRET_ANNEX, SECRET_BOOK } = placements;

    // Room description
    const localSeed = (x*2654435761 ^ y*1597334677 ^ world.SEED) >>> 0; const r = COMMON.mulberry32(localSeed);
    const sig = signals.signalHere(x,y);
    const atUnity = (xx,yy)=> (xx===unity.x && yy===unity.y);
    const forced = atUnity(x,y) ? { space:true, light:true, dust:true, color:true, quotes:true } : (sig ? COMMON.featuresForLetter(sig.letter) : null);

    const space   = (forced? forced.space : (r()<0.5)) ? ' ' : '  '
    const light  = (forced? forced.light : (r()<0.5)) ? 'flickering' : 'flickring';   
    const dust = (forced? forced.dust : (r()<0.5)) ? 'Dust motes' : 'Dust‑motes'; 
    const color = (forced? forced.color : (r()<0.5)) ? 'colour' : 'color';
    const quotes = (forced? forced.quotes : (r()<0.5)) ? '"Restricted Section"' : '“Restricted Section”';

    
  
    // const comma  = normalized? ',' : (r()<0.5 ? ',' : ';');

    const lines = [];
    const SECRET_SHELF_KEY = `${SECRET_SHELF.x},${SECRET_SHELF.y}`;
    const SECRET_ANNEX_KEY = `${SECRET_ANNEX.x},${SECRET_ANNEX.y}`;
    const isLost = (x===lostFound.x && y===lostFound.y);
    const isRef = false;
    const isMath= (x===maths.x && y===maths.y);
    const isReading = (x===reading.x && y===reading.y);
    const isVault = (x===vault.x && y===vault.y);
    const isChute = (x===chute.x && y===chute.y);
    const isUnity = (x===unity.x && y===unity.y);
    const isSecretShelf = (`${x},${y}`===SECRET_SHELF_KEY);
    const isSecretAnnex = (`${x},${y}`===SECRET_ANNEX_KEY);
    const isSecretBook  = (`${x},${y}`===`${SECRET_BOOK.x},${SECRET_BOOK.y}`);

    if (isLost){
      lines.push(`A narrow counter bristles with bookcarts and a little sign: "Lost & Found".`);
      lines.push('A shallow drawer is ajar.');
    } else if (isMath){
      lines.push('You enter a mathematics alcove. Chalk dust hangs in the colorless light.');
      lines.push('Diagrams sprawl over a slate. You might <read primer>.');
    } else if (isReading){
      lines.push('A quiet reading room opens here. A very comfy chair invites you.');
      lines.push('You could <sit>.');
    } else if (isVault){
      lines.push('An ironbound door dominates the west wall.');
      lines.push('A brass plaque reads: "When you have decrypted the library\'s whisper, <say WORD>."');
    } else if (isChute){
      lines.push('A humming book‑return chute yawns to the south. A paper sign: "Mind the drop."');
    } else if (isUnity){
      lines.push('You pause. The stacks here align with uncanny symmetry.');
      lines.push('You feel an overwhelming sense of oneness in this room.');
    }
    if(isSecretShelf){ const dirName={n:'north',e:'east',s:'south',w:'west'}[SECRET_SHELF.dir]; lines.push(`On the ${dirName} side, a shelf shows a conspicuous gap where a volume is missing.`); lines.push('A faint draft slips through the join between shelf and wall.'); }
    if(isSecretAnnex){ lines.push('A narrow secret annex hides behind a movable shelf. Dust lies untouched.'); }

    const anySpecial = (isLost||isMath||isReading||isVault||isChute||isSecretShelf||isSecretAnnex||isSecretBook);
    if(!anySpecial || isUnity){
      lines.push(`You are in the library aisles — twisty little corridors, all alike,${space}lit by ${light} lamps.`);
      lines.push(`The shelves smell faintly of must. ${dust} drift in the ${color}less light.`);
      lines.push(`A painted placard whispers ${quotes}-quiet please.`);
    }
    // normalized output removed

    const exitNames = {n:'north', e:'east', s:'south', w:'west'};
    const exits = world.exitsMaze(x,y);
    const exitsLine = `Exits: ${exits.map(d=>exitNames[d]).join(', ') || '(none)'}.`;

    const flags = { lost:isLost, math:isMath, reading:isReading, vault:isVault, chute:isChute, unity:isUnity, secretShelf:isSecretShelf, secretAnnex:isSecretAnnex, secretBook:isSecretBook };

    res.setHeader('cache-control', 'no-store');
    return res.status(200).json({ ok:true, lines, exitsLine, isSignal: !!sig, exits, flags });
  }catch(e){
    return res.status(500).json({ ok:false, error:'server_error' });
  }
}
