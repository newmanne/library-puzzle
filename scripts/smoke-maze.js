// scripts/smoke-maze.js — quick sanity check for maze changes
const COMMON = require('../lib/maze-common');
const handler = require('../api/maze');

function mockRes(){
  let statusCode = 200;
  const headers = {};
  return {
    headers,
    status(code){ statusCode = code; return this; },
    setHeader(k,v){ headers[k]=v; },
    json(obj){ return Promise.resolve({ statusCode, headers, body: obj }); }
  };
}

async function call(op, { method='GET', query={}, body }={}){
  const req = { method, query: { op, ...query }, body };
  const res = mockRes();
  return await handler(req, res);
}

(async function main(){
  const world = COMMON.buildWorld(COMMON.DEFAULT_SEED_STR);
  const rr = world.placements.restroom;
  const start = world.placements.START;

  // 1) Room at restroom
  const roomRR = await call('room', { query:{ x:String(rr.x), y:String(rr.y) } });
  console.log('[room restroom]', roomRR.statusCode, roomRR.body && roomRR.body.flags);
  if(!(roomRR.body && roomRR.body.flags && roomRR.body.flags.restroom)){
    throw new Error('Restroom flags missing');
  }

  // 2) Map with signals
  const map = await call('map', { query:{ x:'0', y:'0', signals:'1' } });
  const mapLines = (map.body && map.body.lines) || [];
  const legend = mapLines[mapLines.length-1] || '';
  console.log('[legend]', legend);
  if(/chute/i.test(legend) || /lost\s*&\s*found/i.test(legend)){
    throw new Error('Legend still references chute or Lost & Found');
  }
  const starCount = mapLines.join('\n').split('*').length - 1;
  console.log('[signals] stars =', starCount);
  if(starCount < COMMON.SIGNAL_COUNT){
    throw new Error(`Expected at least ${COMMON.SIGNAL_COUNT} signal marks`);
  }

  // 3) Answer check
  const good = await call('check', { method:'POST', body:{ word: COMMON.FINAL } });
  const bad  = await call('check', { method:'POST', body:{ word: 'LATEFEES' } });
  console.log('[check FINES]', good.body);
  console.log('[check LATEFEES]', bad.body);
  if(!(good.body && good.body.ok) || (bad.body && bad.body.ok)){
    throw new Error('Answer checking mismatch');
  }

  // 4) Pull behavior
  const pullRR = await call('pull', { query:{ x:String(rr.x), y:String(rr.y) } });
  console.log('[pull restroom]', pullRR.body);
  if(!(pullRR.body && pullRR.body.ok===false && pullRR.body.error==='special_room')){
    throw new Error('Pull in restroom should be blocked');
  }
  const pullStart = await call('pull', { query:{ x:String(start.x), y:String(start.y) } });
  console.log('[pull start]', pullStart.body && pullStart.body.title);
  if(!(pullStart.body && pullStart.body.ok)){
    throw new Error('Pull at start should succeed');
  }

  console.log('Smoke tests passed.');
})().catch(e=>{ console.error('Smoke test failed:', e && e.message ? e.message : e); process.exit(1); });

