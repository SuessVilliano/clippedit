import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";
import { env, isSupabaseConfigured, configuredPlatforms } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled ingest entrypoint. Protected by CRON_SECRET.
 *
 * Vercel Cron calls this with `Authorization: Bearer <CRON_SECRET>`. It can
 * also be triggered manually with the same header or `?secret=` for local runs.
 */
function authorized(request: Request): boolean {
  // If no secret is configured we refuse rather than run unauthenticated.
  if (!env.cronSecret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${env.cronSecret}`) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret") === env.cronSecret;
}

export async function GET(request: Request) {
  if (!env.cronSecret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 503 }
    );
  }
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase is not configured; nothing to persist." },
      { status: 503 }
    );
  }
  if (configuredPlatforms().length === 0) {
    return NextResponse.json(
      { ok: false, error: "No platform credentials configured." },
      { status: 503 }
    );
  }

  const result = await runIngest();
  return NextResponse.json({ ok: true, ...result });
}

// Allow POST as well (some schedulers prefer it).
export const POST = GET;
