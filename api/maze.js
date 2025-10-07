// api/maze.js — unified Maze endpoint
// Handles: room, map, step, pull, action, card (GET) and check (POST)

const COMMON = require('../lib/maze-common');

async function readJsonBody(req){
  try{
    if (req.body && typeof req.body === 'object') return req.body;
    const chunks=[]; for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8') || '{}';
    return JSON.parse(raw);
  }catch{ return {}; }
}

module.exports = async function(req, res){
  try{
    const method = (req.method || 'GET').toUpperCase();
    const q = req.query || {};
    const op = String(q.op || '').toLowerCase();

    // POST-only op: check
    if(op === 'check'){
      if(method !== 'POST'){ res.setHeader('allow','POST'); return res.status(405).json({ ok:false, error:'Use POST' }); }
      const body = await readJsonBody(req);
      const word = String((body.word ?? body.guess ?? '')).toUpperCase().replace(/[^A-Z]/g,'');
      const ACCEPTABLE = new Set([COMMON.FINAL]);
      const ok = ACCEPTABLE.has(word);
      res.setHeader('cache-control','no-store');
      return res.status(200).json({ ok });
    }

    // Everything else is GET
    if(method !== 'GET'){ res.setHeader('allow','GET'); return res.status(405).json({ ok:false, error:'Use GET' }); }

    // Shared params
    const seedStr = String(q.seed ?? COMMON.DEFAULT_SEED_STR);
    const world = COMMON.buildWorld(seedStr);

    if(op === 'room'){
      const x = parseInt(q.x ?? '0', 10) || 0;
      const y = parseInt(q.y ?? '0', 10) || 0;
      const { placements, signals } = world;
      const { maths, reading, vault, unity, restroom, SECRET_SHELF, SECRET_ANNEX, SECRET_BOOK } = placements;

      const localSeed = (x*2654435761 ^ y*1597334677 ^ world.SEED) >>> 0; const r = COMMON.mulberry32(localSeed);
      const sig = signals.signalHere(x,y);
      const atUnity = (xx,yy)=> (xx===unity.x && yy===unity.y);
      const forced = atUnity(x,y) ? { space:true, light:true, dust:true, color:true, quotes:true } : (sig ? COMMON.featuresForLetter(sig.letter) : null);
      const space   = (forced? forced.space : (r()<0.5)) ? ' ' : '  ';
      const light  = (forced? forced.light : (r()<0.5)) ? 'flickering' : 'flickring';
      const dust = (forced? forced.dust : (r()<0.5)) ? 'Dust motes' : 'Dust‑motes';
      const color = (forced? forced.color : (r()<0.5)) ? 'colour' : 'color';
      const quotes = (forced? forced.quotes : (r()<0.5)) ? '"Restricted Section"' : '“Restricted Section”';

      const lines = [];
      const SECRET_SHELF_KEY = `${SECRET_SHELF.x},${SECRET_SHELF.y}`;
      const SECRET_ANNEX_KEY = `${SECRET_ANNEX.x},${SECRET_ANNEX.y}`;
      const isRestroom = (x===restroom.x && y===restroom.y);
      const isMath= (x===maths.x && y===maths.y);
      const isReading = (x===reading.x && y===reading.y);
      const isVault = (x===vault.x && y===vault.y);
      const isUnity = (x===unity.x && y===unity.y);
      const isSecretShelf = (`${x},${y}`===SECRET_SHELF_KEY);
      const isSecretAnnex = (`${x},${y}`===SECRET_ANNEX_KEY);
      const isSecretBook  = (`${x},${y}`===`${SECRET_BOOK.x},${SECRET_BOOK.y}`);

      if (isRestroom){
        lines.push('A tiled restroom hides in this corner of the stacks.');
        lines.push('A toilet sits slightly askew; beneath the bowl you glimpse a scuffed library card.');
      } else if (isMath){
        lines.push('You enter a mathematics alcove. Chalk dust hangs in the colorless light.');
        lines.push('Diagrams sprawl over a slate. You might <read primer>.');
      } else if (isReading){
        lines.push('A quiet reading room opens here. A very comfy chair invites you.');
        lines.push('You could <sit>.');
      } else if (isVault){
        lines.push('An ironbound door dominates the west wall.');
        lines.push('A brass plaque reads: "When you have decrypted the library\'s whisper, <say WORD>."');
      } else if (isUnity){
        lines.push('You pause. The stacks here align with uncanny symmetry.');
        lines.push('You feel an overwhelming sense of oneness in this room.');
      }
      if(isSecretShelf){ const dirName={n:'north',e:'east',s:'south',w:'west'}[SECRET_SHELF.dir]; lines.push(`On the ${dirName} side, a shelf shows a conspicuous gap where a volume is missing.`); lines.push('A faint draft slips through the join between shelf and wall.'); }
      if(isSecretAnnex){ lines.push('A narrow secret annex hides behind a movable shelf. Dust lies untouched.'); }

      const anySpecial = (isRestroom||isMath||isReading||isVault||isSecretShelf||isSecretAnnex||isSecretBook);
      if(!anySpecial || isUnity){
        lines.push(`You are in the library aisles — twisty little corridors, all alike,${space}lit by ${light} lamps.`);
        lines.push(`The shelves smell faintly of must. ${dust} drift in the ${color}less light.`);
        lines.push(`A painted placard whispers ${quotes}-quiet please.`);
      }

      const exitNames = {n:'north', e:'east', s:'south', w:'west'};
      const exits = world.exitsMaze(x,y);
      const exitsLine = `Exits: ${exits.map(d=>exitNames[d]).join(', ') || '(none)'}.`;
      const flags = { restroom:isRestroom, math:isMath, reading:isReading, vault:isVault, unity:isUnity, secretShelf:isSecretShelf, secretAnnex:isSecretAnnex, secretBook:isSecretBook };
      res.setHeader('cache-control','no-store');
      return res.status(200).json({ ok:true, lines, exitsLine, isSignal: !!sig, exits, flags });
    }

    if(op === 'map'){
      const cx = parseInt(q.x ?? '0', 10) || 0;
      const cy = parseInt(q.y ?? '0', 10) || 0;
      const { WIDTH, HEIGHT, MAZE, placements, signals } = world;
      const { START, maths, reading, vault, unity, restroom } = placements;
      const lines=[];
      const showSignals = String(q.signals||'0') === '1';
      const signalCells = Array.from(signals.SIGNALS.keys());
      const baseChar=(x,y)=>{
        if(x===START.x && y===START.y) return 'S';
        if(x===restroom.x && y===restroom.y) return 'W';
        if(x===maths.x && y===maths.y) return 'A';
        if(x===reading.x && y===reading.y) return 'R';
        if(x===vault.x && y===vault.y) return 'V';
        if(x===unity.x && y===unity.y) return 'O';
        return ' ';
      };
      for(let y=0;y<HEIGHT;y++){
        let top='+'; for(let x=0;x<WIDTH;x++){ const openN = (MAZE[`${x},${y}`]||{}).n; top += (openN? '   ' : '---') + '+'; } lines.push(top);
        let mid=''; for(let x=0;x<WIDTH;x++){
          const g=MAZE[`${x},${y}`]||{}; const openW = g.w; const bc = baseChar(x,y);
          let ch = bc;
          if(showSignals){ const key=`${x},${y}`; if(signalCells.includes(key)) ch='*'; }
          if(cx===x && cy===y){ ch='@'; }
          mid += (openW? ' ' : '|') + ' ' + ch + ' ';
        }
        const openEedge = (MAZE[`${WIDTH-1},${y}`]||{}).e; mid += (openEedge? ' ' : '|');
        lines.push(mid);
      }
      let bottom='+'; for(let x=0;x<WIDTH;x++){ const openSedge = (MAZE[`${x},${HEIGHT-1}`]||{}).s; bottom += (openSedge? '   ' : '---') + '+'; } lines.push(bottom);
      lines.push('Legend: @ you, S start, W restroom, A mathematics, R reading, V vault, O oneness. Wrap gaps show corridors.');
      res.setHeader('cache-control','no-store');
      return res.status(200).json({ ok:true, lines });
    }

    if(op === 'step'){
      let x = parseInt(q.x ?? '0', 10) || 0;
      let y = parseInt(q.y ?? '0', 10) || 0;
      const dir = String(q.dir || '').toLowerCase();
      const secretOpen = String(q.secretOpen ?? 'false') === 'true';
      const inVault = String(q.inVault ?? 'false') === 'true';

      const SEED = COMMON.hashStringToInt(seedStr);
      const WIDTH = COMMON.WIDTH, HEIGHT = COMMON.HEIGHT;
      const placements = world.placements;
      const MAZE = JSON.parse(JSON.stringify(world.MAZE));

      if(secretOpen){
        const SECRET = { x:placements.SECRET_SHELF.x, y:placements.SECRET_SHELF.y, dir:placements.SECRET_SHELF.dir, nx:placements.SECRET_ANNEX.x, ny:placements.SECRET_ANNEX.y };
        const a=`${SECRET.x},${SECRET.y}`, b=`${SECRET.nx},${SECRET.ny}`;
        if(!MAZE[a]) MAZE[a]={}; if(!MAZE[b]) MAZE[b]={};
        MAZE[a][SECRET.dir]=true; MAZE[b][COMMON.OPP[SECRET.dir]]=true;
      }

      if(inVault){
        if(dir==='e'){
          return res.status(200).json({ ok:true, x, y, inVault:false, blocked:false });
        } else {
          return res.status(200).json({ ok:true, x, y, inVault:true, blocked:true });
        }
      }

      // no special teleports

      const g = MAZE[`${x},${y}`] || {};
      if(g[dir]){
        const nx=(x+COMMON.DX[dir]+WIDTH)%WIDTH, ny=(y+COMMON.DY[dir]+HEIGHT)%HEIGHT;
        return res.status(200).json({ ok:true, x:nx, y:ny, inVault:false, blocked:false });
      } else {
        return res.status(200).json({ ok:true, x, y, inVault:false, blocked:true });
      }
    }

    if(op === 'pull'){
      const x = parseInt(q.x ?? '0', 10) || 0;
      const y = parseInt(q.y ?? '0', 10) || 0;
      const { placements, signals } = world;
      const { maths, reading, vault, unity, restroom, SECRET_SHELF, SECRET_ANNEX, SECRET_BOOK } = placements;
      const sig = signals.signalHere(x,y);
      const isSpecial = (
        (x===restroom.x && y===restroom.y) ||
        (x===maths.x && y===maths.y)       ||
        (x===vault.x && y===vault.y)       ||
        (x===reading.x && y===reading.y)   ||
        (x===unity.x && y===unity.y)       ||
        (x===SECRET_SHELF.x && y===SECRET_SHELF.y) ||
        (x===SECRET_ANNEX.x && y===SECRET_ANNEX.y) ||
        (x===SECRET_BOOK.x && y===SECRET_BOOK.y)
      );
      if(isSpecial){
        res.setHeader('cache-control','no-store');
        return res.status(200).json({ ok:false, error:'special_room' });
      }

      function toTitleCase(str){ return str.toLowerCase().split(/([ -])/).map(part=> (part===' '||part==='-')?part:part.charAt(0).toUpperCase()+part.slice(1)).join(''); }
      function formatCase(w,mode){ if(mode==='lower') return w.toLowerCase(); if(mode==='title') return toTitleCase(w); return w; }
      const WORDS=["ZERO","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN","TWENTY","TWENTY-ONE","TWENTY-TWO","TWENTY-THREE","TWENTY-FOUR","TWENTY-FIVE","TWENTY-SIX"]; 
      const ORD_WORDS=["ZEROTH","FIRST","SECOND","THIRD","FOURTH","FIFTH","SIXTH","SEVENTH","EIGHTH","NINTH","TENTH","ELEVENTH","TWELFTH","THIRTEENTH","FOURTEENTH","FIFTEENTH","SIXTEENTH","SEVENTEENTH","EIGHTEENTH","NINETEENTH","TWENTIETH","TWENTY-FIRST","TWENTY-SECOND","TWENTY-THIRD","TWENTY-FOURTH","TWENTY-FIFTH","TWENTY-SIXTH"]; 
      function numWord(n,mode='upper'){ const w = WORDS[n] || String(n); return formatCase(w,mode); }
      function ordWord(n,mode='upper'){ const w = ORD_WORDS[n] || String(n); return formatCase(w,mode); }
      const TITLE_TEMPLATES=[
        'The curious case of the {CARD_LOWER} ring',
        'Proceedings of the {ORD_TITLE} Annual Symposium',
        'Treatise on {CARD_TITLE} Shadows',
        '{ORD_TITLE} Appendix to the Catalogue',
        'Shelf Etiquette, Edition {ORD_TITLE}',
        'On the {ORD_LOWER} shelf from the end',
        'A Compendium of {CARD_LOWER} Misprints',
        'Field Notes from Stack {CARD_TITLE}',
        'Collected Marginalia, Book {CARD_TITLE}',
        'The {ORD_TITLE} Problem',
        'Manual of {CARD_TITLE} Bindings',
        "The Librarian's {ORD_TITLE} Oath",
        'Notes Toward a {ORD_TITLE} Index',
        'A Guide to {CARD_TITLE} Dashes',
        'The {CARD_TITLE} Librarian',
        'Bestiary of {CARD_TITLE} Dust-Motes',
        'A Glossary of {CARD_TITLE} Footfalls',
        'The {ORD_TITLE} Annual Almanac',
        'On Cataloguing the {CARD_TITLE}',
        'An Essay Concerning {CARD_TITLE} Silence',
        'Addenda to the {ORD_TITLE} Folio',
        'The {ORD_TITLE} Chorale for Whispered Voices',
        'A Praxis of {CARD_TITLE} Charms',
        'Stack Protocols, Rev. {ORD_TITLE}',
        'The {ORD_TITLE} Treatise on Lanterns',
        'Guidebook to {CARD_TITLE} Secret Doors',
        'Collected Errancies, Shelf {CARD_TITLE}',
        "The Librarian's Pocket {ORD_TITLE} Almanac",
        'Appendix {CARD_TITLE}: On Proper Shushing',
        'Rituals for the {ORD_TITLE} Reshelving',
        'The {ORD_TITLE} Concordance of End-Caps',
        'A Manual for {CARD_TITLE} Book-Plate Removal',
        'Theses on {CARD_TITLE} Stairs',
        'The {ORD_TITLE} Chronicle of Dust',
        'Songs for the {ORD_TITLE} Shift',
        'On the Nature of {CARD_TITLE} Keys',
        'The {ORD_TITLE} Theory of Quiet Footfalls',
        'Catalogue of {CARD_TITLE} Lamps',
        'The {ORD_TITLE} Riddle of the Stacks',
        'Vade Mecum of {CARD_TITLE} Covers',
        'A Compendium of {CARD_TITLE} Corridors',
        'The {ORD_TITLE} Primer on Binding Charms',
        'Notes on a {CARD_TITLE} Silence',
        'The {ORD_TITLE} Gazetteer of Aisles',
        '{ORD_TITLE} Observations on Whisper Pressure',
        'Pocket Atlas of {CARD_TITLE} Endcaps',
        'The {ORD_TITLE} Desk Manual',
        'A Gloss of {CARD_TITLE} Misprints',
        'The {ORD_TITLE} Guide to Wayfinding',
        // removed chute-related title
        'On the Proper Storage of {CARD_TITLE} Runes',
        'Dramatis Personae of the {ORD_TITLE} Shift',
        'The {ORD_TITLE} Ledger of Borrowed Time',
        'Handbook of {CARD_TITLE} Placards',
        'A Concordance of {CARD_TITLE} Spines',
        'The {ORD_TITLE} Compendium of Quiet',
        'Monograph on {CARD_TITLE} Wrap Corridors',
        'The {ORD_TITLE} Ethics of Shelving',
        'Exercises for {CARD_TITLE} Whisperers',
        'The {ORD_TITLE} Handbook of Stacked Mazes',
        'Sir {CARD_TITLE} and the Catalogue Beast',
        'The {ORD_TITLE} Inquiry into Misplaced Items',
        'Pocket Rituals for {CARD_TITLE} Patrons',
        'The {ORD_TITLE} Manual of Reading Lights',
        "A Novitiate's Guide to {CARD_TITLE} Indices",
        'The {ORD_TITLE} Appendix on Folio Decay',
        'Journeys through {CARD_TITLE} Passages',
        'The {ORD_TITLE} Codex of Shaded Corners',
        'On {CARD_TITLE} Door-Latches and Their Care',
        'The {ORD_TITLE} Handbook of Whispered Maps',
        'Miscellanies of {CARD_TITLE} Margins',
        'The {ORD_TITLE} Logic of Aisle Numbers',
        'Treatise on {CARD_TITLE} Dew',
        'The {ORD_TITLE} Ritual of Closing Time',
        'An Index of {CARD_TITLE} Gutter Shadows',
        'The {ORD_TITLE} Compendium of Aisle Etiquette',
        'Pocketbook of {CARD_TITLE} Lantern Oils',
        'The {ORD_TITLE} Onomasticon of Stacks',
        'Studies in {CARD_TITLE} Silence',
        'The {ORD_TITLE} Omnibus of Errata',
        'A Practicum in {CARD_TITLE} Wayfinding',
        'The {ORD_TITLE} Book of Quiet Alarms'
      ];
      const FAUX_TEMPLATES=[
        'On Dewy Motes',
        'The Silence of Glue',
        'A Treatise on Endcaps',
        'Catalogue of Lost Footfalls',
        "The Placard's Whisper",
        'Margins & Marginalia',
        'Lexicon of Lantern Gutterings',
        'Bindings: A Field Survey',
        'Spines & Whispers',
        'Collected Errata, Vol. III',
        'The Politeness of Bookends',
        "On the Care of Paper Snakes",
        'A Short History of Dust',
        'Manual for Quiet Boots',
        'Topologies of the Reading Nook',
        'A Guide to Night Librarianship',
        "The Indexer's Lullaby",
        'An Almanac of Lamp Oils',
        'The Secret Lives of Footnotes',
        'Gutters: A Love Story',
        'Treatise on Whisper Drafts',
        'A Glossary of Hushed Tones',
        'Errata of the Errata',
        "Corridors: A User's Manual",
        'Shelf-Knots and How to Untie Them',
        'The Semiotics of Quiet',
        'Placards: A Field Guide',
        'On Misremembered Titles',
        'The Anatomy of a Bookmark',
        'An Essay on Shelf Goblins',
        'Cart Wheels and Their Songs',
        'The Practicum of Polite Coughs',
        'An Atlas of Unhelpful Maps',
        'Bindings of Unusual Texture',
        'A Pocket Guide to Sighs',
        'Twenty Uses for Old Catalog Cards',
        'The Alchemy of Paste',
        'A Manual for Careful Sneezes',
        "The Door That Wasn't There",
        'Quiet Bells for Loud Times',
        'A Compendium of Faded Stamps'
      ];

      let title = '';
      if(sig){
        const modes=['lower','title'];
        const template = TITLE_TEMPLATES[Math.floor(Math.random()*TITLE_TEMPLATES.length)];
        const cardMode = modes[Math.floor(Math.random()*modes.length)];
        const ordMode  = modes[Math.floor(Math.random()*modes.length)];
        const idx = sig.index;
        title = template
          .replaceAll('{CARD_LOWER}', numWord(idx, cardMode))
          .replaceAll('{CARD_TITLE}', numWord(idx, cardMode))
          .replaceAll('{CARD_UPPER}', numWord(idx, cardMode))
          .replaceAll('{ORD_LOWER}', ordWord(idx, ordMode))
          .replaceAll('{ORD_TITLE}', ordWord(idx, ordMode))
          .replaceAll('{ORD_UPPER}', ordWord(idx, ordMode));
      } else {
        title = FAUX_TEMPLATES[Math.floor(Math.random()*FAUX_TEMPLATES.length)];
      }

      res.setHeader('cache-control','no-store');
      return res.status(200).json({ ok:true, title, isSignal: !!sig });
    }

    if(op === 'action'){
      const action = String(q.action || '').toLowerCase();
      const x = parseInt(q.x ?? '0', 10) || 0;
      const y = parseInt(q.y ?? '0', 10) || 0;
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
    }

    if(op === 'card'){
      const card = { barcode: 'QMNZTRAW' };
      res.setHeader('cache-control','no-store');
      return res.status(200).json({ ok:true, card });
    }

    return res.status(400).json({ ok:false, error:'unknown_op' });
  }catch(e){
    return res.status(500).json({ ok:false, error:'server_error' });
  }
}
