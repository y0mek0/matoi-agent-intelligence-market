import { describe, expect, it } from "vitest";
import { buildAuditEvent } from "@/lib/audit-log";

describe("audit log", () => {
  it("creates redacted audit events with deterministic hash", () => {
    const event = buildAuditEvent({
      type: "provider_signal_released",
      providerId: "telegram-pulse",
      rail: "hedera-x402",
      summary: "ETH signal released",
      payload: { secret: "sk-test-should-not-leak", text: "safe summary" },
    });

    expect(event.type).toBe("provider_signal_released");
    expect(event.hash).toMatch(/^[a-f0-9]{16}$/);
    expect(JSON.stringify(event)).not.toContain("sk-test");
    expect(event.payload?.text).toBe("safe summary");
  });
});
