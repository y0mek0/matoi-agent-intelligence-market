import { describe, expect, it } from "vitest";
import { inspectProviderAnalyses } from "@/lib/inspector-agent";

describe("inspector agent", () => {
  it("flags mixed bullish/bearish as contradiction", () => {
    const verdict = inspectProviderAnalyses([
      { providerId: "telegram-pulse", impact: "bullish", localScore: 8, gptScore: 7, urgency: 8, priceUsd: 0.01, summary: "ETH bullish signal", riskFlags: [] },
      { providerId: "coingecko-price", impact: "bearish", localScore: 7, gptScore: 7, urgency: 7, priceUsd: 0.005, summary: "ETH price dumping", riskFlags: ["high-volatility"] },
    ]);
    expect(verdict.contradictions.length).toBeGreaterThanOrEqual(1);
    expect(verdict.ok).toBe(false);
  });

  it("flags near-duplicate summaries", () => {
    const verdict = inspectProviderAnalyses([
      { providerId: "telegram-pulse", impact: "bullish", localScore: 7, gptScore: 7, urgency: 7, priceUsd: 0.005, summary: "ETH bullish signal repeats across news channels today", riskFlags: [] },
      { providerId: "telegram-news", impact: "bullish", localScore: 7, gptScore: 7, urgency: 7, priceUsd: 0.005, summary: "ETH bullish signal repeats across news channels today", riskFlags: [] },
    ]);
    expect(verdict.duplicates.length).toBeGreaterThanOrEqual(1);
  });

  it("marks analysis as overpriced when price exceeds tier cap", () => {
    const verdict = inspectProviderAnalyses([
      { providerId: "coingecko-price", impact: "neutral", localScore: 5, gptScore: 5, urgency: 5, priceUsd: 0.05, summary: "regular price snapshot", riskFlags: ["simulation-only-no-real-trade"] },
    ]);
    expect(verdict.overPricedFlag).toBe(true);
  });
});
