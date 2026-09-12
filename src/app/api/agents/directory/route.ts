import { NextResponse } from "next/server";
import { buildAgentDirectory } from "@/lib/agent-directory";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(buildAgentDirectory());
}
