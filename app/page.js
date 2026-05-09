"use client";

import { useMemo, useState } from "react";

const sports = [
  { key: "all", label: "全部" },
  { key: "football", label: "足球" },
  { key: "basketball", label: "篮球" },
  { key: "esports", label: "电竞" },
  { key: "tennis", label: "网球" },
  { key: "general", label: "综合" },
];

const statuses = [
  { key: "all", label: "全部" },
  { key: "upcoming", label: "未开始" },
  { key: "live", label: "直播中" },
  { key: "finished", label: "已结束" },
];

const dates = [
  { key: "yesterday", label: "昨天", text: "05-08" },
  { key: "today", label: "今天", text: "05-09" },
  { key: "tomorrow", label: "明天", text: "05-10" },
];

const newsCategories = [
  { key: "all", label: "全部" },
  { key: "football", label: "足球" },
  { key: "basketball", label: "篮球" },
  { key: "esports", label: "电竞" },
  { key: "general", label: "综合" },
];

const matches = [
  {
    id: 1,
    date: "today",
    sport: "football",
    status: "live",
    time: "19:30",
    league: "中超",
    home: "上海海港",
    away: "成都蓉城",
    score: "1 - 1",
    note: "下半场 63'",
    action: "视频直播",
  },
  {
    id: 2,
    date: "today",
    sport: "basketball",
    status: "upcoming",
    time: "20:00",
    league: "CBA 半决赛",
    home: "辽宁",
    away: "广东",
    score: "VS",
    note: "赛前阵容已更新",
    action: "预约提醒",
  },
  {
    id: 3,
    date: "today",
    sport: "football",
    status: "upcoming",
    time: "22:15",
    league: "英超",
    home: "曼城",
    away: "阿森纳",
    score: "VS",
    note: "争冠关键战",
    action: "图文直播",
  },
  {
    id: 4,
    date: "today",
    sport: "esports",
    status: "live",
    time: "18:00",
    league: "MSI",
    home: "BLG",
    away: "T1",
    score: "1 - 0",
    note: "BO5 第二局",
    action: "赛事直播",
  },
  {
    id: 5,
    date: "today",
    sport: "tennis",
    status: "finished",
    time: "16:30",
    league: "罗马大师赛",
    home: "张之臻",
    away: "鲁德",
    score: "0 - 2",
    note: "全场结束",
    action: "技术统计",
  },
  {
    id: 6,
    date: "yesterday",
    sport: "basketball",
    status: "finished",
    time: "19:35",
    league: "NBA 季后赛",
    home: "森林狼",
    away: "掘金",
    score: "112 - 108",
    note: "爱德华兹 34 分",
    action: "比赛集锦",
  },
  {
    id: 7,
    date: "yesterday",
    sport: "football",
    status: "finished",
    time: "03:00",
    league: "欧冠",
    home: "巴黎",
    away: "多特蒙德",
    score: "2 - 1",
    note: "巴黎总比分晋级",
    action: "全场录像",
  },
  {
    id: 8,
    date: "tomorrow",
    sport: "general",
    status: "upcoming",
    time: "09:00",
    league: "世界田联钻石联赛",
    home: "上海站",
    away: "决赛日",
    score: "VS",
    note: "多项决赛开赛",
    action: "赛程详情",
  },
  {
    id: 9,
    date: "tomorrow",
    sport: "football",
    status: "upcoming",
    time: "21:00",
    league: "西甲",
    home: "皇家马德里",
    away: "瓦伦西亚",
    score: "VS",
    note: "轮换名单待公布",
    action: "图文直播",
  },
  {
    id: 10,
    date: "tomorrow",
    sport: "esports",
    status: "upcoming",
    time: "17:00",
    league: "KPL",
    home: "狼队",
    away: "AG 超玩会",
    score: "VS",
    note: "胜者进入决赛",
    action: "预约提醒",
  },
];

