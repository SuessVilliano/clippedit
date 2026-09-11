import { getServiceClient } from "@/lib/supabase";
import { assertTransition, type JobStatus } from "@/lib/video-factory/status";
import type { VideoJobRow } from "@/lib/video-factory/types";

/**
 * Server-only data access for Video Factory jobs. All functions degrade
 * gracefully when Supabase is not configured (return null / empty) so the app
 * still renders a "connect your keys" state instead of crashing.
 */

const JOB_COLUMNS =
  "id,release_queue_id,source_type,source_url,title,status,priority,content_package,selected_short_index,error_message,retry_count,created_at,updated_at,completed_at";

export async function listJobs(limit = 100): Promise<VideoJobRow[]> {
  const db = getServiceClient();
  if (!db) return [];
  const { data, error } = await db
    .from("video_jobs")
    .select(JOB_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as VideoJobRow[];
}

export async function getJob(id: string): Promise<VideoJobRow | null> {
  const db = getServiceClient();
  if (!db) return null;
  const { data, error } = await db.from("video_jobs").select(JOB_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as VideoJobRow) ?? null;
}

export interface CreateJobInput {
  sourceUrl: string;
  title: string;
  sourceType?: string;
  releaseQueueId?: string | null;
  priority?: number;
}

/**
 * Idempotent create. A job is unique on source_url (mirrors
 * release_content_queue), so re-running the watcher never creates duplicates —
 * an existing row is returned untouched.
 */
export async function createJob(input: CreateJobInput): Promise<{ job: VideoJobRow; created: boolean }> {
  const db = getServiceClient();
  if (!db) throw new Error("Supabase is not configured.");

  const existing = await db
    .from("video_jobs")
    .select(JOB_COLUMNS)
    .eq("source_url", input.sourceUrl)
    .maybeSingle();
  if (existing.data) return { job: existing.data as VideoJobRow, created: false };

  const { data, error } = await db
    .from("video_jobs")
    .insert({
      source_url: input.sourceUrl,
      title: input.title,
      source_type: input.sourceType ?? "release_radar",
      release_queue_id: input.releaseQueueId ?? null,
      priority: input.priority ?? 0,
      status: "detected"
    })
    .select(JOB_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return { job: data as VideoJobRow, created: true };
}

/**
 * Create a Video Factory job from an existing release_content_queue row.
 * Returns null when the release row is not found.
 */
export async function createJobFromReleaseQueue(
  releaseQueueId: string
): Promise<{ job: VideoJobRow; created: boolean } | null> {
  const db = getServiceClient();
  if (!db) throw new Error("Supabase is not configured.");

  const { data: release, error } = await db
    .from("release_content_queue")
    .select("id,source_url,source_title,content_package")
    .eq("id", releaseQueueId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!release) return null;

  const pack = (release.content_package ?? {}) as { headline?: string };
  return createJob({
    sourceUrl: release.source_url as string,
    title: (pack.headline as string) || (release.source_title as string),
    sourceType: "release_radar",
    releaseQueueId: release.id as string
  });
}

/** Transition a job's status, validating the move against the state machine. */
export async function setJobStatus(
  id: string,
  from: JobStatus,
  to: JobStatus,
  patch: Partial<Pick<VideoJobRow, "error_message" | "completed_at" | "content_package">> = {}
): Promise<VideoJobRow> {
  const db = getServiceClient();
  if (!db) throw new Error("Supabase is not configured.");
  assertTransition(from, to);
  const { data, error } = await db
    .from("video_jobs")
    .update({ status: to, updated_at: new Date().toISOString(), ...patch })
    .eq("id", id)
    .eq("status", from) // optimistic concurrency: only move if still in `from`
    .select(JOB_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as VideoJobRow;
}
