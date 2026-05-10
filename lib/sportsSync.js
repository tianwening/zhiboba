import { createHash } from "node:crypto";
import { getPool } from "./db.js";
import { translateLeague, translateTeam } from "./sportsI18n.js";

const ESPN_SCOREBOARDS = [
  {
    sourceKey: "espn_soccer_england",
    sport: "football",
    leagueFallback: "英超",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard",
  },
  {
    sourceKey: "espn_soccer_champions",
    sport: "football",
    leagueFallback: "欧冠",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard",
  },
  {
    sourceKey: "espn_nba",
    sport: "basketball",
    leagueFallback: "NBA",
    url: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  },
];

const RSS_FEEDS = [
  {
    sourceName: "中新网体育",
    sourceKey: "chinanews_sports",
    category: "auto",
    contentType: "news",
    url: "https://www.chinanews.com.cn/rss/sports.xml",
  },
  {
    sourceName: "虎扑电竞",
    sourceKey: "hupu_esports",
    category: "esports",
    contentType: "news",
    url: "https://rsshub.rssforever.com/hupu/all/all-gg",
  },
];

const LEGACY_ENGLISH_SOURCES = [
  "BBC Sport Football",
  "ESPN NBA",
  "ESPN Soccer",
];

const ZHIBO8_RECORDING_SOURCES = [
  {
    sourceKey: "zhibo8_luxiang_nba",
    category: "basketball",
    label: "篮球",
    url: "https://www.zhibo8.com/nba/luxiang.htm",
  },
  {
    sourceKey: "zhibo8_luxiang_zuqiu",
    category: "football",
    label: "足球",
    url: "https://www.zhibo8.com/zuqiu/luxiang.htm",
  },
];

const CATEGORY_KEYWORDS = {
  basketball: [
    "篮球",
    "NBA",
    "CBA",
    "男篮",
    "女篮",
    "篮协",
    "湖人",
    "勇士",
    "火箭",
    "独行侠",
    "凯尔特人",
    "森林狼",
  ],
  football: [
    "足球",
    "男足",
    "女足",
    "国足",
    "中超",
    "英超",
    "西甲",
    "意甲",
    "德甲",
    "欧冠",
    "亚冠",
    "世界杯",
    "亚洲杯",
    "梅西",
    "C罗",
  ],
  esports: [
    "电竞",
    "英雄联盟",
    "王者荣耀",
    "LPL",
    "KPL",
    "LOL",
    "DOTA",
    "CS2",
    "无畏契约",
  ],
};

const THESPORTSDB_LEAGUES = [
  { id: "4328", sport: "football", leagueFallback: "英超" },
  { id: "4387", sport: "basketball", leagueFallback: "NBA" },
];

function envValue(name) {
  return globalThis.Netlify?.env?.get(name) ?? process.env[name];
}

function hash(value) {
  return createHash("sha1").update(String(value)).digest("hex");
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseDateOrNull(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pickTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeHtml(match?.[1] ?? "");
}

function pickAttr(xml, tag, attr) {
  const match = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, "i"));
  return decodeHtml(match?.[1] ?? "");
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "zhiboba-content-sync/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/rss+xml, application/xml, text/xml",
        "user-agent": "zhiboba-content-sync/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html",
        "user-agent": "zhiboba-content-sync/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return "";
    }

    return response.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function inferCategory(feed, title, summary) {
  if (feed.category !== "auto") {
    return feed.category;
  }

  const haystack = `${title} ${summary}`.toLowerCase();
  return Object.entries(CATEGORY_KEYWORDS).find(([, keywords]) =>
    keywords.some((keyword) => haystack.includes(keyword.toLowerCase())),
  )?.[0] ?? null;
}

function pickMetaImage(html) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtml(match[1]);
    }
  }

  return null;
}

function espnStatus(event) {
  const state = event?.status?.type?.state;
  if (state === "in") {
    return "live";
  }
  if (state === "post") {
    return "finished";
  }
  return "upcoming";
}

