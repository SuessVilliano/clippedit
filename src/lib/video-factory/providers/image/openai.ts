import type { GeneratedAsset, ImageGenerateInput, ImageProvider } from "@/lib/video-factory/providers/types";

/**
 * OpenAI Images provider for thumbnails / still assets.
 *
 * Uses the OpenAI Images API (gpt-image-1 by default). Returns the image as an
 * inline data URI so it can be previewed with no storage bucket configured —
 * persistence to Supabase Storage is layered on later. Server-only: the key
 * never reaches the browser.
 */

const DEFAULT_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_MODEL = "gpt-image-1";

function sizeForAspect(aspect: ImageGenerateInput["aspect"], model: string): string {
  // gpt-image-1 supports 1536x1024 (landscape) / 1024x1536 (portrait) / 1024x1024.
  // dall-e-3 supports 1792x1024 / 1024x1792 / 1024x1024.
  const isDalle = model.includes("dall-e");
  if (aspect === "9:16") return isDalle ? "1024x1792" : "1024x1536";
  if (aspect === "1:1") return "1024x1024";
  return isDalle ? "1792x1024" : "1536x1024"; // default 16:9
}

export function openAiImageProvider(): ImageProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  const apiUrl = process.env.OPENAI_IMAGE_URL || DEFAULT_URL;
  const model = process.env.OPENAI_IMAGE_MODEL || DEFAULT_MODEL;

  return {
    name: `openai:${model}`,
    isConfigured: () => Boolean(apiKey),
    async generate(input: ImageGenerateInput): Promise<GeneratedAsset> {
      if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          prompt: input.prompt,
          n: 1,
          size: sizeForAspect(input.aspect ?? "16:9", model)
        })
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`OpenAI image generation failed (${res.status}): ${detail.slice(0, 300)}`);
      }
      const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
      const first = json.data?.[0];
      if (first?.b64_json) {
        return { url: `data:image/png;base64,${first.b64_json}`, mimeType: "image/png", metadata: { model } };
      }
      if (first?.url) {
        return { url: first.url, mimeType: "image/png", metadata: { model } };
      }
      throw new Error("OpenAI image generation returned no image.");
    }
  };
}
