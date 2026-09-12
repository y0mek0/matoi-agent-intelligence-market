import { buildAuditEvent, type AuditEvent } from "@/lib/audit-log";
import { getBuyerScenario, type BuyerScenario } from "@/lib/buyer-scenarios";
import { authorizeArcProviderPayment, recordNanopaymentSettlement, type ArcSpendLedgerEntry } from "@/lib/arc-spend-ledger";
import { buildProviderAnalysis, type ProviderAnalysis, type ProviderId } from "@/lib/provider-analysis";
import { buildProviderOpenRouterPrompt } from "@/lib/provider-openrouter-evaluators";
import { callProviderOpenRouter, type OpenRouterLiveCall } from "@/lib/provider-openrouter-live";
import { scoreProviderSignal } from "@/lib/provider-scorers";
import { calculateProviderQuote, type ProviderPriceQuote } from "@/lib/provider-pricing";
import { getProviderReputation, rateProvider } from "@/lib/provider-reputation";
import { inspectProviderAnalyses, type InspectorVerdict } from "@/lib/inspector-agent";
import { buildTradingAgentDesk } from "@/lib/trading-agents";
import {
  createNanopaymentMeter,
  pricingForProvider,
  recordNanopaymentCall,
  summarizeNanopaymentMeter,
  type NanopaymentMeter,
} from "@/lib/nanopayments";
import type { Blocky402A2AMessage } from "@/lib/blocky402-orchestrator";
import { enrichA2ATranscriptWithBlocky402 } from "@/lib/blocky402-a2a";

export type MissionRunInput = {
  scenarioId?: string;
  useOpenRouter?: boolean;
  /** Optional Blocky402 paid-request transcript messages appended to the A2A flow. */
  x402Blocky402Messages?: Blocky402A2AMessage[];
};
export type A2AMessageType =
  | "DISCOVER_PROVIDERS"
  | "QUOTE_OFFERED"
  | "QUOTE_RANKED"
  | "SPEND_AUTHORIZED"
  | "X402_CHALLENGE_CREATED"
  | "X402_RECEIPT_VERIFIED"
  | "BLOCKY402_CHALLENGE_RECEIVED"
  | "BLOCKY402_PAYMENT_SUBMITTED"
  | "BLOCKY402_RECEIPT_VERIFIED"
  | "BLOCKY402_PAYMENT_FAILED"
  | "INTELLIGENCE_DELIVERED"
  | "RISK_REVIEWED"
  | "SIMULATION_DECISION"
  | "HCS_PROOF_READY";
export type A2AMessage = {
  id: string;
  missionId: string;
  from: string;
  to: string;
  type: A2AMessageType;
  summary: string;
  rail?: "arc-usdc" | "hedera-x402" | "local-orchestrator" | "hcs";
  providerId?: ProviderId;
  priceUsd?: number;
  status: "sent" | "accepted" | "verified" | "delivered" | "planned";
  calls?: number;
  costPerCall?: number;
};
export type MissionRunResult = {
  scenario: BuyerScenario;
  providerAnalyses: ProviderAnalysis[];
  quotes: ProviderPriceQuote[];
  inspector: InspectorVerdict;
  liveCalls: OpenRouterLiveCall[];
  arc: { network: "ARC-TESTNET"; authorizedUsd: number; entries: ArcSpendLedgerEntry[]; realUsdcTransfer: false };
  decision: ReturnType<typeof buildTradingAgentDesk>["consensus"];
  tradingDesk: ReturnType<typeof buildTradingAgentDesk>;
  summary: { missionId: string; thesis: string; confidence: number; topRisks: string[]; selectedProviders: string[]; totalSpendUsd: number };
  a2aTranscript: A2AMessage[];
  auditEvents: AuditEvent[];
  nanopayments: NanopaymentMeter;
  safety: { mainnetDisabled: true; realTradesDisabled: true; rawTextStored: false };
};

