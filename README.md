# 球赛速递

`zhiboba` 是一个中文体育赛事与新闻聚合项目，基于公开体育数据和新闻源展示赛程、比分状态、体育新闻、带图内容和热门排行。

## 功能概览

- 赛事中心：按日期、运动类型、比赛状态筛选赛程。
- 体育新闻：按分类展示足球、篮球、电竞、网球和综合新闻。
- 图片 / 集锦：展示带图片的新闻内容和来源链接。
- 热门排行：根据热度字段展示新闻排行。
- 内容同步：通过 Netlify 定时函数同步外部体育数据和 RSS 内容。

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

复制 `.env.example` 并配置本地环境变量：

```bash
cp .env.example .env.local
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

Netlify 函数 `sync-sports-content` 每小时运行一次，主要同步：

- ESPN 足球、欧冠、NBA scoreboard
- TheSportsDB 联赛事件
- BBC Sport Football RSS
- ESPN NBA / Soccer RSS

同步逻辑位于 `lib/sportsSync.js`，查询展示逻辑位于 `lib/sportsData.js`。

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
  sportsSync.js         # 外部数据同步
netlify/
  functions/            # Netlify 定时函数
```

## 维护说明

- 项目维护指引见 `AGENTS.md`。
- 新增或修改功能、接口、数据表、环境变量、部署方式时，请同步更新 `README.md` 和 `AGENTS.md`。
