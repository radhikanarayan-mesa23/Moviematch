import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.warn(
    "[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set — database calls will fail until configured in .env."
  );
}

// Fall back to harmless placeholders so createClient() doesn't throw at boot when
// env vars are missing. Actual calls will fail over the network, which is expected
// (and fine) until real credentials are provided.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  serviceRoleKey || "placeholder-service-role-key",
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);
