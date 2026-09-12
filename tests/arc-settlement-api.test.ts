import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/arc/settlement/run/route";

describe("Arc settlement API", () => {
  it("returns a judge-visible Arc treasury proof without real transfers", async () => {
    const response = await POST(new Request("http://local/api/arc/settlement/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        missionId: "api-arc-test",
        buyerId: "buyer-agent",
        providerIds: ["telegram-pulse", "rss-news"],
        budgetUsd: 0.05,
        requestedUsd: 0.02,
        idempotencyKey: "api-arc-test",
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.network).toBe("ARC-TESTNET");
    expect(body.realUsdcTransfer).toBe(false);
    expect(body.proof.hcsReady).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/wallet-|sk-or|PRIVATE|0x[a-f0-9]{64}/i);
  });
});
