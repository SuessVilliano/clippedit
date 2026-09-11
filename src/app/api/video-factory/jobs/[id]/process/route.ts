import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getServiceClient } from "@/lib/supabase";
import { getJob } from "@/lib/video-factory/jobs";
import { generateContentPackage } from "@/lib/video-factory/content";

/**
 * Generate (or regenerate) the content package for a job and store it.
 *
 * Pulls the release source text from the linked release_content_queue row when
 * present, produces the strict content package (LLM when configured, otherwise
 * the deterministic template), stores it, and moves the job to content_ready.
 * Synchronous and idempotent — safe to re-run to regenerate.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 400 });
  }
  const { id } = await params;
  const db = getServiceClient();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 400 });

  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  // Enrich from the originating release row when we have one.
  let releaseText = "";
  let youtubeUrl: string | undefined;
  if (job.release_queue_id) {
    const { data: release } = await db
      .from("release_content_queue")
      .select("source_text,content_package")
      .eq("id", job.release_queue_id)
      .maybeSingle();
    releaseText = (release?.source_text as string) || "";
    const src = (release?.content_package as { source?: { youtube_url?: string } })?.source;
    youtubeUrl = src?.youtube_url;
  }

  await db
    .from("video_jobs")
    .update({ status: "content_generating", updated_at: new Date().toISOString(), error_message: null })
    .eq("id", id);

  try {
    const result = await generateContentPackage({
      contentId: id,
      product: "HighLevel",
      releaseTitle: job.title,
      releaseText,
      sourceUrl: job.source_url,
      youtubeUrl
    });

    const { data, error } = await db
      .from("video_jobs")
      .update({
        content_package: result.package,
        status: "content_ready",
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("id,status")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ mode: result.mode, jobId: data.id, status: data.status, shorts: result.package.shorts.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Content generation failed";
    await db
      .from("video_jobs")
      .update({ status: "failed", error_message: message, retry_count: job.retry_count + 1, updated_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
