import {INSIGHT_TASKS,insightPayload} from '../lib/market-echo/insights.mjs';
export class AiError extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status;}}
export function endpoints(compatibleBase=process.env.AI_COMPAT_BASE_URL){
 const out={deepseek:'https://api.deepseek.com/chat/completions',openai:'https://api.openai.com/v1/chat/completions',anthropic:'https://api.anthropic.com/v1/messages'};
 if(compatibleBase){const u=new URL(compatibleBase);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port||!u.hostname.includes('.')||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname))throw new AiError('AI_ENDPOINT_INVALID');out.compatible=u.href.replace(/\/$/,'')+'/chat/completions';}
 return out;
}
const finite=(n)=>typeof n==='number'&&Number.isFinite(n);
export function validateEvidence(e){
 if(!e||e.schema!=='market-echo.evidence.v2'||typeof e.symbol!=='string'||e.symbol.length>40||!finite(e.basePrice)||e.basePrice<=0||!Number.isInteger(e.caseCount)||e.caseCount<1||e.caseCount>100||!Array.isArray(e.cases)||(e.cases.length<1||e.cases.length>5||e.cases.length>e.caseCount)||typeof e.synthetic!=='boolean'||!['full','structure_only'].includes(e.comparisonMode)||typeof e.quoteUnit!=='string'||e.quoteUnit.length>20)throw new AiError('AI_EVIDENCE_INVALID');
 if(!e.horizon||!Number.isInteger(e.horizon.value)||e.horizon.value<1||e.horizon.value>365||!['hour','calendar_day','trading_day'].includes(e.horizon.unit))throw new AiError('AI_EVIDENCE_INVALID');
 const cleanCases=e.cases.map(c=>{if(!c||typeof c.id!=='string'||c.id.length>180||!finite(c.change)||!finite(c.similarity)||!Number.isFinite(Date.parse(c.anchor))||!Number.isFinite(Date.parse(c.end)))throw new AiError('AI_EVIDENCE_INVALID');const components={};for(const k of ['shape','structure','volatility','volume']){const v=c.components?.[k];if(v!==null&&!finite(v))throw new AiError('AI_EVIDENCE_INVALID');components[k]=e.comparisonMode==='structure_only'&&['volatility','volume'].includes(k)?null:v;}return {id:c.id,anchor:c.anchor,end:c.end,similarity:c.similarity,change:c.change,components};});
 const quantiles={};for(const k of ['q10','median','q90']){const q=e.quantiles?.[k];if(!q||!(q.change===null||finite(q.change)))throw new AiError('AI_EVIDENCE_INVALID');quantiles[k]={change:q.change,price:q.change===null||e.comparisonMode==='structure_only'?null:e.basePrice*(1+q.change/100)};}
 for(const k of ['market','instrument','timeframe','asOf'])if(typeof e[k]!=='string'||e[k].length>80)throw new AiError('AI_EVIDENCE_INVALID');
 return {schema:e.schema,symbol:e.symbol,market:e.market,instrument:e.instrument,timeframe:e.timeframe,asOf:e.asOf,quoteUnit:e.quoteUnit,basePrice:e.basePrice,synthetic:e.synthetic,comparisonMode:e.comparisonMode,horizon:e.horizon,caseCount:e.caseCount,quantiles,cases:cleanCases};
}
export function parseExplanation(text){
 let json;try{json=JSON.parse(text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}catch{throw new AiError('AI_OUTPUT_INVALID',502);}
 const result={};
 for(const key of ['answer']){
  const s=json?.[key];if(typeof s!=='string'||!s.trim()||s.length>1200)throw new AiError('AI_OUTPUT_INVALID',502);
  // Numeric results are owned by the engine. Prose cannot introduce a new price or probability.
  if(/\d|买入|卖出|做多|做空|开仓|加仓|减仓|目标价|止损|止盈|必涨|必跌|保证盈利|\b(buy|sell|short|go long|price target|stop.?loss|take.?profit|guaranteed|will rise|will fall)\b/i.test(s))throw new AiError('AI_OUTPUT_BLOCKED',502);
  result[key]=s.trim();
 }
 return result;
}
export async function explain(request,{fetchImpl=fetch,compatibleBase=process.env.AI_COMPAT_BASE_URL}={}){
 const dest=endpoints(compatibleBase)[request?.provider];
 if(!dest)throw new AiError('AI_PROVIDER_INVALID');
 if(typeof request.apiKey!=='string'||request.apiKey.length<8||request.apiKey.length>512||/[\r\n]/.test(request.apiKey)||typeof request.model!=='string'||!request.model.trim()||request.model.length>120)throw new AiError('AI_CONFIG_INVALID');
 if(request.consent!==true)throw new AiError('AI_CONSENT_REQUIRED');
 if(Object.hasOwn(request,'question')||Object.hasOwn(request,'messages')||Object.hasOwn(request,'prompt'))throw new AiError('AI_FREE_TEXT_DISABLED');
 const task=request.task??'match';
 if(!INSIGHT_TASKS.includes(task))throw new AiError('AI_TASK_INVALID');
 const evidence=validateEvidence(request.evidence);
 const payload=insightPayload(evidence,task);
 const locale=request.locale==='en'?'en':'zh';
 const instructions={match:'Explain the available matching dimensions and their limits. Use componentRanges to describe consistency within a dimension, never rank different dimensions or infer weights. The data does not contain raw chart shapes, so do not invent a pattern or the primary cause of selection.',divergence:'Explain whether the sampled historical outcome directions agree or differ, using outcomes. Distinguish differences in magnitude from differences in direction. Describe what this comparison can resolve and what remains unknown.',compare:'Explain why the highest and lowest historical outcome rows are useful to inspect side by side. If identicalOutcomes is true, say there is no outcome contrast in this sample; do not invent a contrast. Suggest inspecting the observation overlay and subsequent path using those rows.'};
 const policy=`Explain one fixed historical research question in ${locale==='en'?'plain English':'简洁自然的简体中文'}. Return only JSON with one nonempty string field "answer". Write three short sentences at most. ${instructions[task]} Use only supplied computed facts. Scope every conclusion to the supplied first cases, not all matches or the market. Start with a useful observation, explain it, and finish with a concrete case-inspection action. The interface separately shows exact counts, percentages, row numbers and a fixed boundary note; do not repeat numbers or boilerplate disclaimers. Do not use digits in prose. Refer to the highest/lowest historical outcome rows by these labels. Components are distances, not weights, causes or importance; lower is closer only within the same component. Do not invent years, chart patterns, news or reasons for subsequent returns. Synthetic data illustrates the workflow, not observed market behavior. Do not predict current/future direction, select assets or positions, give execution advice, claim profit or legal immunity. If the available evidence cannot answer the fixed question, state the specific missing information once and suggest what to inspect. Do not add headings or four generic sections.`;
 const content=JSON.stringify(payload);
 const headers={'content-type':'application/json'};
 let body;
 if(request.provider==='anthropic'){
  headers['x-api-key']=request.apiKey;headers['anthropic-version']='2023-06-01';
  body={model:request.model.trim(),max_tokens:2000,system:policy,messages:[{role:'user',content}]};
 }else{
  headers.authorization=`Bearer ${request.apiKey}`;
  body={model:request.model.trim(),messages:[{role:'system',content:policy},{role:'user',content}],stream:false,response_format:{type:'json_object'},...(request.provider==='openai'?{max_completion_tokens:2500}:{max_tokens:2000})};
 }
 let response;
 try{response=await fetchImpl(dest,{method:'POST',headers,body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(45000)});}catch{throw new AiError('AI_NETWORK_ERROR',502);}
 if(!response.ok)throw new AiError(response.status===401||response.status===403?'AI_AUTH_FAILED':response.status===429?'AI_RATE_LIMITED':'AI_PROVIDER_ERROR',502);
 let raw='';const decoder=new TextDecoder();try{for await(const chunk of response.body){raw+=decoder.decode(chunk,{stream:true});if(raw.length>100000){throw Error('too large');}}raw+=decoder.decode();}catch{throw new AiError('AI_RESPONSE_INVALID',502);}
 let data;try{data=JSON.parse(raw);}catch{throw new AiError('AI_RESPONSE_INVALID',502);}
 const text=request.provider==='anthropic'?data.content?.filter(c=>c.type==='text').map(c=>c.text).join('\n'):data.choices?.[0]?.message?.content;
 if(typeof text!=='string'||!text)throw new AiError('AI_OUTPUT_INVALID',502);
 return {explanation:parseExplanation(text),provider:request.provider,model:request.model.trim(),locale};
}
