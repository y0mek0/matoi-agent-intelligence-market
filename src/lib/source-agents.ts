export type SourceAgentId = "rss-news" | "coingecko-price" | "defillama-tvl" | "github-releases";

export type ExternalSourceItem = {
  agentId: SourceAgentId;
  title: string;
  value: number;
  url?: string;
  observedAt?: string;
};

export type NormalizedSourceItem = ExternalSourceItem & {
  id: string;
  saleType: "intelligence-signal";
  priceUsd: number;
  confidence: number;
  publicOnly: true;
};

export type SourceAgentCatalogItem = {
  id: SourceAgentId;
  name: string;
  sells: string;
  liveEndpoint: string;
  priceUsd: number;
};

export const sourceAgentCatalog: SourceAgentCatalogItem[] = [
  { id: "rss-news", name: "RSS News Agent", sells: "publisher headlines from crypto RSS feeds", liveEndpoint: "CoinDesk/Cointelegraph RSS", priceUsd: 0.005 },
  { id: "coingecko-price", name: "CoinGecko Price Agent", sells: "price, volume, and market movement snapshot", liveEndpoint: "CoinGecko public API", priceUsd: 0.005 },
  { id: "defillama-tvl", name: "DefiLlama TVL Agent", sells: "TVL/stablecoin flow context", liveEndpoint: "DefiLlama public API", priceUsd: 0.005 },
  { id: "github-releases", name: "GitHub Release Agent", sells: "release/security activity from public repos", liveEndpoint: "GitHub public API", priceUsd: 0.005 },
];

function simpleId(input: string) {
  let hash = 0;
  for (const char of input) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash.toString(16).padStart(8, "0");
}

export function normalizeExternalSourceItem(item: ExternalSourceItem): NormalizedSourceItem {
  const catalog = sourceAgentCatalog.find((agent) => agent.id === item.agentId);
  return {
    ...item,
    id: `${item.agentId}-${simpleId(`${item.title}:${item.value}:${item.url ?? ""}`)}`,
    saleType: "intelligence-signal",
    priceUsd: catalog?.priceUsd ?? 0.005,
    confidence: Math.min(0.92, Math.max(0.55, 0.6 + Math.abs(item.value) / 100)),
    publicOnly: true,
    observedAt: item.observedAt ?? new Date(0).toISOString(),
  };
}

export function buildSourceAgentSnapshot(items: NormalizedSourceItem[]) {
  return {
    mode: items.length ? "live-snapshot" as const : "catalog-ready" as const,
    agents: sourceAgentCatalog,
    items: items.slice(0, 12),
    sellableCount: items.length,
    safety: { rawSecrets: false, publicOnly: true },
  };
}
