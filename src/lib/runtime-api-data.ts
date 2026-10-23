import type { DashboardPayload, ClipsPayload, MomentsPayload, StreamCard, ClipCard, Moment } from "@/lib/api-data";
import { TwitchAdapter } from "@/lib/platforms/twitch";
import { KickAdapter } from "@/lib/platforms/kick";
import { getTwitchAppToken } from "@/lib/platforms/twitch-auth";
import { getKickAppToken } from "@/lib/platforms/kick-auth";
import { getRuntimeSourceCredentials } from "@/lib/source-credentials";
import { isSupabaseConfigured } from "@/lib/env";
import { calculateMomentum, calculateClipViewsPerHour } from "@/lib/scoring";
import type { NormalizedClip, NormalizedStream } from "@/lib/types";

function streamUrl(platform: string, login?: string | null) {
  if (!login) return null;
  if (platform === "twitch") return `https://twitch.tv/${login}`;
  if (platform === "kick") return `https://kick.com/${login}`;
  return null;
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
  const ageHours = created ? Math.max((Date.now() - created.getTime()) / 3_600_000, 0.25) : null;
  const vph = created && c.viewCount != null ? calculateClipViewsPerHour(c.viewCount, created) : null;
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

async function sourceState() {
  const credentials = await getRuntimeSourceCredentials();
  const platforms = [credentials.twitch ? "twitch" : null, credentials.kick ? "kick" : null].filter(Boolean) as string[];
  return { credentials, platforms };
}

async function adapters() {
  const { credentials, platforms } = await sourceState();
  const twitch = credentials.twitch
    ? new TwitchAdapter(credentials.twitch.clientId, await getTwitchAppToken(credentials.twitch))
    : null;
  const kick = credentials.kick
    ? new KickAdapter(await getKickAppToken(credentials.kick))
    : null;
  return { twitch, kick, platforms };
}

async function liveSnapshot() {
  const { twitch, kick, platforms } = await adapters();
  const results = await Promise.allSettled([
    twitch ? twitch.getLiveStreams({ limit: 60 }) : Promise.resolve([]),
    kick ? kick.getLiveStreams({ limit: 40 }) : Promise.resolve([])
  ]);
  const streams = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const failures = results.flatMap((r) => (r.status === "rejected" ? [r.reason instanceof Error ? r.reason.message : String(r.reason)] : []));
  return { streams: streams.map(fromStream), platforms, failures };
}

async function buildStreams(select: "live" | "trending" | "emerging"): Promise<DashboardPayload> {
  const { streams: fetched, platforms, failures } = await liveSnapshot();
  let streams = fetched;
  if (select === "trending") streams = [...streams].sort((a, b) => (b.momentum ?? 0) - (a.momentum ?? 0));
  else if (select === "emerging") streams = streams.filter((s) => (s.viewers ?? 0) > 150 && (s.viewers ?? 0) < 4000).sort((a, b) => (b.momentum ?? 0) - (a.momentum ?? 0));
  else streams = [...streams].sort((a, b) => (b.viewers ?? 0) - (a.viewers ?? 0));

  if (platforms.length === 0) {
    return {
      mode: "unconfigured",
      generatedAt: new Date().toISOString(),
      configured: { supabase: isSupabaseConfigured(), platforms },
      note: "No Twitch or Kick credentials are connected in this browser.",
      streams: []
    };
  }

  return {
    mode: "preview",
    generatedAt: new Date().toISOString(),
    configured: { supabase: isSupabaseConfigured(), platforms },
    note: failures.length ? `Fetched available sources. ${failures.join(" | ")}` : "Fresh on-demand data from your connected Twitch and Kick apps.",
    streams
  };
}

export const getRuntimeLiveData = () => buildStreams("live");
export const getRuntimeTrendingData = () => buildStreams("trending");
export const getRuntimeEmergingData = () => buildStreams("emerging");

export async function getRuntimeClipsData(): Promise<ClipsPayload> {
  const { twitch, kick, platforms } = await adapters();
  if (platforms.length === 0) {
    return { mode: "unconfigured", generatedAt: new Date().toISOString(), configured: { supabase: isSupabaseConfigured(), platforms }, note: "Connect Twitch or Kick to fetch clips.", clips: [] };
  }
  const results = await Promise.allSettled([
    twitch?.getTrendingClips ? twitch.getTrendingClips(40) : Promise.resolve([]),
    kick?.getTrendingClips ? kick.getTrendingClips(30) : Promise.resolve([])
  ]);
  const clips = results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])).map(fromClip).sort((a, b) => (b.viewsPerHour ?? 0) - (a.viewsPerHour ?? 0));
  const failures = results.flatMap((r) => (r.status === "rejected" ? [r.reason instanceof Error ? r.reason.message : String(r.reason)] : []));
  return { mode: "preview", generatedAt: new Date().toISOString(), configured: { supabase: isSupabaseConfigured(), platforms }, note: failures.length ? `Fetched available sources. ${failures.join(" | ")}` : "Fresh on-demand clip data.", clips };
}

export async function getRuntimeMomentsData(): Promise<MomentsPayload> {
  const clipsPayload = await getRuntimeClipsData();
  const streamsPayload = await getRuntimeTrendingData();
  const clipMoments: Moment[] = clipsPayload.clips.slice(0, 12).map((c) => ({
    id: c.id, kind: "clip", platform: c.platform, title: c.title ?? "Untitled clip", subtitle: c.creator ? `by ${c.creator}` : "", thumbnailUrl: c.thumbnailUrl, url: c.url,
    score: Math.min(100, Math.round(((c.viewsPerHour ?? 0) / 5000) * 100)), reason: "Clip velocity spiking", metric: `${(c.viewsPerHour ?? 0).toLocaleString()} views/hr`
  }));
  const liveMoments: Moment[] = streamsPayload.streams.filter((s) => (s.momentum ?? 0) >= 45).slice(0, 12).map((s) => ({
    id: s.id, kind: "live", platform: s.platform, title: s.title || s.displayName, subtitle: `${s.displayName}${s.category ? ` · ${s.category}` : ""}`, thumbnailUrl: s.thumbnailUrl, url: s.url,
    score: s.momentum ?? 0, reason: "High live momentum", metric: `${(s.viewers ?? 0).toLocaleString()} watching`
  }));
  const moments = [...liveMoments, ...clipMoments].sort((a, b) => b.score - a.score).slice(0, 24);
  const platforms = Array.from(new Set([...clipsPayload.configured.platforms, ...streamsPayload.configured.platforms]));
  return { mode: platforms.length ? "preview" : "unconfigured", generatedAt: new Date().toISOString(), configured: { supabase: isSupabaseConfigured(), platforms }, note: platforms.length ? "Fresh on-demand Clip Radar data." : "Connect Twitch or Kick to use Clip Radar.", moments };
}
