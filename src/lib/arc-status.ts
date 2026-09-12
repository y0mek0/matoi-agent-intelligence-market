export type ArcEnv = Record<string, string | undefined>;

export type ArcRoleStatus = {
  role: "Trader" | "ArcResearch" | "Risk";
  ready: boolean;
  address: string | null;
};

function present(value: string | undefined) {
  return Boolean(value && !value.includes("__PASTE_") && !value.includes("__GENERATE_"));
}

export function maskAddress(address: string | undefined) {
  if (!present(address)) return null;
  if (address!.length <= 12) return address!;
  return `${address!.slice(0, 6)}...${address!.slice(-4)}`;
}

export function buildArcStatus(env: ArcEnv = process.env) {
  const roles: ArcRoleStatus[] = [
    {
      role: "Trader",
      ready: present(env.ARC_TRADER_WALLET_ID) && present(env.ARC_TRADER_WALLET_ADDRESS),
      address: maskAddress(env.ARC_TRADER_WALLET_ADDRESS),
    },
    {
      role: "ArcResearch",
      ready: present(env.ARC_RESEARCH_WALLET_ID) && present(env.ARC_RESEARCH_WALLET_ADDRESS),
      address: maskAddress(env.ARC_RESEARCH_WALLET_ADDRESS),
    },
    {
      role: "Risk",
      ready: present(env.ARC_RISK_WALLET_ID) && present(env.ARC_RISK_WALLET_ADDRESS),
      address: maskAddress(env.ARC_RISK_WALLET_ADDRESS),
    },
  ];
  return {
    network: env.ARC_NETWORK ?? null,
    roles,
    allReady: roles.every((role) => role.ready),
    balanceMode: "not-queried" as const,
    note: "Circle wallet IDs stay server-only. UI receives masked addresses and readiness only.",
  };
}
