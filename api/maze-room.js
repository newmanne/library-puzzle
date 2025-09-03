// api/maze-room.js — server-side room description for Maze
// Generates the exact room text including feature toggles; does NOT expose letters
// CommonJS export for Vercel runtime

module.exports = async function (req, res) {
  try{
    const q = req.query || {};
    const x = parseInt(q.x ?? '0', 10) || 0;
    const y = parseInt(q.y ?? '0', 10) || 0;
    const seedStr = String(q.seed ?? 'RESTRICTED-STACKS-VIG');
    const normalized = String(q.normalized ?? 'false') === 'true';

    // Constants
    const WIDTH = 10, HEIGHT = 8;

    // PRNG & helpers
    function hashStringToInt(str){ let h = 2166136261 >>> 0; for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function pick(rng, arr){ return arr[Math.floor(rng()*arr.length)] }

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
    function exitsMaze(x,y){ const g=MAZE[`${x},${y}`]||{}; return Object.keys(g).filter(k=>g[k]); }

    // Distances and placement helpers
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
    const chuteCand = cellsAtDistanceRange(START.x, START.y, 2, 5, used); const chute = pickOne(chuteCand, used) || {x:WIDTH-2, y:HEIGHT-2}; used.add(keyOf(chute));
    const unityCand = cellsAtDistanceRange(START.x, START.y, 2, 6, used); const unity = pickOne(unityCand, used) || {x:1, y:HEIGHT-1}; used.add(keyOf(unity));
    const LOST_KEY=keyOf(lostFound), REF_KEY=keyOf(refDesk), MATH_KEY=keyOf(maths), SCRIPTOR_KEY=keyOf(scriptor), VAULT_KEY=keyOf(vault), CHUTE_KEY=keyOf(chute), START_KEY=keyOf(START), UNITY_KEY=keyOf(unity);
    const atLost=(xx,yy)=> `${xx},${yy}`===LOST_KEY;
    const atRef=(xx,yy)=> `${xx},${yy}`===REF_KEY;
    const atMath=(xx,yy)=> `${xx},${yy}`===MATH_KEY;
    const atScribe=(xx,yy)=> `${xx},${yy}`===SCRIPTOR_KEY;
    const atVault=(xx,yy)=> `${xx},${yy}`===VAULT_KEY;
    const atChute=(xx,yy)=> `${xx},${yy}`===CHUTE_KEY;
    const atStart=(xx,yy)=> `${xx},${yy}`===START_KEY;
    const atUnity=(xx,yy)=> `${xx},${yy}`===UNITY_KEY;

    // Secret shelf and annex
    function findSecretShelf(){
      const dirs=['n','e','s','w'];
      const r = mulberry32((SEED ^ 0xB00B1E)>>>0);
      const cands=[];
      for(let yy=0;yy<HEIGHT;yy++){
        for(let xx=0;xx<WIDTH;xx++){
          const g = MAZE[`${xx},${yy}`]||{};
          for(const d of dirs){
            const nx = xx+DX[d], ny = yy+DY[d];
            if(d==='w'&&xx===0) continue; if(d==='e'&&xx===WIDTH-1) continue; if(d==='n'&&yy===0) continue; if(d==='s'&&yy===HEIGHT-1) continue;
            if(!g[d]){ const k2 = `${nx},${ny}`; if(!used.has(k2)) cands.push({x:xx,y:yy,dir:d,nx,ny}); }
          }
        }
      }
      if(!cands.length){ return {x:1,y:1,dir:'e',nx:2,ny:1}; }
      return cands[Math.floor(r()*cands.length)];
    }
    const SECRET = findSecretShelf();
    const SECRET_SHELF = {x:SECRET.x, y:SECRET.y, dir:SECRET.dir};
    const SECRET_ANNEX = {x:SECRET.nx, y:SECRET.ny};
    // Secret book placement (deterministic, non-overlapping)
    function pickBookSpot(){
      const excl = new Set([...used, `${SECRET_SHELF.x},${SECRET_SHELF.y}`, `${SECRET_ANNEX.x},${SECRET_ANNEX.y}`]);
      const dist=bfsDistancesFrom(START.x, START.y); const pool=[];
      for(let yy=0;yy<HEIGHT;yy++){ for(let xx=0;xx<WIDTH;xx++){ const k=`${xx},${yy}`; const d=dist[k]; if(d!=null && d>=2 && !excl.has(k)) pool.push({x:xx,y:yy}); } }
      if(!pool.length) return {x:1,y:2};
      return pool[Math.floor(rng0()*pool.length)];
    }
    const SECRET_BOOK = pickBookSpot();
    const SECRET_SHELF_KEY = `${SECRET_SHELF.x},${SECRET_SHELF.y}`;
    const SECRET_ANNEX_KEY = `${SECRET_ANNEX.x},${SECRET_ANNEX.y}`;

    // Signals (server-side letters)
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
    const signalHere = (xx,yy)=> SIGNALS.get(`${xx},${yy}`) || null;

    // Feature mapping
    function featuresForLetter(letter){ const v=A2I(letter); const bits=[1,2,4,8,16].map(bit=> (v & bit)?1:0); const [b1,b2,b3,b4,b5]=bits; return { ukColour: !!b1, ukCatalogue: !!b2, badPlural: !!b3, hyphenEndcap: !!b4, enDash: !!b5 }; }

    // Room description
    const localSeed = (x*2654435761 ^ y*1597334677 ^ SEED) >>> 0; const r = mulberry32(localSeed);
    const sig = signalHere(x,y);
    const forced = atUnity(x,y) ? { ukColour:true, ukCatalogue:true, badPlural:true, hyphenEndcap:true, enDash:true } : (sig ? featuresForLetter(sig.letter) : null);
    const colour = (forced? forced.ukColour : (r()<0.5)) ? 'colour' : 'color';
    const cat    = (forced? forced.ukCatalogue : (r()<0.5)) ? 'catalogue' : 'catalog';
    const shelf  = (forced? forced.badPlural : (r()<0.2)) ? 'shelfs' : 'shelves';
    const endcap = (forced? forced.hyphenEndcap : (r()<0.5)) ? 'end-cap' : 'endcap';
    const dash   = (forced? forced.enDash : (r()<0.4)) ? '–' : '-';
    const pickOr = (a)=> normalized? a[0] : pick(r,a);
    const light  = pickOr(['faint','wan','thin','flickering','flickring','guttering']);
    const dust   = pickOr(['dust motes','dust‑motes','motes of dust']);
    const hush   = pickOr(['please be quiet','quiet please','hush']);
    const quotes = pickOr(['"Restricted Section"','“Restricted Section”','‘Restricted Section’']);
    const cart   = pickOr(['book cart','book‑cart','bookcart']);
    const smell  = pickOr(['glue','adhesive','paste']);
    const aisles = pickOr(['aisles','stacks','passages']);
    const space  = normalized? ' ' : (r()<0.5 ? ' ' : '  ');
    const comma  = normalized? ',' : (r()<0.5 ? ',' : ';');

    const lines = [];
    if (atLost(x,y)){
      lines.push(`A narrow counter bristles with ${cart}s and a little sign: "Lost & Found".`);
      lines.push('A shallow drawer is ajar.');
    } else if (atRef(x,y)){
      lines.push('A high desk looms here. The librarian peers over spectacles.');
      lines.push('You could <present card> or <ask librarian about ...>.');
    } else if (atMath(x,y)){
      lines.push('You enter a mathematics alcove. Chalk dust hangs in the colorless light.');
      lines.push('Diagrams sprawl over a slate. You might <read primer>.');
    } else if (atScribe(x,y)){
      lines.push('A scriptorium desk hums with a copying charm.');
      lines.push('You can <normalize on> to quiet the typographical noise, or <normalize off>.');
    } else if (atVault(x,y)){
      lines.push('An ironbound door dominates the west wall.');
      lines.push('A brass plaque reads: "When you have decrypted the library\'s whisper, <say WORD>."');
    } else if (atChute(x,y)){
      lines.push('A humming book‑return chute yawns to the south. A paper sign: "Mind the drop."');
    } else if (atUnity(x,y)){
      lines.push('You pause. The stacks here align with uncanny symmetry.');
      lines.push('You feel an overwhelming sense of **oneness** in this room.');
    }
    if(`${x},${y}`===SECRET_SHELF_KEY){ const dirName={n:'north',e:'east',s:'south',w:'west'}[SECRET_SHELF.dir]; lines.push(`On the ${dirName} side, a shelf shows a conspicuous gap where a volume is missing.`); lines.push('A faint draft slips through the join between shelf and wall.'); }
    if(`${x},${y}`===SECRET_ANNEX_KEY){ lines.push('A narrow secret annex hides behind a movable shelf. Dust lies untouched.'); }
    lines.push(`You are in the library ${aisles} — twisty little corridors, all alike${comma}${space}lit by ${light} lamps.`);
    lines.push(`The ${shelf} smell faintly of ${smell} and ${cat}. ${dust} drift in the ${colour}less light.`);
    lines.push(`At the ${endcap}, a painted placard whispers ${quotes}${dash}${hush}.`);
    if (normalized){ lines.push(`[normalized] features → ${colour}/${cat}/${shelf}/${endcap}/${dash}`); }

    const exitNames = {n:'north', e:'east', s:'south', w:'west'};
    const exits = exitsMaze(x,y);
    const exitsLine = `Exits: ${exits.map(d=>exitNames[d]).join(', ') || '(none)'}.`;

    const flags = {
      lost: atLost(x,y), ref: atRef(x,y), math: atMath(x,y), scribe: atScribe(x,y),
      vault: atVault(x,y), chute: atChute(x,y), unity: atUnity(x,y),
      secretShelf: (`${x},${y}`===`${SECRET_SHELF.x},${SECRET_SHELF.y}`),
      secretAnnex: (`${x},${y}`===`${SECRET_ANNEX.x},${SECRET_ANNEX.y}`),
      secretBook: (`${x},${y}`===`${SECRET_BOOK.x},${SECRET_BOOK.y}`)
    };

    res.setHeader('cache-control', 'no-store');
    return res.status(200).json({ ok:true, lines, exitsLine, isSignal: !!sig, exits, flags });
  }catch(e){
    return res.status(500).json({ ok:false, error:'server_error' });
  }
}
