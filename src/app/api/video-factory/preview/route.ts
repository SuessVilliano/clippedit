import { NextRequest, NextResponse } from "next/server";
import { generateContentPackage } from "@/lib/video-factory/content";
import { extractSource } from "@/lib/video-factory/extract";

/**
 * Stateless "Try it" content generation — no Supabase, no persistence.
 *
 * Reads the pasted URL (or a URL inside the pasted notes), extracts real
 * release text (YouTube-aware), and returns the full 3-Short package plus
 * diagnostics so the caller knows exactly what was read. Uses the LLM when
 * LLM_API_KEY is set, else the deterministic template.
 */

type Body = { releaseTitle?: string; releaseText?: string; url?: string; tone?: string };

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;

  if (!body.releaseText?.trim() && !body.releaseTitle?.trim() && !body.url?.trim()) {
    return NextResponse.json({ error: "Paste a release title and notes, or a URL to fetch." }, { status: 400 });
  }

  const extraction = await extractSource({ url: body.url, text: body.releaseText });
  const releaseTitle = body.releaseTitle?.trim() || extraction.releaseTitle || "HighLevel Release Radar";

  try {
    const result = await generateContentPackage({
      contentId: `preview-${Date.now()}`,
      product: "HighLevel",
      releaseTitle,
      releaseText: extraction.releaseText,
      sourceUrl: body.url,
      tone: body.tone
    });
    return NextResponse.json({
      mode: result.mode,
      package: result.package,
      extraction: {
        chars: extraction.chars,
        sources: extraction.sources,
        warning: extraction.warning
      }
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Generation failed" }, { status: 500 });
  }
}
