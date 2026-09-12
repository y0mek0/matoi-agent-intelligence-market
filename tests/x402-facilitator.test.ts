import { beforeEach, describe, expect, it } from "vitest";
import { buildX402Challenge, listX402Challenges, listX402Receipts, resetX402StateForTests, settleX402Payment, verifyX402Receipt } from "@/lib/x402-facilitator";

function ref(name: string) {
  return `${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

describe("x402 facilitator", () => {
  beforeEach(() => resetX402StateForTests());
  it("issues challenges with a unique nonce and TTL", () => {
    resetX402StateForTests();
    const challenge = buildX402Challenge({ providerId: "telegram-pulse", resource: "/api/providers/telegram-pulse", priceUsd: 0.01, description: "test" });
    expect(challenge.status).toBe(402);
    expect(challenge.rail).toBe("hedera-x402");
    expect(challenge.facilitatorUrl).toMatch(/\/api\/x402\/facilitator$/);
    expect(new Date(challenge.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(listX402Challenges().length).toBeGreaterThan(0);
  });

  it("settles payments into HMAC-signed receipts and verifies them", () => {
    resetX402StateForTests();
    const challenge = buildX402Challenge({ providerId: "telegram-pulse", resource: "/api/providers/telegram-pulse", priceUsd: 0.01, description: "test" });
    const result = settleX402Payment({ providerId: "telegram-pulse", resource: "/api/providers/telegram-pulse", buyer: "buyer-x", priceUsd: 0.01, paymentRef: ref("ref-123456"), nonce: challenge.nonce });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(verifyX402Receipt(result.receipt)).toBe(true);
    expect(listX402Receipts()[0].receiptId).toBe(result.receipt.receiptId);
  });

  it("auto-opens a challenge for an unknown nonce when the caller provides one", () => {
    resetX402StateForTests();
    // Blocky402 orchestrator signs and posts to /settle without first calling /challenge.
    // The settle helper auto-opens a matching challenge with the supplied nonce.
    const result = settleX402Payment({ providerId: "telegram-pulse", resource: "/api/providers/telegram-pulse", buyer: "buyer-x", priceUsd: 0.01, paymentRef: ref("ref-123456"), nonce: "deadbeef" });
    expect(result.ok).toBe(true);
  });

  it("rejects duplicate payment references", () => {
    resetX402StateForTests();
    const challenge = buildX402Challenge({ providerId: "telegram-pulse", resource: "/api/providers/telegram-pulse", priceUsd: 0.01, description: "test" });
    const duplicateRef = ref("ref-dup");
    const first = settleX402Payment({ providerId: "telegram-pulse", resource: "/api/providers/telegram-pulse", buyer: "buyer-x", priceUsd: 0.01, paymentRef: duplicateRef, nonce: challenge.nonce });
    expect(first.ok).toBe(true);
    const second = settleX402Payment({ providerId: "telegram-pulse", resource: "/api/providers/telegram-pulse", buyer: "buyer-x", priceUsd: 0.01, paymentRef: duplicateRef, nonce: challenge.nonce });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe("duplicate_payment");
  });

  it("rejects payment references that are too short", () => {
    resetX402StateForTests();
    const challenge = buildX402Challenge({ providerId: "telegram-pulse", resource: "/api/providers/telegram-pulse", priceUsd: 0.01, description: "test" });
    const result = settleX402Payment({ providerId: "telegram-pulse", resource: "/api/providers/telegram-pulse", buyer: "buyer-x", priceUsd: 0.01, paymentRef: "x", nonce: challenge.nonce });
    expect(result.ok).toBe(false);
  });
});
