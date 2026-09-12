import { NextResponse } from "next/server";
import { settleX402Payment } from "@/lib/x402-facilitator";

export const runtime = "nodejs";

/**
 * POST /api/x402/blocky402-settle
 *
 * Compatibility shim: our HMAC facilitator exposes action-based endpoints
 * (`{action: "settle"}`), but the Blocky402 / x402.org client posts to
 * `<facilitator-url>/settle` with an x402-shaped body. This route translates
 * the latter into a call to the same `settleX402Payment` function the action
 * route uses, so the same proof of payment is produced and the receipt is
 * signed identically to the HMAC facilitator.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }
  const header = typeof payload.paymentHeader === "string" ? payload.paymentHeader : "";
  const requirements = (payload.paymentRequirements as Record<string, unknown> | undefined) ?? {};
  const payTo = (requirements.payTo as string) || (payload.payToAccountId as string) || "";
  const provider = (requirements.resource as string) || (payload.payToAccountId as string) || "x402-resource";
  const priceUsd = typeof requirements.maxAmountRequired === "string"
    ? Number(requirements.maxAmountRequired) / 1_000_000
    : typeof payload.amountInSmallestUnit === "string"
    ? Number(payload.amountInSmallestUnit) / 1_000_000
    : 0.01;
  if (!payTo || !header) {
    return NextResponse.json({ error: "missing payTo or paymentHeader" }, { status: 400 });
  }
  const buyer = (payload.payer as string) || "blocky402-buyer";
  const paymentRef = `blocky402:${header.slice(0, 32)}:${provider}`.slice(0, 80);
  const nonce = (payload.nonce as string) || `b402-${Date.now()}`;
  const result = settleX402Payment({
    providerId: provider,
    resource: `/api/x402/blocky402/pay?provider=${encodeURIComponent(provider)}`,
    buyer,
    priceUsd,
    paymentRef,
    nonce,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    receipt: {
      success: true,
      transaction: result.receipt.paymentRef,
      network: result.receipt.network,
      receiptId: result.receipt.receiptId,
      payer: result.receipt.buyer,
      receiptJson: result.receipt,
    },
  });
}
