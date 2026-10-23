import { NextResponse } from "next/server";
import { opusInput, callOpus } from "@/lib/opus";
export const maxDuration = 30;
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Use Studio to make this request." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 12000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  try {
    const parsed = opusInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    return NextResponse.json(await callOpus(parsed.data), { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return NextResponse.json({ error: e instanceof Error && !e.message.includes("fetch") ? e.message : "Connection interrupted. Check the Opus dashboard before retrying a generation." }, { status: 502 }); }
}
