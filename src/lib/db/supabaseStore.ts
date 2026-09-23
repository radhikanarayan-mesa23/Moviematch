import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SessionRow } from "@/lib/types";
import type { DataStore } from "./types";

function db() {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase admin client unavailable");
  return client;
}

export const supabaseStore: DataStore = {
  async ensureCouple(coupleId) {
    const { error } = await db().from("couples").upsert({ id: coupleId }, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  },

  async createSession(code) {
    const { data, error } = await db()
      .from("sessions")
      .insert({ code, status: "waiting_a", round: 1 })
      .select()
      .single();
    if (error) throw error;
    return data as SessionRow;
  },

  async getSessionByCode(code) {
    const { data, error } = await db().from("sessions").select("*").eq("code", code).maybeSingle();
    if (error) throw error;
    return (data as SessionRow) ?? null;
  },

  async getSessionById(id) {
    const { data, error } = await db().from("sessions").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data as SessionRow) ?? null;
  },

  async updateSession(id, patch) {
    const { data, error } = await db().from("sessions").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data as SessionRow;
  },

  async claimTransition(id, expectedStatus, patch) {
    const { data, error } = await db()
      .from("sessions")
      .update(patch)
      .eq("id", id)
      .eq("status", expectedStatus)
      .select();
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  },

  async upsertParticipant(sessionId, role, deviceId, preferences) {
    const { data, error } = await db()
      .from("participants")
      .upsert(
        {
          session_id: sessionId,
          role,
          device_id: deviceId,
          preferences,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "session_id,role" }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getParticipants(sessionId) {
    const { data, error } = await db().from("participants").select("*").eq("session_id", sessionId);
    if (error) throw error;
    return data ?? [];
  },

  async getParticipant(sessionId, role) {
    const { data, error } = await db()
      .from("participants")
      .select("*")
      .eq("session_id", sessionId)
      .eq("role", role)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  async getParticipantById(id) {
    const { data, error } = await db().from("participants").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  async setParticipantFinishedRound(participantId, round) {
    const { error } = await db()
      .from("participants")
      .update({ finished_round: round })
      .eq("id", participantId);
    if (error) throw error;
  },

  async insertTitlesPool(sessionId, round, titles) {
    if (titles.length === 0) return;
    const rows = titles.map((t) => ({ session_id: sessionId, round, ...t }));
    const { error } = await db()
      .from("titles_pool")
      .upsert(rows, { onConflict: "session_id,round,tmdb_id", ignoreDuplicates: true });
    if (error) throw error;
  },

  async getTitlesPool(sessionId, round) {
    const { data, error } = await db()
      .from("titles_pool")
      .select("*")
      .eq("session_id", sessionId)
      .eq("round", round);
    if (error) throw error;
    return data ?? [];
  },

  async getAllTitlesPool(sessionId) {
    const { data, error } = await db().from("titles_pool").select("*").eq("session_id", sessionId);
    if (error) throw error;
    return data ?? [];
  },

  async insertSwipe(sessionId, participantId, round, tmdbId, mediaType, direction) {
    const { error } = await db()
      .from("swipes")
      .upsert(
        {
          session_id: sessionId,
          participant_id: participantId,
          round,
          tmdb_id: tmdbId,
          media_type: mediaType,
          direction,
        },
        { onConflict: "session_id,participant_id,round,tmdb_id" }
      );
    if (error) throw error;
  },

  async getSwipes(sessionId, round) {
    let query = db().from("swipes").select("*").eq("session_id", sessionId);
    if (round !== undefined) query = query.eq("round", round);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async insertRating(sessionId, coupleId, tmdbId, mediaType, title, stars) {
    const { error } = await db().from("ratings").insert({
      session_id: sessionId,
      couple_id: coupleId,
      tmdb_id: tmdbId,
      media_type: mediaType,
      title,
      stars,
    });
    if (error) throw error;
  },

  async findParticipantsByDevice(deviceId) {
    const { data, error } = await db().from("participants").select("*").eq("device_id", deviceId);
    if (error) throw error;
    return data ?? [];
  },

  async getSessionsByIds(ids) {
    if (ids.length === 0) return [];
    const { data, error } = await db().from("sessions").select("*").in("id", ids);
    if (error) throw error;
    return data ?? [];
  },

  async getSessionsByCoupleIds(coupleIds) {
    if (coupleIds.length === 0) return [];
    const { data, error } = await db().from("sessions").select("*").in("couple_id", coupleIds);
    if (error) throw error;
    return data ?? [];
  },

  async getRatingsForCoupleIds(coupleIds) {
    if (coupleIds.length === 0) return [];
    const { data, error } = await db().from("ratings").select("*").in("couple_id", coupleIds);
    if (error) throw error;
    return data ?? [];
  },
};
