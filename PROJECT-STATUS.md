# FoodExplorer 项目进度与交接说明

> 更新日期：2026-09-13
> 用途：换新文件夹 / 新任务后，先读这份文档，就能接上之前的进度继续做。

## 一句话

FoodExplorer 是给独立餐饮小店店主用的经营决策助手：店主上传经营数据，系统给出"这周最该做的一件事"，并陪他验证效果。项目既是可运行的原型，也是用于 PM 求职的作品集项目。

## 目标用户与定位

- 主角：独立小店店主，一个人兼店长、收银、厨师，看不懂数据，也请不起运营。
- 定位：门槛最低，同时直接给答案。先给结论，想弄明白的人再展开看依据。
- 差异化：服务那些还没接任何系统、靠手工记账的极小微商户。大厂产品（美团智能掌柜、袋鼠管家、Toast IQ、Square AI、SpotOn）要么锁在自家生态，要么面向连锁。

## 已定的产品与商业决策

- 页面结构：首页 / 建议 / 数据 + 右上角齿轮进设置，登录页作为入口。
- 免费模式：未登录可免费生成 3 次；登录后未付费每周 1 条；付费订阅不限次，另含深度依据和多店。
- 登录方式：手机号（demo 里任意手机号可进）。
- 试用次数存在浏览器 localStorage，键名 `fe_trial_used`，页面上有"重置（演示用）"按钮。
- 已承认的风险：匿名端无法可靠绑定设备，3 次免费只是促成转化的软门槛，不作为防滥用的硬闸。

## 技术栈与运行方式

- Next.js 15（App Router）+ React 18 + Tailwind 3。
- 启动：双击 `F:\FoodExplorer\start.bat`，端口 3000。这台机器**没有装 npm**，用 start.bat 或 pnpm，不要用 npm。
- 换过文件夹后启动若报错（找不到 next / react 之类），是依赖软链接还指着旧路径。在项目目录跑一次
  `pnpm install --offline --frozen-lockfile` 重链即可（包仓库在 `F:\.pnpm-store\v11`，不用联网）。
- 代码已经推到 GitHub：https://github.com/Lebai-Shen/FoodExplorer （公开仓库，默认分支 main）。
- 改完代码要上传：`git add .` → `git commit -m "说明改了什么"` → `git push`。`.env.local` 已被 .gitignore 排除，不会跟着上传。
- 数据解析用 `xlsx` 库（支持 .xlsx 和 .csv，CSV 兼容 GBK 编码）。
- AI 分析用 DeepSeek，key 在 `.env.local` 的 `DEEPSEEK_API_KEY`，`.gitignore` 已排除，**不要提交或外发**。

## 目录与文件

页面与接口：

- `app/page.js` 首页（3 个指标 + 本周最该做的一件事）
- `app/advice/page.js` 建议列表（待处理 / 进行中 / 已验证）
- `app/advice/[id]/page.js` 建议详情（结论 / 依据 / 风险 / 预期 + 我做了）
- `app/data/page.js` 数据页（上传、手动录入、日期看板、AI 分析、生成建议、试用次数）
- `app/login/page.js` 登录
- `app/settings/page.js` 设置（含重置试用次数）
- `app/api/upload/route.js` 上传解析（返回日期明细；GET 下载模板）
- `app/api/generate/route.js` 规则引擎出建议
- `app/api/analyze/route.js` 调 DeepSeek 做 AI 初步分析
- `app/api/adopt/route.js` 记录采纳
- `components/TopNav.js` 顶部导航

逻辑与数据：

- `lib/normalize.js` 日期解析、明细记录、按粒度汇总、`recordsToDataset`
- `lib/rules.js` 4 条规则：R1 销量下滑、R2 组合机会、R3 毛利风险、R4 库存临期
- `lib/stats.js` 营业额 / 销量 / 毛利率
- `lib/store.js` 本地数据仓：明细记录、上传日志、建议状态
- `lib/validate.js` 数据校验（环比异常、负毛利等）
- `lib/uploadParse.js` xlsx / csv 解析 + 数据模板
- `lib/trial.js` 试用次数
- `lib/track.js` 前端埋点（先打 console.log）

