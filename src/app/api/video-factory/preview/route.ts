import { NextRequest, NextResponse } from "next/server";
import { generateContentPackage } from "@/lib/video-factory/content";

/**
 * Stateless "Try it" content generation — no Supabase, no persistence.
 *
 * Lets you prove the pipeline works on the live app with zero setup: paste a
 * release title + notes, or a public URL to fetch, and get the full 3-Short
 * content package back. Uses the LLM when LLM_API_KEY is set, else the
 * deterministic template.
 */

function decodeEntities(v: string) {
  return v
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, " ");
}

function stripHtml(html: string) {
  return decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchUrlText(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { "User-Agent": "ClippedIt-VideoFactory/1.0" }
    });
    clearTimeout(timer);
    if (!res.ok) return "";
    return stripHtml(await res.text()).slice(0, 18000);
  } catch {
    return "";
  }
}

type Body = { releaseTitle?: string; releaseText?: string; url?: string; tone?: string };

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const fetched = body.url ? await fetchUrlText(body.url) : "";
  const releaseText = [body.releaseText?.trim(), fetched].filter(Boolean).join("\n\n").slice(0, 20000);
  const releaseTitle = body.releaseTitle?.trim() || "HighLevel Release Radar";

  if (!releaseText && !body.releaseTitle && !body.url) {
    return NextResponse.json({ error: "Paste a release title and notes, or a URL to fetch." }, { status: 400 });
  }

  try {
    const result = await generateContentPackage({
      contentId: `preview-${Date.now()}`,
      product: "HighLevel",
      releaseTitle,
      releaseText,
      sourceUrl: body.url,
      tone: body.tone
    });
    return NextResponse.json({ mode: result.mode, package: result.package });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Generation failed" }, { status: 500 });
  }
}
