import {analyze,demoInput,parseCSV,TIMEFRAMES} from '../lib/market-echo/engine.mjs';
self.onmessage=({data})=>{
 try{
  const s=data.settings;let input;
  if(data.source==='demo')input={...demoInput(s),comparisonMode:s.comparisonMode};
  else input={...s,bars:parseCSV(data.csv,TIMEFRAMES[s.timeframe].ms),source:'user_import',synthetic:data.synthetic,sessionPolicy:s.sessionPolicy||'continuous_24_7',events:[]};
  const result=analyze(input);result.quoteUnit=s.quoteUnit||'CSV unit';result.instrument=s.instrument||'unspecified';self.postMessage({result});
 }catch(error){self.postMessage({error:error.message||'检索失败，请检查数据。'});}
};
