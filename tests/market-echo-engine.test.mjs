import assert from "node:assert/strict";
import test from "node:test";
import {
  TIMEFRAMES,
  alignShape,
  analyze,
  demoInput,
  parseCSV,
  validateBars,
} from "../lib/market-echo/engine.mjs";

function retrievalSignature(result) {
  return result.cases.map((item) => ({ id: item.id, distance: item.distance, returnPct: item.returnPct }));
}

test("24-hour decision horizon is independent from the 1-hour chart timeframe", () => {
  const input = demoInput({
    timeframe: "1h",
    decisionHorizon: { value: 24, unit: "hour" },
  });
  const result = analyze(input);
  assert.equal(result.timeframe, "1h");
  assert.deepEqual(result.decisionHorizon, { value: 24, unit: "hour" });
  assert.ok(result.cases.length > 0);
  assert.ok(result.cases.every((item) => item.future.length === 24));
});

test("seven-day decision horizon observes 168 complete hourly bars", () => {
  const result = analyze(demoInput({
    timeframe: "1h",
    decisionHorizon: { value: 7, unit: "calendar_day" },
  }));
  assert.ok(result.cases.length > 0);
  assert.ok(result.cases.every((item) => item.future.length === 168));
});

test("five-day US-equity horizon counts future trading bars, not calendar days", () => {
  const result = analyze(demoInput({
    marketKey: "us_equity",
    symbol: "NVDA",
    timeframe: "1d",
    decisionHorizon: { value: 5, unit: "trading_day" },
  }));
  assert.ok(result.cases.length > 0);
  assert.ok(result.cases.every((item) => item.future.length === 5));
  assert.equal(result.forecastEnd, null);
  assert.equal(result.horizonSemantics, "future_complete_trading_days");
});

test("market identity and session policy cannot be mixed", () => {
  const input = demoInput();
  assert.throws(
    () => analyze({ ...input, marketKey: "btc_spot", sessionPolicy: "us_exchange" }),
    /市场身份与交易时段口径不一致/,
  );
});

test("future bars and future events cannot alter an earlier retrieval", () => {
  const input = demoInput();
  const cutoff = input.bars[3600].end;
  const earlier = {
    ...input,
    bars: input.bars.slice(0, 3601),
    asOf: new Date(cutoff).toISOString(),
  };
  const first = analyze(earlier);
  const second = analyze({
    ...earlier,
    events: [{
      type: "news",
      summary: "future event",
      publishedAt: input.asOf,
      availableAt: input.asOf,
      symbols: [input.symbol],
    }],
  });
  assert.deepEqual(retrievalSignature(first), retrievalSignature(second));
  assert.equal(second.events.length, 0);
});

test("hypothesis and stance never affect retrieval", () => {
  const input = demoInput();
  const first = analyze({ ...input, stance: "bullish", hypothesis: "向上" });
  const second = analyze({ ...input, stance: "bearish", hypothesis: "向下" });
  assert.deepEqual(retrievalSignature(first), retrievalSignature(second));
  assert.notDeepEqual(first.hypothesis, second.hypothesis);
});

test("candidate observation and outcome intervals stay strictly in the past", () => {
  const result = analyze(demoInput());
  const queryStart = result.query[0].t;
  for (const item of result.cases) assert.ok(Date.parse(item.outcomeEnd) < queryStart);
  for (let left = 0; left < result.cases.length; left += 1) {
    for (let right = left + 1; right < result.cases.length; right += 1) {
      const a = result.cases[left];
      const b = result.cases[right];
      assert.ok(Date.parse(a.start) > Date.parse(b.outcomeEnd) || Date.parse(b.start) > Date.parse(a.outcomeEnd));
    }
  }
});

test("missing volume removes the same distance channel from every candidate", () => {
  const input = demoInput();
  const bars = input.bars.map((bar, index) => index === 200 ? { ...bar, v: null } : bar);
  const result = analyze({ ...input, bars });
  assert.equal(result.structure.volumeAvailable, false);
  assert.ok(result.cases.every((item) => item.components.volume === null));
});

test("invalid bars and continuous-market gaps are rejected", () => {
  const input = demoInput();
  assert.throws(() => validateBars([input.bars[0], input.bars[0]]), /重复/);
  const bars = input.bars.filter((_, index) => index !== input.bars.length - 4);
  assert.throws(() => analyze({ ...input, bars }), /缺口/);
});

test("CSV import remains local-data compatible and volume is optional", () => {
  const bars = parseCSV("timestamp,open,high,low,close\n1700000000,100,102,99,101", TIMEFRAMES["1h"].ms);
  assert.equal(bars[0].t, 1700000000000);
  assert.equal(bars[0].v, null);
  assert.equal(bars[0].end - bars[0].t, TIMEFRAMES["1h"].ms);
});

test("screenshot shape alignment can only return candidates for human confirmation", () => {
  const input = demoInput();
  const result = analyze(input);
  const shape = result.query.map((bar) => Math.log(bar.c)).filter((_, index) => index % 3 === 0);
  const alignment = alignShape(input.bars, shape);
  assert.equal(alignment.status, "needs_confirmation");
  assert.ok(alignment.candidates.length <= 3);
});
