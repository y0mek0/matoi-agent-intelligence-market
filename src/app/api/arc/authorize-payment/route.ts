import { NextResponse } from "next/server";
import { authorizeArcProviderPayment } from "@/lib/arc-spend-ledger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = authorizeArcProviderPayment({
    missionId: typeof body.missionId === "string" ? body.missionId : "manual-demo",
    buyerId: typeof body.buyerId === "string" ? body.buyerId : "manual-buyer",
    providerId: typeof body.providerId === "string" ? body.providerId : "unknown",
    amountUsd: typeof body.amountUsd === "number" ? body.amountUsd : 0,
    idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
