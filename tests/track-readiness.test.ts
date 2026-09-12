import { describe, expect, it } from "vitest";
import { buildTrackReadiness } from "@/lib/track-readiness";

describe("track readiness", () => {
  it("maps Arc/Circle and Hedera requirements to demo proofs without overstating mocks", () => {
    const readiness = buildTrackReadiness();
    expect(readiness.tracks.map((track) => track.id)).toEqual(["arc-circle", "hedera"]);
    const hedera = readiness.tracks.find((track) => track.id === "hedera")!;
    expect(hedera.items.find((item) => item.requirement.includes("HCS"))?.status).toBe("done");
    expect(hedera.items.find((item) => item.requirement.includes("x402"))?.status).toBe("done");
    expect(hedera.items.find((item) => item.requirement.includes("Agent discovery"))?.status).toBe("done");
    const arc = readiness.tracks.find((track) => track.id === "arc-circle")!;
    expect(arc.items.find((item) => item.requirement.includes("Developer-Controlled"))?.status).toBe("done");
    expect(readiness.safeToSubmit).toBe(true);
    expect(JSON.stringify(readiness)).not.toMatch(/wallet-|sk-or|TEST_API_KEY|0x[a-f0-9]{64}|3030020100/i);
  });
});
