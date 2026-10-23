import { NextResponse } from "next/server";
import { getRuntimeLiveData } from "@/lib/runtime-api-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getRuntimeLiveData());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
