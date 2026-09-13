import {DECISION_HORIZON_PRESETS} from '../lib/market-echo/engine.mjs';
import {marketConfig,ASSETS} from '../lib/market-echo/markets.mjs';
import {priceProjection,aiEvidence} from '../lib/market-echo/presentation.mjs';
import {tr,errorText} from './i18n.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let locale='zh';try{locale=localStorage.getItem('market-echo-language')==='en'?'en':'zh';}catch{}
const t=(k,v)=>tr(locale,k,v),dt=s=>new Date(s).toISOString().slice(0,16).replace('T',' '),pct=n=>n===null?'—':`${n>=0?'+':''}${n.toFixed(2)}%`;
const money=n=>n===null?'—':n!==0&&Math.abs(n)<0.000001?n.toExponential(3):new Intl.NumberFormat(locale==='en'?'en-US':'zh-CN',{maximumFractionDigits:n<1?6:2}).format(n);
let result=null,selected=0,worker=null,busy=false,aiController=null,config=null,statusKey='ready',statusVars={},lastError=null;
const horizonText=h=>t(h.unit,{n:h.value});
function setStatus(k,v={}){statusKey=k;statusVars=v;$('status').textContent=t(k,v);}
function clearAI(){aiController?.abort();aiController=null;$('ai-result').hidden=true;$('ai-text').replaceChildren();$('ai-status').textContent='';$('consent').checked=false;$('explain').disabled=!config;}
function options(el,items,value){el.innerHTML=items.map(([v,label])=>`<option value="${v}">${esc(label)}</option>`).join('');if(items.some(([v])=>v===value))el.value=value;}
function populate(reset=false){
 const category=$('category').value,old=$('asset').value;
 options($('asset'),ASSETS[category].map(v=>[v,v==='OTHER'?t(category==='crypto'?'other':'otherMetal'):v==='CUSTOM'?t('custom'):['XAU','XAG'].includes(v)?t(v):v]),reset?null:old);
 const instrument=$('instrument').value;
 options($('instrument'),(category==='crypto'?['spot','perpetual']:category==='metals'?['spot','futures']:['stock']).map(v=>[v,t(v)]),reset?null:instrument);
 const cfg=marketConfig(category,$('asset').value,category==='us'||category==='cn'?'spot':$('instrument').value);
 if(reset){$('symbol').value=cfg.defaultSymbol;$('quote').value=cfg.quote;}
 for(const o of $('timeframe').options)o.disabled=category==='cn'&&o.value!=='1d';
 if(category==='cn')$('timeframe').value='1d';
 const oldH=$('horizon').value;
 options($('horizon'),DECISION_HORIZON_PRESETS[cfg.sessionPolicy].map(h=>[`${h.value}:${h.unit}`,horizonText(h)]),reset?null:oldH);
 if(reset)$('horizon').selectedIndex=1;
 $('market-help').textContent=t(category==='cn'?'cnHelp':cfg.comparisonMode==='structure_only'?'altHelp':'fullHelp');
 $('source-label').textContent=t($('source').value==='demo'?'synthBadge':'csvBadge');
 $('upload-box').hidden=$('source').value!=='csv';return cfg;
}
function translate(){document.documentElement.lang=locale==='en'?'en':'zh-CN';$('language').value=locale;document.querySelectorAll('[data-t]').forEach(e=>e.textContent=t(e.dataset.t));populate();setStatus(statusKey,statusVars);if(lastError)$('error').textContent=errorText(lastError,locale);if(result)render();aiConfigUI();}
function changed(){result=null;$('results').hidden=true;$('error').hidden=true;lastError=null;clearAI();setStatus('changed');}
$('category').addEventListener('change',()=>populate(true));
$('asset').addEventListener('change',()=>{const cfg=populate();$('symbol').value=cfg.defaultSymbol;$('quote').value=cfg.quote;});
$('source').addEventListener('change',()=>populate());
$('form').addEventListener('change',changed);
for(const id of ['symbol','quote'])$(id).addEventListener('input',changed);
$('file').addEventListener('change',()=>{if($('file').files[0]?.name.startsWith('synthetic-'))$('synthetic').checked=true;});
$('language').addEventListener('change',()=>{locale=$('language').value;try{localStorage.setItem('market-echo-language',locale);}catch{}clearAI();translate();});
function setBusy(v){busy=v;for(const e of $('form').querySelectorAll('input,select,button'))e.disabled=v;$('language').disabled=v;if(!v)populate();$('run').textContent=t(v?'running':'run');}
function showError(message){lastError=message;$('error').textContent=errorText(message,locale);$('error').hidden=false;setStatus('noResult');}
async function run(e){e?.preventDefault();if(busy)return;changed();setBusy(true);let csv;
 try{
  if($('source').value==='csv'){const f=$('file').files[0];if(!f){$('error').textContent=t('selectFile');$('error').hidden=false;setBusy(false);return;}if(f.size>5_000_000)throw Error('CSV 最大 5 MB');csv=await f.text();}
  const cfg=marketConfig($('category').value,$('asset').value,['us','cn'].includes($('category').value)?'spot':$('instrument').value),[value,unit]=$('horizon').value.split(':');
  setStatus('running');worker?.terminate();worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{setBusy(false);worker.terminate();worker=null;if(data.error){showError(data.error);return;}result=data.result;selected=0;render();setStatus('done',{bars:result.scannedBars.toLocaleString(),cases:result.episodeCount});};
  worker.onerror=()=>{worker?.terminate();worker=null;setBusy(false);$('error').textContent=t('workerFail');$('error').hidden=false;};
  worker.postMessage({source:$('source').value,csv,synthetic:$('synthetic').checked,settings:{...cfg,timeframe:$('timeframe').value,symbol:$('symbol').value.trim(),quoteUnit:$('quote').value.trim(),decisionHorizon:{value:Number(value),unit}}});
 }catch(error){setBusy(false);showError(error.message);}
}
function render(){
 $('results').hidden=false;const p=priceProjection(result),h=horizonText(result.decisionHorizon),q=p.quantiles;
 $('result-name').textContent=`${result.synthetic?t('demo')+' / ':''}${result.symbol} · ${result.timeframe} → ${h}`;
 $('result-meta').textContent=`${dt(result.asOf)} UTC · ${result.episodeCount} ${t('case')}`;
 const endpoint=p.endpoint?`${dt(p.endpoint)} UTC`:t('calendarPending',{n:result.decisionHorizon.value});
 $('prices').innerHTML=`<article class="price-card"><span>${t('base')}</span><b>${money(p.base)} <small>${esc(p.unit)}</small></b><p>${t('baseHelp')}<br>${dt(p.asOf)} UTC</p></article><article class="price-card"><span>${t('end')}</span><b class="date-value">${esc(endpoint)}</b><p>${t('actualMissing')}</p></article><article class="price-card highlight"><span>${t(p.pricesEnabled?'median':'medianAlt')}</span><b>${p.pricesEnabled?money(q.median.price)+' <small>'+esc(p.unit)+'</small>':pct(q.median.change)}</b><p>${p.pricesEnabled?pct(q.median.change)+' · ':''}${result.episodeCount} ${t('case')}</p></article>`;
 const rangeText=p.pricesEnabled?`${money(q.q10.price)} — ${money(q.q90.price)} ${p.unit}`:`${pct(q.q10.change)} — ${pct(q.q90.change)}`;
 const formula=p.pricesEnabled&&q.median.change!==null?t('formula',{base:money(p.base),change:pct(q.median.change),price:money(q.median.price)}):!p.pricesEnabled?t('noPrice'):t('empty');
 $('conversion').innerHTML=`<p><strong>${t(p.pricesEnabled?'range':'rangeAlt')}:</strong> ${esc(rangeText)} <small>(${pct(q.q10.change)} / ${pct(q.q90.change)})</small></p><p>${esc(formula)}</p>`;
 const warns=[...(result.synthetic?[t('synthBadge')]:[]),t('risk'),...(result.episodeCount<10?[t('small',{n:result.episodeCount})]:[]),...(result.comparisonMode==='structure_only'?[t('altHelp')]:[]),...(!result.structure.volumeAvailable?[t('noVolume')]:[]),...(result.sessionPolicy!=='continuous_24_7'?[t('sessionWarning')]:[])];
 $('warnings').replaceChildren(...warns.map(w=>{const p=document.createElement('p');p.textContent=w;return p;}));
 $('cases').innerHTML=result.cases.length?result.cases.map((c,i)=>`<tr class="${i===selected?'selected':''}"><td><button data-case="${i}" aria-pressed="${i===selected}" aria-label="${t('case')} ${i+1}">#${String(i+1).padStart(2,'0')}</button></td><td>${dt(c.anchor)}<small>→ ${dt(c.outcomeEnd)}</small></td><td>${c.similarity}/100</td><td>${money(p.cases[i].historicalAnchor)} → ${money(p.cases[i].historicalEnd)}</td><td class="${c.returnPct>=0?'positive':'negative'}">${pct(c.returnPct)}</td><td>${p.pricesEnabled?money(p.cases[i].price):t('notUsed')}</td></tr>`).join(''):`<tr><td colspan="6">${t('empty')}</td></tr>`;
 $('cases').querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.case);render();});
 chart(p);$('detail').replaceChildren();const c=result.cases[selected];
 if(c){const prose=[t('detail',{n:selected+1,start:dt(c.start),anchor:dt(c.anchor),end:dt(c.outcomeEnd)}),t('components',{shape:c.components.shape.toFixed(3),structure:c.components.structure.toFixed(3),volatility:result.comparisonMode==='structure_only'?t('notUsed'):c.components.volatility.toFixed(3),volume:result.comparisonMode==='structure_only'?t('notUsed'):c.components.volume===null?t('notAvailable'):c.components.volume.toFixed(3)})];for(const text of prose){const el=document.createElement('p');el.textContent=text;$('detail').append(el);}}
 $('payload').textContent=JSON.stringify(aiEvidence(result),null,2);$('explain').disabled=!config||result.episodeCount===0||!!aiController;
}
function chart(p){
 const c=result.cases[selected],W=1000,H=420,L=78,R=25,T=72,B=65,n=result.query.length,futureN=Math.max(1,...result.cases.map(c=>c.future.length)),split=550;
 const x=i=>i<=n-1?L+i/(n-1)*(split-L):split+(i-n+1)/futureN*(W-R-split);
 const convert=(bars,base)=>bars.map(b=>p.pricesEnabled?b.c/base*p.base:(b.c/base-1)*100);
 const baseline=p.pricesEnabled?p.base:0,q=convert(result.query,result.query.at(-1).c),hist=c?convert(c.context,c.context.at(-1).c):[],futures=result.cases.map(c=>[baseline,...convert(c.future,c.context.at(-1).c)]);
 const values=[...q,...hist,...futures.flat()];let lo=Math.min(...values),hi=Math.max(...values);const pad=Math.max(p.pricesEnabled?p.base*.001:.1,(hi-lo)*.15);lo-=pad;hi+=pad;
 const y=v=>T+(hi-v)/(hi-lo)*(H-T-B),path=(vs,start=0)=>vs.map((v,i)=>`${i?'L':'M'}${x(start+i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
 const label=v=>p.pricesEnabled?money(v):pct(v);
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('chart')+' '+t('chartNote'))}"><rect x="${split}" y="${T}" width="${W-R-split}" height="${H-T-B}" fill="#eef0e9"/><text x="${L}" y="23" fill="#242b27" font-size="14">${esc(t('anchorLabel',{price:money(p.base)+' '+p.unit}))}</text><text x="${W-R}" y="23" text-anchor="end" fill="#345a45" font-size="14">${esc(c?p.pricesEnabled?t('endpointLabel',{price:money(p.cases[selected].price),change:pct(c.returnPct)}):t('structureEndpoint',{change:pct(c.returnPct)}):t('noResult'))}</text><text x="${L}" y="47" fill="#646e65" font-size="11">${esc(p.pricesEnabled?p.unit:'%')}</text>`;
 for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4;svg+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#d9ded3"/><text x="${L-10}" y="${y(v)+4}" text-anchor="end" fill="#646e65" font-size="11">${label(v)}</text>`;}
 for(let i=0;i<futures.length;i++)if(i!==selected)svg+=`<path d="${path(futures[i],n-1)}" fill="none" stroke="#b6c2ad" stroke-width="1"/>`;
 if(c){const cx=x(n-1+c.future.length),cy=y(futures[selected].at(-1));svg+=`<path d="${path([...hist,...futures[selected].slice(1)])}" fill="none" stroke="#4c8062" stroke-width="2.8"/><circle cx="${cx}" cy="${cy}" r="6" fill="#345a45"/><rect x="${cx-172}" y="${Math.max(T,cy-39)}" width="163" height="28" rx="4" fill="#345a45"/><text x="${cx-18}" y="${Math.max(T,cy-39)+19}" text-anchor="end" fill="white" font-size="13">${label(futures[selected].at(-1))} / ${pct(c.returnPct)}</text>`;}
 svg+=`<path d="${path(q)}" fill="none" stroke="#242b27" stroke-width="2.8"/><circle cx="${split}" cy="${y(baseline)}" r="5" fill="#242b27"/><line x1="${split}" x2="${split}" y1="${T}" y2="${H-B}" stroke="#6b766b" stroke-dasharray="4 4"/><line x1="${W-R}" x2="${W-R}" y1="${T}" y2="${H-B}" stroke="#4c8062" stroke-dasharray="4 4"/><text x="${L}" y="${H-39}" fill="#646e65" font-size="11">${locale==='en'?'−95 bars':'−95 根'}</text><text x="${split}" y="${H-39}" text-anchor="middle" fill="#242b27" font-size="11">${esc(t('zero'))}</text><text x="${W-R}" y="${H-39}" text-anchor="end" fill="#345a45" font-size="11">${esc(horizonText(result.decisionHorizon))}</text><text x="${split}" y="${H-18}" text-anchor="middle" fill="#646e65" font-size="10">${dt(p.asOf)} UTC</text><text x="${W-R}" y="${H-18}" text-anchor="end" fill="#646e65" font-size="10">${esc(p.endpoint?dt(p.endpoint)+' UTC':t('calendarPending',{n:result.decisionHorizon.value}))}</text></svg>`;
 $('chart').innerHTML=svg;
}
const aiErrors={AI_AUTH_FAILED:['密钥无效或无权限，请核对供应商。','Invalid key or permission. Check the provider.'],AI_RATE_LIMITED:['供应商限流或额度不足，请稍后再试。','Provider rate limit or quota reached. Try later.'],AI_OUTPUT_BLOCKED:['输出不符合证据解释规则，已丢弃。可换模型重试，数值结果不受影响。','Output failed the evidence-only rules and was discarded. Try another model; numerical results are unchanged.'],AI_OUTPUT_INVALID:['模型未返回约定格式，请使用支持 JSON 指令的模型。','Model returned an invalid format. Use a model that follows JSON instructions.'],AI_PROVIDER_ERROR:['供应商拒绝请求，请检查模型 ID 与 JSON 输出支持。','Provider rejected the request. Check model ID and JSON output support.'],AI_NETWORK_ERROR:['供应商请求超时或网络失败；没有自动重试或切换供应商。','Provider timeout/network failure. No automatic retry or provider switch.'],AI_LOCAL_LIMIT:['当前请求仍在进行或请求过于频繁，请稍后再试。','A request is active or the local rate limit was reached. Try later.']};
function aiConfigUI(){
 $('ai-runtime').textContent=config?'':t('aiLocal');$('explain').disabled=!config||!result?.episodeCount||!!aiController;
 $('provider').querySelector('[value="compatible"]').disabled=!config?.endpoints?.compatible;
 $('ai-destination').textContent=t('aiEndpoint',{endpoint:config?.endpoints?.[$('provider').value]||'—'});
}
for(const id of ['provider','model','key'])$(id).addEventListener('input',()=>{clearAI();aiConfigUI();});
$('provider').addEventListener('change',()=>{$('model').value='';$('key').value='';$('model').placeholder=$('provider').value==='deepseek'?'deepseek-flash':'model-id';clearAI();aiConfigUI();});
$('clear-key').onclick=()=>{$('key').value='';clearAI();};
$('explain').onclick=async()=>{
 if(!config){$('ai-status').textContent=t('aiLocal');return;}
 if(!result?.episodeCount||!$('key').value.trim()||!$('model').value.trim()||!$('consent').checked){$('ai-status').textContent=t('aiMissing');return;}
 const current=result,requestLocale=locale;aiController?.abort();const controller=new AbortController();aiController=controller;$('explain').disabled=true;$('ai-status').textContent=t('aiPending');$('ai-result').hidden=true;
 try{const response=await fetch(new URL('../api/explain',import.meta.url),{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({provider:$('provider').value,model:$('model').value.trim(),apiKey:$('key').value.trim(),locale,consent:true,evidence:aiEvidence(current)})});const data=await response.json();if(!response.ok)throw Error(data.error||'AI_PROVIDER_ERROR');if(current!==result||locale!==requestLocale)return;
 $('ai-text').replaceChildren();const labels=locale==='en'?['What stands out','Why these cases match','What to compare next','Keep in mind']:['这次先看什么','相似点怎么看','接下来对比哪里','使用边界'];Object.keys(data.explanation).forEach((key,i)=>{const h=document.createElement('h3'),p=document.createElement('p');h.textContent=labels[i];p.textContent=data.explanation[key];$('ai-text').append(h,p);});$('ai-result').hidden=false;$('ai-status').textContent=`${data.provider} / ${data.model}`;
 }catch(error){if(error.name!=='AbortError'&&current===result)$('ai-status').textContent=(aiErrors[error.message]||["AI 请求失败，请检查配置。","AI request failed. Check your configuration."])[locale==='en'?1:0];}
 finally{if(aiController===controller){aiController=null;aiConfigUI();}}
};
$('export').onclick=()=>{if(!result)return;const blob=new Blob([JSON.stringify({...result,projection:priceProjection(result)},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`market-echo-${result.synthetic?'synthetic-':''}report.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('demo').onclick=()=>{$('source').value='demo';$('category').value='crypto';$('timeframe').value='1h';populate(true);run();};
$('form').addEventListener('submit',run);
window.addEventListener('pagehide',()=>{$('key').value='';aiController?.abort();});
populate(true);translate();run();
fetch(new URL('../api/config',import.meta.url)).then(r=>r.ok?r.json():null).then(data=>{if(data?.ai)config=data;aiConfigUI();}).catch(()=>aiConfigUI());
