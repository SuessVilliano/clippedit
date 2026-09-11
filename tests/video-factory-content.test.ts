import { describe, expect, it } from "vitest";
import { contentPackageSchema, fallbackPackage, generateContentPackage } from "../src/lib/video-factory/content";

const input = {
  contentId: "job-123",
  releaseTitle: "AI Studio just got a massive upgrade",
  releaseText:
    "HighLevel released an update to AI Studio. You can now build backend logic and connect it to CRM contacts automatically.",
  sourceUrl: "https://example.com/release"
};

describe("content package generator", () => {
  it("fallback produces a schema-valid package with 3 shorts", () => {
    const pack = fallbackPackage(input);
    const parsed = contentPackageSchema.safeParse(pack);
    expect(parsed.success).toBe(true);
    expect(pack.shorts).toHaveLength(3);
  });

  it("every short carries all 5 social platforms and a thumbnail concept", () => {
    const pack = fallbackPackage(input);
    for (const short of pack.shorts) {
      expect(short.socialPosts.map((p) => p.platform).sort()).toEqual([
        "facebook",
        "instagram",
        "tiktok",
        "x",
        "youtube"
      ]);
      expect(short.thumbnail.selectedText.length).toBeGreaterThan(0);
      expect(short.thumbnail.imagePrompt.length).toBeGreaterThan(0);
      expect(short.screenCaptureRequirements.length).toBeGreaterThan(0);
    }
  });

  it("keeps contentId aligned with the job id", () => {
    const pack = fallbackPackage(input);
    expect(pack.contentId).toBe("job-123");
  });

  it("generateContentPackage falls back to template with no LLM key", async () => {
    const prev = process.env.LLM_API_KEY;
    delete process.env.LLM_API_KEY;
    const result = await generateContentPackage(input);
    expect(result.mode).toBe("template");
    expect(contentPackageSchema.safeParse(result.package).success).toBe(true);
    if (prev) process.env.LLM_API_KEY = prev;
  });
});
