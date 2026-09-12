import { buildAuditEvent, type AuditEvent } from "@/lib/audit-log";
import { buildArcActionPlan, type ArcActionPlan } from "@/lib/arc-actions";
import { defaultBuyerMission } from "@/lib/marketplace-response";
import { defaultNovaPolicy, evaluateSpend } from "@/lib/policy";
import { buildSignalIntelligence, type SignalIntelligence } from "@/lib/signal-intelligence";
import type { TelegramPulseSignal } from "@/lib/telegram-pulse";
import type { X402Receipt } from "@/lib/x402-facilitator";

export type CycleRunResult = {
  id: string;
  status: "completed";
  provider: "TelegramPulse";
  decision: "BUY_SMALL_SIMULATED" | "HOLD" | "NO_TRADE" | "REQUEST_MORE_DATA";
  tradeExecution: "disabled";
  payment: {
    rail: "hedera-x402";
    amountUsd: number;
    approved: boolean;
    code: string;
    proof: string;
    receiptId?: string;
  };
  signal: TelegramPulseSignal;
  intelligence: SignalIntelligence;
  arcPlan: ArcActionPlan;
  auditEvents: AuditEvent[];
};

export function buildCycleRun(signal: TelegramPulseSignal, intelligence: SignalIntelligence = buildSignalIntelligence(signal), x402Receipt?: X402Receipt): CycleRunResult {
  const amountUsd = 0.01;
  const paymentDecision = evaluateSpend(defaultNovaPolicy, {
    providerId: "telegram-pulse",
    rail: "hedera-x402",
    amountUsd,
    confidence: Math.max(signal.confidence, defaultNovaPolicy.minConfidence),
    dailySpentUsd: 0.02,
    reason: "Buy TelegramPulse ETH signal before simulation-only decision.",
  });
  const decision: CycleRunResult["decision"] = paymentDecision.approved ? intelligence.decisionBias : "HOLD";
  const arcPlan = buildArcActionPlan(defaultBuyerMission, {
    treasuryReady: true,
    selectedProviderIds: ["telegram-pulse", "rss-news", "coingecko-price"],
    confidence: Math.max(signal.confidence, defaultNovaPolicy.minConfidence),
  });
  const base = {
    id: `cycle-${Date.now()}`,
    status: "completed" as const,
    provider: "TelegramPulse" as const,
    decision,
    tradeExecution: "disabled" as const,
    payment: {
      rail: "hedera-x402" as const,
      amountUsd,
      approved: paymentDecision.approved,
      code: paymentDecision.code,
      proof: x402Receipt?.receiptId ?? "demo-paid:telegram-pulse",
      receiptId: x402Receipt?.receiptId,
    },
    signal,
    intelligence,
    arcPlan,
  };
  const auditEvents = [
    buildAuditEvent({ type: "cycle_started", providerId: "telegram-pulse", rail: "hedera-x402", summary: "Matoi cycle started for ETH signal purchase.", payload: { mode: signal.mode } }),
    buildAuditEvent({ type: "payment_approved", providerId: "telegram-pulse", rail: "hedera-x402", summary: x402Receipt ? `x402 facilitator settled receipt ${x402Receipt.receiptId}` : paymentDecision.message, payload: { amountUsd, code: paymentDecision.code, receiptId: x402Receipt?.receiptId, facilitator: x402Receipt?.facilitator } }),
    buildAuditEvent({ type: "arc_action_planned", providerId: "buyer-agent", rail: "arc-usdc", summary: `Arc/Circle buyer spend plan authorized ${arcPlan.actions.length} testnet action(s); no real trades.`, payload: { amountUsd: arcPlan.actions.filter((action) => action.rail === "arc-usdc").reduce((sum, action) => sum + action.amountUsd, 0), actionCount: arcPlan.actions.length, providerCount: 3, network: arcPlan.network, realTrade: false } }),
    buildAuditEvent({ type: "provider_signal_released", providerId: "telegram-pulse", rail: "hedera-x402", summary: signal.summary, payload: { confidence: signal.confidence, sentiment: signal.sentiment, sampleSize: signal.sampleSize } }),
    buildAuditEvent({ type: "decision_produced", providerId: "telegram-pulse", rail: "demo-fallback", summary: `${decision}. ${intelligence.thesis} Real trade execution disabled.`, payload: { decision, tradeExecution: "disabled", mode: intelligence.mode, riskFlags: intelligence.riskFlags } }),
  ];
  return { ...base, auditEvents };
}
