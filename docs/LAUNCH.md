# Positioning & launch copy

定位：本地历史走势案例检索器。服务于希望把“这段走势以前见过”变成可核验案例的研究者和开发者。

主卖点：一条命令启动、自带合成演示、CSV 不上传、历史案例与后续分开、基础检索无 API Key，可选自带密钥 AI 解读。

不要宣传：预测神器、千星项目、稳定盈利、全市场全周期、已经证实的准确率、截图自动识别。

## 中文首发（完成公开仓库发布后使用）

看行情时，我经常觉得：这段走势以前是不是出现过？

但凭印象找案例，很容易只记住符合自己判断的那几次。

我把 Fieldnote 里的一个模块整理成了 Market Echo：导入行情 CSV，寻找相似历史片段，再展开它们之后的不同走势。每个案例都能看到日期，也能检查比较依据。

基础检索不用账号或 API Key，CSV 在浏览器本地处理。现在会明确显示基准价、期限和历史幅度换算价；也可自带密钥，让 AI 解释案例。中英文界面均可用，仓库自带合成演示。

相似度不是胜率，我也没有把它包装成预测工具。希望它能让每次“看起来很像”，都有具体案例可以检查。

如果你试用后发现数据格式、案例展示或时间口径的问题，欢迎提交 Issue。觉得有用也欢迎 Star。

发布时附真实仓库链接与演示录屏。

## English launch (after the repository is public)

I extracted a small research tool from Fieldnote: Market Echo.

Import OHLCV CSV, retrieve similar historical windows, and inspect what happened next. It runs locally in the browser: no account, API key, or data upload for retrieval. The bilingual interface shows baseline prices and rebased historical endpoints. Optional BYOK AI explains a consented evidence summary.

The demo is synthetic. Similarity is not a probability, and historical outcomes are not forecasts. Every case includes dates and distance components so you can inspect the evidence yourself.

Feedback on data handling, temporal boundaries, and reproducibility is welcome.

## 30-second demo

0–5s: show the synthetic-data label and the question “这段走势以前出现过吗？”
5–12s: select 1h bars and a 24h outcome; run retrieval.
12–22s: select two cases with different outcomes; point to historical anchor/outcome dates.
22–30s: show CSV import and JSON export; end with the actual repo URL after publication.

首轮只展示一个使用过程。记录访问、真实安装反馈和 Issue，迭代安装/理解成本，不承诺千星时限。