function normalizeEspnEvent(event, source) {
  const competition = event.competitions?.[0] ?? {};
  const competitors = competition.competitors ?? [];
  const home = competitors.find((item) => item.homeAway === "home") ?? competitors[0];
  const away = competitors.find((item) => item.homeAway === "away") ?? competitors[1];

  if (!home?.team?.displayName || !away?.team?.displayName) {
    return null;
  }

  const league =
    event.league?.name ??
    event.season?.slug ??
    competition.league?.name ??
    source.leagueFallback;
  const imageUrl = event.thumbnail ?? home.team.logo ?? away.team.logo ?? null;
  const sourceUrl = event.links?.[0]?.href ?? competition.links?.[0]?.href ?? source.url;
  const homeScore = Number.parseInt(home.score, 10);
  const awayScore = Number.parseInt(away.score, 10);

  return {
    externalId: String(event.id ?? hash(`${source.sourceKey}:${event.name}:${event.date}`)),
    sport: source.sport,
    league: translateLeague(String(league || source.leagueFallback)),
    homeTeam: translateTeam(home.team.displayName),
    awayTeam: translateTeam(away.team.displayName),
    kickoffAt: event.date ? new Date(event.date) : null,
    status: espnStatus(event),
    homeScore: Number.isFinite(homeScore) ? homeScore : null,
    awayScore: Number.isFinite(awayScore) ? awayScore : null,
    imageUrl,
    sourceKey: source.sourceKey,
    sourceUrl,
    raw: event,
  };
}

async function fetchEspnMatches() {
  const batches = await Promise.allSettled(
    ESPN_SCOREBOARDS.map(async (source) => {
      const payload = await fetchJson(source.url);
      return (payload.events ?? [])
        .map((event) => normalizeEspnEvent(event, source))
        .filter(Boolean);
    }),
  );

  return batches.flatMap((batch) => (batch.status === "fulfilled" ? batch.value : []));
}

function normalizeTheSportsDbEvent(event, sourceKey, source) {
  if (!event?.strHomeTeam || !event?.strAwayTeam) {
    return null;
  }

  const dateTime = event.strTimestamp ?? `${event.dateEvent ?? ""}T${event.strTime ?? "00:00:00"}`;
  const homeScore = Number.parseInt(event.intHomeScore, 10);
  const awayScore = Number.parseInt(event.intAwayScore, 10);

  return {
    externalId: String(event.idEvent ?? hash(`${sourceKey}:${event.strEvent}:${dateTime}`)),
    sport: source.sport,
    league: translateLeague(event.strLeague ?? source.leagueFallback),
    homeTeam: translateTeam(event.strHomeTeam),
    awayTeam: translateTeam(event.strAwayTeam),
    kickoffAt: dateTime ? new Date(dateTime) : null,
    status:
      event.strStatus === "Match Finished" ||
      (Number.isFinite(homeScore) && Number.isFinite(awayScore))
        ? "finished"
        : "upcoming",
    homeScore: Number.isFinite(homeScore) ? homeScore : null,
    awayScore: Number.isFinite(awayScore) ? awayScore : null,
    imageUrl: event.strThumb ?? event.strPoster ?? event.strFanart ?? null,
    sourceKey,
    sourceUrl: event.strWebsite ? `https://${event.strWebsite.replace(/^https?:\/\//, "")}` : null,
    raw: event,
  };
}

async function fetchTheSportsDbMatches() {
  const key = envValue("THESPORTSDB_API_KEY") || "3";
  const batches = await Promise.allSettled(
    THESPORTSDB_LEAGUES.map(async (source) => {
      const sourceKey = `thesportsdb_${source.id}`;
      const url = `https://www.thesportsdb.com/api/v1/json/${key}/eventsnextleague.php?id=${source.id}`;
      const payload = await fetchJson(url);
      return (payload.events ?? [])
        .map((event) => normalizeTheSportsDbEvent(event, sourceKey, source))
        .filter(Boolean);
    }),
  );

  return batches.flatMap((batch) => (batch.status === "fulfilled" ? batch.value : []));
}

