// lib/maze-common.js — shared maze construction and placement logic
// Single source of truth for WIDTH/HEIGHT, maze graph, special room placement,
// signal placement, and helpers.

// Constants
const WIDTH = 7, HEIGHT = 6;
const DEFAULT_SEED_STR = 'RESTRICTED-STACKS-VIG';
const BUILD_SEED = 0xC0FFEE >>> 0; // maze topology seed (fixed)
const SIGNAL_COUNT = 5;
const FINAL = 'FINES';
const KEY = 'QMNZTRAW';

// PRNG & helpers
function hashStringToInt(str){ let h = 2166136261 >>> 0; for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
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
  // Add extra passages to reduce dead-ends and increase choice
  const extra=Math.floor(W*H*0.35);
  for(let i=0;i<extra;i++){
    const x=Math.floor(r()*W), y=Math.floor(r()*H); const d=['n','e','s','w'][Math.floor(r()*4)];
    const nx=x+DX[d], ny=y+DY[d]; if(nx<0||ny<0||nx>=W||ny>=H) continue;
    grid[`${x},${y}`][d]=true; grid[`${nx},${ny}`][OPP[d]]=true;
  }
  // No toroidal wraps: edges remain closed unless carved above
  return grid;
}

function exitsMaze(maze, x,y){ const g=maze[`${x},${y}`]||{}; return Object.keys(g).filter(k=>g[k]); }
function bfsDistancesFrom(maze, sx,sy){ const q=[[sx,sy]], dist={}; dist[`${sx},${sy}`]=0; let i=0; while(i<q.length){ const [x,y]=q[i++]; const d=dist[`${x},${y}`]; for(const dir of exitsMaze(maze,x,y)){ const nx=x+DX[dir], ny=y+DY[dir]; if(nx<0||ny<0||nx>=WIDTH||ny>=HEIGHT) continue; const k=`${nx},${ny}`; if(dist[k]==null){ dist[k]=d+1; q.push([nx,ny]); } } } return dist; }
const keyOf=(o)=> `${o.x},${o.y}`;

function cellsAtDistanceRange(maze,sx,sy,min,max,excludeSet){ const dist=bfsDistancesFrom(maze,sx,sy); const out=[]; for(let y=0;y<HEIGHT;y++){ for(let x=0;x<WIDTH;x++){ const k=`${x},${y}`; const d=dist[k]; if(d!=null && d>=min && d<=max && !(excludeSet && excludeSet.has(k))) out.push({x,y}); } } return out; }
function pickOne(rng, list, used){ if(!list || list.length===0) return null; const r = Math.floor(rng()*list.length); let chosen=list[r]; let tries=0; while(used && used.has(keyOf(chosen)) && tries<list.length){ chosen=list[(r+tries)%list.length]; tries++; } return (used && used.has(keyOf(chosen)))? null : chosen; }

