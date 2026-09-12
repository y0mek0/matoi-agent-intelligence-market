import { describe, expect, it } from "vitest";
import { buildAgentMarketplace, rankProvidersForMission, type BuyerMission } from "@/lib/agent-marketplace";

describe("agent marketplace", () => {
  it("creates buyer wallet scenarios and ranks provider agents for a client mission", () => {
    const mission: BuyerMission = {
      id: "mission-1",
      clientType: "hedge-fund-analyst",
      objective: "Detect ETH downside risk before simulated allocation",
      asset: "ETH",
      budgetUsd: 0.08,
      riskProfile: "conservative",
      timeHorizon: "24h",
    };

    const market = buildAgentMarketplace(mission);
    expect(market.buyerAgent.walletRole).toBe("Buyer");
    expect(market.buyerAgent.spendPolicy.maxPerSignalUsd).toBeLessThanOrEqual(0.02);
    expect(market.buyerAgent.spendPolicy.realTradesEnabled).toBe(false);
    expect(market.providers.map((p) => p.id)).toEqual(expect.arrayContaining(["telegram-news", "rss-news", "coingecko-price", "defillama-tvl", "github-releases"]));

    const ranked = rankProvidersForMission(market);
    expect(ranked[0].fitScore).toBeGreaterThanOrEqual(ranked[1].fitScore);
    expect(ranked[0].quotedUsd).toBeLessThanOrEqual(mission.budgetUsd);
    expect(ranked.every((quote) => quote.tradeExecution === "disabled")).toBe(true);
  });
});
