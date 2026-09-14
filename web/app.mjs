import {mountScreenshot,screenshotError} from './screenshot.mjs';
import {matchDetail} from '../lib/market-echo/match-detail.mjs';
import {INDICATORS} from '../lib/market-echo/indicators.mjs';
import {insightPayload} from '../lib/market-echo/insights.mjs';
import {DECISION_HORIZON_PRESETS} from '../lib/market-echo/engine.mjs';
import {marketConfig,ASSETS} from '../lib/market-echo/markets.mjs';
import {priceProjection,aiEvidence} from '../lib/market-echo/presentation.mjs';
import {tr,errorText} from './i18n.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let locale='zh';try{locale=localStorage.getItem('market-echo-language')==='en'?'en':'zh';}catch{}
const t=(k,v)=>tr(locale,k,v),dt=s=>new Date(s).toISOString().slice(0,16).replace('T',' '),pct=n=>n===null?'—':`${n>=0?'+':''}${n.toFixed(2)}%`;
const money=n=>n===null?'—':n!==0&&Math.abs(n)<0.000001?n.toExponential(3):new Intl.NumberFormat(locale==='en'?'en-US':'zh-CN',{maximumFractionDigits:n<1?6:2}).format(n);
let runSequence=0;
let insightTask='match',downloadController=null,downloadSnapshot=null;
let result=null,selected=0,worker=null,busy=false,aiController=null,config=null,statusKey='ready',statusVars={},lastError=null;
const horizonText=h=>t(h.unit,{n:h.value});
function setStatus(k,v={}){statusKey=k;statusVars=v;$('status').textContent=t(k,v);screenshot.feedback(t(k,v));}
function refreshPayload(){
 if(!result?.episodeCount){$('payload').textContent='';$('insight-facts').replaceChildren();return;}
 const payload=insightPayload(aiEvidence(result),insightTask),f=payload.facts;
 $('payload').textContent=JSON.stringify(payload,null,2);
 const box=$('insight-facts');box.replaceChildren();const info=document.createElement('p');
 info.textContent=locale==='en'?`Computed facts · First ${f.sampleCount} of ${f.totalMatched} matched cases: ${f.outcomes.up} up / ${f.outcomes.down} down / ${f.outcomes.flat} unchanged. Historical outcome spread: ${f.spreadPercentagePoints.toFixed(2)} percentage points.`:`程序计算 · 匹配到 ${f.totalMatched} 个案例，以下只比较前 ${f.sampleCount} 个：后续上涨 ${f.outcomes.up} 个 / 下跌 ${f.outcomes.down} 个 / 持平 ${f.outcomes.flat} 个。后续幅度差 ${f.spreadPercentagePoints.toFixed(2)} 个百分点。`;
 box.append(info);
 for(const [label,c] of [[locale==='en'?'Lowest historical outcome':'历史后续幅度最低',f.lowest],[locale==='en'?'Highest historical outcome':'历史后续幅度最高',f.highest]]){
 const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=`${label} · #${String(c.row).padStart(2,'0')} · ${pct(c.change)}`;button.onclick=()=>{selected=c.row-1;render();$('chart').scrollIntoView({behavior:'smooth',block:'center'});};box.append(button);
 }
 if(insightTask==='match'){const line=document.createElement('p');line.textContent=Object.entries(f.componentRanges).filter(([,v])=>v).map(([k,v])=>`${({shape:locale==='en'?'Shape':'形态',structure:locale==='en'?'Structure':'结构',volatility:locale==='en'?'Volatility':'波动',volume:locale==='en'?'Volume':'量能'})[k]} ${v.min.toFixed(3)}–${v.max.toFixed(3)}`).join(' · ')+(locale==='en'?' · Distance ranges, not weights; compare within each component.':' · 距离范围，非权重；只能在同一分量内比较。');box.append(line);}
}

