/**
 * Provider abstraction for the Video Factory.
 *
 * clippedit stays provider-agnostic: every external generation service is
 * reached through one of these interfaces. The sv-content-engine worker and the
 * cloud fallbacks (OpenAI) are just implementations. A provider that is not
 * configured reports isConfigured() === false and the caller skips it or falls
 * back — the app never crashes because a key is missing.
 */

export interface GeneratedAsset {
  /** Inline data URI or remote URL to the produced asset. */
  url: string;
  mimeType: string;
  /** Present for async providers that produce a job to poll later. */
  providerJobId?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderStatus {
  status: "queued" | "generating" | "ready" | "failed";
  url?: string;
  error?: string;
}

export interface VoiceGenerateInput {
  script: string;
  voice?: string;
}

export interface ImageGenerateInput {
  prompt: string;
  /** "16:9" for YouTube thumbnails, "9:16" for a vertical cover. */
  aspect?: "16:9" | "9:16" | "1:1";
}

export interface VideoGenerateInput {
  prompt: string;
  kind: "image" | "video";
  durationSeconds?: number;
}

export interface VoiceProvider {
  name: string;
  isConfigured(): boolean;
  generate(input: VoiceGenerateInput): Promise<GeneratedAsset>;
}

export interface ImageProvider {
  name: string;
  isConfigured(): boolean;
  generate(input: ImageGenerateInput): Promise<GeneratedAsset>;
}

export interface VideoProvider {
  name: string;
  isConfigured(): boolean;
  generate(input: VideoGenerateInput): Promise<GeneratedAsset>;
  getStatus?(providerJobId: string): Promise<ProviderStatus>;
}

export interface RenderProvider {
  name: string;
  isConfigured(): boolean;
}
