import {TIMEFRAMES,validateBars} from '../lib/market-echo/engine.mjs';
export class MarketDataError extends Error { constructor(code,status=502){super(code);this.code=code;this.status=status;} }
export const MARKET_ENDPOINT='https://data-api.binance.vision/api/v3/klines';
export async function loadMarketHistory(request,{fetchImpl=fetch,now=Date.now(),signal}={}){
 const {symbol,timeframe,limit}=request||{};
 if(!['BTCUSDT','ETHUSDT'].includes(symbol)||!Object.hasOwn(TIMEFRAMES,timeframe)||![1000,5000,10000].includes(limit))throw new MarketDataError('MARKET_CONFIG_INVALID',400);
 const ms=TIMEFRAMES[timeframe].ms,bars=new Map();let endTime=now-1,pages=0,droppedOpen=0,exhausted=false;
 const deadline=AbortSignal.any([AbortSignal.timeout(45000),...(signal?[signal]:[])]);
 while(bars.size<limit&&pages<12){
  const url=new URL(MARKET_ENDPOINT);url.search=new URLSearchParams({symbol,interval:timeframe,limit:'1000',endTime:String(endTime)});
  let response;
  try{response=await fetchImpl(url.href,{redirect:'error',signal:AbortSignal.any([deadline,AbortSignal.timeout(12000)])});}
  catch{throw new MarketDataError('MARKET_NETWORK_ERROR');}
  if(!response.ok)throw new MarketDataError(response.status===429||response.status===418?'MARKET_RATE_LIMITED':response.status===451||response.status===403?'MARKET_UNAVAILABLE':'MARKET_PROVIDER_ERROR');
  let raw='',data;
  try{const decoder=new TextDecoder();for await(const chunk of response.body){raw+=decoder.decode(chunk,{stream:true});if(raw.length>1000000)throw Error();}raw+=decoder.decode();data=JSON.parse(raw);}catch{throw new MarketDataError('MARKET_RESPONSE_INVALID');}
  if(!Array.isArray(data)||data.length>1000)throw new MarketDataError('MARKET_RESPONSE_INVALID');
  pages++;if(!data.length){exhausted=true;break;}
  let oldest=Infinity;
  for(const row of data){
   if(!Array.isArray(row)||row.length<7||row.slice(0,7).some(v=>v===null||v===''||!Number.isFinite(Number(v))))throw new MarketDataError('MARKET_RESPONSE_INVALID');
   const t=Number(row[0]),end=Number(row[6])+1;
   if(!Number.isSafeInteger(t)||!Number.isSafeInteger(end)||end-t!==ms||t>endTime)throw new MarketDataError('MARKET_RESPONSE_INVALID');
   oldest=Math.min(oldest,t);
   const bar={t,end,o:Number(row[1]),h:Number(row[2]),l:Number(row[3]),c:Number(row[4]),v:Number(row[5]),complete:true};
   const previous=bars.get(t);if(previous&&['end','o','h','l','c','v'].some(k=>bar[k]!==previous[k]))throw new MarketDataError('MARKET_CONFLICT');
   if(end>now){droppedOpen++;continue;}bars.set(t,bar);
  }
  if(oldest>=endTime)throw new MarketDataError('MARKET_PAGINATION_STALLED');
  endTime=oldest-1;
 }
 let closed;
 try{closed=validateBars([...bars.values()],{asOf:now}).bars.slice(-limit);}catch{throw new MarketDataError('MARKET_RESPONSE_INVALID');}
 if(!closed.length)throw new MarketDataError('MARKET_EMPTY');
 const gaps=closed.slice(1).filter((b,i)=>b.t!==closed[i].end).length;
 return {bars:closed,metadata:{provider:'Binance public spot API',endpoint:MARKET_ENDPOINT,symbol,timeframe,market:'spot',quoteUnit:'USDT',fetchedAt:new Date(now).toISOString(),first:new Date(closed[0].t).toISOString(),last:new Date(closed.at(-1).end).toISOString(),requestedBars:limit,receivedBars:closed.length,pages,droppedOpen,gaps,partial:closed.length<limit,exhausted,synthetic:false,verified:false}};
}