const news = [
  {
    id: 1,
    category: "football",
    title: "争冠冲刺进入最后三轮，榜首两队赛程难度接近",
    source: "速递足球",
    time: "12 分钟前",
    heat: 982,
    desc: "多支球队将在本周迎来连续客场，阵容深度成为关键变量。",
  },
  {
    id: 2,
    category: "basketball",
    title: "半决赛对位观察：内线轮换和三分效率决定系列赛节奏",
    source: "篮球前线",
    time: "26 分钟前",
    heat: 873,
    desc: "双方主帅都在训练后强调转换防守，首节开局会很重要。",
  },
  {
    id: 3,
    category: "esports",
    title: "MSI 今日赛程公布，焦点战预计在黄金时段打响",
    source: "电竞观察",
    time: "41 分钟前",
    heat: 806,
    desc: "版本强势英雄和下路对线将影响 BP 选择。",
  },
  {
    id: 4,
    category: "football",
    title: "多名主力恢复合练，欧战球队赛前伤停名单更新",
    source: "国际足球",
    time: "1 小时前",
    heat: 692,
    desc: "医疗团队将在赛前最后一次训练后确认出场状态。",
  },
  {
    id: 5,
    category: "general",
    title: "周末观赛日历：足球、篮球、网球和田径赛事密集开赛",
    source: "综合体育",
    time: "2 小时前",
    heat: 655,
    desc: "重点赛事横跨下午到深夜，多个项目有中国选手参赛。",
  },
  {
    id: 6,
    category: "basketball",
    title: "年轻后卫连续三场得分 20+，球队替补火力明显提升",
    source: "赛后声音",
    time: "3 小时前",
    heat: 589,
    desc: "教练组表示会继续扩大轮换，降低核心球员负荷。",
  },
];

const videos = [
  { title: "上海海港 1-1 成都蓉城半场集锦", meta: "中超 · 8 分钟前" },
  { title: "MSI 焦点战第一局关键团战回放", meta: "电竞 · 18 分钟前" },
  { title: "NBA 季后赛十佳球：压哨三分入选", meta: "篮球 · 46 分钟前" },
  { title: "欧冠半决赛赛前训练画面", meta: "足球 · 1 小时前" },
];

const statusLabel = {
  live: "直播中",
  upcoming: "未开始",
  finished: "已结束",
};

const statusClass = {
  live: "bg-[#ffe8e2] text-accent",
  upcoming: "bg-[#e8f4ff] text-[#2563a8]",
  finished: "bg-[#eef0f3] text-[#667085]",
};

const featureCards = [
  {
    label: "足球焦点",
    title: "欧冠半决赛次回合前瞻",
    desc: "阵容、伤停与关键对位更新。",
    color: "border-t-brand",
  },
  {
    label: "篮球热榜",
    title: "季后赛每日观察",
    desc: "球队轮换、关键球员状态追踪。",
    color: "border-t-accent",
  },
  {
    label: "电竞赛程",
    title: "国际邀请赛观赛指南",
    desc: "分组、赛制和直播时间整理。",
    color: "border-t-[#2563a8]",
  },
];

const shortcuts = ["完场比分", "赛程日历", "伤停名单", "积分榜", "转会动态", "直播预约"];

function normalize(value) {
  return String(value).trim().toLowerCase();
}

function includesQuery(item, query) {
  return normalize(Object.values(item).join(" ")).includes(query);
}

