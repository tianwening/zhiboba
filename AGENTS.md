# AGENTS.md

本文件是给后续 AI agent 和维护者的项目指引。每次新增、修改或删除需求、功能、接口、数据结构、运行方式时，都要同步更新本文件；如影响项目介绍、启动方式或部署说明，也要同步更新 `README.md`。

## 项目概览

- 项目名称：`zhiboba`
- 业务定位：中文体育赛事与新闻聚合站，当前页面品牌为“球赛速递”。
- 核心能力：展示赛事赛程、比分状态、中文体育新闻、直播入口、近三天录像、来源跳转和热门排行。
- 数据来源：公开体育数据和中文新闻/录像源，包括 ESPN scoreboard、TheSportsDB、中国新闻网体育 RSS、虎扑电竞 RSS、直播吧录像页面。
- 数据存储：PostgreSQL，代码默认读取 `POSTGRES_SESSION_POOL_URL`、`POSTGRES_URL` 或 `DATABASE_URL`。

## 技术栈

- Next.js `15` App Router
- React `19`
- Tailwind CSS `3`
- PostgreSQL，Node `pg`
- ESLint `9` + `eslint-config-next`
- Netlify Functions，用于定时同步体育内容

## 主要目录

- `app/page.js`：首页服务端入口，负责首屏取数并渲染客户端组件。
- `app/HomeClient.js`：客户端首页，包含筛选、搜索、赛事、新闻、直播源、近三天录像、排行等 UI。
- `app/layout.js`：根布局和页面 metadata。
- `app/globals.css`：全局样式和 Tailwind 入口。
- `app/api/content/route.js`：首页聚合查询接口，一次返回赛事、新闻和近三天录像，用于搜索与筛选提速。
- `app/api/matches/route.js`：赛事列表接口。
- `app/api/news/route.js`：新闻列表接口。
- `app/api/videos/route.js`：近三天录像接口，复用新闻表。
- `app/api/appointments/route.js`：新闻预约数据接口。
- `.github/workflows/ai-pr-review.yml`：PR 指向 `main` 时触发 AI 代码审计。
- `.github/scripts/ai-pr-review.mjs`：拉取 PR diff、调用配置的 AI 代码审计模型并回写 PR 评论。
- `.github/scripts/ai-review-providers.mjs`：AI 代码审计 provider 和模型 target 配置适配层。
- `README.md`：项目介绍、启动方式、技术栈和数据同步说明。
- `lib/db.js`：PostgreSQL 连接池。
- `lib/sportsData.js`：查询赛事、新闻、近三天录像。
- `lib/sportsI18n.js`：赛事联盟和球队名称中文化映射。
- `lib/sportsSync.js`：拉取外部源并 upsert 到数据库。
- `netlify/functions/sync-sports-content.js`：Netlify 每小时同步函数。
- `netlify.toml`：Netlify 函数目录和打包配置。

## 运行命令

- 安装依赖：`npm install`
- 本地开发：`npm run dev`
- 构建：`npm run build`
- 启动生产构建：`npm run start`
- 检查代码：`npm run lint`

## 环境变量

- `POSTGRES_SESSION_POOL_URL`：优先使用的 PostgreSQL 连接串。
- `POSTGRES_URL`：备用 PostgreSQL 连接串。
- `DATABASE_URL`：备用 PostgreSQL 连接串。
- `THESPORTSDB_API_KEY`：TheSportsDB API key；为空时使用公开测试 key `3`。
- `MINIMAX_API_KEY`：GitHub Actions secret，用于 MiniMax PR AI 代码审计；不要写入本地文件或提交到仓库。
- `OPENAI_API_KEY`：GitHub Actions secret，可选；仅在 `AI_REVIEW_TARGETS` 配置了 `openai` provider 时需要。
- `AI_REVIEW_TARGETS`：GitHub Actions variable，可选；JSON 数组，用于配置一个或多个 PR AI 代码审计模型，默认使用 MiniMax `MiniMax-M2.7-highspeed`。

不要提交真实密钥。新增依赖环境变量时，同步更新本文件；如影响项目介绍、启动方式或部署说明，也要同步更新 `README.md`。

