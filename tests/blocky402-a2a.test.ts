import { describe, expect, it } from "vitest";
import { enrichA2ATranscriptWithBlocky402 } from "@/lib/blocky402-a2a";
import type { Blocky402A2AMessage } from "@/lib/blocky402-orchestrator";

describe("blocky402 a2a enrichment", () => {
  it("appends three Blocky402 messages to an existing transcript in the right order", () => {
    const messages: Array<{ type: string; missionId: string }> = [
      { type: "X402_CHALLENGE_CREATED", missionId: "test" },
      { type: "X402_RECEIPT_VERIFIED", missionId: "test" },
      { type: "INTELLIGENCE_DELIVERED", missionId: "test" },
    ];
    const blocky402Messages: Blocky402A2AMessage[] = [
      { type: "BLOCKY402_CHALLENGE_RECEIVED", from: "Blocky402Facilitator", to: "BuyerAgent", rail: "hedera-x402", status: "sent", summary: "challenge" },
      { type: "BLOCKY402_PAYMENT_SUBMITTED", from: "BuyerAgent", to: "Blocky402Facilitator", rail: "hedera-x402", status: "sent", summary: "submitted" },
      { type: "BLOCKY402_RECEIPT_VERIFIED", from: "Blocky402Facilitator", to: "BuyerAgent", rail: "hedera-x402", status: "verified", summary: "verified", txHash: "0.0.123@1", receiptId: "rcpt-1", network: "hedera:testnet", amountInUsd: 0.01 },
    ];

    const enriched = enrichA2ATranscriptWithBlocky402({
      baseMessages: messages,
      blocky402Messages,
      missionId: "test",
    });

    expect(enriched.length).toBe(6);
    expect(enriched[3].type).toBe("BLOCKY402_CHALLENGE_RECEIVED");
    expect(enriched[4].type).toBe("BLOCKY402_PAYMENT_SUBMITTED");
    expect(enriched[5].type).toBe("BLOCKY402_RECEIPT_VERIFIED");
    // Original HMAC transcript entries preserved
    expect(enriched[0].type).toBe("X402_CHALLENGE_CREATED");
    expect(enriched[2].type).toBe("INTELLIGENCE_DELIVERED");
  });

  it("marks Blocky402 receipt verified message with hedera:testnet rail and txHash", () => {
    const messages: Array<{ type: string; missionId: string }> = [];
    const blocky402Messages: Blocky402A2AMessage[] = [
      { type: "BLOCKY402_CHALLENGE_RECEIVED", from: "a", to: "b", rail: "hedera-x402", status: "sent", summary: "challenge" },
      { type: "BLOCKY402_PAYMENT_SUBMITTED", from: "a", to: "b", rail: "hedera-x402", status: "sent", summary: "submitted" },
      { type: "BLOCKY402_RECEIPT_VERIFIED", from: "a", to: "b", rail: "hedera-x402", status: "verified", summary: "verified", txHash: "0.0.555@99", receiptId: "rcpt-blocky", network: "hedera:testnet", amountInUsd: 0.005 },
    ];

    const enriched = enrichA2ATranscriptWithBlocky402({
      baseMessages: messages,
      blocky402Messages,
      missionId: "dao-treasury-rebalance",
    });

    const verified = enriched.find((m) => m.type === "BLOCKY402_RECEIPT_VERIFIED");
    expect(verified).toBeDefined();
    if (verified && "txHash" in verified) {
      expect((verified as { txHash?: string }).txHash).toBe("0.0.555@99");
    }
    expect((verified as { receiptId?: string }).receiptId).toBe("rcpt-blocky");
    expect((verified as { rail?: string }).rail).toBe("hedera-x402");
    expect((verified as { missionId: string }).missionId).toBe("dao-treasury-rebalance");
  });

  it("returns base transcript unchanged when blocky402Messages is empty", () => {
    const messages: Array<{ type: string; missionId: string }> = [
      { type: "X402_CHALLENGE_CREATED", missionId: "test" },
    ];
    const enriched = enrichA2ATranscriptWithBlocky402({
      baseMessages: messages,
      blocky402Messages: [],
      missionId: "test",
    });
    expect(enriched.length).toBe(1);
    expect(enriched[0].type).toBe("X402_CHALLENGE_CREATED");
  });
});
