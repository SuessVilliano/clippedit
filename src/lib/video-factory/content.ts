import { z } from "zod";
import type { ContentPackage } from "@/lib/video-factory/types";

/**
 * Content Package Generator.
 *
 * Turns a HighLevel Release Radar drop into the strict Video Factory content
 * package: 3 faceless Shorts (titles, hook, voiceover script for the creator to
 * record over screen capture, thumbnail concept, visual plan, screen-capture
 * requirements, per-platform social posts) plus a long-form outline.
 *
 * Reuses the existing OpenAI-compatible LLM config (LLM_API_KEY / LLM_API_URL /
 * LLM_MODEL). With no key it falls back to a deterministic template so the
 * feature always produces a valid package.
 *
 * Content rules (enforced in the prompt): do not invent HighLevel capabilities;
 * only make claims supported by the supplied release text; no confidential or
 * affiliate performance data; never auto-insert an affiliate link.
 */

const SOCIAL_PLATFORMS = ["youtube", "instagram", "facebook", "tiktok", "x"] as const;

const socialPostSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  caption: z.string(),
  hashtags: z.array(z.string()).default([])
});

const visualBeatSchema = z.object({
  startSeconds: z.number(),
  endSeconds: z.number(),
  type: z.enum(["screen", "image", "video", "text", "avatar"]),
  description: z.string(),
  assetPrompt: z.string().default(""),
  sourceRequirement: z.string().default("")
});

const screenReqSchema = z.object({
  name: z.string(),
  instructions: z.string(),
  durationSeconds: z.number(),
  supportsScriptText: z.string().default("")
});

const thumbnailSchema = z.object({
  textOptions: z.array(z.string()).default([]),
  selectedText: z.string().default(""),
  imagePrompt: z.string().default(""),
  compositionNotes: z.string().default("")
});

const shortSchema = z.object({
  index: z.number(),
  titleOptions: z.array(z.string()).default([]),
  selectedTitle: z.string(),
  hook: z.string(),
  voiceoverScript: z.string(),
  cta: z.string(),
  descriptionOptions: z.array(z.string()).default([]),
  selectedDescription: z.string().default(""),
  hashtags: z.array(z.string()).default([]),
  thumbnail: thumbnailSchema,
  visualPlan: z.array(visualBeatSchema).default([]),
  brollPrompts: z.array(z.string()).default([]),
  screenCaptureRequirements: z.array(screenReqSchema).default([]),
  socialPosts: z.array(socialPostSchema).default([]),
  captionStyle: z.string().default(""),
  estimatedDurationSeconds: z.number().default(45)
});

export const contentPackageSchema = z.object({
  contentId: z.string(),
  releaseTitle: z.string(),
  coreThesis: z.string(),
  targetAudience: z.string(),
  shorts: z.array(shortSchema).min(1),
  longForm: z.object({
    titleOptions: z.array(z.string()).default([]),
    hook: z.string().default(""),
    outline: z.array(z.string()).default([]),
    cta: z.string().default("")
  })
});

export interface ContentInput {
  contentId: string;
  product?: string;
  releaseTitle: string;
  releaseText: string;
  sourceUrl?: string;
  youtubeUrl?: string;
  audience?: string;
  tone?: string;
}

const DEFAULT_AUDIENCE = "agencies, affiliates, creators, business owners, and AI automation builders";
const DEFAULT_TONE = "smart, energetic, practical, no-hype";

function firstSentence(text: string): string {
  const t = text.trim();
  if (!t) return "";
  return t.split(/(?<=[.!?])\s+/)[0].slice(0, 220);
}

