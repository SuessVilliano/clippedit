/**
 * Centralized, lazy access to environment configuration.
 *
 * Nothing here throws at import time so the app can build and render even when
 * credentials are absent. Each feature checks its own `isConfigured` flag and
 * degrades gracefully (the UI shows a "connect your keys" state instead of
 * crashing).
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  supabase: {
    url: read("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY")
  },
  twitch: {
    clientId: read("TWITCH_CLIENT_ID"),
    clientSecret: read("TWITCH_CLIENT_SECRET")
  },
  kick: {
    clientId: read("KICK_CLIENT_ID"),
    clientSecret: read("KICK_CLIENT_SECRET")
  },
  cronSecret: read("CRON_SECRET"),
  videoFactory: {
    enabled: read("VIDEO_FACTORY_ENABLED") !== "false", // on unless explicitly disabled
    voiceProvider: read("VOICE_PROVIDER") ?? "sv-engine",
    imageProvider: read("IMAGE_PROVIDER") ?? "openai",
    videoProvider: read("VIDEO_PROVIDER") ?? "sv-engine",
    renderProvider: read("RENDER_PROVIDER") ?? "sv-engine",
    // The sv-content-engine worker (local/GPU box). Optional — when unset,
    // engine-backed providers report "not configured" and fall back or skip.
    engineUrl: read("SV_ENGINE_URL"),
    engineToken: read("SV_ENGINE_TOKEN"),
    openaiApiKey: read("OPENAI_API_KEY")
  }
} as const;

export const isSupabaseConfigured = () =>
  Boolean(env.supabase.url && env.supabase.serviceRoleKey);

/** Whether the Video Factory feature is turned on. */
export const isVideoFactoryEnabled = () => env.videoFactory.enabled;

/** Whether the sv-content-engine render/generation worker is reachable. */
export const isSvEngineConfigured = () =>
  Boolean(env.videoFactory.engineUrl && env.videoFactory.engineToken);

export const isTwitchConfigured = () =>
  Boolean(env.twitch.clientId && env.twitch.clientSecret);

export const isKickConfigured = () =>
  Boolean(env.kick.clientId && env.kick.clientSecret);

/** Which platforms have credentials wired up right now. */
export function configuredPlatforms(): Array<"twitch" | "kick"> {
  const platforms: Array<"twitch" | "kick"> = [];
  if (isTwitchConfigured()) platforms.push("twitch");
  if (isKickConfigured()) platforms.push("kick");
  return platforms;
}
