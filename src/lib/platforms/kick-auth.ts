import { z } from "zod";
import { env, isKickConfigured } from "@/lib/env";

/**
 * Kick app access token via client-credentials. Kick's developer API is still
 * evolving, so all assumptions are isolated here and every caller is expected
 * to tolerate failure (see the per-platform try/catch in the ingest loop).
 */
const TokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().optional()
});

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getKickAppToken(): Promise<string> {
  if (!isKickConfigured()) {
    throw new Error("Kick is not configured (missing client id/secret).");
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const params = new URLSearchParams({
    client_id: env.kick.clientId!,
    client_secret: env.kick.clientSecret!,
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
  cachedToken = {
    token: parsed.access_token,
    expiresAt: now + (parsed.expires_in ?? 3600) * 1000
  };
  return cachedToken.token;
}
