# 三分钟上手 / Three-minute walkthrough

## 中文

1. 按 [首页](../README.zh-CN.md) 启动，在浏览器打开 http://127.0.0.1:4173。
2. 保留合成演示，选择 Crypto → BTC、1h 和 24 小时，然后运行检索。基础功能不需要 AI 密钥。
3. 先看观察截止时间和基准价，再点案例表中的一行。检查历史原价、后续幅度和当前基准换算价。
4. 切换另一个案例，对比结果。终点圆点表示历史幅度换算，不是已经知道的未来价格；相似度分数也不是上涨概率。
5. 理解演示后再导入自己的 CSV，核对市场、周期、价格单位与数据来源。需要 AI 时再按 [AI 配置](AI.md) 填模型和密钥，先看发送摘要，再确认调用。

6. 勾选“历史回放”后再检索：先看历史案例，再点“揭晓实际后续”。蓝线显示留出数据；用合成数据回放时仍只是流程演示。展开“为什么这个案例相似”可核对标准化形态和距离权重。

### 常见问题

**如何使用真实行情？** 本机启动后，选择“直接获取 BTC / ETH 现货历史”，选周期与根数后检索。它下载最新可用的已收盘快照，不持续刷新；美股、A 股和金属仍用自己的 CSV。内置演示仍为合成。开启回放会把观察截止退回一个完整期限，用末尾数据检验对照。

**为什么找不到案例？** 需要观察窗口之前有足够的历史，还要能完整观察案例后续。短文件、期限太长或数据不连续都可能没有有效结果。先用随仓库提供的演示文件确认流程，不要把无结果强行改成有结果。

**为什么其他币种没有换算点位？** 当前仅提供形态和结构比较，保留历史幅度，避免把不同资产的机制差异隐藏在具体价位里。

**不用 AI 能做什么？** 导入、检索、案例比较、图表和结果导出均可独立使用。AI 是可选文字解释，按供应商规则收费。

**网页打不开？** 保持运行 npm start 的终端开启，使用它显示的本机地址。不要直接双击 HTML。确认 Node.js 版本至少为 22，且命令在包含 package.json 的目录运行。

**仓库 test 红叉会影响使用吗？** 当前已知的首次云端运行因 GitHub 账户账单锁定未启动，与本机运行分开。详细状态见 [验证记录](VERIFICATION.md)。

**如何反馈？** [提交 Issue](https://github.com/pruettlazaro143-a11y/market-echo/issues/new/choose)，附复现步骤、设置和脱敏截图。只提供最小合成 CSV，不上传密钥或私有数据。

## English

1. Follow the [README](../README.md), keep the terminal running and open http://127.0.0.1:4173.
2. Keep the synthetic demo; choose Crypto → BTC, 1h bars and a 24-hour horizon. Run retrieval without an AI key.
3. Read the observation cutoff and baseline. Select a table row and compare historical original prices, the historical return and the rebased endpoint.
4. Select another case. The endpoint represents an equivalent historical move, not an observed future price. Similarity is not probability.
5. Import your CSV only after checking the market, interval, quote unit and provenance. For optional AI, follow [AI setup](AI.md), inspect the evidence preview and consent before sending.

6. Enable historical replay, run retrieval, inspect cases, then reveal the held-out path. Expand the match explanation to inspect normalized shapes and distance weights. Synthetic replay remains a demonstration.

### FAQ

- **Real prices?** Select the direct BTC/ETH spot history source with the local server running. It downloads a closed-bar snapshot, not a streaming quote. Other markets use CSV. Replay moves the cutoff back by one complete horizon; built-in data remains synthetic.
- **No matches?** The file needs enough earlier history and complete subsequent outcomes. Short files, long horizons or data gaps can leave no eligible cases. Try the supplied synthetic example first.
- **No mapped price for other crypto?** This mode compares shape and structure only and retains historical percentage outcomes.
- **AI required?** No. Import, retrieval, charts, comparison and export work independently. Optional model calls are billed by your provider.
- **Page will not open?** Keep npm start running, use its local HTTP address and Node.js 22+. Do not open HTML through file://.
- **Failed CI badge?** The first cloud job was blocked by a GitHub account billing lock before tests started. See [verification](VERIFICATION.md); local results are recorded separately.
- **Found a bug?** [Open an issue](https://github.com/pruettlazaro143-a11y/market-echo/issues/new/choose) with reproducible steps and minimal synthetic data. Omit credentials and private datasets.

## 使用截图 / Using screenshots

页面顶部选择截图 → 本地预览 → 勾选图片发送授权并识别（或手动填写与描形）→ 核对信息和曲线 → 选择完整行情衔接或形态比较。完整操作与限制见 [截图说明](SCREENSHOTS.md)。图片识别不是把截图恢复成精确 OHLCV。

At the top of the page: choose an image → preview → consent and recognize, or enter/trace manually → review → use full history handoff or shape comparison. See [the screenshot guide](SCREENSHOTS.md). Recognition does not reconstruct exact OHLCV.
