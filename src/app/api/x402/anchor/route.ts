import { NextRequest, NextResponse } from "next/server";
import { buildHcsAuditMessage } from "@/lib/hcs-audit";
import { appendAuditEvent, type AuditEvent } from "@/lib/audit-log";
import { listX402Receipts, verifyX402Receipt, type X402Receipt } from "@/lib/x402-facilitator";
import crypto from "node:crypto";
import { AccountId, Client, PrivateKey, TopicId, TopicMessageSubmitTransaction } from "@hashgraph/sdk";

export const runtime = "nodejs";

type SignerConfig = { accountId: string | undefined; rawKey: string | undefined; keyFormat: "ecdsa" | undefined };

function hasValue(value: string | undefined) {
  return Boolean(value && !value.includes("__PASTE_") && !value.includes("__GENERATE_"));
}

function parsePrivateKey(raw: string, format: string | undefined) {
  if (format === "ecdsa") return PrivateKey.fromStringECDSA(raw);
  if (format === "ed25519") return PrivateKey.fromStringED25519(raw);
  if (format === "der") return PrivateKey.fromStringDer(raw);
  return PrivateKey.fromString(raw);
}

function shortHash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const receipt: X402Receipt | null = body?.receipt && typeof body.receipt === "object" ? body.receipt as X402Receipt : null;
  if (!receipt) {
    return NextResponse.json({ ok: false, error: "receipt missing" }, { status: 400 });
  }
  if (!verifyX402Receipt(receipt)) {
    return NextResponse.json({ ok: false, error: "receipt signature invalid" }, { status: 400 });
  }
  const exists = listX402Receipts().some((item) => item.receiptId === receipt.receiptId);
  if (!exists) {
    return NextResponse.json({ ok: false, error: "receipt unknown to facilitator" }, { status: 404 });
  }

  const topicId = process.env.HEDERA_HCS_TOPIC_ID;
  const network = process.env.HEDERA_NETWORK ?? "testnet";
  if (network !== "testnet") return NextResponse.json({ ok: false, error: "testnet_only" }, { status: 400 });
  if (!hasValue(topicId)) return NextResponse.json({ ok: false, error: "hcs_topic_missing" }, { status: 409 });
  const signer: SignerConfig = process.env.HEDERA_HCS_SIGNER === "ECDSA"
    ? { accountId: process.env.HEDERA_ECDSA_ACCOUNT_ID, rawKey: process.env.HEDERA_ECDSA_KEY, keyFormat: "ecdsa" }
    : { accountId: process.env.HEDERA_OPERATOR_ID, rawKey: process.env.HEDERA_OPERATOR_KEY, keyFormat: undefined };
  if (!hasValue(signer.accountId) || !hasValue(signer.rawKey)) {
    return NextResponse.json({ ok: false, error: "hcs_signer_missing" }, { status: 409 });
  }

  const eventId = `x402-${receipt.receiptId}`;
  const eventHash = shortHash(JSON.stringify(receipt));
  const event: AuditEvent = {
    id: eventId,
    type: "x402_settle_anchored",
    providerId: receipt.providerId,
    rail: "hedera-x402",
    summary: `x402 receipt ${receipt.receiptId} anchored for ${receipt.providerId}`,
    payload: {
      rail: receipt.rail,
      receiptId: receipt.receiptId,
      providerId: receipt.providerId,
      paymentRef: receipt.paymentRef,
      amountUsd: receipt.priceUsd,
      network: receipt.network,
      facilitator: receipt.facilitator,
      settleOk: true,
    },
    timestamp: new Date().toISOString(),
    hash: eventHash,
    hcsStatus: "local-only",
  };

  appendAuditEvent(event);
  const message = buildHcsAuditMessage(event);
  const client = Client.forName(network).setOperator(AccountId.fromString(signer.accountId!), parsePrivateKey(signer.rawKey!, signer.keyFormat));
  try {
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId!))
      .setMessage(JSON.stringify(message))
      .execute(client);
    const settlement = await tx.getReceipt(client);
    return NextResponse.json({
      ok: true,
      topicId,
      transactionId: tx.transactionId?.toString(),
      status: settlement.status.toString(),
      eventHash: message.eventHash,
      receiptId: receipt.receiptId,
      explorer: `https://hashscan.io/testnet/topic/${topicId}`,
    });
  } finally {
    client.close();
  }
}

export async function GET() {
  return NextResponse.json({
    facilitator: "nova-x402-facilitator",
    anchorableReceipts: listX402Receipts().slice(0, 20),
    count: listX402Receipts().length,
  });
}
