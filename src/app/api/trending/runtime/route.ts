import { NextResponse } from "next/server";
import { getRuntimeSourceCredentials } from "@/lib/source-credentials";
import { TwitchAdapter } from "@/lib/platforms/twitch";
import { KickAdapter } from "@/lib/platforms/kick";
import { getTwitchAppToken } from "@/lib/platforms/twitch-auth";
import { getKickAppToken } from "@/lib/platforms/kick-auth";
import { calculateMomentum } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const credentials = await getRuntimeSourceCredentials();
  const configured: string[] = [];
  const jobs: Array<Promise<any[]>> = [];

  if (credentials.twitch) {
    configured.push("twitch");
    jobs.push((async () => {
      const token = await getTwitchAppToken(credentials.twitch);
      return new TwitchAdapter(credentials.twitch!.clientId, token).getLiveStreams({ limit: 60 });
    })());
  }

  if (credentials.kick) {
    configured.push("kick");
    jobs.push((async () => {
      const token = await getKickAppToken(credentials.kick);
      return new KickAdapter(token).getLiveStreams({ limit: 40 });
    })());
  }

  if (jobs.length === 0) {
    return NextResponse.json({
      mode: "unconfigured",
      generatedAt: new Date().toISOString(),
      configured: { supabase: false, platforms: [] },
      note: "Connect Twitch or Kick in Settings, then press Fetch now.",
      streams: []
    });
  }

  const results = await Promise.allSettled(jobs);
  const streams = results
    .flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .map((s: any) => {
      const momentum = calculateMomentum({ viewersNow: s.viewerCount });
      const login = s.creator?.login ?? null;
      return {
        id: `${s.platform}:${s.platformStreamId}`,
        platform: s.platform,
        displayName: s.creator?.displayName ?? "Unknown",
        login,
        avatarUrl: s.creator?.avatarUrl ?? null,
        thumbnailUrl: s.thumbnailUrl ?? null,
        url: login ? (s.platform === "twitch" ? `https://twitch.tv/${login}` : `https://kick.com/${login}`) : null,
        title: s.title ?? null,
        category: s.categoryName ?? null,
        viewers: s.viewerCount ?? null,
        momentum: momentum.score,
        growth5mPct: null,
        audienceRatio: null,
        observedAt: s.observedAt ?? new Date().toISOString()
      };
    })
    .sort((a, b) => (b.momentum ?? 0) - (a.momentum ?? 0));

  const failures = results.filter((r) => r.status === "rejected").length;
  return NextResponse.json({
    mode: "preview",
    generatedAt: new Date().toISOString(),
    configured: { supabase: false, platforms: configured },
    note: failures
      ? "Fetched available sources; one source failed. Check its credentials in Settings."
      : "On-demand snapshot fetched from your connected sources. Fetch again later to compare fresh market activity.",
    streams
  });
}
