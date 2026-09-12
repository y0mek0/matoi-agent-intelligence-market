import { describe, expect, it } from "vitest";
import { getBuyerScenarios, getBuyerScenario } from "@/lib/buyer-scenarios";

describe("buyer scenarios", () => {
  it("defines five demo buyer missions with budgets, risk profiles, and preferred providers", () => {
    const scenarios = getBuyerScenarios();
    expect(scenarios).toHaveLength(5);
    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "fast-eth-risk-check",
      "dao-treasury-rebalance",
      "security-event-shock",
      "market-narrative-scout",
      "provider-marketplace-demo",
    ]);
    expect(scenarios.every((scenario) => scenario.budgetUsd > 0 && scenario.preferredProviders.length >= 3)).toBe(true);
    expect(scenarios.every((scenario) => scenario.arc.buyerWalletRole.includes("Buyer"))).toBe(true);
    expect(JSON.stringify(scenarios)).not.toMatch(/wallet-|sk-or|TEST_API_KEY|0x[a-f0-9]{64}|3030020100/i);
  });

  it("returns a fallback scenario for unknown ids without throwing", () => {
    expect(getBuyerScenario("missing")?.id).toBe("fast-eth-risk-check");
  });
});
