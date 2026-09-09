import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

const DEFAULT_SOURCE = "https://www.gohighlevel.com/blog/category/release-radar";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}` || req.nextUrl.searchParams.get("secret") === secret;
}

function absolute(base: string, href: string) {
  try { return new URL(href, base).toString(); } catch { return null; }
}

function extractReleaseLinks(html: string, sourceUrl: string) {
  const links = new Set<string>();
  const re = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const url = absolute(sourceUrl, match[1]);
    if (!url) continue;
    if (/gohighlevel\.com\/post\/release-radar/i.test(url) || /blog\.gohighlevel\.com\/release-radar/i.test(url)) links.add(url.split("#")[0]);
  }
  return [...links].slice(0, 12);
}

function cleanText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromHtml(html: string, fallback: string) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return cleanText(h1 || title || fallback).slice(0, 220);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sourceUrl = process.env.HIGHLEVEL_RELEASE_RADAR_URL || DEFAULT_SOURCE;
  const sourceRes = await fetch(sourceUrl, { cache: "no-store", headers: { "User-Agent": "ClippedIt-ReleaseWatcher/1.0" } });
  if (!sourceRes.ok) return NextResponse.json({ error: `Release source returned ${sourceRes.status}` }, { status: 502 });

  const sourceHtml = await sourceRes.text();
  const links = extractReleaseLinks(sourceHtml, sourceUrl);
  const db = getServiceClient();
  const created: Array<{ title: string; sourceUrl: string; mode: string }> = [];
  const skipped: string[] = [];

  for (const url of links) {
    if (db) {
      const { data } = await db.from("release_content_queue").select("id").eq("source_url", url).maybeSingle();
      if (data?.id) { skipped.push(url); continue; }
    }

    const pageRes = await fetch(url, { cache: "no-store", headers: { "User-Agent": "ClippedIt-ReleaseWatcher/1.0" } });
    if (!pageRes.ok) continue;
    const html = await pageRes.text();
    const releaseText = cleanText(html).slice(0, 18000);
    const title = titleFromHtml(html, "HighLevel Release Radar");
    if (releaseText.length < 120) continue;

    const generateRes = await fetch(new URL("/api/release-spy", req.nextUrl.origin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: "HighLevel",
        feature: title,
        releaseText,
        audience: "agencies, affiliates, creators, business owners, and AI automation builders",
        goal: "explain what changed, show the practical play, generate useful faceless content, and create demand without using an affiliate link",
        tone: "smart, energetic, practical, no-hype"
      })
    });
    if (!generateRes.ok) continue;
    const generated = await generateRes.json();

    if (db) {
      await db.from("release_content_queue").upsert({
        source_url: url,
        source_title: title,
        source_text: releaseText,
        source_name: "HighLevel Release Radar",
        content_package: generated.package,
        generator_mode: generated.mode,
        status: "ready_for_review",
        detected_at: new Date().toISOString(),
        generated_at: new Date().toISOString()
      }, { onConflict: "source_url" });
    }

    created.push({ title, sourceUrl: url, mode: generated.mode || "unknown" });
  }

  return NextResponse.json({ sourceUrl, checked: links.length, created, skipped: skipped.length, storage: db ? "supabase" : "stateless" });
}
