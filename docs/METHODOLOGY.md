# Methodology / 方法说明

## Retrieval, not inference

The latest 96 closed bars form the query. Candidates are 96-bar windows from the same supplied series. Log-close shapes are z-scored and resampled to 32 points. Structure uses four subwindows, with drift and high/low positioning normalized by ATR. Volatility compares log-return standard deviations. Volume is log-transformed, standardized and resampled to 16 points when available across the cohort.

Full-mode distance weights: shape 0.50, structure 0.25, volatility 0.15, volume 0.10. Other-crypto structure-only mode uses shape 2/3 and structure 1/3; volatility/volume do not participate and no rebased price is exposed. Missing volume removes the channel and renormalizes the remaining weights for every candidate. Candidate distance must be <= 0.85. Similarity display is `round(100 * exp(-distance))`. The threshold and weights are inherited heuristics, not learned or calibrated parameters.

Candidates are sorted by distance. A greedy selection retains at most the selected 30 / 60 / 100 non-overlapping context-plus-outcome intervals. This depends on ranking order and is not a proof of statistical independence.

## Temporal boundaries

All historical outcome intervals must finish before the start of the query. Feature calculation uses candidate context only. Appending future bars/events must not change an earlier cutoff retrieval (covered by tests). `asOf` is optional; the UI uses the current system clock for CSV, and a fixed cutoff for generated demo data. Unclosed bars are dropped.

Continuous horizons use elapsed hours/calendar days and the first complete bar reaching the requested time. US equity horizons count future complete sessions represented in the data; daily data uses future bar count. No certified calendar is shipped. Missing sessions, holidays, partial sessions, DST and halts require further review. Do not claim exchange-calendar precision.

The chart aligns bar indices. It normalizes price to each window's final close and scales the context/outcome panels separately. It does not use one uniform wall-clock x-axis. Actual case dates and outcome endpoint are displayed under the chart and included in JSON.

## Output

- Return: case outcome closing price / case anchor close − 1.
- Maximum upside/downside: post-anchor high/low excursion relative to anchor close, clipped to include zero. No entry, stop or fee model.
- 10th / median / 90th quantiles: descriptive empirical case outcome quantiles, not forecasts.
- Up/flat/down (JSON): uses a heuristic ATR-based neutral threshold; not a trading recommendation.
- Fewer than 10 cases is labeled insufficient. A zero-case result contains null quantiles.
- Events, if supplied through the underlying API, are context annotations and do not alter numerical retrieval. The standalone UI supplies no events.

## Input API

```js
const result = analyze({
  bars: [{ t: 1735689600000, end: 1735693200000,
           o: 100, h: 102, l: 99, c: 101, v: 250, complete: true }, /* ... */],
  timeframe: '1h', marketKey: 'btc_spot', sessionPolicy: 'continuous_24_7',
  decisionHorizon: { value: 24, unit: 'hour' },
  symbol: 'MY_SERIES', source: 'user_import', synthetic: false,
  asOf: '2025-09-01T00:00:00Z'
});
```

Market/session mapping: `btc_spot`, `btc_perpetual`, `eth` and `crypto_other` → `continuous_24_7`; `gold_reference` and `metal` → `provider_session`; `us_equity` → `us_exchange`; `cn_equity` → `cn_exchange` (daily bars only). The engine retains an inherited `gold_perpetual` contract but the standalone UI does not expose it.

## Known limitations

No asset identity verification, news/earnings control, exchange calendar, corporate action adjustment, futures roll adjustment, data rights verification, walk-forward predictive validation, uncertainty calibration or economic edge measurement. Complexity grows with historical windows and requested outcome length; the UI limits file size and runs in a Worker. Threshold sensitivity and survivorship/data-selection bias remain research work.

## v0.2 price presentation

`priceProjection` uses the final query close as the baseline and multiplies it by one plus each historical return. It exposes original historical prices separately, and actualFuture stays null. Equity future timestamps are not fabricated. P10/P90 price mappings are descriptive, not calibrated intervals. Optional AI prose does not calculate or replace these numeric fields.
