import type { ProviderId } from "@/lib/provider-analysis";

export type PriceTier = "low" | "medium" | "high";

export type ProviderPriceQuote = {
  providerId: ProviderId;
  baseCostUsd: number;
  confidenceMultiplier: number;
  urgencyMultiplier: number;
  freshnessMultiplier: number;
  reputationMultiplier: number;
  quotedUsd: number;
  cappedUsd: number;
  tier: PriceTier;
  rationale: string;
};

const baseCost: Record<ProviderId, number> = {
  "telegram-pulse": 0.004,
  "telegram-news": 0.005,
  "rss-news": 0.0035,
  "coingecko-price": 0.0045,
  "defillama-tvl": 0.005,
  "github-releases": 0.004,
};

const tierByProvider: Record<ProviderId, PriceTier> = {
  "telegram-pulse": "high",
  "telegram-news": "medium",
  "rss-news": "medium",
  "coingecko-price": "low",
  "defillama-tvl": "medium",
  "github-releases": "high",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function tierRange(tier: PriceTier) {
  if (tier === "low") return { min: 0.002, max: 0.01 };
  if (tier === "medium") return { min: 0.003, max: 0.015 };
  return { min: 0.005, max: 0.025 };
}

export function calculateProviderQuote(input: { providerId: ProviderId; localScore: number; gptScore: number; urgency: number; tradability: number; freshnessHours: number; reputationScore: number }): ProviderPriceQuote {
  const tier = tierByProvider[input.providerId];
  const base = baseCost[input.providerId];
  const confidenceMultiplier = clamp(0.7 + (input.localScore + input.gptScore) / 20 * 0.6, 0.7, 1.6);
  const urgencyMultiplier = clamp(0.8 + input.urgency * 0.05, 0.8, 1.4);
  const freshnessMultiplier = input.freshnessHours <= 1 ? 1.2 : input.freshnessHours <= 6 ? 1.0 : input.freshnessHours <= 24 ? 0.9 : 0.75;
  const reputationMultiplier = clamp(1.2 - input.reputationScore * 0.4, 0.6, 1.4);
  const raw = base * confidenceMultiplier * urgencyMultiplier * freshnessMultiplier * reputationMultiplier;
  const range = tierRange(tier);
  const capped = clamp(Number(raw.toFixed(4)), range.min, range.max);
  const rationale = `base=$${base.toFixed(4)} confidence=×${confidenceMultiplier.toFixed(2)} urgency=×${urgencyMultiplier.toFixed(2)} freshness=×${freshnessMultiplier.toFixed(2)} reputation=×${reputationMultiplier.toFixed(2)} → raw=$${raw.toFixed(4)} capped=${range.min}..${range.max} (${tier})`;
  return { providerId: input.providerId, baseCostUsd: base, confidenceMultiplier, urgencyMultiplier, freshnessMultiplier, reputationMultiplier, quotedUsd: capped, cappedUsd: capped, tier, rationale };
}
