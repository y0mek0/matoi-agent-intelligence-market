import { NextRequest, NextResponse } from "next/server";
import { buildX402Challenge, listX402Challenges, listX402Receipts, settleX402Payment, verifyX402Receipt } from "@/lib/x402-facilitator";
import { appendAuditEvent } from "@/lib/audit-log";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "settle";
  if (action === "challenge") {
    const challenge = buildX402Challenge({
      providerId: typeof body.providerId === "string" ? body.providerId : "telegram-pulse",
      resource: typeof body.resource === "string" ? body.resource : "/api/providers/telegram-pulse",
      priceUsd: typeof body.priceUsd === "number" ? body.priceUsd : 0.01,
      description: typeof body.description === "string" ? body.description : "x402 challenge issued via facilitator.",
      ttlSeconds: typeof body.ttlSeconds === "number" ? body.ttlSeconds : 60,
    });
    appendAuditEvent({ type: "payment_challenge", rail: "hedera-x402", summary: "x402 facilitator issued challenge", payload: { providerId: challenge.providerId, nonce: challenge.nonce, priceUsd: challenge.priceUsd } });
    return NextResponse.json(challenge);
  }
  if (action === "settle") {
    const settlement = settleX402Payment({
      providerId: typeof body.providerId === "string" ? body.providerId : "telegram-pulse",
      resource: typeof body.resource === "string" ? body.resource : "/api/providers/telegram-pulse",
      buyer: typeof body.buyer === "string" ? body.buyer : "anonymous-buyer",
      priceUsd: typeof body.priceUsd === "number" ? body.priceUsd : 0.01,
      paymentRef: typeof body.paymentRef === "string" ? body.paymentRef : "",
      nonce: typeof body.nonce === "string" ? body.nonce : "",
      ttlSeconds: typeof body.ttlSeconds === "number" ? body.ttlSeconds : 120,
    });
    if (settlement.ok) {
      appendAuditEvent({ type: "payment_approved", rail: "hedera-x402", summary: `x402 facilitator settled receipt ${settlement.receipt.receiptId}`, payload: { receiptId: settlement.receipt.receiptId, providerId: settlement.receipt.providerId, paymentRef: settlement.receipt.paymentRef, priceUsd: settlement.receipt.priceUsd } });
      return NextResponse.json(settlement);
    }
    return NextResponse.json(settlement, { status: 400 });
  }
  if (action === "verify") {
    const receipt = body.receipt;
    if (!receipt || typeof receipt !== "object") return NextResponse.json({ ok: false, valid: false, message: "receipt missing" }, { status: 400 });
    const valid = verifyX402Receipt(receipt);
    return NextResponse.json({ ok: true, valid });
  }
  return NextResponse.json({ ok: false, message: "Unknown action. Use challenge|settle|verify." }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({
    facilitator: "nova-x402-facilitator",
    rail: "hedera-x402",
    network: "hedera-testnet",
    actions: ["challenge", "settle", "verify"],
    challenges: listX402Challenges().slice(0, 10),
    receipts: listX402Receipts().slice(0, 10),
    count: { challenges: listX402Challenges().length, receipts: listX402Receipts().length },
  });
}
