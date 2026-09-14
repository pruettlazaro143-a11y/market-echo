# Screenshot entry / 截图入口

## 点击按钮没有反应？（v0.5.1 修复）

旧版将截图校验提示放在识别区上方，计算/下载错误又放在下方主表单，用户在按钮处看不到。新版把校验、进度和错误同步显示在刚点击的按钮旁，错误会滚动到可见位置。

- 黄金 XAUUSD 的完整行情按钮会直接说明“该标的尚未接通直接行情接口”。可以导入对应 CSV 做数值检索，或使用截图形态比较；不会替换成 BTC。
- 时间按 UTC 解读，不能填写当前本地时钟。无法确认最后收盘时刻时，明确点击“清空时间做形态比较”并重新勾选人工核对，结果会标记时间未确认。
- 形态参考库的来源、标的和周期显示在按钮旁。截图为 4h、库为 1h 时会提示如何处理；CSV 不会自动重标周期。点击“设置同市场、同周期的合成演示库”可以试跑流程，需重新确认使用该合成库。
- 尚未选 CSV、下载失败、Worker 错误也在按钮旁显示。完整检索成功后会滚动到结果。

Both action buttons now carry visible inline feedback. Gold/full-history limitations, UTC errors, reference interval mismatches, missing CSV and asynchronous failures are surfaced in place. Matching synthetic-demo configuration is an explicit action requiring renewed reference consent; it is not real market history.

## 中文操作

1. 用 `npm start` 启动新版，在页面顶部选择截图。支持 PNG/JPEG/WebP，文件最大 5 MB，每边最多 4096 像素。先裁剪到一张主价格图，保留标的、周期、交易所和时间轴，遮住账户与订单信息。
2. 图片先作**本地预览**，不会因选择文件自动上传。若使用 AI，选择支持图片的供应商和模型、填写自己的密钥，核对发送目标，再勾选图片授权并点击识别。图片调用由你的供应商计费。
3. 核对识别出的市场、完整代码、交易所、品种类型、周期、可见 K 线根数和最后已收盘时刻。空白表示没看清。截止时间填 **UTC 的收盘结束时间**，不要把开盘标签、当前未收盘 K 线或设备时钟误当成它。看不到日期或时区时不要猜。
4. 对照截图检查近似曲线。拖动点，或选择采样点并用高度滑块修改。向上代表较高的价格；描的是主价格走势，不包含成交量、均线、手绘预测和图表外的文字。32 个点是近似形态，不是 32 根精确 K 线。
5. 勾选人工核对后选一条路径：
   - **完整行情衔接**：目前须是 Binance BTCUSDT/ETHUSDT 现货、96 根观察窗和明确截止时间。系统在该时刻之前分页获取真实行情，确认存在恰好在该时刻结束的记录，然后运行原完整检索。价格换算与 MA/EMA 只来自真实 OHLCV。
   - **仅比较形态**：在下方数据设置中选择参考库（CSV、BTC/ETH 下载或合成演示），将周期设为与截图一致，再确认使用该库。可以跨来源比较，但界面会分别列出截图与参考库身份，不能把它理解为同一资产的完整历史检验。
6. 形态结果独立展示：截图与历史案例的标准化曲线、案例观察和后续截止时间、形态相似度及案例本身的历史涨跌幅。**没有截图基准价、换算目标价、截图 MA/EMA 或图片生成的 OHLCV。** 可以导出不含图片的 JSON 报告。

如果你用的是 **OKX 永续**，本版不会自动替换为 Binance 现货；可以使用自己导出的对应合约历史作形态参考库。没有历史库时，截图本身不能产生真实历史案例。合成库始终标注为演示；未确认截图时间时，案例不保证早于截图，不能宣传为该时刻的历史检验。

### 不想提供密钥

选择图片后点“**不用 AI，手动填写与描形**”。手动填写周期和可见根数，校准曲线并确认。整个过程不发送图片；配合 CSV/演示可在静态页面使用。直接下载行情仍需本机服务。

