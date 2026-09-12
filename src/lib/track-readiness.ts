export type TrackItemStatus = "done" | "partial" | "roadmap";

export type TrackReadinessItem = {
  requirement: string;
  status: TrackItemStatus;
  proof: string;
};

export function buildTrackReadiness() {
  const tracks = [
    {
      id: "arc-circle" as const,
      name: "Arc / Circle",
      items: [
        { requirement: "Circle Developer-Controlled Wallets for agent treasury", status: "done" as const, proof: "3 role wallets configured on ARC-TESTNET; UI shows masked readiness only." },
        { requirement: "Arc/Circle stablecoin-native agent economy", status: "done" as const, proof: "Buyer agent creates bounded Arc USDC spend intents and settlement proofs for provider intelligence." },
        { requirement: "Real Arc/Circle testnet settlement", status: "done" as const, proof: "Circle ARC-TESTNET USDC transfer completed from Trader to ArcResearch; txHash masked as f2caec07...4820b9a4, full hash kept in local run evidence." },
        { requirement: "Autonomous spend policy", status: "done" as const, proof: "PolicyEngine caps per-signal spend, daily spend and confidence before Arc intent; real transfers require env flag plus per-request confirmation." },
        { requirement: "Real mainnet funds", status: "roadmap" as const, proof: "Disabled by design for hackathon safety; testnet-only." },
      ],
    },
    {
      id: "hedera" as const,
      name: "Hedera",
      items: [
        { requirement: "x402 / pay-per-call data or compute metering", status: "done" as const, proof: "Real x402 facilitator at /api/x402/facilitator issues challenges, settles HMAC-signed receipts, verifies signatures, anchors every settle to HCS." },
        { requirement: "Verifiable payment audit trails on HCS", status: "done" as const, proof: "Real HCS topic + TopicMessageSubmitTransaction endpoint; x402 settle events are anchored with receiptId, providerId, paymentRef, priceUsd." },
        { requirement: "Multi-agent negotiation / settlement", status: "partial" as const, proof: "Buyer mission ranks provider quotes and builds Arc action plan; A2A/ACP protocol remains roadmap." },
        { requirement: "Agent discovery / directory", status: "done" as const, proof: "/api/agents/directory exposes machine-readable catalog with 10 agents and discovery endpoints." },
        { requirement: "Scheduled / recurring payments", status: "partial" as const, proof: "Local cron/Task Scheduler pipeline exists; Hedera Scheduled Transactions remain roadmap." },
        { requirement: "HTS/custom fees or identity", status: "roadmap" as const, proof: "Not implemented in MVP; listed as stretch after demo core is stable." },
      ],
    },
  ];
  return {
    tracks,
    safeToSubmit: tracks.every((track) => track.items.some((item) => item.status === "done")),
    honestGaps: ["A2A/ACP negotiation", "Hedera Scheduled Transactions", "HTS/custom fees", "on-chain identity"],
  };
}
