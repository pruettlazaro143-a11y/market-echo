import test from 'node:test';
import assert from 'node:assert/strict';
import {movingAverage,indicatorSnapshot} from '../lib/market-echo/indicators.mjs';
import {mergeCSV,parseBinanceKlines} from '../lib/market-echo/imports.mjs';
import {analyze,demoInput,MAX_BARS,validateBars} from '../lib/market-echo/engine.mjs';
const header='timestamp,open,high,low,close,volume';
const rows=['1704067200000,10,12,9,11,5','1704070800000,11,13,10,12,6'];
test('SMA and SMA-seeded EMA use exact causal warmup',()=>{
 assert.deepEqual(movingAverage([1,2,3,4,5],3),[null,null,2,3,4]);
 assert.deepEqual(movingAverage([1,2,3,8,5],3,'ema'),[null,null,2,5,5]);
 assert.deepEqual(movingAverage([1,2],3),[null,null]);
 const bars=Array.from({length:205},(_,i)=>({end:i+1,c:i+1,complete:true}));
 const snap=indicatorSnapshot([...bars,{end:300,c:1e6}],109,205);
 assert.equal(snap.series.ma200.length,96);assert.equal(snap.series.ma200.at(-1),105.5);
 assert.deepEqual(snap,indicatorSnapshot(bars,109,205));
});
test('multi-file history merges sorted identical overlaps, rejects conflicts and ambiguous mixed records',()=>{
 const a={text:[header,...rows].join('\n')},b={text:[header,rows[1]].join('\n')};
 const merged=mergeCSV([b,a],3600000);assert.equal(merged.bars.length,2);assert.equal(merged.duplicates,1);assert.equal(merged.bars[0].c,11);
 assert.throws(()=>mergeCSV([a,{text:[header,rows[1].replace(',12,6',',12.5,6')].join('\n')}],3600000),/CSV_CONFLICT/);
 assert.throws(()=>mergeCSV([{text:[header,rows[0],rows[0]].join('\n')}],3600000),/重复/);
 assert.throws(()=>mergeCSV(Array(25).fill(a),3600000),/CSV_FILES_LIMIT/);
});
test('case cap changes only selection size, diagnostics reconcile and indicators ignore later bars',()=>{
 const input=demoInput();const a=analyze(input),b=analyze({...input,maxCases:100});
 assert.deepEqual(a.cases.map(c=>c.id),b.cases.slice(0,a.cases.length).map(c=>c.id));
 assert.deepEqual(a.indicators,b.indicators);
 assert.equal(a.coverage.examined,a.rejectedGaps+a.rejectedImmature+a.coverage.rejectedFlat+a.coverage.rejectedDistance+a.rawCandidates);
 const extra={...input.bars.at(-1),t:input.bars.at(-1).end,end:input.bars.at(-1).end+3600000,c:input.bars.at(-1).c*1.01};extra.h=Math.max(extra.h,extra.c);
 const later=analyze({...input,bars:[...input.bars,extra]});
 assert.deepEqual(a.indicators,later.indicators);assert.equal(later.coverage.droppedOpen,1);
});
test('daily A-share extended holiday is admitted as unverified while very long missing stretches are rejected',()=>{
 const input=demoInput({marketKey:'cn_equity',timeframe:'1d'}),at=input.bars.length-50;
 function shifted(days){return {...input,asOf:new Date(input.bars.at(-1).end).toISOString(),bars:input.bars.map((b,i)=>i<at?{...b,t:b.t-days*86400000,end:b.end-days*86400000}:b)};}
 assert.doesNotThrow(()=>analyze(shifted(10)));
 assert.throws(()=>analyze(shifted(30)),/缺口/);
});
test('100,000 bar import capacity has a hard boundary',()=>{
 const base={t:Date.UTC(2000,0,1),end:Date.UTC(2000,0,1)+3600000,o:10,h:11,l:9,c:10,v:null};
 const bars=Array.from({length:MAX_BARS},(_,i)=>({...base,t:base.t+i*3600000,end:base.end+i*3600000}));
 assert.equal(validateBars(bars).bars.length,100000);
 assert.throws(()=>validateBars([...bars,bars[0]]),/最多/);
});

test('Binance millisecond and microsecond archives normalize to exclusive close boundaries',()=>{
 const tail=',11,13,10,12,6,';
 const a=parseBinanceKlines('1704067200000'+tail+'1704070799999,1,1,1,1,0');
 const b=parseBinanceKlines('1704067200000000'+tail+'1704070799999999,1,1,1,1,0');
 assert.deepEqual(a,b);assert.equal(a[0].end-a[0].t,3600000);
 assert.throws(()=>parseBinanceKlines('a,b,c'),/BINANCE_FORMAT_INVALID/);
});
