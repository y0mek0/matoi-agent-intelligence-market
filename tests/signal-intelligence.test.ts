import { describe, expect, it } from "vitest";
import { buildSignalIntelligence, parseOpenRouterSignalAnalysis } from "@/lib/signal-intelligence";
import type { TelegramPulseSignal } from "@/lib/telegram-pulse";

const signal: TelegramPulseSignal = {
  provider: "TelegramPulse",
  mode: "LIVE TELEGRAM",
  asset: "ETH",
  confidence: 0.61,
  sentiment: "bullish",
  intensity: 0.44,
  sampleSize: 2,
  summary: "2 recent ETH Telegram messages classified as bullish.",
  recent: [
    { timestamp: "2026-01-01T00:00:00.000Z", asset: "ETH", sentiment: "bullish", text: "ETH long setup looks strong", hash: "a1" },
    { timestamp: "2026-01-01T00:01:00.000Z", asset: "ETH", sentiment: "neutral", text: "wait for audit proof", hash: "b2" },
  ],
};

describe("signal intelligence", () => {
  it("builds a safe deterministic analysis when LLM output is unavailable", () => {
    const analysis = buildSignalIntelligence(signal);

    expect(analysis.mode).toBe("deterministic-fallback");
    expect(analysis.asset).toBe("ETH");
    expect(analysis.decisionBias).toBe("BUY_SMALL_SIMULATED");
    expect(analysis.riskFlags).toContain("simulation-only-no-real-trade");
    expect(JSON.stringify(analysis)).not.toContain("ETH long setup looks strong");
  });

  it("keeps a non-bearish thin sample demo-actionable while flagging sample risk", () => {
    const thinSignal = { ...signal, sampleSize: 1, confidence: 0.61, sentiment: "neutral" as const, recent: signal.recent.slice(0, 1) };
    const analysis = buildSignalIntelligence(thinSignal);

    expect(analysis.decisionBias).toBe("BUY_SMALL_SIMULATED");
    expect(analysis.riskFlags).toContain("thin-sample");
  });

  it("parses JSON wrapped in markdown fences", () => {
    const parsed = parseOpenRouterSignalAnalysis('```json\n{"decisionBias":"BUY_SMALL_SIMULATED","thesis":"Small simulated action only.","riskFlags":["thin-sample"],"confidence":0.66}\n```', signal);

    expect(parsed.mode).toBe("openrouter");
    expect(parsed.decisionBias).toBe("BUY_SMALL_SIMULATED");
    expect(parsed.confidence).toBe(0.66);
  });

  it("parses strict OpenRouter JSON while ignoring unsafe fields", () => {
    const parsed = parseOpenRouterSignalAnalysis('{"decisionBias":"HOLD","thesis":"Wait for confirmation.","riskFlags":["thin-sample"],"secret":"do-not-ship"}', signal);

    expect(parsed.mode).toBe("openrouter");
    expect(parsed.decisionBias).toBe("HOLD");
    expect(parsed.thesis).toBe("Wait for confirmation.");
    expect(parsed.riskFlags).toEqual(["thin-sample", "simulation-only-no-real-trade"]);
    expect(JSON.stringify(parsed)).not.toContain("do-not-ship");
  });
});
