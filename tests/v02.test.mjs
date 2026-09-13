import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze,demoInput} from '../lib/market-echo/engine.mjs';
import {marketConfig} from '../lib/market-echo/markets.mjs';
import {priceProjection,aiEvidence} from '../lib/market-echo/presentation.mjs';
import {tr,errorText} from '../web/i18n.mjs';

test('baseline and endpoint map historical returns without inventing actual future prices',()=>{
 const r=analyze(demoInput());const p=priceProjection(r);
 assert.equal(p.base,r.query.at(-1).c);assert.equal(p.actualFuture,null);
 assert.equal(Date.parse(p.endpoint)-Date.parse(p.asOf),24*3600000);
 assert.equal(p.quantiles.median.price,p.base*(1+r.distribution.median/100));
 for(let i=0;i<p.cases.length;i++){assert.equal(p.cases[i].price,p.base*(1+r.cases[i].returnPct/100));assert.equal(p.cases[i].historicalEnd,r.cases[i].future.at(-1).c);}
});
test('other crypto ignores volume values and exposes no rebased targets',()=>{
 const input=demoInput({marketKey:'crypto_other',symbol:'ALT/USDT'});
 const r=analyze(input);const varied=analyze({...input,bars:input.bars.map((b,i)=>({...b,v:i%7?1e8:1}))});
 assert.equal(r.comparisonMode,'structure_only');assert.deepEqual(r.cases.map(c=>c.id),varied.cases.map(c=>c.id));
 assert.equal(priceProjection(r).pricesEnabled,false);assert.equal(priceProjection(r).quantiles.median.price,null);
 assert.equal(aiEvidence(r).quantiles.median.price,null);
});
test('ETH uses full comparison and China A-shares use daily sessions',()=>{
 assert.equal(marketConfig('crypto','ETH').comparisonMode,'full');
 const cfg=marketConfig('cn','CUSTOM');assert.equal(cfg.sessionPolicy,'cn_exchange');
 const input=demoInput({marketKey:cfg.marketKey,timeframe:'1d',decisionHorizon:{value:5,unit:'trading_day'}});
 const r=analyze(input);assert.ok(r.cases.length);assert.equal(r.forecastEnd,null);assert.ok(r.cases.every(c=>c.future.length===5));
 assert.throws(()=>analyze({...input,timeframe:'1h'}),/A 股首版/);
});
test('AI evidence excludes raw CSV and marks synthetic data',()=>{
 const r=analyze(demoInput()),e=aiEvidence(r);assert.equal(e.synthetic,true);assert.ok(e.cases.length<=5);assert.equal(e.query,undefined);assert.ok(!JSON.stringify(e).includes('"bars"'));
});
test('English errors and visible string translations resolve',()=>{
 assert.equal(tr('en','base'),'① Baseline price');assert.match(errorText('CSV 必填字段不能为空','en'),/cannot be empty/);assert.match(tr('en','calendarPending',{n:5}),/5 trading days/);
});
test('daily equities accept actual session-close timestamps',()=>{
 const input=demoInput({marketKey:'cn_equity',timeframe:'1d',decisionHorizon:{value:5,unit:'trading_day'}});
 input.bars=input.bars.map(b=>({...b,end:b.t+5.5*3600000}));
 assert.ok(analyze(input).cases.length>0);
});