function clearAI(){aiController?.abort();aiController=null;$('ai-result').hidden=true;$('ai-text').replaceChildren();$('ai-status').textContent='';$('consent').checked=false;$('explain').disabled=!config;}
function options(el,items,value){el.innerHTML=items.map(([v,label])=>`<option value="${v}">${esc(label)}</option>`).join('');if(items.some(([v])=>v===value))el.value=value;}
function populate(reset=false){
 const remote=$('source').value==='remote';
 if(remote){$('category').value='crypto';$('instrument').value='spot';}
 for(const o of $('category').options)o.disabled=remote&&o.value!=='crypto';
 $('symbol').readOnly=remote;$('quote').readOnly=remote;
 $('remote-box').hidden=!remote;
 const category=$('category').value,old=remote&&!['BTC','ETH'].includes($('asset').value)?'BTC':$('asset').value;
 options($('asset'),ASSETS[category].map(v=>[v,v==='OTHER'?t(category==='crypto'?'other':'otherMetal'):v==='CUSTOM'?t('custom'):['XAU','XAG'].includes(v)?t(v):v]),reset?null:old);
 const instrument=$('instrument').value;
 options($('instrument'),(category==='crypto'?['spot','perpetual']:category==='metals'?['spot','futures']:['stock']).map(v=>[v,t(v)]),reset?null:instrument);
 const cfg=marketConfig(category,$('asset').value,category==='us'||category==='cn'?'spot':$('instrument').value);
 for(const o of $('asset').options)o.disabled=remote&&o.value==='OTHER';for(const o of $('instrument').options)o.disabled=remote&&o.value!=='spot';
 if(reset||remote){$('symbol').value=cfg.defaultSymbol;$('quote').value=cfg.quote;}
 for(const o of $('timeframe').options)o.disabled=category==='cn'&&o.value!=='1d';
 if(category==='cn')$('timeframe').value='1d';
 const oldH=$('horizon').value;
 options($('horizon'),DECISION_HORIZON_PRESETS[cfg.sessionPolicy].map(h=>[`${h.value}:${h.unit}`,horizonText(h)]),reset?null:oldH);
 if(reset)$('horizon').selectedIndex=1;
 $('market-help').textContent=t(category==='cn'?'cnHelp':cfg.comparisonMode==='structure_only'?'altHelp':'fullHelp');
 $('source-label').textContent=t($('source').value==='demo'?'synthBadge':remote?'remoteBadge':'csvBadge');
 $('upload-box').hidden=$('source').value!=='csv';return cfg;
}
function translate(){document.documentElement.lang=locale==='en'?'en':'zh-CN';$('language').value=locale;document.querySelectorAll('[data-t]').forEach(e=>e.textContent=t(e.dataset.t));populate();setStatus(statusKey,statusVars);if(lastError)$('error').textContent=screenshotError(lastError,locale)||errorText(lastError,locale);if(result)render();aiConfigUI();screenshot.translate();if(lastError)screenshot.feedback(screenshotError(lastError,locale)||errorText(lastError,locale),true);}
function changed(){screenshot.clearResult();worker?.terminate();worker=null;downloadSnapshot=null;$('save-history').hidden=true;result=null;$('results').hidden=true;$('error').hidden=true;lastError=null;clearAI();setStatus('changed');}
$('category').addEventListener('change',()=>populate(true));
$('asset').addEventListener('change',()=>{const cfg=populate();$('symbol').value=cfg.defaultSymbol;$('quote').value=cfg.quote;});
$('source').addEventListener('change',()=>populate());
$('form').addEventListener('change',changed);
for(const id of ['symbol','quote','data-provider','cutoff'])$(id).addEventListener('input',changed);
$('file').addEventListener('change',()=>{if($('file').files&&[...$('file').files].some(f=>f.name.startsWith('synthetic-')))$('synthetic').checked=true;});
$('language').addEventListener('change',()=>{locale=$('language').value;try{localStorage.setItem('market-echo-language',locale);}catch{}clearAI();translate();});
function setBusy(v){busy=v;screenshot.setBusy(v);$('cancel-run').hidden=!v;for(const e of $('form').querySelectorAll('input,select,button'))e.disabled=v;$('language').disabled=v;if(!v)populate();$('run').textContent=t(v?'running':'run');}
function showError(message){lastError=message;$('error').textContent=screenshotError(message,locale)||errorText(message,locale);$('error').hidden=false;setStatus('noResult');screenshot.feedback($('error').textContent,true);}
async function run(e,shot=null){e?.preventDefault();if(busy)return;screenshot.cancelRecognition();changed();const runId=++runSequence;setBusy(true);let files,remote;
 try{
  if($('source').value==='csv'){const chosen=[...$('file').files];if(!chosen.length){$('error').textContent=t('selectFile');$('error').hidden=false;setBusy(false);screenshot.feedback(t('selectFile'),true);return;}if(chosen.length>24)throw Error('CSV_FILES_LIMIT');if(chosen.reduce((n,f)=>n+f.size,0)>30_000_000)throw Error('CSV 最大 30 MB');files=await Promise.all(chosen.map(async f=>({text:await f.text()})));}

  if(runId!==runSequence)return;
  const cfg=marketConfig($('category').value,$('asset').value,['us','cn'].includes($('category').value)?'spot':$('instrument').value),[value,unit]=$('horizon').value.split(':');
  if($('source').value==='remote'){
   if(!config?.marketData)throw Error('MARKET_LOCAL_REQUIRED');
   setStatus('remoteLoading');downloadController=new AbortController();
   const response=await fetch(new URL('../api/market-history',import.meta.url),{method:'POST',headers:{'Content-Type':'application/json'},signal:downloadController.signal,body:JSON.stringify({symbol:$('asset').value+'USDT',timeframe:$('timeframe').value,limit:Number($('remote-count').value),...(shot?.full?{endAt:shot.full.lastClosedAt}:shot?.shape?.lastClosedAt?{endAt:shot.shape.lastClosedAt}:{})})});
   const data=await response.json();if(runId!==runSequence)return;if(!response.ok)throw Error(data.error||'MARKET_PROVIDER_ERROR');
   remote=data;downloadSnapshot=data;downloadController=null;$('save-history').hidden=false;
  }
  setStatus('running');worker?.terminate();worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{
   if(runId!==runSequence)return;
   if(data.type==='revealed'){if(result?.replay?.state==='hidden'){result.replay=data.replay;render();}worker?.terminate();worker=null;return;}
   setBusy(false);if(data.error){worker?.terminate();worker=null;showError(data.error);return;}
   if(data.type==='shape'){worker?.terminate();worker=null;screenshot.showResult(data.result);setStatus('done',{bars:data.result.scannedBars.toLocaleString(),cases:data.result.cases.length});return;}
   result=data.result;if(result.replay?.state!=='hidden'){worker.terminate();worker=null;}
   selected=0;render();if(shot?.full)$('results').scrollIntoView({block:'start',behavior:'smooth'});setStatus('done',{bars:result.scannedBars.toLocaleString(),cases:result.episodeCount});
  };
  worker.onerror=()=>{if(runId!==runSequence)return;worker?.terminate();worker=null;setBusy(false);$('error').textContent=t('workerFail');$('error').hidden=false;screenshot.feedback(t('workerFail'),true);};
  worker.postMessage({screenshot:shot,source:$('source').value,remote,replay:shot?false:$('replay-mode').checked,files,format:$('csv-format').value,provider:$('data-provider').value.trim(),adjustment:$('adjustment').value,synthetic:$('synthetic').checked,settings:{...cfg,maxCases:Number($('case-limit').value),asOf:$('cutoff').value?new Date($('cutoff').value+'Z').toISOString():undefined,timeframe:$('timeframe').value,symbol:$('symbol').value.trim(),quoteUnit:$('quote').value.trim(),decisionHorizon:{value:Number(value),unit}}});
 }catch(error){if(runId!==runSequence)return;downloadController=null;setBusy(false);if(error.name!=='AbortError')showError(error.message);}
}
function render(){
 $('results').hidden=false;renderQuality();renderIndicatorValues();renderReplay();renderMatch();const p=priceProjection(result),h=horizonText(result.decisionHorizon),q=p.quantiles;
 $('result-name').textContent=`${result.synthetic?t('demo')+' / ':''}${result.symbol} · ${result.timeframe} → ${h}`;
 $('result-meta').textContent=`${dt(result.asOf)} UTC · ${result.episodeCount} ${t('case')}`;
 const endpoint=p.endpoint?`${dt(p.endpoint)} UTC`:t('calendarPending',{n:result.decisionHorizon.value});
 $('prices').innerHTML=`<article class="price-card"><span>${t('base')}</span><b>${money(p.base)} <small>${esc(p.unit)}</small></b><p>${t('baseHelp')}<br>${dt(p.asOf)} UTC</p></article><article class="price-card"><span>${t('end')}</span><b class="date-value">${esc(endpoint)}</b><p>${result.replay?t(result.replay.state==='hidden'?'replayHidden':'replayShown'):t('actualMissing')}</p></article><article class="price-card highlight"><span>${t(p.pricesEnabled?'median':'medianAlt')}</span><b>${p.pricesEnabled?money(q.median.price)+' <small>'+esc(p.unit)+'</small>':pct(q.median.change)}</b><p>${p.pricesEnabled?pct(q.median.change)+' · ':''}${result.episodeCount} ${t('case')}</p></article>`;
 const rangeText=p.pricesEnabled?`${money(q.q10.price)} — ${money(q.q90.price)} ${p.unit}`:`${pct(q.q10.change)} — ${pct(q.q90.change)}`;
 const formula=p.pricesEnabled&&q.median.change!==null?t('formula',{base:money(p.base),change:pct(q.median.change),price:money(q.median.price)}):!p.pricesEnabled?t('noPrice'):t('empty');
 $('conversion').innerHTML=`<p><strong>${t(p.pricesEnabled?'range':'rangeAlt')}:</strong> ${esc(rangeText)} <small>(${pct(q.q10.change)} / ${pct(q.q90.change)})</small></p><p>${esc(formula)}</p>`;
 const warns=[...(result.synthetic?[t('synthBadge')]:[]),t('risk'),...(result.episodeCount<10?[t('small',{n:result.episodeCount})]:[]),...(result.comparisonMode==='structure_only'?[t('altHelp')]:[]),...(!result.structure.volumeAvailable?[t('noVolume')]:[]),...(result.sessionPolicy!=='continuous_24_7'?[t('sessionWarning')]:[])];
 $('warnings').replaceChildren(...warns.map(w=>{const p=document.createElement('p');p.textContent=w;return p;}));
 $('cases').innerHTML=result.cases.length?result.cases.map((c,i)=>`<tr class="${i===selected?'selected':''}"><td><button data-case="${i}" aria-pressed="${i===selected}" aria-label="${t('case')} ${i+1}">#${String(i+1).padStart(2,'0')}</button></td><td>${dt(c.anchor)}<small>→ ${dt(c.outcomeEnd)}</small></td><td>${c.similarity}/100</td><td>${money(p.cases[i].historicalAnchor)} → ${money(p.cases[i].historicalEnd)}</td><td class="${c.returnPct>=0?'positive':'negative'}">${pct(c.returnPct)}</td><td>${p.pricesEnabled?money(p.cases[i].price):t('notUsed')}</td></tr>`).join(''):`<tr><td colspan="6">${t('empty')}</td></tr>`;
 $('cases').querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.case);render();});
 chart(p);$('detail').replaceChildren();const c=result.cases[selected];
 if(c){const prose=[t('detail',{n:selected+1,start:dt(c.start),anchor:dt(c.anchor),end:dt(c.outcomeEnd)}),t('components',{shape:c.components.shape.toFixed(3),structure:c.components.structure.toFixed(3),volatility:result.comparisonMode==='structure_only'?t('notUsed'):c.components.volatility.toFixed(3),volume:result.comparisonMode==='structure_only'?t('notUsed'):c.components.volume===null?t('notAvailable'):c.components.volume.toFixed(3)})];for(const text of prose){const el=document.createElement('p');el.textContent=text;$('detail').append(el);}}
 refreshPayload();$('explain').disabled=!config||result.episodeCount===0||!!aiController;
}
function chart(p){
 const c=result.cases[selected],W=1000,H=420,L=78,R=25,T=72,B=65,n=result.query.length,futureN=Math.max(1,...result.cases.map(c=>c.future.length),result.replay?.state==='revealed'?result.replay.actual.future.length:0),split=550;
 const x=i=>i<=n-1?L+i/(n-1)*(split-L):split+(i-n+1)/futureN*(W-R-split);
 const convert=(bars,base)=>bars.map(b=>p.pricesEnabled?b.c/base*p.base:(b.c/base-1)*100);
 const baseline=p.pricesEnabled?p.base:0,q=convert(result.query,result.query.at(-1).c),hist=c?convert(c.context,c.context.at(-1).c):[],futures=result.cases.map(c=>[baseline,...convert(c.future,c.context.at(-1).c)]);
 const overlays=INDICATORS.filter(spec=>document.querySelector(`[data-indicator="${spec.id}"]`).checked).map(spec=>({...spec,values:(result.indicators?.series[spec.id]||[]).map(v=>v===null?null:p.pricesEnabled?v:(v/p.base-1)*100)}));
 const actual=result.replay?.state==='revealed'?[baseline,...convert(result.replay.actual.future,result.query.at(-1).c)]:[];
 const values=[...q,...hist,...futures.flat(),...actual,...overlays.flatMap(s=>s.values.filter(v=>v!==null))];let lo=Math.min(...values),hi=Math.max(...values);const pad=Math.max(p.pricesEnabled?p.base*.001:.1,(hi-lo)*.15);lo-=pad;hi+=pad;
 const y=v=>T+(hi-v)/(hi-lo)*(H-T-B),path=(vs,start=0)=>vs.map((v,i)=>`${i?'L':'M'}${x(start+i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
 const label=v=>p.pricesEnabled?money(v):pct(v);
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('chart')+' '+t('chartNote'))}"><rect x="${split}" y="${T}" width="${W-R-split}" height="${H-T-B}" fill="#eef0e9"/><text x="${L}" y="23" fill="#242b27" font-size="14">${esc(t('anchorLabel',{price:money(p.base)+' '+p.unit}))}</text><text x="${W-R}" y="23" text-anchor="end" fill="#345a45" font-size="14">${esc(c?p.pricesEnabled?t('endpointLabel',{price:money(p.cases[selected].price),change:pct(c.returnPct)}):t('structureEndpoint',{change:pct(c.returnPct)}):t('noResult'))}</text><text x="${L}" y="47" fill="#646e65" font-size="11">${esc(p.pricesEnabled?p.unit:'%')}</text>`;
 for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4;svg+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#d9ded3"/><text x="${L-10}" y="${y(v)+4}" text-anchor="end" fill="#646e65" font-size="11">${label(v)}</text>`;}
 for(let i=0;i<futures.length;i++)if(i!==selected)svg+=`<path d="${path(futures[i],n-1)}" fill="none" stroke="#b6c2ad" stroke-width="1"/>`;
 if(c){const cx=x(n-1+c.future.length),cy=y(futures[selected].at(-1));svg+=`<path d="${path([...hist,...futures[selected].slice(1)])}" fill="none" stroke="#4c8062" stroke-width="2.8"/><circle cx="${cx}" cy="${cy}" r="6" fill="#345a45"/><rect x="${cx-172}" y="${Math.max(T,cy-39)}" width="163" height="28" rx="4" fill="#345a45"/><text x="${cx-18}" y="${Math.max(T,cy-39)+19}" text-anchor="end" fill="white" font-size="13">${label(futures[selected].at(-1))} / ${pct(c.returnPct)}</text>`;}
 svg+=`<path d="${path(q)}" fill="none" stroke="#242b27" stroke-width="2.8"/><circle cx="${split}" cy="${y(baseline)}" r="5" fill="#242b27"/><line x1="${split}" x2="${split}" y1="${T}" y2="${H-B}" stroke="#6b766b" stroke-dasharray="4 4"/><line x1="${W-R}" x2="${W-R}" y1="${T}" y2="${H-B}" stroke="#4c8062" stroke-dasharray="4 4"/><text x="${L}" y="${H-39}" fill="#646e65" font-size="11">${locale==='en'?'−95 bars':'−95 根'}</text><text x="${split}" y="${H-39}" text-anchor="middle" fill="#242b27" font-size="11">${esc(t('zero'))}</text><text x="${W-R}" y="${H-39}" text-anchor="end" fill="#345a45" font-size="11">${esc(horizonText(result.decisionHorizon))}</text><text x="${split}" y="${H-18}" text-anchor="middle" fill="#646e65" font-size="10">${dt(p.asOf)} UTC</text><text x="${W-R}" y="${H-18}" text-anchor="end" fill="#646e65" font-size="10">${esc(p.endpoint?dt(p.endpoint)+' UTC':t('calendarPending',{n:result.decisionHorizon.value}))}</text></svg>`;
 for(const line of overlays){let pen=false,d='';for(let i=0;i<line.values.length;i++){const v=line.values[i];if(v===null){pen=false;continue;}d+=`${pen?'L':'M'}${x(i).toFixed(2)},${y(v).toFixed(2)} `;pen=true;}svg=svg.replace('</svg>',`<path data-series="${line.id}" d="${d}" fill="none" stroke="${line.color}" stroke-width="1.7"><title>${line.label}</title></path></svg>`);}
 if(actual.length){const ax=x(n-2+actual.length),ay=y(actual.at(-1));svg=svg.replace('</svg>',`<path d="${path(actual,n-1)}" fill="none" stroke="#1465b3" stroke-width="3" stroke-dasharray="6 3"/><circle cx="${ax}" cy="${ay}" r="5" fill="#1465b3"/><text x="${split+8}" y="${T+17}" fill="#1465b3" font-size="12">${esc(t('replayActual'))}</text></svg>`);}
 $('chart').innerHTML=svg;
}
function renderReplay(){
 const r=result.replay;$('replay-panel').hidden=!r;if(!r)return;
 $('reveal').hidden=r.state==='revealed';
 let value=t('replayHidden')+' · '+dt(r.cutoff)+' → '+dt(r.outcomeEnd)+' UTC';
 if(r.state==='revealed')value=`${t('replayActual')}: ${money(r.actual.price)} ${result.quoteUnit} / ${pct(r.actual.change)} · ${t('replayError')}: ${r.medianErrorPercentagePoints===null?'—':r.medianErrorPercentagePoints.toFixed(2)} ${locale==='en'?'percentage points':'个百分点'} · ${t(r.withinHistoricalRange===null?'replayNoRange':r.withinHistoricalRange?'replayInside':'replayOutside')}`;
 $('replay-status').textContent=value;
}
function renderMatch(){
 const d=matchDetail(result,selected);$('match-chart').replaceChildren();$('match-note').textContent='';$('match-weights').textContent='';if(!d)return;
 const W=760,H=180,L=35,R=15,T=25,B=22,all=[...d.query,...d.historical],lo=Math.min(...all)-.2,hi=Math.max(...all)+.2;
 const path=values=>values.map((v,i)=>`${i?'L':'M'}${(L+i/(values.length-1)*(W-L-R)).toFixed(2)},${(T+(hi-v)/(hi-lo)*(H-T-B)).toFixed(2)}`).join(' ');
 $('match-chart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('matchTitle'))}"><path d="${path(d.query)}" fill="none" stroke="#242b27" stroke-width="2.5"/><path d="${path(d.historical)}" fill="none" stroke="#4c8062" stroke-width="2.5"/><text x="${L}" y="16" font-size="11">${esc(t('matchLegend'))}</text><text x="${L}" y="${H-4}" font-size="11">${esc(t('matchAxis'))}</text></svg>`;
 $('match-note').textContent=(locale==='en'?`Case #${selected+1}: largest sampled shape deviation is in quarter ${d.largestDifferenceQuarter}. `:`案例 #${selected+1}：采样点中最大形态偏差位于观察窗的第 ${d.largestDifferenceQuarter} 段（共四段）。`)+t('matchNote');
 const names=locale==='en'?{shape:'Shape',structure:'Structure',volatility:'Volatility',volume:'Volume'}:{shape:'形态',structure:'结构',volatility:'波动',volume:'量能'};
 $('match-weights').textContent=d.components.map(c=>`${names[c.key]} ${(c.weight*100).toFixed(1)}% × ${c.distance.toFixed(3)} = ${c.contribution.toFixed(3)}`).join(' · ')+' · '+t('matchWeightNote');
}
$('reveal').onclick=()=>{if(worker&&result?.replay?.state==='hidden')worker.postMessage({type:'reveal'});};
$('cancel-run').onclick=()=>{runSequence++;downloadController?.abort();downloadController=null;worker?.terminate();worker=null;setBusy(false);setStatus('changed');};
$('save-history').onclick=()=>{
 if(!downloadSnapshot)return;
 const csv=['timestamp,open,high,low,close,volume,end',...downloadSnapshot.bars.map(b=>[b.t,b.o,b.h,b.l,b.c,b.v,b.end].join(','))].join('\n');
 const blob=new Blob([csv],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`binance-${downloadSnapshot.metadata.symbol}-${downloadSnapshot.metadata.timeframe}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function renderIndicatorValues(){
 const box=$('indicator-values');box.replaceChildren();if(!result)return;
 const selected=INDICATORS.filter(spec=>document.querySelector(`[data-indicator="${spec.id}"]`).checked);
 if(!selected.length)return;
 const time=document.createElement('p');time.textContent=(locale==='en'?'Latest closed-bar values · ':'最新已收盘指标 · ')+dt(result.asOf)+' UTC · '+result.timeframe;box.append(time);
 for(const spec of selected){const tag=document.createElement('span'),v=result.indicators?.series[spec.id]?.at(-1);tag.style.borderColor=spec.color;tag.textContent=`${spec.label}: ${v==null?(locale==='en'?'Insufficient warmup':'预热数据不足'):money(v)+' '+result.quoteUnit}`;box.append(tag);}
}
function renderQuality(){
 const box=$('quality');box.replaceChildren();const c=result.coverage,meta=result.importInfo;
 const age=Math.max(0,(Date.now()-Date.parse(result.asOf))/3600000);
 const rows=locale==='en'?[
 ['Source',result.synthetic?'Synthetic demonstration':(meta?.provider||'Unspecified')+(result.download?' · downloaded directly; no independent cross-check':' · user supplied, unverified')],
 ['History',`${dt(c.start)} → ${dt(c.end)} UTC · ${c.closedBars.toLocaleString()} closed bars`],
 ['Freshness',`${age.toFixed(1)} hours since observation cutoff · closed-bar snapshot; no automatic refresh or calendar freshness check`],
 ['Import',`${meta?.fileCount||0} files · ${meta?.duplicates||0} identical rows deduplicated · ${c.droppedOpen} open/after-cutoff bars excluded`],
 ['Screening',`${c.examined} anchors checked → ${result.rawCandidates} eligible → ${result.episodeCount} displayed (limit ${result.maxCases})`],
 ['Excluded',`${result.rejectedImmature} incomplete horizons; ${result.rejectedGaps} gaps/intervals; ${c.rejectedFlat} flat; ${c.rejectedDistance} distance threshold; ${result.rawCandidates-result.episodeCount} overlapping or beyond cap`],
 ['Evidence',`${result.episodeCount<10?'Small sample; inspect individually':'Descriptive sample; predictive reliability unvalidated'} · price adjustment: ${meta?.adjustment||'synthetic'}`],
 ['Trace',result.dataFingerprint+' · content identifier, not a source authenticity certificate']
 ]:[
 ['数据来源',result.synthetic?'合成演示':(meta?.provider||'未填写')+(result.download?' · 直接下载，未作独立交叉核验':' · 用户声明，未经独立核验')],
 ['历史覆盖',`${dt(c.start)} → ${dt(c.end)} UTC · ${c.closedBars.toLocaleString()} 根已收盘 K 线`],
 ['数据新鲜度',`距观察截止 ${age.toFixed(1)} 小时 · 已收盘快照，不自动刷新；未按交易日历判定更新`],
 ['导入情况',`${meta?.fileCount||0} 个文件 · 相同记录去重 ${meta?.duplicates||0} 根 · 排除未收盘/晚于截止 ${c.droppedOpen} 根`],
 ['筛选过程',`${c.examined} 个锚点 → ${result.rawCandidates} 个合格候选 → 展示 ${result.episodeCount} 个案例（上限 ${result.maxCases}）`],
 ['未进入结果',`后续不完整 ${result.rejectedImmature}；缺口/周期 ${result.rejectedGaps}；近乎平直 ${c.rejectedFlat}；距离超限 ${c.rejectedDistance}；重叠去重或展示上限 ${result.rawCandidates-result.episodeCount}`],
 ['证据状态',`${result.episodeCount<10?'样本少，逐例检查':'描述性案例；预测可靠性未验证'} · 复权口径：${({unknown:'未确认',raw:'未复权',adjusted:'已统一复权'})[meta?.adjustment]||'合成'}`],
 ['追溯标记',result.dataFingerprint+' · 内容标识，不是来源真实性认证']
 ];
 if(result.screenshot)rows.unshift([locale==='en'?'Screenshot handoff':'截图衔接',locale==='en'?'User-confirmed Binance spot metadata; prices and indicators come from downloaded OHLCV, using the last 96 closed bars.':'用户已确认 Binance 现货信息；价格和指标来自下载的真实 OHLCV，比较最后 96 根已收盘记录。']);
 if(result.download)rows.unshift([locale==='en'?'Download':'行情下载',`${result.download.provider} · ${result.download.receivedBars}/${result.download.requestedBars} · ${result.download.fetchedAt} · ${result.download.partial?t('remotePartial'):t('remoteComplete')}`]);
 for(const [label,value] of rows){const row=document.createElement('p'),b=document.createElement('strong');b.textContent=label+'：';row.append(b,document.createTextNode(value));box.append(row);}
}
document.querySelectorAll('[data-indicator]').forEach(e=>e.addEventListener('change',()=>{if(result){renderIndicatorValues();chart(priceProjection(result));}}));
document.querySelectorAll('[data-insight]').forEach(button=>button.addEventListener('click',()=>{insightTask=button.dataset.insight;clearAI();document.querySelectorAll('[data-insight]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));refreshPayload();aiConfigUI();}));
const aiErrors={AI_QUESTION_INVALID:['问题不能超过 600 字符。','Question must be at most 600 characters.'],AI_AUTH_FAILED:['密钥无效或无权限，请核对供应商。','Invalid key or permission. Check the provider.'],AI_RATE_LIMITED:['供应商限流或额度不足，请稍后再试。','Provider rate limit or quota reached. Try later.'],AI_OUTPUT_BLOCKED:['输出不符合证据解释规则，已丢弃。可换模型重试，数值结果不受影响。','Output failed the evidence-only rules and was discarded. Try another model; numerical results are unchanged.'],AI_OUTPUT_INVALID:['模型未返回约定格式，请使用支持 JSON 指令的模型。','Model returned an invalid format. Use a model that follows JSON instructions.'],AI_PROVIDER_ERROR:['供应商拒绝请求，请检查模型 ID 与 JSON 输出支持。','Provider rejected the request. Check model ID and JSON output support.'],AI_NETWORK_ERROR:['供应商请求超时或网络失败；没有自动重试或切换供应商。','Provider timeout/network failure. No automatic retry or provider switch.'],AI_LOCAL_LIMIT:['当前请求仍在进行或请求过于频繁，请稍后再试。','A request is active or the local rate limit was reached. Try later.']};
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
 try{const response=await fetch(new URL('../api/explain',import.meta.url),{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({provider:$('provider').value,model:$('model').value.trim(),apiKey:$('key').value.trim(),locale,consent:true,task:insightTask,evidence:aiEvidence(current)})});const data=await response.json();if(!response.ok)throw Error(data.error||'AI_PROVIDER_ERROR');if(controller.signal.aborted||current!==result||locale!==requestLocale)return;
 $('ai-text').textContent=data.explanation.answer;$('ai-result').hidden=false;$('ai-status').textContent=`${data.provider} / ${data.model}`;
 }catch(error){if(!controller.signal.aborted&&error.name!=='AbortError'&&current===result)$('ai-status').textContent=(aiErrors[error.message]||["AI 请求失败，请检查配置。","AI request failed. Check your configuration."])[locale==='en'?1:0];}
 finally{if(aiController===controller){aiController=null;aiConfigUI();}}
};
$('export').onclick=()=>{if(!result)return;const blob=new Blob([JSON.stringify({...result,projection:priceProjection(result)},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`market-echo-${result.synthetic?'synthetic-':''}report.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('demo').onclick=()=>{$('source').value='demo';$('category').value='crypto';$('timeframe').value='1h';populate(true);run();};
$('form').addEventListener('submit',run);
window.addEventListener('pagehide',()=>{$('key').value='';aiController?.abort();});
const screenshot=mountScreenshot({getLocale:()=>locale,getConfig:()=>config,
 getReference:()=>({source:$('source').value,symbol:$('symbol').value,timeframe:$('timeframe').value,instrument:$('instrument').value,files:[...$('file').files].map(f=>f.name),synthetic:$('synthetic').checked}),
 onConfigureDemo:s=>{if(busy)return;if(!['crypto','us','cn','metals'].includes(s.category)||!['5m','15m','1h','4h','1d'].includes(s.timeframe)||s.category==='cn'&&s.timeframe!=='1d')throw Error('SCREENSHOT_FIELDS_REQUIRED');$('source').value='demo';$('category').value=s.category;populate(true);const symbol=s.symbol.toUpperCase();$('asset').value=s.category==='metals'?(symbol.includes('XAU')?'XAU':symbol.includes('XAG')?'XAG':'OTHER'):s.category==='crypto'?(symbol.startsWith('BTC')?'BTC':symbol.startsWith('ETH')?'ETH':'OTHER'):'CUSTOM';$('timeframe').value=s.timeframe;if(['spot','perpetual','futures'].includes(s.instrument))$('instrument').value=s.instrument;populate();const cfg=marketConfig(s.category,$('asset').value,['us','cn'].includes(s.category)?'spot':$('instrument').value);$('symbol').value=cfg.defaultSymbol;$('quote').value=cfg.quote;$('cutoff').value='';$('replay-mode').checked=false;changed();},
 onInvalidate:()=>{if(!busy)changed();},
 onFull:async shot=>{if(busy)return;$('source').value='remote';$('category').value='crypto';populate(true);$('asset').value=shot.marketSymbol.startsWith('BTC')?'BTC':'ETH';$('timeframe').value=shot.timeframe;populate();$('cutoff').value=shot.lastClosedAt.slice(0,19);$('replay-mode').checked=false;await run(undefined,{full:shot});},
 onShape:async shot=>{if(busy)return;if($('timeframe').value!==shot.timeframe)throw Error('SCREENSHOT_INTERVAL_MISMATCH');await run(undefined,{shape:shot});}});
populate(true);translate();run();
fetch(new URL('../api/config',import.meta.url)).then(r=>r.ok?r.json():null).then(data=>{if(data?.ai)config=data;aiConfigUI();screenshot.translate();}).catch(()=>aiConfigUI());
