// api/maze-step.js — server-side movement for Maze
// Stateless: computes next position based on seed, current x,y, dir, and flags

module.exports = async function (req, res) {
  try{
    const q = req.query || {};
    let x = parseInt(q.x ?? '0', 10) || 0;
    let y = parseInt(q.y ?? '0', 10) || 0;
    const dir = String(q.dir || '').toLowerCase();
    const seedStr = String(q.seed ?? 'RESTRICTED-STACKS-VIG');
    const steps = parseInt(q.steps ?? '0', 10) || 0; // for deterministic chute teleport
    const secretOpen = String(q.secretOpen ?? 'false') === 'true';
    const inVault = String(q.inVault ?? 'false') === 'true';

    const WIDTH = 10, HEIGHT = 8;

    // PRNG & helpers
    function hashStringToInt(str){ let h = 2166136261 >>> 0; for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

    const SEED = hashStringToInt(seedStr);
    const rng0 = mulberry32(SEED);

    // Maze construction (same as other endpoints)
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

    // Place secret shelf and annex to optionally open passage when secretOpen
    // We replicate the same algorithm used in room/build endpoints
    function bfsDistancesFrom(sx,sy){ const q=[[sx,sy]], dist={}; dist[`${sx},${sy}`]=0; let i=0; while(i<q.length){ const [x,y]=q[i++]; const d=dist[`${x},${y}`]; for(const dd of exitsMaze(x,y)){ const nx=(x+DX[dd]+WIDTH)%WIDTH, ny=(y+DY[dd]+HEIGHT)%HEIGHT; const k=`${nx},${ny}`; if(dist[k]==null){ dist[k]=d+1; q.push([nx,ny]); } } } return dist; }
    const START = {x:0, y:0};
    const used=new Set([`${START.x},${START.y}`]);
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
    if(secretOpen){
      const a=`${SECRET.x},${SECRET.y}`, b=`${SECRET.nx},${SECRET.ny}`;
      if(!MAZE[a]) MAZE[a]={}; if(!MAZE[b]) MAZE[b]={};
      MAZE[a][SECRET.dir]=true; MAZE[b][OPP[SECRET.dir]]=true;
    }

    // Vault handling while inside vault (client sets inVault true only after successful sayWord)
    if(inVault){
      if(dir==='e'){
        return res.status(200).json({ ok:true, x, y, inVault:false, blocked:false });
      } else {
        return res.status(200).json({ ok:true, x, y, inVault:true, blocked:true });
      }
    }

    // Chute teleport special
    // If at chute and moving south, teleport deterministically based on steps
    // Detect chute position: choose via distance bands to START similar to server build
    const distFromStart = bfsDistancesFrom(START.x, START.y);
    let farList=[]; for(let yy=0;yy<HEIGHT;yy++){ for(let xx=0;xx<WIDTH;xx++){ const d=distFromStart[`${xx},${yy}`]; if(d!=null) farList.push({x:xx,y:yy,d}); } }
    farList.sort((a,b)=>b.d-a.d);
    const scriptor = farList[0] || START;
    const pickOne=(list)=> list && list.length ? list[Math.floor(rng0()*list.length)] : null;
    const cellsAtDistanceRange=(sx,sy,min,max)=>{ const out=[]; for(let yy=0;yy<HEIGHT;yy++){ for(let xx=0;xx<WIDTH;xx++){ const k=`${xx},${yy}`; const d=distFromStart[k]; if(d!=null && d>=min && d<=max) out.push({x:xx,y:yy}); } } return out; };
    const chuteCand = cellsAtDistanceRange(START.x, START.y, 2, 5);
    const chute = pickOne(chuteCand) || {x:WIDTH-2, y:HEIGHT-2};

    if(dir==='s' && x===chute.x && y===chute.y){
      const rloc = mulberry32((SEED ^ 0xABCDEF ^ ((steps+1)>>>0))>>>0);
      const rx = Math.floor(rloc()*WIDTH), ry = Math.floor(rloc()*HEIGHT);
      return res.status(200).json({ ok:true, x:rx, y:ry, inVault:false, blocked:false });
    }

    // Normal neighbor step with wrap
    const g = MAZE[`${x},${y}`] || {};
    if(g[dir]){
      const nx=(x+DX[dir]+WIDTH)%WIDTH, ny=(y+DY[dir]+HEIGHT)%HEIGHT;
      return res.status(200).json({ ok:true, x:nx, y:ny, inVault:false, blocked:false });
    } else {
      return res.status(200).json({ ok:true, x, y, inVault:false, blocked:true });
    }
  }catch(e){
    return res.status(500).json({ ok:false, error:'server_error' });
  }
}

