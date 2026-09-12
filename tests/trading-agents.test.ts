import { describe, expect, it } from "vitest";
import { buildTradingAgentDesk } from "@/lib/trading-agents";

describe("trading agents", () => {
  it("produces competing simulation-only trade intents from provider intelligence", () => {
    const desk = buildTradingAgentDesk({ asset: "ETH", sentiment: "bullish", confidence: 0.78, riskFlags: ["simulation-only-no-real-trade"] });
    expect(desk.agents.map((agent) => agent.id)).toEqual(["momentum-trader", "mean-reversion-trader", "risk-guard-trader"]);
    expect(desk.consensus.intent).toBe("BUY_SMALL_SIMULATED");
    expect(desk.consensus.execution).toBe("disabled");
    expect(desk.agents.every((agent) => agent.execution === "disabled")).toBe(true);
    expect(JSON.stringify(desk)).not.toMatch(/private|secret|token|wallet-|sk-or/i);
  });

  it("risk guard blocks buying on bearish or low-confidence inputs", () => {
    const desk = buildTradingAgentDesk({ asset: "ETH", sentiment: "bearish", confidence: 0.52, riskFlags: [] });
    expect(desk.consensus.intent).toBe("HOLD");
    expect(desk.consensus.reason).toMatch(/risk/i);
  });
});
