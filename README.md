# FoodExplorer · 小店经营决策助手

给独立餐饮小店店主的经营决策助手：店主上传经营数据，系统给出「这周最该做的一件事」，并陪他验证效果。
项目既是可运行的原型，也是用于产品经理求职的作品集项目。

## 为什么做这个

独立小店店主一个人兼店长、收银、厨师，看不懂报表，也请不起运营。现有工具要么锁在平台自己的生态里
（美团智能掌柜、袋鼠管家），要么面向连锁品牌（Toast IQ、Square AI、SpotOn），没有人服务那些还没接任何系统、
还在手工记账的极小微商户。FoodExplorer 的定位是门槛最低、同时直接给答案：先给结论，想弄明白的人再展开看依据。

## 已经能跑的功能

- 真上传解析：.xlsx / .csv（兼容 GBK 编码），也可以手动录入，并提供数据模板下载
- 冲突预检：同一天同一道菜重复上传是覆盖不是叠加，上传前会提示
- 营业额看板：按日 / 周 / 月 / 季自动汇总
- 规则引擎出建议：销量下滑、组合机会、毛利风险、库存临期四条规则
- 分析口径跟随粒度：日 = 最近 1 天 vs 前一天，周 = 7 vs 7，月 = 30 vs 30，季 = 90 vs 90
- AI 初步分析（DeepSeek）：让模型自己从数据里找发现，并提示可能填错的数据
- 建议状态机：待处理 → 进行中 → 已验证，可记录采纳、标记不适用、回看效果
- 埋点：home_view / advice_card_click / advice_mark_done

## 技术栈

- Next.js 15（App Router）+ React 18 + Tailwind CSS 3
- 数据解析：xlsx；AI 分析：DeepSeek API
- 演示阶段数据存在浏览器 localStorage，生产环境需要换成真正的数据库

## 本地运行

```bash
pnpm install
pnpm dev
```

打开 http://localhost:3000 。AI 分析功能需要在项目根目录新建 `.env.local`，写一行
`DEEPSEEK_API_KEY=你的key`；不配也能跑，只是那个按钮会提示缺 key。

## 产品文档

- [产品需求文档](PRD-FoodExplorer.md)
- [竞品分析](COMPETITORS-FoodExplorer.md)
- [北极星指标与埋点设计](METRICS-FoodExplorer.md)
- [2026 Q4 OKR](OKRs-FoodExplorer-2026Q4.md)
- [低保真原型](prototype.html)（用浏览器直接打开）
- [项目进度与交接说明](PROJECT-STATUS.md)

## 已知限制

- 数据存在浏览器本地，换浏览器或清缓存就没了
- 上传日志只是日志，不能按单个文件精确删除
- 分析口径是两段等长窗口，不是自然周 / 自然月
- 组合套餐建议需要订单级数据，一张销量表给不了
- AI 分析由模型生成，措辞每次不同，偶尔可能不准
