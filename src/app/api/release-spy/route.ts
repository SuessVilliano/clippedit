import { NextRequest, NextResponse } from "next/server";

type ReleaseInput = {
  product?: string;
  feature?: string;
  releaseText?: string;
  audience?: string;
  goal?: string;
  tone?: string;
};

type ContentPackage = {
  headline: string;
  thesis: string;
  angles: string[];
  shorts: Array<{ title: string; hook: string; script: string; visualPlan: string[]; cta: string }>;
  longForm: { title: string; hook: string; outline: string[]; cta: string };
  captions: string[];
  production: { avatarUse: string; broll: string[]; screenCapture: string[]; opusPrompt: string };
};

function fallback(input: Required<ReleaseInput>): ContentPackage {
  const product = input.product || "HighLevel";
  const feature = input.feature || "this release";
  const audience = input.audience || "agencies, affiliates, and automation builders";
  const goal = input.goal || "turn the release into traffic, leads, and useful automations";
  const source = input.releaseText.trim();
  const summary = source ? source.split(/(?<=[.!?])\s+/)[0].slice(0, 220) : `${feature} gives users a new workflow advantage.`;

  return {
    headline: `${product} Release Radar: ${feature}`,
    thesis: `${summary} The real content opportunity is showing ${audience} exactly how to use it to ${goal}.`,
    angles: [
      `What changed: explain ${feature} in plain English`,
      `The money play: 3 ways ${audience} can use it immediately`,
      `The automation play: build a workflow around ${feature}`,
      `The affiliate play: turn the release into educational content that creates demand`,
      `The contrarian play: what most people will miss about ${feature}`
    ],
    shorts: [
      {
        title: `${product} just dropped ${feature} — here’s the play`,
        hook: `${product} just released ${feature}, and most people are going to stop at the feature announcement. Don’t.` ,
        script: `Here’s what changed: ${summary} But the bigger opportunity is what you can build around it. If I were an agency owner or affiliate, I’d create one demo showing the feature, one workflow that connects it to a real business result, and one piece of content answering the exact problem it solves. That turns a software update into traffic, authority, and a reason for someone to take action.`,
        visualPlan: ["Open on release headline", "Zoom into the new feature UI", "Overlay: WHAT CHANGED", "Show a simple 3-step automation diagram", "End on a screen-recorded outcome"],
        cta: "Follow for the next Release Radar — I break down the release and the actual play."
      },
      {
        title: `3 ways to use ${feature} right now`,
        hook: `If you use ${product}, here are three ways I’d use ${feature} before everyone else catches up.`,
        script: `Number one: use it as a client or prospect demo. Number two: build an automation around the behavior it unlocks. Number three: turn the workflow into educational content so people discover the use case before they ever need a sales pitch. The feature is useful, but the distribution around the feature is where the leverage is.`,
        visualPlan: ["Fast UI b-roll", "Numbered kinetic text 1-2-3", "Screen recording of workflow builder", "AI diagram of lead-to-result flow"],
        cta: "Save this and build one of the three today."
      },
      {
        title: `The affiliate angle nobody talks about`,
        hook: `Affiliates should not just post feature announcements. Here’s the better play.`,
        script: `Take ${feature} and build content around the problem it solves. Show the old way, show the new way, then show one real workflow. That makes your content searchable, useful, and naturally connected to the product without turning every video into a pitch. Teach the outcome first. Let the product become the proof.`,
        visualPlan: ["Split screen: OLD WAY vs NEW WAY", "Release screenshot", "Workflow screen share", "Search-style text overlays with use-case keywords"],
        cta: "Follow if you want the strategy behind the release, not just the release notes."
      }
    ],
    longForm: {
      title: `${product} ${feature}: What Changed + 5 Ways I’d Use It`,
      hook: `Today we’re not just covering ${feature}. We’re breaking down what changed, who should care, and the five highest-leverage ways I’d actually use it.`,
      outline: [
        "30-second release summary",
        "Show the feature in the product UI",
        "Who benefits most and why",
        "Use case #1: client-facing implementation",
        "Use case #2: lead generation",
        "Use case #3: retention/onboarding automation",
        "Use case #4: affiliate/content strategy",
        "Use case #5: AI + automation stack extension",
        "What to test this week",
        "Recap + next Release Radar"
      ],
      cta: "Subscribe for weekly AI + automation Release Radar breakdowns."
    },
    captions: [
      `${product} released ${feature}. Here’s what changed — and the play I’d build around it.`,
      `Don’t just read the changelog. Turn the release into a workflow, a use case, and a piece of content.`,
      `${feature} → automation → outcome → content. That’s the flywheel.`
    ],
    production: {
      avatarUse: "Use AI avatar for the opening hook and final CTA only; keep the body focused on UI, screen recordings, diagrams, and captions.",
      broll: ["AI-generated SaaS dashboard macro shots", "abstract automation nodes connecting", "creator editing a vertical video", "lead notifications and CRM motion graphics"],
      screenCapture: ["release announcement", "feature screen", "workflow builder", "before/after result", "final automation map"],
      opusPrompt: `Create a fast-paced faceless vertical explainer about ${product}'s ${feature}. Use software screen recordings as the primary visual, kinetic captions, clean AI automation b-roll, and an AI presenter only for the hook and CTA. Tone: ${input.tone || "smart, energetic, practical"}. Audience: ${audience}. Goal: ${goal}.`
    }
  };
}

async function generateWithLLM(input: Required<ReleaseInput>): Promise<ContentPackage | null> {
  const apiKey = process.env.LLM_API_KEY;
  const apiUrl = process.env.LLM_API_URL || "https://api.openai.com/v1/chat/completions";
  const model = process.env.LLM_MODEL || "gpt-4.1-mini";
  if (!apiKey) return null;

  const schemaPrompt = `Return ONLY valid JSON with this shape: {headline:string, thesis:string, angles:string[], shorts:[{title:string,hook:string,script:string,visualPlan:string[],cta:string}], longForm:{title:string,hook:string,outline:string[],cta:string}, captions:string[], production:{avatarUse:string,broll:string[],screenCapture:string[],opusPrompt:string}}. Generate exactly 3 shorts. Focus on explaining the release AND the practical play for agencies, affiliates, AI and automation users. Do not invent product capabilities beyond the supplied release text.`;
  const userPrompt = `Product: ${input.product}\nFeature: ${input.feature}\nAudience: ${input.audience}\nGoal: ${input.goal}\nTone: ${input.tone}\nRelease text:\n${input.releaseText}`;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, temperature: 0.6, response_format: { type: "json_object" }, messages: [{ role: "system", content: schemaPrompt }, { role: "user", content: userPrompt }] })
    });
    if (!res.ok) return null;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content) as ContentPackage;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as ReleaseInput;
  const input: Required<ReleaseInput> = {
    product: body.product?.trim() || "HighLevel",
    feature: body.feature?.trim() || "New Release",
    releaseText: body.releaseText?.trim() || "",
    audience: body.audience?.trim() || "agencies, affiliates, creators, and AI automation builders",
    goal: body.goal?.trim() || "create useful content, drive demand, and build practical automations",
    tone: body.tone?.trim() || "smart, energetic, practical, no-hype"
  };

  if (!input.releaseText) return NextResponse.json({ error: "Paste the release notes or source text first." }, { status: 400 });

  const ai = await generateWithLLM(input);
  return NextResponse.json({ mode: ai ? "ai" : "template", package: ai ?? fallback(input) });
}
