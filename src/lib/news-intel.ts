export type NewsItem = {
  hash: string;
  score: number;
  importance: number;
  asset: string;
  impact: "bullish" | "bearish" | "neutral" | "mixed";
  timeHorizon: string;
  summary: string;
  actions: string[];
  analyzedAt: string | null;
};

export type NewsIntelSummary = {
  count: number;
  avgImportance: number;
  bullishShare: number;
  bearishShare: number;
  topAssets: string[];
  decisionBias: "BUY_SMALL_SIMULATED" | "HOLD" | "REQUEST_MORE_DATA";
  thesis: string;
};

const allowedImpact = new Set(["bullish", "bearish", "neutral", "mixed"]);

function safeImpact(value: string): NewsItem["impact"] {
  return allowedImpact.has(value as NewsItem["impact"]) ? (value as NewsItem["impact"]) : "neutral";
}

export function summarizeNewsItems(items: NewsItem[]): NewsIntelSummary {
  if (!items.length) {
    return {
      count: 0,
      avgImportance: 0,
      bullishShare: 0,
      bearishShare: 0,
      topAssets: [],
      decisionBias: "REQUEST_MORE_DATA",
      thesis: "No external news intel yet.",
    };
  }
  const total = items.length;
  const avgImportance = Number((items.reduce((sum, item) => sum + item.importance, 0) / total).toFixed(2));
  const bullish = items.filter((item) => safeImpact(item.impact) === "bullish").length;
  const bearish = items.filter((item) => safeImpact(item.impact) === "bearish").length;
  const assetCounts = new Map<string, number>();
  for (const item of items) {
    if (!item.asset || item.asset === "UNKNOWN") continue;
    assetCounts.set(item.asset, (assetCounts.get(item.asset) ?? 0) + 1);
  }
  const topAssets = [...assetCounts.entries()].sort((a, b) => b[1] - a[1]).map(([asset]) => asset).slice(0, 3);
  const bullishShare = bullish / total;
  const bearishShare = bearish / total;
  let decisionBias: NewsIntelSummary["decisionBias"] = "HOLD";
  if (bullishShare >= 0.5 && avgImportance >= 4) decisionBias = "BUY_SMALL_SIMULATED";
  else if (bearishShare >= 0.4) decisionBias = "HOLD";
  else if (avgImportance < 3) decisionBias = "REQUEST_MORE_DATA";
  const thesis = `${bullish}/${total} bullish, ${bearish}/${total} bearish; top assets: ${topAssets.join(", ") || "none"}.`;
  return { count: total, avgImportance, bullishShare, bearishShare, topAssets, decisionBias, thesis };
}
