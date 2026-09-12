import { describe, expect, it } from "vitest";
import { calculateProviderQuote } from "@/lib/provider-pricing";

describe("provider pricing", () => {
  it("quotes a high-confidence telegram pulse between tiered minimum and maximum", () => {
    const quote = calculateProviderQuote({ providerId: "telegram-pulse", localScore: 9, gptScore: 8, urgency: 9, tradability: 8, freshnessHours: 1, reputationScore: 0.7 });
    expect(quote.tier).toBe("high");
    expect(quote.cappedUsd).toBeGreaterThanOrEqual(0.005);
    expect(quote.cappedUsd).toBeLessThanOrEqual(0.025);
    expect(quote.confidenceMultiplier).toBeGreaterThan(1);
  });

  it("clamps a CoinGecko quote to the low tier range", () => {
    const quote = calculateProviderQuote({ providerId: "coingecko-price", localScore: 5, gptScore: 5, urgency: 5, tradability: 5, freshnessHours: 12, reputationScore: 0.5 });
    expect(quote.tier).toBe("low");
    expect(quote.cappedUsd).toBeLessThanOrEqual(0.01);
  });

  it("discounts stale signals via freshness multiplier", () => {
    const fresh = calculateProviderQuote({ providerId: "rss-news", localScore: 7, gptScore: 7, urgency: 7, tradability: 7, freshnessHours: 1, reputationScore: 0.6 });
    const stale = calculateProviderQuote({ providerId: "rss-news", localScore: 7, gptScore: 7, urgency: 7, tradability: 7, freshnessHours: 48, reputationScore: 0.6 });
    expect(stale.cappedUsd).toBeLessThan(fresh.cappedUsd);
  });
});
