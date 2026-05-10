import { getPool } from "./db.js";
import { translateLeague, translateTeam } from "./sportsI18n.js";

const CATEGORY_KEYS = new Set([
  "football",
  "basketball",
  "esports",
]);

const STATUS_KEYS = new Set(["upcoming", "live", "finished"]);
const DISPLAY_TIME_ZONE = "Asia/Shanghai";

function clampLimit(value, fallback = 30, max = 80) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.trunc(parsed), max);
}

function normalizeKey(value, allowedKeys, fallback = "all") {
  const key = String(value ?? "").trim().toLowerCase();
  return allowedKeys.has(key) ? key : fallback;
}

function dateRange(value) {
  let dateKey = value;
  if (value === "yesterday") {
    dateKey = shanghaiDateKey(-1);
  } else if (value === "tomorrow") {
    dateKey = shanghaiDateKey(1);
  } else if (value !== "today" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    dateKey = shanghaiDateKey(0);
  } else if (value === "today") {
    dateKey = shanghaiDateKey(0);
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  return [
    new Date(Date.UTC(year, month - 1, day, -8, 0, 0)),
    new Date(Date.UTC(year, month - 1, day + 1, -8, 0, 0)),
  ];
}

function shanghaiDateKey(offsetDays) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  const date = new Date(Date.UTC(parts.year, Number(parts.month) - 1, Number(parts.day) + offsetDays, 12));
  return date.toISOString().slice(0, 10);
}

function scoreLabel(row) {
  if (row.homeScore == null || row.awayScore == null) {
    return "VS";
  }
  return `${row.homeScore} - ${row.awayScore}`;
}

function matchAction(status) {
  if (status === "live") {
    return "直播中";
  }
  if (status === "finished") {
    return "赛后数据";
  }
  return "赛前情报";
}

function collectLinks(value, links = []) {
  if (!value || typeof value !== "object") {
    return links;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectLinks(item, links));
    return links;
  }

  if (typeof value.href === "string") {
    links.push({
      href: value.href,
      text: [
        value.text,
        value.shortText,
        Array.isArray(value.rel) ? value.rel.join(" ") : value.rel,
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  Object.values(value).forEach((item) => collectLinks(item, links));
  return links;
}

function safeHttpUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function matchDataUrl(row) {
  const links = collectLinks(row.raw);
  const preferred = links.find((link) =>
    /boxscore|statistics|stats|gamecast|summary|recap|matchstats|技术统计|比赛数据/i.test(
      `${link.text} ${link.href}`,
    ),
  );

  return safeHttpUrl(preferred?.href) ?? safeHttpUrl(row.sourceUrl);
}

function timeLabel(value) {
  if (!value) {
    return "待定";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: DISPLAY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function relativeTime(value) {
  if (!value) {
    return "刚刚";
  }

  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) {
    return "刚刚";
  }

  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} 小时前`;
  }

  return `${Math.round(hours / 24)} 天前`;
}

export async function listMatches(searchParams = {}) {
  const pool = getPool();
  const sport = normalizeKey(searchParams.sport, CATEGORY_KEYS);
  const status = normalizeKey(searchParams.status, STATUS_KEYS);
  const query = String(searchParams.q ?? searchParams.query ?? "").trim();
  const limit = clampLimit(searchParams.limit, 40);
  const [from, to] = dateRange(String(searchParams.date ?? "today"));

  const values = [from, to];
  const where = ["kickoff_at >= $1", "kickoff_at < $2"];

  if (sport !== "all") {
    values.push(sport);
    where.push(`sport = $${values.length}`);
  }

  if (status !== "all") {
    values.push(status);
    where.push(`status = $${values.length}`);
  }

  if (query) {
    values.push(`%${query}%`);
    where.push(
      `(league ilike $${values.length} or home_team ilike $${values.length} or away_team ilike $${values.length})`,
    );
  }

  values.push(limit);

  const { rows } = await pool.query(
    `
      select
        id,
        external_id as "externalId",
        sport,
        league,
        home_team as "home",
        away_team as "away",
        kickoff_at as "kickoffAt",
        status,
        home_score as "homeScore",
        away_score as "awayScore",
        image_url as "imageUrl",
        source_key as "sourceKey",
        source_url as "sourceUrl",
        raw,
        updated_at as "updatedAt"
      from public.sports_matches
      where ${where.join(" and ")}
      order by kickoff_at asc nulls last, id asc
      limit $${values.length}
    `,
    values,
  );

  return rows.map((row) => ({
    ...row,
    league: translateLeague(row.league),
    home: translateTeam(row.home),
    away: translateTeam(row.away),
    time: timeLabel(row.kickoffAt),
    score: scoreLabel(row),
    action: matchAction(row.status),
    dataUrl: matchDataUrl(row),
  }));
}

export async function listArticles(searchParams = {}) {
  const pool = getPool();
  const category = normalizeKey(searchParams.category, CATEGORY_KEYS);
  const query = String(searchParams.q ?? searchParams.query ?? "").trim();
  const limit = clampLimit(searchParams.limit, 30);

  const values = [];
  const where = ["coalesce(raw->>'contentType', 'news') = 'news'"];

  if (category !== "all") {
    values.push(category);
    where.push(`category = $${values.length}`);
  }

  if (query) {
    values.push(`%${query}%`);
    where.push(
      `(title ilike $${values.length} or summary ilike $${values.length} or source_name ilike $${values.length})`,
    );
  }

  values.push(limit);

  const { rows } = await pool.query(
    `
      select
        id,
        external_id as "externalId",
        sport,
        category,
        title,
        summary as "desc",
        source_name as "source",
        source_url as "sourceUrl",
        image_url as "imageUrl",
        published_at as "publishedAt",
        heat,
        updated_at as "updatedAt"
      from public.sports_articles
      ${where.length ? `where ${where.join(" and ")}` : ""}
      order by published_at desc nulls last, heat desc, id desc
      limit $${values.length}
    `,
    values,
  );

  return rows.map((row) => ({
    ...row,
    time: relativeTime(row.publishedAt),
  }));
}

export async function listVideos(searchParams = {}) {
  const pool = getPool();
  const category = normalizeKey(searchParams.category, CATEGORY_KEYS);
  const query = String(searchParams.q ?? searchParams.query ?? "").trim();
  const values = [];
  const where = [
    "coalesce(raw->>'contentType', '') = 'recording'",
    "published_at >= now() - interval '3 days'",
  ];

  if (category !== "all") {
    values.push(category);
    where.push(`category = $${values.length}`);
  }

  if (query) {
    values.push(`%${query}%`);
    where.push(
      `(title ilike $${values.length} or summary ilike $${values.length} or source_name ilike $${values.length})`,
    );
  }

  values.push(8);

  const { rows } = await pool.query(
    `
      select
        id,
        title,
        source_name as "source",
        source_url as "sourceUrl",
        image_url as "imageUrl",
        published_at as "publishedAt",
        category
      from public.sports_articles
      where ${where.join(" and ")}
      order by published_at desc nulls last, heat desc, id desc
      limit $${values.length}
    `,
    values,
  );

  return rows.map((row) => ({
    ...row,
    meta: `${row.source} · ${relativeTime(row.publishedAt)}`,
  }));
}
