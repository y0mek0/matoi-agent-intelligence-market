import { describe, expect, it, vi } from "vitest";
import { runBlocky402PaidRequest, type Blocky402RunInput } from "@/lib/blocky402-orchestrator";
import type { Blocky402Fetch } from "@/lib/blocky402-client";

describe("blocky402 orchestrator", () => {
  const mockFetch = vi.fn() as unknown as Blocky402Fetch & ReturnType<typeof vi.fn>;

  const baseInput: Blocky402RunInput = {
    providerId: "telegram-pulse",
    resource: "/api/providers/telegram-pulse",
    payToAccountId: "0.0.222222",
    amountInSmallestUnit: "10000",
    payerAccountId: "0.0.111111",
    payerPrivateKey: "302e020100300506032b657004220420" + "0".repeat(64),
    facilitatorUrl: "https://x402.org",
    fetchImpl: mockFetch,
  };

  it("completes the full challenge → sign → settle flow when the facilitator returns success", async () => {
    const fetchMock = mockFetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        transaction: "0.0.123456@1700000000.000000000",
        network: "hedera:testnet",
        receiptId: "rcpt-abc-123",
        payer: "0.0.111111",
      }),
    });

    const result = await runBlocky402PaidRequest(baseInput);

    expect(result.ok).toBe(true);
    expect(result.txHash).toBe("0.0.123456@1700000000.000000000");
    expect(result.receiptId).toBe("rcpt-abc-123");
    expect(result.network).toBe("hedera:testnet");
    expect(result.amountInUsd).toBeCloseTo(0.01, 6);
    expect(result.a2aMessages.length).toBeGreaterThanOrEqual(3);
    const types = result.a2aMessages.map((m) => m.type);
    expect(types).toContain("BLOCKY402_CHALLENGE_RECEIVED");
    expect(types).toContain("BLOCKY402_PAYMENT_SUBMITTED");
    expect(types).toContain("BLOCKY402_RECEIPT_VERIFIED");
  });

  it("returns a structured error when the facilitator /settle returns 5xx", async () => {
    const fetchMock = mockFetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: "facilitator overloaded" }),
    });

    const result = await runBlocky402PaidRequest(baseInput);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/503/);
    expect(result.txHash).toBe("");
    expect(result.a2aMessages.length).toBeGreaterThanOrEqual(2);
    expect(result.a2aMessages.map((m) => m.type)).toContain("BLOCKY402_CHALLENGE_RECEIVED");
    expect(result.a2aMessages.map((m) => m.type)).toContain("BLOCKY402_PAYMENT_FAILED");
  });

  it("rejects non-positive payment amounts at the orchestrator boundary", async () => {
    const result = await runBlocky402PaidRequest({ ...baseInput, amountInSmallestUnit: "0" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/amount/i);
  });
});
