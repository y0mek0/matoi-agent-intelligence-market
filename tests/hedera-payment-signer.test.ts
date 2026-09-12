import { describe, expect, it } from "vitest";
import { buildSignedHederaUsdcTransfer } from "@/lib/hedera-payment-signer";

describe("hedera payment signer", () => {
  it("builds a signed USDC transfer transaction body for hedera:testnet", async () => {
    const result = await buildSignedHederaUsdcTransfer({
      payerAccountId: "0.0.111111",
      payerPrivateKey: "302e020100300506032b657004220420" + "0".repeat(64),
      payToAccountId: "0.0.222222",
      tokenId: "0.0.429274",
      amountInSmallestUnit: "10000", // 0.01 USDC
      memo: "Matoi nanopayment: dao-treasury-rebalance",
    });
    expect(result.network).toBe("hedera:testnet");
    expect(result.tokenId).toBe("0.0.429274");
    expect(result.payToAccountId).toBe("0.0.222222");
    expect(result.amountInSmallestUnit).toBe("10000");
    expect(result.signedTransactionBase64.length).toBeGreaterThan(0);
    expect(result.transactionId.length).toBeGreaterThan(0);
    expect(result.memo).toBe("Matoi nanopayment: dao-treasury-rebalance");
  });

  it("throws on invalid payer account id format", async () => {
    await expect(
      buildSignedHederaUsdcTransfer({
        payerAccountId: "not-an-account",
        payerPrivateKey: "302e020100300506032b657004220420" + "0".repeat(64),
        payToAccountId: "0.0.222222",
        tokenId: "0.0.429274",
        amountInSmallestUnit: "10000",
        memo: "x",
      }),
    ).rejects.toThrow(/account id/i);
  });

  it("throws on invalid payTo account id format", async () => {
    await expect(
      buildSignedHederaUsdcTransfer({
        payerAccountId: "0.0.111111",
        payerPrivateKey: "302e020100300506032b657004220420" + "0".repeat(64),
        payToAccountId: "bad",
        tokenId: "0.0.429274",
        amountInSmallestUnit: "10000",
        memo: "x",
      }),
    ).rejects.toThrow(/account id/i);
  });
});
