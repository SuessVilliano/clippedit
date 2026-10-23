import { z } from "zod";
export const sourceSchema = z.string().url().max(2000).refine(value => {
  const u = new URL(value);
  return u.protocol === "https:" && !u.username && !u.password && ["youtube.com", "www.youtube.com", "youtu.be", "vimeo.com", "www.vimeo.com", "twitch.tv", "www.twitch.tv", "drive.google.com", "www.loom.com", "loom.com"].includes(u.hostname);
}, "Use a supported YouTube, Vimeo, Twitch, Drive or Loom HTTPS video link.");
export const opusInput = z.object({ apiKey: z.string().trim().min(8).max(512), orgId: z.string().regex(/^[a-zA-Z0-9_-]*$/).max(100).optional(), action: z.enum(["create", "clips"]), source: sourceSchema.optional(), projectId: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(200).optional(), rights: z.boolean().optional(), confirmed: z.boolean().optional(), duration: z.enum(["30", "60", "90"]).default("60"), brief: z.string().max(1000).default("") });
export type OpusInput = z.infer<typeof opusInput>;
export async function callOpus(input: OpusInput) {
  const headers: Record<string, string> = { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" };
  if (input.orgId) headers["x-opus-org-id"] = input.orgId;
  let url = "https://api.opus.pro/api/clip-projects";
  let body: string | undefined;
  if (input.action === "create") {
    if (!input.rights || !input.confirmed || !input.source) throw new Error("Confirm source rights and Opus credit usage before generating.");
    body = JSON.stringify({ videoUrl: input.source, curationPref: { model: "ClipAnything", clipDurations: [[0, Number(input.duration)]], genre: "Auto", ...(input.brief ? { customPrompt: input.brief } : {}) }, renderPref: { layoutAspectRatio: "portrait" }, brandTemplateId: "preset-fancy-Karaoke" });
  } else {
    if (!input.projectId) throw new Error("Enter a project ID to retrieve clips.");
    url = `https://api.opus.pro/api/exportable-clips?${new URLSearchParams({ q: "findByProjectId", projectId: input.projectId })}`;
  }
  const response = await fetch(url, { method: body ? "POST" : "GET", headers, body, cache: "no-store", signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Opus rejected this connection. Check your API key, organization and API access." : response.status === 429 ? "Opus is busy or rate-limited. Wait before trying again." : "Opus could not complete the request. Check your account credits and project in Opus before retrying.");
  const data = await response.json();
  if (input.action === "clips") {
    const items = Array.isArray(data) ? data : data.items ?? data.data ?? [];
    if (!Array.isArray(items)) throw new Error("Opus returned an unexpected clip response.");
    return { clips: items.map((v: Record<string, unknown>) => ({ id: v.id, title: v.title, preview: safeMedia(v.uriForPreview), download: safeMedia(v.uriForExport) })) };
  }
  const id = data.id ?? data.projectId ?? data.project?.id;
  if (typeof id !== "string") throw new Error("Opus accepted the request but returned no project ID. Check your Opus dashboard before submitting again.");
  return { projectId: id, message: "Opus accepted the project. Keep this project ID and check for clips when processing finishes." };
}
function safeMedia(value: unknown) { if (typeof value !== "string") return undefined; try { const u = new URL(value); return u.protocol === "https:" ? u.href : undefined; } catch { return undefined; } }
