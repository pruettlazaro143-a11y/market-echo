export function priceProjection(result){
 const base=result.query.at(-1).c;
 const map=p=>p===null||!Number.isFinite(p)?null:base*(1+p/100);
 return {base,asOf:result.asOf,endpoint:result.replay?.outcomeEnd||result.forecastEnd,unit:result.quoteUnit||'CSV unit',kind:'historical_return_rebased',actualFuture:result.replay?.state==='revealed'?{price:result.replay.actual.price,change:result.replay.actual.change,end:result.replay.actual.end,synthetic:result.replay.actual.synthetic,kind:'historical_replay'}:null,
  pricesEnabled:result.comparisonMode!=='structure_only',
  quantiles:Object.fromEntries(Object.entries(result.distribution).map(([key,change])=>[key,{change,price:result.comparisonMode==='structure_only'?null:map(change)}])),
  cases:result.cases.map(c=>({id:c.id,change:c.returnPct,price:result.comparisonMode==='structure_only'?null:map(c.returnPct),historicalAnchor:c.context.at(-1).c,historicalEnd:c.future.at(-1).c}))};
}
export function aiEvidence(result){
 const projection=priceProjection(result);
 return {schema:'market-echo.evidence.v2',symbol:result.symbol,market:result.marketKey,instrument:result.instrument||'unspecified',timeframe:result.timeframe,
  horizon:result.decisionHorizon,asOf:result.asOf,synthetic:result.synthetic,comparisonMode:result.comparisonMode,
  basePrice:projection.base,quoteUnit:projection.unit,caseCount:result.episodeCount,quantiles:projection.quantiles,
  cases:result.cases.slice(0,5).map(c=>({id:c.id,anchor:c.anchor,end:c.outcomeEnd,similarity:c.similarity,change:c.returnPct,components:{shape:c.components.shape,structure:c.components.structure,volatility:result.comparisonMode==='structure_only'?null:c.components.volatility,volume:result.comparisonMode==='structure_only'?null:c.components.volume}}))};
}
