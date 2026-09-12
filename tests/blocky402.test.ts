import { describe, expect, it } from "vitest";
import {
  buildHederaUsdcTransferBody,
  encodeHederaPaymentHeader,
  parseFacilitatorChallenge,
  type HederaPaymentRequirements,
} from "@/lib/blocky402";

describe("blocky402 hedera payment primitives", () => {
  it("builds a CAIP-2 hedera:testnet transfer body with USDC token id and decimals", () => {
    const requirements: HederaPaymentRequirements = {
      scheme: "exact",
      network: "hedera:testnet",
      asset: "USDC",
      tokenId: "0.0.429274",
      decimals: 6,
      payTo: "0.0.123456",
      maxAmountRequired: "10000", // 0.01 USDC = 10000 in smallest unit
      resource: "/api/providers/telegram-pulse",
      description: "telegram-pulse paid intelligence",
      mimeType: "application/json",
    };
    const body = buildHederaUsdcTransferBody(requirements);
    expect(body.network).toBe("hedera:testnet");
    expect(body.tokenId).toBe("0.0.429274");
    expect(body.decimals).toBe(6);
    expect(body.payToAccountId).toBe("0.0.123456");
    expect(body.amountInSmallestUnit).toBe("10000");
    expect(body.amountInUsd).toBeCloseTo(0.01, 6);
  });

  it("encodes a payment header as base64 of a stable JSON shape", () => {
    const payload = {
      x402Version: 1,
      scheme: "exact" as const,
      network: "hedera:testnet" as const,
      payload: {
        transactionBody: "base64-encoded-hedera-transfer-body",
        signatures: ["sig-1"],
      },
    };
    const header = encodeHederaPaymentHeader(payload);
    expect(typeof header).toBe("string");
    expect(header.length).toBeGreaterThan(0);
    const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf-8"));
    expect(decoded.x402Version).toBe(1);
    expect(decoded.scheme).toBe("exact");
    expect(decoded.network).toBe("hedera:testnet");
    expect(decoded.payload.transactionBody).toBe("base64-encoded-hedera-transfer-body");
    expect(Array.isArray(decoded.payload.signatures)).toBe(true);
  });

  it("parses a facilitator 402 challenge into HederaPaymentRequirements", () => {
    const challenge = {
      status: 402,
      accepts: [
        {
          scheme: "exact",
          network: "hedera:testnet",
          asset: "USDC",
          tokenId: "0.0.429274",
          decimals: 6,
          payTo: "0.0.987654",
          maxAmountRequired: "5000",
          resource: "/api/providers/coingecko-price",
          description: "coingecko price intelligence",
          mimeType: "application/json",
        },
      ],
    };
    const requirements = parseFacilitatorChallenge(challenge);
    expect(requirements.scheme).toBe("exact");
    expect(requirements.network).toBe("hedera:testnet");
    expect(requirements.tokenId).toBe("0.0.429274");
    expect(requirements.payTo).toBe("0.0.987654");
    expect(requirements.maxAmountRequired).toBe("5000");
    expect(requirements.resource).toBe("/api/providers/coingecko-price");
  });

  it("throws when the facilitator challenge has no hedera:testnet option", () => {
    const challenge = {
      status: 402,
      accepts: [{ scheme: "exact", network: "eip155:84532" }],
    };
    expect(() => parseFacilitatorChallenge(challenge)).toThrow(/hedera:testnet/i);
  });

  it("converts smallest-unit amount back to USD for the meter summary", () => {
    const requirements: HederaPaymentRequirements = {
      scheme: "exact",
      network: "hedera:testnet",
      asset: "USDC",
      tokenId: "0.0.429274",
      decimals: 6,
      payTo: "0.0.123456",
      maxAmountRequired: "12345",
      resource: "/api/x",
      description: "x",
      mimeType: "application/json",
    };
    const body = buildHederaUsdcTransferBody(requirements);
    expect(body.amountInUsd).toBeCloseTo(0.012345, 6);
  });
});
