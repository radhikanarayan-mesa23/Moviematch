import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, hasSupabase } from "@/lib/env";

let adminClient: SupabaseClient | null = null;

// Service-role client for server routes only — bypasses RLS. Never import
// this from client components.
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!hasSupabase) return null;
  if (!adminClient) {
    adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return adminClient;
}
