import { NextResponse } from "next/server";
import { listMatches } from "../../../lib/sportsData.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const matches = await listMatches(params);
    return NextResponse.json({
      matches,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load matches.", matches: [] },
      { status: 500 },
    );
  }
}
