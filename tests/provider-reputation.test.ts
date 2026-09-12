import { beforeEach, describe, expect, it } from "vitest";
import { getProviderReputation, rateProvider, disputeProvider, resetProviderReputationForTests } from "@/lib/provider-reputation";

describe("provider reputation", () => {
  beforeEach(() => resetProviderReputationForTests());

  it("starts neutral and updates after a rating", () => {
    const provider = "rss-news" as Parameters<typeof rateProvider>[0];
    const initial = getProviderReputation(provider);
    const after = rateProvider(provider, `m1-${Date.now()}`, "useful");
    expect(after.ratingsCount).toBeGreaterThanOrEqual(initial.ratingsCount);
    expect(after.useful).toBeGreaterThanOrEqual(1);
    expect(after.score).toBeGreaterThan(initial.score - 0.01);
  });

  it("drops the score when a dispute is recorded", () => {
    const provider = "coingecko-price" as Parameters<typeof disputeProvider>[0];
    rateProvider(provider, "good-mission", "useful");
    const before = getProviderReputation(provider);
    disputeProvider(provider, "bad-mission", "duplicate");
    const after = getProviderReputation(provider);
    expect(after.wrong).toBeGreaterThanOrEqual(before.wrong + 1);
  });
});
