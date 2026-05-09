import { createHash } from "node:crypto";
import { getPool } from "./db.js";

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
    sourceName: "BBC Sport Football",
    sourceKey: "bbc_football_rss",
    category: "football",
    url: "https://feeds.bbci.co.uk/sport/football/rss.xml",
  },
  {
    sourceName: "ESPN NBA",
    sourceKey: "espn_nba_rss",
    category: "basketball",
    url: "https://www.espn.com/espn/rss/nba/news",
  },
  {
    sourceName: "ESPN Soccer",
    sourceKey: "espn_soccer_rss",
    category: "football",
    url: "https://www.espn.com/espn/rss/soccer/news",
  },
];

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
  const timeout = setTimeout(() => controller.abort(), 12000);

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
  const timeout = setTimeout(() => controller.abort(), 4000);

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
    league: String(league || source.leagueFallback),
    homeTeam: home.team.displayName,
    awayTeam: away.team.displayName,
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
    league: event.strLeague ?? source.leagueFallback,
    homeTeam: event.strHomeTeam,
    awayTeam: event.strAwayTeam,
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
      const guid = stripHtml(pickTag(item, "guid")) || sourceUrl;
      const publishedAt = pickTag(item, "pubDate");
      const imageUrl =
        pickAttr(item, "media:thumbnail", "url") ||
        pickAttr(item, "media:content", "url") ||
        pickAttr(item, "enclosure", "url") ||
        null;

      return {
        externalId: hash(`${feed.sourceKey}:${guid}`),
        sport: feed.category,
        category: feed.category,
        title,
        summary,
        sourceName: feed.sourceName,
        sourceUrl,
        imageUrl,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        heat: Math.max(1, 1000 - index * 37),
        raw: { guid, feed: feed.sourceKey },
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

    raw.matchSources = {
      espn: espnMatches.length,
      theSportsDb: theSportsDbMatches.length,
    };
    raw.articleSources = { rss: articles.length };

    const matchResult = await upsertMatches(pool, [
      ...espnMatches,
      ...theSportsDbMatches,
    ]);
    const articleResult = await upsertArticles(pool, articles);

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
