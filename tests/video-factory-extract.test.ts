import { describe, expect, it, vi, afterEach } from "vitest";
import { extractSource } from "../src/lib/video-factory/extract";

afterEach(() => vi.unstubAllGlobals());

describe("extractSource", () => {
  it("returns pasted prose as release text with no fetch", async () => {
    const out = await extractSource({ text: "HighLevel added AI Studio backend logic and CRM auto-contact creation." });
    expect(out.releaseText).toContain("AI Studio");
    expect(out.sources).toHaveLength(0);
    expect(out.chars).toBeGreaterThan(0);
  });

  it("warns when a link yields nothing readable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, text: async () => "" }));
    const out = await extractSource({ url: "https://www.youtube.com/watch?v=abcdefghijk" });
    expect(out.sources).toHaveLength(0);
    expect(out.warning).toMatch(/Couldn't read/i);
  });

  it("parses a YouTube shortDescription out of player JSON", async () => {
    const html = `<html><head><meta property="og:title" content="GoHighLevel AI Studio Upgrade"></head>
      <body><script>var x = {"videoDetails":{"title":"GoHighLevel AI Studio Upgrade","shortDescription":"They added backend logic and CRM auto-contacts."}};</script></body></html>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => html }));
    const out = await extractSource({ url: "https://youtu.be/abcdefghijk" });
    expect(out.releaseText).toContain("backend logic");
    expect(out.releaseTitle).toContain("AI Studio");
    expect(out.sources).toHaveLength(1);
  });
});
