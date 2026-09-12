import type { BuyerMission } from "@/lib/agent-marketplace";

export type ArcActionKind = "AUTHORIZE_PROVIDER_PAYMENT" | "RESERVE_BUYER_BUDGET" | "RECORD_HCS_AUDIT";

export type ArcActionPlan = {
  network: "ARC-TESTNET";
  allowed: boolean;
  blockers: string[];
  buyerWalletRole: "Buyer";
  actions: Array<{
    kind: ArcActionKind;
    amountUsd: number;
    rail: "arc-usdc" | "hedera-hcs";
    memo: string;
    realTrade: false;
  }>;
};

export function buildArcActionPlan(
  mission: BuyerMission,
  context: { treasuryReady: boolean; selectedProviderIds: string[]; confidence: number },
): ArcActionPlan {
  const blockers: string[] = [];
  if (!context.treasuryReady) blockers.push("arc_treasury_not_ready");
  if (context.confidence < (mission.riskProfile === "conservative" ? 0.72 : mission.riskProfile === "balanced" ? 0.66 : 0.6)) blockers.push("confidence_below_policy");
  if (context.selectedProviderIds.length === 0) blockers.push("no_provider_selected");
  const perProvider = Math.min(0.01, mission.budgetUsd / Math.max(context.selectedProviderIds.length, 1));

  if (blockers.length) {
    return { network: "ARC-TESTNET", allowed: false, blockers, buyerWalletRole: "Buyer", actions: [] };
  }

  return {
    network: "ARC-TESTNET",
    allowed: true,
    blockers,
    buyerWalletRole: "Buyer",
    actions: [
      {
        kind: "AUTHORIZE_PROVIDER_PAYMENT",
        amountUsd: perProvider * context.selectedProviderIds.length,
        rail: "arc-usdc",
        memo: `Authorize ${context.selectedProviderIds.length} provider signal purchase(s) for ${mission.asset}.`,
        realTrade: false,
      },
      {
        kind: "RESERVE_BUYER_BUDGET",
        amountUsd: Math.max(0, mission.budgetUsd - perProvider * context.selectedProviderIds.length),
        rail: "arc-usdc",
        memo: `Reserve remaining buyer budget for mission ${mission.id}.`,
        realTrade: false,
      },
      {
        kind: "RECORD_HCS_AUDIT",
        amountUsd: 0,
        rail: "hedera-hcs",
        memo: "Anchor Arc action intent and policy decision on Hedera HCS.",
        realTrade: false,
      },
    ],
  };
}
