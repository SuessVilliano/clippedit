import {
  getEmergingStreams,
  getLiveStreamsRanked,
  type LiveStreamRow
} from "@/lib/store";
import { TwitchAdapter } from "@/lib/platforms/twitch";
import { getTwitchAppToken } from "@/lib/platforms/twitch-auth";
import {
  configuredPlatforms,
  env,
  isSupabaseConfigured,
  isTwitchConfigured
} from "@/lib/env";
import { calculateMomentum } from "@/lib/scoring";

export type DashboardMode = "database" | "preview" | "unconfigured";

export interface StreamCard {
  id: string;
  platform: string;
  displayName: string;
  login: string | null;
  avatarUrl: string | null;
  title: string | null;
  category: string | null;
  viewers: number | null;
  momentum: number | null;
  growth5mPct: number | null;
  audienceRatio: number | null;
  observedAt: string | null;
}

export interface DashboardPayload {
  mode: DashboardMode;
  generatedAt: string;
  configured: {
    supabase: boolean;
    platforms: string[];
  };
  note?: string;
  streams: StreamCard[];
}

function fromRow(row: LiveStreamRow): StreamCard {
  return {
    id: row.id,
    platform: row.platform,
    displayName: row.creator?.display_name ?? "Unknown",
    login: row.creator?.login ?? null,
    avatarUrl: row.creator?.avatar_url ?? null,
    title: row.title,
    category: row.category_name,
    viewers: row.last_viewer_count,
    momentum: row.last_momentum_score,
    growth5mPct: row.last_growth_5m_pct,
    audienceRatio: row.last_audience_ratio,
    observedAt: row.last_observed_at
  };
}

/**
 * Live preview straight from Twitch when there is no database yet. There is no
 * viewer history in this mode, so momentum reduces to a reach-only signal —
 * enough to prove the pipeline end to end before Supabase is connected.
 */
async function twitchPreview(): Promise<StreamCard[]> {
  const token = await getTwitchAppToken();
  const adapter = new TwitchAdapter(env.twitch.clientId!, token);
  const streams = await adapter.getLiveStreams({ limit: 40 });

  return streams.map((s) => {
    const momentum = calculateMomentum({ viewersNow: s.viewerCount });
    return {
      id: `${s.platform}:${s.platformStreamId}`,
      platform: s.platform,
      displayName: s.creator.displayName,
      login: s.creator.login ?? null,
      avatarUrl: s.creator.avatarUrl ?? null,
      title: s.title ?? null,
      category: s.categoryName ?? null,
      viewers: s.viewerCount,
      momentum: momentum.score,
      growth5mPct: null,
      audienceRatio: null,
      observedAt: s.observedAt
    };
  });
}

async function build(
  select: "live" | "trending" | "emerging"
): Promise<DashboardPayload> {
  const base = {
    generatedAt: new Date().toISOString(),
    configured: {
      supabase: isSupabaseConfigured(),
      platforms: configuredPlatforms()
    }
  };

  if (isSupabaseConfigured()) {
    let rows: LiveStreamRow[];
    if (select === "emerging") {
      rows = await getEmergingStreams(30);
    } else {
      rows = await getLiveStreamsRanked(
        select === "trending" ? "momentum" : "viewers",
        50
      );
    }
    return { mode: "database", ...base, streams: rows.map(fromRow) };
  }

  if (isTwitchConfigured()) {
    let streams = await twitchPreview();
    if (select === "trending") {
      streams = [...streams].sort(
        (a, b) => (b.momentum ?? 0) - (a.momentum ?? 0)
      );
    } else if (select === "emerging") {
      // Without history, approximate "emerging" as smaller-but-notable streams.
      streams = streams
        .filter((s) => (s.viewers ?? 0) < 5000 && (s.viewers ?? 0) > 200)
        .sort((a, b) => (b.momentum ?? 0) - (a.momentum ?? 0));
    }
    return {
      mode: "preview",
      ...base,
      note: "Live preview from Twitch. Connect Supabase to unlock momentum history, clip velocity, and emerging detection.",
      streams
    };
  }

  return {
    mode: "unconfigured",
    ...base,
    note: "Add Twitch credentials (and optionally Supabase) to start streaming live data.",
    streams: []
  };
}

export const getLiveData = () => build("live");
export const getTrendingData = () => build("trending");
export const getEmergingData = () => build("emerging");
