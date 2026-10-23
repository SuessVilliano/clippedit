import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export const SOURCE_COOKIE = "clippedit_sources";

export interface RuntimeSourceCredentials {
  twitch?: { clientId: string; clientSecret: string };
  kick?: { clientId: string; clientSecret: string };
}

function key() {
  const secret = env.cronSecret ?? env.supabase.serviceRoleKey;
  if (!secret) return null;
  return createHash("sha256").update(secret).digest();
}

export function encryptSourceCredentials(value: RuntimeSourceCredentials): string {
  const encryptionKey = key();
  if (!encryptionKey) {
    throw new Error("A server secret (CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY) is required to securely save source credentials.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function decryptSourceCredentials(value?: string | null): RuntimeSourceCredentials {
  if (!value) return {};
  const encryptionKey = key();
  if (!encryptionKey) return {};
  try {
    const data = Buffer.from(value, "base64url");
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const ciphertext = data.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    return JSON.parse(plaintext) as RuntimeSourceCredentials;
  } catch {
    return {};
  }
}

export async function getRuntimeSourceCredentials(): Promise<RuntimeSourceCredentials> {
  const store = await cookies();
  const saved = decryptSourceCredentials(store.get(SOURCE_COOKIE)?.value);
  return {
    twitch:
      saved.twitch ??
      (env.twitch.clientId && env.twitch.clientSecret
        ? { clientId: env.twitch.clientId, clientSecret: env.twitch.clientSecret }
        : undefined),
    kick:
      saved.kick ??
      (env.kick.clientId && env.kick.clientSecret
        ? { clientId: env.kick.clientId, clientSecret: env.kick.clientSecret }
        : undefined)
  };
}
