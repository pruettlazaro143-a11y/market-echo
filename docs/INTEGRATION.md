# Fieldnote integration notes

The screenshot supplied by the user belongs to Fieldnote's original private lab. This release implements the requested semantics in the standalone Market Echo app. It does not claim that the original production screen has been edited or deployed.

For a later integration:

1. Reuse `priceProjection(result)` alongside the lab's existing cutoff and decision timeline. Show baseline price, UTC cutoff, return-rebased median/P10/P90, selected-case point/change and the original case prices. Label these as historical mappings, never actual future ticks.
2. Keep the existing numerical retrieval cutoff guards. Do not fill the blank actual-future series with rebased historical points. For equity horizons, keep the future date unresolved until a certified calendar/data observation supports it.
3. Reuse `marketConfig` for category/asset selectors and server-check the same mapping. Other crypto must select `structure_only`; A-shares v0.2 accept daily bars only.
4. Use the bilingual string catalog as source wording. Preserve consent before AI calls, language selection and distinction between inference and numeric facts.
5. The standalone loopback AI server is not a replacement for Fieldnote's authenticated gateway/Vault. Route sanitized evidence through the existing gateway with explicit provider/model choice, accounting and credential isolation. Do not copy a browser key into production logs or localStorage.
6. Preserve Fieldnote's data-rights checks for reports/market feeds. Synthetic demos are eligible as labeled engineering demonstrations, not as real market evidence. This standalone package includes only generated data.
