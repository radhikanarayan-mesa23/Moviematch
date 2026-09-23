"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, hasSupabaseRealtime } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

// Anon/publishable key client, used client-side only for the Realtime
// subscription on the `sessions` table (SELECT-only per RLS policy).
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!hasSupabaseRealtime) return null;
  if (!browserClient) {
    browserClient = createClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return browserClient;
}
