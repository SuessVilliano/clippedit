import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

const DEFAULT_BLOG_SOURCE = "https://www.gohighlevel.com/blog/category/release-radar";
const DEFAULT_YOUTUBE_CHANNEL_ID = "UCYZHLNfuWTIqIFZRcF_mHZQ";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}` || req.nextUrl.searchParams.get("secret") === secret;
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanText(html: string) {
  return decodeXml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim()) : "";
}

function extractYoutubeReleaseEntries(xml: string) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((m) => m[1]);
  return entries
    .map((entry) => {
      const title = extractTag(entry, "title");
      const videoId = extractTag(entry, "yt:videoId");
      const published = extractTag(entry, "published");
      const description = extractTag(entry, "media:description");
      return {
        title,
        videoId,
        published,
        description,
        url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : ""
      };
    })
    .filter((entry) => entry.videoId && /release\s*radar/i.test(entry.title));
}

function extractUrls(text: string) {
  return [...new Set(text.match(/https?:\/\/[^\s<>"']+/gi) ?? [])].map((url) => url.replace(/[),.;]+$/, ""));
}

async function enrichFromLinkedRelease(description: string) {
  const urls = extractUrls(description);
  const releaseUrl = urls.find((url) => /gohighlevel\.com/i.test(url) && /release|radar|blog|post/i.test(url));
  if (!releaseUrl) return { url: null as string | null, text: "" };

  try {
    const res = await fetch(releaseUrl, { cache: "no-store", headers: { "User-Agent": "ClippedIt-ReleaseWatcher/2.0" } });
    if (!res.ok) return { url: releaseUrl, text: "" };
    return { url: releaseUrl, text: cleanText(await res.text()).slice(0, 18000) };
  } catch {
    return { url: releaseUrl, text: "" };
  }
}

async function fallbackBlogContext() {
  const blogUrl = process.env.HIGHLEVEL_RELEASE_RADAR_URL || DEFAULT_BLOG_SOURCE;
  try {
    const res = await fetch(blogUrl, { cache: "no-store", headers: { "User-Agent": "ClippedIt-ReleaseWatcher/2.0" } });
    if (!res.ok) return "";
    return cleanText(await res.text()).slice(0, 8000);
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channelId = process.env.HIGHLEVEL_YOUTUBE_CHANNEL_ID || DEFAULT_YOUTUBE_CHANNEL_ID;
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const feedRes = await fetch(feedUrl, { cache: "no-store", headers: { "User-Agent": "ClippedIt-ReleaseWatcher/2.0" } });
  if (!feedRes.ok) return NextResponse.json({ error: `YouTube feed returned ${feedRes.status}` }, { status: 502 });

  const entries = extractYoutubeReleaseEntries(await feedRes.text()).slice(0, 6);
  const db = getServiceClient();
  const created: Array<{ title: string; sourceUrl: string; mode: string; published: string }> = [];
  const skipped: string[] = [];
  const blogFallback = entries.length ? await fallbackBlogContext() : "";

  for (const entry of entries) {
    if (db) {
      const { data } = await db.from("release_content_queue").select("id").eq("source_url", entry.url).maybeSingle();
      if (data?.id) { skipped.push(entry.url); continue; }
    }

    const linked = await enrichFromLinkedRelease(entry.description);
    const releaseText = [
      `Official HighLevel YouTube Release Radar upload: ${entry.title}`,
      entry.published ? `Published: ${entry.published}` : "",
      entry.description ? `YouTube description: ${cleanText(entry.description)}` : "",
      linked.text ? `Linked HighLevel release details: ${linked.text}` : "",
      !linked.text && blogFallback ? `Current HighLevel Release Radar page context: ${blogFallback}` : ""
    ].filter(Boolean).join("\n\n").slice(0, 24000);

    const generateRes = await fetch(new URL("/api/release-spy", req.nextUrl.origin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: "HighLevel",
        feature: entry.title,
        releaseText,
        audience: "agencies, affiliates, creators, business owners, and AI automation builders",
        goal: "publish a fresh faceless breakdown while the Release Radar drop is still new, explaining what changed and the practical play without using an affiliate link",
        tone: "smart, energetic, practical, no-hype"
      })
    });
    if (!generateRes.ok) continue;
    const generated = await generateRes.json();

    if (db) {
      await db.from("release_content_queue").upsert({
        source_url: entry.url,
        source_title: entry.title,
        source_text: releaseText,
        source_name: "HighLevel YouTube · Release Radar",
        content_package: {
          ...generated.package,
          source: {
            youtube_url: entry.url,
            youtube_video_id: entry.videoId,
            published_at: entry.published,
            linked_release_url: linked.url
          }
        },
        generator_mode: generated.mode,
        status: "ready_for_review",
        detected_at: new Date().toISOString(),
        generated_at: new Date().toISOString()
      }, { onConflict: "source_url" });
    }

    created.push({ title: entry.title, sourceUrl: entry.url, mode: generated.mode || "unknown", published: entry.published });
  }

  return NextResponse.json({
    trigger: "youtube_release_radar",
    channelId,
    feedUrl,
    checked: entries.length,
    created,
    skipped: skipped.length,
    storage: db ? "supabase" : "stateless"
  });
}
