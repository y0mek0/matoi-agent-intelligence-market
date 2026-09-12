import { describe, expect, it } from "vitest";
import { buildProviderChallenge, verifyDemoPaymentProof } from "@/lib/provider-access";

describe("provider access boundary", () => {
  it("builds a 402-style challenge without exposing secrets", () => {
    const challenge = buildProviderChallenge("telegram-pulse");
    expect(challenge.status).toBe(402);
    expect(challenge.providerId).toBe("telegram-pulse");
    expect(challenge.rail).toBe("hedera-x402");
    expect(challenge.facilitatorUrl).toMatch(/\/api\/x402\/facilitator$/);
    expect(JSON.stringify(challenge)).not.toContain("KEY");
    expect(JSON.stringify(challenge)).not.toContain("SECRET");
  });

  it("accepts only scoped demo proofs for the provider", () => {
    expect(verifyDemoPaymentProof("telegram-pulse", "demo-paid:telegram-pulse")).toBe(true);
    expect(verifyDemoPaymentProof("telegram-pulse", "demo-paid:reddit-pulse")).toBe(false);
    expect(verifyDemoPaymentProof("telegram-pulse", null)).toBe(false);
  });
});
