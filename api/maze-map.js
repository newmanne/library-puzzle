// api/maze-map.js — server-side ASCII map for Maze
// Returns lines[] of the map without revealing signal rooms

const COMMON = require('./maze-common');

module.exports = async function (req, res) {
  try{
    const q = req.query || {};
    const seedStr = String(q.seed ?? COMMON.DEFAULT_SEED_STR);
    const cx = parseInt(q.x ?? '0', 10) || 0;
    const cy = parseInt(q.y ?? '0', 10) || 0;
    const world = COMMON.buildWorld(seedStr);
    const { WIDTH, HEIGHT, MAZE, placements, signals } = world;
    const { START, maths, reading, vault, chute, unity, lostFound } = placements;

    const lines=[];
    // Optionally mark signal rooms using shared placement (no letters)
    const showSignals = String(q.signals||'0') === '1';
    const signalCells = Array.from(signals.SIGNALS.keys());
    const baseChar=(x,y)=>{
      if(x===START.x && y===START.y) return 'S';
      if(x===lostFound.x && y===lostFound.y) return 'F';
      if(x===maths.x && y===maths.y) return 'A';
      if(x===reading.x && y===reading.y) return 'R';
      if(x===vault.x && y===vault.y) return 'V';
      if(x===chute.x && y===chute.y) return 'C';
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
    lines.push('Legend: @ you, S start, F lost&found, A mathematics, R reading, V vault, C chute, O oneness. Wrap gaps show corridors.');

    res.setHeader('cache-control', 'no-store');
    return res.status(200).json({ ok:true, lines });
  }catch(e){
    return res.status(500).json({ ok:false, error:'server_error' });
  }
}
