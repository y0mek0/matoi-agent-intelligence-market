import { describe, expect, it } from "vitest";
import { POST as runMissionPost } from "@/app/api/mission/run/route";
import { POST as authorizePost } from "@/app/api/arc/authorize-payment/route";

describe("mission and Arc APIs", () => {
  it("runs a scenario mission through the API", async () => {
    const response = await runMissionPost(new Request("http://test/api/mission/run", { method: "POST", body: JSON.stringify({ scenarioId: "security-event-shock" }) }));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.scenario.id).toBe("security-event-shock");
    expect(json.arc.network).toBe("ARC-TESTNET");
    expect(json.decision.execution).toBe("disabled");
    expect(json.a2aTranscript).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: "BuyerAgent", to: "DirectoryAgent", type: "DISCOVER_PROVIDERS" }),
      expect.objectContaining({ to: "ArcTreasuryAgent", type: "SPEND_AUTHORIZED" }),
      expect.objectContaining({ to: "HCSAuditAgent", type: "HCS_PROOF_READY" }),
    ]));
  });

  it("authorizes provider payment intent through the API", async () => {
    const response = await authorizePost(new Request("http://test/api/arc/authorize-payment", { method: "POST", body: JSON.stringify({ missionId: "m", buyerId: "b", providerId: "rss-news", amountUsd: 0.01, idempotencyKey: "api-test" }) }));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.entry.network).toBe("ARC-TESTNET");
    expect(json.entry.realUsdcTransfer).toBe(false);
  });
});
