import { NextResponse } from "next/server";
import { normalizeVideo, youtubeRequest } from "@/lib/youtube";
export async function GET(request: Request) {
  if (!process.env.YOUTUBE_API_KEY) return NextResponse.json({ configured: false, creators: [], videos: [] });
  const p = new URL(request.url).searchParams;
  const query = (p.get("q") ?? "").trim().slice(0, 100);
  const channelId = p.get("channelId") ?? "";
  if (channelId && !/^UC[\w-]{22}$/.test(channelId)) return NextResponse.json({ error: "Choose a valid YouTube channel." }, { status: 400 });
  try {
    if (query && !channelId) {
      const result = await youtubeRequest("search", { part: "snippet", type: "channel", q: query, maxResults: "12" });
      return NextResponse.json({ configured: true, creators: (result.items ?? []).map((v: { id: { channelId: string }; snippet: { title: string } }) => ({ id: v.id.channelId, title: v.snippet.title })), videos: [] });
    }
    let params: Record<string, string> = { part: "snippet,statistics", chart: "mostPopular", regionCode: "US", maxResults: "24" };
    if (channelId) {
      const result = await youtubeRequest("search", { part: "snippet", type: "video", channelId, order: p.get("order") === "date" ? "date" : "viewCount", maxResults: "24" });
      const ids = (result.items ?? []).map((v: { id: { videoId: string } }) => v.id.videoId).filter(Boolean);
      if (!ids.length) return NextResponse.json({ configured: true, creators: [], videos: [] });
      params = { part: "snippet,statistics", id: ids.join(",") };
    }
    const result = await youtubeRequest("videos", params);
    const videos = (result.items ?? []).map(normalizeVideo);
    if (channelId) videos.sort((a: ReturnType<typeof normalizeVideo>, b: ReturnType<typeof normalizeVideo>) => p.get("order") === "date" ? Date.parse(b.publishedAt) - Date.parse(a.publishedAt) : b.views - a.views);
    return NextResponse.json({ configured: true, creators: [], videos });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "YouTube search failed." }, { status: 502 });
  }
}
