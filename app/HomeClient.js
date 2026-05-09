"use client";

/* eslint-disable @next/next/no-img-element -- Syndicated remote image hosts are not known ahead of time. */

import { useEffect, useMemo, useRef, useState } from "react";

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

const newsCategories = [
  { key: "all", label: "全部" },
  { key: "football", label: "足球" },
  { key: "basketball", label: "篮球" },
  { key: "esports", label: "电竞" },
  { key: "general", label: "综合" },
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
    title: "欧洲赛事追踪",
    desc: "同步赛程、比分和赛前信息。",
    color: "border-t-brand",
  },
  {
    label: "篮球热榜",
    title: "NBA 每日赛程",
    desc: "关注开赛时间和赛后比分。",
    color: "border-t-accent",
  },
  {
    label: "实时内容",
    title: "新闻与图片更新",
    desc: "定时同步公开来源内容。",
    color: "border-t-[#2563a8]",
  },
];

const shortcuts = ["完场比分", "赛程日历", "伤停名单", "积分榜", "转会动态", "直播预约"];

function dateTabs() {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });

  return [
    { key: "yesterday", label: "昨天", text: formatter.format(offsetDate(-1)) },
    { key: "today", label: "今天", text: formatter.format(offsetDate(0)) },
    { key: "tomorrow", label: "明天", text: formatter.format(offsetDate(1)) },
  ];
}

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

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

function apiUrl(path, params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      search.set(key, value);
    }
  });

  const suffix = search.toString();
  return suffix ? `${path}?${suffix}` : path;
}

function formatUpdatedAt(value) {
  if (!value) {
    return "等待同步";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function useSportsContent({
  date,
  sport,
  status,
  newsCategory,
  query,
  initialMatches,
  initialNews,
  initialVideos,
  initialUpdatedAt,
}) {
  const isFirstLoad = useRef(true);
  const [state, setState] = useState({
    matches: initialMatches,
    news: initialNews,
    videos: initialVideos,
    loading: false,
    error: "",
    updatedAt: initialUpdatedAt,
  });

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return undefined;
    }

    const controller = new AbortController();

    async function load() {
      setState((current) => ({ ...current, loading: true, error: "" }));

      try {
        const matchUrl = apiUrl("/api/matches", {
          date,
          sport,
          status,
          q: query,
        });
        const newsUrl = apiUrl("/api/news", {
          category: newsCategory,
          q: query,
        });
        const videoUrl = apiUrl("/api/videos", { q: query });

        const [matchResponse, newsResponse, videoResponse] = await Promise.all([
          fetch(matchUrl, { signal: controller.signal }),
          fetch(newsUrl, { signal: controller.signal }),
          fetch(videoUrl, { signal: controller.signal }),
        ]);

        if (!matchResponse.ok || !newsResponse.ok || !videoResponse.ok) {
          throw new Error("内容加载失败");
        }

        const [matchPayload, newsPayload, videoPayload] = await Promise.all([
          matchResponse.json(),
          newsResponse.json(),
          videoResponse.json(),
        ]);

        setState({
          matches: matchPayload.matches ?? [],
          news: newsPayload.articles ?? [],
          videos: videoPayload.videos ?? [],
          loading: false,
          error: "",
          updatedAt:
            matchPayload.updatedAt ?? newsPayload.updatedAt ?? videoPayload.updatedAt ?? "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setState((current) => ({
          ...current,
          loading: false,
          error: "暂时无法加载真实内容，请稍后刷新。",
        }));
      }
    }

    load();
    return () => controller.abort();
  }, [date, newsCategory, query, sport, status]);

  return state;
}

