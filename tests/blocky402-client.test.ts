import { describe, expect, it, vi } from "vitest";
import { settlePaymentWithBlocky402, type Blocky402ClientConfig } from "@/lib/blocky402-client";

describe("blocky402 client", () => {
  const config: Blocky402ClientConfig = {
    facilitatorUrl: "https://x402.org",
    network: "hedera:testnet",
    fetchImpl: vi.fn(),
  };

  it("posts the payment payload to the facilitator /settle endpoint", async () => {
    const mockFetch = config.fetchImpl as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({
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

    const result = await settlePaymentWithBlocky402({
      config,
      paymentHeader: "base64-payload",
      requirements: {
        scheme: "exact",
        network: "hedera:testnet",
        asset: "USDC",
        tokenId: "0.0.429274",
        decimals: 6,
        payTo: "0.0.222222",
        maxAmountRequired: "10000",
        resource: "/api/providers/telegram-pulse",
        description: "test",
        mimeType: "application/json",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.txHash).toBe("0.0.123456@1700000000.000000000");
    expect(result.network).toBe("hedera:testnet");
    expect(result.receiptId).toBe("rcpt-abc-123");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/settle");
    expect(init.method).toBe("POST");
  });

  it("returns a structured error on facilitator 4xx/5xx", async () => {
    const mockFetch = config.fetchImpl as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ error: "facilitator offline" }),
    });

    const result = await settlePaymentWithBlocky402({
      config,
      paymentHeader: "base64-payload",
      requirements: {
        scheme: "exact",
        network: "hedera:testnet",
        asset: "USDC",
        tokenId: "0.0.429274",
        decimals: 6,
        payTo: "0.0.222222",
        maxAmountRequired: "10000",
        resource: "/api/x",
        description: "x",
        mimeType: "application/json",
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/502/);
      expect(result.txHash).toBe("");
    }
  });
});
