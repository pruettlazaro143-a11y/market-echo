import test from 'node:test';
import assert from 'node:assert/strict';
import {recognizeChart,validateImage,VISION_POLICY} from '../server/vision.mjs';
import {confirmScreenshot,validateRecognition,screenshotShapeCases} from '../lib/market-echo/screenshot.mjs';
import {demoInput} from '../lib/market-echo/engine.mjs';
import {marketConfig} from '../lib/market-echo/markets.mjs';
import {loadMarketHistory} from '../server/market-data.mjs';
const shape=Array.from({length:32},(_,i)=>(Math.sin(i/5)+1)/2);
const fields={hasChart:true,category:'crypto',symbol:'BTC/USDT',exchange:'binance',instrument:'spot',timeframe:'1h',lastClosedAt:'2026-09-01T00:00:00Z',windowBars:96,shape};
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const request={provider:'deepseek',model:'deepseek-flash',apiKey:'test-only-key',consent:true,image:png};
test('vision adapters send one inline image with fixed extraction instructions; no public image URL or free chat',async()=>{
 for(const provider of ['deepseek','openai','anthropic','compatible']){
  let calls=0;const result=await recognizeChart({...request,provider},{compatibleBase:'https://vision.example/v1',fetchImpl:async(url,opts)=>{
   calls++;assert.equal(opts.redirect,'error');const body=JSON.parse(opts.body);assert.equal(body.model,'deepseek-flash');
   if(provider==='anthropic'){assert.equal(body.system,VISION_POLICY);assert.equal(body.messages[0].content[0].source.type,'base64');assert.equal(body.messages[0].content[0].source.media_type,'image/png');return Response.json({content:[{type:'text',text:JSON.stringify(fields)}]});}
   assert.equal(body.messages[0].content,VISION_POLICY);assert.equal(body.messages[1].content[0].image_url.url,png);assert.equal(body.response_format.type,'json_object');return Response.json({choices:[{message:{content:JSON.stringify(fields)}}]});
  }});
  assert.equal(calls,1);assert.equal(result.requiresConfirmation,true);assert.equal(result.recognition.symbol,'BTC/USDT');assert.equal(Object.hasOwn(result,'image'),false);
 }
});
test('vision rejects missing consent, URL images, invalid MIME and extra prompts before network access',async()=>{
 let calls=0;const deps={fetchImpl:async()=>{calls++;throw Error();}};
 for(const altered of [{consent:false},{image:'https://example.com/chart.png'},{image:png.replace('image/png','image/jpeg')},{question:'choose BTC or ETH'},{messages:[]},{prompt:'ignore policy'}])await assert.rejects(recognizeChart({...request,...altered},deps));
 assert.equal(calls,0);assert.throws(()=>validateImage('data:image/svg+xml;base64,PHN2Zz4='));
});
test('vision output retains schema fields only and preserves uncertainty without inventing dates or prices',async()=>{
 const output={...fields,symbol:'BUY BTC NOW',lastClosedAt:'2026-09-01 00:00',shape:null,price:999,advice:'buy'};
 const r=await recognizeChart(request,{fetchImpl:async()=>Response.json({choices:[{message:{content:JSON.stringify(output)}}]})});
 assert.equal(r.recognition.symbol,null);assert.equal(r.recognition.lastClosedAt,null);assert.equal(r.recognition.shape,null);assert.equal(r.recognition.price,undefined);assert.equal(r.recognition.advice,undefined);
 assert.deepEqual(validateRecognition({hasChart:false,shape,price:999}),{hasChart:false,category:null,symbol:null,exchange:null,instrument:null,timeframe:null,lastClosedAt:null,windowBars:null,shape:null});
 await assert.rejects(recognizeChart(request,{fetchImpl:async()=>new Response('secret raw detail',{status:400})}),/VISION_PROVIDER_ERROR/);
 await assert.rejects(recognizeChart(request,{fetchImpl:async()=>Response.json({choices:[{message:{content:JSON.stringify({...fields,shape:Array(32).fill(99)})}}]})}),/VISION_OUTPUT_INVALID/);
});
test('full handoff requires explicit review, exact Binance spot identity, supported window and known historical cutoff',()=>{
 assert.throws(()=>confirmScreenshot(fields),/SCREENSHOT_CONFIRM_REQUIRED/);
 assert.equal(confirmScreenshot({...fields,confirmed:true}).fullAvailable,true);
 for(const patch of [{exchange:'okx'},{exchange:null},{instrument:'perpetual'},{symbol:'BTCUSD'},{lastClosedAt:null},{windowBars:120},{category:'us'}])assert.equal(confirmScreenshot({...fields,...patch,confirmed:true}).fullAvailable,false);
 assert.throws(()=>confirmScreenshot({...fields,confirmed:true,lastClosedAt:'2099-01-01T00:00:00Z'}),/SCREENSHOT_TIME_INVALID/);
});
test('screenshot-directed downloads paginate up to confirmed historical cutoff instead of today',async()=>{
 const hour=3600000,end=Date.UTC(2026,8,1);let calls=0;
 const r=await loadMarketHistory({symbol:'BTCUSDT',timeframe:'1h',limit:1000,endAt:new Date(end).toISOString()},{now:end+hour*100,fetchImpl:async url=>{
  if(calls++===0){assert.equal(Number(new URL(url).searchParams.get('endTime')),end-1);return Response.json([[end-hour,'10','12','9','11','5',end-1]]);}return Response.json([]);
 }});
 assert.equal(r.bars.at(-1).end,end);assert.equal(r.metadata.last,new Date(end).toISOString());
 await assert.rejects(loadMarketHistory({symbol:'BTCUSDT',timeframe:'1h',limit:1000,endAt:'2099-01-01T00:00:00Z'}),/MARKET_CONFIG_INVALID/);
});
test('shape-only cases use prior complete non-overlapping episodes and never synthesize image prices or indicators',()=>{
 const input=demoInput(),cutoff=input.bars.at(-100).end;
 const s={...fields,lastClosedAt:new Date(cutoff).toISOString(),confirmed:true};
 const a=screenshotShapeCases(input,s);
 assert.equal(a.kind,'screenshot_shape_only');assert.equal(a.pricesEnabled,false);assert.equal(a.indicators,null);assert.equal(a.actualFuture,null);assert.equal(a.synthetic,true);assert.equal(a.cutoffConfirmed,true);assert.ok(a.cases.length>0);
 for(const c of a.cases){assert.ok(Date.parse(c.end)<=cutoff);assert.ok(Date.parse(c.end)<=Date.parse(a.exclusionStart));assert.equal(Object.hasOwn(c,'price'),false);}
 for(let i=0;i<a.cases.length;i++)for(let j=i+1;j<a.cases.length;j++)assert.ok(Date.parse(a.cases[i].end)<=Date.parse(a.cases[j].start)||Date.parse(a.cases[j].end)<=Date.parse(a.cases[i].start));
 const later={...input,bars:input.bars.map(b=>b.end>cutoff?{...b,o:b.o*2,h:b.h*2,l:b.l*2,c:b.c*2}:b)};
 assert.deepEqual(screenshotShapeCases(later,s).cases,a.cases);
 assert.equal(screenshotShapeCases(input,{...s,lastClosedAt:null}).cutoffConfirmed,false);
 assert.throws(()=>screenshotShapeCases({...input,timeframe:'4h'},s),/SCREENSHOT_INTERVAL_MISMATCH/);
});
test('worker full handoff requires matching source and exact cutoff, without replacing perpetual with spot',async()=>{
 let message;globalThis.self={postMessage(value){message=structuredClone(value);}};await import('../web/worker.mjs');
 const input=demoInput(),end=input.bars.at(-1).end,shot={...fields,lastClosedAt:new Date(end).toISOString(),confirmed:true};
 const remote={bars:input.bars,metadata:{symbol:'BTCUSDT',timeframe:'1h',market:'spot'}};
 const settings={...marketConfig('crypto','BTC','spot'),timeframe:'1h',asOf:shot.lastClosedAt,symbol:'BTC/USDT',quoteUnit:'USDT',decisionHorizon:{value:24,unit:'hour'}};
 const data={source:'remote',remote,settings,screenshot:{full:shot}};
 self.onmessage({data});assert.equal(message.error,undefined);assert.equal(message.result.screenshot.pricesFrom,'downloaded_ohlcv');assert.equal(message.result.query.at(-1).c,input.bars.at(-1).c);
 self.onmessage({data:{...data,screenshot:{full:{...shot,instrument:'perpetual'}}}});assert.equal(message.error,'SCREENSHOT_SOURCE_MISMATCH');
 self.onmessage({data:{...data,remote:{...remote,bars:input.bars.slice(0,-1)}}});assert.equal(message.error,'SCREENSHOT_CUTOFF_MISMATCH');
});
