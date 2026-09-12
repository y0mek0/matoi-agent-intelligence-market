import crypto from "node:crypto";
import { shouldUseOpenRouter } from "@/lib/openrouter-signal";
import type { ProviderGptEvaluation, ProviderPrompt } from "@/lib/provider-openrouter-evaluators";
import type { ProviderId, ProviderImpact } from "@/lib/provider-analysis";

export type ProviderEvidence = Record<string, unknown>;

export type OpenRouterLiveCall = {
  providerId: ProviderId;
  system: string;
  user: string;
  ok: boolean;
  raw?: string;
  evaluation: ProviderGptEvaluation;
  durationMs: number;
  usedFallback: boolean;
  error?: string;
};

const allowedImpacts: ProviderImpact[] = ["bullish", "bearish", "neutral", "unknown"];

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10, value));
}

function safeSummary(text: unknown, fallback: string) {
  if (typeof text !== "string") return fallback;
  return text.replace(/\b(sk-[A-Za-z0-9_-]+|[A-Za-z0-9_-]{32,})\b/g, "[REDACTED]").slice(0, 220);
}

function safeImpact(value: unknown, fallback: ProviderImpact): ProviderImpact {
  return typeof value === "string" && (allowedImpacts as string[]).includes(value) ? value as ProviderImpact : fallback;
}

function safeRiskFlags(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.replace(/\b(sk-[A-Za-z0-9_-]+|[A-Za-z0-9_-]{32,})\b/g, "[REDACTED]"))
    .filter((entry) => !/(secret|key|token|private|wallet)/i.test(entry))
    .slice(0, 5);
}

function extractJson(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const text = fenced?.[1] ?? raw;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function parseEvaluation(raw: string, fallback: ProviderImpact): ProviderGptEvaluation {
  try {
    const parsed = JSON.parse(extractJson(raw)) as Record<string, unknown>;
    return {
      gptScore: clampScore(Number(parsed.gptScore ?? 0)),
      summary: safeSummary(parsed.summary, "Provider evaluator returned no summary."),
      impact: safeImpact(parsed.impact, fallback),
      riskFlags: safeRiskFlags(parsed.riskFlags),
    };
  } catch {
    return { gptScore: 0, summary: "Provider evaluator JSON parse failed; deterministic score used.", impact: fallback, riskFlags: ["provider-evaluator-fallback"] };
  }
}

function deterministicEvaluation(providerId: ProviderId, localScore: number, impact: ProviderImpact): ProviderGptEvaluation {
  return { gptScore: clampScore(localScore), summary: `${providerId} scored this source at ${clampScore(localScore).toFixed(1)}/10 for the buyer mission.`, impact, riskFlags: ["openrouter-optional-deterministic-fallback"] };
}

export async function callProviderOpenRouter(prompt: ProviderPrompt, providerId: ProviderId, evidence: ProviderEvidence, env: Record<string, string | undefined> = process.env): Promise<OpenRouterLiveCall> {
  const started = Date.now();
  const localImpact: ProviderImpact = evidence.impact === "bullish" || evidence.impact === "bearish" ? (evidence.impact as ProviderImpact) : "unknown";
  const evidenceHash = crypto.createHash("sha256").update(`${providerId}:${JSON.stringify(evidence).slice(0, 600)}`).digest("hex").slice(0, 12);

  if (!shouldUseOpenRouter(env)) {
    return { providerId, system: prompt.system, user: prompt.user, ok: false, evaluation: { ...deterministicEvaluation(providerId, Number(evidence.localScore ?? 0), localImpact), riskFlags: [...deterministicEvaluation(providerId, Number(evidence.localScore ?? 0), localImpact).riskFlags, `local-score-${evidenceHash}`] }, durationMs: Date.now() - started, usedFallback: true };
  }

  try {
    const baseUrl = env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://agent-intelligence-market.local",
        "X-Title": "Agent Intelligence Market",
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL,
        temperature: 0.1,
        max_tokens: 220,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: `${prompt.user}\n\nevidenceHash=${evidenceHash}\nReturn JSON only.` },
        ],
      }),
    });
    const raw = await response.text();
    if (!response.ok) {
      return { providerId, system: prompt.system, user: prompt.user, ok: false, raw, evaluation: deterministicEvaluation(providerId, Number(evidence.localScore ?? 0), localImpact), durationMs: Date.now() - started, usedFallback: true, error: `http_${response.status}` };
    }
    const data = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";
    return { providerId, system: prompt.system, user: prompt.user, ok: true, raw: content, evaluation: parseEvaluation(content, localImpact), durationMs: Date.now() - started, usedFallback: false };
  } catch (error) {
    return { providerId, system: prompt.system, user: prompt.user, ok: false, evaluation: deterministicEvaluation(providerId, Number(evidence.localScore ?? 0), localImpact), durationMs: Date.now() - started, usedFallback: true, error: error instanceof Error ? error.message : "openrouter_error" };
  }
}
