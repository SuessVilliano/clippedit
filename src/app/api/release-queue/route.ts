import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  const db = getServiceClient();
  if (!db) return NextResponse.json({ items: [], warning: "Supabase is not configured." });

  const { data, error } = await db
    .from("release_content_queue")
    .select("id,source_url,source_title,source_name,content_package,generator_mode,status,detected_at,generated_at")
    .order("detected_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
