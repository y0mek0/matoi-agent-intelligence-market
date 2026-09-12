import { describe, expect, it } from "vitest";
import {
  createNanopaymentMeter,
  recordNanopaymentCall,
  summarizeNanopaymentMeter,
  type NanopaymentMeter,
} from "@/lib/nanopayments";

describe("nanopayments meter", () => {
  it("creates an empty meter for a mission", () => {
    const meter = createNanopaymentMeter("mission-1");
    expect(meter.missionId).toBe("mission-1");
    expect(meter.totalCalls).toBe(0);
    expect(meter.totalAccruedUsdc).toBe(0);
    expect(meter.meters).toEqual([]);
  });

  it("accrues base price on first call and per-call price on each subsequent call", () => {
    const meter = createNanopaymentMeter("mission-1");
    const basePriceUsdc = 0.001;
    const costPerCallUsdc = 0.00005;
    const next = recordNanopaymentCall(meter, "telegram-pulse", { basePriceUsdc, costPerCallUsdc });
    const after5 = recordNanopaymentCall(next, "telegram-pulse", { basePriceUsdc, costPerCallUsdc });
    const after10 = recordNanopaymentCall(after5, "telegram-pulse", { basePriceUsdc, costPerCallUsdc });
    const summary = summarizeNanopaymentMeter(after10);
    const telegram = summary.meters.find((m) => m.providerId === "telegram-pulse");
    expect(telegram).toBeDefined();
    expect(telegram!.calls).toBe(3);
    // Accrued at any moment = n*perCall + base (current state, not summed deltas)
    // After 3 calls: 3 * 0.00005 + 0.001 = 0.00115
    expect(telegram!.accruedUsdc).toBeCloseTo(0.00115, 5);
    expect(summary.totalCalls).toBe(3);
  });

  it("accrues independently per provider", () => {
    let meter: NanopaymentMeter = createNanopaymentMeter("mission-2");
    meter = recordNanopaymentCall(meter, "telegram-pulse", { basePriceUsdc: 0.001, costPerCallUsdc: 0.00005 });
    meter = recordNanopaymentCall(meter, "coingecko-price", { basePriceUsdc: 0.0005, costPerCallUsdc: 0.00003 });
    meter = recordNanopaymentCall(meter, "telegram-pulse", { basePriceUsdc: 0.001, costPerCallUsdc: 0.00005 });
    const summary = summarizeNanopaymentMeter(meter);
    expect(summary.meters.length).toBe(2);
    const telegram = summary.meters.find((m) => m.providerId === "telegram-pulse")!;
    const coingecko = summary.meters.find((m) => m.providerId === "coingecko-price")!;
    expect(telegram.calls).toBe(2);
    expect(coingecko.calls).toBe(1);
    // Telegram: 2 calls, base 0.001 + 2*0.00005 = 0.0011
    expect(telegram.accruedUsdc).toBeCloseTo(0.0011, 5);
    // Coingecko: 1 call, base 0.0005 + 1*0.00003 = 0.00053
    expect(coingecko.accruedUsdc).toBeCloseTo(0.00053, 5);
    expect(summary.totalCalls).toBe(3);
    // total accrued across providers = sum of provider accrued states
    expect(summary.totalAccruedUsdc).toBeCloseTo(0.00163, 5);
  });

  it("does not mutate the input meter (immutable)", () => {
    const meter = createNanopaymentMeter("mission-3");
    const next = recordNanopaymentCall(meter, "rss-news", { basePriceUsdc: 0.001, costPerCallUsdc: 0.00004 });
    expect(meter.meters.length).toBe(0);
    expect(next.meters.length).toBe(1);
  });
});
