import { NextResponse } from "next/server";
import { listArticles, listMatches, listVideos } from "../../../lib/sportsData.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const [matches, articles, videos] = await Promise.all([
      listMatches(params),
      listArticles(params),
      listVideos(params),
    ]);

    return NextResponse.json({
      matches,
      articles,
      videos,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load sports content.", matches: [], articles: [], videos: [] },
      { status: 500 },
    );
  }
}
