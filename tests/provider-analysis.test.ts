import { describe, expect, it } from "vitest";
import { buildProviderAnalysis, normalizeProviderScore } from "@/lib/provider-analysis";

describe("provider analysis", () => {
  it("normalizes provider scoring output and strips raw source text", () => {
    const analysis = buildProviderAnalysis({
      providerId: "coingecko-price",
      missionId: "fast-eth-risk-check",
      asset: "ETH",
      localScore: 14,
      gptScore: -2,
      urgency: 8,
      tradability: 9,
      reliability: 7,
      priceUsd: 0.01,
      impact: "bullish",
      summary: "ETH volume spike detected.",
      evidence: "raw $123456 movement text with details",
      riskFlags: ["simulation-only-no-real-trade"],
      rawText: "must not be stored",
    });
    expect(analysis.localScore).toBe(10);
    expect(analysis.gptScore).toBe(0);
    expect(analysis.rawTextStored).toBe(false);
    expect(analysis.evidenceHash).toHaveLength(16);
    expect(JSON.stringify(analysis)).not.toContain("must not be stored");
  });

  it("clamps scores into a 0..10 range", () => {
    expect(normalizeProviderScore(-3)).toBe(0);
    expect(normalizeProviderScore(4.4)).toBe(4.4);
    expect(normalizeProviderScore(15)).toBe(10);
  });
});
