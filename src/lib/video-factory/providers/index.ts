import { env } from "@/lib/env";
import type { ImageProvider } from "@/lib/video-factory/providers/types";
import { openAiImageProvider } from "@/lib/video-factory/providers/image/openai";

/**
 * Provider selection. Reads the configured provider name and returns an
 * implementation. Unknown/unconfigured providers return one whose
 * isConfigured() is false so callers degrade gracefully.
 */
export function getImageProvider(): ImageProvider {
  switch (env.videoFactory.imageProvider) {
    case "openai":
    default:
      return openAiImageProvider();
    // "openart" / "sv-engine" are adapter skeletons — added when their APIs
    // are confirmed (see docs/VIDEO_FACTORY_PROVIDERS.md).
  }
}
