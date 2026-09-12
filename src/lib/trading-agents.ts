export type TradingSignalInput = {
  asset: "BTC" | "ETH" | "SOL" | "MARKET" | "OTHER";
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  riskFlags: string[];
};

export type TradingAgentDecision = {
  id: "momentum-trader" | "mean-reversion-trader" | "risk-guard-trader";
  name: string;
  intent: "BUY_SMALL_SIMULATED" | "HOLD" | "REQUEST_MORE_DATA";
  confidence: number;
  execution: "disabled";
  reason: string;
};

export function buildTradingAgentDesk(input: TradingSignalInput) {
  const safeConfidence = Math.max(0, Math.min(1, input.confidence));
  const momentum: TradingAgentDecision = {
    id: "momentum-trader",
    name: "Momentum Trader Agent",
    intent: input.sentiment === "bullish" && safeConfidence >= 0.68 ? "BUY_SMALL_SIMULATED" : "HOLD",
    confidence: safeConfidence,
    execution: "disabled",
    reason: input.sentiment === "bullish" ? "Bullish intelligence supports a tiny simulated momentum allocation." : "No bullish momentum edge.",
  };
  const meanReversion: TradingAgentDecision = {
    id: "mean-reversion-trader",
    name: "Mean Reversion Trader Agent",
    intent: input.sentiment === "bearish" && safeConfidence >= 0.75 ? "REQUEST_MORE_DATA" : "HOLD",
    confidence: Math.max(0.5, safeConfidence - 0.08),
    execution: "disabled",
    reason: "Needs price/volume confirmation before any simulated mean-reversion intent.",
  };
  const riskGuard: TradingAgentDecision = {
    id: "risk-guard-trader",
    name: "Risk Guard Trader Agent",
    intent: input.sentiment === "bullish" && safeConfidence >= 0.66 && input.riskFlags.includes("simulation-only-no-real-trade") ? "BUY_SMALL_SIMULATED" : "HOLD",
    confidence: safeConfidence,
    execution: "disabled",
    reason: input.sentiment === "bearish" || safeConfidence < 0.66 ? "Risk guard blocks buying on bearish or low-confidence inputs." : "Risk guard allows simulation-only intent; real execution remains disabled.",
  };
  const agents = [momentum, meanReversion, riskGuard];
  const buyVotes = agents.filter((agent) => agent.intent === "BUY_SMALL_SIMULATED").length;
  const consensus = {
    intent: buyVotes >= 2 ? "BUY_SMALL_SIMULATED" as const : "HOLD" as const,
    execution: "disabled" as const,
    reason: buyVotes >= 2 ? "Two trading agents agree on a tiny simulated buy intent." : "Risk/consensus threshold not met; hold.",
  };
  return { asset: input.asset, agents, consensus, safety: { mainnetDisabled: true, realTradesDisabled: true } };
}
