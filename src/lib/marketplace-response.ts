import { buildArcActionPlan } from "@/lib/arc-actions";
import { buildAgentMarketplace, rankProvidersForMission, type BuyerMission } from "@/lib/agent-marketplace";

export const defaultBuyerMission: BuyerMission = {
  id: "demo-client-eth-risk",
  clientType: "hedge-fund-analyst",
  objective: "Buy high-signal ETH news, price and DeFi context before a simulation-only allocation decision.",
  asset: "ETH",
  budgetUsd: 0.08,
  riskProfile: "balanced",
  timeHorizon: "1h",
};

export function buildMarketplaceResponse(mission: BuyerMission = defaultBuyerMission) {
  const market = buildAgentMarketplace(mission);
  const providerQuotes = rankProvidersForMission(market).slice(0, 4);
  const blendedConfidence = 0.76;
  const arcPlan = buildArcActionPlan(mission, {
    treasuryReady: true,
    selectedProviderIds: providerQuotes.map((quote) => quote.id),
    confidence: blendedConfidence,
  });

  return {
    mission,
    buyerAgent: market.buyerAgent,
    providerQuotes,
    arcPlan,
    scenario: {
      clientArrivesWith: "objective + asset + budget + risk profile + time horizon",
      systemDoes: "ranks data providers, authorizes bounded testnet provider spend, records HCS audit, returns simulated decision only",
      productBoundary: "Arc/Circle is treasury and spend authorization; Hedera is x402/HCS proof; LLM never signs or trades.",
    },
    safety: { mainnetDisabled: true, realTradesDisabled: true, secretsInBrowser: false },
  };
}