/** Deterministic fallback so the factory works with no LLM key. Valid package. */
export function fallbackPackage(input: ContentInput): ContentPackage {
  const product = input.product || "HighLevel";
  const title = input.releaseTitle;
  const audience = input.audience || DEFAULT_AUDIENCE;
  const summary = firstSentence(input.releaseText) || `${title} gives users a new workflow advantage.`;

  const socialFor = (angle: string): ContentPackage["shorts"][number]["socialPosts"] =>
    SOCIAL_PLATFORMS.map((platform) => ({
      platform,
      caption:
        platform === "x"
          ? `${product} shipped ${title}. ${angle} 🧵`
          : `${product} just shipped ${title}. ${angle}\n\nFollow for weekly Release Radar breakdowns — what changed and the actual play.`,
      hashtags: ["#gohighlevel", "#highlevel", "#aiautomation", "#agency", "#saas"]
    }));

  const short = (
    index: number,
    selectedTitle: string,
    hook: string,
    script: string,
    thumbText: string,
    angle: string,
    screen: { name: string; instructions: string; durationSeconds: number; supportsScriptText: string }
  ): ContentPackage["shorts"][number] => ({
    index,
    titleOptions: [
      selectedTitle,
      `${product} ${title}: the play most people miss`,
      `What ${title} actually unlocks`,
      `${title} — 60-second breakdown`,
      `Do this with ${title} before everyone else`
    ],
    selectedTitle,
    hook,
    voiceoverScript: script,
    cta: "Follow for the next Release Radar — I break down the release and the actual play.",
    descriptionOptions: [
      `${summary} Here's what changed and how ${audience} can use it.`,
      `A quick, practical breakdown of ${title} from ${product}. No hype — just the play.`,
      `${title}: what changed, why it matters, and what I'd build with it.`
    ],
    selectedDescription: `${summary} Here's what changed and how ${audience} can use it.`,
    hashtags: ["#gohighlevel", "#highlevel", "#aiautomation", "#agency", "#saas"],
    thumbnail: {
      textOptions: [thumbText, "HUGE UPDATE", "NEW: " + title.toUpperCase().slice(0, 18)],
      selectedText: thumbText,
      imagePrompt: `High-contrast YouTube thumbnail, bold 2-3 word overlay "${thumbText}", ${product} software UI screenshot on a dark gradient, punchy arrows, clean and modern, no faces, no clutter`,
      compositionNotes: "2-5 words max, one core idea, software/UI visual, high contrast, safe margins."
    },
    visualPlan: [
      { startSeconds: 0, endSeconds: 4, type: "text", description: "Kinetic hook headline over a fast zoom into the release title", assetPrompt: "", sourceRequirement: "Release Radar title card" },
      { startSeconds: 4, endSeconds: 14, type: "screen", description: "Screen recording showing the new feature in the product UI", assetPrompt: "", sourceRequirement: screen.name },
      { startSeconds: 14, endSeconds: 30, type: "screen", description: "Old way vs new way, narrated over the UI", assetPrompt: "", sourceRequirement: screen.name },
      { startSeconds: 30, endSeconds: 45, type: "text", description: "The play: what to build, large text overlay + UI", assetPrompt: "", sourceRequirement: "" }
    ],
    brollPrompts: [
      "Abstract automation nodes connecting on a dark background, subtle motion",
      "Clean SaaS dashboard macro shots, soft focus"
    ],
    screenCaptureRequirements: [screen],
    socialPosts: socialFor(angle),
    captionStyle: "Large, 1-2 short lines, key words emphasized, safe margins for Shorts/Reels UI.",
    estimatedDurationSeconds: 45
  });

  return {
    contentId: input.contentId,
    releaseTitle: title,
    coreThesis: `${summary} The real opportunity is showing ${audience} exactly how to use it.`,
    targetAudience: audience,
    shorts: [
      short(
        1,
        `${product} just dropped ${title} — here's the play`,
        `${product} just released ${title}, and most people are going to stop at the announcement. Do not.`,
        `Here is what changed. ${summary} But the bigger opportunity is what you build around it. If I were running an agency, I would ship one demo of the feature, one automation that connects it to a real result, and one piece of content answering the exact problem it solves.`,
        "HUGE UPDATE",
        "Here's the play most agencies will overlook.",
        { name: "feature-demo", instructions: "Open the new feature, show the primary screen, run one action end to end.", durationSeconds: 10, supportsScriptText: "Here is what changed." }
      ),
      short(
        2,
        `3 ways to use ${title} right now`,
        `If you use ${product}, here are three ways I would use ${title} before everyone catches up.`,
        `Number one, use it as a client or prospect demo. Number two, build an automation around the behavior it unlocks. Number three, turn the workflow into content so people find the use case before they need a pitch.`,
        "3 PLAYS",
        "Three ways to use it before everyone catches up.",
        { name: "workflow-builder", instructions: "Show the workflow builder: trigger, the new action, run a test.", durationSeconds: 8, supportsScriptText: "Build an automation around it." }
      ),
      short(
        3,
        `The affiliate + creator angle on ${title}`,
        `Do not just post the feature announcement. Here is the better play for affiliates and creators.`,
        `Take ${title} and build content around the problem it solves. Show the old way, the new way, then one real workflow. That makes your content searchable and useful, and the product becomes the proof instead of the pitch.`,
        "CREATOR PLAY",
        "The content angle nobody talks about.",
        { name: "before-after", instructions: "Split screen or sequence: the old manual way, then the new feature doing it.", durationSeconds: 8, supportsScriptText: "Show the old way, then the new way." }
      )
    ],
    longForm: {
      titleOptions: [
        `${product} ${title}: What Changed + 5 Ways I'd Use It`,
        `Everything in ${title} (and the plays that matter)`,
        `${title}: full breakdown for agencies and creators`
      ],
      hook: `Today we are breaking down ${title}: what changed, who should care, and the highest-leverage ways I would actually use it.`,
      outline: [
        "30-second release summary",
        "Show the feature in the product UI",
        "Who benefits most and why",
        "Use case: client-facing implementation",
        "Use case: lead generation",
        "Use case: retention/onboarding automation",
        "Use case: affiliate/content strategy",
        "Use case: AI + automation stack extension",
        "What to test this week",
        "Recap + next Release Radar"
      ],
      cta: "Subscribe for weekly AI + automation Release Radar breakdowns."
    }
  };
}

