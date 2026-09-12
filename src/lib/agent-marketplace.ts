export type BuyerMission = {
  id: string;
  clientType: "hedge-fund-analyst" | "retail-treasury" | "dao-operator" | "market-maker";
  objective: string;
  asset: "BTC" | "ETH" | "SOL" | "MARKET" | "OTHER";
  budgetUsd: number;
  riskProfile: "conservative" | "balanced" | "aggressive";
  timeHorizon: "15m" | "1h" | "24h" | "7d";
};

export type BuyerAgent = {
  id: string;
  walletRole: "Buyer";
  missionId: string;
  spendPolicy: {
    maxBudgetUsd: number;
    maxPerSignalUsd: number;
    minConfidence: number;
    realTradesEnabled: false;
  };
};

export type ProviderAgent = {
  id: "telegram-news" | "rss-news" | "coingecko-price" | "defillama-tvl" | "github-releases";
  name: string;
  kind: "social" | "rss" | "market-data" | "defi-data" | "developer-signal";
  sells: string;
  rail: "hedera-x402" | "arc-usdc" | "internal-free";
  quoteUsd: number;
  assets: BuyerMission["asset"][];
  latency: "near-real-time" | "minutes" | "hourly";
};

export type AgentMarketplace = {
  buyerAgent: BuyerAgent;
  providers: ProviderAgent[];
  mission: BuyerMission;
};

export type ProviderQuote = ProviderAgent & {
  quotedUsd: number;
  fitScore: number;
  tradeExecution: "disabled";
  rationale: string;
};

const baseProviders: ProviderAgent[] = [
  { id: "telegram-news", name: "Telegram News Agent", kind: "social", sells: "high-signal Telegram channel intelligence", rail: "hedera-x402", quoteUsd: 0.01, assets: ["BTC", "ETH", "SOL", "MARKET"], latency: "near-real-time" },
  { id: "rss-news", name: "RSS News Agent", kind: "rss", sells: "publisher headlines and summaries", rail: "internal-free", quoteUsd: 0.005, assets: ["BTC", "ETH", "SOL", "MARKET"], latency: "minutes" },
  { id: "coingecko-price", name: "CoinGecko Price Agent", kind: "market-data", sells: "price/volume/volatility snapshot", rail: "internal-free", quoteUsd: 0.005, assets: ["BTC", "ETH", "SOL", "MARKET"], latency: "near-real-time" },
  { id: "defillama-tvl", name: "DefiLlama TVL Agent", kind: "defi-data", sells: "protocol TVL and stablecoin flow context", rail: "internal-free", quoteUsd: 0.005, assets: ["ETH", "SOL", "MARKET"], latency: "hourly" },
  { id: "github-releases", name: "GitHub Release Agent", kind: "developer-signal", sells: "repo release/security activity signals", rail: "internal-free", quoteUsd: 0.005, assets: ["MARKET", "OTHER"], latency: "hourly" },
];

export function buildAgentMarketplace(mission: BuyerMission): AgentMarketplace {
  const riskCut = mission.riskProfile === "conservative" ? 0.25 : mission.riskProfile === "balanced" ? 0.33 : 0.5;
  return {
    mission,
    buyerAgent: {
      id: `buyer-${mission.id}`,
      walletRole: "Buyer",
      missionId: mission.id,
      spendPolicy: {
        maxBudgetUsd: mission.budgetUsd,
        maxPerSignalUsd: Math.min(0.02, Math.max(0.005, mission.budgetUsd * riskCut)),
        minConfidence: mission.riskProfile === "conservative" ? 0.72 : mission.riskProfile === "balanced" ? 0.66 : 0.6,
        realTradesEnabled: false,
      },
    },
    providers: baseProviders,
  };
}

export function rankProvidersForMission(market: AgentMarketplace): ProviderQuote[] {
  return market.providers
    .map((provider) => {
      let fitScore = 10;
      if (provider.assets.includes(market.mission.asset)) fitScore += 35;
      if (provider.latency === "near-real-time" && ["15m", "1h"].includes(market.mission.timeHorizon)) fitScore += 20;
      if (provider.kind === "social" && /news|telegram|risk|signal/i.test(market.mission.objective)) fitScore += 15;
      if (provider.kind === "market-data" && /price|volume|allocation|downside/i.test(market.mission.objective)) fitScore += 12;
      if (provider.quoteUsd <= market.buyerAgent.spendPolicy.maxPerSignalUsd) fitScore += 10;
      return {
        ...provider,
        quotedUsd: provider.quoteUsd,
        fitScore,
        tradeExecution: "disabled" as const,
        rationale: `${provider.name} sells ${provider.sells}; bounded by buyer policy and no real trade execution.`,
      };
    })
    .filter((quote) => quote.quotedUsd <= market.mission.budgetUsd)
    .sort((a, b) => b.fitScore - a.fitScore || a.quotedUsd - b.quotedUsd);
}
