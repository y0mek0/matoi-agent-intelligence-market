import { describe, expect, it } from "vitest";
import { buildMarketplaceResponse } from "@/lib/marketplace-response";

describe("marketplace response", () => {
  it("builds a demo-safe buyer mission response with provider quotes and Arc intents", () => {
    const response = buildMarketplaceResponse();
    expect(response.mission.asset).toBe("ETH");
    expect(response.buyerAgent.walletRole).toBe("Buyer");
    expect(response.providerQuotes.length).toBeGreaterThanOrEqual(4);
    expect(response.arcPlan.allowed).toBe(true);
    expect(response.arcPlan.actions.every((action) => action.realTrade === false)).toBe(true);
    expect(response.safety).toEqual({ mainnetDisabled: true, realTradesDisabled: true, secretsInBrowser: false });
    expect(JSON.stringify(response)).not.toMatch(/wallet-|sk-or|TEST_API_KEY|0x[a-f0-9]{64}|3030020100/i);
  });
});
