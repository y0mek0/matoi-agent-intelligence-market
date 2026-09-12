import { buildSignalIntelligence, parseOpenRouterSignalAnalysis, type SignalIntelligence } from "@/lib/signal-intelligence";
import type { TelegramPulseSignal } from "@/lib/telegram-pulse";

export type OpenRouterEnv = Record<string, string | undefined>;

export function shouldUseOpenRouter(env: OpenRouterEnv = process.env) {
  return Boolean(env.OPENROUTER_API_KEY && env.OPENROUTER_MODEL);
}

function buildPrompt(signal: TelegramPulseSignal) {
  const compactRecent = signal.recent.map((item) => ({ sentiment: item.sentiment, hash: item.hash, text: item.text.slice(0, 120) }));
  return [
    "You analyze Telegram ETH market-intelligence snippets for a testnet-only autonomous agent demo.",
    "Return strict JSON only with keys: decisionBias, thesis, riskFlags, confidence.",
    "decisionBias must be one of BUY_SMALL_SIMULATED, HOLD, REQUEST_MORE_DATA.",
    "Never recommend real trades, swaps, or mainnet activity.",
    JSON.stringify({ summary: signal.summary, sentiment: signal.sentiment, confidence: signal.confidence, sampleSize: signal.sampleSize, recent: compactRecent }),
  ].join("\n");
}

export async function analyzeSignalWithOpenRouter(signal: TelegramPulseSignal, env: OpenRouterEnv = process.env): Promise<SignalIntelligence> {
  if (!shouldUseOpenRouter(env)) return buildSignalIntelligence(signal);
  const baseUrl = env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  try {
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
        messages: [{ role: "user", content: buildPrompt(signal) }],
      }),
    });
    if (!response.ok) return buildSignalIntelligence(signal);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    return content ? parseOpenRouterSignalAnalysis(content, signal) : buildSignalIntelligence(signal);
  } catch {
    return buildSignalIntelligence(signal);
  }
}
