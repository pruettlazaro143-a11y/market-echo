# Verification

## v0.4.0 / 2026-09-14

- `npm test`: 49/49 local tests pass. `npm run build` passes. Browser/Worker/server module syntax, HTML element IDs and Chinese/English translation keys were checked.
- New mocked-provider tests cover fixed-endpoint backward pagination, closed-bar filtering, short histories, malformed data, provider failures without fallback, and config rejection before network access. HTTP tests cover the market route's origin/method/config protections.
- Replay tests modify only held-out OHLCV and verify unchanged cutoff, retrieved cases, indicators and AI evidence. Worker tests verify no actual prices in its initial result, reveal behavior and clearing held data on a new run. A-share daily replay exposes the observed endpoint date without inventing a calendar date.
- Normalized overlays numerically match the engine's existing shape distance and effective weighted distance in full and structure-only modes.
- **Live read-only market call:** the new loader retrieved 5,000 BTCUSDT 1h closed bars in six pages from the fixed Binance endpoint at `2026-09-14T01:21:43.101Z`. Returned coverage: `2026-02-17T17:00Z` through exclusive close `2026-09-14T01:00Z`; one open candle excluded, zero interval gaps. This verifies that request in this environment, not all regions or continuous availability. No account/key or paid AI call was used.
- **Local HTTP → live provider → Worker integration:** ETHUSDT 1h returned 1,000 closed bars in two pages with HTTP 200 at `2026-09-14T01:28:07.276Z`. Replay used 976 preceding bars, returned six cases with `synthetic = false`, initially exposed no actual prices, and then revealed the held-out 24 bars. This exercised the data/Worker path without a browser.
- **Browser limitation:** Chromium installation failed with truncated downloads / HTTP 502. Browser rendering, mobile layout and click-through behavior were not verified by browser automation for v0.4. Module/Worker/HTTP checks do not substitute for that review.
- GitHub Actions and public hosting are separate from these local results. This change does not disable the test workflow or establish predictive accuracy/profitability.

Manual acceptance: direct-download BTC/ETH and save CSV; change to CSV for other markets; run replay, inspect the hidden state, reveal the blue trace and check that case order stays fixed; switch cases in the normalized shape panel; toggle MA/EMA; repeat with English and at mobile width. Failed downloads must display an error rather than synthetic results.

## v0.2.0 / 2026-09-13

Verified with Node.js v24.19.0:

- `npm test`: 34/34 pass.
- Numerical baseline-to-endpoint arithmetic; honest null actual future; structure-only crypto excludes volume and rebased targets; ETH full mode; A-share daily sessions and shorter actual daily close timestamps.
- Original cutoff isolation, time-axis helpers, CSV parsing and Worker message handling.
- DeepSeek, OpenAI and Anthropic adapter formats with **mock responses**, Chinese chunked UTF-8 decoding, consent requirement, evidence sanitization and exact preview matching, output guard rejection, provider error redaction, configured HTTPS endpoints.
- Local HTTP integration: config route, non-public file denial, cross-origin POST rejection and malformed JSON handling.
- `npm run build`: successful portable static build.
- JS syntax checks on browser/Worker/server modules.

Not verified:

- Mobile layout and AI/browser end-to-end remain unverified by automation. The owner manually verified baseline/endpoint presentation, case switching, other-crypto structure mode and English switching on 2026-09-13, and supplied a desktop screenshot. Automated localhost navigation was blocked by the remote browser environment.
- Live paid model calls: no user key was used. Model-specific access/JSON-mode support must be checked on first use.
- Predictive validity, strategy profitability, real data provenance or certified trading calendars.
- GitHub Actions run [34737962258](https://github.com/pruettlazaro143-a11y/market-echo/actions/runs/34737962258) did not start: GitHub reported an account lock due to a billing issue. Cloud tests/build are therefore unverified; the local results above remain separate. The workflow is retained for a rerun after the account restriction is resolved.

## Manual acceptance

1. Run `npm start`, open the localhost URL and inspect baseline price, UTC horizon, median mapping and selected endpoint dot/price/change.
2. Check that switching case changes original historical prices and rebased endpoint consistently.
3. Change to English; check controls, errors, disclosures, endpoint explanation and AI sections.
4. Select Crypto → Other; verify structure-only wording and no rebased target price. Select A-shares; verify daily-only interval.
5. Import the synthetic example; preserve its synthetic flag. Test malformed CSV recovery.
6. Enter your chosen provider/model/key, inspect the exact evidence summary, consent and run an AI call. Verify output stays separate from numeric facts. Provider changes must clear the key and consent.
7. Export normal retrieval JSON; verify projection.actualFuture is null and source/synthetic labels remain. For v0.4 replay, it becomes historical_replay only after revealing.
8. At 390px width, inspect readability and deliberate table overflow; verify no page-wide horizontal overflow.

## Fixed-insight update

36 local tests pass; static build and JS syntax checks pass. Added coverage for free-text/API task rejection before provider calls, exact computed payloads, case subset scope, zero returns, tied extremes and missing components. Live model behavior and the updated interactive layout have not been manually verified in this environment.

## v0.3 data-depth verification

42 local tests and the static build pass. New checks cover exact SMA/EMA arithmetic and warmup, cutoff isolation, multi-file overlap handling, malformed imports, raw Binance timestamp conversion, result-cap stability, filter-count reconciliation and extended daily-session gaps. A synthetic 100,000-bar hourly run with a 100-case cap completed in approximately 3.23 seconds on this workspace; this is not a user-device performance guarantee or financial evidence.

Browser automation could not be run: the required Chromium download timed out. Desktop/mobile overlay layout and interactions require manual acceptance. No new live provider data or paid AI calls were used.

Manual acceptance: import two overlapping files, confirm deduplication; try conflicting rows and expect a clear error; toggle each indicator without rerunning retrieval; verify MA 200 warmup and cutoff labels; switch English and other-crypto mode; compare 30 versus 100 cases on a sufficiently long file.
