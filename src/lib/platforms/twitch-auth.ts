import { z } from "zod";
import { env, isTwitchConfigured } from "@/lib/env";

const TokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string()
});

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getTwitchAppToken(credentials?: {
  clientId: string;
  clientSecret: string;
}): Promise<string> {
  const clientId = credentials?.clientId ?? env.twitch.clientId;
  const clientSecret = credentials?.clientSecret ?? env.twitch.clientSecret;

  if (!clientId || !clientSecret || (!credentials && !isTwitchConfigured())) {
    throw new Error("Twitch is not configured (missing client id/secret).");
  }

  const now = Date.now();
  const cacheKey = clientId;
  const cachedToken = tokenCache.get(cacheKey);
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials"
  });

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `Twitch token request failed ${response.status}: ${await response.text()}`
    );
  }

  const parsed = TokenSchema.parse(await response.json());
  tokenCache.set(cacheKey, {
    token: parsed.access_token,
    expiresAt: now + parsed.expires_in * 1000
  });
  return parsed.access_token;
}
