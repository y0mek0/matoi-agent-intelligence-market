import { NextResponse } from "next/server";
import { buildTradingAgentDesk } from "@/lib/trading-agents";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(buildTradingAgentDesk({
    asset: "ETH",
    sentiment: "bullish",
    confidence: 0.78,
    riskFlags: ["simulation-only-no-real-trade"],
  }));
}
