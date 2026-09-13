import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('local AI server enforces same-origin, protects source and handles invalid requests',async()=>{
 const proc=spawn(process.execPath,['scripts/serve.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'4189'},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(proc.stdout,'data'),once(proc,'exit').then(()=>{throw Error('server exited');})]);
  const base='http://127.0.0.1:4189';
  const cfg=await (await fetch(base+'/api/config')).json();assert.equal(cfg.ai,true);assert.ok(cfg.endpoints.deepseek);
  for(const file of ['/server/ai.mjs','/.env.local','/package.json'])assert.equal((await fetch(base+file)).status,404);
  assert.equal((await fetch(base+'/api/explain',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://attacker.example'},body:'{}'})).status,403);
  const res=await fetch(base+'/api/explain',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:'not json'});assert.equal(res.status,400);assert.deepEqual(await res.json(),{error:'AI_REQUEST_INVALID'});
 }finally{proc.kill();await once(proc,'exit');}
});
