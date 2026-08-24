create extension if not exists pgcrypto;

create type platform_type as enum ('twitch', 'kick', 'youtube', 'other');
create type rights_mode_type as enum (
  'metadata_only',
  'official_embed',
  'creator_authorized',
  'licensed',
  'editorial_review',
  'blocked'
);

create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  platform platform_type not null,
  platform_creator_id text not null,
  login text,
  display_name text not null,
  avatar_url text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, platform_creator_id)
);

create table if not exists streams (
  id uuid primary key default gen_random_uuid(),
  platform platform_type not null,
  platform_stream_id text not null,
  creator_id uuid not null references creators(id) on delete cascade,
  title text,
  category_id text,
  category_name text,
  started_at timestamptz,
  ended_at timestamptz,
  language text,
  is_live boolean not null default true,
  last_viewer_count integer,
  last_observed_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, platform_stream_id)
);

create table if not exists stream_snapshots (
  id bigserial primary key,
  stream_id uuid not null references streams(id) on delete cascade,
  observed_at timestamptz not null,
  viewer_count integer not null check (viewer_count >= 0),
  momentum_score numeric,
  growth_5m_pct numeric,
  growth_15m_pct numeric,
  audience_ratio numeric,
  raw jsonb not null default '{}'::jsonb,
  unique(stream_id, observed_at)
);

create index if not exists stream_snapshots_stream_time_idx
on stream_snapshots(stream_id, observed_at desc);

create table if not exists clips (
  id uuid primary key default gen_random_uuid(),
  platform platform_type not null,
  platform_clip_id text not null,
  creator_id uuid references creators(id) on delete set null,
  source_stream_id uuid references streams(id) on delete set null,
  title text,
  source_url text,
  embed_url text,
  thumbnail_url text,
  created_at_source timestamptz,
  duration_seconds numeric,
  last_view_count bigint,
  last_observed_at timestamptz,
  rights_mode rights_mode_type not null default 'metadata_only',
  processing_allowed boolean not null default false,
  commercial_use_allowed boolean not null default false,
  authorization_connection_id uuid,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, platform_clip_id)
);

create table if not exists clip_snapshots (
  id bigserial primary key,
  clip_id uuid not null references clips(id) on delete cascade,
  observed_at timestamptz not null,
  view_count bigint not null check (view_count >= 0),
  views_per_hour numeric,
  velocity_score numeric,
  unique(clip_id, observed_at)
);

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text
);

create table if not exists creator_topics (
  creator_id uuid not null references creators(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  weight numeric not null default 1,
  primary key (creator_id, topic_id)
);

create table if not exists watchlists (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists watchlist_creators (
  watchlist_id uuid not null references watchlists(id) on delete cascade,
  creator_id uuid not null references creators(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (watchlist_id, creator_id)
);

create table if not exists creator_connections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  creator_id uuid not null references creators(id) on delete cascade,
  platform platform_type not null,
  scopes text[] not null default '{}',
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  authorized_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  summary text,
  confidence numeric,
  emerging_score numeric,
  status text not null default 'candidate',
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists story_sources (
  story_id uuid not null references stories(id) on delete cascade,
  stream_id uuid references streams(id) on delete cascade,
  clip_id uuid references clips(id) on delete cascade,
  relevance numeric,
  primary key (story_id, stream_id, clip_id)
);

create table if not exists alert_rules (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  name text not null,
  rule jsonb not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists alert_events (
  id uuid primary key default gen_random_uuid(),
  alert_rule_id uuid not null references alert_rules(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null,
  triggered_at timestamptz not null default now()
);

create table if not exists media_actions (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid references clips(id) on delete set null,
  creator_connection_id uuid references creator_connections(id) on delete set null,
  action text not null,
  rights_mode rights_mode_type not null,
  scope_used text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
