import { describe, expect, it } from "vitest";
import { buildArcSettlementRun, resetArcSpendLedgerForTests } from "@/lib/arc-spend-ledger";

describe("Arc settlement run", () => {
  it("turns a buyer mission into capped provider authorizations and a treasury proof", () => {
    resetArcSpendLedgerForTests();
    const result = buildArcSettlementRun({
      missionId: "arc-test-mission",
      buyerId: "buyer-agent",
      providerIds: ["telegram-pulse", "rss-news", "coingecko-price"],
      budgetUsd: 0.05,
      requestedUsd: 0.04,
      idempotencyKey: "arc-settlement-test",
    });

    expect(result.ok).toBe(true);
    expect(result.network).toBe("ARC-TESTNET");
    expect(result.realTrade).toBe(false);
    expect(result.realUsdcTransfer).toBe(false);
    expect(result.budget.authorizedUsd).toBeGreaterThan(0);
    expect(result.budget.authorizedUsd).toBeLessThanOrEqual(0.03);
    expect(result.providers).toHaveLength(3);
    expect(result.providers.every((provider) => provider.status === "authorized")).toBe(true);
    expect(result.proof.actions).toEqual(["RESERVE_BUYER_BUDGET", "AUTHORIZE_PROVIDER_PAYMENT", "RECORD_HCS_AUDIT"]);
    expect(result.proof.hcsReady).toBe(true);
  });

  it("blocks unknown providers and over-budget requests", () => {
    resetArcSpendLedgerForTests();
    const result = buildArcSettlementRun({
      missionId: "arc-blocked-mission",
      buyerId: "buyer-agent",
      providerIds: ["unknown-provider"],
      budgetUsd: 0.01,
      requestedUsd: 0.25,
      idempotencyKey: "arc-settlement-blocked-test",
    });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("requested_amount_exceeds_budget");
    expect(result.blockers).toContain("unknown_provider:unknown-provider");
    expect(result.providers[0].status).toBe("blocked");
    expect(result.proof.hcsReady).toBe(false);
  });
});
