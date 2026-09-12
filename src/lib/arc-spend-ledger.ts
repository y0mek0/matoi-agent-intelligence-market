import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { ProviderId } from "@/lib/provider-analysis";

export type ArcSpendLedgerEntry = {
  id: string;
  missionId: string;
  buyerId: string;
  providerId: string;
  amountUsd: number;
  network: "ARC-TESTNET";
  status: "authorized" | "blocked";
  realTrade: false;
  realUsdcTransfer: false;
  idempotencyKey: string;
  createdAt: string;
  /** When present, this entry is a nanopayment settlement (pay-per-call) rather than a flat provider payment. */
  entryType?: "PROVIDER_PAYMENT" | "NANOPAYMENT_SETTLED";
  calls?: number;
  costPerCallUsdc?: number;
  basePriceUsdc?: number;
  accruedUsdc?: number;
};
export type NanopaymentSettlementInput = {
  missionId: string;
  buyerId: string;
  providerId: string;
  calls: number;
  basePriceUsdc: number;
  costPerCallUsdc: number;
  accruedUsdc: number;
  idempotencyKey?: string;
};

export type ArcAuthorizeInput = { missionId: string; buyerId: string; providerId: string; amountUsd: number; idempotencyKey?: string };
export type ArcAuthorizeResult = { ok: boolean; entry: ArcSpendLedgerEntry; reason: string; hcsReady: boolean };

export type ArcSettlementInput = {
  missionId: string;
  buyerId: string;
  providerIds: string[];
  budgetUsd: number;
  requestedUsd: number;
  idempotencyKey?: string;
};

export type ArcSettlementRun = {
  ok: boolean;
  network: "ARC-TESTNET";
  realTrade: false;
  realUsdcTransfer: false;
  blockers: string[];
  budget: {
    requestedUsd: number;
    budgetUsd: number;
    authorizedUsd: number;
    reservedUsd: number;
    perProviderCapUsd: number;
  };
  providers: Array<{
    providerId: string;
    status: "authorized" | "blocked";
    amountUsd: number;
    ledgerId: string;
    reason: string;
  }>;
  proof: {
    actions: ["RESERVE_BUYER_BUDGET", "AUTHORIZE_PROVIDER_PAYMENT", "RECORD_HCS_AUDIT"];
    hcsReady: boolean;
    ledgerEntryCount: number;
    summary: string;
  };
};

const allowedProviders = new Set(["telegram-pulse", "telegram-news", "rss-news", "coingecko-price", "defillama-tvl", "github-releases"] satisfies ProviderId[]);
const dataDir = path.join(process.cwd(), ".data");
const ledgerPath = path.join(dataDir, "arc-spend-ledger.json");
let memoryLedger: ArcSpendLedgerEntry[] = [];

function ensureLedger() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(ledgerPath)) fs.writeFileSync(ledgerPath, JSON.stringify({ entries: [] }, null, 2));
}

function readEntries() {
  try {
    ensureLedger();
    const data = JSON.parse(fs.readFileSync(ledgerPath, "utf-8")) as { entries: ArcSpendLedgerEntry[] };
    return data.entries;
  } catch {
    return memoryLedger;
  }
}

function writeEntries(entries: ArcSpendLedgerEntry[]) {
  memoryLedger = entries.slice(-200);
  try {
    ensureLedger();
    fs.writeFileSync(ledgerPath, JSON.stringify({ entries: memoryLedger }, null, 2));
  } catch {
    // Disk issues must not break the demo response; memory ledger is enough for the current cycle.
  }
}

function newEntryId(input: ArcAuthorizeInput) {
  return `arc-ledger-${crypto.createHash("sha256").update(`${input.missionId}:${input.buyerId}:${input.providerId}:${input.idempotencyKey ?? ""}`).digest("hex").slice(0, 12)}`;
}

export function authorizeArcProviderPayment(input: ArcAuthorizeInput): ArcAuthorizeResult {
  const idempotencyKey = input.idempotencyKey ?? `${input.missionId}:${input.buyerId}:${input.providerId}`;
  const existing = readEntries().find((entry) => entry.idempotencyKey === idempotencyKey);
  if (existing) return { ok: existing.status === "authorized", entry: existing, reason: "idempotent-replay", hcsReady: existing.status === "authorized" };
  const allowed = allowedProviders.has(input.providerId as ProviderId) && input.amountUsd > 0;
  const entry: ArcSpendLedgerEntry = {
    id: newEntryId({ ...input, idempotencyKey }),
    missionId: input.missionId,
    buyerId: input.buyerId,
    providerId: input.providerId,
    amountUsd: allowed ? Math.min(0.01, Number(input.amountUsd.toFixed(4))) : 0,
    network: "ARC-TESTNET",
    status: allowed ? "authorized" : "blocked",
    realTrade: false,
    realUsdcTransfer: false,
    idempotencyKey,
    createdAt: new Date().toISOString(),
    entryType: "PROVIDER_PAYMENT",
  };
  const entries = readEntries().concat(entry);
  writeEntries(entries);
  return { ok: allowed, entry, reason: allowed ? "policy-authorized-testnet-spend-intent" : "provider-or-amount-blocked", hcsReady: allowed };
}