function parseRssItems(xml, feed) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)]
    .slice(0, 20)
    .map(([item], index) => {
      const title = stripHtml(pickTag(item, "title"));
      const sourceUrl = pickTag(item, "link");
      if (!title || !sourceUrl) {
        return null;
      }

      const summary = stripHtml(pickTag(item, "description")).slice(0, 180);
      const category = inferCategory(feed, title, summary);
      if (!category) {
        return null;
      }

      const guid = stripHtml(pickTag(item, "guid")) || sourceUrl;
      const publishedAt = pickTag(item, "pubDate");
      const imageUrl =
        pickAttr(item, "media:thumbnail", "url") ||
        pickAttr(item, "media:content", "url") ||
        pickAttr(item, "enclosure", "url") ||
        null;

      return {
        externalId: hash(`${feed.sourceKey}:${guid}`),
        sport: category,
        category,
        title,
        summary,
        sourceName: feed.sourceName,
        sourceUrl,
        imageUrl,
        publishedAt: parseDateOrNull(publishedAt),
        heat: Math.max(1, 1000 - index * 37),
        raw: {
          guid,
          feed: feed.sourceKey,
          contentType: feed.contentType,
        },
      };
    })
    .filter(Boolean);
}

async function fetchRssArticles() {
  const batches = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const items = parseRssItems(await fetchText(feed.url), feed);
      const enriched = await Promise.all(
        items.map(async (item, index) => {
          if (item.imageUrl || index > 2) {
            return item;
          }

          const imageUrl = pickMetaImage(await fetchHtml(item.sourceUrl));
          return imageUrl ? { ...item, imageUrl } : item;
        }),
      );

      return enriched;
    }),
  );

  return batches.flatMap((batch) => (batch.status === "fulfilled" ? batch.value : []));
}

