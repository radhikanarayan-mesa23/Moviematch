export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  tmdbApiKey: process.env.TMDB_API_KEY || "",
  rapidApiKey: process.env.RAPIDAPI_KEY || "",
  rapidApiHost: process.env.RAPIDAPI_HOST || "ott-details.p.rapidapi.com",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
};

export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
export const hasSupabaseRealtime = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const hasTmdb = Boolean(env.tmdbApiKey);
export const hasRapidApi = Boolean(env.rapidApiKey);
export const hasGemini = Boolean(env.geminiApiKey);

export const usingAnyMock = !hasSupabase || !hasTmdb || !hasRapidApi || !hasGemini;

export const POOL_SIZE = 30;
export const RANK_BUFFER = 15;
export const RANK_CANDIDATES = POOL_SIZE + RANK_BUFFER;
