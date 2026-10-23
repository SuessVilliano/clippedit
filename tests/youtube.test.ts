import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/youtube/route";
vi.mock("@/lib/youtube", async () => import("../src/lib/youtube"));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("YouTube discovery", () => {
  it("returns an honest unconfigured state without making a request", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const response = await GET(new Request("https://clip.test/api/youtube"));
    expect(await response.json()).toEqual({ configured: false, creators: [], videos: [] });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects invalid channel IDs before contacting YouTube", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await GET(new Request("https://clip.test/api/youtube?channelId=bad"))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("requests popular channel videos, enriches statistics, and orders by views", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    const video = (id: string, views: string) => ({ id, snippet: { title: id, channelTitle: "Creator", channelId: "UCabcdefghijklmnopqrstuv", publishedAt: "2026-10-01T00:00:00Z" }, statistics: { viewCount: views } });
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ items: [{ id: { videoId: "first" } }, { id: { videoId: "second" } }] })).mockResolvedValueOnce(Response.json({ items: [video("first", "10"), video("second", "100")] }));
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(new Request("https://clip.test/api/youtube?channelId=UCabcdefghijklmnopqrstuv"));
    const data = await response.json();
    expect(data.videos.map((v: { id: string }) => v.id)).toEqual(["second", "first"]);
    expect(fetcher.mock.calls[0][0].searchParams.get("order")).toBe("viewCount");
    expect(fetcher.mock.calls[1][0].searchParams.get("id")).toBe("first,second");
  });
  it("does not expose provider errors or keys", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "secret-test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret-test-key", { status: 403 })));
    const response = await GET(new Request("https://clip.test/api/youtube"));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("secret-test-key");
  });
});
