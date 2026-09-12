import crypto from "node:crypto";

export type ProviderId = "telegram-pulse" | "telegram-news" | "rss-news" | "coingecko-price" | "defillama-tvl" | "github-releases";
export type AnalysisAsset = "BTC" | "ETH" | "SOL" | "USDC" | "MARKET" | "OTHER";
export type ProviderImpact = "bullish" | "bearish" | "neutral" | "unknown";

export type ProviderAnalysisInput = {
  providerId: ProviderId;
  missionId: string;
  asset: AnalysisAsset;
  localScore: number;
  gptScore: number;
  urgency: number;
  tradability: number;
  reliability: number;
  priceUsd: number;
  impact: ProviderImpact;
  summary: string;
  evidence: string;
  riskFlags?: string[];
  rawText?: string;
};

export type ProviderAnalysis = Omit<ProviderAnalysisInput, "evidence" | "rawText"> & {
  evidenceHash: string;
  rawTextStored: false;
};

export function normalizeProviderScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10, value));
}

function shortHash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function buildProviderAnalysis(input: ProviderAnalysisInput): ProviderAnalysis {
  return {
    providerId: input.providerId,
    missionId: input.missionId,
    asset: input.asset,
    localScore: normalizeProviderScore(input.localScore),
    gptScore: normalizeProviderScore(input.gptScore),
    urgency: normalizeProviderScore(input.urgency),
    tradability: normalizeProviderScore(input.tradability),
    reliability: normalizeProviderScore(input.reliability),
    priceUsd: Math.max(0, Math.min(0.05, input.priceUsd)),
    impact: input.impact,
    summary: input.summary.slice(0, 220),
    evidenceHash: shortHash(`${input.providerId}:${input.missionId}:${input.evidence}`),
    riskFlags: Array.from(new Set([...(input.riskFlags ?? []), "simulation-only-no-real-trade"])).slice(0, 6),
    rawTextStored: false,
  };
}