### 图片模型设置

- DeepSeek：填写 `deepseek-flash`，不要用产品展示名代替模型 ID。[官方图片接口说明](https://api-docs.deepseek.com/guides/vision/)介绍了这种模型的图片输入。
- OpenAI：填写账户可用、支持图片的模型 ID。使用 [Chat Completions 图片输入格式](https://developers.openai.com/api/docs/guides/images-vision)。
- Claude：填写支持图片的模型 ID。使用 [Messages base64 图片格式](https://platform.claude.com/docs/en/build-with-claude/vision)。
- 其他兼容 API：按 [AI 配置](AI.md)由本机操作者设置服务端地址，且模型须同时支持图片与 JSON 输出。不会因失败自动切换供应商或偷偷重试。

## English walkthrough

Choose one chart image, preview it locally, then either consent to BYOK recognition or enter fields/trace manually. Review exchange, instrument, interval, visible bar count and the last closed-bar **end in UTC**. Blank fields are unknown; do not infer a timezone or date from the device clock. The 32-point trace can be corrected with dragging or the sample-number/height controls.

Full handoff requires confirmed Binance BTCUSDT/ETHUSDT spot, exactly 96 visible bars and a known cutoff. It loads a matching closed-bar snapshot and uses the original numerical engine. The selected download depth still limits available historical cases; the screenshot is not used to fabricate prices or volume. A different exchange or perpetual contract is never silently replaced by spot.

Shape mode uses the history source chosen in the main data settings. Set its interval to match the image and explicitly confirm the reference library. Shape results are separate and include historical case returns, not price targets or image-derived indicators. A missing image cutoff is labeled; these cases are not guaranteed to precede the screenshot. Synthetic libraries remain demonstrations. No free-form AI chat or trading directions are added.

## Method and data handling

- Recognition returns a bounded schema of categorical fields, a ticker, explicit timestamp or null, a visible-count estimate and 32 relative heights or null. Free-form model prose, prices, volume and extra fields are not displayed. Text within screenshots is treated as data, not instructions. The output may still be visually wrong; schema validation is not recognition accuracy.
- The browser decodes the selected image, checks size/dimensions, and re-encodes the preview to PNG or JPEG before sending. This excludes the original file metadata/name from the payload. The server accepts inline image data only, checks size and format signatures, and forwards to the selected configured provider. It never fetches a model-supplied image URL. The image and key are transient in this project's browser/server memory; provider retention policies still apply.
- There is one local image request at a time, at most three attempts per minute and a 45-second provider deadline. Cancel aborts the request but cannot undo data already received or fees incurred at the provider. Selecting a new provider clears the image API key and consent. Clearing the entry removes the preview and key. No recognition image/key is included in report exports.
- Manual confirmation is required for both routes. Editing screenshot fields or its trace invalidates prior results and unchecks confirmation. This is a UI/data-contract control, not independent verification of source identity.
- Shape mode standardizes the confirmed relative-height samples and compares them with each historical window's standardized, sampled **log close** shape. Linear/log chart axes, candle readability and visual approximation can alter similarity; this is not exact OHLC recovery. The window has the user-confirmed 16–384 bars, with 32 samples describing its overall shape.
- Eligible cases have a complete later outcome before the comparison cutoff and respect the existing gap policy. The final N reference bars (N = confirmed window size) are reserved: case outcomes must end before their start, avoiding near-overlapping self-matches. This is conservative when the library is older than the screenshot. The distance threshold is 0.85; at most 30 cases are selected with non-overlapping observation-plus-outcome intervals. Missing image cutoff uses available library history and carries an explicit warning. No similarity value is a win probability or vision-confidence score.
- The screenshot handoff and image-only shape comparison do not invoke the replay option. Run ordinary numerical retrieval/replay separately if you want a held-out comparison. Shape-only reports have no optional AI prose, indicators or rebased prices.

Paid live vision calls and a model's recognition quality require your own first-use verification; adapter mocks do not establish them.
