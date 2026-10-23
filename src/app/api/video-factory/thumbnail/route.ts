import { NextRequest, NextResponse } from "next/server";
import { getImageProvider } from "@/lib/video-factory/providers";

/**
 * Stateless thumbnail render. Given an image prompt, returns a generated image
 * as a data URI (no storage required) so you can preview the thumbnail the
 * factory would produce. Requires an image provider key (OPENAI_API_KEY).
 */

type Body = { prompt?: string; aspect?: "16:9" | "9:16" | "1:1" };

export async function POST(req: NextRequest) {
  const provider = getImageProvider();
  if (!provider.isConfigured()) {
    return NextResponse.json(
      { error: "No image provider configured. Set OPENAI_API_KEY to render thumbnails." },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  try {
    const asset = await provider.generate({ prompt: body.prompt, aspect: body.aspect ?? "16:9" });
    return NextResponse.json({ provider: provider.name, url: asset.url, mimeType: asset.mimeType });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Thumbnail generation failed" }, { status: 500 });
  }
}
