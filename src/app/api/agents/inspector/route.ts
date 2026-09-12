import { NextResponse } from "next/server";
import { inspectProviderAnalyses, type InspectorVerdict } from "@/lib/inspector-agent";
import { runMission } from "@/lib/mission-orchestrator";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const analyses = Array.isArray(body.analyses) ? body.analyses : null;
  let verdict: InspectorVerdict;
  if (analyses) verdict = inspectProviderAnalyses(analyses);
  else {
    const mission = await runMission({ scenarioId: body.scenarioId, useOpenRouter: false });
    verdict = mission.inspector;
  }
  return NextResponse.json(verdict);
}

export async function GET() {
  return NextResponse.json({ inspectorId: "cross-provider-inspector", ok: true, note: "POST provider analyses or run a mission to receive an inspector verdict." });
}
