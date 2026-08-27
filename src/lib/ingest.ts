import { TwitchAdapter } from "@/lib/platforms/twitch";
import { KickAdapter } from "@/lib/platforms/kick";
import { getTwitchAppToken } from "@/lib/platforms/twitch-auth";
import { getKickAppToken } from "@/lib/platforms/kick-auth";
import {
  getWatchlistCreatorIds,
  ingestStream,
  markMissingOffline
} from "@/lib/store";
import { configuredPlatforms, env } from "@/lib/env";
import type { NormalizedStream, Platform } from "@/lib/types";

export interface PlatformIngestResult {
  platform: Platform;
  ok: boolean;
  streams: number;
  usedWatchlist: boolean;
  error?: string;
}

export interface IngestResult {
  ranAt: string;
  platforms: PlatformIngestResult[];
}

async function fetchTwitchLive(): Promise<{
  streams: NormalizedStream[];
  usedWatchlist: boolean;
}> {
  const token = await getTwitchAppToken();
  const adapter = new TwitchAdapter(env.twitch.clientId!, token);
  const creatorIds = await getWatchlistCreatorIds("twitch");

  // With a watchlist, poll those creators. Without one, fall back to global
  // top live streams so the dashboards have real data on day one.
  const streams = await adapter.getLiveStreams(
    creatorIds.length > 0 ? { creatorIds } : { limit: 100 }
  );
  return { streams, usedWatchlist: creatorIds.length > 0 };
}

async function fetchKickLive(): Promise<{
  streams: NormalizedStream[];
  usedWatchlist: boolean;
}> {
  const token = await getKickAppToken();
  const adapter = new KickAdapter(token);
  const creatorIds = await getWatchlistCreatorIds("kick");
  const streams = await adapter.getLiveStreams(
    creatorIds.length > 0 ? { creatorIds } : { limit: 100 }
  );
  return { streams, usedWatchlist: creatorIds.length > 0 };
}

async function ingestPlatform(
  platform: Platform,
  fetcher: () => Promise<{ streams: NormalizedStream[]; usedWatchlist: boolean }>
): Promise<PlatformIngestResult> {
  try {
    const { streams, usedWatchlist } = await fetcher();

    for (const stream of streams) {
      await ingestStream(stream);
    }

    // Only reconcile offline state when polling a watchlist; a global-discovery
    // page is a moving window, not an authoritative "everyone we track" set.
    if (usedWatchlist) {
      await markMissingOffline(
        platform,
        streams.map((s) => s.platformStreamId)
      );
    }

    return { platform, ok: true, streams: streams.length, usedWatchlist };
  } catch (error) {
    return {
      platform,
      ok: false,
      streams: 0,
      usedWatchlist: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/** Run one ingest cycle across every configured platform. */
export async function runIngest(): Promise<IngestResult> {
  const platforms = configuredPlatforms();
  const results: PlatformIngestResult[] = [];

  for (const platform of platforms) {
    if (platform === "twitch") {
      results.push(await ingestPlatform("twitch", fetchTwitchLive));
    } else if (platform === "kick") {
      results.push(await ingestPlatform("kick", fetchKickLive));
    }
  }

  return { ranAt: new Date().toISOString(), platforms: results };
}
