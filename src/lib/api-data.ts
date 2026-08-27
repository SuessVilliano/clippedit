import {
  getEmergingStreams,
  getLiveStreamsRanked,
  type LiveStreamRow
} from "@/lib/store";
import { TwitchAdapter } from "@/lib/platforms/twitch";
import { KickAdapter } from "@/lib/platforms/kick";
import { getTwitchAppToken } from "@/lib/platforms/twitch-auth";
import { getKickAppToken } from "@/lib/platforms/kick-auth";
import {
  configuredPlatforms,
  env,
  isSupabaseConfigured,
  isTwitchConfigured,
  isKickConfigured
} from "@/lib/env";
import { calculateMomentum, calculateClipViewsPerHour } from "@/lib/scoring";
import type { NormalizedClip, NormalizedStream } from "@/lib/types";

export type DashboardMode = "database" | "preview" | "unconfigured";

export interface StreamCard {
  id: string;
  platform: string;
  displayName: string;
  login: string | null;
  avatarUrl: string | null;
  thumbnailUrl: string | null;
  url: string | null;
  title: string | null;
  category: string | null;
  viewers: number | null;
  momentum: number | null;
  growth5mPct: number | null;
  audienceRatio: number | null;
  observedAt: string | null;
}

export interface ClipCard {
  id: string;
  platform: string;
  title: string | null;
  thumbnailUrl: string | null;
  url: string | null;
  creator: string | null;
  views: number | null;
  viewsPerHour: number | null;
  ageHours: number | null;
  createdAt: string | null;
}

export interface Moment {
  id: string;
  kind: "clip" | "live";
  platform: string;
  title: string;
  subtitle: string;
  thumbnailUrl: string | null;
  url: string | null;
  score: number;
  reason: string;
  metric: string;
}

interface BasePayload {
  mode: DashboardMode;
  generatedAt: string;
  configured: { supabase: boolean; platforms: string[] };
  note?: string;
}

export interface DashboardPayload extends BasePayload {
  streams: StreamCard[];
}
export interface ClipsPayload extends BasePayload {
  clips: ClipCard[];
}
export interface MomentsPayload extends BasePayload {
  moments: Moment[];
}

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

function streamUrl(platform: string, login: string | null | undefined) {
  if (!login) return null;
  if (platform === "twitch") return `https://twitch.tv/${login}`;
  if (platform === "kick") return `https://kick.com/${login}`;
  return null;
}

function fromRow(row: LiveStreamRow): StreamCard {
  return {
    id: row.id,
    platform: row.platform,
    displayName: row.creator?.display_name ?? "Unknown",
    login: row.creator?.login ?? null,
    avatarUrl: row.creator?.avatar_url ?? null,
    thumbnailUrl: null,
    url: streamUrl(row.platform, row.creator?.login),
    title: row.title,
    category: row.category_name,
    viewers: row.last_viewer_count,
    momentum: row.last_momentum_score,
    growth5mPct: row.last_growth_5m_pct,
    audienceRatio: row.last_audience_ratio,
    observedAt: row.last_observed_at
  };
}

function fromStream(s: NormalizedStream): StreamCard {
  const momentum = calculateMomentum({ viewersNow: s.viewerCount });
  return {
    id: `${s.platform}:${s.platformStreamId}`,
    platform: s.platform,
    displayName: s.creator.displayName,
    login: s.creator.login ?? null,
    avatarUrl: s.creator.avatarUrl ?? null,
    thumbnailUrl: s.thumbnailUrl ?? null,
    url: streamUrl(s.platform, s.creator.login),
    title: s.title ?? null,
    category: s.categoryName ?? null,
    viewers: s.viewerCount,
    momentum: momentum.score,
    growth5mPct: null,
    audienceRatio: null,
    observedAt: s.observedAt
  };
}

function fromClip(c: NormalizedClip): ClipCard {
  const created = c.createdAt ? new Date(c.createdAt) : null;
  const ageHours = created
    ? Math.max((Date.now() - created.getTime()) / 3_600_000, 0.25)
    : null;
  const vph =
    created && c.viewCount != null
      ? calculateClipViewsPerHour(c.viewCount, created)
      : null;
  return {
    id: `${c.platform}:${c.platformClipId}`,
    platform: c.platform,
    title: c.title ?? null,
    thumbnailUrl: c.thumbnailUrl ?? null,
    url: c.sourceUrl ?? c.embedUrl ?? null,
    creator: c.platformCreatorId ?? null,
    views: c.viewCount ?? null,
    viewsPerHour: vph != null ? Math.round(vph) : null,
    ageHours: ageHours != null ? Math.round(ageHours * 10) / 10 : null,
    createdAt: c.createdAt ?? null
  };
}

function base(): BasePayload {
  return {
    mode: "preview",
    generatedAt: new Date().toISOString(),
    configured: {
      supabase: isSupabaseConfigured(),
      platforms: configuredPlatforms()
    }
  };
}

async function twitchAdapter(): Promise<TwitchAdapter | null> {
  if (!isTwitchConfigured()) return null;
  const token = await getTwitchAppToken();
  return new TwitchAdapter(env.twitch.clientId!, token);
}

async function kickAdapter(): Promise<KickAdapter | null> {
  if (!isKickConfigured()) return null;
  const token = await getKickAppToken();
  return new KickAdapter(token);
}

/* ------------------------------------------------------------------ */
/* streams: live / trending / emerging                                */
/* ------------------------------------------------------------------ */

