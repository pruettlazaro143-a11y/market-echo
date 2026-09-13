# Verification — v0.2.0 / 2026-09-13

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
7. Export JSON; verify projection.actualFuture is null and source/synthetic labels remain.
8. At 390px width, inspect readability and deliberate table overflow; verify no page-wide horizontal overflow.

## Fixed-insight update

36 local tests pass; static build and JS syntax checks pass. Added coverage for free-text/API task rejection before provider calls, exact computed payloads, case subset scope, zero returns, tied extremes and missing components. Live model behavior and the updated interactive layout have not been manually verified in this environment.

## v0.3 data-depth verification

42 local tests and the static build pass. New checks cover exact SMA/EMA arithmetic and warmup, cutoff isolation, multi-file overlap handling, malformed imports, raw Binance timestamp conversion, result-cap stability, filter-count reconciliation and extended daily-session gaps. A synthetic 100,000-bar hourly run with a 100-case cap completed in approximately 3.23 seconds on this workspace; this is not a user-device performance guarantee or financial evidence.

Browser automation could not be run: the required Chromium download timed out. Desktop/mobile overlay layout and interactions require manual acceptance. No new live provider data or paid AI calls were used.

Manual acceptance: import two overlapping files, confirm deduplication; try conflicting rows and expect a clear error; toggle each indicator without rerunning retrieval; verify MA 200 warmup and cutoff labels; switch English and other-crypto mode; compare 30 versus 100 cases on a sufficiently long file.
