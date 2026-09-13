import assert from "node:assert/strict";
import test from "node:test";

import { compactDuration, resolveTrackingWindow, timeX } from "../lib/market-echo/timeline.mjs";

function result(horizon, overrides = {}) {
  const asOf = "2026-09-06T12:00:00.000Z";
  return {
    asOf,
    forecastEnd: null,
    decisionHorizon: horizon,
    query: [
      { t: Date.parse("2026-09-06T10:00:00.000Z"), end: Date.parse("2026-09-06T11:00:00.000Z") },
      { t: Date.parse("2026-09-06T11:00:00.000Z"), end: Date.parse(asOf) },
    ],
    ...overrides,
  };
}

test("recognition completion is distinct from the observed market boundary", () => {
  const window = resolveTrackingWindow(
    result({ value: 24, unit: "hour" }),
    "2026-09-06T12:03:00.000Z",
    Date.parse("2026-09-06T13:03:00.000Z"),
  );
  assert.equal(window.observedAsOf, Date.parse("2026-09-06T12:00:00.000Z"));
  assert.equal(window.t0, Date.parse("2026-09-06T12:03:00.000Z"));
  assert.equal(window.tH, Date.parse("2026-09-07T12:03:00.000Z"));
  assert.equal(window.anchorPolicy, "recognition_completed");
});

test("24 hours and seven days preserve a one-to-seven visual distance", () => {
  const recognizedAt = "2026-09-06T12:03:00.000Z";
  const shortWindow = resolveTrackingWindow(result({ value: 24, unit: "hour" }), recognizedAt);
  const longWindow = resolveTrackingWindow(result({ value: 7, unit: "calendar_day" }), recognizedAt);
  const shortDistance = timeX(shortWindow.tH, shortWindow.domainStart, 4) - timeX(shortWindow.t0, shortWindow.domainStart, 4);
  const longDistance = timeX(longWindow.tH, longWindow.domainStart, 4) - timeX(longWindow.t0, longWindow.domainStart, 4);
  assert.ok(Math.abs(longDistance / shortDistance - 7) < 1e-12);
});

test("legacy runs do not invent a recognition timestamp", () => {
  const window = resolveTrackingWindow(result({ value: 7, unit: "calendar_day" }), null);
  assert.equal(window.recognizedAt, null);
  assert.equal(window.anchorPolicy, "observed_market_boundary");
  assert.equal(window.t0, Date.parse("2026-09-06T12:00:00.000Z"));
});

test("trading-day endpoint remains unresolved without a verified calendar", () => {
  const window = resolveTrackingWindow(
    result({ value: 5, unit: "trading_day" }),
    "2026-09-06T12:03:00.000Z",
  );
  assert.equal(window.tH, null);
  assert.equal(window.status, "endpoint_unresolved");
});

test("duration labels remain compact", () => {
  assert.equal(compactDuration(26 * 60 * 60 * 1000 + 30 * 60 * 1000), "1 天 2 小时");
  assert.equal(compactDuration(45 * 60 * 1000), "45 分");
});
