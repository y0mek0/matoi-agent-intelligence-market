import { NextResponse } from "next/server";
import { calculateProviderQuote } from "@/lib/provider-pricing";
import { getProviderReputation } from "@/lib/provider-reputation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const providerId = typeof body.providerId === "string" ? body.providerId : null;
  if (!providerId) return NextResponse.json({ ok: false, error: "providerId required" }, { status: 400 });
  const reputation = getProviderReputation(providerId as Parameters<typeof getProviderReputation>[0]);
  const quote = calculateProviderQuote({
    providerId: providerId as Parameters<typeof calculateProviderQuote>[0]["providerId"],
    localScore: Number(body.localScore ?? 6),
    gptScore: Number(body.gptScore ?? 6),
    urgency: Number(body.urgency ?? 5),
    tradability: Number(body.tradability ?? 5),
    freshnessHours: Number(body.freshnessHours ?? 1),
    reputationScore: reputation.score,
  });
  return NextResponse.json({ ok: true, quote, reputation });
}
