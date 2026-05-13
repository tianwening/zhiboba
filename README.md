# 球赛速递

`zhiboba` 是一个中文体育赛事与新闻聚合项目，基于公开体育数据和中文新闻源展示赛程、比分状态、体育新闻、直播入口、近三天录像和热门排行。

## 功能概览

- 赛事中心：按日期、运动类型、比赛状态筛选赛程。
- 赛事中文化：同步时将常见赛事联盟、足球队和 NBA 球队名称写入为中文，查询时也做展示兜底翻译。
- 体育新闻：按分类展示足球、篮球、电竞新闻。
- 直播源：按篮球、足球、电竞罗列常用直播入口。
- 近三天录像：展示篮球、足球、电竞相关录像内容，缩略图和标题均可跳转到来源链接。
- 热门排行：根据热度字段展示新闻排行。
- 搜索与筛选：通过 `/api/content` 聚合接口真实查询后端赛事、新闻和录像数据，并缓存当前页面内相同条件的结果以减少重复请求。
- 内容同步：通过 Netlify 定时函数每 3 小时同步外部体育数据、中文 RSS 新闻和录像内容。
- 新闻图片：RSS 未提供图片时，会抓取原文页的 `og:image`、`twitter:image`、JSON-LD 图片或正文首图入库；远程图片失效时前端会回退到默认占位。
- AI PR 代码审计：其他分支向 `main` 提交 PR 时，GitHub Actions 会调用配置的 AI 模型对 PR diff 做中文代码审计，并将各模型结果回写到同一条 PR 评论。

## 技术栈

- Next.js 15 App Router
- React 19
- Tailwind CSS 3
- PostgreSQL + `pg`
- Netlify Functions
- ESLint 9

## 快速开始

```bash
npm install
npm run dev
```

开发服务默认运行在：

```text
http://localhost:3000
```

## 常用命令

```bash
npm run dev      # 启动本地开发服务
npm run build    # 构建生产版本
npm run start    # 启动生产构建
npm run lint     # 运行 ESLint 检查
```

## 环境变量

本地开发时按需创建 `.env.local`，并配置以下变量：

```bash
touch .env.local
```

主要变量：

- `POSTGRES_SESSION_POOL_URL`：优先使用的 PostgreSQL 连接串。
- `POSTGRES_URL`：备用 PostgreSQL 连接串。
- `DATABASE_URL`：备用 PostgreSQL 连接串。
- `THESPORTSDB_API_KEY`：TheSportsDB API key；为空时使用公开测试 key。

不要提交真实密钥。

GitHub Actions 需要额外配置：

- `MINIMAX_API_KEY`：仓库 Actions secret，用于 MiniMax PR 代码审计。
- `OPENAI_API_KEY`：可选的仓库 Actions secret；仅在 `AI_REVIEW_TARGETS` 配置了 `openai` provider 时需要。
- `AI_REVIEW_TARGETS`：可选的仓库 Actions variable，JSON 数组，用于配置一个或多个审计模型；为空时默认使用 MiniMax。

MiniMax provider 默认调用 `https://api.minimaxi.com/v1/chat/completions`。
默认模型为 `MiniMax-M2.7`；`MiniMax-M2.7-highspeed` 可能受账号套餐限额影响。

`AI_REVIEW_TARGETS` 示例：

```json
[
  {
    "name": "minimax-main",
    "provider": "minimax",
    "model": "MiniMax-M2.7"
  },
  {
    "name": "openai-main",
    "provider": "openai",
    "model": "gpt-5"
  }
]
```

## 数据与同步

项目当前依赖以下 PostgreSQL 表：

- `public.sports_matches`
- `public.sports_articles`
- `public.sports_sync_runs`
- `public.sports_news_appointments`

Netlify 函数 `sync-sports-content` 每 3 小时运行一次，主要同步：

- ESPN 足球、欧冠、NBA scoreboard
- TheSportsDB 联赛事件
- 中国新闻网体育 RSS，按标题关键词归类到足球、篮球、电竞
- 虎扑电竞 RSS
- 直播吧篮球、足球录像页面

同步逻辑位于 `lib/sportsSync.js`，查询展示逻辑位于 `lib/sportsData.js`。同步会清理旧的 BBC/ESPN 英文新闻记录；录像记录通过 `raw.contentType = "recording"` 标记，接口仅返回近三天录像。新闻图片优先使用 RSS 图片字段，缺失时抓原文页图片；如果上游原文也不暴露可用图片或远程图片加载失败，前端显示兜底占位。赛事数据按钮会优先使用原始数据里的技术统计、比分、赛况链接，缺失时回退到赛事来源链接。

## 目录结构

```text
app/
  api/
    content/            # 首页聚合查询接口
    matches/            # 赛事列表接口
    news/               # 新闻列表接口
    videos/             # 带图内容接口
    appointments/       # 新闻预约接口
  globals.css           # 全局样式
  HomeClient.js         # 首页客户端交互 UI
  layout.js             # 根布局
  page.js               # 首页服务端入口和首屏取数
lib/
  db.js                 # PostgreSQL 连接池
  sportsData.js         # 页面数据查询
  sportsI18n.js         # 赛事联盟和球队名称中文化
  sportsSync.js         # 外部数据同步
netlify/
  functions/            # Netlify 定时函数
.github/
  workflows/            # GitHub Actions 工作流
  scripts/              # GitHub Actions 辅助脚本
```

## 维护说明

- 项目维护指引见 `AGENTS.md`。
- 新增或修改功能、接口、数据表、环境变量、部署方式时，请同步更新 `README.md` 和 `AGENTS.md`。
