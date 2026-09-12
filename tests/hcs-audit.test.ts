import { describe, expect, it } from "vitest";
import { buildHcsAuditMessage } from "@/lib/hcs-audit";

describe("HCS audit message", () => {
  it("keeps only public audit proof fields", () => {
    const message = buildHcsAuditMessage({
      id: "evt-1",
      type: "decision_produced",
      timestamp: "2026-09-08T00:00:00.000Z",
      summary: "BUY_SMALL_SIMULATED. Real trade execution disabled.",
      hash: "abc123def4567890",
      hcsStatus: "local-only",
      payload: { privateKey: "should-not-leak", decision: "BUY_SMALL_SIMULATED", actionCount: 3, network: "ARC-TESTNET", realTrade: false },
    });

    const serialized = JSON.stringify(message);
    expect(message.app).toBe("Agent Intelligence Market");
    expect(message.eventHash).toBe("abc123def4567890");
    expect(message.payload).toEqual({ decision: "BUY_SMALL_SIMULATED", actionCount: 3, network: "ARC-TESTNET", realTrade: false });
    expect(serialized).not.toContain("should-not-leak");
    expect(serialized).not.toContain("privateKey");
  });
});