function buildPrompt(input: ContentInput): { system: string; user: string } {
  const audience = input.audience || DEFAULT_AUDIENCE;
  const tone = input.tone || DEFAULT_TONE;
  const system = [
    "You are the content brain for a faceless AI + automation education channel that covers HighLevel (GoHighLevel) Release Radar updates.",
    "Return ONLY valid minified JSON matching this TypeScript type (no markdown, no commentary):",
    `{contentId:string, releaseTitle:string, coreThesis:string, targetAudience:string, shorts:[{index:number, titleOptions:string[5], selectedTitle:string, hook:string, voiceoverScript:string, cta:string, descriptionOptions:string[3], selectedDescription:string, hashtags:string[], thumbnail:{textOptions:string[], selectedText:string, imagePrompt:string, compositionNotes:string}, visualPlan:[{startSeconds:number,endSeconds:number,type:"screen"|"image"|"video"|"text"|"avatar",description:string,assetPrompt:string,sourceRequirement:string}], brollPrompts:string[], screenCaptureRequirements:[{name:string,instructions:string,durationSeconds:number,supportsScriptText:string}], socialPosts:[{platform:"youtube"|"instagram"|"facebook"|"tiktok"|"x",caption:string,hashtags:string[]}], captionStyle:string, estimatedDurationSeconds:number}], longForm:{titleOptions:string[],hook:string,outline:string[],cta:string}}`,
    "Generate exactly 3 shorts. Each voiceoverScript is written to be READ ALOUD BY THE CREATOR IN THEIR OWN VOICE over screen recordings — first person, conversational, no stage directions, 35-60 seconds of speech.",
    "Each short must include socialPosts for all 5 platforms (youtube, instagram, facebook, tiktok, x), ready to paste into a social planner. Provide a thumbnail concept with 2-5 word text.",
    "Focus each short on a different angle among: what changed, why it matters, practical/agency/affiliate/AI-automation use cases, and 'what I would build with this'.",
    "STRICT RULES: Do not invent HighLevel capabilities. Only make product claims supported by the supplied release text. Do not use or reference confidential company or affiliate performance data. Never insert an affiliate link. CTAs may say things like 'Follow for more', 'Subscribe for weekly Release Radar plays', 'Check out HighLevel', 'Save this workflow'.",
    `Tone: ${tone}. Audience: ${audience}. Visual style is 60-70% software screenshots/screen recordings, 15-20% kinetic text, 10-20% optional AI b-roll; no avatar as the main visual.`
  ].join("\n");
  const user = [
    `contentId: ${input.contentId}`,
    `Product: ${input.product || "HighLevel"}`,
    `Release title: ${input.releaseTitle}`,
    input.sourceUrl ? `Source URL: ${input.sourceUrl}` : "",
    input.youtubeUrl ? `YouTube URL: ${input.youtubeUrl}` : "",
    "Release text (the ONLY source of product claims):",
    input.releaseText || "(no release text supplied — keep claims generic and about the content play, not specific features)"
  ]
    .filter(Boolean)
    .join("\n");
  return { system, user };
}

export interface GenerateResult {
  mode: "ai" | "template";
  package: ContentPackage;
}

async function generateWithLLM(input: ContentInput): Promise<ContentPackage | null> {
  const apiKey = process.env.LLM_API_KEY;
  const apiUrl = process.env.LLM_API_URL || "https://api.openai.com/v1/chat/completions";
  const model = process.env.LLM_MODEL || "gpt-4.1-mini";
  if (!apiKey) return null;

  const { system, user } = buildPrompt(input);
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });
    if (!res.ok) return null;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = contentPackageSchema.safeParse(JSON.parse(content));
    if (!parsed.success) return null;
    // Ensure contentId is our job-derived id, not whatever the model echoed.
    return { ...parsed.data, contentId: input.contentId } as ContentPackage;
  } catch {
    return null;
  }
}

/** Generate a validated content package, using the LLM when configured. */
export async function generateContentPackage(input: ContentInput): Promise<GenerateResult> {
  const ai = await generateWithLLM(input);
  if (ai) return { mode: "ai", package: ai };
  return { mode: "template", package: fallbackPackage(input) };
}
