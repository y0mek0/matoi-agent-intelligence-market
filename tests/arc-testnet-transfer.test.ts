import { describe, expect, it } from "vitest";
import { buildArcTestnetTransfer, type ArcCircleTransferClient } from "@/lib/arc-testnet-transfer";

const okClient: ArcCircleTransferClient = {
  async getWalletTokenBalance() {
    return { data: { tokenBalances: [{ token: { id: "token-usdc", symbol: "USDC" }, amount: "5.00" }] } };
  },
  async createTransaction() {
    return { data: { id: "circle-tx-123", state: "INITIATED" } };
  },
};

describe("Arc real testnet transfer adapter", () => {
  it("stays blocked unless explicitly enabled", async () => {
    const result = await buildArcTestnetTransfer({
      enabled: false,
      sourceWalletId: "source-wallet",
      destinationAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-usdc",
      amountUsd: 0.01,
      idempotencyKey: "disabled-test",
      client: okClient,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("disabled");
    expect(result.realUsdcTransfer).toBe(false);
  });

  it("creates a Circle testnet transfer when enabled and funded", async () => {
    const result = await buildArcTestnetTransfer({
      enabled: true,
      sourceWalletId: "source-wallet",
      destinationAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-usdc",
      amountUsd: 0.01,
      idempotencyKey: "enabled-test",
      client: okClient,
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("submitted");
    expect(result.realUsdcTransfer).toBe(true);
    expect(result.circleTransactionId).toBe("circle-tx-123");
    expect(result.maskedDestination).toBe("0x0000...0001");
  });

  it("blocks when USDC balance is missing", async () => {
    const result = await buildArcTestnetTransfer({
      enabled: true,
      sourceWalletId: "source-wallet",
      destinationAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-usdc",
      amountUsd: 0.01,
      idempotencyKey: "unfunded-test",
      client: { ...okClient, async getWalletTokenBalance() { return { data: { tokenBalances: [] } }; } },
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("funding_required");
    expect(result.realUsdcTransfer).toBe(false);
  });
});
