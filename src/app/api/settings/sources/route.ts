import { NextResponse } from "next/server";
import {
  SOURCE_COOKIE,
  encryptSourceCredentials,
  getRuntimeSourceCredentials,
  type RuntimeSourceCredentials
} from "@/lib/source-credentials";

export const dynamic = "force-dynamic";

export async function GET() {
  const creds = await getRuntimeSourceCredentials();
  return NextResponse.json({
    twitch: { connected: Boolean(creds.twitch?.clientId && creds.twitch?.clientSecret) },
    kick: { connected: Boolean(creds.kick?.clientId && creds.kick?.clientSecret) }
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as RuntimeSourceCredentials;
  const clean: RuntimeSourceCredentials = {};

  if (body.twitch?.clientId?.trim() && body.twitch?.clientSecret?.trim()) {
    clean.twitch = {
      clientId: body.twitch.clientId.trim(),
      clientSecret: body.twitch.clientSecret.trim()
    };
  }
  if (body.kick?.clientId?.trim() && body.kick?.clientSecret?.trim()) {
    clean.kick = {
      clientId: body.kick.clientId.trim(),
      clientSecret: body.kick.clientSecret.trim()
    };
  }

  const encrypted = encryptSourceCredentials(clean);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SOURCE_COOKIE, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SOURCE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return response;
}
