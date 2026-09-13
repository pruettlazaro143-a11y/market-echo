import {parseCSV,validateBars,MAX_BARS,MAX_CSV_BYTES} from './engine.mjs';
export function parseBinanceKlines(text){
 const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(l=>l.trim());
 if(/^open_time,/i.test(lines[0]))lines.shift();
 const ms=n=>Math.floor(n>=1e14?n/1000:n);
 return lines.map(line=>{
  const v=line.split(',').map(s=>s.trim());
  if(v.length!==12||v.slice(0,7).some(s=>!s||!Number.isFinite(Number(s))))throw Error('BINANCE_FORMAT_INVALID');
  const open=Number(v[0]),close=Number(v[6]);
  if(!Number.isSafeInteger(open)||!Number.isSafeInteger(close)||open<1e11||close<open||(open>=1e14)!==(close>=1e14))throw Error('BINANCE_FORMAT_INVALID');
  return {t:ms(open),end:ms(close)+1,o:Number(v[1]),h:Number(v[2]),l:Number(v[3]),c:Number(v[4]),v:Number(v[5]),complete:true};
 });
}
export function mergeCSV(files,timeframeMs,format='standard'){
 if(!['standard','binance'].includes(format))throw Error('CSV_FORMAT_INVALID');
 if(!Array.isArray(files)||!files.length||files.length>24)throw Error('CSV_FILES_LIMIT');
 if(files.some(f=>typeof f.text!=='string')||files.reduce((n,f)=>n+new TextEncoder().encode(f.text).length,0)>MAX_CSV_BYTES)throw Error('CSV 最大 30 MB');
 const byTime=new Map();let duplicates=0;
 for(const file of files){
  const parsed=format==='binance'?parseBinanceKlines(file.text):parseCSV(file.text,timeframeMs);
  // Validate before deduplication so malformed duplicates cannot be hidden.
  const checked=validateBars(parsed,{asOf:Number.MAX_SAFE_INTEGER});
  for(const bar of checked.bars){
   const old=byTime.get(bar.t);
   if(old){if(['end','o','h','l','c','v'].some(k=>old[k]!==bar[k]))throw Error('CSV_CONFLICT');duplicates++;}
   else byTime.set(bar.t,bar);
   if(byTime.size>MAX_BARS)throw Error('CSV_BAR_LIMIT');
  }
 }
 return {bars:[...byTime.values()].sort((a,b)=>a.t-b.t),duplicates,fileCount:files.length};
}