export default function HomeClient({
  initialMatches = [],
  initialNews = [],
  initialVideos = [],
  initialUpdatedAt = "",
}) {
  const [sport, setSport] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("today");
  const [newsCategory, setNewsCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [nav, setNav] = useState("home");

  const normalizedQuery = normalize(submittedQuery);
  const tabs = useMemo(() => dateTabs(), []);
  const { matches, news, videos, loading, error, updatedAt } = useSportsContent({
    date,
    sport,
    status,
    newsCategory,
    query: normalizedQuery,
    initialMatches,
    initialNews,
    initialVideos,
    initialUpdatedAt,
  });

  const rankedNews = useMemo(
    () => [...news].sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0)).slice(0, 6),
    [news],
  );

  function clearSearch() {
    setQuery("");
    setSubmittedQuery("");
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
    setSubmittedQuery(query);
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

      <main className="mx-auto max-w-[1240px] px-3 py-3 sm:px-5 sm:py-5">
        <HeroBand updatedAt={updatedAt} />
        <FeatureGrid />

        {error ? (
          <div className="mb-4 rounded-lg border border-[#f0c6bd] bg-[#fff5f2] px-4 py-3 text-sm font-bold text-accent">
            {error}
          </div>
        ) : null}

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="grid gap-4" aria-label="赛事和新闻">
            <SchedulePanel
              date={date}
              dates={tabs}
              sport={sport}
              status={status}
              query={normalizedQuery}
              matches={matches}
              loading={loading}
              onDateChange={setDate}
              onSportChange={setSport}
              onStatusChange={setStatus}
            />
            <NewsPanel
              newsCategory={newsCategory}
              query={normalizedQuery}
              news={news}
              loading={loading}
              onNewsCategoryChange={setNewsCategory}
            />
          </section>

          <aside className="grid gap-4 md:grid-cols-2 lg:grid-cols-1" aria-label="侧栏内容">
            <VideoPanel videos={videos} loading={loading} />
            <RankPanel items={rankedNews} loading={loading} />
            <ShortcutPanel />
          </aside>
        </div>
      </main>

      <footer className="px-5 pb-8 pt-4 text-center text-xs text-[#667085] sm:text-sm">
        <p>
          内容来自公开体育数据和新闻源，仅展示摘要、来源链接与远程图片。最近同步：
          {formatUpdatedAt(updatedAt)}
        </p>
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
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-2 px-3 py-2.5 sm:px-5 lg:min-h-[68px] lg:grid-cols-[auto_minmax(0,1fr)_280px] lg:items-center lg:gap-5 lg:py-0">
        <a
          className="flex min-w-0 items-center gap-2"
          href="#"
          aria-label="球赛速递首页"
          onClick={(event) => {
            event.preventDefault();
            onNav("home");
          }}
        >
          <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-white text-sm font-extrabold text-brand-deeper sm:h-[38px] sm:w-[38px] sm:text-base">
            速
          </span>
          <span className="min-w-0">
            <strong className="block text-lg leading-none sm:text-xl">球赛速递</strong>
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
                className={`flex-none whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-bold text-white/80 transition hover:bg-white/15 hover:text-white sm:px-3 sm:py-2 ${
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
          className="flex h-10 w-full overflow-hidden rounded-lg border border-white/20 bg-white/10 sm:h-11"
          role="search"
          onSubmit={onSearchSubmit}
        >
          <input
            className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/60 sm:text-base"
            type="search"
            placeholder="搜索球队、赛事、新闻"
            aria-label="搜索"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <button
            className="w-14 flex-none bg-white text-sm font-bold text-brand-deeper sm:w-16 sm:text-base"
            type="submit"
          >
            搜索
          </button>
        </form>
      </div>
    </header>
  );
}

function HeroBand({ updatedAt }) {
  return (
    <section className="mb-4 flex flex-col items-start justify-between gap-5 rounded-lg bg-[linear-gradient(120deg,rgba(17,89,77,0.95),rgba(29,122,107,0.88)),linear-gradient(45deg,#0f3f3a,#2563a8)] p-4 text-white shadow-portal sm:min-h-40 sm:p-6 lg:flex-row lg:items-end" aria-labelledby="today-title">
      <div>
        <p className="mb-1.5 text-xs font-extrabold uppercase text-white/70">Live Sports Hub</p>
        <h1 id="today-title" className="max-w-[680px] [overflow-wrap:anywhere] text-2xl font-extrabold leading-tight sm:text-[34px]">
          真实赛程、比分和体育要闻一屏掌握
        </h1>
        <p className="mt-3 max-w-[680px] text-sm leading-6 text-white/78 sm:text-base">
          足球和篮球内容定时同步，保留来源链接与远程图片，方便后续扩展更多赛事。
        </p>
      </div>
      <div className="grid w-full gap-2 text-sm lg:w-[330px]" aria-label="同步状态">
        {["足球赛程实时入库", "篮球赛果自动更新", `最近同步 ${formatUpdatedAt(updatedAt)}`].map((item) => (
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
    <section className="mb-4 grid gap-3 md:grid-cols-3" aria-label="热门专题">
      {featureCards.map((card) => (
        <article key={card.title} className={`min-h-[116px] rounded-lg border border-[#d9e2ee] ${card.color} border-t-4 bg-white p-4 shadow-[0_8px_20px_rgba(24,34,48,0.05)]`}>
          <span className="mb-3 inline-block text-xs font-extrabold text-[#667085]">{card.label}</span>
          <h2 className="mb-1 text-base font-extrabold sm:text-lg">{card.title}</h2>
          <p className="text-sm leading-6 text-[#667085] sm:text-base">{card.desc}</p>
        </article>
      ))}
    </section>
  );
}