文档：

- `PRD-FoodExplorer.md` 产品需求文档（v0.2）
- `COMPETITORS-FoodExplorer.md` 竞品分析
- `METRICS-FoodExplorer.md` 北极星指标、输入指标、转化漏斗、18 个埋点事件
- `OKRs-FoodExplorer-2026Q4.md` 三套 OKR
- `prototype.html` 可点击低保真原型（网页版）

## 数据模型（重要，容易搞错）

- 现在按"日期明细"存数据：一行 = 某道菜某天的经营数据。
- 模板列：日期 / 菜品名 / 销量 / 售价 / 成本 / 库存量 / 单位 / 剩余保质天数。
- 唯一键 = 日期 + 菜品名。重复上传是**覆盖**，不是叠加。
- 上传时做冲突预检，会提示"有 N 条重复，继续将覆盖"。
- 看板支持按 日 / 周 / 月 / 季 切换，全部由明细自动汇总。
- 分析口径跟着看板粒度走：日 = 最近 1 天 vs 前一天，周 = 7 天 vs 7 天，月 = 30 天 vs 30 天，季 = 90 天 vs 90 天；粒度存在 localStorage 的 `fe_grain`。

## 已经做出来的功能

- 真上传解析：xlsx 和 csv，兼容 GBK 编码，支持下载数据模板。
- 手动录入：选一个日期 + 编辑菜品表格（增删行）。
- 冲突预检 + 按日期覆盖入库。
- 上传日志 + 清空全部数据。
- 日 / 周 / 月 / 季 营业额看板。
- 分析口径跟随粒度：切换日 / 周 / 月 / 季 后，建议和 AI 分析都换成对应的对比窗口，文案里的时间说法（最近 X 天 / 下周 / 下个月）也跟着变。
- 规则引擎出建议 + 建议详情页。
- AI 初步分析：让 DeepSeek 自己从数据里找发现，并提示可疑数据（不再只是复述规则）。
- 建议状态机：待处理 → 进行中 → 已验证，列表上可直接采纳、标记不适用、确认有效或没效果。
- 首页三个核心指标 + 本周最该做的一件事。
- 埋点三个事件已落地：`home_view`、`advice_card_click`、`advice_mark_done`；完整设计见 METRICS 文档。

## 已知限制（要诚实对待）

- 数据存在浏览器 localStorage，不是数据库，换浏览器就没了。
- 上传日志只是日志，无法按单个文件精确删除（记录已按"日期 + 菜品"合并）。要删只能删日期区间或清空。
- 口径是"两段等长窗口"（日 = 1 天 vs 1 天，月 = 30 天 vs 30 天），不是自然周 / 自然月；数据不够长时窗口取不满，环比可能算不出来。
- 组合套餐建议（R2）需要订单级数据，简单的销量表给不了。
- AI 分析是模型生成的，措辞每次会不同，偶尔可能不准。
- **动手前注意**：不要在 dev 服务运行时跑 `next build`，会破坏 `.next` 缓存（之前踩过这个坑，报 `Cannot find module './xxx.js'`）。

## 下一步候选

1. 按日期区间删除数据。
2. 接真正的数据库（Supabase / Postgres）。
3. 补图表（各商品销售额占比饼图、近 7 天销量折线图）。
4. 部署上线（Vercel），拿到能写进简历的在线链接。
5. 做作品集 / 案例页，把 PRD、竞品、指标、原型、demo 收敛成面试材料。

## 怎么运行

1. 双击 `F:\FoodExplorer\start.bat`。
2. 等出现 `Ready` 和 `Local: http://localhost:3000`。
3. 刷新浏览器打开 `http://localhost:3000`。
