# Contributing

Use Node.js 22+. Run `npm test` and `npm run build` before opening a PR. No dependencies need installation.

Prefer small, reproducible changes. For bugs, include browser/Node versions, selected market/timeframe/horizon, expected vs observed output, and a minimal **synthetic** CSV. Do not attach credentials or licensed/private market datasets.

Useful starter tasks: translate UI strings; add CSV edge-case fixtures; improve keyboard/chart accessibility; investigate certified session-calendar integration behind an explicit adapter. Discuss algorithm weights, thresholds and output semantics before changing them. Do not optimize for favorable historical outcomes.

Tests should preserve cutoff isolation, non-overlapping episodes, missing-volume consistency and honest empty states. A passing test suite is not evidence of predictive accuracy.
