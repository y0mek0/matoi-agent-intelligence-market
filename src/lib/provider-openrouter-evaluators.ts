import type { ProviderId, ProviderImpact } from "@/lib/provider-analysis";
import { normalizeProviderScore } from "@/lib/provider-analysis";

export type ProviderPrompt = { system: string; user: string };
export type ProviderGptEvaluation = { gptScore: number; summary: string; impact: ProviderImpact; riskFlags: string[] };

const systems: Record<ProviderId, string> = {
  "telegram-pulse": "You are a Telegram/social market intelligence provider. Score urgency, novelty, duplication risk, and actionability for a buyer mission. Return compact JSON only.",
  "telegram-news": "You are a public Telegram news intelligence provider. Detect breaking crypto narratives and separate signal from channel noise. Return compact JSON only.",
  "rss-news": "You are a publisher news intelligence agent. Decide whether the headline changes a buyer's market/risk decision. Return compact JSON only.",
  "coingecko-price": "You are a price and volume intelligence agent. Interpret price moves and volume anomalies relative to the buyer mission. Simulation-only; return compact JSON only.",
  "defillama-tvl": "You are a DeFi TVL and stablecoin risk intelligence agent. Evaluate liquidity and treasury risk. Return compact JSON only.",
  "github-releases": "You are a developer/security intelligence agent. Decide if repo releases or security activity indicate material protocol risk. Return compact JSON only.",
};

export function buildProviderOpenRouterPrompt(providerId: ProviderId, missionId: string, evidence = ""): ProviderPrompt {
  return {
    system: systems[providerId],
    user: JSON.stringify({ missionId, evidence: evidence.slice(0, 900), schema: { gptScore: "0..10", summary: "short", impact: "bullish|bearish|neutral|unknown", riskFlags: ["string"] } }),
  };
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return fenced ?? text;
}

export function parseProviderOpenRouterJson(text: string): ProviderGptEvaluation {
  try {
    const parsed = JSON.parse(extractJson(text));
    const impact = ["bullish", "bearish", "neutral", "unknown"].includes(parsed.impact) ? parsed.impact as ProviderImpact : "unknown";
    const riskFlags = Array.isArray(parsed.riskFlags) ? parsed.riskFlags.filter((x: unknown) => typeof x === "string" && !/(secret|key|token|private|wallet)/i.test(x)).slice(0, 5) : [];
    return { gptScore: normalizeProviderScore(Number(parsed.gptScore ?? 0)), summary: String(parsed.summary ?? "No provider summary.").slice(0, 220), impact, riskFlags };
  } catch {
    return { gptScore: 0, summary: "Provider evaluator returned invalid JSON; deterministic scorer used.", impact: "unknown", riskFlags: ["provider-evaluator-fallback"] };
  }
}

export function buildDeterministicProviderEvaluation(providerId: ProviderId, localScore: number, impact: ProviderImpact): ProviderGptEvaluation {
  const label = providerId.replace(/-/g, " ");
  return { gptScore: normalizeProviderScore(localScore), summary: `${label} scored this source at ${normalizeProviderScore(localScore).toFixed(1)}/10 for the buyer mission.`, impact, riskFlags: ["openrouter-optional-deterministic-fallback"] };
}