function SchedulePanel({
  date,
  dates,
  sport,
  status,
  query,
  matches: matchItems,
  loading,
  onDateChange,
  onSportChange,
  onStatusChange,
}) {
  return (
    <Panel id="schedulePanel">
      <div className="flex flex-col gap-3 border-b border-[#d9e2ee] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-extrabold uppercase text-brand">Match Center</p>
          <h2 className="text-lg font-extrabold sm:text-xl">赛事中心</h2>
        </div>
        <TabGroup items={dates} activeKey={date} onChange={onDateChange} includeText />
      </div>

      <div className="flex flex-col gap-3 border-b border-[#d9e2ee] p-4 sm:flex-row sm:justify-between">
        <TabGroup items={sports} activeKey={sport} onChange={onSportChange} />
        <TabGroup items={statuses} activeKey={status} onChange={onStatusChange} compact />
      </div>

      <div className="grid" aria-live="polite">
        {loading ? (
          <LoadingRows label="正在加载真实赛程" />
        ) : matchItems.length ? (
          matchItems.map((match) => <MatchCard key={`${match.sourceKey}-${match.externalId}`} match={match} />)
        ) : (
          <EmptyState>
            {query ? "没有找到相关比赛，换个关键词试试。" : "当前筛选下暂无比赛，等待下一次同步。"}
          </EmptyState>
        )}
      </div>
    </Panel>
  );
}

function MatchCard({ match }) {
  return (
    <article className="grid gap-3 border-b border-[#d9e2ee] p-4 last:border-b-0 sm:grid-cols-[76px_1fr_auto] sm:items-center lg:grid-cols-[86px_1fr_auto]">
      <div className="flex items-center justify-between gap-2 sm:block">
        <div className="text-xl font-extrabold leading-none sm:text-2xl">{match.time}</div>
        <span className={`inline-flex min-w-[66px] justify-center rounded-full px-2 py-1 text-xs font-extrabold sm:mt-2 ${statusClass[match.status]}`}>
          {statusLabel[match.status] ?? "未开始"}
        </span>
      </div>
      <div className="min-w-0">
        <div className="mb-2 flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate rounded-md bg-[#eef4fb] px-2 py-1 text-xs font-extrabold text-[#667085]">
            {match.league}
          </span>
          <span className="text-xs font-bold text-[#667085]">{categoryName(match.sport)}</span>
        </div>
        <h3 className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-[16px] font-extrabold leading-snug sm:text-[17px]">
          <span className="truncate text-left">{match.home}</span>
          <span className="rounded-md bg-[#fff4ef] px-2 py-1 text-center font-black text-accent">
            {match.score}
          </span>
          <span className="truncate text-right">{match.away}</span>
        </h3>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {match.sourceUrl ? (
          <a className="whitespace-nowrap rounded-md border border-brand bg-brand px-3 py-2 text-sm font-extrabold text-white" href={match.sourceUrl} target="_blank" rel="noreferrer">
            {match.action}
          </a>
        ) : (
          <span className="whitespace-nowrap rounded-md border border-brand bg-brand px-3 py-2 text-sm font-extrabold text-white">
            {match.action}
          </span>
        )}
        <span className="whitespace-nowrap rounded-md border border-[#d9e2ee] px-3 py-2 text-sm font-extrabold text-brand-deeper">
          数据
        </span>
      </div>
    </article>
  );
}

function NewsPanel({ newsCategory, query, news: newsItems, loading, onNewsCategoryChange }) {
  return (
    <Panel>
      <div className="flex flex-col gap-3 border-b border-[#d9e2ee] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-extrabold uppercase text-brand">News Feed</p>
          <h2 className="text-lg font-extrabold sm:text-xl">体育新闻</h2>
        </div>
        <TabGroup
          items={newsCategories}
          activeKey={newsCategory}
          onChange={onNewsCategoryChange}
          compact
        />
      </div>

      <div className="grid md:grid-cols-2">
        {loading ? (
          <LoadingRows label="正在加载新闻" />
        ) : newsItems.length ? (
          newsItems.map((item, index) => <NewsItem key={`${item.source}-${item.externalId}`} item={item} index={index} />)
        ) : (
          <EmptyState>
            {query ? "没有找到相关新闻，换个关键词试试。" : "当前分类暂无新闻，等待下一次同步。"}
          </EmptyState>
        )}
      </div>
    </Panel>
  );
}

function NewsItem({ item, index }) {
  return (
    <article className={`grid gap-3 border-b border-[#d9e2ee] p-4 ${index % 2 === 0 ? "md:border-r" : ""}`}>
      <ImageFrame src={item.imageUrl} alt={item.title} />
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#667085]">
        <span className="rounded-full bg-[#eef4fb] px-2 py-1 text-brand-deeper">
          {categoryName(item.category)}
        </span>
        <span>{item.source}</span>
        <span>{item.time}</span>
      </div>
      <h3 className="text-[17px] font-extrabold leading-snug">
        <a href={item.sourceUrl} target="_blank" rel="noreferrer">
          {item.title}
        </a>
      </h3>
      <p className="line-clamp-3 text-sm leading-6 text-[#667085] sm:text-base">{item.desc || "来源暂未提供摘要，请打开原文查看详情。"}</p>
    </article>
  );
}

