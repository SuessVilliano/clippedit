import { z } from "zod";
import type {
  ClipQuery,
  LiveQuery,
  NormalizedClip,
  NormalizedStream,
  PlatformAdapter,
  TrendingCategory
} from "@/lib/types";

const sized = (template?: string, w = 640, h = 360) =>
  template
    ? template.replace("{width}", String(w)).replace("{height}", String(h))
    : undefined;

const StreamSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  user_login: z.string(),
  user_name: z.string(),
  game_id: z.string().optional().default(""),
  game_name: z.string().optional().default(""),
  title: z.string().optional().default(""),
  viewer_count: z.number(),
  started_at: z.string(),
  language: z.string().optional(),
  thumbnail_url: z.string().optional(),
  tags: z.array(z.string()).optional()
});

const ClipSchema = z.object({
  id: z.string(),
  url: z.string().optional(),
  embed_url: z.string().optional(),
  broadcaster_id: z.string(),
  broadcaster_name: z.string().optional(),
  creator_id: z.string().optional(),
  title: z.string().optional(),
  view_count: z.number().optional(),
  created_at: z.string().optional(),
  thumbnail_url: z.string().optional(),
  duration: z.number().optional()
});

export class TwitchAdapter implements PlatformAdapter {
  platform = "twitch" as const;

  constructor(
    private clientId: string,
    private accessToken: string
  ) {}

  private async helix(path: string) {
    const response = await fetch(`https://api.twitch.tv/helix/${path}`, {
      headers: {
        "Client-Id": this.clientId,
        Authorization: `Bearer ${this.accessToken}`
      },
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Twitch API ${response.status}: ${await response.text()}`);
    }
    return response.json();
  }

  async getLiveStreams(input: LiveQuery): Promise<NormalizedStream[]> {
    const params = new URLSearchParams();
    params.set("first", String(Math.min(input.limit ?? 100, 100)));
    input.creatorIds?.forEach((id) => params.append("user_id", id));
    input.creatorLogins?.forEach((login) => params.append("user_login", login));
    input.categoryIds?.forEach((id) => params.append("game_id", id));

    const json = await this.helix(`streams?${params.toString()}`);
    const data = z.array(StreamSchema).parse(json.data ?? []);
    const observedAt = new Date().toISOString();

    return data.map((s) => ({
      platform: "twitch",
      platformStreamId: s.id,
      creator: {
        platform: "twitch",
        platformCreatorId: s.user_id,
        login: s.user_login,
        displayName: s.user_name,
        raw: s
      },
      title: s.title,
      categoryId: s.game_id,
      categoryName: s.game_name,
      viewerCount: s.viewer_count,
      startedAt: s.started_at,
      language: s.language,
      thumbnailUrl: sized(s.thumbnail_url),
      observedAt,
      raw: s
    }));
  }

  async getTrendingCategories(limit = 10): Promise<TrendingCategory[]> {
    const json = await this.helix(`games/top?first=${Math.min(limit, 100)}`);
    const schema = z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        box_art_url: z.string().optional()
      })
    );
    const data = schema.parse(json.data ?? []);
    return data.map((g) => ({
      platform: "twitch" as const,
      id: g.id,
      name: g.name,
      boxArtUrl: sized(g.box_art_url, 285, 380)
    }));
  }

  /**
   * "Most clipped right now" derived from current data: take the hottest live
   * categories and pull their top clips from the last 24h, then let the caller
   * rank by velocity. This ties clip discovery to what is actually trending.
   */
  async getTrendingClips(limit = 40): Promise<NormalizedClip[]> {
    const categories = await this.getTrendingCategories(6);
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 3_600_000).toISOString();

    const batches = await Promise.all(
      categories.map((c) =>
        this.getPublicClips({
          categoryId: c.id,
          startedAt: since,
          endedAt: now.toISOString(),
          limit: 20
        }).catch(() => [] as NormalizedClip[])
      )
    );

    const merged = batches.flat();
    const seen = new Set<string>();
    const unique = merged.filter((c) => {
      if (seen.has(c.platformClipId)) return false;
      seen.add(c.platformClipId);
      return true;
    });
    return unique
      .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      .slice(0, limit);
  }

  async getPublicClips(input: ClipQuery): Promise<NormalizedClip[]> {
    const params = new URLSearchParams();
    params.set("first", String(Math.min(input.limit ?? 100, 100)));

    if (input.creatorId) params.set("broadcaster_id", input.creatorId);
    if (input.categoryId) params.set("game_id", input.categoryId);
    if (input.startedAt) params.set("started_at", input.startedAt);
    if (input.endedAt) params.set("ended_at", input.endedAt);

    const json = await this.helix(`clips?${params.toString()}`);
    const data = z.array(ClipSchema).parse(json.data ?? []);
    const observedAt = new Date().toISOString();

    return data.map((c) => ({
      platform: "twitch",
      platformClipId: c.id,
      platformCreatorId: c.broadcaster_id,
      title: c.title,
      sourceUrl: c.url,
      embedUrl: c.embed_url,
      thumbnailUrl: c.thumbnail_url,
      viewCount: c.view_count,
      createdAt: c.created_at,
      durationSeconds: c.duration,
      observedAt,
      raw: c
    }));
  }
}
