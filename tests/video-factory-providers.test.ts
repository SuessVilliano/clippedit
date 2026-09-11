import { afterEach, describe, expect, it } from "vitest";
import { openAiImageProvider } from "../src/lib/video-factory/providers/image/openai";

const original = process.env.OPENAI_API_KEY;
afterEach(() => {
  if (original) process.env.OPENAI_API_KEY = original;
  else delete process.env.OPENAI_API_KEY;
});

describe("openai image provider", () => {
  it("reports not configured without a key", () => {
    delete process.env.OPENAI_API_KEY;
    expect(openAiImageProvider().isConfigured()).toBe(false);
  });

  it("reports configured with a key and exposes a model name", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const p = openAiImageProvider();
    expect(p.isConfigured()).toBe(true);
    expect(p.name).toContain("openai:");
  });

  it("throws (does not fabricate) when generating with no key", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(openAiImageProvider().generate({ prompt: "x" })).rejects.toThrow(/not configured/);
  });
});
