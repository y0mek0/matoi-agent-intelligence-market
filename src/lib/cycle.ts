import { defaultNovaPolicy, evaluateSpend } from "./policy";
import { selectableProviders, providers } from "./providers";

export type CycleStep = {
  label: string;
  state: "complete" | "active" | "soon" | "blocked";
  detail: string;
};

export function runDemoCycle() {
  const dailySpentUsd = 0.04;
  const selected = selectableProviders().filter((provider) => provider.id !== "risk-guard");
  const approvals = selected.map((provider) => ({
    provider,
    decision: evaluateSpend(defaultNovaPolicy, {
      providerId: provider.id,
      rail: provider.rail,
      amountUsd: provider.priceUsd,
      confidence: provider.confidence,
      dailySpentUsd,
      reason: provider.signal,
    }),
  }));

  const rejectedReddit = evaluateSpend(defaultNovaPolicy, {
    providerId: "reddit-pulse",
    rail: "demo-fallback",
    amountUsd: 0.01,
    confidence: 0.4,
    dailySpentUsd,
    reason: "Attempt to use disabled provider.",
  });

  const decision = approvals.every((item) => item.decision.approved) ? "BUY_SMALL_SIMULATED" : "REQUEST_MORE_DATA";

  const steps: CycleStep[] = [
    { label: "Signal request", state: "complete", detail: "Matoi asks TelegramPulse for ETH social momentum." },
    { label: "Policy gate", state: "complete", detail: "Per-call and daily limits approve the testnet purchase." },
    { label: "Payment rail", state: "active", detail: "Hedera x402 and Arc USDC adapters are connected as testnet rails." },
    { label: "Decision", state: "complete", detail: `${decision}. No real trade is executed.` },
    { label: "HCS audit", state: "soon", detail: "Audit anchoring is planned after the first end-to-end cycle." },
  ];

  return {
    decision,
    dailySpentUsd,
    selected: approvals,
    disabledCheck: rejectedReddit,
    providers,
    steps,
  };
}
