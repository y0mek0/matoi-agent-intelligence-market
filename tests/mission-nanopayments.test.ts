import { describe, expect, it } from "vitest";
import { runMission } from "@/lib/mission-orchestrator";

describe("mission orchestrator nanopayments", () => {
  it("emits a non-empty nanopayment meter in the mission result", async () => {
    const result = await runMission({ scenarioId: "dao-treasury-rebalance", useOpenRouter: false });
    expect(result.nanopayments).toBeDefined();
    expect(result.nanopayments.totalCalls).toBeGreaterThan(0);
    expect(result.nanopayments.totalAccruedUsdc).toBeGreaterThan(0);
    expect(result.nanopayments.meters.length).toBeGreaterThan(0);
    for (const meter of result.nanopayments.meters) {
      expect(meter.costPerCallUsdc).toBeGreaterThan(0);
      expect(meter.basePriceUsdc).toBeGreaterThan(0);
      expect(meter.accruedUsdc).toBeGreaterThan(0);
      expect(meter.accruedUsdc).toBeCloseTo(meter.calls * meter.costPerCallUsdc + meter.basePriceUsdc, 5);
    }
  });

  it("adds calls and costPerCall fields to INTELLIGENCE_DELIVERED a2a messages", async () => {
    const result = await runMission({ scenarioId: "dao-treasury-rebalance", useOpenRouter: false });
    const delivered = result.a2aTranscript.filter((m) => m.type === "INTELLIGENCE_DELIVERED");
    expect(delivered.length).toBeGreaterThan(0);
    // All delivered messages should have calls >= 1 and costPerCall > 0
    for (const message of delivered) {
      expect(message.calls).toBeGreaterThanOrEqual(1);
      expect(message.costPerCall).toBeGreaterThan(0);
    }
  });
});
