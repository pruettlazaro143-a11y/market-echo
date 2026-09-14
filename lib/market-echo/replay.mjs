import {analyze,validateBars,TIMEFRAMES,normalizeDecisionHorizon,historicalOutcome} from './engine.mjs';
// Anchor selection depends on timestamps and horizon, never on return direction or matching quality.
export function prepareReplay(input){
 const s=TIMEFRAMES[input.timeframe];if(!s)throw Error('REPLAY_UNAVAILABLE');
 const until=input.asOf?Date.parse(input.asOf):Date.now();
 const bars=validateBars(input.bars,{asOf:until}).bars;
 const horizon=normalizeDecisionHorizon(input.decisionHorizon,input.sessionPolicy);
 let index=bars.length-2,outcome=null;
 for(;index>=s.lookback-1;index--){
  outcome=historicalOutcome(bars,index,horizon,input.sessionPolicy,s.ms);
  if(outcome)break;
 }
 if(!outcome)throw Error('REPLAY_UNAVAILABLE');
 const cutoff=bars[index].end,past=bars.slice(0,index+1);
 const result=analyze({...input,bars:past,asOf:new Date(cutoff).toISOString()});
 result.replay={state:'hidden',cutoff:result.asOf,sourceEnd:new Date(bars.at(-1).end).toISOString(),outcomeEnd:new Date(outcome.actualEnd).toISOString(),actual:null};
 return {result,actual:{end:new Date(outcome.actualEnd).toISOString(),price:bars[outcome.outcomeIndex].c,change:outcome.returnPct,future:outcome.future,synthetic:Boolean(input.synthetic)}};
}
export function revealReplay(result,actual){
 if(result.replay?.state!=='hidden'||!actual)throw Error('REPLAY_UNAVAILABLE');
 const median=result.distribution.median;
 const low=result.distribution.q10,high=result.distribution.q90;
 return {...result.replay,state:'revealed',actual,
  medianErrorPercentagePoints:median===null?null:actual.change-median,
  withinHistoricalRange:low===null||high===null?null:actual.change>=low&&actual.change<=high};
}
