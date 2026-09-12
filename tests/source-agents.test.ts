import { describe, expect, it } from "vitest";
import { buildSourceAgentSnapshot, normalizeExternalSourceItem } from "@/lib/source-agents";

describe("source agents", () => {
  it("normalizes rss, price, tvl, github source items into sellable intelligence", () => {
    const inputs = [
      normalizeExternalSourceItem({ agentId: "rss-news", title: "ETH ETF demand rises", value: 1, url: "https://example.com/a" }),
      normalizeExternalSourceItem({ agentId: "coingecko-price", title: "ETH price volume spike", value: 3.2 }),
      normalizeExternalSourceItem({ agentId: "defillama-tvl", title: "Ethereum TVL increases", value: 1200000 }),
      normalizeExternalSourceItem({ agentId: "github-releases", title: "security release shipped", value: 1 }),
    ];
    expect(inputs.map((item) => item.agentId)).toEqual(["rss-news", "coingecko-price", "defillama-tvl", "github-releases"]);
    expect(inputs.every((item) => item.saleType === "intelligence-signal")).toBe(true);
    expect(JSON.stringify(inputs)).not.toMatch(/secret|token|private/i);
  });

  it("builds a snapshot with all four extra sources even when live fetch is unavailable", () => {
    const snapshot = buildSourceAgentSnapshot([]);
    expect(snapshot.agents.map((agent) => agent.id)).toEqual(expect.arrayContaining(["rss-news", "coingecko-price", "defillama-tvl", "github-releases"]));
    expect(snapshot.mode).toBe("catalog-ready");
  });
});
