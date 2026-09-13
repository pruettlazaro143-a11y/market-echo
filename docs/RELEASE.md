# First GitHub release / 首次发布

Suggested repository name: `market-echo`.
Description: `Local-first historical price-pattern retrieval. Import OHLCV CSV, inspect rebased historical endpoints and optional BYOK AI explanations.`
Topics: `market-data`, `time-series`, `pattern-matching`, `data-visualization`, `research`, `javascript`, `local-first`.

1. Review LICENSE and attribution. The MIT file is a proposed permissive license for this user-owned extraction; confirm rights to the inherited source before publishing. Do not add restrictive trading/noncommercial terms to MIT.
2. Run `npm test`, `npm run build`, and manually import a synthetic CSV. Review the generated preview and README.
3. Create a new **public** repository under your own GitHub account, leaving README/license creation unchecked because this folder contains them. No old private repository or history needs to become public.
4. Initialize and commit this folder locally, then use GitHub's exact remote commands. Do not paste the Fieldnote private repository over this tree.
5. Add repository description/topics, tag `v0.2.0`, and publish release notes stating synthetic demo and limitations. Pin the repository on your profile.
6. Optionally host `dist/` on a static host. Do not claim a live demo URL before deployment succeeds. The repo CI tests/builds only; it does not publish a website or send promotional messages.

Before staging, verify no `.env`, user CSV, production database, private logs, payment configuration or old `.git` history was added. Keep a dependency lockfile if dependencies are introduced later. Current runtime has zero third-party dependencies.

Do not add a fabricated star badge count, performance claim or example return presented as real. Show the actual UI and invite reproducible feedback.
