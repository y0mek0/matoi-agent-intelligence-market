import crypto from "node:crypto";
import { buildX402Challenge, settleX402Payment, verifyX402Receipt, type X402Challenge, type X402Receipt } from "@/lib/x402-facilitator";

export type PaymentChallenge = X402Challenge;

export type ProviderAccessDecision = {
  approved: boolean;
  code: "approved" | "challenge" | "receipt_invalid" | "amount_mismatch" | "unknown_provider";
  message: string;
  receipt?: X402Receipt;
  challenge?: X402Challenge;
};

const allowedProviders = new Set(["telegram-pulse"]);

export function buildProviderChallenge(providerId: string, resource = "/api/providers/" + providerId, priceUsd = 0.01): X402Challenge {
  return buildX402Challenge({ providerId, resource, priceUsd, description: `${providerId} requires x402 payment proof before signal release.` });
}

export function resolveProviderAccess(providerId: string, request: {
  paymentProof?: string | null;
  paymentNonce?: string | null;
  paymentRef?: string | null;
  buyer?: string | null;
  priceUsd?: number | null;
  resource?: string | null;
  receipt?: X402Receipt | null;
}): ProviderAccessDecision {
  if (!allowedProviders.has(providerId)) return { approved: false, code: "unknown_provider", message: `Provider ${providerId} is not registered.` };
  const resource = request.resource ?? `/api/providers/${providerId}`;
  const priceUsd = Number(request.priceUsd ?? 0.01);

  // Receipt-om: клиент уже согласовал с facilitator и прислал receipt напрямую.
  if (request.receipt && verifyX402Receipt(request.receipt)) {
    return { approved: true, code: "approved", message: `Receipt ${request.receipt.receiptId} verified.`, receipt: request.receipt };
  }

  // Settlement path: клиент шлёт payment proof после оплаты через facilitator.
  if (request.paymentProof === "x402-settled" && request.paymentNonce && request.paymentRef) {
    const settlement = settleX402Payment({
      providerId,
      resource,
      buyer: request.buyer ?? "anonymous-buyer",
      priceUsd,
      paymentRef: request.paymentRef,
      nonce: request.paymentNonce,
    });
    if (settlement.ok) {
      return { approved: true, code: "approved", message: `Settled ${settlement.receipt.receiptId} via ${settlement.receipt.facilitator}.`, receipt: settlement.receipt };
    }
    return { approved: false, code: settlement.reason === "amount_mismatch" ? "amount_mismatch" : "receipt_invalid", message: settlement.message };
  }

  // Legacy demo proof — поддерживаем для обратной совместимости.
  if (request.paymentProof === `demo-paid:${providerId}`) {
    const synthetic: X402Receipt = {
      receiptId: `x402-demo-${crypto.createHash("sha256").update(`${providerId}:${resource}`).digest("hex").slice(0, 16)}`,
      providerId,
      resource,
      buyer: request.buyer ?? "legacy-demo",
      priceUsd,
      rail: "hedera-x402",
      asset: "HBAR",
      network: "hedera-testnet",
      paymentRef: `legacy-demo-ref:${providerId}`,
      facilitator: "legacy-demo-facilitator",
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      verification: { algorithm: "hmac-sha256", publicKeyId: "legacy-demo" },
      signature: "legacy-demo",
    };
    return { approved: true, code: "approved", message: "Legacy demo proof accepted.", receipt: synthetic };
  }

  // Иначе — отдаём challenge.
  const challenge = buildProviderChallenge(providerId, resource, priceUsd);
  return { approved: false, code: "challenge", message: "x402 challenge issued. Settle payment via facilitator to release signal.", challenge };
}

export function verifyDemoPaymentProof(providerId: string, proof: string | null): boolean {
  return proof === `demo-paid:${providerId}`;
}