function categoryName(key) {
  return newsCategories.find((item) => item.key === key)?.label ?? "综合";
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function HomePage() {
  const [sport, setSport] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("today");
  const [newsCategory, setNewsCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [nav, setNav] = useState("home");

  const normalizedQuery = normalize(query);

  const filteredMatches = useMemo(() => {
    if (normalizedQuery) {
      return matches.filter((match) => includesQuery(match, normalizedQuery));
    }

    return matches.filter((match) => {
      const sameDate = match.date === date;
      const sameSport = sport === "all" || match.sport === sport;
      const sameStatus = status === "all" || match.status === status;
      return sameDate && sameSport && sameStatus;
    });
  }, [date, normalizedQuery, sport, status]);

  const filteredNews = useMemo(() => {
    if (normalizedQuery) {
      return news.filter((item) => includesQuery(item, normalizedQuery));
    }

    return news.filter(
      (item) => newsCategory === "all" || item.category === newsCategory,
    );
  }, [newsCategory, normalizedQuery]);

  const filteredVideos = useMemo(() => {
    if (!normalizedQuery) {
      return videos;
    }

    return videos.filter((video) => includesQuery(video, normalizedQuery));
  }, [normalizedQuery]);

  const rankedNews = useMemo(() => {
    const source = normalizedQuery
      ? news.filter((item) => includesQuery(item, normalizedQuery))
      : news;

    return [...source].sort((a, b) => b.heat - a.heat).slice(0, 6);
  }, [normalizedQuery]);

  function clearSearch() {
    setQuery("");
  }

  function handleSportNav(nextSport) {
    clearSearch();
    setNav(nextSport);
    setSport(nextSport);
    setStatus("all");
    setNewsCategory(
      newsCategories.some((item) => item.key === nextSport) ? nextSport : "all",
    );
    scrollToId("schedulePanel");
  }

  function handleNav(nextNav) {
    clearSearch();
    setNav(nextNav);

    if (nextNav === "home") {
      setSport("all");
      setStatus("all");
      setNewsCategory("all");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    scrollToId(nextNav === "videos" ? "videoPanel" : "schedulePanel");
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    scrollToId("schedulePanel");
  }

  return (
    <>
      <SiteHeader
        nav={nav}
        query={query}
        onQueryChange={setQuery}
        onSearchSubmit={handleSearchSubmit}
        onSportNav={handleSportNav}
        onNav={handleNav}
      />

      <main className="mx-auto max-w-[1240px] px-3 py-4 sm:px-5 sm:py-6">
        <HeroBand />
        <FeatureGrid />

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="grid gap-4" aria-label="赛事和新闻">
            <SchedulePanel
              date={date}
              sport={sport}
              status={status}
              query={normalizedQuery}
              matches={filteredMatches}
              onDateChange={setDate}
              onSportChange={setSport}
              onStatusChange={setStatus}
            />
            <NewsPanel
              newsCategory={newsCategory}
              query={normalizedQuery}
              news={filteredNews}
              onNewsCategoryChange={setNewsCategory}
            />
          </section>

          <aside className="grid gap-4 md:grid-cols-2 lg:grid-cols-1" aria-label="侧栏内容">
            <VideoPanel videos={filteredVideos} />
            <RankPanel items={rankedNews} />
            <ShortcutPanel />
          </aside>
        </div>
      </main>

      <footer className="px-5 pb-8 pt-4 text-center text-[#667085]">
        <p>球赛速递为前端演示站，页面数据均为模拟内容。</p>
      </footer>
    </>
  );
}

function SiteHeader({
  nav,
  query,
  onQueryChange,
  onSearchSubmit,
  onSportNav,
  onNav,
}) {
  const navItems = [
    { label: "首页", nav: "home" },
    { label: "足球", sport: "football" },
    { label: "篮球", sport: "basketball" },
    { label: "电竞", sport: "esports" },
    { label: "网球", sport: "tennis" },
    { label: "综合", sport: "general" },
    { label: "录像", nav: "videos" },
    { label: "数据", nav: "data" },
  ];

  return (
    <header className="sticky top-0 z-20 bg-brand-dark text-white shadow-[0_2px_16px_rgba(15,63,58,0.24)]">
      <div className="mx-auto grid min-h-[68px] max-w-[1240px] grid-cols-1 items-center gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[auto_minmax(0,1fr)_280px] lg:gap-5 lg:py-0">
        <a className="flex min-w-0 items-center gap-2.5" href="#" aria-label="球赛速递首页" onClick={(event) => { event.preventDefault(); onNav("home"); }}>
          <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-lg bg-white font-extrabold text-brand-deeper">
            速
          </span>
          <span className="min-w-0">
            <strong className="block text-xl leading-none">球赛速递</strong>
            <small className="mt-1 block text-xs text-white/70">赛事 · 新闻 · 集锦</small>
          </span>
        </a>

        <nav className="hide-scrollbar flex w-full min-w-0 items-center gap-1 overflow-x-auto" aria-label="体育频道">
          {navItems.map((item) => {
            const key = item.sport ?? item.nav;
            const active = nav === key;

            return (
              <a
                key={key}
                href="#"
                aria-current={active ? "page" : undefined}
                className={`flex-none whitespace-nowrap rounded-md px-3 py-2 font-bold text-white/80 transition hover:bg-white/15 hover:text-white ${
                  active ? "bg-white/15 text-white" : ""
                }`}
                onClick={(event) => {
                  event.preventDefault();
                  if (item.sport) {
                    onSportNav(item.sport);
                  } else {
                    onNav(item.nav);
                  }
                }}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <form
          className="flex w-full overflow-hidden rounded-lg border border-white/20 bg-white/10"
          role="search"
          onSubmit={onSearchSubmit}
        >
          <input
            className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-white outline-none placeholder:text-white/60"
            type="search"
            placeholder="搜索球队、赛事、新闻"
            aria-label="搜索"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <button
            className="min-w-16 flex-none bg-white px-4 font-bold text-brand-deeper"
            type="submit"
          >
            搜索
          </button>
        </form>
      </div>
    </header>
  );
}

function HeroBand() {
  return (
    <section className="mb-4 flex min-h-0 flex-col items-start justify-between gap-6 rounded-lg bg-[linear-gradient(120deg,rgba(17,89,77,0.95),rgba(29,122,107,0.88)),linear-gradient(45deg,#0f3f3a,#2563a8)] p-5 text-white shadow-portal sm:min-h-40 sm:p-6 lg:flex-row lg:items-end" aria-labelledby="today-title">
      <div>
        <p className="mb-1.5 text-xs font-extrabold uppercase text-white/70">今日焦点</p>
        <h1 id="today-title" className="max-w-[680px] [overflow-wrap:anywhere] text-2xl font-extrabold leading-tight sm:text-[34px]">
          热门赛事、实时赛程和体育要闻一屏掌握
        </h1>
      </div>
      <div className="grid w-full gap-2 lg:w-[330px]" aria-label="热门快讯">
        {["英超争冠关键战今晚开球", "CBA 半决赛进入赛点", "MSI 小组赛焦点对决"].map((item) => (
          <span key={item} className="block rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white/90">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function FeatureGrid() {
  return (
    <section className="mb-4 grid gap-3.5 md:grid-cols-3" aria-label="热门专题">
      {featureCards.map((card) => (
        <article key={card.title} className={`min-h-32 rounded-lg border border-[#d9e2ee] ${card.color} border-t-4 bg-white p-4 shadow-[0_8px_20px_rgba(24,34,48,0.05)]`}>
          <span className="mb-4 inline-block text-xs font-extrabold text-[#667085]">{card.label}</span>
          <h2 className="mb-1 text-lg font-extrabold">{card.title}</h2>
          <p className="text-[#667085]">{card.desc}</p>
        </article>
      ))}
    </section>
  );
}

function SchedulePanel({
  date,
  sport,
  status,
  query,
  matches: matchItems,
  onDateChange,
  onSportChange,
  onStatusChange,
}) {
  return (
    <Panel id="schedulePanel">
      <div className="flex flex-col gap-4 border-b border-[#d9e2ee] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1.5 text-xs font-extrabold uppercase text-brand">Match Center</p>
          <h2 className="text-xl font-extrabold">赛事中心</h2>
        </div>
        <TabGroup items={dates} activeKey={date} onChange={onDateChange} includeText />
      </div>

      <div className="flex flex-col gap-3.5 border-b border-[#d9e2ee] p-4 sm:flex-row sm:justify-between">
        <TabGroup items={sports} activeKey={sport} onChange={onSportChange} />
        <TabGroup items={statuses} activeKey={status} onChange={onStatusChange} compact />
      </div>

      <div className="grid" aria-live="polite">
        {matchItems.length ? (
          matchItems.map((match) => <MatchCard key={match.id} match={match} />)
        ) : (
          <EmptyState>
            {query ? "没有找到相关比赛，换个关键词试试。" : "当前筛选下暂无比赛，换个日期或分类看看。"}
          </EmptyState>
        )}
      </div>
    </Panel>
  );
}

function MatchCard({ match }) {
  return (
    <article className="grid gap-3.5 border-b border-[#d9e2ee] p-4 last:border-b-0 sm:grid-cols-[92px_1fr_auto] sm:items-center">
      <div className="text-xl font-extrabold">{match.time}</div>
      <div>
        <span className="mb-1.5 inline-flex rounded-md bg-[#eef4fb] px-2 py-1 text-xs font-extrabold text-[#667085]">
          {match.league}
        </span>
        <h3 className="flex flex-wrap items-center gap-2.5 text-[17px] font-extrabold">
          <span>{match.home}</span>
          <span className="font-black text-accent">{match.score}</span>
          <span>{match.away}</span>
          <span className={`inline-flex min-w-[66px] justify-center rounded-full px-2 py-1 text-xs font-extrabold ${statusClass[match.status]}`}>
            {statusLabel[match.status]}
          </span>
        </h3>
        <div className="mt-1 text-sm text-[#667085]">{match.note}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a className="whitespace-nowrap rounded-md border border-brand bg-brand px-2.5 py-2 text-sm font-extrabold text-white" href="#">
          {match.action}
        </a>
        <a className="whitespace-nowrap rounded-md border border-[#d9e2ee] px-2.5 py-2 text-sm font-extrabold text-brand-deeper" href="#">
          数据
        </a>
      </div>
    </article>
  );
}

function NewsPanel({ newsCategory, query, news: newsItems, onNewsCategoryChange }) {
  return (
    <Panel>
      <div className="flex flex-col gap-4 border-b border-[#d9e2ee] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1.5 text-xs font-extrabold uppercase text-brand">News Feed</p>
          <h2 className="text-xl font-extrabold">体育新闻</h2>
        </div>
        <TabGroup
          items={newsCategories}
          activeKey={newsCategory}
          onChange={onNewsCategoryChange}
          compact
        />
      </div>

      <div className="grid md:grid-cols-2">
        {newsItems.length ? (
          newsItems.map((item, index) => <NewsItem key={item.id} item={item} index={index} />)
        ) : (
          <EmptyState>
            {query ? "没有找到相关新闻，换个关键词试试。" : "当前分类暂无新闻。"}
          </EmptyState>
        )}
      </div>
    </Panel>
  );
}

function NewsItem({ item, index }) {
  return (
    <article className={`min-h-32 border-b border-[#d9e2ee] p-4 ${index % 2 === 0 ? "md:border-r" : ""}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#667085]">
        <span className="rounded-full bg-[#eef4fb] px-2 py-1 text-brand-deeper">
          {categoryName(item.category)}
        </span>
        <span>{item.source}</span>
        <span>{item.time}</span>
      </div>
      <h3 className="my-2 text-[17px] font-extrabold leading-snug">{item.title}</h3>
      <p className="text-[#667085]">{item.desc}</p>
    </article>
  );
}

function VideoPanel({ videos: videoItems }) {
  return (
    <Panel id="videoPanel">
      <SideHead title="视频 / 集锦" />
      <div className="px-4 pb-4">
        {videoItems.length ? (
          videoItems.map((video) => (
            <article key={video.title} className="grid grid-cols-[86px_1fr] items-center gap-3 border-b border-[#d9e2ee] py-3 last:border-b-0">
              <div className="grid h-[54px] w-[86px] place-items-center rounded-md bg-[linear-gradient(135deg,#123c69,#1d7a6b)] font-black text-white">
                ▶
              </div>
              <div>
                <h3 className="mb-1 text-sm font-extrabold leading-snug">{video.title}</h3>
                <p className="text-xs text-[#667085]">{video.meta}</p>
              </div>
            </article>
          ))
        ) : (
          <EmptyState>没有找到相关视频。</EmptyState>
        )}
      </div>
    </Panel>
  );
}

function RankPanel({ items }) {
  return (
    <Panel id="rankPanel">
      <SideHead title="热门排行" />
      <ol className="m-0 list-none px-4 pb-4 [counter-reset:rank]">
        {items.length ? (
          items.map((item) => (
            <li key={item.id} className="grid grid-cols-[28px_1fr_auto] items-start gap-2.5 border-b border-[#d9e2ee] py-3 last:border-b-0 before:grid before:h-[22px] before:w-[22px] before:place-items-center before:rounded-md before:bg-[#eef4fb] before:text-xs before:font-black before:text-brand-deeper before:[content:counter(rank)] [counter-increment:rank] [&:nth-child(-n+3)]:before:bg-accent [&:nth-child(-n+3)]:before:text-white">
              <span className="font-extrabold">{item.title}</span>
              <span className="text-xs font-extrabold text-[#b7791f]">{item.heat}</span>
            </li>
          ))
        ) : (
          <li className="block py-8 text-center text-[#667085]">暂无排行结果</li>
        )}
      </ol>
    </Panel>
  );
}

function ShortcutPanel() {
  return (
    <Panel className="md:col-span-2 lg:col-span-1">
      <SideHead title="常用入口" />
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        {shortcuts.map((item) => (
          <a key={item} className="grid min-h-10 place-items-center rounded-md border border-[#d9e2ee] bg-[#eef4fb] font-extrabold text-brand-deeper" href="#">
            {item}
          </a>
        ))}
      </div>
    </Panel>
  );
}

function TabGroup({ items, activeKey, onChange, includeText = false, compact = false }) {
  return (
    <div className="hide-scrollbar flex w-full gap-1.5 overflow-x-auto pb-0.5 sm:w-auto" role="group">
      {items.map((item) => {
        const active = item.key === activeKey;

        return (
          <button
            key={item.key}
            className={`flex-none whitespace-nowrap rounded-md border px-3 font-extrabold transition ${
              compact ? "py-1.5 text-sm" : "py-2"
            } ${
              active
                ? "border-brand bg-brand text-white"
                : "border-[#d9e2ee] bg-white text-[#667085]"
            }`}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.key)}
          >
            {includeText && item.text ? `${item.label} ${item.text}` : item.label}
          </button>
        );
      })}
    </div>
  );
}

function Panel({ id, className = "", children }) {
  return (
    <section id={id} className={`rounded-lg border border-[#d9e2ee] bg-white shadow-[0_8px_24px_rgba(24,34,48,0.05)] ${className}`}>
      {children}
    </section>
  );
}

function SideHead({ title }) {
  return (
    <div className="border-b border-[#d9e2ee] p-4 pb-3">
      <h2 className="text-xl font-extrabold">{title}</h2>
    </div>
  );
}

function EmptyState({ children }) {
  return <div className="px-4 py-8 text-center text-[#667085]">{children}</div>;
}
