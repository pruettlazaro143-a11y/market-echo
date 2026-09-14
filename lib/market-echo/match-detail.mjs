import {normalizedShape} from './engine.mjs';
export function matchDetail(result,index){
 const c=result.cases[index];if(!c)return null;
 const query=normalizedShape(result.query),historical=normalizedShape(c.context);
 const differences=query.map((v,i)=>Math.abs(v-historical[i]));
 const max=Math.max(...differences),point=differences.indexOf(max);
 const raw=result.comparisonMode==='structure_only'?{shape:2/3,structure:1/3}:{shape:.5,structure:.25,volatility:.15,volume:.1};
 const active=Object.keys(raw).filter(k=>c.components[k]!==null),total=active.reduce((s,k)=>s+raw[k],0);
 return {query,historical,largestDifferenceQuarter:Math.min(4,Math.floor(point/8)+1),shapeDistance:Math.sqrt(differences.reduce((s,v)=>s+v*v,0)/differences.length)/2,
 components:active.map(key=>({key,weight:raw[key]/total,distance:c.components[key],contribution:raw[key]/total*c.components[key]}))};
}
