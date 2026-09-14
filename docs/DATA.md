# Data depth and indicators / 数据深度与指标

## Import capabilities

Import up to 24 CSV files for **one instrument, market, bar interval and adjustment basis**, totaling 30 MB and 100,000 unique bars. Files are sorted by time. Identical overlaps between files are removed; conflicting values at a timestamp abort the import. Duplicate timestamps within a single file remain invalid. No symbol identity can be inferred from a CSV that contains only numbers and timestamps.

Choose a result cap of 30, 60 or 100. This is a maximum, not a promised sample size. Fixed distance thresholds, complete historical outcomes and non-overlapping episodes are retained. Increasing the cap does not manufacture more evidence. Long histories are examined in a Worker; candidate outcome traces are materialized only after selection. The 96-bar observation window is unchanged.

The data panel shows the included date range, file and bar counts, identical overlaps, excluded open/after-cutoff bars, candidate filtering counts, returned cases and content fingerprint. CSV provider and adjustment labels are **user declarations**, not independent source verification. Direct downloads record their fixed provider endpoint and retrieval time; no independent cross-provider verification is performed. Similarity is a distance mapping, not a confidence score or future win probability.

BTC/ETH spot now supports on-demand historical API snapshots. There is no streaming feed or built-in real cross-market database. Synthetic demos have not been enlarged or relabeled as real history. Source access, cost and redistribution rights must be checked separately. No provider API key or user market data is bundled in this repository.

## Direct BTC / ETH history (v0.4)

Run `npm start`, choose **Load BTC / ETH spot history**, select BTC or ETH and an interval, then request 1,000 / 5,000 / 10,000 bars. Retrieval downloads recent pages from the fixed [Binance public spot klines endpoint](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints) at `https://data-api.binance.vision/api/v3/klines`. It does not use an account or key, connect futures, place orders or switch providers. Local settings limit the instrument to BTCUSDT/ETHUSDT spot.

Pages move backward by open timestamp with a 1,000-bar page limit. Inclusive API close times become exclusive bar ends. Open bars are excluded; duplicate conflicts and invalid OHLC abort. Coverage, fetch time, requested/received count and short history are shown. Missing bars are not invented. There is one local download at a time, at most four attempts per minute and a 45-second request deadline. Network, region or rate-limit failures are surfaced without substituting synthetic data. Cancel stops the request; retry is manual.

**Save downloaded CSV** preserves closed bars for later local import. CSV contains OHLCV and timestamps, not the provider metadata; retain the JSON report for the source endpoint, retrieval time and matching context. Downloads stay in transient server/browser memory until explicitly exported. A static-only site cannot use this route. Other markets still require consistent CSV exports.

中文：在数据来源选择“直接获取 BTC / ETH 现货历史”，再选币种、周期和根数，点击检索。取数后可下载 CSV；切换来源或设置会清除页面内的下载缓存，需保存时先下载。这里获取的是已收盘历史快照，不是实时价格推送。5,000 根小时线约覆盖 208 天，5,000 根 5 分钟线约覆盖 17 天；若要更长历史，可继续用月度归档和多文件导入。

## Source routes

| Market | Route | Current limitations |
|---|---|---|
| BTC / ETH / other crypto | Download spot or the correct futures **klines** archives from [Binance Public Data](https://github.com/binance/binance-public-data); unzip, select Binance raw klines format, then import monthly/daily CSVs together. | Choose the actual instrument and interval. Do not mix spot and perpetuals. This is local archive import, not an automatic connection. Millisecond and microsecond timestamps are normalized; inclusive archive close times become exclusive bar ends. |
| US equities | Export consistent OHLCV from your existing provider. [Alpha Vantage daily documentation](https://www.alphavantage.co/documentation/#daily) describes historical OHLCV and CSV output. | Full history may require a paid entitlement. Provider CSV is not automatically compatible: date-only labels must be normalized to explicit timezone-aware bar open and close timestamps. Splits/dividends must be handled consistently across all OHLC fields, not adjusted close alone. |
| China A-shares | Export from your terminal or an authorized source such as [Tushare daily](https://tushare.pro/document/2?doc_id=27), then normalize to standard CSV. | Daily bars only; unify adjustment basis. Missing trading days and suspensions are not resolved with a certified calendar. Daily session gaps up to 21 calendar days are tolerated as a heuristic, including extended holidays; this does not certify completeness. |
| Gold / silver / other metals | Export actual OHLC from your licensed terminal/provider, specifying spot/reference/futures and quote units. | Do not convert a close-only/reference price series into invented OHLC, or label a gold ETF as spot gold. Futures rolls require an explicit consistent method. No built-in metals feed is connected. |

Standard CSV requires `timestamp,open,high,low,close`; optional `volume,end`. Use Unix seconds/milliseconds or ISO timestamps with timezone, such as `2026-09-01T09:30:00+08:00`. Timestamp is bar open; `end` is the exclusive completion time. Supply actual bar ends when session length differs from the selected interval. No automatic timezone, holiday or roll inference is offered for arbitrary provider files.

A selected UTC cutoff excludes later/unclosed bars before matching and calculating indicators. A blank cutoff uses available closed history, not the current live price. Synthetic demo cutoffs are fixed and ignore this optional input. The freshness display measures elapsed hours; it does not decide whether an exchange ought to have published another bar.

## MA / EMA

Checkboxes toggle MA 20, MA 60, MA 200, EMA 20 and EMA 60; initially all are off. Only the current observation's price history is overlaid, never the hypothetical future or historical rebased paths. Latest numerical values are labeled with the observation cutoff and quote unit. Changing overlays does not call AI or change retrieval.

- MA is the simple arithmetic mean of the previous **N bars including the current closed bar**.
- EMA uses alpha = 2 / (N + 1), seeded with the mean of the first N available closed bars. Other platforms may use a different seed/history depth.
- Warmup uses all included pre-cutoff history before slicing the last 96 plotted bars. Insufficient history yields blank values, not zero.
- Periods follow the selected bars: MA 20 on 1h is twenty hourly bars; MA 20 on daily bars uses twenty daily observations. Daily equities count observed records, not a verified trading calendar.
- Values use the supplied price adjustment basis. Missing records, corporate actions and contract rolls can affect them. These are descriptive overlays, not an extra confidence score or signal.

## 中文操作

1. 获取同一标的更长的真实历史，统一市场、周期与复权口径。不要把不同股票或现货/永续混在一起。
2. 选择“我的行情 CSV”，按格式选择“标准 OHLCV”或“Binance 原始 Klines”，一次选多份文件。Binance ZIP 先解压；其他来源按上面的标准表头与时间格式转换。
3. 填写供应商和复权口径；它们只作为用户声明记录。按需要选择 30 / 60 / 100 个案例及研究截止时间。
4. 检索后看“数据与证据检查”：覆盖多少历史、哪些记录/候选被排除、是否触及展示上限。案例不足就补历史或调整研究期限，不提高相似度分数来假装可信。
5. 图旁勾选 MA / EMA。显示的是数据截止时的指标；只有导入截至当日已收盘的数据，才有对应当日的指标。小时线 MA 与日线 MA 含义不同。

本版扩展了历史输入与检查能力，没有替用户建立或采购完整的多市场历史库。原始数据若只有很短一段，增加展示上限也无法产生更多真实案例。
