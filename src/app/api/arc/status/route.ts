import { NextResponse } from "next/server";
import { buildArcStatus } from "@/lib/arc-status";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(buildArcStatus());
}
