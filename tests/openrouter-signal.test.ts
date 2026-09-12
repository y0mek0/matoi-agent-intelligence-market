import { describe, expect, it } from "vitest";
import { shouldUseOpenRouter } from "@/lib/openrouter-signal";

describe("OpenRouter signal gateway", () => {
  it("requires explicit key and model before live LLM mode", () => {
    expect(shouldUseOpenRouter({ OPENROUTER_API_KEY: "", OPENROUTER_MODEL: "openai/gpt-4o-mini" })).toBe(false);
    expect(shouldUseOpenRouter({ OPENROUTER_API_KEY: "sk-or-v1-test", OPENROUTER_MODEL: "" })).toBe(false);
    expect(shouldUseOpenRouter({ OPENROUTER_API_KEY: "sk-or-v1-test", OPENROUTER_MODEL: "openai/gpt-4o-mini" })).toBe(true);
  });
});
