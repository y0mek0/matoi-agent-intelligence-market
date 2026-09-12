import { NextResponse } from "next/server";
import { settleX402Payment } from "@/lib/x402-facilitator";

export const runtime = "nodejs";

/**
 * POST /api/x402/blocky402-facilitator/settle
 *
 * Final URL that the Blocky402 client hits is `<base>/settle`. We expose this
 * route at exactly that path and translate the x402-shaped body into a call
 * to the same `settleX402Payment` used by the action-based `/api/x402/facilitator`.
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
  const paymentRef = `blocky402:${header.slice(0, 16)}:${provider}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`.slice(0, 96);
  const nonce = (payload.nonce as string) || `b402-${Date.now()}`;
  const result = settleX402Payment({
    providerId: provider,
    resource: `/api/providers/${encodeURIComponent(provider)}`,
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
