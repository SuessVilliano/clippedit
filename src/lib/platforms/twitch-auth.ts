import { z } from "zod";
import { env, isTwitchConfigured } from "@/lib/env";

/**
 * Twitch app access token via the OAuth client-credentials flow.
 *
 * App tokens are used for public read endpoints (streams, clips). They are
 * cached in-process until shortly before expiry. User-authorized actions
 * (creating clips, editor scopes) require a separate user-token flow and are
 * intentionally out of scope for public discovery.
 */
const TokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string()
});

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getTwitchAppToken(): Promise<string> {
  if (!isTwitchConfigured()) {
    throw new Error("Twitch is not configured (missing client id/secret).");
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const params = new URLSearchParams({
    client_id: env.twitch.clientId!,
    client_secret: env.twitch.clientSecret!,
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
  cachedToken = {
    token: parsed.access_token,
    expiresAt: now + parsed.expires_in * 1000
  };
  return cachedToken.token;
}
