import { describe, expect, it } from "vitest";
import { authorizeArcProviderPayment, recordNanopaymentSettlement, resetArcSpendLedgerForTests } from "@/lib/arc-spend-ledger";

describe("Arc spend ledger", () => {
  it("authorizes capped testnet provider payments with idempotency", () => {
    resetArcSpendLedgerForTests();
    const first = authorizeArcProviderPayment({ missionId: "fast-eth-risk-check", buyerId: "hedge-fund-buyer", providerId: "telegram-pulse", amountUsd: 0.05, idempotencyKey: "same" });
    const second = authorizeArcProviderPayment({ missionId: "fast-eth-risk-check", buyerId: "hedge-fund-buyer", providerId: "telegram-pulse", amountUsd: 0.05, idempotencyKey: "same" });
    expect(first.ok).toBe(true);
    expect(first.entry.amountUsd).toBe(0.01);
    expect(second.entry.id).toBe(first.entry.id);
    expect(first.entry.network).toBe("ARC-TESTNET");
    expect(first.entry.status).toBe("authorized");
    expect(JSON.stringify(first)).not.toMatch(/wallet-|sk-or|TEST_API_KEY|0x[a-f0-9]{64}|3030020100/i);
  });

  it("blocks unknown providers", () => {
    const result = authorizeArcProviderPayment({ missionId: "x", buyerId: "b", providerId: "unknown", amountUsd: 0.01, idempotencyKey: "bad" });
    expect(result.ok).toBe(false);
    expect(result.entry.status).toBe("blocked");
  });

  it("records a NANOPAYMENT_SETTLED ledger entry with call count and per-call cost", () => {
    resetArcSpendLedgerForTests();
    const result = recordNanopaymentSettlement({
      missionId: "dao-treasury-rebalance",
      buyerId: "dao-treasury",
      providerId: "telegram-pulse",
      calls: 4,
      basePriceUsdc: 0.001,
      costPerCallUsdc: 0.00005,
      accruedUsdc: 0.0012,
      idempotencyKey: "nano:dao-treasury-rebalance:telegram-pulse",
    });
    expect(result.ok).toBe(true);
    expect(result.entry.status).toBe("authorized");
    expect(result.entry.calls).toBe(4);
    expect(result.entry.costPerCallUsdc).toBeCloseTo(0.00005, 6);
    expect(result.entry.accruedUsdc).toBeCloseTo(0.0012, 6);
    expect(result.entry.idempotencyKey).toBe("nano:dao-treasury-rebalance:telegram-pulse");
    expect(result.entry.network).toBe("ARC-TESTNET");
    expect(result.entry.realTrade).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/wallet-|sk-or|TEST_API_KEY|0x[a-f0-9]{64}|3030020100/i);
  });
});
