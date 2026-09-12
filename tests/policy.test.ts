import { describe, expect, it } from "vitest";
import { defaultNovaPolicy, evaluateSpend } from "@/lib/policy";

const baseRequest = {
  providerId: "telegram-pulse",
  rail: "hedera-x402" as const,
  amountUsd: 0.01,
  confidence: 0.76,
  dailySpentUsd: 0.02,
  reason: "Need Telegram signal.",
};

describe("Nova policy", () => {
  it("approves a small TelegramPulse spend inside the daily cap", () => {
    expect(evaluateSpend(defaultNovaPolicy, baseRequest)).toMatchObject({ approved: true, code: "approved" });
  });

  it("rejects disabled Reddit provider", () => {
    expect(evaluateSpend(defaultNovaPolicy, { ...baseRequest, providerId: "reddit-pulse" })).toMatchObject({ approved: false, code: "provider-disabled" });
  });

  it("rejects over-limit payments", () => {
    expect(evaluateSpend(defaultNovaPolicy, { ...baseRequest, amountUsd: 0.2 })).toMatchObject({ approved: false, code: "per-call-limit" });
  });

  it("rejects low-confidence providers", () => {
    expect(evaluateSpend(defaultNovaPolicy, { ...baseRequest, confidence: 0.2 })).toMatchObject({ approved: false, code: "low-confidence" });
  });
});
