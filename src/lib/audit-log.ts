import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type AuditEventInput = {
  type: "cycle_started" | "payment_challenge" | "payment_approved" | "arc_action_planned" | "provider_signal_released" | "decision_produced" | "x402_settle_anchored" | "blocky402_payment_settled" | "blocky402_payment_failed";
  providerId?: string;
  rail?: "hedera-x402" | "arc-usdc" | "demo-fallback";
  summary: string;
  payload?: Record<string, unknown>;
};

export type AuditEvent = AuditEventInput & {
  id: string;
  timestamp: string;
  hash: string;
  hcsStatus: "local-only" | "soon";
};

const dataDir = path.join(process.cwd(), ".data");
const auditPath = path.join(dataDir, "audit-log.json");
const secretPattern = /(secret|key|token|password|private|mnemonic)/i;

function safePayload(payload: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, secretPattern.test(key) ? "[REDACTED]" : value]),
  );
}

function shortHash(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function ensureStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(auditPath)) fs.writeFileSync(auditPath, JSON.stringify({ events: [] }, null, 2));
}

export function buildAuditEvent(input: AuditEventInput): AuditEvent {
  const eventBase = {
    type: input.type,
    providerId: input.providerId,
    rail: input.rail,
    summary: input.summary,
    payload: safePayload(input.payload),
  };
  return {
    ...eventBase,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    hash: shortHash(eventBase),
    hcsStatus: "local-only",
  };
}

export function appendAuditEvent(input: AuditEventInput) {
  ensureStore();
  const event = buildAuditEvent(input);
  const data = JSON.parse(fs.readFileSync(auditPath, "utf-8")) as { events: AuditEvent[] };
  data.events.push(event);
  fs.writeFileSync(auditPath, JSON.stringify({ events: data.events.slice(-120) }, null, 2));
  return event;
}

export function appendAuditEvents(events: AuditEvent[]) {
  ensureStore();
  const data = JSON.parse(fs.readFileSync(auditPath, "utf-8")) as { events: AuditEvent[] };
  fs.writeFileSync(auditPath, JSON.stringify({ events: data.events.concat(events).slice(-120) }, null, 2));
  return events;
}

export function readAuditEvents() {
  ensureStore();
  try {
    const data = JSON.parse(fs.readFileSync(auditPath, "utf-8")) as { events: AuditEvent[] };
    return data.events.slice(-50).reverse();
  } catch {
    return [];
  }
}
