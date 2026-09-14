import {TIMEFRAMES,validateBars,alignShape,historicalOutcome,normalizeDecisionHorizon,normalizedShape} from './engine.mjs';
const pick=(value,allowed)=>allowed.includes(value)?value:null;
const ticker=value=>typeof value==='string'&&/^[A-Za-z0-9.^:/_-]{1,40}$/.test(value)?value.toUpperCase():null;
export function explicitTime(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))return null;
 return new Date(value).toISOString();
}
export function validateShape(shape){
 if(!Array.isArray(shape)||shape.length!==32||!shape.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1)||Math.max(...shape)-Math.min(...shape)<.05)throw Error('SCREENSHOT_SHAPE_INVALID');
 return [...shape];
}
export function validateRecognition(value){
 if(!value||typeof value.hasChart!=='boolean')throw Error('VISION_OUTPUT_INVALID');
 if(!value.hasChart)return {hasChart:false,category:null,symbol:null,exchange:null,instrument:null,timeframe:null,lastClosedAt:null,windowBars:null,shape:null};
 return {hasChart:true,category:pick(value.category,['crypto','us','cn','metals']),symbol:ticker(value.symbol),exchange:pick(value.exchange,['binance','okx','other']),instrument:pick(value.instrument,['spot','perpetual','futures','stock']),timeframe:pick(value.timeframe,Object.keys(TIMEFRAMES)),lastClosedAt:explicitTime(value.lastClosedAt),windowBars:Number.isInteger(value.windowBars)&&value.windowBars>=16&&value.windowBars<=384?value.windowBars:null,shape:value.shape===null?null:validateShape(value.shape)};
}
export function confirmScreenshot(value,{now=Date.now()}={}){
 if(value?.confirmed!==true)throw Error('SCREENSHOT_CONFIRM_REQUIRED');
 const r=validateRecognition({...value,hasChart:true});
 if(!r.timeframe||!r.windowBars)throw Error('SCREENSHOT_FIELDS_REQUIRED');
 if(value.lastClosedAt&&!r.lastClosedAt||r.lastClosedAt&&Date.parse(r.lastClosedAt)>now)throw Error('SCREENSHOT_TIME_INVALID');
 const symbol=r.symbol?.replace(/[\/_-]/g,'');
 const full=r.category==='crypto'&&r.exchange==='binance'&&r.instrument==='spot'&&['BTCUSDT','ETHUSDT'].includes(symbol)&&Boolean(r.lastClosedAt)&&r.windowBars===96;
 return {...r,confirmed:true,fullAvailable:full,marketSymbol:full?symbol:null};
}
export function screenshotShapeCases(input,confirmation){
 const s=confirmScreenshot(confirmation),shape=validateShape(s.shape);
 if(input.timeframe!==s.timeframe)throw Error('SCREENSHOT_INTERVAL_MISMATCH');
 const ceiling=s.lastClosedAt||input.asOf||new Date().toISOString();
 const asOf=input.asOf&&Date.parse(input.asOf)<Date.parse(ceiling)?input.asOf:ceiling;
 const bars=validateBars(input.bars,{asOf:Date.parse(asOf)}).bars,tf=TIMEFRAMES[s.timeframe];
 // Reserve the final reference window to avoid matching its near-overlapping self.
 const exclusionStart=bars.at(-s.windowBars)?.t??null;
 const horizon=normalizeDecisionHorizon(input.decisionHorizon,input.sessionPolicy);
 const found=alignShape(bars,shape,{lookback:s.windowBars,timeframeMs:tf.ms,sessionPolicy:input.sessionPolicy,maxCandidates:30,
  acceptCandidate(hit){if(hit.distance>.85||exclusionStart===null)return false;const o=historicalOutcome(bars,hit.index,horizon,input.sessionPolicy,tf.ms,false);if(!o||o.actualEnd>exclusionStart)return false;hit.outcomeIndex=o.outcomeIndex;return true;},
  isSeparated(a,b){return a.index-s.windowBars+1>b.outcomeIndex||a.outcomeIndex<b.index-s.windowBars+1;}});
 const cases=found.candidates.map((hit,i)=>{const o=historicalOutcome(bars,hit.index,horizon,input.sessionPolicy,tf.ms);return {id:i+1,anchor:hit.asOf,start:hit.start,end:new Date(o.actualEnd).toISOString(),similarity:hit.similarity,distance:hit.distance,shape:normalizedShape(bars.slice(hit.index-s.windowBars+1,hit.index+1)),change:o.returnPct};});
 const avg=shape.reduce((a,b)=>a+b,0)/32,dev=Math.sqrt(shape.reduce((a,b)=>a+(b-avg)**2,0)/32);
 return {kind:'screenshot_shape_only',queryShape:shape.map(v=>(v-avg)/dev),confirmation:s,synthetic:Boolean(input.synthetic),source:input.source,marketKey:input.marketKey,instrument:input.instrument||'unspecified',symbol:input.symbol,timeframe:input.timeframe,decisionHorizon:horizon,scannedBars:bars.length,cutoff:asOf,exclusionStart:exclusionStart===null?null:new Date(exclusionStart).toISOString(),cutoffConfirmed:Boolean(s.lastClosedAt),cases,pricesEnabled:false,indicators:null,actualFuture:null};
}
