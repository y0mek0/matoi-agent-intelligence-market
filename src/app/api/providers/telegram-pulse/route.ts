import { NextRequest, NextResponse } from "next/server";
import { buildTelegramPulseSignal } from "@/lib/telegram-pulse";
import { resolveProviderAccess } from "@/lib/provider-access";
import { appendAuditEvent } from "@/lib/audit-log";

export const runtime = "nodejs";
const providerId = "telegram-pulse";

export function GET(request: NextRequest) {
  const paymentProof = request.headers.get("x-demo-payment-proof") ?? request.nextUrl.searchParams.get("proof");
  const paymentNonce = request.nextUrl.searchParams.get("paymentNonce") ?? request.nextUrl.searchParams.get("nonce");
  const paymentRef = request.nextUrl.searchParams.get("paymentRef");
  const buyer = request.nextUrl.searchParams.get("buyer");
  const receiptHeader = request.headers.get("x-x402-receipt");

  const receipt = receiptHeader ? safeParseReceipt(receiptHeader) : null;

  const decision = resolveProviderAccess(providerId, {
    paymentProof,
    paymentNonce,
    paymentRef,
    buyer,
    receipt,
    priceUsd: 0.01,
    resource: `/api/providers/${providerId}`,
  });

  if (!decision.approved) {
    appendAuditEvent({
      type: "payment_challenge",
      providerId,
      rail: "hedera-x402",
      summary: decision.message,
      payload: { status: 402, code: decision.code, nonce: decision.challenge?.nonce, priceUsd: decision.challenge?.priceUsd },
    });
    return NextResponse.json(
      {
        status: 402,
        providerId,
        message: decision.message,
        code: decision.code,
        challenge: decision.challenge,
        rail: decision.challenge?.rail,
        acceptedRails: ["hedera-x402"],
        settleUrl: "/api/x402/facilitator",
        facilitator: decision.challenge?.facilitatorUrl,
      },
      { status: 402 },
    );
  }

  const signal = buildTelegramPulseSignal();
  appendAuditEvent({
    type: "payment_approved",
    providerId,
    rail: "hedera-x402",
    summary: `x402 receipt ${decision.receipt?.receiptId ?? "demo"} released TelegramPulse signal.`,
    payload: {
      amountUsd: decision.receipt?.priceUsd ?? 0.01,
      code: decision.code,
      receiptId: decision.receipt?.receiptId,
      facilitator: decision.receipt?.facilitator,
    },
  });
  appendAuditEvent({
    type: "provider_signal_released",
    providerId,
    rail: "hedera-x402",
    summary: signal.summary,
    payload: { mode: signal.mode, confidence: signal.confidence, sentiment: signal.sentiment, sampleSize: signal.sampleSize },
  });
  return NextResponse.json({ ...signal, payment: { rail: "hedera-x402", receipt: decision.receipt, code: decision.code } });
}

function safeParseReceipt(raw: string) {
  try { return JSON.parse(Buffer.from(raw, "base64").toString("utf-8")); }
  catch { try { return JSON.parse(raw); } catch { return null; } }
}
