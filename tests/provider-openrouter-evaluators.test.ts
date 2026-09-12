import { describe, expect, it } from "vitest";
import { buildProviderOpenRouterPrompt, parseProviderOpenRouterJson } from "@/lib/provider-openrouter-evaluators";

describe("provider OpenRouter evaluators", () => {
  it("defines unique GPT prompts per provider", () => {
    const telegram = buildProviderOpenRouterPrompt("telegram-pulse", "fast-eth-risk-check");
    const price = buildProviderOpenRouterPrompt("coingecko-price", "fast-eth-risk-check");
    const tvl = buildProviderOpenRouterPrompt("defillama-tvl", "dao-treasury-rebalance");
    expect(new Set([telegram.system, price.system, tvl.system]).size).toBe(3);
    expect(telegram.system).toMatch(/social|Telegram/i);
    expect(price.system).toMatch(/price|volume/i);
    expect(tvl.system).toMatch(/TVL|DeFi/i);
  });

  it("parses fenced JSON and strips unsafe fields", () => {
    const parsed = parseProviderOpenRouterJson("```json\n{\"gptScore\":12,\"summary\":\"ok\",\"impact\":\"bullish\",\"privateKey\":\"bad\"}\n```");
    expect(parsed).toMatchObject({ gptScore: 10, summary: "ok", impact: "bullish" });
    expect(JSON.stringify(parsed)).not.toContain("privateKey");
  });
});
