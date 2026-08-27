import { getServiceClient } from "@/lib/supabase";
import { calculateMomentum } from "@/lib/scoring";
import type { NormalizedStream, Platform } from "@/lib/types";

/**
 * Persistence layer. All functions are safe to call when Supabase is not
 * configured — they no-op (writes) or return empty (reads) so the rest of the
 * app keeps working in "discovery preview" mode without a database.
 */

export interface LiveStreamRow {
  id: string;
  platform: Platform;
  platform_stream_id: string;
  title: string | null;
  category_name: string | null;
  language: string | null;
  is_live: boolean;
  last_viewer_count: number | null;
  last_observed_at: string | null;
  last_momentum_score: number | null;
  last_growth_5m_pct: number | null;
  last_growth_15m_pct: number | null;
  last_audience_ratio: number | null;
  creator: {
    display_name: string;
    login: string | null;
    avatar_url: string | null;
    platform_creator_id: string;
  } | null;
}

/** Distinct platform creator ids that appear on any watchlist, per platform. */
export async function getWatchlistCreatorIds(
  platform: Platform
): Promise<string[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("watchlist_creators")
    .select("creators!inner(platform, platform_creator_id)")
    .eq("creators.platform", platform);

  if (error) throw new Error(`getWatchlistCreatorIds: ${error.message}`);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    // Supabase types the joined relation loosely; narrow at runtime.
    const creator = (row as { creators?: { platform_creator_id?: string } })
      .creators;
    if (creator?.platform_creator_id) ids.add(creator.platform_creator_id);
  }
  return [...ids];
}

async function upsertCreator(stream: NormalizedStream): Promise<string | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("creators")
    .upsert(
      {
        platform: stream.creator.platform,
        platform_creator_id: stream.creator.platformCreatorId,
        login: stream.creator.login ?? null,
        display_name: stream.creator.displayName,
        avatar_url: stream.creator.avatarUrl ?? null,
        raw: stream.creator.raw ?? {},
        updated_at: new Date().toISOString()
      },
      { onConflict: "platform,platform_creator_id" }
    )
    .select("id")
    .single();

  if (error) throw new Error(`upsertCreator: ${error.message}`);
  return data?.id ?? null;
}

/**
 * Fetch a creator's recent viewer history so momentum has something to compare
 * against, then persist the stream, an append-only snapshot, and the freshly
 * computed momentum. Returns the momentum score for logging.
 */
export async function ingestStream(stream: NormalizedStream): Promise<number> {
  const supabase = getServiceClient();
  if (!supabase) return 0;

  const creatorId = await upsertCreator(stream);
  if (!creatorId) return 0;

  const streamPayload = {
    platform: stream.platform,
    platform_stream_id: stream.platformStreamId,
    creator_id: creatorId,
    title: stream.title ?? null,
    category_id: stream.categoryId ?? null,
    category_name: stream.categoryName ?? null,
    started_at: stream.startedAt ?? null,
    language: stream.language ?? null,
    is_live: true,
    last_viewer_count: stream.viewerCount,
    last_observed_at: stream.observedAt,
    raw: stream.raw ?? {},
    updated_at: new Date().toISOString()
  };

  const { data: streamRow, error: streamError } = await supabase
    .from("streams")
    .upsert(streamPayload, { onConflict: "platform,platform_stream_id" })
    .select("id")
    .single();

  if (streamError) throw new Error(`ingestStream: ${streamError.message}`);
  const streamId = streamRow!.id as string;

  // Pull the two most recent prior snapshots to derive 5m/15m growth windows.
  const { data: history } = await supabase
    .from("stream_snapshots")
    .select("observed_at, viewer_count")
    .eq("stream_id", streamId)
    .order("observed_at", { ascending: false })
    .limit(20);

  const nowMs = new Date(stream.observedAt).getTime();
  const near = (targetMinutes: number) => {
    let best: { count: number; diff: number } | null = null;
    for (const h of history ?? []) {
      const ageMin = (nowMs - new Date(h.observed_at).getTime()) / 60_000;
      const diff = Math.abs(ageMin - targetMinutes);
      // Accept a snapshot within a 3-minute tolerance of the target window.
      if (diff <= 3 && (best === null || diff < best.diff)) {
        best = { count: h.viewer_count, diff };
      }
    }
    return best?.count ?? null;
  };

  const momentum = calculateMomentum({
    viewersNow: stream.viewerCount,
    viewers5mAgo: near(5),
    viewers15mAgo: near(15),
    observationAgeSeconds: 0
  });

  await supabase.from("stream_snapshots").upsert(
    {
      stream_id: streamId,
      observed_at: stream.observedAt,
      viewer_count: stream.viewerCount,
      momentum_score: momentum.score,
      growth_5m_pct: momentum.growth5mPct,
      growth_15m_pct: momentum.growth15mPct,
      audience_ratio: momentum.audienceRatio,
      raw: {}
    },
    { onConflict: "stream_id,observed_at" }
  );

  await supabase
    .from("streams")
    .update({
      last_momentum_score: momentum.score,
      last_growth_5m_pct: momentum.growth5mPct,
      last_growth_15m_pct: momentum.growth15mPct,
      last_audience_ratio: momentum.audienceRatio
    })
    .eq("id", streamId);

  return momentum.score;
}

/**
 * Mark streams that were previously live but did not appear in this ingest
 * cycle as offline, scoped to the platforms we actually refreshed.
 */
export async function markMissingOffline(
  platform: Platform,
  seenStreamIds: string[]
): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;

  const query = supabase
    .from("streams")
    .update({ is_live: false, ended_at: new Date().toISOString() })
    .eq("platform", platform)
    .eq("is_live", true);

  if (seenStreamIds.length > 0) {
    query.not(
      "platform_stream_id",
      "in",
      `(${seenStreamIds.map((id) => `"${id}"`).join(",")})`
    );
  }

  const { error } = await query;
  if (error) throw new Error(`markMissingOffline: ${error.message}`);
}

export async function getLiveStreamsRanked(
  orderBy: "momentum" | "viewers",
  limit = 50
): Promise<LiveStreamRow[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];

  const column =
    orderBy === "momentum" ? "last_momentum_score" : "last_viewer_count";

  const { data, error } = await supabase
    .from("streams")
    .select(
      "id, platform, platform_stream_id, title, category_name, language, is_live, last_viewer_count, last_observed_at, last_momentum_score, last_growth_5m_pct, last_growth_15m_pct, last_audience_ratio, creator:creators(display_name, login, avatar_url, platform_creator_id)"
    )
    .eq("is_live", true)
    .order(column, { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(`getLiveStreamsRanked: ${error.message}`);
  return (data ?? []) as unknown as LiveStreamRow[];
}

/**
 * Emerging = streams punching above their usual audience (high growth or a high
 * audience ratio) while still relatively small — signal before the leaderboard.
 */
export async function getEmergingStreams(limit = 30): Promise<LiveStreamRow[]> {
  const ranked = await getLiveStreamsRanked("momentum", 200);
  return ranked
    .filter((s) => {
      const growth = s.last_growth_5m_pct ?? 0;
      const ratio = s.last_audience_ratio ?? 0;
      const smallish = (s.last_viewer_count ?? 0) < 5000;
      return smallish && (growth > 25 || ratio > 1.5);
    })
    .slice(0, limit);
}