const fixtures: Record<ProviderId, Record<string, unknown>> = {
  "telegram-pulse": { text: "URGENT ETH ETF approval rumor +12% market spike", asset: "ETH" },
  "telegram-news": { text: "Breaking crypto channels report treasury rotation and ETH risk", asset: "ETH" },
  "rss-news": { text: "CoinDesk: regulators and funds watch Ethereum ETF flows", asset: "ETH" },
  "coingecko-price": { change24hPct: 6.8, volumeChangePct: 72, asset: "ETH" },
  "defillama-tvl": { tvlChangePct: -8.5, stablecoinChangePct: -2.4, asset: "MARKET" },
  "github-releases": { text: "security fix vulnerability release", repoActivity: 8, asset: "MARKET" },
};

function providerSummary(providerId: ProviderId, scenario: BuyerScenario, localScore: number) {
  if (providerId === "defillama-tvl") return `${providerId} checks DAO/treasury liquidity risk for ${scenario.title}.`;
  if (providerId === "coingecko-price") return `${providerId} checks price and volume movement for ${scenario.asset}.`;
  if (providerId === "github-releases") return `${providerId} checks developer/security events before risk decisions.`;
  if (providerId === "rss-news") return `${providerId} checks publisher headlines for mission relevance.`;
  return `${providerId} checks social/news urgency for the buyer mission at score ${localScore.toFixed(1)}.`;
}

function chooseProvidersUnderBudget(quotes: ProviderPriceQuote[], budgetUsd: number) {
  let spent = 0;
  const accepted: ProviderId[] = [];
  const rejected: ProviderId[] = [];
  for (const quote of quotes) {
    if (spent + quote.cappedUsd > budgetUsd) { rejected.push(quote.providerId); continue; }
    accepted.push(quote.providerId);
    spent += quote.cappedUsd;
  }
  return { accepted, rejected, spent };
}

