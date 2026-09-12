import { NextResponse } from "next/server";
import { AccountId, Client, PrivateKey, TopicId, TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { buildHcsAuditMessage } from "@/lib/hcs-audit";
import { readAuditEvents } from "@/lib/audit-log";

export const runtime = "nodejs";

function hasValue(value: string | undefined) {
  return Boolean(value && !value.includes("__PASTE_") && !value.includes("__GENERATE_"));
}

function parsePrivateKey(raw: string, format: string | undefined) {
  if (format === "ecdsa") return PrivateKey.fromStringECDSA(raw);
  if (format === "ed25519") return PrivateKey.fromStringED25519(raw);
  if (format === "der") return PrivateKey.fromStringDer(raw);
  return PrivateKey.fromString(raw);
}

function signerEnv() {
  const signer = process.env.HEDERA_HCS_SIGNER;
  const accountId = signer === "ECDSA" ? process.env.HEDERA_ECDSA_ACCOUNT_ID : process.env.HEDERA_OPERATOR_ID;
  const rawKey = signer === "ECDSA" ? process.env.HEDERA_ECDSA_KEY : process.env.HEDERA_OPERATOR_KEY;
  return { accountId, rawKey, keyFormat: process.env.HEDERA_HCS_KEY_FORMAT };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const topicId = process.env.HEDERA_HCS_TOPIC_ID;
  const network = process.env.HEDERA_NETWORK ?? "testnet";
  const signer = signerEnv();
  if (network !== "testnet") return NextResponse.json({ ok: false, error: "testnet_only" }, { status: 400 });
  if (!hasValue(topicId) || !hasValue(signer.accountId) || !hasValue(signer.rawKey)) {
    return NextResponse.json({ ok: false, error: "hcs_not_configured" }, { status: 409 });
  }

  let event;
  if (body?.eventType && body?.summary) {
    const allowed = new Set(["cycle_started", "payment_challenge", "payment_approved", "arc_action_planned", "provider_signal_released", "decision_produced", "x402_settle_anchored"]);
    if (!allowed.has(String(body.eventType))) {
      return NextResponse.json({ ok: false, error: "unsupported_event_type" }, { status: 400 });
    }
    event = {
      id: typeof body.eventId === "string" ? body.eventId : cryptoRandomId(),
      type: String(body.eventType) as "x402_settle_anchored",
      summary: String(body.summary).slice(0, 240),
      payload: typeof body.payload === "object" && body.payload !== null ? body.payload as Record<string, unknown> : {},
      timestamp: new Date().toISOString(),
      hash: typeof body.eventHash === "string" ? body.eventHash : shortHash(JSON.stringify(body)),
      hcsStatus: "soon" as const,
    };
  } else {
    [event] = readAuditEvents();
    if (!event) return NextResponse.json({ ok: false, error: "no_audit_event" }, { status: 404 });
  }

  const message = buildHcsAuditMessage(event);
  const client = Client.forName(network).setOperator(AccountId.fromString(signer.accountId!), parsePrivateKey(signer.rawKey!, signer.keyFormat));
  try {
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId!))
      .setMessage(JSON.stringify(message))
      .execute(client);
    const receipt = await tx.getReceipt(client);
    return NextResponse.json({
      ok: true,
      topicId,
      transactionId: tx.transactionId?.toString(),
      status: receipt.status.toString(),
      eventHash: message.eventHash,
      explorer: `https://hashscan.io/testnet/topic/${topicId}`,
    });
  } finally {
    client.close();
  }
}

function shortHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(16).padStart(16, "0");
}

function cryptoRandomId() {
  return `evt-${Math.random().toString(16).slice(2, 10)}-${Date.now()}`;
}
