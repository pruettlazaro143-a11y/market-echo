import {mergeCSV} from '../lib/market-echo/imports.mjs';
import {analyze,demoInput,TIMEFRAMES} from '../lib/market-echo/engine.mjs';
self.onmessage=({data})=>{
 try{
  const s=data.settings;let input,merged=null;
  if(data.source==='demo')input={...demoInput(s),comparisonMode:s.comparisonMode};
  else {merged=mergeCSV(data.files||[{text:data.csv}],TIMEFRAMES[s.timeframe].ms,data.format||'standard');input={...s,bars:merged.bars,source:'user_import',synthetic:data.synthetic,sessionPolicy:s.sessionPolicy||'continuous_24_7',events:[]};}
  input.maxCases=s.maxCases;const result=analyze(input);result.importInfo=merged?{fileCount:merged.fileCount,duplicates:merged.duplicates,provider:String(data.provider||'').slice(0,120),adjustment:data.adjustment||'unknown',verified:false}:null;result.quoteUnit=s.quoteUnit||'CSV unit';result.instrument=s.instrument||'unspecified';self.postMessage({result});
 }catch(error){self.postMessage({error:error.message||'检索失败，请检查数据。'});}
};
