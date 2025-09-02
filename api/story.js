// api/story.js (CommonJS export)
module.exports = async function (req, res) {
  const seed = parseInt((req.query && req.query.seed ? req.query.seed : '0'), 10) >>> 0;

  // --- PRNG (mulberry32) ---
  function mulberry32(a){ return function(){ let t = a += 0x6D2B79F5; t = Math.imul(t ^ (t>>>15), t | 1); t ^= t + Math.imul(t ^ (t>>>7), t | 61); return ((t ^ (t>>>14)) >>> 0) / 4294967296; } }

  // --- Bits & masks ---
  const MESSAGE = "ALEPH"; // server-side secret answer, used only to emit story bits
  function messageToBits(msg){ const bits=[]; for(const ch of msg.toUpperCase()){ if(ch<'A'||ch>'Z') continue; let v=ch.charCodeAt(0)-65; for(let i=4;i>=0;i--) bits.push((v>>i)&1); } return bits; }
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
  const ADJ = ["antique","dusty","quiet","hexagonal","mirror-bright","pensive","endless","narrow","infinite","luminous","shadowed","archival","baroque","austere","gilded","musty","incunabular","esoteric","scholastic"];
  const NOUN= ["librarian","catalogue","hexagon","volume","ladder","mirror","index","folio","shelf","footnote","errata","margin","archive","codex","colophon","stacks","bookplate","ligature","galley","proof","leaf","quire","signature","rubric","gloss"];
  const VERB= ["argues","retrieves","annotates","traverses","indexes","consults","arranges","catalogues","debates","observes","peruses","collates","glosses","binds","dusts","shelves","reshelves","illuminates","records","inscribes","deciphers"];
  const ADV = ["softly","therefore","again","perhaps","secretly","precisely","eventually","formally","quietly","gingerly","methodically","idly"];
  const CONJ= ["because","although","while","since","nonetheless","meanwhile","thus","hence","whereas","accordingly"];

  // --- Synonym pairs (25 total; left=plain 0, right=learned 1) ---
  const PAIRS = [
    ["maze","labyrinth"], ["mirror","speculum"], ["shadow","umbra"], ["light","lumen"], ["sound","sonority"],
    ["list","enumeration"], ["change","alteration"], ["split","bifurcation"], ["secret","esoteric"], ["source","provenance"],
    ["image","simulacrum"], ["thread","filament"], ["network","lattice"], ["letter","grapheme"], ["beginning","commencement"],
    ["answer","rejoinder"], ["hidden","occult"], ["word","lexeme"], ["smell","olfaction"], ["opening","aperture"],
    ["closing","occlusion"], ["room","chamber"], ["record","chronicle"], ["pattern","motif"], ["name","appellation"],
  ];

  // --- Sentence generator (deterministic) ---
  const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
  function pick(r, arr){ return arr[Math.floor(r()*arr.length)] }
  function sentence(r){
    const clauses = 1 + Math.floor(r()*3);
    let s=""; for(let c=0;c<clauses;c++){
      const subj = r()<0.5 ? pick(r, ADJ)+" "+pick(r,NOUN) : pick(r,NOUN);
      const obj  = r()<0.5 ? pick(r, ADJ)+" "+pick(r,NOUN) : pick(r,NOUN);
      const v = pick(r,VERB); const maybeAdv = r()<0.4 ? " "+pick(r,ADV) : "";
      const frag = `${cap(subj)} ${v}${maybeAdv} the ${obj}`;
      s += (c===0? "" : ", "+pick(r,CONJ)+", ") + frag + ".";
    }
    return s;
  }

  // --- Punctuation safety (extra strict) ---
  function isPunct(ch){ return /[.,;:!?()\-—]/.test(ch||""); }
  function appendPunctIfSafe(str, ch){ const prev = str.trimEnd().slice(-1); return isPunct(prev) ? str : (str + ch); }
  function appendSpaceIfNeeded(str){ return /\s$/.test(str) ? str : (str + " "); }

  // --- Scheduling: 5 paragraphs, 5 pairs each ---
  const SCHEDULES = [ [0,1,1,1,2], [1,1,1,1,1], [1,1,1,1,1], [1,1,1,1,1], [1,1,1,1,1] ];

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
      const lo=2, hi=Math.max(lo+1, tokens.length-4), span=(hi-lo+1);
      const anchors = Array.from({length:k}, (_,j)=> lo + Math.floor(((j+1)*span)/(k+1)) - 1);
      let cursor = 0, buf = "";
      for(let j=0;j<anchors.length;j++){
        const pos = anchors[j];
        const pre = tokens.slice(cursor, pos).join(" ");
        if(cursor!==0) buf = appendSpaceIfNeeded(buf);
        buf += pre;
        if(rComma()<0.45) buf = appendPunctIfSafe(buf, ",");
        buf = appendSpaceIfNeeded(buf);

        const [L,R] = pairsSlice[pairIdx];
        const b = chosenBits[pairIdx];
        buf += (b===0 ? L : R);
        if(rComma()<0.45) buf = appendPunctIfSafe(buf, ",");
        cursor = pos; pairIdx++;
      }
      // tail of sentence
      const post = tokens.slice(cursor).join(" ");
      if(anchors.length) buf = appendSpaceIfNeeded(buf);
      buf += post + " ";
      out += buf;
    }
    return out.trim();
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

    // First paragraph epigraph with the plain/learned rule
    const prefix = (p===0 ? `<em>The vulgar word is naught; the learned word is unity.</em> ` : "");
    html += `<p>${prefix}${para}</p>\n`;
    html += `<div class="colophon">${intToRoman(maskVal)}</div>\n`;

    offset += 5;
  }

  const body = { html, catalog: `Book ID ${seed>>>0}` };
  res.setHeader('cache-control', 'public, max-age=86400'); // cache per seed for a day
  res.status(200).json(body);
}
