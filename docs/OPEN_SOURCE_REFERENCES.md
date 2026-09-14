# References behind v0.4 / 参考项目与实现取舍

Reviewed 2026-09-14. These projects informed specific design choices. Market Echo does not bundle, depend on, or claim affiliation with them. The implementation here was written independently; no upstream source was copied or vendored and the repository's existing license is unchanged.

| Reference | Useful idea | Applied here | Deliberately outside this release |
|---|---|---|---|
| [CCXT](https://github.com/ccxt/ccxt), [Binance exchange documentation](https://docs.ccxt.com/docs/exchanges/binance) | A consistent OHLCV shape and explicit time/limit pagination make data acquisition reusable. | A small fixed-endpoint spot adapter normalizes and paginates BTC/ETH candles, excludes open bars and reports partial history/errors. | No CCXT dependency, exchange trading client, account credentials or arbitrary endpoint proxy. |
| [STUMPY](https://github.com/stumpy-dev/stumpy), [pattern-matching tutorial](https://stumpy.readthedocs.io/en/latest/Tutorial_Pattern_Matching.html) | Compare normalized shapes and avoid trivial overlapping matches. | A normalized overlay exposes the same 32-point log-price shape used by our existing matcher. Existing exclusion of overlapping context-plus-outcome episodes is retained. | No Matrix Profile algorithm, FFT speedup, DTW replacement or new claim of better accuracy. |
| [Backtesting.py](https://github.com/kernc/backtesting.py), [API documentation](https://kernc.github.io/backtesting.py/doc/backtesting/backtesting.html) | Historical simulation must reveal data gradually; indicators need sufficient prior history. | A single holdout replay computes retrieval and indicators from a prefix, then separately reveals the observed outcome without reranking. | No strategy executor, transaction costs, performance statistics, parameter optimization or fabricated OHLC from close-only records. |

The market adapter follows the [Binance REST klines specification](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints). Provider availability and data-use terms are separate from this code's license. The code repository includes generated examples, not a redistributed real-market dataset.

## 中文说明

- 参考 CCXT 的统一行情与分页思路，让用户能直接获得一段真实 BTC/ETH 现货历史；没有接入交易账户。
- 参考 STUMPY 的标准化对照与重叠排除思路，把“为什么相似”展示出来。原检索已经使用标准化与非重叠案例，本版没有换算法或虚报准确率提升。
- 参考 Backtesting.py 的逐步揭示数据原则，增加“先检索，再揭晓”的单窗口回放。它能帮助用户核对历史案例与这一次实际后续的差异，不能把一次对上解释成策略有效。

This release improves acquisition and inspectability. Predictive usefulness would require separately specified, multi-window out-of-sample evaluation; it has not been established by this release.
