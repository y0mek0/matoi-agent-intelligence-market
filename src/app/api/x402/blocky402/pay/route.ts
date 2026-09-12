import { NextRequest, NextResponse } from "next/server";
import { runBlocky402PaidRequest } from "@/lib/blocky402-orchestrator";
import { appendAuditEvent } from "@/lib/audit-log";

export const runtime = "nodejs";

/**
 * POST /api/x402/blocky402/pay
 *
 * Real paid request through the Blocky402 / x402 facilitator on Hedera testnet.
 *
 * Required env (gated, never required for smoke):
 *   HEDERA_PAYER_ACCOUNT_ID  - "0.0.XXXXXXX"
 *   HEDERA_PAYER_KEY         - DER (ED25519) or 0x hex (ECDSA) string
 *   BLOCKY402_URL            - default "https://x402.org"
 *
 * Body:
 *   { providerId, resource, payToAccountId, amountInSmallestUnit, memo? }
 *
 * Response:
 *   { ok, network, txHash, receiptId, amountInUsd, a2aMessages[] } on success
 *   { ok: false, error, a2aMessages[] } on failure
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const providerId = typeof body.providerId === "string" ? body.providerId : "telegram-pulse";
  const resource = typeof body.resource === "string" ? body.resource : `/api/providers/${providerId}`;
  const payToAccountId = typeof body.payToAccountId === "string" ? body.payToAccountId : "";
  const amountInSmallestUnit = typeof body.amountInSmallestUnit === "string" ? body.amountInSmallestUnit : "";
  const memo = typeof body.memo === "string" ? body.memo : undefined;

  const payerAccountId = process.env.HEDERA_PAYER_ACCOUNT_ID ?? "";
  const payerKey = process.env.HEDERA_PAYER_KEY ?? "";
  const facilitatorUrl = process.env.BLOCKY402_URL ?? "https://x402.org";

  if (!payerAccountId || !payerKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "HEDERA_PAYER_ACCOUNT_ID and HEDERA_PAYER_KEY must be set for Blocky402 paid requests",
        setupRequired: true,
      },
      { status: 503 },
    );
  }
  if (!payToAccountId || !amountInSmallestUnit) {
    return NextResponse.json(
      { ok: false, error: "payToAccountId and amountInSmallestUnit are required" },
      { status: 400 },
    );
  }

  const result = await runBlocky402PaidRequest({
    providerId,
    resource,
    payToAccountId,
    amountInSmallestUnit,
    payerAccountId,
    payerPrivateKey: payerKey,
    facilitatorUrl,
    memo,
  });

  appendAuditEvent({
    type: result.ok ? "blocky402_payment_settled" : "blocky402_payment_failed",
    rail: "hedera-x402",
    summary: result.ok
      ? `Blocky402 settled ${result.amountInUsd} USDC to ${payToAccountId} (tx=${result.txHash})`
      : `Blocky402 /settle failed for ${providerId}: ${result.error}`,
    payload: {
      providerId,
      network: "hedera:testnet",
      amountInUsd: result.amountInUsd,
      txHash: result.ok ? result.txHash : undefined,
      receiptId: result.ok ? result.receiptId : undefined,
      error: result.ok ? undefined : result.error,
    },
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}

export async function GET() {
  const enabled = Boolean(process.env.HEDERA_PAYER_ACCOUNT_ID && process.env.HEDERA_PAYER_KEY);
  return NextResponse.json({
    enabled,
    network: "hedera:testnet",
    facilitatorUrl: process.env.BLOCKY402_URL ?? "https://x402.org",
    requiredEnv: ["HEDERA_PAYER_ACCOUNT_ID", "HEDERA_PAYER_KEY", "BLOCKY402_URL"],
  });
}
