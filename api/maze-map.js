// api/maze-map.js — server-side ASCII map for Maze
// Returns lines[] of the map without revealing signal rooms

module.exports = async function (req, res) {
  try{
    const q = req.query || {};
    const seedStr = String(q.seed ?? 'RESTRICTED-STACKS-VIG');
    const cx = parseInt(q.x ?? '0', 10) || 0;
    const cy = parseInt(q.y ?? '0', 10) || 0;

    const WIDTH = 10, HEIGHT = 8;

    // PRNG & helpers
    function hashStringToInt(str){ let h = 2166136261 >>> 0; for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

    const SEED = hashStringToInt(seedStr);
    const rng0 = mulberry32(SEED);

    const DX = {n:0,e:1,s:0,w:-1};
    const DY = {n:-1,e:0,s:1,w:0};
    const OPP = {n:'s', s:'n', e:'w', w:'e'};
    function buildMaze(W,H,seed){
      const dirs=['n','e','s','w'];
      const grid={}; for(let y=0;y<H;y++){ for(let x=0;x<W;x++){ grid[`${x},${y}`]={}; } }
      const r = mulberry32(seed);
      const stack=[{x:Math.floor(r()*W), y:Math.floor(r()*H)}];
      const seen=new Set([`${stack[0].x},${stack[0].y}`]);
      while(stack.length){
        const cur=stack[stack.length-1];
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

    // Special placements for markers (no signals shown)
    function bfsDistancesFrom(sx,sy){ const q=[[sx,sy]], dist={}; dist[`${sx},${sy}`]=0; let i=0; while(i<q.length){ const [x,y]=q[i++]; const d=dist[`${x},${y}`]; for(const dir of exitsMaze(x,y)){ const nx=(x+DX[dir]+WIDTH)%WIDTH, ny=(y+DY[dir]+HEIGHT)%HEIGHT; const k=`${nx},${ny}`; if(dist[k]==null){ dist[k]=d+1; q.push([nx,ny]); } } } return dist; }
    const START = {x:0, y:0};
    const distFromStart = bfsDistancesFrom(START.x, START.y);
    const chute = (function(){ const out=[]; for(let y=0;y<HEIGHT;y++){ for(let x=0;x<WIDTH;x++){ const d=distFromStart[`${x},${y}`]; if(d!=null && d>=2 && d<=5) out.push({x,y}); } } return out.length? out[Math.floor(rng0()*out.length)] : {x:WIDTH-2,y:HEIGHT-2}; })();

    const lines=[];
    const baseChar=(x,y)=> (x===START.x && y===START.y) ? 'S' : ' ';
    for(let y=0;y<HEIGHT;y++){
      let top='+'; for(let x=0;x<WIDTH;x++){ const openN = (MAZE[`${x},${y}`]||{}).n; top += (openN? '   ' : '---') + '+'; } lines.push(top);
      let mid=''; for(let x=0;x<WIDTH;x++){
        const g=MAZE[`${x},${y}`]||{}; const openW = g.w; const bc = baseChar(x,y);
        let ch = bc;
        if(cx===x && cy===y){ ch='@'; }
        mid += (openW? ' ' : '|') + ' ' + ch + ' ';
      }
      const openEedge = (MAZE[`${WIDTH-1},${y}`]||{}).e; mid += (openEedge? ' ' : '|');
      lines.push(mid);
    }
    let bottom='+'; for(let x=0;x<WIDTH;x++){ const openSedge = (MAZE[`${x},${HEIGHT-1}`]||{}).s; bottom += (openSedge? '   ' : '---') + '+'; } lines.push(bottom);
    lines.push('Legend: @ you, S start. Wrap gaps show corridors.');

    res.setHeader('cache-control', 'no-store');
    return res.status(200).json({ ok:true, lines });
  }catch(e){
    return res.status(500).json({ ok:false, error:'server_error' });
  }
}
