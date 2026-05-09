import { NextResponse } from "next/server";
import { listVideos } from "../../../lib/sportsData.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const videos = await listVideos(params);
    return NextResponse.json({
      videos,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load videos.", videos: [] },
      { status: 500 },
    );
  }
}
