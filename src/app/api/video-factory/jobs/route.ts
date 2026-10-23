import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createJob, createJobFromReleaseQueue, listJobs } from "@/lib/video-factory/jobs";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ items: [], warning: "Supabase is not configured." });
  }
  try {
    const items = await listJobs();
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ items: [], error: e instanceof Error ? e.message : "Failed to load jobs" }, { status: 500 });
  }
}

type CreateBody = {
  releaseQueueId?: string;
  sourceUrl?: string;
  title?: string;
  sourceType?: string;
};

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as CreateBody;

  try {
    if (body.releaseQueueId) {
      const result = await createJobFromReleaseQueue(body.releaseQueueId);
      if (!result) return NextResponse.json({ error: "Release not found." }, { status: 404 });
      return NextResponse.json({ job: result.job, created: result.created }, { status: result.created ? 201 : 200 });
    }

    if (body.sourceUrl && body.title) {
      const result = await createJob({ sourceUrl: body.sourceUrl, title: body.title, sourceType: body.sourceType });
      return NextResponse.json({ job: result.job, created: result.created }, { status: result.created ? 201 : 200 });
    }

    return NextResponse.json({ error: "Provide releaseQueueId, or sourceUrl + title." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to create job" }, { status: 500 });
  }
}
