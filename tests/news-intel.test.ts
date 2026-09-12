import { describe, expect, it } from "vitest";
import { summarizeNewsItems } from "@/lib/news-intel";

describe("news intel bridge", () => {
  it("summarizes safe fields only and never echoes secrets", () => {
    const summary = summarizeNewsItems([
      {
        hash: "abc",
        score: 4,
        importance: 8,
        asset: "ETH",
        impact: "bullish",
        timeHorizon: "24h",
        summary: "ETF flow positive",
        actions: ["monitor"],
        analyzedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(summary.count).toBe(1);
    expect(summary.avgImportance).toBe(8);
    expect(summary.bullishShare).toBe(1);
    expect(summary.topAssets[0]).toBe("ETH");
  });
});
