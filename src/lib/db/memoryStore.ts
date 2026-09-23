import { randomUUID } from "node:crypto";
import type {
  MediaType,
  ParticipantRow,
  Preferences,
  RatingRow,
  Role,
  SessionRow,
  SwipeDirection,
  SwipeRow,
  TitlesPoolRow,
  PooledTitle,
} from "@/lib/types";
import type { DataStore } from "./types";

// In-process fallback used when Supabase env vars are absent, so the app
// is still fully clickable without live keys. State lives for the life of
// the server process only — fine for local/demo use, not for production
// multi-instance deployments.

const sessions = new Map<string, SessionRow>();
const sessionsByCode = new Map<string, string>();
const participants = new Map<string, ParticipantRow>();
const titlesPool: TitlesPoolRow[] = [];
const swipes: SwipeRow[] = [];
const ratings: RatingRow[] = [];
const couples = new Set<string>();

function now(): string {
  return new Date().toISOString();
}

export const memoryStore: DataStore = {
  async ensureCouple(coupleId) {
    couples.add(coupleId);
  },

  async createSession(code) {
    const row: SessionRow = {
      id: randomUUID(),
      code,
      couple_id: null,
      status: "waiting_a",
      round: 1,
      brief: null,
      match_tmdb_id: null,
      match_media_type: null,
      match_ott: null,
      created_at: now(),
      updated_at: now(),
    };
    sessions.set(row.id, row);
    sessionsByCode.set(code, row.id);
    return row;
  },

  async getSessionByCode(code) {
    const id = sessionsByCode.get(code);
    if (!id) return null;
    return sessions.get(id) ?? null;
  },

  async getSessionById(id) {
    return sessions.get(id) ?? null;
  },

  async updateSession(id, patch) {
    const existing = sessions.get(id);
    if (!existing) throw new Error("session not found");
    const updated = { ...existing, ...patch, updated_at: now() };
    sessions.set(id, updated);
    return updated;
  },

  async claimTransition(id, expectedStatus, patch) {
    const existing = sessions.get(id);
    if (!existing || existing.status !== expectedStatus) return false;
    sessions.set(id, { ...existing, ...patch, updated_at: now() });
    return true;
  },

  async upsertParticipant(sessionId, role, deviceId, preferences) {
    const existing = Array.from(participants.values()).find(
      (p) => p.session_id === sessionId && p.role === role
    );
    if (existing) {
      const updated: ParticipantRow = {
        ...existing,
        device_id: deviceId,
        preferences,
        submitted_at: now(),
      };
      participants.set(updated.id, updated);
      return updated;
    }
    const row: ParticipantRow = {
      id: randomUUID(),
      session_id: sessionId,
      role,
      device_id: deviceId,
      preferences,
      submitted_at: now(),
      finished_round: 0,
    };
    participants.set(row.id, row);
    return row;
  },

  async getParticipants(sessionId) {
    return Array.from(participants.values()).filter((p) => p.session_id === sessionId);
  },

  async getParticipant(sessionId, role) {
    return (
      Array.from(participants.values()).find(
        (p) => p.session_id === sessionId && p.role === role
      ) ?? null
    );
  },

  async getParticipantById(id) {
    return participants.get(id) ?? null;
  },

  async setParticipantFinishedRound(participantId, round) {
    const existing = participants.get(participantId);
    if (!existing) return;
    participants.set(participantId, { ...existing, finished_round: round });
  },

  async insertTitlesPool(sessionId, round, titles) {
    for (const t of titles) {
      const exists = titlesPool.some(
        (row) => row.session_id === sessionId && row.round === round && row.tmdb_id === t.tmdb_id
      );
      if (exists) continue;
      titlesPool.push({
        id: randomUUID(),
        session_id: sessionId,
        round,
        ...t,
      });
    }
  },

  async getTitlesPool(sessionId, round) {
    return titlesPool.filter((row) => row.session_id === sessionId && row.round === round);
  },

  async getAllTitlesPool(sessionId) {
    return titlesPool.filter((row) => row.session_id === sessionId);
  },

  async insertSwipe(sessionId, participantId, round, tmdbId, mediaType, direction) {
    const exists = swipes.some(
      (s) =>
        s.session_id === sessionId &&
        s.participant_id === participantId &&
        s.round === round &&
        s.tmdb_id === tmdbId
    );
    if (exists) {
      const idx = swipes.findIndex(
        (s) =>
          s.session_id === sessionId &&
          s.participant_id === participantId &&
          s.round === round &&
          s.tmdb_id === tmdbId
      );
      swipes[idx] = { ...swipes[idx], direction };
      return;
    }
    swipes.push({
      id: randomUUID(),
      session_id: sessionId,
      participant_id: participantId,
      round,
      tmdb_id: tmdbId,
      media_type: mediaType,
      direction,
    });
  },

  async getSwipes(sessionId, round) {
    return swipes.filter(
      (s) => s.session_id === sessionId && (round === undefined || s.round === round)
    );
  },

  async insertRating(sessionId, coupleId, tmdbId, mediaType, title, stars) {
    ratings.push({
      id: randomUUID(),
      session_id: sessionId,
      couple_id: coupleId,
      tmdb_id: tmdbId,
      media_type: mediaType,
      title,
      stars,
      created_at: now(),
    });
  },

  async findParticipantsByDevice(deviceId) {
    return Array.from(participants.values()).filter((p) => p.device_id === deviceId);
  },

  async getSessionsByIds(ids) {
    return ids.map((id) => sessions.get(id)).filter((s): s is SessionRow => Boolean(s));
  },

  async getSessionsByCoupleIds(coupleIds) {
    const set = new Set(coupleIds);
    return Array.from(sessions.values()).filter((s) => s.couple_id && set.has(s.couple_id));
  },

  async getRatingsForCoupleIds(coupleIds) {
    const set = new Set(coupleIds);
    return ratings.filter((r) => r.couple_id && set.has(r.couple_id));
  },
};

// Type-only re-exports so call sites don't need to know the concrete direction/media types.
export type { MediaType, Preferences, Role, SwipeDirection, PooledTitle };
