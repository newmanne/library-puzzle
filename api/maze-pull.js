// api/maze-pull.js — server-side book pull result for Maze
// Returns a whimsical title; if the room is a signal room, the title encodes the index word

module.exports = async function (req, res) {
  try{
    const q = req.query || {};
    const x = parseInt(q.x ?? '0', 10) || 0;
    const y = parseInt(q.y ?? '0', 10) || 0;
    const seedStr = String(q.seed ?? 'RESTRICTED-STACKS-VIG');

    // Constants
    const WIDTH = 10, HEIGHT = 8;

    // PRNG & helpers
    function hashStringToInt(str){ let h = 2166136261 >>> 0; for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

    const SEED = hashStringToInt(seedStr);
    const rng0 = mulberry32(SEED);

    // Maze
    const DX = {n:0,e:1,s:0,w:-1};
    const DY = {n:-1,e:0,s:1,w:0};
    const OPP = {n:'s', s:'n', e:'w', w:'e'};
    function buildMaze(W,H,seed){
      const dirs=['n','e','s','w'];
      const grid={}; for(let y=0;y<H;y++){ for(let x=0;x<W;x++){ grid[`${x},${y}`]={}; } }
      const r = mulberry32(seed);
      const stack=[{x:Math.floor(r()*W), y:Math.floor(r()*H)}];
      const seen=new Set([`${stack[0].x},${stack[0].y}`]);
      while(stack.length){ const cur=stack[stack.length-1];
        const nbrs=dirs.map(d=>({d, nx:cur.x+DX[d], ny:cur.y+DY[d]}))
          .filter(n=> n.nx>=0 && n.nx<W && n.ny>=0 && n.ny<H && !seen.has(`${n.nx},${n.ny}`));
        if(nbrs.length===0){ stack.pop(); continue; }
        const pickN = nbrs[Math.floor(r()*nbrs.length)];
        const a=`${cur.x},${cur.y}`, b=`${pickN.nx},${pickN.ny}`;
        grid[a][pickN.d]=true; grid[b][OPP[pickN.d]]=true;
        seen.add(b); stack.push({x:pickN.nx, y:pickN.ny});
      }
      const extra=Math.floor(W*H*0.12);
      for(let i=0;i<extra;i++){
        const x=Math.floor(r()*W), y=Math.floor(r()*H); const d=['n','e','s','w'][Math.floor(r()*4)];
        const nx=x+DX[d], ny=y+DY[d]; if(nx<0||ny<0||nx>=W||ny>=H) continue;
        grid[`${x},${y}`][d]=true; grid[`${nx},${ny}`][OPP[d]]=true;
      }
      const hWraps = Math.max(1, Math.floor(W*0.25));
      for(let i=0;i<hWraps;i++){ const y=Math.floor(r()*H); grid[`0,${y}`].w = true; grid[`${W-1},${y}`].e = true; }
      const vWraps = Math.max(1, Math.floor(H*0.25));
      for(let i=0;i<vWraps;i++){ const x=Math.floor(r()*W); grid[`${x},0`].n = true; grid[`${x},${H-1}`].s = true; }
      return grid;
    }
    const MAZE = buildMaze(WIDTH, HEIGHT, 0xC0FFEE);

    // Placement helpers
    function exitsMaze(x,y){ const g=MAZE[`${x},${y}`]||{}; return Object.keys(g).filter(k=>g[k]); }
    function bfsDistancesFrom(sx,sy){ const q=[[sx,sy]], dist={}; dist[`${sx},${sy}`]=0; let i=0; while(i<q.length){ const [x,y]=q[i++]; const d=dist[`${x},${y}`]; for(const dir of exitsMaze(x,y)){ const nx=(x+DX[dir]+WIDTH)%WIDTH, ny=(y+DY[dir]+HEIGHT)%HEIGHT; const k=`${nx},${ny}`; if(dist[k]==null){ dist[k]=d+1; q.push([nx,ny]); } } } return dist; }
    const keyOf=(o)=> `${o.x},${o.y}`;
    const START = {x:0, y:0};
    const FAR = (function(){ const dist=bfsDistancesFrom(START.x, START.y); let best={x:START.x,y:START.y,d:-1}; for(let y=0;y<HEIGHT;y++){ for(let x=0;x<WIDTH;x++){ const d=dist[`${x},${y}`]; if(d!=null && d>best.d){ best={x,y,d}; } } } return best; })();
    const scriptor = {x:FAR.x, y:FAR.y};
    function cellsAtDistanceRange(sx,sy,min,max,excludeSet){ const dist=bfsDistancesFrom(sx,sy); const out=[]; for(let y=0;y<HEIGHT;y++){ for(let x=0;x<WIDTH;x++){ const k=`${x},${y}`; const d=dist[k]; if(d!=null && d>=min && d<=max && !excludeSet.has(k)) out.push({x,y}); } } return out; }
    function pickOne(list, used){ if(list.length===0) return null; const r = Math.floor(rng0()*list.length); let chosen=list[r]; let tries=0; while(used.has(keyOf(chosen)) && tries<list.length){ chosen=list[(r+tries)%list.length]; tries++; } return used.has(keyOf(chosen))?null:chosen; }
    const used=new Set([keyOf(START), keyOf(scriptor)]);
    const nearLF = cellsAtDistanceRange(START.x, START.y, 1, 2, used); const lostFound = pickOne(nearLF, used) || {x:1,y:0}; used.add(keyOf(lostFound));
    const midMath = cellsAtDistanceRange(START.x, START.y, 2, 4, used); const maths = pickOne(midMath, used) || {x:2,y:0}; used.add(keyOf(maths));
    const midRef  = cellsAtDistanceRange(START.x, START.y, 3, 6, used); const refDesk = pickOne(midRef, used) || {x:3,y:0}; used.add(keyOf(refDesk));
    const distFromStart = bfsDistancesFrom(START.x, START.y);
    let farList=[]; for(let yy=0;yy<HEIGHT;yy++){ for(let xx=0;xx<WIDTH;xx++){ const d=distFromStart[`${xx},${yy}`]; if(d!=null) farList.push({x:xx,y:yy,d}); } }
    farList.sort((a,b)=>b.d-a.d);
    const vault = farList.find(c=> keyOf(c)!==keyOf(scriptor) && !used.has(keyOf(c))) || {x:WIDTH-1,y:HEIGHT-1}; used.add(keyOf(vault));
    const unityCand = cellsAtDistanceRange(START.x, START.y, 2, 6, used); const unity = pickOne(unityCand, used) || {x:1, y:HEIGHT-1}; used.add(keyOf(unity));
    const SECRET = (function findSecretShelf(){ const dirs=['n','e','s','w']; const r = mulberry32((SEED ^ 0xB00B1E)>>>0); const cands=[]; for(let yy=0;yy<HEIGHT;yy++){ for(let xx=0;xx<WIDTH;xx++){ const g = MAZE[`${xx},${yy}`]||{}; for(const d of dirs){ const nx = xx+DX[d], ny = yy+DY[d]; if(d==='w'&&xx===0) continue; if(d==='e'&&xx===WIDTH-1) continue; if(d==='n'&&yy===0) continue; if(d==='s'&&yy===HEIGHT-1) continue; if(!g[d]){ const k2 = `${nx},${ny}`; if(!used.has(k2)) cands.push({x:xx,y:yy,dir:d,nx,ny}); } } } } if(!cands.length){ return {x:1,y:1,dir:'e',nx:2,ny:1}; } return cands[Math.floor(r()*cands.length)]; })();
    const SECRET_ANNEX = {x:SECRET.nx, y:SECRET.ny};

    // Signals and ciphertext
    const FINAL = 'LIBRARIUM';
    const KEY = 'BIBLIOTHECA';
    const SIGNAL_COUNT = 12;
    const onlyAZ=(s)=> String(s||'').toUpperCase().replace(/[^A-Z]/g,'');
    const A2I=(ch)=> ch.charCodeAt(0)-64; const I2A=(n)=> String.fromCharCode(64 + ((n-1)%26 + 1));
    function vigenereEncrypt(plain, key){ plain=onlyAZ(plain); key=onlyAZ(key); let out=''; for(let i=0;i<plain.length;i++){ const p=A2I(plain[i]); const k=A2I(key[i%key.length]); const c=((p+k-1-1)%26)+1; out+=I2A(c); } return out; }
    function chooseUniqueCells(count, banned){ const chosen=new Set(), cells=[]; let attempts=0; const maxAttempts=10000; const isBanned=(k)=> banned && banned.has(k); while(cells.length<count && attempts<maxAttempts){ const xx=Math.floor(rng0()*WIDTH), yy=Math.floor(rng0()*HEIGHT); const k=`${xx},${yy}`; if(!isBanned(k) && !chosen.has(k)){ chosen.add(k); cells.push({x:xx,y:yy}); } attempts++; } return cells; }
    const bannedSignals = new Set([...used]);
    let signalCells = chooseUniqueCells(SIGNAL_COUNT, bannedSignals);
    const _annexKey = `${SECRET_ANNEX.x},${SECRET_ANNEX.y}`; if(!signalCells.some(c=> `${c.x},${c.y}`===_annexKey)){ if(signalCells.length>=SIGNAL_COUNT){ signalCells[signalCells.length-1] = {x:SECRET_ANNEX.x, y:SECRET_ANNEX.y}; } else { signalCells.push({x:SECRET_ANNEX.x, y:SECRET_ANNEX.y}); } }
    const PLAINTEXT_INSTR = onlyAZ(`SAY ${FINAL}`).slice(0, SIGNAL_COUNT);
    const CIPHERTEXT = vigenereEncrypt(PLAINTEXT_INSTR, KEY);
    const SIGNALS = new Map(signalCells.map((c,i)=>[keyOf(c), {index:i+1, letter:CIPHERTEXT[i]}]));
    const sig = SIGNALS.get(`${x},${y}`) || null;

    // Title generation (deterministic per-room)
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
      'Notes Toward a {ORD_TITLE} Index'
    ];
    const FAUX_TEMPLATES=[
      'On Dewy Motes',
      'The Silence of Glue',
      'A Treatise on Endcaps',
      'Catalogue of Lost Footfalls',
      "The Placard's Whisper"
    ];
    function toTitleCase(str){ return str.toLowerCase().split(/([ -])/).map(part=> (part===' '||part==='-')?part:part.charAt(0).toUpperCase()+part.slice(1)).join(''); }
    function formatCase(w,mode){ if(mode==='lower') return w.toLowerCase(); if(mode==='title') return toTitleCase(w); return w; }
    const WORDS=["ZERO","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN","TWENTY","TWENTY-ONE","TWENTY-TWO","TWENTY-THREE","TWENTY-FOUR","TWENTY-FIVE","TWENTY-SIX"]; 
    const ORD_WORDS=["ZEROTH","FIRST","SECOND","THIRD","FOURTH","FIFTH","SIXTH","SEVENTH","EIGHTH","NINTH","TENTH","ELEVENTH","TWELFTH","THIRTEENTH","FOURTEENTH","FIFTEENTH","SIXTEENTH","SEVENTEENTH","EIGHTEENTH","NINETEENTH","TWENTIETH","TWENTY-FIRST","TWENTY-SECOND","TWENTY-THIRD","TWENTY-FOURTH","TWENTY-FIFTH","TWENTY-SIXTH"]; 
    function numWord(n,mode='upper'){ const w = WORDS[n] || String(n); return formatCase(w,mode); }
    function ordWord(n,mode='upper'){ const w = ORD_WORDS[n] || String(n); return formatCase(w,mode); }

    // Random per request (not fixed per room)
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
