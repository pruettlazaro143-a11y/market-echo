# BYOK AI / 自带密钥解读

## Providers

- DeepSeek: `https://api.deepseek.com/chat/completions`, Bearer authentication, JSON Chat Completions.
- OpenAI: `https://api.openai.com/v1/chat/completions`, Bearer authentication, `max_completion_tokens` and JSON mode.
- Anthropic: `https://api.anthropic.com/v1/messages`, `x-api-key`, version header `2023-06-01`, system + Messages format.
- Other compatible APIs: Chat Completions with JSON mode; configured by the local operator only.

Enter the exact model ID supported by your account. The UI's DeepSeek placeholder is an example, not a guarantee of continued model availability. No latest-model or price claims are hardcoded. Not every model/provider accepts JSON mode or the same token parameters; an incompatibility is reported without provider switching.

Official references used for adapter design: [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/), [Anthropic Messages](https://docs.anthropic.com/en/api/messages). OpenAI reference was fetched; DeepSeek reference retrieval timed out and Anthropic content retrieval exceeded the fetch limit during this task. No live paid request was made. Adapters were exercised with mocked provider responses; verify your specific model on first use.

## Other compatible endpoints

Set an HTTPS base URL under your control before starting. It should end at the API version path, **not** `/chat/completions`; the server appends that suffix.

macOS/Linux:

```sh
AI_COMPAT_BASE_URL=https://your-provider.example/v1 npm start
```

PowerShell:

```powershell
$env:AI_COMPAT_BASE_URL = 'https://your-provider.example/v1'
npm start
```

`your-provider.example` is a placeholder, not an actual provider. Use your provider's documented URL. The browser cannot supply arbitrary endpoint URLs. The full resolved destination is shown before the user sends a key. HTTPS, no credentials in URL, no redirects, no automatic fallback. The local operator must trust the configured destination; this is not a hardened public proxy or DNS-rebinding-proof network sandbox.

## Request / response contract

The preview shows the exact fixed topic and computed facts sent to the model, as described below. No complete CSV, screenshot, account data, free-text labels or private Fieldnote information is sent.

The server recomputes any quantile price from baseline and percentage, ignoring client-supplied price values. It never accepts client-supplied system instructions. The model returns one short `answer` string. Numbers stay in deterministic UI panels; digits in AI prose and a conservative set of transaction/prediction phrases are rejected. Text is rendered with `textContent`. This is a limited output check, not a semantic guarantee or legal-compliance certification.

## Key handling and runtime

- Browser password input only, no persistent key storage. Refresh/page exit clears the page session; changing provider clears the key. Language preference alone can use localStorage.
- Local Node server forwards to the chosen destination. Request bodies and raw provider errors are not logged or returned.
- Loopback bind and Host + Origin validation; JSON requests only; one in-flight request and five starts/minute; 24 KB request cap, 100 KB response cap, 45s request timeout.
- No automatic retry. Provider usage may still be billed on timeout/output rejection.
- Consent is reset for new retrieval results, changed provider/configuration, and language changes.
- Pure static hosting cannot serve `/api/explain`; retrieval continues and the UI explains the missing local AI service.

Public multi-user hosting requires a separately designed authentication, key-storage/secret-management, rate-limit and data-protection system. Do not expose this loopback demo server as a shared service.

## Fixed insights / 固定解读

Free-text questions have been removed from both the UI and API. The server rejects question/messages/prompt fields and unknown tasks before contacting any provider. Three tasks are supported: match, divergence, compare. The program computes facts from the first up to five cases in similarity order: outcome sign counts, highest/lowest outcome rows, the return spread in percentage points, and within-component distance ranges. These statistics do not describe all retrieved cases. Ties and zero returns are handled explicitly.

The browser displays those facts and clickable extreme-case rows without requiring AI. The server recomputes the same payload from validated evidence. It forwards only the task and computed facts; user-supplied symbol labels, IDs, dates and arbitrary text are not sent to the model. The consent preview matches that payload. AI adds at most three short sentences, with one fixed boundary note underneath. No free conversation history or natural-language task override is supported.

This is not a comprehensive defense against all model errors or a validated prediction system. Automated checks use mock model responses; paid live behavior and desktop/mobile layout require manual acceptance.

## Screenshot recognition (v0.5)

The separate screenshot entry uses its own image-specific consent and transient key fields. It forwards one inline PNG/JPEG/WebP image to the chosen image-capable model using fixed extraction instructions. It accepts no user prompts or conversation history. See [SCREENSHOTS.md](SCREENSHOTS.md). The model may misread the chart; manual confirmation is required before retrieval. No live paid vision call is implied by mocked adapter tests.
