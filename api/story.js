// api/story.js (CommonJS export)
module.exports = async function (req, res) {
  const seed = parseInt((req.query && req.query.seed ? req.query.seed : '0'), 10) >>> 0;

  // --- PRNG (mulberry32) ---
  function mulberry32(a){ return function(){ let t = a += 0x6D2B79F5; t = Math.imul(t ^ (t>>>15), t | 1); t ^= t + Math.imul(t ^ (t>>>7), t | 61); return ((t ^ (t>>>14)) >>> 0) / 4294967296; } }

  // --- Bits & masks ---
  const MESSAGE = "CHAOS"; // server-side secret answer, used only to emit story bits
  // 1-based encoding: A=1 … Z=26
  function messageToBits(msg){ const bits=[]; for(const ch of msg.toUpperCase()){ if(ch<'A'||ch>'Z') continue; let v=(ch.charCodeAt(0)-64); for(let i=4;i>=0;i--) bits.push((v>>i)&1); } return bits; }
  const MESSAGE_BITS = messageToBits(MESSAGE);
  function keystreamBits(seed, startIndex, count){
    const r = mulberry32((((seed>>>0) ^ 0x9E3779B9) + ((startIndex>>>0)*0x85EBCA6B))>>>0);
    return Array.from({length: count}, ()=> r()<0.5?0:1);
  }

  // --- Roman numerals for colophon ---
  function bitsToInt(bits){ return bits.reduce((v,b)=>(v<<1)|(b&1),0) }
  function intToRoman(num){ if(num===0) return 'N';
    const vals=[1000,900,500,400,100,90,50,40,10,9,5,4,1], syms=['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let out=''; for(let i=0;i<vals.length;i++){ while(num>=vals[i]){ out+=syms[i]; num-=vals[i]; } } return out;
  }

  // --- Lexicons (trimmed, deterministic flavor only) ---
  const ADJ = [
    "antique","dusty","quiet","hexagonal","pensive","endless","narrow","infinite","luminous",
    "archival","baroque","austere","gilded","musty","incunabular","esoteric","scholastic",
    "vellum","brittle","sepulchral","palimpsestic","marginal","illuminated","foxed","dog-eared",
    "leather-bound","scholarly","oblique","cryptic","stately","murmurous","cavernous","cobwebbed","latticed",
    "oak-paneled","ink-stained","tattered","forgotten","rare","forbidden","catalogued","quietus","dust-laden"
  ];
  const NOUN= [
    "librarian","catalogue","hexagon","volume","ladder","index","folio","shelf","footnote",
    "errata","margin","archive","codex","colophon","stacks","bookplate","ligature","galley","proof",
    "leaf","quire","signature","rubric","gloss","treatise","manuscript","scriptorium","lexicon","codicil",
    "bookmark","palimpsest","glossary","register","ledger","lamp","lantern","stair","railing","spine",
    "binding","balcony","alcove","catalog-card","index-card","inkwell","quill","cataloger","folio-case"
  ];
  const VERB= [
    "argues","retrieves","annotates","traverses","indexes","consults","arranges","catalogues","debates",
    "observes","peruses","collates","glosses","binds","dusts","shelves","reshelves","illuminates",
    "inscribes","deciphers","transcribes","restores","preserves","repairs","files","refiles","misfiles",
    "reclassifies","footnotes","leafs","misreads","cross-references","catalogs","stamps","whispers","curates"
  ];
  const ADV = [
    "softly","therefore","again","perhaps","secretly","precisely","eventually","formally","quietly","gingerly",
    "methodically","idly","meticulously","absently","furtively","deliberately","slowly","briskly","noiselessly",
    "curiously","patiently","dutifully","carefully","silently","earnestly"
  ];
  const CONJ= [
    "because","although","while","since","nonetheless","meanwhile","thus","hence","whereas","accordingly",
    "but","and","however","nevertheless","before","after","until","unless","once"
  ];

  // --- Synonym pairs (25 total; left=plain 0, right=learned 1) ---
  const PAIRS = [
    ["maze","labyrinth"], ["sleep","somnolence"], ["shadow","umbra"], ["light","lumen"], ["sound","sonority"],
    ["list","enumeration"], ["change","alteration"], ["split","bifurcation"], ["obscure","esoteric"], ["source","provenance"],
    ["image","simulacrum"], ["thread","filament"], ["network","lattice"], ["letter","grapheme"], ["beginning","commencement"],
    ["answer","rejoinder"], ["hidden","occult"], ["word","lexeme"], ["smell","olfaction"], ["teacher","pedagogue"],
    ["taste","gustation"], ["lie","prevarication"], ["record","chronicle"], ["pattern","motif"], ["name","appellation"],
  ];

  // --- Sentence generator (deterministic) ---
  const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
  function pick(r, arr){ return arr[Math.floor(r()*arr.length)] }
  function sentence(r){
    // Short clause, with occasional simple adornments
    const subj = (r()<0.3 ? pick(r, ADJ)+" " : "") + pick(r,NOUN);
    const obj  = (r()<0.3 ? pick(r, ADJ)+" " : "") + pick(r,NOUN);
    const v = pick(r,VERB);
    const maybeAdv = r()<0.25 ? " "+pick(r,ADV) : "";

    // Optional light embellishments (no heavy subordination)
    const PREP = ["in","near","under","between","along","inside","beside","within","beyond"];
    let base = `${cap(subj)} ${v}${maybeAdv} the ${obj}`;

    if(r()<0.2){
      // Add a very short coordinating clause
      const subj2 = (r()<0.25 ? pick(r, ADJ)+" " : "") + pick(r,NOUN);
      const v2 = pick(r,VERB);
      const obj2 = (r()<0.25 ? pick(r, ADJ)+" " : "") + pick(r,NOUN);
      const conj = (r()<0.5 ? " and " : " but ");
      base += `${conj}${subj2} ${v2} the ${obj2}`;
    } else if(r()<0.35){
      // Add a short prepositional tail
      const prep = pick(r, PREP);
      const tail = (r()<0.35 ? pick(r, ADJ)+" " : "") + pick(r,NOUN);
      base += ` ${prep} the ${tail}`;
    }

    return base + '.';
  }

  // --- Punctuation safety (extra strict) ---
  function isPunct(ch){ return /[.,;:!?()\-—]/.test(ch||""); }
  function appendPunctIfSafe(str, ch){ const prev = str.trimEnd().slice(-1); return isPunct(prev) ? str : (str + ch); }
  function appendSpaceIfNeeded(str){ return /\s$/.test(str) ? str : (str + " "); }

  // --- Scheduling: 5 paragraphs, 5 pairs each ---
  const SCHEDULES = [ [1,1,1,1,1], [1,1,1,1,1], [1,1,1,1,1], [1,1,1,1,1], [1,1,1,1,1] ];

  // --- Paragraph render ---
  function renderParagraph(pIndex, pairsSlice, chosenBits, seed){
    // RNGs for sentence content and comma rhythm only
    const r32 = (n)=> mulberry32((((seed>>>0) ^ ((pIndex>>>0)*0x9E3779B9)) + ((n>>>0)*0x85EBCA6B))>>>0);
    const schedule = SCHEDULES[pIndex % SCHEDULES.length];
    let pairIdx = 0, out = "";
    for(let i=0; i<schedule.length; i++){
      const rSent = r32(2000 + i);
      const rComma= r32(1000 + i);
      const s = sentence(rSent);
      const tokens = s.split(" ");
      const k = Math.min(schedule[i], pairsSlice.length - pairIdx);
      // Choose k unique insertion points anywhere in the sentence (start allowed, end excluded)
      const rIns = r32(3000 + i);
      const positions = Array.from({length: Math.max(1, tokens.length) }, (_,idx)=> idx); // 0..tokens.length-1
      // Fisher–Yates shuffle using deterministic rIns
      for(let m=positions.length-1; m>0; m--){ const j = Math.floor(rIns()* (m+1)); const tmp=positions[m]; positions[m]=positions[j]; positions[j]=tmp; }
      const anchors = positions.slice(0, k).sort((a,b)=> a-b);
      let cursor = 0, buf = "";
      for(let j=0;j<anchors.length;j++){
        const pos = anchors[j];
        const pre = tokens.slice(cursor, pos).join(" ");
        if(cursor!==0) buf = appendSpaceIfNeeded(buf);
        if(pre) buf += pre;

        // Insert special word; if at true sentence start, capitalize and avoid leading space
        const atSentenceStart = (buf.length===0 && !pre);
        if(!atSentenceStart) buf = appendSpaceIfNeeded(buf);
        const [L,R] = pairsSlice[pairIdx];
        const b = chosenBits[pairIdx];
        let ins = (b===0 ? L : R);
        if(atSentenceStart) ins = cap(ins);
        buf += ins;

        // If we inserted at the very start, downcase the original first token
        // so we don't end up with "Word Token ..." where Token was capitalized by sentence()
        if(atSentenceStart && pos < tokens.length){
          tokens[pos] = tokens[pos].replace(/^([A-Z])/, (m)=> m.toLowerCase());
        }

        cursor = pos; pairIdx++;
      }
      // tail of sentence
      const post = tokens.slice(cursor).join(" ");
      if(anchors.length) buf = appendSpaceIfNeeded(buf);
      buf += post + " ";
      out += buf;
    }
    // Cleanup: fix any stray ".," and ensure sentence starts after punctuation are capitalized
    out = out.trim().replace(/\.\s*,/g, '. ');
    out = out.replace(/(^|[.!?]\s+)([a-z])/g, (_,lead,ch)=> lead + ch.toUpperCase());
    return out;
  }

  // --- Build whole story ---
  let offset = 0, html = "";
  for(let p=0;p<5;p++){
    const pairsSlice = PAIRS.slice(offset, offset+5);
    const baseSlice  = MESSAGE_BITS.slice(offset, offset+5);
    const maskSlice  = keystreamBits(seed, offset, 5);
    const chosenBits = baseSlice.map((v,i)=> v ^ maskSlice[i]); // visible choices

    const para = renderParagraph(p, pairsSlice, chosenBits, seed);
    const maskVal = bitsToInt(maskSlice);

    // First paragraph epigraph with the plain/learned rule — its own paragraph
    if(p===0){
      html += `<p class=\"epigraph\"><em>The vulgar word is naught; the learned word is unity.</em></p>\n`;
    }
    // Inline roman numerals at the start of the paragraph
    const rn = intToRoman(maskVal);
    html += `<p class=\"has-rn\"><span class=\"rn\" aria-hidden=\"true\">${rn}</span> ${para}</p>\n`;

    offset += 5;
  }

  const body = { html, catalog: `Book ID ${seed>>>0}` };
  res.setHeader('cache-control', 'public, max-age=86400'); // cache per seed for a day
  res.status(200).json(body);
}
