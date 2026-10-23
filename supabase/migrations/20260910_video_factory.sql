-- Video Factory V1 — production system tables.
--
-- Non-destructive: only adds new tables/indexes. Existing tables
-- (release_content_queue, clips, streams, …) are untouched. Statuses are plain
-- text so the state machine lives in application code (src/lib/video-factory/
-- status.ts), matching the existing release_content_queue.status convention.

create extension if not exists pgcrypto;

-- One job per Release Radar episode (or manual source). Idempotent on source_url.
create table if not exists video_jobs (
  id uuid primary key default gen_random_uuid(),
  release_queue_id uuid references release_content_queue(id) on delete set null,
  source_type text not null default 'release_radar',
  source_url text not null,
  title text not null,
  status text not null default 'detected',
  priority integer not null default 0,
  content_package jsonb not null default '{}'::jsonb,
  selected_short_index integer,
  error_message text,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(source_url)
);

create index if not exists video_jobs_status_idx
on video_jobs(status, created_at desc);

-- Generated assets, one row per asset per short.
create table if not exists video_assets (
  id uuid primary key default gen_random_uuid(),
  video_job_id uuid not null references video_jobs(id) on delete cascade,
  short_index integer not null,
  asset_type text not null, -- voiceover | thumbnail | broll_video | broll_image | screen_recording | captions | render | avatar_clip
  provider text,            -- e.g. sv-engine:voxcpm, openai:tts, sv-engine:ffmpeg
  provider_job_id text,
  status text not null default 'queued', -- queued | generating | ready | failed | skipped
  source_url text,
  storage_path text,
  mime_type text,
  duration_seconds numeric,
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_assets_job_short_idx
on video_assets(video_job_id, short_index);

create index if not exists video_assets_type_status_idx
on video_assets(asset_type, status);

-- Final rendered verticals, one per rendered short.
create table if not exists video_renders (
  id uuid primary key default gen_random_uuid(),
  video_job_id uuid not null references video_jobs(id) on delete cascade,
  short_index integer not null,
  render_engine text not null default 'sv-engine:ffmpeg', -- sv-engine:ffmpeg | remotion
  status text not null default 'queued',
  output_url text,
  storage_path text,
  duration_seconds numeric,
  width integer not null default 1080,
  height integer not null default 1920,
  fps integer not null default 30,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_renders_job_short_idx
on video_renders(video_job_id, short_index);

-- Cost / telemetry ledger for every external provider call.
create table if not exists provider_runs (
  id uuid primary key default gen_random_uuid(),
  video_job_id uuid references video_jobs(id) on delete cascade,
  video_asset_id uuid references video_assets(id) on delete set null,
  provider text not null,
  operation text not null,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  status text not null default 'started',
  cost_estimate numeric,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

create index if not exists provider_runs_job_idx
on provider_runs(video_job_id, started_at desc);

-- Publishing intents. Built now; publishing stays disabled in V1 (review-first).
create table if not exists publication_jobs (
  id uuid primary key default gen_random_uuid(),
  video_job_id uuid not null references video_jobs(id) on delete cascade,
  short_index integer not null,
  platform text not null, -- youtube | instagram | facebook | tiktok | x | ghl_social_planner
  account_id text,
  status text not null default 'draft',
  title text,
  description text,
  scheduled_at timestamptz,
  published_at timestamptz,
  external_post_id text,
  external_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists publication_jobs_job_idx
on publication_jobs(video_job_id, short_index);
