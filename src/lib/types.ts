export type Platform = "twitch" | "kick";

export interface NormalizedCreator {
  platform: Platform;
  platformCreatorId: string;
  login?: string;
  displayName: string;
  avatarUrl?: string;
  raw: unknown;
}

export interface NormalizedStream {
  platform: Platform;
  platformStreamId: string;
  creator: NormalizedCreator;
  title?: string;
  categoryId?: string;
  categoryName?: string;
  viewerCount: number;
  startedAt?: string;
  language?: string;
  observedAt: string;
  raw: unknown;
}

export interface NormalizedClip {
  platform: Platform;
  platformClipId: string;
  platformCreatorId?: string;
  title?: string;
  sourceUrl?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  viewCount?: number;
  createdAt?: string;
  durationSeconds?: number;
  observedAt: string;
  raw: unknown;
}

export interface LiveQuery {
  creatorIds?: string[];
  creatorLogins?: string[];
  categoryIds?: string[];
  limit?: number;
}

export interface ClipQuery {
  creatorId?: string;
  categoryId?: string;
  startedAt?: string;
  endedAt?: string;
  limit?: number;
}

export interface PlatformAdapter {
  platform: Platform;
  getLiveStreams(input: LiveQuery): Promise<NormalizedStream[]>;
  getPublicClips?(input: ClipQuery): Promise<NormalizedClip[]>;
}
