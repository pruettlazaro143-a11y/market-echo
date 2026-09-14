import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('local AI server enforces same-origin, protects source and handles invalid requests',async()=>{
 const proc=spawn(process.execPath,['scripts/serve.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'4189'},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(proc.stdout,'data'),once(proc,'exit').then(()=>{throw Error('server exited');})]);
  const base='http://127.0.0.1:4189';
  const cfg=await (await fetch(base+'/api/config')).json();assert.equal(cfg.ai,true);assert.equal(cfg.marketData,true);assert.equal(cfg.vision,true);assert.ok(cfg.endpoints.deepseek);
  assert.equal((await fetch(base+'/api/market-history')).status,405);
  assert.equal((await fetch(base+'/api/market-history',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://attacker.example'},body:'{}'})).status,403);
  const invalid=await fetch(base+'/api/market-history',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({symbol:'AAPL',timeframe:'1h',limit:1000})});assert.equal(invalid.status,400);assert.deepEqual(await invalid.json(),{error:'MARKET_CONFIG_INVALID'});
  assert.equal((await fetch(base+'/api/recognize-chart')).status,405);
  assert.equal((await fetch(base+'/api/recognize-chart',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://attacker.example'},body:'{}'})).status,403);
  const imageBad=await fetch(base+'/api/recognize-chart',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({consent:true,question:'choose'})});assert.equal(imageBad.status,400);assert.deepEqual(await imageBad.json(),{error:'VISION_REQUEST_INVALID'});
  for(const file of ['/server/vision.mjs','/server/ai.mjs','/.env.local','/package.json'])assert.equal((await fetch(base+file)).status,404);
  assert.equal((await fetch(base+'/api/explain',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://attacker.example'},body:'{}'})).status,403);
  const res=await fetch(base+'/api/explain',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:'not json'});assert.equal(res.status,400);assert.deepEqual(await res.json(),{error:'AI_REQUEST_INVALID'});
 }finally{proc.kill();await once(proc,'exit');}
});
