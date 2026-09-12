import { describe, expect, it } from "vitest";
import { buildDeploymentReadiness } from "@/lib/deployment-readiness";

describe("deployment readiness", () => {
  it("separates required MVP readiness from optional live integrations", () => {
    const readiness = buildDeploymentReadiness({
      ARC_NETWORK: "ARC-TESTNET",
      ARC_TRADER_WALLET_ID: "set",
      ARC_RESEARCH_WALLET_ID: "set",
      ARC_RISK_WALLET_ID: "set",
      CIRCLE_API_KEY: "set",
      CIRCLE_ENTITY_SECRET: "set",
      HEDERA_NETWORK: "testnet",
      HEDERA_HCS_TOPIC_ID: "0.0.123",
      TELEGRAM_BOT_TOKEN: "",
    });

    expect(readiness.mvpReady).toBe(true);
    expect(readiness.liveTelegramReady).toBe(false);
    expect(readiness.mode).toBe("fixture-safe");
    expect(readiness.blockers).toEqual([]);
    expect(readiness.next).toContain("Set Telegram bot token and webhook secret for live group input.");
  });
});
