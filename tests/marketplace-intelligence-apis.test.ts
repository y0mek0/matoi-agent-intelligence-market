import { describe, expect, it } from "vitest";
import { POST as inspectorPost } from "@/app/api/agents/inspector/route";
import { POST as reputationPost } from "@/app/api/agents/reputation/route";
import { POST as quotePost } from "@/app/api/agents/quote/route";

describe("reputation/quote/inspector APIs", () => {
  it("rejects provider reputation updates without providerId", async () => {
    const response = await reputationPost(new Request("http://test/api/agents/reputation", { method: "POST", body: JSON.stringify({}) }));
    expect(response.status).toBe(400);
  });

  it("rates a provider via API", async () => {
    const response = await reputationPost(new Request("http://test/api/agents/reputation", { method: "POST", body: JSON.stringify({ providerId: "rss-news", missionId: "api-rate", outcome: "useful" }) }));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.reputation.providerId).toBe("rss-news");
  });

  it("quotes a provider via API", async () => {
    const response = await quotePost(new Request("http://test/api/agents/quote", { method: "POST", body: JSON.stringify({ providerId: "coingecko-price", localScore: 8, gptScore: 8, urgency: 7, freshnessHours: 1 }) }));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.quote.providerId).toBe("coingecko-price");
  });

  it("runs the inspector via API", async () => {
    const response = await inspectorPost(new Request("http://test/api/agents/inspector", { method: "POST", body: JSON.stringify({ scenarioId: "fast-eth-risk-check" }) }));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.inspectorId).toBe("cross-provider-inspector");
  });
});
