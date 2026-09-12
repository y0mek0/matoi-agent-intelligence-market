export type PaymentRail = "hedera-x402" | "arc-usdc" | "demo-fallback";

export type SpendRequest = {
  providerId: string;
  rail: PaymentRail;
  amountUsd: number;
  confidence: number;
  dailySpentUsd: number;
  reason: string;
};

export type SpendPolicy = {
  perCallLimitUsd: number;
  dailyLimitUsd: number;
  minConfidence: number;
  allowedRails: PaymentRail[];
  disabledProviders: string[];
};

export type PolicyDecision = {
  approved: boolean;
  code: "approved" | "provider-disabled" | "rail-disabled" | "per-call-limit" | "daily-limit" | "low-confidence";
  message: string;
};

export const defaultNovaPolicy: SpendPolicy = {
  perCallLimitUsd: 0.05,
  dailyLimitUsd: 0.35,
  minConfidence: 0.68,
  allowedRails: ["hedera-x402", "arc-usdc", "demo-fallback"],
  disabledProviders: ["reddit-pulse"],
};

export function evaluateSpend(policy: SpendPolicy, request: SpendRequest): PolicyDecision {
  if (policy.disabledProviders.includes(request.providerId)) {
    return { approved: false, code: "provider-disabled", message: "Provider is disabled by policy." };
  }
  if (!policy.allowedRails.includes(request.rail)) {
    return { approved: false, code: "rail-disabled", message: "Payment rail is not allowed for this agent." };
  }
  if (request.amountUsd > policy.perCallLimitUsd) {
    return { approved: false, code: "per-call-limit", message: "Request exceeds the per-call spending limit." };
  }
  if (request.dailySpentUsd + request.amountUsd > policy.dailyLimitUsd) {
    return { approved: false, code: "daily-limit", message: "Request would exceed the daily spending limit." };
  }
  if (request.confidence < policy.minConfidence) {
    return { approved: false, code: "low-confidence", message: "Provider confidence is below the policy threshold." };
  }
  return { approved: true, code: "approved", message: "Approved by Matoi spending policy." };
}