## 数据表约定

当前代码依赖以下 PostgreSQL 表：

- `public.sports_matches`
- `public.sports_articles`
- `public.sports_sync_runs`
- `public.sports_news_appointments`

仓库当前没有数据库迁移或建表脚本。修改字段、索引、约束或新增表时，需要补充可追溯的迁移说明或脚本，并同步更新本文件。

## 数据同步

- Netlify 定时函数 `sync-sports-content` 每 3 小时执行一次，cron 为 `0 */3 * * *`。
- 同步逻辑在 `lib/sportsSync.js`。
- 赛事来源：ESPN 足球/欧冠/NBA scoreboard、TheSportsDB 联赛事件。
- 赛事联盟和球队名称需通过 `lib/sportsI18n.js` 中文化；同步入库和查询展示都应调用该映射，避免页面出现英文赛事信息。
- 新闻来源：中国新闻网体育 RSS，按标题关键词归类到足球、篮球、电竞；虎扑电竞 RSS。
- 新闻图片优先使用 RSS 图片字段；缺失时抓原文页的 `og:image`、`twitter:image`、JSON-LD 图片或正文首图入库。若上游页面不暴露可用图片，或远程图片加载失败，前端继续显示兜底占位。
- 录像来源：直播吧篮球、足球录像页面；录像写入 `sports_articles` 并通过 `raw.contentType = "recording"` 标记，查询仅返回近三天内容。录像缩略图和标题都应保留来源跳转。
- 赛事数据按钮优先使用原始数据里的技术统计、比分、赛况链接，缺失时回退到赛事来源链接。
- 搜索和筛选优先走 `/api/content` 聚合接口，避免前端一次交互触发多个 Netlify Function 请求；客户端可缓存当前页面内相同条件的查询结果。
- 同步会清理旧的 BBC/ESPN 英文新闻记录。
- 同步结果写入 `sports_sync_runs`，状态包括 `success`、`partial`、`failed`。

## GitHub Actions

- `AI PR Code Review` 工作流在其他分支向 `main` 创建、更新或重新打开 PR 时运行，草稿 PR 不运行。
- 工作流读取 PR diff，按 `AI_REVIEW_TARGETS` 逐个调用配置的 AI 模型做中文代码审计，并通过 PR 评论回写或更新同一条审计结果。
- 启用前需在 GitHub 仓库 Settings -> Secrets and variables -> Actions 中配置对应 provider 的 API key；默认 MiniMax 配置需要 `MINIMAX_API_KEY`。
- `AI_REVIEW_TARGETS` 中每个 target 包含 `name`、`provider` 和 `model`；当前 provider 支持 `minimax` 与 `openai`。

## 开发规范

- 优先保持现有 JavaScript 风格；当前项目没有 TypeScript。
- UI 改动优先使用 Tailwind class，沿用现有颜色：`brand`、`brand.dark`、`brand.deeper`、`accent`。
- API Route 使用 `runtime = "nodejs"` 和 `dynamic = "force-dynamic"`，避免数据库访问跑到 Edge Runtime。
- 数据查询必须使用参数化 SQL，不要拼接用户输入。
- 外部链接保留来源 URL，图片使用远程 URL；当前页面已为未知远程图片禁用 Next 图片域名限制。
- 新增功能后至少运行 `npm run lint`；涉及构建、路由或部署配置时运行 `npm run build`。
- 如果修改 Netlify、数据库连接或定时同步逻辑，需说明本地无法验证的外部依赖。

## 文件操作安全

- 禁止批量删除文件或目录。
- 不要使用递归删除、通配符删除、`find ... -delete`、`xargs rm` 等批量删除方式。
- 如确需删除文件，只能一次删除一个明确路径的普通文件，并在删除前确认目标不是目录。

## AGENTS 文件命名

- 本项目使用根目录 `AGENTS.md`。
- `AGENTS.md` 是当前 AI coding agent 生态中常见的约定文件名，优先使用全大写。
- 如未来子目录有特殊规则，可在对应子目录增加更近作用域的 `AGENTS.md`，其规则只覆盖该目录及子目录。
