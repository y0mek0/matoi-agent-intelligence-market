import { NextResponse } from "next/server";
import { CircleDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { buildArcTestnetTransfer } from "@/lib/arc-testnet-transfer";

export const runtime = "nodejs";

type ProviderRole = "ArcResearch" | "Risk";

function providerDestination(role: ProviderRole) {
  return role === "Risk" ? process.env.ARC_RISK_WALLET_ADDRESS : process.env.ARC_RESEARCH_WALLET_ADDRESS;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const providerRole: ProviderRole = body.providerRole === "Risk" ? "Risk" : "ArcResearch";
  const client = new CircleDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY ?? "",
    entitySecret: process.env.CIRCLE_ENTITY_SECRET ?? "",
  });
  const result = await buildArcTestnetTransfer({
    enabled: process.env.ARC_REAL_USDC_TRANSFER === "true" && body.confirmRealTransfer === true,
    sourceWalletId: process.env.ARC_TRADER_WALLET_ID,
    destinationAddress: typeof body.destinationAddress === "string" ? body.destinationAddress : providerDestination(providerRole),
    tokenId: process.env.ARC_USDC_TOKEN_ID,
    amountUsd: typeof body.amountUsd === "number" ? body.amountUsd : 0.01,
    idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : `arc-transfer-${Date.now()}`,
    client,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
