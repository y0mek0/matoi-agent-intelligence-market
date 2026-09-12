import type { AnalysisAsset, ProviderId, ProviderImpact } from "@/lib/provider-analysis";

export type ProviderSignalInput = {
  text?: string;
  asset?: AnalysisAsset;
  change24hPct?: number;
  volumeChangePct?: number;
  tvlChangePct?: number;
  stablecoinChangePct?: number;
  repoActivity?: number;
};

export type ProviderScore = {
  providerId: ProviderId;
  localScore: number;
  urgency: number;
  tradability: number;
  reliability: number;
  impact: ProviderImpact;
  riskFlags: string[];
};

function clamp(value: number) {
  return Math.max(0, Math.min(10, value));
}

function textScore(text = "") {
  const t = text.toLowerCase();
  let score = 0;
  if (/eth|btc|sol|usdc|market|crypto/.test(t)) score += 2;
  if (/etf|sec|fed|cpi|fomc|approval|lawsuit|listing|delisting/.test(t)) score += 3;
  if (/hack|exploit|vulnerability|breach|drain|security/.test(t)) score += 4;
  if (/%|\$|urgent|breaking|alert|spike/.test(t)) score += 2;
  if (/gm everyone|hello|random/.test(t)) score -= 3;
  return clamp(score);
}

export function scoreProviderSignal(providerId: ProviderId, input: ProviderSignalInput = {}): ProviderScore {
  const baseTextScore = textScore(input.text);
  const absMove = Math.abs(input.change24hPct ?? 0);
  const volumeMove = Math.abs(input.volumeChangePct ?? 0);
  const tvlMove = Math.abs(input.tvlChangePct ?? 0);
  const stableMove = Math.abs(input.stablecoinChangePct ?? 0);
  const repoActivity = input.repoActivity ?? 0;
  const riskFlags: string[] = ["simulation-only-no-real-trade"];
  let localScore = baseTextScore;
  let urgency = baseTextScore;
  let tradability = Math.min(8, baseTextScore + 1);
  let reliability = 6;
  let impact: ProviderImpact = "neutral";

  if (providerId === "telegram-pulse" || providerId === "telegram-news") {
    reliability = providerId === "telegram-pulse" ? 7 : 6;
    localScore = clamp(baseTextScore + (/urgent|breaking|alert/i.test(input.text ?? "") ? 2 : 0));
    urgency = localScore;
    impact = /bear|dump|hack|exploit|drain/i.test(input.text ?? "") ? "bearish" : localScore >= 6 ? "bullish" : "neutral";
  }

  if (providerId === "rss-news") {
    reliability = 8;
    localScore = clamp(baseTextScore + (/reuters|coindesk|cointelegraph|decrypt/i.test(input.text ?? "") ? 1 : 0));
    urgency = clamp(baseTextScore);
    impact = /ban|lawsuit|hack|exploit|drop/i.test(input.text ?? "") ? "bearish" : localScore >= 6 ? "bullish" : "neutral";
  }

  if (providerId === "coingecko-price") {
    reliability = 8;
    localScore = clamp(absMove * 0.7 + volumeMove * 0.04);
    urgency = clamp(absMove);
    tradability = clamp(absMove + volumeMove * 0.03);
    impact = (input.change24hPct ?? 0) >= 0 ? "bullish" : "bearish";
    if (absMove >= 8) riskFlags.push("high-volatility");
  }

  if (providerId === "defillama-tvl") {
    reliability = 8;
    localScore = clamp(tvlMove * 0.65 + stableMove * 0.8);
    urgency = clamp(tvlMove);
    tradability = clamp(3 + tvlMove * 0.25);
    impact = (input.tvlChangePct ?? 0) < -5 ? "bearish" : "neutral";
    if ((input.tvlChangePct ?? 0) <= -8) riskFlags.push("defi-liquidity-risk");
  }

  if (providerId === "github-releases") {
    reliability = 7;
    localScore = clamp(baseTextScore + repoActivity * 0.5);
    urgency = clamp(baseTextScore + repoActivity * 0.35);
    tradability = clamp(2 + baseTextScore * 0.5);
    impact = /security|vulnerability|exploit/i.test(input.text ?? "") ? "bearish" : "neutral";
    if (/security|vulnerability|exploit/i.test(input.text ?? "")) riskFlags.push("developer-security-signal");
  }

  return { providerId, localScore: clamp(localScore), urgency: clamp(urgency), tradability: clamp(tradability), reliability, impact, riskFlags };
}
