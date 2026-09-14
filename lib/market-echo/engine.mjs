/* Pure numerical core. Similarity is descriptive evidence, never probability. */

export const VERSION = "1.3.0";
export const MAX_BARS = 100_000;
export const MAX_CSV_BYTES = 30_000_000;
import {indicatorSnapshot} from "./indicators.mjs";

export const TIMEFRAMES = {
  "5m": { label: "5 分钟", ms: 5 * 60 * 1000, lookback: 96 },
  "15m": { label: "15 分钟", ms: 15 * 60 * 1000, lookback: 96 },
  "1h": { label: "1 小时", ms: 60 * 60 * 1000, lookback: 96 },
  "4h": { label: "4 小时", ms: 4 * 60 * 60 * 1000, lookback: 96 },
  "1d": { label: "1 天", ms: 24 * 60 * 60 * 1000, lookback: 96 },
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const VALID_MARKETS = new Set([
  "btc_spot",
  "btc_perpetual",
  "gold_reference",
  "gold_perpetual",
  "us_equity", "cn_equity", "eth", "crypto_other", "metal",
]);
const MARKET_SESSIONS = {
  btc_spot: "continuous_24_7",
  btc_perpetual: "continuous_24_7",
  gold_reference: "provider_session",
  gold_perpetual: "continuous_24_7",
  us_equity: "us_exchange",
  cn_equity: "cn_exchange", eth: "continuous_24_7", crypto_other: "continuous_24_7", metal: "provider_session",
};

export const DECISION_HORIZON_PRESETS = {
  continuous_24_7: [
    { value: 4, unit: "hour", label: "4 小时" },
    { value: 24, unit: "hour", label: "24 小时" },
    { value: 7, unit: "calendar_day", label: "7 日" },
    { value: 30, unit: "calendar_day", label: "30 日" },
  ],
  provider_session: [
    { value: 4, unit: "hour", label: "4 小时" },
    { value: 24, unit: "hour", label: "24 小时" },
    { value: 7, unit: "calendar_day", label: "7 日" },
    { value: 30, unit: "calendar_day", label: "30 日" },
  ],
  us_exchange: [
    { value: 1, unit: "trading_day", label: "1 个交易日" },
    { value: 5, unit: "trading_day", label: "5 个交易日" },
    { value: 20, unit: "trading_day", label: "20 个交易日" },
  ],
};

DECISION_HORIZON_PRESETS.cn_exchange = DECISION_HORIZON_PRESETS.us_exchange;

export function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function standardDeviation(values) {
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

export function quantile(values, q) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const index = Math.floor(position);
  const next = sorted[Math.min(index + 1, sorted.length - 1)];
  return sorted[index] + (next - sorted[index]) * (position - index);
}

function assertMarketContract(marketKey, sessionPolicy) {
  if (!VALID_MARKETS.has(marketKey)) throw new Error("不支持的市场身份");
  if (MARKET_SESSIONS[marketKey] !== sessionPolicy) {
    throw new Error("市场身份与交易时段口径不一致");
  }
}

export function normalizeDecisionHorizon(raw, sessionPolicy) {
  const value = Number(raw?.value);
  const unit = raw?.unit;
  if (!Number.isInteger(value) || value < 1 || value > 365) {
    throw new Error("判断期限必须是 1 到 365 之间的整数");
  }
  if (["us_exchange", "cn_exchange"].includes(sessionPolicy) && unit !== "trading_day") {
    throw new Error("股票判断期限必须使用交易日");
  }
  if (!["us_exchange", "cn_exchange"].includes(sessionPolicy) && !["hour", "calendar_day"].includes(unit)) {
    throw new Error("连续市场判断期限必须使用小时或自然日");
  }
  return { value, unit };
}

export function decisionHorizonLabel(horizon) {
  if (horizon.unit === "hour") return `${horizon.value} 小时`;
  if (horizon.unit === "calendar_day") return `${horizon.value} 日`;
  return `${horizon.value} 个交易日`;
}

function durationTarget(timestamp, horizon) {
  if (horizon.unit === "hour") return timestamp + horizon.value * HOUR;
  if (horizon.unit === "calendar_day") return timestamp + horizon.value * DAY;
  return null;
}

export function validateBars(raw, { asOf = Date.now(), maxBars = MAX_BARS } = {}) {
  if (!Array.isArray(raw) || raw.length > maxBars) {
    throw new Error(`行情必须为数组，最多 ${maxBars} 根`);
  }
  const bars = [];
  const seen = new Set();
  let droppedOpen = 0;

  for (const rawBar of raw) {
    const t = typeof rawBar.t === "string" ? Date.parse(rawBar.t) : Number(rawBar.t);
    const end = typeof rawBar.end === "string" ? Date.parse(rawBar.end) : Number(rawBar.end);
    const o = Number(rawBar.o);
    const h = Number(rawBar.h);
    const l = Number(rawBar.l);
    const c = Number(rawBar.c);
    const v = rawBar.v == null ? null : Number(rawBar.v);
    const invalid = ![t, end, o, h, l, c].every(Number.isFinite)
      || t < 1e11
      || end <= t
      || [o, h, l, c].some((value) => value <= 0)
      || h < Math.max(o, c)
      || l > Math.min(o, c)
      || l > h
      || (v !== null && (!Number.isFinite(v) || v < 0));
    if (invalid) {
      throw new Error("OHLCV 无效：需要毫秒时间戳、合法正价格和非负成交量");
    }
    if (seen.has(t)) throw new Error("行情包含重复时间戳");
    seen.add(t);
    if (rawBar.complete === false || end > asOf) {
      droppedOpen += 1;
      continue;
    }
    bars.push({ t, end, o, h, l, c, v, complete: true });
  }

  bars.sort((a, b) => a.t - b.t);
  for (let index = 1; index < bars.length; index += 1) {
    if (bars[index].t < bars[index - 1].end) throw new Error("K 线时间范围重叠");
  }
  return { bars, droppedOpen };
}

export function resample(values, count = 32) {
  if (values.length === 1) return Array(count).fill(values[0]);
  return Array.from({ length: count }, (_, index) => {
    const position = index * (values.length - 1) / (count - 1);
    const left = Math.floor(position);
    const right = Math.min(left + 1, values.length - 1);
    return values[left] + (values[right] - values[left]) * (position - left);
  });
}

function zScore(values) {
  const average = mean(values);
  const deviation = standardDeviation(values);
  return values.map((value) => deviation > 1e-10 ? (value - average) / deviation : 0);
}

export function normalizedShape(bars){return resample(zScore(bars.map(b=>Math.log(b.c))));}

function features(bars) {
  const close = bars.map((bar) => Math.log(bar.c));
  const returns = close.slice(1).map((value, index) => value - close[index]);
  const trueRanges = bars.map((bar, index) => Math.max(
    bar.h - bar.l,
    index ? Math.abs(bar.h - bars[index - 1].c) : 0,
    index ? Math.abs(bar.l - bars[index - 1].c) : 0,
  ) / bar.c);
  const atr = Math.max(mean(trueRanges.slice(-14)), 1e-7);
  const volatility = standardDeviation(returns);
  const chunks = Array.from({ length: 4 }, (_, index) => (
    bars.slice(
      Math.floor(index * bars.length / 4),
      Math.floor((index + 1) * bars.length / 4),
    )
  ));
  const structure = chunks.flatMap((chunk) => [
    (chunk.at(-1).c / chunk[0].c - 1) / Math.max(atr * Math.sqrt(chunk.length), 1e-6),
    (Math.max(...chunk.map((bar) => bar.h)) - chunk.at(-1).c) / Math.max(chunk.at(-1).c * atr, 1e-6),
    (chunk.at(-1).c - Math.min(...chunk.map((bar) => bar.l))) / Math.max(chunk.at(-1).c * atr, 1e-6),
  ]).map((value) => Math.tanh(value / 3));
  const hasVolume = bars.every((bar) => bar.v !== null) && bars.some((bar) => bar.v > 0);
  return {
    shape: resample(zScore(close)),
    structure,
    volatility,
    atr,
    flat: standardDeviation(close) < 1e-8,
    volume: hasVolume ? resample(zScore(bars.map((bar) => Math.log1p(bar.v))), 16) : null,
  };
}

function rmse(left, right) {
  return Math.sqrt(mean(left.map((value, index) => (value - right[index]) ** 2)));
}

function featureDistance(left, right, mode = "full") {
  const components = {
    shape: rmse(left.shape, right.shape) / 2,
    structure: rmse(left.structure, right.structure) / 2,
    volatility: Math.min(
      2,
      Math.abs(Math.log(Math.max(left.volatility, 1e-8) / Math.max(right.volatility, 1e-8))) / 2,
    ),
    volume: left.volume && right.volume ? rmse(left.volume, right.volume) / 2 : null,
  };
  const weights = mode === "structure_only" ? { shape: 2 / 3, structure: 1 / 3 } : { shape: 0.5, structure: 0.25, volatility: 0.15, volume: 0.1 };
  let distance = 0;
  let includedWeight = 0;
  for (const key of Object.keys(weights)) {
    if (components[key] === null) continue;
    distance += weights[key] * components[key];
    includedWeight += weights[key];
  }
  return { distance: distance / includedWeight, components };
}

const newYorkDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const shanghaiDayFormatter = new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Shanghai", year:"numeric", month:"2-digit", day:"2-digit"});
function marketDay(timestamp, sessionPolicy = "us_exchange") {
  return (sessionPolicy === "cn_exchange" ? shanghaiDayFormatter : newYorkDayFormatter).format(new Date(timestamp));
}

function tradingDayOutcomeIndex(bars, anchorIndex, count, timeframeMs, sessionPolicy) {
  if (timeframeMs >= DAY) {
    const index = anchorIndex + count;
    return index < bars.length ? index : null;
  }

  const anchorDay = marketDay(bars[anchorIndex].end - 1, sessionPolicy);
  const sessions = [];
  let current = null;
  for (let index = anchorIndex + 1; index < bars.length; index += 1) {
    const day = marketDay(bars[index].end - 1, sessionPolicy);
    if (day === anchorDay) continue;
    if (!current || current.day !== day) {
      current = { day, start: index, end: index };
      sessions.push(current);
    } else {
      current.end = index;
    }
    if (sessions.length > count) break;
  }
  if (sessions.length < count) return null;
  const targetSession = sessions[count - 1];
  if (sessions.length === count && targetSession.end === bars.length - 1) return null;
  return targetSession.end;
}

function resolveOutcome(bars, anchorIndex, horizon, sessionPolicy, timeframeMs, details = true, sessionCache = null) {
  const anchor = bars[anchorIndex];
  const target = durationTarget(anchor.end, horizon);
  let outcomeIndex = null;

  if (["us_exchange", "cn_exchange"].includes(sessionPolicy)) {
    if(sessionCache){const group=sessionCache.groups[sessionCache.slots[anchorIndex]+horizon.value];outcomeIndex=group&&group.end<bars.length-1?group.end:null;}
    else outcomeIndex = tradingDayOutcomeIndex(bars, anchorIndex, horizon.value, timeframeMs, sessionPolicy);
  } else {
    let left=anchorIndex+1,right=bars.length;
    while(left<right){const mid=Math.floor((left+right)/2);if(bars[mid].end<target)left=mid+1;else right=mid;}
    if(left<bars.length)outcomeIndex=left;
    if (outcomeIndex !== null) {
      const tolerance = sessionPolicy === "continuous_24_7" ? timeframeMs + 1000 : 4 * DAY;
      if (bars[outcomeIndex].end - target > tolerance) outcomeIndex = null;
    }
  }

  if (outcomeIndex === null || outcomeIndex <= anchorIndex) return null;
  if(!details)return {outcomeIndex,target,actualEnd:bars[outcomeIndex].end,futureCount:outcomeIndex-anchorIndex,returnPct:(bars[outcomeIndex].c/anchor.c-1)*100};
  const future = bars.slice(anchorIndex + 1, outcomeIndex + 1);
  const actualEnd = bars[outcomeIndex].end;
  return {
    outcomeIndex,
    target,
    actualEnd,
    returnPct: (bars[outcomeIndex].c / anchor.c - 1) * 100,
    mfePct: Math.max(0, (Math.max(...future.map((bar) => bar.h)) / anchor.c - 1) * 100),
    maePct: Math.min(0, (Math.min(...future.map((bar) => bar.l)) / anchor.c - 1) * 100),
    trace: future.map((bar) => ({ t: bar.end, r: (bar.c / anchor.c - 1) * 100 })),
    future,
  };
}

export function historicalOutcome(bars,index,horizon,sessionPolicy,timeframeMs,details=true){
 const o=resolveOutcome(bars,index,horizon,sessionPolicy,timeframeMs,false);
 if(!o||!goodWindow(bars,index,o.outcomeIndex,timeframeMs,sessionPolicy))return null;
 return details?resolveOutcome(bars,index,horizon,sessionPolicy,timeframeMs):o;
}

function utcDay(timestamp) {
  return Math.floor(timestamp / DAY);
}

function goodWindow(bars, start, end, timeframeMs, sessionPolicy) {
  for (let index = start; index <= end; index += 1) {
    const duration = bars[index].end - bars[index].t;
    const sessionDaily = timeframeMs >= DAY && sessionPolicy !== "continuous_24_7";
    if (sessionDaily ? duration <= 0 || duration > timeframeMs + 1000 : Math.abs(duration - timeframeMs) > 1000) return false;
    if (index === start) continue;
    const gap = bars[index].t - bars[index - 1].end;
    if (sessionPolicy === "continuous_24_7" && Math.abs(gap) > 1000) return false;
    // Daily session markets can have extended holidays; this is a gap heuristic, not a certified calendar.
    if (gap > (timeframeMs >= DAY && sessionPolicy !== "continuous_24_7" ? 21 : 5) * DAY) return false;
    if (sessionPolicy === "provider_session" && utcDay(bars[index].t) === utcDay(bars[index - 1].t) && gap > 1000) {
      return false;
    }
    if (["us_exchange", "cn_exchange"].includes(sessionPolicy)
      && timeframeMs < DAY
      && marketDay(bars[index].t) === marketDay(bars[index - 1].t)
      && gap > 1000) {
      return false;
    }
  }
  return true;
}

function visibleContext(events, asOf, symbol) {
  return (Array.isArray(events) ? events : [])
    .filter((event) => (
      ["news", "macro", "earnings", "fundamental"].includes(event.type)
      && typeof event.summary === "string"
      && event.summary.length < 2000
      && Number.isFinite(Date.parse(event.publishedAt))
      && Number.isFinite(Date.parse(event.availableAt))
      && Date.parse(event.publishedAt) <= asOf
      && Date.parse(event.availableAt) <= asOf
      && (!event.symbols?.length || event.symbols.includes(symbol) || event.type === "macro")
    ))
    .map((event) => ({
      ...event,
      summary: event.summary.slice(0, 2000),
      url: typeof event.url === "string" && /^https:\/\//.test(event.url) ? event.url : null,
    }))
    .slice(-30)
    .reverse();
}

export function fingerprint(bars) {
  let hash = 2166136261;
  for (const bar of bars) {
    const serialized = [bar.t, bar.end, bar.o, bar.h, bar.l, bar.c, bar.v].join("|");
    for (let index = 0; index < serialized.length; index += 1) {
      hash ^= serialized.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function analyze(input) {
  const timeframe = input.timeframe || "1h";
  const timeframeSpec = TIMEFRAMES[timeframe];
  if (!timeframeSpec) throw new Error("不支持的图表周期");
  const marketKey = input.marketKey || "btc_spot";
  const sessionPolicy = input.sessionPolicy || MARKET_SESSIONS[marketKey];
  assertMarketContract(marketKey, sessionPolicy);
  const decisionHorizon = normalizeDecisionHorizon(
    input.decisionHorizon || DECISION_HORIZON_PRESETS[sessionPolicy][1] || DECISION_HORIZON_PRESETS[sessionPolicy][0],
    sessionPolicy,
  );
  const requestedAsOf = input.asOf ? Date.parse(input.asOf) : Date.now();
  if (!Number.isFinite(requestedAsOf) || requestedAsOf > Date.now() + 60 * 1000) {
    throw new Error("截止时间无效或位于未来");
  }

  const checked = validateBars(input.bars, { asOf: requestedAsOf });
  const bars = input.source === "okx" && marketKey === "gold_perpetual"
    ? checked.bars.filter((bar) => bar.t >= Date.UTC(2026, 0, 16))
    : checked.bars;
  if (marketKey === "cn_equity" && timeframe !== "1d") throw new Error("A 股首版仅支持日线；日历和午休适配后再开放分钟线");
  const comparisonMode = marketKey === "crypto_other" ? "structure_only" : input.comparisonMode === "structure_only" ? "structure_only" : "full";
  const lookback = timeframeSpec.lookback;
  if (bars.length < lookback) {
    throw new Error(`需要至少 ${lookback} 根已收盘的 ${timeframe} K 线，当前 ${bars.length} 根`);
  }

  const anchorIndex = bars.length - 1;
  const queryStart = anchorIndex - lookback + 1;
  const query = bars.slice(queryStart);
  const queryFeatures = features(query);
  if (!goodWindow(bars, queryStart, anchorIndex, timeframeSpec.ms, sessionPolicy)) {
    throw new Error("当前观察窗口的周期不一致或有缺口，请补齐行情");
  }
  const cohortHasVolume = bars.every((bar) => bar.v !== null) && bars.some((bar) => bar.v > 0);
  if (!cohortHasVolume) queryFeatures.volume = null;
  if (queryFeatures.flat) throw new Error("当前价格序列近乎平直，无法进行有效形态匹配");

  const maxCases=input.maxCases??30;
  if(![30,60,100].includes(maxCases))throw Error('INVALID_CASE_LIMIT');
  // Prefix invalid-window counts avoid scanning a long outcome on every candidate.
  const badPairs=[0];
  for(let i=1;i<bars.length;i++)badPairs[i]=badPairs[i-1]+Number(!goodWindow(bars,i-1,i,timeframeSpec.ms,sessionPolicy));
  let sessionCache=null;
  if(['us_exchange','cn_exchange'].includes(sessionPolicy)&&timeframeSpec.ms<DAY){
    const groups=[],slots=[];
    for(let i=0;i<bars.length;i++){const day=marketDay(bars[i].end-1,sessionPolicy);if(groups.at(-1)?.day!==day)groups.push({day,end:i});else groups.at(-1).end=i;slots.push(groups.length-1);}
    sessionCache={groups,slots};
  }
  const candidates = [];
  let rejectedDistance=0,rejectedFlat=0;
  let rejectedGaps = 0;
  let rejectedImmature = 0;
  for (let index = lookback - 1; index < queryStart - 1; index += 1) {
    const outcome = resolveOutcome(bars, index, decisionHorizon, sessionPolicy, timeframeSpec.ms, false, sessionCache);
    if (!outcome || outcome.actualEnd >= bars[queryStart].t) {
      rejectedImmature += 1;
      continue;
    }
    if (badPairs[outcome.outcomeIndex]-badPairs[index-lookback+1]>0) {
      rejectedGaps += 1;
      continue;
    }
    const candidateFeatures = features(bars.slice(index - lookback + 1, index + 1));
    if (candidateFeatures.flat) {rejectedFlat++;continue;}
    if (!cohortHasVolume) candidateFeatures.volume = null;
    const comparison = featureDistance(queryFeatures, candidateFeatures, comparisonMode);
    if (comparison.distance > 0.85) {rejectedDistance++;continue;}
    const neutralPct = candidateFeatures.atr * 0.2 * Math.sqrt(outcome.futureCount) * 100;
    candidates.push({
      index,
      start: index - lookback + 1,
      ...comparison,
      outcome,
      neutralPct,
    });
  }

  candidates.sort((left, right) => left.distance - right.distance || left.index - right.index);
  const selected = [];
  for (const candidate of candidates) {
    const candidateStart = bars[candidate.start].t;
    if (selected.every((current) => (
      candidateStart > current.outcome.actualEnd
      || bars[current.start].t > candidate.outcome.actualEnd
    ))) {
      selected.push(candidate);
      if (selected.length >= maxCases) break;
    }
  }

  const counts = { up: 0, flat: 0, down: 0 };
  const cases = selected.map((candidate, index) => {
    candidate.outcome=resolveOutcome(bars,candidate.index,decisionHorizon,sessionPolicy,timeframeSpec.ms);
    const direction = candidate.outcome.returnPct > candidate.neutralPct
      ? "up"
      : candidate.outcome.returnPct < -candidate.neutralPct
        ? "down"
        : "flat";
    counts[direction] += 1;
    return {
      id: `${input.symbol || "asset"}:${timeframe}:${decisionHorizon.value}${decisionHorizon.unit}:${bars[candidate.index].end}`,
      rank: index + 1,
      start: new Date(bars[candidate.start].t).toISOString(),
      anchor: new Date(bars[candidate.index].end).toISOString(),
      outcomeEnd: new Date(candidate.outcome.actualEnd).toISOString(),
      targetEnd: candidate.outcome.target ? new Date(candidate.outcome.target).toISOString() : null,
      similarity: Math.round(100 * Math.exp(-candidate.distance)),
      distance: candidate.distance,
      components: candidate.components,
      direction,
      returnPct: candidate.outcome.returnPct,
      mfePct: candidate.outcome.mfePct,
      maePct: candidate.outcome.maePct,
      neutralPct: candidate.neutralPct,
      context: bars.slice(candidate.start, candidate.index + 1),
      future: candidate.outcome.future,
      trace: candidate.outcome.trace,
      contextEvents: visibleContext(input.events, bars[candidate.index].end, input.symbol),
    };
  });

  const episodeCount = cases.length;
  const frequencies = Object.fromEntries(Object.entries(counts).map(([key, count]) => [key, {
    count,
    frequency: episodeCount ? count / episodeCount : null,
    interval: null,
  }]));
  const outcomes = cases.map((item) => item.returnPct);
  const stance = ["bullish", "bearish", "neutral"].includes(input.stance) ? input.stance : "neutral";
  const expectedDirection = stance === "bullish" ? "up" : stance === "bearish" ? "down" : null;
  const currentEvents = visibleContext(input.events, requestedAsOf, input.symbol);
  const warnings = [];
  if (input.synthetic) warnings.push("合成演示数据；日期、案例与统计只用于验证产品行为。");
  if (episodeCount < 10) warnings.push(`仅 ${episodeCount} 个去重案例，样本不足；只展示描述性案例。`);
  warnings.push("历史频率不是未来胜率；去重案例也不等于统计独立样本。");
  if (!queryFeatures.volume) warnings.push("成交量不可用或全零；量能距离已从全体候选统一移除。");
  if (checked.droppedOpen) warnings.push(`已排除 ${checked.droppedOpen} 根未收盘或晚于截止时间的 K 线。`);
  if (sessionPolicy === "provider_session") {
    warnings.push("供应商交易时段尚未经过认证交易日历复核，周末与休市边界使用行情本身代理。");
  }
  if (["us_exchange", "cn_exchange"].includes(sessionPolicy)) {
    warnings.push("股票期限按数据中的完整交易日计数，节假日、缺失交易日与停牌仍需交易日历复核。");
  }
  if (!currentEvents.length) warnings.push("新闻、宏观与财报环境尚未覆盖，本次只能验证量价形态。");
  if (input.source === "okx" && marketKey === "gold_perpetual") {
    warnings.push("黄金永续仅使用 2026-01-16 UTC 起的数据，隔离合约与指数制度变更。");
  }

  if (comparisonMode === "structure_only") warnings.push("其他加密资产仅比较形态与结构，不输出换算目标价格，未评估流动性、代币机制或新闻。");
  const queryEnd = bars.at(-1).end;
  const forecastTarget = durationTarget(queryEnd, decisionHorizon);
  const recent = query.slice(-20);
  return {
    version: VERSION,
    contractVersion: "market_echo.oss.v1",
    dataFingerprint: fingerprint(bars),
    createdAt: new Date().toISOString(),
    source: input.source || "user_import",
    providerSymbol: input.providerSymbol || input.symbol || "未指定",
    marketKey,
    symbol: input.symbol || "未指定",
    timeframe,
    sessionPolicy,
    decisionHorizon,
    decisionHorizonLabel: decisionHorizonLabel(decisionHorizon),
    synthetic: Boolean(input.synthetic),
    asOf: new Date(queryEnd).toISOString(),
    requestedAsOf: new Date(requestedAsOf).toISOString(),
    forecastEnd: forecastTarget ? new Date(forecastTarget).toISOString() : null,
    horizonSemantics: ["us_exchange", "cn_exchange"].includes(sessionPolicy) ? "future_complete_trading_days" : "elapsed_time_to_first_complete_bar",
    comparisonMode,
    probabilityStatus: "descriptive_only",
    sampleStatus: episodeCount >= 10 ? "descriptive" : "insufficient",
    lookback,
    scannedBars: bars.length,
    maxCases,
    coverage:{start:new Date(bars[0].t).toISOString(),end:new Date(queryEnd).toISOString(),inputBars:input.bars.length,closedBars:bars.length,droppedOpen:checked.droppedOpen,examined:Math.max(0,queryStart-lookback),rejectedDistance,rejectedFlat,caseLimitReached:selected.length===maxCases},
    indicators:indicatorSnapshot(bars,queryStart,queryEnd),
    rawCandidates: candidates.length,
    rejectedGaps,
    rejectedImmature,
    episodeCount,
    query,
    cases,
    frequencies,
    distribution: {
      q10: quantile(outcomes, 0.1),
      median: quantile(outcomes, 0.5),
      q90: quantile(outcomes, 0.9),
    },
    hypothesis: {
      text: String(input.hypothesis || "").slice(0, 1200),
      stance,
      supporting: expectedDirection ? cases.filter((item) => item.direction === expectedDirection).map((item) => item.id) : [],
      counterexamples: expectedDirection ? cases.filter((item) => item.direction !== expectedDirection && item.direction !== "flat").map((item) => item.id) : [],
      status: "evidence_only",
    },
    structure: {
      rangeLow: Math.min(...recent.map((bar) => bar.l)),
      rangeHigh: Math.max(...recent.map((bar) => bar.h)),
      atrPct: queryFeatures.atr * 100,
      trend: query.at(-1).c >= query[0].c ? "up" : "down",
      volumeAvailable: Boolean(queryFeatures.volume),
    },
    events: currentEvents,
    warnings,
  };
}

export function alignShape(bars, shape, {
  lookback = 96,
  timeframeMs = HOUR,
  sessionPolicy = "continuous_24_7",
  maxCandidates = 3,
  acceptCandidate = () => true,
  isSeparated = (a,b) => Math.abs(a.index-b.index)>=lookback,
} = {}) {
  if (!Array.isArray(shape)
    || shape.length < 16
    || shape.length > 96
    || !shape.every(Number.isFinite)
    || standardDeviation(shape) < 1e-8) {
    throw new Error("图片形态序列无效");
  }
  const normalized = resample(zScore(shape));
  const hits = [];
  for (let index = lookback - 1; index < bars.length; index += 1) {
    if (!goodWindow(bars, index - lookback + 1, index, timeframeMs, sessionPolicy)) continue;
    const candidate = features(bars.slice(index - lookback + 1, index + 1));
    if (candidate.flat) continue;
    const distance = rmse(normalized, candidate.shape) / 2;
    hits.push({
      asOf: new Date(bars[index].end).toISOString(),
      start: new Date(bars[index - lookback + 1].t).toISOString(),
      distance,
      similarity: Math.round(100 * Math.exp(-distance)),
      index,
    });
  }
  hits.sort((left, right) => left.distance - right.distance);
  const selected = [];
  for (const hit of hits) {
    if (acceptCandidate(hit)&&selected.every((current) => isSeparated(hit,current))) selected.push(hit);
    if (selected.length === maxCandidates) break;
  }
  return {
    status: "needs_confirmation",
    candidates: selected,
    reason: "图片只生成候选时间，仍需人工核对来源、周期与截止时间。",
  };
}

export function parseCSV(text, timeframeMs = HOUR) {
  if (typeof text !== "string" || text.length > MAX_CSV_BYTES) throw new Error("CSV 最大 30 MB");
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const header = lines.shift()?.toLowerCase().split(",").map((item) => item.trim()) || [];
  const find = (...names) => header.findIndex((item) => names.includes(item));
  const columns = {
    t: find("timestamp", "time", "t", "datetime"),
    end: find("end", "end_time"),
    o: find("open", "o"),
    h: find("high", "h"),
    l: find("low", "l"),
    c: find("close", "c"),
    v: find("volume", "v"),
  };
  if (["t", "o", "h", "l", "c"].some((key) => columns[key] < 0)) {
    throw new Error("CSV 需要 timestamp, open, high, low, close；volume/end 可选");
  }
  const readTime = (value) => {
    if (!value) throw new Error("CSV 时间字段不能为空");
    if (/^\d+(\.\d+)?$/.test(value)) return Number(value) < 1e11 ? Number(value) * 1000 : Number(value);
    if (!/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) throw new Error("CSV 时间须为带时区的 ISO 时间或 Unix 时间戳");
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) throw new Error("CSV 时间无效");
    return timestamp;
  };
  return lines.filter((line) => line.trim()).map((line) => {
    if (line.includes('"')) throw new Error("CSV 仅支持无引号数字与 ISO 时间");
    const values = line.split(",").map((item) => item.trim());
    if (["t", "o", "h", "l", "c"].some(key => !values[columns[key]])) throw new Error("CSV 必填字段不能为空");
    if (values.length !== header.length) throw new Error("CSV 行列数与表头不一致");
    const t = readTime(values[columns.t]);
    return {
      t,
      end: columns.end >= 0 ? readTime(values[columns.end]) : t + timeframeMs,
      o: Number(values[columns.o]),
      h: Number(values[columns.h]),
      l: Number(values[columns.l]),
      c: Number(values[columns.c]),
      v: columns.v < 0 || values[columns.v] === "" ? null : Number(values[columns.v]),
      complete: true,
    };
  });
}

function shouldEmitDemoBar(timestamp, timeframeMs, sessionPolicy) {
  const date = new Date(timestamp);
  const weekday = date.getUTCDay();
  if (sessionPolicy === "continuous_24_7") return true;
  if (weekday === 0 || weekday === 6) return false;
  if (sessionPolicy === "provider_session" || timeframeMs >= DAY) return true;
  const hour = date.getUTCHours();
  return hour >= 14 && hour < 21;
}

export function demoInput({
  timeframe = "1h",
  marketKey = "btc_spot",
  symbol = "BTC/USD",
  decisionHorizon,
} = {}) {
  const spec = TIMEFRAMES[timeframe];
  if (!spec) throw new Error("不支持的演示周期");
  const sessionPolicy = MARKET_SESSIONS[marketKey];
  if (!sessionPolicy) throw new Error("不支持的演示市场");
  const horizon = decisionHorizon || DECISION_HORIZON_PRESETS[sessionPolicy][1] || DECISION_HORIZON_PRESETS[sessionPolicy][0];
  const targetCount = timeframe === "1d" ? 2600 : 5200;
  const end = Date.UTC(2026, 8, 5, 20, 0, 0);
  let cursor = end - targetCount * spec.ms * (sessionPolicy === "continuous_24_7" ? 1 : 2);
  let seed = 841;
  let price = symbol.includes("BTC") ? 65000 : symbol.includes("XAU") ? 3200 : 180;
  const bars = [];
  const random = () => {
    seed = seed * 16807 % 2147483647;
    return seed / 2147483647;
  };

  while (cursor < end && bars.length < targetCount) {
    if (shouldEmitDemoBar(cursor, spec.ms, sessionPolicy)) {
      const open = price;
      const phase = bars.length % 160;
      const drift = phase < 45 ? -0.0016 : phase < 95 ? 0.0018 : phase < 135 ? 0.0002 : -0.0008;
      price *= Math.exp(drift + (random() - 0.5) * 0.009);
      const spread = 0.001 + random() * 0.006;
      bars.push({
        t: cursor,
        end: cursor + spec.ms,
        o: open,
        h: Math.max(open, price) * (1 + spread),
        l: Math.min(open, price) * (1 - spread),
        c: price,
        v: 100 + random() * 600,
        complete: true,
      });
    }
    cursor += spec.ms;
  }

  return {
    bars,
    timeframe,
    marketKey,
    symbol,
    providerSymbol: symbol,
    source: "synthetic",
    synthetic: true,
    sessionPolicy,
    decisionHorizon: horizon,
    asOf: new Date(bars.at(-1).end).toISOString(),
    stance: "neutral",
    hypothesis: "当前结构延续的历史证据是否集中，哪些案例构成反证？",
    events: [],
  };
}

export function evidenceSummary(result) {
  const labels = { up: "上涨", flat: "震荡", down: "下跌" };
  const ordered = Object.entries(result.frequencies).sort((left, right) => right[1].count - left[1].count);
  const topCount = ordered[0]?.[1].count || 0;
  const leaders = ordered.filter((item) => item[1].count === topCount).map((item) => labels[item[0]]);
  return {
    summary: result.episodeCount
      ? `${result.episodeCount} 个去重案例中，${leaders.join(" / ")}出现较多（各 ${topCount} 次）。这是历史描述，不是当前行情概率。`
      : "没有满足完整时间边界的可比案例，当前不能据此推演方向。",
    support: result.hypothesis.stance === "neutral"
      ? "本次未预设方向，案例排序只由量价特征决定。"
      : `与假设同向 ${result.hypothesis.supporting.length} 个，反向 ${result.hypothesis.counterexamples.length} 个；方向标签未参与检索。`,
  };
}
