# Market Echo

**Historical patterns, understandable endpoints, optional AI explanations.**

Find similar historical price windows, inspect how they ended, and see what the same percentage moves would mean at your observation price. Extracted from Wayne's Fieldnote. This is historical research, **not a price forecast or trading signal**.

[中文](README.zh-CN.md) · [Methodology](docs/METHODOLOGY.md) · [AI setup](docs/AI.md) · [Verification](docs/VERIFICATION.md)

![Historical case output from synthetic data, not a UI screenshot](docs/preview.svg)

*Synthetic numerical preview; not real-market performance.*

[Three-minute walkthrough & FAQ](docs/QUICKSTART.md) · [Report an issue](https://github.com/pruettlazaro143-a11y/market-echo/issues/new/choose)

## v0.5: screenshot upload and confirmation

- Upload a PNG/JPEG/WebP chart, preview it locally, then explicitly consent to optional BYOK image recognition. DeepSeek, OpenAI, Claude and configured compatible endpoints are supported through their image message formats; your chosen model must accept images.
- Review instrument, exchange, spot/perpetual type, interval, visible candle count and the last closed-bar end in UTC. Unreadable fields remain blank. The approximate 32-point trace can be corrected visually or entered manually without AI.
- **Full handoff:** confirmed Binance BTCUSDT/ETHUSDT spot, 96 visible bars and an exact cutoff fetch corresponding historical OHLCV. Prices and MA/EMA come from those records, never screenshot pixels.
- **Shape comparison:** other screenshots can be compared with the CSV/download/demo reference library selected below. Results are separate, show historical case returns only, and contain no screenshot price targets or indicators. Unknown screenshot time and synthetic reference data are visibly labeled.

[Screenshot walkthrough, provider setup and limits](docs/SCREENSHOTS.md)

## v0.4: real history, revealable replay, explainable matches

- Load **1,000 / 5,000 / 10,000 closed BTC/ETH spot bars** from the public Binance API, then save the snapshot as CSV. No market-data key required; regional/provider availability applies.
- Enable **historical replay** to hold out the latest complete outcome. Retrieve using only the earlier prefix, then reveal the observed path in blue without changing the cases.
- Expand **Why this case matches** for the actual normalized shapes used by the engine, the largest sampled deviation and effective distance weights.
- Keep the existing deeper multi-file imports and optional MA/EMA overlays below.

[Open-source references and implementation choices](docs/OPEN_SOURCE_REFERENCES.md) · [Replay method](docs/REPLAY.md)

### Data depth and indicators

- Merge up to 24 historical files for one instrument: 30 MB / 100,000 bars, with conflicting overlaps rejected.
- Import unzipped Binance raw klines, including microsecond timestamps, or standard OHLCV CSV.
- Select up to 30 / 60 / 100 non-overlapping cases; inspect coverage, freshness and exclusion reasons.
- Toggle MA 20/60/200 and EMA 20/60, calculated from pre-cutoff closed history. No indicator extends into the rebased future.

[Data sources, formats and indicator definitions](docs/DATA.md). BTC/ETH spot has an on-demand history connection. Equities, metals, other crypto and derivatives remain CSV-based; no streaming feed or complete multi-market database is bundled.

## Start

```sh
git clone https://github.com/pruettlazaro143-a11y/market-echo.git
cd market-echo
```

Node.js 22+ is required. In the project directory, run:

```sh
npm start
```

Open **http://127.0.0.1:4173**. No `npm install`, database or account needed. The language selector switches the interface, help text and AI output language between Chinese and English. Initial data is **synthetic**.

```sh
npm test
npm run example
npm run build
```

`dist/` supports static hosting and local CSV/demo retrieval, replay and overlays. AI explanation/image recognition and direct history downloads require the local Node server. Manual screenshot tracing against local CSV/demo history also works statically. Do not double-click the HTML file; modules and Workers require HTTP. The server is loopback-only; it is **not a multi-user AI proxy**.

## Understand the numbers

1. **Baseline:** the last closed price in the observation window, with a UTC timestamp. It is not a live quote.
2. **Horizon:** e.g. 24 hours after that cutoff. Equity dates remain unassigned without a verified calendar.
3. **Rebased historical endpoint:** baseline × (1 + historical case return).

If the baseline is 100 and a historical case changed +2%, its rebased endpoint is 102. This answers “what would an equivalent move amount to?”, not “where will the market go?”. Each chart shows an endpoint dot, price/change callout, baseline marker and horizon. Tables show historical original prices separately from rebased prices.

Median and P10–P90 are descriptive summaries, **not forecast targets or confidence intervals**. Normal retrieval leaves actual future prices unfilled. Historical replay can reveal an already-recorded held-out outcome; a single replay is not an accuracy estimate or a strategy backtest. No paper/live trades are placed.

## Markets

| Category | Detail | Scope |
|---|---|---|
| Crypto | BTC, ETH | Shape, structure, volatility and available volume |
| Crypto | Other assets | Shape/structure only; historical percentages, no rebased price targets |
| US equities | User-provided ticker | Imported series; observed-session counting |
| China A-shares | User-provided ticker | **Daily bars only**; no holiday-calendar claim |
| Gold & metals | Gold, silver, other metals | User CSV; spot/reference/futures metadata |

Choose the direct-history source for BTC/ETH spot, or import your own consistent CSV. Selecting a market alone does not download data. Downloaded bars identify their provider and retrieval time; this is not independent cross-provider verification. Specify the quote unit (e.g. USDT, USD, CNY, USD/oz). Instrument type is retained separately, not used to mix spot/futures histories. No news, earnings, macro, liquidity or token-mechanism analysis is included in numerical matching.

## CSV

Required: `timestamp,open,high,low,close`. Optional: `volume,end` (or short column names `t,o,h,l,c,v`). Plain comma-separated, no quoted fields. Maximum 30 MB / 100,000 bars.

- Timestamp = bar open; use Unix seconds/milliseconds or ISO with timezone, e.g. `2025-01-01T00:00:00Z`.
- Missing `end` is inferred from the selected interval. Daily session markets may supply an actual close timestamp with a shorter session duration.
- Supported intervals: 5m, 15m, 1h, 4h, 1d. A-shares currently require 1d.
- Latest 96 closed bars form the query. More prior history is required for completed outcomes; zero matches is valid.
- Duplicate timestamps, invalid OHLC, missing required fields and continuous-market gaps are checked. No automatic split/roll/holiday adjustment.
- `examples/synthetic-btc-1h.csv`: 5,200 generated bars, **crypto/BTC, spot, 1h**. Mark synthetic; filename prefix `synthetic-` also preselects this checkbox.

## Optional BYOK AI

Run retrieval, select DeepSeek / OpenAI / Anthropic, enter your provider's exact model ID and API key, inspect the evidence preview and consent before each new result/provider. **API fees are paid to your provider.** Other OpenAI-compatible endpoints can be configured by the local server operator; see [AI.md](docs/AI.md).

Choose one of three fixed insights: matching dimensions, outcome differences, or cases to compare. Computed facts and case links work without AI; AI adds a short explanation. Free-text questions are not accepted. Numeric calculations stay in the deterministic engine. Numeric/transactional prose is rejected by a conservative output check; this check is not a complete semantic safety guarantee. No raw HTML is rendered.

CSV stays in browser memory for retrieval. Evidence-explanation AI sends a small, inspectable summary through the local server to exactly the chosen provider. The separate screenshot-recognition action sends the previewed image only after image-specific consent. The full CSV is not sent. Keys remain in transient page/server memory, are not written to this project's disk/logs/browser storage, and are cleared on provider changes or by the clear-key button. Provider data policies still apply. No automatic retry, credential fallback or provider switching.

## Status and contribution

Version **0.5.0**. Existing engine plus standalone bilingual UI, endpoint arithmetic, market taxonomy and local AI gateway. No private Fieldnote database, payment integration, production keys or old Git history is included. Built-in CSV is synthetic.

See [verification](docs/VERIFICATION.md) for exactly what was tested. Live provider calls, real-browser visuals and public deployment must not be inferred from passing unit tests. The provided CI runs tests/build; it does not publish.

[Contributing](CONTRIBUTING.md) · [MIT license](LICENSE) · [Release steps](docs/RELEASE.md) · [Launch copy](docs/LAUNCH.md)
