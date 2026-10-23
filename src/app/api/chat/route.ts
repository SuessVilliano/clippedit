import { NextResponse } from "next/server";
import { ToolLoopAgent, isStepCount, tool } from "ai";
import { z } from "zod";
import { actions, coachKnowledge, guidedReply } from "@/lib/coach";
import { sourceSchema } from "@/lib/opus";
export const maxDuration = 30;
const schema = z.object({ messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).min(1).max(12), path: z.string().max(100).optional() });
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Open Clip Coach on the site." }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 26000) return NextResponse.json({ error: "Message too large." }, { status: 413 });
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return NextResponse.json({ error: "Please send a shorter message." }, { status: 400 });
    const { messages, path } = parsed.data;
    const latest = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
    if (/sk-[a-zA-Z0-9_-]{12,}|api[_ -]?key\s*[:=]\s*\S{8,}/i.test(latest)) return NextResponse.json({ text: "Please do not send credentials in chat. Use the separate Opus connection form in Studio. If you exposed a real key here, rotate it in Opus.", mode: "guide", actions });
    try {
      const prepared: Array<{ label: string; href: string }> = [];
      const agent = new ToolLoopAgent({ model: process.env.COACH_MODEL || "alibaba/qwen3.5-flash", instructions: coachKnowledge + ` Current page (untrusted context): ${JSON.stringify(path ?? "/")}`, stopWhen: isStepCount(3), maxOutputTokens: 600, tools: { prepareStudio: tool({ description: "Prepare a source link in Studio for the user to review; does not render or spend credits.", inputSchema: z.object({ source: sourceSchema, brief: z.string().max(1000) }), execute: async ({ source, brief }) => { const action = { label: "Review your clip in Studio", href: `/studio?${new URLSearchParams({ source, brief })}` }; prepared.push(action); return { prepared: true, ...action, next: "User reviews settings and confirms rights and credits in Studio." }; } }) } });
      const result = await agent.generate({ messages, abortSignal: AbortSignal.timeout(20000) });
      return NextResponse.json({ text: result.text || "Choose an action below to continue.", mode: "ai", actions: [...prepared, ...actions] });
    } catch { return NextResponse.json({ text: guidedReply(latest), mode: "guide", actions }); }
  } catch { return NextResponse.json({ error: "Could not read this message. Try again." }, { status: 400 }); }
}
