import { describe, expect, it } from "vitest";
import { buildArcStatus, maskAddress } from "@/lib/arc-status";

describe("Arc status", () => {
  it("masks wallet addresses and reports role readiness", () => {
    expect(maskAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234...5678");
    const status = buildArcStatus({
      ARC_NETWORK: "ARC-TESTNET",
      ARC_TRADER_WALLET_ID: "wallet-trader",
      ARC_TRADER_WALLET_ADDRESS: "0x1234567890abcdef1234567890abcdef12345678",
      ARC_RESEARCH_WALLET_ID: "wallet-research",
      ARC_RESEARCH_WALLET_ADDRESS: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      ARC_RISK_WALLET_ID: "wallet-risk",
      ARC_RISK_WALLET_ADDRESS: "0x9999999999999999999999999999999999999999",
    });

    expect(status.network).toBe("ARC-TESTNET");
    expect(status.roles.every((role) => role.ready)).toBe(true);
    expect(JSON.stringify(status)).not.toContain("wallet-trader");
    expect(status.roles[0].address).toBe("0x1234...5678");
  });
});
