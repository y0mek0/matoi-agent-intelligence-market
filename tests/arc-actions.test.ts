import { describe, expect, it } from "vitest";
import { buildArcActionPlan } from "@/lib/arc-actions";
import type { BuyerMission } from "@/lib/agent-marketplace";

describe("arc action planner", () => {
  it("turns a buyer mission into policy-bounded Arc/Circle testnet spend intents", () => {
    const mission: BuyerMission = {
      id: "mission-arc-1",
      clientType: "retail-treasury",
      objective: "Buy high-signal ETH intelligence only if risk is bounded",
      asset: "ETH",
      budgetUsd: 0.05,
      riskProfile: "balanced",
      timeHorizon: "1h",
    };

    const plan = buildArcActionPlan(mission, {
      treasuryReady: true,
      selectedProviderIds: ["telegram-news", "coingecko-price"],
      confidence: 0.76,
    });

    expect(plan.network).toBe("ARC-TESTNET");
    expect(plan.allowed).toBe(true);
    expect(plan.actions.map((action) => action.kind)).toEqual(["AUTHORIZE_PROVIDER_PAYMENT", "RESERVE_BUYER_BUDGET", "RECORD_HCS_AUDIT"]);
    expect(plan.actions.every((action) => action.realTrade === false)).toBe(true);
    expect(JSON.stringify(plan)).not.toMatch(/wallet-|private|secret|token/i);
  });

  it("blocks Arc spend when confidence is too low", () => {
    const mission: BuyerMission = {
      id: "mission-arc-2",
      clientType: "dao-operator",
      objective: "Find market stress before treasury action",
      asset: "MARKET",
      budgetUsd: 0.04,
      riskProfile: "conservative",
      timeHorizon: "24h",
    };

    const plan = buildArcActionPlan(mission, { treasuryReady: true, selectedProviderIds: ["rss-news"], confidence: 0.42 });
    expect(plan.allowed).toBe(false);
    expect(plan.blockers).toContain("confidence_below_policy");
    expect(plan.actions).toEqual([]);
  });
});
