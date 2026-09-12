import { describe, expect, it } from "vitest";
import { buildTelegramPulseSignal, extractTelegramText } from "@/lib/telegram-pulse";

describe("TelegramPulse", () => {
  it("extracts and redacts Telegram text updates", () => {
    const message = extractTelegramText({
      update_id: 101,
      message: {
        message_id: 9,
        date: 1_700_000_000,
        chat: { id: -100123 },
        text: "ETH pump soon, contact me at alpha@example.com https://example.com",
      },
    });

    expect(message?.asset).toBe("ETH");
    expect(message?.sentiment).toBe("bullish");
    expect(message?.text).toContain("[email]");
    expect(message?.text).toContain("[link]");
  });

  it("returns fixture mode when no live ETH messages exist", () => {
    const signal = buildTelegramPulseSignal([]);
    expect(signal.mode).toBe("DEMO FIXTURE");
    expect(signal.sampleSize).toBeGreaterThan(0);
    expect(signal.summary).toContain("fixture");
  });

  it("returns live Telegram mode when ETH messages exist", () => {
    const live = extractTelegramText({ update_id: 1, message: { text: "ETH buy pressure rising", chat: { id: 1 } } });
    const signal = buildTelegramPulseSignal(live ? [live] : []);
    expect(signal.mode).toBe("LIVE TELEGRAM");
    expect(signal.asset).toBe("ETH");
    expect(signal.sentiment).toBe("bullish");
  });
});
