import test from 'node:test';
import assert from 'node:assert/strict';
import {loadMarketHistory} from '../server/market-data.mjs';
import {prepareReplay,revealReplay} from '../lib/market-echo/replay.mjs';
import {demoInput,analyze} from '../lib/market-echo/engine.mjs';
import {priceProjection,aiEvidence} from '../lib/market-echo/presentation.mjs';
import {matchDetail} from '../lib/market-echo/match-detail.mjs';
import {insightPayload} from '../lib/market-echo/insights.mjs';
const ms=3600000,start=Date.UTC(2025,0,1);
const row=i=>[start+i*ms,'10','12','9','11','7',start+(i+1)*ms-1,'0',0,'0','0','0'];
test('market history paginates backwards, returns sorted closed bars, uses only fixed public endpoint',async()=>{
 let calls=0;const now=start+2500*ms;
 const r=await loadMarketHistory({symbol:'BTCUSDT',timeframe:'1h',limit:1000},{now,fetchImpl:async(url,options)=>{
  const u=new URL(url);assert.equal(u.origin,'https://data-api.binance.vision');assert.equal(options.redirect,'error');assert.equal(options.headers,undefined);calls++;
  const end=Number(u.searchParams.get('endTime'));
  const data=Array.from({length:1000},(_,j)=>row((calls===1?2000:1000)+j)).filter(r=>r[0]<=end);
  return Response.json(data);
 }});
 assert.equal(calls,2);assert.equal(r.bars.length,1000);assert.equal(r.bars.at(-1).end,now);assert.equal(r.bars[0].t,now-1000*ms);assert.equal(r.metadata.partial,false);
});
test('market errors never substitute data; bad config never calls network',async()=>{
 let called=false;await assert.rejects(loadMarketHistory({symbol:'AAPL',timeframe:'1h',limit:1000},{fetchImpl:async()=>{called=true;}}),/MARKET_CONFIG_INVALID/);assert.equal(called,false);
 for(const [status,code] of [[429,'MARKET_RATE_LIMITED'],[451,'MARKET_UNAVAILABLE'],[500,'MARKET_PROVIDER_ERROR']])await assert.rejects(loadMarketHistory({symbol:'ETHUSDT',timeframe:'1h',limit:1000},{fetchImpl:async()=>new Response('private raw text',{status})}),new RegExp(code));
 await assert.rejects(loadMarketHistory({symbol:'BTCUSDT',timeframe:'1h',limit:1000},{fetchImpl:async()=>Response.json([[1,'',2]])}),/MARKET_RESPONSE_INVALID/);
});
test('partial histories and exclusion of the open candle are explicit',async()=>{
 let n=0;const r=await loadMarketHistory({symbol:'BTCUSDT',timeframe:'1h',limit:1000},{now:start+2.5*ms,fetchImpl:async()=>Response.json(n++?[]:[row(0),row(1),row(2)])});
 assert.equal(r.bars.length,2);assert.equal(r.metadata.droppedOpen,1);assert.equal(r.metadata.partial,true);assert.equal(r.metadata.exhausted,true);
});
test('holdout outcome cannot affect anchor, retrieval, indicators, or AI evidence',()=>{
 const input=demoInput();const before=prepareReplay(input),cutoff=Date.parse(before.result.asOf);
 const modified={...input,bars:input.bars.map(b=>b.end>cutoff?{...b,o:b.o*2,h:b.h*2,l:b.l*2,c:b.c*2,v:b.v*3}:b)};
 const after=prepareReplay(modified);
 assert.equal(after.result.asOf,before.result.asOf);assert.deepEqual(after.result.cases,before.result.cases);assert.deepEqual(after.result.indicators,before.result.indicators);
 assert.deepEqual(insightPayload(aiEvidence(after.result),'compare'),insightPayload(aiEvidence(before.result),'compare'));
 assert.equal(before.result.replay.actual,null);assert.equal(priceProjection(before.result).actualFuture,null);assert.notEqual(before.actual.change,after.actual.change);
 const frozen=before.result.cases.map(c=>c.id);before.result.replay=revealReplay(before.result,before.actual);
 assert.deepEqual(before.result.cases.map(c=>c.id),frozen);assert.equal(priceProjection(before.result).actualFuture.price,before.actual.price);
 assert.throws(()=>revealReplay(before.result,before.actual),/REPLAY_UNAVAILABLE/);
});
test('replay supports daily A-shares and insufficient history does not fabricate outcomes',()=>{
 const input=demoInput({marketKey:'cn_equity',timeframe:'1d'}),replay=prepareReplay(input);
 assert.equal(replay.result.replay.state,'hidden');assert.ok(Date.parse(replay.actual.end)>Date.parse(replay.result.asOf));
 assert.equal(priceProjection(replay.result).endpoint,replay.actual.end);
 assert.throws(()=>prepareReplay({...input,bars:input.bars.slice(-96)}),/REPLAY_UNAVAILABLE/);
});
test('normalized overlay matches existing engine shape distance and weighted distance',()=>{
 for(const mode of ['full','structure_only']){
  const r=analyze({...demoInput(),comparisonMode:mode}),d=matchDetail(r,0);
  assert.ok(Math.abs(d.shapeDistance-r.cases[0].components.shape)<1e-12);
  assert.ok(Math.abs(d.components.reduce((s,c)=>s+c.contribution,0)-r.cases[0].distance)<1e-12);
  assert.equal(d.query.length,32);assert.ok(d.largestDifferenceQuarter>=1&&d.largestDifferenceQuarter<=4);
  if(mode==='structure_only')assert.deepEqual(d.components.map(c=>c.key),['shape','structure']);
 }
});
