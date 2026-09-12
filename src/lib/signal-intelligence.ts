import type { TelegramPulseSignal } from "@/lib/telegram-pulse";

export type SignalDecisionBias = "BUY_SMALL_SIMULATED" | "HOLD" | "REQUEST_MORE_DATA";

export type SignalIntelligence = {
  mode: "deterministic-fallback" | "openrouter";
  asset: "ETH";
  decisionBias: SignalDecisionBias;
  confidence: number;
  thesis: string;
  riskFlags: string[];
};

const allowedBias = new Set<SignalDecisionBias>(["BUY_SMALL_SIMULATED", "HOLD", "REQUEST_MORE_DATA"]);
const requiredSafetyFlag = "simulation-only-no-real-trade";

function safeText(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value : fallback;
  return text.replace(/\b(sk-[A-Za-z0-9_-]+|[A-Za-z0-9_-]{32,})\b/g, "[REDACTED]").slice(0, 220);
}

function fallbackBias(signal: TelegramPulseSignal): SignalDecisionBias {
  if (signal.sentiment === "bearish") return "HOLD";
  if (signal.confidence < 0.5) return "REQUEST_MORE_DATA";
  return "BUY_SMALL_SIMULATED";
}

function uniqueRiskFlags(flags: unknown[]) {
  return Array.from(new Set([...flags.filter((flag): flag is string => typeof flag === "string").map((flag) => safeText(flag, "risk")), requiredSafetyFlag])).slice(0, 5);
}

export function buildSignalIntelligence(signal: TelegramPulseSignal): SignalIntelligence {
  const bias = fallbackBias(signal);
  const riskFlags = [signal.mode === "DEMO FIXTURE" ? "fixture-input" : "live-input", signal.sampleSize < 4 ? "thin-sample" : "sample-ok"];
  return {
    mode: "deterministic-fallback",
    asset: "ETH",
    decisionBias: bias,
    confidence: signal.confidence,
    thesis: `${signal.provider} reports ${signal.sentiment} ETH pressure from ${signal.sampleSize} samples; policy allows simulation only.`,
    riskFlags: uniqueRiskFlags(riskFlags),
  };
}

function extractJsonObject(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const text = fenced?.[1] ?? raw;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

export function parseOpenRouterSignalAnalysis(raw: string, signal: TelegramPulseSignal): SignalIntelligence {
  try {
    const parsed = JSON.parse(extractJsonObject(raw)) as { decisionBias?: unknown; thesis?: unknown; riskFlags?: unknown; confidence?: unknown };
    const decisionBias = typeof parsed.decisionBias === "string" && allowedBias.has(parsed.decisionBias as SignalDecisionBias) ? parsed.decisionBias as SignalDecisionBias : fallbackBias(signal);
    const riskFlags = Array.isArray(parsed.riskFlags) ? parsed.riskFlags : [];
    const confidence = typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(0.95, parsed.confidence)) : signal.confidence;
    return {
      mode: "openrouter",
      asset: "ETH",
      decisionBias,
      confidence: Number(confidence.toFixed(2)),
      thesis: safeText(parsed.thesis, buildSignalIntelligence(signal).thesis),
      riskFlags: uniqueRiskFlags(riskFlags),
    };
  } catch {
    return buildSignalIntelligence(signal);
  }
}
