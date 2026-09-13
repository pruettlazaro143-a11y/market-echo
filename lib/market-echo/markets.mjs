export const CATEGORIES=['crypto','us','cn','metals'];
export const ASSETS={crypto:['BTC','ETH','OTHER'],us:['CUSTOM'],cn:['CUSTOM'],metals:['XAU','XAG','OTHER']};
export function marketConfig(category,asset,instrument='spot'){
 if(!CATEGORIES.includes(category)||!ASSETS[category].includes(asset))throw Error('INVALID_MARKET');
 if(!['spot','perpetual','futures'].includes(instrument))throw Error('INVALID_MARKET');
 if(category==='crypto')return {marketKey:asset==='OTHER'?'crypto_other':asset==='ETH'?'eth':instrument==='perpetual'?'btc_perpetual':'btc_spot',sessionPolicy:'continuous_24_7',comparisonMode:asset==='OTHER'?'structure_only':'full',defaultSymbol:asset==='OTHER'?'ALT/USDT':asset+'/USDT',quote:'USDT',instrument};
 if(category==='us')return {marketKey:'us_equity',sessionPolicy:'us_exchange',comparisonMode:'full',defaultSymbol:'AAPL',quote:'USD',instrument:'stock'};
 if(category==='cn')return {marketKey:'cn_equity',sessionPolicy:'cn_exchange',comparisonMode:'full',defaultSymbol:'600519.SH',quote:'CNY',instrument:'stock'};
 return {marketKey:'metal',sessionPolicy:'provider_session',comparisonMode:'full',defaultSymbol:asset==='OTHER'?'METAL':asset+'/USD',quote:asset==='OTHER'?'CSV unit':'USD/oz',instrument};
}
