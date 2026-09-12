export type DirectoryAgent = {
  id: string;
  name: string;
  kind: "buyer" | "provider" | "source" | "trading" | "risk" | "audit";
  sells?: string;
  buys?: string;
  endpoints: string[];
  rails: Array<"hedera-x402" | "hedera-hcs" | "arc-usdc" | "openrouter" | "local">;
  networks: Array<"hedera-testnet" | "arc-testnet" | "offchain">;
  status: "live" | "demo" | "partial" | "roadmap";
};

export function buildAgentDirectory() {
  const agents: DirectoryAgent[] = [
    {
      id: "buyer-agent",
      name: "Buyer Mission Agent",
      kind: "buyer",
      buys: "high-signal intelligence under a client budget and risk policy",
      endpoints: ["/api/agents/marketplace", "/api/mission/run", "/api/cycle/run", "/api/arc/settlement/run", "/api/arc/testnet-transfer/run"],
      rails: ["arc-usdc", "hedera-hcs"],
      networks: ["arc-testnet", "hedera-testnet"],
      status: "live",
    },
    {
      id: "telegram-pulse",
      name: "TelegramPulse Provider Agent",
      kind: "provider",
      sells: "Telegram sentiment signal behind a 402-style payment boundary",
      endpoints: ["/api/providers/telegram-pulse", "/api/telegram/webhook"],
      rails: ["hedera-x402", "hedera-hcs"],
      networks: ["hedera-testnet", "offchain"],
      status: "live",
    },
    ...[
      ["rss-news", "RSS News Source Agent", "publisher headline intelligence"],
      ["coingecko-price", "CoinGecko Price Source Agent", "market price and volume movement"],
      ["defillama-tvl", "DefiLlama TVL Source Agent", "DeFi TVL and stablecoin context"],
      ["github-releases", "GitHub Release Source Agent", "release/security activity signals"],
    ].map(([id, name, sells]) => ({
      id,
      name,
      kind: "source" as const,
      sells,
      endpoints: ["/api/intel/sources"],
      rails: ["openrouter" as const, "local" as const],
      networks: ["offchain" as const, "hedera-testnet" as const],
      status: "demo" as const,
    })),
    ...[
      ["momentum-trader", "Momentum Trader Agent"],
      ["mean-reversion-trader", "Mean Reversion Trader Agent"],
      ["risk-guard-trader", "Risk Guard Trader Agent"],
    ].map(([id, name]) => ({
      id,
      name,
      kind: id === "risk-guard-trader" ? "risk" as const : "trading" as const,
      buys: "provider intelligence for simulation-only trade intent voting",
      endpoints: ["/api/agents/trading"],
      rails: ["local" as const, "hedera-hcs" as const],
      networks: ["hedera-testnet" as const, "offchain" as const],
      status: "live" as const,
    })),
    {
      id: "hcs-audit-agent",
      name: "HCS Audit Proof Agent",
      kind: "audit",
      sells: "verifiable public proof hashes for agent decisions and Arc action intents",
      endpoints: ["/api/audit", "/api/audit/hcs"],
      rails: ["hedera-hcs"],
      networks: ["hedera-testnet"],
      status: "live",
    },
  ];
  return {
    protocol: "nova-agent-directory-v1",
    discovery: ["/api/agents/marketplace", "/api/mission/run", "/api/arc/authorize-payment", "/api/arc/settlement/run", "/api/arc/testnet-transfer/run", "/api/agents/trading", "/api/intel/sources", "/api/audit/hcs"],
    agents,
    safety: { mainnetDisabled: true, realTradesDisabled: true, secretsExposed: false },
  };
}
