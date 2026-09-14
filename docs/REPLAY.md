# Historical replay / 历史回放

## Use it

1. Choose demo, CSV or downloaded BTC/ETH history, then the bar interval and research horizon.
2. Check **Historical replay**, run retrieval and inspect the matched cases before seeing the outcome.
3. Toggle MA/EMA if useful. They use the earlier history ending at the replay cutoff.
4. Click **Reveal observed outcome**. The blue dashed path and its observed endpoint now appear alongside the same historical cases. Export JSON to retain the result.

中文：先选择数据和期限，勾选“历史回放”，检索后先看案例，再揭晓后续。绿色仍是历史案例换算，蓝色才是本次留出区间的记录。合成数据的蓝线同样是合成记录，不能当成真实市场检验。

## Calculation contract

- The replay considers closed bars up to the input cutoff. It selects the latest anchor with a complete outcome for the chosen horizon and a valid intervening interval. Selection uses timestamps and interval completeness, not return direction or similarity scores. It is not an arbitrary date picker; narrow the input cutoff to study an earlier period.
- For equities, the horizon counts observed daily/session records using the same existing session policy. It does not certify an exchange holiday calendar. Gaps can make the latest interval unavailable; `sourceEnd` and `outcomeEnd` record the distinction.
- The last 96 bars of the prefix form the observation window. Retrieval, case selection, distributions, fingerprints and indicators receive only that prefix. Historical candidate outcomes must already be complete before the query window, as in normal retrieval.
- The Worker keeps the held-out prices separate. Its initial result has `replay.state = "hidden"` and `replay.actual = null`; JSON projection has `actualFuture = null`. The fixed AI evidence summary never includes the holdout prices, before or after revealing.
- Revealing transfers the held-out trace without rerunning retrieval or changing case order. It reports **actual return minus historical median**, in percentage points, and whether the endpoint is inside the selected cases' P10–P90. The latter is descriptive, not a confidence or coverage guarantee. With no cases, comparison statistics stay blank.
- Normal retrieval still has no observed future. After replay reveal, `projection.actualFuture.kind` is `historical_replay`, with an explicit synthetic flag. Changing research settings clears the replay.

## Why this case matches

Expand the normalized shape panel and select different case rows. Both lines use the matcher's existing transform: log close, population z-score, then 32 sampled points. This chart compares the historical observation windows only; it excludes their later outcomes. The reported quarter contains the largest pointwise shape difference among those samples. It does not explain news, events, or causation.

The component readout shows effective weight × distance = contribution. Missing volume is excluded consistently and the remaining weights renormalize. Other-crypto mode retains only shape and structure. Lower distance means closer according to these features; the mapped similarity score is not a probability. The main price chart instead aligns at each window's closing price, so it serves a different comparison from the standardized shape panel.

## Limits

This is one historical holdout comparison, not a full strategy backtest, forecast accuracy estimate or profitability evidence. The user already possesses the input file, so hiding the outcome in the UI is a research interaction, not a tamper-proof blind experiment. Repeatedly choosing attractive examples does not establish predictive value. No trades or return claims are generated.
