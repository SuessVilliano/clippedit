/**
 * Video Factory job + asset state machine.
 *
 * All status strings live here so they are never scattered as literals across
 * routes, workers, and UI. Transitions are validated against an explicit table
 * so a worker can never move a job into an illegal state.
 */

export const JOB_STATUSES = [
  "detected",
  "content_generating",
  "content_ready",
  "voice_generating",
  "assets_generating",
  "waiting_for_screen_capture",
  "ready_to_render",
  "rendering",
  "ready_for_review",
  "approved",
  "scheduled",
  "published",
  "failed"
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const ASSET_STATUSES = [
  "queued",
  "generating",
  "ready",
  "failed",
  "skipped"
] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

export type AssetType =
  | "voiceover"
  | "thumbnail"
  | "broll_video"
  | "broll_image"
  | "screen_recording"
  | "captions"
  | "render"
  | "avatar_clip";

/**
 * Legal forward transitions. `failed` is reachable from any active state (a
 * provider error never destroys the job — it parks it as failed and preserves
 * retry_count). From `failed` a retry returns to the step that failed, so we
 * allow re-entry to the generating states.
 */
const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  detected: ["content_generating", "failed"],
  content_generating: ["content_ready", "failed"],
  content_ready: ["voice_generating", "assets_generating", "failed"],
  voice_generating: ["assets_generating", "waiting_for_screen_capture", "ready_to_render", "failed"],
  assets_generating: ["waiting_for_screen_capture", "ready_to_render", "failed"],
  waiting_for_screen_capture: ["ready_to_render", "failed"],
  ready_to_render: ["rendering", "failed"],
  rendering: ["ready_for_review", "failed"],
  ready_for_review: ["approved", "content_generating", "failed"], // regenerate loops back
  approved: ["scheduled", "published", "failed"],
  scheduled: ["published", "failed"],
  published: [],
  failed: [
    "content_generating",
    "voice_generating",
    "assets_generating",
    "ready_to_render",
    "rendering"
  ]
};

export function isJobStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value);
}

export function isAssetStatus(value: string): value is AssetStatus {
  return (ASSET_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  if (from === to) return true; // idempotent re-writes of the same state are allowed
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Throws if the transition is illegal; returns the target status otherwise. */
export function assertTransition(from: JobStatus, to: JobStatus): JobStatus {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal Video Factory transition: ${from} → ${to}`);
  }
  return to;
}

/** A job is terminal when no further automated work will move it. */
export function isTerminal(status: JobStatus): boolean {
  return status === "published";
}

/**
 * Review-first safety: never advance past ready_for_review automatically. Only
 * an explicit human action (approve) may move a job into approved/scheduled/
 * published. Workers must call this before any auto-advance.
 */
export function isHumanGate(to: JobStatus): boolean {
  return to === "approved" || to === "scheduled" || to === "published";
}

/** Kanban columns for the Video Factory UI, in display order. */
export const KANBAN_COLUMNS: Array<{ key: JobStatus[]; label: string }> = [
  { key: ["detected"], label: "New Releases" },
  { key: ["content_generating", "content_ready"], label: "Content Ready" },
  { key: ["voice_generating", "assets_generating"], label: "Generating Assets" },
  { key: ["waiting_for_screen_capture"], label: "Needs Screen Recording" },
  { key: ["ready_to_render", "rendering"], label: "Rendering" },
  { key: ["ready_for_review"], label: "Ready for Review" },
  { key: ["approved"], label: "Approved" },
  { key: ["scheduled"], label: "Scheduled" },
  { key: ["published"], label: "Published" },
  { key: ["failed"], label: "Failed" }
];

/** Human-readable label for a single status. */
export function statusLabel(status: string): string {
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