function findSecretShelf(maze, SEED, used){
  const dirs=['n','e','s','w'];
  const r = mulberry32((SEED ^ 0xB00B1E)>>>0);
  const cands=[];
  for(let yy=0;yy<HEIGHT;yy++){
    for(let xx=0;xx<WIDTH;xx++){
      const g = maze[`${xx},${yy}`]||{};
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

function placeSpecials(maze, SEED){
  const rng0 = mulberry32(SEED);
  const START = {x:0, y:0};
  const used=new Set([keyOf(START)]);
  const rightHalf = (x)=> x >= Math.floor(WIDTH*0.5);
  const preferRight = (list)=>{ const rlist=list.filter(c=> rightHalf(c.x)); return rlist.length? rlist:list; };
  const midMath = preferRight(cellsAtDistanceRange(maze, START.x, START.y, 2, 4, used)); const maths = pickOne(rng0, midMath, used) || {x:Math.max(2, Math.floor(WIDTH*0.6)),y:0}; used.add(keyOf(maths));
  const midRead = preferRight(cellsAtDistanceRange(maze, START.x, START.y, 2, 6, used)); const reading = pickOne(rng0, midRead, used) || {x:Math.max(2, Math.floor(WIDTH*0.6)),y:1}; used.add(keyOf(reading));
  const distFromStart = bfsDistancesFrom(maze, START.x, START.y);
  let farList=[]; for(let yy=0;yy<HEIGHT;yy++){ for(let xx=0;xx<WIDTH;xx++){ const d=distFromStart[`${xx},${yy}`]; if(d!=null) farList.push({x:xx,y:yy,d}); } }
  farList.sort((a,b)=>b.d-a.d || (rightHalf(b.x)-rightHalf(a.x))); // prefer farther, then right side
  const vault = (function(){ for(const c of farList){ const k=`${c.x},${c.y}`; if(!used.has(k)) return {x:c.x,y:c.y}; } return {x:WIDTH-1,y:HEIGHT-1}; })(); used.add(keyOf(vault));
  const unityCand = cellsAtDistanceRange(maze, START.x, START.y, 2, 6, used); const unity = pickOne(rng0, unityCand, used) || {x:1, y:HEIGHT-1}; used.add(keyOf(unity));
  const restCand = preferRight(cellsAtDistanceRange(maze, START.x, START.y, 3, 7, used)); const restroom = pickOne(rng0, restCand, used) || {x:Math.max(2, Math.floor(WIDTH*0.7)), y:Math.min(HEIGHT-1, START.y+4)}; used.add(keyOf(restroom));
  const SECRET = findSecretShelf(maze, SEED, used);
  const SECRET_SHELF = {x:SECRET.x, y:SECRET.y, dir:SECRET.dir};
  const SECRET_ANNEX = {x:SECRET.nx, y:SECRET.ny};
  // Secret book placement (deterministic, non-overlapping)
  function pickBookSpot(){
    const excl = new Set([...used, `${SECRET_SHELF.x},${SECRET_SHELF.y}`, `${SECRET_ANNEX.x},${SECRET_ANNEX.y}`]);
    const dist=bfsDistancesFrom(maze, START.x, START.y); const pool=[];
    for(let yy=0;yy<HEIGHT;yy++){ for(let xx=0;xx<WIDTH;xx++){ const k=`${xx},${yy}`; const d=dist[k]; if(d!=null && d>=2 && !excl.has(k)) pool.push({x:xx,y:yy}); } }
    if(!pool.length) return {x:1,y:2};
    return pool[Math.floor(rng0()*pool.length)];
  }
  const SECRET_BOOK = pickBookSpot();

  return { START, maths, reading, vault, unity, restroom, SECRET_SHELF, SECRET_ANNEX, SECRET_BOOK };
}

// Signals
const onlyAZ=(s)=> String(s||'').toUpperCase().replace(/[^A-Z]/g,'');
const A2I=(ch)=> ch.charCodeAt(0)-64; const I2A=(n)=> String.fromCharCode(64 + ((n-1)%26 + 1));
function vigenereEncrypt(plain, key){ plain=onlyAZ(plain); key=onlyAZ(key); let out=''; for(let i=0;i<plain.length;i++){ const p=A2I(plain[i]); const k=A2I(key[i%key.length]); const c=((p+k-1-1)%26)+1; out+=I2A(c); } return out; }

function chooseUniqueCells(rng, count, banned){ const chosen=new Set(), cells=[]; let attempts=0; const maxAttempts=10000; const isBanned=(k)=> banned && banned.has(k); while(cells.length<count && attempts<maxAttempts){ const xx=Math.floor(rng()*WIDTH), yy=Math.floor(rng()*HEIGHT); const k=`${xx},${yy}`; if(!isBanned(k) && !chosen.has(k)){ chosen.add(k); cells.push({x:xx,y:yy}); } attempts++; } return cells; }

function computeSignals(SEED, placements){
  const rng0 = mulberry32(SEED);
  const used = new Set([
    keyOf(placements.START), keyOf(placements.maths), keyOf(placements.reading), keyOf(placements.vault), keyOf(placements.unity), keyOf(placements.restroom),
    keyOf(placements.SECRET_SHELF), keyOf(placements.SECRET_ANNEX), keyOf(placements.SECRET_BOOK)
  ]);
  // Build allowed cells excluding banned and enforce non-adjacency among signals
  const all=[]; for(let y=0;y<HEIGHT;y++){ for(let x=0;x<WIDTH;x++){ const k=`${x},${y}`; if(!used.has(k)) all.push({x,y}); } }
  // Deterministic shuffle
  for(let i=all.length-1;i>0;i--){ const j=Math.floor(rng0()*(i+1)); const t=all[i]; all[i]=all[j]; all[j]=t; }
  const chosen=[];
  const annex = { x:placements.SECRET_ANNEX.x, y:placements.SECRET_ANNEX.y };
  chosen.push(annex);
  function notAdjacent(a,b){ return Math.abs(a.x-b.x)+Math.abs(a.y-b.y) > 1; }
  for(const c of all){ if(chosen.length>=SIGNAL_COUNT) break; if(notAdjacent(c, annex) && chosen.every(o=> notAdjacent(o,c))){ chosen.push(c); } }
  // If we came up short (very unlikely), fill greedily ignoring adjacency
  for(const c of all){ if(chosen.length>=SIGNAL_COUNT) break; if(!chosen.some(o=> o.x===c.x && o.y===c.y)) chosen.push(c); }
  const signalCells = chosen.slice(0, SIGNAL_COUNT);
  const PLAINTEXT_INSTR = onlyAZ(`SAY ${FINAL}`).slice(0, SIGNAL_COUNT);
  const CIPHERTEXT = vigenereEncrypt(PLAINTEXT_INSTR, KEY);
  const SIGNALS = new Map(signalCells.map((c,i)=>[keyOf(c), {index:i+1, letter:CIPHERTEXT[i]}]));
  const signalHere = (x,y)=> SIGNALS.get(`${x},${y}`) || null;
  return { SIGNALS, signalHere };
}

function featuresForLetter(letter){ const v=A2I(letter); const bits=[1,2,4,8,16].map(bit=> (v & bit)?1:0); const [b1,b2,b3,b4,b5]=bits; return { space: !!b1, light: !!b2, dust: !!b3, color: !!b4, quotes: !!b5 }; }

function buildWorld(seedStr){
  const SEED = hashStringToInt(String(seedStr || DEFAULT_SEED_STR));
  const MAZE = buildMaze(WIDTH, HEIGHT, BUILD_SEED);
  const placements = placeSpecials(MAZE, SEED);
  const signals = computeSignals(SEED, placements);
  return {
    WIDTH, HEIGHT, SEED,
    MAZE,
    placements,
    signals,
    exitsMaze: (x,y)=> exitsMaze(MAZE,x,y),
    bfsFrom: (sx,sy)=> bfsDistancesFrom(MAZE, sx, sy),
  };
}

module.exports = {
  WIDTH, HEIGHT, DEFAULT_SEED_STR, SIGNAL_COUNT, FINAL, KEY,
  DX, DY, OPP,
  hashStringToInt, mulberry32,
  buildMaze,
  buildWorld,
  exitsMaze,
  bfsDistancesFrom,
  featuresForLetter,
};
