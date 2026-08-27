import { NextResponse } from "next/server";
import { getTrendingData } from "@/lib/api-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getTrendingData());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