export function readArcSpendLedger() {
  return readEntries().slice(-50).reverse();
}

export function recordNanopaymentSettlement(input: NanopaymentSettlementInput): ArcAuthorizeResult {
  const idempotencyKey = input.idempotencyKey ?? `nano:${input.missionId}:${input.providerId}:${input.calls}`;
  const existing = readEntries().find((entry) => entry.idempotencyKey === idempotencyKey);
  if (existing) return { ok: existing.status === "authorized", entry: existing, reason: "idempotent-replay", hcsReady: existing.status === "authorized" };
  const allowed = allowedProviders.has(input.providerId as ProviderId) && input.calls > 0 && input.accruedUsdc > 0;
  const entry: ArcSpendLedgerEntry = {
    id: `arc-nano-${crypto.createHash("sha256").update(`${input.missionId}:${input.buyerId}:${input.providerId}:${idempotencyKey}`).digest("hex").slice(0, 12)}`,
    missionId: input.missionId,
    buyerId: input.buyerId,
    providerId: input.providerId,
    amountUsd: allowed ? Number(Math.min(0.01, input.accruedUsdc).toFixed(6)) : 0,
    network: "ARC-TESTNET",
    status: allowed ? "authorized" : "blocked",
    realTrade: false,
    realUsdcTransfer: false,
    idempotencyKey,
    createdAt: new Date().toISOString(),
    entryType: "NANOPAYMENT_SETTLED",
    calls: input.calls,
    costPerCallUsdc: Number(input.costPerCallUsdc.toFixed(6)),
    basePriceUsdc: Number(input.basePriceUsdc.toFixed(6)),
    accruedUsdc: Number(input.accruedUsdc.toFixed(6)),
  };
  const entries = readEntries().concat(entry);
  writeEntries(entries);
  return { ok: allowed, entry, reason: allowed ? "policy-authorized-nanopayment-settlement" : "nanopayment-input-blocked", hcsReady: allowed };
}

export function buildArcSettlementRun(input: ArcSettlementInput): ArcSettlementRun {
  const providerIds = input.providerIds.length ? input.providerIds : [];
  const blockers: string[] = [];
  if (input.budgetUsd <= 0) blockers.push("budget_missing");
  if (input.requestedUsd <= 0) blockers.push("requested_amount_missing");
  if (input.requestedUsd > input.budgetUsd) blockers.push("requested_amount_exceeds_budget");
  for (const providerId of providerIds) {
    if (!allowedProviders.has(providerId as ProviderId)) blockers.push(`unknown_provider:${providerId}`);
  }
  if (!providerIds.length) blockers.push("no_provider_selected");

  const knownProviders = providerIds.filter((providerId) => allowedProviders.has(providerId as ProviderId));
  const perProviderCapUsd = Math.min(0.01, input.budgetUsd / Math.max(knownProviders.length || providerIds.length, 1));
  const allowedBudgetUsd = blockers.includes("requested_amount_exceeds_budget") ? 0 : Math.min(input.requestedUsd, input.budgetUsd);
  const perProviderUsd = Math.min(perProviderCapUsd, allowedBudgetUsd / Math.max(knownProviders.length, 1));

  const providers = providerIds.map((providerId, index) => {
    const idempotencyKey = `${input.idempotencyKey ?? input.missionId}:provider:${providerId}:${index}`;
    const result = authorizeArcProviderPayment({
      missionId: input.missionId,
      buyerId: input.buyerId,
      providerId,
      amountUsd: perProviderUsd,
      idempotencyKey,
    });
    return {
      providerId,
      status: result.entry.status,
      amountUsd: result.entry.amountUsd,
      ledgerId: result.entry.id,
      reason: result.reason,
    };
  });
  const authorizedUsd = Number(providers.reduce((sum, provider) => sum + provider.amountUsd, 0).toFixed(4));
  const ok = blockers.length === 0 && providers.length > 0 && providers.every((provider) => provider.status === "authorized");

  return {
    ok,
    network: "ARC-TESTNET",
    realTrade: false,
    realUsdcTransfer: false,
    blockers,
    budget: {
      requestedUsd: Number(input.requestedUsd.toFixed(4)),
      budgetUsd: Number(input.budgetUsd.toFixed(4)),
      authorizedUsd,
      reservedUsd: Number(Math.max(0, input.budgetUsd - authorizedUsd).toFixed(4)),
      perProviderCapUsd: Number(perProviderCapUsd.toFixed(4)),
    },
    providers,
    proof: {
      actions: ["RESERVE_BUYER_BUDGET", "AUTHORIZE_PROVIDER_PAYMENT", "RECORD_HCS_AUDIT"],
      hcsReady: ok,
      ledgerEntryCount: providers.length,
      summary: ok
        ? `Arc/Circle authorized ${providers.length} provider payout intent(s) on ARC-TESTNET.`
        : `Arc/Circle blocked settlement: ${blockers.join(", ") || "provider authorization failed"}.`,
    },
  };
}

export function resetArcSpendLedgerForTests() {
  memoryLedger = [];
  try { fs.rmSync(ledgerPath, { force: true }); } catch {}
}
