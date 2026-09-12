import { describe, expect, it } from "vitest";
import { runDemoCycle } from "@/lib/cycle";

describe("demo cycle", () => {
  it("produces a bounded simulated decision without selecting Reddit", () => {
    const cycle = runDemoCycle();
    expect(cycle.decision).toBe("BUY_SMALL_SIMULATED");
    expect(cycle.selected.map((item) => item.provider.id)).not.toContain("reddit-pulse");
    expect(cycle.disabledCheck).toMatchObject({ approved: false, code: "provider-disabled" });
  });
});
