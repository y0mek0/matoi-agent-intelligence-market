import type { ProviderId } from "@/lib/provider-analysis";

/**
 * Per-call nanopayment metering for Arc bounty "Best Agentic Economy".
 *
 * Each provider has:
 * - basePriceUsdc: paid on the first call (one-time)
 * - costPerCallUsdc: paid on every call including the first
 *
 * Total cost per provider after `n` calls:
 *   n * costPerCallUsdc + basePriceUsdc
 *
 * Example: base=0.001, perCall=0.00005, n=3 -> 3*0.00005 + 0.001 = 0.00115
 *
 * The meter is immutable: every `recordNanopaymentCall` returns a new meter.
 */

export type NanopaymentProviderConfig = {
  basePriceUsdc: number;
  costPerCallUsdc: number;
};

export type NanopaymentProviderMeter = {
  providerId: ProviderId;
  calls: number;
  costPerCallUsdc: number;
  basePriceUsdc: number;
  accruedUsdc: number;
};

export type NanopaymentMeter = {
  missionId: string;
  startedAt: string;
  finishedAt?: string;
  meters: NanopaymentProviderMeter[];
  totalCalls: number;
  totalAccruedUsdc: number;
};

export const NANOPAYMENT_DEFAULT_PRICING: Record<ProviderId, NanopaymentProviderConfig> = {
  "telegram-pulse": { basePriceUsdc: 0.001, costPerCallUsdc: 0.00005 },
  "telegram-news": { basePriceUsdc: 0.001, costPerCallUsdc: 0.00005 },
  "rss-news": { basePriceUsdc: 0.0008, costPerCallUsdc: 0.00004 },
  "coingecko-price": { basePriceUsdc: 0.0005, costPerCallUsdc: 0.00003 },
  "defillama-tvl": { basePriceUsdc: 0.0008, costPerCallUsdc: 0.00004 },
  "github-releases": { basePriceUsdc: 0.0006, costPerCallUsdc: 0.00003 },
};

export function createNanopaymentMeter(missionId: string): NanopaymentMeter {
  return {
    missionId,
    startedAt: new Date().toISOString(),
    meters: [],
    totalCalls: 0,
    totalAccruedUsdc: 0,
  };
}

export function recordNanopaymentCall(
  meter: NanopaymentMeter,
  providerId: ProviderId,
  config: NanopaymentProviderConfig,
): NanopaymentMeter {
  const existing = meter.meters.find((m) => m.providerId === providerId);
  const nextMeters = existing
    ? meter.meters.map((m) => {
        if (m.providerId !== providerId) return m;
        const nextCalls = m.calls + 1;
        const nextAccrued = Number(
          (nextCalls * config.costPerCallUsdc + config.basePriceUsdc).toFixed(6),
        );
        return {
          providerId: m.providerId,
          calls: nextCalls,
          costPerCallUsdc: config.costPerCallUsdc,
          basePriceUsdc: config.basePriceUsdc,
          accruedUsdc: nextAccrued,
        };
      })
    : [
        ...meter.meters,
        {
          providerId,
          calls: 1,
          costPerCallUsdc: config.costPerCallUsdc,
          basePriceUsdc: config.basePriceUsdc,
          accruedUsdc: Number((config.costPerCallUsdc + config.basePriceUsdc).toFixed(6)),
        },
      ];

  return summarizeMeterRaw(meter, nextMeters);
}

export function summarizeNanopaymentMeter(meter: NanopaymentMeter): NanopaymentMeter {
  const totals = meter.meters.reduce(
    (acc, m) => ({
      totalCalls: acc.totalCalls + m.calls,
      totalAccruedUsdc: Number((acc.totalAccruedUsdc + m.accruedUsdc).toFixed(6)),
    }),
    { totalCalls: 0, totalAccruedUsdc: 0 },
  );
  return {
    ...meter,
    totalCalls: totals.totalCalls,
    totalAccruedUsdc: totals.totalAccruedUsdc,
  };
}

function summarizeMeterRaw(
  meter: NanopaymentMeter,
  meters: NanopaymentProviderMeter[],
): NanopaymentMeter {
  const totals = meters.reduce(
    (acc, m) => ({
      totalCalls: acc.totalCalls + m.calls,
      totalAccruedUsdc: Number((acc.totalAccruedUsdc + m.accruedUsdc).toFixed(6)),
    }),
    { totalCalls: 0, totalAccruedUsdc: 0 },
  );
  return {
    ...meter,
    meters,
    totalCalls: totals.totalCalls,
    totalAccruedUsdc: totals.totalAccruedUsdc,
  };
}

export function pricingForProvider(providerId: ProviderId): NanopaymentProviderConfig {
  return NANOPAYMENT_DEFAULT_PRICING[providerId];
}
