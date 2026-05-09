import { NextResponse } from "next/server";
import { listArticles } from "../../../lib/sportsData.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const articles = await listArticles(params);
    return NextResponse.json({
      articles,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load news.", articles: [] },
      { status: 500 },
    );
  }
}
