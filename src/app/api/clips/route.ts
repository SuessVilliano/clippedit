import { NextResponse } from "next/server";
import { getRuntimeClipsData } from "@/lib/runtime-api-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getRuntimeClipsData());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
