import type {
  ClipQuery,
  LiveQuery,
  NormalizedClip,
  NormalizedStream,
  PlatformAdapter,
  TrendingCategory
} from "@/lib/types";

/**
 * Kick adapter.
 *
 * Live streams and categories use Kick's official public API (v1), which
 * requires an app access token (client-credentials). Clips are not part of the
 * official public API yet, so `getTrendingClips` uses Kick's evolving web API
 * on a best-effort basis and is wrapped so any failure degrades gracefully
 * rather than breaking discovery. Keep all Kick schema assumptions in this file.
 */
export class KickAdapter implements PlatformAdapter {
  platform = "kick" as const;

  constructor(private accessToken?: string) {}

  private async publicApi(path: string): Promise<any> {
    const response = await fetch(`https://api.kick.com/public/v1/${path}`, {
      headers: this.accessToken
        ? { Authorization: `Bearer ${this.accessToken}`, Accept: "application/json" }
        : { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Kick API ${response.status}: ${await response.text()}`);
    }
    return response.json();
  }

  async getLiveStreams(input: LiveQuery): Promise<NormalizedStream[]> {
    const params = new URLSearchParams();
    params.set("limit", String(Math.min(input.limit ?? 100, 100)));
    params.set("sort", "viewer_count");

    const json = await this.publicApi(`livestreams?${params.toString()}`);
    const rows: any[] = json.data ?? json ?? [];
    const observedAt = new Date().toISOString();

    return rows
      .filter((row) => {
        if (!input.creatorIds?.length) return true;
        const id = String(
          row.broadcaster_user_id ?? row.channel?.user_id ?? row.user_id ?? ""
        );
        return input.creatorIds.includes(id);
      })
      .map((row) => this.normalizeStream(row, observedAt));
  }

  private normalizeStream(row: any, observedAt: string): NormalizedStream {
    const creatorId = String(
      row.broadcaster_user_id ?? row.channel?.user_id ?? row.user_id ?? ""
    );
    const slug = row.channel?.slug ?? row.slug ?? row.channel_slug;
    const displayName = slug ?? row.user?.username ?? creatorId;

    return {
      platform: "kick",
      platformStreamId: String(row.id ?? row.livestream_id ?? creatorId),
      creator: {
        platform: "kick",
        platformCreatorId: creatorId,
        login: slug,
        displayName,
        avatarUrl: row.user?.profile_picture ?? row.channel?.user?.profile_pic,
        raw: row
      },
      title: row.stream_title ?? row.session_title ?? row.title ?? "",
      categoryId: row.category?.id ? String(row.category.id) : undefined,
      categoryName: row.category?.name ?? row.categories?.[0]?.name,
      viewerCount: Number(
        row.viewer_count ?? row.concurrent_viewers ?? row.viewers ?? 0
      ),
      startedAt: row.started_at ?? row.created_at,
      language: row.language,
      thumbnailUrl:
        row.thumbnail?.url ?? row.thumbnail ?? row.session_thumbnail ?? undefined,
      observedAt,
      raw: row
    };
  }

  async getTrendingCategories(limit = 12): Promise<TrendingCategory[]> {
    const json = await this.publicApi(`categories?limit=${Math.min(limit, 100)}`);
    const rows: any[] = json.data ?? json ?? [];
    return rows.slice(0, limit).map((c) => ({
      platform: "kick" as const,
      id: String(c.id),
      name: c.name ?? c.slug ?? String(c.id),
      viewers: c.viewers ?? c.viewer_count,
      boxArtUrl: c.thumbnail?.url ?? c.banner?.url
    }));
  }

  /**
   * Best-effort "most clipped" from Kick's web API. Not part of the official
   * public API and may be unavailable from server environments — callers must
   * tolerate an empty result.
   */
  async getTrendingClips(limit = 40): Promise<NormalizedClip[]> {
    const url = "https://kick.com/api/v2/clips?sort=view&time=day";
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; ClippedItBot/1.0; +https://clippedit-six.vercel.app)"
      },
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Kick clips ${response.status}`);
    }
    const json: any = await response.json();
    const rows: any[] = json.clips ?? json.data ?? [];
    const observedAt = new Date().toISOString();

    return rows.slice(0, limit).map((c) => ({
      platform: "kick" as const,
      platformClipId: String(c.id),
      platformCreatorId: c.channel?.id ? String(c.channel.id) : undefined,
      title: c.title,
      sourceUrl: c.clip_url ?? (c.id ? `https://kick.com/clip/${c.id}` : undefined),
      embedUrl: c.clip_url,
      thumbnailUrl: c.thumbnail_url,
      viewCount: Number(c.views ?? c.view_count ?? 0),
      createdAt: c.created_at,
      durationSeconds: c.duration,
      observedAt,
      raw: c
    }));
  }

  // Present for interface parity; Kick public clip queries by broadcaster are
  // not yet standardized, so this returns the trending set.
  async getPublicClips(_input: ClipQuery): Promise<NormalizedClip[]> {
    return this.getTrendingClips(_input.limit ?? 40);
  }
}
