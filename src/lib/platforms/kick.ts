import type {
  LiveQuery,
  NormalizedStream,
  PlatformAdapter
} from "@/lib/types";

/**
 * Kick's public developer API is evolving. Keep all schema handling
 * isolated here and validate against the current official API before
 * production deployment.
 */
export class KickAdapter implements PlatformAdapter {
  platform = "kick" as const;

  constructor(private accessToken: string) {}

  async getLiveStreams(input: LiveQuery): Promise<NormalizedStream[]> {
    const params = new URLSearchParams();
    if (input.limit) params.set("limit", String(input.limit));

    const response = await fetch(
      `https://api.kick.com/public/v2/livestreams?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(`Kick API ${response.status}: ${await response.text()}`);
    }

    const json: any = await response.json();
    const rows: any[] = json.data ?? [];
    const observedAt = new Date().toISOString();

    return rows
      .filter((row) => {
        if (!input.creatorIds?.length) return true;
        const id = String(
          row.broadcaster_user_id ??
          row.channel?.user_id ??
          row.user_id ??
          ""
        );
        return input.creatorIds.includes(id);
      })
      .map((row) => {
        const creatorId = String(
          row.broadcaster_user_id ??
          row.channel?.user_id ??
          row.user_id ??
          ""
        );
        const displayName =
          row.channel?.slug ??
          row.slug ??
          row.user?.username ??
          creatorId;

        return {
          platform: "kick" as const,
          platformStreamId: String(row.id),
          creator: {
            platform: "kick" as const,
            platformCreatorId: creatorId,
            login: row.channel?.slug ?? row.slug,
            displayName,
            avatarUrl: row.user?.profile_picture,
            raw: row
          },
          title: row.stream_title ?? row.title ?? "",
          categoryId: row.category?.id
            ? String(row.category.id)
            : undefined,
          categoryName: row.category?.name,
          viewerCount: Number(
            row.viewer_count ??
            row.concurrent_viewers ??
            row.viewers ??
            0
          ),
          startedAt: row.started_at ?? row.created_at,
          language: row.language,
          observedAt,
          raw: row
        };
      });
  }
}
