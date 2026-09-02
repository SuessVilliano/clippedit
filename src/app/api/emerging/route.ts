import { NextResponse } from "next/server";
import { getRuntimeEmergingData } from "@/lib/runtime-api-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getRuntimeEmergingData());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