async function livePreview(): Promise<StreamCard[]> {
  const results = await Promise.allSettled([
    (async () => {
      const a = await twitchAdapter();
      return a ? a.getLiveStreams({ limit: 60 }) : [];
    })(),
    (async () => {
      const a = await kickAdapter();
      return a ? a.getLiveStreams({ limit: 40 }) : [];
    })()
  ]);
  const streams = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );
  return streams.map(fromStream);
}

async function buildStreams(
  select: "live" | "trending" | "emerging"
): Promise<DashboardPayload> {
  const payload = { ...base() } as DashboardPayload;

  if (isSupabaseConfigured()) {
    let rows: LiveStreamRow[];
    if (select === "emerging") rows = await getEmergingStreams(30);
    else
      rows = await getLiveStreamsRanked(
        select === "trending" ? "momentum" : "viewers",
        60
      );
    payload.mode = "database";
    payload.streams = rows.map(fromRow);
    return payload;
  }

  if (isTwitchConfigured() || isKickConfigured()) {
    let streams = await livePreview();
    if (select === "trending") {
      streams = [...streams].sort((a, b) => (b.momentum ?? 0) - (a.momentum ?? 0));
    } else if (select === "emerging") {
      streams = streams
        .filter((s) => (s.viewers ?? 0) > 150 && (s.viewers ?? 0) < 4000)
        .sort((a, b) => (b.momentum ?? 0) - (a.momentum ?? 0));
    } else {
      streams = [...streams].sort((a, b) => (b.viewers ?? 0) - (a.viewers ?? 0));
    }
    payload.mode = "preview";
    payload.note =
      "Live cross-platform preview. Connect Supabase to unlock momentum history, offline detection, and true emerging signals.";
    payload.streams = streams;
    return payload;
  }

  payload.mode = "unconfigured";
  payload.note = "Add Twitch (and optionally Kick) credentials to start streaming live data.";
  payload.streams = [];
  return payload;
}

export const getLiveData = () => buildStreams("live");
export const getTrendingData = () => buildStreams("trending");
export const getEmergingData = () => buildStreams("emerging");

/* ------------------------------------------------------------------ */
/* clips: most clipped                                                */
/* ------------------------------------------------------------------ */

export async function getClipsData(): Promise<ClipsPayload> {
  const payload = { ...base(), clips: [] } as ClipsPayload;

  if (!isTwitchConfigured() && !isKickConfigured()) {
    payload.mode = "unconfigured";
    payload.note = "Add platform credentials to surface the most-clipped moments.";
    return payload;
  }

  const results = await Promise.allSettled([
    (async () => {
      const a = await twitchAdapter();
      return a?.getTrendingClips ? a.getTrendingClips(40) : [];
    })(),
    (async () => {
      const a = await kickAdapter();
      return a?.getTrendingClips ? a.getTrendingClips(30) : [];
    })()
  ]);

  const clips = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .map(fromClip)
    .sort((a, b) => (b.viewsPerHour ?? 0) - (a.viewsPerHour ?? 0));

  payload.mode = isSupabaseConfigured() ? "database" : "preview";
  if (clips.length === 0) {
    payload.note =
      "No clips available right now. Twitch clip discovery needs a Twitch app token; Kick clips are best-effort and may be temporarily unavailable.";
  }
  payload.clips = clips;
  return payload;
}

/* ------------------------------------------------------------------ */
/* moments: smart "clip this now"                                     */
/* ------------------------------------------------------------------ */

export async function getMomentsData(): Promise<MomentsPayload> {
  const payload = { ...base(), moments: [] } as MomentsPayload;

  if (!isTwitchConfigured() && !isKickConfigured() && !isSupabaseConfigured()) {
    payload.mode = "unconfigured";
    payload.note = "Connect a platform to let Clip Radar surface the best moments to clip.";
    return payload;
  }

  // Ride-the-wave: clips already accelerating hard right now.
  const clipsPayload = await getClipsData();
  const clipMoments: Moment[] = clipsPayload.clips.slice(0, 12).map((c) => ({
    id: c.id,
    kind: "clip",
    platform: c.platform,
    title: c.title ?? "Untitled clip",
    subtitle: c.creator ? `by ${c.creator}` : "",
    thumbnailUrl: c.thumbnailUrl,
    url: c.url,
    score: Math.min(100, Math.round(((c.viewsPerHour ?? 0) / 5000) * 100)),
    reason: "Clip velocity spiking",
    metric: `${(c.viewsPerHour ?? 0).toLocaleString()} views/hr`
  }));

  // Catch-it-live: streams breaking out right now — the moment to capture.
  const streams = await buildStreams("trending");
  const liveMoments: Moment[] = streams.streams
    .filter((s) => (s.momentum ?? 0) >= 45)
    .slice(0, 12)
    .map((s) => ({
      id: s.id,
      kind: "live",
      platform: s.platform,
      title: s.title || s.displayName,
      subtitle: `${s.displayName}${s.category ? ` · ${s.category}` : ""}`,
      thumbnailUrl: s.thumbnailUrl,
      url: s.url,
      score: s.momentum ?? 0,
      reason:
        (s.growth5mPct ?? 0) > 25 ? "Audience accelerating live" : "High live momentum",
      metric: `${(s.viewers ?? 0).toLocaleString()} watching`
    }));

  const moments = [...liveMoments, ...clipMoments]
    .sort((a, b) => b.score - a.score)
    .slice(0, 24);

  payload.mode = isSupabaseConfigured() ? "database" : "preview";
  if (moments.length === 0) {
    payload.note =
      "No standout moments detected in the current window. Connect Supabase for history-aware detection that improves over time.";
  } else if (!isSupabaseConfigured()) {
    payload.note =
      "Clip Radar is running on current data. Connect Supabase so it learns from momentum history and gets sharper over time.";
  }
  payload.moments = moments;
  return payload;
}
