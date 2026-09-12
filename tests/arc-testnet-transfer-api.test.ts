import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/arc/testnet-transfer/run/route";

describe("Arc testnet transfer API", () => {
  it("returns a safe funding/setup blocker instead of pretending to transfer", async () => {
    const response = await POST(new Request("http://local/api/arc/testnet-transfer/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountUsd: 0.01, providerRole: "ArcResearch" }),
    }));
    const body = await response.json();

    expect([200, 409]).toContain(response.status);
    expect(body.network).toBe("ARC-TESTNET");
    expect(typeof body.status).toBe("string");
    expect(JSON.stringify(body)).not.toMatch(/wallet-|sk-or|PRIVATE|0x[a-f0-9]{64}/i);
  });
});