function ImageFrame({ src, alt }) {
  if (!src) {
    return (
      <div className="grid aspect-[16/9] w-full place-items-center rounded-md bg-[linear-gradient(135deg,#eef4fb,#dce8f4)] text-sm font-extrabold text-brand-deeper">
        体育速递
      </div>
    );
  }

  return (
    <img
      className="aspect-[16/9] w-full rounded-md object-cover"
      src={src}
      alt={alt}
      loading="lazy"
    />
  );
}

function VideoPanel({ videos: videoItems, loading }) {
  return (
    <Panel id="videoPanel">
      <SideHead title="图片 / 集锦" />
      <div className="px-4 pb-4">
        {loading ? (
          <LoadingRows label="正在加载图片内容" compact />
        ) : videoItems.length ? (
          videoItems.map((video) => (
            <article key={`${video.source}-${video.id}`} className="grid grid-cols-[86px_1fr] items-center gap-3 border-b border-[#d9e2ee] py-3 last:border-b-0">
              <a href={video.sourceUrl} target="_blank" rel="noreferrer" aria-label={video.title}>
                {video.imageUrl ? (
                  <img className="h-[54px] w-[86px] rounded-md object-cover" src={video.imageUrl} alt={video.title} loading="lazy" />
                ) : (
                  <div className="grid h-[54px] w-[86px] place-items-center rounded-md bg-[linear-gradient(135deg,#123c69,#1d7a6b)] text-xs font-black text-white">
                    图片
                  </div>
                )}
              </a>
              <div className="min-w-0">
                <h3 className="mb-1 line-clamp-2 text-sm font-extrabold leading-snug">{video.title}</h3>
                <p className="truncate text-xs text-[#667085]">{video.meta}</p>
              </div>
            </article>
          ))
        ) : (
          <EmptyState>暂无带图内容。</EmptyState>
        )}
      </div>
    </Panel>
  );
}

function RankPanel({ items, loading }) {
  return (
    <Panel id="rankPanel">
      <SideHead title="热门排行" />
      <ol className="m-0 list-none px-4 pb-4 [counter-reset:rank]">
        {loading ? (
          <li>
            <LoadingRows label="正在加载排行" compact />
          </li>
        ) : items.length ? (
          items.map((item) => (
            <li key={`${item.source}-${item.externalId}`} className="grid grid-cols-[28px_1fr_auto] items-start gap-2.5 border-b border-[#d9e2ee] py-3 last:border-b-0 before:grid before:h-[22px] before:w-[22px] before:place-items-center before:rounded-md before:bg-[#eef4fb] before:text-xs before:font-black before:text-brand-deeper before:[content:counter(rank)] [counter-increment:rank] [&:nth-child(-n+3)]:before:bg-accent [&:nth-child(-n+3)]:before:text-white">
              <a className="line-clamp-2 font-extrabold" href={item.sourceUrl} target="_blank" rel="noreferrer">
                {item.title}
              </a>
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
          <a key={item} className="grid min-h-10 place-items-center rounded-md border border-[#d9e2ee] bg-[#eef4fb] text-sm font-extrabold text-brand-deeper sm:text-base" href="#">
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
            className={`flex-none whitespace-nowrap rounded-md border px-2.5 font-extrabold transition sm:px-3 ${
              compact ? "py-1.5 text-sm" : "py-2 text-sm sm:text-base"
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
    <section id={id} className={`overflow-hidden rounded-lg border border-[#d9e2ee] bg-white shadow-[0_8px_24px_rgba(24,34,48,0.05)] ${className}`}>
      {children}
    </section>
  );
}

function SideHead({ title }) {
  return (
    <div className="border-b border-[#d9e2ee] p-4 pb-3">
      <h2 className="text-lg font-extrabold sm:text-xl">{title}</h2>
    </div>
  );
}

function LoadingRows({ label, compact = false }) {
  return (
    <div className={`grid gap-2 px-4 ${compact ? "py-4" : "py-8"} text-sm font-bold text-[#667085]`}>
      <span>{label}</span>
      <span className="h-2 rounded-full bg-[#eef4fb]" />
      <span className="h-2 w-2/3 rounded-full bg-[#eef4fb]" />
    </div>
  );
}

function EmptyState({ children }) {
  return <div className="px-4 py-8 text-center text-sm text-[#667085] sm:text-base">{children}</div>;
}
