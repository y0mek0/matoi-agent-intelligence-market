import { describe, expect, it } from "vitest";
import { buildAgentDirectory } from "@/lib/agent-directory";

describe("agent directory", () => {
  it("exposes a machine-readable discovery catalog for buyer/provider/trading/audit agents", () => {
    const directory = buildAgentDirectory();

    expect(directory.protocol).toBe("nova-agent-directory-v1");
    expect(directory.discovery).toContain("/api/agents/marketplace");
    expect(directory.agents.map((agent) => agent.id)).toEqual(expect.arrayContaining([
      "buyer-agent",
      "telegram-pulse",
      "rss-news",
      "coingecko-price",
      "defillama-tvl",
      "github-releases",
      "momentum-trader",
      "risk-guard-trader",
      "hcs-audit-agent",
    ]));
    expect(directory.agents.every((agent) => agent.networks.includes("hedera-testnet") || agent.networks.includes("arc-testnet"))).toBe(true);
    expect(JSON.stringify(directory)).not.toMatch(/wallet-|sk-or|TEST_API_KEY|0x[a-f0-9]{64}|3030020100/i);
  });
});
