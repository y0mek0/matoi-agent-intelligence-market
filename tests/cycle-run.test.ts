import { describe, expect, it } from "vitest";
import { buildCycleRun } from "@/lib/cycle-run";
import { buildTelegramPulseSignal } from "@/lib/telegram-pulse";

describe("cycle run", () => {
  it("builds a bounded demo run from TelegramPulse signal", () => {
    const signal = buildTelegramPulseSignal([]);
    const run = buildCycleRun(signal);

    expect(run.decision).toBe("BUY_SMALL_SIMULATED");
    expect(run.tradeExecution).toBe("disabled");
    expect(run.payment.approved).toBe(true);
    expect(run.payment.rail).toBe("hedera-x402");
    expect(run.intelligence.mode).toBe("deterministic-fallback");
    expect(run.intelligence.riskFlags).toContain("simulation-only-no-real-trade");
    expect(run.arcPlan.allowed).toBe(true);
    expect(run.arcPlan.actions.some((action) => action.kind === "AUTHORIZE_PROVIDER_PAYMENT" && action.realTrade === false)).toBe(true);
    expect(run.auditEvents.map((event) => event.type)).toEqual([
      "cycle_started",
      "payment_approved",
      "arc_action_planned",
      "provider_signal_released",
      "decision_produced",
    ]);
    const arcEvent = run.auditEvents.find((event) => event.type === "arc_action_planned")!;
    expect(arcEvent.rail).toBe("arc-usdc");
    expect(arcEvent.payload).toMatchObject({ actionCount: 3, network: "ARC-TESTNET", realTrade: false });
    expect(JSON.stringify(run)).not.toContain("SECRET");
    expect(JSON.stringify(run)).not.toContain("PRIVATE");
  });
});
