import type { ProviderId, AnalysisAsset } from "@/lib/provider-analysis";

export type BuyerScenario = {
  id: string;
  title: string;
  clientType: "hedge-fund-analyst" | "dao-treasury" | "protocol-ops" | "research-desk" | "agent-customer";
  objective: string;
  asset: AnalysisAsset;
  budgetUsd: number;
  riskProfile: "conservative" | "balanced" | "aggressive";
  timeHorizon: "15m" | "1h" | "4h" | "1d";
  preferredProviders: ProviderId[];
  arc: {
    buyerWalletRole: string;
    maxProviderSpendUsd: number;
    settlementMode: "authorize-only" | "testnet-transfer-ready";
  };
};

const scenarios: BuyerScenario[] = [
  {
    id: "fast-eth-risk-check",
    title: "Fast ETH Risk Check",
    clientType: "hedge-fund-analyst",
    objective: "Check urgent ETH bullish/bearish risk before a one-hour allocation decision.",
    asset: "ETH",
    budgetUsd: 0.08,
    riskProfile: "balanced",
    timeHorizon: "1h",
    preferredProviders: ["telegram-pulse", "telegram-news", "coingecko-price", "rss-news"],
    arc: { buyerWalletRole: "HedgeFundAnalyst Buyer", maxProviderSpendUsd: 0.01, settlementMode: "authorize-only" },
  },
  {
    id: "dao-treasury-rebalance",
    title: "DAO Treasury Rebalance Watch",
    clientType: "dao-treasury",
    objective: "Decide whether a DAO treasury should prepare a USDC/ETH rebalance watch action.",
    asset: "USDC",
    budgetUsd: 0.12,
    riskProfile: "conservative",
    timeHorizon: "4h",
    preferredProviders: ["defillama-tvl", "coingecko-price", "rss-news", "telegram-news"],
    arc: { buyerWalletRole: "DaoTreasury Buyer", maxProviderSpendUsd: 0.01, settlementMode: "authorize-only" },
  },
  {
    id: "security-event-shock",
    title: "Security/Event Shock Detector",
    clientType: "protocol-ops",
    objective: "Detect exploit, vulnerability, release, or incident shocks that change crypto risk posture.",
    asset: "MARKET",
    budgetUsd: 0.1,
    riskProfile: "conservative",
    timeHorizon: "15m",
    preferredProviders: ["github-releases", "rss-news", "telegram-news", "defillama-tvl"],
    arc: { buyerWalletRole: "ProtocolOps Buyer", maxProviderSpendUsd: 0.01, settlementMode: "authorize-only" },
  },
  {
    id: "market-narrative-scout",
    title: "Market Narrative Scout",
    clientType: "research-desk",
    objective: "Summarize current market narrative across social, news, prices and DeFi context.",
    asset: "MARKET",
    budgetUsd: 0.15,
    riskProfile: "balanced",
    timeHorizon: "1d",
    preferredProviders: ["telegram-news", "rss-news", "defillama-tvl", "github-releases", "coingecko-price"],
    arc: { buyerWalletRole: "ResearchDesk Buyer", maxProviderSpendUsd: 0.01, settlementMode: "authorize-only" },
  },
  {
    id: "provider-marketplace-demo",
    title: "Provider Marketplace Demo",
    clientType: "agent-customer",
    objective: "Buy the cheapest reliable intelligence bundle from competing provider agents.",
    asset: "ETH",
    budgetUsd: 0.05,
    riskProfile: "aggressive",
    timeHorizon: "1h",
    preferredProviders: ["telegram-pulse", "rss-news", "coingecko-price", "defillama-tvl", "github-releases"],
    arc: { buyerWalletRole: "AgentCustomer Buyer", maxProviderSpendUsd: 0.01, settlementMode: "authorize-only" },
  },
];

export function getBuyerScenarios() {
  return scenarios;
}

export function getBuyerScenario(id?: string | null) {
  return scenarios.find((scenario) => scenario.id === id) ?? scenarios[0];
}
