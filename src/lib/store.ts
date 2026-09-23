import { hasSupabase } from "@/lib/env";
import { memoryStore } from "@/lib/db/memoryStore";
import { supabaseStore } from "@/lib/db/supabaseStore";
import type { DataStore } from "@/lib/db/types";

export const store: DataStore = hasSupabase ? supabaseStore : memoryStore;
