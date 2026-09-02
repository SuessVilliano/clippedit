import { z } from "zod";
import { env, isKickConfigured } from "@/lib/env";

const TokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().optional()
});

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getKickAppToken(credentials?: {
  clientId: string;
  clientSecret: string;
}): Promise<string> {
  const clientId = credentials?.clientId ?? env.kick.clientId;
  const clientSecret = credentials?.clientSecret ?? env.kick.clientSecret;

  if (!clientId || !clientSecret || (!credentials && !isKickConfigured())) {
    throw new Error("Kick is not configured (missing client id/secret).");
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

  const response = await fetch("https://id.kick.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `Kick token request failed ${response.status}: ${await response.text()}`
    );
  }

  const parsed = TokenSchema.parse(await response.json());
  tokenCache.set(cacheKey, {
    token: parsed.access_token,
    expiresAt: now + (parsed.expires_in ?? 3600) * 1000
  });
  return parsed.access_token;
}
