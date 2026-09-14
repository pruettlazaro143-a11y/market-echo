import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
let response;
globalThis.self={postMessage(value){response=value;}};
await import('../web/worker.mjs');
const settings={timeframe:'1h',marketKey:'btc_spot',symbol:'SYNTHETIC',decisionHorizon:{value:24,unit:'hour'}};
test('browser worker accepts the shipped CSV and preserves synthetic provenance',async()=>{
  const csv=await readFile(new URL('../examples/synthetic-btc-1h.csv',import.meta.url),'utf8');
  self.onmessage({data:{source:'csv',csv,synthetic:true,settings}});
  assert.equal(response.error,undefined);assert.equal(response.result.synthetic,true);
  assert.ok(response.result.cases.length>0);assert.equal(response.result.scannedBars,5200);
});
test('browser worker reports invalid input without a partial result',()=>{
  self.onmessage({data:{source:'csv',csv:'bad,data\n1,2',settings}});
  assert.equal(typeof response.error,'string');assert.equal(response.result,undefined);
});
test('worker withholds replay prices until reveal and clears them on a new run',()=>{
  self.onmessage({data:{source:'demo',replay:true,settings}});
  const before=structuredClone(response.result);
  assert.equal(before.replay.actual,null);assert.equal(before.replay.state,'hidden');
  assert.equal(Object.hasOwn(response,'actual'),false);
  self.onmessage({data:{type:'reveal'}});
  assert.equal(response.type,'revealed');assert.equal(response.replay.state,'revealed');assert.ok(response.replay.actual.future.length);
  self.onmessage({data:{source:'demo',replay:true,settings}});
  self.onmessage({data:{source:'csv',csv:'bad,data\n1,2',settings}});
  self.onmessage({data:{type:'reveal'}});assert.equal(response.error,'REPLAY_UNAVAILABLE');
});
