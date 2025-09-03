// api/maze-step.js — server-side movement for Maze
// Stateless: computes next position based on seed, current x,y, dir, and flags

const COMMON = require('./maze-common');

module.exports = async function (req, res) {
  try{
    const q = req.query || {};
    let x = parseInt(q.x ?? '0', 10) || 0;
    let y = parseInt(q.y ?? '0', 10) || 0;
    const dir = String(q.dir || '').toLowerCase();
    const seedStr = String(q.seed ?? COMMON.DEFAULT_SEED_STR);
    const steps = parseInt(q.steps ?? '0', 10) || 0; // for deterministic chute teleport
    const secretOpen = String(q.secretOpen ?? 'false') === 'true';
    const inVault = String(q.inVault ?? 'false') === 'true';

    const SEED = COMMON.hashStringToInt(seedStr);
    const rng0 = COMMON.mulberry32(SEED);
    const WIDTH = COMMON.WIDTH, HEIGHT = COMMON.HEIGHT;
    const world = COMMON.buildWorld(seedStr);
    const placements = world.placements;
    const MAZE = JSON.parse(JSON.stringify(world.MAZE)); // shallow clone for secretOpen modification

    // Optionally open secret passage if player has placed the book
    if(secretOpen){
      const SECRET = { x:placements.SECRET_SHELF.x, y:placements.SECRET_SHELF.y, dir:placements.SECRET_SHELF.dir, nx:placements.SECRET_ANNEX.x, ny:placements.SECRET_ANNEX.y };
      const a=`${SECRET.x},${SECRET.y}`, b=`${SECRET.nx},${SECRET.ny}`;
      if(!MAZE[a]) MAZE[a]={}; if(!MAZE[b]) MAZE[b]={};
      MAZE[a][SECRET.dir]=true; MAZE[b][COMMON.OPP[SECRET.dir]]=true;
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
    if(dir==='s' && x===placements.chute.x && y===placements.chute.y){
      // Teleport through the chute to a normal (non-special, non-signal) room
      const banned = new Set();
      const specials = [placements.lostFound, placements.maths, placements.reading, placements.vault, placements.unity, placements.SECRET_SHELF, placements.SECRET_ANNEX, placements.chute];
      for(const s of specials){ banned.add(`${s.x},${s.y}`); }
      for(const key of world.signals.SIGNALS.keys()){ banned.add(key); }

      // Pick a random cell not in banned (with limit), else fallback scan
      let rx=-1, ry=-1; let attempts=0; const MAX_ATTEMPTS=2000;
      while(attempts<MAX_ATTEMPTS){
        const rloc = COMMON.mulberry32((SEED ^ 0xABCDEF ^ ((steps+1+attempts)>>>0))>>>0);
        const tx = Math.floor(rloc()*WIDTH), ty = Math.floor(rloc()*HEIGHT);
        if(!banned.has(`${tx},${ty}`)){ rx=tx; ry=ty; break; }
        attempts++;
      }
      if(rx===-1){
        // Fallback: first non-banned cell
        outer: for(let yy=0; yy<HEIGHT; yy++){
          for(let xx=0; xx<WIDTH; xx++){
            if(!banned.has(`${xx},${yy}`)){ rx=xx; ry=yy; break outer; }
          }
        }
        if(rx===-1){ rx = START.x; ry = START.y; }
      }
      return res.status(200).json({ ok:true, x:rx, y:ry, inVault:false, blocked:false, teleported:true, reason:'chute' });
    }

    // Normal neighbor step with wrap
    const g = MAZE[`${x},${y}`] || {};
    if(g[dir]){
      const nx=(x+COMMON.DX[dir]+WIDTH)%WIDTH, ny=(y+COMMON.DY[dir]+HEIGHT)%HEIGHT;
      return res.status(200).json({ ok:true, x:nx, y:ny, inVault:false, blocked:false });
    } else {
      return res.status(200).json({ ok:true, x, y, inVault:false, blocked:true });
    }
  }catch(e){
    return res.status(500).json({ ok:false, error:'server_error' });
  }
}
