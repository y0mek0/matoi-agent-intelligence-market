import { NextResponse } from "next/server";
import { buildTrackReadiness } from "@/lib/track-readiness";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(buildTrackReadiness());
}
