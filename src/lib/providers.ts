import type { PaymentRail } from "./policy";

export type ProviderStatus = "live-ready" | "demo" | "soon" | "disabled";

export type Provider = {
  id: string;
  name: string;
  role: string;
  priceUsd: number;
  confidence: number;
  rail: PaymentRail;
  status: ProviderStatus;
  signal: string;
};

export const providers: Provider[] = [
  {
    id: "telegram-pulse",
    name: "TelegramPulse",
    role: "Social signal agent",
    priceUsd: 0.01,
    confidence: 0.76,
    rail: "hedera-x402",
    status: "live-ready",
    signal: "ETH discussion intensity is rising in the demo group.",
  },
  {
    id: "arc-research",
    name: "ArcResearch",
    role: "USDC market context",
    priceUsd: 0.03,
    confidence: 0.81,
    rail: "arc-usdc",
    status: "demo",
    signal: "Liquidity and stablecoin flow context is available through the Arc wallet rail.",
  },
  {
    id: "risk-guard",
    name: "RiskGuard",
    role: "Policy and exposure guard",
    priceUsd: 0,
    confidence: 0.91,
    rail: "demo-fallback",
    status: "demo",
    signal: "No real swap is permitted. The decision can only be simulated.",
  },
  {
    id: "hcs-audit",
    name: "HCS Audit",
    role: "Verifiable audit writer",
    priceUsd: 0.002,
    confidence: 0.74,
    rail: "hedera-x402",
    status: "soon",
    signal: "Audit hash anchoring will write cycle summaries to Hedera Consensus Service.",
  },
  {
    id: "reddit-pulse",
    name: "RedditPulse",
    role: "Disabled source",
    priceUsd: 0.01,
    confidence: 0.4,
    rail: "demo-fallback",
    status: "disabled",
    signal: "Disabled for this MVP because it depends on VPN access.",
  },
];

export function selectableProviders() {
  return providers.filter((provider) => provider.status !== "disabled" && provider.status !== "soon");
}
