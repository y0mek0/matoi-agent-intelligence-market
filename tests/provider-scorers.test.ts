import { describe, expect, it } from "vitest";
import { scoreProviderSignal } from "@/lib/provider-scorers";

describe("provider scorers", () => {
  it("uses distinct scoring rules for social, price, tvl, and developer intelligence", () => {
    expect(scoreProviderSignal("telegram-pulse", { text: "URGENT ETH ETF approval +12%", asset: "ETH" }).localScore).toBeGreaterThanOrEqual(7);
    expect(scoreProviderSignal("coingecko-price", { change24hPct: 9.5, volumeChangePct: 80, asset: "ETH" }).localScore).toBeGreaterThanOrEqual(7);
    expect(scoreProviderSignal("defillama-tvl", { tvlChangePct: -12, stablecoinChangePct: -3, asset: "MARKET" }).riskFlags).toContain("defi-liquidity-risk");
    expect(scoreProviderSignal("github-releases", { text: "security fix vulnerability release", repoActivity: 9, asset: "MARKET" }).localScore).toBeGreaterThanOrEqual(7);
  });

  it("scores irrelevant inputs low", () => {
    expect(scoreProviderSignal("rss-news", { text: "gm everyone", asset: "ETH" }).localScore).toBeLessThan(4);
  });
});
