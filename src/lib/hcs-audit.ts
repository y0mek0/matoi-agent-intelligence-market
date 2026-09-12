import type { AuditEvent } from "@/lib/audit-log";

const allowedPayloadKeys = new Set(["decision", "tradeExecution", "amountUsd", "code", "mode", "confidence", "sentiment", "sampleSize", "actionCount", "network", "realTrade", "providerCount", "receiptId", "paymentRef", "nonce", "rail", "facilitator", "settleOk", "totalCalls", "totalAccruedUsdc", "costPerCallUsdc", "nanopayments", "calls", "blocky402ReceiptId", "blocky402TxHash", "blocky402Network"]);

export type HcsAuditMessage = {
  app: "Agent Intelligence Market";
  network: "hedera-testnet";
  version: 1;
  eventId: string;
  eventType: string;
  eventHash: string;
  timestamp: string;
  summary: string;
  payload: Record<string, unknown>;
};

export function buildHcsAuditMessage(event: AuditEvent): HcsAuditMessage {
  const payload = Object.fromEntries(
    Object.entries(event.payload ?? {}).filter(([key]) => allowedPayloadKeys.has(key)),
  );
  return {
    app: "Agent Intelligence Market",
    network: "hedera-testnet",
    version: 1,
    eventId: event.id,
    eventType: event.type,
    eventHash: event.hash,
    timestamp: event.timestamp,
    summary: event.summary.slice(0, 240),
    payload,
  };
}