function absoluteUrl(url, baseUrl) {
  if (!url) {
    return baseUrl;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  return new URL(url, baseUrl).toString();
}

function parseZhibo8RecordingDate(label) {
  const match = String(label).match(/(\d{1,2})月(\d{1,2})日/);
  if (!match) {
    return new Date();
  }

  const year = new Date().getFullYear();
  return new Date(Date.UTC(year, Number(match[1]) - 1, Number(match[2]), 4));
}

function parseZhibo8Recordings(html, source) {
  return [...html.matchAll(/<div class="box">([\s\S]*?)<\/div><\/div>/gi)]
    .slice(0, 6)
    .flatMap(([block], blockIndex) => {
      const dateLabel = stripHtml(pickTag(block, "h2"));
      const publishedAt = parseZhibo8RecordingDate(dateLabel);

      return [...block.matchAll(/<b>([\s\S]*?)<a\s+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a><\/b>/gi)]
        .slice(0, 8)
        .map(([, teamHtml, href, actionHtml], index) => {
          const team = stripHtml(teamHtml);
          const action = stripHtml(actionHtml);
          const sourceUrl = absoluteUrl(href, source.url);
          const title = `${dateLabel} ${team} ${action}`.replace(/\s+/g, " ").trim();

          return {
            externalId: hash(`${source.sourceKey}:${sourceUrl}`),
            sport: source.category,
            category: source.category,
            title,
            summary: `直播吧${source.label}录像回放`,
            sourceName: "直播吧录像",
            sourceUrl,
            imageUrl: null,
            publishedAt,
            heat: Math.max(1, 800 - blockIndex * 80 - index * 9),
            raw: {
              feed: source.sourceKey,
              contentType: "recording",
            },
          };
        });
    });
}

async function fetchZhibo8Recordings() {
  const batches = await Promise.allSettled(
    ZHIBO8_RECORDING_SOURCES.map(async (source) =>
      parseZhibo8Recordings(await fetchHtml(source.url), source),
    ),
  );

  return batches.flatMap((batch) => (batch.status === "fulfilled" ? batch.value : []));
}

async function upsertMatches(pool, matches) {
  let inserted = 0;
  let updated = 0;

  for (const match of matches) {
    const { rows } = await pool.query(
      `
        insert into public.sports_matches
          (external_id, sport, league, home_team, away_team, kickoff_at, status, home_score, away_score, image_url, source_key, source_url, raw)
        values
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        on conflict (source_key, external_id) do update set
          sport = excluded.sport,
          league = excluded.league,
          home_team = excluded.home_team,
          away_team = excluded.away_team,
          kickoff_at = excluded.kickoff_at,
          status = excluded.status,
          home_score = excluded.home_score,
          away_score = excluded.away_score,
          image_url = coalesce(excluded.image_url, public.sports_matches.image_url),
          source_url = coalesce(excluded.source_url, public.sports_matches.source_url),
          raw = excluded.raw
        returning (xmax = 0) as inserted
      `,
      [
        match.externalId,
        match.sport,
        match.league,
        match.homeTeam,
        match.awayTeam,
        match.kickoffAt,
        match.status,
        match.homeScore,
        match.awayScore,
        match.imageUrl,
        match.sourceKey,
        match.sourceUrl,
        match.raw,
      ],
    );

    if (rows[0]?.inserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  return { inserted, updated };
}

async function clearLegacyEnglishArticles(pool) {
  const { rowCount } = await pool.query(
    `
      delete from public.sports_articles
      where source_name = any($1::text[])
    `,
    [LEGACY_ENGLISH_SOURCES],
  );

  return rowCount;
}

async function upsertArticles(pool, articles) {
  let inserted = 0;
  let updated = 0;

  for (const article of articles) {
    const { rows } = await pool.query(
      `
        insert into public.sports_articles
          (external_id, sport, category, title, summary, source_name, source_url, image_url, published_at, heat, raw)
        values
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        on conflict (source_name, external_id) do update set
          sport = excluded.sport,
          category = excluded.category,
          title = excluded.title,
          summary = excluded.summary,
          source_url = excluded.source_url,
          image_url = coalesce(excluded.image_url, public.sports_articles.image_url),
          published_at = excluded.published_at,
          heat = excluded.heat,
          raw = excluded.raw
        returning (xmax = 0) as inserted
      `,
      [
        article.externalId,
        article.sport,
        article.category,
        article.title,
        article.summary,
        article.sourceName,
        article.sourceUrl,
        article.imageUrl,
        article.publishedAt,
        article.heat,
        article.raw,
      ],
    );

    if (rows[0]?.inserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  return { inserted, updated };
}

async function recordSyncRun(pool, run) {
  await pool.query(
    `
      insert into public.sports_sync_runs
        (source_key, status, inserted_count, updated_count, error_message, started_at, finished_at, raw)
      values
        ($1, $2, $3, $4, $5, $6, now(), $7)
    `,
    [
      run.sourceKey,
      run.status,
      run.insertedCount,
      run.updatedCount,
      run.errorMessage,
      run.startedAt,
      run.raw,
    ],
  );
}

export async function syncSportsContent() {
  const pool = getPool();
  const startedAt = new Date();
  let insertedCount = 0;
  let updatedCount = 0;
  const errors = [];
  const raw = {};

  try {
    const espnMatches = await fetchEspnMatches();
    const theSportsDbMatches = await fetchTheSportsDbMatches();
    const articles = await fetchRssArticles();
    const recordings = await fetchZhibo8Recordings();
    const clearedLegacyArticles = await clearLegacyEnglishArticles(pool);

    raw.matchSources = {
      espn: espnMatches.length,
      theSportsDb: theSportsDbMatches.length,
    };
    raw.articleSources = {
      rss: articles.length,
      recordings: recordings.length,
      clearedLegacyArticles,
    };

    const matchResult = await upsertMatches(pool, [
      ...espnMatches,
      ...theSportsDbMatches,
    ]);
    const articleResult = await upsertArticles(pool, [
      ...articles,
      ...recordings,
    ]);

    insertedCount = matchResult.inserted + articleResult.inserted;
    updatedCount = matchResult.updated + articleResult.updated;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const status =
    errors.length && insertedCount + updatedCount === 0
      ? "failed"
      : errors.length
        ? "partial"
        : "success";

  await recordSyncRun(pool, {
    sourceKey: "sports_content",
    status,
    insertedCount,
    updatedCount,
    errorMessage: errors.join("; ") || null,
    startedAt,
    raw,
  });

  return {
    status,
    insertedCount,
    updatedCount,
    errors,
    raw,
  };
}
