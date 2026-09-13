export const INSIGHT_TASKS=['match','divergence','compare'];
export function insightFacts(e){
 const cases=e.cases.map((c,i)=>({row:i+1,change:c.change,similarity:c.similarity,components:c.components}));
 if(!cases.length)throw Error('AI_EVIDENCE_INVALID');
 const low=cases.reduce((a,b)=>b.change<a.change?b:a),high=cases.reduce((a,b)=>b.change>a.change?b:a);
 const componentRanges={};
 for(const key of ['shape','structure','volatility','volume']){
  const values=cases.map(c=>c.components[key]).filter(Number.isFinite);
  componentRanges[key]=values.length?{min:Math.min(...values),max:Math.max(...values),count:values.length}:null;
 }
 return {scope:'first_cases_in_similarity_order',sampleCount:cases.length,totalMatched:e.caseCount,
 synthetic:e.synthetic,mode:e.comparisonMode,horizon:e.horizon,
 outcomes:{up:cases.filter(c=>c.change>0).length,down:cases.filter(c=>c.change<0).length,flat:cases.filter(c=>c.change===0).length},
 lowest:low,highest:high,spreadPercentagePoints:high.change-low.change,
 identicalOutcomes:high.change===low.change,componentRanges,cases};
}
export function insightPayload(e,task){
 if(!INSIGHT_TASKS.includes(task))throw Error('AI_TASK_INVALID');
 return {task,facts:insightFacts(e)};
}
