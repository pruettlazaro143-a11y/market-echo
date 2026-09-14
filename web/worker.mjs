import {mergeCSV} from '../lib/market-echo/imports.mjs';
import {analyze,demoInput,TIMEFRAMES} from '../lib/market-echo/engine.mjs';
import {prepareReplay,revealReplay} from '../lib/market-echo/replay.mjs';
import {confirmScreenshot,screenshotShapeCases} from '../lib/market-echo/screenshot.mjs';
let heldResult=null,heldActual=null;
self.onmessage=({data})=>{
 try{
  if(data.type==='reveal'){
   if(!heldResult)throw Error('REPLAY_UNAVAILABLE');
   self.postMessage({type:'revealed',replay:revealReplay(heldResult,heldActual)});heldResult=null;heldActual=null;return;
  }
  heldResult=null;heldActual=null;
  const s=data.settings;let input,merged=null;
  if(data.source==='demo')input={...demoInput(s),comparisonMode:s.comparisonMode};
  else if(data.source==='remote')input={...s,bars:data.remote.bars,source:'binance_public_spot',synthetic:false,events:[]};
  else {merged=mergeCSV(data.files||[{text:data.csv}],TIMEFRAMES[s.timeframe].ms,data.format||'standard');input={...s,bars:merged.bars,source:'user_import',synthetic:data.synthetic,sessionPolicy:s.sessionPolicy||'continuous_24_7',events:[]};}
  input.maxCases=s.maxCases;input.instrument=s.instrument||'unspecified';
  if(data.screenshot?.shape){
   self.postMessage({type:'shape',result:screenshotShapeCases(input,data.screenshot.shape)});return;
  }
  if(data.screenshot?.full){
   const shot=confirmScreenshot(data.screenshot.full);
   if(!shot.fullAvailable||data.source!=='remote'||data.remote.metadata.symbol!==shot.marketSymbol||data.remote.metadata.timeframe!==shot.timeframe||data.remote.metadata.market!=='spot'||input.timeframe!==shot.timeframe||input.asOf!==shot.lastClosedAt||data.replay)throw Error('SCREENSHOT_SOURCE_MISMATCH');
   if(input.bars.at(-1)?.end!==Date.parse(shot.lastClosedAt))throw Error('SCREENSHOT_CUTOFF_MISMATCH');
  }
  let result;
  if(data.replay){const replay=prepareReplay(input);result=replay.result;heldActual=replay.actual;}else result=analyze(input);
  result.importInfo=merged?{fileCount:merged.fileCount,duplicates:merged.duplicates,provider:String(data.provider||'').slice(0,120),adjustment:data.adjustment||'unknown',verified:false}:null;
  if(data.source==='remote'){result.importInfo={fileCount:0,duplicates:0,provider:'Binance public spot API',adjustment:'raw',verified:false};result.download=data.remote.metadata;}
  result.quoteUnit=s.quoteUnit||'CSV unit';result.instrument=s.instrument||'unspecified';
  if(data.screenshot?.full)result.screenshot={kind:'confirmed_metadata_to_ohlcv',confirmation:confirmScreenshot(data.screenshot.full),pricesFrom:'downloaded_ohlcv',imageRetained:false};
  if(data.replay)heldResult=result;
  self.postMessage({result});
 }catch(error){self.postMessage({error:error.message||'检索失败，请检查数据。'});}
};
