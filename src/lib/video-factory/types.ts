import type { AssetStatus, AssetType, JobStatus } from "@/lib/video-factory/status";

/**
 * Row + payload shapes for the Video Factory. DB rows mirror the migration in
 * supabase/migrations/20260910_video_factory.sql. The content package is the
 * strict schema the content generator (Phase B) produces and stores in
 * video_jobs.content_package; the Zod validator lives in content.ts.
 */

export interface VideoJobRow {
  id: string;
  release_queue_id: string | null;
  source_type: string;
  source_url: string;
  title: string;
  status: JobStatus;
  priority: number;
  content_package: ContentPackage | Record<string, never>;
  selected_short_index: number | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface VideoAssetRow {
  id: string;
  video_job_id: string;
  short_index: number;
  asset_type: AssetType;
  provider: string | null;
  provider_job_id: string | null;
  status: AssetStatus;
  source_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  duration_seconds: number | null;
  metadata: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoRenderRow {
  id: string;
  video_job_id: string;
  short_index: number;
  render_engine: string;
  status: string;
  output_url: string | null;
  storage_path: string | null;
  duration_seconds: number | null;
  width: number;
  height: number;
  fps: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Content package (produced by the content generator) ──────────────────────

export type VisualType = "screen" | "image" | "video" | "text" | "avatar";

export interface VisualPlanBeat {
  startSeconds: number;
  endSeconds: number;
  type: VisualType;
  description: string;
  assetPrompt: string;
  sourceRequirement: string;
}

export interface ScreenCaptureRequirement {
  name: string;
  instructions: string;
  durationSeconds: number;
  supportsScriptText: string;
}

export interface ThumbnailPlan {
  textOptions: string[];
  selectedText: string;
  imagePrompt: string;
  compositionNotes: string;
}

/** One social post variant, ready to drop into GHL Social Planner. */
export interface SocialPost {
  platform: "youtube" | "instagram" | "facebook" | "tiktok" | "x";
  caption: string;
  hashtags: string[];
}

export interface ShortPackage {
  index: number;
  titleOptions: string[];
  selectedTitle: string;
  hook: string;
  voiceoverScript: string;
  cta: string;
  descriptionOptions: string[];
  selectedDescription: string;
  hashtags: string[];
  thumbnail: ThumbnailPlan;
  visualPlan: VisualPlanBeat[];
  brollPrompts: string[];
  screenCaptureRequirements: ScreenCaptureRequirement[];
  socialPosts: SocialPost[];
  captionStyle: string;
  estimatedDurationSeconds: number;
}

export interface LongFormPackage {
  titleOptions: string[];
  hook: string;
  outline: string[];
  cta: string;
}

export interface ContentPackage {
  contentId: string;
  releaseTitle: string;
  coreThesis: string;
  targetAudience: string;
  shorts: ShortPackage[];
  longForm: LongFormPackage;
}
