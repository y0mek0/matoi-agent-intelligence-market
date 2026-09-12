import { NextResponse } from "next/server";
import { listProviderReputations, rateProvider, type ProviderReputation } from "@/lib/provider-reputation";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ reputations: listProviderReputations() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const providerId = typeof body.providerId === "string" ? body.providerId : null;
  const missionId = typeof body.missionId === "string" ? body.missionId : "manual-rate";
  const outcome = typeof body.outcome === "string" ? body.outcome : "neutral";
  if (!providerId) return NextResponse.json({ ok: false, error: "providerId required" }, { status: 400 });
  const allowed = ["useful", "neutral", "duplicate", "wrong", "untrusted"];
  if (!allowed.includes(outcome)) return NextResponse.json({ ok: false, error: "outcome invalid" }, { status: 400 });
  const reputation: ProviderReputation = rateProvider(providerId as Parameters<typeof rateProvider>[0], missionId, outcome as Parameters<typeof rateProvider>[2]);
  return NextResponse.json({ ok: true, reputation });
}
