// Verify chute position matches between room flags and map output
const maze = require('../api/maze');

function mkRes(){
  let statusCode = 200;
  let headers = {};
  return {
    setHeader: (k,v)=>{ headers[k]=v; },
    status: (code)=>{ statusCode = code; return { json:(obj)=>({ statusCode, headers, body:obj }) }; },
  };
}

async function call(op, query){
  const req = { method:'GET', query: { ...query, op } };
  const res = mkRes();
  return await maze(req, res);
}

async function findChuteViaRoom(){
  const WIDTH=8, HEIGHT=7;
  for(let y=0;y<HEIGHT;y++){
    for(let x=0;x<WIDTH;x++){
      const r = await call('room', { x:String(x), y:String(y) });
      const b = r.body || r;
      const f = (b && b.flags) || {};
      if(f.chute) return {x,y};
    }
  }
  throw new Error('No chute found via room');
}

function parseCharFromMapLines(lines, target){
  // Find mid lines and locate 'C'
  // For each row y, the mid line is at lines index: 1 + y*2 (0-based top border at 0)
  const WIDTH=8, HEIGHT=7;
  for(let y=0;y<HEIGHT;y++){
    const mid = lines[1 + y*2];
    if(!mid) continue;
    for(let x=0;x<WIDTH;x++){
      const idx = 2 + 4*x;
      if(mid[idx] === target) return {x,y};
    }
  }
  throw new Error(`No ${target} found in map`);
}

async function main(){
  const roomChute = await findChuteViaRoom();
  const m = await call('map', { x:'0', y:'0' });
  const lines = (m.body || m).lines || [];
  const mapChute = parseCharFromMapLines(lines, 'C');
  const mapA = parseCharFromMapLines(lines, 'A');
  const mapR = parseCharFromMapLines(lines, 'R');
  const mapV = parseCharFromMapLines(lines, 'V');
  const mapO = parseCharFromMapLines(lines, 'O');
  const mapF = parseCharFromMapLines(lines, 'F');

  // Cross-check room flags
  async function findFlagCoord(flag){
    const WIDTH=8, HEIGHT=7;
    for(let y=0;y<HEIGHT;y++){
      for(let x=0;x<WIDTH;x++){
        const r = await call('room', { x:String(x), y:String(y) });
        const b = r.body || r;
        const f = (b && b.flags) || {};
        if(f[flag]) return {x,y};
      }
    }
    return null;
  }
  const rf = await findFlagCoord('lost');
  const ra = await findFlagCoord('math');
  const rr = await findFlagCoord('reading');
  const rv = await findFlagCoord('vault');
  const ro = await findFlagCoord('unity');
  console.log('Map   F/A/R/V/O/C:', mapF, mapA, mapR, mapV, mapO, mapChute);
  console.log('Room  F/A/R/V/O/C:', rf, ra, rr, rv, ro, roomChute);
  if(roomChute.x!==mapChute.x || roomChute.y!==mapChute.y){
    throw new Error('Chute mismatch');
  }
  console.log('Chute placement aligned.');
}

main().catch(e=>{ console.error(e); process.exit(1); });
