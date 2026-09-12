import { describe, expect, it } from "vitest";
import { runMission } from "@/lib/mission-orchestrator";

describe("mission orchestrator", () => {
  it("runs a scenario through provider scoring, Arc spend authorization, trading votes, and task-relative summary", async () => {
    const result = await runMission({ scenarioId: "dao-treasury-rebalance", useOpenRouter: false });
    expect(result.scenario.id).toBe("dao-treasury-rebalance");
    expect(result.providerAnalyses.length).toBeGreaterThanOrEqual(3);
    expect(result.arc.authorizedUsd).toBeLessThanOrEqual(result.scenario.budgetUsd);
    expect(result.arc.entries.length).toBe(result.providerAnalyses.length);
    expect(result.summary.thesis).toMatch(/DAO|treasury|rebalance/i);
    expect(result.decision.execution).toBe("disabled");
    expect(result.auditEvents.some((event) => event.type === "arc_action_planned")).toBe(true);
    expect(result.a2aTranscript.length).toBeGreaterThanOrEqual(8);
    expect(result.a2aTranscript.map((message) => message.type)).toEqual(expect.arrayContaining([
      "DISCOVER_PROVIDERS",
      "QUOTE_OFFERED",
      "QUOTE_RANKED",
      "SPEND_AUTHORIZED",
      "X402_CHALLENGE_CREATED",
      "X402_RECEIPT_VERIFIED",
      "INTELLIGENCE_DELIVERED",
      "RISK_REVIEWED",
      "SIMULATION_DECISION",
      "HCS_PROOF_READY",
    ]));
    expect(result.a2aTranscript.every((message) => message.missionId === result.scenario.id)).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/wallet-|sk-or|TEST_API_KEY|0x[a-f0-9]{64}|3030020100/i);
  });
});