function buildA2ATranscript(input: {
  scenario: BuyerScenario;
  quotes: ProviderPriceQuote[];
  selection: { accepted: ProviderId[]; rejected: ProviderId[]; spent: number };
  arcEntries: ArcSpendLedgerEntry[];
  inspector: InspectorVerdict;
  decision: ReturnType<typeof buildTradingAgentDesk>["consensus"];
  hcsReady: boolean;
  nanopayments: NanopaymentMeter;
}): A2AMessage[] {
  const { scenario, quotes, selection, arcEntries, inspector, decision, hcsReady, nanopayments } = input;
  const messages: A2AMessage[] = [
    {
      id: `${scenario.id}:discover`,
      missionId: scenario.id,
      from: "BuyerAgent",
      to: "DirectoryAgent",
      type: "DISCOVER_PROVIDERS",
      rail: "local-orchestrator",
      status: "sent",
      summary: `Find providers for ${scenario.title} under $${scenario.budgetUsd.toFixed(2)} budget.`,
    },
  ];
  for (const quote of quotes) {
    messages.push({
      id: `${scenario.id}:offer:${quote.providerId}`,
      missionId: scenario.id,
      from: `${quote.providerId}Agent`,
      to: "BuyerAgent",
      type: "QUOTE_OFFERED",
      providerId: quote.providerId,
      priceUsd: quote.cappedUsd,
      rail: "local-orchestrator",
      status: selection.accepted.includes(quote.providerId) ? "accepted" : "planned",
      summary: `${quote.providerId} offers ${quote.tier} intelligence for $${quote.cappedUsd.toFixed(3)}.`,
    });
  }
  messages.push({
    id: `${scenario.id}:rank`,
    missionId: scenario.id,
    from: "BuyerAgent",
    to: "InspectorAgent",
    type: "QUOTE_RANKED",
    rail: "local-orchestrator",
    status: "accepted",
    summary: `Accepted ${selection.accepted.length}/${quotes.length} provider offers; ${inspector.note}`,
  });
  for (const entry of arcEntries) {
    messages.push({
      id: `${scenario.id}:arc:${entry.providerId}`,
      missionId: scenario.id,
      from: "BuyerAgent",
      to: "ArcTreasuryAgent",
      type: "SPEND_AUTHORIZED",
      providerId: entry.providerId as ProviderId,
      priceUsd: entry.amountUsd,
      rail: "arc-usdc",
      status: entry.status === "authorized" ? "accepted" : "planned",
      summary: `Arc/Circle ${entry.status} provider spend intent for ${entry.providerId} at $${entry.amountUsd.toFixed(3)} on ARC-TESTNET.`,
    });
  }
  const aggregateDelivery = nanopayments.meters
    .filter((m) => selection.accepted.includes(m.providerId))
    .reduce(
      (acc, m) => ({
        calls: acc.calls + m.calls,
        costPerCall: acc.costPerCall + m.costPerCallUsdc * m.calls,
      }),
      { calls: 0, costPerCall: 0 },
    );
  messages.push(
    {
      id: `${scenario.id}:x402-challenge`,
      missionId: scenario.id,
      from: "BuyerAgent",
      to: "X402FacilitatorAgent",
      type: "X402_CHALLENGE_CREATED",
      rail: "hedera-x402",
      status: "planned",
      summary: "x402 challenge/settlement rail selected for paid provider release.",
    },
    {
      id: `${scenario.id}:x402-verify`,
      missionId: scenario.id,
      from: "X402FacilitatorAgent",
      to: "ProviderAgent",
      type: "X402_RECEIPT_VERIFIED",
      rail: "hedera-x402",
      status: "verified",
      summary: "Provider release requires a verified signed receipt; real facilitator endpoint handles challenge → settle → verify.",
    },
    {
      id: `${scenario.id}:delivery`,
      missionId: scenario.id,
      from: "ProviderAgent",
      to: "BuyerAgent",
      type: "INTELLIGENCE_DELIVERED",
      rail: "hedera-x402",
      status: "delivered",
      calls: aggregateDelivery.calls || undefined,
      costPerCall: aggregateDelivery.calls ? Number((aggregateDelivery.costPerCall / aggregateDelivery.calls).toFixed(6)) : undefined,
      summary: `${selection.accepted.length} provider intelligence payload(s) delivered after payment gates (${aggregateDelivery.calls} nanopayment calls).`,
    },
    {
      id: `${scenario.id}:risk`,
      missionId: scenario.id,
      from: "RiskAgent",
      to: "TraderAgent",
      type: "RISK_REVIEWED",
      rail: "local-orchestrator",
      status: inspector.ok ? "accepted" : "planned",
      summary: inspector.ok ? "Risk/inspector pass: no blocking contradictions." : inspector.note,
    },
    {
      id: `${scenario.id}:decision`,
      missionId: scenario.id,
      from: "TraderAgent",
      to: "BuyerAgent",
      type: "SIMULATION_DECISION",
      rail: "local-orchestrator",
      status: "delivered",
      summary: `${decision.intent} produced with execution=${decision.execution}; real trades remain disabled.`,
    },
    {
      id: `${scenario.id}:hcs-proof`,
      missionId: scenario.id,
      from: "AuditAgent",
      to: "HCSAuditAgent",
      type: "HCS_PROOF_READY",
      rail: "hcs",
      status: hcsReady ? "planned" : "sent",
      summary: `Mission events are HCS-ready; x402 settle path can anchor signed receipt proof to Hedera HCS. Nanopayments total ${nanopayments.totalCalls} calls / $${nanopayments.totalAccruedUsdc.toFixed(6)}.`,
    },
  );
  return messages;
}

