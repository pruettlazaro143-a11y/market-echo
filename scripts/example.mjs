import {analyze,demoInput} from '../lib/market-echo/engine.mjs';
const result=analyze(demoInput());
console.log(JSON.stringify({synthetic:result.synthetic,cases:result.episodeCount,median:result.distribution.median,warnings:result.warnings},null,2));
