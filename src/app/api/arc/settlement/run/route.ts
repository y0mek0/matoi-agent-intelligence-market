import { NextResponse } from "next/server";
import { buildArcSettlementRun } from "@/lib/arc-spend-ledger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = buildArcSettlementRun({
    missionId: typeof body.missionId === "string" ? body.missionId : "manual-arc-settlement",
    buyerId: typeof body.buyerId === "string" ? body.buyerId : "buyer-agent",
    providerIds: Array.isArray(body.providerIds) ? body.providerIds.filter((item: unknown) => typeof item === "string") : ["telegram-pulse"],
    budgetUsd: typeof body.budgetUsd === "number" ? body.budgetUsd : 0.05,
    requestedUsd: typeof body.requestedUsd === "number" ? body.requestedUsd : 0.01,
    idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function GET() {
  const result = buildArcSettlementRun({
    missionId: "arc-demo-get",
    buyerId: "buyer-agent",
    providerIds: ["telegram-pulse", "rss-news"],
    budgetUsd: 0.05,
    requestedUsd: 0.02,
    idempotencyKey: "arc-demo-get",
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
