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

The UI shows the same sanitized evidence object sent to the model: symbol, market/instrument, bar interval, horizon, cutoff, synthetic flag, comparison mode, baseline/unit, quantiles and up to five cases with distance components. No complete CSV, screenshot, account data or private Fieldnote information is sent.

The server recomputes any quantile price from baseline and percentage, ignoring client-supplied price values. It never accepts client-supplied system instructions. The model returns four string fields: `summary`, `similarities`, `differences`, `limitations`. Numbers stay in deterministic UI panels; digits in AI prose and a conservative set of transaction/prediction phrases are rejected. Text is rendered with `textContent`. This is a limited output check, not a semantic guarantee or legal-compliance certification.

## Key handling and runtime

- Browser password input only, no persistent key storage. Refresh/page exit clears the page session; changing provider clears the key. Language preference alone can use localStorage.
- Local Node server forwards to the chosen destination. Request bodies and raw provider errors are not logged or returned.
- Loopback bind and Host + Origin validation; JSON requests only; one in-flight request and five starts/minute; 24 KB request cap, 100 KB response cap, 45s request timeout.
- No automatic retry. Provider usage may still be billed on timeout/output rejection.
- Consent is reset for new retrieval results, changed provider/configuration, and language changes.
- Pure static hosting cannot serve `/api/explain`; retrieval continues and the UI explains the missing local AI service.

Public multi-user hosting requires a separately designed authentication, key-storage/secret-management, rate-limit and data-protection system. Do not expose this loopback demo server as a shared service.

## Explanation wording update / 解读文案调整

The prompt now prioritizes observations from the supplied case subset, component distances and a concrete case-comparison action. Caveats are concentrated in the final section. It explicitly distinguishes component distances from weights, preserves horizon units and prohibits invented chart shapes, years and market regimes. This is prompt guidance, not a semantic accuracy guarantee. Numeric prose remains blocked in this small update; the chart and table remain the source of numerical facts.

本次小调整把解读集中到具体观察、相似依据和案例对比步骤，边界说明放在最后。数值仍以图表为准；没有新增自动核验 AI 所有事实的能力，也没有用预写的成功回答替代模型输出。

## Case questions / 案例追问

An optional question (maximum 600 characters) is sent as untrusted user data alongside the same sanitized evidence. Editing it cancels the in-flight UI request, clears the prior answer and requires renewed consent; a provider may still bill an already-sent call. No conversation history is stored or forwarded. The preview includes the question. Do not enter credentials or personal sensitive information.

The prompt directs the model to explain historical evidence and redirect requests for current/future direction, asset picks or positions. This prompt and the existing output checks are limited safeguards, not guaranteed intent detection or legal clearance. The product does not purport to waive liability for its developer or any model provider.

追问仅围绕历史案例，前后问题不串成聊天历史。模型按提示词将交易方向请求转回历史证据；没有声称能阻止所有绕过。上线经营或提供具体方向服务前，应另行评估适用法律和供应商条款。
