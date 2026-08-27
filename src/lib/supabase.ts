import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Server-side Supabase client using the service role key.
 *
 * This must only ever be imported from server code (route handlers, server
 * components, workers) — never shipped to the browser. Returns `null` when
 * Supabase is not configured so callers can degrade gracefully.
 */
let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (cached) return cached;

  cached = createClient(env.supabase.url!, env.supabase.serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cached;
}
