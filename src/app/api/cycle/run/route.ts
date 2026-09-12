import { NextResponse } from "next/server";
import { appendAuditEvents } from "@/lib/audit-log";
import { buildCycleRun } from "@/lib/cycle-run";
import { analyzeSignalWithOpenRouter } from "@/lib/openrouter-signal";
import { buildTelegramPulseSignal } from "@/lib/telegram-pulse";
import { buildX402Challenge, settleX402Payment } from "@/lib/x402-facilitator";
import { appendAuditEvent } from "@/lib/audit-log";

export const runtime = "nodejs";

function shortId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST() {
  // 1. Issue x402 challenge from facilitator (real flow).
  const challenge = buildX402Challenge({
    providerId: "telegram-pulse",
    resource: "/api/providers/telegram-pulse",
    priceUsd: 0.01,
    description: "Cycle run pays TelegramPulse per x402 protocol.",
    ttlSeconds: 60,
  });

  // 2. Settle the payment through the same facilitator (real HMAC-signed receipt).
  const paymentRef = `cycle-${shortId()}`;
  const settlement = settleX402Payment({
    providerId: "telegram-pulse",
    resource: "/api/providers/telegram-pulse",
    buyer: "buyer-agent",
    priceUsd: challenge.priceUsd,
    paymentRef,
    nonce: challenge.nonce,
    ttlSeconds: 120,
  });
  if (!settlement.ok) {
    appendAuditEvent({ type: "payment_challenge", rail: "hedera-x402", summary: `x402 settlement failed: ${settlement.message}`, payload: { status: 400, code: settlement.reason } });
    return NextResponse.json({ ok: false, error: settlement.reason, message: settlement.message }, { status: 400 });
  }
  appendAuditEvent({ type: "payment_approved", rail: "hedera-x402", summary: `x402 facilitator settled receipt ${settlement.receipt.receiptId}`, payload: { amountUsd: settlement.receipt.priceUsd, code: "approved", receiptId: settlement.receipt.receiptId, facilitator: settlement.receipt.facilitator, nonce: challenge.nonce } });

  // 3. Now release the signal — provider would normally accept the receipt; cycle-run uses the local signal builder as a deterministic signal source.
  const signal = buildTelegramPulseSignal();
  const intelligence = await analyzeSignalWithOpenRouter(signal);
  const run = buildCycleRun(signal, intelligence, settlement.receipt);
  appendAuditEvents(run.auditEvents);
  return NextResponse.json({ ...run, payment: { ...run.payment, x402Receipt: settlement.receipt, challenge: { nonce: challenge.nonce, priceUsd: challenge.priceUsd, rail: challenge.rail } } });
}

export async function GET() {
  return POST();
}
