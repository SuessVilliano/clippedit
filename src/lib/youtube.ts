export interface YouTubeCreator { id: string; title: string; }
export interface YouTubeVideo { id: string; title: string; creator: string; channelId: string; thumbnail: string; views: number; publishedAt: string; url: string; }
const base = "https://www.googleapis.com/youtube/v3/";
export async function youtubeRequest(resource: string, params: Record<string, string>) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YouTube discovery is not connected yet.");
  const url = new URL(resource, base);
  Object.entries({ ...params, key }).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(response.status === 403 ? "YouTube is unavailable: check the API key and quota." : "YouTube could not complete this search. Try again.");
  return response.json();
}
export function normalizeVideo(v: { id: string; snippet: { title: string; channelTitle: string; channelId: string; publishedAt: string; thumbnails?: { medium?: { url: string } } }; statistics?: { viewCount?: string } }): YouTubeVideo {
  return { id: v.id, title: v.snippet.title, creator: v.snippet.channelTitle, channelId: v.snippet.channelId, thumbnail: v.snippet.thumbnails?.medium?.url ?? "", views: Number(v.statistics?.viewCount ?? 0), publishedAt: v.snippet.publishedAt, url: `https://www.youtube.com/watch?v=${v.id}` };
}
