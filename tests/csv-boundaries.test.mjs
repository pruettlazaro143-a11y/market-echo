import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,analyze,demoInput} from '../lib/market-echo/engine.mjs';
const header='timestamp,open,high,low,close\n';
test('CSV rejects absent prices and timezone-ambiguous dates',()=>{
  assert.throws(()=>parseCSV(header+'2025-01-01T00:00:00Z,,11,9,10'),/不能为空/);
  assert.throws(()=>parseCSV(header+'2025-01-01 00:00:00,10,11,9,10'),/时区/);
  assert.throws(()=>parseCSV(header+'2025-01-01T00:00:00Z,10,11,9,10,99'),/列数/);
});
test('CSV Unix seconds and offset ISO timestamps agree',()=>{
  const a=parseCSV(header+'1735689600,10,11,9,10')[0];
  const b=parseCSV(header+'2025-01-01T08:00:00+08:00,10,11,9,10')[0];
  assert.equal(a.t,b.t);assert.equal(a.v,null);
});
test('short history returns an honest empty cohort',()=>{
  const input=demoInput();input.bars=input.bars.slice(-96);
  const r=analyze(input);assert.equal(r.episodeCount,0);assert.equal(r.distribution.median,null);
});
