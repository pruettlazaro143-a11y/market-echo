// Indicators use closed bars only. Periods count bars, not calendar days.
export const INDICATORS=[
 {id:'ma20',label:'MA 20',period:20,type:'ma',color:'#c17a20'},
 {id:'ma60',label:'MA 60',period:60,type:'ma',color:'#9554aa'},
 {id:'ema20',label:'EMA 20',period:20,type:'ema',color:'#287ca8'},
 {id:'ema60',label:'EMA 60',period:60,type:'ema',color:'#c65266'},
 {id:'ma200',label:'MA 200',period:200,type:'ma',color:'#72812f'}
];
export function movingAverage(values,period,type='ma'){
 if(!Number.isInteger(period)||period<1||!['ma','ema'].includes(type))throw Error('INVALID_INDICATOR');
 let sum=0,previous=null;const alpha=2/(period+1);
 return values.map((value,i)=>{
  if(!Number.isFinite(value))throw Error('INVALID_INDICATOR_VALUE');
  sum+=value;if(i>=period)sum-=values[i-period];
  if(i<period-1)return null;
  previous=type==='ma'||previous===null?sum/period:alpha*value+(1-alpha)*previous;
  return previous;
 });
}
export function indicatorSnapshot(bars,start,asOf){
 const closed=bars.filter(b=>b.complete!==false&&b.end<=asOf),values=closed.map(b=>b.c);
 return {asOf:closed.at(-1)?.end??null,basis:'closed_bar_close',seed:'SMA_of_first_period',warmupBars:start,
  series:Object.fromEntries(INDICATORS.map(s=>[s.id,movingAverage(values,s.period,s.type).slice(start)]))};
}
