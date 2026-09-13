# 三分钟上手 / Three-minute walkthrough

## 中文

1. 按 [首页](../README.zh-CN.md) 启动，在浏览器打开 http://127.0.0.1:4173。
2. 保留合成演示，选择 Crypto → BTC、1h 和 24 小时，然后运行检索。基础功能不需要 AI 密钥。
3. 先看观察截止时间和基准价，再点案例表中的一行。检查历史原价、后续幅度和当前基准换算价。
4. 切换另一个案例，对比结果。终点圆点表示历史幅度换算，不是已经知道的未来价格；相似度分数也不是上涨概率。
5. 理解演示后再导入自己的 CSV，核对市场、周期、价格单位与数据来源。需要 AI 时再按 [AI 配置](AI.md) 填模型和密钥，先看发送摘要，再确认调用。

### 常见问题

**为什么看到的不是今天行情？** 没有实时行情接口。基准来自导入数据最后一根符合截止条件的已收盘 K 线；内置数据是合成演示。

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

### FAQ

- **No live prices?** Correct. The cutoff and baseline come from your imported closed bars. Built-in data is synthetic.
- **No matches?** The file needs enough earlier history and complete subsequent outcomes. Short files, long horizons or data gaps can leave no eligible cases. Try the supplied synthetic example first.
- **No mapped price for other crypto?** This mode compares shape and structure only and retains historical percentage outcomes.
- **AI required?** No. Import, retrieval, charts, comparison and export work independently. Optional model calls are billed by your provider.
- **Page will not open?** Keep npm start running, use its local HTTP address and Node.js 22+. Do not open HTML through file://.
- **Failed CI badge?** The first cloud job was blocked by a GitHub account billing lock before tests started. See [verification](VERIFICATION.md); local results are recorded separately.
- **Found a bug?** [Open an issue](https://github.com/pruettlazaro143-a11y/market-echo/issues/new/choose) with reproducible steps and minimal synthetic data. Omit credentials and private datasets.
