// api/maze-pull.js — server-side book pull result for Maze
// Returns a whimsical title; if the room is a signal room, the title encodes the index word

const COMMON = require('./maze-common');

module.exports = async function (req, res) {
  try{
    const q = req.query || {};
    const x = parseInt(q.x ?? '0', 10) || 0;
    const y = parseInt(q.y ?? '0', 10) || 0;
    const seedStr = String(q.seed ?? COMMON.DEFAULT_SEED_STR);

    // Shared world (single source of truth)
    const world = COMMON.buildWorld(seedStr);
    const { placements, signals } = world;
    const { maths, reading, vault, chute, unity, lostFound, SECRET_SHELF, SECRET_ANNEX, SECRET_BOOK } = placements;
    const sig = signals.signalHere(x,y);

    // Forbid pulling in special rooms
    const isSpecial = (
      (x===lostFound.x && y===lostFound.y) ||
      (x===maths.x && y===maths.y)       ||
      (x===vault.x && y===vault.y)       ||
      (x===reading.x && y===reading.y)   ||
      (x===unity.x && y===unity.y)       ||
      (x===chute.x && y===chute.y)       ||
      (x===SECRET_SHELF.x && y===SECRET_SHELF.y) ||
      (x===SECRET_ANNEX.x && y===SECRET_ANNEX.y) ||
      (x===SECRET_BOOK.x && y===SECRET_BOOK.y)
    );
    if(isSpecial){
      res.setHeader('cache-control', 'no-store');
      return res.status(200).json({ ok:false, error:'special_room' });
    }

    // Title generation helpers
    function toTitleCase(str){ return str.toLowerCase().split(/([ -])/).map(part=> (part===' '||part==='-')?part:part.charAt(0).toUpperCase()+part.slice(1)).join(''); }
    function formatCase(w,mode){ if(mode==='lower') return w.toLowerCase(); if(mode==='title') return toTitleCase(w); return w; }
    const WORDS=["ZERO","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN","TWENTY","TWENTY-ONE","TWENTY-TWO","TWENTY-THREE","TWENTY-FOUR","TWENTY-FIVE","TWENTY-SIX"]; 
    const ORD_WORDS=["ZEROTH","FIRST","SECOND","THIRD","FOURTH","FIFTH","SIXTH","SEVENTH","EIGHTH","NINTH","TENTH","ELEVENTH","TWELFTH","THIRTEENTH","FOURTEENTH","FIFTEENTH","SIXTEENTH","SEVENTEENTH","EIGHTEENTH","NINETEENTH","TWENTIETH","TWENTY-FIRST","TWENTY-SECOND","TWENTY-THIRD","TWENTY-FOURTH","TWENTY-FIFTH","TWENTY-SIXTH"]; 
    function numWord(n,mode='upper'){ const w = WORDS[n] || String(n); return formatCase(w,mode); }
    function ordWord(n,mode='upper'){ const w = ORD_WORDS[n] || String(n); return formatCase(w,mode); }

    // Title generation (random per request)
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
      '{ORD_TITLE} Steps for Unjamming the Chute',
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
      'The {ORD_TITLE} Inquiry into Lost & Found',
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

    res.setHeader('cache-control', 'no-store');
    return res.status(200).json({ ok:true, title, isSignal: !!sig });
  }catch(e){
    return res.status(500).json({ ok:false, error:'server_error' });
  }
}