export async function runMission(input: MissionRunInput = {}): Promise<MissionRunResult> {
  const scenario = getBuyerScenario(input.scenarioId);
  const useOpenRouter = input.useOpenRouter ?? Boolean(process.env.OPENROUTER_API_KEY);
  const liveCalls: OpenRouterLiveCall[] = [];

  const prepared = scenario.preferredProviders.map((providerId) => {
    const score = scoreProviderSignal(providerId, fixtures[providerId] ?? { asset: scenario.asset });
    const reputation = getProviderReputation(providerId);
    const quote = calculateProviderQuote({ providerId, localScore: score.localScore, gptScore: score.localScore, urgency: score.urgency, tradability: score.tradability, freshnessHours: 1, reputationScore: reputation.score });
    return { providerId, score, reputation, quote };
  });

  const providerAnalyses: ProviderAnalysis[] = [];
  const quotes: ProviderPriceQuote[] = [];
  for (const item of prepared) {
    const prompt = buildProviderOpenRouterPrompt(item.providerId, scenario.id, JSON.stringify(fixtures[item.providerId] ?? {}));
    const call = await callProviderOpenRouter(prompt, item.providerId, { ...fixtures[item.providerId], localScore: item.score.localScore, urgency: item.score.urgency, impact: item.score.impact }, process.env);
    if (useOpenRouter && call.ok) liveCalls.push(call);
    const evaluation = call.evaluation;
    const analysis = buildProviderAnalysis({
      providerId: item.providerId,
      missionId: scenario.id,
      asset: scenario.asset,
      localScore: item.score.localScore,
      gptScore: evaluation.gptScore,
      urgency: item.score.urgency,
      tradability: item.score.tradability,
      reliability: item.score.reliability,
      priceUsd: item.quote.cappedUsd,
      impact: evaluation.impact,
      summary: evaluation.summary || providerSummary(item.providerId, scenario, item.score.localScore),
      evidence: JSON.stringify(fixtures[item.providerId] ?? {}),
      riskFlags: [...(item.score.riskFlags ?? []), ...evaluation.riskFlags, call.usedFallback ? "openrouter-fallback" : "openrouter-live"],
    });
    providerAnalyses.push(analysis);
    quotes.push(item.quote);
  }

  providerAnalyses.sort((a, b) => (b.localScore + b.gptScore + b.reliability + b.urgency) - (a.localScore + a.gptScore + a.reliability + a.urgency));

  const selection = chooseProvidersUnderBudget(quotes, scenario.budgetUsd);
  const selectedAnalyses = providerAnalyses.filter((analysis) => selection.accepted.includes(analysis.providerId));
  const inspector = inspectProviderAnalyses(selectedAnalyses);

  const arcEntries = selectedAnalyses.map((analysis) => authorizeArcProviderPayment({
    missionId: scenario.id,
    buyerId: scenario.clientType,
    providerId: analysis.providerId,
    amountUsd: analysis.priceUsd,
    idempotencyKey: `${scenario.id}:${analysis.providerId}`,
  }).entry);
  for (const entry of arcEntries) {
    if (entry.status === "authorized") rateProvider(entry.providerId as ProviderId, scenario.id, "useful");
    else rateProvider(entry.providerId as ProviderId, scenario.id, "wrong");
  }
  const authorizedUsd = Number(arcEntries.filter((entry) => entry.status === "authorized").reduce((sum, entry) => sum + entry.amountUsd, 0).toFixed(4));
  const avgConfidence = selectedAnalyses.length ? selectedAnalyses.reduce((sum, a) => sum + (a.localScore + a.gptScore) / 20, 0) / selectedAnalyses.length : 0;
  const riskFlags = Array.from(new Set(selectedAnalyses.flatMap((analysis) => analysis.riskFlags ?? []))).slice(0, 8);
  const bullish = selectedAnalyses.filter((a) => a.impact === "bullish").length;
  const bearish = selectedAnalyses.filter((a) => a.impact === "bearish").length;
  const sentiment = bearish > bullish ? "bearish" : bullish > 0 ? "bullish" : "neutral";
  const tradingDesk = buildTradingAgentDesk({ asset: scenario.asset === "USDC" ? "MARKET" : scenario.asset, sentiment, confidence: avgConfidence, riskFlags });
  const thesis = `${scenario.title}: ${selection.accepted.length}/${providerAnalyses.length} provider quotes accepted under $${scenario.budgetUsd.toFixed(2)} budget; Arc authorized $${authorizedUsd.toFixed(2)} on ARC-TESTNET; ${inspector.note} final action remains simulation-only.`;
  const acceptedQuotes = quotes.filter((quote) => selection.accepted.includes(quote.providerId));
  let nanopayments: NanopaymentMeter = createNanopaymentMeter(scenario.id);
  for (const providerId of selection.accepted) {
    nanopayments = recordNanopaymentCall(nanopayments, providerId, pricingForProvider(providerId));
  }
  nanopayments = summarizeNanopaymentMeter({ ...nanopayments, finishedAt: new Date().toISOString() });
  const auditEvents = [
    buildAuditEvent({ type: "cycle_started", summary: `Mission ${scenario.id} started`, payload: { missionId: scenario.id, providerCount: scenario.preferredProviders.length } }),
    buildAuditEvent({ type: "payment_approved", summary: `Policy approved ${selection.accepted.length} of ${quotes.length} provider quotes`, payload: { accepted: selection.accepted, rejected: selection.rejected, providerCount: quotes.length } }),
    buildAuditEvent({ type: "arc_action_planned", rail: "arc-usdc", summary: `Arc authorized ${arcEntries.length} provider payment intents + ${nanopayments.totalCalls} nanopayment calls`, payload: { missionId: scenario.id, actionCount: arcEntries.length, network: "ARC-TESTNET", realTrade: false, authorizedUsd, totalCalls: nanopayments.totalCalls, totalAccruedUsdc: nanopayments.totalAccruedUsdc } }),
    buildAuditEvent({ type: "provider_signal_released", summary: inspector.note, payload: { providerCount: selectedAnalyses.length, contradictions: inspector.contradictions.length, duplicates: inspector.duplicates.length, overPricedFlag: inspector.overPricedFlag } }),
    buildAuditEvent({ type: "decision_produced", summary: thesis, payload: { decision: tradingDesk.consensus.intent, realTrade: false, providerCount: selectedAnalyses.length } }),
  ];
  for (const meter of nanopayments.meters) {
    recordNanopaymentSettlement({
      missionId: scenario.id,
      buyerId: scenario.clientType,
      providerId: meter.providerId,
      calls: meter.calls,
      basePriceUsdc: meter.basePriceUsdc,
      costPerCallUsdc: meter.costPerCallUsdc,
      accruedUsdc: meter.accruedUsdc,
      idempotencyKey: `nano:${scenario.id}:${meter.providerId}:${meter.calls}`,
    });
  }
  const baseA2ATranscript = buildA2ATranscript({ scenario, quotes, selection, arcEntries, inspector, decision: tradingDesk.consensus, hcsReady: true, nanopayments });
  const a2aTranscript = input.x402Blocky402Messages?.length
    ? (enrichA2ATranscriptWithBlocky402({
        baseMessages: baseA2ATranscript as unknown as ReadonlyArray<Record<string, unknown>>,
        blocky402Messages: input.x402Blocky402Messages,
        missionId: scenario.id,
      }) as unknown as A2AMessage[])
    : baseA2ATranscript;
  return {
    scenario,
    providerAnalyses: selectedAnalyses,
    quotes: acceptedQuotes,
    inspector,
    liveCalls,
    arc: { network: "ARC-TESTNET", authorizedUsd, entries: arcEntries, realUsdcTransfer: false },
    decision: tradingDesk.consensus,
    tradingDesk,
    summary: { missionId: scenario.id, thesis, confidence: Number(avgConfidence.toFixed(3)), topRisks: riskFlags, selectedProviders: selectedAnalyses.map((a) => a.providerId), totalSpendUsd: authorizedUsd },
    a2aTranscript,
    auditEvents,
    nanopayments,
    safety: { mainnetDisabled: true, realTradesDisabled: true, rawTextStored: false },
  };
}
