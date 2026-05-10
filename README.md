# 球赛速递

`zhiboba` 是一个中文体育赛事与新闻聚合项目，基于公开体育数据和中文新闻源展示赛程、比分状态、体育新闻、直播入口、近三天录像和热门排行。

## 功能概览

- 赛事中心：按日期、运动类型、比赛状态筛选赛程。
- 赛事中文化：同步时将常见赛事联盟、足球队和 NBA 球队名称写入为中文，查询时也做展示兜底翻译。
- 体育新闻：按分类展示足球、篮球、电竞新闻。
- 直播源：按篮球、足球、电竞罗列常用直播入口。
- 近三天录像：展示篮球、足球、电竞相关录像内容和来源链接。
- 热门排行：根据热度字段展示新闻排行。
- 内容同步：通过 Netlify 定时函数每 3 小时同步外部体育数据、中文 RSS 新闻和录像内容。
- 新闻图片：RSS 未提供图片时，会抓取原文页的 `og:image`、`twitter:image`、JSON-LD 图片或正文首图入库。

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

同步逻辑位于 `lib/sportsSync.js`，查询展示逻辑位于 `lib/sportsData.js`。同步会清理旧的 BBC/ESPN 英文新闻记录；录像记录通过 `raw.contentType = "recording"` 标记，接口仅返回近三天录像。新闻图片优先使用 RSS 图片字段，缺失时抓原文页图片；如果上游原文也不暴露可用图片，前端仍显示兜底占位。

## 目录结构

```text
app/
  api/
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
```

## 维护说明

- 项目维护指引见 `AGENTS.md`。
- 新增或修改功能、接口、数据表、环境变量、部署方式时，请同步更新 `README.md` 和 `AGENTS.md`。
